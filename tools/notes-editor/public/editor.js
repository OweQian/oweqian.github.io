import { renderMarkdown, markdownFromRich, sanitizePaste } from './rich-text.js';
import { createMediaManager } from './media.js';

const $ = (selector) => document.querySelector(selector);
const DRAFT_KEY = 'oweqian-notes-editor-draft-v1';
const state = {
  entries: [], revision: '', headSha: '', selectedId: null, dirty: false, snapshot: '',
  blogUrl: '', mode: 'local', view: 'rich', saving: false,
};
let draftTimer = null;
let toastTimer = null;
let pendingDraft = null;
let savedRange = null;
let sourceSelection = { start: 0, end: 0 };

const serialize = (entries = state.entries) => JSON.stringify(entries.map(({ id, date, title, body }) => ({ id, date, title, body })));
const selected = () => state.entries.find((entry) => String(entry.id) === String(state.selectedId));
const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

function notify(message, error = false) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.toggle('error', error);
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.hidden = true; }, error ? 7000 : 4000);
}

const media = createMediaManager({
  onChange: renderMedia,
  onSessionExpired: () => showLogin('登录已失效，草稿仍保留，请重新登录。'),
});

async function request(url, options) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && !url.includes('/api/login')) showLogin('登录已失效，草稿仍保留，请重新登录。');
    throw Object.assign(new Error(data.error || '请求失败'), { status: response.status });
  }
  return data;
}

function showLogin(message = '') {
  saveDraft();
  $('#boot-state').hidden = true;
  $('#editor-shell').hidden = true;
  $('#login-view').hidden = false;
  $('#login-blog-link').href = state.blogUrl || 'https://www.oweqian.xyz/blog/';
  $('#login-error').textContent = message;
  $('#login-error').hidden = !message;
  $('#login-password').value = '';
  setTimeout(() => $('#login-password').focus(), 0);
}

function showEditor() {
  $('#boot-state').hidden = true;
  $('#login-view').hidden = true;
  $('#editor-shell').hidden = false;
  const online = state.mode === 'github';
  $('#editor-mode').textContent = online ? '在线发布' : '本地';
  $('#logout').hidden = !online;
  $('#save-label').textContent = online ? '保存并发布' : '保存';
  $('#storage-detail').textContent = online ? '正文与新媒体同一提交 · 自动触发部署' : '只写文件，不提交、不推送';
  $('#sidebar-storage-note').textContent = online ? '仅编辑碎碎念与本次上传的媒体' : '只编辑这一份 Markdown，不读取其他文章';
  $('#blog-link').href = state.blogUrl;
  $('#login-blog-link').href = state.blogUrl;
}

function renderList() {
  const query = $('#entry-search').value.trim().toLowerCase();
  const list = $('#entry-list');
  const entries = state.entries.filter((entry) => `${entry.date} ${entry.title} ${entry.body}`.toLowerCase().includes(query));
  const fragment = document.createDocumentFragment();
  entries.forEach((entry) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'entry-row';
    button.setAttribute('role', 'option');
    button.setAttribute('aria-selected', String(String(entry.id) === String(state.selectedId)));
    const date = document.createElement('span');
    date.className = 'date';
    date.textContent = entry.date;
    const excerpt = document.createElement('span');
    excerpt.className = 'excerpt';
    excerpt.textContent = entry.title || entry.body.replace(/<[^>]+>|!\[[^\]]*\]\([^)]*\)|[#>*`\[\]]/g, '').trim().slice(0, 45) || '空白记录';
    button.append(date, excerpt);
    button.addEventListener('click', () => selectEntry(entry.id));
    fragment.append(button);
  });
  if (!entries.length) {
    const empty = document.createElement('p');
    empty.className = 'entry-empty';
    empty.textContent = query ? '没有匹配的记录' : '还没有记录，从这一天开始吧';
    fragment.append(empty);
  }
  list.replaceChildren(fragment);
  $('#entry-total').textContent = `${state.entries.length} 条`;
}

function selectEntry(id) {
  state.selectedId = id;
  renderList();
  renderEditor();
}

function renderRich() {
  $('#rich-editor').replaceChildren(renderMarkdown(selected()?.body || '', media));
}

function updatePreview() {
  $('#preview').replaceChildren(renderMarkdown(selected()?.body || '', media));
}

