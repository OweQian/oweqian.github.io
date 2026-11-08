import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createLocalStore } from './lib/local-store.mjs';
import { createGitHubStore } from './lib/github-store.mjs';
import { createOssMediaStore } from './lib/oss-media-store.mjs';
import { validateMedia, MAX_MEDIA_SIZE } from './lib/media.mjs';
import { fail, MAX_NOTE_SIZE } from './lib/store-common.mjs';
import { createStartupCheck } from './lib/startup-check.mjs';

const instanceId = randomBytes(8).toString('hex');
const commit = process.env.RENDER_GIT_COMMIT || process.env.GITHUB_SHA || '';
const version = /^[a-f0-9]{7,64}$/i.test(commit) ? commit.toLowerCase() : 'unknown';

function log(level, event, fields = {}) {
  const record = { timestamp: new Date().toISOString(), level, event, version, instanceId, ...fields };
  (level === 'error' ? console.error : console.log)(JSON.stringify(record));
}

// Only classify known failures. Raw exception text can include paths or other
// request data and must never become an application log field.
function failureDetails(error) {
  const statusCode = Number.isInteger(error?.statusCode) && error.statusCode >= 400 && error.statusCode <= 599
    ? error.statusCode : 500;
  const message = typeof error?.message === 'string' ? error.message : '';
  const githubStatus = /^GitHub 请求失败（(\d{3})）$/.exec(message);
  let reason = 'internal_error';
  if (githubStatus) reason = 'github_http_error';
  else if (message === '无法连接 GitHub，请稍后重试') reason = 'github_unreachable';
  else if (message === 'GitHub 鉴权失败或令牌权限不足，请检查服务端配置') reason = 'github_auth_failed';
  else if (message.includes('解析校验失败')) reason = 'content_integrity_failed';
  else if (statusCode < 500) reason = 'request_rejected';
  return { statusCode, reason, ...(githubStatus ? { upstreamStatus: Number(githubStatus[1]) } : {}) };
}

log('info', 'process_starting', { nodeVersion: process.version });

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const PUBLIC_DIR = path.join(ROOT, 'tools', 'notes-editor', 'public');
const MODE = process.env.NOTES_EDITOR_MODE || 'local';
if (!['local', 'github'].includes(MODE)) throw new Error('NOTES_EDITOR_MODE 只支持 local 或 github');
const ONLINE = MODE === 'github';
const MEDIA_STORAGE = process.env.MEDIA_STORAGE || 'github';
if (!['github', 'oss'].includes(MEDIA_STORAGE)) throw new Error('MEDIA_STORAGE 只支持 github 或 oss');
if (MEDIA_STORAGE === 'oss' && !ONLINE) throw new Error('OSS 媒体存储仅支持 github 在线模式');
const HOST = process.env.NOTES_EDITOR_HOST || (ONLINE ? '0.0.0.0' : '127.0.0.1');
const PORT = Number(process.env.PORT || process.env.NOTES_EDITOR_PORT || 1314);
const BLOG_URL = process.env.NOTES_EDITOR_BLOG_URL || 'http://192.168.102.113:1313/blog/';
const USERNAME = process.env.EDITOR_USERNAME || 'wangxiaobai';
const PASSWORD = process.env.EDITOR_PASSWORD || '';
const SESSION_AGE = 12 * 60 * 60;
const COOKIE_NAME = ONLINE ? 'notes_editor_session' : 'notes_editor_local';
const MAX_JSON_BODY = MAX_NOTE_SIZE + 1024 * 1024;
const sessions = new Map();
const loginAttempts = new Map();
const STATIC_FILES = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/editor.css', ['editor.css', 'text/css; charset=utf-8']],
  ['/editor.js', ['editor.js', 'text/javascript; charset=utf-8']],
  ['/rich-text.js', ['rich-text.js', 'text/javascript; charset=utf-8']],
  ['/media.js', ['media.js', 'text/javascript; charset=utf-8']],
]);
const API_PATHS = new Set(['/api/health', '/api/session', '/api/login', '/api/logout', '/api/notes', '/api/media', '/api/media/library']);

if (ONLINE && !PASSWORD) throw new Error('在线模式必须在服务端配置 EDITOR_PASSWORD');
const store = ONLINE
  ? createGitHubStore({
      repository: process.env.GITHUB_REPOSITORY || 'OweQian/oweqian.github.io',
      branch: process.env.GITHUB_BRANCH || 'dev',
      token: process.env.GITHUB_TOKEN,
      apiUrl: process.env.GITHUB_API_URL,
    })
  : createLocalStore({
      root: ROOT,
      backupDir: process.env.NOTES_EDITOR_BACKUP_DIR
        ? path.resolve(process.env.NOTES_EDITOR_BACKUP_DIR)
        : path.join(ROOT, '.cache', 'notes-editor', 'backups'),
    });
