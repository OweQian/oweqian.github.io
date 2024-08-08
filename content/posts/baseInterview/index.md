---
title: "💻 前端基础技术面试题汇总"
date: 2024-08-08T13:51:55+08:00
tags: ["第一技能"]
categories: ["第一技能"]
---

本篇文章旨在利用一天时间，剖析经典面试题，带你快速建立前端基础技术知识体系，让面试更加 "有底气"，欢迎您的指正和点赞。

<!--more-->

## HTML

### 如何理解 HTML 语义化

- 让人更容易读懂（代码可读性）
- 让搜索引擎更容易读懂（SEO）

### 默认情况下，哪些 HTML 标签是块级元素，哪些是内联元素

- display: block/table：div、h1 - h6、table、ul、ol、p 等
- display: inline/inline-block：img、span、input、button 等

## CSS

### 布局

#### 盒子模型的宽度如何计算

<img src="%E5%89%8D%E7%AB%AF%E9%9D%A2%E8%AF%95%E5%85%A8%E5%AE%B6%E6%A1%B6%20e718b4b520794bdaab10ba78fcbfe89c/Untitled%207.png" alt="" width="100%" />

答案：offsetWidth = 122px = 内容宽度 + 内边距 + 边框

补充：如果让 offsetWidth 等于 100px，该如何做？

答案：box-sizing: border-box

#### margin 纵向重叠的问题

<img src="%E5%89%8D%E7%AB%AF%E9%9D%A2%E8%AF%95%E5%85%A8%E5%AE%B6%E6%A1%B6%20e718b4b520794bdaab10ba78fcbfe89c/Untitled%208.png" alt="" width="100%" />

- 相邻元素的 margin-top 和 margin-bottom 会发生重叠
- 空白内容的 <p></p>也会重叠

答案：15px

#### margin 负值的问题

- margin-top 和 margin-left 负值，元素向上、向左移动
- margin-right 负值，自身不受影响，右侧元素左移
- margin-bottom 负值，自身不受影响，下方元素上移

#### BFC 理解和应用

块级格式化上下文，一块独立的渲染区域，内部元素的渲染不会影响边界以外的元素。

形成 BFC 的常见条件：

- float 不是 none
- position 是 absolute 或 fixed
- overflow 不是 visible
- display 是 flex、inline-block 等

BFC 的常见应用

- 清除浮动

#### float 布局的问题，以及手写 clearfix

圣杯布局和双飞翼布局：

- 三栏布局，中间一栏最先加载和渲染
- 两侧内容固定，中间内容随宽度自适应

技术实现：

- 使用 float 布局
- 两侧使用 margin 负值，以便和中间内容横向重叠
- 防止中间内容被两侧覆盖，一个用 padding 一个用 margin

<img src="%E5%89%8D%E7%AB%AF%E9%9D%A2%E8%AF%95%E5%85%A8%E5%AE%B6%E6%A1%B6%20e718b4b520794bdaab10ba78fcbfe89c/Untitled%209.png" alt="" width="100%" />

#### flex 画色子

<img src="%E5%89%8D%E7%AB%AF%E9%9D%A2%E8%AF%95%E5%85%A8%E5%AE%B6%E6%A1%B6%20e718b4b520794bdaab10ba78fcbfe89c/Untitled%2010.png" alt="" width="100%" />

### 定位

#### absolute 和 relative 分别依据什么定位

- relative 依据自身定位
- absolute 依据最近一层的定位元素（absolute、relative、fixed、body）定位

#### 居中对齐有哪些实现方式

水平居中：

- inline 元素：text-align: center
- block 元素：margin: auto
- absolute 元素：left: 50% + margin-left 负值

垂直居中：

- inline 元素：line-height 的值等于 height 的值
- absolute 元素：top: 50% + margin-top 负值
- absolute 元素：transform: translate(-50%, -50%)
- absolute 元素：top、left、bottom、right = 0 + margin: auto

### 图文样式

#### line-height 的继承问题

<img src="%E5%89%8D%E7%AB%AF%E9%9D%A2%E8%AF%95%E5%85%A8%E5%AE%B6%E6%A1%B6%20e718b4b520794bdaab10ba78fcbfe89c/Untitled%2011.png" alt="" width="100%" />

- 写具体数值，如 30px，则继承该值
- 写比例，如 2，则继承该比例
- 写百分比，如 200%，则继承计算出来的值

### 响应式

#### rem 是什么？

- px，绝对长度单位，最常用
- em，相对长度单位，相对于父元素，不常用
- rem，相对长度单位，相对于根元素，常用于响应式布局

#### 如何实现响应式

- media-query，根据不同的屏幕宽度设置根元素的 font-size
- rem，基于根元素的相对单位

## JS 基础

### 变量类型和计算

#### typeof 能判断哪些类型

- 识别所有值类型
- 识别函数
- 判断是否是引用类型（不可再细分）

#### 何时使用 === 何时使用 ==

除了 == null（null == undefined） 外，其他都一律用 ===

#### 值类型和引用类型的区别

值类型：栈

引用类型：栈 + 堆

值类型 / 引用类型的拷贝

#### 手写深拷贝 ⭐️

- 判断值类型和引用类型
- 判断是数组还是对象
- 递归

```jsx
function deepClone(obj = {}) {
  if (typeof obj !== "object" || obj == null) {
    return obj;
  }

  let result = Array.isArray(obj) ? [] : {};

  for (let key in obj) {
    // 自己的属性
    if (obj.hasOwnProperty(key)) {
      // 递归调用
      result[key] = deepClone(obj[key]);
    }
  }

  return result;
}
```

