# 🤖 AI - 基于 OpenAI SDK、Vercel AI SDK 实现代码生成器


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

#### 实现 Embedding

<div align="center">
<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/AI/chat_36.png" alt="" width="100%" />
</div>

##### 数据库表初始化

新建 lib/db/openai/schema.ts 文件。

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

新建 lib/db/openai/action.ts 文件。

> 让 cursor agent composer 基于以下 prompt 生成代码：

```
创建一个 server action function，能够接收外部的数据源，保存到 db 中，function 入参是：embeddings: Array<{ embedding: number[]; content: string }>，生成的代码写到 action.ts 中。
```

<div align="center">
<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/AI/chat_61.png" alt="" width="100%" />
</div>

##### 保存到数据库

新建 app/api/openai/embedding.ts 文件。

> 让 cursor agent composer 基于以下 prompt 生成代码：

```
使用 OpenAI SDK 创建一个函数，将输入的文本字符串转换为向量嵌入（embeddings）。支持将文本按特定分隔符分块处理，分隔符的默认值为 '-------split line-------'，每个文本块都生成对应的 embedding 向量，并返回包含原文本和向量的结果数组。
```

<div align="center">
<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/AI/chat_62.png" alt="" width="100%" />
</div>

新建 app/api/openai/embedDocs.ts 文件，将私有组件知识库文档嵌入到数据库中。

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

#### 实现 RAG API 逻辑

<div align="center">
<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/AI/chat_37.png" alt="" width="100%" />
</div>

##### 数据库向量相似度查询

新建 lib/db/openai/selectors.ts 文件。

> 让 cursor agent composer 基于以下 prompt 生成代码

```
创建一个基于向量嵌入的语义相似度搜索函数。该函数需要：

- 接收一个查询向量（embedding）作为输入
- 计算输入向量与数据库中存储的向量之间的余弦相似度
- 筛选出相似度高于指定阈值的结果
- 返回相似度最高的 N 个结果，包含原始内容和相似度分数
- 使用 SQL ORM 实现数据库查询
```

<div align="center">
<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/AI/chat_65.png" alt="" width="100%" />
</div>

##### 针对单条 message 的 Embedding 函数

在 app/api/openai/embedding.ts 中添加函数：

```ts
// 生成单个 embedding
export async function generateSingleEmbedding(text: string): Promise<number[]> {
  const openai = new OpenAI({
    apiKey: env.AI_KEY,
    baseURL: env.AI_BASE_URL,
  });
  const embedding = await openai.embeddings.create({
    model: env.EMBEDDING,
    input: text,
  });
  return embedding.data[0].embedding;
}
```

##### 检索向量数据库并召回函数

在 app/api/openai/embedding.ts 中添加函数：

```ts
// 检索召回
export async function retrieveRecall(
  text: string,
  threshold: number = 0.7,
  limit: number = 5
): Promise<SimilaritySearchResult[]> {
  // 生成单个 embedding
  const embedding = await generateSingleEmbedding(text);
  // 相似度搜索
  const results = await similaritySearch(embedding, threshold, limit);
  return results;
}
```

##### 新建 RAG API 路由

新建 app/api/openai/types.ts 文件，定义 RAG API 的请求体。

```ts
import { ChatCompletionMessageParam } from "openai/resources/chat/completions.mjs";

export type OpenAIRequest = {
  message: ChatCompletionMessageParam[];
};
```

新建 app/api/openai/route.ts 文件。

> 让 cursor agent composer 基于以下 prompt 生成代码：

```
创建一个基于 Next.js 的流式 AI 对话 API 路由处理器，使用 OpenAI API 实现。该接口需要实现以下功能：

1. 通过 POST 请求接收对话消息
2. 基于最后一条消息使用向量嵌入（embeddings）查找相关内容
3. 创建 OpenAI 的流式对话补全，要求：
   - 将相关内容整合到系统提示词中
   - 使用服务器发送事件（SSE）进行流式响应
   - 在流中同时返回 AI 响应片段和相关内容
```

