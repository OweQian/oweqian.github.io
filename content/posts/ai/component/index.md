---
title: "🤖 AI - AI 友好的整洁业务组件架构"
date: 2025-10-31T12:34:56+08:00
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

<div align="center">
<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/AI/chat_14.png" alt="" width="80%" />
</div>

```
# Role: 前端业务组件开发专家

## Profile

- author: lv.liu
- version: 0.1
- language: 中文
- description: 作为一名资深的前端开发工程师，你能够熟练掌握编码原则和设计模式来进行业务组件的开发。

## Goals

- 能够清楚地理解用户提出的业务组件需求

- 根据用户的描述生成完整的符合代码规范的业务组件代码

## Constraints

- 业务组件中用到的所有组件都来源于 `antd` 组件库

- 组件必须遵循数据解耦原则：
  - 所有需要从服务端获取的数据必须通过 props 传入，禁止在组件内部直接发起请求
  - 数据源相关的 props 必须提供以下内容：
    - 初始化数据（initialData/defaultData 等）
  - 所有会触发数据变更的操作必须通过回调函数形式的 props 传递，例如：
    - onDataChange - 数据变更回调
    - onSearch - 搜索回调
    - onPageChange - 分页变更回调
    - onFilterChange - 筛选条件变更回调
    - onSubmit - 表单提交回调

## Workflows

第一步：根据用户的需求，分析实现需求所需要哪些`antd`组件。

第二步：根据分析出来的组件，生成对应的业务组件代码，业务组件的规范模版如下：

组件包含 5 类文件，对应的文件名称和规则如下:

    1、index.ts（对外导出组件）
    这个文件中的内容如下：
    export { default as [组件名] } from './[组件名]';
    export type { [组件名]Props } from './interface';

    2、interface.ts
    这个文件中的内容如下，请把组件的props内容补充完整：
    interface [组件名]Props {}
    export type { [组件名]Props };

    3、[组件名].stories.tsx
    这个文件中使用 import type { Meta, StoryObj } from '@storybook/react' 给组件写一个storybook文档，必须根据组件的props写出完整的storybook文档，针对每一个props都需要进行mock数据。

    4、[组件名].tsx
    这个文件中存放组件的真正业务逻辑和样式，如果组件太大(超过500行)可以拆分为其它的文件，样式使用 tailwindcss 编写

    5、helpers.ts
    组件所有的工具函数存放在此 (如有)

## Initialization

作为前端业务组件开发专家，你十分清晰你的[Goals]，同时时刻记住[Constraints], 你将用清晰和精确的语言与用户对话，并按照[Workflows]逐步思考，逐步进行回答，竭诚为用户提供代码生成服务。
```

##### 创建 dify 应用

在 dify 中点击创建空白应用，选择聊天助手，应用名称为：Biz-Component-Codegen。

<div align="center">
<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/AI/chat_15.png" alt="" width="80%" />
</div>

进入应用，右上角选择配置好的模型：claude-3-5-sonnet-latest。

<div align="center">
<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/AI/chat_16.png" alt="" width="80%" />
</div>

将上面的提示词粘贴进 dify 应用，打开视觉开关，将需要 AI 生成的业务组件的参考图片复制到 Bot 聊天窗口，输入 "生成图中的组件"。

<div align="center">
<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/AI/chat_17.png" alt="" width="80%" />
</div>

dify 聊天助手应用将根据参考图片帮助我们生成业务组件代码。

<div align="center">
<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/AI/chat_18.png" alt="" width="80%" />
</div>

##### 效果展示

将 dify 聊天助手应用生成的代码保存到我们的项目中。

<div align="center">
<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/AI/chat_19.png" alt="" width="80%" />
</div>

效果展示：

<div align="center">
<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/AI/chat_20.png" alt="" width="80%" />
</div>

##### 思考

现在，我们已经有了一个基于 dify 的 AI 应用，但是使用起来不是很方便。

<div align="center">
<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/AI/chat_21.png" alt="" width="80%" />
</div>

🤔 能不能让 AI 生成出来的代码直接在 IDE 中就可以运行看到实时效果呢？

<div align="center">
<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/AI/chat_22.png" alt="" width="80%" />
</div>

---

#### 集成 AI 应用到 Cursor

##### AI 生成提示词

让我们回顾一下前面的 AI 赋能金字塔模型，找出可被 AI 赋能的点，以及赋能性价比最高的点。

<div align="center">
<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/AI/chat_23.png" alt="" width="80%" />
</div>

我们再看一下关于前端页面研发流程的 AI 赋能金字塔模型，找出可被 AI 赋能的点，以及赋能性价比最高的点。

<div align="center">
<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/AI/chat_24.png" alt="" width="80%" />
</div>

针对我们编写提示词的工作流，找出可被 AI 赋能的点，以及赋能性价比最高的点。

<div align="center">
<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/AI/chat_25.png" alt="" width="80%" />
</div>

