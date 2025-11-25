---
title: "🤖 AI - AI 友好的整洁业务组件架构"
date: 2025-10-31T10:11:22+08:00
tags: ["AI"]
categories: ["AI"]
---

设计一套 AI 友好的整洁业务组件架构，让 AI 基于开源组件库（ant-design）生成业务组件代码。

<!--more-->

从 0 ~ 1 到研发业务组件的环节差不多是前端开发工程师页面研发的最大头的一个工作，因此，这个环节也是我们进行 AI 赋能性价比最高的一个环节。我们希望通过 AI 赋能业务组件的研发，实现只需要花整体小部分的时间，就能够完成最大头的工作。

<div align="center">
<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/AI/chat_04.png" alt="" width="80%" />
</div>

本文内容分为：

- 为什么要设计一套 AI 友好的整洁业务组件架构
- 什么是 AI 友好的整洁业务组件架构
- 这套架构是如何做到 "AI 友好" 且 "整洁" 的
- AI 友好的整洁业务组件架构的例子
- 如何写提示词？让 AI 生成遵循核心原则的代码
- 如何渐进式地在公司落地这套业务组件架构

### 为什么要设计一套 AI 友好的整洁业务组件架构

我们的目的是借助这套架构让 AI 帮助我们生成质量比较高的业务组件代码，那么质量高具体表现为什么呢？

1、这套架构能够在 AI 的三重约束下，让生成的业务组件代码更符合我们的预期。

- AI 的推理能力限制
- AI 的上下文长度限制
- AI 的私域知识限制

2、保证 AI 生成的代码具有可维护性。

- 符合现有团队项目的编码规范、文件结构等
- 跟前端开发人员编写出来的代码类似，甚至编写得更好

---

### 什么是 AI 友好的整洁业务组件架构

这套架构的核心分为两点：

1、AI 友好

能够帮助 AI 更好地生成高质量的业务组件代码。

2、整洁

整个团队或者项目使用统一的业务组件代码文件结构和代码规范，方便后期维护。

#### AI 友好

AI 友好的核心原则是：前端状态和服务端状态分离。在业务组件中只包含前端状态，所有的服务端状态都交给页面对接联调来处理。

举个例子：

在业务组件中，只包含你需要用到的基础组件、UI 结构和样式。比如：form 表单和提交按钮，以及一些交互逻辑、校验规则、业务规则等。

在业务组件中，不能直接请求服务端的接口。比如：不能直接 get 组件需要呈现的初始化数据、调用 post、put、delete 对服务端的数据进行变更。

所有需要请求服务端的数据的操作，都要通过 props 暴露给外部的页面来进行对接联调。

#### 整洁

整洁的核心原则是：整个团队或者项目需要有明确的业务组件代码文件结构和代码规范。

举个例子：

```
app/components/BizComponentExample
├─ index.ts // 仅仅将组件内容暴露给外部
├─ interface.ts // 定义组件内部用到的所有类型，包括 interface、type、enum 等
├─ BizComponentExample.stories.tsx // 组件的 storybook 文档，包含组件不同的使用示例
├─ BizComponentExample.tsx // 组件的主体样式和主体逻辑，如果组件太大(超过 500 行)可以拆分为其它的文件，样式使用 tailwindcss 编写
├─ helpers.ts // 组件所有的工具函数存放在此 (如有)
```

<div align="center">
<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/AI/chat_05.png" alt="" width="80%" />
</div>

---

### 这套架构是如何做到 "AI 友好" 且 "整洁" 的

#### AI 友好

从极限的思维角度来分析：复杂的业务组件。

<div align="center">
<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/AI/chat_06.png" alt="" width="80%" />
</div>

从业务组件的复杂性角度来看，前端组件都是由数据状态来驱动的，业务组件的复杂性往往取决于数据状态流转的复杂性。

因此，我们将服务端状态剥离出去，在业务组件内部只保留前端状态，这就很大程度降低了业务组件的复杂性，在 AI 的三重约束下：

- 由于复杂性降低，可以减少 AI 理解上的工作量，因此在 AI 的推理能力限制下会表现得更好。
- 由于复杂性降低，需要给到 AI 的上下文及 AI 所需要输出的代码上下文都会降低，因此在 AI 的上下文长度限制下会表现得更好。

所以这种前后端状态分离的架构，对现阶段的 AI 来说更加友好。

#### 整洁

整洁背后对应的核心点是：代码的可维护性高。

<div align="center">
<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/AI/chat_07.png" alt="" width="80%" />
</div>

---

### AI 友好的整洁业务组件架构的例子

<div align="center">
<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/AI/chat_08.png" alt="" width="80%" />
</div>

遵循 AI 友好的整洁业务组件架构的原则，实现这个 TodoList 的业务组件。

