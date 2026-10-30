import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { createOssMediaStore, signOssV4Request } from './oss-media-store.mjs';

const config = {
  bucket: 'examplebucket',
  region: 'cn-hangzhou',
  accessKeyId: 'test-only-access-id',
  accessKeySecret: 'test-only-access-secret',
  publicBaseUrl: 'https://media.example.test',
};
const media = {
  id: 'upload-test-id',
  uploadId: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
  path: 'static/uploads/notes/2026/10/2026-10-30-123e4567-e89b-42d3-a456-426614174000.png',
  kind: 'image',
  mimetype: 'image/png',
  buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
};
const expectedHash = '4c4b6a3be1314ab86138bef4314dde022e600960d8689a2c8f8631802d20dab6';
const expectedObjectKey = `notes/2026/10/2026-10-30-aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee-${expectedHash}.png`;
const headHeaders = { 'content-length': '8', 'content-type': 'image/png', etag: '"e9dd2797018cad79186e03e8c5aec8dc"' };
const matchingHead = (overrides = {}) => new Response(null, { status: 200, headers: { ...headHeaders, ...overrides } });

test('V4 signer matches the Alibaba OSS SDK public fixed vector', () => {
  // https://github.com/aliyun/alibabacloud-oss-python-sdk-v2/blob/master/tests/unit/signer/test_v4.py#L10
  const signed = signOssV4Request({
    bucket: 'bucket', objectKey: '1234+-/123/1.txt', region: 'cn-hangzhou',
    accessKeyId: 'ak', accessKeySecret: 'sk', timestamp: '20231216T162057Z',
    headers: { 'x-oss-head1': 'value', abc: 'value', ZAbc: 'value', XYZ: 'value', 'content-type': 'text/plain' },
    query: { param1: 'value1', '+param1': 'value3', '|param1': 'value4', '+param2': '', '|param2': '', param2: '' },
  });
  assert.equal(signed.headers.authorization, 'OSS4-HMAC-SHA256 Credential=ak/20231216/cn-hangzhou/oss/aliyun_v4_request,Signature=e21d18daa82167720f9b1047ae7e7f1ce7cb77a31e8203a7d5f4624fa0284afe');
});

test('OSS upload checks absence, signs a content-addressed object, then verifies its permanent URL', async () => {
  const requests = [];
  const responses = [new Response(null, { status: 404 }), new Response(null, { status: 200 }), matchingHead()];
  const store = createOssMediaStore({ ...config, region: 'oss-cn-hangzhou' }, {
    now: () => new Date('2026-10-30T10:20:30Z'),
    fetchImpl: async (url, request) => {
      requests.push({ url, request });
      return responses.shift();
    },
  });
  const result = await store.uploadMedia(media);
  assert.equal(requests.length, 3);
  assert.equal(requests[0].request.method, 'HEAD');
  assert.equal(requests[0].request.headers, undefined);
  const put = requests[1];
  assert.equal(put.url, `https://examplebucket.oss-cn-hangzhou.aliyuncs.com/${expectedObjectKey}`);
  assert.equal(put.request.method, 'PUT');
  assert.equal(put.request.headers['content-type'], 'image/png');
  assert.equal(put.request.headers['content-md5'], '6d0nlwGMrXkYbgPoxa7I3A==');
  assert.equal(put.request.headers['x-oss-forbid-overwrite'], 'true');
  assert.match(put.request.headers.authorization, /20261030\/cn-hangzhou\/oss\/aliyun_v4_request,Signature=[a-f0-9]{64}$/);
  assert.equal(put.request.redirect, 'error');
  assert.equal(put.request.body, media.buffer);
  const head = requests[2];
  assert.equal(head.request.method, 'HEAD');
  assert.equal(head.url, result.publicUrl);
  assert.equal(head.request.headers, undefined);
  assert.deepEqual(result, {
    id: media.id, path: expectedObjectKey, kind: 'image', storage: 'oss',
    objectKey: expectedObjectKey,
    publicUrl: `https://media.example.test/${expectedObjectKey}`,
  });
  assert.ok(!JSON.stringify(result).includes(config.accessKeyId));
  assert.ok(!JSON.stringify(result).includes(config.accessKeySecret));
});