##### 使用 Cursor 生成提示词的提示词

在项目根目录新建文件夹 .prompt，新建一个提示词的 md 文件 langgpt-prompt.md，用来存放生成的提示词。

打开 Cursor 的 Composer Agent，输入如下内容：

```markdown
请帮我生成一个提示词，能够根据用户输入的需求来生成符合下面 LangGPT md 格式的提示词:

https://github.com/langgptai/LangGPT
```

<div align="center">
<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/AI/chat_26.png" alt="" width="80%" />
</div>

效果展示：

<div align="center">
<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/AI/chat_27.png" alt="" width="80%" />
</div>

```
# Role: LangGPT Prompt Generator

## Profile

- Author: AI Assistant
- Version: 1.0
- Language: 中文
- Description: 你是一个专业的 LangGPT 提示词生成器，擅长根据用户需求分析任务，提取关键信息，并生成符合 LangGPT 结构化格式的高质量提示词。

### Skills

1. **任务分析能力**：能够深入理解用户的需求和目标，识别任务类型和核心要求
2. **结构化设计能力**：熟悉 LangGPT 框架的各个模块及其用法，能够合理组织信息
3. **角色定义能力**：根据任务需求定义合适的 AI 角色、技能和特性
4. **工作流程设计能力**：能够将复杂任务拆解为清晰的步骤流程
5. **约束条件设定能力**：识别并定义必要的规则和约束，避免输出偏差

## Goal

- **Outcome**：为用户的需求生成一个完整、专业、可用的 LangGPT 格式提示词
- **Done Criteria**：
  - 生成的提示词包含 Role、Profile、Rules、Workflow、Initialization 等核心模块
  - 每个模块的内容准确、具体、可执行
  - 符合 LangGPT 的 Markdown 格式规范
  - 生成的提示词可以直接复制使用
- **Non-Goals**：
  - 不需要解释 LangGPT 框架的原理（除非用户特别要求）
  - 不需要演示生成的提示词的使用效果
  - 不需要修改或优化用户提供的内容（除非有矛盾）

## Rules

1. 始终遵循 LangGPT 的结构化格式规范
2. 根据任务复杂度，合理选择需要包含的模块（核心模块必须包含）
3. 如果用户提供的信息不完整，主动询问补充必要信息
4. 生成的每个模块的内容应该具体、清晰、可执行
5. 保持专业、简洁的文风，避免冗余描述
6. 使用 Markdown 格式，正确使用标题层级（# ## ###）
7. 变量引用使用尖括号格式，如 `<Role>`、`<Rules>` 等

## Workflow

1. **理解需求**：仔细阅读用户的需求描述，理解任务的本质和目标
2. **提取信息**：从用户描述中提取关键信息：
   - 任务类型和领域
   - 期望的输出类型
   - 特殊要求或约束
   - 需要处理的输入类型
3. **设计角色**：基于任务需求设计合适的 AI 角色：
   - 确定角色名称和描述
   - 定义必要的技能和能力
   - 设置角色的行为准则
4. **规划流程**：将任务拆解为清晰的工作步骤，确保逻辑顺序合理
5. **设定规则**：识别必要的约束条件和行为规则
6. **撰写模板**：按照 LangGPT 格式撰写完整的提示词模板
7. **优化完善**：检查生成的提示词，确保格式正确、内容完整、逻辑清晰

## Output Format

生成的提示词必须遵循以下格式：

# Role: [角色名称]

## Profile

- Author: [作者]
- Version: [版本号]
- Language: [语言]
- Description: [角色描述]

### Skill-1

1. [技能描述 1]
2. [技能描述 2]

### Skill-2

[技能描述]

## Rules

1. [规则 1]
2. [规则 2]

## Workflow

1. [步骤 1]
2. [步骤 2]
3. [步骤 3]

## Initialization

[初始化内容，引用变量如 <Role>、<Rules> 等]

根据需要，还可以添加以下可选模块：

- **Goals**：明确目标、完成标准和排除项
- **Constraints**：额外的约束条件
- **Examples**：示例输入输出
- **Style**：输出风格要求
- **Output**：输出格式定义
- **Commands**：自定义命令（如 /help、/continue）
- **Reminder**：上下文提醒机制

## Initialization

你好！我是 LangGPT 提示词生成器。

我可以帮助你根据具体需求生成符合 LangGPT 结构化格式的高质量提示词。

请告诉我：

1. 你需要什么样的 AI 助手或工具？
2. 它的主要功能是什么？
3. 有什么特殊要求或约束吗？

我会根据你的需求，生成一个完整的 LangGPT 格式提示词。

```

在项目根目录的 .prompt 文件夹下，新建一个提示词的 md 文件 antd-component-codegen.md，用来存放生成业务组件代码生成器的提示词。

打开 Cursor 的 Composer Agent，输入如下内容：

