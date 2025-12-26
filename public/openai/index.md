# 

### 总结

我们实现了使用主流 AI 研发技术栈构建 AI 应用。

- OpenAI SDK：Embedding、Retrieval、Augmented、Generation
- Vercel AI SDK：mbedding、Retrieval、Augmented、Generation

但是现阶段还存在很多问题：

1、从项目功能的角度分析

- 现有 Embedding 式 RAG 召回的知识内容不够准确
- 无法通过图片直接召回所需要用到的私有组件知识

2、从项目体验的角度分析

- 生成的代码不能够及时看到反馈
- 代码不能人工介入进行编辑微调
- 生成的代码缺少存储和版本管理

3、从 AI 赋能前端金字塔模型角度分析

缺少 AI 赋能的其它 3 个步骤：从 1 ～ n 迭代业务组件、从 0 ～ 1 页面对接联调、从 1 ～ n 页面对接联调。

🤔 如何解决这些问题呢？

