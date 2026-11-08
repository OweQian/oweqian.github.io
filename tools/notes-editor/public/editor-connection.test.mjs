import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import test from 'node:test';

const draftKey = 'oweqian-notes-editor-draft-v1';
const original = await readFile(new URL('./editor.js', import.meta.url), 'utf8');
const script = original.replace(/^import .*;\n/gm, '').replace(/\ninit\(\);\s*$/, '\nglobalThis.ready = init();');
const tick = () => new Promise((resolve) => setImmediate(resolve));
const response = (value) => ({ ok: true, status: 200, json: async () => value });
const session = (authenticated) => response({ authenticated, mode: 'github', blogUrl: 'https://example.invalid/blog/' });
const notes = () => response({
  revision: 'current', headSha: 'a'.repeat(40), mode: 'github', blogUrl: 'https://example.invalid/blog/',
  entries: [{ id: 0, date: '2026-11-08', title: '', body: ['Published note'] }],
});

function boot(fetch, storage = new Map()) {
  const elements = new Map();
  const timers = new Map();
  let nextTimer = 0;
  const element = () => ({
    value: '', dataset: {}, hidden: false, open: false, handlers: new Map(),
    classList: { toggle() {} }, append() {}, replaceChildren() {}, setAttribute() {}, focus() {},
    addEventListener(name, action) { this.handlers.set(name, action); },
    close() { this.open = false; },
  });
  const query = (selector) => {
    if (!elements.has(selector)) elements.set(selector, element());
    return elements.get(selector);
  };
  const context = vm.createContext({
    document: { querySelector: query, querySelectorAll: () => [], createElement: element, createDocumentFragment: element },
    window: { location: { search: '' }, addEventListener() {} },
    localStorage: { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: (key) => storage.delete(key) },
    renderMarkdown: element, markdownFromRich: () => '', sanitizePaste: element,
    createMediaManager: () => ({
      async init() {}, resetUploadReceipts() {}, usedIds: () => [], async prune() {},
      async uploadAll() {}, descriptors: () => [], materialize: (body) => body, async finalize() {},
    }),
    createMediaLibrary: () => ({ reset() {} }),
    URL, URLSearchParams, Date, AbortController, confirm: () => true, fetch,
    setTimeout(action, ms) { const id = ++nextTimer; timers.set(id, { action, ms }); return id; },
    clearTimeout(id) { timers.delete(id); },
  });
  vm.runInContext(script, context, { filename: 'editor.js' });
  return {
    query, storage, ready: context.ready,
    fire(selector, type = 'click', event = {}) { return query(selector).handlers.get(type)({ preventDefault() {}, ...event }); },
    expire(ms) {
      const match = [...timers].find(([, timer]) => timer.ms === ms);
      assert.ok(match, `Expected a ${ms}ms request deadline`);
      timers.delete(match[0]);
      match[1].action();
    },
  };
}

test('a stalled login times out, releases controls, and offers reconnection without retrying credentials', async () => {
  let logins = 0;
  const editor = boot(async (url) => {
    if (url === '/api/session') return session(false);
    if (url === '/api/login') { logins += 1; return new Promise(() => {}); }
    throw new Error(`Unexpected request ${url}`);
  });
  await editor.ready;
  const submitted = editor.fire('#login-form', 'submit');
  await tick();
  assert.equal(editor.query('#login-submit').disabled, true);
  editor.expire(75000);
  await submitted;
  assert.equal(logins, 1);
  assert.equal(editor.query('#login-submit').disabled, false);
  assert.equal(editor.query('#reconnect').disabled, false);
  assert.equal(editor.query('#reconnect').hidden, false);
  assert.match(editor.query('#login-error').textContent, /响应超时/);
});

test('manual reconnection recovers an existing session once and preserves an unrecovered draft', async () => {
  let sessionRequests = 0;
  let releaseSession;
  const draft = { revision: 'old', selectedId: 0, entries: [{ id: 0, date: '2026-11-08', title: '', body: 'Local draft' }] };
  const storage = new Map([[draftKey, JSON.stringify(draft)]]);
  const editor = boot(async (url) => {
    if (url === '/api/session') {
      sessionRequests += 1;
      if (sessionRequests === 1) return new Promise(() => {});
      return new Promise((resolve) => { releaseSession = () => resolve(session(true)); });
    }
    if (url === '/api/notes') return notes();
    throw new Error(`Unexpected request ${url}`);
  }, storage);
  await tick();
  editor.expire(75000);
  await editor.ready;
  assert.equal(editor.query('#login-view').hidden, false);
  const reconnecting = editor.fire('#reconnect');
  assert.equal(editor.fire('#reconnect'), reconnecting, 'Concurrent clicks share the same request');
  await tick();
  assert.equal(sessionRequests, 2);
  releaseSession();
  await reconnecting;
  assert.equal(editor.query('#editor-shell').hidden, false);
  assert.equal(editor.query('#login-view').hidden, true);
  assert.equal(editor.query('#entry-total').textContent, '1 条');
  assert.equal(editor.query('#draft-banner').hidden, false);
  assert.deepEqual(JSON.parse(storage.get(draftKey)), draft);
});

