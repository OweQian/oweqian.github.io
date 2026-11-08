import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const fixture = '---\ntitle: "Reliability test"\n---\n\n## 2026\n\n### 2026-10\n\n#### 2026-10-30\n\nA test note.\n';

async function listen(server) {
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  return server.address().port;
}

async function waitFor(condition, timeout = 2000) {
  const deadline = Date.now() + timeout;
  while (!condition()) {
    assert.ok(Date.now() < deadline, 'Timed out waiting for the test service');
    await delay(10);
  }
}

async function startEditor(t, { initiallyAvailable = true, importScript = '' } = {}) {
  let available = initiallyAvailable;
  let holdReads = false;
  const upstreamRequests = [];
  const upstream = createServer((req, res) => {
    upstreamRequests.push({ method: req.method, url: req.url });
    res.setHeader('content-type', 'application/json');
    if (!available) {
      res.writeHead(503);
      return res.end(JSON.stringify({ error: 'Unavailable test upstream' }));
    }
    if (holdReads) return;
    if (req.url.includes('/contents/')) {
      return res.end(JSON.stringify({ encoding: 'base64', content: Buffer.from(fixture).toString('base64') }));
    }
    return res.end(JSON.stringify({ object: { sha: 'a'.repeat(40) } }));
  });
  let child;
  t.after(async () => {
    if (child && child.exitCode === null && child.signalCode === null) {
      const exited = once(child, 'exit');
      child.kill('SIGTERM');
      const deadline = setTimeout(() => child.kill('SIGKILL'), 2000);
      await exited;
      clearTimeout(deadline);
    }
    upstream.closeAllConnections();
    await new Promise((resolve) => upstream.close(resolve));
  });
  const upstreamPort = await listen(upstream);
  const reservation = createServer();
  const editorPort = await listen(reservation);
  await new Promise((resolve) => reservation.close(resolve));
  const args = importScript ? ['--import', `data:text/javascript,${encodeURIComponent(importScript)}`] : [];
  args.push(fileURLToPath(new URL('./server.mjs', import.meta.url)));
  const logs = [];
  let output = '';
  child = spawn(process.execPath, args, {
    env: {
      NOTES_EDITOR_MODE: 'github', NOTES_EDITOR_HOST: '127.0.0.1', PORT: String(editorPort),
      EDITOR_USERNAME: 'private-test-user', EDITOR_PASSWORD: 'private-test-password',
      GITHUB_TOKEN: 'private-test-github-token', GITHUB_REPOSITORY: 'test-owner/test-repo', GITHUB_BRANCH: 'dev',
      GITHUB_API_URL: `http://127.0.0.1:${upstreamPort}`, RENDER_GIT_COMMIT: 'b'.repeat(40),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  for (const stream of [child.stdout, child.stderr]) {
    let pending = '';
    stream.on('data', (data) => {
      output += data;
      pending += data;
      const lines = pending.split('\n');
      pending = lines.pop();
      for (const line of lines) {
        try { logs.push(JSON.parse(line)); } catch { /* Runtime diagnostics are not application JSON. */ }
      }
    });
  }
  await waitFor(() => logs.some(({ event }) => event === 'server_listening') || child.exitCode !== null);
  assert.equal(child.exitCode, null, 'The test editor must start');
  const request = (pathname, options) => fetch(`http://127.0.0.1:${editorPort}${pathname}`, options);
  const login = async () => {
    const response = await request('/api/login', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: 'private-test-user', password: 'private-test-password' }),
    });
    assert.equal(response.status, 200);
    await response.json();
    return response.headers.get('set-cookie').split(';')[0];
  };
  return {
    request, login, child, logs, upstreamRequests, output: () => output,
    recover: () => { available = true; }, holdReads: () => { holdReads = true; },
  };
}

