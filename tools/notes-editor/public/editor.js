const $ = (selector) => document.querySelector(selector);
const DRAFT_KEY = 'oweqian-notes-editor-draft-v1';
const state = { entries: [], revision: '', selectedId: null, dirty: false, snapshot: '', blogUrl: '' };
let draftTimer = null;
let toastTimer = null;
let pendingDraft = null;

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
  toastTimer = setTimeout(() => { toast.hidden = true; }, error ? 7000 : 3500);
}

async function request(url, options) {
  const response = await fetch(url, options);
  const data = await response.json();
  if (!response.ok) throw Object.assign(new Error(data.error || '请求失败'), { status: response.status });
  return data;
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
  $('#preview').replaceChildren(renderMarkdown(entry.body));
}

function setDirty() {
  state.dirty = serialize() !== state.snapshot;
  $('#save').disabled = !state.dirty;
  $('#save-state').textContent = state.dirty ? '有未保存修改' : '已与文件同步';
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
    notify('浏览器草稿空间不足，请先保存到文件', true);
  }
}

function applyState(data, selectedDate) {
  state.entries = data.entries.map((entry) => ({ id: entry.id, date: entry.date, title: entry.title, body: entry.body.join('\n') }));
  state.revision = data.revision;
  state.blogUrl = data.blogUrl;
  state.selectedId = state.entries.find((entry) => entry.date === selectedDate)?.id ?? state.entries[0]?.id ?? null;
  state.snapshot = serialize();
  $('#blog-link').href = data.blogUrl;
  $('#save-detail').textContent = `版本 ${data.revision.slice(0, 8)} · 保存时自动生成备份`;
  setDirty();
  renderList();
  renderEditor();
}

async function load() {
  pendingDraft = readDraft();
  try {
    const data = await request('/api/notes');
    const params = new URLSearchParams(window.location.search);
    const requestedDate = params.get('date');
    applyState(data, requestedDate);
    const requestedNew = params.get('new');
    if (requestedNew) {
      const match = requestedNew.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      const date = match ? new Date(`${requestedNew}T00:00:00`) : null;
      const valid = date && Number(date.getFullYear()) === Number(match[1])
        && date.getMonth() + 1 === Number(match[2]) && date.getDate() === Number(match[3]);
      if (valid) {
        $('#new-date').value = requestedNew;
        createEntry(requestedNew);
      } else {
        notify('新建记录的日期无效', true);
      }
    }
    if (pendingDraft && serialize(pendingDraft.entries) !== state.snapshot) {
      $('#draft-banner p').textContent = pendingDraft.revision === state.revision
        ? '发现这份文件的本地草稿，尚未写入博客。'
        : '发现旧版本的本地草稿。恢复前请确认，不会自动写入文件。';
      $('#draft-banner').hidden = false;
    }
  } catch (error) {
    $('#save-state').textContent = '载入失败';
    notify(error.message, true);
  }
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

async function save() {
  if (!state.dirty) return;
  const date = selected()?.date;
  $('#save').disabled = true;
  $('#save-state').textContent = '正在校验并保存…';
  try {
    const data = await request('/api/notes', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ revision: state.revision, entries: state.entries }),
    });
    applyState(data, date);
    pendingDraft = null;
    $('#save-state').textContent = `已保存 ${new Date().toLocaleTimeString('zh-CN', { hour12: false })}`;
    $('#draft-banner').hidden = true;
    notify('已保存到碎碎念，原文件已备份');
  } catch (error) {
    $('#save-state').textContent = '保存失败，草稿仍在';
    notify(error.status === 409 ? `版本冲突：${error.message}` : `保存失败：${error.message}`, true);
  } finally {
    $('#save').disabled = !state.dirty;
  }
}

