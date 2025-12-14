---
title: "🤖 AI - 基于公司私有组件库生成业务组件"
date: 2025-12-13T12:34:56+08:00
tags: ["AI"]
categories: ["AI"]
---

上一篇讨论了如何基于开源组件库生成业务组件，本篇讨论如何基于公司私有组件库生成业务组件。

<!--more-->

Q：为什么大模型不能直接生成基于公司私有组件库的代码？

这个问题的本质是：由于大模型的训练数据集不包含你公司的私有组件数据，因此不能生成符合你公司私有组件库的代码。

解决问题的核心是：让大模型知道你公司的私有组件库是什么样的。

### 三种解决方案

#### 预训练

预训练是整个大模型训练过程中最复杂的阶段，如 GPT4 的预训练由大量的算力（GPU）在海量无标记的数据上训练数月，最终产出基座模型。

海量无标记数据：

- 包含：互联网上的公开数据（开源组件库）
- 不包含：公司私有组件库

<div align="center">
<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/AI/chat_32.png" alt="" width="100%" />
</div>

尝试让公司私有组件库的数据包含在预训练的海量无标记数据中：

- 从 0 ~ 1，预训练一个属于你自己的基座模型
- 考虑将公司私有组件库开源，暴露到外部的海量无标记数据中

#### Fine-tuning(微调)

基于基座模型，使用少量已标记的数据进行再训练， 让模型更符合你的特定场景。

<div align="center">
<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/AI/chat_33.png" alt="" width="100%" />
</div>

#### RAG

R - Retrieval(检索)、A - Augmented(增强)、G - Generation(生成)。

一种思想和方法论，目的是为了解决大模型在特定场景（如公司私有组件库）的 “幻觉” 问题。

<div align="center">
<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/AI/chat_34.png" alt="" width="100%" />
</div>

- 从大模型外的知识库（如私有的向量数据库、联网的实时数据等）中检索与查询相关信息
- 结合检索出的信息以及原始查询组合为新的查询，一起给到大语言模型
- 由于检索出的信息包含在查询的上下文中，所以生成包含专业领域的内容

<div align="center">
<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/AI/chat_35.png" alt="" width="100%" />
</div>

#### 方案对比

| 方案        | 优点                                                                                                 | 缺点                                                                       | 适用场景                                                                                                       |
| ----------- | ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| 预训练      | - 效果相对最好<br>- 模型能完全理解私有组件库                                                         | - 成本极高<br>- 技术门槛高<br>- 需要海量训练数据<br>- 维护成本高           | - 大型科技公司有充足资源<br>- 需要构建完全定制化的模型<br>- 有海量专有数据需要学习<br>- 对模型理解深度要求极高 |
| Fine-tuning | - 成本相对较低<br>- 只需少量标注数据<br>- 可以快速适应特定场景                                       | - 效果不如预训练<br>- 可能出现灾难性遗忘<br>- 需要一定的算力和专业知识     | - 有特定垂直领域的应用需求<br>- 有一定的标注数据集<br>- 需要模型具备特定的能力<br>- 预算和资源相对充足         |
| RAG         | - 实现简单，成本最低<br>- 无需训练，可即时更新知识<br>- 可控性强，易于维护<br>- 可以保证知识的准确性 | - 受限于上下文窗口大小<br>- 检索质量依赖于向量化效果<br>- 响应速度可能较慢 | - 快速落地 AI 应用<br>- 需要及时更新知识库<br>- 对知识准确性要求高<br>- 资源有限但需要快速实现                 |

#### 选择路径

RAG > Fine-tuning > 预训练

#### 最终选择

RAG

### RAG 详解

<div align="center">
<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/AI/chat_35.png" alt="" width="100%" />
</div>

#### 前置名词

- Chunk：将文本（或其它数据）切分为每一段数据，是一种数据切片的方法
- Embedding：将每个 Chunk 转换为向量，是一种将高维空间的数据（文字、图片等）转换为低维空间的表示方法，后续可以通过匹配向量之间的余弦相似度来实现语义检索
- Vector Database：向量数据库，用于存储 Embedding 和原始 Chunk 的数据库（注意：某些 Vector Database 只支持存储 Embedding，需要自行来建立 Embedding 和原始 Chunk 之间的映射关系）

