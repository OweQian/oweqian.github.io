import { createHash, createHmac } from 'node:crypto';
import { fail } from './store-common.mjs';

const ALGORITHM = 'OSS4-HMAC-SHA256';
const UNSIGNED_PAYLOAD = 'UNSIGNED-PAYLOAD';
const uriEncode = (value) => encodeURIComponent(value).replace(/[!'()*]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`);
const encodePath = (value) => value.split('/').map(uriEncode).join('/');
const hmac = (key, value) => createHmac('sha256', key).update(value).digest();
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const defaultSignedHeader = (name) => name === 'content-type' || name === 'content-md5' || name.startsWith('x-oss-');
const encodeQuery = (query) => Object.entries(query)
  .map(([name, value]) => [uriEncode(name), uriEncode(String(value))])
  .sort(([leftName, leftValue], [rightName, rightValue]) => leftName < rightName ? -1 : leftName > rightName ? 1 : leftValue < rightValue ? -1 : leftValue > rightValue ? 1 : 0)
  .map(([name, value]) => value ? `${name}=${value}` : name).join('&');

// OSS V4 canonicalization follows the official REST guide and SDK fixed vectors:
// https://www.alibabacloud.com/help/en/oss/developer-reference/recommend-to-use-signature-version-4
export function signOssV4Request({ method = 'PUT', bucket, objectKey, region, accessKeyId, accessKeySecret, timestamp, headers = {}, query = {}, additionalHeaders = [] }) {
  const signedHeaders = Object.fromEntries(Object.entries(headers).map(([name, value]) => [name.toLowerCase(), String(value).trim()]));
  signedHeaders['x-oss-date'] = timestamp;
  signedHeaders['x-oss-content-sha256'] = UNSIGNED_PAYLOAD;
  const additional = [...new Set(additionalHeaders.map((name) => name.toLowerCase()))]
    .filter((name) => !defaultSignedHeader(name) && signedHeaders[name]).sort();
  const canonicalHeaders = Object.keys(signedHeaders)
    .filter((name) => defaultSignedHeader(name) || additional.includes(name))
    .sort().map((name) => `${name}:${signedHeaders[name]}\n`).join('');
  const canonicalQuery = encodeQuery(query);
  const canonicalRequest = [method, encodePath(`/${bucket}/${objectKey}`), canonicalQuery, canonicalHeaders, additional.join(';'), UNSIGNED_PAYLOAD].join('\n');
  const date = timestamp.slice(0, 8);
  const scope = `${date}/${region}/oss/aliyun_v4_request`;
  const stringToSign = [ALGORITHM, timestamp, scope, sha256(canonicalRequest)].join('\n');
  const signingKey = ['oss', 'aliyun_v4_request'].reduce((key, value) => hmac(key, value), hmac(hmac(`aliyun_v4${accessKeySecret}`, date), region));
  const signature = hmac(signingKey, stringToSign).toString('hex');
  signedHeaders.authorization = `${ALGORITHM} Credential=${accessKeyId}/${scope}${additional.length ? `,AdditionalHeaders=${additional.join(';')}` : ''},Signature=${signature}`;
  return { headers: signedHeaders, canonicalRequest, stringToSign, signature };
}

function configuration({ bucket, region, accessKeyId, accessKeySecret, publicBaseUrl, prefix = 'notes' }) {
  if (typeof bucket !== 'string' || !/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(bucket)) {
    throw new Error('请配置有效的 OSS_BUCKET');
  }
  const signingRegion = typeof region === 'string' ? region.replace(/^oss-/, '') : '';
  if (!/^[a-z]{2}(?:-[a-z0-9]+)+$/.test(signingRegion)) throw new Error('请配置有效的 OSS_REGION');
  if (![accessKeyId, accessKeySecret].every((value) => typeof value === 'string' && value.length > 0 && !/[\s\u0000-\u001f\u007f]/.test(value))) {
    throw new Error('请在服务端配置 OSS_ACCESS_KEY_ID 和 OSS_ACCESS_KEY_SECRET');
  }
  let publicUrl;
  try {
    publicUrl = new URL(publicBaseUrl);
  } catch {
    throw new Error('请配置有效的 OSS_PUBLIC_BASE_URL');
  }
  if (publicUrl.protocol !== 'https:' || publicUrl.username || publicUrl.password || publicUrl.search || publicUrl.hash) {
    throw new Error('OSS_PUBLIC_BASE_URL 必须是无凭据或签名参数的永久 HTTPS 地址');
  }
  const objectPrefix = prefix === '' || prefix === undefined ? 'notes' : prefix;
  if (typeof objectPrefix !== 'string' || !/^[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*$/.test(objectPrefix)) {
    throw new Error('OSS_PREFIX 必须是安全的相对路径，不能包含空目录或上级目录');
  }
  return { bucket, region: signingRegion, accessKeyId, accessKeySecret, publicBaseUrl: publicUrl.href.replace(/\/+$/, ''), prefix: objectPrefix };
}

function validObjectPath(value) {
  return typeof value === 'string' && value.length <= 1024 && !/[\u0000-\u001f\u007f\\]/.test(value)
    && !value.startsWith('/') && !value.includes('://') && !value.split('/').some((part) => part === '.' || part === '..');
}

function validContinuationToken(value) {
  return typeof value === 'string' && value.length <= 4096 && !/[\u0000-\u001f\u007f\\]/.test(value) && !value.includes('://');
}

function xmlText(value) {
  const entity = '#x[0-9a-fA-F]+|#[0-9]+|amp|lt|gt|quot|apos';
  if (new RegExp(`&(?!(?:${entity});)`).test(value)) fail('OSS 媒体列表包含不支持的 XML 实体', 502);
  return value.replace(new RegExp(`&(${entity});`, 'g'), (_, name) => {
    if (name.startsWith('#')) {
      const point = name.startsWith('#x') ? Number.parseInt(name.slice(2), 16) : Number(name.slice(1));
      if (!point || point > 0x10ffff || (point >= 0xd800 && point <= 0xdfff)) fail('OSS 媒体列表包含无效的 XML 字符', 502);
      return String.fromCodePoint(point);
    }
    return { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }[name];
  });
}

// Parse only bounded OSS response elements. No DTD, external entity, CDATA, or
// processing instruction is evaluated; namespace/attribute values are unused.
function parseListXml(xml) {
  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) fail('OSS 媒体列表包含不允许的 XML 声明', 502);
  const tokens = /<!--[\s\S]*?-->|<\?xml\s[^<>]*\?>|<\/?[^<>]+>|[^<]+/g;
  const stack = [];
  let root;
  let cursor = 0;
  let count = 0;
  for (const match of xml.matchAll(tokens)) {
    if (match.index !== cursor) fail('OSS 媒体列表格式无效', 502);
    const token = match[0];
    cursor += token.length;
    if (token.startsWith('<!--') || token.startsWith('<?xml')) continue;
    if (!token.startsWith('<')) {
      if (stack.length) stack.at(-1).text += xmlText(token);
      else if (token.trim()) fail('OSS 媒体列表格式无效', 502);
      continue;
    }
    const closing = /^<\/([\w:.-]+)\s*>$/.exec(token);
    if (closing) {
      if (!stack.length || stack.pop().qualifiedName !== closing[1]) fail('OSS 媒体列表格式无效', 502);
      continue;
    }
    const opening = /^<([A-Za-z_][\w:.-]*)(?:\s+[^<>]*?)?\s*(\/?)>$/.exec(token);
    if (!opening || ++count > 2000 || stack.length > 12) fail('OSS 媒体列表格式无效或过大', 502);
    const node = { qualifiedName: opening[1], name: opening[1].split(':').at(-1), children: [], text: '' };
    if (stack.length) stack.at(-1).children.push(node);
    else if (root) fail('OSS 媒体列表格式无效', 502);
    else root = node;
    if (!opening[2]) stack.push(node);
  }
  if (cursor !== xml.length || stack.length || root?.name !== 'ListBucketResult') fail('OSS 媒体列表格式无效', 502);
  return root;
}

const childText = (node, name) => node.children.find((child) => child.name === name)?.text || '';

async function readListResponse(response) {
  const limit = 1024 * 1024;
  if (Number(response.headers.get('content-length')) > limit) fail('OSS 媒体列表响应过大', 502);
  const reader = response.body?.getReader();
  if (!reader) return '';
  const chunks = [];
  let length = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    length += value.length;
    if (length > limit) {
      await reader.cancel();
      fail('OSS 媒体列表响应过大', 502);
    }
    chunks.push(value);
  }
  return new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks));
}

