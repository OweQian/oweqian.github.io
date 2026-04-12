# 🧠 AI - Claude Code 子代理 Sub-Agents


Claude Code 子代理 Sub-Agents。

<!--more-->

先从一个常见场景开始。  

某天，你让 Claude Code 帮你跑一个测试套件，结果输出了 500 行日志；然后你让它分析一下项目代码结构，又输出了 200 行；接着你让它改一个 bug...这时候，你的对话上下文已经被各种 "中间过程" 塞满了，真正重要的信息被淹没在了茫茫的输出海洋里...

如果你觉得 Claude Code 越用越 "健忘"，并不是模型退化了，而是你的对话上下文，已经被一次次中间过程污染了。  

这正是子代理要解决的核心问题：把 "高噪声的执行过程" 隔离出去，只让真正有价值的结论，留在主对话中。只有子代理，才在系统层面天然拥有一个独立的上下文窗口。它是 Claude Code 里唯一一个，结构上允许 "执行完即丢弃" 的东西。   

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/cc/img_08.webp" alt="" width="100%" style="display: block; margin: 0 auto;" />


## Sub-Agents 的核心概念

### 什么是子代理

子代理相当于一个 "专职小助手"，带着自己的规则、工具权限、上下文窗口，去完成某一类任务，然后把 "结果" 带回来。  

有 Sub-Agent，那肯定要先有主 Agent，主 Agent 就是你当前操作的主对话。而主对话 vs 子代理，就是老板和员工的关系。  

一家公司的老板需要完成复杂的项目，有两种工作方式：

* 方式一：事必躬亲。亲自去调研市场、亲自写代码、亲自测试、亲自写文档...最后脑子里塞满了各种细节，已经记不清最初的目标是什么了。
* 方式二：专人专岗。安排一个市场专员去调研，只需要他给你一份调研结果的报告；安排一个测试工程师去跑测试，只需要他给你一份测试结果的报告；安排一个技术文档专员去写文档...每个人带着明确的任务出去，完成后只把结果带回来。  

子代理就是最后一种方式，它让主对话保持清洁，不被过程噪声污染。   

### 子代理的核心价值

子代理的核心价值，本质上就是三件事：隔离、约束、复用。

#### 隔离

隔离，解决的是上下文污染问题 --- 大量对当前执行有用，但是对后续决策毫无价值的日志、搜索结果和中间推理，不应该进入主对话的长期记忆；子代理拥有独立上下文，执行完即丢弃，只把结论带回来，让 Claude Code 记得更少，但记得更对。   

请看下面的示例：

```
主对话的上下文：
┌─────────────────────────────────────────┐
│ 用户：帮我分析一下这个 bug              │
│ Claude：好的，让我看看...               │
│ [子代理去执行，产生 500 行日志]         │
│ [子代理返回：发现 3 个相关文件]         │
│ Claude：我发现问题在这三个文件...       │
└─────────────────────────────────────────┘

子代理的上下文（独立的，执行完就释放）：
┌─────────────────────────────────────────┐
│ 任务：查找 bug 相关文件                 │
│ [搜索输出 500 行日志]                   │
│ [分析过程...]                           │
│ 结论：3 个相关文件                      │
└─────────────────────────────────────────┘
```

主对话只看到子代理返回的结论，不需要承载搜索过程。这意味着你的对话不会因为大量搜索就把 token 配额用光，重要的讨论内容不会被中间输出淹没，Claude Code 在后续对话中能更好地 "记住" 关键信息。

#### 约束

约束，解决的是行为不可控问题 --- 通过工具权限边界，把 "我希望你别这么做" 变成 "你物理上做不到"，让代码审查只能读、修 bug 才能写，角色职责不再依赖提示词自觉。   

```
# 只读型子代理（代码审查）
tools: Read, Grep, Glob
# 它只能看，不能改任何东西

# 开发型子代理（bug 修复）
tools: Read, Write, Edit, Bash
# 它可以读写文件和执行命令

# 研究型子代理（技术调研）
tools: Read, WebFetch, WebSearch
# 它可以读本地文件和搜索网络
```

#### 复用

复用，解决的是经验无法沉淀的问题 --- 当子代理被定义成文件、放进版本控制后，好的使用方式就从一次性对话，变成了可共享、可迭代的工程资产。  

子代理的配置保存在文件中，优点如下：

* 版本控制：放进 git，团队共享。
* 跨项目复用：好用的配置可以复制到其他项目。
* 渐进优化：根据实际使用情况不断调整 prompt，持续优化改善。  

```.claude/agents/
├── test-runner.md      # 测试运行专员
├── code-reviewer.md    # 代码审查专员
├── log-analyzer.md     # 日志分析专员
└── bug-fixer.md        # Bug 修复专员
```

这些配置文件就像公司里的 "岗位说明书"，每个岗位职责清晰、权限明确。  

### Claude Code 内置子代理

