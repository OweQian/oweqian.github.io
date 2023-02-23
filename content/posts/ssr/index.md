---
title: "基于 Nextjs + Strapi 的官网开发实战"
date: 2023-02-20T11:25:47+08:00
tags: ["第一技能"]
categories: ["第一技能"]
featuredImage: "https://oweqian.oss-cn-hangzhou.aliyuncs.com/resource/next.png"
---

项目地址： [SSR](https://github.com/OweQian/SSR.git)  

<!--more-->

## 搭建 Client 项目

### 项目初始化   

先对项目进行初始化，Nextjs 提供了脚手架来帮助初始化项目，执行下面的命令：  

```shell
npx create-next-app@latest --typescript
```

next.config.js 是构建配置，底层是基于 Webpack 去打包的，在默认的配置上加上下面的配置来提供别名的能力：  

```js
/** @type {import('next').NextConfig} */
const path = require("path");

const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname),
    };
    return config;
  },
};

module.exports = nextConfig
```

tsconfig.json 中需要加一下对应的别名解析识别（baseurl , paths）。  

```json
{
  "compilerOptions": {
    "target": "es5",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "baseUrl": "./",
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}
```

执行

```shell
npm run dev
```  

注：如果出现以下错误，请将你的 node 版本升级到 18+。

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/ssr/img.png" alt="" width="700" />  

打开 http://localhost:3000 就可以看到一个默认服务器端渲染页面:  

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/ssr/img_1.png" alt="" width="700" />  

### 代码 Lint  

Nextjs 内置了开箱的 eslint 能力，不需要自己进行相关配置，可以执行下面的脚本来自动生成对应的 lint。  

```shell
npm run lint
```

### 模块化代码提示   

使用 sass 等超类来替代 css，相比 css，sass 等超类提供了变量定义和函数的能力，可以避免一些重复的 css 代码，使样式的可维护性和复用性更高。  

Nextjs 已经提供了对 css 和 sass 的支持，只需要安装一下 sass 的依赖即可:  

```shell
npm install sass --save-dev
```

针对一个大型项目，需要定义多级嵌套的组件来提高页面复用性，组件之间的样式命名很容易重复，针对非组件库的业务代码，通常会使用 css 模块化来进行相关的样式定义。  

模块化会在编译的时候将样式的类名加上对应唯一的哈希值来进行区分，从而解决样式类名重复的问题。  

Nextjs 已经内置了这部分能力，只需要将类名定义为 [name].module.scss。  

```tsx
import { FC } from 'react';
import styles from "./index.module.scss";

interface IProps {}

export const Demo: FC<IProps> = ({}) => {
  return (
    <div className={styles.demo}>
      <h1 className={styles.title}>demo</h1>
    </div>
  )
}
```

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/ssr/img_2.png" alt="" width="700" />  

### 服务端调试能力  

服务器渲染一个静态页面，请求会在服务端执行，将数据注入到页面中，意味着这部分逻辑并不在客户端执行，所以在服务端执行时，是不能直接用 Chrome 的 network 来调试，它只能调试直接在客户端执行的脚本。  

Nextjs 也有内置相关的调试能力来帮助进行调试，只需要为 dev 命令加一个 --inspect 的 node option 就行。  

首先来安装 cross-env 的依赖来支持跨平台的环境变量添加：   

```shell
npm install cross-env --save-dev
```

然后在 package.json 中，加一条 debugger 的命令：  

```json
{
  "scripts": {
    "dev": "next dev",
    "debugger": "cross-env NODE_OPTIONS='--inspect' next dev"
  }
}
```

执行

```shell
npm run debugger
``` 

重新打开 http://localhost:3000，可以看到一个绿色的 nodejs 的小图标，点开会打开一个新的 network，这个就是服务器端 server 的 network，服务器端执行的相关代码断点可以在上面进行调试。  

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/ssr/img_3.png" alt="" width="700" />  

## 实现页面链路  

主体上分为模板页面渲染、路由匹配和 header 修改三个模块，模板页面渲染是页面渲染的主要部分，包含了静态模板的生成和页面数据的注入，最后形成服务端返回的 HTML 文本。  

### 模板页面渲染  

#### 通用 layout  

web 应用的路由页面之间通常会有共同的页面元素，如页首、页尾。  

对于这种页面，通常会定义对应的组件在入口文件中引用，这样所有的页面就都可以有相同的页面组件了，不在需要在每个页面中去单独调用。  

在写页面之前，先安装类名库 classnames，它可以用函数式的方式来处理一些相对复杂的类场景，后续会有大量应用。  

```shell
npm install classnames --save
```

##### 页首组件  

client/components/navbar/index.tsx  

```tsx
import { FC } from 'react';
import styles from './index.module.scss';
import Image from 'next/image';
import LogoLight from '@/public/logo_light.png';

export interface INavBarProps {}

const NavBar: FC<INavBarProps> = ({}) => {
  return (
    <div className={styles.navBar}>
      <a href="http://localhost:3000/">
        <Image src={LogoLight} alt="" width={70} height={20} />
      </a>
    </div>
  )
}

export default NavBar;
```

client/components/navbar/index.module.scss   

```scss
.navBar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: hsla(0,0%,100%,.5);
  backdrop-filter: blur(8px);
  width: 100%;
  height: 64px;
  position: sticky;
  top: 0;
  left: 0;
  padding: 20px 32px;
  z-index: 100;
}
```

next/image 内置的 Image 标签，相比平常的 img 标签，会根据导入的图像来确认宽高，从而规避累积布局移位 (CLS) 的问题，可以在布局阶段提前进行相关区域预留位置，而不是加载中再进行移位。   

##### 页尾组件  

client/components/footer/index.tsx  

```tsx
import { FC } from 'react';
import Image from 'next/image';
import PublicLogo from '@/public/public_logo.png';
import styles from './index.module.scss';
import classNames from 'classnames';

interface ILink {
  label: string;
  link?: string;
}

interface ILinkList {
  title: string;
  list: ILink[];
}

interface IQRCode {
  image: string;
  text: string;
}

export interface IFooterProps {
  title: string;
  linkList: ILinkList[];
  qrCode: IQRCode;
  copyRight: string;
  siteNumber: string;
  publicNumber: string;
}

const Footer: FC<IFooterProps> = ({
  title,
  linkList,
  qrCode,
  copyRight,
  siteNumber,
  publicNumber,
}) => {
  return (
    <div className={styles.footer}>
      <div className={styles.topArea}>
        <h1 className={styles.footerTitle}>{title}</h1>
        <div className={styles.linkListArea}>
          {
            linkList?.map((item, index) => {
              return (
                <div className={styles.linkArea} key={index}>
                  <span className={styles.title}>{item?.title}</span>
                  <div className={styles.links}>
                    {
                      item?.list?.map((_item, _index) => {
                        return (
                          <div className={classNames({
                            [styles.link]: _item?.link,
                            [styles.disabled]: !_item?.link,
                          })} key={_index} onClick={(): void => {
                            _item?.link &&
                            window.open(
                              _item?.link,
                              "blank",
                              "noopener=yes,noreferrer=yes"
                            );
                          }}>
                            {_item?.label}
                          </div>
                        )
                      })
                    }
                  </div>
                </div>
              )
            })
          }
        </div>
      </div>
      <div className={styles.bottomArea}>
        <div className={styles.codeArea}>
          <div>
            <Image src={qrCode?.image} alt={qrCode?.text} width={56} height={56} />
          </div>
          <div className={styles.text}>{qrCode?.text}</div>
        </div>
        <div className={styles.numArea}>
          <span>{copyRight}</span>
          <span>{siteNumber}</span>
          <div className={styles.publicLogo}>
            <div className={styles.logo}>
              <Image src={PublicLogo} alt={publicNumber} width={20} height={20} />
            </div>
            <span>{publicNumber}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Footer;
```

client/components/footer/index.module.scss     

```scss
.footer {
  padding: 70px 145px;
  background-color: #f4f5f5;
  .topArea {
    display: flex;
    justify-content: space-between;

    .footerTitle {
      font-weight: 500;
      font-size: 36px;
      line-height: 36px;
      color: #333333;
      margin: 0;
    }

    .linkListArea {
      display: flex;
      .linkArea {
        display: flex;
        flex-direction: column;
        margin-left: 160px;
        .title {
          font-weight: 500;
          font-size: 14px;
          line-height: 20px;
          color: #333333;
          margin-bottom: 40px;
        }

        .links {
          display: flex;
          flex-direction: column;
          font-weight: 400;
          font-size: 14px;
          line-height: 20px;

          .link {
            color: #333333;
            cursor: pointer;
            margin-bottom: 24px;
          }

          .disabled {
            color: #666;
            cursor: not-allowed;
            margin-bottom: 24px;
          }
        }
      }
    }
  }

  .bottomArea {
    display: flex;
    justify-content: space-between;
    .codeArea {
      display: flex;
      flex-direction: column;
      .text {
        color: #666;
      }
    }
    .numArea {
      color: #666;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      font-weight: 400;
      font-size: 14px;
      line-height: 20px;

      span {
        margin-bottom: 12px;
      }

      .publicLogo {
        display: flex;

        .logo {
          margin-right: 4px;
        }
      }
    }
  }
}
```

##### layout 组件  

client/components/layout/index.tsx      

```tsx
import { FC } from 'react';
import type { IFooterProps } from '@/components/footer';
import Footer from '@/components/footer';
import type { INavBarProps } from '@/components/navbar';
import NavBar from '@/components/navbar';
import styles from './index.module.scss';

export interface ILayoutProps {
  navbarData: INavBarProps;
  footerData: IFooterProps;
}

const Layout: FC<ILayoutProps & {children: JSX.Element}> = ({
  navbarData, footerData, children
}) => {
  return (
    <div className={styles.layout}>
      <NavBar {...navbarData} />
      <main className={styles.main}>{children}</main>
      <Footer {...footerData} />
    </div>
  )
}

export default Layout;
```

client/components/layout/index.module.scss     

```scss
.layout {
  .main {
    min-height: calc(100vh - 560px);
  }
}
```

定义好 layout，把 layout 塞进入口文件，Nextjs 的入口文件是 pages下的 _app.tsx：  

```tsx
import '@/styles/globals.css'
import type { AppProps } from 'next/app';
import type { ILayoutProps } from '@/components/layout';
import Layout from '@/components/layout';

const MyApp = (data: AppProps & ILayoutProps) => {
  const {
    Component, pageProps, navbarData, footerData
  } = data;
  return (
    <div>
      <Layout navbarData={navbarData} footerData={footerData}>
        <Component {...pageProps} />
      </Layout>
    </div>

  )
}
export default MyApp;
```

### 数据注入  

在 Nextjs 中实现数据注入的方式分别是 getStaticProps、getServerSideProps 和 getInitialProps。  

* getStaticProps：多用于静态页面的渲染，只会在生产中执行，不会在运行时再次调用，意味着它只能用于不常编辑的部分，每次调整都需要重新构建部署，官网信息的时效性比较敏感，只会有少部分应用到 getStaticProps，但这并不意味着它没用，在一些特殊的场景下会有奇效。  
* getServerSideProps：只会执行在服务器端，不会在客户端执行。因为这个特性，所以客户端的脚本打包会较小，相关数据不会有在客户端暴露的问题，相对更隐蔽安全，不过逻辑集中在服务器端处理，会加重服务器的负担，服务器成本也会更高。  
* getInitialProps(推荐)：初始化时，如果是服务器端路由，数据的注入会在服务器端执行，对 SEO 友好，在实际的页面操作中，相关的逻辑会在客户端 执行，从而减轻了服务器端的负担。  

数据的注入都是针对页面的，也就是 pages 目录下，对组件进行数据注入是不支持的，所以应在页面中注入对应数据后再透传给页面组件。   

_app.tsx 是所有页面的入口页面，所以其它页面的参数也需要透传下来，可以用内置的 App 对象来获取对应组件本身的 pageProps，不要直接覆盖，对于非入口页面的普通页面，直接加上业务逻辑就可以：  

```tsx
import '@/styles/globals.css'
import type { AppProps, AppContext } from 'next/app';
import App from 'next/app';
import type { ILayoutProps } from '@/components/layout';
import Layout from '@/components/layout';
import Code from '@/public/code.png';

const MyApp = (data: AppProps & ILayoutProps) => {
  const {
    Component, pageProps, navbarData, footerData
  } = data;
  return (
    <div>
      <Layout navbarData={navbarData} footerData={footerData}>
        <Component {...pageProps} />
      </Layout>
    </div>

  )
}

MyApp.getInitialProps = async (context: AppContext) => {
  const pageProps = await App.getInitialProps(context);
  return {
    ...pageProps,
    navbarData: {},
    footerData: {
      title: "Demo",
      linkList: [
        {
          title: "技术栈",
          list: [
            {
              label: "react",
            },
            {
              label: "typescript",
            },
            {
              label: "ssr",
            },
            {
              label: "nodejs",
            },
          ],
        },
        {
          title: "了解更多",
          list: [
            {
              label: "掘金",
              link: "https://juejin.cn",
            },
            {
              label: "知乎",
              link: "https://www.zhihu.com",
            },
            {
              label: "csdn",
            },
          ],
        },
        {
          title: "联系我",
          list: [{ label: "微信" }, { label: "QQ" }],
        },
      ],
      qrCode: {
        image: Code,
        text: "王小白学前端",
      },
      copyRight: "Copyright © 2023 xxx. 保留所有权利",
      siteNumber: "冀ICP备XXXXXXXX号-X",
      publicNumber: "冀公网安备 xxxxxxxxxxxxxx号",
    }
  }
}
export default MyApp;
```

### 路由匹配   

Nextjs 的路由不同于一般使用的路由，它没有对应的文件去配置对应的路由，会根据相对 pages 的目录路径来生成对应的路由，如：  

```
// ./pages/home/index.tsx => /home
// ./pages/demo/[id].tsx => /demo/:id
```

创建一个 article 目录来试验一下对应的文件路由，针对文章路由，给它加一个 articleId 参数来区分不同文章：  

pages/article/[articleId].tsx  

```tsx
import type { NextPage } from 'next';

interface IArticleProps {
  articleId: number;
}

const Article: NextPage<IArticleProps> = ({ articleId }) => {
  return (
    <div>
      <h1>文章{articleId}</h1>
    </div>
  )
}

Article.getInitialProps = (context) => {
  const { articleId } = context.query;
  return {
    articleId: Number(articleId),
  }
}

export default Article;
```

把首页默认的 index.tsx 进行改造一下，把链接指到定义的文章路由:  

pages/index.tsx  

```tsx
import type { NextPage } from 'next';
import styles from '@/styles/Home.module.scss';

interface IHomeProps {
  title: string;
  description: string;
  list: {
    label: string;
    info: string;
    link: string;
  }[];
}

const Home: NextPage<IHomeProps> = ({
  title, description, list
}) => {
  return (
    <div className={styles.container}>
      <main className={styles.main}>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.description}>{description}</p>
        <div className={styles.grid}>
          {
            list?.map((item, index) => {
              return (
                <div key={index} className={styles.card} onClick={(): void => {
                  window.open(
                    item?.link,
                    "blank",
                    "noopener=yes,noreferrer=yes"
                  );
                }}>
                  <h2>{item?.label}</h2>
                  <p>{item?.info}</p>
                </div>
              )
            })
          }
        </div>
      </main>
    </div>
  )
}

Home.getInitialProps = (context) => {
  return {
    title: "Hello SSR!",
    description: "A Demo for 官网开发实战",
    list: [
      {
        label: "文章1",
        info: "A test for article1",
        link: "http://localhost:3000/article/1",
      },
      {
        label: "文章2",
        info: "A test for article2",
        link: "http://localhost:3000/article/2",
      },
      {
        label: "文章3",
        info: "A test for article3",
        link: "http://localhost:3000/article/3",
      },
      {
        label: "文章4",
        info: "A test for article4",
        link: "http://localhost:3000/article/4",
      },
      {
        label: "文章5",
        info: "A test for article5",
        link: "http://localhost:3000/article/5",
      },
      {
        label: "文章6",
        info: "A test for article6",
        link: "http://localhost:3000/article/6",
      },
    ],
  };

}

export default Home;
```

styles/Home.module.scss  

```scss
// ./pages/index.module.scss
.container {
  padding: 0 2rem;
}

.main {
  min-height: 100vh;
  padding: 4rem 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.footer {
  display: flex;
  flex: 1;
  padding: 2rem 0;
  border-top: 1px solid #eaeaea;
  justify-content: center;
  align-items: center;
}

.footer a {
  display: flex;
  justify-content: center;
  align-items: center;
  flex-grow: 1;
}

.title a {
  color: #0070f3;
  text-decoration: none;
}

.title a:hover,
.title a:focus,
.title a:active {
  text-decoration: underline;
}

.title {
  margin: 0;
  line-height: 1.15;
  font-size: 4rem;
}

.title,
.description {
  text-align: center;
}

.description {
  margin: 4rem 0;
  line-height: 1.5;
  font-size: 1.5rem;
}

.code {
  background: #fafafa;
  border-radius: 5px;
  padding: 0.75rem;
  font-size: 1.1rem;
  font-family: Menlo, Monaco, Lucida Console, Liberation Mono, DejaVu Sans Mono,
  Bitstream Vera Sans Mono, Courier New, monospace;
}

.grid {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  max-width: 800px;
}

.card {
  margin: 1rem;
  padding: 1.5rem;
  text-align: left;
  color: inherit;
  text-decoration: none;
  border: 1px solid #eaeaea;
  border-radius: 10px;
  transition: color 0.15s ease, border-color 0.15s ease;
  max-width: 300px;
  cursor: pointer;
}

.card:hover,
.card:focus,
.card:active {
  color: #0070f3;
  border-color: #0070f3;
}

.card h2 {
  margin: 0 0 1rem 0;
  font-size: 1.5rem;
}

.card p {
  margin: 0;
  font-size: 1.25rem;
  line-height: 1.5;
}

.logo {
  height: 1em;
  margin-left: 0.5rem;
}
```

使用 window.open 打开新页面来指向上文创建的文章页，noopener=yes,noreferrer=yes 是为了跳转的安全性，这个可以隐藏跳转的 window.opener 与 Document.referrer，在跨站点跳转中，通常加这个参数来保证跳转信息的不泄露。   

访问 http://localhost:3000/:   

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/ssr/img_4.png" alt="" width="700" />  

### header 修改  

Nextjs 提供了用 next/head 暴露出来的标签来修改 header，在 _app.tsx 加一个默认的 title。   

```tsx
import '@/styles/globals.css'
import type { AppProps, AppContext } from 'next/app';
import App from 'next/app';
import Head from 'next/head';
import type { ILayoutProps } from '@/components/layout';
import Layout from '@/components/layout';
import Code from '@/public/code.png';

const MyApp = (data: AppProps & ILayoutProps) => {
  const {
    Component, pageProps, navbarData, footerData
  } = data;
  return (
    <div>
      <Head>
        <title>A Demo for 官网开发实战</title>
        <meta
          name="description"
          content="A Demo for 官网开发实战"
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Layout navbarData={navbarData} footerData={footerData}>
        <Component {...pageProps} />
      </Layout>
    </div>

  )
}

MyApp.getInitialProps = async (context: AppContext) => {
  const pageProps = await App.getInitialProps(context);
  return {
    ...pageProps,
    navbarData: {},
    footerData: {
      title: "Demo",
      linkList: [
        {
          title: "技术栈",
          list: [
            {
              label: "react",
            },
            {
              label: "typescript",
            },
            {
              label: "ssr",
            },
            {
              label: "nodejs",
            },
          ],
        },
        {
          title: "了解更多",
          list: [
            {
              label: "掘金",
              link: "https://juejin.cn",
            },
            {
              label: "知乎",
              link: "https://www.zhihu.com",
            },
            {
              label: "csdn",
            },
          ],
        },
        {
          title: "联系我",
          list: [{ label: "微信" }, { label: "QQ" }],
        },
      ],
      qrCode: {
        image: Code,
        text: "王小白学前端",
      },
      copyRight: "Copyright © 2023 xxx. 保留所有权利",
      siteNumber: "冀ICP备XXXXXXXX号-X",
      publicNumber: "冀公网安备 xxxxxxxxxxxxxx号",
    }
  }
}
export default MyApp;
```

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/ssr/img_5.png" alt="" width="700" />  

## 搭建 Server 项目  

这里推荐使用 Strapi，这是一个开源无头的 CMS 配置 Api。基于 Strapi ，可以快速针对业务场景搭建一套对应的 CMS，包括增删改查和联表等较复杂场景，都可以通过可视化的配置实现。   

对于自定义较高的场景，它也暴露了相关的参数进行自定义，可以使用较少的开发量去实现特殊场景。   

### 项目初始化  

执行 Strapi 提供的脚手架命令来初始化项目:  

```shell
npx create-strapi-app server --quickstart
```

它会在当前目录生成名为 server 的项目，并且会自动运行并打开一个登录页，按照指示配置一下账号密码，然后登录。  

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/ssr/img_6.png" alt="" width="700" />  


### 数据可视化配置 

#### 结构体定义

完成登录后，进入到 Strapi 的管理页面。  

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/ssr/img_7.png" alt="" width="700" />  

* content manager 是 Api 的数据  
* content-type builder 是 Api 的结构体  

以上一章节 layout 下的静态数据举例：   

```ts
footerData: {
  title: "Demo",
  linkList: [
    {
      title: "技术栈",
      list: [
        {
          label: "react",
        },
        {
          label: "typescript",
        },
        {
          label: "ssr",
        },
        {
          label: "nodejs",
        },
      ],
    },
    {
      title: "了解更多",
      list: [
        {
          label: "掘金",
          link: "https://juejin.cn",
        },
        {
          label: "知乎",
          link: "https://www.zhihu.com",
        },
        {
          label: "csdn",
        },
      ],
    },
    {
      title: "联系我",
      list: [{ label: "微信" }, { label: "QQ" }],
    },
  ], 
  qrCode: {
    image: Code, 
    text: "王小白学前端",
  },
  copyRight: "Copyright © 2023 xxx. 保留所有权利", 
  siteNumber: "冀ICP备XXXXXXXX号-X",
  publicNumber: "冀公网安备 xxxxxxxxxxxxxx号",
}
```

针对这样一个结构体，应该如何去定义 Api 呢？  

切到 content-type builder，点击 create new collection type，创建一个新的结构体：  

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/ssr/img_8.png" alt="" width="700" />  

填完 display name 后，对应的单数和复数 id 会自动生成，就是右边的两项，name 填需要的结构体就可以。   

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/ssr/img_9.png" alt="" width="700" />  

然后为结构体创建一些字段，常见的类型包括文本、boolean 值、富文本，这些这里都有，以 title 举例，因为是一个字符串，所以点 text。  

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/ssr/img_10.png" alt="" width="700" />  

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/ssr/img_11.png" alt="" width="700" />  

直接用短文本就好，然后高级配置选必填和唯一。  

对应的字段就加好了，对于别的部分，用相同的方式加进来就可以。  

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/ssr/img_13.png" alt="" width="700" />  

稍微特殊一些的字段是 linkList，可以看到它其实是一个对象数组，先把 footData 的关系按照思维导图梳理一下。

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/ssr/img_30.png" alt="" width="700" />  

按照数据结构发现，footerData 和 linkList 是一对多的关系，而 linklist 中又包含多个 link，也是一对多的关系。  

所以要描述这部分字段，只有 layout 一个结构体是不够的，需要创建 linkList 和 link，然后给它们之间来建立对应的关系。  

确定了思路，按照上面的方法来创建 linklist 和 link 的结构体。  

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/ssr/img_12.png" alt="" width="700" />  

linklist 和 link 的关系应该怎么建立呢？在 linklist 结构体中，点新建字段。  

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/ssr/img_14.png" alt="" width="700" />  

点击 relation 属性，这个属性用来联立结构体之间的数据库关系。  

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/ssr/img_15.png" alt="" width="700" />  

点完成，可以发现加上了。  

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/ssr/img_16.png" alt="" width="700" />  

接下来，按照上面的原理配置完所有的结构体即可。  

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/ssr/img_17.png" alt="" width="700" />  

#### 结构体数据写入

定义完结构体后，需要为结构体加入一些数据，通常在开发完后，运营相关的同学配置，就只要进行这一步就可以了，别的部分就不需要再调整了，点击 content manager。  

数据的配置需要按照从子到父的原则，因为 layout 有相关的字段依赖于 linklist，linklist 又依赖于 link，所以只有 link 配置完以后，才可以进行 linklist 和 layout 的配置，这里以 link 和 linklist 举例。  

切到 link 的部分，点击 create new entry，可以进到下面的页面，输入完内容以后，进行保存，这里保存有两个按钮，一个是 save，一个是 publish，如果点击 publish 会生效到实际 cdn，这里先点击 publish，实际场景下运营配置的时候可以点 save，在 review 没问题后再发布即可。  

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/ssr/img_18.png" alt="" width="700" />  

配置完大致是这样的：   

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/ssr/img_19.png" alt="" width="700" />  

然后配置 linklist 的部分，同样是点 create new entry。  

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/ssr/img_20.png" alt="" width="700" />  

除了基本的字段，右侧还会有对应关联的字段，勾选需要的就可以关联上了。  

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/ssr/img_21.png" alt="" width="700" />  

最后配置 layout 的部分。  

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/ssr/img_22.png" alt="" width="700" />  

#### 权限配置及上线  

点击 settings -> Roles，这里是权限配置的部分，包含作者权限和公共权限，因为需要所有的人可以看到接口，所以点 public 右侧的 🖊（如果有特别需求的同学，可以点击 add new role 新增权限角色，再进行后续的步骤。  

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/ssr/img_23.png" alt="" width="700" />  

可以看到之前定义的结构体，左侧对应结构体支持的类型，右侧对应结构体接口的指向 Api 路由。因为要给对应的接口配置全查和单查的能力，所以勾选上 find 和 findOne。  

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/ssr/img_24.png" alt="" width="700" />  

layout 依赖于 link 和 link-list，所以 link 和 link-list 的结构体也需勾选上 find 和 findOne。  

访问 http://localhost:1337/api/layouts：  

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/ssr/img_25.png" alt="" width="700" />  

你会发现好像只有基础字段，联表的 linklist 和 link 去哪里了？  

这是因为 Strapi 默认是不会填充联表关系的，可以在路由后加 populate=*，这个入参的意义是为所有的关系填充一级关系。  

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/ssr/img_26.png" alt="" width="700" />  

推荐使用 strapi-plugin-populate-deep，这是基于 Strapi 的一个深度插件，切到项目目录下的终端安装一下。  

```shell
npm install strapi-plugin-populate-deep --save
```

重启，访问 http://localhost:1337/api/layouts?populate=deep。  

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/ssr/img_26.png" alt="" width="700" />  

deep 参数的含义为使用默认的最大深度填充请求，即 5 层，如果 5 层不满足需求，需要更多，入参的调整也很方便，比如针对 10 层的场景，只需要传递入参 populate=deep,10就可以。   

## BFF 数据流转 

通过访问 http://localhost:1337/api/layouts?populate=deep 可以拿到需要的数据。  

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/ssr/img_27.png" alt="" width="700" />  

不过这样的数据是有一些乱的，有几个可以优化的点：  

* 请求参数 populate=deep 是每次请求都需要带上的，因为需要所有深度的数据。  
* 最终需要的是 data 中的数据，layout 只有一个，不需要分页相关的部分（meta）。   
* 针对每个结构体，Strapi 为它们套上了 attributes 和 id，这个是不利于调用的，因为没有覆盖对应 ts 类型，会增加很多不必要的调试成本。  
* 每个结构体都加上了 createdAt、 publishedAt、updatedAt 三个字段，实际上是不需要这些字段的，随着接口层级的增加，过多不被使用的字段会增加接口的复杂度和可维护性。   

### CMS 接口优化

#### 自定义返回

在 src/api/* 的目录下，存放着结构体接口的定义，其中 controllers 存放着接口的控制器，每当客户端请求路由时，操作都会执行业务逻辑代码并发回响应，可以在其中重写 api 的相关方法（find、findOne、 update 等）。   

以 layout 为例，首先为 layout 接口加上默认的 populate=deep 参数，这样每次请求的时候就不用再加了。  

src/api/layout/controllers/layout.js

```js
const { createCoreController } = require("@strapi/strapi").factories;

module.exports = createCoreController("api::layout.layout", ({ strapi }) => ({
  async find(ctx) {
    ctx.query = {
      ...ctx.query,
      populate: "deep",
    };
    const { data } = await super.find(ctx);
    return data;
  },
}));
```

访问 http://localhost:1337/api/layouts，可以看到不需要加 populate 参数就可以拿到联表的数据了。  

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/ssr/img_28.png" alt="" width="700" />  

然后针对上面提到的 attributes、id 和时间相关的字段定义两个深度遍历的函数来对应去除。  

新建 src/utils/index.js  

```js
/**
 * 移除对象中自动创建的时间字段
 * @param obj
 * @returns
 */
const removeTime = (obj) => {
  const { createdAt, publishedAt, updatedAt, ...params } = obj || {};
  Object.getOwnPropertyNames(params).forEach((item) => {
    if (typeof params[item] === "object") {
      if (Array.isArray(params[item])) {
        params[item] = params[item].map((item) => {
          return removeTime(item);
        });
      } else {
        params[item] = removeTime(params[item]);
      }
    }
  });
  return params;
};

/**
 * 移除属性和id
 * @param {*} obj
 * @returns
 */
const removeAttrsAndId = (obj) => {
  const { attributes, id, ...params } = obj || {};
  const newObj = { ...attributes, ...params };
  Object.getOwnPropertyNames(newObj).forEach((item) => {
    if (typeof newObj[item] === "object") {
      if (Array.isArray(newObj[item])) {
        newObj[item] = newObj[item].map((item) => {
          return removeAttrsAndId(item);
        });
      } else {
        newObj[item] = removeAttrsAndId(newObj[item]);
      }
    }
  });
  return newObj;
};

module.exports = {
  removeTime,
  removeAttrsAndId,
};
```

然后对 layout 的 find 函数返回的数据调用进行处理。  

```js
'use strict';

/**
 * layout controller
 */
const { removeTime, removeAttrsAndId } = require('../../../utils/index');

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::layout.layout', ({ strapi }) => ({
  async find(ctx) {
    ctx.query = {
      ...ctx.query,
      populate: 'deep',
    };
    const { data } = await super.find(ctx);
    return removeAttrsAndId(removeTime(data[0]));
  }
}));
```

再访问 http://localhost:1337/api/layouts，可以只包含了需要的数据。  

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/ssr/img_29.png" alt="" width="700" />  

#### 增加跨域限制

Strapi 的接口默认不做跨域限制，这样所有的域名都可以调用，安全性是存在问题的。   

在 config/middlewares.js 中加上跨域的限制。  

```js
module.exports = [
  'strapi::errors',
  'strapi::security',
  {
    name: 'strapi::cors',
    config: {
      enabled: true,
      headers: '*',
      origin: ['http://localhost:3000', 'http://localhost:1337'],
    },
  },
  'strapi::poweredBy',
  'strapi::logger',
  'strapi::query',
  'strapi::body',
  'strapi::session',
  'strapi::favicon',
  'strapi::public',
];
```

### BFF 接口定义

接口配置好以后还不能直接在页面中调用，需要配置一层 BFF 层，即服务于前端的数据层。   

因为通常配置的数据是站在结构体的角度的，并不一定可以由前端调用，往往还需要复杂的数据处理。  

为了提高数据层的复用程度，增加 BFF 层，将接口包一层，进行相关处理后，前端页面只调用定义的 BFF 层接口，不直接与配置的接口产生交互。   

在定义接口前，先来了解一下 Nextjs 接口的路由是怎么配置的?  

与静态页面类似，Nextjs 接口也采用文件约定式路由的方式进行配置，可以分为预定义路由、动态路由和全捕获路由，如下面的例子：  

```
// ./pages/api/home/test.js => api/home/test 预定义路由
// ./pages/api/home/[testId].js => api/home/test, api/home/1, api/home/23 动态路由
// ./pages/api/home/[...testId].js => api/home/test, api/home/test/12 全捕获路由
```

如果一个相同的路由，比如 api/home/test，按照优先级来匹配三者，会按照预定义路由 > 动态路由 > 全捕获路由的顺序来匹配。   

预定义路由是精准匹配，后两者只是模糊匹配，虽然也满足匹配场景，但是只是作为兜底，优先会以预定义路由为准。   

下面来开发 BFF 层，首先定义一个接口层 pages/api/layout.ts。

因为会经常用到本地域名 和 CMS 域名，所以拿一个变量来存储它们，后续根据环境区分也很方便。  

utils/index.ts  

```ts
export const LOCALDOMAIN = 'http://127.0.0.1:3000';
export const CMSDOMAIN = 'http://127.0.0.1:1337';
```

安装 axios 和 lodash。  

```shell
npm i axios 
npm i lodash
npm i --save-dev @types/lodash
```

使用过 Express 的人应该知道中间件的概念，Express 是基于路由和中间件的框架，通过链式调用的方式来对接口进行一些统一的处理。  

开源社区有开发提供了 next-connect 的依赖来补全这部分的能力，先来安装一下依赖。  

```shell
npm install next-connect
```

pages/api/layout.ts   

```ts
import axios from 'axios';
import nextConnect from 'next-connect';
import type { NextApiRequest, NextApiResponse } from 'next';
import { ILayoutProps } from '@/components/layout';
import { CMSDOMAIN } from '@/utils';
import { isEmpty } from 'lodash';