test('an uncertain save is sent once, retains its draft, and requires reloading before another submission', async () => {
  let posts = 0;
  let reads = 0;
  const draft = { revision: 'current', selectedId: 0, entries: [{ id: 0, date: '2026-11-08', title: '', body: 'Unsent draft' }] };
  const storage = new Map([[draftKey, JSON.stringify(draft)]]);
  const editor = boot(async (url, options) => {
    if (url === '/api/session') return session(true);
    if (url === '/api/notes' && options.method === 'POST') { posts += 1; return new Promise(() => {}); }
    if (url === '/api/notes') { reads += 1; return notes(); }
    throw new Error(`Unexpected request ${url}`);
  }, storage);
  await editor.ready;
  editor.fire('#restore-draft');
  const saving = editor.fire('#save');
  await tick();
  assert.equal(editor.fire('#reload-notes'), undefined, 'A reload cannot overlap a save');
  assert.equal(reads, 1);
  editor.expire(180000);
  await saving;
  assert.equal(posts, 1);
  assert.equal(editor.query('#save').disabled, true);
  assert.equal(JSON.parse(storage.get(draftKey)).entries[0].body, 'Unsent draft');
  assert.equal(editor.query('#connection-banner').hidden, false);
  assert.match(editor.query('#connection-error').textContent, /重新载入核对/);
  await editor.fire('#save');
  assert.equal(posts, 1, 'An ambiguous result must not be blindly submitted again');
});

test('a failed content load leaves a persistent reload action instead of an empty editor with only a toast', async () => {
  let unavailable = true;
  const editor = boot(async (url) => {
    if (url === '/api/session') return session(true);
    if (url === '/api/notes' && unavailable) return { ok: false, status: 502, json: async () => ({ error: '无法连接 GitHub，请稍后重试' }) };
    if (url === '/api/notes') return notes();
    throw new Error(`Unexpected request ${url}`);
  });
  await editor.ready;
  assert.equal(editor.query('#connection-banner').hidden, false);
  assert.match(editor.query('#connection-error').textContent, /无法连接 GitHub/);
  unavailable = false;
  await editor.fire('#reload-notes');
  assert.equal(editor.query('#connection-banner').hidden, true);
  assert.equal(editor.query('#entry-total').textContent, '1 条');
});

test('edits made during a reconnecting read are retained as a draft and cannot be submitted concurrently', async () => {
  let reads = 0;
  let releaseNotes;
  let posts = 0;
  const editor = boot(async (url, options) => {
    if (url === '/api/session') return session(true);
    if (options.method === 'POST') { posts += 1; throw new Error('Concurrent save must be prevented'); }
    if (url === '/api/notes') {
      reads += 1;
      if (reads === 1) return notes();
      return new Promise((resolve) => { releaseNotes = () => resolve(notes()); });
    }
    throw new Error(`Unexpected request ${url}`);
  });
  await editor.ready;
  const reconnecting = editor.fire('#reload-notes');
  await tick();
  editor.fire('#entry-body', 'input', { target: { value: 'Typed while reconnecting' } });
  assert.equal(editor.query('#save').disabled, true);
  await editor.fire('#save');
  assert.equal(posts, 0);
  releaseNotes();
  await reconnecting;
  assert.equal(JSON.parse(editor.storage.get(draftKey)).entries[0].body, 'Typed while reconnecting');
  assert.equal(editor.query('#draft-banner').hidden, false);
});

test('reloading a repository version that matches the local draft hides an earlier recovery banner', async () => {
  let published = 'Published note';
  const draft = { revision: 'old', selectedId: 0, entries: [{ id: 0, date: '2026-11-08', title: '', body: 'Local draft' }] };
  const storage = new Map([[draftKey, JSON.stringify(draft)]]);
  const editor = boot(async (url) => {
    if (url === '/api/session') return session(true);
    if (url === '/api/notes') {
      const current = await notes().json();
      current.entries[0].body = [published];
      return response(current);
    }
    throw new Error(`Unexpected request ${url}`);
  }, storage);
  await editor.ready;
  assert.equal(editor.query('#draft-banner').hidden, false);
  published = 'Local draft';
  await editor.fire('#reload-notes');
  assert.equal(editor.query('#draft-banner').hidden, true);
  assert.equal(editor.query('#save').disabled, true);
  assert.deepEqual(JSON.parse(storage.get(draftKey)), draft);
});

