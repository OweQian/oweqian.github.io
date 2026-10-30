import { randomUUID } from 'node:crypto';
import { fail } from './store-common.mjs';

export const MAX_MEDIA_SIZE = 50 * 1024 * 1024;

const TYPES = new Map([
  ['image/jpeg', { extension: 'jpg', kind: 'image', valid: (b) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff }],
  ['image/png', { extension: 'png', kind: 'image', valid: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) }],
  ['image/gif', { extension: 'gif', kind: 'image', valid: (b) => /^GIF8[79]a$/.test(b.subarray(0, 6).toString('ascii')) }],
  ['image/webp', { extension: 'webp', kind: 'image', valid: (b) => b.length > 12 && b.subarray(0, 4).toString('ascii') === 'RIFF' && b.subarray(8, 12).toString('ascii') === 'WEBP' }],
  ['video/mp4', { extension: 'mp4', kind: 'video', valid: (b) => b.length > 12 && b.subarray(4, 8).toString('ascii') === 'ftyp' }],
  ['video/webm', { extension: 'webm', kind: 'video', valid: (b) => b.length > 4 && b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3 }],
  ['video/ogg', { extension: 'ogv', kind: 'video', valid: (b) => b.subarray(0, 4).toString('ascii') === 'OggS' }],
]);

export function validateMedia(buffer, mimetype, date) {
  const type = TYPES.get(mimetype);
  if (!type) fail('仅支持 JPEG、PNG、GIF、WebP 图片和 MP4、WebM、Ogg 视频', 415);
  if (!Buffer.isBuffer(buffer) || !buffer.length) fail('媒体文件为空');
  if (buffer.length > MAX_MEDIA_SIZE) fail('单个媒体文件不能超过 50 MB', 413);
  const parsedDate = new Date(`${date}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '') || Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== date) {
    fail('媒体日期无效');
  }
  if (!type.valid(buffer)) fail('媒体内容与声明的格式不一致', 415);
  const [year, month] = date.split('-');
  return {
    id: randomUUID(),
    path: `static/uploads/notes/${year}/${month}/${date}-${randomUUID()}.${type.extension}`,
    kind: type.kind,
    mimetype,
  };
}