const getLayoutData = nextConnect()
  // .use(any middleware)
  .get((req: NextApiRequest, res: NextApiResponse<ILayoutProps>) => {
    axios.get(`${CMSDOMAIN}/api/layouts`).then(result => {
      const {
        copy_right,
        link_lists,
        public_number,
        qr_code,
        qr_code_image,
        site_number,
        title,
      } = result?.data || {};
      res?.status(200).json({
        navbarData: {},
        footerData: {
          title,
          linkList: link_lists?.data?.map((item: any) => {
            return {
              title: item.title,
              list: item?.links?.data?.map((_item: any) => {
                return {
                  label: _item.label,
                  link: isEmpty(_item.link) ? '' : _item.link,
                };
              }),
            };
          }),
          qrCode: {
            image: `${CMSDOMAIN}${qr_code_image.data.url}`,
            text: qr_code,
          },
          copyRight: copy_right,
          siteNumber: site_number,
          publicNumber: public_number,
        },
      })
    })
  })

export default getLayoutData;
```

* NextApiResponse 类型是 Nextjs 提供的 response 类型，它提供了一个泛型，来作为整个接口和后续请求的返回，可以把需要的数据类型作为泛型传进去，保证整体代码有 ts 的 lint。  
* 返回数据用的是 json，针对数据的响应，Nextjs 提供下面的响应 Api，可以根据自己的需求选用不同的响应 Api。  

res.status(code) - 设置状态码的功能。code 必须是有效的 HTTP 状态码。  
res.json(body) - 发送 JSON 响应。body 必须是可序列化的对象。  
res.send(body) - 发送 HTTP 响应。body 可以是 a string，an object 或 a Buffer。 
res.redirect([status,] path) - 重定向到指定的路径或 URL。status 必须是有效的 HTTP 状态码。如果未指定，status 默认为 “307” “临时重定向”。  
res.revalidate(urlPath) - 使用 . 按需重新验证页面 getStaticProps。urlPath 必须是一个 string。  

改造 layout 部分的数据注入，换用接口数据。  

```tsx
import type { AppProps, AppContext } from 'next/app';
import App from 'next/app';
import Head from 'next/head';
import axios from 'axios';
import { LOCALDOMAIN } from '@/utils';
import type { ILayoutProps } from '@/components/layout';
import Layout from '@/components/layout';
import '@/styles/globals.css'

const MyApp = (data: AppProps & ILayoutProps) => {
  const {
    Component, pageProps, navbarData, footerData
  } = data;
  return (
    <div>
      <Head>
        <title>A Demo for 官网开发实战</title>
        <meta
          name="description"
          content="A Demo for 官网开发实战"
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Layout navbarData={navbarData} footerData={footerData}>
        <Component {...pageProps} />
      </Layout>
    </div>

  )
}

MyApp.getInitialProps = async (context: AppContext) => {
  const pageProps = await App.getInitialProps(context);
  const { data = {} } = await axios.get(`${LOCALDOMAIN}/api/layout`)
  return {
    ...pageProps,
    ...data,
  }
}
export default MyApp;
```

访问 http://localhost:3000。   

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/ssr/img_31.png" alt="" width="700" />  

## 主题化功能   

以 [抖音前端技术官网](https://douyinfe.com/) 为例，它的官网有包含默认的样式：

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/ssr/img_32.png" alt="" width="700" />  

也有暗黑色调的展示：  

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/ssr/img_33.png" alt="" width="700" />  

### 基础色调变量抽离  

主题化功能对 DOM 的结构变化不大，基本是针对色调进行切换。  

顺着这个思路，如果定义两套变量，是不是就完成了对两套主题的配置？根据不同的主题，在 html 标签上来固定两个属性来区分，方案就确定了。  

在全局样式中定义两套之前使用到的色调，包括字体和背景等颜色，把之前定义的组件样式抽出来放在这里就可以，保证所有的色调都通过变量的方式来引用。   

styles/global.css  

```css
html[data-theme="dark"] {
  --primary-color: #ffffff;
  --primary-background-color: rgba(14, 14, 14, 1);
  --footer-background-color: rgba(36, 36, 36, 1);
  --navbar-background-color: rgba(0, 0, 0, 0.5);
  --secondary-color: rgba(255, 255, 255, 0.5);
  --link-color: #34a8eb;
}