test('reloading cannot replace unsaved contents if the browser cannot persist its draft', async () => {
  let reads = 0;
  const storage = new Map();
  const editor = boot(async (url) => {
    if (url === '/api/session') return session(true);
    if (url === '/api/notes') { reads += 1; return notes(); }
    throw new Error(`Unexpected request ${url}`);
  }, storage);
  await editor.ready;
  editor.fire('#entry-body', 'input', { target: { value: 'Keep this unsaved text' } });
  storage.set = () => { throw new Error('Quota exceeded'); };
  await editor.fire('#reload-notes');
  assert.equal(reads, 1, 'No replacement read starts without protecting unsaved contents');
  assert.equal(editor.query('#entry-body').value, 'Keep this unsaved text');
  assert.equal(editor.query('#connection-banner').hidden, false);
  assert.match(editor.query('#connection-error').textContent, /先复制未保存内容/);
});

test('logout invalidates a pending reload and its late completion cannot overwrite a newer connection', async () => {
  let reads = 0;
  let sessions = 0;
  let releaseOldNotes;
  let releaseNewSession;
  const editor = boot(async (url) => {
    if (url === '/api/session') {
      sessions += 1;
      if (sessions < 3) return session(true);
      return new Promise((resolve) => { releaseNewSession = () => resolve(session(false)); });
    }
    if (url === '/api/logout') return session(false);
    if (url === '/api/notes') {
      reads += 1;
      if (reads === 1) return notes();
      return new Promise((resolve) => {
        releaseOldNotes = async () => {
          const old = await notes().json();
          old.entries[0].body = ['Stale response after logout'];
          resolve(response(old));
        };
      });
    }
    throw new Error(`Unexpected request ${url}`);
  });
  await editor.ready;
  const staleConnection = editor.fire('#reload-notes');
  await tick();
  await editor.fire('#logout');
  assert.equal(editor.query('#editor-shell').hidden, true);
  assert.equal(editor.query('#login-view').hidden, false);
  const currentConnection = editor.fire('#reconnect');
  await tick();
  assert.equal(editor.query('#login-submit').disabled, true);
  await releaseOldNotes();
  await staleConnection;
  assert.equal(editor.query('#editor-shell').hidden, true, 'Old reads cannot show the editor after logout');
  assert.equal(editor.query('#entry-body').value, 'Published note');
  assert.equal(editor.query('#login-submit').disabled, true, 'Old finally handlers cannot unlock newer work');
  assert.equal(editor.query('#reload-notes').disabled, true);
  releaseNewSession();
  await currentConnection;
  assert.equal(editor.query('#login-submit').disabled, false);
});

test('logout leaves the editor immediately and has a shorter deadline than cold-start reads', async () => {
  const editor = boot(async (url) => {
    if (url === '/api/session') return session(true);
    if (url === '/api/notes') return notes();
    if (url === '/api/logout') return new Promise(() => {});
    throw new Error(`Unexpected request ${url}`);
  });
  await editor.ready;
  const logout = editor.fire('#logout');
  assert.equal(editor.query('#editor-shell').hidden, true);
  assert.equal(editor.query('#login-view').hidden, false);
  editor.expire(10000);
  await logout;
  assert.equal(editor.query('#login-submit').disabled, false);
  assert.match(editor.query('#login-error').textContent, /退出请求尚未确认/);
});

test('an invalid successful save response preserves the draft and requires verification before another post', async () => {
  let posts = 0;
  const editor = boot(async (url, options) => {
    if (url === '/api/session') return session(true);
    if (url === '/api/notes' && options.method === 'POST') { posts += 1; return response({}); }
    if (url === '/api/notes') return notes();
    throw new Error(`Unexpected request ${url}`);
  });
  await editor.ready;
  editor.fire('#entry-body', 'input', { target: { value: 'Draft awaiting confirmation' } });
  await editor.fire('#save');
  assert.equal(editor.query('#save').disabled, true);
  assert.equal(editor.query('#entry-body').value, 'Draft awaiting confirmation');
  assert.equal(JSON.parse(editor.storage.get(draftKey)).entries[0].body, 'Draft awaiting confirmation');
  assert.match(editor.query('#connection-error').textContent, /重新载入核对/);
  await editor.fire('#save');
  assert.equal(posts, 1);
});

test('an invalid reload cannot clear the verification requirement after an uncertain save', async () => {
  let posts = 0;
  let reads = 0;
  const editor = boot(async (url, options) => {
    if (url === '/api/session') return session(true);
    if (url === '/api/notes' && options.method === 'POST') { posts += 1; throw new Error('Connection lost'); }
    if (url === '/api/notes') { reads += 1; return reads === 1 ? notes() : response({}); }
    throw new Error(`Unexpected request ${url}`);
  });
  await editor.ready;
  editor.fire('#entry-body', 'input', { target: { value: 'Keep the uncertain draft' } });
  await editor.fire('#save');
  await editor.fire('#reload-notes');
  assert.equal(editor.query('#save').disabled, true);
  assert.equal(editor.query('#entry-body').value, 'Keep the uncertain draft');
  assert.equal(JSON.parse(editor.storage.get(draftKey)).entries[0].body, 'Keep the uncertain draft');
  assert.match(editor.query('#connection-error').textContent, /记录数据无效/);
  await editor.fire('#save');
  assert.equal(posts, 1);
});
