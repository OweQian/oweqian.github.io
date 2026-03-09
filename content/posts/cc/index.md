---
title: "🤖 AI - Claude Code 工程化实战"
date: 2026-02-26T20:50:55+08:00
tags: ["AI"]
categories: ["AI"]
---

从 Claude Code 的使用者，成长为能够驾驭 AI 的工程指挥者。

<!--more-->

# 基础篇

## 底层技术全景导览

Claude Code 是一个可编程、可扩展、可组合的 AI Agent 框架。

### 5 分钟快速上手

先花几分钟，把 Claude Code 用起来。

第一步，在[这里](https://code.claude.com/docs/en/desktop)下载匹配你系统的 Claude Code 版本。

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/cc/img_01.png" alt="" width="40%" />

安装过程非常简单，跟着官方的说明就好。

```
# macOS / Linux / WSL（推荐，自动更新）
curl -fsSL https://claude.ai/install.sh | bash

# Windows PowerShell
irm https://claude.ai/install.ps1 | iex

# 或使用 Homebrew（需手动更新）
brew install --cask claude-code
```

然后进入操作系统的命令行，输入 claude 这个命令就可以开始对话了。

```
claude              # 首次运行会提示登录
```

Claude Code 是付费软件，需要在 Claude 网站开账户。它所支持的账户类型包括：

- Claude Pro / Max / Teams / Enterprise（推荐）
- Claude Console（API 访问，需预付费）

下面是最基本的命令行交互方式以及常用命令的速查表。

```
cd /path/to/your/project   # 进入项目目录
claude                      # 启动交互模式

# 然后你可以：
> 这个项目是做什么的？              # 了解项目
> 帮我加一个 hello world 函数      # 修改代码（会请求确认）
> 提交我的更改                      # Git 操作
```

| 命令              | 声明           |
| ----------------- | -------------- |
| claude            | 启动交互模式   |
| claude "任务描述" | 执行单次任务   |
| claude -p "问题"  | 快速查询后退出 |
| claude -c         | 继续最近的对话 |
| claude -r         | 恢复之前的对话 |
| /help             | 帮助           |
| Ctrl + C 或 exit  | 退出           |

### 从使用者到驾驭者

总结一下上面的使用步骤：

```
用户 -> 输入问题 -> Claude 回答 -> 完成
```

Claude Code 可以生成代码，从 0 开始做项目，整理文件，甚至优化你的操作系统...虽然能做到这些也已经很强大了，但这仍然只是被动使用！

Claude Code 还支持另一种模式：

```
用户 -> 配置 Agent -> Agent 自主工作 -> 自动完成任务
```

## 记忆系统与 CLAUDE.md