html[data-theme="light"] {
  --primary-color: #333333;
  --primary-background-color: rgba(255, 255, 255, 1);
  --footer-background-color: #f4f5f5;
  --navbar-background-color: rgba(255, 255, 255, 0.5);
  --secondary-color: #666666;
  --link-color: #0070f3;
}
```

接下来就是把这些定义的变量去替换原来样式中给的固定色值。  

components/footer/index.module.scss  

```scss
.footer {
  padding: 70px 145px;
  background-color: var(--footer-background-color);
  .topArea {
    display: flex;
    justify-content: space-between;

    .footerTitle {
      font-weight: 500;
      font-size: 36px;
      line-height: 36px;
      color: var(--primary-color);
      margin: 0;
    }

    .linkListArea {
      display: flex;
      .linkArea {
        display: flex;
        flex-direction: column;
        margin-left: 160px;
        .title {
          font-weight: 500;
          font-size: 14px;
          line-height: 20px;
          color: var(--primary-color);
          margin-bottom: 40px;
        }

        .links {
          display: flex;
          flex-direction: column;
          font-weight: 400;
          font-size: 14px;
          line-height: 20px;

          .link {
            color: var(--primary-color);
            cursor: pointer;
            margin-bottom: 24px;
          }

          .disabled {
            color: var(--secondary-color);
            cursor: not-allowed;
            margin-bottom: 24px;
          }
        }
      }
    }
  }

  .bottomArea {
    display: flex;
    justify-content: space-between;
    .codeArea {
      display: flex;
      flex-direction: column;
      .text {
        color: var(--secondary-color);
      }
    }
    .numArea {
      color: var(--secondary-color);
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      font-weight: 400;
      font-size: 14px;
      line-height: 20px;

      span {
        margin-bottom: 12px;
      }

      .publicLogo {
        display: flex;

        .logo {
          margin-right: 4px;
        }
      }
    }
  }
}
```

components/layout/index.module.scss  

```scss
.layout {
  background-color: var(--primary-background-color);
  .main {
    min-height: calc(100vh - 560px);
  }
}
```

components/navbar/index.module.scss  

```scss
.navBar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: var(--navbar-background-color);
  backdrop-filter: blur(8px);
  width: 100%;
  height: 64px;
  position: sticky;
  top: 0;
  left: 0;
  padding: 20px 32px;
  z-index: 100;
  .logoIcon {
    width: 4.375rem;
    height: 1.25rem;
    background-image: var(--navbar-icon);
    background-size: 4.375rem 1.25rem;
    background-repeat: no-repeat;
  }
  .themeIcon {
    width: 1.25rem;
    height: 1.25rem;
    background-image: var(--theme-icon);
    background-size: 1.25rem 1.25rem;
    background-repeat: no-repeat;
    cursor: pointer;
  }
}
```

### 图片主题化配置

对于图片的主题化，有两种方式，一种是针对一般固定不变的图片，采用同样定义的方式。  

styles/global.css  

```css
html[data-theme="dark"] {
  --primary-color: #ffffff;
  --primary-background-color: rgba(14, 14, 14, 1);
  --footer-background-color: rgba(36, 36, 36, 1);
  --navbar-background-color: rgba(0, 0, 0, 0.5);
  --secondary-color: rgba(255, 255, 255, 0.5);
  --link-color: #34a8eb;
  --navbar-icon: url('../public/logo_dark.png');
  --theme-icon: url('../public/theme_dark.png');
}

html[data-theme="light"] {
  --primary-color: #333333;
  --primary-background-color: rgba(255, 255, 255, 1);
  --footer-background-color: #f4f5f5;
  --navbar-background-color: rgba(255, 255, 255, 0.5);
  --secondary-color: #666666;
  --link-color: #0070f3;
  --navbar-icon: url('../public/logo_light.png');
  --theme-icon: url('../public/theme_light.png');
}
```

另一种是配置的图片，可能会频繁变化，这种只需要在 Strapi 中再加一个字段存不同主题的图片，然后在页面逻辑中根据不同的主题去切换就可以。  

### 主题数据注入  

针对当前的主题，肯定有个地方需要进行缓存，应该使用哪种客户端缓存机制呢？   

主题化功能往往是因为用户更喜欢这种色调，用 localStorage 要更合适，因为相比 sessionStorage 只能保存当前会话的特点，localStorage 可以长期保留，除非用户主动清除，保证下一次访问时也可以保证是之前的主题。  

那么应该怎么去注入这个缓存呢，如果随心所欲地去进行缓存注入操作，那页面中可能会分散各种缓存的逻辑，不符合单一职责原则，也不利于统一的维护和相关事件的绑定，所以需要在一处地方聚集主题相关的逻辑，然后再分别注入给每个页面对应的编辑方法。  

这里需要用到 React 的 useContext，它具有接受上下文，并将上下文进行注入的能力。   

新建 constants/enum  

```ts
export enum Themes {
  light = 'light',
  dark = 'dark',
}
```

新建 stores/theme.tsx  

```tsx
import {createContext, FC, useEffect, useState} from 'react';
import {Themes} from '@/constants/enum';

interface IThemeContextProps {
  theme: Themes;
  setTheme: (theme: Themes) => void;
}

interface IThemeContextProviderProps {
  children: JSX.Element;
}

export const ThemeContext = createContext<IThemeContextProps>({} as IThemeContextProps);

const ThemeContextProvider: FC<IThemeContextProviderProps> = ({children}) => {
  const [theme, setTheme] = useState<Themes>(Themes.light);
  useEffect(() =>  {
    const item = localStorage.getItem('theme') as Themes || Themes.light;
    setTheme(item);
    document.getElementsByTagName('html')[0].dataset.theme = item;
  }, []);
  return (
    <ThemeContext.Provider value={{
      theme,
      setTheme: (currentTheme) => {
        setTheme(currentTheme);
        localStorage.setItem('theme', currentTheme);
        document.getElementsByTagName('html')[0].dataset.theme = currentTheme;
      }
    }}>
      {children}
    </ThemeContext.Provider>
  )
}

export default ThemeContextProvider;
```

ThemeContext 是暴露出的变量，在全局注入后，每个路由页面都可以通过它来获取定义的 theme 和 setTheme 进行相关的业务操作。   

ThemeContextProvider 则是注入器，用于给需要的 DOM 进行上下文的注入。  

在全局页面注入 context。  

pages/_app.tsx  

```tsx
import type { AppProps, AppContext } from 'next/app';
import App from 'next/app';
import Head from 'next/head';
import axios from 'axios';
import ThemeContextProvider from '@/stores/theme';
import { LOCALDOMAIN } from '@/utils';
import type { ILayoutProps } from '@/components/layout';
import Layout from '@/components/layout';
import '@/styles/globals.css'

const MyApp = (data: AppProps & ILayoutProps) => {
  const {
    Component, pageProps, navbarData, footerData
  } = data;
  return (
    <div>
      <Head>
        <title>A Demo for 官网开发实战</title>
        <meta
          name="description"
          content="A Demo for 官网开发实战"
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <ThemeContextProvider>
        <Layout navbarData={navbarData} footerData={footerData}>
          <Component {...pageProps} />
        </Layout>
      </ThemeContextProvider>
    </div>

  )
}

MyApp.getInitialProps = async (context: AppContext) => {
  const pageProps = await App.getInitialProps(context);
  const { data = {} } = await axios.get(`${LOCALDOMAIN}/api/layout`)
  return {
    ...pageProps,
    ...data,
  }
}
export default MyApp;
```

在 navbar 加一个主题化切换的入口。  

components/navbar/index.tsx  

```tsx
import {FC, useContext} from 'react';
import {ThemeContext} from '@/stores/theme';
import {Themes} from '@/constants/enum';
import styles from './index.module.scss';

export interface INavBarProps {}

const NavBar: FC<INavBarProps> = ({}) => {
  const { setTheme } = useContext(ThemeContext);
  return (
    <div className={styles.navBar}>
      <a href="http://localhost:3000/">
        <div className={styles.logoIcon} />
      </a>
      <div className={styles.themeIcon} onClick={(): void => {
        setTheme(localStorage.getItem('theme') === Themes.light ? Themes.dark : Themes.light);
      }}/>
    </div>
  )
}

export default NavBar;
```

components/navbar/index.module.scss  

```scss
.navBar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: var(--navbar-background-color);
  backdrop-filter: blur(8px);
  width: 100%;
  height: 64px;
  position: sticky;
  top: 0;
  left: 0;
  padding: 20px 32px;
  z-index: 100;
  .logoIcon {
    width: 4.375rem;
    height: 1.25rem;
    background-image: var(--navbar-icon);
    background-size: 4.375rem 1.25rem;
    background-repeat: no-repeat;
  }
  .themeIcon {
    width: 1.25rem;
    height: 1.25rem;
    background-image: var(--theme-icon);
    background-size: 1.25rem 1.25rem;
    background-repeat: no-repeat;
    cursor: pointer;
  }
}
```

启动项目，可以看到已经可以实现主题化的功能了。  

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/ssr/img_34.png" alt="" width="700" />  

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/ssr/img_35.png" alt="" width="700" />  

### 多进程场景下主题同步

浏览器是多进程的，每个开启的页面都对应到一个进程，这样可以有效地避免页面之间的数据共享及一个报错页面带崩所有页面的情况。  

如果用户开了多个页面来访问站点，其中一个页面的主题切换，另一个页面是感知不到的，这样一个浏览器下会有多个主题的页面，对用户体验上来说是不太好的。   

出于追求极致考虑，优化一下这个问题，其实也很简单，只需要监听浏览器的缓存修改事件，然后再次执行初始化的操作就好了。  

stores/theme.tsx  

```tsx
import {createContext, FC, useEffect, useState} from 'react';
import {Themes} from '@/constants/enum';

interface IThemeContextProps {
  theme: Themes;
  setTheme: (theme: Themes) => void;
}

interface IThemeContextProviderProps {
  children: JSX.Element;
}

export const ThemeContext = createContext<IThemeContextProps>({} as IThemeContextProps);

const ThemeContextProvider: FC<IThemeContextProviderProps> = ({children}) => {
  const [theme, setTheme] = useState<Themes>(Themes.light);
  useEffect(() =>  {
    debugger
    const checkTheme = () => {
      const item = localStorage.getItem('theme') as Themes || Themes.light;
      setTheme(item);
      document.getElementsByTagName('html')[0].dataset.theme = item;
    }
    // 初始化先执行一遍
    checkTheme();
    // 监听浏览器缓存事件
    window.addEventListener('storage', checkTheme);
    return (): void => {
      // 解绑
      window.removeEventListener('storage', checkTheme);
    }
  }, []);
  return (
    <ThemeContext.Provider value={{
      theme,
      setTheme: (currentTheme) => {
        setTheme(currentTheme);
        localStorage.setItem('theme', currentTheme);
        document.getElementsByTagName('html')[0].dataset.theme = currentTheme;
      }
    }}>
      {children}
    </ThemeContext.Provider>
  )
}

export default ThemeContextProvider;
```

现在尝试打开两个页面，修改其中一个，发现另一个也会同步更新为一样的主题了。   

### 闪烁场景优化

还有一个小问题，因为在服务器端是获取不到当前的主题的，通过 useEffect 钩子来获取主题进行样式的渲染，这样其实会有一个主题切换的过程，在低网速或是快速切换场景下会有比较明显的闪烁，可以在钩子处设置断点查看（当前缓存是黑色主题）。   

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/ssr/img_36.png" alt="" width="700" />  

可以看到走到钩子的时候，是还没办法进行对应主题样式渲染的，应该怎么解决这个问题呢？  

只需要在 HTML 中引入对应的 script，确保可以在交互之前进行主题的初始化就行了。  

Nextjs 有提供这个能力，修改 _document.tsx，然后引入对应的内部脚本。  

```tsx
import { Html, Head, Main, NextScript } from 'next/document'
import Script from 'next/script';

export default function Document() {
  return (
    <Html lang="en">
      <Head />
      <body>
        <Main />
        <NextScript />
        <Script id="theme-script" strategy="beforeInteractive">
          {
            `const item = localStorage.getItem('theme') || 'light';
             localStorage.setItem('theme', item);
             document.getElementsByTagName('html')[0].dataset.theme = item;
            `
          }
        </Script>
      </body>
    </Html>
  )
}
```

id 是用于 Nextjs 检索，beforeInteractive 表明这个脚本的执行策略是在交互之前，会被默认放到 head 中。  

现在再来试试效果，发现走到钩子的时候已经可以正常去初始化了。   

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/ssr/img_37.png" alt="" width="700" />  

## 帧动画功能  

以 [抖音前端技术官网](https://douyinfe.com/) 的首页加载动画为例，看看这个动画下究竟发生了什么？   

首先打开控制台的 network，使用 performance 来录制首页加载的过程，为了能更清晰查看，适当降低 CPU 的性能，调整为 4 x slowdown。   

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/ssr/img_38.png" alt="" width="700" />  

点击控制台左上角的 ⚪，然后刷新页面，可以得到下面的逐帧列表：  

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/ssr/img_39.png" alt="" width="700" />  

从下面的加载图中可以判断出，这个动画总的执行时长为 1.36 s，然后上面的列表中有具体页面加载过程的帧动画变化图，通过按帧查看，可以大概看出这个动画的执行顺序是这样的。  

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/ssr/img_40.png" alt="" width="700" />  

按照从小序列到大序列的顺序，每个元素分别执行了从下往上的平移操作，以及一个透明度从 0 到 1 的过程，加上上面看到每个动画的时长分析都是 1.3s，所以只是对每个元素推迟了不同的动画平移时间，但是它们享有相同的动画时长，针对这个场景应该怎么去实现呢？   

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/ssr/img_41.png" alt="" width="700" />  

针对现在的首页，把 dom 元素简单拆分为 8 个区域，总动画时长定成 1s，其中 1s 的时间可以分为 9 个时间帧，每个区域从对应序列的时间帧开始执行相同的动画效果，最后把所有的帧连起来就是一个完整的帧动画。   

定义对应的样式进行绑定，以 fadeInDown1 举例，@keyframes 指向动画的逐帧状态，其中 0% 和 11 % 都是一样的内容，这时候区域处于 y 轴 40px 的位置，然后末尾状态是无区域状态和 1 透明度，这个动画的效果会使得动画从整体时间的 11% 开始执行，到 100 % 完成最终的变化。  

这个 11% 是从哪里来的呢？上面提到为每个动画延迟一个帧频率执行，8 个区域，共 9 帧，所以 1 帧的占比为 11% 的总动画时长，每个动画的起始时间（第二个状态值）都比上一个高出 1 帧的比例，这样就可以将整体帧动画串联起来了。  

styles/Home.module.scss  

```scss
.withAnimation {
  .title {
    animation: fadeInDown1 1s;
  }

  .description {
    animation: fadeInDown2 1s;
  }

  .card:nth-of-type(1) {
    animation: fadeInDown3 1s;
  }

  .card:nth-of-type(2) {
    animation: fadeInDown4 1s;
  }

  .card:nth-of-type(3) {
    animation: fadeInDown5 1s;
  }

  .card:nth-of-type(4) {
    animation: fadeInDown6 1s;
  }

  .card:nth-of-type(5) {
    animation: fadeInDown7 1s;
  }

  .card:nth-of-type(6) {
    animation: fadeInDown8 1s;
  }
}

@keyframes fadeInDown1 {
  0% {
    transform: translate3d(0, 40px, 0);
    opacity: 0;
  }

  11% {
    transform: translate3d(0, 40px, 0);
    opacity: 0;
  }

  100% {
    -webkit-transform: none;
    transform: none;
    opacity: 1;
  }
}

@keyframes fadeInDown2 {
  0% {
    transform: translate3d(0, 40px, 0);
    opacity: 0;
  }

  22% {
    transform: translate3d(0, 40px, 0);
    opacity: 0;
  }

  100% {
    -webkit-transform: none;
    transform: none;
    opacity: 1;
  }
}

@keyframes fadeInDown3 {
  0% {
    transform: translate3d(0, 40px, 0);
    opacity: 0;
  }

  33% {
    transform: translate3d(0, 40px, 0);
    opacity: 0;
  }

  100% {
    -webkit-transform: none;
    transform: none;
    opacity: 1;
  }
}

@keyframes fadeInDown4 {
  0% {
    transform: translate3d(0, 40px, 0);
    opacity: 0;
  }

  44% {
    transform: translate3d(0, 40px, 0);
    opacity: 0;
  }

  100% {
    -webkit-transform: none;
    transform: none;
    opacity: 1;
  }
}

@keyframes fadeInDown5 {
  0% {
    transform: translate3d(0, 40px, 0);
    opacity: 0;
  }

  55% {
    transform: translate3d(0, 40px, 0);
    opacity: 0;
  }

  100% {
    -webkit-transform: none;
    transform: none;
    opacity: 1;
  }
}

@keyframes fadeInDown6 {
  0% {
    transform: translate3d(0, 40px, 0);
    opacity: 0;
  }

  66% {
    transform: translate3d(0, 40px, 0);
    opacity: 0;
  }

  100% {
    -webkit-transform: none;
    transform: none;
    opacity: 1;
  }
}

@keyframes fadeInDown7 {
  0% {
    transform: translate3d(0, 40px, 0);
    opacity: 0;
  }

  77% {
    transform: translate3d(0, 40px, 0);
    opacity: 0;
  }

  100% {
    -webkit-transform: none;
    transform: none;
    opacity: 1;
  }
}

@keyframes fadeInDown8 {
  0% {
    transform: translate3d(0, 40px, 0);
    opacity: 0;
  }

  88% {
    transform: translate3d(0, 40px, 0);
    opacity: 0;
  }

  100% {
    -webkit-transform: none;
    transform: none;
    opacity: 1;
  }
}
```

改造首页 (index.tsx) Dom 类，专门定义一个动画类来存放动画相关的样式，避免对基础样式造成污染。  

```tsx
import {useRef} from 'react';
import type { NextPage } from 'next';
import classNames from 'classnames';
import styles from '@/styles/Home.module.scss';

interface IHomeProps {
  title: string;
  description: string;
  list: {
    label: string;
    info: string;
    link: string;
  }[];
}

const Home: NextPage<IHomeProps> = ({
  title, description, list
}) => {
  const mainRef = useRef<HTMLDivElement>(null);

  return (
    <div className={styles.container}>
      <main className={classNames([styles.main, styles.withAnimation])} ref={mainRef}>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.description}>{description}</p>
        <div className={styles.grid}>
          {
            list?.map((item, index) => {
              return (
                <div key={index} className={styles.card} onClick={(): void => {
                  window.open(
                    item?.link,
                    "blank",
                    "noopener=yes,noreferrer=yes"
                  );
                }}>
                  <h2>{item?.label}</h2>
                  <p>{item?.info}</p>
                </div>
              )
            })
          }
        </div>
      </main>
    </div>
  )
}

