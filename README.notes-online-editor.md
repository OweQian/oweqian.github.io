<div align="center">
  <img src="docs/assets/notes-online-editor.svg" alt="Notes Studio 在线碎碎念编辑器：富文本、媒体与原子发布" width="100%">

  # Notes Studio · 在线编辑器与部署

  **把心情写下来，把发布流程交给一条清晰、可追溯的链路。**

  <p>
    <a href="https://gohugo.io/"><img src="https://img.shields.io/badge/Hugo-0.141.0_Extended-7C3AED?style=for-the-badge&logo=hugo&logoColor=white" alt="Hugo 0.141.0 Extended"></a>
    <a href="https://nodejs.org/"><img src="https://img.shields.io/badge/Node.js-24-159957?style=for-the-badge&logo=node.js&logoColor=white" alt="在线编辑器 Node.js 24"></a>
    <a href="https://github.com/features/actions"><img src="https://img.shields.io/badge/GitHub_Actions-Automated-2563EB?style=for-the-badge&logo=githubactions&logoColor=white" alt="GitHub Actions"></a>
    <a href="https://render.com/"><img src="https://img.shields.io/badge/Render-Singapore-06B6D4?style=for-the-badge&logo=render&logoColor=white" alt="Render Singapore"></a>
  </p>

  <img src="https://img.shields.io/badge/Release-Review_Required-F59E0B?style=flat-square" alt="Release Review Required">
  <img src="https://img.shields.io/badge/Secrets-Server_Only-8B5CF6?style=flat-square" alt="Secrets Server Only">
  <img src="https://img.shields.io/badge/Publish-Atomic_Commit-0EA5E9?style=flat-square" alt="Publish Atomic Commit">
</div>

