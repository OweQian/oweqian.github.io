# oweqian.github.io
my blog

## 部署与近期思绪

博客通过 `.github/workflows/hugo.yml` 构建并部署到 GitHub Pages。每次构建会先分析最近 12 条碎碎念，将审核后的主题词和短句写入 `static/data/insights.json`，再由 Hugo 发布为同源静态数据；线上不需要运行 Node 服务。

在 GitHub 仓库的 **Settings → Secrets and variables → Actions** 中配置 `DEEPSEEK_API_KEY`。密钥只通过 CI 环境变量注入，不写入仓库、Hugo 配置、前端脚本或公开 JSON。模型默认为 `deepseek-chat`，可用非敏感的 `DEEPSEEK_MODEL` 环境变量覆盖。

本地更新已有静态结果时运行：

```bash
DEEPSEEK_API_KEY="你的密钥" node tools/notes-insights/generate.mjs
hugo --gc --minify
```

未配置密钥时，本地生成命令会保留现有 JSON；GitHub Actions 中缺少密钥或生成失败会阻止发布，以便及时修正配置。