Home.getInitialProps = (context) => {
  return {
    title: "Hello SSR!",
    description: "A Demo for 官网开发实战",
    list: [
      {
        label: "文章1",
        info: "A test for article1",
        link: "http://localhost:3000/article/1",
      },
      {
        label: "文章2",
        info: "A test for article2",
        link: "http://localhost:3000/article/2",
      },
      {
        label: "文章3",
        info: "A test for article3",
        link: "http://localhost:3000/article/3",
      },
      {
        label: "文章4",
        info: "A test for article4",
        link: "http://localhost:3000/article/4",
      },
      {
        label: "文章5",
        info: "A test for article5",
        link: "http://localhost:3000/article/5",
      },
      {
        label: "文章6",
        info: "A test for article6",
        link: "http://localhost:3000/article/6",
      },
    ],
  };

}

export default Home;
```

然后查看一下效果。   

<iframe width="700" height="315" src="/images/ssr/b.webm" title="" frameborder="0" allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>

###  主动触发动画重新播放  

在切换主题时，希望能再执行一次加载动画，可以通过 requestAnimationFrame 来实现，它会返回一个回调，强制浏览器在重绘前调用指定的函数来进行动画的更新。  

使用这个来改造一下首页，加一个 useEffect 的钩子。  

```tsx
import {useRef, useContext, useEffect} from 'react';
import type { NextPage } from 'next';
import classNames from 'classnames';
import { ThemeContext } from '@/stores/theme';
import styles from '@/styles/Home.module.scss';

interface IHomeProps {
  title: string;
  description: string;
  list: {
    label: string;
    info: string;
    link: string;
  }[];
}

const Home: NextPage<IHomeProps> = ({
  title, description, list
}) => {
  const mainRef = useRef<HTMLDivElement>(null);
  const { theme } = useContext(ThemeContext);
  useEffect(() => {
    mainRef.current?.classList.remove(styles.withAnimation);
    window.requestAnimationFrame(() => {
      mainRef.current?.classList.add(styles.withAnimation);
    });
  }, [theme]);

  return (
    <div className={styles.container}>
      <main className={classNames([styles.main, styles.withAnimation])} ref={mainRef}>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.description}>{description}</p>
        <div className={styles.grid}>
          {
            list?.map((item, index) => {
              return (
                <div key={index} className={styles.card} onClick={(): void => {
                  window.open(
                    item?.link,
                    "blank",
                    "noopener=yes,noreferrer=yes"
                  );
                }}>
                  <h2>{item?.label}</h2>
                  <p>{item?.info}</p>
                </div>
              )
            })
          }
        </div>
      </main>
    </div>
  )
}

Home.getInitialProps = (context) => {
  return {
    title: "Hello SSR!",
    description: "A Demo for 官网开发实战",
    list: [
      {
        label: "文章1",
        info: "A test for article1",
        link: "http://localhost:3000/article/1",
      },
      {
        label: "文章2",
        info: "A test for article2",
        link: "http://localhost:3000/article/2",
      },
      {
        label: "文章3",
        info: "A test for article3",
        link: "http://localhost:3000/article/3",
      },
      {
        label: "文章4",
        info: "A test for article4",
        link: "http://localhost:3000/article/4",
      },
      {
        label: "文章5",
        info: "A test for article5",
        link: "http://localhost:3000/article/5",
      },
      {
        label: "文章6",
        info: "A test for article6",
        link: "http://localhost:3000/article/6",
      },
    ],
  };

}

export default Home;
```

在每次 theme 发生变化的时候，主动移除对应的动画类，再通过 requestAnimationFrame 对动画类进重新绑定，达到主动触发动画刷新的效果，现在来看一下最终成品。   

<iframe width="700" height="315" src="/images/ssr/a.webm" title="" frameborder="0" allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>  

## 多媒体适配

之前的页面只绘制了 pc 端的样式，通常官网需要支持 pc、 ipad、 移动端等多种设备的访问，现在需要对多媒体设备的样式进行兼容适配。   

### Px 转 Rem  

在适配之前，先了解一下 rem 和 px，px 是相对屏幕分辨率的像素单位， rem 是相对 HTML 根元素字体大小而确定的相对单位，对于多媒体的适配，常用 rem 进行开发。  

所以需要对之前的样式进行一下替换，将 px 单位替换为 rem，这个过程可以通过 webstorm 的 [px2rwd-intellij-plugin](https://github.com/sunqian1991/px2rwd-intellij-plugin) 插件来协助完成，可以参照下图安装，默认的的根字体为 16px，根据相关说明扩展配置调整即可。   

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/ssr/img_42.png" alt="" width="700" />  

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/ssr/img_43.png" alt="" width="700" />  

安装完成后，移步到样式问题，输入 16 px，可以看到会有对应 rem 提示，将所有的 px 单位替换即可。  

### CSS 多媒体设备适配

通过编写不同的媒体设备样式来进行适配，这种常用于 dom 结构变化不大，可以复用 dom 的基础上，调整样式就能适配的场景。为加强复用，可以定义几个常用的设备场景。  

pages/media.scss  

```scss
// 极小分辨率移动端设备
@mixin media-mini-mobile {
  @media screen and (max-width: 25.875rem) {
    @content;
  }
}

// 介于极小分辨率和正常分辨率之间的移动端设备
@mixin media-between-mini-and-normal-mobile {
  @media screen and (min-width: 25.876rem) and (max-width: 47.9375rem) {
    @content;
  }
}

// 移动端设备
@mixin media-mobile {
  @media screen and (max-width: 47.9375rem) {
    @content;
  }
}

// ipad
@mixin media-ipad {
  @media screen and (min-width: 47.9375rem) and (max-width: 75rem) {
    @content;
  }
}
```  

在大部分场景，可以直接引入这些定义进行适配。   

```scss
@include media-ipad {
// ...
}
```

以 footer 组件举例，改造一下它之前的样式。  

components/footer/index.module.scss   

```scss
@import "./pages/media.scss";

.footer {
  font-size: 1rem;
  padding: 4.375rem 9.0625rem;
  background-color: var(--footer-background-color);
  .topArea {
    display: flex;
    justify-content: space-between;
    flex-wrap: wrap;

    .footerTitle {
      font-weight: 500;
      font-size: 2.25rem;
      line-height: 2.25rem;
      color: var(--primary-color);
      margin: 0;
    }

    .linkListArea {
      display: flex;
      .linkArea {
        display: flex;
        flex-direction: column;
        margin-left: 10rem;
        .title {
          font-weight: 500;
          font-size: 0.875rem;
          line-height: 1.25rem;
          color: var(--primary-color);
          margin-bottom: 2.5rem;
          word-break: keep-all;
        }

        .links {
          display: flex;
          flex-direction: column;
          font-weight: 400;
          font-size: 0.875rem;
          line-height: 1.25rem;
          word-break: keep-all;

          .link {
            color: var(--primary-color);
            cursor: pointer;
            margin-bottom: 1.5rem;
          }

          .disabled {
            color: var(--secondary-color);
            cursor: not-allowed;
            margin-bottom: 1.5rem;
          }
        }
      }

      .linkArea:first-of-type {
        margin-left: 0;
      }
    }
  }

  .bottomArea {
    display: flex;
    justify-content: space-between;
    .codeArea {
      display: flex;
      flex-direction: column;
      .text {
        color: var(--secondary-color);
      }
    }
    .numArea {
      color: var(--secondary-color);
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      font-weight: 400;
      font-size: 0.875rem;
      line-height: 1.25rem;

      span {
        margin-bottom: 0.75rem;
      }

      .publicLogo {
        display: flex;

        .logo {
          margin-right: 0.25rem;
        }
      }
    }
  }
}

@media screen and (min-width: 48.6875rem) and (max-width: 54.125rem) {
  .footer {
    .topArea {
      .footerTitle {
        margin-bottom: 1.25rem;
      }
    }
  }
}

@media screen and (max-width: 48.6875rem) {
  .footer {
    .topArea {
      display: flex;
      flex-direction: column;
      align-items: center;
      .footerTitle {
        margin-bottom: 2.5rem;
      }
      .linkListArea {
        display: flex;
        flex-direction: column;
        text-align: center;
        .linkArea {
          margin-left: 0;
        }
      }
    }

    .bottomArea {
      display: flex;
      flex-direction: column;
      align-items: center;

      .codeArea {
        display: flex;
        flex-direction: column;
        align-items: center;

        .text {
          text-align: center;
          margin: 1.25rem 0;
        }
      }

      .numArea {
        align-items: center;
        text-align: center;
      }
    }
  }
}

// @include media-ipad {
// }
```

实现效果：   

<iframe width="700" height="315" src="/images/ssr/c.webm" title="" frameborder="0" allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>

### Context 注入设备信息

对于页面的样式适配，CSS media 已经可以覆盖绝大部分的场景，但小部分的场景仍然无法覆盖，比如在一些媒体设备下，不再采用原本的 dom 结构，换用别的交互形式，就没办法直接用样式覆盖了，而是需要通过在客户端判断当前的设备，选用不同的交互。  

应该怎么在客户端判断当前的设备呢？

可以定义一个 context，用于判断当前的设备，然后注入给每个页面。判断设备的方式其实也很简单，通过页宽来判断就可。  

constants/enum.ts  

```ts
export enum Environment {
  pc = 'pc',
  ipad = 'ipad',
  mobile = 'mobile',
  none = 'none',
}
```

stores/userAgent.tsx  

```tsx
import React, {createContext, FC, useEffect, useState} from 'react';
import {Environment} from '@/constants/enum';

interface IUserAgentContextProps {
  userAgent: Environment;
}

interface IUserAgentProps {
  children: JSX.Element;
}

export const UserAgentContext = createContext<IUserAgentContextProps>({} as IUserAgentContextProps);

const UserAgentProvider: FC<IUserAgentProps> = ({ children }) => {
  const [userAgent, setUserAgent] = useState<Environment>(Environment.none);
  // 监听本地缓存来同步不同页面间的主题（当前页面无法监听到，直接在顶部栏进行了类的切换)
  useEffect(() => {
    const checkUserAgent = (): void => {
      const width = document.body.offsetWidth;
      switch (true) {
        case width < 768:
          setUserAgent(Environment.mobile);
          break;
        case width >= 768 && width < 1200:
          setUserAgent(Environment.ipad);
          break;
        case width >= 1200:
          setUserAgent(Environment.pc);
          break;
        default:
          setUserAgent(Environment.none);
          break;
      }
    }
    checkUserAgent();
    window.addEventListener('resize', checkUserAgent);
    return (): void => {
      window.removeEventListener('resize', checkUserAgent);
    }
  }, [typeof document !== 'undefined' && document.body.offsetWidth]);

  return (
    <UserAgentContext.Provider value={{ userAgent }}>
      {children}
    </UserAgentContext.Provider>
  )
}

export default UserAgentProvider;
```

* Environment.none：设置一个空态，为了避免未取到页宽时，错误赋值非当前页面的设备分辨率的值，导致可能会出现分辨率样式的短暂切换造成的视觉冲突。  
* typeof document !== "undefined" && document.body.offsetWidth： 除钩子方法里（比如 useEffect）以外的逻辑，都是会在服务器端执行的，在服务器端是没有 BOM 的注入的，所以需要对 BOM 的调用进行判空。  

把这个 context 同样注入到入口文件。
  
pages/_app.tsx  

```tsx
<ThemeContextProvider>
    <UserAgentProvider>
      <Layout navbarData={navbarData} footerData={footerData}>
        <Component {...pageProps} />
      </Layout>
    </UserAgentProvider>
</ThemeContextProvider>
```

在 navbar 组件简单调用试试。  

components/navbar/index.tsx  

```tsx
import { FC, useContext } from "react";
import styles from "./index.module.scss";
import { ThemeContext } from "@/stores/theme";
import { UserAgentContext } from "@/stores/userAgent";
import { Themes, Environment } from "@/constants/enum";

export interface INavBarProps {}

const NavBar: FC<INavBarProps> = ({}) => {
  const { setTheme } = useContext(ThemeContext);
  const { userAgent } = useContext(UserAgentContext);

  return (
    <div className={styles.navBar}>
      <a href="http://localhost:3000/">
        <div className={styles.logoIcon}></div>
      </a>
      <div className={styles.themeArea}>
        {userAgent === Environment.pc && (
          <span className={styles.text}>当前是pc端样式</span>
        )}
        {userAgent === Environment.ipad && (
          <span className={styles.text}>当前是Ipad端样式</span>
        )}
        {userAgent === Environment.mobile && (
          <span className={styles.text}>当前是移动端样式</span>
        )}
        <div
          className={styles.themeIcon}
          onClick={(): void => {
            if (localStorage.getItem("theme") === Themes.light) {
              setTheme(Themes.dark);
            } else {
              setTheme(Themes.light);
            }
          }}
        ></div>
      </div>
    </div>
  );
};
export default NavBar;
```

实现效果：  

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/ssr/img_44.png" alt="" width="700" />  

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/ssr/img_45.png" alt="" width="700" />  

### 服务端判定设备信息  

客户端判定设备存在一个小问题是，因为 HTML 文本的生成是在服务器端生成的，客户端判断设备信息会存在一个初始态到实际设备数据短暂切换的问题，而且如果不同设备展示的内容不同，还有可能会影响到实际的 SEO ，那有没有办法可以在服务器端判断当前的访问设备呢？  

虽然服务器端拿不到当前访问的客户端页宽等数据，但是客户端在服务器端请求的时候，请求头中有一个 user-agent 请求头，可以用来判断当前的设备是 pc 端还是移动端，通过这个来判断，就可以在 HTML 文本返回前，就拿到实际的设备 DOM。  

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/ssr/img_46.png" alt="" width="700" />  

先来定义一下判断设备的通用方法。  

utils/index.ts 

```ts
export const getIsMobile = (context: AppContext) => {
  const { headers = {} } = context.ctx.req || {};
  return /mobile|android|iphone|ipad|phone/i.test(
    (headers['user-agent'] || '').toLowerCase()
  );
}
```

然后在入口文件的注入函数里，额外注入一个设备信息，如果是移动端，就给标题加一个“（移动端）”， 如果是 pc 端，就加一个 “（pc 端）”。

pages/_app.tsx  

```tsx
import type { AppProps, AppContext } from 'next/app';
import App from 'next/app';
import Head from 'next/head';
import axios from 'axios';
import ThemeContextProvider from '@/stores/theme';
import UserAgentProvider from '@/stores/userAgent';
import { LOCALDOMAIN, getIsMobile } from '@/utils';
import type { ILayoutProps } from '@/components/layout';
import { appWithTranslation } from 'next-i18next';
import Layout from '@/components/layout';
import '@/styles/globals.css'

const MyApp = (data: AppProps & ILayoutProps & { isMobile: boolean }) => {
  const {
    Component, pageProps, navbarData, footerData, isMobile
  } = data;
  return (
    <div>
      <Head>
        <title>{`A Demo for 官网开发实战 (${
          isMobile ? "移动端" : "pc端"
        })`}</title>
        <meta
          name="description"
          content="A Demo for 官网开发实战"
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <ThemeContextProvider>
        <UserAgentProvider>
          <Layout navbarData={navbarData} footerData={footerData}>
            <Component {...pageProps} />
          </Layout>
        </UserAgentProvider>
      </ThemeContextProvider>
    </div>
  )
}

MyApp.getInitialProps = async (context: AppContext) => {
  const pageProps = await App.getInitialProps(context);
  const { data = {} } = await axios.get(`${LOCALDOMAIN}/api/layout`)
  return {
    ...pageProps,
    ...data,
    isMobile: getIsMobile(context),
  }
}
export default appWithTranslation(MyApp);
```

## 业务功能实现     

官网作为一个品牌形象的载体，肯定需要大量的文章或信息，来进行文化价值观的传输，文章的内容一多，自然需要为它实现对应的分页。  

### 文章页分页  

#### 样式实现  

分页的组件使用 semi-design (其它UI框架方法类似) 来实现。

```shell
npm install @douyinfe/semi-ui --save
```

给首页文章块下面加一个分页。

pages/index.tsx

```tsx
import { Pagination } from "@douyinfe/semi-ui";
// ...
<div className={styles.paginationArea}>
    <Pagination total={articles?.total} pageSize={6} />
</div>
```

Nextjs 希望可以自主导入依赖中的样式，而不是随着依赖直接导入样式，避免对全局样式造成影响。

Semi 的依赖默认是在入口文件统一导入的，针对这种情况，Semi 提供了 semi-next 插件来对入口文件样式进行去除。

```shell
npm i @douyinfe/semi-next
```

安装好 semi-next 后，到 nextjs 的配置文件，用 semi-next 包裹一层配置文件，进行默认导入样式的去除。

next.config.js

```js
/** @type {import('next').NextConfig} */
const path = require('path');
const semi = require('@douyinfe/semi-next').default({});

const nextConfig = semi({
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ['127.0.0.1'],
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname),
    };
    return config;
  }
});

module.exports = nextConfig
```

在全局样式中手动导入 Semi 的样式。

styles/global.css

```css
@import "~@douyinfe/semi-ui/dist/css/semi.min.css";
```

针对分页组件覆盖一下主题化的样式，样式覆盖是通过 global 样式去做。

styles/Home.module.scss

```scss
@import "./pages/media.scss";

@mixin initStatus {
  transform: translate3d(0, 2.5rem, 0);
  opacity: 0;
}

@mixin finalStatus {
  -webkit-transform: none;
  transform: none;
  opacity: 1;
}