> [!IMPORTANT]
> **在线编辑器：** [notes.oweqian.xyz](https://notes.oweqian.xyz/)。OSS 是可选的媒体存储后端，须完成下文服务端配置后启用。

**文档导航** · [系统架构](#1-整体结构) · [编辑能力](#2-在线编辑功能) · [账号与密钥](#3-固定账号与-secret-配置) · [Render 部署](#5-部署在线编辑器到-render) · [AI 配置](#6-github-pages-与-ai-配置) · [验收与回滚](#8-保存冲突与回滚) · [故障排查](#9-常见问题)

---

## 1. 整体结构

| 模块 | 技术与位置 | 职责 |
| --- | --- | --- |
| **主站** | Hugo 0.141.0 Extended + LoveIt | 首页、时光轴、文章与媒体静态展示 |
| **在线编辑器** | Node 24 · `tools/notes-editor` · Render | 固定账号认证、富文本、媒体上传与原子提交 |
| **内容仓库** | `OweQian/oweqian.github.io` · `dev` | 唯一正文 `content/posts/blog/index.md` 与版本历史 |
| **媒体存储** | 默认 GitHub；可选阿里云 OSS | GitHub 媒体映射为 `/uploads/notes/`；OSS 媒体保存永久 HTTPS 链接 |
| **近期思绪** | Actions · `static/data/insights.json` | 构建期分析最近记录，主站读取同源静态 JSON |
| **本地模式** | `127.0.0.1:1314` | 本机编辑与备份，不登录、不提交、不推送 |

### 发布链路

```mermaid
flowchart LR
    A["浏览器<br/>固定账号登录"] -->|"编辑与上传"| B["Render<br/>Node 24 编辑器"]
    B -->|"正文 + 媒体<br/>同一个 Commit"| C["GitHub<br/>dev 分支"]
    C -->|"Push 触发"| D["GitHub Actions<br/>近期思绪 + Hugo"]
    D -->|"静态产物"| E["GitHub Pages<br/>主站与媒体"]
    E -->|"公开访问"| F["读者与作者"]

    classDef browser fill:#EDE9FE,stroke:#8B5CF6,color:#312E81,stroke-width:2px;
    classDef service fill:#CFFAFE,stroke:#06B6D4,color:#164E63,stroke-width:2px;
    classDef repo fill:#DBEAFE,stroke:#3B82F6,color:#1E3A8A,stroke-width:2px;
    classDef build fill:#FCE7F3,stroke:#EC4899,color:#831843,stroke-width:2px;
    classDef pages fill:#D1FAE5,stroke:#10B981,color:#064E3B,stroke-width:2px;
    class A browser;
    class B service;
    class C repo;
    class D build;
    class E,F pages;
```

> [!NOTE]
> GitHub Pages 只负责静态托管，无法独立提供安全登录和在线写入。GitHub Token、编辑器密码与 AI 密钥始终停留在服务端环境变量中。

## 2. 在线编辑功能

| 能力 | 实现 | 发布保障 |
| --- | --- | --- |
| **私人访问** | 固定账号、12 小时随机会话、退出与登录限流 | HttpOnly / SameSite Cookie，生产环境 Secure |
| **富文本创作** | 富文本 / Markdown / 分屏，标题、粗体、斜体、引用、列表与链接 | 粘贴内容清理脚本、事件、样式和危险 URL |
| **图片与视频** | 剪贴板、文件选择、拖放、媒体预览 | 服务端 MIME + 文件头双重校验，单文件最大 50 MB |
| **草稿恢复** | localStorage 保存正文，IndexedDB 保存待上传媒体 | 登录失效、刷新或服务重启后仍可恢复 |
| **保存与发布** | GitHub 模式下正文和新媒体同一 commit；OSS 模式先上传媒体再提交正文 | 非强制 ref 更新，revision + head SHA 冲突检测 |
| **历史兼容** | 旧 iframe 与原始块保留，可在 Markdown 模式编辑 | 不主动重写历史正文或删除历史媒体 |

支持的媒体为 **JPEG / PNG / GIF / WebP / MP4 / WebM / Ogg**，不接受 SVG。编辑器产生的提交信息末尾统一为 **`【———— 你的 emo小狗 留】`**。保存成功返回提交链接与“等待部署”状态；**提交成功不等于 Pages 已部署完成**。

> [!TIP]
> 移除待发布附件只移除编辑器引用。删除旧记录或旧附件引用不会自动删除仓库中的历史媒体，避免误删其他记录仍在使用的文件。

## 3. 固定账号与 Secret 配置

账号已经通过 `render.yaml` 固定为 `wangxiaobai`。在 Render 的环境变量页面确认以下配置：

| 变量 | 值或配置方式 | 是否敏感 |
| --- | --- | --- |
| `EDITOR_USERNAME` | `wangxiaobai` | 否 |
| `EDITOR_PASSWORD` | 填写本次约定的固定密码，不写入仓库 | 是 |
| `GITHUB_TOKEN` | 按下节创建的最小权限 PAT | 是 |
| `GITHUB_REPOSITORY` | `OweQian/oweqian.github.io` | 否 |
| `GITHUB_BRANCH` | `dev` | 否 |
| `NOTES_EDITOR_MODE` | `github` | 否 |
| `NOTES_EDITOR_HOST` | `0.0.0.0` | 否 |
| `NOTES_EDITOR_BLOG_URL` | `https://www.oweqian.xyz/blog/` | 否 |
| `NODE_VERSION` | `24` | 否 |

真实密码、PAT、DeepSeek 密钥均不得写入 `config.toml`、`render.yaml`、前端 JS、Markdown、截图或公开文档。固定短密码防护能力有限，服务已做登录限流，但仍建议仅私人使用；若怀疑泄露，立即更换环境变量并重启服务。

## 4. 创建 GitHub 最小权限令牌

此步骤必须由对原仓库有写权限的主人完成：

1. 打开 GitHub **Settings → Developer settings → Personal access tokens → Fine-grained tokens**。
2. Resource owner 选择 `OweQian`，Repository access 选择 **Only select repositories**，仅选择 `oweqian.github.io`。
3. 在 Repository permissions 中仅增加 **Contents: Read and write**。Metadata 读取权限会自动包含；不要授予 Administration、Actions 或 Workflows 写权限。
4. 设置合适的过期时间并创建令牌，将令牌只填入 Render 的 `GITHUB_TOKEN`。
5. 令牌泄露或不再使用时，在 GitHub 立即 Revoke，并在 Render 更换。

编辑器通过 GitHub Contents/Git Data API 工作，不需要服务器上的 Git 凭据，也不需要开放 SSH。

## 5. 部署在线编辑器到 Render

根目录 `render.yaml` 已声明服务、Node 24、新加坡区域、健康检查、自定义域名及待填 Secret。自动部署关闭，避免每次写碎碎念都重启编辑器；以后更新编辑器代码后，在 Render 手动 **Deploy latest commit**。

前提：PR 已审核并合并到原仓库 `dev`。

1. 登录 Render，选择 **New → Blueprint**。
2. 连接 `OweQian/oweqian.github.io`，选择 `dev`，使用根目录 `render.yaml`。
3. 首次创建时填写 `EDITOR_PASSWORD` 和 `GITHUB_TOKEN`。其余非敏感配置已在蓝图中声明。
4. 创建服务，等待 Deploy 成功。Render 免费实例可能在闲置后休眠，首次打开需等待冷启动；需要稳定会话和快速响应时可升级到常驻实例。
5. 检查 `https://<服务名>.onrender.com/api/health` 返回 `ok: true`、`mode: github`。
6. 在 Render 的 **Settings → Custom Domains** 确认 `notes.oweqian.xyz`，按页面提示到 DNS 服务商添加 CNAME，目标为 Render 给出的 `<服务名>.onrender.com`，不要指向 GitHub Pages。
7. 等 DNS 和 HTTPS 证书生效后访问 `https://notes.oweqian.xyz/`，用固定账号与部署时设置的密码登录。
8. 主站 `config.toml` 的 `params.notesEditor.url` 已指向该域名。若更换域名，同时修改此配置、Render Custom Domain 与 DNS。

服务环境变量发生变化后，在 Render 保存并重启。不要把在线模式改成监听本地地址；Render 使用平台提供的 `PORT`。

## 5.1 接入阿里云 OSS 媒体存储

OSS 模式支持新增媒体上传和已有媒体库浏览、插入。正文仍保存到 GitHub `dev`，保存后的 Pages 发布流程不变。旧 `/uploads/notes/` 和已有 OSS 链接继续使用，不迁移历史文件。

```mermaid
flowchart LR
    A[浏览器] -->|登录后上传，最大 50 MB| B[Render 校验格式与文件头]
    B -->|HTTPS 上传| C[OSS notes/YYYY/MM/]
    C -->|永久媒体 URL| B
    B -->|正文包含媒体 URL| D[GitHub dev]
    D --> E[Actions 与 Hugo Pages]
```

在已有 Render 服务的 **Environment** 中添加下列变量，全部填写后再把 `MEDIA_STORAGE` 改为 `oss` 并保存、重新部署：

| 变量 | 此站点的值或配置方式 |
| --- | --- |
| `MEDIA_STORAGE` | `oss`；省略时仍使用 GitHub 媒体存储 |
| `OSS_BUCKET` | `oweqian` |
| `OSS_REGION` | `cn-hangzhou` |
| `OSS_PREFIX` | `notes` |
| `OSS_PUBLIC_BASE_URL` | `https://oweqian.oss-cn-hangzhou.aliyuncs.com` |
| `OSS_ACCESS_KEY_ID` | 专用 RAM 用户的 AccessKey ID，仅填 Render |
| `OSS_ACCESS_KEY_SECRET` | 同一用户的 AccessKey Secret，仅填 Render |

不要使用阿里云主账号 AccessKey。为编辑器建立专用 RAM 用户，使用以下策略：只允许向 `oweqian/notes/*` 上传，并列举 `oweqian` 中的目录和文件用于媒体库。对象使用随机名称且上传时禁止覆盖，不授予删除对象、修改 ACL 或访问其他 Bucket 的能力。真实 AccessKey 不得写入 GitHub、浏览器前端或文档。

```json
{
  "Version": "1",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["oss:PutObject"],
      "Resource": ["acs:oss:*:*:oweqian/notes/*"]
    },
    {
      "Effect": "Allow",
      "Action": ["oss:ListObjects"],
      "Resource": ["acs:oss:*:*:oweqian"]
    }
  ]
}
```

启用后，编辑器中的 **OSS 媒体库** 可逐级浏览目录、加载下一页、预览并插入已有图片或视频。该操作把永久 URL 加入当前草稿，仍需点击保存才会发布正文；媒体库不提供删除或改名操作。


浏览器只向同源 `/api/media` 上传，由 Render 用 OSS V4 签名发送请求。无需为该接入增加 OSS 跨域规则，也不需要把长期密钥或短期签名链接交给浏览器。正文写入永久 HTTPS 地址，不写会过期的下载签名 URL。

此站点原有 Bucket 已为公共读，新增 `notes/` 媒体沿用该读取方式，因此上传后即可以通过 URL 访问，包括尚未保存正文的文件。不要上传私人文件。接入无需改动 Bucket ACL 或把 Bucket 设置为公共写。

OSS 和 GitHub 没有共同事务：上传成功后，正文提交仍可能发生版本冲突或网络超时。草稿和待发布文件保留供重试；服务不会自动或批量删除 OSS 对象，移除正文中的链接也不会删除对象。上线前使用明确的测试媒体确认上传、永久链接和发布后的展示。

回滚时将 `MEDIA_STORAGE` 改回 `github` 并重新部署。正文内已保存的 OSS 链接仍需保留对象才能显示；切换存储不迁移或删除媒体。

## 6. GitHub Pages 与 AI 配置

### 6.1 配置 DeepSeek

原仓库主人打开 **Settings → Secrets and variables → Actions**：

1. 在 **Secrets** 新建 `DEEPSEEK_API_KEY`，值为可用的 DeepSeek API Key。
2. 默认模型为 `deepseek-chat`。需要覆盖时，在 **Variables** 新建 `DEEPSEEK_MODEL`，填写模型名；它是非敏感配置。
3. 在 **Settings → Pages** 将 Source 设为 **GitHub Actions**，Custom domain 设为 `www.oweqian.xyz`，并确认 DNS 与 Enforce HTTPS。
4. 在 **Actions** 中选择 **Deploy Hugo site to Pages**，点击 **Run workflow** 可手动重新发布。

工作流只把 Secret 注入生成步骤，不会把它写入 JSON 或 HTML。若密钥曾出现在聊天、Issue 或其他公开位置，应在 DeepSeek 控制台撤销并重新生成。

### 6.2 生成内容与隐私边界

`tools/notes-insights/generate.mjs` 在每次 Pages 构建时：

1. 读取当前正文，按日期取最近 12 条碎碎念，每条正文清理为纯文本后最多取 700 字。
2. 去除图片、iframe 和 HTML，不读取或发送两个多年历史归档。
3. 调用 `https://api.deepseek.com/chat/completions`，默认 50 秒超时。
4. 校验来源日期，过滤人名、书名、代码、空泛词与无效短句。
5. 最多采用 8 个模型主题词和 4 句模型短句，再混入 3 句原创短句；不足时使用已有规则补充主题词。
6. 写入 `static/data/insights.json`，再由 Hugo 发布到 `public/data/insights.json`。

这些最近记录会发送给第三方模型服务。不要将密码、令牌、身份证件或其他不能外发的信息写进碎碎念。页面不展示模型品牌或生成提示。

本地生成需要 Hugo 0.141.0 Extended 和 Node 20：

```bash
DEEPSEEK_API_KEY="在本地安全提供的密钥" node tools/notes-insights/generate.mjs
# 可选：DEEPSEEK_MODEL="deepseek-chat"
hugo --gc --minify --baseURL https://www.oweqian.xyz/
```

本地未设置密钥时保留已有 JSON；Actions 未设置密钥、请求失败、限流或有效结果不足时会明确失败并停止发布，防止把备用内容误当作最新分析。

## 7. 本地使用与验证

本地编辑器：

```bash
node tools/notes-editor/server.mjs
# http://127.0.0.1:1314/
```

本地保存写入正文并保留最近 10 份备份到 `.cache/notes-editor/backups/`；新媒体先进入缓存，保存后复制到 `static/uploads/notes/`。此模式不会自动提交或发布。

主站预览：

```bash
hugo server \
  --bind 0.0.0.0 \
  --port 1313 \
  --baseURL http://本机IP:1313/ \
  --appendPort=false \
  --disableFastRender \
  --noHTTPCache \
  --renderToMemory
```

语法与正式构建检查：

```bash
node --check tools/notes-editor/server.mjs
node --check tools/notes-editor/public/editor.js
node --check tools/notes-editor/public/rich-text.js
node --check tools/notes-editor/public/media.js
hugo --gc --minify --baseURL https://www.oweqian.xyz/
```

## 8. 保存、冲突与回滚

1. 编辑后可切换 Markdown 检查最终源码；未保存内容只存在当前浏览器。
2. 点击 **保存并发布** 或按 `Cmd/Ctrl + S`。媒体先上传；GitHub 媒体与正文一次提交，OSS 媒体则以永久 URL 写入正文后提交。
3. 看到“已提交，等待部署”后，可点击“查看提交”，再到原仓库 Actions 查看 Pages 工作流。
4. 若提示版本冲突，不要反复覆盖。先复制当前 Markdown 草稿，再重新载入；浏览器草稿和 IndexedDB 媒体会保留，可确认后恢复并重新保存。
5. 若服务重启导致媒体会话失效，重新登录后保存，浏览器会重新上传待发布文件。
6. 需要撤销已发布内容时，由主人在 GitHub 对该次提交执行 **Revert**，让正常 push 触发重新部署。不要强制重写公共 `dev` 历史。
7. 本地误改可从 `.cache/notes-editor/backups/` 找回最近版本；在线版本始终可在 Git 提交历史中找回。

## 9. 常见问题

- **401 / 登录失效**：重新登录；检查 `EDITOR_USERNAME` 与 Render 中的密码环境变量。
- **429**：同一来源错误登录过多，等待 15 分钟。不要通过共享脚本暴力尝试固定密码。
- **502 / GitHub 鉴权失败**：检查 PAT 是否过期、是否仅限正确仓库，以及 Contents 是否为 Read and write。
- **409**：仓库已有新提交或媒体会话失效；保留草稿并重新载入，不要强推。
- **415**：文件格式不支持或文件头与声明不符。转换为支持的格式，不建议改扩展名绕过检查。
- **媒体上传成功但保存失败**：GitHub 模式可能留下未引用 blob；OSS 模式可能留下尚未被正文引用的公开对象。保留草稿、确认仓库版本后重试，不能因为保存响应失败就删除媒体。
- **AI Secret 缺失导致发布失败**：配置 `DEEPSEEK_API_KEY` 后重新运行失败的工作流。
- **提交成功但主站未变化**：检查 Actions 是否完成、AI 步骤是否成功、Pages 是否使用 GitHub Actions，以及浏览器缓存。
- **域名不可用**：检查 `notes.oweqian.xyz` 的 CNAME 是否指向 Render，而非 GitHub Pages；证书签发可能需要等待。
- **编辑器代码未更新**：蓝图关闭了自动部署，在 Render 手动 Deploy latest commit。

## 10. 审核边界

- PR 中的部署配置不会自动创建 Render 服务、配置原仓库 Secret 或修改 DNS。
- 功能分支只推送到贡献者 Fork，不直接推送原仓库；是否合并由主人决定。
- 真实在线发布需要在主人环境完成一次端到端验证：登录 → 新建带图记录 → 保存 → 检查正文提交及媒体链接 → Actions 成功 → 主站与媒体均可访问。
- 本地预览与模拟 GitHub 验证不代替上述线上验收。
