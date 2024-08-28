---
title: "💻 从 0 到 1 封装一个前端脚手架"
date: 2022-12-28T13:50:24+08:00
tags: ["脚手架"]
categories: ["脚手架"]
---

本篇文章旨在带你从 0 到 1 围绕项目 “创建、运行、测试、提交、发布” 的常规流程进行前端脚手架工具的封装，满足大中小项目开发所需，欢迎您的指正和点赞。

<!--more-->

## 理解脚手架

🤔 前端不是写写页面就可以了吗？为什么要做脚手架开发？

大部分前端工程师都要使用脚手架，最常见的脚手架有：npm、vue-cli、create-react-app、webpack-cli 等等，实际工作中，我们往往需要借助脚手架来做各种流程的自动化，如：项目创建、项目构建、项目发布等。

具有一定规模的前端团队，需要各种各样的提效工具，这类工具可以帮助企业大幅度节约研发成本。另外，随着前端技术的普及，脚手架也成为前端工程师的基本技能。

### 脚手架简介

🤔 什么是脚手架？

脚手架本质是一个操作系统的客户端，它通过命令行执行，如：

```bash
vue create vue-test-app
```

这条命令由 3 个部分组成：

- 主命令：vue
- command：create
- command 的 param：vue-test-app

它表示创建一个 vue 项目，项目名称为 vue-test-app，这是一个较为简单的脚手架命令，实际场景往往更加复杂，比如：

当前目录已经有文件了，需要覆盖当前目录下的文件，强制进行创建 vue 项目，此时可以输入：

```bash
vue create vue-test-app --force
```

这里的 --force 称为 option，用来辅助脚手架确认在特定场景下用户的选择。--force 可以理解为：--force true，简写为：--force 或 -f。

还有一种场景：

通过 vue create 创建项目时，会自动执行 npm install 帮用户安装依赖，如果我们希望使用淘宝源来安装，可以这样输入：

```bash
vue create vue-test-app --force -r https://registry.npm.taobao.org
```

这里的 -r 也称为 option，它与 --force 不同的是，它使用简写，这里的 -r 也可以替换成 --registry。

-r https://registry.npm.taobao.org 后面的 https://registry.npm.taobao.org 称为 option 的 param。

输入下面的命令就可以看到 vue create 支持的所有 options：

```bash
vue create --help
```

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/cli/img_01.png" alt="" width="100%" />

### 脚手架实现原理

我们以使用 @vue/cli 新建一个 vue 项目为例，首先要全局安装 @vue/cli：

```bash
npm install -g @vue/cli
# OR
yarn global add @vue/cli
```

然后创建一个项目：

```bash
vue create vue-test-app
```

接下来，我们思考一些问题 (以 npm 作为包管理器)。

🤔 全局安装 @vue/cli 时发生了什么？

🤔 为什么全局安装 @vue/cli 后会添加 vue 命令？

🤔 输入命令 vue create vue-test-app 发生了什么？

🤔 为什么 vue 指向一个 js 文件，我们却可以直接通过 vue 命令直接去执行它？

- @vue/cli 是一个 npm 项目，包含一个 bin/vue.js 文件并已经发布到 npm

* 执行安装命令，npm 会从 npm 注册表中下载 @vue/cli 的最新版本及其依赖项
* 命令行工具会把 @vue/cli 安装到 node 的 lib/node_modules
* 在环境变量中注册 vue 命令，并配置软链接指向：lib/node_modules/@vue/cli/bin/vue.js
* 在终端输入 vue create vue-test-app，终端解析出 vue 命令
* 终端在环境变量中找到 vue 命令，根据 vue 命令指向的软链接找到实际文件 vue.js
* 终端利用 node 执行 vue.js，解析 command/options，执行 command
* 执行完毕，退出执行

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/cli/img_02.png" alt="" width="100%" />

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/cli/img_03.png" alt="" width="100%" />

🤔 如何开发一个脚手架？

以 vue-cli 为例：

- 开发一个 npm 项目，该项目中包含一个 bin/vue.js 文件，将这个项目发布到 npm
- 将 npm 项目安装到 node 的 lib/node_modules
- 在 node 的 bin 目录下配置 vue 软链接指向 lib/node_modules/@vue/cli/bin/vue.js

这样我们在执行 vue 命令的时候就可以找到 vue.js 进行执行。

### 脚手架前置知识

#### 常用的脚手架框架