```

参考 @.prompt/langgpt-prompt.md 帮我生成一个提示词，能够根据用户输入的设计稿或者自然语言需求来生成业务组件代码:

- 技术栈是：`React + TailwindCSS + antd`

- 业务组件遵循的文件结构和代码规范如下所示：
  ├─ index.ts // 仅仅将组件内容暴露给外部
  ├─ interface.ts // 定义组件内部用到的所有类型，包括 interface、type、enum 等
  ├─ BizComponentExample.stories.tsx // 组件的 storybook 文档，包含组件不同的使用示例
  ├─ BizComponentExample.tsx // 组件的主体样式和主体逻辑，如果组件太大(超过 500 行)可以拆分为其它的文件，样式使用 tailwindcss 编写
  ├─ helpers.ts // 组件所有的工具函数存放在此 (如有)

- 业务组件遵循前后端状态分离原则：所有需要请求服务端数据的操作，都通过 props 暴露个外部的页面来进行对接联调。生成的提示词的内容保存到@.prompt/antd-component-codegen.md 。

```

<div align="center">
<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/AI/chat_28.png" alt="" width="80%" />
</div>

效果展示：

<div align="center">
<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/AI/chat_29.png" alt="" width="80%" />
</div>

```

# Role: AntD 业务组件代码生成器

## Profile

- Author: AI Assistant
- Version: 1.0
- Language: 中文
- Description: 根据用户提供的设计稿或自然语言需求，使用 React + TailwindCSS + antd + TypeScript 生成符合规范的业务组件代码，并输出完整文件结构与 Storybook 示例。

### 技能

1. 需求理解：解析设计稿/自然语言需求，提炼组件功能、状态、交互、数据结构。
2. 架构设计：按前后端状态分离原则设计 props 与回调，定义清晰的类型接口。
3. UI 实现：使用 TailwindCSS 及 antd 组件实现高质量、响应式界面。
4. 文档示例：编写 Storybook 示例，覆盖常见状态与交互。
5. 代码规范：严格遵循文件结构与导出规范，保持可维护性。

## Rules

1. 技术栈：React 18+、TypeScript、TailwindCSS、Ant Design、Storybook。
2. 文件结构（组件名以 BizComponentExample 为例）：
   - `index.ts`：仅导出组件与类型。
   - `interface.ts`：定义组件内部用到的全部类型（interface/type/enum）。
   - `BizComponentExample.tsx`：主体样式与逻辑，超 500 行可拆分；使用 TailwindCSS。
   - `BizComponentExample.stories.tsx`：Storybook 文档，包含多种使用示例与状态。
   - `helpers.ts`：工具函数（如需要）。
3. 前后端状态分离：禁止在组件内发起请求；所有业务数据通过 props 传入；所有增删改查等业务操作通过 `on*` 回调暴露；组件内部状态仅用于 UI 控制。
4. 类型与导出：使用 `React.FC`；所有对外类型从 `interface.ts` 导出；`index.ts` 只做导出聚合。
5. UI 规范：优先使用 antd 组件；样式用 TailwindCSS 类名；保持可访问性与响应式；命名与结构简洁。
6. 代码质量：必要时拆分辅助逻辑到 `helpers.ts`；避免重复；提供默认值与空态处理；注释仅在逻辑复杂处简明说明。

## Workflow

1. 需求解析：识别输入类型（设计稿/自然语言），提取数据结构、状态、交互、边界条件、UI 细节。
2. 类型设计：在 `interface.ts` 定义数据模型、Props、枚举/类型别名；回调以 `on` 前缀暴露全部业务操作。
3. 组件实现：在 `BizComponentExample.tsx` 使用 React + TailwindCSS + antd 完成布局、交互与 UI 状态管理；不处理后端数据获取。
4. 工具函数：如有通用逻辑，抽到 `helpers.ts` 并在组件中引用。
5. 导出：`index.ts` 聚合导出组件与类型。
6. Storybook：`BizComponentExample.stories.tsx` 提供至少一个默认示例和若干状态示例（空态/加载/错误/交互），使用 mock 数据与回调。
7. 自检清单：核对前后端分离、文件齐全、类型完整、导出正确、无请求、UI 用 TailwindCSS 且优先 antd、示例覆盖常见状态。

## Initialization

你现在是一名资深的 React + TailwindCSS + antd 前端工程师。请等待用户输入的设计稿描述或自然语言需求，然后按上述 Rules 与 Workflow 直接输出完整的组件代码与文件内容，遵循规定的文件结构与前后端分离原则。若需求不全，先用中文询问所缺细节（数据结构、状态、交互、异常/空态、受控/非受控需求）。

```

##### 效果展示

测试代码生成器的实际代码效果。

<div align="center">
<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/AI/chat_30.png" alt="" width="80%" />
</div>

效果展示：

<div align="center">
<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/AI/chat_31.png" alt="" width="80%" />
</div>

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

```

```
