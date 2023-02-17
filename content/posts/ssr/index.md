---
title: "基于 Nextjs + Strapi 的官网开发实战"
date: 2023-02-16T18:00:47+08:00
tags: ["第一技能"]
categories: ["第一技能"]
---

项目地址： [SSR](https://github.com/OweQian/SSR.git)  

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

## 主题化实现方案   

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

## 帧动画实现方案  

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

## 多媒体适配方案  

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

## 国际化功能方案  

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

