---
title: "📒 Typescript 手册"
date: 2024-04-17T16:10:22+08:00
draft: true
tags: ["第一技能"]
categories: ["第一技能"]
---

2024.04 ~ ~ ，在公司半死不活(: 欠薪 2 个月的情况下) 跟着林不渡的掘金小册[《TypeScript 全面进阶指南》](https://juejin.cn/book/7086408430491172901?utm_source=course_list)系统学习了 TypeScript，各人觉得小册还不错，比较值，感兴趣的童鞋可以去支持下。以下是整理的笔记，欢迎您的指正以及贡献。

<!--more-->

## 搭建开发环境

一个舒适、便捷、顺手的开发环境，不仅能大大提高学习效率，也会对日常的开发工作提供很大帮助。

本节代码：https://github.com/OweQian/ts-handbook/commit/d674e3819074d2e74ece9003a0cf06b8b3afbc13

### **VS Code 配置与插件**

#### 配置

对于 VS Code 内置的 TypeScript 支持，可以通过一些配置项获得更好的开发体验。首先，需要通过 Ctrl(Command) + Shift + P 打开命令面板，找到「打开工作区设置」这一项。

![Untitled](%E6%90%AD%E5%BB%BA%E5%BC%80%E5%8F%91%E7%8E%AF%E5%A2%83%20fcc5fd05bdfd415e9878e10babbab8e0/Untitled.png)

然后，在打开的设置中输入 TypeScript，筛选出所有 TypeScript 有关的配置，点击左侧的 "TypeScript"，这里才是官方内置的配置。

![Untitled](%E6%90%AD%E5%BB%BA%E5%BC%80%E5%8F%91%E7%8E%AF%E5%A2%83%20fcc5fd05bdfd415e9878e10babbab8e0/Untitled%201.png)

需要做的是开启一些代码提示功能（hints），TypeScript 可以对类型进行自动推导，但是往往要把鼠标悬浮在代码上才能看到推导得到的类型，其实可以通过配置将这些推导类型显示出来：

在前面配置搜索处，搜索 'typescript Inlay Hints'，展示的配置就都是提示相关的了，推荐开启的有这么几个：

- Function Like Return Types，显示推导得到的函数返回值类型；
- Parameter Names，显示函数入参的名称；
- Parameter Types，显示函数入参的类型；
- Variable Types，显示变量的类型。

以上选项开启后的效果如下：

![Untitled](%E6%90%AD%E5%BB%BA%E5%BC%80%E5%8F%91%E7%8E%AF%E5%A2%83%20fcc5fd05bdfd415e9878e10babbab8e0/Untitled%202.png)

#### 插件

##### [TypeScript Importer](https://link.juejin.cn/?target=https%3A%2F%2Fmarketplace.visualstudio.com%2Fitems%3FitemName%3Dpmneo.tsimporter)

这个插件会收集项目内所有的类型定义，在敲出`:`时提供会提供建议类型来进行补全。如果你选择了一个，它还会自动帮你把这个类型导入进来。

##### [Move TS](https://link.juejin.cn/?target=https%3A%2F%2Fmarketplace.visualstudio.com%2Fitems%3FitemName%3Dstringham.move-ts)

这个插件在重构以及编写 demo 的场景下很有帮助。它可以让你通过编辑文件的路径，直接修改项目的目录结构。

比如从`home/project/learn-interface.ts`  修改成  `home/project/interface-notes/interface-extend.ts`，这个插件会自动帮你把文件目录更改到对应的样子，并且更新其他文件中对这一文件的导入语句。

##### [ErrorLens](https://link.juejin.cn/?target=https%3A%2F%2Fmarketplace.visualstudio.com%2Fitems%3FitemName%3DPhilHindle.errorlens)

这一插件能够把你的 VS Code 底部问题栏的错误直接显示到代码文件中的对应位置，比如：

![Untitled](%E6%90%AD%E5%BB%BA%E5%BC%80%E5%8F%91%E7%8E%AF%E5%A2%83%20fcc5fd05bdfd415e9878e10babbab8e0/Untitled%203.png)

### **Playground：懒人福音**

如果你只是想拥有一个简单的环境，能写 TypeScript，能检查错误，能快速地调整 tsconfig，那官方提供的  [Playground](https://link.juejin.cn/?target=https%3A%2F%2Fwww.typescriptlang.org%2Fzh%2Fplay)  一定能满足你的需求。

![Untitled](%E6%90%AD%E5%BB%BA%E5%BC%80%E5%8F%91%E7%8E%AF%E5%A2%83%20fcc5fd05bdfd415e9878e10babbab8e0/Untitled%204.png)

你可以在这里编写 TS 代码，快速查看编译后的 JS 代码与声明文件，还可以通过 Shift + Enter 来执行 TS 文件。

Playground 最强大的能力其实在于，支持非常简单的配置切换，如 TS 版本（左上角 ），以及通过可视化的方式配置 tsconfig （左上角的配置）等，非常适合在这里研究 tsconfig 各项配置的作用。

![Untitled](%E6%90%AD%E5%BB%BA%E5%BC%80%E5%8F%91%E7%8E%AF%E5%A2%83%20fcc5fd05bdfd415e9878e10babbab8e0/Untitled%205.png)

### **ts-node 与 ts-node-dev**

#### **ts-node**

如果你想执行 TypeScript 文件，这个时候你就需要  [ts-node](https://link.juejin.cn/?target=https%3A%2F%2Fgithub.com%2FTypeStrong%2Fts-node)  以及  [ts-node-dev](https://link.juejin.cn/?target=https%3A%2F%2Fgithub.com%2Fwclr%2Fts-node-dev)  这一类工具了。它们能直接执行 ts 文件，并且支持监听文件重新执行。同时，它们也支持跳过类型检查这一步骤来获得更快的执行体验。

对于 ts-node，你可以将其安装到项目本地或直接全局安装，执行以下命令将 ts-node 与 typescript 安装到本地：

```jsx
pnpm add ts-node typescript
```

然后，在项目中执行以下命令创建 TypeScript 的项目配置文件： tsconfig.json。

```jsx
npx --package typescript tsc --init
// 如果全局安装了 TypeScript，可以这么做
tsc --init
```

接着，创建一个 TS 文件：

```jsx
console.log("Hello TypeScript");
```

再使用 ts-node 执行：

```jsx
ts-node index.ts
```

如果一切正常，此时你的终端应该能够正确地输出字符。

ts-node 可以通过两种方式进行配置，在 tsconfig 中新增  `'ts-node'`  字段，或在执行 ts-node 时作为命令行的参数：

- `P,--project`：指定你的 tsconfig 文件位置。默认情况下 ts-node 会查找项目下的 tsconfig.json 文件，如果你的配置文件是  `tsconfig.script.json`、`tsconfig.base.json`  这种，就需要使用这一参数来进行配置。
- `T, --transpileOnly`：禁用掉执行过程中的类型检查过程，这能让你的文件执行速度更快，且不会被类型报错卡住。这一选项的实质是使用了 TypeScript Compiler API 中的 transpileModule 方法。
- `-swc`：在 transpileOnly 的基础上，还会使用 swc 来进行文件的编译，进一步提升执行速度。
- `-emit`：如果你不仅是想要执行，还想顺便查看下产物，可以使用这一选项来把编译产物输出到  `.ts-node`  文件夹下（需要同时与  `-compilerHost`  选项一同使用）。

ts-node 本身并不支持自动监听文件变更然后重新执行，而这一能力又是某些项目场景下的刚需。因此，需要  [ts-node-dev](https://link.juejin.cn/?target=https%3A%2F%2Fgithub.com%2Fwclr%2Fts-node-dev)  库来实现这一能力。

#### ts-node-dev

ts-node-dev 基于  [node-dev](https://link.juejin.cn/?target=https%3A%2F%2Fgithub.com%2Ffgnass%2Fnode-dev) 与  [ts-node](https://link.juejin.cn/?target=https%3A%2F%2Fgithub.com%2FTypeStrong%2Fts-node)  实现，并在重启文件进程时共享同一个 TS 编译进程，避免了每次重启需要重新实例化编译进程等操作。

首先，本地安装：

```jsx
pnpm add ts-node-dev
```

ts-node-dev 在全局提供了  `tsnd`  这一简写，你可以运行  `tsnd`  来检查安装情况。

最常见的使用命令：

```jsx
ts-node-dev --respawn --transpile-only index.ts
```

respawn 选项启用了监听重启的能力，而 transpileOnly 提供了更快的编译速度。

## 类型基础

从 JavaScript 既有概念学习，对比 TypeScript 所有原始类型、数组以及对象等的类型标准，快速对 TypeScript 的功能、语法有一个基础认知。

本节代码：

### 原始类型

Javascript 中的原型数据类型主要包括：number / string / boolean / null / undefined / symbol / bigInt，在 Typescript 中，它们也有对应的类型注解：

```jsx
const myName: string = "putong";
const age: number = 18;
const male: boolean = false;
const nul: null = null;
const undef: undefined = undefined;
const bigIntVar: BigInt = 9007199254740991n;
const symbolVar: symbol = Symbol("unique");
```

除了 null 与 undefined 以外，余下的类型基本上可以完全对应到 JavaScript 中的数据类型概念。

#### null 与 undefined

在 JavaScript 中，null 与 undefined 分别表示 “**这里有值，但是个空值**” 和 “**这里没有值**”。

在 TypeScript 中，null 与 undefined 类型都是**有具体意义的类型，**这两者在没有开启  strictNullChecks  检查的情况下，会**被视作其他类型的子类型。**

```jsx
const temp1: null = null;
const temp2: undefined = undefined;

const temp3: string = null; // 仅在关闭 strictNullChecks 时成立，下同
const temp4: string = undefined;
```

#### void

在 JavaScript 中，void 操作符会执行后面跟着的表达式并返回一个 undefined，如 void 0。

在 TypeScript 中，void 用于描述一个内部没有 return 语句或没有显示 return 一个值的函数的返回值。

![Untitled](%E7%B1%BB%E5%9E%8B%E5%9F%BA%E7%A1%80%201da259aae1de4920b4f6023edf41ccf2/Untitled.png)

func1 与 func2 的返回值类型都会被隐式推导为 void，只有显式返回了 undefined 值的 func3 的返回值类型才被推导为了 undefined，但在实际的代码执行中，func1 与 func2 的返回值均是 undefined。

> 虽然 func3 的返回值类型会被推导为 undefined，但是你仍然可以使用 void 类型进行标注，因为在类型层面 func1、func2、func3 都表示“没有返回一个有意义的值”。

### 数组类型与元组类型

在 TypeScript 中有两种方式来声明一个数组类型：

```jsx
const arr1: string[] = [];
const arr2: Array<string> = [];
```

这两种方式是完全等价的，但其实更多是以前者为主，如果你将鼠标悬浮在  arr2  上，会发现它显示的类型签名是  string[]。

![Untitled](%E7%B1%BB%E5%9E%8B%E5%9F%BA%E7%A1%80%201da259aae1de4920b4f6023edf41ccf2/Untitled%201.png)

在某些情况下，使用  **元组（Tuple）**  来代替数组要更加妥当，比如一个数组中只存放固定长度的变量，但代码进行了超出长度地访问：

![Untitled](%E7%B1%BB%E5%9E%8B%E5%9F%BA%E7%A1%80%201da259aae1de4920b4f6023edf41ccf2/Untitled%202.png)

这种情况肯定是不符合预期的，现在能确定这个数组中只有三个成员，并且希望在越界访问时给出类型报错。

这时就可以使用元组类型来进行类型标注：

```jsx
const arr4: [string, string, string] = ["a", "b", "c"];
console.log(arr4[4]);
```

此时将会产生一个类型错误：**_长度为“3”的元组类型“[string, string, string]”在索引“4“处没有元素_**。

![Untitled](%E7%B1%BB%E5%9E%8B%E5%9F%BA%E7%A1%80%201da259aae1de4920b4f6023edf41ccf2/Untitled%203.png)

另外，元组内部也可以声明多个与其位置强绑定的，不同类型的元素：

```jsx
const arr5: [string, number, boolean] = ["a", 4, false];
```

元组也支持在某一个位置上的可选成员：

```jsx
const arr6: [string, number?, boolean?] = ["a"];
```

对于标记为可选的成员，在  --strictNullCheckes  配置下会被视为一个  string | undefined  的类型。

此时，元组的长度属性也会发生变化，比如上面的元组 arr6 ，其长度的类型为  `1 | 2 | 3`：

![Untitled](%E7%B1%BB%E5%9E%8B%E5%9F%BA%E7%A1%80%201da259aae1de4920b4f6023edf41ccf2/Untitled%204.png)

在 TypeScript 4.0 中，还有具名元组（[Labeled Tuple Elements](https://link.juejin.cn/?target=https%3A%2F%2Fgithub.com%2FMicrosoft%2FTypeScript%2Fissues%2F28259)）的概念，可以为元组中的元素打上类似属性的标记，具名元组也同样支持可选元素的修饰符：

```jsx
const arr7: [name: string, age: number, male: boolean] = ["a", 4, false];

const arr8: [name: string, age?: number, male?: boolean] = ["a"];
```

除了显式地越界访问，还可能存在隐式地越界访问，如通过解构赋值的形式：

```jsx
const arr9: string[] = [];
const [ele1, ele2, ...rest] = arr9;
```

对于数组，此时仍然无法检查出是否存在隐式访问，因为类型层面并不知道它到底有多少个元素。

但对于元组，隐式的越界访问也能够被揪出来给一个警告：

```jsx
const arr10: [string, number, boolean] = ["a", 20, false];
const [nameValue, ageValue, maleValue, other] = arr10;
```

![Untitled](%E7%B1%BB%E5%9E%8B%E5%9F%BA%E7%A1%80%201da259aae1de4920b4f6023edf41ccf2/Untitled%205.png)

### 对象类型

在 Typescript 中使用 interface 来描述对象类型，可以理解为它代表了这个对象对外提供的接口结构。

使用 interface 声明一个结构，然后使用这个结构来作为一个对象的类型标注即可：

```jsx
interface IDescription {
  name: string;
  age: number;
  male: boolean;
}

const obj1: IDescription = {
  name: "putong",
  age: 18,
  male: false,
};
```

- 每一个属性的值必须一一对应到接口的属性类型
- 不能有多的属性，也不能有少的属性

#### 修饰接口属性

除了声明属性以及属性的类型外，还可以对属性进行修饰，常见的修饰包括**可选（Optional）**  与  **只读（Readonly）**。

在接口结构中通过  ?  来标记一个属性为可选：

```jsx
interface IDescription1 {
  name: string;
  age: number;
  male?: boolean;
  func?: Function;
}

const obj2: IDescription1 = {
  name: "putong",
  age: 18,
  male: false,
  // 无需实现 func 也是合法的
};
```

可选属性标记不会影响你对这个属性进行赋值，如：

```jsx
obj2.male = true;
obj2.func = () => {};
```

除了标记一个属性为可选外，还可以标记这个属性为只读：readonly，它的作用是**防止对象的属性被再次赋值**。

```jsx
interface IDescription2 {
  readonly name: string;
  age: number;
}

const obj3: IDescription2 = {
  name: "putong",
  age: 18,
};
```

![Untitled](%E7%B1%BB%E5%9E%8B%E5%9F%BA%E7%A1%80%201da259aae1de4920b4f6023edf41ccf2/Untitled%206.png)

#### **Object 、object、 { }**

##### Object

在 JavaScript 中，原型链的顶端是 Object 以及 Function，也就意味着所有的原始类型与对象类型最终都指向 Object。在 TypeScript 中就表现为 Object 包含了所有的类型：

```jsx
const tmp1: Object = undefined;
const tmp2: Object = null;
const tmp3: Object = void 0;

const tmp4: Object = "putong";
const tmp5: Object = 18;
const tmp6: Object = { name: "putong" };
const tmp7: Object = () => {};
const tmp8: Object = [];
```

和 Object 类似的还有 Boolean、Number、String、Symbol，这几个**装箱类型（Boxed Types）**  同样包含了一些超出预期的类型。

以 String 为例，它同样包括 undefined、null、void，以及代表的  **拆箱类型（Unboxed Types）** string，但并不包括其他装箱类型对应的拆箱类型，如 boolean：

![Untitled](%E7%B1%BB%E5%9E%8B%E5%9F%BA%E7%A1%80%201da259aae1de4920b4f6023edf41ccf2/Untitled%207.png)

**在任何情况下，你都不应该使用装箱类型。**

##### object

object 的引入就是为了解决对 Object 类型的错误使用，它代表**所有非原始类型的类型，即数组、对象与函数类型等**：

![Untitled](%E7%B1%BB%E5%9E%8B%E5%9F%BA%E7%A1%80%201da259aae1de4920b4f6023edf41ccf2/Untitled%208.png)

##### \{\}

{} 是一个对象字面量类型，它作为类型签名是一个合法的，但**内部无属性定义的空对象**，这类似于 Object：

```jsx
const tmp25: {} = undefined; // 仅在关闭 strictNullChecks 时成立，下同
const tmp26: {} = null;
const tmp27: {} = void 0; // void 0 等价于 undefined

const tmp28: {} = "putong";
const tmp29: {} = 18;
const tmp30: {} = { name: "putong" };
const tmp31: {} = () => {};
const tmp32: {} = [];
```

虽然能够将其作为变量的类型，但实际上**无法对这个变量进行任何赋值操作**：

![Untitled](%E7%B1%BB%E5%9E%8B%E5%9F%BA%E7%A1%80%201da259aae1de4920b4f6023edf41ccf2/Untitled%209.png)

它就是纯洁的像一张白纸一样的空对象，上面没有任何属性（：除了 toString 这种与生俱来的属性。

##### 总结

- 任何时候都不要、不要、不要使用 Object 及类似的装箱类型
- 当你不确定某个变量的具体类型，但能确定它不是原始类型，可以使用 object

> 推荐进一步区分，使用  Record<string, unknown>  或  Record<string, any>  表示对象，unknown[]  或  any[]  表示数组，(...args: any[]) => any 表示函数

- 避免使用 {}，它和使用 any 一样恶劣

### 字面量类型

字面量类型包括**字符串字面量类型**、**数字字面量类型**、**布尔字面量类型**和**对象字面量类型**，它们可以直接作为类型标注：

```jsx
const ower: "putong" = "putong";
const num: 18 = 18;
const isMale: false = false;
```

字面量类型代表着比原始类型更精确的类型，同时也是原始类型的子类型。为什么说字面量类型比原始类型更精确？举个 🌰：

![Untitled](%E7%B1%BB%E5%9E%8B%E5%9F%BA%E7%A1%80%201da259aae1de4920b4f6023edf41ccf2/Untitled%2010.png)

上面的代码，原始类型的值可以包括任意的同类型值，而字面量类型要求**值级别的字面量一致**。

#### 联合类型

联合类型代表了**一组类型的可用集合**，只要最终赋值的类型属于联合类型的成员之一，就可以认为符合这个联合类型。

```jsx
interface Tmp {
  mixed: true | string | 18 | (() => void) | (1 | 2);
}
```

- 对于联合类型中的函数类型，需要使用括号 () 包裹起来
- 可以在联合类型中进一步嵌套联合类型，但这些嵌套的联合类型最终都会被展平到第一级中

![Untitled](%E7%B1%BB%E5%9E%8B%E5%9F%BA%E7%A1%80%201da259aae1de4920b4f6023edf41ccf2/Untitled%2011.png)

联合类型的常用场景之一是通过多个对象类型的联合，来实现手动的互斥属性，即这一属性如果有字段 1，那就没有字段 2：

```jsx
interface Tmp2 {
  user: { vip: true, expires: string } | { vip: false, promotion: string };
}

declare var tmp: Tmp2;

if (tmp.user.vip) {
  console.log(tmp.user.expires);
}
```

通过类型别名来复用一组字面量联合类型：

```jsx
type Code = 10000 | 10001 | 10002;

type Status = "success" | "failure";
```

#### 对象字面量类型

对象字面量类型就是一个对象类型的值，这也就意味着这个对象的值全都为字面量值：

```jsx
interface Tmp3 {
  obj: {
    name: "putong",
    age: 18,
  };
}

const obj: Tmp3 = {
  obj: {
    name: "wangxiaobai",
    age: 20,
  },
};

const obj4: Tmp3 = {
  obj: {
    name: "putong",
    age: 18,
  },
};
```

如果要实现一个对象字面量类型，意味着要完全的实现这个类型每一个属性的每一个值，否则就会给出错误提示。

![Untitled](%E7%B1%BB%E5%9E%8B%E5%9F%BA%E7%A1%80%201da259aae1de4920b4f6023edf41ccf2/Untitled%2012.png)

**无论是原始类型还是对象类型的字面量类型，它们的本质都是类型而不是值**。在编译时会被擦除，同时也是被存储在内存中的类型空间而非值空间。

### 枚举

如果要和 JavaScript 中现有的概念对比，最贴切的可能就是曾经写过的 constants 文件了：

```jsx
export default {
  Home_Page_Url: "url1",
  Setting_Page_Url: "url2",
  Share_Page_Url: "url3",
};
```

把这段代码替换为枚举，会是如下的形式：

```jsx
enum PageUrl {
  Home_Page_Url = "/home",
  Setting_Page_Url = "/setting",
  Share_Page_Url = "/share",
}

const home = PageUrl.Home_Page_Url;
```

这么做的好处主要有两点：

- 拥有更好的类型提示
- 常量被约束在一个命名空间下

如果没有显示声明枚举的值，默认使用数字枚举，从 0 开始，以 1 递增：

![Untitled](%E7%B1%BB%E5%9E%8B%E5%9F%BA%E7%A1%80%201da259aae1de4920b4f6023edf41ccf2/Untitled%2013.png)

如果只为某一个成员指定了枚举值，那么之前未赋值成员仍然会采用从 0 递增的方式，之后的成员则会开始从枚举值递增。

![Untitled](%E7%B1%BB%E5%9E%8B%E5%9F%BA%E7%A1%80%201da259aae1de4920b4f6023edf41ccf2/Untitled%2014.png)

在数字型枚举中，你可以使用延迟求值的枚举值，比如函数：

```tsx
const returnNum = () => 100 + 200;
enum Items3 {
  Foo = returnNum(),
  Bar = 18,
  Baz,
}
```

需要注意延迟求值的枚举值是有条件的。**如果你使用了延迟求值，没有使用延迟求值的枚举成员必须放在使用常量枚举值声明的成员之后，或者放在第一位**：

```jsx
enum Item4 {
  Baz,
  Foo = returnNum(),
  Bar = 18,
}
```

枚举支持同时使用字符串枚举值和数字枚举值：

```jsx
enum Mixed {
  Num = 18,
  Str = "putong",
}
```

枚举和对象的差异在于，**对象是单向映射的**，只能从键映射到键值。而**枚举是双向映射的**，即可以从枚举成员映射到枚举值，也可以从枚举值映射到枚举成员。

```jsx
enum Items5 {
  Foo,
  Bar,
  Baz,
}

const fooValue = Items5.Foo;
const fooKey = Items5[0];
```

要了解这一现象的本质，需要来看下枚举的编译产物，上面的枚举会被编译为以下 JavaScript 代码：

```jsx
(function (Items5) {
  Items5[(Items5["Foo"] = 0)] = "Foo";
  Items5[(Items5["Bar"] = 1)] = "Bar";
  Items5[(Items5["Baz"] = 2)] = "Baz";
})(Items5 || (Items5 = {}));
```

obj[k] = v  的返回值即是 v，因此这里的  obj[obj[k] = v] = k  本质上就是进行了  obj[k] = v  与  obj[v] = k  这样两次赋值。

仅有值为数字的枚举成员才能够进行双向枚举，**字符串枚举成员仍然只会进行单次映射**：

```jsx
enum Items6 {
  Foo,
  Bar = "BarValue",
  Baz = "BazValue",
}

// 编译结果
var Items6;
(function (Items6) {
  Items6[(Items6["Foo"] = 0)] = "Foo";
  Items6["Bar"] = "BarValue";
  Items6["Baz"] = "BazValue";
})(Items6 || (Items6 = {}));
```

#### 常量枚举

常量枚举和普通枚举相似，只是其声明多了一个 const：

```jsx
const enum Items7 {
  Foo,
  Bar,
  Baz,
}

const BarValue = Items7.Bar;
```

常量枚举与普通枚举的差异主要在访问性和编译产物。

对于常量枚举，只能通过枚举成员访问枚举值，不能通过枚举值访问枚举成员。

在编译产物中并不会存在一个额外的辅助对象，对枚举成员的访问会被直接内联替换为枚举值。

```jsx
const BarValue = 1; /* Items7.Bar */
```