function safeUrl(value) {
  try {
    const url = new URL(value, state.blogUrl || 'http://127.0.0.1:1313/blog/');
    return ['http:', 'https:'].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

function inline(text) {
  const fragment = document.createDocumentFragment();
  const pattern = /(\[([^\]]+)\]\(([^)]+)\)|`([^`]+)`|\*\*([^*]+)\*\*)/g;
  let cursor = 0;
  for (const match of text.matchAll(pattern)) {
    if (match.index > cursor) fragment.append(document.createTextNode(text.slice(cursor, match.index)));
    if (match[2] !== undefined) {
      const href = safeUrl(match[3]);
      if (href) {
        const link = document.createElement('a');
        link.href = href;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = match[2];
        fragment.append(link);
      } else fragment.append(document.createTextNode(match[0]));
    } else if (match[4] !== undefined) {
      const code = document.createElement('code');
      code.textContent = match[4];
      fragment.append(code);
    } else {
      const strong = document.createElement('strong');
      strong.textContent = match[5];
      fragment.append(strong);
    }
    cursor = match.index + match[0].length;
  }
  if (cursor < text.length) fragment.append(document.createTextNode(text.slice(cursor)));
  return fragment;
}

function imageFrom(line) {
  const markdown = line.match(/^!\[([^\]]*)\]\(([^)]+)\)(?:\s+"[^"]*")?\s*$/);
  if (markdown) return { src: markdown[2], alt: markdown[1], width: '' };
  if (!/^<img\s+[^>]*>\s*$/i.test(line)) return null;
  const document = new DOMParser().parseFromString(line, 'text/html');
  const source = document.querySelector('img');
  if (!source) return null;
  return { src: source.getAttribute('src') || '', alt: source.getAttribute('alt') || '', width: source.getAttribute('width') || '' };
}

function renderMarkdown(source) {
  const fragment = document.createDocumentFragment();
  if (!source.trim()) {
    const empty = document.createElement('p');
    empty.className = 'preview-placeholder';
    empty.textContent = '这一天，写点什么吧。';
    fragment.append(empty);
    return fragment;
  }
  let paragraph = [];
  let quote = [];
  let list = null;
  let code = null;
  const flushParagraph = () => {
    if (!paragraph.length) return;
    const element = document.createElement('p');
    element.append(inline(paragraph.join('\n')));
    fragment.append(element);
    paragraph = [];
  };
  const flushQuote = () => {
    if (!quote.length) return;
    const element = document.createElement('blockquote');
    const text = document.createElement('p');
    text.append(inline(quote.join('\n')));
    element.append(text);
    fragment.append(element);
    quote = [];
  };
  const flushList = () => {
    if (list) fragment.append(list);
    list = null;
  };
  const flushText = () => { flushParagraph(); flushQuote(); flushList(); };

  for (const line of source.split('\n')) {
    if (/^```/.test(line)) {
      if (code) {
        fragment.append(code);
        code = null;
      } else {
        flushText();
        code = document.createElement('pre');
        code.append(document.createElement('code'));
      }
      continue;
    }
    if (code) {
      code.firstChild.append(document.createTextNode(`${line}\n`));
      continue;
    }
    if (!line.trim()) { flushText(); continue; }
    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      flushText();
      const element = document.createElement(`h${heading[1].length}`);
      element.append(inline(heading[2]));
      fragment.append(element);
      continue;
    }
    const image = imageFrom(line.trim());
    if (image) {
      flushText();
      const src = safeUrl(image.src);
      if (src) {
        const element = document.createElement('img');
        element.src = src;
        element.alt = image.alt;
        element.loading = 'lazy';
        if (/^\d{1,3}%$/.test(image.width)) element.style.width = image.width;
        fragment.append(element);
      } else fragment.append(document.createTextNode(line));
      continue;
    }
    if (/^>\s?/.test(line)) {
      flushParagraph(); flushList();
      quote.push(line.replace(/^>\s?/, ''));
      continue;
    }
    const item = line.match(/^\s*([-+*]|\d+\.)\s+(.+)$/);
    if (item) {
      flushParagraph(); flushQuote();
      const ordered = /^\d+\./.test(item[1]);
      if (!list || list.tagName !== (ordered ? 'OL' : 'UL')) {
        flushList();
        list = document.createElement(ordered ? 'ol' : 'ul');
      }
      const element = document.createElement('li');
      element.append(inline(item[2]));
      list.append(element);
      continue;
    }
    flushQuote(); flushList();
    paragraph.push(line);
  }
  if (code) fragment.append(code);
  flushText();
  return fragment;
}

$('#entry-body').addEventListener('input', (event) => {
  const entry = selected();
  if (!entry) return;
  entry.body = event.target.value;
  $('#character-count').textContent = `${entry.body.replace(/\s/g, '').length} 字符`;
  $('#preview').replaceChildren(renderMarkdown(entry.body));
  renderList();
  setDirty();
});
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
  notify('新记录已加入编辑器，保存后才会写入文件');
}

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
  notify('草稿已恢复，尚未写入文件');
});
$('#discard-draft').addEventListener('click', () => {
  pendingDraft = null;
  localStorage.removeItem(DRAFT_KEY);
  $('#draft-banner').hidden = true;
});
document.querySelectorAll('[data-view]').forEach((button) => button.addEventListener('click', () => {
  $('#editor-panels').dataset.view = button.dataset.view;
  document.querySelectorAll('[data-view]').forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
}));
window.addEventListener('keydown', (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
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

load();