function renderEditor() {
  const entry = selected();
  $('#empty-state').hidden = Boolean(entry);
  $('#entry-editor').hidden = !entry;
  if (!entry) return;
  $('#selected-date').textContent = entry.date;
  $('#entry-date').value = entry.date;
  $('#entry-title').value = entry.title;
  $('#entry-body').value = entry.body;
  $('#character-count').textContent = `${entry.body.replace(/\s/g, '').length} 字符`;
  renderRich();
  updatePreview();
}

function updateBody(body) {
  const entry = selected();
  if (!entry) return;
  entry.body = body;
  $('#entry-body').value = body;
  $('#character-count').textContent = `${body.replace(/\s/g, '').length} 字符`;
  updatePreview();
  renderList();
  setDirty();
}

function setDirty() {
  state.dirty = serialize() !== state.snapshot;
  $('#save').disabled = !state.dirty || state.saving;
  $('#save-state').textContent = state.dirty ? '有未保存修改' : (state.mode === 'github' ? '已与仓库同步' : '已与文件同步');
  $('#save-state').classList.toggle('is-dirty', state.dirty);
  clearTimeout(draftTimer);
  if (state.dirty) draftTimer = setTimeout(saveDraft, 350);
  else localStorage.removeItem(DRAFT_KEY);
}

function saveDraft() {
  if (!state.dirty) return;
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ revision: state.revision, selectedId: state.selectedId, entries: state.entries, savedAt: new Date().toISOString() }));
  } catch {
    notify('浏览器草稿空间不足，请先保存', true);
  }
}

function applyState(data, selectedDate) {
  state.entries = data.entries.map((entry) => ({ id: entry.id, date: entry.date, title: entry.title, body: entry.body.join('\n') }));
  state.revision = data.revision;
  state.headSha = data.headSha || '';
  state.blogUrl = data.blogUrl;
  state.mode = data.mode;
  state.selectedId = state.entries.find((entry) => entry.date === selectedDate)?.id ?? state.entries[0]?.id ?? null;
  state.snapshot = serialize();
  $('#blog-link').href = data.blogUrl;
  const publication = data.publication;
  $('#publication-link').hidden = !publication?.commitUrl;
  if (publication?.commitUrl) $('#publication-link').href = publication.commitUrl;
  $('#save-detail').textContent = publication?.mode === 'github'
    ? `提交 ${publication.commitSha.slice(0, 8)} · 等待 GitHub Actions 部署`
    : `版本 ${data.revision.slice(0, 8)} · 保存时自动生成备份`;
  setDirty();
  showEditor();
  renderList();
  renderEditor();
}

function readDraft() {
  try {
    const draft = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
    if (!draft || !Array.isArray(draft.entries) || !draft.entries.every((entry) =>
      entry && (typeof entry.id === 'string' || typeof entry.id === 'number') &&
      typeof entry.date === 'string' && typeof entry.title === 'string' && typeof entry.body === 'string')) return null;
    return draft;
  } catch {
    return null;
  }
}

async function load() {
  pendingDraft = readDraft();
  try {
    const data = await request('/api/notes');
    const params = new URLSearchParams(window.location.search);
    applyState(data, params.get('date'));
    await media.prune(media.usedIds(pendingDraft?.entries || []));
    const requestedNew = params.get('new');
    if (requestedNew) {
      const match = requestedNew.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      const date = match ? new Date(`${requestedNew}T00:00:00`) : null;
      const valid = date && Number(date.getFullYear()) === Number(match[1])
        && date.getMonth() + 1 === Number(match[2]) && date.getDate() === Number(match[3]);
      if (valid) {
        $('#new-date').value = requestedNew;
        createEntry(requestedNew);
      } else notify('新建记录的日期无效', true);
    }
    if (pendingDraft && serialize(pendingDraft.entries) !== state.snapshot) {
      $('#draft-banner p').textContent = pendingDraft.revision === state.revision
        ? '发现这份文件的本地草稿，尚未保存。'
        : '发现旧版本的本地草稿。恢复前请确认，不会自动保存或发布。';
      $('#draft-banner').hidden = false;
    }
  } catch (error) {
    $('#save-state').textContent = '载入失败';
    notify(error.message, true);
  }
}

