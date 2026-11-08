import assert from 'node:assert/strict';
import test from 'node:test';
import { deploymentOrigin, inspectDeployment } from './check-deployment.mjs';

function healthyResponse(url) {
  const path = new URL(url).pathname;
  const headers = { 'cf-ray': 'safe-ray-SJC', 'rndr-id': 'render-request', 'x-request-id': 'app-request' };
  if (path === '/api/health') return Response.json({ ok: true, mode: 'github', version: 'a'.repeat(40), instanceId: 'b'.repeat(16), uptimeSeconds: 42, startupStorageCheck: { status: 'ready', attempts: 1 }, ignoredPrivateField: 'must-not-log' }, { headers });
  if (path === '/api/session') return Response.json({ authenticated: false, mode: 'github' }, { headers });
  if (path === '/api/notes') return Response.json({ error: '登录已失效，请重新登录' }, { status: 401, headers });
  if (path === '/') return new Response('<form id="login-form"></form>', { headers: { ...headers, 'content-type': 'text/html' } });
  return new Response('/* public asset */', { headers: { ...headers, 'content-type': path.endsWith('.css') ? 'text/css' : 'text/javascript' } });
}

test('read-only checks distinguish both origins and preserve request IDs without credentials', async () => {
  const requests = [];
  const report = await inspectDeployment(['https://custom.example', 'https://origin.example'], {
    retries: 0,
    fetchImpl: async (url, options) => {
      requests.push({ url, options });
      return healthyResponse(url);
    },
  });
  assert.equal(report.ok, true);
  assert.equal(report.origins.length, 2);
  assert.equal(requests.length, 16);
  assert.ok(requests.every(({ options }) => options.method === 'GET' && options.credentials === 'omit' && options.redirect === 'manual'));
  assert.ok(requests.every(({ options }) => !Object.keys(options.headers).some((name) => /cookie|authorization/i.test(name))));
  assert.equal(report.origins[0].checks[0].attempts[0].cfRay, 'safe-ray-SJC');
  assert.equal(report.origins[0].checks[0].attempts[0].renderRequestId, 'render-request');
  assert.equal(report.origins[0].checks[0].attempts[0].diagnostics.uptimeSeconds, 42);
  assert.equal(report.origins[0].checks[0].attempts[0].diagnostics.startupStorageCheck.status, 'ready');
  assert.ok(!JSON.stringify(report).includes('must-not-log'));
});

test('a cold-start failure is retried and the earlier failure stays in the report', async () => {
  let healthCalls = 0;
  const report = await inspectDeployment(['https://custom.example'], {
    retryDelayMs: 0,
    fetchImpl: async (url) => {
      if (new URL(url).pathname === '/api/health' && ++healthCalls === 1) {
        return new Response('starting', { status: 503, headers: { 'cf-ray': 'failed-ray' } });
      }
      return healthyResponse(url);
    },
  });
  assert.equal(report.ok, true);
  const attempts = report.origins[0].checks[0].attempts;
  assert.equal(attempts.length, 2);
  assert.equal(attempts[0].status, 503);
  assert.equal(attempts[0].cfRay, 'failed-ray');
  assert.equal(attempts[1].status, 200);
});

test('an unresponsive service finishes with a failed report after bounded retries', async () => {
  const report = await inspectDeployment(['https://custom.example'], {
    timeoutMs: 15, retryDelayMs: 0,
    fetchImpl: (url, { signal }) => new Promise((resolve, reject) => {
      signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
    }),
  });
  assert.equal(report.ok, false);
  assert.ok(report.origins[0].checks.every((check) => check.attempts.length === 3 && !check.ok));
  assert.match(report.origins[0].checks[0].attempts[0].error, /15 ms/);
});

test('a wrong deployment or authentication bypass is reported instead of accepted', async () => {
  const report = await inspectDeployment(['https://custom.example'], {
    retries: 0,
    fetchImpl: async (url) => new URL(url).pathname === '/api/notes'
      ? Response.json({ entries: [] })
      : healthyResponse(url),
  });
  assert.equal(report.ok, false);
  assert.equal(report.origins[0].checks.at(-1).attempts[0].status, 200);
});

test('network error codes remain distinguishable and malformed JSON does not leak its body', async () => {
  const report = await inspectDeployment(['https://custom.example'], {
    retries: 0,
    fetchImpl: async (url) => {
      const path = new URL(url).pathname;
      if (path === '/api/health') throw new TypeError('fetch failed', { cause: { code: 'UND_ERR_CONNECT_TIMEOUT' } });
      if (path === '/api/session') return new Response('private-response-fragment', { headers: { 'content-type': 'application/json' } });
      return healthyResponse(url);
    },
  });
  assert.equal(report.origins[0].checks[0].attempts[0].errorCode, 'UND_ERR_CONNECT_TIMEOUT');
  assert.equal(report.origins[0].checks[1].attempts[0].error, '响应 JSON 无效');
  assert.ok(!JSON.stringify(report).includes('private-response-fragment'));
  assert.ok(report.startedAt <= report.checkedAt);
});

test('inspection rejects credentials, insecure URLs and non-origin inputs', () => {
  for (const value of ['http://custom.example', 'https://user:password@custom.example', 'https://custom.example/api', 'https://custom.example?token=secret']) {
    assert.throws(() => deploymentOrigin(value));
  }
});
