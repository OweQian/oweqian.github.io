---
title: "‍💻 基于 Electron + Vue3 的桌面应用开发实战"
date: 2023-02-07T10:20:47+08:00
tags: ["第一技能"]
categories: ["第一技能"]
---

项目地址： [ElectronVue3](https://github.com/OweQian/ElectronVue3)

<!--more-->

## 构建开发环境  

按如下步骤搭建开发环境：  

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/electron/img.png" alt="" width="700" />  

### 创建项目  

首先通过命令行创建一个 Vue 项目：  

```
npm create vite@latest electron -- --template vue-ts
```

安装 electron 依赖：  

```
npm i electron -D
```

调整 package.json 文件：  

```
{
  "name": "electron",
  "private": true,
  "version": "0.0.0",
  "scripts": {
    "dev": "vite",
    "build": "vue-tsc --noEmit && vite build",
    "preview": "vite preview"
  },
  "dependencies": {},
  "devDependencies": {
    "@vitejs/plugin-vue": "^4.0.0",
    "electron": "^22.0.3",
    "typescript": "^4.9.3",
    "vite": "^4.0.0",
    "vue-tsc": "^1.0.11",
    "vue": "^3.2.45"
  }
}
```

* 将 vue 从 dependencies 移到 devDependencies。  

在 Vite 编译项目的时候，Vue 库会被编译到输出目录下，输出目录下的内容是完整的，没必要把 Vue 标记为生产依赖；而且在我们将来制作安装包的时候，还要用到这个 package.json 文件，它的生产依赖里不应该有没用的东西。   

* 去掉 type: module 配置项。  

package.json 里的 type 定义了这个项目所有 .js 文件的处理方式。 如果 type 的值为 module，那么所有 .js 文件将被当做 ES Modules 对待。如果 type 的值为 commonjs，那么所有 .js 文件将被当做 CommonJS 模块对待。如果没有设置 type，那么它的默认值为 commonjs。  

### 创建主进程代码  

新建主进程入口文件：src/main/mainEntry.ts  

```typescript
import { app, BrowserWindow } from "electron";

let mainWindow: BrowserWindow;

app.whenReady().then(() => {
  mainWindow = new BrowserWindow({});
  mainWindow.loadURL(process.argv[2]);
});
```

app 是 Electron 的全局对象，用于控制整个应用程序的生命周期。  

Electron 初始化完成后，app 对象的 ready 事件被触发。  

app ready 后创建一个 BrowserWindow 对象，mainWindow 被设置为一个全局变量，避免被 JS 垃圾回收机制回收。  

窗口加载了一个 Url 路径，这个路径以命令行参数（第三个参数）的方式传递给应用程序。  

app 和 BrowserWindow 都是 Electron 的内置模块，这些内置模块是通过 ES Module 的形式导入进来的。  

### 开发环境 Vite 插件  

主进程的代码写好后，需要编译过之后才能被 Electron 加载，通过 Vite 插件的形式来完成编译和加载工作。  

```typescript
import { ViteDevServer } from 'vite';

interface IAddressInfo {
  address: string;
  port: string;
}
export let devPlugin = () => {
  return {
    name: 'dev-plugin',
    configureServer(server: ViteDevServer) {
      require('esbuild').buildSync({
        entryPoints: ['./src/main/mainEntry.ts'],
        bundle: true,
        platform: 'node',
        outfile: './dist/mainEntry.js',
        external: ['electron'],
      });
      server?.httpServer?.once('listening', () => {
        let { spawn } = require('child_process');
        let addressInfo: IAddressInfo = server?.httpServer?.address() as unknown as IAddressInfo;
        let httpAddress = `http://${addressInfo?.address}:${addressInfo?.port}`;
        let electronProcess = spawn(require('electron').toString(), ['./dist/mainEntry.js', httpAddress], {
          cwd: process.cwd(),
          stdio: 'inherit',
        });
        electronProcess.on('close', () => {
          server.close();
          process.exit();
        });
      });
    },
  };
};
```

注册了一个名为 configureServer 的钩子，当 Vite 启动 Http 服务时，configureServer 会执行。  

入参为类型为 ViteDevServer 的对象 server，server 持有一个 http.Server 类型的属性 httpServer，这个属性代表调试 Vue 页面的 http 服务，一般情况下地址为：http://127.0.0.1:5173/。  

通过监听 server.httpServer 的 listening 事件来判断 httpServer 是否已经成功启动。如果已经成功启动，就启动 Electron 应用，并给它传递两个命令行参数，第一个参数是主进程代码编译后的文件路径，第二个参数是 Vue 页面的 http 地址。  

通过 Node.js child_process 模块的 spawn 方法启动 electron 子进程，除了两个命令行参数外，还传递了一个配置对象。  

这个对象的 cwd 属性用于设置当前的工作目录，process.cwd() 返回的值就是当前项目的根目录。   

stdio 用于设置 electron 进程的控制台输出，这里设置 inherit 可以让 electron 子进程的控制台输出数据同步到主进程的控制台。  

在主进程中 console.log 的内容就可以在 VSCode 的控制台上看到了。  

当 electron 子进程退出的时候，要关闭 Vite 的 http 服务，并且控制父进程退出，准备下一次启动。  

http 服务启动之前，使用 esbuild 模块完成了主进程 TypeScript 代码的编译工作，这个模块是 Vite 自带的，不需要额外安装，可以直接使用。  

主进程的入口文件是通过 entryPoints 配置属性设置的，编译完成后的输出文件是通过 outfile 属性配置的。  

编译平台 platform 设置为 node，排除的模块 external 设置为 electron，这两个设置使在主进程代码中可以通过 import 的方式导入 electron 内置的模块，非但如此，Node 的内置模块也可以通过 import 的方式引入。  

在 vite.config.ts 文件中引入：  

```typescript
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { devPlugin } from './plugins/devPlugin';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [devPlugin(), vue()],
})
```

在 tsconfig.node.json 中配置 plugins 路径： 

```json
{
  "compilerOptions": {
    "composite": true,
    "module": "ESNext",
    "moduleResolution": "Node",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts", "./plugins/*.*"]
}
```

执行命令 npm run dev:  

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/electron/img_1.png" alt="" width="700" />  

### 渲染进程集成内置模块  

现在主进程内可以自由的使用 Electron 和 Node.js 的内置模块了，但渲染进程还不行。  

修改主进程代码，打开渲染进程的一些开关，允许渲染进程使用 Node.js 的内置模块:  

```typescript
import { app, BrowserWindow } from 'electron';
process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';
let mainWindow: BrowserWindow;

app.whenReady().then(() => {
  let config = {
    webPreferences: {
      nodeIntegration: true,
      webSecurity: false,
      allowRunningInsecureContent: true,
      contextIsolation: false,
      webviewTag: true,
      spellcheck: false,
      disableHtmlFullscreenWindowResize: true,
    },
  };
  mainWindow = new BrowserWindow(config);
  mainWindow.webContents.openDevTools({ mode: 'undocked' });
  mainWindow.loadURL(process.argv[2]);
});
```

ELECTRON_DISABLE_SECURITY_WARNINGS 用于设置渲染进程开发者调试工具的警告，这里设置为 true 就不会再显示任何警告了。  

nodeIntegration配置项的作用是把 Node.js 环境集成到渲染进程中。   

contextIsolation配置项的作用是在同一个 JavaScript 上下文中使用 Electron API。   

webContents的openDevTools方法用于打开开发者调试工具。   

现在可以在开发者调试工具中访问 Node.js 和 Electron 的内置模块了。  

### 设置模块别名与解析钩子  

虽然可以在开发者调试工具中使用 Node.js 和 Electron 的内置模块，但现在还不能在 Vue 的页面内使用这些模块。  

因为 Vite 主动屏蔽了这些内置的模块，如果开发者强行引入它们，那么大概率会得到如下报错： 

```
Module "xxxx" has been externalized for browser compatibility and cannot be accessed in client code.
```

安装 vite-plugin-optimizer：  

```
npm i vite-plugin-optimizer -D
```

修改 vite.config.ts 的代码，让 Vite 加载这个插件：   

```typescript
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { devPlugin, getReplacer } from './plugins/devPlugin';
import optimizer from 'vite-plugin-optimizer';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [optimizer(getReplacer()), devPlugin(), vue()],
})
```

vite-plugin-optimizer 插件会创建一个临时目录：node_modules.vite-plugin-optimizer。  

然后把类似 const fs = require('fs'); export { fs as default } 这样的代码写入这个目录下的 fs.js 文件中。  

渲染进程执行到：import fs from "fs" 时，就会请求这个目录下的 fs.js 文件，这样就达到了在渲染进程中引入 Node 内置模块的目的。  

getReplacer 方法是为 vite-plugin-optimizer 插件提供的内置模块列表:  

```typescript
export let getReplacer = () => {
  let externalModels = ['os', 'fs', 'path', 'events', 'child_process', 'crypto', 'http', 'buffer', 'url', 'better-sqlite3', 'knex'];
  let result = {};
  for (let item of externalModels) {
    result[item] = () => ({
      find: new RegExp(`^${item}$`),
      code: `const ${item} = require('${item}'); export { ${item} as default }`,
    });
  }
  result['electron'] = () => {
    let electronModules = ['clipboard', 'ipcRenderer', 'nativeImage', 'shell', 'webFrame'].join(',');
    return {
      find: new RegExp(`^electron$`),
      code: `const {${electronModules}} = require('electron'); export { ${electronModules} }`,
    }
  }
  return result;
}
```

在这个方法中把一些常用的 Node 模块和 electron 的内置模块提供给了 vite-plugin-optimizer 插件，以后想要增加新的内置模块只要修改这个方法即可。  

vite-plugin-optimizer 插件不仅用于开发环境，编译 Vue 项目时，它也会参与工作。  

通过如下代码在 Vue 组件中做测试：   

```vue
// src\App.vue
import fs from "fs";
import { ipcRenderer } from "electron";
import { onMounted } from "vue";
onMounted(() => {
  console.log(fs.writeFileSync);
  console.log(ipcRenderer);
});
```

开发者调试工具将会输出如下内容：  

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/electron/img_2.png" alt="" width="700" />  

## 构建生产环境   

制作一个 Vite 插件。通过这个新的插件生成安装包，有了安装包就可以把应用分发给用户了。   

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/electron/img_3.png" alt="" width="700" />  

### 编译结束钩子函数  

vite.config.ts 增加一个新的配置：  

```typescript
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { devPlugin, getReplacer } from './plugins/devPlugin';
import { buildPlugin } from './plugins/buildPlugin';
import optimizer from 'vite-plugin-optimizer';

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    rollupOptions: {
      plugins: [buildPlugin()],
    },
  },
  plugins: [optimizer(getReplacer()), devPlugin(), vue()],
})
```

### 制作应用安装包   

vite 编译完成之后，也就是执行 npm run build 指令，将在项目dist目录内会生成一系列的文件（如下图所示），此时 closeBundle 钩子被调用，在这个钩子中把上述生成的文件打包成一个应用程序安装包。  

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/electron/img_4.png" alt="" width="300" />  

```typescript
import path from 'path';
import fs from 'fs';

class BuildObj {
  // 编译主进程代码
  buildMain() {
    require('esbuild').buildSync({
      entryPoints: ['./src/main/mainEntry.ts'],
      bundle: true,
      platform: 'node',
      minify: true,
      outfile: './dist/mainEntry.js',
      external: ['electron'],
    });
  }
  // 为生产环境准备package.json
  preparePackageJson() {
    let pkgJsonPath = path.join(process.cwd(), 'package.json');
    let localPkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'));
    let electronConfig = localPkgJson.devDependencies.electron.replace('^', '');
    localPkgJson.main = 'mainEntry.js';
    delete localPkgJson['scripts'];
    delete localPkgJson['devDependencies'];
    localPkgJson.devDependencies = {
      electron: electronConfig,
    };
    let tarJsonPath = path.join(process.cwd(), 'dist', 'package.json');
    fs.writeFileSync(tarJsonPath, JSON.stringify(localPkgJson));
    fs.mkdirSync(path.join(process.cwd(), 'dist/node_modules'));
  }
  // 使用electron-builder制成安装包
  buildInstaller() {
    let options = {
      config: {
        directories: {
          output: path.join(process.cwd(), 'release'),
          app: path.join(process.cwd(), 'dist'),
        },
        files: ['**'],
        extends: null,
        productName: 'Electron',
        appId: 'com.xxx.desktop',
        asar: true,
        nsis: {
          oneClick: true,
          perMachine: true,
          allowToChangeInstallationDirectory: false,
          createDesktopShortcut: true,
          createStartMenuShortcut: true,
          shortcutName: 'ElectronDesktop',
        },
        publish: [{
          provider: 'generic',
          url: 'http://localhost:5500/',
        }],
      },
      project: process.cwd(),
    };
    return require('electron-builder').build(options);
  }
}
export let buildPlugin = () => {
  return {
    name: 'build-plugin',
    closeBundle: () => {
      let buildObj = new BuildObj();
      buildObj?.buildMain();
      buildObj?.preparePackageJson();
      buildObj?.buildInstaller();
    }
  }
}
```

这个对象通过三个方法提供了三个功能：  

* buildMain。由于 ite 在编译之前会清空 dist 目录，所以在之前生成的 mainEntry.js 文件也被删除了，此处通过 buildMain 方法再次编译主进程代码。不过由于此处是在为生产环境编译代码，所以增加了minify: true 配置，生成压缩后的代码。  
* preparePackageJson。用户安装产品后，在启动应用程序时，实际上是通过 Electron 启动一个 Node.js 的项目，所以要为这个项目准备一个 package.json 文件，这个文件是以当前项目的 package.json 文件为蓝本制作而成的。里面注明了主进程的入口文件，移除了一些对最终用户没用的配置节。  
* buildInstaller。这个方法负责调用 electron-builder（npm install electron-builder -D 安装 electron-builder 库） 提供的 API 以生成安装包。最终生成的安装包被放置在 release 目录下，这是通过 config.directories.output 指定的。静态文件所在目录是通过 config.directories.app 配置项指定。其他配置项，请自行查阅官网文档。  

生成 package.json 文件之后，还创建了一个 node_modules 目录。此举是为了阻止 electron-builder 的一些默认行为（目前来说它会阻止 electron-builder 创建一些没用的目录或文件）。

这段脚本还明确指定了 Electron 的版本号，如果 Electron 的版本号前面有"^"符号的话，需把它删掉。这是 electron-builder 的一个 Bug，这个 bug 导致 electron-builder 无法识别带 ^ 或 ~ 符号的版本号。  

做好这些配置之后，执行 npm run build 就可以制作安装包了，最终生成的安装文件会被放置到 release 目录下。   

### 主进程生产环境加载本地文件  

虽然成功制作了安装包，而且这个安装包可以正确安装应用程序，但是这个应用程序无法正常启动，这是因为应用程序的主进程还在通过 process.argv[2] 加载首页。显然用户通过安装包安装的应用程序没有这个参数。

接下来就要让应用程序在没有这个参数的时候，也能加载静态页面。  

新建 src\main\CustomScheme.ts： 

```typescript
import { protocol } from 'electron';
import path from 'path';
import fs from 'fs';

// 为自定义app协议提供特权
let schemeConfig = {
  standard: true,
  supportFetchAPI: true,
  bypassCSP: true,
  corsEnabled: true,
  stream: true,
};

protocol.registerSchemesAsPrivileged([{
  scheme: 'app',
  privileges: schemeConfig,
}]);

export class CustomScheme {
  // 根据文件扩展名获取mime-type
  private static getMimeType(extension: string) {
    let mineType = '';
    switch (extension) {
      case '.js':
        mineType = 'text/javascript';
      break;
      case '.html':
        mineType = 'text/html';
      break;
      case '.css':
        mineType = 'text/css';
      break;
      case '.svg':
        mineType = 'image/svg+xml';
      break;
      case '.json':
        mineType = 'application/json';
      break;
    }
    return mineType;
  };
  // 注册自定义app协议
  static registerScheme() {
    protocol.registerStreamProtocol('app', (request, callback) => {
      let pathName = new URL(request.url).pathname;
      let extension = path.extname(pathName).toLowerCase();
      if (extension === '') {
        pathName = 'index.html';
        extension = '.html';
      }
      let tarFile = path.join(__dirname, pathName);
      callback({
        statusCode: 200,
        headers: {
          'content-type': this.getMimeType(extension),
        },
        data: fs.createReadStream(tarFile),
      })
    });
  };
}
```

在主进程 app ready 前，通过 protocol 对象的 registerSchemesAsPrivileged 方法为名为 app 的 scheme 注册了特权（可以使用 FetchAPI、绕过内容安全策略等）。  

在 app ready 之后，通过 protocol 对象的 registerStreamProtocol 方法为名为 app 的 scheme 注册了一个回调函数。当加载类似 app://index.html 这样的路径时，这个回调函数将被执行。  

这个函数有两个传入参数 request 和 callback，通过 request.url 获取到请求的文件路径，通过 callback 做出响应。

给出响应时，要指定响应的 statusCode 和 content-type，这个 content-type 是通过文件的扩展名得到的。这里通过 getMimeType 方法确定了文件的 content-type。  

响应的 data 属性为目标文件的可读数据流，当你的静态文件比较大时，不必读出整个文件再给出响应。

接下来在 src\main\mainEntry.ts 中使用这段代码：  

```typescript
import {CustomScheme} from './customScheme';

if (process.argv[2]) {
    mainWindow.loadURL(process.argv[2]);
  } else {
    CustomScheme.registerScheme();
    mainWindow.loadURL('app"//index.html');
  }
```

这样当存在指定的命令行参数时，就认为是开发环境，使用命令行参数加载页面，当不存在命令行参数时，就认为是生产环境，通过 app:// scheme 加载页面。  

## 设计工程项目结构   

在继续引入新的模块或组件之前，先调整一下工程的结构：  

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/electron/img_5.png" alt="" width="300" />  

* dist 目录是打包过程的临时产物放置目录。
* plugins 目录放置开发环境 vite 插件和打包 vite 插件。
* release 目录放置最终生成的安装包。
* resource 目录放置一些外部资源，比如应用程序图标、第三方类库等。
* src/common 目录放置主进程和渲染进程都会用到的公共代码，比如日期格式化的工具类、数据库访问工具类等，主进程和渲染进程的代码都有可能使用这些类。
* src/main 目录放置主进程的代码。
* src/model 目录放置应用程序的模型文件，比如消息类、会话类、用户设置类等，主进程和渲染进程的代码都有可能使用这些类。
* src/renderer 目录放置渲染进程的代码。
* src/renderer/assets 放置字体图标、公共样式、图片等文件。
* src/renderer/components 放置公共组件，比如标题栏组件、菜单组件等。
* src/renderer/store 目录存放 Vue 项目的数据状态组件，用于在不同的 Vue 组件中共享数据。
* src/renderer/router 目录存放 Vue 项目的路由配置信息。
* src/renderer/indow 目录存放不同窗口的入口组件，这些组件是通过 vue-router 导航的，这个目录下的子目录存放对应窗口的子组件。
* src/renderer/App.vue 是渲染进程的入口组件，这个组件内只有一个用于导航到不同的窗口。
* src/renderer/main.ts 是渲染进程的入口脚本。
* index.html 是渲染进程的入口页面。
* vite.config.ts 是 vite 的配置文件。

调整好工程结构后，要修改一下 index.html 的代码才能让这些调整生效。实际上就是修改一下渲染进程入口脚本的引入路径:  

```html
<script type="module" src="/src/renderer/main.ts"></script>
```

## 引入 vue-router  
安装 vue-router 模块：  

```shell
npm install vue-router@4 -D
```

安装完成后，为 src/renderer/router/index.ts 添加如下代码逻辑：  

```typescript
import * as VueRouter from 'vue-router';

// 路由规则数组
const routes = [{
  path: '/',
  redirect: '/WindowMain/Chat',
}, {
  path: '/WindowMain',
  component: () => import('../window/WindowMain.vue'),
  children: [{
    path: 'Chat',
    component: () => import('../window/WindowMain/Chat.vue'),
  }, {
    path: 'Contact',
    component: () => import('../window/WindowMain/Contact.vue'),
  }, {
    path: 'Collection',
    component: () => import('../window/WindowMain/Collection.vue'),
  },]
}, {
  path: '/WindowSetting',
  component: () => import('../window/WindowSetting.vue'),
  children: [
    {
      path: 'AccountSetting',
      component: () => import('../window/WindowSetting/AccountSetting.vue'),
    }
  ]
}, {
  path: '/WindowUserInfo',
  component: () => import('../window/WindowUserInfo.vue'),
}]

export let router = VueRouter.createRouter({
  history: VueRouter.createWebHistory(),
  routes,
});
```

这段代码导出了一个 router 对象，这个 router 对象是基于 WebHistory 模式创建路由的，也就是说页面路径看起来是这样的：http://127.0.0.1:5173/WindowMain/PageChat（开发环境），app://index.html/WindowMain/PageChat（生产环境）。   

上述代码中 routes 数组里的内容就是导航的具体配置，在这些配置中使用 import 方法动态引入 Vue 组件，vite 在处理这种动态引入的组件时，会把对应的组件编译到独立的源码文件中，类似 WindowUserInfo.689249b8.js 和 WindowSetting.6354f6d6.js，这种编译策略可以帮助控制最终编译产物的大小，避免应用启动时就加载一个庞大的 JavaScript 文件。  

在应用启动时请求的路径是："/"，这个路径被重定向到"/WindowMain/Chat"，也就是说 WindowMain 组件和 Chat 组件是首页组件（这是在第一个导航配置对象中设置的）。  

上述代码完成后，需要在 main.ts 中使用它，代码如下：  

```typescript
import { createApp } from 'vue';
import './style.css';
import { router } from './router';
import App from './App.vue';

createApp(App).use(router).mount('#app');
```

接下来把 App.vue 的代码修改成如下内容：  

```vue
<template>
  <router-view />
</template>
```

应用启动时，第一个窗口（主窗口）就会加载 src\renderer\window\WindowMain.vue 组件的代码。  

当在主窗口内打开别的子窗口时（弹出一个子窗口），只要加载类似这样的路径/WindowUserInfo，就可以让子窗口加载 src\renderer\Window\WindowUserInfo.vue 这个组件。  

## 菜单组件及跳转  

在 src\renderer\components 目录下新建 BarLeft.vue 的组件，这是整个应用的侧边栏组件，里面放置应用程序的菜单：  

```vue
<template>
  <div class="BarLeft">
    <div class="userIcon">
      <img src="../assets/avatar.jpg" alt="">
    </div>
    <div class="menu">
      <router-link v-for="item in mainWindowRoutes" :to="item.path" :class="['menuItem', {'selected': item.isSelected}]">
        <i :class="['icon', item.isSelected ? item.iconSelected : item.icon]"></i>
      </router-link>
    </div>
    <div class="setting">
      <div class="menuItem">
        <i class="icon icon-setting" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useRoute } from 'vue-router';
let mainWindowRoutes = ref([
  { path: '/WindowMain/Chat', isSelected: true, icon: 'icon-chat', iconSelected: 'icon-chat' },
  { path: '/WindowMain/Contact', isSelected: false, icon: 'icon-tongxunlu1', iconSelected: 'icon-tongxunlu' },
  { path: '/WindowMain/Collection', isSelected: false, icon: 'icon-shoucang1', iconSelected: 'icon-shoucang' },
])
let route = useRoute();
watch(
    () => route,
    () => mainWindowRoutes.value.forEach(v => v.isSelected = v.path === route.fullPath),
    {
      immediate: true,
      deep: true,
    })
</script>

<style scoped lang="scss">
.BarLeft {
  width: 54px;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: rgb(46, 46, 46);
  -webkit-app-region: drag;
}
.userIcon {
  height: 84px;
  padding-top: 36px;
  box-sizing: border-box;
  img {
    width: 34px;
    height: 34px;
    margin-left: 10px;
  }
}
.menu {
  flex: 1;
}
.menuItem {
  height: 44px;
  line-height: 44px;
  text-align: center;
  padding-left: 12px;
  padding-right: 12px;
  display: block;
  text-decoration: none;
  color: rgb(126, 126, 126);
  cursor: pointer;
  -webkit-app-region: no-drag;
  i {
    font-size: 22px;
  }
  &:hover {
    color: rgb(141, 141, 141);
  }
}
.selected {
  color: rgb(7, 193, 96);
  &:hover {
    color: rgb(7, 193, 96);
  }
}
.setting {
  margin-bottom: 5px;
}
</style>
```

* 样式为 menu 的 div 用于存放主窗口的菜单，通过 mainWindowRoutes 数组里的数据来渲染菜单。  
* router-link 组件会被渲染成 a 标签，当用户点击菜单时，主窗口的二级路由发生跳转（src\renderer\window\WindowMain.vue）。  
* 通过 watch 方法监控路由跳转的行为，当路由跳转后，遍历 mainWindowRoutes 数组内的对象，取消以前选中的菜单，选中新的菜单。  
* 由于 mainWindowRoutes 是一个 Ref 对象，所以菜单被选中或取消选中之后，相应的菜单样式（和菜单内的字体图标）也会跟着变化。

在 WindowMain.vue 中添加如下代码：  

```vue
<script setup lang="ts">
import { ipcRenderer } from "electron";
import { onMounted } from "vue";
import BarLeft from "../components/BarLeft.vue";
onMounted(() => {
  ipcRenderer.invoke("showWindow");
});
</script>

<template>
  <BarLeft />
  <div class="pageBox">
    <router-view />
  </div>
</template>

<style scoped lang="scss">
.pageBox {
  flex: 1;
  height: 100%;
  border-top: 1px solid #e6e6e6;
  box-sizing: border-box;
  display: flex;
  margin-top: -1px;
}
</style>
```
## 引入字体图标  

在 www.iconfont.cn/ 获得字体图标，Electron 使用 Chromium 核心，一般情况下只使用 iconfont.css 和 iconfont.ttf 这两个文件。把这两个文件放到 src/renderer/assets/icon 下，在 main.ts 导入一下 iconfont.css 就可以全局使用字体图标了。  

```typescript
import { createApp } from 'vue';
import './style.css';
import "./assets/icon/iconfont.css";
import { router } from './router';
import App from './App.vue';

createApp(App).use(router).mount('#app');
```

```vue
<i class="icon icon-chat"></i>
```

如果 iconfont.ttf 足够小，那么 vite 会把它转义成 base64 编码的字符串，直接嵌入到样式文件中来达到少请求数量的目的，开发者可以通过在 vite.config.ts 中增加 build.assetsInlineLimit 配置（值设置为 0 即可）来关闭 vite 的这个行为。  

运行项目：   

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/electron/img_6.png" alt="" width="700" />  

## 管控应用窗口  

如何管控应用内的窗口，比如：什么时候显示窗口、如何通过自定义窗口标题栏来管控单个窗口等内容。  

### 主窗口显示时机   

在第一个窗口初始化的瞬间，会有一个黑窗口闪现一下，如下图所示：  

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/electron/img_7.png" alt="" width="700" />  

按照 Electron 官网的建议，窗口一开始应该是隐藏的，在 ready-to-show 事件触发后再显示窗口，如下代码所示：

```
const { BrowserWindow } = require("electron");
const win = new BrowserWindow({ show: false });
win.once("ready-to-show", () => {
win.show();
});
```

但这个事件的触发太早了，因为 Vue 项目的 HTML 加载之后，JavaScript 脚本还需要做很多事情才能把组件渲染出来。况且开发者可能还会在 Vue 组件初始化的早期做很多额外的工作，所以显示窗口不能依赖 ready-to-show 事件，必须手动控制。  

主窗口对象 mainWindow 初始化时，把配置属性 show 设置为 false，就可以让主窗口初始化成功后处于隐藏状态。  

接下来再在合适的时机让渲染进程控制主窗口显示出来即可。这里在 WindowMain.vue 组件渲染完成之后来完成这项工作，如下代码所示：  

```vue
import { ipcRenderer } from "electron";
import { onMounted } from "vue";
onMounted(() => {
  ipcRenderer.invoke("showWindow");
});
```

### 自定义窗口标题栏  

在 src/renderer/components 下新建 BarTop.vue，这是窗口标题栏组件：   

```vue
<template>
  <div class="topBar">
    <div class="winTitle">{{ title }}}</div>
    <div class="winTool">
      <div @click="minimizeMainWindow">
        <i class="icon icon-minimize"/>
      </div>
      <div v-if="isMaximized" @click="unmaximizeMainWindow">
        <i class="icon icon-restore"/>
      </div>
      <div v-else @click="maxmizeMainWin">
        <i class="icon icon-maximize"/>
      </div>
      <div @click="closeWindow">
        <i class="icon icon-close"/>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
</script>

<style lang="scss" scoped>
.topBar {
  display: flex;
  height: 25px;
  line-height: 25px;
  -webkit-app-region: drag; /* 可拖拽区域 */
  width: 100%;
}

.winTitle {
  flex: 1;
  padding-left: 12px;
  font-size: 14px;
  color: #888;
}

.winTool {
  height: 100%;
  display: flex;
  -webkit-app-region: no-drag; /* 可拖拽区域内的不可拖拽区域 */
}

.winTool div {
  height: 100%;
  width: 34px;
  text-align: center;
  color: #999;
  cursor: pointer;
  line-height: 25px;
}

.winTool .icon {
  font-size: 10px;
  color: #666666;
  font-weight: bold;
}

.winTool div:hover {
  background: #efefef;
}

.winTool div:last-child:hover {
  background: #ff7875;
}

.winTool div:last-child:hover i {
  color: #fff !important;
}
</style>
```

* 要自定义一个窗口的标题栏必须把窗口默认的标题栏取消掉才行。只需要在初始化 mainWindow 对象时（主进程里的逻辑），把窗口配置对象的 frame 属性设置为 false 就可以使这个窗口成为无边框窗口了。

* 窗口标题是通过 props 数据传递给标题栏组件的，也就是说标题栏的标题是由其父组件来确定的。

* 标题栏中可拖拽区域是通过样式 -webkit-app-region: drag 定义的，鼠标在这个样式定义的组件上拖拽可以移动窗口，双击可以放大或者还原窗口，如果这个组件内有子组件不希望拥有该能力，可以通过 -webkit-app-region: no-drag; 来取消此能力。

* 最大化、最小化、还原、关闭窗口等按钮的点击事件，都是通过 ipcRenderer.invoke 方法来调用主进程 CommonWindowEvent 类提供的消息管道来实现对应的功能的。

* 由于窗口最大化（或还原）不一定是通过点击最大化按钮（或还原按钮）触发的，有可能是通过双击标题栏可拖拽区域触发的，所以这里只能通过 ipcRenderer.on 来监听窗口的最大化或还原事件，以此来改变对应的最大化或还原按钮的显隐状态。不能在按钮点击事件中来完成这项工作。windowMaximized 消息和 windowUnmaximized 消息也是由主进程的 CommonWindowEvent 类发来的。

* 由于多个二级路由页面会引用 BarTop.vue，为了避免在切换路由的时候，反复通过 ipcRenderer.on 注册消息监听器，所以在组件的 onUnmounted 事件内注销了消息监听器，避免事件泄漏。  

src/main/CommonWindowEvent.ts 的代码如下：   

```ts
import { BrowserWindow, ipcMain, app } from 'electron';

// 主进程公共消息处理逻辑
export class CommonWindowEvent {
  private static getWin(event: any) {
    return BrowserWindow.fromWebContents(event.sender);
  }
  public static listen() {
    ipcMain.handle('minimizeWindow', e => {
      this.getWin(e)?.minimize();
    });

    ipcMain.handle('maxmizeWindow', e => {
      this.getWin(e)?.maximize();
    });

    ipcMain.handle('unmaximizeWindow', e => {
      this.getWin(e)?.unmaximize();
    });

    ipcMain.handle('hideWindow', e => {
      this.getWin(e)?.hide();
    });

    ipcMain.handle('showWindow', e => {
      this.getWin(e)?.show();
    });

    ipcMain.handle('closeWindow', e => {
      this.getWin(e)?.close();
    });

    ipcMain.handle('resizable', e => this.getWin(e)?.isResizable());

    ipcMain.handle('getPath', (e, name) => app.getPath(name));
  }

  // 主进程公共事件处理逻辑
  public static regWinEvent(win: BrowserWindow) {
    win.on('maximize', () => {
      win.webContents.send('windowMaximized');
    });
    win.on('unmaximize', () => {
      win.webContents.send('windowUnmaximized');
    })
  }
}
```

* 在 listen 方法内部注册了一系列消息管道，方便渲染进程控制主进程的一些行为，标题栏组件的窗口的最大化、最小化、还原等功能都是在这里实现的。在 app ready 之后调用 CommonWindowEvent.listen(); 这个方法即可注册这些消息管道。
* regWinEvent 方法负责为窗口对象注册事件，当窗口最大化或还原后，这些事件的处理函数负责把消息发送给渲染进程。标题栏的对应按钮的图标也会发生相应的变化，同样也是在 app ready 之后调用 CommonWindowEvent.regWinEvent(mainWindow); 这个方法即可。  

在 src/main/mainEntry.ts 下添加如下代码：  

```ts
import {app, BrowserWindow} from 'electron';
import {CustomScheme} from "./customScheme";
import { CommonWindowEvent } from "./CommonWindowEvent";
process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';
let mainWindow: BrowserWindow;
// 调用 CommonWindowEvent.regWinEvent(win);
app.on("browser-window-created", (e, win) => {
  CommonWindowEvent.regWinEvent(win);
});
app.whenReady().then(() => {
  let config = {
    webPreferences: {
      nodeIntegration: true,
      webSecurity: false,
      allowRunningInsecureContent: true,
      contextIsolation: false,
      webviewTag: true,
      spellcheck: false,
      disableHtmlFullscreenWindowResize: true,
    },
  };
  mainWindow = new BrowserWindow(config);
  mainWindow.webContents.openDevTools({mode: 'undocked'});
  if (process.argv[2]) {
    mainWindow.loadURL(process.argv[2]);
  } else {
    CustomScheme.registerScheme();
    mainWindow.loadURL('app"//index.html');
  }
  // 调用 CommonWindowEvent.listen();
  CommonWindowEvent.listen();
});
```

### 窗口加载过慢解决方案  

Electron 创建一个 BrowserWindow 对象，并让它成功渲染一个页面是非常耗时的，在一个普通配置的电脑上，这大概需要 2~5 秒左右的时间（少量用户反馈没这个问题）。  

#### 窗口池解决方案   

提前准备 1 个或多个隐藏的窗口，让它们加载一个骨架屏页面，放到一个数组里，当应用程序需要打开一个新窗口时，就从这个数组里取出一个窗口，执行页内跳转，从骨架屏页面跳转到业务页面，然后再把这个窗口显示出来。这就消费掉了一个窗口。  

当应用程序消费掉一个窗口之后，马上再创建一个新的加载了骨架屏页面的窗口放入数组，保证有足够的待命隐藏窗口。  

当用户关闭某个加载了业务页面的窗口时，就把它从数组中删除掉。避免数组里存在无用的窗口。  

这个方案之所以行之有效是因为在没有使用窗口时就提前准备好了窗口，等真正需要使用窗口时，仅仅是完成了一次页面跳转的工作，这个跳转工作可以在很短的时间内就完成。所以给用户的感知就是打开子窗口特别快。  

webview 和 BrowserView 创建慢的问题也可以使用类似的方案解决。  

然而这个方案有以下三个缺点。

* 无法优化整个应用的第一个窗口。
* 系统内部始终会有 1 到 2 个隐藏窗口处于待命状态，这无形中增加了用户的内存消耗。
* 虽然这个方案看上去逻辑比较简单，但要控制好所有的细节（比如，窗口间的通信、界面代码如何控制窗口的外观、如何实现模态子窗口等）还是非常繁琐的。

#### window.open 解决方案   

Electron 允许使用 window.open 的方式打开一个子窗口，通过这种方式打开的子窗口不会创建新的进程，效率非常高，可以在几百毫秒内就为用户呈现窗口内容。  

但对于一些复杂的需求却需要额外的处理才能满足需求，比如：系统设置子窗口，当用户完成某一项设置之后，要通知父窗口做出相应的改变。这是常见的父子窗口通信的需求。   

首先需要为主窗口的 webContents 注册 setWindowOpenHandler 方法。  

在 src/main/CommonWindowEvent.ts 中添加如下代码：  

```ts
mainWindow.webContents.setWindowOpenHandler((param) => {
  return { action: "allow", overrideBrowserWindowOptions: yourWindowConfig };
});
```

使用 setWindowOpenHandler 方法的回调函数返回一个对象，这个对象中 action: "allow" 代表允许窗口打开，如果你想阻止窗口打开，那么只要返回 {action: "deny"} 即可。  

返回对象的 overrideBrowserWindowOptions 属性的值是被打开的新窗口的配置对象。  

在渲染进程中打开子窗口的代码如下所示:  

```
window.open(`/WindowSetting/AccountSetting`);
```

window.open 打开新窗口之所以速度非常快，是因为用这种方式创建的新窗口不会创建新的进程。这也就意味着一个窗口崩溃会拖累其他窗口跟着崩溃（主窗口不受影响）。  

使用 window.open 打开的新窗口还有一个问题，这类窗口在关闭之后虽然会释放掉大部分内存，但有一小部分内存无法释放（无论你打开多少个子窗口，全部关闭之后总会有那么固定的一小块内存无法释放），这与窗口池方案的内存损耗相当。   

接下来介绍如何使用这个方案控制子窗口。  

##### 子窗口的标题栏消息  

自定义主窗口的标题栏 BarTop.vue，标题栏组件需要监听主进程发来的 windowMaximized 消息和 windowUnmaximized 消息，子窗口当然也希望复用这个组件，然而子窗口的窗口对象是在 Electron 内部创建的，不是开发者创建的，没有子窗口的窗口对象，该如何使用 regWinEvent 方法为子窗口注册最大化和还原事件呢？  

这就需要用到 app 对象的 browser-window-created 事件，代码如下：

```ts
// src/main/mainEntry.ts
app.on("browser-window-created", (e, win) => {
CommonWindowEvent.regWinEvent(win);
});
```

每当有一个窗口被创建成功后，这个事件就会被触发，主窗口和使用 window.open 创建的子窗口都一样，这个事件的第二个参数就是窗口对象。  

##### 动态设置子窗口的配置  

虽然可以在渲染进程中用 window.open 方法打开一个子窗口，但这个子窗口的配置信息目前还是在主进程中设置的（overrideBrowserWindowOptions），大部分时候要根据渲染进程的要求来改变子窗口的配置，所以最好的办法是由渲染进程来设置这些配置信息。  

在 CommonWindowEvent 类的 regWinEvent 方法增加一段逻辑，代码如下： 

```ts
// 注册打开子窗口的回调函数
    // @ts-ignore
    win.webContents.setWindowOpenHandler((param) => {
      // 基础窗口配置对象
      let config = {
        frame: false,
        show: true,
        parent: null,
        webPreferences: {
          nodeIntegration: true,
          webSecurity: false,
          allowRunningInsecureContent: true,
          contextIsolation: false,
          webviewTag: true,
          spellcheck: false,
          disableHtmlFullscreenWindowResize: true,
          nativeWindowOpen: true,
        },
      };
      // 开发者自定义窗口配置对象
      let features = JSON.parse(param.features);
      for (let p in features) {
        if (p === "webPreferences") {
          for (let p2 in features.webPreferences) {
            //@ts-ignore
            config.webPreferences[p2] = features.webPreferences[p2];
          }
        } else {
          //@ts-ignore
          config[p] = features[p];
        }
      }
      // @ts-ignore
      if (config["modal"] === true) config.parent = win;
      // 允许打开窗口，并传递窗口配置对象
      return {action: "allow", overrideBrowserWindowOptions: config};
    });
```

config 对象和主窗口的 config 对象基本上是一样的，所以最好把它抽象出来。  

param 参数的 features 属性是由渲染进程传过来的，是一个字符串，这里把它当作一个 JSON 字符串使用，这个字符串里包含着渲染进程提供的窗口配置项，这些配置项与 config 对象提供的基础配置项结合，最终形成了子窗口的配置项。  

如果配置项中 modal 属性的值为 true 的话，说明渲染进程希望子窗口为一个模态窗口，这时要为子窗口提供父窗口配置项：parent，这个配置项的值就是当前窗口。  

之所以把这段逻辑放置在 CommonWindowEvent 类的 regWinEvent 方法中，就是希望更方便地为应用内的所有窗口提供这项能力，如果不希望这么做，也可以把这段逻辑放置在一个独立的方法中。  

在 src/renderer/components/BarLeft.vue 中添加如下代码：  

```ts
const openSettingWindow = () => {
  const config = { modal: true, width: 2002, webPreferences: { webviewTag: false } };
  window.open(`/WindowSetting/AccountSetting`, "_blank", JSON.stringify(config));
};
```

window.open 方法的第三个参数官方定义为一个逗号分割的 key-value 列表，但这里把它变成了一个 JSON 字符串，这样做主要是为了方便地控制子窗口的配置对象。  

使用 window.open 打开新窗口速度非常快，所以这里直接让新窗口显示出来了 config.show = true。如果你需要在新窗口初始化时完成复杂耗时的业务逻辑，那么你也应该手动控制新窗口的显示时机。  

##### 封装子窗口加载成功的事件  

现在遇到了一个问题：不知道子窗口何时加载成功了，注意这里不能单纯地使用 window 对象的 onload 事件或者 document 对象的 DOMContentLoaded 事件来判断子窗口是否加载成功了。因为这个时候你的业务代码（比如从数据库异步读取数据的逻辑）可能尚未执行完成。  

所以，要自己封装一个事件，在业务代码真正执行完成时，手动发射这个事件，告知主窗口：“现在子窗口已经加载成功啦，你可以给我发送消息了！”  

在封装这个事件前，先来把 window.open 打开子窗口的逻辑封装到一个 Promise 对象中，如下代码所示：  

src/renderer/common/Dialog.ts  

```ts
export const createDialog = (url: string, config: any): Promise<Window> => {
  return new Promise((resolve, reject) => {
    const windowProxy = window.open(url, '_blank', JSON.stringify(config));
    const readyHandler = (e: any) => {
      let msg = e.data;
      if (msg['msgName'] === '__dialogReady') {
        window.removeEventListener('message', readyHandler);
        resolve(windowProxy as Window);
      }
    };
    window.addEventListener('message', readyHandler);
  })
};
```

当渲染进程的某个组件需要打开子窗口时，可以使用 Dialog.ts 提供的 createDialog 方法。  

在这段代码中，把 window.open 的逻辑封装到一个 Promise 对象中，通过 window.open 打开子窗口后，当前窗口马上监听 message 事件，子窗口有消息发送给当前窗口时，这个事件将被触发。  

在message事件的处理函数中完成了下面三个工作:  

* e.data 里存放着具体的消息内容，把它格式化成一个 JSON 对象。  
* 如果这个 JSON 对象的 msgName 属性为 __dialogReady 字符串，就成功 resolve。  
* Promise 对象成功 resolve 之前要移除掉 message 事件的监听函数，避免内存泄漏（如果不这么做，用户每打开一个子窗口，就会注册一次message事件）。  

window.open方法返回的是目标窗口的引用，可以使用这个引用对象向目标窗口发送消息，或执行其他相关操作。  

Dialog.ts 并非只导出了 createDialog 这么一个方法，它还导出了 dialogReady 方法，代码如下所示：  

```ts
export const dialogReady = (): void => {
  const msg = { msgName:  '__dialogReady' };
  window.opener.postMessage(msg);
};
```

这个方法是为子窗口服务的，当子窗口完成了必要的业务逻辑之后，就可以执行这个方法，通知父窗口自己已经加载成功。  

这个方法通过 window.opener 对象的 postMessage 方法向父窗口发送了一个消息，这个消息的内容是一个 JSON 对象，这个 JSON 对象的msgName属性为 __dialogReady 字符串。  

父窗口收到子窗口发来的这个消息后，将触发 message 事件，也就会执行在 createDialog 方法中撰写的逻辑了。  

##### 父子窗口互相通信  

使用 createDialog 方法返回的对象向子窗口发送消息，想要接收子窗口发来的消息，只要监听 window 对象的 message 事件即可，代码如下所示： 

src/renderer/components/BarLeft.vue  

```ts
const openSettingWindow = async () => {
  const config = {modal: false, width: 2002, webPreferences: {webviewTag: false}};
  const dialog = await createDialog('/WindowSetting/AccountSetting', config);
  const msg = { msgName: "hello", value: "msg from your parent" };
  window.addEventListener("message", (e) => {
  console.log(e.data);
  });
  dialog?.postMessage(msg);
};
```

子窗口发送消息给父窗口的代码如下所示：

src/renderer/window/WindowSetting.vue  

```ts
import { onMounted } from "vue";
import { dialogReady } from "../common/Dialog";
onMounted(() => {
  console.log("ready", Date.now());
  window.addEventListener("message", (e) => {
    console.log(e.data);
    window.opener.postMessage({ msgName: "hello", value: "I am your son." });
  });
  dialogReady();
});
```

相对于使用 ipcRender 和 ipcMain 的方式完成窗口间通信来说，使用这种方式完成跨窗口通信有以下几项优势：  

* 消息传递与接收效率都非常高，均为毫秒级。  
* 开发更加简单，代码逻辑清晰，无需跨进程中转消息。  

## Pinia 管理应用状态  

相比 Vuex，Pinia 的优势主要是：  

* 没有 mutations，相应的工作都在 actions 中完成，actions 直接支持异步函数。  
* 完美支持 TypeScript，Vuex 在这方面做得不是很好。  
* 对开发工具支持友好，，Pinia 对调试工具（vue-devtools）也支持友好。  
* 不需要再使用名称空间来控制 store，也不需要再考虑 store 的嵌套问题。  
* 性能优于 Vuex。  

### 安装 Pinia  

```shell
npm i pinia -D
```  

修改渲染进程入口文件，加载 Pinia 插件：

src/renderer/main.ts  

```ts
import {createApp} from 'vue';
import {router} from './router';
import { createPinia } from "pinia";
import App from './App.vue';
import './style.css';
import "./assets/icon/iconfont.css";

createApp(App).use(createPinia()).use(router).mount('#app');
```

### 创建 Store  

在 src/renderer/store 目录下新建 index.ts，创建第一个 Store 程序，代码如下： 

```ts
import { defineStore } from 'pinia';
import { Ref, ref } from 'vue';
import { ModelChat } from '../../model/ModelChat';

// mock data
const prepareData = () => {
  let result = [];
  for (let i = 0; i < 10; i++) {
    let model = new ModelChat();
    model.fromName = '聊天对象' + i;
    model.sendTime = '昨天';
    model.lastMsg = '这是此会话的最后一条消息' + i;
    model.avatar = 'https://pic3.zhimg.com/v2-306cd8f07a20cba46873209739c6395d_im.jpg?source=32738c0c';
    result.push(model);
  }
  return result;
};

export const useChatStore = defineStore('chat', () => {
  let data: Ref<ModelChat[]> = ref(prepareData());
  const selectItem = (item: ModelChat) => {
    if (item.isSelected) return;
    data.value.forEach((v) => (v.isSelected = false));
    item.isSelected = true;
  };
  return { data, selectItem };
});
```

通过 export 暴露 useChatStore 方法，这个方法通过 Pinia 的 defineStore 方法创建，在 Vue 业务组件中执行这个函数实例才会得到真正的 Store。  

使用 defineStore(name, callback) 的形式创建 Store，这种形式的 Store 叫作 Setup Stores。Pinia 还提供了另一种形式的 Store ：Option Stores，具体可以参阅 Pinia 的官方文档。   

这个 Store 的状态数据存储在：data 属性中，这是一个被 Ref 对象包裹着的数组，数组里的内容是通过 prepareData 方法模拟的（模拟了十个聊天会话对象）。  

这个 Store 还提供了一个 actions 方法：selectItem，这个方法用于选中某个具体的聊天会话。  

### 数据模型  Model

聊天会话的数据模型是在 src/model 目录下定义的，因为应用的主进程和渲染进程都可能会用到数据模型，所以把它放置在 renderer 和 main 的同级目录下。  

新建 src/model/ModelChat.ts，如下所示：   

```ts
import { ModalBase } from './ModalBase';

export class ModelChat extends ModalBase {
  fromName?: string;
  sendTime?: string | number;
  isSelected = false;
  lastMsg?: string;
  avatar?: string;
  // 0 单聊，1 群聊，2 公众号，3 文件传输助手
  chatType?: number;
}
```

模型主要用于描述对象携带的信息，由于所有的模型都会拥有一些共同的字段，所以把这些字段放置在模型的基类 ModelBase 中。  

新建 src/model/ModelBase.ts，如下所示：   

```ts
import crypto from 'crypto';

export class ModalBase {
  id: string;
  constructor() {
    this.id = crypto.randomUUID();
  }
}
```

暂时只提供了一个公共字段：id，凡继承于 ModelBase 的子类都将拥有这个字段，而且这个字段是随模型实例化的时候自动创建的。  

只有 new ModelXXXX 时才会创建这个字段，let model = obj as ModelXXXX 时不会创建这个字段。  

使用 Node.js crypto 模块的 randomUUID 方法来生成每个聊天会话的 ID。   

### 使用 Store  

首先把模型中模拟的 10 个聊天会话显示在界面上，代码如下所示：  

src/renderer/window/WindowMain/chat/components/ChatBoard.vue   

```vue
<template>
  <div class="ChatList">
    <ChatSearch />
    <div class="ListBox">
      <ChatItem :data="item" v-for="item in store.data" :key="item.id" />
    </div>
  </div>
</template>

<script setup lang="ts">
import ChatItem from './ChatItem.vue';
import ChatSearch from './ChatSearch.vue';
import { onMounted } from 'vue';
import { useChatStore } from '../../../../store/useChatStore';

const store = useChatStore();

onMounted(() => {
  store.selectItem(store.data[6]);
});
</script>

<style scoped lang="scss">
.ChatList {
  width: 250px;
  display: flex;
  flex-direction: column;
  height: 100%;
  box-sizing: border-box;
}
.ListBox {
  background: rgb(230, 229, 229);
  background-image: linear-gradient(to bottom right, rgb(235, 234, 233), rgb(240, 240, 240));
  flex: 1;
  overflow-y: auto;
  box-sizing: border-box;

  border-right: 1px solid rgb(214, 214, 214);
}
</style>
```

通过 Vue 的 v-for 指令渲染了一个自定义组件列表（ChatItem）。  

store 对象是通过 useChatStore 方法获取的，useChatStore 方法就是前面介绍的 useChatStore.ts 导出的方法。得到 store 对象之后，可以直接使用 store.data 获取 Store 对象里的数据。

在当前组件 ChatBoard 渲染完成后，调用了 store 对象的 selectItem 方法，选中了第 7 个会话。  

具体每一个聊天会话对象是通过自定义组件的 data 属性传递到组件内部的。  

ChatItem 自定义组件的代码如下所示：  

src/renderer/window/WindowMain/chat/components/ChatItem.vue  

```vue
<template>
  <div @click="itemClick(data)" :class="['ChatItem', { 'ChatItemSelected': data.isSelected}]">
    <div class="avatar">
      <img :src="data.avatar" alt="" />
    </div>
    <div class="ChatInfo">
      <div class="row">
        <div class="FromName">{{ data.fromName }}</div>
        <div class="TimeName">{{ data.sendTime }}</div>
      </div>
      <div class="row">
        <div class="LastMsg">{{ data.lastMsg }}</div>
        <div class="subscribe" />
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ModelChat } from '../../../../../model/ModelChat';
import { useChatStore } from '../../../../store/useChatStore';
defineProps<{data: ModelChat}>();
const store = useChatStore();
const itemClick = (item: ModelChat) => {
  store.selectItem(item);
};
</script>