.container {
  padding: 0 2rem;
  color: var(--primary-color);

  .main {
    min-height: 100vh;
    padding: 4rem 0;
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    .header {
      background-image: var(--home-background-icon);
      background-size: 18.75rem 18.75rem;
      background-repeat: no-repeat;
      width: 18.75rem;
      height: 18.75rem;
    }

    .headerWebp {
      background-image: var(--home-background-icon-webp);
    }

    .top {
      display: flex;
    }

    .title a {
      color: var(--link-color);
      text-decoration: none;
    }

    .title a:hover,
    .title a:focus,
    .title a:active {
      text-decoration: underline;
    }

    .title {
      margin: 0;
      line-height: 1.15;
      font-size: 4rem;
    }

    .title,
    .description {
      text-align: center;
    }

    .description {
      margin: 4rem 0;
      line-height: 1.5;
      font-size: 1.5rem;
    }

    .grid {
      display: flex;
      align-items: flex-start;
      justify-content: flex-start;
      flex-wrap: wrap;
      max-width: 62.5rem;
      transition: 2s;
      min-height: 36.25rem;
      .card {
        margin: 1rem;
        padding: 1.5rem;
        text-align: left;
        color: inherit;
        text-decoration: none;
        border: 0.0625rem solid var(--footer-background-color);
        border-radius: 0.625rem;
        transition: color 0.15s ease, border-color 0.15s ease;
        max-width: 18.75rem;
        cursor: pointer;
        width: 18.75rem;
        height: 13.875rem;
      }

      .card:hover,
      .card:focus,
      .card:active {
        color: var(--link-color);
        border-color: var(--link-color);
      }

      .card h2 {
        margin: 0 0 1rem 0;
        font-size: 1.5rem;
      }

      .card p {
        margin: 0;
        font-size: 1.25rem;
        line-height: 1.5;
      }
    }

    .paginationArea {
      width: 62.5rem;
      display: flex;
      justify-content: flex-end;
      padding: 20px 0;

      :global {
        .semi-page-item {
          color: var(--primary-color);
          opacity: 0.7;
        }

        .semi-page-item:hover {
          background-color: var(--semi-page-hover-background-color);
        }

        .semi-page-item-active {
          color: var(--semi-page-active-color);
          background-color: var(--semi-page-active-background-color);
        }

        .semi-page-item-active:hover {
          color: var(--semi-page-active-color);
          background-color: var(--semi-page-active-background-color);
        }
      }
    }
  }

  .withAnimation {
    .title {
      animation: fadeInDown1 1s;
    }

    .description {
      animation: fadeInDown2 1s;
    }

    .card:nth-of-type(1) {
      animation: fadeInDown3 1s;
    }

    .card:nth-of-type(2) {
      animation: fadeInDown4 1s;
    }

    .card:nth-of-type(3) {
      animation: fadeInDown5 1s;
    }

    .card:nth-of-type(4) {
      animation: fadeInDown6 1s;
    }

    .card:nth-of-type(5) {
      animation: fadeInDown7 1s;
    }

    .card:nth-of-type(6) {
      animation: fadeInDown8 1s;
    }
  }

  @keyframes fadeInDown1 {
    0% {
      @include initStatus;
    }

    11% {
      @include initStatus;
    }

    100% {
      @include finalStatus;
    }
  }

  @keyframes fadeInDown2 {
    0% {
      @include initStatus;
    }

    22% {
      @include initStatus;
    }

    100% {
      @include finalStatus;
    }
  }

  @keyframes fadeInDown3 {
    0% {
      @include initStatus;
    }

    33% {
      @include initStatus;
    }

    100% {
      @include finalStatus;
    }
  }

  @keyframes fadeInDown4 {
    0% {
      @include initStatus;
    }

    44% {
      @include initStatus;
    }

    100% {
      @include finalStatus;
    }
  }

  @keyframes fadeInDown5 {
    0% {
      @include initStatus;
    }

    55% {
      @include initStatus;
    }

    100% {
      @include finalStatus;
    }
  }

  @keyframes fadeInDown6 {
    0% {
      @include initStatus;
    }

    66% {
      @include initStatus;
    }

    100% {
      @include finalStatus;
    }
  }

  @keyframes fadeInDown7 {
    0% {
      @include initStatus;
    }

    77% {
      @include initStatus;
    }

    100% {
      @include finalStatus;
    }
  }

  @keyframes fadeInDown8 {
    0% {
      @include initStatus;
    }

    88% {
      @include initStatus;
    }

    100% {
      @include finalStatus;
    }
  }
}

@include media-ipad {
  .container {
    .main {
      .grid {
        width: 95%;
        margin: auto;
        justify-content: center;
      }
    }
  }
}

@include media-mobile {
  .container {
    .main {
      .title {
        font-size: 1.75rem;
        line-height: 2.4375rem;
      }
      .description {
        font-size: 0.875rem;
        line-height: 1.5rem;
        margin: 2rem 0;
      }
      .grid {
        width: 95%;
        margin: auto;
        justify-content: center;
        .card {
          height: 10rem;
          h2 {
            font-size: 1.125rem;
            line-height: 1.5625rem;
          }
          p {
            font-size: 0.75rem;
            line-height: 1.625rem;
          }
        }
      }
    }
  }
}
```

实现效果：

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/ssr/img_47.png" alt="" width="700" />  

#### 接口层实现  

设计三个结构体，ArticleInfo、ArticleIntroduction 和 Home，其中 Home 就是首页那两个基础文案，ArticleIntroduction 是文章相关的简介，link 指向 ArticleInfo 对应元素的 id 即可。  

这里文章内容单独放在 ArticleInfo，之所以这么做，是因为考虑到文章内容往往很多，如果放在 ArticleIntroduction 中进行分页，cdn 拉取的时间随着文章的增多，可能会越来越长。  

启动一下 CMS 的项目，配置对应的结构体，填上数据。  

Home:  

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/ssr/img_48.png" alt="" width="700" />  
<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/ssr/img_51.png" alt="" width="700" />  

ArticleIntroduction:

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/ssr/img_49.png" alt="" width="700" />  
<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/ssr/img_52.png" alt="" width="700" />  

ArticleInfo:

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/ssr/img_50.png" alt="" width="700" />  
<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/ssr/img_53.png" alt="" width="700" />  

其中富文本区域的配置需要着重关注一下，其中包含了文本、标题和图片，这个其实和平常用的一些文本编辑器还是很像的，点击 preview mode 处可以看到效果，按照平时写笔记的习惯，用 markdown 语言去配置文章就可以了。  

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/ssr/img_54.png" alt="" width="700" />  

按照之前的配置，给这些结构体开一下 find、findone 等配置。  

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/ssr/img_55.png" alt="" width="700" />  

随便开一个模块看看。  

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/ssr/img_56.png" alt="" width="700" />  

好像有 time 等相关数据，参照上次，把对应用不上的数据清掉。  

home controller 

```js
'use strict';

/**
 * home controller
 */
const { removeTime, removeAttrsAndId } = require('../../../utils/index');
const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::home.home', ({ strapi }) => ({
  async find(ctx) {
    ctx.query = {
      ...ctx.query,
      populate: 'deep',
    };
    const { data } = await super.find(ctx);
    return removeAttrsAndId(removeTime(data[0]));
  }
}));
```

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/ssr/img_57.png" alt="" width="700" />  

需要对 ArticleIntroduce 做一个分页的操作，Strapi 中针对分页的操作提供了 pagination[page] 和 pagination[pageSize] 两个参数，类似下面的效果。  

```
/api/articles?pagination[page]=1&pagination[pageSize]=10 // 按10个/页分页，返回第一页的数据
```

这两个参数太长了，定义两个自己的参数，pageNo, pageSize，然后在它的基础上魔改一下就可以，具体代码如下：  

article-introduction controller  

```js
"use strict";
const { removeTime, removeAttrsAndId } = require("../../../utils/index.js");

/**
 *  article-introduction controller
 */

const { createCoreController } = require("@strapi/strapi").factories;

module.exports = createCoreController("api::article-introduction.article-introduction", ({ strapi }) => ({
    async find(ctx) {
      const { pageNo, pageSize, ...params } = ctx.query;
      if (pageNo && pageSize) {
        ctx.query = {
          ...params,
          "pagination[page]": Number(pageNo),
          "pagination[pageSize]": Number(pageSize),
        };
      }
      const { data, meta } = await super.find(ctx);
      return { data: removeAttrsAndId(removeTime(data)), meta };
    },
  })
);

```

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/ssr/img_58.png" alt="" width="700" />  

article-info controller  

```js
"use strict";
const { removeTime, removeAttrsAndId } = require("../../../utils/index.js");

/**
 *  article-info controller
 */

const { createCoreController } = require("@strapi/strapi").factories;

module.exports = createCoreController("api::article-info.article-info", ({ strapi }) => ({
    async find(ctx) {
      const { data, meta } = await super.find(ctx);
      return { data: removeAttrsAndId(removeTime(data)), meta };
    },
    async findOne(ctx) {
      const { data, meta } = await super.findOne(ctx);
      return removeAttrsAndId(removeTime(data));
    },
  })
);
```

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/ssr/img_59.png" alt="" width="700" />  

接下来开始编写 BFF 层的代码，三个结构体分别对应三个接口层。   

pages/api/home.ts  

```ts
import axios from 'axios';
import type { NextApiRequest, NextApiResponse } from 'next';
import nextConnect from 'next-connect';
import { CMSDOMAIN } from '@/utils';

export interface IHomeProps {
  title: string;
  description: string;
}

const getHomeData = nextConnect()
  .get((req: NextApiRequest, res: NextApiResponse<IHomeProps>) => {
    axios.get(`${CMSDOMAIN}/api/homes`).then(result => {
      const { title, description } = result.data || {};
      res.status(200).json({
        title,
        description,
      })
    })
  })

export default getHomeData;
```

接下来是文章简介的接口，它可以接受分页的两个入参进行对应的分页。  

pages/api/articleIntroduction.ts   

```ts
import axios from 'axios';
import type { NextApiRequest, NextApiResponse } from 'next';
import nextConnect from 'next-connect';
import { CMSDOMAIN } from '@/utils';

export interface IArticleIntroduction {
  label: string;
  info: string;
  articleId: number;
}

export interface IArticleIntroductionProps {
  list: IArticleIntroduction[];
  total: number;
}

const ArticleIntroductionData = nextConnect()
  .post((req: NextApiRequest, res: NextApiResponse<IArticleIntroductionProps>) => {
    const { pageNo, pageSize } = req.body;
    axios.get(`${CMSDOMAIN}/api/article-introductions`, {
      params: {
        pageNo,
        pageSize,
      }
    }).then(result => {
      const { data, meta } = result.data || {};
      res.status(200).json({
        list: Object.values(data),
        total: meta.pagination.total,
      })
    })
  })

export default ArticleIntroductionData;

```

list 需要用 Object.values 包一层 data，因为针对没有 relation 的多个元素，Strapi 是通过 object 类型返回，所以需要处理一层转成需要的数组格式。    

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/ssr/img_60.png" alt="" width="700" />  

最后一个接口是文章详情接口，接口包含一个 id 的入参，可以支持对数据进行单查，直接调用 Strapi 的 findOne 接口实现就好。  

pages/api/articleInfo.ts  

```ts
import axios from 'axios';
import nextConnect from 'next-connect';
import type { NextApiRequest, NextApiResponse } from 'next';
import { CMSDOMAIN } from '@/utils';
import { IArticleProps } from '@/pages/article/[articleId]';

const getArticleInfoData = nextConnect()
  .get((req: NextApiRequest, res: NextApiResponse<IArticleProps>) => {
    const { articleId } = req.query;
    axios.get(`${CMSDOMAIN}/api/article-infos/${articleId}`).then(result => {
      const data = result.data || {};
      res.status(200).json(data);
    })
  })

export default getArticleInfoData;
```

到这里 BFF 层就定义好了，接下来改造一下首页，接入一下接口替换原先的静态数据。  

pages/index.tsx  

```tsx
// ...
Home.getInitialProps = async (context) => {
  const { data: homeData } = await axios.get(`${LOCALDOMAIN}/api/home`);
  const { data: articleData } = await axios.post(
    `${LOCALDOMAIN}/api/articleIntro`,
    {
      pageNo: 1,
      pageSize: 6,
    }
  );

  return {
    title: homeData.title,
    description: homeData.description,
    articles: {
      list: articleData.list.map((item: IArticleIntro) => {
        return {
          label: item.label,
          info: item.info,
          link: `${LOCALDOMAIN}/article/${item.articleId}`,
        };
      }),
      total: articleData.total,
    },
  };
};
```

然后看看效果，数据已经注入进去了。   

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/ssr/img_61.png" alt="" width="700" />  

把客户端的分页事件绑定一下。  

pages/index.tsx   

```tsx
import {useContext, useEffect, useRef, useState} from 'react';
import axios from 'axios';
import type {NextPage} from 'next';
import {Pagination} from '@douyinfe/semi-ui';
import classNames from 'classnames';
import {ThemeContext} from '@/stores/theme';
import styles from '@/styles/Home.module.scss';
import {LOCALDOMAIN} from "@/utils";
import {IArticleIntroduction} from "@/pages/api/articleIntroduction";

interface IHomeProps {
  title: string;
  description: string;
  articles: {
    list: {
      label: string;
      info: string;
      link: string;
    }[];
    total: number;
  };
}

const Home: NextPage<IHomeProps> = ({ title, description, articles }) => {
  const [content, setContent] = useState(articles);
  const mainRef = useRef<HTMLDivElement>(null);
  const { theme } = useContext(ThemeContext);

  useEffect(() => {
    mainRef.current?.classList.remove(styles.withAnimation);
    window.requestAnimationFrame(() => {
      mainRef.current?.classList.add(styles.withAnimation);
    });
  }, [theme]);

  return (
    <div className={styles.container}>
      <main
        className={classNames([styles.main, styles.withAnimation])}
        ref={mainRef}
      >
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.description}>{description}</p>
        <div className={styles.grid}>
          {content?.list?.map((item, index) => {
            return (
              <div
                key={index}
                className={styles.card}
                onClick={(): void => {
                  window.open(
                    item.link,
                    "blank",
                    "noopener=yes,noreferrer=yes"
                  );
                }}
              >
                <h2>{item.label}</h2>
                <p>{item.info}</p>
              </div>
            );
          })}
          <div className={styles.paginationArea}>
            <Pagination
              total={content?.total}
              pageSize={6}
              onPageChange={(pageNo) => {
                axios
                  .post(`${LOCALDOMAIN}/api/articleIntro`, {
                    pageNo,
                    pageSize: 6,
                  })
                  .then(({ data }) => {
                    setContent({
                      list: data.list.map((item: IArticleIntro) => {
                        return {
                          label: item.label,
                          info: item.info,
                          link: `${LOCALDOMAIN}/article/${item.articleId}`,
                        };
                      }),
                      total: data.total,
                    });
                  });
              }}
            />
          </div>
        </div>
      </main>
    </div>
  );
};

/// ...
````

接下来给对应的文章页面绑定一下接口数据。  

pages/article/[articleId].tsx  
 
```tsx
Article.getInitialProps = async (context) => {
  const { articleId } = context.query;
  const { data } = await axios.get(`${LOCALDOMAIN}/api/articleInfo`, {
    params: {
      articleId,
    }
  })
  return data;
}

export default Article;
```

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/ssr/img_62.png" alt="" width="700" />  

这里有个问题需要注意下，内容是 Markdown，Markdown 转 HTML 可以使用 showdown，这是一个免费的开源转换 markdown 为 HTML 的库，安装依赖。  

```shell
npm install showdown --save
```

然后对页面的 content 进行一下转换。  

```tsx
import React from 'react';
import axios from 'axios';
import type { NextPage } from 'next';
import {LOCALDOMAIN} from '@/utils';
import styles from './index.module.scss';

const showdown = require('showdown');

export interface IArticleProps {
  title: string;
  author: string;
  description: string;
  createTime: string;
  content: string;
}

const Article: NextPage<IArticleProps> = ({ title, author, description, createTime, content }) => {
  const converter = new showdown.Converter();
  return (
    <div className={styles.article}>
      <h1 className={styles.title}>{title}</h1>
      <div className={styles.info}>
        作者：{author} | 创建时间: {createTime}
      </div>
      <div className={styles.description}>{description}</div>
      <div className={styles.content} dangerouslySetInnerHTML={{__html: converter.makeHtml(content)}} />
    </div>
  );
};

Article.getInitialProps = async (context) => {
  const { articleId } = context.query;
  const { data } = await axios.get(`${LOCALDOMAIN}/api/articleInfo`, {
    params: {
      articleId,
    }
  })
  return data;
}

export default Article;
```

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/ssr/img_63.png" alt="" width="700" />  

## 国际化功能

官网不一定是给一个国家的人看的，可能公司或是团队的业务是针对多个地区的，语言不应该成为价值观传输的阻碍，所以如果是多地区业务线的公司，实现多语言也是很必要的。   

安装相关依赖包：  

```shell
npm install i18next next-i18next react-i18next
```

next-i18next 包提供了 appWithTranslation一个高阶组件（HOC），需要用这个高阶组件包装整个应用程序。  

pages/_app.tsx  

```tsx
import type { AppProps, AppContext } from 'next/app';
import App from 'next/app';
import Head from 'next/head';
import axios from 'axios';
import ThemeContextProvider from '@/stores/theme';
import UserAgentProvider from '@/stores/userAgent';
import { LOCALDOMAIN, getIsMobile } from '@/utils';
import type { ILayoutProps } from '@/components/layout';
import { appWithTranslation } from 'next-i18next';
import Layout from '@/components/layout';
import '@/styles/globals.css'

const MyApp = (data: AppProps & ILayoutProps & { isMobile: boolean }) => {
  const {
    Component, pageProps, navbarData, footerData, isMobile
  } = data;
  return (
    <div>
      <Head>
        <title>{`A Demo for 官网开发实战 (${
          isMobile ? "移动端" : "pc端"
        })`}</title>
        <meta
          name="description"
          content="A Demo for 官网开发实战"
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <ThemeContextProvider>
        <UserAgentProvider>
          <Layout navbarData={navbarData} footerData={footerData}>
            <Component {...pageProps} />
          </Layout>
        </UserAgentProvider>
      </ThemeContextProvider>
    </div>
  )
}

MyApp.getInitialProps = async (context: AppContext) => {
  const pageProps = await App.getInitialProps(context);
  const { data = {} } = await axios.get(`${LOCALDOMAIN}/api/layout`)
  return {
    ...pageProps,
    ...data,
    isMobile: getIsMobile(context),
  }
}
export default appWithTranslation(MyApp);
```

现在为 next-i18next 创建一个配置文件，在项目根目录下创建文件 next-i18next.config.js 并添加如下配置。  

```js
module.exports = {
  i18n: {
    defaultLocale: 'zh-CN',
    locales: ['en_US', 'zh-CN'],
  },
  ns: ['header', 'main', 'footer', 'common']
}
```

* locales: 包含网站上需要的语言环境的数组。  

* defaultLocale: 要显示的默认语言环境。  

现在将创建的 i18next 配置导入到 next.config.js 中。  

```js
/** @type {import('next').NextConfig} */
const path = require('path');
const semi = require('@douyinfe/semi-next').default({});
const { i18n } = require('./next-i18next.config');

const nextConfig = semi({
  reactStrictMode: true,
  swcMinify: true,
  i18n,
  images: {
    domains: ['127.0.0.1'],
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname),
    };
    return config;
  }
});

module.exports = nextConfig
```

现在开始在应用程序中添加语言环境，在 public 目录下新建 locales 目录。  

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/ssr/img_64.png" alt="" width="300" />  

public/locales/en_US/main.json  

```json
{
  "IpadStyle": "Currently Ipad style",
  "PCStyle": "Currently it is PC style",
  "MobileStyle": "Currently in mobile style"
}
```

public/locales/zh_CN/main.json

```json
{
  "IpadStyle": "当前是Ipad端样式",
  "PCStyle": "当前是pc端样式",
  "MobileStyle": "当前是移动端样式"
}

```

类似于主题化注入，针对语言也先来定义一套注入器（Context)，通过缓存的方式统一管理，然后进行全局的注入。  

constants/enum  

```ts
export enum Language {
  ch = "zh-CN",
  en = "en_US",
}
```

stores/language.tsx  

