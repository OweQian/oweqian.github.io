# 心情博客改版与部署说明

本文件说明审核分支 `feature/notes-redesign-deployment` 的博客改版。在线编辑器、媒体、固定账号、AI 和详细部署见 [README.notes-online-editor.md](README.notes-online-editor.md)。分支用于原仓库主人审核，不代表已经合并或部署。

## 1. 技术形态

- 主站：**Hugo 0.141.0 Extended + LoveIt**，由 Hugo 生成静态页面。
- 样式与交互：项目内 SCSS 和原生 JavaScript，没有引入新的前端框架或运行时依赖。
- 近期思绪：Node 20 在 GitHub Actions 构建阶段生成静态 JSON，主站不需要额外数据服务。
- 碎碎念编辑器：本地模式只监听回环地址；在线模式是独立 Node 20 服务，通过 GitHub API 发布。历史归档预览仍仅在本机使用。
- 根目录原有的 `deploy.md` 属于另一个 QLCK 项目，与本博客上线方式无关。

## 2. 历史内容恢复与整理

新增以下本地历史资料：

- `blog-history-2022-2025.md`：从 Git 历史整理 2022—2025 年内容，包含 973 条碎碎念和 69 篇历史文章，其中 12 篇为草稿。
- `blog-history-start-2022.md`：整理建仓库初期至 2022 年底的内容，包含 31 条碎碎念和 7 篇历史文章。
- `blog-milestones-summary.md`：汇总四年大事记、各阶段的主要经历、逐月总结与记录空白。
- `blog-history.html`：独立的历史归档阅读页，提供总览、大事记、逐月总结、碎碎念时间线、历史文章和建仓库初期内容。

首页的“去年今天”通过 `layouts/partials/notes/history.html` 在构建时读取历史 Markdown，仅展示上一年同月同日的真实记录。历史文件在首页被视为数据源，不生成对应文章页面，也不提供原始文件链接。独立归档页与主站首页是两种不同用途，不混用。

## 3. 时光轴与全站导航

`content/posts/blog/index.md` 仍是唯一的碎碎念正文来源。本次只为其增加 4 行展示配置，没有重写历史正文：

- `layout: "notes"`
- `lightgallery: true`
- `toc: false`
- `aliases: ["/timeline/"]`

当前时光轴包含：

- 213 条记录和 213 个日期刻度，正文由一条连续的大轴串联，不再显示年月索引侧栏。
- 宽幅正文、放大的日期和文字、克制的细线底纹；搜索、筛选、月份/日期定位和阅读密度默认收起。
- 原有鱼眼刻度、悬停日期、点击、拖动、键盘 Home/End/方向键和滚动同步。
- 手机使用可展开的横向刻度，保留原有交互，不再显示顶栏。
- 兼容 `#YYYY`、`#YYYY-MM`、`#YYYY-MM-DD` 锚点，并修正长距离跳转后图片加载造成的日期漂移。
- `/` 打开并聚焦搜索，支持无结果恢复、筛选后的刻度重映射和自定义下拉菜单。
- 148 张图片的画廊预览、懒加载、Esc 关闭，以及本地/在线编辑器直达链接。
- 标题区提供明确的“首页”入口。

其他文章通过左下角“索引”或 `Cmd/Ctrl + K` 打开的全站对话框访问。索引只保留标题、摘要、标签和分类，不把文章全文或原文配置嵌入首页。

## 4. 首页与视觉交互

首页改为头像与思绪主视觉：

- 使用项目原有卡通头像，加入呼吸、细线波纹和轻微鼠标倾斜。
- 鼠标惯性光晕只在精细指针设备上启用；减少动态效果模式下关闭跟随与漂浮动画。
- 暗色为低饱和蓝紫渐变，白天为柔和浅蓝渐变；左下角保留可见的明暗切换按钮。
- 气泡使用近期主题词，不直接罗列人名、作者名、角色名或书名，也不显示代码、技术术语和空泛词。
- 主题词来自最近 12 条碎碎念，点击后进入对应日期，不再要求关键词逐字出现在搜索框中。
- 模型生成的思考与原创短句交替出现，页面不显示模型品牌或“AI 生成”提示。
- 气泡按真实宽高约束运动范围；手机最多 4 个同时气泡且最多 1 个长句，桌面最多 2 个长句，避免遮挡与截断。

## 5. 今天与去年今天

- 今天已有记录时，首页显示真实摘要并链接到当天。
- 今天没有记录时，显示“写下今天”，进入 `tools/notes-editor` 并使用 `?new=YYYY-MM-DD` 预填日期。
- 新建操作只产生未保存的编辑草稿，不会自动写入博客。
- 节日只使用明确的固定公历日期，不伪造纪念日或新闻。
- “去年今天”读取上一年同月同日的真实博客，可展开查看，不跳转到不存在的日期锚点。

## 6. 碎碎念专属编辑器

`tools/notes-editor` 现在同时支持本地与在线两种模式，正文仍只读写 `content/posts/blog/index.md`，不编辑其他文章或历史归档：