export function createOssMediaStore(options, { fetchImpl = globalThis.fetch, now = () => new Date() } = {}) {
  const config = configuration(options);
  const endpoint = `https://${config.bucket}.oss-${config.region}.aliyuncs.com`;
  const permanentUrl = (key) => `${config.publicBaseUrl}/${encodePath(key)}`;
  const timestamp = () => now().toISOString().replace(/[-:]|\.\d{3}/g, '');

  async function uploadMedia(media) {
    const match = /^static\/uploads\/notes\/(\d{4})\/(\d{2})\/(\d{4}-\d{2}-\d{2})-[0-9a-f-]{36}\.(jpg|png|gif|webp|mp4|webm|ogv)$/.exec(media?.path || '');
    if (!match || !match[3].startsWith(`${match[1]}-${match[2]}-`) || !Buffer.isBuffer(media.buffer) || !media.buffer.length) {
      fail('媒体上传参数无效');
    }
    if (typeof media.uploadId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(media.uploadId)) {
      fail('媒体上传标识无效，请重新选择文件');
    }
    const objectKey = `${config.prefix}/${match[1]}/${match[2]}/${match[3]}-${media.uploadId.toLowerCase()}-${sha256(media.buffer)}.${match[4]}`;
    const publicUrl = permanentUrl(objectKey);
    const digest = createHash('md5').update(media.buffer).digest();
    const receipt = { id: media.id, path: objectKey, kind: media.kind, storage: 'oss', objectKey, publicUrl };
    const matchesMedia = (response) => {
      const contentLength = response.headers.get('content-length') || '';
      const contentType = (response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
      const etag = (response.headers.get('etag') || '').replace(/^"([a-fA-F0-9]{32})"$/, '$1').toLowerCase();
      const contentMd5 = response.headers.get('content-md5');
      const matchingDigest = etag === digest.toString('hex') || contentMd5 === digest.toString('base64');
      return response.status === 200 && /^\d+$/.test(contentLength)
        && Number(contentLength) === media.buffer.length && contentType === media.mimetype && matchingDigest;
    };
    const inspectPublicObject = () => fetchImpl(publicUrl, {
      method: 'HEAD', redirect: 'error', signal: AbortSignal.timeout(10000),
    });
    // Versioned buckets ignore forbid-overwrite. The full content hash separates
    // different files; matching retries can return without a write. Concurrent
    // identical uploads can still create additional versions of identical bytes.
    let existing;
    try {
      existing = await inspectPublicObject();
    } catch {
      fail('OSS 永久地址暂不可验证，未上传任何媒体；草稿仍保留，请稍后重试', 502);
    }
    if (existing.status === 200) {
      if (matchesMedia(existing)) return receipt;
      fail('OSS 同名媒体的内容或类型不匹配，未覆盖任何对象；草稿仍保留', 409);
    }
    if (existing.status !== 404) fail('OSS 永久地址不可验证，未上传任何媒体；请检查公开读取配置后重试', 502);
    const signed = signOssV4Request({
      ...config,
      objectKey,
      timestamp: timestamp(),
      headers: {
        'content-type': media.mimetype,
        'content-md5': digest.toString('base64'),
        'x-oss-forbid-overwrite': 'true',
      },
    });
    let response;
    try {
      response = await fetchImpl(`${endpoint}/${encodePath(objectKey)}`, {
        method: 'PUT',
        headers: signed.headers,
        body: media.buffer,
        redirect: 'error',
        signal: AbortSignal.timeout(60000),
      });
    } catch {
      fail('无法连接 OSS，草稿仍保留，请稍后重试', 502);
    }
    const alreadyExists = response.status === 409;
    if (!response.ok && !alreadyExists) fail(`OSS 媒体上传失败（${response.status}），草稿仍保留`, 502);
    let published;
    try {
      published = await inspectPublicObject();
    } catch {
      fail('OSS 永久地址暂不可验证；草稿仍保留，请稍后重试', alreadyExists ? 409 : 502);
    }
    if (!matchesMedia(published)) {
      fail(alreadyExists
        ? 'OSS 同名媒体的内容或类型不匹配，未覆盖任何对象；草稿仍保留'
        : 'OSS 永久地址未通过公开读取与文件完整性校验；草稿仍保留，请检查访问配置后重试', alreadyExists ? 409 : 502);
    }
    return receipt;
  }

  async function listMedia({ prefix = '', continuationToken = '' } = {}) {
    if (!validObjectPath(prefix)) fail('媒体目录无效');
    if (!validContinuationToken(continuationToken)) fail('媒体列表分页参数无效');
    const query = { 'list-type': '2', delimiter: '/', 'max-keys': '50', prefix };
    if (continuationToken) query['continuation-token'] = continuationToken;
    const signed = signOssV4Request({ ...config, objectKey: '', method: 'GET', timestamp: timestamp(), query });
    let response;
    try {
      response = await fetchImpl(`${endpoint}/?${encodeQuery(query)}`, {
        method: 'GET', headers: signed.headers, redirect: 'error', signal: AbortSignal.timeout(20000),
      });
    } catch {
      fail('无法读取 OSS 媒体列表，请稍后重试', 502);
    }
    if (!response.ok) fail(`OSS 媒体列表读取失败（${response.status}），请检查服务端列举权限`, 502);
    let document;
    try {
      document = parseListXml(await readListResponse(response));
    } catch (error) {
      if (error.statusCode) throw error;
      fail('OSS 媒体列表读取失败，请稍后重试', 502);
    }
    if ((childText(document, 'Name') && childText(document, 'Name') !== config.bucket)
        || (childText(document, 'Prefix') && childText(document, 'Prefix') !== prefix)) fail('OSS 媒体列表返回了不同的存储桶或目录', 502);
    const folders = document.children.filter((node) => node.name === 'CommonPrefixes').map((node) => childText(node, 'Prefix'))
      .filter((key) => validObjectPath(key) && key.startsWith(prefix) && key !== prefix && key.endsWith('/'))
      .map((key) => ({ name: key.slice(prefix.length), prefix: key }));
    const items = [];
    for (const node of document.children.filter((child) => child.name === 'Contents')) {
      const key = childText(node, 'Key');
      const name = key.split('/').at(-1);
      const extension = name.split('.').at(-1).toLowerCase();
      const kind = /^(?:jpg|jpeg|png|gif|webp)$/.test(extension) ? 'image' : /^(?:mp4|webm|ogg|ogv)$/.test(extension) ? 'video' : '';
      if (!validObjectPath(key) || !key.startsWith(prefix) || !kind) continue;
      const size = Number(childText(node, 'Size'));
      if (!Number.isSafeInteger(size) || size < 0) fail('OSS 媒体列表返回了无效的文件大小', 502);
      items.push({ key, name, kind, publicUrl: permanentUrl(key), size, lastModified: childText(node, 'LastModified') });
    }
    const nextContinuationToken = childText(document, 'NextContinuationToken') || null;
    if (nextContinuationToken && !validContinuationToken(nextContinuationToken)) fail('OSS 媒体列表返回了无效的分页参数', 502);
    if (childText(document, 'IsTruncated') === 'true' && !nextContinuationToken) fail('OSS 媒体列表缺少下一页参数', 502);
    const parts = prefix.replace(/\/$/, '').split('/');
    const parentPrefix = prefix ? parts.slice(0, -1).join('/') + (parts.length > 1 ? '/' : '') : null;
    return { prefix, parentPrefix, folders, items, nextContinuationToken };
  }

  return { uploadMedia, listMedia };
}