test('failed PUT requests never return a receipt or attempt deletion', async () => {
  for (const status of [403, 500]) {
    const methods = [];
    const store = createOssMediaStore(config, { fetchImpl: async (url, request) => {
      methods.push(request.method);
      return request.method === 'HEAD' ? new Response(null, { status: 404 }) : new Response('upstream error details', { status });
    } });
    await assert.rejects(store.uploadMedia(media), (error) => error.statusCode === 502 && !error.message.includes('upstream error details'));
    assert.deepEqual(methods, ['HEAD', 'PUT']);
  }
  const store = createOssMediaStore(config, { fetchImpl: async () => { throw new Error(`must not disclose ${config.accessKeySecret}`); } });
  await assert.rejects(store.uploadMedia(media), (error) => error.statusCode === 502 && !error.message.includes(config.accessKeySecret));
});

test('only an explicit public HEAD 404 permits PUT; denied or unavailable HEAD never writes', async () => {
  for (const status of [403, 500, 503]) {
    const methods = [];
    const store = createOssMediaStore(config, { fetchImpl: async (url, request) => {
      methods.push(request.method);
      return new Response(null, { status });
    } });
    await assert.rejects(store.uploadMedia(media), (error) => error.statusCode === 502);
    assert.deepEqual(methods, ['HEAD']);
  }
});

test('unsafe OSS configuration and paths are rejected before any upload', async () => {
  for (const override of [
    { bucket: '../bucket' }, { region: 'cn-hangzhou.example.test' },
    { accessKeyId: '' }, { accessKeySecret: '' },
    { publicBaseUrl: 'http://media.example.test' },
    { publicBaseUrl: 'https://user:password@media.example.test' },
    { publicBaseUrl: 'https://media.example.test?signature=temporary' },
    { publicBaseUrl: 'https://media.example.test/#fragment' },
    { prefix: '../existing' }, { prefix: '/notes' }, { prefix: 'notes//existing' },
  ]) assert.throws(() => createOssMediaStore({ ...config, ...override }));
  let called = false;
  const store = createOssMediaStore(config, { fetchImpl: async () => { called = true; throw new Error('not reached'); } });
  await assert.rejects(store.uploadMedia({ ...media, path: 'static/uploads/notes/2026/10/../existing.png' }));
  assert.equal(called, false);
});

test('uploads require a stable UUIDv4 and canonicalize it independently of the server path basename', async () => {
  const requested = [];
  const store = createOssMediaStore(config, {
    fetchImpl: async (url, request) => {
      requested.push(url);
      return matchingHead();
    },
  });
  for (const uploadId of [undefined, null, '', '../existing', '123e4567-e89b-12d3-a456-426614174000']) {
    await assert.rejects(store.uploadMedia({ ...media, uploadId }), (error) => error.statusCode === 400);
  }
  assert.equal(requested.length, 0);
  const result = await store.uploadMedia({ ...media, uploadId: media.uploadId.toUpperCase() });
  assert.equal(result.objectKey, expectedObjectKey);
  assert.equal(result.path, expectedObjectKey);
  assert.equal(requested.length, 1);
});

test('an existing matching content-addressed object returns its receipt without PUT', async () => {
  const requests = [];
  const store = createOssMediaStore(config, {
    fetchImpl: async (url, request) => {
      requests.push({ url, request });
      return matchingHead();
    },
  });
  const receipt = await store.uploadMedia(media);
  assert.equal(receipt.path, expectedObjectKey);
  assert.equal(receipt.objectKey, expectedObjectKey);
  assert.deepEqual(requests.map(({ request }) => request.method), ['HEAD']);
  assert.equal(requests[0].request.headers, undefined);
});