const mediaStore = ONLINE && MEDIA_STORAGE === 'oss'
  ? createOssMediaStore({
      bucket: process.env.OSS_BUCKET,
      region: process.env.OSS_REGION,
      accessKeyId: process.env.OSS_ACCESS_KEY_ID,
      accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET,
      publicBaseUrl: process.env.OSS_PUBLIC_BASE_URL,
      prefix: process.env.OSS_PREFIX,
    })
  : store;
let shuttingDown = false;
const startupCheck = createStartupCheck({
  check: () => store.state(),
  onChange(check, error, current) {
    if (error) {
      log('error', 'storage_check_failed', { ...check, ...failureDetails(error) });
    } else {
      log('info', 'storage_check_ready', {
        ...check, entries: current.entries.length,
        message: `已载入 ${current.entries.length} 条记录，完整性校验通过`,
      });
    }
  },
});

function headers(extra = {}) {
  return {
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'no-referrer',
    'content-security-policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' https: http: data: blob:; media-src 'self' https: http: blob:; frame-src https://player.bilibili.com https://www.youtube.com; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
    ...(ONLINE ? { 'strict-transport-security': 'max-age=31536000; includeSubDomains' } : {}),
    ...extra,
  };
}

function json(res, statusCode, value, extra = {}) {
  res.writeHead(statusCode, headers({ 'content-type': 'application/json; charset=utf-8', ...extra }));
  res.end(JSON.stringify(value));
}

function cookies(req) {
  return Object.fromEntries((req.headers.cookie || '').split(';').map((part) => {
    const index = part.indexOf('=');
    return index < 0 ? ['', ''] : [part.slice(0, index).trim(), part.slice(index + 1).trim()];
  }).filter(([key]) => key));
}

function sessionCookie(token, maxAge = SESSION_AGE) {
  return `${COOKIE_NAME}=${token}; HttpOnly; Path=/; SameSite=Strict; Max-Age=${maxAge}${ONLINE ? '; Secure' : ''}`;
}

function createSession(res) {
  const token = randomBytes(32).toString('base64url');
  sessions.set(token, { expiresAt: Date.now() + SESSION_AGE * 1000, uploads: new Map() });
  res.setHeader('set-cookie', sessionCookie(token));
  return sessions.get(token);
}

function currentSession(req) {
  const token = cookies(req)[COOKIE_NAME];
  const session = token ? sessions.get(token) : null;
  if (!session) return null;
  if (session.expiresAt <= Date.now()) {
    sessions.delete(token);
    return null;
  }
  session.expiresAt = Date.now() + SESSION_AGE * 1000;
  return session;
}

function requireSession(req, res) {
  const session = currentSession(req);
  if (session) return session;
  if (!ONLINE) return createSession(res);
  fail('登录已失效，请重新登录', 401);
}

function sameSecret(value, expected) {
  const left = createHash('sha256').update(String(value)).digest();
  const right = createHash('sha256').update(String(expected)).digest();
  return timingSafeEqual(left, right);
}

function assertSameOrigin(req) {
  if (!req.headers.origin) return;
  let origin;
  try {
    origin = new URL(req.headers.origin);
  } catch {
    fail('请求来源无效', 403);
  }
  if (origin.host !== req.headers.host) fail('不接受跨站编辑请求', 403);
}

async function body(req, limit = MAX_JSON_BODY) {
  if (req.headers['content-type']?.split(';')[0] !== 'application/json') fail('只接受 JSON 请求', 415);
  const buffer = await binaryBody(req, limit);
  try {
    return JSON.parse(buffer.toString('utf8'));
  } catch {
    fail('JSON 格式无效');
  }
}

