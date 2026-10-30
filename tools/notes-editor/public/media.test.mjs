import assert from 'node:assert/strict';
import test from 'node:test';
import { createMediaManager, createMediaLibrary, mediaLibraryMarkdown } from './media.js';

const json = (value, status = 201) => new Response(JSON.stringify(value), { status });

function setup(t, upload) {
  t.mock.method(globalThis, 'fetch', (url, options) => {
    assert.match(url, /^\/api\/media\?/);
    assert.equal(options.method, 'POST');
    assert.equal(options.headers['content-type'], 'application/octet-stream');
    return upload(options.body, new URL(url, 'https://editor.example.invalid').searchParams);
  });
  const ids = [];
  const manager = createMediaManager({
    onChange() {},
    onSessionExpired() { manager.resetUploadReceipts(); },
  });
  t.after(() => manager.finalize(ids));
  return {
    manager,
    async stage() {
      const file = new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], 'photo.png', { type: 'image/png' });
      const record = await manager.stage(file, '2026-10-30');
      ids.push(record.id);
      return record;
    },
  };
}

test('OSS uploads materialize to public HTTPS URLs and preserve local files and receipt descriptors', async (t) => {
  const publicUrl = 'https://media.example.invalid/notes/2026/10/photo.png';
  const { manager, stage } = setup(t, async () => json({ id: 'receipt-1', path: 'notes/2026/10/photo.png', storage: 'oss', publicUrl }));
  const record = await stage();
  const { file, url } = record;
  await manager.uploadAll([record.id]);
  assert.equal(record.file, file);
  assert.equal(record.url, url);
  assert.equal(record.storage, 'oss');
  assert.equal(record.publicUrl, publicUrl);
  assert.equal(manager.source(`notes-media:${record.id}`), url);
  assert.equal(manager.materialize(`![photo](notes-media:${record.id})`), `![photo](${publicUrl})`);
  assert.deepEqual(manager.descriptors([record.id]), [{ id: 'receipt-1', path: 'notes/2026/10/photo.png' }]);
});

test('GitHub upload responses and existing published references retain their paths', async (t) => {
  const { manager, stage } = setup(t, async () => json({ id: 'github-receipt', path: 'static/uploads/notes/photo.png' }));
  const record = await stage();
  await manager.uploadAll([record.id]);
  assert.equal(record.storage, 'github');
  assert.equal(manager.materialize(`![photo](notes-media:${record.id})`), '![photo](/uploads/notes/photo.png)');
  const existing = '![old](/uploads/notes/old.png) ![OSS](https://media.example.invalid/old.png)';
  assert.equal(manager.materialize(existing), existing);
});

test('a fresh session discards old upload receipts while keeping files available for reupload', async (t) => {
  const uploadedFiles = [];
  const uploadIds = [];
  const { manager, stage } = setup(t, async (file, params) => {
    uploadedFiles.push(file);
    uploadIds.push(params.get('uploadId'));
    return json({ id: params.get('uploadId'), path: 'notes/stable.png', storage: 'oss', publicUrl: 'https://media.example.invalid/notes/stable.png' });
  });
  const record = await stage();
  const { file, url } = record;
  await manager.uploadAll([record.id]);
  manager.resetUploadReceipts();
  assert.equal(record.status, 'pending');
  assert.equal(record.file, file);
  assert.equal(record.url, url);
  assert.equal(record.serverId, '');
  assert.equal(record.path, '');
  assert.equal(record.publicUrl, '');
  assert.throws(() => manager.descriptors([record.id]), /仍有媒体未上传/);
  await manager.uploadAll([record.id]);
  assert.deepEqual(uploadedFiles, [file, file]);
  assert.deepEqual(uploadIds, [record.id, record.id], 'Reauthentication must reuse the persisted file upload identity');
  assert.deepEqual(manager.descriptors([record.id]), [{ id: record.id, path: 'notes/stable.png' }]);
  assert.equal(manager.materialize(`notes-media:${record.id}`), 'https://media.example.invalid/notes/stable.png');
});

test('a failed upload retries with the same UUID and original bytes', async (t) => {
  const attempts = [];
  const { manager, stage } = setup(t, async (file, params) => {
    attempts.push({ file, id: params.get('uploadId'), date: params.get('date') });
    if (attempts.length === 1) throw new Error('Simulated lost upload response');
    return json({ id: params.get('uploadId'), path: 'static/uploads/notes/retry.png', storage: 'oss', publicUrl: 'https://media.example.invalid/notes/retry.png' });
  });
  const record = await stage();
  await assert.rejects(manager.uploadAll([record.id]), /lost upload response/);
  assert.equal(record.status, 'error');
  await manager.uploadAll([record.id]);
  assert.equal(record.status, 'uploaded');
  assert.deepEqual(attempts.map(({ id, date }) => ({ id, date })), [
    { id: record.id, date: '2026-10-30' }, { id: record.id, date: '2026-10-30' },
  ]);
  assert.ok(attempts.every(({ file }) => file === record.file));
});

test('an authentication failure resets earlier upload receipts and preserves every staged file', async (t) => {
  let attempts = 0;
  const { manager, stage } = setup(t, async () => ++attempts === 1
    ? json({ id: 'old-receipt', path: 'static/uploads/notes/photo.png' })
    : json({ error: 'Session expired' }, 401));
  const first = await stage();
  const second = await stage();
  await assert.rejects(manager.uploadAll([first.id, second.id]), /Session expired/);
  for (const record of [first, second]) {
    assert.equal(record.status, 'pending');
    assert.equal(record.serverId, '');
    assert.equal(record.path, '');
    assert.ok(record.file instanceof File);
    assert.ok(record.url.startsWith('blob:'));
  }
});

