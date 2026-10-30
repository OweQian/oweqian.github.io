import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const serverUrl = new URL('./server.mjs', import.meta.url);
const fixture = '---\ntitle: "Editor test"\n---\n\n## 2026\n\n### 2026-10\n\n#### 2026-10-30\n\nA test note.\n';
const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const uploadId = '123e4567-e89b-42d3-a456-426614174000';

async function listen(server) {
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  return server.address().port;
}

async function startEditor(t, storage, { rejectFirstRef = false } = {}) {
  const gitRequests = [];
  const trees = [];
  const ossRequests = [];
  let raw = fixture;
  let head = 'a'.repeat(40);
  let pendingRaw = raw;
  let commits = 0;
  let rejectRef = rejectFirstRef;
  const upstream = createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const input = chunks.length ? JSON.parse(Buffer.concat(chunks)) : null;
    gitRequests.push({ method: req.method, url: req.url, body: input });
    res.setHeader('content-type', 'application/json');
    const suffix = req.url.replace('/repos/test-owner/test-repo', '');
    if (req.method === 'GET' && suffix === '/contents/content/posts/blog/index.md?ref=dev') {
      return res.end(JSON.stringify({ encoding: 'base64', content: Buffer.from(raw).toString('base64') }));
    }
    if (req.method === 'GET' && suffix === '/git/ref/heads/dev') return res.end(JSON.stringify({ object: { sha: head } }));
    if (req.method === 'GET' && suffix === `/git/commits/${head}`) return res.end(JSON.stringify({ tree: { sha: 'b'.repeat(40) } }));
    if (req.method === 'POST' && suffix === '/git/blobs') return res.end(JSON.stringify({ sha: 'f'.repeat(40) }));
    if (req.method === 'POST' && suffix === '/git/trees') {
      trees.push(input.tree);
      pendingRaw = input.tree.find((item) => item.path === 'content/posts/blog/index.md').content;
      return res.end(JSON.stringify({ sha: 'c'.repeat(40) }));
    }
    if (req.method === 'POST' && suffix === '/git/commits') {
      return res.end(JSON.stringify({ sha: (++commits).toString(16).padStart(40, '0'), committer: { date: '2026-10-30T00:00:00Z' } }));
    }
    if (req.method === 'PATCH' && suffix === '/git/refs/heads/dev') {
      assert.equal(input.force, false);
      if (rejectRef) {
        rejectRef = false;
        res.writeHead(409);
        return res.end(JSON.stringify({ message: 'Simulated concurrent branch update' }));
      }
      head = input.sha;
      raw = pendingRaw;
      return res.end(JSON.stringify({ object: { sha: head } }));
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
  const gitPort = await listen(upstream);
  const reservation = createServer();
  const editorPort = await listen(reservation);
  await new Promise((resolve) => reservation.close(resolve));
  const gitOrigin = `http://127.0.0.1:${gitPort}`;
  // Only the loopback GitHub stub uses a socket. OSS responses are simulated before importing the real adapter.
  const bootstrap = `
    import { createHash } from 'node:crypto';
    const realFetch = globalThis.fetch;
    const objects = new Map();
    globalThis.fetch = async (input, options = {}) => {
      const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
      if (url.origin === ${JSON.stringify(gitOrigin)}) return realFetch(input, options);
      const method = options.method || 'GET';
      const headers = new Headers(options.headers);
      if (url.hostname === 'test-bucket.oss-cn-hangzhou.aliyuncs.com') {
        process.send({ method, host: url.hostname, path: url.pathname, query: url.search,
          signed: Boolean(headers.get('authorization')), forbidOverwrite: headers.get('x-oss-forbid-overwrite') });
        if (method === 'PUT') {
          if (objects.has(url.pathname)) return new Response('', { status: 409 });
          const bytes = Buffer.from(options.body);
          const metadata = { 'content-length': String(bytes.length), 'content-type': headers.get('content-type'), etag: createHash('md5').update(bytes).digest('hex') };
          objects.set(url.pathname, metadata);
          return new Response('', { status: 200, headers: { etag: metadata.etag } });
        }
        if (method === 'GET' && url.searchParams.get('list-type') === '2') {
          const nested = url.searchParams.get('prefix') === 'blog/';
          const xml = nested
            ? '<ListBucketResult><Name>test-bucket</Name><Prefix>blog/</Prefix><IsTruncated>false</IsTruncated><Contents><Key>blog/old-video.mp4</Key><LastModified>2025-01-01T00:00:00Z</LastModified><Size>12</Size></Contents></ListBucketResult>'
            : '<ListBucketResult><Name>test-bucket</Name><Prefix></Prefix><IsTruncated>true</IsTruncated><NextContinuationToken>test-next-token</NextContinuationToken><CommonPrefixes><Prefix>blog/</Prefix></CommonPrefixes><Contents><Key>old-photo.png</Key><LastModified>2025-01-01T00:00:00Z</LastModified><Size>12</Size></Contents><Contents><Key>private-not-media.pdf</Key><Size>12</Size></Contents></ListBucketResult>';
          return new Response(xml, { status: 200, headers: { 'content-type': 'application/xml' } });
        }
      }
      if (url.hostname === 'media.example.invalid' && method === 'HEAD') {
        process.send({ method, host: url.hostname, path: url.pathname, signed: Boolean(headers.get('authorization')) });
        const metadata = objects.get(url.pathname);
        return new Response(null, { status: metadata ? 200 : 404, headers: metadata });
      }
      throw new Error('Test blocked an unexpected external request');
    };
    await import(${JSON.stringify(serverUrl.href)});
  `;
  child = spawn(process.execPath, ['--input-type=module', '-e', bootstrap], {
    env: {
      NOTES_EDITOR_MODE: 'github', NOTES_EDITOR_HOST: '127.0.0.1', PORT: String(editorPort),
      EDITOR_USERNAME: 'test-user', EDITOR_PASSWORD: 'test-only-password',
      GITHUB_TOKEN: 'test-only-token', GITHUB_REPOSITORY: 'test-owner/test-repo',
      GITHUB_BRANCH: 'dev', GITHUB_API_URL: gitOrigin,
      ...(storage === 'oss' ? {
        MEDIA_STORAGE: 'oss', OSS_BUCKET: 'test-bucket', OSS_REGION: 'cn-hangzhou',
        OSS_ACCESS_KEY_ID: 'test-only-access-key', OSS_ACCESS_KEY_SECRET: 'test-only-secret',
        OSS_PUBLIC_BASE_URL: 'https://media.example.invalid', OSS_PREFIX: 'notes',
      } : {}),
    },
    stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
  });
  child.on('message', (message) => ossRequests.push(message));
  await new Promise((resolve, reject) => {
    let output = '';
    child.stdout.on('data', (data) => { output += data; if (output.includes('完整性校验通过')) resolve(); });
    child.stderr.on('data', (data) => { output += data; });
    child.once('error', reject);
    child.once('exit', (code) => reject(new Error(`Editor exited before readiness (${code}): ${output}`)));
  });
  const base = `http://127.0.0.1:${editorPort}`;
  const request = (path, options = {}) => fetch(`${base}${path}`, options);
  const login = async () => {
    const response = await request('/api/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: 'test-user', password: 'test-only-password' }) });
    assert.equal(response.status, 200);
    return response.headers.get('set-cookie').split(';')[0];
  };
  return { request, login, gitRequests, trees, ossRequests };
}

test('OSS media and library require authentication, then publish only Markdown with safe conflict retry', { timeout: 10000 }, async (t) => {
  const editor = await startEditor(t, 'oss', { rejectFirstRef: true });
  for (const [path, method] of [['/api/media/library', 'GET'], ['/api/media?type=image/png&date=2026-10-30', 'POST']]) {
    const response = await editor.request(path, { method });
    assert.equal(response.status, 401);
    await response.text();
  }
  assert.equal(editor.ossRequests.length, 0);
  const cookie = await editor.login();
  const headers = { cookie };
  const initial = await (await editor.request('/api/notes', { headers })).json();
  assert.equal(initial.mediaStorage, 'oss');
  for (const id of ['', 'not-a-uuid']) {
    const invalidId = await editor.request(`/api/media?type=image/png&date=2026-10-30&uploadId=${id}`, { method: 'POST', headers, body: png });
    assert.equal(invalidId.status, 400);
    await invalidId.text();
  }
  const invalid = await editor.request(`/api/media?type=image/png&date=2026-10-30&uploadId=${uploadId}`, { method: 'POST', headers, body: 'not a PNG' });
  assert.equal(invalid.status, 415);
  await invalid.text();
  assert.equal(editor.ossRequests.length, 0, 'Invalid media must fail before OSS upload');

  const library = await (await editor.request('/api/media/library', { headers })).json();
  assert.equal(library.folders[0].prefix, 'blog/');
  assert.equal(library.items.length, 1, 'Unsupported files must not appear in the media library');
  assert.equal(library.items[0].publicUrl, 'https://media.example.invalid/old-photo.png');
  assert.equal(library.nextContinuationToken, 'test-next-token');
  const nested = await (await editor.request('/api/media/library?prefix=blog%2F&continuationToken=test-next-token', { headers })).json();
  assert.equal(nested.items[0].kind, 'video');
  assert.equal(nested.parentPrefix, '');
  assert.equal(nested.nextContinuationToken, null);
  const badPrefix = await editor.request('/api/media/library?prefix=https%3A%2F%2Fexample.invalid%2F', { headers });
  assert.equal(badPrefix.status, 400);
  await badPrefix.text();

  const uploadPath = `/api/media?type=image/png&date=2026-10-30&uploadId=${uploadId}`;
  const response = await editor.request(uploadPath, { method: 'POST', headers, body: png });
  assert.equal(response.status, 201);
  const uploaded = await response.json();
  assert.equal(uploaded.storage, 'oss');
  assert.equal(uploaded.id, uploadId);
  assert.match(uploaded.publicUrl, /^https:\/\/media\.example\.invalid\/notes\/2026\/10\/2026-10-30-[a-f0-9-]{36}-[a-f0-9]{64}\.png$/);
  const retried = await editor.request(uploadPath, { method: 'POST', headers, body: png });
  assert.equal(retried.status, 201, 'Same upload identity and bytes must recover a lost response');
  assert.deepEqual(await retried.json(), uploaded, 'Retry must return the same stable receipt and permanent URL');
  const differentBytes = Buffer.from(png);
  differentBytes[differentBytes.length - 1] = 1;
  const changed = await editor.request(uploadPath, { method: 'POST', headers, body: differentBytes });
  assert.equal(changed.status, 201);
  const changedMedia = await changed.json();
  assert.notEqual(changedMedia.path, uploaded.path, 'Different bytes must use another content-addressed key');
  assert.notEqual(changedMedia.publicUrl, uploaded.publicUrl);
  const originalAgain = await editor.request(uploadPath, { method: 'POST', headers, body: png });
  assert.equal(originalAgain.status, 201);
  assert.deepEqual(await originalAgain.json(), uploaded, 'Returning to the original bytes must reuse the original object');
  const payload = {
    revision: initial.revision, headSha: initial.headSha,
    entries: initial.entries.map((entry) => ({ ...entry, body: [...entry.body, `![new](${uploaded.publicUrl})`, `![existing](${library.items[0].publicUrl})`] })),
    media: [{ id: uploaded.id, path: uploaded.path }],
  };
  const save = (body) => editor.request('/api/notes', { method: 'POST', headers: { ...headers, 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const forged = await save({ ...payload, media: [{ id: uploaded.id, path: `${uploaded.path}.tampered` }] });
  assert.equal(forged.status, 409);
  await forged.text();
  assert.equal(editor.gitRequests.filter(({ method }) => method !== 'GET').length, 0);
  const conflict = await save(payload);
  assert.equal(conflict.status, 409);
  await conflict.text();
  const success = await save(payload);
  assert.equal(success.status, 200, 'A conflict must leave the upload receipt available for retry');
  assert.equal((await success.json()).publication.deployment, 'pending');
  assert.equal(editor.gitRequests.some(({ url }) => url.endsWith('/git/blobs')), false, 'OSS media must not create GitHub blobs');
  assert.ok(editor.trees.every((tree) => tree.length === 1 && tree[0].path === 'content/posts/blog/index.md'));
  assert.ok(editor.trees.at(-1)[0].content.includes(uploaded.publicUrl));
  assert.ok(editor.trees.at(-1)[0].content.includes(library.items[0].publicUrl));
  const puts = editor.ossRequests.filter(({ method }) => method === 'PUT');
  assert.equal(puts.length, 2, 'Existing matching objects must skip PUT on retries');
  assert.equal(new Set(puts.map(({ path }) => path)).size, 2, 'Only distinct content may create another key');
  assert.equal(editor.ossRequests.find(({ method }) => method === 'PUT').forbidOverwrite, 'true');
  assert.ok(editor.ossRequests.filter(({ method }) => method === 'HEAD').every(({ signed }) => !signed), 'Public HEAD must not disclose authorization');
  assert.ok(editor.ossRequests.every(({ method }) => ['GET', 'PUT', 'HEAD'].includes(method)), 'Failed saves must not delete objects');
});

test('default GitHub storage preserves file paths and commits media with notes', { timeout: 10000 }, async (t) => {
  const editor = await startEditor(t, 'github');
  const cookie = await editor.login();
  const headers = { cookie };
  const initial = await (await editor.request('/api/notes', { headers })).json();
  assert.equal(initial.mediaStorage, 'github');
  const response = await editor.request('/api/media?type=image/png&date=2026-10-30', { method: 'POST', headers, body: png });
  assert.equal(response.status, 201);
  const uploaded = await response.json();
  assert.equal(uploaded.storage, 'github');
  assert.match(uploaded.path, /^static\/uploads\/notes\//);
  assert.equal(uploaded.publicUrl, undefined);
  const payload = {
    revision: initial.revision, headSha: initial.headSha,
    entries: initial.entries.map((entry) => ({ ...entry, body: [...entry.body, `![old flow](/${uploaded.path.replace(/^static\//, '')})`] })),
    media: [{ id: uploaded.id, path: uploaded.path }],
  };
  const saved = await editor.request('/api/notes', { method: 'POST', headers: { ...headers, 'content-type': 'application/json' }, body: JSON.stringify(payload) });
  assert.equal(saved.status, 200);
  await saved.json();
  assert.ok(editor.gitRequests.some(({ url }) => url.endsWith('/git/blobs')));
  assert.deepEqual(editor.trees[0].map(({ path }) => path), ['content/posts/blog/index.md', uploaded.path]);
  assert.equal(editor.ossRequests.length, 0);
  const library = await editor.request('/api/media/library', { headers });
  assert.equal(library.status, 404);
  await library.text();
});

test('local mode refuses OSS configuration before starting a server', () => {
  const child = spawnSync(process.execPath, [fileURLToPath(serverUrl)], { env: { NOTES_EDITOR_MODE: 'local', MEDIA_STORAGE: 'oss' }, encoding: 'utf8' });
  assert.notEqual(child.status, 0);
  assert.match(child.stderr, /OSS 媒体存储仅支持 github 在线模式/);
});
