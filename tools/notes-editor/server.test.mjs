import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const fixture = '---\ntitle: "Editor test"\n---\n\n## 2026\n\n### 2026-10\n\n#### 2026-10-30\n\nA test note.\n';

async function listen(server) {
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  return server.address().port;
}

test('online sign-in assets are public while notes and media require a session', { timeout: 10000 }, async (t) => {
  const upstreamRequests = [];
  const upstream = createServer((req, res) => {
    upstreamRequests.push({ method: req.method, url: req.url });
    res.setHeader('content-type', 'application/json');
    if (req.method === 'GET' && req.url === '/repos/test-owner/test-repo/contents/content/posts/blog/index.md?ref=dev') {
      return res.end(JSON.stringify({ encoding: 'base64', content: Buffer.from(fixture).toString('base64') }));
    }
    if (req.method === 'GET' && req.url === '/repos/test-owner/test-repo/git/ref/heads/dev') {
      return res.end(JSON.stringify({ object: { sha: 'a'.repeat(40) } }));
    }
    res.writeHead(500);
    res.end(JSON.stringify({ error: 'Unexpected test GitHub request' }));
  });
  let child;
  t.after(async () => {
    if (child && child.exitCode === null && child.signalCode === null) {
      const exited = once(child, 'exit');
      child.kill('SIGTERM');
      const killTimeout = setTimeout(() => child.kill('SIGKILL'), 2000);
      await exited;
      clearTimeout(killTimeout);
    }
    upstream.closeAllConnections();
    await new Promise((resolve) => upstream.close(resolve));
  });
  const upstreamPort = await listen(upstream);
  const reservation = createServer();
  const editorPort = await listen(reservation);
  await new Promise((resolve) => reservation.close(resolve));
  child = spawn(process.execPath, [fileURLToPath(new URL('./server.mjs', import.meta.url))], {
    env: {
      NOTES_EDITOR_MODE: 'github',
      NOTES_EDITOR_HOST: '127.0.0.1',
      NOTES_EDITOR_BLOG_URL: 'https://example.invalid/blog/',
      PORT: String(editorPort),
      EDITOR_USERNAME: 'test-user',
      EDITOR_PASSWORD: 'test-only-password',
      GITHUB_TOKEN: 'test-only-token',
      GITHUB_REPOSITORY: 'test-owner/test-repo',
      GITHUB_BRANCH: 'dev',
      GITHUB_API_URL: `http://127.0.0.1:${upstreamPort}`,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  await new Promise((resolve, reject) => {
    let output = '';
    child.stdout.on('data', (data) => {
      output += data;
      if (output.includes('完整性校验通过')) resolve();
    });
    child.stderr.on('data', (data) => { output += data; });
    child.once('error', reject);
    child.once('exit', (code) => reject(new Error(`Editor exited before readiness (${code}): ${output}`)));
  });

  const base = `http://127.0.0.1:${editorPort}`;
  for (const [path, type] of [
    ['/', 'text/html'],
    ['/editor.css', 'text/css'],
    ['/editor.js', 'text/javascript'],
    ['/rich-text.js', 'text/javascript'],
    ['/media.js', 'text/javascript'],
  ]) {
    const response = await fetch(`${base}${path}`);
    assert.equal(response.status, 200, `Unauthenticated ${path} must load the sign-in UI`);
    assert.ok(response.headers.get('content-type').startsWith(type));
    const text = await response.text();
    assert.ok(text.length > 0);
    if (path === '/') assert.match(text, /id="login-form"/);
  }
  const session = await fetch(`${base}/api/session`);
  assert.equal(session.status, 200);
  assert.deepEqual(await session.json(), {
    authenticated: false,
    mode: 'github',
    blogUrl: 'https://example.invalid/blog/',
  });
  for (const [path, method] of [
    ['/api/notes', 'GET'],
    ['/api/media/library', 'GET'],
    ['/api/notes', 'POST'],
    ['/api/media?type=image/png&date=2026-10-30', 'POST'],
  ]) {
    const response = await fetch(`${base}${path}`, { method });
    assert.equal(response.status, 401, `${method} ${path} must require authentication`);
    assert.equal((await response.json()).error, '登录已失效，请重新登录');
  }
  assert.equal(upstreamRequests.length, 2, 'Unauthenticated requests must not access GitHub');
  assert.ok(upstreamRequests.every(({ method }) => method === 'GET'));
});