test('a GitHub startup outage preserves login and health, then a bounded read-only retry recovers', { timeout: 15000 }, async (t) => {
  const editor = await startEditor(t, { initiallyAvailable: false });
  await waitFor(() => editor.logs.some(({ event }) => event === 'storage_check_failed'));
  const startedAt = Date.now();
  const response = await editor.request('/api/health?private-query-marker', {
    headers: { 'cf-ray': '0123456789abcdef-SJC', cookie: 'private-cookie-marker', authorization: 'Bearer private-auth-marker' },
  });
  assert.equal(response.status, 200);
  const health = await response.json();
  assert.ok(Date.now() - startedAt < 1000, 'Health must not wait for the unavailable dependency');
  assert.equal(health.startupStorageCheck.status, 'unavailable');
  assert.equal(health.version, 'b'.repeat(40));
  assert.match(health.instanceId, /^[a-f0-9]{16}$/);
  assert.match(response.headers.get('x-request-id'), /^[a-f0-9]{16}$/);
  assert.equal((await editor.request('/')).status, 200);
  const cookie = await editor.login();
  const failedRead = await editor.request('/api/notes', { headers: { cookie } });
  assert.equal(failedRead.status, 502);
  await failedRead.json();
  const session = await editor.request('/api/session', { headers: { cookie } });
  assert.equal((await session.json()).authenticated, true);
  const unknownPath = await editor.request('/api/private-path-marker', { headers: { 'cf-ray': 'private-ray-marker' } });
  assert.equal(unknownPath.status, 401);
  await unknownPath.json();

  editor.recover();
  await waitFor(() => editor.logs.some(({ event }) => event === 'storage_check_ready'), 7000);
  const recoveredHealth = await (await editor.request('/api/health')).json();
  assert.equal(recoveredHealth.startupStorageCheck.status, 'ready');
  assert.equal(recoveredHealth.startupStorageCheck.attempts, 2);
  const notes = await editor.request('/api/notes', { headers: { cookie } });
  assert.equal(notes.status, 200);
  assert.equal((await notes.json()).entries.length, 1);
  assert.ok(editor.upstreamRequests.every(({ method }) => method === 'GET'), 'Automatic recovery must never write');
  await waitFor(() => editor.logs.some(({ event, cfRay }) => event === 'api_request' && cfRay === '0123456789abcdef-SJC'));
  for (const marker of ['private-query-marker', 'private-cookie-marker', 'private-auth-marker', 'private-path-marker', 'private-ray-marker', 'private-test-user', 'private-test-password', 'private-test-github-token']) {
    assert.ok(!editor.output().includes(marker), `Logs must omit ${marker}`);
  }
  const requestLog = editor.logs.find(({ event, cfRay }) => event === 'api_request' && cfRay);
  assert.equal(requestLog.path, '/api/health');
  assert.equal(requestLog.statusCode, 200);
  assert.equal(typeof requestLog.durationMs, 'number');
  const startedLog = editor.logs.find(({ event, requestId }) => event === 'api_request_started' && requestId === requestLog.requestId);
  assert.equal(startedLog.cfRay, requestLog.cfRay);
  assert.equal(startedLog.path, '/api/health');
});

test('a static-file read failure returns an error without crashing the request handler', { timeout: 10000 }, async (t) => {
  const importScript = `
    import fs from 'node:fs/promises';
    import { syncBuiltinESMExports } from 'node:module';
    const original = fs.readFile;
    fs.readFile = (...args) => String(args[0]).endsWith('/public/editor.css')
      ? Promise.reject(new Error('private-filesystem-error-marker'))
      : String(args[0]).endsWith('/public/media.js') ? Promise.resolve({}) : original(...args);
    syncBuiltinESMExports();
  `;
  const editor = await startEditor(t, { importScript });
  const failed = await editor.request('/editor.css');
  assert.equal(failed.status, 500);
  assert.equal((await failed.json()).error, '编辑器发生错误，请稍后重试');
  await assert.rejects(editor.request('/media.js'), 'Errors after headers were sent must safely close that response');
  assert.equal((await editor.request('/api/health')).status, 200);
  assert.equal((await editor.request('/')).status, 200);
  await waitFor(() => editor.logs.some(({ event }) => event === 'request_failed'));
  assert.equal(editor.child.exitCode, null);
  assert.ok(!editor.output().includes('private-filesystem-error-marker'));

  const exited = once(editor.child, 'exit');
  editor.child.kill('SIGTERM');
  const [code, signal] = await exited;
  assert.equal(code, 0);
  assert.equal(signal, null);
  assert.ok(editor.logs.some(({ event, reason }) => event === 'shutdown_complete' && reason === 'SIGTERM'));
});

test('SIGTERM exits within the shutdown deadline even while GitHub has an unfinished response', { timeout: 15000 }, async (t) => {
  const editor = await startEditor(t);
  await waitFor(() => editor.logs.some(({ event }) => event === 'storage_check_ready'));
  const cookie = await editor.login();
  editor.holdReads();
  // Attach a rejection handler immediately because shutdown destroys this socket.
  const request = editor.request('/api/notes', { headers: { cookie } }).catch(() => null);
  await waitFor(() => editor.logs.some(({ event, path }) => event === 'api_request_started' && path === '/api/notes'));
  const exited = once(editor.child, 'exit');
  const startedAt = Date.now();
  editor.child.kill('SIGTERM');
  const [code, signal] = await exited;
  assert.equal(code, 0);
  assert.equal(signal, null);
  assert.ok(Date.now() - startedAt < 12000, 'Shutdown must not wait for the upstream 60-second timeout');
  assert.ok(editor.logs.some(({ event }) => event === 'shutdown_forced'));
  await request;
});
