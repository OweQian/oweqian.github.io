import { NOTES_PATH, COMMIT_SIGNATURE, makeState, buildOutput, revisionOf, fail } from './store-common.mjs';

export function createGitHubStore({ repository, branch, token, apiUrl = 'https://api.github.com' }) {
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository || '') || !/^[\w./-]+$/.test(branch || '') || !token) {
    throw new Error('GitHub 在线存储配置不完整');
  }
  const encodedPath = NOTES_PATH.split('/').map(encodeURIComponent).join('/');
  const repositoryUrl = `${apiUrl}/repos/${repository}`;

  async function request(endpoint, options = {}) {
    let response;
    try {
      response = await fetch(`${repositoryUrl}${endpoint}`, {
        method: options.method || 'GET',
        headers: {
          accept: 'application/vnd.github+json',
          authorization: `Bearer ${token}`,
          'x-github-api-version': '2022-11-28',
          'user-agent': 'oweqian-notes-editor',
          ...(options.body ? { 'content-type': 'application/json' } : {}),
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: AbortSignal.timeout(60000),
      });
    } catch {
      fail('无法连接 GitHub，请稍后重试', 502);
    }
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status === 409 || response.status === 422) {
        fail('GitHub 上的版本已经变化，草稿仍保留，请重新载入后再保存', 409);
      }
      if (response.status === 401 || response.status === 403) {
        fail('GitHub 鉴权失败或令牌权限不足，请检查服务端配置', 502);
      }
      fail(`GitHub 请求失败（${response.status}）`, 502);
    }
    return data;
  }

  async function readCurrent() {
    const [file, reference] = await Promise.all([
      request(`/contents/${encodedPath}?ref=${encodeURIComponent(branch)}`),
      request(`/git/ref/heads/${branch.split('/').map(encodeURIComponent).join('/')}`),
    ]);
    if (!file.content || file.encoding !== 'base64') fail('碎碎念文件过大或 GitHub 返回格式不支持', 500);
    const raw = Buffer.from(file.content, 'base64').toString('utf8');
    return { raw, headSha: reference.object.sha };
  }

  async function state() {
    const current = await readCurrent();
    return makeState(current.raw, { headSha: current.headSha });
  }

  async function uploadMedia(media) {
    const blob = await request('/git/blobs', {
      method: 'POST',
      body: { content: media.buffer.toString('base64'), encoding: 'base64' },
    });
    return { id: media.id, path: media.path, kind: media.kind, blobSha: blob.sha };
  }

  async function save(payload, media) {
    const current = await readCurrent();
    if (!payload.headSha || payload.headSha !== current.headSha || revisionOf(current.raw) !== payload.revision) {
      fail('GitHub 上的版本已经变化，草稿仍保留，请重新载入后再保存', 409);
    }
    const output = buildOutput(current.raw, payload);
    const base = await request(`/git/commits/${current.headSha}`);
    const tree = await request('/git/trees', {
      method: 'POST',
      body: {
        base_tree: base.tree.sha,
        tree: [
          { path: NOTES_PATH, mode: '100644', type: 'blob', content: output },
          ...media.map((item) => ({ path: item.path, mode: '100644', type: 'blob', sha: item.blobSha })),
        ],
      },
    });
    const commit = await request('/git/commits', {
      method: 'POST',
      body: {
        message: `docs: 更新碎碎念\n\n${COMMIT_SIGNATURE}`,
        tree: tree.sha,
        parents: [current.headSha],
      },
    });
    await request(`/git/refs/heads/${branch.split('/').map(encodeURIComponent).join('/')}`, {
      method: 'PATCH',
      body: { sha: commit.sha, force: false },
    });
    return {
      ...makeState(output, { headSha: commit.sha, updatedAt: commit.committer?.date }),
      publication: {
        mode: 'github',
        branch,
        commitSha: commit.sha,
        commitUrl: `https://github.com/${repository}/commit/${commit.sha}`,
        deployment: 'pending',
      },
    };
  }

  return { state, save, uploadMedia };
}