<style scoped lang="scss">
.ChatItem {
  display: flex;
  height: 66px;
  box-sizing: border-box;
  cursor: pointer;
  &:hover {
    background: rgb(221, 219, 218);
  }
}
.ChatItemSelected {
  background: rgb(196, 196, 196);
  &:hover {
    background: rgb(196, 196, 196);
  }
}
.avatar {
  width: 66px;
  display: flex;
  align-items: center;
  justify-content: center;
  img {
    width: 46px;
    height: 46px;
  }
}
.ChatInfo {
  flex: 1;
  height: 66px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.row {
  box-sizing: border-box;
  height: 28px;
  line-height: 28px;
  display: flex;
}
.FromName {
  flex: 1;
}
.TimeName {
  color: rgb(153, 153, 153);
  padding-right: 12px;
  font-size: 12px;
}
.LastMsg {
  color: rgb(153, 153, 153);
  flex: 1;
  font-size: 12px;
}
</style>
```

使用 defineProps 方法接收父组件传来的数据。  

聊天会话对象里的数据在这个自定义组件中被展开，渲染给用户。  

当用户点击这个自定义组件的时候，程序执行了 Store 对象的 selectItem 方法，这个方法负责选中用户点击的组件，改变了用户点击组件的样式，同时还取消了原来选中的组件。   

### 订阅 Store   

无论是用户点击 ChatItem 组件选中一个聊天会话，还是 ChatBoard 渲染完成后选中一个聊天会话，都应该通知其他组件，选中的聊天会话变更了。  

在 MessageBoard 组件中演示这个功能，代码如下所示：   

src/renderer/window/WindowMain/chat/components/MessageBoard.vue  

```vue
<template>
  <div class="MessageBord">
    <BarTop />
    <div class="MessageList">{{ logInfo }}</div>
  </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import BarTop from '../../../../components/BarTop.vue';
import { useChatStore } from '../../../../store/useChatStore';
let store = useChatStore();
let logInfo = ref("");
let curId = "";
//订阅Store内数据的变化
store.$subscribe((mutations, state) => {
  let item = state.data.find((v) => v.isSelected);
  let id = item?.id as string;
  if (id != curId) {
    logInfo.value = `现在应该加载ID为${item?.id}的聊天记录`;
    curId = id;
  }
});
</script>

<style scoped lang="scss">
.MessageBord {
  height: 100%;
  display: flex;
  flex: 1;
  flex-direction: column;
}
.MessageList {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  background: rgb(245, 245, 245);
}
</style>
```

使用 store 对象的 $subscribe 方法订阅了数据变更事件，无论什么时候 store 内的数据发生了变化，都会执行 $subscribe 方法提供的回调函数。  

在订阅回调中，验证选中的会话是否发生了变化（有可能是当前 store 其他数据对象的变化触发了订阅回调），如果是，那么就给出提示。  

订阅回调函数有两个参数 ，第一个是 mutations 参数，这个参数的 events 属性携带着变更前的值和变更后的值，但这个属性只有在开发环境下存在，生产环境下不存在。订阅的第二个参数是 state，这个参数包含 store 中的数据。  

以这种方式更新 store 里的数据，不利于复用数据更新的逻辑，改用可以复用数据更新逻辑的方案。  

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/electron/img_8.png" alt="" width="700" />  

### 互访 Store   

新建一个模型类，代码如下所示：  

src/model/ModelMessage.ts  

```ts
import { ModalBase } from './ModalBase';

export class ModelMessage extends ModalBase {
  createTime?: number;
  receiveTime?: number;
  messageContent?: string;
  chatId?: string;
  fromName?: string;
  avatar?: string;
  // 是否为传入消息
  isInMsg?: boolean;
}
```

创建 useMessageStore，用于管理消息的状态数据，代码如下：  

src/renderer/store/useMessageStore.ts  

```ts
import { ModelChat } from '../../model/ModelChat';
import { ModelMessage } from '../../model/ModelMessage';
import { defineStore } from 'pinia';
import { ref, Ref } from 'vue';

export const useMessageStore = defineStore('message', () => {
  let data: Ref<ModelMessage[]> = ref([]);
  const msg1 = `醉里挑灯看剑，梦回吹角连营。八百里分麾下灸，五十弦翻塞外声。沙场秋点兵。马作的卢飞快，弓如霹雳弦惊。了却君王天下事，嬴得生前身后名。可怜白发生`;
  const msg2 = `怒发冲冠，凭栏处，潇潇雨歇。抬望眼，仰天长啸，壮怀激烈。 三十功名尘与土，八千里路云和月。莫等闲，白了少年头，空悲切！ 靖康耻，犹未雪；臣子恨，何时灭?驾长车，踏破贺兰山缺！ 壮志饥餐胡虏肉，笑谈渴饮匈奴血。待从头，收拾旧山河，朝天阙！`;
  const initData = (chat: ModelChat) => {
    let result = [];
    for (let i = 0; i < 10; i++) {
      let model = new ModelMessage();
      model.createTime = Date.now();
      model.isInMsg = i % 2 === 0;
      model.messageContent = model.isInMsg ? msg1 : msg2;
      model.fromName = model.isInMsg ? chat.fromName : "我";
      model.avatar = chat.avatar;
      model.chatId = chat.id;
      result.push(model);
    }
    data.value = result;
  };
  return { data, initData };
});
```

消息数据是模拟出来的，这里模拟了 10 条消息，预期用户切换会话的时候，执行 initData 方法，初始化当前会话的消息。  

修改一下 MessageBoard 组件的的代码，如下所示：  

src/renderer/window/WindowMain/chat/components/MessageBoard.vue  

```vue
<template>
  <div class="MessageBord">
    <BarTop />
    <div class="MessageList">
      <MessageItem :data="item" v-for="item in messageStore.data" :key="item.id"></MessageItem>
    </div>
  </div>
</template>

<script lang="ts" setup>
import BarTop from '../../../../components/BarTop.vue';
import { ModelChat } from '../../../../../model/ModelChat';
import { useMessageStore } from '../../../../store/useMessageStore';
import { useChatStore } from '../../../../store/useChatStore';
import MessageItem from './MessageItem.vue';

const chatStore = useChatStore();
const messageStore = useMessageStore();

let curId = '';

chatStore.$subscribe((mutations, state) => {
  const item = state.data.find(v => v.isSelected) as ModelChat;
  if (item?.id !== curId) {
    messageStore.initData(item);
    curId = item?.id;
  }
})
</script>

<style scoped lang="scss">
.MessageBord {
  height: 100%;
  display: flex;
  flex: 1;
  flex-direction: column;
}
.MessageList {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  background: rgb(245, 245, 245);
}
</style>
```

当选中的聊天会话切换时，执行 messageStore 对象的 initData 方法，这样就初始化了 messageStore 内部的状态数据。  

MessageItem 是新创建的一个 Vue 组件，这个组件用于显示一条消息的具体信息。代码如下所示：  

src/renderer/window/WindowMain/chat/components/MessageItem.vue   

```vue
<template>
  <template v-if="data.isInMsg">
    <div class="MessageItem left">
      <div class="avatar">
        <img :src="data.avatar" alt="" />
      </div>
      <div class="MessageBox">
        <div class="FromName">{{ data.fromName }}</div>
        <div class="MsgContent">{{ data.messageContent }}</div>
      </div>
    </div>
  </template>
  <template v-else>
    <div class="MessageItem right">
      <div class="MessageBox">
        <div class="MessageContent">{{ data.messageContent }}</div>
      </div>
      <div class="avatar">
        <img :src="data.avatar" alt="" />
      </div>
    </div>
  </template>
</template>

<script setup lang="ts">
import { ModelMessage } from '../../../../../model/ModelMessage';
defineProps<{ data: ModelMessage }>();
</script>

<style lang="scss" scoped>
.MessageItem {
  display: flex;
  padding-top: 8px;
  padding-bottom: 8px;
  position: relative;
}
.left {
  padding-right: 30%;
  &::after {
    width: 0;
    height: 0;
    border-top: 6px solid transparent;
    border-bottom: 6px solid transparent;
    border-right: 6px solid #fff;
    position: absolute;
    left: 60px;
    top: 38px;
    content: "";
  }
}
.right {
  padding-left: 30%;
  &::after {
    width: 0;
    height: 0;
    border-top: 6px solid transparent;
    border-bottom: 6px solid transparent;
    border-left: 6px solid rgb(149, 236, 105);
    position: absolute;
    right: 60px;
    top: 18px;
    content: "";
  }
  .MessageContent {
    background: rgb(149, 236, 105) !important;
  }
}
.avatar {
  width: 66px;
  text-align: center;
  img {
    width: 46px;
    height: 46px;
  }
}
.MessageBox {
  flex: 1;
}
.FromName {
  color: rgb(178, 178, 178);
  margin-bottom: 6px;
}
.MessageContent {
  background: #fff;
  border-radius: 3px;
  padding: 8px;
  line-height: 22px;
}
</style>
```

在切换选中的聊天会话时，直接初始化 messageStore 里的数据，就完全不需要在 MessageBord 组件里订阅 chatStore 的数据变更了。  

pinia 是支持这种操作的，现在修改一下useChatStore的代码，如下所示：  

```ts
import { defineStore } from 'pinia';
import { Ref, ref } from 'vue';
import { ModelChat } from '../../model/ModelChat';
import { useMessageStore } from './useMessageStore';

// mock data
const prepareData = () => {
  let result = [];
  for (let i = 0; i < 10; i++) {
    let model = new ModelChat();
    model.fromName = '聊天对象' + i;
    model.sendTime = '昨天';
    model.lastMsg = '这是此会话的最后一条消息' + i;
    model.avatar = 'https://pic3.zhimg.com/v2-306cd8f07a20cba46873209739c6395d_im.jpg?source=32738c0c';
    result.push(model);
  }
  return result;
};

export const useChatStore = defineStore('chat', () => {
  let data: Ref<ModelChat[]> = ref(prepareData());
  const selectItem = (item: ModelChat) => {
    if (item.isSelected) return;
    data.value.forEach((v) => (v.isSelected = false));
    item.isSelected = true;
    const messageStore = useMessageStore();
    messageStore.initData(item);
  };
  return { data, selectItem };
});
```

在 selectItem 方法内使用 messageStore 提供的方法。   

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/electron/img_9.png" alt="" width="700" />  

## 客户端数据库  

如何把应用内的业务数据持久化到用户本地磁盘上。  

对于简单的数据类型来说，可以直接把它们存储在 localStorage 中，这些数据是持久化在用户磁盘上的，不会因为用户重启应用或者重装应用而丢失。  

对于稍微复杂的数据类型来说，有两个选择，其一是把这类数据存储在 IndexedDB 中，与 localStorage 类似，这也是谷歌浏览器核心提供的数据持久化工具，它以 JSON 对象的方式存储数据，数据较多时，复杂的条件查询效率不佳。   

第二个选择就是把数据存储在 SQLite 中，这是一个关系型数据库，天生对复杂条件查询支持良好。   

### 安装 SQLite   

```shell
npm install better-sqlite3 -D  
```

这个模块安装完成后，大概率是无法使用这个模块的，可能会碰到如下报错信息：  

```shell
Error: The module '...node_modules\better-sqlite3\build\Release\better_sqlite3.node'
was compiled against a different Node.js version using
NODE_MODULE_VERSION $XYZ. This version of Node.js requires
NODE_MODULE_VERSION $ABC. Please try re-compiling or re-installing
the module (for instance, using `npm rebuild` or `npm install`).
```

这是因为 Electron 内置的 Node.js 的版本可能与你编译原生模块使用的 Node.js 的版本不同导致的。   

建议开发者使用 Electron 团队提供的 electron-rebuild 工具来完成此工作，因为 electron-rebuild 会确定 Electron 的版本号、Electron 内置的 Node.js 的版本号、以及 Node.js 使用的 ABI 的版本号，并根据这些版本号下载不同的头文件和类库。  

安装 electron-rebuild：   

```shell
npm install electron-rebuild -D
```

在 package.json 中增加如下配置节（scripts配置节）： 

```
"rebuild": "electron-rebuild -f -w better-sqlite3"
```

在工程根目录下执行如下指令：  

```shell
npm run rebuild
```

当你的工程下出现了这个文件 node_modules/better-sqlite3/build/Release/better_sqlite3.node，才证明 better_sqlite3 模块编译成功了，如果上述指令没有帮你完成这项工作，你可以把指令配置到 node_modules/better-sqlite3 模块内部再执行一次，一般就可以编译成功了（如下图所示）。  

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/electron/img_10.png" alt="" width="700" />  

这样就为 Electron 重新编译了一遍 better-sqlite3，现在就可以在 Electron 应用内使用 better-sqlite3 提供的 API 了。  

在应用中试试如下代码（渲染进程和主进程均可，甚至在渲染进程的开发者调试工具中也没问题），看是不是可以正确创建 SQLite 的数据库。  

```
const Database = require("better-sqlite3");
const db = new Database("db.db", { verbose: console.log, nativeBinding: "./node_modules/better-sqlite3/build/Release/better_sqlite3.node" });
```

不出意外的话，工程根目录下将会创建一个名为 db.db 的 SQLite 数据库文件，说明 better-sqlite3 库已经生效了。  

### 压缩安装包体积  

better-sqlite3 是一个原生模块，原生模块是无法被 vite 编译到 JavaScript 的，那为什么还要把它安装成开发依赖呢？  

把 better-sqlite3 安装成开发依赖，在功能上没有任何问题，electron-builder 在制作安装包时，会自动为安装包附加这个依赖（better-sqlite3 这个库自己的依赖也会被正确附加到安装包内）。  

但electron-builder 会把很多无用的文件（很多编译原生模块时的中间产物）也附加到安装包内。无形中增加了安装包的体积（大概 10M），如下图所示：  

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/electron/img_11.png" alt="" width="700" />  

在 plugins/buildPlugin.ts 中增加一个方法：   

```ts
async prepareSqlite() {
    // 拷贝 better-sqlite3
    const srcDir = path.join(process.cwd(), 'node_modules/better-sqlite3');
    const destDir = path.join(process.cwd(), 'dist', 'node_modules/better-sqlite3');
    fs.ensureDirSync(destDir);
    fs.copySync(srcDir, destDir, {
      filter: (src, dest) => {
        if (src.endsWith('better-sqlite3') || src.endsWith('build') || src.endsWith('Release') || src.endsWith('better_sqlite3.node')) {
          return true;
        } else return src.includes('node_modules\\better-sqlite3\\lib');
      }
    });
    let pkgJson = '{"name": "better-sqlite3","main": "lib/index.js"}';
    let pkgJsonPath = path.join(process.cwd(), 'dist', 'node_modules/better-sqlite3/package.json');
    fs.writeFileSync(pkgJsonPath, pkgJson);
    // 制作bindings模块
    const bindingPath = path.join(process.cwd(), 'dist', 'node_modules/bindings/index.js');
    fs.ensureDirSync(bindingPath);
    const bindingsContent = `module.exports = () => {
      let addonPath = require("path").join(__dirname, '../better-sqlite3/build/Release/better_sqlite3.node');
      return require(addonPath);
    };`;
    fs.writeFileSync(bindingPath, bindingsContent);
    pkgJson = '{"name": "bindings","main": "index.js"}';
    pkgJsonPath = path.join(process.cwd(), 'dist', 'node_modules/bindings/package.json');
    fs.writeFileSync(pkgJsonPath, pkgJson);
  }
```

这段代码主要做了两个工作：  

* 把开发环境的 node_modules/better-sqlite3 目录下有用的文件拷贝到 dist/node_modules/better-sqlite3 目录下，并为这个模块自制了一个简单的 package.json。  
* 完全自己制作了一个 bindings 模块，把这个模块放置在 dist/node_modules/bindings 目录下。  
* closeBundle 钩子函数中调用这个方法：buildObj.prepareSqlite()。  

这里 bindings 模块是 better-sqlite3 模块依赖的一个模块，它的作用仅仅是确定原生模块文件 better_sqlite3.node 的路径。  

接下来再修改一下 BuildObj的preparePackageJson 方法，在生成 package.json 文件之前，为其附加两个生产依赖，代码如下：  

```ts
localPkgJson.dependencies['better-sqlite3'] = '*';
localPkgJson.dependencies['bindings'] = '*';
```

有了这两个配置，electron-builder 就不会自动安装这些模块了。  

完成这些工作后，在 closeBundle 钩子函数中调用这个方法： buildObj.prepareSqlite()，再打包看看，安装包的体积是否变小了呢？  

### 安装 Knex.js  

成功引入 better-sqlite3 并且压缩了 better-sqlite3 模块在安装包的体积后，面临着另一个问题需要解决。  

使用 better-sqlite3 读写数据库中的数据时，要书写 SQL 语句，这种语句是专门为数据库准备的指令，下面是为 sqlite 数据库建表和在对应表中完成增删改查的 SQL 语句：  

```
create table admin(username text,age integer);
insert into admin values('allen',18);
select * from admin;
update admin set username='allen001',age=88 where username='allen' and age=18;
delete from admin where username='allen001';
```

使用 Knex.js 可以来完成对应的操作，Knex.js 允许使用 JavaScript 代码来操作数据库里的数据和表结构，它会把 JavaScript 代码转义成具体的 SQL 语句，再把 SQL 语句交给数据库处理，可以把它理解为一种 SQL Builder。  

```shell
npm install knex -D
```

打包之前编译这个库，代码如下所示：  

plugins/buildPlugin.ts  

```ts
prepareKnex() {
    let pkgJsonPath = path.join(process.cwd(), 'dist', 'node_modules/knex');
    fs.ensureDirSync(pkgJsonPath);
    require('esbuild').buildSync({
      entryPoints: ['./node_modules/knex/knex.js'],
      bundle: true,
      platform: 'node',
      format: 'cjs',
      minify: true,
      outfile: './dist/node_modules/knex/index.js',
      external: ['oracledb', 'pg-query-stream', 'pg', 'sqlite3', 'tedious', 'mysql', 'mysql2', 'better-sqlite3'],
    });
    let pkgJson = `{"name": "bindings","main": "index.js"}`;
    pkgJsonPath = path.join(process.cwd(), 'dist', 'node_modules/knex/package.json');
    fs.writeFileSync(pkgJsonPath, pkgJson);
  }
```

相对于压缩 better-sqlite3 的体积来说，压缩 Knex.js 包的体积就简单多了，仅仅是通过 esbuild 工具编译了一下这个包的代码就完成了工作。  

这段代码有以下几点需要注意。

* 配置项 external 是为了避免编译过程中 esbuild 去寻找这些模块而导致编译失败，也就是说 Knex.js 中这样的代码会保持原样输出到编译产物中： require('better-sqlite3')。  
* package.json 增加一个生产依赖：localPkgJson.dependencies['knex'] = '*';，以避免 electron-builder 安装 Knex.js 模块。  
* closeBundle 钩子函数中调用这个方法：buildObj.prepareKnex()。  

### 访问数据库  

新建数据库 db，数据库中有两张表 Message 和 Chat，截图是 Chat 表的列：  

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/electron/img_12.png" alt="" width="700" />  

数据库设计好之后，创建一个数据库访问类，由于主进程的逻辑和渲染进程的逻辑都有可能会访问数据库，所以把数据库访问类放置在 src/common 目录下，方便两个进程的逻辑代码使用这个类，代码如下：  

src/common/db.ts  

```ts
import knex, { Knex} from 'knex';
import fs from 'fs';
import path from 'path';

let dbInstance: Knex;

// @ts-ignore
if (!dbInstance) {
  let dbPath = process.env.APPDATA || `${process.env.HOME}${process.platform === 'darwin' ? '/Library/Preferences' : '/.local/share'}`;
  dbPath = path.join(dbPath, 'Electron');
  const dbIsExist = fs.existsSync(dbPath);
  if (!dbIsExist) {
    console.log(process.execPath)
    const resourceDbPath = path.join(process.execPath, '../resources/db.db');
    fs.copyFileSync(resourceDbPath, dbPath);
  }
  dbInstance = knex({
    client: 'better-sqlite3',
    connection: { filename: dbPath },
    useNullAsDefault: true,
  })
}

export let db = dbInstance;
```

导出一个数据库访问对象，只有第一次引入这个数据库访问对象的时候才会执行此对象的初始化逻辑，无论在多少个组件中引入这个数据库访问对象，它只会被初始化一次，但这个约束只局限在一个进程内，也就是说对于整个应用而言，主进程有一个 db 实例，渲染进程也有一个 db 实例，两个实例是完全不同的。   

由于渲染进程内的数据库访问对象和主进程内的数据库访问对象不是同一个对象，所以会有并发写入数据的问题，需要控制好你的业务逻辑，避免两个进程在同一时间写入相同的业务数据。  

SQLite 不支持并发写入数据，两个或两个以上的写入操作同时执行时，只有一个写操作可以成功执行，其他写操作会失败。并发读取数据没有问题。  

第一次初始化数据库链接对象时，会检查 MacintoshHD/用户/[yourOsUserName]/资源库/ApplicationSupport/[yourAppName]/db.db 文件是否存在，如果不存在，就从应用程序安装目录 MacintoshHD/用户/[yourOsUserName]/资源库/ApplicationSupport/[yourAppName]/resources/db.db 拷贝一份到该路径下，所以要提前把数据库设计好，基础数据也要初始化好，制作安装包的时候，把数据库文件打包到安装包里。    

通过为 plugins/buildPlugin.ts 增加配置来把数据库文件打包到安装包内的，其中关键的配置代码如下所示：  

```ts
// buildInstaller 方法内 option.config 的一个属性
extraResources: [{ from: `./src/common/db.db`, to: `./` }]
```

extraResources 可以让开发者为安装包指定额外的资源文件，electron-builder 打包应用时会把这些资源文件附加到安装包内，当用户安装应用程序时，这些资源会释放在安装目录的 resources/子目录下。   

为什么要把数据库文件拷贝再访问，不直接访问安装目录下的数据库文件呢？  

因为当用户升级应用程序时安装目录下的文件都会被删除，因为可能会在数据库中放置很多用户数据，这样的话每次升级应用用户这些数据就都没了。  

假定数据库是整个应用的核心组件，没有它，数据库应用程序无法正常运行，所以初始化数据库的逻辑都是同步操作（fs.copyFileSync），注意这类以 Sync 结尾的方法都是同步操作，它们是会阻塞 JavaScript 的执行线程的，也就是说在它们执行过程中，其他任何操作都会处于阻塞状态。  

在应用程序开发调试阶段，开发者可以先把设计好的数据库文件放置在目标路径 MacintoshHD/用户/[yourOsUserName]/资源库/ApplicationSupport/[yourAppName] 下。   

db.ts 文件导出的是一个 Knex 类型的对象，初始化这个对象时，传入一个配置对象，配置对象的 client 属性代表着使用什么模块访问数据库，这里要求 Knex 使用 better-sqlite3 访问数据库，Knex 支持很多数据库，比如 MySql、Oracle、SqlServer 等，都有对应的数据库访问模块。  

由于 SQLite 是一个客户端数据库，所以只要把数据库的本地路径告知 Knex 即可，这个属性是通过配置对象的 connection 属性提供的。配置对象的 useNullAsDefault 属性告知 Knex 把开发者未明确提供的数据配置为 Null。  

接下来尝试使用这个数据库访问对象把 Chat 表的数据检索出来，代码如下所示：

src/renderer/main.ts

```ts
import { db } from "../common/db";
db("Chat")
.first()
.then((obj) => {
console.log(obj);
});
```

首先创建一个数据库连接对象 db，接着使用这个对象读取 Chat 表里的第一行记录，数据读取成功后把这行数据打印到控制台。   

### 数据库基本操作  

#### 增加数据  

增加一条数据：   

src/renderer/window/WindowMain/Contact.vue  

```ts
const insertData = async () => {
  let model = new ModelChat();
  model.fromName = "聊天对象";
  model.sendTime = Date.now();
  model.lastMsg = "这是此会话的最后一条消息";
  model.avatar = `https://pic3.zhimg.com/v2-306cd8f07a20cba46873209739c6395d_im.jpg?source=32738c0c`;
  await db("Chat").insert(model);
};
```

如果要在同一张表中增加多行数据，那么可以直接把一个数组提交给数据库：  

```ts
const insertMultiData = async () => {
  let result = [];
  for (let i = 0; i < 10; i++) {
    let model = new ModelChat();
    model.fromName = "聊天对象" + i;
    model.sendTime = Date.now();
    model.lastMsg = "这是此会话的最后一条消息" + i;
    model.avatar = `https://pic3.zhimg.com/v2-306cd8f07a20cba46873209739c6395d_im.jpg?source=32738c0c`;
    result.push(model);
  }
  result[5].isSelected = true;
  await db("Chat").insert(result);
};
```

#### 查询数据  

```ts
const selectData = async () => {
  let data = await db("Chat").where({ id: `256d6532-fcfe-4b81-a3f8-ee940f2de3e3` }).first();
  console.log(data);
};
```

#### 修改数据  

```ts
const updateData = async () => {
  let data = await db("Chat").update({ fromName: "三岛由纪夫", lastMsg: "就在刀刃猛然刺入腹部的瞬间，一轮红日在眼睑背面粲然升了上来。" }).where({ id: `256d6532-fcfe-4b81-a3f8-ee940f2de3e3` });
  console.log(data);
};
```
需要使用 where 方法确定更新范围，不然整个表的数据都将被修改 (数据库操作返回的值 data 为受影响的行数)  。

#### 删除数据   

```ts
let deleteData = async () => {
  let data = await db("Chat").where({ id: `256d6532-fcfe-4b81-a3f8-ee940f2de3e3` }).delete();
  console.log(data);
};
```

需要使用 where 方法确定删除范围，不然整个表的数据都将被删除（数据库操作返回的值 data 为受影响的行数）。  

#### 事务  

数据库的事务是一个操作序列，包含了一组数据库操作指令。  

事务把这组指令作为一个整体向数据库提交操作请求，这一组数据库命令要么都执行，要么都不执行，是一个不可分割的工作逻辑单元。  

```ts
const transaction = async () => {
  try {
    await db.transaction(async (trx) => {
      let chat = new ModelChat();
      chat.fromName = "聊天对象aaa";
      chat.sendTime = Date.now();
      chat.lastMsg = "这是此会话的最后一条消息";
      chat.avatar = `https://pic3.zhimg.com/v2-306cd8f07a20cba46873209739c6395d_im.jpg?source=32738c0c`;
      await trx("Chat").insert(chat);
      // throw "throw a error";
      let message = new ModelMessage();
      message.fromName = "聊天对象";
      message.chatId = chat.id;
      message.createTime = Date.now();
      message.isInMsg = true;
      message.messageContent = "这是我发给你的消息";
      message.receiveTime = Date.now();
      message.avatar = `https://pic3.zhimg.com/v2-306cd8f07a20cba46873209739c6395d_im.jpg?source=32738c0c`;
      await trx("Message").insert(message);
    });
  } catch (error) {
    console.error(error);
  }
};
```

把两个插入操作封装到了一个事务中，两个插入操作要么都成功执行，要么一个也不执行，可以把 throw "throw a error" 语句取消注释，观察一下数据库的数据更新情况。  

db.transaction 方法的回调函数中 trx 就是 Knex 封装的数据库事务对象。   

#### 分页查询  

分页从数据库中获取数据。  

```ts
import { ref, Ref } from 'vue';

// 当前是第几页
let currentPageIndex: Ref<number> = ref(0);
// 每页数据行数
let rowCountPerPage: Ref<number> = ref(6);
// 总页数
let pageCount: Ref<number> = ref(-1);

// 获取某一页数据
const getOnePageData = async () => {
  let data = await db('Chat')
    .orderBy('sendTime', 'desc')
    .offset(currentPageIndex.value * rowCountPerPage.value)
    .limit(rowCountPerPage.value);
  console.log(data);
}

// 获取第一页数据
const getFirstPage = async () => {
  if (pageCount.value === -1) {
    // @ts-ignore
    let { count } = await db('Chat').count('id as count').first();
    count = count as number;
    pageCount.value = count / rowCountPerPage.value as number;
  }
  currentPageIndex.value = 0;
  await getOnePageData();
}

// 获取下一页数据
const getNextPage = async () => {
  currentPageIndex.value = currentPageIndex.value + 1 >= pageCount.value ? Math.ceil(pageCount.value) - 1 : currentPageIndex.value + 1;
  await getOnePageData();
}

// 获取上一页数据
const getPrevPage = async () => {
  currentPageIndex.value = currentPageIndex.value - 1 < 0 ? 0 : currentPageIndex.value - 1;
  await getOnePageData();
}

// 获取最后一页数据
const getLastPage = async () => {
  currentPageIndex.value = Math.ceil(pageCount.value) - 1;
  await getOnePageData();
}
```

* 获取第一页数据时，初始化总页数和当前页码数，总页数是通过数据库中的总行数除以每页行数得到的，这个值有可能包含小数部分。当前页码数是从零开始的整数。第一页时，它的值为 0。  

* 获取下一页数据时，判断当前页码数是不是到达了最后一页，如果没有，那么就把当前页码数加 1，考虑到总页数存在小数的可能，所以最后一页的当前页码数应为：Math.ceil(pageCount) - 1。Math.ceil() 函数返回大于或等于一个给定数字的最小整数。 Math.ceil(6.11) 的结果为 7，Math.ceil(6) 的结果为 6。  

* 获取上一页数据时，判断当前页码数是不是小于 0，如果是，就把当前页码数置为 0，如果不是就把当前页码数减一。  

* 获取最后一页数据时，把当前页码数置为 Math.ceil(pageCount) - 1 即可。  

* 每次获取数据都调用 getOnePageData 方法。这个方法中需要注意 offset 和 limit 方法的使用，offset 方法是跳过 n 行的意思，limit 方法是确保返回的结果中不多于 n 行的意思。当最后一页数据不足 rowCountPerPage（值为 6）时，就返回数据库表中剩余的所有数据。  

* 分页获取数据最好提供明确的排序规则：注意 orderBy 的使用。  

* 在实际的桌面应用中一般不会要求用户点击上一页、下一页等按钮分页获取数据，大部分情况都是根据滚动条滚动时的触底或触顶事件来触发数据获取的逻辑，从数据库中读取数据的逻辑还是大同小异的，都是一页一页读取的。   

## 开发原生模块  

Node.js 允许开发者使用 C、C++ 等语言开发原生模块。并且遵循此方案开发出的原生模块可以像普通的 Node.js 模块一样通过 require() 函数加载，并使用 JavaScript 访问模块提供的 API。  

Node.js 具备原生模块的能力还有以下原因：  

* 性能提升： JavaScript 是解释型语言，相对于系统级语言来说性能上还是略有不足。  
* 节约成本：有很多现成的 C/C++ 项目，在 Node.js 项目中直接复用这些项目可以节约很多开发成本。  
* 能力拓展：Node.js 不是万能的，需要 C/C++ 的能力来辅助完成。   

如何在 Electron 应用中使用原生模块？   

### 搭建开发环境  

一种方式是通过 Node-API 开发原生模块，Node-API 是专门用于构建原生模块，它独立于底层 JavaScript 运行时，并作为 Node.js 的一部分进行维护。  

它是跨 Node.js 版本的应用程序二进制接口（Application Binary Interface，ABI），旨在将原生模块与底层实现隔离开，并允许为某个 Node.js 版本编译的模块在更高版本的 Node.js 上运行而无需重新编译。   

不同版本的 Node.js 使用同样的接口为原生模块提供服务，这些接口是 ABI 化的，只要 ABI 的版本号一致，编译好的原生模块就可以直接使用，不需要重新编译。    

基于 Node-API 开发原生模块仍存在两种方式。  

一种方式就是使用 C 语言开发，由于 Node-API 就是用 C 语言封装的，所以这种方法更为直接，由于 C 语言过于简单直接，语言特性较少，所以开发起来非常麻烦。     

另一种方式是基于 node-addon-api 使用 C++ 语言开发，node-addon-api 项目是对 Node-API 的 C++ 再包装，这种方式可以精简很多代码。  

全局安装 node-gyp 工具，它是专门为构建开发、编译原生模块环境而生的跨平台命令行工具。  

```shell
npm install -g node-gyp  
```

新建一个 Node.js 项目，安装 node-addon-api:  

src 目录下新建文件夹 native。  

初始化 Node.js 项目：  

```shell
npm init -y
```

```shell
npm install node-addon-api
```

创建原生模块配置文件 binding.gyp:  

```
{
  "targets": [
    {
      "cflags!": ["-fno-exceptions"],
      "cflags_cc!": ["-fno-exceptions"],
      "defines": ["NAPI_DISABLE_CPP_EXCEPTIONS"],
      "target_name": "addon",
      "include_dirs": ["<!(node -p \"require('node-addon-api').include_dir\")"],
      "sources": ["export.cc"],
      "conditions": [
        [
          'OS=="mac"',
          {
            "sources": ["clipboard.mm"],
            "link_settings": {
              "libraries": ["-framework Cocoa", "-framework CoreFoundation"]
            },
            "xcode_settings": {
              "GCC_ENABLE_CPP_EXCEPTIONS": "YES",
              "CLANG_ENABLE_OBJC_ARC": "YES",
              "OTHER_CFLAGS": ["-ObjC++", "-std=c++17"]
            }
          }
        ],
        [
          'OS=="win"',
          {
            "sources": ["clipboard.cc"],
            "libraries": ["Shlwapi.lib", "Shcore.lib"],
            "msvs_settings": {
              "VCCLCompilerTool": {
                "AdditionalOptions": ["/std:c++17"]
              }
            }
          }
        ]
      ]
    }
  ]
}
```

* include_dirs 配置 node-addon-api 项目提供的 C++ 头文件所在路径。   
* defines、cflags_cc!、 cflags!起到禁用 C++ 异常的作用（注意，如果选择禁用 C++ 异常，那么 node-addon-api 框架将不再为开发者处理异常，需要自己检查异常）。   
* sources 指向这个原生模块的入口文件。    
* target_name 为原生模块的名称。   

### 读取剪切板文件路径   

Electron 公开的剪切板 API 是无法读取剪切板内多个文件的路径的，开发一个原生模块来补全 Electron 在这方面的不足。

创建原生模块的入口文件：   

src/native/export.cc

```
#include <napi.h>
#include <tuple>
#include "clipboard.h"

Napi::Array ReadFilePathsJs(const Napi::CallbackInfo &info)
{
    auto env = info.Env();
    const auto file_paths = ReadFilePaths();
    auto result = Napi::Array::New(env, file_paths.size());
    for (size_t i = 0; i != file_paths.size(); ++i)
    {
        result.Set(i, file_paths[i]);
    }
    return result;
}

Napi::Object Init(Napi::Env env, Napi::Object exports)
{
    exports.Set("readFilePaths", Napi::Function::New(env, ReadFilePathsJs));
    return exports;
}

NODE_API_MODULE(NODE_GYP_MODULE_NAME, Init);
```

* NODE_API_MODULE 定义此原生模块的入口函数，一旦 Node.js 加载该模块时，将执行 Init 方法，NODE_GYP_MODULE_NAME 宏展开后为编译配置文件 binding.gyp 中的 target_name。  

* Init 方法是这个模块的入口函数，这个函数包含两个参数，第一个是 JavaScript 运行时环境对象，第二个是模块的导出对象（也就是 module.exports），给这个对象设置属性，以导出想要暴露给外部的内容，此处导出了 ReadFilePathsJs 方法，当外部调用此方法时，将执行 ReadFilePathsJs 函数。入口函数退出时应把 exports 对象返回给调用方。   

* ReadFilePathsJs 方法执行时调用方会传入一个 CallbackInfo 类型的参数，它是一个由 Node.js 传入的对象，该对象包含 JavaScript 调用此方法时的输入参数，可以通过这个对象的 Env 方法获取 JavaScript 运行时环境对象。  

* ReadFilePathsJs 方法内，调用了 ReadFilePaths 方法，这个方法在 clipboard.h 中定义，它返回一个字符串容器（std::vector<std::string>类型），这个容器中的内容就是剪切板内的文件路径。  

* 把这个容器中的内容逐一复制到一个数组中（Napi::Array 类型，这个类型可以直接被 JavaScript 访问），最后把这个数组返回给调用者。   

定义 clipboard.h 头文件内容: 

src/native/clipboard.h  

```
#ifndef CLIPBOARD_H
#define CLIPBOARD_H

#include <vector>
#include <string>

std::vector<std::string> ReadFilePaths();

#endif
```

定义方法：ReadFilePaths，在不同平台下读取剪切板的实现逻辑不同，所以要为这个头文件完成两个实现逻辑。clipboard.cc 是 Windows 平台上的实现。clipboard.mm 是 Mac 平台上的实现逻辑。   

Windows 平台上的实现逻辑： 

src/native/clipboard.cc  

```
#include <Windows.h>
#include <ShlObj.h>
#include <memory>
#include "clipboard.h"

// 宽字符串转UTF8字符串
std::string Utf16CStringToUtf8String(LPCWSTR input, UINT len)
{
    int target_len = WideCharToMultiByte(CP_UTF8, 0, input, len, NULL, 0, NULL, NULL);
    std::string result(target_len, '\0');
    WideCharToMultiByte(CP_UTF8, 0, input, len, result.data(), target_len, NULL, NULL);
    return result;
}

//  RAII（Resource Acquisition Is Initialization）类
class ClipboardScope
{

    bool valid;

public:
    ClipboardScope()
    {
        valid = static_cast<bool>(OpenClipboard(NULL));
    }
    ~ClipboardScope()
    {
        CloseClipboard();
    }

    bool IsValid()
    {
        return valid;
    }
};

//读取剪切板内的文件路径
std::vector<std::string> ReadFilePaths()
{
    auto result = std::vector<std::string>();
    ClipboardScope clipboard_scope;
    if (!clipboard_scope.IsValid())
    {
        return result;
    }
    HDROP drop_files_handle = (HDROP)GetClipboardData(CF_HDROP);
    if (!drop_files_handle)
    {
        return result;
    }
    UINT file_count = DragQueryFileW(drop_files_handle, 0xFFFFFFFF, NULL, 0);
    result.reserve(file_count);
    for (UINT i = 0; i < file_count; ++i)
    {
        UINT path_len = DragQueryFileW(drop_files_handle, i, NULL, 0);
        UINT buffer_len = path_len + 1;
        std::unique_ptr<WCHAR[]> buffer(new WCHAR[buffer_len]);
        path_len = DragQueryFileW(drop_files_handle, i, buffer.get(), buffer_len);
        result.emplace_back(Utf16CStringToUtf8String(buffer.get(), path_len));
    }
    return result;
}
```

* OpenClipboard 之后要对应的关闭操作 CloseClipboard，把这两个操作封装到了一个对象中：clipboard_scope，这个对象初始化时，执行 OpenClipboard 操作，对象释放时，执行 CloseClipboard 操作，这是使用 C++ 开发常见的 RAII（Resource Acquisition Is Initialization）开发技巧。   

* 通过 Windows API 获取到的文件路径是宽字节字符串，需要把这个字符串转化成 UTF8 格式的字符串才能被 JavaScript 使用，上述代码中 Utf16CStringToUtf8String 方法就是完成这个任务的。   

* 如果剪切板内没有文件路径，就返回一个空容器，如果有文件路径，就把所有的文件路径都放置到容器中返回给调用者。    

Mac 平台上的实现逻辑：

src/native/clipboard.mm   

```
#import <Foundation/Foundation.h>
#import <Cocoa/Cocoa.h>
#include "clipboard.h"

std::vector<std::string> ReadFilePaths() {
    NSPasteboard *pasteboard = [NSPasteboard generalPasteboard];
    NSArray<NSURL *> *urls = [pasteboard readObjectsForClasses:@[NSURL.class] options:@{
            NSPasteboardURLReadingFileURLsOnlyKey: @YES,
    }];
    if (!urls) {
        return {};
    }
    auto result = std::vector<std::string>();
    result.reserve(urls.count);
    for (NSURL *url in urls) {
        result.emplace_back([url.path UTF8String]);
    }
    return result;
}
```

### 编译原生模块   

如何实现在 Windows 环境下，编译 src/native/clipboard.cc 源码，在 Mac 环境下编译 src/native/clipboard.mm？   

编译配置文件：src/native/binding.gyp 最后一个配置节提供了配置能力。这个配置节的作用是在操作系统不同时（'OS=="mac"'），指定不同的源码文件（sources）、依赖库（libraries）和编译工具（msvs_settings、xcode_settings）。   

现在执行如下指令来生成构建工程：

```shell
node-gyp configure
```

构建好工程之后，尝试使用如下命令来编译这个原生模块。   

```shell
node-gyp build
```

如果在命令行环境中看到彩色的 gyp info ok 这行信息，说明原生模块已经编译成功了，它被放置在 build/Release/addon.node 路径下。   

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/electron/img_13.png" alt="" width="700" />   

接下来写一段 JavaScript 代码，测试一下这个原生模块。  

```js
//src\native\test.js
let native = require("./build/Release/addon.node");
let paths = native.readFilePaths();
console.log(paths);
```

先复制几个文件，然后使用如下命令执行这个测试脚本：   

```shell
node test.js
```

看看你复制的文件路径是不是已经打印到控制台上了呢？   

上面编译出的原生模块不一定能在 Electron 应用中正常工作。这是因为 Electron 内置的 Node.js 的版本可能与你编译原生模块使用的 Node.js 的版本不同。如果在 Electron 工程内使用原生模块时，碰到如下错误：    

```
Error: The module '/path/to/native/module.node'
was compiled against a different Node.js version using
NODE_MODULE_VERSION $XYZ. This version of Node.js requires
NODE_MODULE_VERSION $ABC. Please try re-compiling or re-installing
the module (for instance, using `npm rebuild` or `npm install`).
```

则说明你使用的原生模块与 Electron 的 ABI 不匹配，此时就要针对 Electron 内置的 ABI 来编译你的原生模块。  

使用方法与编译 SQLite 原生模块时相同，如下指令所示：   

```shell
electron-rebuild -f -m ./src/native
```

现在编译出的原生模块就可以在 Electron 工程下正常使用了。   

## 应用升级方案   

产品在第一次上线后，开始进入迭代期，开发者会为产品增加新的功能，修复 Bug，随之就会推出新版本，怎么把新版本的产品分发给用户就成为了一个产品经理和开发人员都关注的问题。   

市面上常见的产品升级方式有两种:  

* 全量升级，这种升级方式要求用户重新安装新版本的产品，在安装新版本前，安装程序会把老版本的产品卸载掉，以达到升级的目的。这种方式最大的优点就是升级得比较彻底，不会受老版本产品的任何影响。可是如果开发者仅仅修改了一两个文件，就要让用户重新安装一遍产品的话，用户体验不好。  
* 增量升级，这种升级方式只升级开发者修改过的内容，升级内容少，过程迅速，如果升级内容不涉及关键业务的话，还可以做到用户无感升级。  

### 全量升级   

使用 electron-updater 模块来完成升级功能，安装这个模块：  

```shell
npm install electron-updater -D
```

创建 Updater.ts 封装 Updater 类:  

src/main/Updater.ts

```ts
import { dialog } from 'electron';
import { autoUpdater} from 'electron-updater';

export class Updater {
  static check() {
    autoUpdater.checkForUpdates();
    autoUpdater.on('update-downloaded', async () => {
      await dialog.showMessageBox({
        message: '有可用的升级',
      });
      autoUpdater.quitAndInstall();
    });
  }
}
```

Updater 类提供了一个方法 check，在这个方法中，让 autoUpdater 对象检查服务端是否存在新版本的安装包，并监听 update-downloaded 事件。   

一旦 autoUpdater 发现服务端存在更新的安装包，则会把安装包下载到用户本地电脑内，当新版本安装包下载完成后，update-downloaded 事件被触发。此时提醒用户“有可用的升级”，用户确认后就退出当前应用并安装新的安装包。   

在升级过程有以下几点需要注意:  

* 升级服务的地址是在制作安装包时，通过 config.publish.url 指定的，这个路径指向新版本安装包所在的服务器目录。  

src/plugins/buildPlugin.ts  

```ts
publish: [{ provider: "generic", url: "http://localhost:5500/" }]
```

* 当完成新版本的开发工作后，要把 release 目录下的 [your_project_name] Setup [your_project_version].exe 和 latest.yml 两个文件上传到第 1 点中指定的服务器地址下（这是 Windows 平台下的工作）。Mac 平台下要把 release 目录下的 [your_project_name]-[your_project_version]-mac.zip、[your_project_name]-[your_project_version].dmg 和 latest-mac.yml 三个文件上传到指定的服务器地址下。  

* 产品版本是通过 package.json 中的 version 属性指定的，产品的安装包的版本也是在这里指定的。  

* 通过 dialog.showMessageBox 提醒用户升级程序实在称不上美观，这里应该发消息给渲染进程，让渲染进程弹出一个更漂亮的升级提醒窗口。用户做出选择后，再由渲染进程发消息给主进程，再执行 autoUpdater.quitAndInstall 逻辑。  

* 在 app ready 事件发生之后再调用 Updater.check() 方法，而且应该在生产环境下调用，因为在开发环境下调用它没有任何意义，electron-updater库会给出如下错误提示：  

src/main/mainEntry.ts   

```ts
import {app, BrowserWindow} from 'electron';
import {CustomScheme} from "./CustomScheme";
import { Updater } from "./Updater";
import {CommonWindowEvent} from "./CommonWindowEvent";

process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';
let mainWindow: BrowserWindow;
app.on("browser-window-created", (e, win) => {
  CommonWindowEvent.regWinEvent(win);
});
app.whenReady().then(() => {
  let config = {
    frame: false,
    show: false,
    webPreferences: {
      nodeIntegration: true,
      webSecurity: false,
      allowRunningInsecureContent: true,
      contextIsolation: false,
      webviewTag: true,
      spellcheck: false,
      disableHtmlFullscreenWindowResize: true,
      nativeWindowOpen: true,
    },
  };
  mainWindow = new BrowserWindow(config);
  mainWindow.webContents.openDevTools({mode: 'undocked'});
  if (process.argv[2]) {
    mainWindow.loadURL(process.argv[2]);
  } else {
    CustomScheme.registerScheme();
    mainWindow.loadURL('app"//index.html');
    // Updater.check();
  }
  CommonWindowEvent.listen();
});
```

```
Skip checkForUpdatesAndNotify because application is not packed
```
* 最好让升级服务地址下始终有一个安装包和相应的配置文件，不然 checkForUpdates 方法会报错。  

* latest.yml 的文件内包含如下几个信息：新版本安装文件的版本号、文件名、文件的 sha512 值、文件大小、文件生成时间、执行新版本安装文件时是否需要管理员权限。   

当 autoUpdater.checkForUpdates() 方法执行时，会先请求这个 yml 文件，得到文件里的内容后，再拿此文件中的版本号与当前版本号对比，如果此文件中的版本号比当前版本号新，则下载新版本，否则就退出更新逻辑。  

当新版本安装包下载完成后，electron-updater 会验证文件的 sha512 值是否合法，yml 文件中包含新版本安装包的 sha512 值，electron-updater 首先计算出下载的新版本安装包的 sha512 值，然后再与 yml 文件中的 sha512 值对比，两个值相等，则验证通过，不相等则验证不通过。  

验证通过后 Electron 则使用 Node.js 的 child-process 模块启动这个新的安装文件，以完成应用程序升级工作。   

### 增量升级  

一般情况下会使用 asar 文件存储应用的业务逻辑代码，所以增量升级只要考虑更新这个文件即可。    

Electron 应用启动时，会首先加载主进程的入口文件，这个文件是在打包 Electron 应用时指定的。  

如下代码所示：  

src/plugins/buildPlugin.ts   

```ts
localPkgJson.main = "mainEntry.js";
```

假设这个文件（mainEntry.js）没有具体的业务功能逻辑，而是只完成这样的逻辑：判断一下当前用户环境中是否存在一个新版本的 asar 文件，如果有，就直接加载新版本 asar 文件中的业务代码（假设叫 mainLogic.js）；如果没有，就加载当前 asar 文件中的业务代码 mainLogic.js。注意：mainEntry.js 和 mainLogic.js 都存在于 asar 文件中。   

你可能会担心一个 asar 文件中的 js 代码是不是可以调用另一个 asar 中的 js 代码，这是没问题的。   

如下代码可以正常执行，只要把 asar 当作一个目录即可，Electron 会完成具体的加载工作。  

```ts
let mainLogicPath = path.join(`c://yourNewVersion.asar`, "mainLogic.js");
let mainLogic = require(this.mainPath);
mainLogic.start();
```

按照这个逻辑，就可以每次升级只升级 asar 文件，而不必升级整个应用了。   

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/electron/img_14.png" alt="" width="700" />  

红色模块的逻辑是用户完成的，蓝色模块的逻辑都是在 mainEntry.js 中实现的，绿色模块的逻辑是在 mainLogic.js 文件中实现的。   

mainLogic.js 不单单有绿色模块描述的业务逻辑，还包括整个应用的其他主进程业务逻辑。  

在安装目录下的 asar 文件是一个完整应用的 asar 文件，它包括 mainEntry.js、mainLogic.js 和渲染进程的所有代码文件。  

升级目录下的 asar 文件也是一个完整应用的 asar 文件，它也包括 mainEntry.js、mainLogic.js 和渲染进程的所有代码文件，只不过 mainEntry.js 文件对于它来说是可有可无的。   

升级目录可以由开发者自己指定，推荐把这个目录指定为用户的 appData 目录下的一个子目录。  

下载保存时，要注意 asar 文件的命名规则。比如：main.2.3.6.18.asar，其中 2.3.6 是产品的版本号，把这个版本号叫作大版本号；18 是 asar 文件的版本号，把这个版本号叫小版本号。   

这样做有以下两个目的:   

* 当用户多次增量升级应用程序后，升级目录下就会有多个 asar 文件，以这种规则命名 mainEntry.js 就可以方便地找到哪个文件是最新的。假设安装目录下的 asar 文件的版本号是 0，那么升级目录下的 asar 文件的版本号应该从版本号 1 开始。    

* 应对用户自己重新安装了一个老旧的安装包的情况，当升级目录下有 main.2.3.7.1.asar 文件、也有 main.2.3.6.1.asar 文件时，但当前用户安装的产品的版本号是 2.3.6 时，不应该加载这个 main.2.3.7.1.asar，而应该加载 main.2.3.6.1.asar.  

假设要考虑版本降级以应对版本发布后才发现了重大问题的场景，那么可以通过服务器给你的客户端发送一个指令，迫使你的客户端删除指定版本的 asar 文件，然后提示用户重启应用即可。  

用户启动应用后，发现服务端有新的 asar 文件，下载成功后，马上又要求用户重启，如果你担心这会影响用户体验，那你可以把检查并下载新版本 asar 的逻辑放在主窗口显示之前，只有在服务端没有新 asar 文件或服务端无法访问时才会显示主窗口。    

这样重启应用的逻辑也不需要用户确认了，即使客户端在没有网络的环境中，也可以正常运行。   

但这样做会增加应用首屏加载的时间，不过开发者还可以加一个 splash window 以提升用户体验。   

asar 文件不会太大，也就几兆，带给用户的负担更小，用户体验更好。  

## 调试线上应用   

（：请转移到公司提供的 windows 电脑上进行调试，毕竟把电脑玩坏了不用自掏腰包。  

* 按默认配置生成的 Electron 应用不具备源码保护能力，先解析线上 Electron 应用的业务代码。  
* 解析出的业务代码，一般都是压缩过的，可读性比较差，分析如何调试线上应用的业务代码。  
* 分析 Electron 应用的崩溃报告，应对一些难以调试的问题。   

### 业务代码解析  

默认情况下，electron-builder 会把 HTML、CSS 和 JavaScript 代码以及相关的资源打包成 asar 文件嵌入到安装包中（就是安装目录下的 app.asar 文件），再分发给用户。  

asar 是一种特殊的存档格式，它可以把大批的文件以一种无损、无压缩的方式连接在一起，并提供随机访问支持。   

全局安装 asar 工具：   

```shell
npm install asar -g
```

安装好工具后，打开应用的安装目录，在 resources 子目录下找到 app.asar 文件，通过如下命令列出该文件内部包含的文件信息：  

```shell
asar list app.asar
```

如果想看 app.asar 包中的某个文件的内容，可以通过如下命令把该文件释放出来：      

```shell
asar ef app.asar entry.js
```

这样 entry.js 就会出现在 app.asar 同级目录下了，如果释放文件失败，提示如下错误：   

```
internal/fs/utils.js:307
throw err;
Error: EPERM: operation not permitted, open 'entry.js'
90m    at Object.openSync (fs.js:476:3)39m
90m    at Object.writeFileSync (fs.js:1467:35)39m
```

可能是因为你的应用程序正在运行，app.asar 文件被占用了导致的，退出应用程序再次尝试，如果还是无法释放目标文件，可以考虑把 app.asar 拷贝到另一个目录下再释放。   

如果希望一次性把 app.asar 内的文件全部释放出来，可以使用如下指令：  

```
asar e app.asar
```

### 生产环境调试

把 asar 文件中的业务代码解析出来之后，这些业务代码都是压缩过的，可读性比较差，要想通过这些代码文件分析线上应用的业务逻辑是非常困难的，所以最好还是能想办法调试这些业务代码才行。   

通过如下命令启动一个线上 Electron 应用：   

```shell
D:\\yourApp\\yourProductName.exe --inspect=7676 --remote-debugging-port=7878
```

这个命令在启动 Electron 应用程序时，为目标程序指定了两个端口号，一个是通过--inspect 指令指定的，一个是通过--remote-debugging-port 指令指定的，接下来要根据这两个端口号获取调试地址。   

打开谷歌浏览器，访问如下两个地址：  

```shell
http://127.0.0.1:7676/json
http://127.0.0.1:7878/json
```

这两个地址均会响应 JSON 字符串，响应结果是一个对应着主进程的调试信息，示例如下：  

```
{
"description": "node.js instance",
"devtoolsFrontendUrl": "devtools://devtools/bundled/js_app.html?experiments=true&v8only=true&ws=127.0.0.1:7676/85ac5529-d1a5-49b3-8655-f71c7c198b71",
"devtoolsFrontendUrlCompat": "devtools://devtools/bundled/inspector.html?experiments=true&v8only=true&ws=127.0.0.1:7676/85ac5529-d1a5-49b3-8655-f71c7c198b71",
"faviconUrl": "https://nodejs.org/static/images/favicons/favicon.ico",
"id": "85ac5529-d1a5-49b3-8655-f71c7c198b71",
"title": "Node.js[25204]",
"type": "node",
"url": "file://",
"webSocketDebuggerUrl": "ws://127.0.0.1:7676/85ac5529-d1a5-49b3-8655-f71c7c198b71"
}
```

另一个对应着渲染进程的调试信息，示例如下：

```
{
"description": "",
"devtoolsFrontendUrl": "/devtools/inspector.html?ws=127.0.0.1:7878/devtools/page/AFCF98D56EE8462C3D8E52FA99C02F91",
"id": "AFCF98D56EE8462C3D8E52FA99C02F91",
"title": "Vite App",
"type": "page",
"url": "app://./index.html",
"webSocketDebuggerUrl": "ws://127.0.0.1:7878/devtools/page/AFCF98D56EE8462C3D8E52FA99C02F91"
}
```

这两个响应中最重要的信息就是 devtoolsFrontendUrl，得到此信息后，要把它们转换为如下的格式：

```
devtools://devtools/bundled/js_app.html?experiments=true&v8only=true&ws=127.0.0.1:7676/e9c9b139-a606-4703-be3f-f4ffc496a6aa

devtools://devtools/bundled/inspector.html?ws=127.0.0.1:7878/devtools/page/33DFD3D347C1B575DC6361CC61ABAEDE
```

这个转换过程是一个简单的字符串替换，如果你嫌麻烦也可以用如下代码进行替换：   

```
devtoolsFrontendUrl.replace(/^\/devtools/, "devtools://devtools/bundled");
```

把转换后的地址放入谷歌浏览器中，将得到如下图所示结果，可以试着在对应的源文件中下一个断点试试看。   

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/electron/img_16.png" alt="" width="700" />   

如果目标应用的源码是压缩过的，可以尝试点击调试器右下角的 {} 按钮美化代码，查看美化后的代码，这样就可以更方便地下断点调试了。    

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/electron/img_17.png" alt="" width="700" />   

通过这种方法只能调试市面上一部分基于 Electron 开发的应用，并不是所有的基于 Electron 开发的应用都能使用这种方法调试。  

### 分析崩溃报告  

分析调试业务代码主要目的是追踪业务代码的问题，但有些问题是不会给我们追踪的机会的，比如那些偶发的、一旦出现应用程序就立即 Crash 的问题。要解决这些问题就要掌握分析 Electron 应用崩溃报告的知识。   

如果你希望你的应用程序崩溃时，自动保存崩溃报告文件，那么你就要在你的应用程序中使用如下代码收集崩溃报告：   

```
import { crashReporter } from "electron";
crashReporter.start({ submitURL: "", uploadToServer: false });
```

有了这段代码，当应用程序崩溃时，就会产生一个.dmp 扩展名结尾的文件（存放于 C://Users/[yourOsUserName]/AppData/Roaming/[yourAppName]/Crashpad）。  

首先需要安装 WinDbg 调试工具，如果你在安装 Windows 10 SDK 时勾选了 Debugging Tools For Windows，那么 WinDbg 已经在如下目录内了，直接使用即可：  

C://Program Files (x86)/Windows Kits/10/Debuggers/x86   

如果没有，那么可以在如下地址下载安装：   

```
https://docs.microsoft.com/en-us/windows-hardware/drivers/debugger/debugger-download-tools
```

安装完成后，通过菜单 File->Symbol File Path 打开符号路径设置窗口，输入如下信息：  

```
SRV*d:\code\symbols\*https://msdl.microsoft.com/download/symbols;SRV*d:\code\symbols\*https://symbols.electronjs.org
```

这段配置中有三个关键信息，依次是符号文件的缓存路径、Windows 操作系统关键 dll 的符号服务器和 Electron 的符号服务器。   

设置完符号服务器之后，通过菜单 File->Open Crash Dump 打开刚刚生成的崩溃报告，接着就等待 WinDbg 加载对应的符号（WinDbg 会通过 Electron 符号服务器下载与崩溃报告对应的 Electron 版本的符号文件，并保存在缓存目录中以备下次使用）。  

接着再在命令窗口的底部输入 !analyze -v 指令开始分析崩溃报告。   

加载完成后 WinDbg 会在窗口中显示崩溃报告内部的信息：     

```
EXCEPTION_RECORD:  (.exr -1)
ExceptionAddress: 00007ff725996fac (electron!node::AsyncResource::CallbackScope::~CallbackScope+0x000000000013227c)
ExceptionCode: c0000005 (Access violation)
ExceptionFlags: 00000000
NumberParameters: 2
Parameter[0]: 0000000000000001
Parameter[1]: 0000000000000000
Attempt to write to address 0000000000000000
PROCESS_NAME:  electron.exe
WRITE_ADDRESS:  0000000000000000
ERROR_CODE: (NTSTATUS) 0xc0000005 - 0x%p            0x%p                    %s
EXCEPTION_CODE_STR:  c0000005
EXCEPTION_PARAMETER1:  0000000000000001
EXCEPTION_PARAMETER2:  0000000000000000

STACK_TEXT:
00000053`0abf82f0 00007ff7`275a0513 : 00001c69`00000000 00000053`0abf84d8 00008d04`5e11c7b4 00001c69`00000000 : electron!node::AsyncResource::CallbackScope::~CallbackScope+0x13227c
00000053`0abf84a0 00007ff7`275a0121 : 00008d04`5e11c7a4 00000053`0abf8690 00007ff7`2b7e55c0 0000452c`0087b1bb : electron!v8::Object::SlowGetInternalField+0x7f3
00000053`0abf84d0 00007ff7`26cacd53 : 00000000`00000000 00007ff7`26c1f112 00000000`00000000 00000000`06b96722 : electron!v8::Object::SlowGetInternalField+0x401
00000053`0abfcfe0 00007ff7`26652c61 : 00000000`00000000 00001c69`08042229 00001c69`c0cdb000 00001c69`08282125 : electron!v8::V8::ToLocalEmpty+0x2193
00000053`0abfd010 00007ff7`27720c24 : 00000000`00000000 00000000`00000000 00000053`0abfd068 00000000`00000000 : electron!v8::Value::ToString+0x2eef1
00000053`0abfd050 00007ff7`251fa720 : 00000000`00000000 00000000`00000000 00000000`00000000 00001c69`a5e82115 : electron!v8::internal::TickSample::Init+0x11a24
00000053`0abfd0d0 00007ff7`25ae571c : 00000000`00000000 00000053`0abfd218 00001c69`a5e80000 00000000`00000002 : electron!v8::Isolate::CreateParams::~CreateParams+0xce60
00000053`0abfd130 00001c69`000c6308 : 00000000`0d72ce44 00001c69`08942dd9 00000000`06b96722 00001c69`08582e0d : electron!v8_inspector::protocol::Binary::operator=+0x6f12c
00000053`0abfd188 00000000`0d72ce44 : 00001c69`08942dd9 00000000`06b96722 00001c69`08582e0d 00000000`0d72ce44 : 0x00001c69`000c6308
00000053`0abfd190 00001c69`08942dd9 : 00000000`06b96722 00001c69`08582e0d 00000000`0d72ce44 00001c69`0946344d : 0xd72ce44
00000053`0abfd198 00000000`06b96722 : 00001c69`08582e0d 00000000`0d72ce44 00001c69`0946344d 00001c69`088c2349 : 0x00001c69`08942dd9
00000053`0abfd1a0 00001c69`08582e0d : 00000000`0d72ce44 00001c69`0946344d 00001c69`088c2349 00001c69`08582e0d : 0x6b96722
00000053`0abfd1a8 00000000`0d72ce44 : 00001c69`0946344d 00001c69`088c2349 00001c69`08582e0d 00001c69`083d6e61 : 0x00001c69`08582e0d
00000053`0abfd1b0 00001c69`0946344d : 00001c69`088c2349 00001c69`08582e0d 00001c69`083d6e61 00001c69`08584a49 : 0xd72ce44
00000053`0abfd1b8 00001c69`088c2349 : 00001c69`08582e0d 00001c69`083d6e61 00001c69`08584a49 00000000`0000069c : 0x00001c69`0946344d
00000053`0abfd1c0 00001c69`08582e0d : 00001c69`083d6e61 00001c69`08584a49 00000000`0000069c 00000000`0000645c : 0x00001c69`088c2349
00000053`0abfd1c8 00001c69`083d6e61 : 00001c69`08584a49 00000000`0000069c 00000000`0000645c 00001c69`08942dd9 : 0x00001c69`08582e0d
00000053`0abfd1d0 00001c69`08584a49 : 00000000`0000069c 00000000`0000645c 00001c69`08942dd9 00000000`000000e8 : 0x00001c69`083d6e61
00000053`0abfd1d8 00000000`0000069c : 00000000`0000645c 00001c69`08942dd9 00000000`000000e8 00001c69`08605fed : 0x00001c69`08584a49
00000053`0abfd1e0 00000000`0000645c : 00001c69`08942dd9 00000000`000000e8 00001c69`08605fed 00000000`00000000 : 0x69c
00000053`0abfd1e8 00001c69`08942dd9 : 00000000`000000e8 00001c69`08605fed 00000000`00000000 00001c69`08942de9 : 0x645c
00000053`0abfd1f0 00000000`000000e8 : 00001c69`08605fed 00000000`00000000 00001c69`08942de9 00001c69`088c2349 : 0x00001c69`08942dd9
00000053`0abfd1f8 00001c69`08605fed : 00000000`00000000 00001c69`08942de9 00001c69`088c2349 00000053`0abfd2c8 : 0xe8
00000053`0abfd200 00000000`00000000 : 00001c69`08942de9 00001c69`088c2349 00000053`0abfd2c8 00007ff7`25a7ed0f : 0x00001c69`08605fed


SYMBOL_NAME:  electron!node::AsyncResource::CallbackScope::~CallbackScope+13227c
MODULE_NAME: electron
IMAGE_NAME:  electron.exe
STACK_COMMAND:  ~0s ; .ecxr ; kb
FAILURE_BUCKET_ID:  NULL_POINTER_WRITE_c0000005_electron.exe!node::AsyncResource::CallbackScope::_CallbackScope
OSPLATFORM_TYPE:  x64
OSNAME:  Windows 10
FAILURE_ID_HASH:  {3f18c3a4-c6fc-f39e-d02b-f38f7b21394d}
Followup:     MachineOwner
```

上面这段错误信息分为两部分，一部分是 EXCEPTION_RECORD 节，其中 ExceptionAddress 是崩溃产生时的代码执行地址。  

这里面的信息为：错误发生在一个异步回调方法内（electron!node::AsyncResource::CallbackScope），ExceptionCode 是 Windows API 中 GetLastError 获取到的错误码（c0000005 Access violation，访问被禁止）。  

Windows 定义了很多错误码，如果你在调试崩溃报告时，遇到了不一样的错误码，可以在这个页面查询错误码的具体含义：docs.microsoft.com/en-us/windo… 。   

接下来还有一行错误：Attempt to write to address 0000000000000000，说明程序试图在某个内存地址写入信息时出错。   

另一部分是 STACK_TEXT 节，这个节显示的是堆栈信息，也就是崩溃前 C++ 代码的执行情况，在这里可以看到更明确的错误现场，其中有 7 行是与 V8 引擎执行有关的信息，说明代码发生在 JavaScript 脚本执行期间。  

使用 WinDbg 分析崩溃报告设置比较烦琐，为此社区内有人专门开发了一个崩溃报告分析工具：electron-minidump 。   

这个工具会自动帮开发者下载符号文件，执行分析指令。

## 其它  

### 应用程序安装目录   

使用 electron-builder 打包应用时设置了不允许用户修改应用程序安装目录，那么应用程序会安装在用户的如下目录中：  

```
64 位应用程序的安装目录：C:\Program Files\\[yourAppName]
32 位应用程序的安装目录：C:\Program Files (x86)\\[yourAppName]
```

应用程序安装目录下的文件及其功用如下所示：   

```
应用程序的安装目录
├─ locales（Electron的多国语言文件）
│ │ ├─ en-GB.pak（英国英语）
│ │ ├─ en-US.pak（美国英语）
│ │ ├─ zh-CN.pak（简体中文）
│ │ ├─ zh-TW.pak（繁体中文）
│ │ ├─ .....（其他国家语言文件，一般情况下可以删除）
├─ resources（应用程序资源及编译后的源码）
│  ├─ app.asar（编译后的源码压缩文档）
│  ├─ app.asar.unpacked（编译后的源码未压缩文档）
│  ├─ app（如果没有app.asar或app.asar.unpacked，则编译后源码文档在此目录下）
│  ├─ app-update.yml（应用程序升级相关的配置文件）
│  ├─ .....（通过electron-builder配置的其他的额外资源）
├─ swiftshader（图形渲染引擎相关库）
├─ yourApp.exe（应用程序可执行文件，其实就是electron.exe修改图标和文件名后得来的）
├─ UnInstall yourApp.exe（卸载应用程序的可执行文件）
└─ ......（其他Electron应用程序使用的二进制资源）
```

Electron 应用在 Mac 操作系统上安装之后，会以 app 应用的形式出现在用户的应用程序目录下，右击菜单的显示包内容来查看应用程序的目录结构：  

```
应用程序.app
├─ Contents（根目录）
│ │ ├─ _CodeSignature（存放应用程序的签名信息）
│ │ ├─ Frameworks（存放Electron相关的二进制资源）
│ │ ├─ Info.plist（应用程序的配置文件，包含应用程序名称、id、图标以及底层接口权限的信息）
│ │ ├─ Resources（应用程序资源及编译后的源码）
│ │ │ ├─ app-update.yml（应用程序升级相关的配置文件）
│ │ │ ├─ app.asar（编译后的源码压缩文档）
│ │ │ ├─ app.asar.unpacked（编译后的源码未压缩文档）
│ │ │ ├─ app（如果没有app.asar或app.asar.unpacked文件，则编译后源码文档在此目录下）
│ │ │ ├─ ...（Electron内置的多国语言文件）
└─└─└─ ...（通过electron-builder配置的其他的额外资源）
```

### 应用程序缓存目录  

用户第一次启动 Electron 应用后，Electron 会在如下目录创建相应的缓存文件，该目录的文件结构及功能说明如下：  

C://Users/[yourOsUserName]/AppData/Roaming/[yourAppName]  
  
```
├─ IndexedDB（Electron应用渲染进程IndexedDB数据存放目录）
├─ Local Storage（Electron应用渲染进程Local Storage数据存放目录）
├─ Session Storage（Electron应用渲染进程Session Storage数据存放目录）
├─ Crashpad（Electron应用崩溃日志数据存放目录）
├─ Code Cache（Electron应用渲染进程源码文件缓存目录，wasm的缓存也会存在此处）
├─ Partitions（如果你的应用中适应了自定义协议，或根据字符串产生了session，此目录将有相应的内容）
├─ GPUCache（Electron应用渲染进程GPU运行过程产生的缓存数据）
└─ ......（其他Electron渲染进程缓存文件）
```

Mac 操作系统下的缓存目录为：

MacintoshHD/用户/[yourOsUserName]/资源库/ApplicationSupport/[yourAppName]   

该目录下的内容与子目录结构跟 Windows 操作系统类似。  

虽然以上目录内的文件都是加密存储的，但只要把这个目录下的文件拷贝到另一台机器上，就可以用一个伪造的 Electron 程序读取到这些缓存文件内的数据。   

客户端数据库文件也是存放在这个目录下的。   

Electron 提供了一个便捷的 API 来获取此路径，此方法执行时会判断当前应用正运行在什么操作系统上，然后根据操作系统的名称返回具体的路径地址。   

```ts
app.getPath("userData");
```

### 窗口钉在桌面上   

使用 electget 库，安装并在主进程代码中引入：  

```ts
// import electget from "electget";
electget.preventFromAeroPeek(win);
electget.preventFromShowDesktop(win);
electget.moveToBottom(win);
```

这时窗口就可以“钉”在桌面上了。  

为了更完美地满足需求，最好监控一下窗口聚焦事件，当用户聚焦窗口时，把窗口移至最底层：  

```ts
app.on("browser-window-focus", (e, win: BrowserWindow) => {
  if (win.id != mainWindow.id) return;
  electget.moveToBottom(mainWindow);
});
```

这样做可以避免在用户与窗口交互后，被钉住的窗口浮到其他窗口之上。  

### 文件重新上传  

开发者在上传文件之前，把文件路径记录下来，重新上传文件时，直接用文件路径构造一个 File 对象，然后再上传到服务端。  

使用文件路径构造 File 对象的代码如下所示：  

```ts
let extname = path.extname(filePath);
let buffer = await fs.promises.readFile(filePath);
let file = new window.File([Uint8Array.from(buffer)], path.basename(filePath), {
  type: this.ext2type[extname], //mimetype类似"image/png"
});
```

这种方法要把整个文件的内容都读出来放到 buffer 里，小文件还好，遇到大文件就极其消耗用户的内存了，而且 V8 并不会及时释放这块内存。   

更好的方案是一块一块读文件的内容，然后再附加到 POST 请求内。  

有一个开源库 —— form-data，可以大大简化这方面的工作。  

把 form-data 引入工程内后，可以使用如下代码构造上传表单，用这种方法上传文件就是分片上传的。  

```ts
var FormData = require("form-data");
var fs = require("fs");
var form = new FormData();
form.append("yourFile", fs.createReadStream("/your/file/path.7z"));
form.submit("http://yourFileService.com/upload");
```

如果要开发取消上传、显示文件上传进度等功能，可以参考如下代码：   

```ts
new Promise((resolve, reject) => {
  let req = formData.submit(params, (err, res) => {
    const body = [];
    res.on("data", (chunk) => {
      body.push(chunk);
    });
    res.on("end", () => {
      let resString = Buffer.concat(body).toString();
      let resObj = JSON.parse(resString);
      eventer.off("setXhrAbort", abort);
      resolve(res);
    });
  });
  req.on("socket", () =>
    req.socket.on("drain", () => {
      let percent = parseInt((req.socket.bytesWritten / file.size) * 100);
      // 此处显示文件上传进度的逻辑
    })
  );
  let abort = () => {
    req.destroy();
    // 调用此方法结束文件上传
  };
});
```

## 总结  

🤪 今天不学习，明天变垃圾。

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/electron/img_15.png" alt="" width="700" />   