test('PUT 409 recovers the same object only after anonymous HEAD confirms bytes, length, and type', async () => {
  const methods = [];
  let heads = 0;
  const store = createOssMediaStore(config, {
    fetchImpl: async (url, request) => {
      methods.push(request.method);
      if (request.method === 'HEAD') {
        assert.equal(request.headers, undefined);
        return ++heads === 1 ? new Response(null, { status: 404 }) : matchingHead({ 'content-type': 'IMAGE/PNG; charset=binary' });
      }
      return new Response(null, { status: 409 });
    },
  });
  const result = await store.uploadMedia(media);
  assert.equal(result.objectKey, expectedObjectKey);
  assert.equal(result.publicUrl, `https://media.example.test/${expectedObjectKey}`);
  assert.deepEqual(methods, ['HEAD', 'PUT', 'HEAD']);
});

test('HEAD must match the current file for both initial PUT and conflict recovery', async () => {
  for (const putStatus of [200, 409]) {
    for (const override of [
      { 'content-length': '7' }, { 'content-length': '' },
      { 'content-type': 'video/mp4' }, { etag: '"00000000000000000000000000000000"' },
      { etag: '' }, { etag: 'W/"e9dd2797018cad79186e03e8c5aec8dc"' },
    ]) {
      const methods = [];
      let heads = 0;
      const store = createOssMediaStore(config, {
        fetchImpl: async (url, request) => {
          methods.push(request.method);
          if (request.method === 'HEAD') return ++heads === 1 ? new Response(null, { status: 404 }) : matchingHead(override);
          return new Response(null, { status: putStatus });
        },
      });
      await assert.rejects(store.uploadMedia(media), (error) => error.statusCode === (putStatus === 409 ? 409 : 502));
      assert.deepEqual(methods, ['HEAD', 'PUT', 'HEAD']);
    }
  }
  const store = createOssMediaStore(config, {
    fetchImpl: async (url, request) => request.method === 'HEAD'
      ? matchingHead({ etag: '', 'content-md5': '6d0nlwGMrXkYbgPoxa7I3A==' })
      : new Response(null, { status: 409 }),
  });
  assert.equal((await store.uploadMedia(media)).objectKey, expectedObjectKey);
});

test('preexisting mismatching metadata rejects the upload without PUT', async () => {
  for (const override of [{ 'content-length': '7' }, { 'content-type': 'video/mp4' }, { etag: '"00000000000000000000000000000000"' }]) {
    const methods = [];
    const store = createOssMediaStore(config, { fetchImpl: async (url, request) => {
      methods.push(request.method);
      return matchingHead(override);
    } });
    await assert.rejects(store.uploadMedia(media), (error) => error.statusCode === 409);
    assert.deepEqual(methods, ['HEAD']);
  }
});

test('a timed-out PUT retries the identical key and resolves by HEAD without a second PUT', async () => {
  const requests = [];
  let heads = 0;
  const store = createOssMediaStore(config, {
    fetchImpl: async (url, request) => {
      requests.push({ url, method: request.method });
      if (request.method === 'HEAD') return ++heads === 1 ? new Response(null, { status: 404 }) : matchingHead();
      throw new Error('Simulated response lost after OSS accepted the object');
    },
  });
  await assert.rejects(store.uploadMedia(media), (error) => error.statusCode === 502);
  const retried = await store.uploadMedia({ ...media, path: media.path.replace('123e4567-e89b-42d3-a456-426614174000', 'bbbbbbbb-cccc-4ddd-8eee-ffffffffffff') });
  assert.equal(requests[0].url, requests[2].url);
  assert.equal(retried.objectKey, expectedObjectKey);
  assert.equal(retried.publicUrl, `https://media.example.test/${expectedObjectKey}`);
  assert.deepEqual(requests.map(({ method }) => method), ['HEAD', 'PUT', 'HEAD']);
});

