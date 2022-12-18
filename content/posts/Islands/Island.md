---
title: "Island.js初探"
date: 2022-12-18T23:01:38+08:00
---

本系列基于神三元(抖音前端架构组)的小册《基于Vite的SSG框架开发实战》而总结的学习笔记。

Islands 架构是业界比较新的一个 SSR 架构趋势，相比于传统的 SSR 同构方案，会带来非常深度的性能优化。

## 环境搭建

* Chrome 浏览器
* Webstorm/VSCode 编辑器
* Node.js16 及以上版本

推荐使用 pnpm 作为项目的包管理工具，不仅安装速度快，还解决了依赖提升等安全问题。

全局安装：

```
npm i -g pnpm
```

## 框架体验

```
mkdir Island && cd Island
pnpm init -y
pnpm i islandjs -S
```

在 package.json 中添加命令：

```
{
  "scripts": {
    "dev": "island dev docs",
    "build": "island build docs",
    "preview": "island start docs"
  },
}
```

接着可以新建 docs/.island/config.ts 配置文件：

```
import { defineConfig } from "islandjs";

export default defineConfig({
  themeConfig: {
    nav: [
      {
        text: "Home",
        link: "/",
      },
    ],
    sidebar: {
      "/": [
        {
          text: "文章列表",
          items: [
            {
              text: "Fresh",
              link: "/article/fresh",
            },
            {
              text: "Astro",
              link: "/article/astro",
            },
          ],
        },
      ],
    },
  },
});
```

这样就配置好了站点的导航栏和侧边栏。

然后添加首页内容，新建docs/index.md:

```
---
pageType: home

hero:
  name: Island.js 模板
  text: React SSG 文档站
  tagline: 提供 React SSG 文档站模板
  image:
    src: /logo.png
    alt: Note
  actions:
    - theme: brand
      text: 点击查看
      link: /article/fresh
    - theme: alt
      text: GitHub
      link: https://github.com/sanyuan0704/island.js
features:
  - title: Feature 1
    details: Feature 1 的详细内容
    icon: 🪐
  - title: Feature 2
    details: Feature 2 的详细内容
    icon: 🧑🏻‍💻
  - title: Feature 3
    details: Feature 3 的详细内容
    icon: 🏃‍♂️
---
```

直接访问根路由(/)，就可以看到首页的效果出现了，并且点击按钮也能够正常地进行页面跳转，但还存在一个问题：图片资源并不能显示。

这是因为当前的图片路径 /logo.png 并不存在，新建docs/public目录，在里面加入logo.png图片，接着框架会自动在 public 目录寻找 logo.png，然后进行展示。

执行 pnpm build 来进行打包，产物会默认放到 docs/.island/dist 中。

打包完后，可以使用 pnpm preview 命令预览产物，可以看到如下的命令行信息：

```
> island start docs

Built site served at http://localhost:4173/
```

进入 http://localhost:4173/ 后，就可以查看生产环境下的页面内容了。

到目前为止，一个最基础的项目模板就被搭建起来了。

从头到尾没有编写一行前端组件或者样式的代码，仅仅通过少量的配置 + Markdown 内容，就把完整的页面呈现出来了。

<img src="/images/202212/img_17.png" alt="" width="500" />