### 原型和原型链

#### 如何准确判断一个变量是不是数组

- a instanceof Array
- Array.isArray()

#### class 的原型本质，怎么理解

class 实际上是函数，语法糖

- 每个 class 都有显示原型 prototype
- 每个实例都有隐式原型 **proto**
- 实例的 **proto** 指向对应 class 的 prototype

<img src="%E5%89%8D%E7%AB%AF%E9%9D%A2%E8%AF%95%E5%85%A8%E5%AE%B6%E6%A1%B6%20e718b4b520794bdaab10ba78fcbfe89c/Untitled%2012.png" alt="" width="100%" />

#### 手写一个简易的 jQuery，考虑插件和扩展性

```jsx
class jQuery {
  constructor(selector) {
    const result = document.querySelectorAll(selector);
    const length = result.length;
    for (let i = 0; i < length; i++) {
      this[i] = result[i];
    }
    this.length = length;
    this.selector = selector;
  }

  get(index) {
    return this[index];
  }

  each(fn) {
    for (let i = 0; i < this.length; i++) {
      const elem = this[i];
      fn(elem);
    }
  }

  on(type, fn) {
    return this.each((elem) => {
      elem.addEventListener(type, fn, false);
    });
  }
}

// 插件
jQuery.prototype.dialog = function (info) {
  alert(info);
};

// "造轮子"
class MyJQuery extends jQuery {
  constructor(selector) {
    super(selector);
  }
  // 扩展自己的方法
  addClass(className) {
    // ...
  }
}
```

### 作用域和闭包

#### this 的不同应用场景，如何取值 ⭐️

**this 的取值是在函数执行时确定，不是在函数定义时确定！！！**

- 当做普通函数被调用（window）
- 使用 call、apply、bind（传入的对象）
- 作为对象方法被调用（对象）
- 在 class 的方法中调用
- 箭头函数（定义时的上级作用域）

#### 手写 bind 函数 ⭐️

```jsx
Function.prototype.bind = function () {
  // 将参数拆解为数组
  const args = Array.prototype.slice.call(arguments);

  // 获取 this(数组第一项)
  const t = args.shift();

  // fn.bind(...) 中的 fn
  const self = this;

  // 返回一个函数
  return function () {
    return self.apply(t, args);
  };
};
```

#### 实际开发中闭包的应用场景，举例说明

- 隐藏数据，只提供 API

```jsx
function createCache() {
  const data = {};
  return {
    set: function (key, val) {
      data[key] = val;
    },
    get: function (key) {
      return data[key];
    },
  };
}
```

<img src="%E5%89%8D%E7%AB%AF%E9%9D%A2%E8%AF%95%E5%85%A8%E5%AE%B6%E6%A1%B6%20e718b4b520794bdaab10ba78fcbfe89c/Untitled%2013.png" alt="" width="100%" />

**闭包：所有的自由变量的查找，是在函数定义的地方，向上级作用域查找，不是在执行的地方（静态作用域）！！！**

答案：100, 100

### 异步

#### 同步和异步的区别是什么？

- 基于 JS 是单线程语言
- 异步不会阻塞代码执行
- 同步会阻塞代码执行

#### 手写用 Promise 加载一张图片 ⭐️

```jsx
function loadImg(src) {
  return new Promise((resolve, reject) => {
    const img = document.createElement("img");
    img.onload = () => {
      resolve(img);
    };
    img.onerror = () => {
      reject(new Error("图片加载失败"));
    };
    img.src = src;
  });
}
```

Callback Hell

<img src="%E5%89%8D%E7%AB%AF%E9%9D%A2%E8%AF%95%E5%85%A8%E5%AE%B6%E6%A1%B6%20e718b4b520794bdaab10ba78fcbfe89c/Untitled%2014.png" alt="" width="100%" />

#### 前端使用异步的场景有哪些？

- 网络请求，如 ajax 图片加载
- 定时任务，如 setTimeout、setInterval

#### 场景题

<img src="%E5%89%8D%E7%AB%AF%E9%9D%A2%E8%AF%95%E5%85%A8%E5%AE%B6%E6%A1%B6%20e718b4b520794bdaab10ba78fcbfe89c/Untitled%2015.png" alt="" width="100%" />

答案：1、3、5、4、2

### 异步进阶

#### 请描述 event loop 的机制，可画图 ⭐️

- 同步代码，一行一行放在 Call Stack 中执行
- 遇到异步，会先 “记录” 下，等待时机（定时、网络请求等）
- 时机到了，就移动到 Callback Queue
- 如果 Call Stack 为空（即同步代码执行完），Event Loop 开始工作
- 轮询查找 Callback Queue，如有则移动到 Call Stack 执行
- 然后继续轮询查找（永动机）

<img src="%E5%89%8D%E7%AB%AF%E9%9D%A2%E8%AF%95%E5%85%A8%E5%AE%B6%E6%A1%B6%20e718b4b520794bdaab10ba78fcbfe89c/Untitled%2016.png" alt="" width="100%" />

#### Promise 有哪三种状态，如何变化

三种状态：

- pending、resolved、rejected
- pending → resolved 或 pending → rejected
- 变化不可逆

状态表现：

- pending 状态，不会触发 then 和 catch
- resolved 状态，会触发后续的 then 回调函数
- rejected 状态，会触发后续的 catch 回调函数

#### async/await 和 Promise 的关系