- 支持日期列表、全文搜索、新建/定位记录、删除确认，以及 `?date=YYYY-MM-DD`、`?new=YYYY-MM-DD`。
- 新增富文本、Markdown、分屏三种编辑方式，支持格式化、网页富文本粘贴、剪贴板贴图、视频上传与媒体预览。
- 待上传媒体保存在 IndexedDB，正文草稿保存在 localStorage；保存前不会自动写入或发布。
- 本地模式仅监听 `127.0.0.1:1314`，保存时自动备份最近 10 份，不提交、不推送。
- 在线模式使用固定账号和服务端会话，按 revision 与 GitHub head SHA 防止覆盖，正文和新媒体在同一提交写入 `dev`，随后由 Actions 部署。
- 在线提交统一附带 `【———— 你的 emo小狗 留】`，页面显示提交链接与等待部署状态。

本地启动：

```bash
node tools/notes-editor/server.mjs
```

在线账号、媒体限制、GitHub Token、Render、DNS、AI 与完整上线步骤见 [在线编辑器、AI 配置与部署](README.notes-online-editor.md)。

## 7. 近期思绪生成与密钥配置

`tools/notes-insights/generate.mjs` 是部署生成器，不再使用本地 1315 服务：

1. 读取最近 12 条碎碎念，不读取或发送多年历史。
2. 通过环境变量 `DEEPSEEK_API_KEY` 调用模型，默认模型为 `deepseek-chat`。
3. 生成近期主题词和短句，过滤人名、书名、代码、无效日期及无意义内容。
4. 将审核后的结果写入 `static/data/insights.json`，再随 Hugo 发布到 `public/data/insights.json`。
5. 首页只读取同源 `/data/insights.json`，线上没有跨域或额外服务依赖。

**密钥只放在 GitHub 仓库的 Settings → Secrets and variables → Actions，名称为 `DEEPSEEK_API_KEY`。**

不得把真实密钥写入 `config.toml`、Hugo 模板、前端脚本、README 或公开 JSON。`DEEPSEEK_MODEL` 是非敏感配置，可用于覆盖默认模型名。

本地更新静态结果：

```bash
DEEPSEEK_API_KEY="你的密钥" node tools/notes-insights/generate.mjs
hugo --gc --minify
```

未配置密钥时，本地生成命令保留已有 JSON；GitHub Actions 中缺少密钥或生成失败会明确失败，避免将备用内容误当作已完成的模型分析。

## 8. 上线流程

现有部署由 `.github/workflows/hugo.yml` 完成：

- 推送 `dev` 分支，或在 Actions 中手动执行 `workflow_dispatch`。
- 使用 Node 20 运行近期思绪生成器。
- 使用 Hugo 0.141.0 Extended 与 Dart Sass 构建。
- 将 `public/` 发布到 GitHub Pages。

主人审核后的上线步骤：

1. 在 GitHub 仓库 Secrets 中配置 `DEEPSEEK_API_KEY`，按详细文档配置 Pages。
2. 审核本分支的源码、生成器、在线编辑器与静态结果，解决 PR 冲突后再合并到 `dev`。
3. 按 `render.yaml` 创建 Render 服务，配置固定账号的密码和最小权限 `GITHUB_TOKEN`，再绑定 `notes.oweqian.xyz`。
4. 由主人手动运行 Pages 工作流，随后检查首页 `/data/insights.json`、在线登录、媒体提交、主题词日期链接、明暗切换和移动端显示。

本审核分支不是 `dev`，单独推送它不会触发当前 `dev` 分支部署，也不会自动合并或上线。

提交到 `dev` 的 PR 另由 `.github/workflows/pr-build.yml` 验证：检查关键 JavaScript 语法，使用 Hugo 0.141.0 Extended 构建到临时目录，并核对正文日期、时光轴刻度、首页记录与发布后的思绪 JSON。此检查使用仓库已提交的静态思绪，不调用模型、不需要 Secret，也不部署；生产部署仍需先配置上述密钥。

## 9. 本地预览与验证

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

正式构建：

```bash
hugo --gc --minify --baseURL https://www.oweqian.xyz/
```

本次已验证：

- Hugo 正式构建成功，静态思绪 JSON 被正确发布。
- 213 条现有记录、213 个刻度、148 张画廊图片保持完整。
- 主题词和短句来自最近 12 条记录，日期链接可用。
- 页面只请求同源 JSON；1315 停止后仍能正常显示。
- 桌面与手机 Chromium、明暗主题、图片预览、键盘操作、减少动态效果及无横向溢出。
- 编辑器指定日期新建不会自动写入正文。
- 生产部署缺少 Secret 会明确失败；PR 构建检查不需要 Secret，本地缺少 Secret 不会破坏已有 JSON。
- 源码与静态思绪 JSON 中没有本次使用的真实密钥。

## 10. 审核边界

- 不重写 Git 历史，不修改 `dev`，不自动合并或部署。
- 不把本地编辑器或历史预览服务暴露到线上。
- 不在公开页面或配置中保存真实 API Key。
- `public/` 与 `resources/_gen/` 为当前仓库已跟踪的生成产物，本次随源码一并更新，便于主人对照实际页面。