test('a failed public HEAD can be retried with the same key and never deletes the uploaded object', async () => {
  const requests = [];
  let puts = 0;
  let heads = 0;
  const store = createOssMediaStore(config, {
    fetchImpl: async (url, request) => {
      requests.push({ url, method: request.method });
      if (request.method === 'PUT') return new Response(null, { status: ++puts === 1 ? 200 : 409 });
      if (++heads === 1) return new Response(null, { status: 404 });
      if (heads === 2) throw new Error('Simulated public URL timeout');
      return matchingHead();
    },
  });
  await assert.rejects(store.uploadMedia(media), (error) => error.statusCode === 502);
  const result = await store.uploadMedia(media);
  assert.equal(result.objectKey, expectedObjectKey);
  assert.equal(requests[0].url, requests[3].url);
  assert.deepEqual(requests.map(({ method }) => method), ['HEAD', 'PUT', 'HEAD', 'HEAD']);
  assert.equal(puts, 1);
});

test('different bytes under the same upload UUID produce different complete SHA256 object keys', async () => {
  const putUrls = [];
  let next = media.buffer;
  let seenHead = false;
  const store = createOssMediaStore(config, { fetchImpl: async (url, request) => {
    if (request.method === 'PUT') {
      putUrls.push(url);
      return new Response(null, { status: 200 });
    }
    if (!seenHead) {
      seenHead = true;
      return new Response(null, { status: 404 });
    }
    return matchingHead({ 'content-length': String(next.length), etag: `"${createHash('md5').update(next).digest('hex')}"` });
  } });
  const first = await store.uploadMedia(media);
  next = Buffer.concat([media.buffer, Buffer.from('x')]);
  seenHead = false;
  const second = await store.uploadMedia({ ...media, buffer: next });
  assert.equal(first.objectKey, expectedObjectKey);
  assert.equal(second.objectKey, 'notes/2026/10/2026-10-30-aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee-1cd153041b3d879295c47092b98f7458eb01d021db67f47e8d7f76d93d8b8ff5.png');
  assert.notEqual(first.objectKey, second.objectKey);
  assert.notEqual(first.path, second.path);
  assert.notEqual(putUrls[0], putUrls[1]);
});