<div align="center">
<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/AI/chat_66.png" alt="" width="100%" />
</div>

生成的代码：

```ts
import { NextRequest } from "next/server";
import OpenAI from "openai";
import { env } from "@/lib/env.mjs";
import { retrieveRecall } from "./embedding";
import { getSystemPrompt } from "@/lib/prompt";
import { OpenAIRequest } from "./types";

// 初始化 OpenAI 客户端
const openai = new OpenAI({
  apiKey: env.AI_KEY,
  baseURL: env.AI_BASE_URL,
});

/**
 * POST 处理函数：处理流式 AI 对话请求
 */
export async function POST(request: NextRequest) {
  try {
    // 解析请求体
    const body: OpenAIRequest = await request.json();
    const { message } = body;

    if (!message || !Array.isArray(message) || message.length === 0) {
      return new Response(JSON.stringify({ error: "消息数组不能为空" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 获取最后一条用户消息用于向量检索
    const lastMessage = message[message.length - 1];
    let lastUserMessageText: string | null = null;

    // 提取最后一条用户消息的文本内容
    if (lastMessage.role === "user" && lastMessage.content) {
      if (typeof lastMessage.content === "string") {
        lastUserMessageText = lastMessage.content;
      } else if (Array.isArray(lastMessage.content)) {
        // 如果是数组类型（多模态），提取所有文本部分
        const textParts = lastMessage.content
          .filter((part) => part.type === "text")
          .map((part) => (part as { text: string }).text)
          .join(" ");
        if (textParts) {
          lastUserMessageText = textParts;
        }
      }
    }

    // 如果最后一条消息是用户消息，进行向量检索
    let referenceContent = "";
    if (lastUserMessageText) {
      try {
        const searchResults = await retrieveRecall(lastUserMessageText, 0.7, 5);
        if (searchResults && searchResults.length > 0) {
          // 将检索到的相关内容合并
          referenceContent = searchResults
            .map((result) => result.content)
            .join("\n\n");
        }
      } catch (error) {
        console.error("向量检索失败:", error);
        // 检索失败不影响主流程，继续执行
      }
    }

    // 构建系统提示词，整合相关内容
    const systemPrompt = getSystemPrompt(referenceContent || undefined);

    // 构建完整的消息列表，包含系统提示词
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: systemPrompt,
      },
      ...message,
    ];

    // 创建流式对话补全
    const stream = await openai.chat.completions.create({
      model: env.MODEL,
      messages,
      stream: true,
      temperature: 0.7,
    });

    // 创建 SSE 流式响应
    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        // 首先发送相关内容（如果存在）
        if (referenceContent) {
          const referenceData = {
            type: "reference",
            content: referenceContent,
          };
          const referenceChunk = `data: ${JSON.stringify(referenceData)}\n\n`;
          controller.enqueue(encoder.encode(referenceChunk));
        }

        // 然后发送 AI 响应流
        try {
          for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta;
            if (delta?.content) {
              const data = {
                type: "content",
                content: delta.content,
              };
              const chunkData = `data: ${JSON.stringify(data)}\n\n`;
              controller.enqueue(encoder.encode(chunkData));
            }

            // 检查是否完成
            if (chunk.choices[0]?.finish_reason) {
              const doneData = {
                type: "done",
                finish_reason: chunk.choices[0].finish_reason,
              };
              const doneChunk = `data: ${JSON.stringify(doneData)}\n\n`;
              controller.enqueue(encoder.encode(doneChunk));
              break;
            }
          }
        } catch (error) {
          console.error("流式响应错误:", error);
          const errorData = {
            type: "error",
            error: "流式响应过程中发生错误",
          };
          const errorChunk = `data: ${JSON.stringify(errorData)}\n\n`;
          controller.enqueue(encoder.encode(errorChunk));
        } finally {
          controller.close();
        }
      },
    });

    // 返回 SSE 流式响应
    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no", // 禁用 Nginx 缓冲
      },
    });
  } catch (error) {
    console.error("API 路由错误:", error);
    return new Response(
      JSON.stringify({
        error: "处理请求时发生错误",
        message: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
```