```tsx
import {createContext, FC, useEffect, useState} from 'react';
import {Language} from '@/constants/enum';

interface ILanguageContextProps {
  language: Language;
  setLanguage: (language: Language) => void;
}

interface ILanguageContextProviderProps {
  children: JSX.Element;
}

export const LanguageContext = createContext<ILanguageContextProps>({} as ILanguageContextProps);

const LanguageContextProvider: FC<ILanguageContextProviderProps> = ({children}) => {
  const [language, setLanguage] = useState<Language>(Language.ch);
  useEffect(() =>  {
    const checkLanguage = () => {
      const item = localStorage.getItem('language') as Language || Language.ch;
      setLanguage(item);
      document.getElementsByTagName('html')[0].lang = item;
    }
    // 初始化先执行一遍
    checkLanguage();
    // 监听浏览器缓存事件
    window.addEventListener('storage', checkLanguage);
    return (): void => {
      // 解绑
      window.removeEventListener('storage', checkLanguage);
    }
  }, []);
  return (
    <LanguageContext.Provider value={{
      language,
      setLanguage: (currentLanguage) => {
        setLanguage(currentLanguage);
        localStorage.setItem('language', currentLanguage);
        document.getElementsByTagName('html')[0].lang = currentLanguage;
      }
    }}>
      {children}
    </LanguageContext.Provider>
  )
}

export default LanguageContextProvider;
```

导入 serverSideTranslations，在 getServerSideProps 中进行道具传递。  

pages/index.tsx  

```tsx
import {useContext, useEffect, useRef, useState} from 'react';
import axios from 'axios';
import type {NextPage} from 'next';
import {Pagination} from '@douyinfe/semi-ui';
import classNames from 'classnames';
import {ThemeContext} from '@/stores/theme';
import {useTranslation} from 'next-i18next';
import {serverSideTranslations} from 'next-i18next/serverSideTranslations';
import styles from '@/styles/Home.module.scss';
import {LOCALDOMAIN} from "@/utils";
import {IArticleIntroduction} from "@/pages/api/articleIntroduction";
import {LanguageContext} from "@/stores/language";
import {useRouter} from "next/router";

interface IHomeProps {
  title: string;
  description: string;
  articles: {
    total: number;
    list: {
      label: string;
      info: string;
      link: string;
    }[];
  };
}

const Home: NextPage<IHomeProps> = ({
  title, description, articles
}) => {
  const { i18n } = useTranslation();
  const router = useRouter();
  const { locale } = router;
  const [content, setContent] = useState(articles);
  const mainRef = useRef<HTMLDivElement>(null);
  const { theme } = useContext(ThemeContext);
  const { language } = useContext(LanguageContext);
  useEffect(() => {
    mainRef.current?.classList.remove(styles.withAnimation);
    window.requestAnimationFrame(() => {
      mainRef.current?.classList.add(styles.withAnimation);
    });
  }, [theme]);

  useEffect(() => {
    i18n?.changeLanguage(locale);
    console.warn(locale)
  }, [language, locale])
  return (
    <div className={styles.container}>
      <main className={classNames([styles.main, styles.withAnimation])} ref={mainRef}>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.description}>{description}</p>
        <div className={styles.grid}>
          {
            content?.list?.map((item, index) => {
              return (
                <div key={index} className={styles.card} onClick={(): void => {
                  window.open(
                    item?.link,
                    "blank",
                    "noopener=yes,noreferrer=yes"
                  );
                }}>
                  <h2>{item?.label}</h2>
                  <p>{item?.info}</p>
                </div>
              )
            })
          }
        </div>
        <div className={styles.paginationArea}>
          <Pagination total={content?.total} pageSize={6} onPageChange={pageNo => {
            axios.post(`${LOCALDOMAIN}/api/articleIntroduction`, {
              pageNo,
              pageSize: 6,
            }).then(({ data: {
              total,
              list: listData,
            }}) => {
              setContent({
                list: listData?.map((item: IArticleIntroduction) => ({
                  label: item.label,
                  info: item.info,
                  link: `${LOCALDOMAIN}/article/${item.articleId}`,
                })),
                total,
              })
            })
          }} />
        </div>
      </main>
    </div>
  )
}

export const getServerSideProps = async ({ locale }: { locale: string }) => {
  const {
    data: {
      title, description,
    }
  } = await axios.get(`${LOCALDOMAIN}/api/home`);
  const {
    data: {
      list: listData, total,
    }} = await axios.post(`${LOCALDOMAIN}/api/articleIntroduction`, {
      pageNo: 1,
      pageSize: 6,
    })
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common', 'footer', 'header', 'main'])),
      title,
      description,
      articles: {
        total,
        list: listData?.map((item: IArticleIntroduction) => ({
          label: item.label,
          info: item.info,
          link: `${LOCALDOMAIN}/article/${item.articleId}`,
        }))
      },
    }

  };
}

export default Home;
```

在 pages/_document.tsx 中进行交互前注入:

```tsx
import Document, {Html, Head, Main, NextScript, DocumentContext} from 'next/document'
import Script from 'next/script';
import {Language} from '@/constants/enum';

const MyDocument = () => {
  return (
    <Html>
      <Head />
      <body>
      <Main />
      <NextScript />
      <Script id="theme-script" strategy="beforeInteractive">
        {
          `const theme = localStorage.getItem('theme') || 'light';
           localStorage.setItem('theme', theme);
           document.getElementsByTagName('html')[0].dataset.theme = theme;
           const language = localStorage.getItem('language') || 'zh-CN';
           localStorage.setItem('language', language);
           document.getElementsByTagName('html')[0].lang = language;
           `
        }
      </Script>
      </body>
    </Html>
  )
}

export const getServerSideProps = async (context: DocumentContext & {locale: string}) => {
  const initialProps = await Document.getInitialProps(context);
  return { ...initialProps, locale: context?.locale || Language.ch };
}
export default MyDocument;
```

修改导航组件，添加语言环境切换器。  

components/NavBar/index.tsx   

```tsx
import {FC, useContext, useEffect} from 'react';
import Link from "next/link";
import {useTranslation} from 'next-i18next';
import {ThemeContext} from '@/stores/theme';
import {UserAgentContext} from '@/stores/userAgent';
import {Environment, Language, Themes} from '@/constants/enum';
import styles from './index.module.scss';
import {LanguageContext} from "@/stores/language";
import {useRouter} from "next/router";

export interface INavBarProps {}

const NavBar: FC<INavBarProps> = ({}) => {
  const { t } = useTranslation('main');
  const router = useRouter();
  const { locales, locale: activeLocale } = router;
  const otherLocales = locales?.filter(
    (locale) => locale !== activeLocale && locale !== "default"
  );
  const { setTheme } = useContext(ThemeContext);
  const { setLanguage } = useContext(LanguageContext);
  const { userAgent } = useContext(UserAgentContext);
  useEffect(() => {
    setLanguage(router.locale as Language);
  }, [router.locale]);
  return (
    <div className={styles.navBar}>
      <a href="http://localhost:3000/">
        <div className={styles.logoIcon} />
      </a>
      <div className={styles.themeArea}>
        {userAgent === Environment.pc && (
          <span className={styles.text}>{t('PCStyle')}</span>
        )}
        {userAgent === Environment.ipad && (
          <span className={styles.text}>{t('IpadStyle')}</span>
        )}
        {userAgent === Environment.mobile && (
          <span className={styles.text}>{t('MobileStyle')}</span>
        )}
      </div>
      {otherLocales?.map((locale) => {
        const { pathname, query, asPath } = router;
        return (
          <span key={locale}>
            <Link href={{ pathname, query }} as={asPath} locale={locale}>
              {locale}
            </Link>
          </span>
        );
      })}
      <div className={styles.themeIcon} onClick={(): void => {
        setTheme(localStorage.getItem('theme') === Themes.light ? Themes.dark : Themes.light);
      }}/>
    </div>
  )
}

export default NavBar;
```

在这里获得了 i18next 配置文件中提到的语言环境，然后映射每个区域设置项目并单击每个将链接如下：  

```
<Link href={{ pathname, query }} as={asPath} locale={locale}>
```

上面的链接会将应用程序的区域设置 URL 更改为选择的相应区域设置。  

useTranslation 从 next-i18next 包中导入钩子。  

```
import { useTranslation } from "next-i18next";
```

现在可以使用一个函数来获取在 locales 目录 t() 中的 locale 文件中添加的语言字符串。  

例如，下面的代码将从选择的相应语言环境（en_US 或 zh_CN）中获取字符串。  

```
const { t } = useTranslation();

return (
    <>
      <span className={styles.text}>{t('MobileStyle')}</span>
    </>
  );
```

实现效果：  

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/ssr/img_65.png" alt="" width="700" />  
<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/ssr/img_66.png" alt="" width="700" />  

## 自定义弹窗组件  

不同的业务场景可能需要不同的渐入渐出动画，平常组件库的弹窗组件并不容易在原有基础上覆盖自定义动画，所以来开发一个自己的自定义动画弹窗组件。   

### 静态样式

与平常组件不同，弹窗组件至少需要暴露一个 open 方法给外部进行调用，这就需要用到 forwardRef，它可以将 ref 中的方法暴露给外部进行相关的调用。  

创建一个 popup组件，然后写一下它的静态样式，其中 IPopupRef 是弹窗暴露的 ref 类型，而 IPopupProps 是组件本身的类型，useImperativeHandle 是组件 ref 暴露给外部调用的方法定义，暴露回去的回调方法类型需要和 ref 类型相同。  

component/popup/index.tsx  

```tsx
import React, {forwardRef, useImperativeHandle, useState,} from 'react';
import styles from './index.module.scss';
import classNames from 'classnames';

export interface IPopupRef {
  open: () => void;
}

interface IPopupProps {
  children: JSX.Element;
}

const Popup = forwardRef<IPopupRef, IPopupProps>(({children}, ref) => {
  const [visible, setVisible] = useState<boolean>(false);
  useImperativeHandle(ref, () => ({
    open: (): void => {
      setVisible(true);
    }
  }));
  return visible ? (<div className={classNames({
      [styles.popup]: true,
      [styles.enter]: enter,
      [styles.leave]: leave,
    })}>
      <div className={styles.mask} />
      <div className={styles.popupContent}>
        <div className={styles.closeBtn} onClick={(): void => {
          setVisible(false);
        }} />
        {children}
      </div>
    </div>) : null;
});

export default Popup;
```

然后写一下静态的样式，相关的全局主题化变量也定义一下。   

components/popup/index.module.scss  

```scss
@import "./pages/media.scss";

.popup {
  width: 100%;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  position: fixed;
  top: 0;
  left: 0;
  z-index: 10000;

  .mask {
    width: inherit;
    height: inherit;
    position: fixed;
    background-color: #000;
    opacity: 0.5;
    top: 0;
    left: 0;
    z-index: 10;
  }

  .popupContent {
    position: relative;
    border-radius: 0.25rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background-color: var(--popup-content-background-color);
    z-index: 20;
    min-width: 25rem;
    min-height: 25rem;

    .closeBtn {
      width: 2.125rem;
      height: 2.125rem;
      background-color: inherit;
      background-image: var(--popup-close-icon);
      background-position: center;
      background-size: 1rem 1rem;
      background-repeat: no-repeat;
      position: absolute;
      top: 1.1875rem;
      right: 1.1875rem;
      cursor: pointer;
      z-index: 100;
    }

    .closeBtn:hover {
      background-color: var(--popup-close-hover-background-color);
    }
  }
}

@include media-mobile {
  .popup {
    .dialogContent {
      .closeBtn {
        width: 0.6875rem;
        height: 0.6875rem;
        top: 1.3125rem;
        right: 0.875rem;
      }
    }
  }
}

@include media-ipad {
  .dialog {
    .dialogContent {
      .titleArea {
        padding: 1.5rem 1.5625rem;
      }
    }
  }
}

```

styles/globals.css   

```css
html[data-theme="dark"] {
  --primary-color: #ffffff;
  --primary-background-color: rgba(14, 14, 14, 1);
  --footer-background-color: rgba(36, 36, 36, 1);
  --navbar-background-color: rgba(0, 0, 0, 0.5);
  --secondary-color: rgba(255, 255, 255, 0.5);
  --link-color: #34a8eb;
  --navbar-icon: url('../public/logo_dark.png');
  --theme-icon: url('../public/theme_dark.png');
  --popup-close-icon: url('../public/close.png');
  --popup-close-hover-background-color: #353535;
  --popup-content-background-color: #1f1f1f;
}

html[data-theme="light"] {
  --primary-color: #333333;
  --primary-background-color: rgba(255, 255, 255, 1);
  --footer-background-color: #f4f5f5;
  --navbar-background-color: rgba(255, 255, 255, 0.5);
  --secondary-color: #666666;
  --link-color: #0070f3;
  --navbar-icon: url('../public/logo_light.png');
  --theme-icon: url('../public/theme_light.png');
  --popup-close-icon: url('../public/close_light.png');
  --popup-close-hover-background-color: #f5f5f5;
  --popup-content-background-color: #f4f5f5;
}
```

在 navbar 加一个入口。  

component/navbar/index.tsx  

```tsx
import {FC, useContext, useEffect, useRef} from 'react';
import Link from "next/link";
import Popup from '@/components/popup';
import { IPopupRef } from '@/components/popup';
import {useTranslation} from 'next-i18next';
import {ThemeContext} from '@/stores/theme';
import {UserAgentContext} from '@/stores/userAgent';
import {Environment, Language, Themes} from '@/constants/enum';
import styles from './index.module.scss';
import {LanguageContext} from "@/stores/language";
import {useRouter} from "next/router";

export interface INavBarProps {}

const NavBar: FC<INavBarProps> = ({}) => {
  const { t } = useTranslation('main');
  const router = useRouter();
  const popupRef = useRef<IPopupRef>(null);
  const { locales, locale: activeLocale } = router;
  const otherLocales = locales?.filter(
    (locale) => locale !== activeLocale && locale !== "default"
  );
  const { setTheme } = useContext(ThemeContext);
  const { setLanguage } = useContext(LanguageContext);
  const { userAgent } = useContext(UserAgentContext);
  useEffect(() => {
    setLanguage(router.locale as Language);
  }, [router.locale]);
  return (
    <div className={styles.navBar}>
      <a href="http://localhost:3000/">
        <div className={styles.logoIcon} />
      </a>
      <div className={styles.themeArea}>
        {userAgent === Environment.pc && (
          <span className={styles.text}>{t('PCStyle')}</span>
        )}
        {userAgent === Environment.ipad && (
          <span className={styles.text}>{t('IpadStyle')}</span>
        )}
        {userAgent === Environment.mobile && (
          <span className={styles.text}>{t('MobileStyle')}</span>
        )}
        <div className={styles.popupText} onClick={(): void => popupRef.current?.open()}>弹窗示范</div>
        <div className={styles.language}>
          {otherLocales?.map((locale) => {
            const { pathname, query, asPath } = router;
            return (
              <span key={locale}>
            <Link href={{ pathname, query }} as={asPath} locale={locale}>
              {locale}
            </Link>
          </span>
            );
          })}
        </div>
        <div className={styles.themeIcon} onClick={(): void => {
          setTheme(localStorage.getItem('theme') === Themes.light ? Themes.dark : Themes.light);
        }}/>
      </div>
      <Popup ref={popupRef}>
        <div>这是一个弹窗</div>
      </Popup>
    </div>
  )
}

export default NavBar;
```

效果实现：    

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/ssr/img_67.png" alt="" width="700" />  

### 遮罩层滚动穿透  

这时候存在一个问题，在有遮罩层的时候，最外层仍然是可以滚动的，这个问题称作为滚动穿透现象，其实也很好理解，最外层的区域（body) 仍然是可以产生滚动的，仅仅是给了 100vh 的遮罩层，所以并不能阻止滚动的产生。  

解决方案也很简单，只需要在遮罩层的时候，在 body 手动加上一个类来限制它的高度即可。  

components/popup/index.tsx  

```
// ...
useEffect(() => {
document.body.className = visible ? "forbidScroll" : "";
}, [visible]);
```

styles/globals.css  

```css
.forbidScroll {
  height: 100vh;
  overflow: hidden;
}
```

现在可以发现已经不会再滚动了。   

### 指定渲染位置 

打开控制台的 Elements，通过选取元素选中弹窗，可以看到渲染的位置是在对应组件调用的 dom 下的。

这样其实会存在一个问题，因为被嵌套在别的 dom 下，包括样式、事件在内的很多情况，弹窗组件可能都会受到影响，作为一个通用的组件是不希望弹窗的展现因为外界的情况而有所变化的，所以不应该把它渲染在父级区域下。  

在 React 16，有提供一个 api，ReactDom.createPortal， 它提供了将子节点渲染到存在于父组件以外的 DOM 节点的能力，通过这个 api 可以将弹窗组件渲染到 body 下，这样就可以有效解决这个问题，因为需要使用到 BOM 的问题，所以需要进行判空。  

component/popup/index.tsx  

```tsx
import React, {forwardRef, useImperativeHandle, useState} from 'react';
import {createPortal} from 'react-dom';
import styles from './index.module.scss';
import classNames from 'classnames';

export interface IPopupRef {
  open: () => void;
}

interface IPopupProps {
  children: JSX.Element;
}

const Popup = forwardRef<IPopupRef, IPopupProps>(({children}, ref) => {
  const [visible, setVisible] = useState<boolean>(false);
  useImperativeHandle(ref, () => ({
    open: (): void => {
      setVisible(true);
    }
  }));
  return visible ? (
    createPortal((<div className={classNames({
      [styles.popup]: true,
    })}>
     <div className={styles.mask} />
     <div className={styles.popupContent}>
       <div className={styles.closeBtn} onClick={(): void => {
         setVisible(false);
       }} />
       {children}
     </div>
    </div>), document.body)
  ) : null;
});

export default Popup;
```

再来看一下控制台，可以看到已经渲染到最外层了。

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/ssr/img_68.png" alt="" width="700" />  

### 动画实现  

应该怎么为弹窗实现动画呢？   

渐入渐出的动画关键在于类的切换，在切换过程中需要对下一个状态的类进行异步切换，因为 react state 是对最终结果进行切换的，这样没办法起到类型变化的效果。   

现在来实现这个效果，动画的效果就实现一个普通的渐入渐出就可以了。   

component/popup/index.tsx  

