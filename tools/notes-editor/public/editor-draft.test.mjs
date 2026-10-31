import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import test from 'node:test';

const draftKey = 'oweqian-notes-editor-draft-v1';
const mediaId = '123e4567-e89b-42d3-a456-426614174000';
const draft = { revision: 'old', selectedId: 0, entries: [{ id: 0, date: '2026-10-30', title: '', body: `Draft ![photo](notes-media:${mediaId})` }] };
const original = await readFile(new URL('./editor.js', import.meta.url), 'utf8');
// Execute the real browser entrypoint with DOM/storage adapters and its imports supplied by the harness.
const script = original.replace(/^import .*;\n/gm, '').replace(/\ninit\(\);\s*$/, '\nglobalThis.ready = init();');

async function boot(storage) {
  const elements = new Map();
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
  const files = new Set([mediaId]);
  const pruned = [];
  const media = {
    async init() {}, resetUploadReceipts() {},
    usedIds(entries) { return [...entries.map(({ body }) => body).join('\n').matchAll(/notes-media:([a-f0-9-]{36})/g)].map((match) => match[1]); },
    async prune(ids) { pruned.push([...ids]); for (const id of files) if (!ids.includes(id)) files.delete(id); },
    async uploadAll() {}, descriptors() { return [{ id: mediaId, path: 'notes/photo.png' }]; },
    materialize(body) { return body.replace(`notes-media:${mediaId}`, 'https://media.example.invalid/notes/photo.png'); },
    async finalize(ids) { ids.forEach((id) => files.delete(id)); },
  };
  const context = vm.createContext({
    document: { querySelector: query, querySelectorAll: () => [], createElement: element, createDocumentFragment: element },
    window: { location: { search: '' }, addEventListener() {} },
    localStorage: { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: (key) => storage.delete(key) },
    renderMarkdown: element, markdownFromRich: () => '', sanitizePaste: element,
    createMediaManager: () => media, createMediaLibrary: () => ({ reset() {} }),
    URL, URLSearchParams, Date, setTimeout: () => 0, clearTimeout() {}, confirm: () => true,
    fetch: async (url, options) => {
      let value;
      if (url === '/api/session') value = { authenticated: true, mode: 'github', blogUrl: 'https://example.invalid/blog/' };
      else if (url === '/api/notes') {
        const published = options?.method === 'POST' ? JSON.parse(options.body).entries : [{ id: 0, date: '2026-10-30', title: '', body: 'Published note' }];
        value = { revision: 'current', headSha: 'a'.repeat(40), mode: 'github', mediaStorage: 'oss', blogUrl: 'https://example.invalid/blog/', entries: published.map((entry) => ({ ...entry, body: entry.body.split('\n') })) };
      } else throw new Error('Unexpected test request');
      return { ok: true, json: async () => value };
    },
  });
  vm.runInContext(script, context, { filename: 'editor.js' });
  await context.ready;
  return { query, files, pruned, click: async (selector) => query(selector).handlers.get('click')() };
}

test('refreshing before choosing a recovered draft retains its text and staged media', async () => {
  const storage = new Map([[draftKey, JSON.stringify(draft)]]);
  for (let refresh = 0; refresh < 2; refresh += 1) {
    const editor = await boot(storage);
    assert.deepEqual(JSON.parse(storage.get(draftKey)), draft);
    assert.equal(editor.query('#draft-banner').hidden, false);
    assert.deepEqual(editor.pruned, [[mediaId]]);
    assert.ok(editor.files.has(mediaId));
  }
});

test('only explicit discard or a successful restored save clears the recovered draft', async () => {
  const discarded = new Map([[draftKey, JSON.stringify(draft)]]);
  const first = await boot(discarded);
  await first.click('#discard-draft');
  assert.equal(discarded.has(draftKey), false);
  assert.equal(first.files.size, 0);

  const restored = new Map([[draftKey, JSON.stringify(draft)]]);
  const second = await boot(restored);
  await second.click('#restore-draft');
  assert.equal(second.query('#entry-body').value, draft.entries[0].body);
  assert.ok(restored.has(draftKey));
  assert.ok(second.files.has(mediaId));
  await second.click('#save');
  assert.equal(restored.has(draftKey), false);
  assert.equal(second.files.size, 0);
});