- [yargs](https://www.npmjs.com/package/yargs)
- [commander](https://www.npmjs.com/package/commander)
- [oclif](https://www.npmjs.com/package/oclif)

* 脚手架生成器

#### 脚手架创建流程

- 创建 npm 项目，执行 npm init
- 创建脚手架入口文件，最上方添加

```javascript
#!/usr/bin/env node
```

- 配置 package.json，添加 bin 属性，指向入口文件

#### 脚手架开发流程

- 分包：将复杂的系统拆分成若干个模块
- 命令注册：

```bash
vue create
vue add
vue invoke
```

- 参数解析

1. options 全称：--version、--help
2. options 简写：-V、-h
3. 带 params 的 options：--path /Users/qianwang/Desktop/vue-test

- global help

1. Usage
2. Options
3. Commands

🌰 vue 的帮助信息：

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/cli/img_04.png" alt="" width="100%" />

- command help

1. Usage
2. Options

🌰 vue create 的帮助信息：

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/cli/img_05.png" alt="" width="100%" />

还有很多，比如：

- 命令行交互
- 日志打印
- 命令行文字变色
- 网络通信：HTTP
- 文件处理

等等...

#### 脚手架调试流程

- 链接本地脚手架：

```
cd your-cli-dir
npm link
```

- 链接本地库文件

```
cd your-lib-dir
npm link
cd your-cli-dir
npm link your-lib
```

- 取消链接本地库文件：

```
cd your-lib-dir
npm unlink
cd your-cli-dir
# link存在
npm unlink your-lib
# link不存在
rm -rf node_modules
npm install -S your-lib
```

🧠 理解 npm link：

- npm link your-lib：将当前项目项目中 node_modules 下指定的库文件链接到 node 全局 node_modules 下的库文件

- npm link：将当前项目链接到 node 全局 node_modules 中作为一个库文件，并解析 bin 配置创建可执行文件

🧠 理解 npm unlink：

- npm unlink：将当前项目从 node 全局 node_modules 中移除

* npm unlink your-lib：将当前项目中的库文件依赖移除

#### 脚手架发布流程

- 将脚手架发布到 npm

#### 脚手架使用流程

- 安装脚手架

```
npm install -g your-own-cli
```

- 使用脚手架

```
your-own-cli
```

## 所用技术栈

1. **Lerna**

   - **用途**：用于管理 JavaScript 项目的多包工具，能够处理 monorepo 项目，简化包的管理和版本控制。
   - **官网**：[Lerna](https://lerna.js.org/)

2. **Chalk**

   - **用途**：一个用于在控制台输出带颜色和样式的文本的库，提供简洁的 API。
   - **官网**：[Chalk](https://github.com/chalk/chalk)

3. **Commander**

   - **用途**：一个用于创建可执行命令行应用程序的库，帮助构建友好的 CLI 接口。
   - **官网**：[Commander](https://github.com/tj/commander.js)

4. **dirname-filename-esm**

   - **用途**：在 ES 模块中获取当前文件的目录名和文件名，解决 ES 模块中的路径问题。
   - **官网**：[dirname-filename-esm](https://github.com/deno-libs/dirname-filename)

5. **fs-extra**

   - **用途**：一个扩展的文件系统库，提供了 FS 模块中没有的额外功能，如递归复制、删除等。
   - **官网**：[fs-extra](https://github.com/jprichardson/node-fs-extra)

6. **import-local**

   - **用途**：用于在本地查找依赖模块，不会干扰全局安装的模块，通常用于 CLI 工具中。
   - **官网**：[import-local](https://github.com/tapio/import-local)

7. **semver**

   - **用途**：一个用于解析、比较和操作语义化版本号（semver）的库。
   - **官网**：[semver](https://github.com/npm/node-semver)

8. **execa**

   - **用途**：一个用于执行子进程并处理其输出的库，提供更好的人机界面，以处理和简化命令行的执行。
   - **官网**：[execa](https://github.com/sindresorhus/execa)

9. **Jest**

   - **用途**：由 Facebook 开发的 JavaScript 测试框架，适用于 React 应用和其他 JavaScript 项目，具有零配置的特性。
   - **官网**：[Jest](https://jestjs.io/)

10. **Mocha**

    - **用途**：一个灵活的 JavaScript 测试框架，支持异步测试和多种断言库。
    - **官网**：[Mocha](https://mochajs.org/)

11. **Axios**

    - **用途**：一个用于发送 HTTP 请求的库，支持 Promise API 和请求/响应拦截器。
    - **官网**：[Axios](https://axios-http.com/)

12. **Inquirer**

    - **用途**：用于构建命令行交互式问答的库，广泛用于 CLI 应用中获取用户输入。
    - **官网**：[Inquirer](https://github.com/SBoudrias/Inquirer.js)

13. **npmlog**

    - **用途**：一个用于记录 NPM 日志的库，提供多种日志级别。
    - **官网**：[npmlog](https://github.com/npm/npmlog)

14. **url-join**

    - **用途**：一个用于连接 URL 片段的简单库，确保正确处理斜杠。
    - **官网**：[url-join](https://github.com/BlakeDonner/url-join)

15. **path-exists**

    - **用途**：检查文件或目录是否存在的库。
    - **官网**：[path-exists](https://github.com/sindresorhus/path-exists)

16. **simple-git**

    - **用途**：一个简化 Git 操作的 Node.js 库，用于在 Node 应用中执行 Git 命令。
    - **官网**：[simple-git](https://github.com/steveukx/git-js)

17. **Ora**

    - **用途**：一个用于在命令行中显示加载动画的库，常用于指示异步操作的进度。
    - **官网**：[Ora](https://github.com/sindresorhus/ora)

18. **EJS**

    - **用途**：一个简单的 JavaScript 模板引擎，用于生成 HTML 内容，支持在 JavaScript 中嵌入 HTML 代码。
    - **官网**：[EJS](https://ejs.co/)

19. **Glob**

    - **用途**：用于文件匹配（文件搜索）的库，允许使用 Unix 风格的图案匹配文件名。
    - **官网**：[Glob](https://github.com/isaacs/node-glob)

20. **ESLint**

    - **用途**：一个用于识别和报告 JavaScript 代码中模式问题的工具，帮助保持代码质量。
    - **官网**：[ESLint](https://eslint.org/)

21. **Egg.js**

    - **用途**：一个基于 Koa 的企业级 Node.js web 框架，提供强大的插件系统和架构。
    - **官网**：[Egg.js](https://eggjs.org/)

22. **egg-mongoose**

    - **用途**：Egg.js 框架的 Mongoose 插件，用于简单地连接 MongoDB 数据库。
    - **官网**：[egg-mongoose](https://github.com/eggjs/egg-mongoose)

23. **MongoDB**
    - **用途**：一个现代化的 NoSQL 数据库，可用于存储和查询数据，适合处理非结构化数据。
    - **官网**：[MongoDB](https://www.mongodb.com/)

## 搭建脚手架

通过 lerna 创建 package：

```
packages
├── cli # 脚手架入口
├── command # 通用脚手架框架
├── commit # 代码提交工具
├── init # 项目创建工具
├── install # 源码下载工具
├── lint # 代码规范检查工具
└── utils # 通用工具类
```

### 通用脚手架框架

#### packages/utils

##### 调整 package.json

```
{
  "name": "@oweqian/utils",
  "version": "0.0.0",
  "description": "cli-oweqian utils",
  // ...
  "main": "lib/index.js",
  "directories": {
    "lib": "lib",
    "test": "__tests__"
  },
  "files": [
    "lib"
  ],
  // ...
  "dependencies": {
    "axios": "^1.1.3",
    "execa": "^6.1.0",
    "fs-extra": "^10.1.0",
    "inquirer": "^9.1.3",
    "npmlog": "^6.0.2",
    "path-exists": "^5.0.0",
    "url-join": "^5.0.0"
  },
  "type": "module"
}
```

> package.json 中 type = "module" 时，.js 后缀文件会被识别为 ESM，如果不指定默认为 commonjs。

##### 入口文件

```javascript
import isDebug from "./isDebug.js";
import log from "./log.js";
import printErrorLog from "./printErrorLog.js";
import { makeList, makeInput, makePassword } from "./inquirer.js";
import { getLatestVersion } from "./npm.js";
import request from "./request.js";
import Github from "./git/Github.js";
import Gitee from "./git/Gitee.js";
import { getGitPlatform, clearCache } from "./git/GitServer.js";
import {
  initGitServer,
  initGitType,
  createRemotoRepo,
} from "./git/GitUtils.js";

export {
  log,
  isDebug,
  makeList,
  makeInput,
  makePassword,
  getLatestVersion,
  printErrorLog,
  request,
  Github,
  Gitee,
  getGitPlatform,
  initGitServer,
  initGitType,
  clearCache,
  createRemotoRepo,
};
```

##### 封装 isDebug

```javascript
/**
 * 检测当前 Node.js 进程是否以调试模式启动
 * 通过指定命令行参数 --debug 或 -d
 */
export default function isDebug() {
  return process.argv.includes("--debug") || process.argv.includes("-d");
}
```

> process.argv 是 Node.js 提供的一个数组，其中包含了命令行输入的参数。第一个元素是 Node.js 可执行文件的路径，第二个元素是被执行的 JavaScript 文件的路径，后面的元素是传递给脚本的命令行参数。

##### 封装 npmlog

```javascript
import log from "npmlog";
import isDebug from "./isDebug.js";

/**
 * 打印日志
 */
if (isDebug()) {
  log.level = "verbose";
} else {
  log.level = "info";
}

log.heading = "oweqian";
log.addLevel("success", 2000, { fg: "green", bold: true });

export default log;
```

##### 封装 printErrorLog

```javascript
import log from "./log.js";
import isDebug from "./isDebug.js";

function printErrorLog(e, type) {
  if (isDebug()) {
    log.error(type, e);
  } else {
    log.error(type, e.message);
  }
}

export default printErrorLog;
```

##### 封装 inquirer

```javascript
import inquirer from "inquirer";

function make({
  type = "list",
  message = "请选择",
  defaultValue,
  validate,
  require = true,
  pageSize,
  mask = "*",
  choices,
  loop,
}) {
  const options = {
    name: "name",
    type,
    message,
    default: defaultValue,
    validate,
    require,
    pageSize,
    mask,
    loop,
  };
  if (type === "list") {
    options.choices = choices;
  }

  return inquirer.prompt(options).then((answer) => answer.name);
}

// list
export function makeList(params) {
  return make({ ...params });
}

// input
export function makeInput(params) {
  return make({
    ...params,
    type: "input",
  });
}

// password
export function makePassword(params) {
  return make({
    ...params,
    type: "password",
  });
}
```

##### 封装 npm api

```javascript
import urlJoin from "url-join";
import axios from "axios";
import log from "./log.js";

/**
 * 获取 package 信息
 */
function getNpmInfo(npmName) {
  const registry = "https://registry.npmjs.org/";
  const url = urlJoin(registry, npmName);
  return axios.get(url).then((response) => {
    try {
      return response.data;
    } catch (err) {
      return Promise.reject(err);
    }
  });
}

/**
 * 获取 package 最新版本
 */
export function getLatestVersion(npmName) {
  return getNpmInfo(npmName).then((data) => {
    if (!data["dist-tags"] || !data["dist-tags"].latest) {
      log.error("没有 latest 版本号");
      return Promise.reject(new Error("没有 latest 版本号"));
    }
    return data["dist-tags"].latest;
  });
}
```

##### 封装 axios

```javascript
import axios from "axios";

const BASE_URL = "http://127.0.0.1:7001";

const service = axios.create({
  baseURL: BASE_URL,
  timeout: 5000,
});

// 成功
function onSuccess(response) {
  return response.data;
}

// 失败
function onFailed(error) {
  return Promise.reject(error);
}

// 响应拦截器
service.interceptors.response.use(onSuccess, onFailed);

export default service;
```

##### 封装 Git

###### GitServer 类

```javascript
import path from "node:path";
import { execa } from "execa";
import { pathExistsSync } from "path-exists";
import fse from "fs-extra";
import { homedir } from "node:os";
import { makePassword } from "../inquirer.js";
import log from "../log.js";

const TEMP_HOME = ".cli-oweqian";
// 缓存 git token
const TEMP_TOKEN = ".git_token";
// 缓存 git 托管平台信息
const TEMP_PLATFORM = ".git_platform";
// 缓存 git 平台用户信息
const TEMP_OWN = ".git_own";
// 缓存 git 平台组织信息
const TEMP_LOGIN = ".git_login";

function createTokenPath() {
  return path.resolve(homedir(), TEMP_HOME, TEMP_TOKEN);
}

function createPlatformPath() {
  return path.resolve(homedir(), TEMP_HOME, TEMP_PLATFORM);
}

function createOwnPath() {
  return path.resolve(homedir(), TEMP_HOME, TEMP_OWN);
}

function createLoginPath() {
  return path.resolve(homedir(), TEMP_HOME, TEMP_LOGIN);
}

function getGitPlatform() {
  const platformPath = createPlatformPath();
  if (pathExistsSync(platformPath)) {
    return fse.readFileSync(platformPath).toString();
  }
  return null;
}

function getGitOwn() {
  const ownPath = createOwnPath();
  if (pathExistsSync(ownPath)) {
    return fse.readFileSync(ownPath).toString();
  }
}

function getGitLogin() {
  const loginPath = createLoginPath();
  if (pathExistsSync(loginPath)) {
    return fse.readFileSync(loginPath).toString();
  }
}

function getProjectPath(cwd, fullName) {
  const projectName = fullName.split("/")[1];
  const projectPath = path.resolve(cwd, projectName);
  return projectPath;
}

function getPackageJson(cwd, fullName) {
  const projectPath = getProjectPath(cwd, fullName);
  const pkgPath = path.resolve(projectPath, "package.json");
  if (pathExistsSync(pkgPath)) {
    return fse.readJSONSync(pkgPath);
  }
  return null;
}

/**
 * 清除缓存
 */
function clearCache() {
  const platform = createPlatformPath();
  const token = createTokenPath();
  const own = createOwnPath();
  const login = createLoginPath();
  fse.removeSync(platform);
  fse.removeSync(token);
  fse.removeSync(own);
  fse.removeSync(login);
}

/**
 * 封装 GitServer 类
 */
class GitServer {
  constructor() {}

  // 初始化
  async init() {
    // 判断 git token 是否存在
    const tokenPath = createTokenPath();
    if (pathExistsSync(tokenPath)) {
      this.token = fse.readFileSync(tokenPath).toString();
    } else {
      this.token = await this.getToken();
      fse.writeFileSync(tokenPath, this.token);
    }
    log.verbose("token", this.token);
    log.verbose("token path", pathExistsSync(tokenPath));
  }

  getToken() {
    return makePassword({
      message: "请输入 token 的信息",
    });
  }

  savePlatform(platform) {
    this.platform = platform;
    fse.writeFileSync(createPlatformPath(), platform);
  }

  saveOwn(own) {
    this.own = own;
    fse.writeFileSync(createOwnPath(), own);
  }

  saveLogin(login) {
    this.login = login;
    fse.writeFileSync(createLoginPath(), login);
  }

  getPlatform() {
    return this.platform;
  }

  getOwn() {
    return this.own;
  }

  getLogin() {
    return this.login;
  }

  // 克隆仓库
  cloneRepo(fullName, tag) {
    if (tag) {
      return execa("git", ["clone", this.getRepoUrl(fullName), "-b", tag]);
    }
    return execa("git", ["clone", this.getRepoUrl(fullName)]);
  }

  // 安装依赖
  installDependencies(cwd, fullName) {
    const projectPath = getProjectPath(cwd, fullName);
    if (pathExistsSync(projectPath)) {
      return execa(
        "npm",
        ["install", "--registry=https://registry.npmmirror.com"],
        { cwd: projectPath }
      );
    }
  }

  // 启动项目
  async runRepo(cwd, fullName) {
    const projectPath = getProjectPath(cwd, fullName);
    const pkg = getPackageJson(cwd, fullName);

    if (pkg) {
      const { scripts, bin, name } = pkg;
      // 可执行文件（：脚手架
      if (bin) {
        await execa(
          "npm",
          ["install", "-g", name, "--registry=https://registry.npmmirror.com"],
          {
            cwd: projectPath,
            stdout: "inherit",
          }
        );
      }

      // 项目
      if (scripts && scripts.dev) {
        return execa("npm", ["run", "dev"], {
          cwd: projectPath,
          stdout: "inherit",
        });
      } else if (scripts && scripts.start) {
        return execa("npm", ["run", "start"], {
          cwd: projectPath,
          stdout: "inherit",
        });
      } else {
        log.warn("未找到启动命令");
      }
    }
  }

  getUser() {
    throw new Error("gitUser must be implemented!");
  }

  getOrganization() {
    throw new Error("getOrganization must be implemented!");
  }

  createRepo() {
    throw new Error("createRepo must be implemented!");
  }
}

export { getGitPlatform, GitServer, clearCache, getGitOwn, getGitLogin };
```

###### Github

```javascript
import axios from "axios";
import { GitServer } from "./GitServer.js";
import log from "../log.js";

const BASE_URL = "https://api.github.com";

class Github extends GitServer {
  constructor() {
    super();

    this.service = axios.create({
      baseURL: BASE_URL,
      timeout: 50000,
    });

    // 请求拦截器
    this.service.interceptors.request.use(
      (config) => {
        config.headers["Authorization"] = `Bearer ${this.token}`;
        config.headers["Accept"] = "application/vnd.github+json";
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // 响应拦截器
    this.service.interceptors.response.use(
      (response) => {
        return response.data;
      },
      (error) => {
        return Promise.reject(error);
      }
    );
  }

  // 封装 get 方法
  get(url, params, headers) {
    return this.service({
      url,
      params,
      method: "get",
      headers,
    });
  }

  // 封装 post 方法
  post(url, data, headers) {
    return this.service({
      url,
      data,
      method: "post",
      headers,
    });
  }

  // 搜索仓库
  searchRepositories(params) {
    return this.get("/search/repositories", params);
  }

  // 搜索源码
  searchCode(params) {
    return this.get("/search/code", params);
  }

  // 获取 tags
  getTags(fullName, params) {
    console.log(`/repos/${fullName}/tags`);
    return this.get(`/repos/${fullName}/tags`, params);
  }

  getRepoUrl(fullName) {
    return `https://github.com/${fullName}.git`;
  }

  getUser() {
    return this.get("/user");
  }

  getOrganization() {
    return this.get("/user/orgs");
  }

  getRepo(login, repo) {
    return this.get(
      `/repos/${login}/${repo}`,
      {},
      {
        accept: "application/vnd.github+json",
      }
    ).catch((err) => {
      return null;
    });
  }

  async createRepo(name) {
    // 检查远程仓库是否存在，如果存在，则跳过创建
    const repo = await this.getRepo(this.login, name);
    if (!repo) {
      log.info("仓库不存在，开始创建");
      if (this.own === "user") {
        return this.post(
          "/user/repos",
          { name },
          {
            accept: "application/vnd.github+json",
          }
        );
      } else if (this.own === "organization") {
        return this.post(
          `/orgs/${this.login}/repos`,
          { name },
          {
            accept: "application/vnd.github+json",
          }
        );
      }
    } else {
      log.info("仓库存在，直接返回");
      return repo;
    }
  }
}

export default Github;
```

###### Gitee

```javascript
import axios from "axios";
import { GitServer } from "./GitServer.js";
import log from "../log.js";

const BASE_URL = "https://gitee.com/api/v5";

class Gitee extends GitServer {
  constructor() {
    super();

    this.service = axios.create({
      baseURL: BASE_URL,
      timeout: 50000,
    });

    // 响应拦截器
    this.service.interceptors.response.use(
      (response) => {
        return response.data;
      },
      (error) => {
        return Promise.reject(error);
      }
    );
  }

  // 封装 get 方法
  get(url, params, headers) {
    return this.service({
      url,
      params: {
        ...params,
        access_token: this.token,
      },
      method: "get",
      headers,
    });
  }

  // 封装 post 方法
  post(url, data, headers) {
    return this.service({
      url,
      data: {
        ...data,
        access_token: this.token,
      },
      method: "post",
      headers,
    });
  }

  // 搜索仓库
  searchRepositories(params) {
    return this.get("/search/repositories", params);
  }

  // 获取 tags
  getTags(fullName) {
    return this.get(`/repos/${fullName}/tags`);
  }

  getRepoUrl(fullName) {
    return `https://gitee.com/${fullName}.git`;
  }

  getUser() {
    return this.get("/user");
  }

  getOrganization() {
    return this.get("/user/orgs");
  }

  getRepo(owner, repo) {
    return this.get(`/repos/${owner}/${repo}`).catch((err) => {
      return null;
    });
  }

  async createRepo(name) {
    // 检查远程仓库是否存在，如果存在，则跳过创建
    const repo = await this.getRepo(this.login, name);
    if (!repo) {
      log.info("仓库不存在，开始创建");
      if (this.own === "user") {
        return this.post("/user/repos", { name });
      } else if (this.own === "organization") {
        return this.post(`/orgs/${this.login}/repos`, { name });
      }
    } else {
      log.info("仓库存在，直接返回");
      return repo;
    }
  }
}

export default Gitee;
```

###### Git Utils

```javascript
import { getGitPlatform, getGitLogin, getGitOwn } from "./GitServer.js";
import { makeList } from "../inquirer.js";
import log from "../log.js";
import Gitee from "./Gitee.js";
import Github from "./Github.js";

/**
 * 实例化 GitServer 对象、git 托管平台、git token
 */
export async function initGitServer() {
  let platform = getGitPlatform();
  if (!platform) {
    platform = await makeList({
      message: "请选择 Git 平台",
      choices: [
        {
          name: "Github",
          value: "github",
        },
        {
          name: "Gitee",
          value: "gitee",
        },
      ],
    });
  }
  log.verbose("platform", platform);

  let gitAPI;
  if (platform === "github") {
    gitAPI = new Github();
  } else {
    gitAPI = new Gitee();
  }
  gitAPI.savePlatform(platform);
  await gitAPI.init();
  return gitAPI;
}

/**
 * git 平台用户信息、git 平台组织信息
 */
export async function initGitType(gitAPI) {
  // 用户信息
  let gitOwn = getGitOwn();
  // 组织信息
  let gitLogin = getGitLogin();

  if (!gitLogin && !gitOwn) {
    const user = await gitAPI.getUser();
    const organization = await gitAPI.getOrganization();
    log.verbose("user", user);
    log.verbose("organization", organization);

    // 选择仓库类型
    if (!gitOwn) {
      gitOwn = await makeList({
        message: "请选择仓库类型",
        choices: [
          {
            name: "User",
            value: "user",
          },
          {
            name: "Organization",
            value: "organization",
          },
        ],
      });
      log.verbose("gitOwn", gitOwn);
    }

    if (gitOwn === "user") {
      gitLogin = user?.login;
    } else {
      const organizationList = organization.map((item) => ({
        name: item.name || item.login,
        value: item.login,
      }));
      gitLogin = await makeList({
        message: "请选择组织",
        choices: organizationList,
      });
    }
    log.verbose("gitLogin", gitLogin);
  }

  if (!gitLogin || !gitOwn) {
    throw new Error(
      '未获取到用户的 Git 登录信息！请使用 "cli-oweqian commit --clear" 清除缓存后重试'
    );
  }

  gitAPI.saveOwn(gitOwn);
  gitAPI.saveLogin(gitLogin);
  return gitLogin;
}

export async function createRemotoRepo(gitAPI, name) {
  const ret = await gitAPI.createRepo(name);
}
```

#### packages/command

##### 调整 package.json

```
{
  "name": "@oweqian/command",
  "version": "0.0.0",
  "description": "common command class",
  "main": "lib/index.js",
  // ...
  "type": "module"
}
```

##### 封装 Command 类 ⭐️

基于 [Commander.js](https://github.com/tj/commander.js/blob/HEAD/Readme_zh-CN.md) 进行二次封装，提供了一种模板化的方法来处理命令创建和执行。具体的命令需要通过继承 Command 类并实现所需的 getter 和方法来完成，这样做的好处是代码复用和结构清晰，减少了重复的命令设置代码。

```javascript
/**
 * 封装 Command 类
 */
class Command {
  constructor(instance) {
    // 命令行程序的实例
    if (!instance) {
      throw new Error("command instance must not be null!");
    }

    this.program = instance;

    const cmd = this.program.command(this.command);
    cmd.description(this.description);

    cmd.hook("preAction", () => {
      this.preAction();
    });

    cmd.hook("postAction", () => {
      this.postAction();
    });

    if (this.options?.length > 0) {
      this.options.forEach((option) => {
        cmd.option(...option);
      });
    }

    cmd.action((...params) => {
      this.action(params);
    });
  }

  // 命令的名称
  get command() {
    throw new Error("command must be implements");
  }

  // 命令的描述信息
  get description() {
    throw new Error("description must be implements");
  }

  // 命令的选项
  get options() {
    return [];
  }

  // 命令执行时的动作
  action() {
    throw new Error("action must be implements");
  }

  // 命令执行前的钩子
  preAction() {
    // empty
  }

  // 命令执行后的钩子
  postAction() {
    // empty
  }
}

export default Command;
```

#### packages/cli

##### 调整 package.json

```
{
  "name": "@oweqian/cli",
  "version": "0.0.0",
  "description": "oweqian cli",
  // ...
  "main": "lib/index.js",
  "bin": {
    "cli-oweqian": "bin/cli.js"
  },
  "directories": {
    "lib": "lib",
    "test": "__tests__"
  },
  "files": [
    "lib",
    "bin"
  ],
  "scripts": {
    "test": "jest"
  },
  "dependencies": {
    "@oweqian/commit": "^0.0.0",
    "@oweqian/init": "^0.0.0",
    "@oweqian/install": "^0.0.0",
    "@oweqian/lint": "^0.0.0",
    "@oweqian/utils": "^0.0.0",
    "chalk": "^5.1.0",
    "commander": "^9.4.1",
    "dirname-filename-esm": "^1.1.1",
    "fs-extra": "^10.1.0",
    "import-local": "^3.1.0",
    "semver": "^7.3.8"
  },
  "devDependencies": {
    "@babel/core": "^7.19.3",
    "@babel/preset-env": "^7.19.4",
    "execa": "^6.1.0",
    "jest": "^29.1.2"
  },
  "type": "module"
}
```

##### 可执行文件

```javascript
#!/usr/bin/env node

import importLocal from "import-local";
import { filename } from "dirname-filename-esm";
import { log } from "@oweqian/utils";
import entry from "../lib/index.js";

const __filename = filename(import.meta);

// 优先加载本地脚手架版本
if (importLocal(__filename)) {
  log.info("cli", "使用本次 cli-oweqian 版本");
} else {
  entry(process.argv.slice(2));
}
```

##### 入口文件

```javascript
import createInitCommand from "@oweqian/init";
import createInstallCommand from "@oweqian/install";
import createLintCommand from "@oweqian/lint";
import createCommitCommand from "@oweqian/commit";
import createCLI from "./createCLI.js";
import "./exception.js";

export default function (args) {
  const program = createCLI();
  // 项目创建工具
  createInitCommand(program);
  // 源码下载工具
  createInstallCommand(program);
  // 代码规范检查工具
  createLintCommand(program);
  // 代码提交工具
  createCommitCommand(program);
  program.parse(process.argv);
}
```

##### 捕获异常日志

```javascript
import { printErrorLog } from "@oweqian/utils";

// 处理未捕获的异常
process.on("uncaughtException", (e) => printErrorLog(e, "error"));

// 处理未处理的 Promise Reject
process.on("unhandledRejection", (e) => printErrorLog(e, "promise"));
```

##### 命令行基础结构

```javascript
import path from "node:path";
import { program } from "commander";
import { dirname } from "dirname-filename-esm";
import semver from "semver";
import chalk from "chalk";
import fse from "fs-extra";
import { log } from "@oweqian/utils";

// 获取当前模块的目录路径
const __dirname = dirname(import.meta);
// 获取 package.json 文件路径
const pkgPath = path.resolve(__dirname, "../package.json");
// 读取 package.json 文件
const pkg = fse.readJSONSync(pkgPath);

// 定义最低 Node.js 版本
const LOWEST_NODE_VERSION = "14.0.0";

// 检查 Node.js 版本
function checkNodeVersion() {
  // 使用 semver 检查当前运行的 Node.js 版本是否满足最低要求
  if (!semver.gte(process.version, LOWEST_NODE_VERSION)) {
    throw new Error(
      chalk.red(
        `cli-oweqian 需要安装 ${LOWEST_NODE_VERSION} 以上版本的 Node.js`
      )
    );
  }
}

function preAction() {
  // 检查Node版本
  checkNodeVersion();
}

function createCLI() {
  log.info("version", pkg.version);

  program
    .name(Object.keys(pkg.bin)[0])
    .usage("<command> [options]")
    .version(pkg.version)
    .option("-d, --debug", "是否开启调试模式", false)
    .hook("preAction", preAction);

  // 处理 debug 选项
  program.on("option:debug", function () {
    if (program.opts().debug) {
      log.verbose("debug", "launch debug mode!");
    }
  });

  // 处理未知命令
  program.on("command:*", function (obj) {
    log.error("未知的命令：" + obj[0]);
  });

  return program;
}

export default createCLI;
```

### 项目创建工具

🤔 为什么要开发创建项目的脚手架工具？

🤔 为什么不直接使用 vue-cli 或 create-react-app？

项目在迭代过程中会添加很多 ”本土化“ 元素，如：H5 兼容、接口请求、埋点上报、组件封装、常用工具函数封装等，甚至会对整块业务逻辑进行复用，如登录、退出等；

如果通过 vue-cli 或 create-react-app 这些通用脚手架，每次在创建项目时都要重新编写或复制这些代码是非常耗时的，而且无法对每个团队成员进行约束，统一项目规范。利用脚手架可以来完成项目模板的沉淀和标准化建设。

#### 准备工作

开发常见项目的脚手架工具前，我们先做一些前期准备工作。

##### 模板配置化

随着项目沉淀，我们会有很多项目模版，如果把这些项目模版写死在脚手架中，就无法进行灵活扩展。为此，我们通过脚手架 + Egg + MongoDB 实现一套可灵活配置和扩展的项目模板管理机制，灵活、快速的实现项目模版的增删改查、分类等功能，解决项目模版无法扩展的问题。

###### 项目模版制作

我们分别用 vue-cli、 create-react-app、vue-element-admin 准备三个项目做项目模版，然后分别发布到 npm 上。

- @oweqian/template-vue3

[npm 地址](https://www.npmjs.com/package/@oweqian/template-vue3)  
[项目地址](https://github.com/OweQian/template-vue3)

- @oweqian/template-react18

[npm 地址](https://www.npmjs.com/package/@oweqian/template-react18)  
[项目地址](https://github.com/OweQian/template-react18)

- @oweqian/template-vue-element-admin

[npm 地址](https://www.npmjs.com/package/@oweqian/template-vue-element-admin)  
[项目地址](https://github.com/OweQian/template-vue-element-admin)

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/cli/img_06.png" alt="" width="100%" />

🤔 为什么使用 npm 管理项目模板？

优势：

- 省去自己搭建静态资源服务器的成本
- npm 包含了 package 的版本管理机制
- npm 提供了可以根据 package 名称查询下载地址的 api
- npm 对所有上传的 package 进行 cdn 加速

(p≧w≦q) 嘻嘻嘻，狠狠地夸就完了~~~~

###### Egg + MongoDB

我们将通过企业级框架 Egg.js 实现后端服务搭建，并通过 Restful API 实现接口开发。然后在本地搭建 MongoDB 数据库，并导入项目模板数据。

项目地址：[cli-oweqian-server](https://github.com/OweQian/cli-oweqian-server)

- 定义路由：

```
router.resources("/v1/project", controller.v1.project);
```

- 定义 GET 方法：

```javascript
const Controller = require("egg").Controller;

class ProjectController extends Controller {
  // 项目模版查询
  async index() {
    const { ctx } = this;
    const res = await ctx.model.Project.find({});
    ctx.body = res;
  }
  // 项目模版查询
  async show() {
    const { ctx } = this;
    const { id } = ctx.params;
    const res = await ctx.model.Project.find({ value: id });
    if (res.length > 0) {
      ctx.body = res[0];
    } else {
      ctx.body = res;
    }
  }
}
module.exports = ProjectController;
```

- 配置插件信息：

```javascript
// plugin.js
/** @type Egg.EggPlugin */
exports.mongoose = {
  enable: true,
  package: "egg-mongoose",
};
```

- 更新配置信息：

```javascript
// config.default.js
config.mongoose = {
  url: "mongodb://oweqian:123456@127.0.0.1:27017/cli-oweqian",
};
```

- 创建 model 信息：

```javascript
module.exports = (app) => {
  const mongoose = app.mongoose;
  const Schema = mongoose.Schema;
  const ProjectSchema = new Schema({
    name: { type: String },
    value: { type: String },
    npmName: { type: String },
    version: { type: String },
  });
  return mongoose.model("Project", ProjectSchema);
};
```

> 默认情况下，会在 collections 后面加 s，如：project，实际查询的是 projects。

- 查询 model 信息：

```
const { ctx } = this;
    const res = await ctx.model.Project.find({});
    ctx.body = res;
```

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/cli/img_07.png" alt="" width="100%" />

##### 渲染动态化

上一节我们通过 Egg + MongoDB 存储的方式实现了模板配置化，即通过数据库配置的方式实现模板的修改，而不需要改动脚手架代码。

目前我们的模板都是静态的，即创建时什么样，创建后还是什么样，其中的内容无法进行动态渲染。这是不符合更复杂的需求的，比如 vue 的项目模板就大量使用了 ejs 进行模板的动态渲染。

🤔 如何实现模板渲染动态化？

通过 ejs 改良项目模板，生成动态模板

- 设计 @cli-oweqian/init 的插件机制
- 实现一个 init 插件，在插件中实现 ejs 模板渲染逻辑

改造 @oweqian/template-vue3 模板并发布到 npm：

```javascript
// plugins/index.js
export default async function (api) {
  const mode = await api.makeList({
    choices: [
      {
        name: "API",
        value: "api",
      },
      {
        name: "默认",
        value: "default",
      },
    ],
    message: "请选择代码模式",
  });
  console.log(mode);
  return {
    mode,
  };
}
```

```
// template/package.json
{
  "name": "<%= data.name %>",
  // ...
}
```

#### 调整 package.json

```
{
  "name": "@oweqian/init",
  "version": "0.0.0",
  "description": "init command",
  // ...
  "main": "lib/index.js",
  "directories": {
    "lib": "lib",
    "test": "__tests__"
  },
  "files": [
    "lib"
  ],
  // ...
  "dependencies": {
    "@oweqian/command": "^0.0.0",
    "@oweqian/utils": "^0.0.0",
    "ejs": "^3.1.8",
    "execa": "^6.1.0",
    "fs-extra": "^10.1.0",
    "glob": "^8.0.3",
    "ora": "^6.1.2",
    "path-exists": "^5.0.0"
  },
  "type": "module"
}
```

#### 入口文件

```javascript
import Command from "@oweqian/command";
import { log } from "@oweqian/utils";
import createTemplate from "./createTemplate.js";
import downloadTemplate from "./downloadTemplate.js";
import installTemplate from "./installTemplate.js";

/**
 * 继承 Command 类
 * examples:
 * cli-oweqian init
 * cli-oweqian init aa -t project -tp template-react18 --force --debug
 */
class InitCommand extends Command {
  get command() {
    return "init [name]";
  }

  get description() {
    return "init project";
  }

  get options() {
    return [
      ["-f, --force", "是否强制更新", false],
      ["-t, --type <type>", "创建类型（值：project/page）"],
      ["-tp, --template <template>", "模板名称"],
    ];
  }

  async action([name, opts]) {
    log.verbose("init", name, opts);
    /**
     * 1.选择项目模板，生成项目信息
     */
    const selectedTemplate = await createTemplate(name, opts);
    log.verbose("selectedTemplate", selectedTemplate);
    /**
     * 2.下载项目模板至缓存目录
     */
    await downloadTemplate(selectedTemplate);
    /**
     * 3.安装项目模板至项目目录
     */
    await installTemplate(selectedTemplate, opts);
  }

  preAction() {
    console.log("pre");
  }

  postAction() {
    console.log("post");
  }
}

function Init(instance) {
  return new InitCommand(instance);
}

export default Init;
```

#### 选择项目模板

提供创建项目的基本信息选择：

- 创建类型：决定创建的是项目还是页面
- 项目名称：决定文件夹名称
- 项目模板：决定项目类型

```javascript
// ./createTemplate.js
import path from "node:path";
import { homedir } from "node:os";
import {
  makeList,
  log,
  makeInput,
  getLatestVersion,
  request,
  printErrorLog,
} from "@oweqian/utils";

const ADD_TYPE_PROJECT = "project";
const ADD_TYPE_PAGE = "page";
const ADD_TYPE = [
  {
    name: "项目",
    value: ADD_TYPE_PROJECT,
  },
  {
    name: "页面",
    value: ADD_TYPE_PAGE,
  },
];

const TEMP_HOME = ".cli-oweqian";

/**
 * 选择创建类型
 * 决定创建的是项目或者页面
 */
function getAddType() {
  return makeList({
    choices: ADD_TYPE,
    message: "请选择初始化类型",
    defaultValue: ADD_TYPE_PROJECT,
  });
}

/**
 * 输入项目名称
 */
function getAddName() {
  return makeInput({
    message: "请输入项目名称",
    defaultValue: "",
    validate: (v) => {
      if (v.length > 0) {
        return true;
      }
      return "项目名称必须输入";
    },
  });
}

/**
 * 选择项目模板
 */
function getAddTemplate(choices) {
  return makeList({
    choices,
    message: "请选择项目模板",
  });
}

/**
 * 选择所在团队
 * 不同的团队有不同的项目模板
 */
function getAddTeam(team) {
  return makeList({
    choices: team.map((item) => ({ name: item, value: item })),
    message: "请选择团队",
  });
}

/**
 * 模板缓存目录
 * os.homedir(): 返回当前用户的主目录的字符串路径
 */
function makeTargetPath() {
  return path.resolve(`${homedir()}/${TEMP_HOME}`, "addTemplate");
}

/**
 * 通过API获取项目模板
 */
async function getTemplateFromAPI() {
  try {
    const data = await request({
      url: "/v1/project",
      method: "get",
    });
    log.verbose("template", data);
    return data;
  } catch (e) {
    printErrorLog(e);
    return null;
  }
}

async function createTemplate(name, opts) {
  // 通过API获取项目模板
  const ADD_TEMPLATE = await getTemplateFromAPI();
  if (!ADD_TEMPLATE) {
    throw new Error("项目模板不存在");
  }

  /**
   * name：项目名称
   * type：创建类型（值：project/page）
   * template：模板名称
   */
  const { type = null, template = null } = opts;

  // 项目名称
  let addName;
  // 选择的创建类型
  let addType;
  // 选择的模板信息
  let selectedTemplate;

  // 兼容交互式（Options）和非交互式项目创建逻辑
  if (type) {
    addType = type;
  } else {
    addType = await getAddType();
  }
  log.verbose("addType", addType);

  if (addType === ADD_TYPE_PROJECT) {
    if (name) {
      addName = name;
    } else {
      addName = await getAddName();
    }
    log.verbose("addName", addName);

    if (template) {
      selectedTemplate = ADD_TEMPLATE.find((tp) => tp.value === template);
      if (!selectedTemplate) {
        throw new Error(`项目模板 ${template} 不存在`);
      }
    } else {
      // 获取团队信息
      let teamList = ADD_TEMPLATE.map((_) => _.team);
      teamList = [...new Set(teamList)];

      const addTeam = await getAddTeam(teamList);
      log.verbose("addTeam", addTeam);

      // 根据选择的团队信息过滤模板
      let addTemplate = await getAddTemplate(
        ADD_TEMPLATE.filter((_) => _.team === addTeam)
      );
      log.verbose("addTemplate", addTemplate);

      selectedTemplate = ADD_TEMPLATE.find((_) => _.value === addTemplate);
    }
    log.verbose("selectedTemplate", selectedTemplate);

    // 通过 package 名称从 npm 获取最新版本号
    const latestVersion = await getLatestVersion(selectedTemplate.npmName);
    log.verbose("latestVersion", latestVersion);
    selectedTemplate.version = latestVersion;

    // 模板缓存目录
    const targetPath = makeTargetPath();

    return {
      type: addType,
      name: addName,
      template: selectedTemplate,
      targetPath,
    };
  } else {
    throw new Error(`类型 ${addType} 不支持`);
  }
}

export default createTemplate;
```

#### 下载项目模板

根据上一步选择的项目模板：

- 生成缓存目录
- 利用 npm api 接口获取下载路径
- 下载模板至缓存目录

```javascript
// ./downloadTemplate.js
import path from "node:path";
import fse from "fs-extra";
import ora from "ora";
import { execa } from "execa";
import { pathExistsSync } from "path-exists";
import { log, printErrorLog } from "@oweqian/utils";

/**
 * 🐞 下载的文件夹下需要安装node_modules目录，否则直接使用 npm install 无法下载成功
 */
function getCacheDir(targetPath) {
  return path.resolve(targetPath, "node_modules");
}

function makeCacheDir(targetPath) {
  const cacheDir = getCacheDir(targetPath);
  // 判断文件夹是否存在
  if (!pathExistsSync(cacheDir)) {
    // 创建文件夹
    fse.mkdirpSync(cacheDir);
  }
}

async function downloadAddTemplate(targetPath, selectedTemplate) {
  const { npmName, version } = selectedTemplate;
  const installCommand = "npm";
  const installArgs = ["install", `${npmName}@${version}`];
  const cwd = targetPath;
  log.verbose("installArgs", installArgs);
  log.verbose("cwd", cwd);
  await execa(installCommand, installArgs, { cwd });
}

async function downloadTemplate(selectedTemplate) {
  const { targetPath, template } = selectedTemplate;
  makeCacheDir(targetPath);

  // 下载进度显示
  const spinner = ora("正在下载模板...").start();

  try {
    // 下载模板至缓存目录
    await downloadAddTemplate(targetPath, template);
    log.success("下载模板成功");
  } catch (e) {
    printErrorLog(e);
  } finally {
    spinner.stop();
  }
}

export default downloadTemplate;
```

#### 安装项目模板

下载模板到指定的缓存目录后：

- 从缓存目录拷贝模板文件到项目目录下
- 忽略特定目录或文件
- 根据 --force option 强制安装

```javascript
// ./installTemplate.js
import path from "node:path";
import fse from "fs-extra";
import ora from "ora";
import ejs from "ejs";
import glob from "glob";
import { pathExistsSync } from "path-exists";
import { log, makeInput, makeList } from "@oweqian/utils";

function getCacheFilePath(targetPath, template) {
  return path.resolve(targetPath, "node_modules", template.npmName, "template");
}

function copyFile(targetPath, template, installDir) {
  // 从缓存目录找模板
  const originFile = getCacheFilePath(targetPath, template);
  // 读取 template 文件夹
  const fileList = fse.readdirSync(originFile);
  const spinner = ora("正在拷贝模板文件...").start();
  fileList.map((file) => {
    // 拷贝文件
    fse.copySync(`${originFile}/${file}`, `${installDir}/${file}`);
  });
  spinner.stop();
  log.success("模板拷贝成功");
}

function getPluginFilePath(targetPath, template) {
  return path.resolve(
    targetPath,
    "node_modules",
    template.npmName,
    "plugins",
    "index.js"
  );
}

async function ejsRender(targetPath, installDir, template, name) {
  // 忽略特定目录或文件
  const { ignore = [] } = template;

  let data;

  // 获取插件
  const pluginPath = getPluginFilePath(targetPath, template);
  if (pathExistsSync(pluginPath)) {
    // 动态加载
    const pluginFn = (await import(pluginPath)).default;
    // 执行插件
    data = await pluginFn({ makeList, makeInput });
  }

  const ejsData = {
    data: {
      name,
      ...data,
    },
  };

  // glob 匹配文件路径
  glob(
    "**",
    {
      cwd: installDir,
      nodir: true,
      // 忽略特定目录或文件
      ignore: [...ignore, "**/node_modules/**"],
    },
    (err, files) => {
      files.forEach((file) => {
        const filePath = path.join(installDir, file);
        log.verbose("filePath", filePath);
        // ejs 模板渲染
        ejs.renderFile(filePath, ejsData, (err, result) => {
          if (!err) {
            // result：渲染后的 html 字符串
            // 把渲染后的内容写回文件
            fse.writeFileSync(filePath, result);
          } else {
            log.error(err);
          }
        });
      });
    }
  );
}

async function installTemplate(selectedTemplate, opts) {
  // force: 是否强制安装
  const { force = false } = opts;
  const { targetPath, name, template } = selectedTemplate;

  // process.cwd()：返回 Node.js 进程的当前工作目录
  const rootDir = process.cwd();
  fse.ensureDirSync(targetPath);
  // 项目目录
  const installDir = path.resolve(`${rootDir}/${name}`);

  if (pathExistsSync(installDir)) {
    if (!force) {
      log.error(`当前目录下已存在 ${installDir} 文件夹`);
      return;
    } else {
      // 删除项目目录
      fse.removeSync(installDir);
      // 重新创建项目目录
      fse.ensureDirSync(installDir);
    }
  } else {
    // 创建项目目录
    fse.ensureDirSync(installDir);
  }

  // 拷贝模板文件
  copyFile(targetPath, template, installDir);

  // 模板动态渲染
  await ejsRender(targetPath, installDir, template, name);
}

export default installTemplate;
```

#### 工具演示

🌰：command help

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/cli/img_08.png" alt="" width="100%" />

🌰：react18

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/cli/img_09.png" alt="" width="100%" />

🌰：vue3

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/cli/img_10.png" alt="" width="100%" />

🌰：vue-element-admin

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/cli/img_11.png" alt="" width="100%" />

### 源码下载工具

🤔 为什么要开发源码下载工具？

- npm 只能下载 npm registry 中的包，而对于未上传 npm 的包无法下载
- 对于托管到 github 或 gitee 的项目或包，如果手动下载效率低下，可以通过开发源码下载工具来提升效率。

🤔 如何实现源码下载工具？

- 掌握 github API 和 gitee API 的使用方法
- 存储 github 或 gitee 的 token，具备 github API 或 gitee API 的调用条件
- 通过 github 和 gitee 实现根据仓库名称搜索项目，选取指定版本（支持翻页）
- 将指定版本的源码拉取到本地，在本地安装依赖，安装可执行文件，启动项目

#### 调整 package.json

```
{
  "name": "@oweqian/install",
  "version": "0.0.0",
  "description": "install command",
  // ...
  "main": "lib/index.js",
  // ...
  "type": "module",
  "dependencies": {
    "@oweqian/utils": "^0.0.0",
    "@oweqian/command": "^0.0.0",
    "ora": "^6.1.2"
  }
}
```

#### 入口文件

```javascript
import ora from "ora";
import Command from "@oweqian/command";
import {
  log,
  makeList,
  makeInput,
  initGitServer,
  printErrorLog,
  clearCache,
} from "@oweqian/utils";

// 上一页
const PREV_PAGE = "${prev_page}";
// 下一页
const NEXT_PAGE = "${next_page}";
// 搜索仓库
const SEARCH_MODE_REPO = "search_repo";
// 搜索源码
const SEARCH_MODE_CODE = "search_code";

class InstallCommand extends Command {
  get command() {
    return "install";
  }

  get description() {
    return "install project";
  }

  get options() {
    return [["-c, --clear", "清空缓存", false]];
  }

  async action([{ clear }]) {
    if (clear) {
      clearCache();
    }
    await this.generateGitAPI();
    await this.searchGitAPI();
    await this.selectTags();
    log.verbose("full_name", this.keyword);
    log.verbose("selected_tag", this.selectedTag);
    await this.downloadRepo();
    await this.installDependencies();
    await this.runRepo();
  }

  async generateGitAPI() {
    // 初始化 gitAPI、platform、token
    this.gitAPI = await initGitServer();
  }

  async doSearch() {
    const platform = this.gitAPI.getPlatform();

    // 搜索结果
    let searchResult;
    // 总条数
    let count = 0;
    // 组装 choices
    let list = [];

    if (platform === "github") {
      // 2、生成搜索参数
      // github
      const params = {
        q: `${this.q}${this.language ? `+language:${this.language}` : ""}`,
        order: "desc",
        // sort: "stars",
        per_page: this.perPage,
        page: this.page,
      };
      log.verbose("search params", params);

      if (this.mode === SEARCH_MODE_REPO) {
        searchResult = await this.gitAPI.searchRepositories({
          ...params,
        });

        list = searchResult.items.map((item) => ({
          name: `${item.full_name}${item.description}`,
          value: item.full_name,
        }));
      } else {
        searchResult = await this.gitAPI.searchCode({
          ...params,
        });
        list = searchResult.items.map((item) => ({
          name: `${item.repository.full_name}${
            item.repository && item.repository.description
          }`,
          value: item.repository.full_name,
        }));
      }

      count = searchResult.total_count; // 整体数据量
    } else {
      // 2、生成搜索参数
      // gitee
      const params = {
        q: this.q,
        order: "desc",
        // sort: "stars_count",
        per_page: this.perPage,
        page: this.page,
      };
      log.verbose("search params", params);

      if (this.language) {
        params.language = this.language;
      }

      searchResult = await this.gitAPI.searchRepositories({
        ...params,
      });
      count = 999;
      list = searchResult.map((item) => ({
        name: `${item.full_name}${item.description}`,
        value: item.full_name,
      }));
    }

    /**
     * 判断当前页面是否已经到达最大页面
     * 组装 choices 的上一页 / 下一页
     */
    if (
      (platform === "github" && this.page * this.perPage < count) ||
      list.length > 0
    ) {
      list.push({
        name: "下一页",
        value: NEXT_PAGE,
      });
    }

    if (this.page > 1) {
      list.unshift({
        name: "上一页",
        value: PREV_PAGE,
      });
    }

    if (count > 0) {
      const keyword = await makeList({
        message:
          platform === "github"
            ? `请选择要下载的项目（共${count}条数据）`
            : "请选择要下载的项目",
        choices: list,
      });

      if (keyword === NEXT_PAGE) {
        await this.nextPage();
      } else if (keyword === PREV_PAGE) {
        await this.prevPage();
      } else {
        // 下载项目
        this.keyword = keyword;
      }
    }
  }

  async nextPage() {
    this.page++;
    await this.doSearch();
  }

  async prevPage() {
    this.page--;
    await this.doSearch();
  }

  async searchGitAPI() {
    // 1、收集搜索关键词和开发语言
    const platform = this.gitAPI.getPlatform();

    if (platform === "github") {
      // github 支持仓库、源码两种搜索方式
      this.mode = await makeList({
        message: "请选择搜索模式",
        choices: [
          {
            name: "仓库",
            value: SEARCH_MODE_REPO,
          },
          {
            name: "源码",
            value: SEARCH_MODE_CODE,
          },
        ],
      });
    } else {
      // gitee 只支持仓库搜索方式
      this.mode = SEARCH_MODE_REPO;
    }

    // 搜索关键字
    this.q = await makeInput({
      message: "请输入搜索关键词",
      validate(value) {
        if (value.length > 0) {
          return true;
        } else {
          return "请输入搜索关键词";
        }
      },
    });

    // 开发语言
    this.language = await makeInput({
      message: "请输入开发语言",
    });
    log.verbose("search keyword", this.q, this.language, platform);

    this.page = 1;
    this.perPage = 10;
    await this.doSearch();
  }

  async doSelectTags() {
    const platform = this.gitAPI.getPlatform();

    // 根据 keyword 获取 tags
    let tagsListChoices = [];

    if (platform === "github") {
      const params = {
        page: this.tagPage,
        per_page: this.tagPerPage,
      };
      const tagsList = await this.gitAPI.getTags(this.keyword, { ...params });

      tagsListChoices = tagsList.map((item) => ({
        name: item.name,
        value: item.name,
      }));

      if (tagsListChoices.length > 0) {
        tagsListChoices.push({
          name: "下一页",
          value: NEXT_PAGE,
        });
      }

      if (this.tagPage > 1) {
        tagsListChoices.unshift({
          name: "上一页",
          value: PREV_PAGE,
        });
      }
    } else {
      const tagList = await this.gitAPI.getTags(this.keyword);

      tagsListChoices = tagsList.map((item) => ({
        name: item.name,
        value: item.name,
      }));
    }

    const selectedTag = await makeList({
      message: "请选择tag",
      choices: tagsListChoices,
    });

    if (selectedTag === NEXT_PAGE) {
      await this.nextTags();
    } else if (selectedTag === PREV_PAGE) {
      await this.prevTags();
    } else {
      this.selectedTag = selectedTag;
    }
  }

  async nextTags() {
    this.tagPage++;
    await this.doSelectTags();
  }

  async prevTags() {
    this.tagPage--;
    await this.doSelectTags();
  }

  async selectTags() {
    this.tagPage = 1;
    this.tagPerPage = 10;
    await this.doSelectTags();
  }

  async downloadRepo() {
    // 根据 keyword 和 selectedTag 下载仓库
    const spinner = ora(
      `正在下载: ${this.keyword}${this.selectedTag}...`
    ).start();

    try {
      await this.gitAPI.cloneRepo(this.keyword, this.selectedTag);
      log.success(`下载成功: ${this.keyword}(${this.selectedTag})`);
    } catch (e) {
      printErrorLog(e);
    } finally {
      spinner.stop();
    }
  }

  async installDependencies() {
    const spinner = ora(
      `正在安装依赖: ${this.keyword}${this.selectedTag}...`
    ).start();

    try {
      let ret = await this.gitAPI.installDependencies(
        process.cwd(),
        this.keyword
      );
      if (!ret) {
        log.error(`依赖安装失败: ${this.keyword}(${this.selectedTag})`);
      } else {
        log.success(`依赖安装成功: ${this.keyword}(${this.selectedTag})`);
      }
    } catch (e) {
      printErrorLog(e);
    } finally {
      spinner.stop();
    }
  }

  async runRepo() {
    await this.gitAPI.runRepo(process.cwd(), this.keyword);
  }
}

function Install(instance) {
  return new InstallCommand(instance);
}

export default Install;
```

#### 工具演示

🌰：command help

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/cli/img_12.png" alt="" width="100%" />

🌰：Github - react-material-admin

源码下载：

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/cli/img_13.png" alt="" width="100%" />
 
项目运行：

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/cli/img_14.png" alt="" width="100%" />

运行结果：

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/cli/img_15.png" alt="" width="100%" />

### 代码检查工具

🤔 为什么要实现代码检查工具？

- 不同的项目维护不同的 lint 规范，开发代码检查工具对团队代码规范进行统一管控

- 在提交代码前对项目进行集中管控，对不符合规范的项目进行拦截

- 实现自动化测试的自动识别和执行，避免手动执行

🤔 如何实现代码检查工具？

- eslint 配置 + API 调用
- jest 和 mocha 自动化测试

#### 准备工作

以 vue 类型的项目为例，新建 eslint-test 项目，执行 npm init 初始化项目。

紧接着，我们在项目里新建一些目录和文件，编写一些关于 javascript、vue 组件、jest、mocha 的代码：

[项目地址](https://github.com/OweQian/eslint-test)

```
eslint-test
├── __test__
|    ├── index.js
|    ├── mocha_test.js
├── src
|    ├── views
|    |    ├── components
|    |    |    ├── index.js
|    |    |    ├── index.vue
|    ├── index.js
|    ├── index2.js
|    ├── sum.js
├── .gitignore
├── package-lock.json
├── package.json
```

#### 调整 package.json

```
{
  "name": "@oweqian/lint",
  "version": "0.0.0",
  "description": "lint command",
  // ...
  "main": "lib/index.js",
  // ...
  "type": "module",
  "dependencies": {
    "@oweqian/command": "^0.0.0",
    "@oweqian/utils": "^0.0.0",
    "eslint": "^8.28.0",
    "execa": "^6.1.0",
    "fs-extra": "^10.1.0",
    "jest": "^29.3.1",
    "mocha": "^10.1.0",
    "ora": "^6.1.2",
    "path-exists": "^5.0.0"
  }
}
```

#### 入口文件

```javascript
import path from "node:path";
import { ESLint } from "eslint";
import { execa } from "execa";
import ora from "ora";
import jest from "jest";
import Mocha from "mocha";
import { pathExistsSync } from "path-exists";
import fse from "fs-extra";
import Command from "@oweqian/command";
import { log, printErrorLog, makeList } from "@oweqian/utils";
import vueConfig from "./eslint/vueConfig.js";

const TEMP_HOME = ".cli-oweqian";

class LintCommand extends Command {
  get command() {
    return "lint";
  }

  get description() {
    return "lint project";
  }

  get options() {}

  extractESLint(resultText, type) {
    const problems = /([0-9]+) problems/;
    const warnings = /([0-9]+) warnings/;
    const errors = /([0-9]+) errors/;
    switch (type) {
      case "problems":
        return resultText.match(problems)[0].match(/[0-9]+/)[0];
      case "errors":
        return resultText.match(errors)[0].match(/[0-9]+/)[0];
      case "warnings":
        return resultText.match(warnings)[0].match(/[0-9]+/)[0];
      default:
        return null;
    }
  }

  parseESLintResult(resultText) {
    // eslint 检查结果分类
    const problems = this.extractESLint(resultText, "problems");
    const errors = this.extractESLint(resultText, "errors");
    const warnings = this.extractESLint(resultText, "warnings");
    return {
      problems: +problems || 0,
      errors: +errors || 0,
      warnings: +warnings || 0,
    };
  }

  async eslint() {
    const cwd = process.cwd();
    // 1、eslint
    // 准备工作，安装依赖
    const spinner = ora("正在安装依赖...").start();

    try {
      // 安装 eslint-plugin-vue@9.8.0
      await execa("npm", ["install", "-D", "eslint-plugin-vue@9.8.0"], {
        cwd,
        stdout: "inherit",
      });
      // 安装 eslint-config-airbnb-base@15.0.0
      await execa(
        "npm",
        ["install", "-D", "eslint-config-airbnb-base@15.0.0"],
        {
          cwd,
          stdout: "inherit",
        }
      );
    } catch (e) {
      printErrorLog(e);
    } finally {
      spinner.stop();
    }

    log.info("正在执行 eslint 检查");

    // 执行工作，eslint
    const eslint = new ESLint({ cwd, overrideConfig: vueConfig });
    // 匹配 src 下的所有 js、vue 文件
    const results = await eslint.lintFiles(["./src/**/*.js", "./src/**/*.vue"]);
    const formatter = await eslint.loadFormatter("stylish");
    const resultText = formatter.format(results);
    const eslintResult = this.parseESLintResult(resultText);

    log.verbose("eslintResult", eslintResult);
    log.success(
      "eslint检查完毕",
      "问题: " + eslintResult.problems,
      "，错误: " + eslintResult.errors,
      "，警告: " + eslintResult.warnings
    );
  }

  async autoTest() {
    const cwd = process.cwd();

    // 执行自动化测试前，让用户选择采用哪种方式进行测试
    let testMode;
    let config;
    // 读取缓存文件，获取 testMode
    const oweqianConfigFile = path.resolve(cwd, TEMP_HOME);
    if (pathExistsSync(oweqianConfigFile)) {
      config = fse.readJSONSync(oweqianConfigFile);
      testMode = config.testMode;
      if (!testMode) {
        testMode = await makeList({
          message: "请选择自动化测试方法",
          choices: [
            { name: "jest", value: "jest" },
            { name: "mocha", value: "mocha" },
          ],
        });
        config.testMode = testMode;
        fse.writeJsonSync(oweqianConfigFile, config);
      }
    } else {
      testMode = await makeList({
        message: "请选择自动化测试方法",
        choices: [
          { name: "jest", value: "jest" },
          { name: "mocha", value: "mocha" },
        ],
      });
      fse.writeJsonSync(oweqianConfigFile, {
        testMode,
      });
    }

    if (testMode === "jest") {
      // 2、jest
      log.info("自动执行jest测试");
      await jest.run("test");
      log.success("jest测试执行完毕");
    } else {
      // 3、mocha
      log.info("自动执行mocha测试");
      const mochaInstance = new Mocha();
      mochaInstance.addFile(path.resolve(cwd, "__tests__/mocha_test.js"));
      mochaInstance.run(() => {
        log.success("mocha测试执行完毕");
      });
    }
  }

  async action() {
    // 代码规范检查
    await this.eslint();
    // 自动化测试
    await this.autoTest();
  }
}

function Lint(instance) {
  return new LintCommand(instance);
}

export default Lint;
```

#### eslint - vueConfig

```javascript
// lib/eslint/vueConfig.js
export default {
  env: {
    browser: true,
    es2021: true,
  },
  extends: ["plugin:vue/vue3-essential", "airbnb-base"],
  overrides: [],
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
  },
  plugins: ["vue"],
  rules: {},
};
```

#### 工具演示

🌰：command help

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/cli/img_16.png" alt="" width="100%" />

🌰：Jest 测试

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/cli/img_17.png" alt="" width="100%" />

🌰：Mocha 测试

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/cli/img_18.png" alt="" width="100%" />

### 代码提交工具

🤔 为什么要实现代码提交工具？

优势：

- 规范代码提交流程
- 提升代码提交效率

局限：

- 无法自动解决代码冲突，需要开发人员手动解决代码冲突

🤔 如何实现代码提交工具？

基于对 GitFlow 掌握的情况下，实现代码自动提交功能需要完成 4 个阶段：

1. 远程仓库初始化阶段，利用 github、gitee API 创建仓库

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/cli/img_19.png" alt="" width="100%" />

2. git 初始化阶段，线上仓库和本地代码进行同步

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/cli/img_20.png" alt="" width="100%" />

3. git 提交阶段，代码冲突情况如何处理

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/cli/img_21.png" alt="" width="100%" />

4. git 发布阶段，自动发布流程设计和实现

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/cli/img_22.png" alt="" width="100%" />

#### 准备工作

开发代码提交工具前，我们先来了解下 GitFlow 原理。

[A successful Git branching model](https://nvie.com/posts/a-successful-git-branching-model/)

- GitFlow 主流程

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/cli/img_19.jpg" alt="" width="100%" />

- GitFlow 多人协作流程

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/cli/img_20.jpg" alt="" width="100%" />

#### 调整 package.json

```
{
  "name": "@oweqian/commit",
  "version": "0.0.0",
  "description": "commit command",
  // ...
  "main": "lib/index.js",
  // ...
  "type": "module",
  "dependencies": {
    "@oweqian/utils": "^0.0.0",
    "fs-extra": "^10.1.0",
    "path-exists": "^5.0.0",
    "semver": "^7.3.8",
    "simple-git": "^3.15.1"
  }
}
```

#### 入口文件

```javascript
import Command from "@oweqian/command";
import path from "node:path";
import fse from "fs-extra";
import SimpleGit from "simple-git";
import semver from "semver";
import { pathExistsSync } from "path-exists";
import {
  log,
  initGitType,
  initGitServer,
  clearCache,
  createRemotoRepo,
  makeInput,
  makeList,
} from "@oweqian/utils";

class CommitCommand extends Command {
  get command() {
    return "commit";
  }

  get description() {
    return "commit project";
  }

  get options() {
    return [
      ["-c, --clear", "清空缓存", false],
      ["-p, --publish", "发布", false],
    ];
  }

  async action([{ clear, publish }]) {
    if (clear) {
      clearCache();
    }
    // 阶段 1、远程仓库初始化
    await this.createRomoteRepo();
    // 阶段 2、git 初始化
    await this.initLocal();
    // 阶段 3、git 提交
    await this.commit();
    // 阶段 4、git 发布
    if (publish) {
      await this.publish();
    }
  }

  async createRomoteRepo() {
    // 1、确定 git 平台、生成 git token
    this.gitAPI = await initGitServer();

    // 2、确定仓库类型
    await initGitType(this.gitAPI);

    // 3、创建远程仓库
    const dir = process.cwd();

    const pkgPath = path.resolve(dir, "package.json");
    const pkg = fse.readJSONSync(pkgPath);
    this.name = pkg.name;
    this.version = pkg.version || "1.0.0";
    await createRemotoRepo(this.gitAPI, this.name);

    // 4、生成.gitignore
    const gitIgnorePath = path.resolve(dir, ".gitignore");
    if (!pathExistsSync(gitIgnorePath)) {
      log.info(".gitignore 不存在，开始创建");
      fse.writeFileSync(
        gitIgnorePath,
        `.DS_Store
      node_modules
      /dist
      
      
      # local env files
      .env.local
      .env.*.local
      
      # Log files
      npm-debug.log*
      yarn-debug.log*
      yarn-error.log*
      pnpm-debug.log*
      
      # Editor directories and files
      .idea
      .vscode
      *.suo
      *.ntvs*
      *.njsproj
      *.sln
      *.sw?`
      );
      log.success(".gitignore 创建成功");
    }
  }

  async checkNotCommitted() {
    const status = await this.git.status();

    if (
      status.not_added.length > 0 ||
      status.created.length > 0 ||
      status.deleted.length > 0 ||
      status.modified.length > 0 ||
      status.renamed.length > 0
    ) {
      log.verbose("status", status);

      // 执行 git add
      await this.git.add(status.not_added);
      await this.git.add(status.created);
      await this.git.add(status.deleted);
      await this.git.add(status.modified);
      await this.git.add(status.renamed.map((item) => item.to)); // 获取renamed内容

      // 执行 git commit -m "xxx"
      let message;
      while (!message) {
        message = await makeInput({
          message: "请输入 commit 信息: ",
        });
      }
      await this.git.commit(message);
      log.success("本地 commit 提交成功");
    }
  }

  async initLocal() {
    // 生成 git remote 地址
    const remoteUrl = this.gitAPI.getRepoUrl(
      `${this.gitAPI.login}/${this.name}`
    );

    // 初始化 git 对象
    this.git = SimpleGit(process.cwd());

    // 判断当前项目是否进行 git 初始化
    const gitDir = path.resolve(process.cwd(), ".git");
    if (!pathExistsSync(gitDir)) {
      // 执行 git init
      await this.git.init();
      log.success("完成 git 初始化");
    }

    // 获取所有 remotes
    const remotes = await this.git.getRemotes();
    if (!remotes.find((remote) => remote.name === "origin")) {
      // 执行 git add remote
      this.git.addRemote("origin", remoteUrl);
      log.success("添加 git remote", remoteUrl);
    }

    // 自动提交未提交代码
    await this.checkNotCommitted();

    // 拉取远程 main 分支
    const tags = await this.git.listRemote(["--refs"]);
    log.verbose("listRemotes", tags);

    if (tags.indexOf("refs/heads/main") >= 0) {
      // 拉取远程 main 分支，实现代码同步
      await this.pullRemoteRepo("main", {
        "--allow-unrelated-histories": null,
      });
    } else {
      // 推送代码到远程 main 分支
      await this.pushRemoteRepo("main");
    }
  }

  syncVersionToPackageJson() {
    const dir = process.cwd();
    const pkgPath = path.resolve(dir, "package.json");
    const pkg = fse.readJSONSync(pkgPath);
    if (pkg && pkg.version !== this.version) {
      pkg.version = this.version;
      fse.writeJSONSync(pkgPath, pkg, { spaces: 2 });
    }
  }

  /**
   * 版本号数组（排序方式：ASC）
   */
  async getRomoteBranchList(type) {
    const remoteList = await this.git.listRemote(["--refs"]);
    let reg;
    // 生产 or 开发
    if (type === "release") {
      // release/0.0.1
      reg = /.+?refs\/tags\/release\/(\d+\.\d+\.\d+)/g;
    } else {
      // develop/0.0.1
      reg = /.+?refs\/tags\/develop\/(\d+\.\d+\.\d+)/g;
    }
    return remoteList
      .split("\n")
      .map((remote) => {
        const match = reg.exec(remote);
        reg.lastIndex = 0;
        // semver 判断是否为有效版本号
        if (match && semver.valid(match[1])) {
          return match[1];
        }
      })
      .filter(Boolean)
      .sort((a, b) => {
        // ASC
        if (semver.lte(b, a)) {
          if (a === b) return 0;
          return -1;
        }
        return 1;
      });
  }

  async getCorrectVersion() {
    log.info("获取代码分支");

    const remoteBranchList = await this.getRomoteBranchList("release");
    let releaseVersion = null;
    if (remoteBranchList && remoteBranchList.length > 0) {
      releaseVersion = remoteBranchList[0];
    }

    const developVersion = this.version;

    if (!releaseVersion) {
      this.branch = `develop/${developVersion}`;
    } else if (semver.gt(developVersion, releaseVersion)) {
      log.info(
        `当前本地版本号大于线上最新版本号`,
        `${developVersion} > ${releaseVersion}`
      );

      this.branch = `develop/${developVersion}`;
    } else {
      log.info(
        `当前线上最新版本号大于本地版本号`,
        `${releaseVersion} > ${developVersion}`
      );

      const incType = await makeList({
        message: "自动升级版本，请选择升级版本类型",
        defaultValue: "patch",
        choices: [
          {
            name: `小版本 (${releaseVersion} -> ${semver.inc(
              releaseVersion,
              "patch"
            )})`,
            value: "patch",
          },
          {
            name: `中版本 (${releaseVersion} -> ${semver.inc(
              releaseVersion,
              "minor"
            )})`,
            value: "minor",
          },
          {
            name: `大版本 (${releaseVersion} -> ${semver.inc(
              releaseVersion,
              "major"
            )})`,
            value: "major",
          },
        ],
      });

      const incVersion = semver.inc(releaseVersion, incType);
      this.branch = `develop/${incVersion}`;
      this.version = incVersion;
      // 更新 package.json version
      this.syncVersionToPackageJson();
    }

    log.success(`代码分支获取成功 ${this.branch}`);
  }

  async checkStash() {
    log.info("检查 stash 记录");

    const stashList = await this.git.stashList();

    if (stashList.all.length > 0) {
      await this.git.stash(["pop"]);
      log.success("stash pop 成功");
    }
  }

  async checkConflicted() {
    log.info("代码冲突检查");

    const status = await this.git.status();

    if (status.conflicted.length > 0) {
      throw new Error("当前代码存在冲突，请手动处理合并后再试！");
    }

    log.success("代码冲突检查通过");
  }

  async checkoutBranch(branchName) {
    const localBranchList = await this.git.branchLocal();

    if (localBranchList.all.indexOf(branchName) >= 0) {
      await this.git.checkout(branchName);
    } else {
      await this.git.checkoutLocalBranch(branchName);
    }

    log.success(`本地分支切换到 ${branchName}`);
  }

  async pullRemoteRepo(branch = "main", options = {}) {
    // 合并远程分支代码
    log.info(`同步远程 ${branch} 分支代码`);

    await this.git.pull("origin", branch, options).catch((err) => {
      log.verbose(`git pull origin ${branch}`, err.message);
      if (err.message.indexOf(`couldn't find remote ref ${branch}`) >= 0) {
        log.warn(`获取远程 [${branch}] 分支失败`);
      }
      process.exit(0);
    });
  }

  async pullRemoteMainAndBranch() {
    // 合并远程 main 分支
    log.info(`合并 [main] -> [${this.branch}]`);
    await this.pullRemoteRepo();
    log.success("合并远程 [main] 分支成功");
    log.info("检查远程分支");

    // 合并远程开发分支
    const remoteBranchList = await this.getRomoteBranchList();
    if (remoteBranchList.indexOf(this.version) >= 0) {
      log.info(`合并 [${this.branch}] -> [${this.branch}]`);
      await this.pullRemoteRepo(this.branch);
      log.success(`合并远程 [${this.branch}] 分支成功`);
      await this.checkConflicted();
    } else {
      log.success(`不存在远程分支 [${this.branch}]`);
    }
  }

  async pushRemoteRepo(branchName) {
    log.info(`推送代码至远程 ${branchName} 分支`);
    await this.git.push("origin", branchName);
    log.success("推送代码成功");
  }

  async commit() {
    // 自动生成版本号
    await this.getCorrectVersion();
    // 检查 stash 区
    await this.checkStash();
    // 检查代码冲突
    await this.checkConflicted();
    // 自动提交未提交代码
    await this.checkNotCommitted();
    // 自动切换分支
    await this.checkoutBranch(this.branch);
    // 自动合并远程 main 分支和远程开发分支
    await this.pullRemoteMainAndBranch();
    // 推送开发分支至远程开发分支
    await this.pushRemoteRepo(this.branch);
  }

  async checkTag() {
    log.info("获取远程 tag 列表");

    const tag = `release/${this.version}`;
    const tagList = await this.getRomoteBranchList("release");

    if (tagList.includes(this.version)) {
      log.info("远程 tag 已存在", tag);
      await this.git.push(["origin", `:refs/tags/${tag}`]);
      log.success("远程 tag 已删除", tag);
    }

    const localTagList = await this.git.tags();

    if (localTagList.all.includes(tag)) {
      log.info("本地 tag 已存在", tag);
      await this.git.tag(["-d", tag]);
      log.success("本地 tag 已删除", tag);
    }

    await this.git.addTag(tag);
    log.success("本地 tag 创建成功", tag);

    await this.git.pushTags("origin");
    log.success("远程 tag 推送成功", tag);
  }

  async mergeBranchToMain() {
    log.info("开始合并代码", `[${this.branch}] -> [main]`);
    await this.git.mergeFromTo(this.branch, "main");
    log.success("代码合并成功", `[${this.branch}] -> [main]`);
  }

  async deleteLocalBranch() {
    log.info("开始删除本地分支", this.branch);
    await this.git.deleteLocalBranch(this.branch);
    log.success("删除本地分支成功", this.branch);
  }

  async deleteRemoteBranch() {
    log.info("开始删除远程分支", this.branch);
    await this.git.push(["origin", "--delete", this.branch]);
    log.success("删除远程分支成功", this.branch);
  }

  async publish() {
    // 创建 Tag 并推送至远程 Tag
    await this.checkTag();
    // 本地切换到 main 分支
    await this.checkoutBranch("main");
    // 将开发分支代码合并到 main 分支
    await this.mergeBranchToMain();
    // 推送远程 main 分支
    await this.pushRemoteRepo("main");
    // 删除本地开发分支
    await this.deleteLocalBranch();
    // 删除远程开发分支
    await this.deleteRemoteBranch();
  }
}

function Commit(instance) {
  return new CommitCommand(instance);
}

export default Commit;
```

#### 工具演示

🌰：command help

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/cli/img_23.png" alt="" width="100%" />

🌰：Github User

[项目地址](https://github.com/OweQian/github-user-demo)

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/cli/img_24.png" alt="" width="100%" />

🌰：Github Organization

[项目地址](https://github.com/oweqianxyz/github-org-demo)

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/cli/img_25.png" alt="" width="100%" />

🌰：Gitee User

[项目地址](https://gitee.com/wangxiaobai2019/gitee-user-demo)

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/cli/img_26.png" alt="" width="100%" />

版本发布：

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/cli/img_28.png" alt="" width="100%" />

版本升级：

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/cli/img_29.png" alt="" width="100%" />

🌰：Gitee Organization

[项目地址](https://gitee.com/oweqian/gitee-org-demo)

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/cli/img_27.png" alt="" width="100%" />

### 脚手架云发布

🤔 为什么要实现自动发布？

优势：

- 减少发布过程中的手动操作成本，大幅提升 CI/CD 效率，快速实现项目发布上线

局限：

- 存在较高的技术门槛
- 需要租用额外的服务，会产生技术成本

🤔 如何实现自动发布？

- 方案 1：完全自主实现自动发布逻辑
- 方案 2：使用 github actions
- 方案 3：使用 docker + jenkins

#### Github Actions

[Github Actions](https://docs.github.com/en/actions) 是 Github 官方推出的 CI/CD 解决方案

工作原理：

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/cli/img_34.png" alt="" width="100%" />

#### 工具演示

📢 因为本人没有充足 💰 购买服务器和域名，所以只跑了下大概流程，如果您有需要，请自行查找其他资料。

🌰：Github Actions

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/cli/img_30.png" alt="" width="100%" />

🌰：docker + jenkins

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/cli/img_31.png" alt="" width="100%" />

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/cli/img_32.png" alt="" width="100%" />

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/cli/img_33.png" alt="" width="100%" />

## 写在最后

Everything will be okay in the end. If it's not okay, it's not the end.