test('ListObjectsV2 browses existing bucket media and folders with a signed, encoded query', async () => {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
    <ListBucketResult xmlns="http://doc.oss-cn-hangzhou.aliyuncs.com">
      <Name>examplebucket</Name><Prefix>blog/</Prefix><IsTruncated>true</IsTruncated>
      <CommonPrefixes><Prefix>blog/旅行 &amp; 生活/</Prefix></CommonPrefixes>
      <Contents><Key>blog/图 &amp; 雪.png</Key><Size>12</Size><LastModified>2026-10-30T00:00:00.000Z</LastModified></Contents>
      <Contents><Key>blog/movie.mp4</Key><Size>99</Size><LastModified>2026-10-29T00:00:00.000Z</LastModified></Contents>
      <Contents><Key>blog/unsafe.svg</Key><Size>5</Size></Contents>
      <Contents><Key>blog/document.pdf</Key><Size>8</Size></Contents>
      <NextContinuationToken>next+/=&amp;</NextContinuationToken>
    </ListBucketResult>`;
  let sent;
  const store = createOssMediaStore(config, {
    now: () => new Date('2026-10-30T10:20:30Z'),
    fetchImpl: async (url, request) => { sent = { url, request }; return new Response(xml); },
  });
  const result = await store.listMedia({ prefix: 'blog/', continuationToken: 'first+/=' });
  assert.equal(sent.request.method, 'GET');
  assert.equal(sent.url, 'https://examplebucket.oss-cn-hangzhou.aliyuncs.com/?continuation-token=first%2B%2F%3D&delimiter=%2F&list-type=2&max-keys=50&prefix=blog%2F');
  assert.match(sent.request.headers.authorization, /^OSS4-HMAC-SHA256 Credential=test-only-access-id\/20261030\/cn-hangzhou\/oss\/aliyun_v4_request,Signature=[a-f0-9]{64}$/);
  assert.equal(sent.request.redirect, 'error');
  assert.deepEqual(result, {
    prefix: 'blog/', parentPrefix: '',
    folders: [{ name: '旅行 & 生活/', prefix: 'blog/旅行 & 生活/' }],
    items: [
      { key: 'blog/图 & 雪.png', name: '图 & 雪.png', kind: 'image', publicUrl: 'https://media.example.test/blog/%E5%9B%BE%20%26%20%E9%9B%AA.png', size: 12, lastModified: '2026-10-30T00:00:00.000Z' },
      { key: 'blog/movie.mp4', name: 'movie.mp4', kind: 'video', publicUrl: 'https://media.example.test/blog/movie.mp4', size: 99, lastModified: '2026-10-29T00:00:00.000Z' },
    ],
    nextContinuationToken: 'next+/=&',
  });
  assert.ok(!JSON.stringify(result).includes(config.accessKeyId));
  assert.ok(!JSON.stringify(result).includes(config.accessKeySecret));
});

test('media library starts at the whole bucket, independent of the upload prefix', async () => {
  let url;
  const store = createOssMediaStore({ ...config, prefix: 'notes/private-writes' }, {
    fetchImpl: async (value) => {
      url = value;
      return new Response('<ListBucketResult><Name>examplebucket</Name><Prefix></Prefix><IsTruncated>false</IsTruncated><CommonPrefixes><Prefix>blog/</Prefix></CommonPrefixes></ListBucketResult>');
    },
  });
  assert.deepEqual(await store.listMedia(), { prefix: '', parentPrefix: null, folders: [{ name: 'blog/', prefix: 'blog/' }], items: [], nextContinuationToken: null });
  assert.equal(new URL(url).searchParams.get('prefix'), '');
});

test('library rejects traversal, URL prefixes, and invalid pagination before network access', async () => {
  let requested = false;
  const store = createOssMediaStore(config, { fetchImpl: async () => { requested = true; throw new Error('not reached'); } });
  for (const prefix of ['../', 'blog/../../', '/blog/', 'https://other.example/', 'blog\\secret', 'a\nb/', 'x'.repeat(1025)]) {
    await assert.rejects(store.listMedia({ prefix }), (error) => error.statusCode === 400);
  }
  for (const continuationToken of ['https://other.example/', 'token\\escape', 'token\nline', 'x'.repeat(4097)]) {
    await assert.rejects(store.listMedia({ continuationToken }), (error) => error.statusCode === 400);
  }
  assert.equal(requested, false);
});

test('library rejects external entities, malformed XML, excessive responses, and foreign bucket data', async () => {
  for (const xml of [
    '<!DOCTYPE a [<!ENTITY token SYSTEM "file:///private/test-secret">]><ListBucketResult><Name>&token;</Name></ListBucketResult>',
    '<ListBucketResult><Name>&unknown;</Name></ListBucketResult>',
    '<ListBucketResult><Contents></ListBucketResult>',
    '<ListBucketResult><Name>otherbucket</Name></ListBucketResult>',
    '<ListBucketResult><IsTruncated>true</IsTruncated></ListBucketResult>',
    '<ListBucketResult>' + ' '.repeat(1024 * 1024) + '</ListBucketResult>',
  ]) {
    const store = createOssMediaStore(config, { fetchImpl: async () => new Response(xml) });
    await assert.rejects(store.listMedia(), (error) => error.statusCode === 502 && !error.message.includes('test-secret'));
  }
  const denied = createOssMediaStore(config, { fetchImpl: async () => new Response('private upstream details', { status: 403 }) });
  await assert.rejects(denied.listMedia(), (error) => error.statusCode === 502 && !error.message.includes('private upstream details'));
});