#### 对接 RAG API

<div align="center">
<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/AI/chat_05.png" alt="" width="100%" />
</div>

##### 补全 OpenAI SDK 的业务组件

打开 app/openai-sdk/index.tsx 文件。

```tsx
"use client";

import { ChatMessages } from "../components/ChatMessages";

const Home = () => {
  return (
    <ChatMessages
      messages={[]}
      input={""}
      handleInputChange={() => {}}
      onSubmit={() => {}}
      isLoading={false}
      messageImgUrl={""}
      setMessagesImgUrl={() => {}}
      onRetry={() => {}}
    />
  );
};

export default Home;
```

##### 让 AI 基于业务组件和 API 进行数据对接和联调

打开 app/openai-sdk/index.tsx 文件。

> 让 cursor agent composer 基于以下 prompt 生成代码：

```
对接 OpenAI API 数据
```

<div align="center">
<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/AI/chat_67.png" alt="" width="100%" />
</div>

##### 演示效果

<div align="center">
<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/AI/chat_68.png" alt="" width="100%" />
</div>

查看 RAG Docs：

<div align="center">
<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/AI/chat_69.png" alt="" width="100%" />
</div>

### Vercel AI SDK

#### 实现 Embedding

复制一份 lib/db/openai 文件夹，重命名为 lib/db/vercelai。

##### 数据库表初始化

修改 lib/db/vercelai/schema.ts，将 openai 替换为 vercelai。

```ts
import { index, pgTable, text, varchar, vector } from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";

// Define the vercelAI embeddings table
export const vercelAiEmbeddings = pgTable(
  "vercel_ai_embeddings",
  {
    id: varchar("id", { length: 191 })
      .primaryKey()
      .$defaultFn(() => nanoid()),
    content: text("content").notNull(),
    embedding: vector("embedding", { dimensions: 1536 }).notNull(),
  },
  (t) => ({
    vercelaiEmbeddingIndex: index("vercelai_embedding_index").using(
      "hnsw",
      t.embedding.op("vector_cosine_ops")
    ),
  })
);
```

##### 数据库 action

修改 lib/db/vercelai/actions.ts：

```ts
"use server";

import { db } from "@/lib/db";
import { vercelAiEmbeddings } from "./schema";

export async function saveEmbeddings(
  embeddings: Array<{ embedding: number[]; content: string }>
) {
  try {
    // 批量插入数据
    const result = await db.insert(vercelAiEmbeddings).values(
      embeddings.map(({ embedding, content }) => ({
        content,
        embedding,
      }))
    );

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error("保存 embeddings 时出错:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "未知错误",
    };
  }
}
```

执行数据库同步命令：

```
pnpm db:generate
pnpm db:migrate
```

查看 private-component-codegen 数据库，存在一张新表 vercel_ai_embeddings。

<div align="center">
<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/AI/chat_70.png" alt="" width="100%" />
</div>

##### 保存到数据库

新建 app/api/vercel/embedding.ts 文件。

> 让 cursor agent composer 基于以下 prompt 生成代码：

```
请使用 vercel ai sdk 重构 @app/api/openai/embedding.ts 中的代码，保存到@app/api/vercelai/embedding.ts 下
```

<div align="center">
<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/AI/chat_71.png" alt="" width="100%" />
</div>

复制 app/api/openai/embedDocs.ts 文件到 app/api/vercelai/embedDocs.ts。

```ts
import { saveEmbeddings } from "@/lib/db/vercelai/actions";
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
"vercelai:embedDocs": "tsx app/api/vercelai/embedDocs.ts"
```

执行命令：

```
pnpm vercelai:embedDocs
```

<div align="center">
<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/AI/chat_72.png" alt="" width="100%" />
</div>

查看 private-component-codegen 数据库，此时在 vercel_ai_embeddings 表中已经能看到我们插入的内容。

<div align="center">
<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/AI/chat_73.png" alt="" width="100%" />
</div>

