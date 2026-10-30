import { createServer } from 'node:http';
import { readFile, writeFile, rename, unlink, stat, mkdir, readdir } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseNotes, renderNotes, normalizeEntries } from './lib/notes.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const NOTES_FILE = path.join(ROOT, 'content', 'posts', 'blog', 'index.md');
const PUBLIC_DIR = path.join(ROOT, 'tools', 'notes-editor', 'public');
const BACKUP_DIR = process.env.NOTES_EDITOR_BACKUP_DIR
  ? path.resolve(process.env.NOTES_EDITOR_BACKUP_DIR)
  : path.join(ROOT, '.cache', 'notes-editor', 'backups');
const BLOG_URL = process.env.NOTES_EDITOR_BLOG_URL || 'http://192.168.102.113:1313/blog/';
const HOST = '127.0.0.1';
const PORT = Number(process.env.NOTES_EDITOR_PORT || 1314);
const MAX_BODY = 4 * 1024 * 1024;
const STATIC_FILES = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/editor.css', ['editor.css', 'text/css; charset=utf-8']],
  ['/editor.js', ['editor.js', 'text/javascript; charset=utf-8']],
]);

const revisionOf = (raw) => createHash('sha256').update(raw).digest('hex');
const fail = (message, statusCode = 400) => {
  throw Object.assign(new Error(message), { statusCode });
};

async function readNotes() {
  return readFile(NOTES_FILE, 'utf8');
}

async function state() {
  const raw = await readNotes();
  const document = parseNotes(raw);
  if (renderNotes(document) !== raw) fail('原文解析校验失败，已停止编辑以避免内容丢失', 500);
  const info = await stat(NOTES_FILE);
  return {
    title: raw.match(/^title:\s*["']([^"']+)["']/m)?.[1] || '蠢 Q 碎碎念',
    file: 'content/posts/blog/index.md',
    revision: revisionOf(raw),
    updatedAt: info.mtime.toISOString(),
    entries: document.entries,
    blogUrl: BLOG_URL,
  };
}

async function save(payload) {
  if (!payload || typeof payload.revision !== 'string' || !Array.isArray(payload.entries)) {
    fail('保存参数不完整');
  }
  const raw = await readNotes();
  if (revisionOf(raw) !== payload.revision) fail('文件已在其他窗口修改。当前草稿仍保留，请备份后重新载入。', 409);
  const current = parseNotes(raw);
  if (renderNotes(current) !== raw) fail('原文解析校验失败，未写入任何内容', 500);
  let entries;
  try {
    entries = normalizeEntries(payload.entries, current);
  } catch (error) {
    fail(error.message, 400);
  }
  const output = renderNotes({ ...current, entries });
  if (Buffer.byteLength(output, 'utf8') > MAX_BODY) fail('博客文件超出 4 MB 限制');
  if (renderNotes(parseNotes(output)) !== output) fail('保存后的内容未通过完整性校验', 500);

  await mkdir(BACKUP_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  await writeFile(path.join(BACKUP_DIR, `${stamp}-${randomUUID().slice(0, 8)}.md`), raw, 'utf8');
  const backups = (await readdir(BACKUP_DIR)).filter((file) => file.endsWith('.md')).sort();
  while (backups.length > 10) await unlink(path.join(BACKUP_DIR, backups.shift()));

  const info = await stat(NOTES_FILE);
  const temporary = `${NOTES_FILE}.${process.pid}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporary, output, { encoding: 'utf8', mode: info.mode, flag: 'wx' });
    await rename(temporary, NOTES_FILE);
  } finally {
    await unlink(temporary).catch(() => {});
  }
  return state();
}

function headers(extra = {}) {
  return {
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'no-referrer',
    'content-security-policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' https: http: data:; connect-src 'self'; font-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
    ...extra,
  };
}

function json(res, statusCode, value) {
  res.writeHead(statusCode, headers({ 'content-type': 'application/json; charset=utf-8' }));
  res.end(JSON.stringify(value));
}

async function body(req) {
  if (req.headers['content-type']?.split(';')[0] !== 'application/json') fail('只接受 JSON 请求', 415);
  const size = Number(req.headers['content-length'] || 0);
  if (size > MAX_BODY) fail('请求内容超出 4 MB 限制', 413);
  const chunks = [];
  let received = 0;
  for await (const chunk of req) {
    received += chunk.length;
    if (received > MAX_BODY) fail('请求内容超出 4 MB 限制', 413);
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    fail('JSON 格式无效');
  }
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${HOST}:${PORT}`);
    const hostname = new URL(`http://${req.headers.host || HOST}`).hostname;
    if (!['127.0.0.1', 'localhost', '::1'].includes(hostname)) return json(res, 403, { error: '只允许本机访问' });
    if (req.headers.origin && new URL(req.headers.origin).host !== req.headers.host) {
      return json(res, 403, { error: '不接受跨站编辑请求' });
    }

    if (url.pathname === '/api/health' && req.method === 'GET') {
      return json(res, 200, { ok: true, file: 'content/posts/blog/index.md' });
    }
    if (url.pathname === '/api/notes') {
      if (req.method === 'GET') return json(res, 200, await state());
      if (req.method === 'POST') return json(res, 200, await save(await body(req)));
      res.writeHead(405, headers({ allow: 'GET, POST' }));
      return res.end();
    }
    if (url.pathname === '/favicon.ico') {
      res.writeHead(204, headers());
      return res.end();
    }
    if (STATIC_FILES.has(url.pathname) && req.method === 'GET') {
      const [file, type] = STATIC_FILES.get(url.pathname);
      res.writeHead(200, headers({ 'content-type': type }));
      return res.end(await readFile(path.join(PUBLIC_DIR, file)));
    }
    json(res, 404, { error: 'Not found' });
  } catch (error) {
    json(res, error.statusCode || 500, { error: error.message || '编辑器发生错误' });
  }
});

server.listen(PORT, HOST, async () => {
  try {
    const current = await state();
    console.log(`碎碎念编辑器：http://${HOST}:${PORT}/`);
    console.log(`唯一编辑文件：${NOTES_FILE}`);
    console.log(`已载入 ${current.entries.length} 条记录，完整性校验通过`);
    console.log(`保存备份：${BACKUP_DIR}`);
  } catch (error) {
    console.error(error.message);
    server.close(() => process.exitCode = 1);
  }
});