Claude Code 内置了一系列子代理，当你问 Claude Code --- "给我解释这个 Github 仓库" 时，Claude Code 就会自动调用内置子代理。  

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/cc/img_09.webp" alt="" width="100%" style="display: block; margin: 0 auto;" />

#### Explore 子代理

Explore 子代理负责 "翻项目，找位置"，专注快速只读搜索，把成百上千行 grep 和分析过程吞进去，只告诉你结论在哪里。  

```
┌─────────────────────────────────────────────────────────┐
│  Explore（探索者）                                       │
├─────────────────────────────────────────────────────────┤
│  特点：快速、只读                                        │
│  用途：搜索和分析代码库                                  │
│  模式：quick / medium / very thorough 三档              │
│  工具：Read, Grep, Glob（不能写）                        │
└─────────────────────────────────────────────────────────┘
```

#### Plan 子代理

Plan 子代理负责 "动手前先想清楚"，在真正修改代码之前，收集上下文、梳理依赖、生成实施路径，避免上来就盲目修改。   

```
┌─────────────────────────────────────────────────────────┐
│  Plan（规划者）                                          │
├─────────────────────────────────────────────────────────┤
│  特点：规划模式专用                                      │
│  用途：在制定实施计划前收集项目上下文                     │
│  限制：子代理不能再生成子代理（防止无限嵌套）             │
└─────────────────────────────────────────────────────────┘
```

#### General-purpose 子代理

General-purpose 子代理是 "能搜索、能修改、能推进" 的全能型员工，适合需要多步骤协作的复杂任务。   

```
┌─────────────────────────────────────────────────────────┐
│  General-purpose（通用型）                               │
├─────────────────────────────────────────────────────────┤
│  特点：全能型，处理复杂多步骤任务                         │
│  用途：同时需要探索和修改的任务                          │
│  工具：完整工具集                                        │
└─────────────────────────────────────────────────────────┘
```

### 子代理的应用时机

并不是所有任务都值得用子代理，子代理的价值，不在于 "能不能用"，而在于 "该不该用"。一个最直观的判断标准是：主对话是否需要承载执行过程本身。   

第一类适合用子代理的，是高噪声输出的任务。这类任务的共同点是：执行过程中会产生大量中间信息，但主对话真正关心的，往往只有一个结论，  

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/cc/img_10.webp" alt="" width="100%" style="display: block; margin: 0 auto;" />

第二类适合用子代理的，是角色边界非常明确的任务。比如，有些事情，你只希望 Claude Code "看"，而不希望它 "动手"。

第三类适合用子代理的，是可以并行展开的研究型任务。当你需要同时调研认证逻辑、数据库设计和 API 接口，或者对比几种技术方案...

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/cc/img_11.webp" alt="" width="100%" style="display: block; margin: 0 auto;" />

第四类适合用子代理的，是可以拆分成清晰阶段的流水线式任务。比如先定位代码位置，再做代码审查，然后进行修改，最后跑测试验证。

```
Explore（找位置）
    ↓
Reviewer（指出问题）
    ↓
Fixer（修复）
    ↓
Test-runner（验证）
```

> 一条关键约束：子代理不能再嵌套调用子代理。
> 
> 这意味着什么？
> 
> 所有编排必须由主对话完成：如果你需要 "先审查再修复"，必须由主对话依次调用两个子代理
> 
> 流水线的 "调度中心" 只有一个：就是主对话本身
> 
> 如果需要在子代理内复用知识：用 skills 字段预加载
> 

### 子代理的配置文件

如何创建子代理的配置文件？

子代理使用 Markdown + YAML frontmatter 格式：  

```
---
name: code-reviewer
description: Review code for security issues and best practices. Use after code changes.
tools: Read, Grep, Glob
model: sonnet
---

你是一个代码审查专家。

当被调用时：

1. 首先理解代码变更的范围
2. 检查安全问题
3. 检查代码规范
4. 提供改进建议

输出格式：
## 审查结果
- 安全问题：[列表]
- 规范问题：[列表]
- 建议：[列表]
```

frontmatter（---之间）部分定义子代理的元数据和配置，下方的 Markdown 正文就是子代理的系统提示词（system prompt）。子代理只会收到这段系统提示词和基本环境信息（如工作目录），不会继承主对话的完整系统提示词。  

frontmatter 字段详解如下；  

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/cc/img_12.png" alt="" width="100%" style="display: block; margin: 0 auto;" />

* description：决定了 Claude Code 何时自动调用你的子代理 --- 这是配置中最重要的设计决策。  

```
# 写的太模糊，Claude 不知道什么时候该用它
description: A code reviewer

# 好的 description：说明做什么 + 什么时候用
description: Review code changes for quality, security vulnerabilities, and best practices. Use proactively after code is modified or when user asks for code review.
```

* tools vs disallowedTools：白名单与黑名单，控制子代理能使用哪些工具。