- 执行 async 函数，返回的是 Promise 对象
- await 相当于 Promise 的 then
- try…catch 可捕获异常，代替了 Promise 的 catch

#### Event Loop 和 DOM 渲染

- JS 是单线程，而且和 DOM 渲染共用一个线程
- JS 执行时，得留一些时机供 DOM 渲染
- 每次 Call Stack 清空，即同步任务执行完
- 都是 DOM 重新渲染的机会，DOM 结构如有改变则重新渲染
- 然后再去触发下一次 Event Loop

#### 什么是宏任务和微任务，两者有什么区别

- 宏任务：setTimeout、setInterval、ajax、dom 事件
- 微任务：Promise、async/await
- 微任务执行时机比宏任务要早
- 宏任务在 DOM 渲染后触发，如 setTimeout
- 微任务在 DOM 渲染前触发，如 Promsie

#### 手写 Promise⭐️

- 初始化 & 异步调用
- then catch 链式调用
- API .resolve .reject .all .race

```jsx
class MyPromise {
  state = "pending";
  value = undefined;
  reason = undefined;

  resolveCallbacks = []; // pending 状态下，存储成功的回调
  rejectCallbacks = []; // pending 状态下，存储失败的回调

  constructor(fn) {
    const resolveHandler = (value) => {
      if (this.state === "pending") {
        this.state = "fulfilled";
        this.value = value;
        this.resolveCallbacks.forEach((fn) => fn(this.value));
      }
    };

    const rejectHandler = (reason) => {
      if (this.state === "pending") {
        this.state = "rejected";
        this.reason = reason;
        this.rejectCallbacks.forEach((fn) => fn(this.reason));
      }
    };

    try {
      fn(resolveHandler, rejectHandler);
    } catch (err) {
      rejectHandler(err);
    }
  }

  then(fn1, fn2) {
    // pending 状态下，fn1、fn2 被保存
    fn1 = typeof fn1 === "function" ? fn1 : (v) => v;
    fn2 = typeof fn2 === "function" ? fn2 : (e) => e;

    if (this.state === "pending") {
      return new MyPromise((resolve, reject) => {
        this.resolveCallbacks.push(() => {
          try {
            const newValue = fn1(this.value);
            resolve(newValue);
          } catch (err) {
            reject(err);
          }
        });

        this.rejectCallbacks.push(() => {
          try {
            const newReason = fn2(this.reason);
            reject(newReason);
          } catch (err) {
            reject(err);
          }
        });
      });
    }

    if (this.state === "fulfilled") {
      return new MyPromise((resolve, reject) => {
        try {
          const newValue = fn1(this.value);
          resolve(newValue);
        } catch (err) {
          reject(err);
        }
      });
    }

    if (this.state === "rejected") {
      return new MyPromise((resolve, reject) => {
        try {
          const newReason = fn2(this.reason);
          reject(newReason);
        } catch (err) {
          reject(err);
        }
      });
    }
  }

  catch(fn) {
    return this.then(null, fn);
  }
}

MyPromise.resolve = function (value) {
  return new MyPromise((resolve, reject) => resolve(value));
};

MyPromise.reject = function (reason) {
  return new MyPromise((resolve, reject) => reject(reason));
};

MyPromise.all = function (promiseList = []) {
  return new MyPromise((resolve, reject) => {
    const result = [];
    const length = promiseList.length;
    let resolveCount = 0;
    promiseList.forEach((p) => {
      p.then((data) => {
        result.push(data);
        // resolveCount 必须在 then 里面做 ++
        resolveCount++;
        if (resolveCount === length) {
          resolve(result);
        }
      }).catch((err) => {
        reject(err);
      });
    });
  });
};

MyPromise.race = function (promiseList = []) {
  let resolved = false;
  return new MyPromise((resolve, reject) => {
    promiseList.forEach((p) => {
      p.then((data) => {
        if (!resolved) {
          resolve(data);
          resolved = true;
        }
      }).catch((err) => {
        reject(err);
      });
    });
  });
};
```

#### 场景题

then 和 catch 改变状态：

- then 正常返回 resolved promise，里面有报错则返回 rejected promise
- catch 正常返回 resolved promise，里面有报错则返回 rejected promise

<img src="%E5%89%8D%E7%AB%AF%E9%9D%A2%E8%AF%95%E5%85%A8%E5%AE%B6%E6%A1%B6%20e718b4b520794bdaab10ba78fcbfe89c/Untitled%2017.png" alt="" width="100%" />

第一题：1、3

第二题：1、2、3

第三题：1、2

<img src="%E5%89%8D%E7%AB%AF%E9%9D%A2%E8%AF%95%E5%85%A8%E5%AE%B6%E6%A1%B6%20e718b4b520794bdaab10ba78fcbfe89c/Untitled%2018.png" alt="" width="100%" />

第一题：a → Promise 对象、b → 100

第二题：‘start’、100、200、报错…

<img src="%E5%89%8D%E7%AB%AF%E9%9D%A2%E8%AF%95%E5%85%A8%E5%AE%B6%E6%A1%B6%20e718b4b520794bdaab10ba78fcbfe89c/Untitled%2019.png" alt="" width="100%" />

答案：100、400、300、200

<img src="%E5%89%8D%E7%AB%AF%E9%9D%A2%E8%AF%95%E5%85%A8%E5%AE%B6%E6%A1%B6%20e718b4b520794bdaab10ba78fcbfe89c/Untitled%2020.png" alt="" width="100%" />