#### AI 友好

<div align="center">
<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/AI/chat_09.png" alt="" width="80%" />
</div>

```ts
// 任务状态
type TaskStatus = "todo" | "done";

// 任务
interface Task {
  id: string;
  description: string;
  status: TaskStatus;
}

// TodoList 组件的 props 接口
interface TodoListProps {
  // 任务列表：需要 get 请求服务端数据
  tasks: Task[];
  // 搜索任务：需要 get 请求服务端数据
  onSearchTask: (keyword: string) => void;
  // 新增任务：需要 post 新增服务端数据
  onAddTask: (task: Task) => void;
  // 删除任务：需要 delete 删除服务端数据
  onDeleteTask: (taskId: string) => void;
  // 变更任务状态：需要 put 变更服务端数据
  onUpdateTaskStatus: (taskId: string, status: TaskStatus) => void;
}
```

#### 整洁

通过一个明确的文件结构和代码规范，来实现 TodoList。

```
git clone https://github.com/AI-FE/ai-friendly-clean-business-component-template
cd ai-friendly-clean-business-component-template
pnpm install

<!-- 启动 storybook，查看业务组件 -->
pnpm storybook

<!-- 启动 dev，查看页面 -->
pnpm dev
```

---

### 基于开源组件库生成业务组件实战

编写提示，让 AI 基于 react、antd、tailwindcss 技术栈，实现下面的业务组件：

<div align="center">
<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/AI/chat_08.png" alt="" width="80%" />
</div>

#### 使用 dify 构建 AI 应用

##### 介绍 dify

<div align="center">
<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/AI/chat_10.jpg" alt="" width="80%" />
</div>

详见：https://dify.ai/

Dify 上的 AI 应用大致分为：

1、聊天助手

- 聚焦在某一个领域的普通聊天机器人，可以和用户进行对话，并根据对话内容生成回复
- 处理功能职责相对单一的问题

2、Agent

- 聚焦在某一个领域的具有一定自主规划、决策能力的交互机器人
- 优点：灵活性高、自主决策，调用定义好的 tools，完成相对复杂一点的任务
- 缺点：稳定性不确定，依赖于模型的推理能力

3、Workflow

- 聚焦在某一个领域，根据用户定制好的专业工作流，完成专业领域的相对复杂的任务
- 优点：稳定性高，根据用户既定的工作流，完成任务
- 缺点：灵活度较低，所有任务只能按照用户定制好的工作流依次进行

初始化配置

- 获取 302 的 API Key 和 BaseUrl

详见：https://dash.302.ai/apis/list

<div align="center">
<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/AI/chat_11.png" alt="" width="80%" />
</div>
<div align="center">
<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/AI/chat_12.png" alt="" width="80%" />
</div>

- 在 dify 中添加 302 的 API Key

详见：设置 -> 模型供应商 -> 添加更多模型供应商 -> OpenAI-API-compatible -> 添加 302 的 API Key

<div align="center">
<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/AI/chat_13.png" alt="" width="80%" />
</div>

##### 用专业的知识明确需求

- 业务组件使用的技术栈

react + tailwindcss + antd

- 前后端状态分离

所有需要请求服务端数据的操作，都通过 props 暴露给外部的页面来进行对接联调。

- 统一的文件结构和代码规范

```
app/components/BizComponentExample
├─ index.ts // 仅仅将组件内容暴露给外部
├─ interface.ts // 定义组件内部用到的所有类型，包括 interface、type、enum 等
├─ BizComponentExample.stories.tsx // 组件的 storybook 文档，包含组件不同的使用示例
├─ BizComponentExample.tsx // 组件的主体样式和主体逻辑，如果组件太大(超过 500 行)可以拆分为其它的文件，样式使用 tailwindcss 编写
├─ helpers.ts // 组件所有的工具函数存放在此 (如有)
```

##### 选择合适的模型

- 在 coding 领域，Claude 3.5 Sonnet 的代码生成能力目前是比较好的
- 上下文长度 200k，最大回复长度 8192

##### 运用提示词技巧编写提示词

##### 效果展示

#### AI 生成提示词

#### 集成 AI 应用到 IDE

---

### 如何渐进式地在公司落地这套业务组件架构

<div align="center">
<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/AI/chat_end.png" alt="" width="80%" />
</div>

#### 对于迭代已有稳定业务来说

不建议改动，除非你能直接或间接推动公司决定针对整体的研发流程进行整体的 "AI 规范化重构"。

#### 对于新的业务来说

1、针对 AI 友好的：剥离服务端状态和前端状态
2、针对 整洁的：如果公司原有的业务组件结构已经很清晰，针对新的业务组件可以继续沿用。如果不清晰或者没有规范，就可以采用本文中的这套。

---
