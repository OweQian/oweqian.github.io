---
title: "🧠 AI - Claude Code 记忆系统"
date: 2026-02-27T20:50:55+08:00
tags: ["AI"]
categories: ["AI"]
---

Claude Code 记忆系统与 CLAUDE.md。

<!--more-->

和 AI 协作，你有没有这样的经历？

```markdown
第一次对话：
你：帮我写一个用户登录接口
Claude：好的，这是一个基础的登录接口...（使用 Express + JavaScript）

你：我们项目用的是 Fastify 和 TypeScript
Claude：好的，让我重新写...

第二次对话：
你：帮我写一个订单创建接口
Claude：好的，这是一个基础的订单接口...（又用 Express + JavaScript）

你：（崩溃）我们用 Fastify 和 TypeScript！
```

如果 Claude Code 不记得我的项目使用什么技术栈、什么编码规范、什么团队规范，每次新对话都让我从零开始 --- 那这种 "失忆症" 让人抓狂。

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/cc/img_02.png" alt="" width="60%" />

CLAUDE.md 就是治疗这种失忆症的药 --- 它是一份给 Claude 的 "项目入职手册"，Claude 每次开始新对话时，就会自动阅读这份手册，了解项目背景，明确它在干活时应该遵循的一系列底层规则。

### Claude Code 记忆系统

当你在项目根目录启动 Claude Code 时，发生的 "记忆系统初始化" 过程如下图所示：

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/cc/img_03.png" alt="" width="60%" />

X 有多种方式获取项目相关知识，它们的区别如下：

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/cc/img_04.png" alt="" width="60%" />

X.md 的内容在每次开始新对话时都会加载，所以要精简，把 "每次都需要" 的内容放在这里，把 "偶尔需要" 的内容放到 Skills 或文档里。

### Claude Code 记忆架构

X 支持五个层级的记忆，就像洋葱一样，从外到内，按层级结构组织 --- 高层级的文件优先加载，为底层文件提供基础。

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/cc/img_05.png" alt="" width="60%" />

记忆类型表如下：

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/cc/img_06.png" alt="" width="60%" />

#### 企业策略级