#### 构建 RAG 向量知识库的过程

<div align="center">
<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/AI/chat_36.png" alt="" width="100%" />
</div>

1、原始数据（Resource Data）

从各种来源收集原始数据，比如公司私有组件库的文档文本。

2、分块（Chunking）

将资源数据细分为更小的快，称为 Chunk。

3、向量化（Embedding）

将每个 Chunk 转换为向量表示，便于后续根据向量进行语义相似度匹配。

4、存储至向量数据库

将所有的 Chunk 和 Embedding 一一对应存储在向量数据库中，用于后续向量匹配检索出原始的 Chunk 数据。

#### RAG 向量检索过程的简单示例

<div align="center">
<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/AI/chat_37.png" alt="" width="100%" />
</div>

1、用户输入一个问题，如：帮我生成一个 table，包括姓名、年龄、性别。  
2、将问题转换为向量表示。  
3、将用户需求的向量和向量数据库中的向量进行相似度匹配，检索出相似度高的数据源（Retrieval）。  
4、将检索出的数据源和用户需求的问题组合（Augmented），一起输入给大模型（Generation）。

#### 如何使用 RAG

1、基于开源知识库平台快速使用 RAG

- Dify
- FastGPT

2、基于 LLM 应用框架来上手 RAG

- LangChain
- LlamaIndex
- Vercel AI SDK

### RAG 知识库数据准备

#### 如何准备私有组件库的 RAG 知识库数据

<div align="center">
<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/AI/chat_36.png" alt="" width="100%" />
</div>

<div align="center">
<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/AI/chat_37.png" alt="" width="100%" />
</div>

有两个关键的点：

1、组件 Chunk 知识的完整性保证  
2、Chunk 包含的组件的语义和功能是清晰的

##### 组件 Chunk 知识的完整性保证

将单个私有组件的知识库数据放在单独的 md 文件中保存，每个 md 文件内容就是单个的 Chunk，如下：

```markdown
table.md

<!-- 这里是 Table 组件的知识库数据 -->
```

```markdown
input.md

<!-- 这里是 Input 组件的知识库数据 -->
```

##### Chunk 包含的组件的语义和功能是清晰的

在知识库数据中，可以包含组件的功能描述、使用场景、组件的 API、代码示例等信息。

> Q：直接把组件的完整代码放进去是否可以？
>
> A：不建议，全量代码占用的上下文太多，尽管现阶段的 AI 已经支持了超大的上下文 Context，但是随着 Context 的长度增大，AI 的推理能力也会下降，容易抓不到问题的重点。

在这里，我将使用场景、组件的 API 放入知识库数据中，示例如下：

```markdown
# Table

## When To Use（使用场景）

Table 组件用于展示数据，通常用于展示列表数据。

## API（组件的 API）

- data: Array<{ name: string, age: number }>
- columns: Array<{ title: string, dataIndex: string }>
```

> 可以参考 Antd 的组件库文档编写规范，基本上直接可以拿过来作为 RAG 的知识库数据

#### 实际操作案例

1、Clone 私有组件库的 Repo 到本地，安装相关依赖。

```
git clone https://github.com/AI-FE/private-bizcomponent-website.git

pnpm install
```

2、编写脚本 format-docs.js，将私有组件数据转换为合适的知识库数据格式

```
cd packages/@private-basic-components
node ai-docs/format-docs.js
```

在这个脚本中，会遍历 components 目录下的所有组件文档，从文档中收集组件的使用场景、组件的 API 作为知识库的原始数据。