答案：‘script start’ → ‘async1 start’ → ‘async2’ → ‘promise1’ → ‘script end’ → ‘async1 end’ → ‘promise2’ → ‘setTimeout’

执行时机：**同步代码执行完毕 → 执行微任务 → 触发 DOM 渲染 → 触发 Event Loop，执行宏任务。**

要点：**初始化 promise 时，传入的函数会立刻被执行；await 后面的都作为回调内容（微任务）。**

## JS-Web-API

### DOM

#### DOM 是哪种数据结构

树（DOM 树）

#### attribute 和 property 的区别

- property：修改对象属性，不会体现到 html 结构中
- attribute：修改 html 属性，会改变 html 结构
- 两者都有可能引起 DOM 重新渲染

#### 一次性插入多个 DOM 节点，考虑性能

<img src="%E5%89%8D%E7%AB%AF%E9%9D%A2%E8%AF%95%E5%85%A8%E5%AE%B6%E6%A1%B6%20e718b4b520794bdaab10ba78fcbfe89c/Untitled%2021.png" alt="" width="100%" />

### BOM

#### 分析拆解 url 各个部分

<img src="%E5%89%8D%E7%AB%AF%E9%9D%A2%E8%AF%95%E5%85%A8%E5%AE%B6%E6%A1%B6%20e718b4b520794bdaab10ba78fcbfe89c/Untitled%2022.png" alt="" width="100%" />

### 事件

#### 编写一个通用的事件监听函数

```jsx
function bindEvent(elem, type, selector, fn) {
  if (fn == null) {
    fn = selector;
    selector = null;
  }
  elem.addEventListener(type, (event) => {
    const target = event.target;
    if (selector) {
      // 代理绑定
      if (target.matches(selector)) {
        fn.call(target, event);
      }
    } else {
      // 普通绑定
      fn.call(target, event);
    }
  });
}
```

#### 描述事件冒泡的流程

- 基于 DOM 树形结构
- 事件会顺着触发元素向上冒泡
- 应用场景：代理

#### 无限下拉的图片列表，如何监听每个图片的点击

