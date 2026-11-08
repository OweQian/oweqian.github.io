import { writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

export const DEFAULT_ORIGINS = [
  'https://notes.oweqian.xyz',
  'https://oweqian-notes-editor.onrender.com',
];

function parseJson(body) {
  try {
    return JSON.parse(body);
  } catch {
    throw new Error('响应 JSON 无效');
  }
}

const CHECKS = [
  { name: 'health', path: '/api/health', status: 200, type: 'application/json', validate: (body) => {
    const value = parseJson(body);
    return value.ok === true && value.mode === 'github';
  } },
  { name: 'session', path: '/api/session', status: 200, type: 'application/json', validate: (body) => {
    const value = parseJson(body);
    return value.authenticated === false && value.mode === 'github';
  } },
  { name: 'login_page', path: '/', status: 200, type: 'text/html', validate: (body) => /<form\b[^>]*\bid=["']login-form["']/.test(body) },
  ...['editor.js', 'rich-text.js', 'media.js'].map((file) => ({ name: file.replace('.js', '_js').replaceAll('-', '_'), path: `/${file}`, status: 200, type: 'text/javascript' })),
  { name: 'editor_css', path: '/editor.css', status: 200, type: 'text/css' },
  { name: 'notes_unauthenticated', path: '/api/notes', status: 401, type: 'application/json', validate: (body) => typeof parseJson(body).error === 'string' },
];

const safeHeader = (headers, name) => (headers.get(name) || '').replace(/[^\x20-\x7e]/g, '').slice(0, 160) || null;
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function healthDiagnostics(body) {
  const value = parseJson(body);
  const diagnostics = {};
  for (const key of ['version', 'instanceId']) {
    if (/^[a-f0-9]{7,64}$/i.test(value[key] || '')) diagnostics[key] = value[key];
  }
  if (Number.isSafeInteger(value.uptimeSeconds) && value.uptimeSeconds >= 0) diagnostics.uptimeSeconds = value.uptimeSeconds;
  const check = value.startupStorageCheck;
  if (check && ['pending', 'ready', 'unavailable'].includes(check.status)) {
    diagnostics.startupStorageCheck = {
      status: check.status,
      ...(Number.isSafeInteger(check.attempts) ? { attempts: check.attempts } : {}),
    };
  }
  return diagnostics;
}

export function deploymentOrigin(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/') {
    throw new Error('巡检地址必须是无凭据、路径或查询参数的 HTTPS 源站');
  }
  return url.origin;
}

async function inspectCheck(origin, check, { fetchImpl, timeoutMs, retries, retryDelayMs, sleep }) {
  const attempts = [];
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const startedAt = performance.now();
    const controller = new AbortController();
    const deadline = setTimeout(() => controller.abort(), timeoutMs);
    let result;
    try {
      const response = await fetchImpl(`${origin}${check.path}`, {
        method: 'GET', redirect: 'manual', credentials: 'omit',
        headers: { accept: check.type, 'cache-control': 'no-cache', 'user-agent': 'Notes-Studio-read-only-check/2.0' },
        signal: controller.signal,
      });
      result = {
        status: response.status,
        cfRay: safeHeader(response.headers, 'cf-ray'),
        renderRequestId: safeHeader(response.headers, 'rndr-id'),
        requestId: safeHeader(response.headers, 'x-request-id'),
      };
      const body = await response.text();
      if (body.length > 2 * 1024 * 1024) throw new Error('响应超过巡检大小限制');
      if (response.status !== check.status) throw new Error(`预期 HTTP ${check.status}，实际 ${response.status}`);
      if (!(response.headers.get('content-type') || '').startsWith(check.type)) throw new Error('响应 Content-Type 不符合预期');
      if (!body.trim() || (check.validate && !check.validate(body))) throw new Error('响应内容不符合预期');
      if (check.name === 'health') result.diagnostics = healthDiagnostics(body);
      result.ok = true;
    } catch (error) {
      const code = error?.cause?.code || error?.code;
      result = {
        ...result, ok: false,
        ...(typeof code === 'string' && /^[A-Z0-9_]{3,80}$/.test(code) ? { errorCode: code } : {}),
        error: controller.signal.aborted ? `请求在 ${timeoutMs} ms 内未完成` : String(error.message || error).slice(0, 250),
      };
    } finally {
      clearTimeout(deadline);
    }
    result.elapsedMs = Math.round(performance.now() - startedAt);
    attempts.push(result);
    if (result.ok) break;
    if (attempt < retries) await sleep(retryDelayMs);
  }
  return { name: check.name, path: check.path, expectedStatus: check.status, ok: attempts.at(-1).ok, attempts };
}

export async function inspectDeployment(origins = DEFAULT_ORIGINS, {
  fetchImpl = fetch, timeoutMs = 75000, retries = 2, retryDelayMs = 5000, sleep = pause,
} = {}) {
  if (!Number.isInteger(retries) || retries < 0 || retries > 2) throw new Error('最多允许两次重试');
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new Error('请求超时必须大于零');
  const startedAt = new Date().toISOString();
  const options = { fetchImpl, timeoutMs, retries, retryDelayMs, sleep };
  const reports = await Promise.all(origins.map(async (value) => {
    const origin = deploymentOrigin(value);
    const checks = await Promise.all(CHECKS.map((check) => inspectCheck(origin, check, options)));
    return { origin, ok: checks.every((check) => check.ok), checks };
  }));
  return { startedAt, checkedAt: new Date().toISOString(), ok: reports.every((report) => report.ok), origins: reports };
}

async function main(args) {
  const origins = [];
  let output;
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === '--output') {
      output = args[++index];
      if (!output) throw new Error('--output 后需指定 JSON 文件路径');
    } else origins.push(deploymentOrigin(args[index]));
  }
  const report = await inspectDeployment(origins.length ? origins : DEFAULT_ORIGINS);
  const json = `${JSON.stringify(report, null, 2)}\n`;
  if (output) await writeFile(output, json);
  process.stdout.write(json);
  process.exitCode = report.ok ? 0 : 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}