```javascript
const fs = require("fs");
const path = require("path");

const inputDirectory = path.join(__dirname, "../components");
const outputFileCSVPath = path.join(__dirname, "basic-components.txt");

const dataSources = [];

function saveToTxt() {
  // 将dataSources中的内容拼接成一个字符串，每个内容之间用-------split line-------分割
  const csvContent = dataSources.join("\n-------split line-------\n");
  // 将csvContent转换为带BOM的UTF-8格式防止用excel打开时中文乱码
  const csvWithBOM = `\ufeff${csvContent}`;
  // 将csvWithBOM写入到outputFileCSVPath文件中
  fs.writeFileSync(outputFileCSVPath, csvWithBOM, "utf8");
  console.log("基础组件知识库文件已保存");
}

function collectDoc(content) {
  // 从content中提取组件名称
  const match = content.match(/\btitle\b:\s*(.*)/);
  // 提取组件名称
  const componentName = match?.[1]?.trim();
  // 搜索API部分的开始位置
  const apiStartIndex = content.search("## API");
  // 搜索When To Use部分的开始位置
  const descriptionIndex = content.search("## When To Use");

  // 如果API或When To Use部分没有找到，则打印警告并返回
  if (apiStartIndex === -1 || descriptionIndex === -1) {
    console.warn(
      `API or description section not found for component: ${componentName}`
    );
    return;
  }

  // 提取API部分的内容
  const firstHandleContent = content
    .substring(apiStartIndex + "## API".length)
    .trim();
  // 提取When To Use部分的内容
  const firstHandelDescriptionContent = content
    .substring(descriptionIndex + "## When To Use".length)
    .trim();

  // 搜索API部分的结束位置
  const apiEndIndex = firstHandleContent.search(/(?<!#)##(?!#)/);
  // 搜索When To Use部分的结束位置
  const descriptionEndIndex =
    firstHandelDescriptionContent.search(/(?<!#)##(?!#)/);
  // 提取API部分的内容
  // 如果API部分的结束位置大于0，则提取API部分的内容，否则提取整个API部分的内容
  const apiContent = firstHandleContent
    .substring(0, apiEndIndex >= 0 ? apiEndIndex : undefined)
    .trim();
  // 如果When To Use部分的结束位置大于0，则提取When To Use部分的内容，否则提取整个When To Use部分的内容
  const descriptionContent = firstHandelDescriptionContent
    .substring(0, descriptionEndIndex >= 0 ? descriptionEndIndex : undefined)
    .trim();
  // 将API部分和When To Use部分的内容拼接成一个字符串
  const csvFormat = `
    The documentation for the ${componentName} basic UI components
    <when-to-use>
    ${descriptionContent}
    </when-to-use>

    <API>
    ${apiContent}
    </API>
    `;
  // 将csvFormat添加到dataSources中
  dataSources.push(csvFormat);
}

function processFiles(directoryPath) {
  // 读取目录下的所有文件
  const files = fs.readdirSync(directoryPath);
  // 遍历所有文件
  files.forEach((file) => {
    // 拼接文件路径
    const filePath = path.join(directoryPath, file);
    // 判断是否是目录
    if (fs.statSync(filePath).isDirectory()) {
      // 如果是子目录，则递归处理
      processFiles(filePath);
    } else if (file === "index.en-US.md") {
      // 如果文件名是 "index-en-US.md"，则读取内容并追加到输出文件
      const content = fs.readFileSync(filePath, "utf8");
      // 收集文档内容
      collectDoc(content);
    }
  });
}

// 递归遍历目录并处理文件
function generatedDOC(directoryPath) {
  processFiles(directoryPath);
  saveToTxt();
  console.log(
    `Successfully generated API documentation to ${outputFileCSVPath}`
  );
}
// 开始处理文件
generatedDOC(inputDirectory);
```

脚本执行完成之后，会在 ai-docs 目录下生成一个 basic-components.txt 文件。

<div align="center">
<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/AI/chat_38.png" alt="" width="100%" />
</div>

在 basic-compontents.txt 中，包含 -------split line-------，这是用来后续将组件的知识库数据切分到不同的 Chunk 中，保证每个 Chunk 中的组件知识都是完整的。

在 basic-componens.txt 中，包含 \<when-to-use\>\</when-to-use> 和\<API>\</API> 标签，这个用来保证当前组件的语义和功能是清晰的。