test('OSS media without a permanent HTTPS URL cannot be written into published Markdown', async (t) => {
  const { manager, stage } = setup(t, async () => json({ id: 'bad-receipt', path: 'notes/photo.png', storage: 'oss', publicUrl: 'http://media.example.invalid/photo.png' }));
  const record = await stage();
  await manager.uploadAll([record.id]);
  assert.throws(() => manager.materialize(`notes-media:${record.id}`), /必须使用 HTTPS/);
  record.publicUrl = '';
  assert.throws(() => manager.materialize(`notes-media:${record.id}`), /缺少公开地址/);
});

test('an upload response from an earlier session cannot restore invalidated receipts', async (t) => {
  let finishUpload;
  const { manager, stage } = setup(t, () => new Promise((resolve) => { finishUpload = resolve; }));
  const record = await stage();
  const uploading = manager.uploadAll([record.id]);
  manager.resetUploadReceipts();
  finishUpload(json({ id: 'old-session', path: 'static/uploads/notes/photo.png' }));
  await assert.rejects(uploading, /登录状态已变化/);
  assert.equal(record.status, 'pending');
  assert.equal(record.serverId, '');
  assert.equal(record.path, '');
  assert.ok(record.file instanceof File);
});

test('the library opens folders, paginates with encoded tokens, and filters unsafe media URLs', async (t) => {
  const requests = [];
  const item = (key, publicUrl = `https://media.example.invalid/${key}`, kind = 'image') => ({ key, name: key.split('/').pop(), kind, publicUrl });
  const pages = [
    { prefix: '', parentPrefix: null, folders: [{ name: '旅行/', prefix: '旅行/' }], items: [], nextContinuationToken: null },
    { prefix: '旅行/', parentPrefix: '', folders: [], items: [item('旅行/a.png'), item('旅行/bad.png', 'http://media.example.invalid/bad.png'), item('旅行/code.html', 'https://media.example.invalid/code.html', 'html')], nextContinuationToken: 'next+/=' },
    { prefix: '旅行/', parentPrefix: '', folders: [], items: [item('旅行/a.png'), item('旅行/video.mp4', 'https://media.example.invalid/video.mp4', 'video')], nextContinuationToken: null },
  ];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(options, undefined, 'Browsing must only issue GET requests');
    requests.push(new URL(url, 'https://editor.example.invalid'));
    return json(pages.shift(), 200);
  });
  const library = createMediaLibrary();
  await library.open();
  assert.deepEqual(library.snapshot().folders, [{ name: '旅行/', prefix: '旅行/' }]);
  await library.open('旅行/');
  assert.equal(library.snapshot().parentPrefix, '');
  assert.equal(library.snapshot().items.length, 1);
  await library.more();
  assert.equal(requests.length, 3);
  assert.equal(requests[1].pathname, '/api/media/library');
  assert.equal(requests[1].searchParams.get('prefix'), '旅行/');
  assert.equal(requests[2].searchParams.get('continuationToken'), 'next+/=');
  assert.deepEqual(library.snapshot().items.map(({ key }) => key), ['旅行/a.png', '旅行/video.mp4']);
  await library.more();
  assert.equal(requests.length, 3, 'An exhausted page must not issue another request');
});

test('inserting an existing library object creates draft Markdown without staging or uploading it', (t) => {
  t.mock.method(globalThis, 'fetch', () => assert.fail('Insertion must not upload or publish'));
  let stagedChanges = 0;
  const manager = createMediaManager({ onChange() { stagedChanges += 1; }, onSessionExpired() {} });
  let draft = '';
  const library = createMediaLibrary({ onInsert(markdown) { draft += markdown; } });
  library.insert({ key: 'a.png', name: '[photo](one)\n.png', kind: 'image', publicUrl: 'https://media.example.invalid/a(one).png' });
  assert.equal(draft, '![photoone.png](https://media.example.invalid/a%28one%29.png)');
  assert.deepEqual(manager.usedIds([{ body: draft }]), []);
  assert.equal(stagedChanges, 0);
  assert.deepEqual(manager.descriptors([]), []);
  assert.match(mediaLibraryMarkdown({ key: 'a.mp4', name: 'a.mp4', kind: 'video', publicUrl: 'https://media.example.invalid/a.mp4' }), /^<video controls.*src="https:\/\/media\.example\.invalid\/a\.mp4"><\/video>$/);
  assert.throws(() => library.insert({ key: 'bad.png', name: 'bad', kind: 'image', publicUrl: 'javascript:alert(1)' }), /媒体地址无效/);
});

test('an expired library session notifies authentication and a late directory response cannot replace a newer view', async (t) => {
  let expired = 0;
  const pending = [];
  t.mock.method(globalThis, 'fetch', () => new Promise((resolve) => pending.push(resolve)));
  const library = createMediaLibrary({ onSessionExpired() { expired += 1; } });
  const oldView = library.open('old/');
  const newView = library.open('new/');
  pending[1](json({ prefix: 'new/', parentPrefix: '', folders: [], items: [], nextContinuationToken: null }, 200));
  await newView;
  pending[0](json({ prefix: 'old/', parentPrefix: '', folders: [], items: [], nextContinuationToken: null }, 200));
  await oldView;
  assert.equal(library.snapshot().prefix, 'new/');
  const denied = library.open();
  pending[2](json({ error: 'Session expired' }, 401));
  await assert.rejects(denied, /Session expired/);
  assert.equal(expired, 1);
  assert.equal(library.snapshot().loading, false);
});
