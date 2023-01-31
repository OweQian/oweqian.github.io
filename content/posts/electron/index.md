---
title: "Electron + Vue3 桌面应用开发实战"
date: 2023-01-31T23:58:47+08:00
tags: ["连载", "第一技能"]
categories: ["第一技能"]
---

项目地址： [ElectronVue3](https://github.com/OweQian/ElectronVue3)  

## 构建开发环境  

按如下步骤搭建开发环境：  

<img src="/images/electron/img.png" alt="" width="500" />  

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

<img src="/images/electron/img_1.png" alt="" width="500" />  

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

<img src="/images/electron/img_2.png" alt="" width="500" />  

## 构建生产环境   

制作一个 Vite 插件。通过这个新的插件生成安装包，有了安装包就可以把应用分发给用户了。   

<img src="/images/electron/img_3.png" alt="" width="500" />  

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

<img src="/images/electron/img_4.png" alt="" width="300" />  

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

<img src="/images/electron/img_5.png" alt="" width="300" />  

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

<img src="/images/electron/img_6.png" alt="" width="500" />  
