---
title: "📝 react 原理篇 - fiber 与调和"
date: 2024-08-21T16:36:58+08:00
tags: ["react"]
categories: ["react"]
---

本篇是 react 原理系列的第四篇 - fiber 与调和，你会学到 react fiber 原理，以及 react 调和的两大阶段，解决面试中遇到的 fiber 与调和问题。

<!--more-->

首先我们来思考几个问题：

🤔 Q1: react 异步调度原理？  
🤔 Q2: react 为什么不用 setTimeout?  
🤔 Q3: 时间分片是什么？  
🤔 Q4: react 如何模拟 requestIdleCallback？  
🤔 Q5: 简述一下调度流程？