async function save() {
  if (!state.dirty || state.saving) return;
  const date = selected()?.date;
  state.saving = true;
  $('#save').disabled = true;
  $('#save-state').textContent = '正在检查媒体…';
  saveDraft();
  try {
    const ids = media.usedIds(state.entries);
    await media.prune(ids);
    if (ids.length) $('#save-state').textContent = `正在上传 ${ids.length} 个媒体文件…`;
    await media.uploadAll(ids);
    $('#save-state').textContent = state.mode === 'github' ? '正在提交发布…' : '正在校验并保存…';
    const payload = {
      revision: state.revision,
      entries: state.entries.map((entry) => ({ ...entry, body: media.materialize(entry.body) })),
      media: media.descriptors(ids),
    };
    if (state.mode === 'github') payload.headSha = state.headSha;
    const data = await request('/api/notes', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload),
    });
    applyState(data, date);
    await media.finalize(ids);
    pendingDraft = null;
    $('#save-state').textContent = data.publication?.mode === 'github' ? '已提交，等待部署' : `已保存 ${new Date().toLocaleTimeString('zh-CN', { hour12: false })}`;
    $('#draft-banner').hidden = true;
    notify(data.publication?.mode === 'github' ? '正文与媒体已提交，GitHub Actions 将自动部署' : '已保存到碎碎念，原文件已备份');
  } catch (error) {
    $('#save-state').textContent = '保存失败，草稿仍在';
    notify(error.status === 409 ? `版本冲突：${error.message}` : `保存失败：${error.message}`, true);
  } finally {
    state.saving = false;
    $('#save').disabled = !state.dirty;
  }
}

function syncFromRich() {
  updateBody(markdownFromRich($('#rich-editor')));
}

function setView(view) {
  state.view = view;
  $('#editor-panels').dataset.view = view;
  document.querySelectorAll('.view-switch [data-view]').forEach((item) => item.setAttribute('aria-pressed', String(item.dataset.view === view)));
  if (view === 'rich') renderRich();
  if (view === 'source') $('#entry-body').value = selected()?.body || '';
  if (view === 'split') updatePreview();
}

function insertSource(text) {
  const textarea = $('#entry-body');
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  textarea.setRangeText(text, start, end, 'end');
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
  textarea.focus();
}

function formatSource(format) {
  const textarea = $('#entry-body');
  const value = textarea.value;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const text = value.slice(start, end) || '文字';
  const prefixes = { h2: '## ', h3: '### ', blockquote: '> ', insertUnorderedList: '- ' };
  let replacement;
  if (format === 'bold') replacement = `**${text}**`;
  else if (format === 'italic') replacement = `*${text}*`;
  else if (format === 'insertOrderedList') replacement = text.split('\n').map((line, index) => `${index + 1}. ${line}`).join('\n');
  else replacement = text.split('\n').map((line) => `${prefixes[format] || ''}${line}`).join('\n');
  textarea.setRangeText(replacement, start, end, 'select');
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
  textarea.focus();
}

function applyFormat(format) {
  if (state.view !== 'rich') return formatSource(format);
  const editor = $('#rich-editor');
  editor.focus();
  if (savedRange && editor.contains(savedRange.commonAncestorContainer)) {
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(savedRange);
  }
  document.execCommand('styleWithCSS', false, false);
  if (['h2', 'h3', 'blockquote'].includes(format)) document.execCommand('formatBlock', false, format);
  else document.execCommand(format, false, null);
  syncFromRich();
}

function rememberSelection() {
  const selection = window.getSelection();
  if (selection.rangeCount && $('#rich-editor').contains(selection.anchorNode)) savedRange = selection.getRangeAt(0).cloneRange();
}

function insertRichFragment(fragment) {
  const editor = $('#rich-editor');
  editor.focus();
  const selection = window.getSelection();
  const range = savedRange && editor.contains(savedRange.commonAncestorContainer)
    ? savedRange : selection.rangeCount && editor.contains(selection.anchorNode)
      ? selection.getRangeAt(0) : (() => { const end = document.createRange(); end.selectNodeContents(editor); end.collapse(false); return end; })();
  range.deleteContents();
  const marker = document.createTextNode('');
  fragment.append(marker);
  range.insertNode(fragment);
  range.setStartAfter(marker);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
  marker.remove();
  syncFromRich();
}

function validLink(value) {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
  } catch {
    return '';
  }
}

