---
title: "基于 Nextjs + Strapi 的官网开发实战"
date: 2023-02-08T12:00:47+08:00
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

<img src="/images/ssr/img.png" alt="" width="500" />  

打开 http://localhost:3000 就可以看到一个默认服务器端渲染页面:  

<img src="/images/ssr/img_1.png" alt="" width="500" />  

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

<img src="/images/ssr/img_2.png" alt="" width="500" />  

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

<img src="/images/ssr/img_3.png" alt="" width="500" />  

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

<img src="/images/ssr/img_4.png" alt="" width="500" />  

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

<img src="/images/ssr/img_5.png" alt="" width="500" />  
