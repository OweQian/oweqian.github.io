import { createHash } from 'node:crypto';
import { parseNotes, renderNotes, normalizeEntries } from './notes.mjs';

export const NOTES_PATH = 'content/posts/blog/index.md';
export const COMMIT_SIGNATURE = '【———— 你的 emo小狗 留】';
export const MAX_NOTE_SIZE = 6 * 1024 * 1024;

export const revisionOf = (raw) => createHash('sha256').update(raw).digest('hex');

export function fail(message, statusCode = 400) {
  throw Object.assign(new Error(message), { statusCode });
}

export function makeState(raw, extra = {}) {
  const document = parseNotes(raw);
  if (renderNotes(document) !== raw) fail('原文解析校验失败，已停止编辑以避免内容丢失', 500);
  return {
    title: raw.match(/^title:\s*["']([^"']+)["']/m)?.[1] || '蠢 Q 碎碎念',
    file: NOTES_PATH,
    revision: revisionOf(raw),
    entries: document.entries,
    ...extra,
  };
}

export function buildOutput(raw, payload) {
  if (!payload || typeof payload.revision !== 'string' || !Array.isArray(payload.entries)) {
    fail('保存参数不完整');
  }
  if (revisionOf(raw) !== payload.revision) {
    fail('文件已在其他窗口修改。当前草稿仍保留，请备份后重新载入。', 409);
  }
  const current = parseNotes(raw);
  if (renderNotes(current) !== raw) fail('原文解析校验失败，未写入任何内容', 500);
  let entries;
  try {
    entries = normalizeEntries(payload.entries, current);
  } catch (error) {
    fail(error.message, 400);
  }
  const output = renderNotes({ ...current, entries });
  if (Buffer.byteLength(output, 'utf8') > MAX_NOTE_SIZE) fail('博客文件超出 6 MB 限制');
  if (/notes-media:|blob:/i.test(output)) fail('仍有媒体未上传，请先完成媒体上传');
  if (renderNotes(parseNotes(output)) !== output) fail('保存后的内容未通过完整性校验', 500);
  return output;
}
