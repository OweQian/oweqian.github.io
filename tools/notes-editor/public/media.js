const DB_NAME = 'oweqian-notes-media-v1';
const MAX_SIZE = 50 * 1024 * 1024;
const TYPES = new Map([
  ['image/jpeg', 'image'], ['image/png', 'image'], ['image/gif', 'image'], ['image/webp', 'image'],
  ['video/mp4', 'video'], ['video/webm', 'video'], ['video/ogg', 'video'],
]);
const EXTENSIONS = new Map([
  ['jpg', 'image/jpeg'], ['jpeg', 'image/jpeg'], ['png', 'image/png'], ['gif', 'image/gif'], ['webp', 'image/webp'],
  ['mp4', 'video/mp4'], ['webm', 'video/webm'], ['ogg', 'video/ogg'], ['ogv', 'video/ogg'],
]);

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore('files', { keyPath: 'id' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function createMediaManager({ onChange, onSessionExpired }) {
  const records = new Map();
  let database = null;
  let receiptEpoch = 0;

  function changed() {
    onChange([...records.values()]);
  }

  async function persist(record) {
    if (!database) return;
    const transaction = database.transaction('files', 'readwrite');
    transaction.objectStore('files').put({
      id: record.id, file: record.file, date: record.date, name: record.name, type: record.type, kind: record.kind,
    });
    await new Promise((resolve, reject) => {
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async function remove(id) {
    const record = records.get(id);
    if (!record) return;
    records.delete(id);
    URL.revokeObjectURL(record.url);
    if (database) {
      const transaction = database.transaction('files', 'readwrite');
      transaction.objectStore('files').delete(id);
      await new Promise((resolve) => { transaction.oncomplete = resolve; transaction.onerror = resolve; });
    }
    changed();
  }

  return {
    async init() {
      try {
        database = await openDatabase();
        const stored = await new Promise((resolve, reject) => {
          const request = database.transaction('files').objectStore('files').getAll();
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
        stored.forEach((record) => records.set(record.id, { ...record, url: URL.createObjectURL(record.file), status: 'pending', path: '', publicUrl: '', storage: '' }));
      } catch {
        database = null;
      }
      changed();
    },

    async stage(file, date) {
      const extension = file.name.split('.').pop()?.toLowerCase();
      const type = TYPES.has(file.type) ? file.type : EXTENSIONS.get(extension);
      const kind = TYPES.get(type);
      if (!kind) throw new Error('仅支持 JPEG、PNG、GIF、WebP 图片和 MP4、WebM、Ogg 视频');
      if (!file.size || file.size > MAX_SIZE) throw new Error('媒体不能为空，且单个文件不能超过 50 MB');
      const record = {
        id: crypto.randomUUID(), file, date, type, kind, name: file.name || `剪贴板媒体.${extension || 'bin'}`,
        url: URL.createObjectURL(file), status: 'pending', path: '', publicUrl: '', storage: '',
      };
      records.set(record.id, record);
      try {
        await persist(record);
      } catch {
        database = null;
      }
      changed();
      return record;
    },

    source(token) {
      return records.get(token.replace(/^notes-media:/, ''))?.url || '';
    },

    record(id) {
      return records.get(id);
    },

    usedIds(entries) {
      const ids = new Set();
      const text = entries.map((entry) => entry.body).join('\n');
      for (const match of text.matchAll(/notes-media:([a-f0-9-]{36})/gi)) {
        if (records.has(match[1])) ids.add(match[1]);
      }
      return [...ids];
    },

    async uploadAll(ids) {
      for (const id of ids) {
        const record = records.get(id);
        if (!record) throw new Error('一个媒体文件已丢失，请重新添加');
        if (record.status === 'uploaded') continue;
        const uploadEpoch = receiptEpoch;
        record.status = 'uploading';
        record.error = '';
        changed();
        try {
          const response = await fetch(`/api/media?date=${encodeURIComponent(record.date)}&type=${encodeURIComponent(record.type)}&uploadId=${encodeURIComponent(record.id)}`, {
            method: 'POST', headers: { 'content-type': 'application/octet-stream' }, body: record.file,
          });
          const data = await response.json();
          if (!response.ok) {
            if (response.status === 401) onSessionExpired();
            throw Object.assign(new Error(data.error || '媒体上传失败'), { status: response.status });
          }
          if (uploadEpoch !== receiptEpoch) throw new Error('登录状态已变化，请重新保存以上传媒体');
          record.status = 'uploaded';
          record.serverId = data.id;
          record.path = data.path;
          record.publicUrl = data.publicUrl || '';
          record.storage = data.storage || 'github';
        } catch (error) {
          const needsNewReceipt = error.status === 401 || uploadEpoch !== receiptEpoch;
          record.status = needsNewReceipt ? 'pending' : 'error';
          record.error = needsNewReceipt ? '' : error.message;
          throw error;
        } finally {
          changed();
        }
      }
    },

    resetUploadReceipts() {
      receiptEpoch += 1;
      records.forEach((record) => {
        record.status = 'pending';
        record.error = '';
        record.serverId = '';
        record.path = '';
        record.publicUrl = '';
        record.storage = '';
      });
      changed();
    },

    descriptors(ids) {
      return ids.map((id) => {
        const record = records.get(id);
        if (!record || record.status !== 'uploaded') throw new Error('仍有媒体未上传');
        return { id: record.serverId, path: record.path };
      });
    },

    materialize(text) {
      return text.replace(/notes-media:([a-f0-9-]{36})/gi, (token, id) => {
        const record = records.get(id);
        if (!record || record.status !== 'uploaded') throw new Error('仍有媒体未上传');
        if (record.publicUrl) {
          let url;
          try {
            url = new URL(record.publicUrl);
          } catch {
            throw new Error('媒体公开地址无效，请重新上传');
          }
          if (url.protocol !== 'https:' || url.username || url.password) throw new Error('媒体公开地址必须使用 HTTPS');
          return url.href;
        }
        if (record.storage === 'oss') throw new Error('OSS 媒体缺少公开地址，请重新上传');
        return `/${record.path.replace(/^static\//, '')}`;
      });
    },

    async finalize(ids) {
      await Promise.all(ids.map(remove));
    },

    async prune(ids) {
      const keep = new Set(ids);
      await Promise.all([...records.keys()].filter((id) => !keep.has(id)).map(remove));
    },

    remove,
  };
}

function libraryItem(item) {
  if (!item || typeof item.key !== 'string' || !['image', 'video'].includes(item.kind)) return null;
  try {
    const url = new URL(item.publicUrl);
    if (url.protocol !== 'https:' || url.username || url.password) return null;
    return { ...item, publicUrl: url.href, name: String(item.name || item.key.split('/').pop()) };
  } catch {
    return null;
  }
}

export function mediaLibraryMarkdown(item) {
  const valid = libraryItem(item);
  if (!valid) throw new Error('媒体地址无效，仅可插入 HTTPS 图片或视频');
  if (valid.kind === 'image') {
    const name = valid.name.replace(/[\[\]()\r\n]/g, '').slice(0, 120);
    const url = valid.publicUrl.replace(/\(/g, '%28').replace(/\)/g, '%29');
    return `![${name}](${url})`;
  }
  const src = valid.publicUrl.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  return `<video controls preload="metadata" playsinline src="${src}"></video>`;
}

export function createMediaLibrary({ onChange = () => {}, onSessionExpired = () => {}, onInsert = () => {} } = {}) {
  const empty = () => ({ prefix: '', parentPrefix: null, folders: [], items: [], nextContinuationToken: null, loading: false, error: '' });
  let state = empty();
  let requestEpoch = 0;
  const snapshot = () => ({ ...state, folders: [...state.folders], items: [...state.items] });
  const changed = () => onChange(snapshot());

  async function load(prefix, append = false) {
    if (append && (state.loading || !state.nextContinuationToken)) return;
    const epoch = ++requestEpoch;
    const token = append ? state.nextContinuationToken : null;
    if (!append) state = { ...empty(), prefix };
    state.loading = true;
    state.error = '';
    changed();
    try {
      const params = new URLSearchParams({ prefix });
      if (token) params.set('continuationToken', token);
      const response = await fetch(`/api/media/library?${params}`);
      const data = await response.json().catch(() => ({}));
      if (epoch !== requestEpoch) return;
      if (!response.ok) {
        if (response.status === 401) onSessionExpired();
        throw Object.assign(new Error(data.error || '媒体库载入失败'), { status: response.status });
      }
      if (data.prefix !== prefix || !Array.isArray(data.folders) || !Array.isArray(data.items)) throw new Error('媒体库返回格式无效');
      const folders = data.folders.filter((folder) => typeof folder?.name === 'string' && typeof folder.prefix === 'string' && folder.prefix !== prefix);
      const items = data.items.map(libraryItem).filter(Boolean);
      state.folders = [...new Map([...state.folders, ...folders].map((folder) => [folder.prefix, folder])).values()];
      state.items = [...new Map([...state.items, ...items].map((item) => [item.key, item])).values()];
      state.parentPrefix = typeof data.parentPrefix === 'string' ? data.parentPrefix : null;
      state.nextContinuationToken = typeof data.nextContinuationToken === 'string' && data.nextContinuationToken ? data.nextContinuationToken : null;
    } catch (error) {
      if (epoch === requestEpoch) state.error = error.message;
      throw error;
    } finally {
      if (epoch === requestEpoch) {
        state.loading = false;
        changed();
      }
    }
  }

  return {
    snapshot,
    open(prefix = '') { return load(prefix); },
    more() { return load(state.prefix, true); },
    reset() {
      requestEpoch += 1;
      state = empty();
      changed();
    },
    insert(item) { return onInsert(mediaLibraryMarkdown(item)); },
  };
}