async function addFiles(files) {
  const entry = selected();
  if (!entry || !files.length) return;
  let added = 0;
  for (const file of files) {
    try {
      const record = await media.stage(file, entry.date);
      const alt = record.name.replace(/[\[\]\r\n]/g, '').slice(0, 120);
      const token = `notes-media:${record.id}`;
      const markdown = record.kind === 'image'
        ? `![${alt}](${token})`
        : `<video controls preload="metadata" playsinline src="${token}"></video>`;
      if (state.view === 'rich') insertRichFragment(renderMarkdown(markdown, media));
      else insertSource(`\n${markdown}\n`);
      added += 1;
    } catch (error) {
      notify(error.message, true);
    }
  }
  if (added) notify(`已加入 ${added} 个媒体，保存时上传发布`);
}

function renderMedia(records) {
  const tray = $('#media-tray');
  if (!tray) return;
  tray.hidden = !records.length;
  $('#media-summary').textContent = records.length ? `${records.length} 个文件` : '';
  const fragment = document.createDocumentFragment();
  const labels = { pending: '等待上传', uploading: '正在上传', uploaded: '已上传，等待保存', error: '上传失败，保存时重试' };
  records.forEach((record) => {
    const item = document.createElement('div');
    item.className = `media-item${record.status === 'error' ? ' is-error' : ''}`;
    const thumb = document.createElement('div');
    thumb.className = 'media-thumb';
    if (record.kind === 'image') {
      const image = document.createElement('img');
      image.src = record.url;
      image.alt = '';
      thumb.append(image);
    } else thumb.textContent = 'VIDEO';
    const info = document.createElement('div');
    info.className = 'media-info';
    const name = document.createElement('strong');
    name.textContent = record.name;
    name.title = record.name;
    const status = document.createElement('span');
    status.textContent = record.error || labels[record.status] || record.status;
    info.append(name, status);
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'media-remove';
    remove.textContent = '移除';
    remove.setAttribute('aria-label', `移除 ${record.name}`);
    remove.addEventListener('click', () => removeMedia(record.id));
    item.append(thumb, info, remove);
    fragment.append(item);
  });
  $('#media-list').replaceChildren(fragment);
}

async function removeMedia(id) {
  const token = `notes-media:${id}`;
  state.entries.forEach((entry) => {
    entry.body = entry.body.replace(new RegExp(`!\\[[^\\]]*\\]\\(${token}\\)`, 'g'), '')
      .replace(new RegExp(`<video[^>]*${token}[^>]*></video>`, 'g'), '');
  });
  await media.remove(id);
  renderEditor();
  setDirty();
}

function createEntry(date) {
  if (!date) return notify('请先选择日期', true);
  const existing = state.entries.find((entry) => entry.date === date);
  if (existing) {
    selectEntry(existing.id);
    notify('已定位到这一天的记录');
    return;
  }
  const entry = { id: `new-${crypto.randomUUID()}`, date, title: '', body: '' };
  state.entries.push(entry);
  state.entries.sort((a, b) => b.date.localeCompare(a.date));
  state.selectedId = entry.id;
  renderList();
  renderEditor();
  setDirty();
  $('#entry-title').focus();
  notify('新记录已加入编辑器，保存后才会生效');
}