```tsx
import React, {forwardRef, useEffect, useImperativeHandle, useState,} from 'react';
import {createPortal} from 'react-dom';
import styles from './index.module.scss';
import classNames from 'classnames';

export interface IPopupRef {
  open: () => void;
}

interface IPopupProps {
  children: JSX.Element;
}

const Popup = forwardRef<IPopupRef, IPopupProps>(({children}, ref) => {
  const [visible, setVisible] = useState<boolean>(false);
  const [enter, setEnter] = useState<boolean>(false);
  const [leave, setLeave] = useState<boolean>(false);
  useImperativeHandle(ref, () => ({
    open: (): void => {
      setEnter(true);
      setTimeout((): void => {
        setEnter(false);
      }, 300);
      setVisible(true);
    }
  }));
  useEffect(() => {
    document.body.className = visible ? maskClass : '';
    let timer = null;
    if (visible) {
      setEnter(true);
      timer = setTimeout((): void => {
        setEnter(false);
      }, 300);
    } else {
      setLeave(true);
      timer = setTimeout((): void => {
        setLeave(false);
      }, 300);
    }
    return (): void => {
      timer = null;
    };
  }, [visible]);
  return visible ? (
    createPortal((<div className={classNames({
      [styles.popup]: true,
      [styles.enter]: enter,
      [styles.leave]: leave,
    })}>
     <div className={styles.mask} />
     <div className={styles.popupContent}>
       <div className={styles.closeBtn} onClick={(): void => {
         setLeave(true);
         setTimeout((): void => {
           setLeave(false);
         }, 300);
         setVisible(false);
       }} />
       {children}
     </div>
    </div>), document.body)
  ) : null;
});

export default Popup;
```

components/popup/index.module.scss  

```scss
@import "./pages/media.scss";

.popup {
  width: 100%;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  position: fixed;
  top: 0;
  left: 0;
  z-index: 10000;

  .mask {
    width: inherit;
    height: inherit;
    position: fixed;
    background-color: #000;
    opacity: 0.5;
    top: 0;
    left: 0;
    z-index: 10;
  }

  .popupContent {
    position: relative;
    border-radius: 0.25rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background-color: var(--popup-content-background-color);
    z-index: 20;
    min-width: 25rem;
    min-height: 25rem;

    .closeBtn {
      width: 2.125rem;
      height: 2.125rem;
      background-color: inherit;
      background-image: var(--popup-close-icon);
      background-position: center;
      background-size: 1rem 1rem;
      background-repeat: no-repeat;
      position: absolute;
      top: 1.1875rem;
      right: 1.1875rem;
      cursor: pointer;
      z-index: 100;
    }

    .closeBtn:hover {
      background-color: var(--popup-close-hover-background-color);
    }
  }
}

@include media-mobile {
  .popup {
    .dialogContent {
      .closeBtn {
        width: 0.6875rem;
        height: 0.6875rem;
        top: 1.3125rem;
        right: 0.875rem;
      }
    }
  }
}

@include media-ipad {
  .dialog {
    .dialogContent {
      .titleArea {
        padding: 1.5rem 1.5625rem;
      }
    }
  }
}

@keyframes fadeIn {
  0% {
    transform: scale(0);
    opacity: 0;
  }

  100% {
    transform: scale(1);
    opacity: 1;
  }
}

@keyframes fadeOut {
  0% {
    transform: scale(1);
    opacity: 1;
  }

  100% {
    transform: scale(0);
    opacity: 0;
  }
}

@keyframes maskFadeIn {
  0% {
    opacity: 0;
  }

  100% {
    opacity: 0.5;
  }
}

@keyframes maskFadeOut {
  0% {
    opacity: 0.5;
  }

  100% {
    opacity: 0;
  }
}

.enter {
  .mask {
    animation: maskFadeIn 0.2s;
  }

  .popupContent {
    animation: fadeIn 0.2s;
  }
}

.leave {
  .mask {
    animation: maskFadeOut 0.2s;
    opacity: 0;
  }

  .popupContent {
    animation: fadeOut 0.2s;
    transform: scale(0);
  }
}
```

实现效果：  

<iframe width="700" height="315" src="/images/ssr/d.mp4" title="" frameborder="0" allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>

## 图片优化   

官网交互中，通常会有一些高分辨率图片用于展示，这些图片通常体积大、加载时间长，且占页面区域较大，如果在网速较快的情况下可能尚可，但是在低网速，类似 fast 3G，slow 3G 的场景下，几百 kb，甚至几 mb 的图片资源加载是难以忍受的，加上区域大，很可能会出现页面内容已经加载完成，但是图片区域长时间留白的问题。  

那么高分辨率图在低网速下加载时，应该如何减少加载时间，达到首屏优化的目的。  

### 静态样式  

首先切两个大图，加在首页的位置，大小控制在 500kb 上下的清晰度（500px * 500px 2x) 即可，这种在快速 3g 的网速下，通常需要请求几十秒左右可以完全加载，可以用来说明这个场景。   

styles/globals.css   

```css
html[data-theme="dark"] {
  --home-background-icon: url('../public/home_bg_dark.png');
}

html[data-theme="light"] {
  --home-background-icon: url('../public/home_bg_light.png');
}
```

pages/index.tsx  

```tsx
<div className={styles.header} />
```

styles/Home.module.scss  

```scss
.header {
      background-image: var(--home-background-icon);
      background-size: 18.75rem 18.75rem;
      background-repeat: no-repeat;
      width: 18.75rem;
      height: 18.75rem;
    }
```

图片的大小大致在 700kb， 正常 4g 网络下的加载时长为 12ms 左右。  

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/ssr/img_70.png" alt="" width="700" />   

把网速切换至 fast 3g，看看这个图片的加载时长需要多久。  

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/ssr/img_69.png" alt="" width="700" />   

可以看到需要 4s，远远超过其他静态资源，这意味着页面元素加载出来后，用户需要再等好几秒图片才能缓缓加载出来。   

针对这个问题，在实际业务开发中有大概这几个方案。  

这是 MDN 2020 年网络信息接口提案中提出的最新 BOM 属性，通过这个 BOM 来获取当前的流量状态，根据不同的流量状态进行图片清晰度的选择。   

在较低网速下的场景，选择优先加载 0.5x 或是 1x 的图片，同时也加载 2x 的大图，通过隐藏 DOM 的方式隐性加载，然后监听 2x 资源的 onload 事件，在资源加载完成时，进行类的切换即可。  

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/ssr/img_69.png" alt="" width="700" />   

### navigator.connection.effectiveType  

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/ssr/img_71.png" alt="" width="700" />   

这种方案在低网速下的效果是所有方案中最好的，用户的感知视角是，只需要等待 0.5x 到 1x 的模糊图加载时长，不会有区域的大面积留白，同时最后也可以体验到高清图的交互。  

不过这种方案毕竟还是一个实验性属性，兼容性各方面并不是很好，只有较少的浏览器支持这个属性。  

需要注意的有两点：  

* 考虑到兼容性问题，navigator.connection.effectiveType 的使用需要进行判空处理，避免因为 navigator.connection is not defined 的报错阻塞页面渲染，可以写成 navigator?.connection?.effectiveType 来进行调用。  
* 因为是 BOM，模板页面会同时执行在服务器端和客户端，在服务器端是没有 BOM 等属性的注入的，如果是在 hook 以外的地方调用，需要对第一个元素进行判空，采用typeof navigator !== "undefined" && navigator?.connection?.effectiveType的方式调用。  

### responsive images / picture  

浏览器有提供响应式图片的能力，分别是 img srcset 和 picture，它们都支持根据不同的像素场景自动选取不同的元素来进行适配。  

下面是两个 MDN 的使用例子。

```html
<img srcset="elva-fairy-480w.jpg 480w, elva-fairy-800w.jpg 800w" sizes="(max-width: 600px) 480px,800px"
     src="elva-fairy-800w.jpg" alt="Elva dressed as a fairy" xmlns="http://www.w3.org/1999/html">
<picture>
  <source srcset="/media/cc0-images/surfer-240-200.jpg" media="(min-width: 800px)">
  <img src="/media/cc0-images/painted-hand-298-332.jpg" alt=""/>
</picture>
```

img srcset 根据像素比来选取适合的静态资源加载，而对于 picture， user agent 会检查每个 <source> 的 srcset、media 和 type 属性，来选择最匹配页面当前布局、显示设备特征等的兼容图像。  

这种方案兼容性很强，不过缺陷也很明显，针对 PC 端的确是需要高清图且低网速的场景，它没办法做任何处理。  

如果在低像素场景下，低分辨率的图也没办法满足需求时，这个方案也是束手无策的，它的本质还是根据不同页宽来调整资源的分辨率，没办法改变高分辨率资源加载时间长的现状。  

不过这两种方案在 C 端中也有广泛的应用，对于多媒体设备，可以针对不同页宽设备选取不同分辨率的资源，对性能也是有很大提高的。  

### webp(推荐)  

Webp 是谷歌推出的一种新的格式，它可以通过 jpg、png 等主流资源格式转换，达到无损画质的效果，并且相比正常的图片资源，压缩体积会减少到 40% 以上，大量主流浏览器已经支持了webp，并且最近 IOS14 及以上设备的 safari 浏览器也已经新增对 webp 的支持，只有少部分 IOS 低版本还不兼容。  

首先，针对静态样式部分的资源进行 webp 相关的转换，转换的方式很简单，可以在 google 上搜索 png to webp，有很多开源免费的转换器帮助进行资源的转换。  

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/ssr/img_72.png" alt="" width="700" />   

资源压缩后，可以看到 webp 对应的大小为 456kb，相比当初的 700kb 减少了近 40%，接下来把它加到代码中，试验一下 3g 场景下实际加载的时间可以优化多少。  

styles/globals.css  

```css
html[data-theme="dark"] {
  // ...
  --home-background-icon-webp: url('../public/home_bg_dark.webp');
}

html[data-theme="light"] {
  // ...
  --home-background-icon-webp: url('../public/home_bg_light.webp');
}
```

因为一些浏览器还不支持 webp，所以需要对它的兼容性进行判断，在资源请求的请求头 accept 字段中，包含了当前浏览器所支持的静态资源类型，可以通过这个字段来进行判断。  

utils/index.ts  

```ts
export const getIsSupportWebp = (context: AppContext) => {
  const { headers = {} } = context.ctx.req || {};
  return headers.accept?.includes('image/webp');
}
```

在 _app.tsx 中对所有的组件进行 isSupportWebp 的注入，这样每个页面模板都可以拿到这个字段。  

pages/_app.tsx  

```tsx
import type { AppProps, AppContext } from 'next/app';
import App from 'next/app';
import Head from 'next/head';
import axios from 'axios';
import ThemeContextProvider from '@/stores/theme';
import UserAgentProvider from '@/stores/userAgent';
import LanguageContextProvider from '@/stores/language';
import { LOCALDOMAIN, getIsMobile, getIsSupportWebp } from '@/utils';
import type { ILayoutProps } from '@/components/layout';
import { appWithTranslation } from 'next-i18next';
import Layout from '@/components/layout';
import '@/styles/globals.css'

export interface IDeviceInfoProps {
  isMobile: boolean;
  isSupportWebp: boolean;
}

const MyApp = (data: AppProps & ILayoutProps & IDeviceInfoProps) => {
  const {
    Component, pageProps, navbarData, footerData, isMobile, isSupportWebp
  } = data;
  return (
    <div>
      <Head>
        <title>{`A Demo for 官网开发实战 (${
          isMobile ? "移动端" : "pc端"
        })`}</title>
        <meta
          name="description"
          content="A Demo for 官网开发实战"
        />
        <link rel="icon" href="/favicon.ico" />
        <meta name="viewport" content="user-scalable=no" />
        <meta name="viewport" content="initial-scale=1,maximum-scale=1" />
        <meta name="viewport" content="width=device-width" />
      </Head>
      <LanguageContextProvider>
        <ThemeContextProvider>
          <UserAgentProvider>
            <Layout navbarData={navbarData} footerData={footerData}>
              <Component {...pageProps} isMobile={isMobile} isSupportWebp={isSupportWebp} />
            </Layout>
          </UserAgentProvider>
        </ThemeContextProvider>
      </LanguageContextProvider>
    </div>
  )
}

MyApp.getInitialProps = async (context: AppContext) => {
  const pageProps = await App.getInitialProps(context);
  const { data = {} } = await axios.get(`${LOCALDOMAIN}/api/layout`)
  return {
    ...pageProps,
    ...data,
    isMobile: getIsMobile(context),
    isSupportWebp: getIsSupportWebp(context),
  }
}
export default appWithTranslation(MyApp);
```

在 index.tsx 中引入对应的 webp 资源。   

pages/index.tsx  

```tsx
import {useContext, useEffect, useRef, useState} from 'react';
import axios from 'axios';
import type {NextPage} from 'next';
import {Pagination} from '@douyinfe/semi-ui';
import classNames from 'classnames';
import {ThemeContext} from '@/stores/theme';
import {useTranslation} from 'next-i18next';
import {serverSideTranslations} from 'next-i18next/serverSideTranslations';
import styles from '@/styles/Home.module.scss';
import {LOCALDOMAIN} from "@/utils";
import {IDeviceInfoProps} from "@/pages/_app";
import {IArticleIntroduction} from "@/pages/api/articleIntroduction";
import {LanguageContext} from "@/stores/language";
import {useRouter} from "next/router";

interface IHomeProps {
  title: string;
  description: string;
  articles: {
    total: number;
    list: {
      label: string;
      info: string;
      link: string;
    }[];
  };
}

const Home: NextPage<IHomeProps & IDeviceInfoProps> = ({
  title, description, articles, isSupportWebp
}) => {
  const { i18n } = useTranslation();
  const router = useRouter();
  const { locale } = router;
  const [content, setContent] = useState(articles);
  const mainRef = useRef<HTMLDivElement>(null);
  const { theme } = useContext(ThemeContext);
  const { language } = useContext(LanguageContext);
  useEffect(() => {
    mainRef.current?.classList.remove(styles.withAnimation);
    window.requestAnimationFrame(() => {
      mainRef.current?.classList.add(styles.withAnimation);
    });
  }, [theme]);

  useEffect(() => {
    i18n?.changeLanguage(locale);
    console.warn(locale)
  }, [language, locale])
  return (
    <div className={styles.container}>
      <main className={classNames([styles.main, styles.withAnimation])} ref={mainRef}>
        <div className={classNames({
          [styles.header]: true,
          [styles.headerWebp]: isSupportWebp,
        })} />
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.description}>{description}</p>
        <div className={styles.grid}>
          {
            content?.list?.map((item, index) => {
              return (
                <div key={index} className={styles.card} onClick={(): void => {
                  window.open(
                    item?.link,
                    "blank",
                    "noopener=yes,noreferrer=yes"
                  );
                }}>
                  <h2>{item?.label}</h2>
                  <p>{item?.info}</p>
                </div>
              )
            })
          }
        </div>
        <div className={styles.paginationArea}>
          <Pagination total={content?.total} pageSize={6} onPageChange={pageNo => {
            axios.post(`${LOCALDOMAIN}/api/articleIntroduction`, {
              pageNo,
              pageSize: 6,
            }).then(({ data: {
              total,
              list: listData,
            }}) => {
              setContent({
                list: listData?.map((item: IArticleIntroduction) => ({
                  label: item.label,
                  info: item.info,
                  link: `${LOCALDOMAIN}/article/${item.articleId}`,
                })),
                total,
              })
            })
          }} />
        </div>
      </main>
    </div>
  )
}

export const getServerSideProps = async ({ locale }: { locale: string }) => {
  const {
    data: {
      title, description,
    }
  } = await axios.get(`${LOCALDOMAIN}/api/home`);
  const {
    data: {
      list: listData, total,
    }} = await axios.post(`${LOCALDOMAIN}/api/articleIntroduction`, {
      pageNo: 1,
      pageSize: 6,
    })
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common', 'footer', 'header', 'main'])),
      title,
      description,
      articles: {
        total,
        list: listData?.map((item: IArticleIntroduction) => ({
          label: item.label,
          info: item.info,
          link: `${LOCALDOMAIN}/article/${item.articleId}`,
        }))
      },
    }

  };
}

export default Home;
```

styles/Home.module.scss  

```scss
.headerWebp {
      background-image: var(--home-background-icon-webp);
    }
```

然后来看看效果，fast 3g 下对应资源的加载时间 从 4s 减少到了 3s，优化了近 25%！   

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/ssr/img_73.png" alt="" width="700" />   

为什么 webp 可以在保证无损画质的前提下，缩小这么多体积呢？   

很有意思的一件事是，当处于极快网速的情况下，webp 相比同画质的 png 的加载时间反而会更长，即使它相比其他类型的资源，体积上缩小了整整 40% 以上。    

为什么会有这样的现象呢？  

webp 的低体积并不是毫无代价的，webp 在压缩过程中进行了分块、帧内预测、量化等操作，这些操作是减少 webp 体积的核心原因，不过作为交换的是，相比 jpg、png 等资源，它具备更长的解析时长，不过这个是不受网速等影响的，因为是浏览器内置的能力。  

所以这也是为什么在极快网速的情况下，webp 的加载时间有时会呈现为负优化的原因，因为减少的资源请求时间不足够抵消掉额外的解析时间，不过这个时间差值并不长，几毫秒在用户体验的过程中是无伤大雅的。  

但是在低网速的场景下，这个优化比例是极高的，因为 40% 的体积大小，对于低网速场景下，请求时间将会是质的提高，相比之下，几毫秒的解析时长就无关紧要了。   

## IOS 300ms delay

平时的开发中，事件触发大部分都是立刻响应，但是在 IOS 中，移动端的触摸事件会有 300ms 的延迟。  

IOS 浏览器有一个特点，可以通过双击来对屏幕页面进行缩放，这是导致 300ms 延迟的核心原因。  

因为当一个用户点击链接后，浏览器没办法判定用户是想双击缩放，还是进行点击事件触发，所以 IOS Safari 会统一等待 300ms，来判断用户是否会再次点击屏幕。  

### Meta 禁用缩放(推荐)  

300ms 延迟的初衷是为了解决点击和缩放没办法区分的问题，针对不需要缩放的页面，通过禁用缩放来解决。   

事实上，大部分移动端页面都是可以避免缩放的，通过交互等样式的兼容即可。  

pages/_app.tsx  

```
// ./pages/_app.tsx
// head加这两行即可
// ...
< meta name="viewport" content="user-scalable=no" >
< meta name="viewport" content="initial-scale=1,maximum-scale=1" > 
```

### 更改视口尺寸

Chrome 浏览器对包含 width=device-width 或者比 viewport 更小的页面禁用双击缩放，只需要加上下面的 meta 头，就可以在 IOS 中的 chrome 浏览器解决 300ms delay 的问题。  

这个方案的好处是，并不会完全禁用缩放。但是 IOS 默认的 Safari 浏览器没有支持这个能力，所以可以加上这个 meta 头来兼容视口尺寸，但并不作为这个的解决方案。  

```
<meta name="viewport" content="width=device-width">
```

### Touch-action

在 W3C 草案中，有提出一个 touch-action css 属性，通过设置 touch-action: none 可以移除目标元素的 300ms delay，如果这个日后可以被主流浏览器支持，更推荐用这种方式针对区域进行灵活的限制。  

### fastclick

这是一个老牌的解决 300ms 延迟的轻量 JS 库，可以通过 npm 安装且使用方式简单。  

```js
window.addEventListener('load', () => {
    FastClick.attach(document.body);
  }, false);
```

不建议使用 fastclick 的方式解决这个问题，有几个原因：  

