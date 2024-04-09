---
title: "📒 读《Effective TypeScript》"
date: 2024-02-27T12:00:22+08:00
tags: ["第一技能"]
categories: ["第一技能"]
---

2024.03 ~ ~ 2024.04，历时 1 个月，在公司依然是 996.ICU(:不是，996 是打工人的福报) 期间读了 《Effective TypeScript》，以下是整理的笔记，欢迎您的指正以及贡献。

## 条款 1： 理解 TypeScript 与 JavaScript 的关系

- TypeScript 是 JavaScript 的超集。所有 JavaScript 程序已经是 TypeScript 程序了。另外，TypeScript 具有一些自己的语法，因此 TypeScript 程序通常不是合法的 JavaScript 程序。

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/ts/img_01.png" alt="" width="100%" />

- TypeScript 添加了一个类型系统，该类型系统可对 JavaScript 的运行时行为进行建模，并尝试发现将在运行时引发异常的代码。但不要指望它会标记所有异常，通过类型检查器的代码仍可能在运行时抛出异常。

```
let city = 'new york city';
console.log(city.toUppercase());
  // ~~~~~~~~~~~ Property 'toUppercase' does not exist on type
  // 'string'. Did you mean 'toUpperCase'?
```

- 尽管 TypeScript 的类型系统在很大程度上对 JavaScript 的运行时行为进行了建模，但仍有一些 JavaScript 允许的行为，TypeScript 选择禁止，如使用错误数量的参数调用函数。

```
const names = ['Alice', 'Bob'];
console.log(names[2].toUpperCase());
  // TypeError: Cannot read property 'toUpperCase' of undefined
```

## 条款 2：知道你在使用哪个 TypeScript 选项

- TypeScript 编译器包含了一些能够影响语言核心方面的设置，许多配置选项控制着它去哪里寻找源文件，以及它生成什么样的文件。

- 建议使用 tsconfig.json 而不是命令行选项配置 TypeScript。

* 除非你在将 JavaScript 项目转换为 TypeScript，否则请打开 noImplicitAny。

```
{
  "compilerOptions": {
    "noImplicitAny": true
  }
}
```

```
function add(a, b) {
  // ~ Parameter 'a' implicitly has an 'any' type
  // ~ Parameter 'b' implicitly has an 'any' type
  return a + b;
}
```

- 使用 strictNullChecks 可以防止 “未定义不是对象” 一类的运行时错误。

```
const el = document.getElementById('status');
el.textContent = 'Ready';
// ~~ Object is possibly 'null'
if (el) {
  el.textContent = 'Ready'; // OK, null has been excluded
}
el!.textContent = 'Ready'; // OK, we've asserted that el is non-null
```

- 使用 strict 这类的选项能够获得 TypeScript 提供的最彻底的检查。