$('#login-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  $('#login-submit').disabled = true;
  $('#login-error').hidden = true;
  try {
    const data = await request('/api/login', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: $('#login-username').value, password: $('#login-password').value }),
    });
    state.mode = data.mode;
    state.blogUrl = data.blogUrl;
    showEditor();
    await load();
  } catch (error) {
    $('#login-error').textContent = error.message;
    $('#login-error').hidden = false;
  } finally {
    $('#login-submit').disabled = false;
  }
});
$('#logout').addEventListener('click', async () => {
  saveDraft();
  await request('/api/logout', { method: 'POST' }).catch(() => {});
  showLogin();
});
$('#entry-body').addEventListener('input', (event) => updateBody(event.target.value));
$('#rich-editor').addEventListener('input', syncFromRich);
$('#rich-editor').addEventListener('mouseup', rememberSelection);
$('#rich-editor').addEventListener('keyup', rememberSelection);
$('#entry-title').addEventListener('input', (event) => {
  const entry = selected();
  if (!entry) return;
  entry.title = event.target.value;
  renderList();
  setDirty();
});
$('#entry-date').addEventListener('change', (event) => {
  const entry = selected();
  if (!entry || !event.target.value) return;
  entry.date = event.target.value;
  state.entries.sort((a, b) => b.date.localeCompare(a.date));
  $('#selected-date').textContent = entry.date;
  renderList();
  setDirty();
});
$('#new-date').value = today();
$('#new-entry').addEventListener('click', () => createEntry($('#new-date').value));
$('#delete-entry').addEventListener('click', () => {
  const entry = selected();
  if (!entry || !confirm(`确定删除 ${entry.date} 这条记录？保存前可重新载入撤销。`)) return;
  state.entries = state.entries.filter((item) => item !== entry);
  state.selectedId = state.entries[0]?.id ?? null;
  renderList();
  renderEditor();
  setDirty();
  notify('已从编辑器移除，保存后生效');
});
$('#save').addEventListener('click', save);
$('#entry-search').addEventListener('input', renderList);
$('#restore-draft').addEventListener('click', () => {
  if (!pendingDraft) return;
  if (pendingDraft.revision !== state.revision && !confirm('文件版本已变化，仍要恢复这份本地草稿吗？')) return;
  state.entries = pendingDraft.entries;
  state.selectedId = pendingDraft.selectedId;
  pendingDraft = null;
  $('#draft-banner').hidden = true;
  renderList();
  renderEditor();
  setDirty();
  notify('草稿已恢复，尚未保存');
});
$('#discard-draft').addEventListener('click', async () => {
  pendingDraft = null;
  localStorage.removeItem(DRAFT_KEY);
  $('#draft-banner').hidden = true;
  await media.prune([]);
});
document.querySelectorAll('.view-switch [data-view]').forEach((button) => button.addEventListener('click', () => setView(button.dataset.view)));
document.querySelectorAll('[data-format]').forEach((button) => button.addEventListener('click', () => applyFormat(button.dataset.format)));
document.querySelectorAll('[data-media-picker]').forEach((button) => button.addEventListener('click', () => {
  rememberSelection();
  sourceSelection = { start: $('#entry-body').selectionStart, end: $('#entry-body').selectionEnd };
  $(`#${button.dataset.mediaPicker}-input`).click();
}));
for (const kind of ['image', 'video']) {
  $(`#${kind}-input`).addEventListener('change', async (event) => {
    if (state.view !== 'rich') $('#entry-body').setSelectionRange(sourceSelection.start, sourceSelection.end);
    await addFiles([...event.target.files]);
    event.target.value = '';
  });
}
$('#insert-link').addEventListener('click', () => {
  rememberSelection();
  sourceSelection = { start: $('#entry-body').selectionStart, end: $('#entry-body').selectionEnd };
  $('#link-form').hidden = false;
  $('#link-url').focus();
});
$('#cancel-link').addEventListener('click', () => { $('#link-form').hidden = true; });
$('#link-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const url = validLink($('#link-url').value);
  if (!url) return notify('请输入有效的 http 或 https 链接', true);
  if (state.view === 'rich') {
    $('#rich-editor').focus();
    const selection = window.getSelection();
    if (savedRange) {
      selection.removeAllRanges();
      selection.addRange(savedRange);
    }
    document.execCommand('createLink', false, url);
    syncFromRich();
  } else {
    const textarea = $('#entry-body');
    const text = textarea.value.slice(sourceSelection.start, sourceSelection.end) || '链接文字';
    textarea.setSelectionRange(sourceSelection.start, sourceSelection.end);
    insertSource(`[${text}](${url})`);
  }
  $('#link-form').hidden = true;
  $('#link-url').value = '';
});
$('#rich-editor').addEventListener('paste', (event) => {
  const files = [...event.clipboardData.files];
  if (files.length) {
    event.preventDefault();
    addFiles(files);
    return;
  }
  const html = event.clipboardData.getData('text/html');
  if (html) {
    event.preventDefault();
    insertRichFragment(sanitizePaste(html, media));
  }
});
for (const target of [$('#rich-editor'), $('#entry-body')]) {
  target.addEventListener('dragover', (event) => event.preventDefault());
  target.addEventListener('drop', (event) => {
    if (!event.dataTransfer.files.length) return;
    event.preventDefault();
    addFiles([...event.dataTransfer.files]);
  });
}
window.addEventListener('keydown', (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's' && !$('#editor-shell').hidden) {
    event.preventDefault();
    save();
  }
});
window.addEventListener('beforeunload', (event) => {
  if (state.dirty) {
    event.preventDefault();
    event.returnValue = '';
  }
});

async function init() {
  await media.init();
  try {
    const session = await request('/api/session');
    state.mode = session.mode;
    state.blogUrl = session.blogUrl;
    if (!session.authenticated) return showLogin();
    showEditor();
    await load();
  } catch (error) {
    showLogin(`编辑器暂时不可用：${error.message}`);
  }
}

init();