- 事件代理
- 用 [event.target](http://event.target) 来获取触发元素
- 用 matches 来判断是否是触发元素

### Ajax

#### 手写一个简易的 ajax

```jsx
function ajax(url) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);
    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          resolve(JSON.parse(xhr.responseText));
        } else if (xhr.status === 404) {
          reject(new Error("404 not found"));
        }
      }
    };
    xhr.send(null);
  });
}
```

#### 跨域的常用方式

JSONP：

- \<script\> 可绕过跨域限制
- 服务器可以任意动态拼接数据返回
- 所以，\<script\>就可以获得跨域的数据，只要服务端愿意返回

<img src="%E5%89%8D%E7%AB%AF%E9%9D%A2%E8%AF%95%E5%85%A8%E5%AE%B6%E6%A1%B6%20e718b4b520794bdaab10ba78fcbfe89c/Untitled%2023.png" alt="" width="100%" />

CORS：

<img src="%E5%89%8D%E7%AB%AF%E9%9D%A2%E8%AF%95%E5%85%A8%E5%AE%B6%E6%A1%B6%20e718b4b520794bdaab10ba78fcbfe89c/Untitled%2024.png" alt="" width="100%" />

### 存储

#### 描述 cookie、localStorage、sessionStorage 区别

- 容量：cookie 4kb，localStorage/sessionStorage 5M
- API 易用性：cookie document.cookie，localStorage/sessionStorage setItem、getItem
- 是否跟随 http 请求发送出去

## http

### http

#### http 常见的状态码有哪些

- 1xx 服务器收到请求
- 2xx 请求成功，如 200（成功）
- 3xx 重定向，如 301（永久重定向）302（临时重定向）304（资源未被修改）
- 4xx 客户端请求错误，如 403（没有权限）404（资源未找到）
- 5xx 服务端错误，如 500（服务器错误）504（网关超时）

#### http 常见的 header 有哪些

request headers:

- Accept 浏览器可接收的数据格式
- Accept-Encoding 浏览器可接收的压缩算法，如 gzip
- Accept-Languange 浏览器可接收的语言，如 zh-CN
- Connection: keep-alive 一次 TCP 连接重复使用
- Host
- cookie
- User-Agent 浏览器信息
- Content-type 发送数据的格式，如 application/json

response headers:

- Content-Type 返回数据的格式，如 application/json
- Content-Length 返回数据的大小，多少字节
- Content-Encoding 返回数据的压缩算法，如 gzip
- Set-Cookie

#### 什么是 restful api

- 传统 API 设计：把每个 url 当做一个功能
- restful api 设计：把每个 url 当做一个唯一的资源

#### 描述一下 http 的缓存机制

- 正常操作：地址栏输入 url、跳转链接、前进后退等(强制缓存有效，协商缓存有效)
- 手动刷新：F5、点击刷新按钮、点击菜单刷新（强制缓存失效，协商缓存有效）
- 强制刷新：ctrl + F5（强制缓存失效，协商缓存失效）

强制缓存：

Cache-Control: max-age、no-cache、no-store

<img src="%E5%89%8D%E7%AB%AF%E9%9D%A2%E8%AF%95%E5%85%A8%E5%AE%B6%E6%A1%B6%20e718b4b520794bdaab10ba78fcbfe89c/Untitled%2025.png" alt="" width="100%" />

<img src="%E5%89%8D%E7%AB%AF%E9%9D%A2%E8%AF%95%E5%85%A8%E5%AE%B6%E6%A1%B6%20e718b4b520794bdaab10ba78fcbfe89c/Untitled%2026.png" alt="" width="100%" />

协商缓存：

- 服务端缓存策略
- 服务器判断客户端资源，是否和服务端资源一样
- 一致则返回 304，否则返回 200 和最新的资源

<img src="%E5%89%8D%E7%AB%AF%E9%9D%A2%E8%AF%95%E5%85%A8%E5%AE%B6%E6%A1%B6%20e718b4b520794bdaab10ba78fcbfe89c/Untitled%2027.png" alt="" width="100%" />

Last-Modified

<img src="%E5%89%8D%E7%AB%AF%E9%9D%A2%E8%AF%95%E5%85%A8%E5%AE%B6%E6%A1%B6%20e718b4b520794bdaab10ba78fcbfe89c/Untitled%2028.png" alt="" width="100%" />

Etag

<img src="%E5%89%8D%E7%AB%AF%E9%9D%A2%E8%AF%95%E5%85%A8%E5%AE%B6%E6%A1%B6%20e718b4b520794bdaab10ba78fcbfe89c/Untitled%2029.png" alt="" width="100%" />

### https

#### http 与 https 的区别

- http 是明文传输，敏感信息容易被中间劫持
- https = http + 加密，劫持了也无法解密

#### 加密方式

- 对称加密：一个 key 同时负责加密、解密
- 非对称加密：一对 key，A 加密之后，只能用 B 来解密
- https 同时用到了这两种加密方式（安全、成本、高效）

<img src="%E5%89%8D%E7%AB%AF%E9%9D%A2%E8%AF%95%E5%85%A8%E5%AE%B6%E6%A1%B6%20e718b4b520794bdaab10ba78fcbfe89c/Untitled%2030.png" alt="" width="100%" />

#### https 证书

- 中间人攻击
- 使用第三方证书
- 浏览器校验证书

<img src="%E5%89%8D%E7%AB%AF%E9%9D%A2%E8%AF%95%E5%85%A8%E5%AE%B6%E6%A1%B6%20e718b4b520794bdaab10ba78fcbfe89c/Untitled%2031.png" alt="" width="100%" />

## 开发环境

### git

- git branch
- git status
- git diff
- git add .
- git commit -m “xxx”
- git checkout xxx
- git checkout -b xxx
- git push origin main
- git pull origin main
- git fetch
- git merge xxx
- git stash
- git stash pop

### 调试工具

- chrome 调试工具

### 抓包

- 移动端 h5 页，查看网络请求，需要用工具抓包
- windows 一般用 fiddler
- Mac OS 一般用 charles
- 手机和电脑连同一个局域网
- 将手机代理到电脑上
- 手机浏览网页，即可抓包
- 查看网络请求
- 网址地理
- https

### webpack

```jsx
const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = {
  mode: "development",
  entry: path.join(__dirname, "src", "index.js"),
  output: {
    filename: "bundle.js",
    path: path.join(__dirname, "dist"),
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        loader: ["babel-loader"],
        include: path.join(__dirname, "src"),
        exclude: /node_modules/,
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: path.join(__dirname, "src", "index.html"),
      filename: "index.html",
    }),
  ],
  devServer: {
    port: 3000,
    contentBase: path.join(__dirname, "dist"),
  },
};
```

```jsx
const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = {
  mode: "production",
  entry: path.join(__dirname, "src", "index.js"),
  output: {
    filename: "bundle.[contenthash].js",
    path: path.join(__dirname, "dist"),
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        loader: ["babel-loader"],
        include: path.join(__dirname, "src"),
        exclude: /node_modules/,
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: path.join(__dirname, "src", "index.html"),
      filename: "index.html",
    }),
  ],
};
```

### babel

```markdown
{
"presets": ["@babel/preset-env"]
}
```

### linux 常用命令

- ssh root@xxx.xxx.xx.xx
- ls、ls -a、ll
- mkdir xxx
- touch xxx
- vi xxx
- vim xxx
- rm -rf xxx
- cd xxx
- mv xxx xxx
- cp xxx xxx
- cat xxx
- grep xxx xxx

## 运行环境

### 页面加载过程

#### 从输入 url 到渲染出页面的整个过程

加载过程：

- DNS 解析：域名 -> ip 地址
- 浏览器根据 ip 地址向服务器发送 http 请求
- 服务器处理 http 请求，返回给浏览器

渲染过程：

- 根据 HTML 代码生成 DOM Tree
- 根据 CSS 代码生成 CSSOM
- 将 DOM Tree 和 CSSOM 整合形成 Render Tree
- 根据 Render Tree 渲染页面
- 遇到 \<script\> 则暂停渲染，优先加载并执行 js 代码，完成再继续
- 直至把 Render Tree 渲染完成

#### window.onload 和 DOMContentLoaded 的区别

- window.onload: 资源全部加载完才能执行，包括视频、图片等
- DOMContentLoaded: DOM 渲染完即可执行，此时图片、视频可能还没加载完

### 性能优化

#### 性能优化原则

- 多使用内存、缓存或其他方法
- 减少 CPU 计算量，减少网络加载耗时
- 适用于所有编程的性能优化 - 空间换时间

#### 从何入手

- 让加载更快
- 让渲染更快

#### 让加载更快

- 减少资源体积：压缩代码
- 减少访问次数：合并代码、SSR、缓存
- 使用更快的网络：CDN

#### 让渲染更快

- CSS 放在 head，JS 放在 body 最下面
- 尽早开始执行 JS，用 DOMContentLoaded 触发
- 懒加载（图片懒加载，上滑加载更多）
- 对 DOM 查询进行缓存
- 频繁 DOM 操作，合并到一起插入 DOM 结构
- 节流 throttle、防抖 debounce

#### 防抖 debounce

- 用户输入结束或暂停时，才会触发 change 事件

```jsx
function debounce(fn, delay = 500) {
  let timer = null;
  return function () {
    if (timer) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      fn.apply(this, arguments);
      timer = null;
    }, delay);
  };
}
```

#### 节流 throttle

- 无论拖拽速度多快，都会每隔 delay 触发一次

```jsx
function throttle(fn, delay = 500) {
  let timer = null;
  return function () {
    if (timer) {
      return;
    }
    timer = setTimeout(() => {
      fn.apply(this, arguments);
      timer = null;
    }, delay);
  };
}
```

### 安全

#### 常见的 web 前端攻击方式有哪些

xss 跨站请求攻击：

- 一个博客网站，我发表一篇博客，其中嵌入 \<script\> 脚本
- 脚本内容：获取 cookie（document.cookie），发送到我的服务器
- 发布这篇博客，有人查看它，我轻松收割访问者的 cookie

xss 预防：

- 替换特殊符号，如 < 变为 &lt; > 变为 &gt;
- \<script\> 变为 &lt;script&gt;，直接显示，而不会作为脚本执行
- 前端要替换，后端也要替换，都做总不会错

xsrf 跨站请求伪造：

- 你正在购物，看中了某个商品，商品 id 是 100
- 付费接口是 xxx.com/pay?id=100，没有任何验证
- 我是攻击者，看中了一个商品，id 是 200
- 我向你发送一封邮件，邮件标题很吸引人
- 邮件正文隐藏着 <img src=xxx.com/pay?id=200>
- 你一查看邮件，就帮我购买了 id 是 200 的商品

xsrf 预防：

- 使用 post 接口
- 增加验证，例如指纹、短信验证码等

## 真题模拟

### var、let、const 区别

- var 是 es5 语法，let const 是 es6 语法；var 有变量提升
- var let 是变量，可修改；const 是常量，不可修改
- let const 有块级作用域，var 没有

### typeof 能判断哪些类型

- string、number、boolean、undefined、symbol
- object (typeof null === 'object')
- function

### 列举强制类型转换和隐式类型转换

- 强制类型转换：parseInt、parseFloat、toString 等
- 隐式类型转换：if、逻辑运算、==、+ 拼接字符串

### **手写深度比较，模拟 lodash isEqual**

```jsx
function isObject(obj) {
  return typeof obj === "object" && obj !== null;
}

function isEqual(obj1, obj2) {
  if (!isObject(obj1) || !isObject(obj2)) {
    // 值类型（注意：参与 equal 的一般不会是函数）
    return obj1 === obj2;
  }

  if (obj1 === obj2) {
    return true;
  }

  // 两个都是对象或数组，而且不相等
  // 1. 先取出 obj1 和 obj2 的 keys，比较个数
  const obj1Keys = Object.keys(obj1);
  const obj2Keys = Object.keys(obj2);
  if (obj1Keys.length !== obj2Keys.length) {
    return false;
  }

  // 2. 以 obj1 为基础，和 obj2 依次递归比较
  for (let key in obj1) {
    // 比较当前 key 的val
    const res = isEqual(obj1[key], obj2[key]);
    if (!res) {
      return false;
    }
  }
  // 3. 全相等
  return true;
}
```

### split() 和 join() 的区别

<img src="%E5%89%8D%E7%AB%AF%E9%9D%A2%E8%AF%95%E5%85%A8%E5%AE%B6%E6%A1%B6%20e718b4b520794bdaab10ba78fcbfe89c/Untitled%2032.png" alt="" width="100%" />

### 数组的 pop、push、shift、unshift 分别是什么

- 功能是什么
- 返回值是什么
- 是否会对原数组造成影响

```
// const arr = [10, 20, 30, 40]

// // pop
// const popRes = arr.pop()
// console.log(popRes, arr)

// // shift
// const shiftRes = arr.shift()
// console.log(shiftRes, arr)

// // push
// const pushRes = arr.push(50) // 返回 length
// console.log(pushRes, arr)

// // unshift
// const unshiftRes = arr.unshift(5) // 返回 length
// console.log(unshiftRes, arr)

```

#### 数组的 API，有哪些是纯函数

```
// // 纯函数：1. 不改变源数组（没有副作用）；2. 返回一个新的数组
// const arr = [10, 20, 30, 40]

// // concat
// const arr1 = arr.concat([50, 60, 70])
// // map
// const arr2 = arr.map(num => num * 10)
// // filter
// const arr3 = arr.filter(num => num > 25)
// // slice
// const arr4 = arr.slice()

```

#### 数组的 API，有哪些是非纯函数

```
// // push pop shift unshift
// // forEach
// // some every
// // reduce
// splice

```

### 数组 slice 和 splice 区别

- slice-切片 splice-剪接
- 参数和返回值
- 是否是纯函数

```
// const arr = [10, 20, 30, 40, 50]

// // slice 纯函数
// const arr1 = arr.slice()
// const arr2 = arr.slice(1, 4) // startIndex endIndex
// const arr4 = arr.slice(-3) // 从最后开始截取

```

```
var myFish = ['angel', 'clown', 'drum', 'mandarin', 'sturgeon'];
var removed = myFish.splice(3, 1) // 从索引3位置开始删除1个元素

var myFish = ['angel', 'clown', 'mandarin', 'sturgeon'];
var removed = myFish.splice(2, 0, 'drum', 'guitar') // 从索引2位置开始添加两个元素

```

### [10, 20, 30].map(parseInt) 返回结果是什么

```
[10, 20, 30].map((num, index) => {
    return parseInt(num, index)
})

```

答案：[10, NaN, NaN]

### ajax 请求 get 和 post 的区别

- get 一般用于查询操作，post 一般用于用户提交操作
- get 参数拼接在 url 上，post 放在请求体内
- post 易于防止 xsrf

### 函数 call 和 apply 的区别

<img src="%E5%89%8D%E7%AB%AF%E9%9D%A2%E8%AF%95%E5%85%A8%E5%AE%B6%E6%A1%B6%20e718b4b520794bdaab10ba78fcbfe89c/Untitled%2033.png" alt="" width="100%" />

### 事件代理是什么

<img src="%E5%89%8D%E7%AB%AF%E9%9D%A2%E8%AF%95%E5%85%A8%E5%AE%B6%E6%A1%B6%20e718b4b520794bdaab10ba78fcbfe89c/Untitled%2034.png" alt="" width="100%" />

### 闭包是什么？有什么特性？有什么负面影响

- 回顾作用域和自由变量
- 回顾闭包应用场景：作为参数被传入，作为返回值被返回
- 回顾：自由变量的查找，要在函数定义的地方（而不是执行的地方）
- 影响：变量会常驻内存，得不到释放（不一定导致内存泄漏）

### 如何阻止事件冒泡和默认行为

- event.stopPropagation()
- event.preventDefault()

### 查找、添加、删除、移动 DOM 节点的方法

- 回顾之前内容

### 如何减少 DOM 操作

- 缓存 DOM 查询结果
- 多次 DOM 操作合并到一次插入

### 解析 jsonp 的原理，为何它不是真正的 ajax

- 浏览器的同源策略(服务端没有同源策略)和跨域
- 哪些 html 标签能绕过跨域
- jsonp 的原理

### window.load 和 DOMContentLoaded 的区别

<img src="%E5%89%8D%E7%AB%AF%E9%9D%A2%E8%AF%95%E5%85%A8%E5%AE%B6%E6%A1%B6%20e718b4b520794bdaab10ba78fcbfe89c/Untitled%2035.png" alt="" width="100%" />

### == 和 === 的不同

- == 会尝试类型转换
- === 严格相等
- 哪些场景才用 == 如：if (null == undefined)

### 函数声明和函数表达式的区别

- 函数声明 function fn() {...}
- 函数表达式 const fn = function () {...}
- 函数声明会有变量提升，函数表达式没有

### new Object() 和 Object.create()的区别

- {} 等同于 new Object()，原型是 Object.prototype
- Object.create(null) 没有原型
- Object.create({...}) 可指定原型

### 关于 this 的场景题

<img src="%E5%89%8D%E7%AB%AF%E9%9D%A2%E8%AF%95%E5%85%A8%E5%AE%B6%E6%A1%B6%20e718b4b520794bdaab10ba78fcbfe89c/Untitled%2036.png" alt="" width="100%" />

答案：1 window

### 关于作用域和自由变量的场景题

<img src="%E5%89%8D%E7%AB%AF%E9%9D%A2%E8%AF%95%E5%85%A8%E5%AE%B6%E6%A1%B6%20e718b4b520794bdaab10ba78fcbfe89c/Untitled%2037.png" alt="" width="100%" />

答案：4

<img src="%E5%89%8D%E7%AB%AF%E9%9D%A2%E8%AF%95%E5%85%A8%E5%AE%B6%E6%A1%B6%20e718b4b520794bdaab10ba78fcbfe89c/Untitled%2038.png" alt="" width="100%" />

答案：100 10 10

### 判断字符串以字母开头，后面字母数字下划线，长度 6-30

答案：/^[a-zA-Z]\w{5, 29}$/ \w 字母数字下划线 \. 字符.

```
// 邮政编码
/\d{6}/

// 小写英文字母
/^[a-z]+$/

// 英文字母
/^[a-zA-Z]+$/

// 日期格式 2019.12.1
/^\d{4}-\d{1,2}-\d{1,2}$/

// 用户名
/^[a-zA-Z]\w{5, 17}$/

// 简单的 IP 地址匹配
/\d+\.\d+\.\d+\.\d+/

```

### 手写字符串 trim 方法，保证浏览器兼容性

<img src="%E5%89%8D%E7%AB%AF%E9%9D%A2%E8%AF%95%E5%85%A8%E5%AE%B6%E6%A1%B6%20e718b4b520794bdaab10ba78fcbfe89c/Untitled%2039.png" alt="" width="100%" />

### 如何获取多个数字中的最大值

<img src="%E5%89%8D%E7%AB%AF%E9%9D%A2%E8%AF%95%E5%85%A8%E5%AE%B6%E6%A1%B6%20e718b4b520794bdaab10ba78fcbfe89c/Untitled%2040.png" alt="" width="100%" />

<img src="%E5%89%8D%E7%AB%AF%E9%9D%A2%E8%AF%95%E5%85%A8%E5%AE%B6%E6%A1%B6%20e718b4b520794bdaab10ba78fcbfe89c/Untitled%2041.png" alt="" width="100%" />

### 如何用 js 实现继承

- class 继承
- prototype 继承

### 如何捕获 js 程序中的异常

<img src="%E5%89%8D%E7%AB%AF%E9%9D%A2%E8%AF%95%E5%85%A8%E5%AE%B6%E6%A1%B6%20e718b4b520794bdaab10ba78fcbfe89c/Untitled%2042.png" alt="" width="100%" />

### 什么是 JSON

- 是一种数据格式，本质是一段字符串
- 和 js 对象结构一致，对 js 语言更好
- JSON.parse JSON.stringify

### 获取当前页面的 url 参数

- 传统方式 location.search
- 新 API，URLSearchParams

```
function query(name) {
    const search =location.search.substr(1) // 类似 array.slice(1)
    // search: 'a=10&b=20&c=30'
    const reg = newRegExp(`(^|&)${name}=([^&]*)(&|$)`, 'i')
    const res = search.match(reg)
    if (res === null) {
        return null
    }
    return res[2]
}

```

### 将 url 参数解析为 JS 对象

<img src="%E5%89%8D%E7%AB%AF%E9%9D%A2%E8%AF%95%E5%85%A8%E5%AE%B6%E6%A1%B6%20e718b4b520794bdaab10ba78fcbfe89c/Untitled%2043.png" alt="" width="100%" />

<img src="%E5%89%8D%E7%AB%AF%E9%9D%A2%E8%AF%95%E5%85%A8%E5%AE%B6%E6%A1%B6%20e718b4b520794bdaab10ba78fcbfe89c/Untitled%2044.png" alt="" width="100%" />

### 手写数组 flatern，考虑多层级

```
function flat(arr) {
  // 验证 arr 中，还有没有深层数组
  const isDeep = arr.some(item => item instanceof Array)
  if (!isDeep) {
    return arr
  }
  const res = Array.prototype.concat.apply([], arr)
  return flat(res)
}
```

### 数组去重

- 传统方式，遍历元素挨个比较、去重
- 使用 Set

```
function unique(arr) {
    const res = []
    arr.forEach(item => {
        if (res.indexOf(item) === -1) {
            res.push(item)
        }
    })
    return res
}

```

```
function unique(arr) {
    const set = newSet(arr)
    return [...set]
}

```

### 手写深拷贝

<img src="%E5%89%8D%E7%AB%AF%E9%9D%A2%E8%AF%95%E5%85%A8%E5%AE%B6%E6%A1%B6%20e718b4b520794bdaab10ba78fcbfe89c/Untitled%2045.png" alt="" width="100%" />

### 介绍一下 RAF requestAnimatioFrame

- 要想动画流畅。更新频率要 60 帧/s，即 16.67ms 更新一次视图
- setTimeout 要手动控制频率，RFA 浏览器会自动控制
- 后台标签或隐藏 iframe 中，RFA 会暂停，而 setTimeout 依然执行

```
// 3s 把宽度从 100px 变为 640px ，即增加 540px
// 60帧/s ，3s 180 帧 ，每次变化 3px

const $div1 = $('#div1')
let curWidth = 100
const maxWidth = 640

// // setTimeout
// function animate() {
//     curWidth = curWidth + 3
//     $div1.css('width', curWidth)
//     if (curWidth < maxWidth) {
//         setTimeout(animate, 16.7) // 自己控制时间
//     }
// }
// animate()

// RAF
function animate() {
	curWidth = curWidth + 5
	$div1.css('width', curWidth)
  if (curWidth < maxWidth) {
		window.requestAnimationFrame(animate) // 时间不用自己控制
  }
}
animate()

```

### 前端性能如何优化？一般从几个地方考虑

<img src="%E5%89%8D%E7%AB%AF%E9%9D%A2%E8%AF%95%E5%85%A8%E5%AE%B6%E6%A1%B6%20e718b4b520794bdaab10ba78fcbfe89c/Untitled%2046.png" alt="" width="100%" />

### Map 和 Set 有序和无序

有序：顺序，增删查改慢（数组）

无序：散乱，增删查改快（对象）

<img src="%E5%89%8D%E7%AB%AF%E9%9D%A2%E8%AF%95%E5%85%A8%E5%AE%B6%E6%A1%B6%20e718b4b520794bdaab10ba78fcbfe89c/Untitled%2047.png" alt="" width="100%" />

### Map 和 Object 的区别

- API 不同，Map 可以以任意类型为 key
- Map 是有序结构（重要）
- Map 操作同样很快

### Set 和数组的区别

- API 不同
- Set 元素不能重复
- Set 是无序结构，操作很快

### weakMap 和 weakSet

- 弱引用，防止内存泄漏
- weakMap 只能用对象作为 key，weakSet 只能用对象作为 value
- 没有 forEach 和 size，只能用 add delete has

### 数组 reduce 用法

- 求和

```
constarr= [10, 20, 30, 40, 50]
constres=arr.reduce((sum, curVal) => sum + curVal, 0)

```

- 计数

```
constarr= [10, 20, 30, 40, 50, 10, 20, 30, 20]
constn= 30
constcount=arr.reduce((count, val) => {
    return val ===n? count + 1 : count
}, 0)

```

- 输出字符串

```
constarr= [
    { name: '张三', age: '20' },
    { name: '李四', age: '21' },
    { name: '小明', age: '22' },
]
conststr=arr.reduce((s, item) => {
    return `${s}${item.name} - ${item.age}\n`
}, '')
console.log(str)

```