* 对 TS 兼容性太差，fastclick 基于 JS，虽然有 ts for fastclick 的依赖，但是不被原作者认可，并且类型定义存在问题，直接引入依赖存在问题，需要自行进入模块定义中修改。  
* 包体过大，且包八年没再维护。   
* 不能直接用于 SSR，里面有直接用到 BOM，在服务器端渲染的时候会有相关报错，没找到比较好的插件可以兼容这个问题。  

## 橡皮筋问题

IOS上，当页面滚动到顶部或底部仍可向下或向上拖拽，并伴随一个弹性的效果。该效果被称为“rubber band”——橡皮筋。  

IOS 和安卓不同，即使页面没有设置滚动，仍然可以拉扯，给人一种橡皮筋的感觉，可以看到下面的效果。  

<iframe width="700" height="315" src="/images/ssr/e.mp4" title="" frameborder="0" allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>

那么，怎么解决这个问题呢？  

### overflow 给定宽高 

```css
html, body {
  width: 100%;
  height: 100%;
  overflow: hidden;
}
```

### 禁用 touchmove 事件  

```js
document.body.addEventListener('touchmove', function (e) {
    e.preventDefault() 
  }, {passive: false})
```

### 监听滚动禁止  

IOS 橡皮筋的原理还是通过滚动，只不过与安卓不同的是，当到边界状态时，仍允许滚动，如果替 IOS 禁用边界的情况，理论上就可以实现对橡皮筋效果的禁用。  

```tsx
import { useEffect } from 'react';


export const useForbidIosScroll = (): void => {
  let startEvent: TouchEvent;


  const cancelEvent = (e: TouchEvent): void => {
    // 有个瑕疵就是，如果是大惯性的那种滚动，浏览器该事件并不接受你禁用当前正在执行的动作
    // 导致如果猛地滑动会出页面边界
    if (e.cancelable) {
      e.preventDefault();
    }
  };


  const checkScroll = (e: TouchEvent): void => {
    const startY = Number(startEvent?.touches[0].pageY);
    const endY = Number(e?.touches[0].pageY);


    // 下滑且滑动到底
    if (startY > endY && window.scrollY + window.innerHeight >= document.body.scrollHeight) {
      cancelEvent(e);
    }


    // 上滑且滑动到顶
    if (startY < endY && window.scrollY <= 0) {
      cancelEvent(e);
    }
  };


  useEffect(() => {
    const start = (e: TouchEvent): void => {
      startEvent = e;
    };
    const end = (e: TouchEvent): void => {
      checkScroll(e);
    };
    window.addEventListener('touchstart', start);
    window.addEventListener('touchmove', end, { passive: false });
    return (): void => {
      window.removeEventListener('touchstart', start);
      window.removeEventListener('touchmove', end);
    };
  }, []);
};
```

这个效果其实并不是很理想，即使脚本已经走到中断的逻辑，滚动的行为在到达边界的时候仍然不会中止。  

到谷歌浏览器开发者文档里可以查看到，浏览器的事件其实分为两种，cancelable（可暂停）和 uncancelable（不可暂停），能够通过阻止默认事件的和阻止冒泡的都是可暂停的事件，滚动事件和鼠标滚轮事件，在触发的瞬间，就已经决定了要滚动到终点再停止，你只能暂停可能会影响滚动的前提的导线事件，这个场景下，滚动事件就已经是起源的操作，不存在间接触发，所以不行。  

### 简单方案(推荐)  

有一个很简单的方案，并且可以完美解决，给 body 进行隐藏，然后对根节点设置 100 页宽的高度，将外部 body 的滚动移动到页面内，这样外界的滚动相关的问题都会解决，因为页面采用的实际是内部滚动。  

styles/globals.css  

```css
.forbidScroll {
  height: 100vh;
  overflow: hidden;
}

body {
  overflow: hidden;
}

#__next {
  height: 100vh;
  overflow: auto;
}
```

看看改后的效果，发现橡皮筋的功能已经禁用了，因为现在页面采用的是页面内部 div 的滚动，外部 body 的滚动相关的问题也随之解决。  

<iframe width="700" height="315" src="/images/ssr/f.mp4" title="" frameborder="0" allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>

## 前端压力测试 

通常在上线前会对这些小流量环境进行预估流量的压测，来预估目前的小流量集群服务器能否承载对应的流量，进而评估一下使用多少服务器集群部署服务，才能足够承载流量，又不至于浪费服务器资源。  

基于本地服务压测，对于实际上线，需要先部署在测试服务器，然后对测试环境内网域名进行压测，进而判断能否承受预估的QPS，从而对服务集群进行扩容等操作。  

### WebBench  

WebBench 是一个在 Linux 下使用的非常简单的网站压测工具。它使用 fork() 模拟多个客户端同时访问设定的 URL，测试网站在压力下工作的性能，最多可以模拟 3 万个并发连接去测试网站的负载能力。  

WebBench 不能支持 Windows，只能在 Linux 等类 UNIX 系统下使用。  

首先需要安装一下 brew，这是一个针对 macOS 和 Linux 的包管理工具，安装完在终端里直接输入 brew 看下有没有正常输出即可。  

```shell
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

然后装一下 wget，它是 Linux 下的一个安装文件的工具，对应的安装包可以通过它下载下来。  

```shell
brew install wget
```

最后来装一下 WebBench。  

```shell
wget http://www.ha97.com/code/webbench-1.5.tar.gz
tar zxvf webbench-1.5.tar.gz // 解压
cd webbench-1.5
make
make install
```

安装完以后，在终端中输入 WebBench 验证一下。  

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/ssr/img_74.png" alt="" width="700" />   

需要关注的参数有两个：  

* -c: 并发量。  
* -t: 运行时间。  

对服务简单压测试验下看看。  

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/ssr/img_75.png" alt="" width="700" />   

可以看到 200 并发就会出现大规模请求异常的情况，不过这个结果算比较简陋的，加上对环境和安装步骤上相对苛刻一些，所以并不推荐使用这个方案。  

### wrk

wrk 是一款针对 HTTP 协议的基准测试工具，它能够在单机多核 CPU 的条件下，使用系统自带的高性能 I/O 机制，如 epoll、kqueue 等，通过多线程和事件模式，对目标机器产生大量的负载。   

wrk 支持大多数类 UNIX 系统，不支持 Windows。不同的类 UNIX 系统安装方式也略有差异。    

装一下 wrk。   

```shell
brew install wrk
```

装完可以在终端执行一下 wrk -v验证一下。   

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/ssr/img_76.png" alt="" width="700" />   

上面执行完以后可以看到它列出了 wrk 相关的参数，其中常用到的有三个参数：  

* -c: 保持打开状态的 HTTP 连接总数。  
* -d: 测试时长。  
* -t: 使用线程。  

其中连接数（c）会平分给每个线程，比如设置 -c200 -t8，那么将启用 8 个线程，每个线程处理 200/8 个请求，可以对 bing 搜索简单试验一下，具体参数其实大部分都是一样的。  

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/ssr/img_77.png" alt="" width="700" />   

这个方案更多是给后端同学测吞吐率用的，包括线程等参数，具体的值不好衡量，对前端不算那么友好。   

### autocannon

一个用 Node 编写的 HTTP/1.1 基准测试工具，受到 wrk 和 wrk2 的极大启发，支持 HTTP 管道和 HTTPS。autocannon 可以产生比 wrk 和 wrk2 更多的负载。   

autocannon 可以同时支持 Windows、Mac 和 Linux 的环境，而且作为一个 npm 包，使用上比较符合前端的开发习惯，安装更为方便，使用方式也很轻量。   

```shell
npm i autocannon -g
```

它提供了一些参数来对应不同压测指数，常用的有 3 个：  

* -c: 要使用的并发连接数。默认值：10。  
* -p: 使用流水线请求的数量。默认值：1。  
* -d: 运行秒数。默认值：10。  

首先测试一下默认值的效果。   

```shell
autocannon http://127.0.0.1:3000
```

在这个 10s 的执行过程，如果切回 client 可以看到服务在飞快请求。   

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/ssr/img_80.png" alt="" width="700" />   

最后可以得到这样一个数据。  

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/ssr/img_79.png" alt="" width="700" />   

介绍一下每个指标对应什么，先看每列的指标：  

* 2.5% / 50% / 97.5% / 99%：整个过程百分比所对应的值。   
* Avg: 平均值。  
* Stdev: 标准差。  
* Max: 最大值。  

对于每行的指标含义是这样的：  

* Latency: 耗时(毫秒)。  
* Req/Sec: QPS，吞吐量，每秒请求数。  
* Bytes/Sec: 每秒请求字节数。  

这些指标通常在对具体接口或是页面 case by case 的性能分析中会有使用，服务器资源判定只需要关注请求时间是否过长，或是是否存在大面积报错即可，这里可以看到大部分数值是正常的，也没有报错等信息。  

接下来把并发量提高到 200，再来看下效果。  

```shell
autocannon -c 200 http://127.0.0.1:3000
```

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/ssr/img_81.png" alt="" width="700" />   

从数据上看，发现所有的数据都清 0 了，说明在这个并发量下单服务器的计算支撑不下去，最下面的请求数据中也有显示 200 个错误， 200 个超时。  

这时候切回 client 的终端可以看到，服务已经崩掉了，没办法承载 200 的并发量，如果业务需要，这时候就需要考虑给服务器集群进行扩容操作了。  

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/ssr/img_82.png" alt="" width="700" />   

## 提高搜索引擎排名

### 技术优化
#### 语义化标签

写 toB 项目时，可能会直接用 div 标签作为块级区域的标签，但是对于 SEO 而言，这样的爬取和关键词检索效果是极差的，搜索引擎的索引器在对站点进行分析的过程中，会根据语义化标签来决定不同信息的重要程度，以此来匹配对应的关键词进行推荐。  

其中最需要关注的，也最常用的就是站点的 H 标签，有几个需要着重注意的使用事项：  

* H 标签只针对用户可见内容进行设置，图片、链接、写给 robots 可读文字均不在 H 标签使用范围之内。  
* H1 是一个页面中权重最高，关键词优先级最高的文案，一个页面只能使用一个。  
* 页面中通常只使用 H1 ~ H3，剩下的标题优先级太低，部分搜索引擎不会进行识别。  
* H 标签通常不使用在文字 logo、 标签栏、侧边栏等每页固定存在的部分。因为这部分不属于这一页的重点，即不是“与众不同” 的区域。  

#### Meta

影响 SEO 有三个重要元素，通常称 TDK（即 title，description，keywords），除这些部分外，还有一些常用的 meta 标签，这些都需要加到模板页面中。  

* Title: 就是常用的 title 标签。  
* Description: 页面描述，SEO 的关键。需要注意的是，PC 端下页面描述不要超过 155 个字符，移动端不要超过 120 个字符，如果过长，页面描述会被截断，反而会影响最终的 SEO。  
* Keywords: 关键词，这个的设定需要注意几点：  

1. 每个页面通常设置比较重要的3、4个关键词，不要堆砌，不要过长，更不要只因为热门，就加完全不相关的内容进来蹭热度。    
2. 关键词按照由高到低的顺序来排，用逗号分隔。  
3. 每个关键词都要是独特的，不要每个关键词意思都差不多。
```html
<meta name="keywords" content=""/>
```

4. robots（重要）: 是否开启搜索引擎抓取，noindex 对应是否开启抓取，nofollow 对应不追踪网页的链接，需要开启。  
```html
<meta name="robots" content="index, follow" />
```
5. Applicable-device: 告诉 Google，你这个站点适配了哪些设备，不加就是默认 PC 端，将会影响移动端搜索你站点的推送。  
```html
<meta name="applicable-device" content="pc,mobile" />
```
6. Format-detection: 在默认状态下，网页的数字会被认为是电话号码（在不同的系统中，显示的格式可能有所不同，比如在 iphone 手机中会有下划线），点击数字会被当作电话号码拨打或者添加到联系人，所以需要禁用。  
```html
<meta name="format-detection" content="telephone=no" />
```

#### Sitemap

站点地图是一种文件，您可以在其中提供与您网站中的网页、视频或其他文件有关的信息，还可以说明这些内容之间的关系。Google 等搜索引擎会读取此文件，以便更高效地抓取您的网站。站点地图会告诉 Google 您认为网站中的哪些网页和文件比较重要，还会提供与这些文件有关的重要信息。更多内容请查阅官方文档。    

### 内容优化

内容是 SEO 的核心，没有高质量的内容，只通过蹭热门关键词，只会有适得其反的效果。推荐阅读 Google SEO 开发者文档，其中对于内容的部分有非常详细的说明，涵括如何让你的内容有趣，怎么满足读者的需求，以及如何具备权威性和能解决用户的问题等。  

#### SEM

搜索引擎营销的基本思想是让用户发现信息，并通过（搜索引擎）搜索点击进入网站/网页进一步了解他所需要的信息。简单来说 SEM 所做的就是以最小的投入在搜索引擎中获最大的访问量并产生商业价值。SEM的方法包括SEO、付费排名、精准广告以及付费收录等。  

## 网站服务部署

站点应用想要部署外网，需要提前准备资源和流程，大体可以分为以下几个步骤：   

* 云服务器：可以理解为在云端上的一台电脑，把服务挂载到对应的端口下，即可通过云服务器公网 IP + 端口的方式进行访问。  
* 域名：可以理解成是云服务器公网 IP 的一个代号，因为 IP 地址不方便记忆，所以采用注册域名并把服务器 IP 解析到对应域名下进行访问，通常域名和站点的内容也有一定的联系，相当于是品牌标识的一个体现，一个好的域名可以成为内容和文化的良好助力，给用户留下不错的印象。   
* 域名 ICP 备案：ICP 证是指各地通信管理部门核发的《中华人民共和国电信与信息服务业务经营许可证》。没有备案通过这个是不可以上线的，ICP 备案成功后，若域名有网站或落地页，则需要在网站底部悬挂工信部下发的 ICP 备案号，并生成链接指向工信部网站。如果未在网站底部添加 ICP 备案号，被相关部门核查出来将处以五千元以上一万元以下罚款，或注销备案号等处罚。  
* 公安备案：根据《计算机信息网络国际联网安全保护管理办法》规定，网站在工信部备案成功后，需在网站开通之日起 30 日内登录 全国互联网安全管理服务平台 提交公安联网备案申请。公安联网备案审核通过后，需要复制网站公安机关备案号和备案编号 HTML 代码，下载备案编号图标，并编辑网页源代码将公安联网备案信息放置在网页底部。  
* 域名解析：把域名指向我们服务器公网 IP 的过程，经过这个步骤，就可以通过域名访问到我们的服务器了。   
* 服务部署：在完成上面步骤后，需要把服务部署到云服务器的对应端口，并解析到域名上，然后用户就可以通过访问注册的域名访问服务了。  

### 服务部署  

对于服务部署，推荐使用 pm2 来进行部署，当然直接使用 node 然后执行 npm run start 效果上也是可以的。  

pm2 具备日志，重启等一套完整能力，可以更容易定位一些问题，所以是部署 node 服务的主流工具，现在在本地以现在的项目示范一下。  

首先打开终端，安装一下 pm2。  

```shell
npm install pm2 -g
```

安装完成后在终端输入 pm2 试试。   

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/ssr/img_83.png" alt="" width="700" />   

然后分别切到 client 和 server 的目录下执行一下 npm run build，这个是为了构建线上环境启动所需要的产物。   

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/ssr/img_84.png" alt="" width="700" />   
<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/ssr/img_85.png" alt="" width="700" />   

安装完尝试重新构建一下，并且在对应目录下执行 npm run start，如果没有异常，就可以尝试使用 pm2 来启动服务了。  

server:   
<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/ssr/img_89.png" alt="" width="700" />   
<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/ssr/img_86.png" alt="" width="700" />   

client:  
<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/ssr/img_88.png" alt="" width="700" />
<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/ssr/img_87.png" alt="" width="700" />   

在这之前，先简单介绍一下原理，pm2 可以通过执行 pm2 start ${脚本文件} --name ${服务名} 的方式启动，不过要注意，因为执行路径的不同，所以这里使用 npm 的绝对路径执行确保没有问题。    

首先执行下面的命令看一下 npm 的目录位置。   

```shell
which npm
```

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/ssr/img_90.png" alt="" width="700" />   
<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/ssr/img_91.png" alt="" width="700" />   

然后切到对应项目目录下，创建一个 shell 脚本，然后写入 ${npm目录} run start 即可。  

```shell
vi server.sh
```

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/ssr/img_92.png" alt="" width="700" />   
<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/ssr/img_93.png" alt="" width="700" />   

类似这样，然后在对应 shell 脚本根目录分别执行 pm2 start server.sh，为了区分还可以给它们加上 --name 名称的参数，执行完以后，再执行 pm2 list，如果看到服务 online，就可以了。  

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/ssr/img_94.png" alt="" width="700" />   
<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/ssr/img_95.png" alt="" width="700" />   

这时候直接访问 http://127.0.0.1:3000，也是可以打开官网的。   

如果想要服务器开机的时候自启动，只需要执行下面的命令，保存当前服务并且生成自启动脚本即可。   

```shell
pm2 save
pm2 startup
```

至于关闭和重启服务，使用 stop 和 restart 即可，类似下面的例子。   

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/ssr/img_97.png" alt="" width="700" />   

值得一提的是，启动的过程可能并不是一帆风顺的，可能会有一些报错，那这时候服务的 status 就会显示 errored，这时候可以通过输出日志的方式来排查，以 server (client) 的服务举例。  

```shell
pm2 log server --lines 50
```

日志默认输出是 15 行，这个一般是不够的，可能错误栈都不足够显示完成，这边加上行数的参数，调整为 50 行。  

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/ssr/img_98.png" alt="" width="700" />   

就可以看到和平时开发一样的终端结果了，这时候如果有一些报错可以通过错误栈的信息来快速定位，并且 pm2 提供了持续监听的能力，类似平时开发中的热更新，只需要在 start 命令后加上 --watch 的参数就可以启动，这样当代码发生变化的时候，部署也会同步自动更新。  

不过这时候访问还是使用 3000 端口，这样显得奇怪，比如用户在访问百度的时候不可能访问 www.baidu.com:3000吧。    

首先安装一下 nginx，同样可以通过 nginx -v 的方式来判断是否安装成功。  

```shell
brew install nginx
```
 
然后需要修改一下对应的配置。   

```shell
vi /usr/local/etc/nginx/nginx.conf
```

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/ssr/img_99.png" alt="" width="700" />   

改这两个部分就好，listen 是监听的端口号，proxy_pass 是希望转发的目标服务，这样就会将 80 端口的服务都转发到 3000 端口上，用户就可以直接通过域名进行访问了。   

修改完成后，执行一下 nginx，没有报错的话就已经启动了。

尝试一下直接访问 http://127.0.0.1/ ，可以看到已经可以了，到这里服务部署的部分就全部完成了。  

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/ssr/img_100.png" alt="" width="700" />   

## 总结

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/ssr/img_101.jpg" alt="" width="400" />   
