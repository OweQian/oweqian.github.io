---
title: "🤖 AI - 基于 OpenAI SDK、Vercel AI SDK 实现代码生成器"
date: 2025-09-15T21:38:47+08:00
tags: ["AI"]
categories: ["AI"]
---

本篇讨论如何基于市面上主流的 AI 研发技术栈 - OpenAI SDK、Vercel AI SDK 实现代码生成器。

<!--more-->

### 前置知识

#### OpenAI SDK 基本介绍

OpenAI 官方提供的 AI SDK：

- 提供了直接访问 OpenAI API 的能力
- 集成了 chat、embedding、Fine-tuning 等
- 支持所有 OpenAI 系列的 LLM
- 支持三方中转 api（302、openrouter 等）

> OpenAI 更多资料详见官方文档：https://platform.openai.com/docs/overview

#### Vercel AI SDK

vercel AI SDK 是一个专注于前端 AI 应用开发的工具包，特别适合构建基于 React、Next.js、Vue 等的全栈 AI 应用。

- 提供了一系列的 Hooks 和组件，用于快速构建 AI 应用
- 支持多种 LLM 模型，包括 OpenAI、Anthropic、Google 等

> Vercel AI SDK 更多资料详见官方文档：https://sdk.vercel.ai/docs/introduction#why-use-the-ai-sdk

#### 对比

| AI 框架       | 类比 UI 框架 | 类比说明                                                                                                                                          |
| ------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| OpenAI SDK    | Tailwind CSS | - 基础的工具集（原子化的样式）<br>- 灵活性高，可控性高，但需要自己组装                                                                            |
| Vercel AI SDK | Shadcn UI    | - 在基础工具集的基础上，拓展了一些使用场景，比如支持多模型、hooks 机制<br>- 相比较 OpenAI SDK，拓展了更多的使用场景，学习成本、灵活性、可控性更高 |

### 项目架构

<div align="center">
<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/AI/chat_54.png" alt="" width="100%" />
</div>

### 项目技术栈

- Next.js
- Ant Design
- Tailwind CSS
- TypeScript
- Drizzle ORM
- PostgreSQL
- OpenAI SDK
- Vercel AI SDK

### 项目目录结构

```
├── app
│ ├── api // api 路由
│ │ ├── openai
│ │ ├── vercelai
│ ├── components // 业务组件
│ ├── openai-sdk // 对接 OpenAI SDK 的 page
│ ├── vercel-ai // 对接 Vercel AI 的 page
│ ├── page.tsx // 入口
├── lib
│ ├── db // 数据库
│ │ ├── openai
│ │ │ ├── schema.ts
│ │ │ ├── selectors.ts
│ │ │ ├── actions.ts
│ │ ├── vercelai
│ │ │ ├── schema.ts
│ │ │ ├── selectors.ts
│ │ │ ├── actions.ts
```

### 快速开始

#### clone 项目

```
git clone https://github.com/OweQian/private-component-codegen.git
```

init 分支包含最基础的模版：

- 整个项目的基础架构、依赖包、基础工具
- 私有组件知识文档
- 项目中用到的业务组件

不包含：

- OpenAI SDK、Vercel AI SDK 的 RAG 实现
- 对接不同 RAG 逻辑的页面层

#### 配置环境变量

```
cp .env.template .env
```

编辑 .env 文件，配置环境变量

```
# 数据库连接字符串：从supabase中获取（https://supabase.com/）
DATABASE_URL=postgresql://
# 嵌入模型
EMBEDDING=text-embedding-ada-002
# 大模型 API Key
AI_KEY=sk-xxx
# 大模型 API Base URL
AI_BASE_URL=https://api
# 大模型
MODEL=claude-3-5-sonnet-latest
```

#### 启动项目

```
# pnpm version >= 9
pnpm install

# 启动storybook业务组件文档
pnpm storybook

# 启动项目
pnpm dev
```

#### 演示效果

<div align="center">
<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/AI/chat_55.png" alt="" width="100%" />
</div>

