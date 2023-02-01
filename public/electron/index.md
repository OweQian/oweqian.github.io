# Electron + Vue3 桌面应用开发实战


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

## 管控应用窗口  

如何管控应用内的窗口，比如：什么时候显示窗口、如何通过自定义窗口标题栏来管控单个窗口等内容。  

### 主窗口显示时机   

在第一个窗口初始化的瞬间，会有一个黑窗口闪现一下，如下图所示：  

<img src="/images/electron/img_7.png" alt="" width="500" />  

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







