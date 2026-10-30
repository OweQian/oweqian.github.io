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
        stored.forEach((record) => records.set(record.id, { ...record, url: URL.createObjectURL(record.file), status: 'pending', path: '' }));
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
        url: URL.createObjectURL(file), status: 'pending', path: '',
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
        record.status = 'uploading';
        record.error = '';
        changed();
        try {
          const response = await fetch(`/api/media?date=${encodeURIComponent(record.date)}&type=${encodeURIComponent(record.type)}`, {
            method: 'POST', headers: { 'content-type': 'application/octet-stream' }, body: record.file,
          });
          const data = await response.json();
          if (!response.ok) {
            if (response.status === 401) onSessionExpired();
            throw new Error(data.error || '媒体上传失败');
          }
          record.status = 'uploaded';
          record.serverId = data.id;
          record.path = data.path;
        } catch (error) {
          record.status = 'error';
          record.error = error.message;
          throw error;
        } finally {
          changed();
        }
      }
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