async function binaryBody(req, limit) {
  const size = Number(req.headers['content-length'] || 0);
  if (size > limit) fail(`请求内容超出 ${Math.round(limit / 1024 / 1024)} MB 限制`, 413);
  const chunks = [];
  let received = 0;
  for await (const chunk of req) {
    received += chunk.length;
    if (received > limit) fail(`请求内容超出 ${Math.round(limit / 1024 / 1024)} MB 限制`, 413);
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

function clientState(value) {
  return { ...value, mode: MODE, blogUrl: BLOG_URL, mediaStorage: ONLINE ? MEDIA_STORAGE : 'local' };
}

function uploadedMedia(session, descriptors) {
  if (descriptors === undefined) return [];
  if (!Array.isArray(descriptors) || descriptors.length > 30) fail('媒体列表无效');
  return descriptors.map((descriptor) => {
    const media = session.uploads.get(descriptor?.id);
    if (!media || media.path !== descriptor.path) fail('媒体上传状态已失效，请重新上传', 409);
    return media;
  });
}

const server = createServer(async (req, res) => {
  const requestId = randomBytes(8).toString('hex');
  const startedAt = process.hrtime.bigint();
  let requestPath = '/other';
  let logRequest = false;
  let requestLogged = false;
  const rayHeader = req.headers['cf-ray'];
  const cfRay = typeof rayHeader === 'string' && /^[a-f0-9]{16,32}(?:-[A-Z]{3})?$/i.test(rayHeader)
    ? rayHeader.slice(0, 64) : undefined;
  const method = ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'].includes(req.method) ? req.method : 'OTHER';
  const requestFields = () => ({ requestId, method, path: requestPath, ...(cfRay ? { cfRay } : {}) });
  const complete = (outcome) => {
    if (!logRequest || requestLogged) return;
    requestLogged = true;
    log('info', 'api_request', {
      ...requestFields(), statusCode: res.statusCode, outcome,
      durationMs: Math.round(Number(process.hrtime.bigint() - startedAt) / 1e6),
    });
  };
  res.setHeader('x-request-id', requestId);
  res.once('finish', () => complete('completed'));
  res.once('close', () => complete('aborted'));
  try {
    const url = new URL(req.url, 'http://notes-editor.local');
    logRequest = url.pathname.startsWith('/api/');
    requestPath = API_PATHS.has(url.pathname) || STATIC_FILES.has(url.pathname) ? url.pathname : '/other';
    if (logRequest) log('info', 'api_request_started', requestFields());
    if (!ONLINE) {
      let hostname;
      try {
        hostname = new URL(`http://${req.headers.host || HOST}`).hostname;
      } catch {
        return json(res, 403, { error: '访问地址无效' });
      }
      if (!['127.0.0.1', 'localhost', '::1'].includes(hostname)) return json(res, 403, { error: '只允许本机访问' });
    }
    if (req.method === 'POST') assertSameOrigin(req);

    if (url.pathname === '/api/health' && req.method === 'GET') {
      return json(res, 200, {
        ok: true, mode: MODE, file: 'content/posts/blog/index.md', version, instanceId,
        uptimeSeconds: Math.floor(process.uptime()), startupStorageCheck: startupCheck.snapshot(),
      });
    }
    if (url.pathname === '/api/session' && req.method === 'GET') {
      const session = ONLINE ? currentSession(req) : requireSession(req, res);
      return json(res, 200, { authenticated: !ONLINE || Boolean(session), mode: MODE, blogUrl: BLOG_URL });
    }
    if (url.pathname === '/api/login' && req.method === 'POST') {
      if (!ONLINE) return json(res, 200, { authenticated: true, mode: MODE, blogUrl: BLOG_URL });
      const key = req.socket.remoteAddress || 'unknown';
      const attempt = loginAttempts.get(key);
      if (attempt && attempt.resetAt > Date.now() && attempt.count >= 5) {
        return json(res, 429, { error: '尝试次数过多，请 15 分钟后再试' }, { 'retry-after': '900' });
      }
      const payload = await body(req, 2048);
      if (!payload || typeof payload.username !== 'string' || typeof payload.password !== 'string') {
        fail('请输入账号和密码');
      }
      if (!sameSecret(payload.username, USERNAME) || !sameSecret(payload.password, PASSWORD)) {
        const current = attempt && attempt.resetAt > Date.now() ? attempt : { count: 0, resetAt: Date.now() + 15 * 60 * 1000 };
        current.count += 1;
        loginAttempts.set(key, current);
        return json(res, 401, { error: '账号或密码不正确' });
      }
      loginAttempts.delete(key);
      createSession(res);
      return json(res, 200, { authenticated: true, mode: MODE, blogUrl: BLOG_URL });
    }
    if (url.pathname === '/api/logout' && req.method === 'POST') {
      const token = cookies(req)[COOKIE_NAME];
      if (token) sessions.delete(token);
      res.setHeader('set-cookie', sessionCookie('', 0));
      return json(res, 200, { authenticated: false, mode: MODE });
    }
    if (url.pathname === '/api/session' || url.pathname === '/api/login') {
      res.writeHead(405, headers({ allow: 'GET, POST' }));
      return res.end();
    }

    if (url.pathname === '/favicon.ico') {
      res.writeHead(204, headers());
      return res.end();
    }
    if (STATIC_FILES.has(url.pathname) && req.method === 'GET') {
      const [file, type] = STATIC_FILES.get(url.pathname);
      const contents = await readFile(path.join(PUBLIC_DIR, file));
      res.writeHead(200, headers({ 'content-type': type }));
      return res.end(contents);
    }

    const session = requireSession(req, res);
    if (url.pathname === '/api/media/library') {
      if (MEDIA_STORAGE !== 'oss' || !ONLINE) fail('当前未启用 OSS 媒体库', 404);
      if (req.method !== 'GET') {
        res.writeHead(405, headers({ allow: 'GET' }));
        return res.end();
      }
      return json(res, 200, await mediaStore.listMedia({
        prefix: url.searchParams.get('prefix') || '',
        continuationToken: url.searchParams.get('continuationToken') || '',
      }));
    }
    if (url.pathname === '/api/notes') {
      if (req.method === 'GET') return json(res, 200, clientState(await store.state()));
      if (req.method === 'POST') {
        const payload = await body(req);
        const media = uploadedMedia(session, payload.media);
        const result = await store.save(payload, media);
        media.forEach((item) => session.uploads.delete(item.id));
        return json(res, 200, clientState(result));
      }
      res.writeHead(405, headers({ allow: 'GET, POST' }));
      return res.end();
    }
    if (url.pathname === '/api/media' && req.method === 'POST') {
      const uploadId = MEDIA_STORAGE === 'oss' ? (url.searchParams.get('uploadId') || '').toLowerCase() : '';
      if (MEDIA_STORAGE === 'oss' && !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(uploadId)) {
        fail('媒体上传标识无效，请重新添加文件');
      }
      if (session.uploads.size >= 30 && !(MEDIA_STORAGE === 'oss' && session.uploads.has(uploadId))) {
        fail('一次最多暂存 30 个媒体文件，请先保存', 429);
      }
      const buffer = await binaryBody(req, MAX_MEDIA_SIZE);
      const date = url.searchParams.get('date');
      const media = validateMedia(buffer, url.searchParams.get('type'), date);
      if (MEDIA_STORAGE === 'oss') {
        media.id = uploadId;
        media.uploadId = uploadId;
        media.path = `static/uploads/notes/${date.slice(0, 4)}/${date.slice(5, 7)}/${date}-${uploadId}${path.extname(media.path)}`;
      }
      const uploaded = await mediaStore.uploadMedia({ ...media, buffer });
      session.uploads.set(uploaded.id, uploaded);
      return json(res, 201, {
        id: uploaded.id,
        path: uploaded.path,
        kind: uploaded.kind,
        ...(uploaded.storage ? { storage: uploaded.storage } : {}),
        ...(uploaded.publicUrl ? { publicUrl: uploaded.publicUrl } : {}),
      });
    }
    json(res, 404, { error: 'Not found' });
  } catch (error) {
    const failure = failureDetails(error);
    if (failure.statusCode >= 500) log('error', 'request_failed', { ...requestFields(), ...failure });
    if (res.destroyed || res.writableEnded) return;
    if (res.headersSent) return res.destroy();
    try {
      json(res, failure.statusCode, {
        error: error?.statusCode && typeof error.message === 'string' ? error.message : '编辑器发生错误，请稍后重试',
      });
    } catch {
      res.destroy();
    }
  }
});

server.requestTimeout = 120000;
server.on('error', (error) => {
  log('error', 'server_failed', failureDetails(error));
  shutdown('server_error', 1);
});
server.listen(PORT, HOST, () => {
  log('info', 'server_listening', { port: PORT, mode: MODE, mediaStorage: ONLINE ? MEDIA_STORAGE : 'local' });
  void startupCheck.start();
});

function shutdown(reason, exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  startupCheck.stop();
  log('info', 'shutdown_started', { reason, graceMs: 10000 });
  const deadline = setTimeout(() => {
    log('error', 'shutdown_forced', { reason });
    server.closeAllConnections();
    process.exit(exitCode);
  }, 10000);
  deadline.unref();
  server.close(() => {
    clearTimeout(deadline);
    log('info', 'shutdown_complete', { reason });
    process.exit(exitCode);
  });
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => shutdown(signal));
}