<div align="center">
<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/AI/chat_56.png" alt="" width="100%" />
</div>

### OpenAI SDK

#### Embedding 实现

##### 数据表初始化

在项目根目录的 lib 文件夹中，新建 openai 文件夹，进入 openai 文件夹，新建 schema.ts。

> 让 cursor agent composer 基于以下 prompt 生成代码：

```
使用 drizzle-orm/pg-core 创建一个 PostgreSQL 数据表 schema，用于存储 OpenAI embeddings。表名为 'open_ai_embeddings'，包含以下字段:

- id: 使用 nanoid 生成的主键，varchar(191) 类型
- content: 文本内容，text 类型，不允许为空
- embedding: 向量类型字段，维度为 1536，不允许为空

同时需要创建一个使用 HNSW 算法的向量索引，用于余弦相似度搜索。
```

<div align="center">
<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/AI/chat_57.png" alt="" width="100%" />
</div>

执行数据库同步命令 - 生成迁移文件：

```
pnpm db:generate
```

<div align="center">
<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/AI/chat_58.png" alt="" width="100%" />
</div>

执行数据库同步命令 - 执行迁移

```
pnpm db:migrate
```

> 注意：如果遇到以下错误：PostgresError:type "vector" does not exist
>
> 请在 supabase 的 sql 编辑器中执行以下命令：CREATE EXTENSION IF NOT EXISTS vector;

<div align="center">
<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/AI/chat_59.png" alt="" width="100%" />
</div>

查看 private-component-codegen 数据库，存在一张新表 open_ai_embeddings。

<div align="center">
<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/AI/chat_60.png" alt="" width="100%" />
</div>

##### 数据库 action

在 openai 文件夹中新建 action.ts。

> 让 cursor agent composer 基于以下 prompt 生成代码：

```
创建一个 server action function，能够接收外部的数据源，保存到 db 中，function 入参是：embeddings: Array<{ embedding: number[]; content: string }>，生成的代码写到 action.ts 中。
```

<div align="center">
<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/AI/chat_61.png" alt="" width="100%" />
</div>

##### 保存到数据库

在 api 文件夹下，新建 openai 文件夹，进入 openai 文件夹，新建 embedding.ts。

> 让 cursor agent composer 基于以下 prompt 生成代码：

```
使用 OpenAI SDK 创建一个函数，将输入的文本字符串转换为向量嵌入（embeddings）。支持将文本按特定分隔符分块处理，分隔符的默认值为 '-------split line-------'，每个文本块都生成对应的 embedding 向量，并返回包含原文本和向量的结果数组。
```

<div align="center">
<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/AI/chat_62.png" alt="" width="100%" />
</div>

在 openai 文件夹下新建 embedDocs.ts，将私有组件知识库文档嵌入到数据库中。

```ts
import { saveEmbeddings } from "@/lib/db/openai/actions";
import { generateEmbeddings } from "./embedding";
import fs from "fs";
import path from "path";

/**
 * 将文档嵌入到数据库中
 */
export async function embedDocs() {
  // 读取文档
  const docs = fs.readFileSync(
    path.join(process.cwd(), "ai-docs", "basic-components.txt"),
    "utf-8"
  );
  // 生成 embeddings
  const embeddings = await generateEmbeddings(docs);

  // 保存 embeddings
  await saveEmbeddings(
    embeddings.map(({ content, embedding }) => ({
      content,
      embedding,
    }))
  );

  console.log(`Embeddings saved: ${embeddings.length}`);

  return embeddings;
}

embedDocs();
```

添加 scripts 命令：

```
"openai:embedDocs": "tsx app/api/openai/embedDocs.ts"
```

执行命令：

```
pnpm openai:embedDocs
```

<div align="center">
<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/AI/chat_63.png" alt="" width="100%" />
</div>

查看 private-component-codegen 数据库，此时在 open_ai_embeddings 表中已经能看到我们插入的内容。

<div align="center">
<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/AI/chat_64.png" alt="" width="100%" />
</div>
