---
title: "从 0 实现 React18 系列 - 搭建项目架构"
date: 2023-07-10T09:45:47+08:00
tags: ["第一技能"]
categories: ["React18"]
---

本系列旨在讲述如何从 0 开始实现一个 React18 的基础版本。通过实现一个基础版本，深入了解 React 的内部机制。   

<!--more-->

项目地址： [big-react](https://github.com/OweQian/big-react.git)     

主要内容：   

* 定义项目结构 (monorepo)      
* 定义开发规范 (lint, commit, tsc, 代码风格)   
* 选择打包工具 (rollup)   

## 项目结构   

Multirepo 和 Monorepo 该如何选择？   

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/react/img_01.png" alt="" />  

Multirepo 和 Monorepo 是两种不同的源代码管理策略。它们的主要区别在于如何组织和存储项目的代码。   

* Multirepo(多仓库)：每个项目或每个服务都有自己的仓库，每个仓库都是独立的，有自己的提交历史、版本控制、分支。优点是可以更好的隔离项目，避免不必要的依赖，更容易管理权限。缺点是跨项目的代码共享、版本同步、依赖管理会更复杂。  
* Monorepo(单仓库)：所有的项目或服务都存储在同一个仓库中。优点是更容易进行跨项目的代码共享、版本同步和依赖管理。缺点是如果仓库过大，可能会导致版本控制系统的性能问题，同时也可能在权限管理和项目隔离上遇到挑战。    

### Monorepo

简单工具：   

* npm   
* yarn  
* pnpm   

专业工具：   

* nx
* bit
* turborepo
* rush.js
* nx
* lerna 

pnpm 相比其他打包工具的优势：   

* 依赖安装快（结合软硬链接）       
* 更规范（处理幽灵依赖问题：扁平化依赖）    

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/react/img_02.png" alt="" />  

### pnpm 初始化

安装   

```shell
npm install -g pnpm
pnpm init
```

初始化 pnpm-workspace.yaml   

pnpm-workspace.yaml 定义了工作空间的根目录，并能够使您从工作空间中包含 / 排除目录。 默认情况下，包含所有子目录。    

```
packages:
  # all packages in direct subdirs of packages/
  - 'packages/*'
```

## 开发规范

### 代码规范检查与修复   

#### eslint - 代码规范  

安装   

```shell
pnpm i eslint -D -w
```

> -w：在根目录下安装   

初始化   

```shell
npx eslint --init
```

.eslintrc.json配置如下      

```json
{
   "env": {
    "browser": true,
    "es2021": true,
    "node": true
   },
   "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "prettier",
    "plugin:prettier/recommended"
   ],
   "parser": "@typescript-eslint/parser",
   "parserOptions": {
    "ecmaVersion": "latest",
    "sourceType": "module"
   },
   "plugins": ["@typescript-eslint", "prettier"],
   "rules": {
    "prettier/prettier": "error",
    "no-case-declarations": "off",
    "no-constant-condition": "off",
    "@typescript-eslint/ban-ts-comment": "off"
   }
}
```

安装 ts 的 eslint 插件     

```shell
pnpm i -D -w @typescript-eslint/eslint-plugin 
```

#### prettier - 代码风格   

```shell
pnpm i prettier -D -w
```

新建 .prettierrc.json 配置文件   

```json

{
 "printWidth": 80,
 "tabWidth": 2,
 "useTabs": true,
 "singleQuote": true,
 "semi": true,
 "trailingComma": "none",
 "bracketSpacing": true
}
```

将 prettier 集成到 eslint 中，其中：   

* eslint-config-prettier：覆盖 eslint 本身的规则配置   
* eslint-plugin-prettier：用 prettier 来接管修复代码即 eslint --fix   

```shell
pnpm i eslint-config-prettier eslint-plugin-prettier -D -w
```

为 lint 增加对应的执行脚本，并验证效果：   

```
"lint": "eslint --ext .ts,.jsx,.tsx --fix --quiet ./packages"
```

### commit 规范检查  

安装 husky，用于拦截 commit 命令    

```shell
pnpm i husky -D -w
```

初始化 husky   

```shell
npx husky install
```

将刚才实现的格式化命令 pnpm lint 纳入 commit 时 husky 将执行的脚本   

```shell
npx husky add .husky/pre-commit "pnpm lint"   
```

> pnpm lint 会对代码全量检查，当项目复杂后执行速度可能比较慢，届时可以考虑使用 lint-staged，实现只对暂存区代码进行检查。    

通过 commitlint 对 git 提交信息进行检查，首先安装必要的库   

```shell
pnpm i commitlint @commitlint/cli @commitlint/config-conventional -D -w
```

新建配置文件 .commitlintrc.js   

```javascript
module.exports = {
  extends: ["@commitlint/config-conventional"]
}; 
```

集成到 husky 中   

```shell
npx husky add .husky/commit-msg "npx --no-install commitlint -e $HUSKY_GIT_PARAMS"
```

conventional 规范集意义      

```
// 提交的类型: 摘要信息
<type>: <subject>
```

常用的 type 值包括如下：   

* feat: 添加新功能
* fix: 修复 Bug
* chore: 一些不影响功能的更改
* docs: 专指文档的修改
* perf: 性能方面的优化
* refactor: 代码重构
* test: 添加一些测试代码等等

配置 tsconfig.json   

```json
{
 "compileOnSave": true,
 "compilerOptions": {
  "target": "ESNext",
  "useDefineForClassFields": true,
  "module": "ESNext",
  "lib": ["ESNext", "DOM"],
  "moduleResolution": "Node",
  "strict": true,
  "sourceMap": true,
  "resolveJsonModule": true,
  "isolatedModules": true,
  "esModuleInterop": true,
  "noEmit": true,
  "noUnusedLocals": true,
  "noUnusedParameters": true,
  "noImplicitReturns": false,
  "skipLibCheck": true,
  "baseUrl": "./packages"
 }
}
```

## 打包工具   

要开发的项目的特点：  

* 是一个库  
* 希望工具尽可能简洁、打包产物可读性高  
* 原生支持 ESM  

综上所述，选择 rollup   

```shell
pnpm i -D -w rollup
```

## 代码地址

[本节代码地址](https://github.com/OweQian/big-react/commit/b93d868e0eda7f3acfb5308b89d15e92d5bc328b)