```
# 方式一：白名单 (tools) — "只能用这些"
# 适合：需要严格限制的场景（如只读审查）
tools: Read, Grep, Glob

# 方式二：黑名单 (disallowedTools) — “继承所有，但排除这些”
# 适合：需要大部分工具但排除少数危险工具的场景
disallowedTools: Write, Edit
```

下面是根据用途划分的典型工具组合：  

```
只读型（审计/检查）         研究型（信息收集）         开发型（读写改）
├── Read                    ├── Read                   ├── Read
├── Grep                    ├── Grep                   ├── Write
└── Glob                    ├── Glob                   ├── Edit
                            ├── WebFetch               ├── Bash
                            └── WebSearch              ├── Glob
                                                       └── Grep
```

* model：模型选择与默认值

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/cc/img_13.png" alt="" width="100%" style="display: block; margin: 0 auto;" />

* permissionMode：权限模式

控制子代理在执行过程中遇到需要权限的操作时如何处理。子代理会继承主对话的权限上下文，但可以通过此字段覆盖行为：

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/cc/img_14.png" alt="" width="100%" style="display: block; margin: 0 auto;" />

* skills：为子代理预加载知识

skills 允许你在子代理启动时，把指定的 skills 的完整内容注入到子代理的上下文中。这意味着子代理不需要在执行过程中发现和加载 skill，知识已经在它的脑子里了。  

```
---
name: impact-analyzer
description: Analyze impact scope of code changes on the full call chain.
tools: Read, Grep, Glob, Bash
skills:
  - chain-knowledge        # 链路拓扑和 SLA 约束
  - recent-incidents       # 近期事故记录
---
```

* hooks：子代理专属的生命周期 Hook

子代理可以在自己的 frontmatter 中定义 Hook --- 这些 Hook 只在该子代理运行期间生效，子代理结束后自动清理。   

```
---
name: db-reader
description: Execute read-only database queries.
tools: Bash
hooks:
  PreToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: "./scripts/validate-readonly-query.sh"
---
```

### 子代理的存放位置与优先级

子代理可以被设置为不同的作用域。当多个作用域存在同名的子代理时，高优先级的子代理会覆盖低优先级的子代理。   

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/cc/img_15.png" alt="" width="100%" style="display: block; margin: 0 auto;" />

子代理可以被设置为项目级或用户级，项目级（仅当前项目可用）存放位置如下所示，适合项目特有的角色。  

```
your-project/
└── .claude/
    └── agents/
        ├── test-runner.md
        └── code-reviewer.md
```

用户级（所有项目可用）子代理适合通用角色，比如日志分析器、通用代码审查器等。  

```
~/.claude/
└── agents/
    ├── general-reviewer.md
    └── log-analyzer.md
```

### 创建子代理的三种方式

* 方式一：交互式创建（推荐新手使用）

在 Claude Code 中输入 /agents，按照向导操作：

```
步骤 1：输入 /agents
步骤 2：选择 "Create new agent"
步骤 3：选择存放位置（User-level 或 Project-level）
步骤 4：选择 "Generate with Claude" 并描述功能
步骤 5：选择需要的工具
步骤 6：选择模型
步骤 7：保存
```

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/cc/img_16.png" alt="" width="100%" style="display: block; margin: 0 auto;" />

这种方式简单直观，Claude Code 会帮你生成初始化的 prompt。

* 方式二：手写配置文件

直接创建 .claude/agents/your-agent.md 文件，这种方式是更精细的控制，方便版本管理，可以从其他项目复制。  

* 方式三：CLI 参数临时创建

通过 --agents 参数，可以在启动 Claude Code 时传入 JSON 格式的子代理定义。这种方式创建的子代理仅在当前会话中存在，不会保存到磁盘。

### 子代理的运行模式

子代理可以在前台或后台运行。  

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/cc/img_17.png" alt="" width="100%" style="display: block; margin: 0 auto;" />

Claude Code 会根据任务自动选择前台或后台运行，你也可以手动控制。   

* 对 Claude Code 说 ”run this in the background“
* 正在运行的前台子代理可以按 Ctrl + B 切换到后台

启动前，Claude Code 会预先请求子代理可能需要的所有权限 --- 因为后台运行时无法弹出交互式确认。如果后台子代理因权限不足而失败，你可以恢复它到前台重试。  

每个子代理执行完成后，Claude Code 会自动收到它的 Agent ID。如果你需要在之前的子代理基础上继续工作，可以让 Claude Code 恢复它。

```
用 code-reviewer 子代理审查认证模块
[子代理完成]

继续刚才的审查，再看一下授权逻辑
[Claude 恢复之前的子代理，保留完整上下文]
```

恢复的子代理会保留所有之前的对话历史 --- 它从上次停下的地方继续，而不是重新开始，这对于需要多轮迭代的长任务非常有用。
