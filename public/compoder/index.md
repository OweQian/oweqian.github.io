# 🤖 AI - 基于 Compoder 构建 AI Coding 平台


Compoder 是一个开源的 AI 驱动的组件代码生成引擎，集成了现代前端技术栈和多种 AI 模型能力。

<!--more-->

### 项目介绍

Compoder 是一个开源的 AI 驱动的组件代码生成引擎，集成了现代前端技术栈和多种 AI 模型能力，你可以基于 Compoder 定制特定技术栈（如：React、Vue、）、特定组件库（如：Material UI、Ant Design、Element-Plus、Tailwind CSS、Shadcn UI、公司私有组件库...）以及特定场景（如：Landing Page）的 AI 驱动的组件代码生成器。

#### 市场调研分析

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/compoder/img.png" alt="" width="100%" />

传统路径下，由产品经理产出需求，交给 UI 设计师生成设计稿，前端工程师根据需求和设计稿开发业务组件，进行页面对接联调。

Compoder 助力前端工程师转型成为 AI 时代下的 Design Engineer，定制特定技术栈 & 特定组件库 & 特定场景下的前端组件代码生成器，通过 Prompt to code 高效生成对应的组件代码。

#### 核心特性

支持定制多种技术栈、组件库、场景、代码规范、AI 模型等的组件代码生成器。

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/compoder/img_01.png" alt="" width="100%" />

1、技术栈定制

定制基于特定技术栈（如：React、Vue）的 Codegen。

2、组件库定制

定制基于开源组件库 & 公司私有组件库（如：Material UI、Ant Design、Element-Plus、Shadcn UI、公司私有组件库...）的 Codegen。

3、场景定制

定制基于特定场景（如：Landing Page）的 Codegen。

4、代码规范定制

定制基于特定代码规范（如：代码文件结构、设计风格...）的 Codegen。

5、AI 模型定制

定制基于多种 AI 模型（如：OpenAI、Claude...）的 Codegen。

#### 基础功能

1、Prompt (文字、图片) To Code

输入文字或图片，即可生成组件代码。

2、代码版本迭代

支持代码版本迭代，可查看历史版本，并基于任意版本生成新的代码。  
3、代码在线微调

支持代码在线微调，集成了代码编辑器，可以直观地对代码进行微调和保存。

4、代码实时预览

自建了一套代码实时预览沙箱环境，支持多种技术栈的秒级渲染。

### 技术栈

- [Next.js](https://github.com/vercel/next.js) - React 框架
- [Shadcn UI](https://ui.shadcn.com/) - 组件库
- [Tailwind CSS](https://github.com/tailwindlabs/tailwindcss) - 实用优先的 CSS 框架
- [Storybook](https://github.com/storybookjs/storybook) - UI 组件开发环境
- [MongoDB](https://github.com/mongodb/mongo) - 文档数据库
- [Mongoose](https://github.com/Automattic/mongoose) - MongoDB 对象模型
- [NextAuth.js](https://github.com/nextauthjs/next-auth) - 身份验证解决方案
- [Zod](https://github.com/colinhacks/zod) - TypeScript 优先的模式验证
- [Tanstack Query](https://github.com/tanstack/query) - 前端请求处理库
- [Vercel AI SDK](https://github.com/vercel/ai) - AI 模型集成

### 主要目录结构

```text
[app/]                    // Next.js 应用主目录
├── main/                // 主界面相关页面
├── commons/            // 公共对接层组件
├── api/                // API 路由
├── services/           // 服务相关
└── layout.tsx          // 主布局组件

[components/]            // 组件目录
├── biz/                // 业务组件
├── ui/                 // UI 基础组件
└── provider/           // 上下文提供者组件

[lib/]                   // 核心库
├── auth/               // 认证相关
├── config/             // 配置相关
├── db/                 // 数据库相关
└── xml-message-parser/ // XML 解析工具

[artifacts/]             // 代码渲染沙箱环境
├── antd-renderer/      // Antd 渲染环境
├── shadcn-ui-renderer/ // Shadcn UI 渲染环境
├── material-ui-renderer/       // Material UI 渲染环境
└── element-plus-renderer/ // Element Plus 渲染环境
```

### 快速开始

#### 环境准备

- [Node.js](https://nodejs.org/) v18.x 或更高版本
- [pnpm](https://pnpm.io/) v9.x 或更高版本
- [Docker](https://www.docker.com/products/docker-desktop/)
- [Docker Compose](https://docs.docker.com/compose/install/)

#### 克隆仓库 & 安装依赖

```
# 克隆仓库
git clone https://github.com/IamLiuLv/compoder.git
cd compoder

# 安装依赖
pnpm install
```

#### 启动 Docker 容器

```
# docker 配置
cp docker-compose.template.yml docker-compose.yml

# 本地开发下，主要用来启动 MongoDB 数据库
docker compose up -d

# or
docker-compose up -d
```

#### 环境变量 & 配置文件

```
# 填写对应的环境变量
cp .env.template .env

# Model provider 配置（需要更换其中的 BaseUrl、API Key）
cp data/config.template.json data/config.json

# Codegen 配置初始化
cp data/codegens.template.json data/codegens.json

pnpm migrate-codegen
```

#### 启动 Storybook（可选）

```
pnpm storybook
```

#### 启动 Compoder

```
pnpm dev
```

#### 启动代码渲染沙箱（按需）

```
# 启动 Antd 渲染沙箱
cd artifacts/antd-renderer
pnpm dev

# 启动 Shadcn UI 渲染沙箱
cd artifacts/shadcn-ui-renderer
pnpm dev

# 启动 Material UI 渲染沙箱
cd artifacts/material-ui-renderer
pnpm dev

# 启动 Element Plus 渲染沙箱
cd artifacts/element-plus-renderer
pnpm dev
```

### 数据库模块实现

### 后端模块实现

### 前端模块实现

#### 业务组件设计与实现

#### 页面对接联调实现

### 沙箱渲染器模块实现

### 核心 AI 工作流模块实现

### Compoder Cli

### Compoder MCP Server

### 集成到 Cursor

### 总结

