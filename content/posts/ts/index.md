---
title: "Typescript 使用手册"
date: 2023-03-06T15:12:47+08:00
tags: ["第一技能"]
categories: ["第一技能"]
---

项目地址： [TSHandbook](https://github.com/OweQian/TSHandbook.git)  

<!--more-->

## 类型世界

### 原始类型 

number / string / boolean / null / undefined / symbol / bigint 

```ts
const name: string = 'wangxiaobia';
const age: number = 18;
const male: boolean = false;
const undef: undefined = undefined;
const nul: null = null;
const bigIntVar1: bigint = 9007199254740991n;
const symbolVar: symbol = Symbol('unique');
```

#### null 和 undefined  

null 与 undefined 都是有具体意义的类型。在没有开启 strictNullChecks 检查的情况下，会被视作其他类型的子类型，比如 string 类型会被认为包含了 null 与 undefined 类型：  

```ts
const temp1: null = null;
const temp2: undefined = undefined;
const temp3: string = null;
const temp4: string = undefined;
```

#### void 

描述一个内部没有 return，或没有显示 return 一个值的函数的返回值。  

```ts
function func1 () {};
function func2 () { return };
function func3 () {
  return undefined;
}
```

func1 与 func2 的返回值类型会被隐式推导为 void，显式返回了 undefined 值的 func3 其返回值类型被推导为了 undefined。但在实际的代码执行中，func1 与 func2 的返回值均是 undefined。  

虽然 func3 的返回值类型会被推导为 undefined，但仍可以使用 void 类型进行标注，因为在类型层面 func1、func2、func3 都表示“没有返回一个有意义的值”。  

void 表示一个空类型，而 null 与 undefined 都是一个具有意义的实际类型。而 undefined（null） 能够被赋值给 void 类型的变量，但需要在关闭 strictNullChecks 配置的情况下才能成立。   

```ts
const voidVar1: void = null;
const voidVar2: void = undefined;
```

### 数组类型 

有两种方式来声明一个数组类型：  

```ts
const arr1: string[] = [];
const arr2: Array<string> = [];
```

这两种方式是完全等价的，更多的以前者为主。   

### 元组类型

用来代替数组，已知数组长度和成员类型，在越界访问时（数组不会给出）可以给出类型报错。  

```ts
const arr3: [string, string, string] = ['wang', 'xiao', 'bai'];
arr3[18]; 
```

此时将会产生一个类型错误：长度为“3”的元组类型“[string, string, string]”在索引“18“处没有元素。  

元组内部也可以声明多个与其位置强绑定的，不同类型的元素：  

```ts
const arr4: [string, number, boolean] = ['wang', 18, true];
```

支持在某一个位置上的可选成员：  

```ts
const arr5: [string, number?, boolean?] = ['wang'];
```

TypeScript 4.0 中的具名元组（Labeled Tuple Elements），支持为元组中的元素打上类似属性的标记：  

```ts
const arr6: [name: string, age: number, male: boolean] = ['wang', 18, false];
```

具名元组也支持可选元素的修饰符：  

```ts
const arr7: [name: string, age?: number, male?: boolean] = ['wang'];
```

### 对象类型

interface 来描述对象类型，它代表了这个对象对外提供的接口结构。   

```ts
interface IDescription {
  name: string;
  age: number;
  male: boolean;
}

const obj1: IDescription = {
  name: 'wangxiaobai',
  age: 18,
  male: false,
}
```

每一个属性的值必须一一对应到接口的属性类型，不能有多的属性，也不能有少的属性。  

#### 修饰接口属性  

在接口中用 ? 来标记一个属性为可选：  

```ts
interface IDescription {
  name: string;
  age: number;
  male?: boolean;
  func?: Function;
}

const obj2: IDescription = {
  name: 'wangxiaobai',
  age: 18,
}
```

定义一个可选的布尔类型属性，当你访问 obj2.male 时，它的类型是 boolean | undefined。  

定义一个可选的函数类型属性，进行调用：obj2.func() ，此时将会产生一个类型报错：不能调用可能是未定义的方法。  

可选属性标记不会影响你对这个属性进行赋值。   

```ts
obj2.male = false;
obj2.func = () => {};
```

在接口中用 readonly 来标记一个属性为只读，防止属性被再次赋值。  

```ts
interface IDescriptionProps {
  readonly name: string;
  age: number;
}

const obj3: IDescriptionProps = {
  name: 'wangxiaobai',
  age: 18,
};

obj3.name = 'OweQian';
```

此时会抛出错误，无法分配到 "name" ，因为它是只读属性。   

ps: 在数组和元组层面也存在着只读的修饰。  

* 只能将整个数组/元组标记为只读，而不能像对象那样标记某个属性为只读。  
* 一旦被标记为只读，那这个只读数组/元组的类型上，将不再具有 push、pop 等方法。  

#### object、Object、{} 

在 TS 中，Object 包含了所有的类型:  

```ts
const temp1: Object = undefined;
const temp2: Object = null;
const temp3: Object = void 0;
const temp4: Object = 'wangxiaobai';
const temp5: Object = 18;
const temp6: Object = () => {};
const temp7: Object = { name: 'wangxiaobai' };
const temp8: Object = [];
```

对于 undefined、null、void 0 ，需要关闭 strictNullChecks。  

和 Object 类似的还有 Boolean、Number、String、Symbol，这几个装箱类型（Boxed Types），同样包含了一些超出预期的类型。  

以 String 为例，它同样包括 undefined、null、void，以及代表的拆箱类型（Unboxed Types）string，但并不包括其他装箱类型对应的拆箱类型，如 boolean 与基本对象类型。  

```ts
const temp9: String = undefined;
const temp10: String = null;
const temp11: String = void 0;
const temp12: String = 'wangxiaobai';

// 以下不成立，因为不是字符串类型的拆箱类型
const temp13: String = 18; // X
const temp14: String = { name: 'wangxiaobai' }; // X
const temp15: String = () => {}; // X
const temp16: String = []; // X
```

任何情况下，你都不应该使用这些装箱类型。  

object 类型的引入就是为了解决 Object 类型的错误使用，它代表所有非原始类型的类型，即数组、函数、对象类型。  

```ts
const temp17: object = undefined;
const temp18: object = null;
const temp19: object = void 0;

const temp20: object = 'wangxiaobai'; // X
const temp21: object = 18; // X

const temp22: object = { name: 'wangxiaobai' };
const temp23: object = () => {};
const temp24: object = [];
```

{} 是一个对象字面量类型，它代表内部无属性定义的空对象，这类似于 Object。  

```ts
const temp25: {} = undefined;
const temp26: {} = null;
const temp27: {} = void 0;
const temp28: {} = 'wangxiaobai';
const temp29: {} = 18;
const temp30: {} = () => {};
const temp31: {} = { name: 'wangxiaobai' };
const temp32: {} = [];
```

无法对变量进行任何赋值操作。  

```ts
temp31.age = 18; // X 类型“{}”上不存在属性“age”
```

总结：  

* 在任何时候都不要使用 Object 以及类似的装箱类型。   
* 当你不确定某个变量的具体类型，但能确定不是原始类型，可以使用 object。  
* 可以使用 Record<string, unknown> 或 Record<string, any> 表示对象。  
* 可以使用 any[] 或 unknown[] 表示数组。  
* 可以使用 (...args: any[]) => any 表示函数。  
* 避免使用 {}。  

### 字面量类型与联合类型

定义一个接口，它描述了响应的消息结构：   

```ts
interface IResponseProps {
  code: number;
  status: string;
  data: any;
}
```

这里的 code 与 status 实际值会来自于一组确定值的集合，比如 code 可能是 10000 / 10001 / 50000，status 可能是 "success" / "failure"。   

上面的类型只给出了一个宽泛的 number / string，既不能在访问 code 时获得精确的提示，也失去了 TypeScript 类型即文档的功能。  

可以使用字面量类型加上联合类型进行改写：  

```ts
interface IResponseProps {
  code: 10000 | 10001 | 50000;
  status: 'success' | 'failure';
  data: any;
}
```

这时就能在访问时获得精确地类型推导了。  

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/ts/img_01.png" alt="" width="700" />  

对于 declare var res: Res，它是快速生成一个符合指定类型，但没有实际值的变量，同时它也不存在于运行时中。   

#### 字面量类型

"success" 不是一个值吗？为什么它可以作为类型？在 TypeScript 中，这叫做字面量类型（Literal Types），它代表着比原始类型更精确的类型，同时也是原始类型的子类型。  

字面量类型主要包括字符串字面量类型、数字字面量类型、布尔字面量类型和对象字面量类型。   

```ts
const name: 'wangxiaobai' = 'wangxiaobai';
const age: 18 = 18;
const male: false = false;
```

为什么说字面量类型比原始类型更精确？  

```ts
// 报错！不能将类型“"wangxiaobai18"”分配给类型“"wangxiaobai"”。
const str1: 'wangxiaobai' = 'wangxiaobai18';
const str2: string = 'wangxiaobai';
const str3: string = 'wangxiaobai3';
```

原始类型的值可以包括任意的同类型值，而字面量类型要求的是值级别的字面量一致。  

单独使用字面量类型比较少见，因为单个字面量类型并没有什么实际意义。它通常和联合类型（即这里的 |）一起使用，表达一组字面量类型：   

```ts
interface ITempProps {
  bool: true | false;
  num: 1 | 2 | 3;
  str: 'wang' | 'xiao' | 'bai'
}
```

#### 联合类型

它代表了一组类型的可用集合，只要最终赋值的类型属于联合类型的成员之一，就可以认为符合这个联合类型。  

联合类型对其成员并没有任何限制，除了上面这样对同一类型字面量的联合，还可以将各种类型混合到一起。   

```ts
interface ITempMixedProps {
  mixed: true | string | 18 | {} | (() => {}) | (1 | 2)
}
```

这里有几点需要注意：  

* 联合类型中的函数类型需要使用括号 () 包裹起来  
* 函数类型并不存在字面量类型，因此这里的 (() => {}) 就是一个合法的函数类型  
* 可以在联合类型中进一步嵌套联合类型，但这些嵌套的联合类型最终都会被展平到第一级中  

常用场景之一是通过多个对象类型的联合，来实现手动的互斥属性，即这一属性如果有字段 1，那就没有字段 2。  

```ts
interface ITempProps {
  user:
    | {
    vip: true;
    expires: string;
  }
  | {
    vip: false;
    promotion: string;
  }
}

declare var temp: ITempProps;

if (temp.user.vip) {
  console.log(temp.user.expires);
}
```

user 属性会满足普通用户与 VIP 用户两种类型，这里 vip 属性的类型基于布尔字面量类型声明。  

在实际使用时可以通过判断此属性为 true，确保接下来的类型推导都会将其类型收窄到 VIP 用户的类型（即联合类型的第一个分支）。  

可以通过类型别名来复用一组字面量联合类型：  

```ts
type Code = 10000 | 10001 | 50000;
type Status = 'success' | 'failure';
```

除了原始类型的字面量类型以外，对象类型也有着对应的字面量类型。  

#### 对象字面量类型

对象字面量类型就是一个对象类型的值，这也就意味着这个对象的值全都为字面量值。  

```ts
interface ITempProps {
  obj: {
    name: 'wangxiaobai';
    age: 18
  }
}

const temp: ITempProps = {
  obj: {
    name: 'wangxiaobai',
    age: 18
  }
}
```

如果要实现一个对象字面量类型，意味着完全的实现这个类型每一个属性的每一个值。  

无论是原始类型还是对象类型的字面量类型，它们的本质都是类型而不是值。在编译时同样会被擦除，同时也是被存储在内存中的类型空间而非值空间。

### 枚举类型

```ts
enum PageUrl {
  Home_Page_Url = 'home',
  Setting_Page_Url = 'setting',
  Share_Page_Url = 'share',
}

const home = PageUrl.Home_Page_Url;
```

使用枚举拥有了更好的类型提示，并且这些常量被真正地约束在一个命名空间下。  

如果没有声明枚举的值，它会默认使用数字枚举，并且从 0 开始，以 1 递增。  

```ts
enum Items {
  Foo,
  Bar,
  Baz,
}
```

在这个例子中，Items.Foo、Items.Bar、Items.Baz 的值依次是 0、1、2。

如果只为某一个成员指定了枚举值，那么之前未赋值成员仍然会使用从 0 递增的方式，之后的成员则会开始从枚举值递增。  

```ts
enum Items {
  // 0
  Foo,
  Bar = 18,
  // 19
  Baz,
}
```

在数字型枚举中，可以使用延迟求值的枚举值，比如函数。  

```ts
const returnNum = () => 100 + 18;
enum Items {
  Foo = returnNum(),
  Bar = 18,
  Baz,
}
```

但要注意，延迟求值的枚举值是有条件的。如果使用了延迟求值，那么没有使用延迟求值的枚举成员必须放在使用常量枚举值声明的成员之后，或者放在第一位。   

```ts
enum Items {
  Baz,
  Foo = returnNum(),
  Bar = 18,
}
```

也可以同时使用字符串枚举值和数字枚举值。   

```ts
enum Mixed {
  Num = 18,
  Str = 'wangxiaobai'
}
```

枚举和对象的重要差异在于，对象是单向映射的，只能从键映射到键值。而枚举是双向映射的，可以从枚举成员映射到枚举值，也可以从枚举值映射到枚举成员。    

```ts
enum Items {
  Foo,
  Bar,
  Baz,
}

const fooValue = Items.Foo; // 0
const fooKey = Items[0]; // 'Foo'
```

要了解这一现象的本质，需要来看一看枚举的编译产物，如以上的枚举会被编译为以下 JavaScript 代码：   

```javascript
"use strict";
var Items;
(function (Items) {
  Items[Items["Foo"] = 0] = "Foo";
  Items[Items["Bar"] = 1] = "Bar";
  Items[Items["Baz"] = 2] = "Baz";
})(Items || (Items = {}));
```

obj[k] = v 的返回值即是 v，因此这里的 obj[obj[k] = v] = k 本质上就是进行了 obj[k] = v 与 obj[v] = k 这样两次赋值。  

仅有值为数字的枚举成员才能够进行这样的双向枚举，字符串枚举成员仍然只会进行单次映射：  

```ts
enum Items {
  Foo,
  Bar = 'BarValue',
  Baz = 'BazValue'
}
```

```javascript
// 编译结果，只会进行 键-值 的单向映射
"use strict";
var Items;
(function (Items) {
  Items[Items["Foo"] = 0] = "Foo";
  Items["Bar"] = "BarValue";
  Items["Baz"] = "BazValue";
})(Items || (Items = {}));
```

#### 常量枚举

常量枚举和枚举相似，只是其声明多了一个 const。   

```ts
const enum Items {
  Foo,
  Bar,
  Baz,
}

const fooValue = Items.Foo;
```

它和普通枚举的差异主要在访问性与编译产物。对于常量枚举，只能通过枚举成员访问枚举值（而不能通过值访问成员）。同时，在编译产物中并不会存在一个额外的辅助对象（如上面的 Items 对象），对枚举成员的访问会被直接内联替换为枚举的值。   

以上的代码会被编译为如下形式：

```javascript
const fooValue = 0 /* Foo */; // 0
```

### 函数类型

#### 类型签名

函数类型是为了描述了函数入参类型与函数返回值类型，它们同样使用 : 的语法进行类型标注。   

```ts
function foo(name: string): number {
return name.length;
}
```

在函数类型中同样存在类型推导。比如下面这个例子，你可以不写返回值处的类型，它也能被正确推导为 number 类型。    

function name () {} 这一声明函数的方式为函数声明（Function Declaration）。除了函数声明以外，还可以通过函数表达式（Function Expression），即 const foo = function(){} 的形式声明一个函数。      

在表达式中进行类型声明的方式是这样的：   

```ts
const foo = function (name: string): number {
return name.length
}
```

还可以像对变量进行类型标注那样，对 foo 这个变量进行类型声明：   

```ts
const foo: (name: string) => number = function (name) {
return name.length
}
```

这里的 (name: string) => number 是 TypeScript 中的函数类型签名，有点类似 ES6 中的箭头函数。  

而实际的箭头函数的类型标注也是类似的：  

```ts
// 方式一
const foo = (name: string): number => {
	return name.length
}

// 方式二
const foo: (name: string) => number = (name) => {
	return name.length
}
```

在方式二的声明方式中，你会发现函数类型声明混合箭头函数声明时，代码的可读性非常差。  

一般不推荐这么使用，要么直接在函数中进行参数和返回值的类型声明，要么使用类型别名将函数声明抽离出来：   

```ts
type FuncFoo = (name: string) => number

const foo: FuncFoo = (name) => {
	return name.length
}
```

如果只是为了描述这个函数的类型结构，也可以使用 interface 来进行函数声明：  

```ts
interface FuncFooStruct {
	(name: string): number
}
```

这时的 interface 被称为 Callable Interface。  

#### void 类型

在 TypeScript 中，一个没有返回值（即没有调用 return 语句）的函数，其返回类型应当被标记为 void 而不是 undefined，即使它实际的值是 undefined。

```ts
// 没有调用 return 语句
function foo(): void { }
```

在 TypeScript 中，undefined 类型是一个实际的、有意义的类型值，而 void 代表着空的、没有意义的类型值。    

相比之下，void 类型就像是 JavaScript 中的 null 一样。因此在没有实际返回值时，使用 void 类型能更好地说明这个函数没有进行返回操作。   

但当函数中有 return 语句但没有显示返回一个值时，其实更好的方式是使用 undefined：   

```ts
function bar(): undefined {
	return;
}
```

这个函数进行了返回操作，但没有返回实际的值。   

#### 可选参数

函数存在一些可选参数的情况，当不传入参数时函数会使用此参数的默认值。正如在对象类型中使用 ? 描述一个可选属性一样，在函数类型中也使用 ? 描述一个可选参数：   

```ts
// 在函数逻辑中注入可选参数默认值
function foo1(name: string, age?: number): number {
	const inputAge = age ?? 18;
	return name.length + inputAge
}

// 直接为可选参数声明默认值
function foo2(name: string, age: number = 18): number {
  const inputAge = age || 18;
  return name.length + inputAge
}
```

可选参数必须位于必选参数之后。这里的可选参数类型也可以省略，如这里原始类型的情况可以直接从提供的默认值类型推导出来。但对于联合类型或对象类型的复杂情况，还是需要老老实实地进行标注。    

#### rest 参数

rest 参数的类型标注也比较简单，由于其实际上是一个数组，这里也应当使用数组类型进行标注：   

对于 any 类型，你可以简单理解为它包含了一切可能的类型。   

```ts
function foo(arg1: string, ...rest: any[]) { }
```

也可以使用元组类型进行标注：   

```ts
function foo(arg1: string, ...rest: [number, boolean]) { }

foo('wangxiaobai', 18, true)
```

#### 重载

在某些逻辑较复杂的情况下，函数可能有多组入参类型和返回值类型：   

```ts
function func(foo: number, bar?: boolean): string | number {
	if (bar) {
		return String(foo);
	} else {
		return foo * 18;
	}
}
```

在这个实例中，函数的返回类型基于其入参 bar 的值，并且从其内部逻辑中知道，当 bar 为 true，返回值为 string 类型，否则为 number 类型。而这里的类型签名完全没有体现这一点，只知道它的返回值是个联合类型。   

要想实现与入参关联的返回值类型，可以使用 TypeScript 提供的函数重载签名（Overload Signature），将以上的例子使用重载改写：   

```ts
function func(foo: number, bar: true): string;
function func(foo: number, bar?: false): number;
function func(foo: number, bar?: boolean): string | number {
	if (bar) {
		return String(foo);
	} else {
		return foo * 18;
	}
}

const res1 = func(18); // number
const res2 = func(18, true); // string
const res3 = func(18, false); // number
```

这里的三个 function func 其实具有不同的意义：  

* function func(foo: number, bar: true): string，重载签名一，传入 bar 的值为 true 时，函数返回值为 string 类型。
* function func(foo: number, bar?: false): number，重载签名二，不传入 bar，或传入 bar 的值为 false 时，函数返回值为 number 类型。
* function func(foo: number, bar?: boolean): string | number，函数的实现签名，会包含重载签名的所有可能情况。

基于重载签名就实现了将入参类型和返回值类型的可能情况进行关联，获得了更精确的类型标注能力。   

这里有一个需要注意的地方，拥有多个重载声明的函数在被调用时，是按照重载的声明顺序往下查找的。   

因此在第一个重载声明中，为了与逻辑中保持一致，即在 bar 为 true 时返回 string 类型，这里需要将第一个重载声明的 bar 声明为必选的字面量类型。   

你可以试着为第一个重载声明的 bar 参数也加上可选符号，然后就会发现第一个函数调用错误地匹配到了第一个重载声明。   

#### 异步函数、Generator 函数等类型签名

对于异步函数、Generator 函数、异步 Generator 函数的类型签名，其参数签名基本一致，而返回值类型则稍微有些区别：   

```ts
async function asyncFunc(): Promise<void> {}

function* genFunc(): Iterable<void> {}

async function* asyncGenFunc(): AsyncIterable<void> {}
```

对于异步函数（即标记为 async 的函数），其返回值必定为一个 Promise 类型，而 Promise 内部包含的类型则通过泛型的形式书写，即 Promise<T>。   

### Class

#### 类与类成员的类型签名  

类的主要结构有构造函数、属性、方法和访问符（Accessor）。   

属性的类型标注类似于变量，而构造函数、方法、存取器的类型编标注类似于函数：  

```ts
class Foo {
  prop: string;

  constructor(inputProps: string) {
    this.prop = inputProps;
  }

  print (addon: string): string {
    return `${this.prop} and ${addon}`;
  }

  get PropA(): string {
    return `${this.prop}+A`;
  }

  set PropA(value: string) {
    this.prop = `${value}`;
  }
}
```

setter 方法不允许进行返回值的类型标注，可以理解为 setter 的返回值并不会被消费，它是一个只关注过程的函数。类的方法同样可以进行函数那样的重载。  

类也可以通过类声明和类表达式的方式创建。上面的写法即是类声明，而使用类表达式的语法则是这样的：  

```ts
const Foo = class {
  prop: string;

  constructor(inputProps: string) {
    this.prop = inputProps;
  }

  print (addon: string): string {
    return `${this.prop} and ${addon}`;
  }

  get PropA(): string {
    return `${this.prop}+A`;
  }

  set PropA(value: string) {
    this.prop = `${value}`;
  }
}
```

##### 修饰符

在 TypeScript 中能够为 Class 成员添加这些修饰符：public / private / protected / readonly。   

除 readonly 以外，其他三位都属于访问性修饰符，而 readonly 属于操作性修饰符（就和 interface 中的 readonly 意义一致）。   

这些修饰符应用的位置在成员命名前：  

```ts
class Foo {
  private prop: string;

  constructor(inputProps: string) {
    this.prop = inputProps;
  }

  protected print (addon: string): string {
    return `${this.prop} and ${addon}`;
  }

  public get PropA(): string {
    return `${this.prop}+A`;
  }

  public set PropA(value: string) {
    this.prop = `${value}`;
  }
}
```

通常不会为构造函数添加修饰符，而是让它保持默认的 public。  

* public：此类成员在类、类的实例、子类中都能被访问。  
* private：此类成员仅能在类的内部被访问。  
* protected：此类成员仅能在类与子类中被访问。  

当你不显式使用访问性修饰符，成员的访问性默认会被标记为 public。简单起见，可以在构造函数中对参数应用访问性修饰符：   

```ts
class Foo {
  constructor(public arg1: string, private arg2: boolean) {
  }
}

new Foo('wangxiaobai', false);
```

此时，参数会被直接作为类的成员（即实例的属性），免去后续的手动赋值。   

##### 静态成员

在 TypeScript 中，可以使用 static 关键字来标识一个成员为静态成员：   

```ts
class Foo {
  static staticHandler () {}
  public instanceHandler () {}
}
```

不同于实例成员，在类的内部静态成员无法通过 this 来访问，需要通过 Foo.staticHandler 这种形式进行访问。   

可以查看编译到 ES5 及以下 target 的 JavaScript 代码（ES6 以上就原生支持静态成员了），来进一步了解它们的区别：   

```javascript
var Foo = /** @class */ (function () {
	function Foo() {
	}
	Foo.staticHandler = function () { };
	Foo.prototype.instanceHandler = function () { };
		return Foo;
	}());
```

从中可以看到，静态成员直接被挂载在函数体上，而实例成员挂载在原型上，这就是二者的最重要差异：静态成员不会被实例继承，它始终只属于当前定义的这个类（以及其子类）。而原型对象上的实例成员则会沿着原型链进行传递，也就是能够被继承。  

而对于静态成员和实例成员的使用时机，其实并不需要非常刻意地划分。比如用类 + 静态成员来收敛变量与 utils 方法：   

```ts
class Utils {
  static identifier = 'wangxiaobai'

  static studyWithU () {

  }

  static makeUHappy () {
    Utils.studyWithU()
  }
}

Utils.makeUHappy()
```

#### 继承、实现、抽象类

说到 Class，那一定离不开继承。TypeScript 中也使用 extends 关键字来实现继承：  

```ts
class Base {}

class Derived extends Base {}
```

对于这里的两个类，比较严谨的称呼是基类（Base）与派生类（Derived）。当然，如果叫父类与子类也没问题。关于基类与派生类，需要了解的主要是派生类对基类成员的访问与覆盖操作。  

基类中的哪些成员能够被派生类访问，完全是由其访问性修饰符决定的。派生类中可以访问到使用 public 或 protected 修饰符的基类成员。   

除了访问以外，基类中的方法也可以在派生类中被覆盖，但仍然可以通过 super 访问到基类中的方法：   

```ts
class Base {
  print () {}
}

class Derived extends Base {
  print() {
    super.print();
    // ...
  }
}
```

在派生类中覆盖基类方法时，并不能确保派生类的这一方法能覆盖基类方法，万一基类中不存在这个方法呢？  

所以，TypeScript 4.3 新增了 override 关键字，来确保派生类尝试覆盖的方法一定在基类中存在定义：  

```ts
class Base {
  printWithLove() {}
}

class Derived extends Base {
  override print() {
    super.print();
  }
}
```

在这里 TypeScript 将会给出错误，因为尝试覆盖的方法并未在基类中声明。通过这一关键字就能确保首先这个方法在基类中存在，同时标识这个方法在派生类中被覆盖了。   

除了基类与派生类以外，还有一个比较重要的概念：抽象类。   

抽象类是对类结构与方法的抽象，简单来说，一个抽象类描述了一个类中应当有哪些成员（属性、方法等），一个抽象方法描述了这一方法在实际实现中的结构，抽象方法其实描述的就是这个方法的入参类型与返回值类型。  

抽象类使用 abstract 关键字声明：  

```ts
abstract class AbsFoo {
  abstract absProp: string;
  abstract get absGetter (): string;
  abstract absMethod (name: string): string;
}
```

注意，抽象类中的成员也需要使用 abstract 关键字才能被视为抽象类成员，如这里的抽象方法。   

实现（implements）一个抽象类：   

```ts
class Foo implements AbsFoo {
  absProp: string = 'wangxiaobai';

  get absGetter(): string {
    return 'wangxiaobai';
  }

  absMethod(name: string): string {
    return name;
  }
}
```

此时，必须完全实现这个抽象类的每一个抽象成员。需要注意的是，在 TypeScript 中无法声明静态的抽象成员。   

对于抽象类，它的本质就是描述类的结构。interface 不仅可以声明函数结构，也可以声明类的结构：  

```ts
interface IFooStruct {
  absProp: string;
  get absGetter (): string;
  absMethod (name: string): string;
}

class Foo implements IFooStruct {
  absProp: string = 'wangxiaobai';

  get absGetter(): string {
    return 'wangxiaobai';
  }

  absMethod(name: string): string {
    return name;
  }
}
```

在这里让类去实现了一个接口。这里接口的作用和抽象类一样，都是描述这个类的结构。除此以外，还可以使用 Newable Interface 来描述一个类的结构（类似于描述函数结构的 Callable Interface）：   

```ts
class Foo { }

interface FooStruct {
	new(): Foo
}

declare const NewableFoo: FooStruct;

const foo = new NewableFoo();
```

### 内置类型

#### any 

TypeScript 中提供了一个内置类型 any，表示任意类型。    

```
log(message?: any, ...optionalParams: any[]): void
```

一个被标记为 any 类型的参数可以接受任意类型的值。除了 message 是 any 以外，optionalParams 作为一个 rest 参数，也使用 any[] 进行了标记，这就意味着你可以使用任意类型的任意数量类型来调用这个方法。    

除了显式的标记一个变量或参数为 any，在某些情况下你的变量 / 参数也会被隐式地推导为 any。比如使用 let 声明一个变量但不提供初始值，以及不为函数参数提供类型标注：   

````ts
// any
let foo;

// foo、bar 均为 any
function func(foo, bar){}
````

以上的函数声明在 tsconfig 中启用了 noImplicitAny 时会报错，你可以显式为这两个参数指定 any 类型，或者暂时关闭这一配置（不推荐）。   

any 类型的变量几乎无所不能，它可以在声明后再次接受任意类型的值，同时可以被赋值给任意其它类型的变量：   

```ts
// 被标记为 any 类型的变量可以拥有任意类型的值
let anyVar: any = 'wangxiaobai';

anyVar = false;
anyVar = 'wangxiaobai';
anyVar = {
site: 'github.io'
};

anyVar = () => { }

// 标记为具体类型的变量也可以接受任何 any 类型的值
const val1: string = anyVar;
const val2: number = anyVar;
const val3: () => {} = anyVar;
const val4: {} = anyVar;
```

可以在 any 类型变量上任意地进行操作，包括赋值、访问、方法调用等等，此时可以认为类型推导与检查是被完全禁用的：   

```ts
let anyVar: any = null;

anyVar.foo.bar.baz();
anyVar[0][1][2].prop1;
```

any 类型的主要意义，是为了表示一个无拘无束的“任意类型”，它能兼容所有类型，也能够被所有类型兼容。    

无论什么时候，你都可以使用 any 类型跳过类型检查。当然，运行时出了问题就需要你自己负责了。   

any 的本质是类型系统中的顶级类型，即 Top Type。  

any 类型的万能性也导致经常滥用它，此时的 TypeScript 就变成了令人诟病的 AnyScript。为了避免这一情况，记住以下使用小 tips：   

* 如果是类型不兼容报错导致你使用 any，考虑用类型断言替代。  
* 如果是类型太复杂导致不想全部声明而使用 any，考虑将这一处的类型去断言为你需要的最简类型。  
* 如果你是想表达一个未知类型，更合理的方式是使用 unknown。   

#### unknown 类型和

unknown 类型代表未知类型，这个类型的变量可以再次赋值为任意其它类型，但只能赋值给 any 与 unknown 类型的变量：   

```ts
let unknownVar: unknown = 'wangxiaobai';

unknownVar = false;
unknownVar = 'wangxiaobai';
unknownVar = {
site: 'github.io'
};

unknownVar = () => { }

const val1: string = unknownVar; // Error
const val2: number = unknownVar; // Error
const val3: () => {} = unknownVar; // Error
const val4: {} = unknownVar; // Error

const val5: any = unknownVar;
const val6: unknown = unknownVar;
```

unknown 和 any 的一个主要差异在赋值给别的变量时，any 就像是 “我身化万千无处不在”，所有类型都把它当自己人。     

而 unknown 就像是 “我虽然身化万千，但我坚信我在未来的某一刻会得到一个确定的类型”，只有 any 和 unknown 自己把它当自己人。      

简单地说，any 放弃了所有的类型检查，而 unknown 并没有。这一点也体现在对 unknown 类型的变量进行属性访问时：     

```ts
let unknownVar: unknown;

unknownVar.foo(); // 报错：对象类型为 unknown
```

要对 unknown 类型进行属性访问，需要进行类型断言，即“虽然这是一个未知的类型，但我跟你保证它在这里就是这个类型！”：     

```ts
let unknownVar: unknown;

(unknownVar as { foo: () => {} }).foo();
```

在类型未知的情况下，推荐使用 unknown 标注。这相当于你使用额外的心智负担保证了类型在各处的结构，后续重构为具体类型时也可以获得最初始的类型信息，同时还保证了类型检查的存在。    

#### never 类型

```ts
type UnionWithNever = 'wangxiaobai' | 18 | true | void | never;  
```

将鼠标悬浮在类型别名之上，你会发现这里显示的类型是 "wangxiaobai" | 18 | true | void。   

never 类型被直接无视掉了，而 void 仍然存在。这是因为，void 作为类型表示一个空类型，就像没有返回值的函数使用 void 来作为返回值类型标注一样，void 类型就像 JS 中的 null 一样代表“这里有类型，但是个空类型”。   

而 never 才是一个 “什么都没有” 的类型，它甚至不包括空的类型，严格来说，never 类型不携带任何的类型信息，因此会在联合类型中被直接移除。   

void 和 never 的类型兼容性：   

```ts
declare let v1: never;
declare let v2: void;

v1 = v2; // X 类型 void 不能赋值给类型 never

v2 = v1;
```

在编程语言的类型系统中，never 类型被称为 Bottom Type，是整个类型系统层级中最底层的类型。   

和 null、undefined 一样，它是所有类型的子类型，但只有 never 类型的变量能够赋值给另一个 never 类型变量。   

它主要被类型检查所使用。但在某些情况下使用 never 确实是符合逻辑的，比如一个只负责抛出错误的函数：   

```ts
function justThrow(): never {
	throw new Error()
}
```

在类型流的分析中，一旦一个返回值类型为 never 的函数被调用，那么下方的代码都会被视为无效的代码（即无法执行到）：   

```ts
function justThrow(): never {
	throw new Error()
}

function foo (input:number){
	if(input > 1){
		justThrow();
		// 等同于 return 语句后的代码，即 Dead Code
		const name = 'wangxiaobai';
	}
}
```

#### 类型断言

类型断言能够显式告知类型检查程序当前这个变量的类型，可以进行类型分析地修正、类型。   

它其实就是一个将变量的已有类型更改为新指定类型的操作，它的基本语法是 as NewType，你可以将 any / unknown 类型断言到一个具体的类型：   

```ts
let unknownVar: unknown;

(unknownVar as { foo: () => {} }).foo();
```

还可以 as 到 any 来为所欲为，跳过所有的类型检查：   

```ts
const str: string = 'wangxiaobai';

(str as any).func().foo().prop;
```

也可以在联合类型中断言一个具体的分支：   

```ts
function foo(union: string | number) {
	if ((union as string).includes('wangxiaobai')) { }
	if ((union as number).toFixed() === '18') { }
}
```

类型断言的正确使用方式是，在 TypeScript 类型分析不正确或不符合预期时，将其断言为此处的正确类型：   

```ts
interface IFoo {
	name: string;
}

declare const obj: {
	foo: IFoo
}

const {
	foo = {} as IFoo
} = obj
```

这里从 {} 字面量类型断言为了 IFoo 类型，即为解构赋值默认值进行了预期的类型断言。当然，更严谨的方式应该是定义为 Partial<IFoo> 类型，即 IFoo 的属性均为可选的。     

除了使用 as 语法以外，也可以使用 <> 语法。它虽然书写更简洁，但效果一致。可以通过 TypeScript ESLint 提供的 consistent-type-assertions 规则来约束断言风格。  

类型断言应当是在迫不得己的情况下使用的。虽然说可以用类型断言纠正不正确的类型分析，但类型分析在大部分场景下还是可以智能地满足需求的。   

总的来说，在实际场景中，还是 as any 这一种操作更多。但这也是让你的代码编程 AnyScript 的罪魁祸首之一，请务必小心使用。   

#### 双重断言

如果在使用类型断言时，原类型与断言类型之间差异过大，TypeScript 会给你一个类型报错：   

```ts
const str: string = 'wangxiaobai';

// 从 X 类型 到 Y 类型的断言可能是错误的，blabla
(str as { handler: () => {} }).handler()
```

此时它会提醒你先断言到 unknown 类型，再断言到预期类型：    

```ts
const str: string = 'wangxiaobai';

(str as unknown as { handler: () => {} }).handler();

// 使用尖括号断言
(<{ handler: () => {} }>(<unknown>str)).handler();
```

这是因为你的断言类型和原类型的差异太大，需要先断言到一个通用的类，即 any / unknown。这一通用类型包含了所有可能的类型，因此断言到它和从它断言到另一个类型差异不大。   

#### 非空断言

非空断言其实是类型断言的简化，它使用 ! 语法，即 obj!.func()!.prop 的形式标记前面的一个声明一定是非空的（实际上就是剔除了 null 和 undefined 类型）。     

```ts
declare const foo: {
	func?: () => ({
		prop?: number | null;
	})
};

foo.func().prop.toFixed();
```

此时，func 在 foo 中不一定存在，prop 在 func 调用结果中不一定存在，且可能为 null，会收获两个类型报错。如果坚持调用，想要解决掉类型报错就可以使用非空断言：    

```ts
foo.func!().prop!.toFixed();
```

其应用位置类似于可选链：   

```ts
foo.func?.().prop?.toFixed();
```

不同的是，非空断言的运行时仍然会保持调用链，因此在运行时可能会报错。而可选链则会在某一个部分收到 undefined 或 null 时直接短路掉，不会再发生后面的调用。   

非空断言的常见场景还有 document.querySelector、Array.find 方法等：   

```ts
const element = document.querySelector('#id')!;
const target = [1, 2, 3, 18].find(item => item === 18)!;
```

上面的非空断言实际上等价于以下的类型断言操作：   

```ts
((foo.func as () => ({
prop?: number;
}))().prop as number).toFixed();
```

非空断言是不是简单多了？可以通过 non-nullable-type-assertion-style 规则来检查代码中是否存在类型断言能够被简写为非空断言的情况。    

类型断言还有一种用法是作为代码提示的辅助工具，比如对于以下这个稍微复杂的接口：    

```ts
interface IStruct {
	foo: string;
	bar: {
		barPropA: string;
		barPropB: number;
		barMethod: () => void;
		baz: {
			handler: () => Promise<void>;
		};
	};
}
```

假设你想要基于这个结构随便实现一个对象，你可能会使用类型标注：   

```ts
const obj: IStruct = {};
```

这个时候等待你的是一堆类型报错，你必须规规矩矩地实现整个接口结构才可以。但如果使用类型断言，就可以在保留类型提示的前提下，不那么完整地实现这个结构：   

```ts
// 这个例子是不会报错的
const obj = <IStruct>{
	bar: {
		baz: {},
	},
};
```

类型提示仍然存在：

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/ts/img_02.png" alt="" width="700" />  

在你错误地实现结构时仍然可以给到你报错信息：

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/ts/img_03.png" alt="" width="700" />  

## 类型工具

类型工具就是对类型进行处理的工具，分为类型创建与类型安全保护两类。  

### 类型创建  

基于已有的类型创建新的类型，这些类型工具包括类型别名、交叉类型、索引类型与映射类型。   

#### 类型别名

对一组类型或一个特定类型结构进行封装，以便于在其它地方进行复用。   

使用 type 关键字进行声明：  

```ts
type A = string;
```

抽离一组联合类型：  

```ts
type StatusCode = 200 | 301 | 400 | 500 | 502;
type PossibleDataTypes = string | number | (() => unknown);

const status: StatusCode = 502;
```

抽离一个函数类型：  

```ts
type Handler = (e: Event) => void;

const clickHandler: Handler = (e) => { };
const moveHandler: Handler = (e) => { };
const dragHandler: Handler = (e) => { };
```

声明一个对象类型，就像接口那样：   

```ts
type ObjType = {
	name: string;
	age: number;
}
```

在类型别名中，类型别名还可以声明自己能够接受泛型。一旦接受了泛型，它就叫工具类型：  

```ts
type Factory<T> = T | number | string;
```

它的基本功能仍然是创建类型，基于传入的泛型进行各种类型操作，得到一个新的类型。    

```ts
const foo: Factory<boolean> = true;
```

一般不会直接使用工具类型来做类型标注，而是再度声明一个新的类型别名：  

```ts
type FactoryWithBool = Factory<boolean>;

const foo: FactoryWithBool = true;
```

泛型参数的名称（上面的 T ）也不是固定的。通常使用大写的 T / K / U / V / M / O ...这种形式。  

声明一个简单、有实际意义的工具类型：  

```ts
type MaybeNull<T> = T | null;
```

这个工具类型会接受一个类型，并返回一个包括 null 的联合类型。这样一来，在实际使用时就可以确保你处理了可能为空值的属性读取与方法调用：   

```ts
type MaybeNull<T> = T | null;

function process(input: MaybeNull<{ handler: () => {} }>) {
  input?.handler();
}
```

类似的还有 MaybePromise、MaybeArray。  

```ts
type MaybeArray<T> = T | T[];

function ensureArray<T>(input: MaybeArray<T>): T[] {
  return Array.isArray(input) ? input : [input];
}
```

另外，类型别名中可以接受任意个泛型，以及为泛型指定约束、默认值等。    

#### 交叉类型 

它和联合类型的使用位置一样，只不过符号是 &，即按位与运算符。   

你需要符合这里的所有类型，才可以说实现了这个交叉类型，即 A & B，需要同时满足 A 与 B 两个类型才行。   

声明一个交叉类型：   

```ts
interface NameStruct {
  name: string;
}

interface AgeStruct {
  age: number;
}

type ProfileStruct = NameStruct & AgeStruct;

const profile: ProfileStruct = {
  name: 'wangxiaobai',
  age: 18
}
```

ProfileStruct 是一个同时包含 NameStruct 和 AgeStruct 两个接口所有属性的类型。  

```ts
type StrAndNum = string & number; // never
```

原始类型的合并变成了 never。实际上，这也是 never 这一 BottomType 的实际意义之一，描述根本不存在的类型。   

对于对象类型的交叉类型，其内部的同名属性类型同样会按照交叉类型进行合并：   

```ts
type Struct1 = {
  primitiveProp: string;
  objectProp: {
    name: string;
  }
}

type Struct2 = {
  primitiveProp: number;
  objectProp: {
    age: number;
  }
}

type Composed = Struct1 & Struct2;

type PrimitivePropType = Composed['primitiveProp']; // never
type ObjectPropType = Composed['objectProp']; // { name: string; age: number; }
```

两个联合类型组成的交叉类型，各实现两边联合类型中的一个就行了，也就是两边联合类型的交集：   

```ts
type UnionIntersection1 = (1 | 2 | 3) & (1 | 2); // 1 | 2
type UnionIntersection2 = (string | number | symbol) & string; // string
```

#### 索引类型

索引类型包含三个部分：索引签名类型、索引类型查询与索引类型访问。  

##### 索引类型签名

指的是在接口或类型别名中，通过以下语法来快速声明一个键值类型一致的类型结构：   

```ts
interface AllStringTypes {
  [key: string]: string;
}

type AllStringTypes = {
  [key: string]: string;
}
```

即使你还没声明具体的属性，对于这些类型结构的属性访问也将全部被视为 string 类型：   

```ts
interface AllStringTypes {
  [key: string]: string;
}

type PropType1 = AllStringTypes['wangxiaobai']; // string
type PropType2 = AllStringTypes['18']; // string
```

这也意味着在实现这个类型结构的变量中只能声明字符串类型的键：   

```ts
interface AllStringTypes {
  [key: string]: string;
}

const foo: AllStringTypes = {
  wangxiaobai: '18'
}
```

索引签名类型也可以和具体的键值对类型声明并存，但这时这些具体的键值类型也需要符合索引签名类型的声明：   

```ts
interface AllStringTypes {
	// 类型“number”的属性“propA”不能赋给“string”索引类型“boolean”。
	propA: number;
	[key: string]: boolean;
}
```

这里的符合即指子类型，因此自然也包括联合类型：    

```ts
interface StringOrBooleanTypes {
	propA: number;
	propB: boolean;
	[key: string]: number | boolean;
}
```

索引签名类型的一个常见场景是在重构 JavaScript 代码时，为内部属性较多的对象声明一个 any 的索引签名类型，以此来暂时支持对类型未明确属性的访问，并在后续一点点补全类型：   

```ts
interface AnyTypeHere {
	[key: string]: any;
}

const foo: AnyTypeHere['wangxiaobai'] = 'any value';
```

##### 索引类型查询  

索引类型查询，也就是 keyof 操作符。它可以将对象中的所有键转换为对应字面量类型，然后再组合成联合类型。   

```ts
interface Foo {
  wangxiaobai: 1,
  18: 2
}

type FooKeys = keyof Foo; // "wangxiaobai" | '18'
```

##### 索引类型访问

在 Typescript 中可以通过类似 obj[expression] 的方式来动态访问一个对象属性，只不过这里的 expression 要换成类型。   

```ts
interface NumberRecord {
  [key: string]: number;
}

type PropType = NumberRecord[string]; // number
```

更直观的例子是通过字面量类型来进行索引类型访问：   

```ts
interface Foo {
  propA: number;
  propB: boolean;
}

type PropAType = Foo['propA']; // number
type PropBType = Foo['propB']; // boolean
```

这里的 'propA' 和 'propB' 都是字符串字面量类型，而不是一个 JavaScript 字符串值。索引类型查询的本质其实就是，通过键的字面量类型（'propA'）访问这个键对应的键值类型（number）。     

```ts
interface Foo {
  propA: number;
  propB: boolean;
  propC: string;
}

type PropTypeUnion = Foo[keyof Foo]; // string | number | boolean
```

使用字面量联合类型进行索引类型访问时，其结果就是将联合类型每个分支对应的类型进行访问后的结果，重新组装成联合类型。   

#### 映射类型

映射类型的主要作用即是基于键名映射到键值类型。   

```ts
type Stringify<T> = {
  [K in keyof T]: string;
};
```

这个工具类型会接受一个对象类型，使用 keyof 获得这个对象类型的键名组成字面量联合类型，然后通过映射类型（即这里的 in 关键字）将这个联合类型的每一个成员映射出来，并将其键值类型设置为 string。   

```ts
interface Foo {
  prop1: string;
  prop2: number;
  prop3: boolean;
  prop4: () => void;
}

type StringifiedFoo = Stringify<Foo>;

// 等价于
interface StringifiedFoo {
  prop1: string;
  prop2: string;
  prop3: string;
  prop4: string;
}
```

键值类型也能拿到：  

```ts
type Clone<T> = {
  [K in keyof T]: T[K];
};
```

这里的 T[K] 其实就是上面说到的索引类型访问，使用键的字面量类型访问到了键值的类型，这里就相当于克隆了一个接口。   

这里只有 K in 属于映射类型的语法，keyof T 属于 keyof 操作符，[K in keyof T] 的 [] 属于索引签名类型，T[K] 属于索引类型访问。  

### 类型安全  

#### 类型查询操作符：typeof 

TypeScript 新增了用于类型查询的 typeof ，即 Type Query Operator，这个 typeof 返回的是一个类型：   

```ts
const str = 'wangxiaobai';

const obj = { name: 'wangxiaobai' };

const nullVar = null;
const undefinedVar = undefined;

const func = (input: string) => {
  return input.length > 10;
}

type Str = typeof str; // "wangxiaobai"
type Obj = typeof obj; // { name: string; }
type Null = typeof nullVar; // null
type Undefined = typeof undefined; // undefined
type Func = typeof func; // (input: string) => boolean
```

可以直接在类型标注中使用 typeof，也可以在工具类型中使用 typeof。   

```ts
const func = (input: string) => {
  return input.length > 10;
}

const func2: typeof func = (name: string) => {
  return name === 'wangxiaobai'
}
```

大部分情况下，typeof 返回的类型就是当你把鼠标悬浮在变量名上时出现的推导后的类型，并且是最窄的推导程度（即到字面量类型的级别）。   

为了更好地避免这种情况，也就是隔离类型层和逻辑层，类型查询操作符后是不允许使用表达式的：    

```ts
const isInputValid = (input: string) => {
  return input.length > 10;
}

// 不允许表达式
let isValid: typeof isInputValid('wangxiaobai');

```

#### 类型守卫

TypeScript 提供了非常强大的类型推导能力，它会随着你的代码逻辑不断尝试收窄类型，这一能力称之为类型的控制流分析（也可以简单理解为类型推导）。    

```ts
function foo (input: string | number) {
  if(typeof input === 'string') {}
  if(typeof input === 'number') {}
  // ...
}
```

在类型控制流分析下，每流过一个 if 分支，后续联合类型的分支就少了一个，因为这个类型已经在这个分支处理过了，不会进入下一个分支：    

```ts
declare const strOrNumOrBool: string | number | boolean;

if (typeof strOrNumOrBool === 'string') {
  // 一定是字符串！
  strOrNumOrBool.charAt(1);
} else if (typeof strOrNumOrBool === 'number') {
  // 一定是数字！
  strOrNumOrBool.toFixed();
} else if (typeof strOrNumOrBool === 'boolean') {
  // 一定是布尔值！
  strOrNumOrBool === true;
} else {
  // 要是走到这里就说明有问题！
  const _exhaustiveCheck: never = strOrNumOrBool;
  throw new Error(`Unknown input type: ${_exhaustiveCheck}`);
}
```

这里实际上通过 if 条件中的表达式进行了类型保护，即告知了流过这里的分析程序每个 if 语句代码块中变量会是何类型。   

这是编程语言类型能力中最重要的一部分：与实际逻辑紧密关联的类型，再反过来让类型为逻辑保驾护航。  

如果 if 条件中的表达式被提取出来了会发生什么情况？    

```ts
function isString(input: unknown): boolean {
  return typeof input === 'string';
}

function foo(input: string | number) {
  if (isString(input)) {
    // 类型“string | number”上不存在属性“replace”。
    (input).replace('wangxiaobai', 'wangxiaobai18')
  }
  if (typeof input === 'number') { }
  // ...
}
```

奇怪的事情发生了，只是把逻辑提取到了外面而已，如果 isString 返回了 true，那 input 肯定也是 string 类型啊？    

想象类型控制流分析，刚流进 if (isString(input)) 就戛然而止了。因为 isString 这个函数在另外一个地方，内部的判断逻辑并不在函数 foo 中。这里的类型控制流分析做不到跨函数上下文来进行类型的信息收集。     

##### 基于 is 的类型保护

将判断逻辑封装起来提取到函数外部进行复用很常见。为了解决这一类型控制流分析的能力不足， TypeScript 引入了 is 关键字来显式地提供类型信息：    

```ts
function isString(input: unknown): input is string {
  return typeof input === 'string';
}

function foo(input: string | number) {
  if (isString(input)) {
    // 正确了
    (input).replace('wangxiaobai', 'wangxiaobai18')
  }
  if (typeof input === 'number') { }
  // ...
}
```

isString 函数称为类型守卫，在它的返回值中不再使用 boolean 作为类型标注，而是使用 input is string 这么个奇怪的搭配：   

* input: 函数的某个参数。   
* is string: 即 is 关键字 + 预期类型，即如果这个函数成功返回为 true，那么 is 关键字前这个入参的类型，就会被这个类型守卫调用方后续的类型控制流分析收集到。   

但类型守卫函数中并不会对判断逻辑和实际类型的关联进行检查：   

```ts
function isString(input: unknown): input is number {
  return typeof input === 'string';
}

function foo(input: string | number) {
  if (isString(input)) {
    // 报错，在这里变成了 number 类型
    (input).replace('wangxiaobai', 'wangxiaobai18')
  }
  if (typeof input === 'number') { }
  // ...
}
```

类型守卫有些类似类型断言，但类型守卫更宽容，也更信任你一些。你指定什么类型，它就是什么类型。   

除了使用简单的原始类型以外，还可以在类型守卫中使用对象类型、联合类型等：        

```ts
export type Falsy = false | '' | 0 | null | undefined;

export const isFalsy = (val: unknown): val is Falsy => !val;

// 不包括不常用的 symbol 和 bigint
export type Primitive = string | number | boolean | undefined;

export const isPrimitive = (val: unknown): val is Primitive => ['string', 'number', 'boolean' , 'undefined'].includes(typeof val);
```

##### 基于 in 与 instanceof 的类型保护

Typescript 中的 in 操作符，可以通过 key in object 的方式来判断 key 是否存在于 object 或其原型链上（返回 true 说明存在）。    

```ts
interface Foo {
  foo: string;
  fooOnly: boolean;
  shared: number;
}

interface Bar {
  bar: string;
  barOnly: boolean;
  shared: number;
}

function handle(input: Foo | Bar) {
  if ('foo' in input) {
    input.fooOnly;
  } else {
    input.barOnly;
  }
}
```

这里的 foo / bar、fooOnly / barOnly、shared 属性们其实有着不同的意义。   

使用 foo 和 bar 来区分 input 联合类型，然后就可以在对应的分支代码块中正确访问到 Foo 和 Bar 独有的类型 fooOnly / barOnly。   

但是，如果用 shared 来区分，就会发现在分支代码块中 input 仍然是初始的联合类型：   

```ts
function handle(input: Foo | Bar) {
  if ('shared' in input) {
    // 类型“Foo | Bar”上不存在属性“fooOnly”。类型“Bar”上不存在属性“fooOnly”。
    input.fooOnly;
  } else {
    // 类型“never”上不存在属性“barOnly”。
    input.barOnly;
  }
}
```

Foo 与 Bar 都满足 'shared' in input 这个条件。因此在 if 分支中， Foo 与 Bar 都会被保留，那在 else 分支中就只剩下 never 类型。    

可辨识属性可以是结构层面的，比如结构 A 的属性 prop 是数组，而结构 B 的属性 prop 是对象，或者结构 A 中存在属性 prop 而结构 B 中不存在。    

它甚至可以是共同属性的字面量类型差异：

```ts
function ensureArray(input: number | number[]): number[] {
  if (Array.isArray(input)) {
    return input;
  } else {
    return [input];
  }
}

interface Foo {
  kind: 'foo';
  diffType: string;
  fooOnly: boolean;
  shared: number;
}

interface Bar {
  kind: 'bar';
  diffType: number;
  barOnly: boolean;
  shared: number;
}

function handle1(input: Foo | Bar) {
  if (input.kind === 'foo') {
    input.fooOnly;
  } else {
    input.barOnly;
  }
}
```

对于同名但不同类型的属性，需要使用字面量类型的区分，并不能使用简单的 typeof：    

```ts
function handle2(input: Foo | Bar) {
  // 报错，并没有起到区分的作用，在两个代码块中都是 Foo | Bar
  if (typeof input.diffType === 'string') {
    input.fooOnly;
  } else {
    input.barOnly;
  }
}
```

Typescript 中的 instanceof，判断的是原型级别的关系，如 foo instanceof Base 会沿着 foo 的原型链查找 Base.prototype 是否存在其上。   

```ts
class FooBase {}

class BarBase {}

class Foo extends FooBase {
  fooOnly() {}
}
class Bar extends BarBase {
  barOnly() {}
}

function handle(input: Foo | Bar) {
  if (input instanceof FooBase) {
    input.fooOnly();
  } else {
    input.barOnly();
  }
}
```

#### 类型断言守卫

断言守卫和类型守卫最大的不同点在于，在判断条件不通过时，断言守卫需要抛出一个错误，类型守卫只需要剔除掉预期的类型。    

这里的抛出错误可能让你想到了 never 类型，但实际情况要更复杂一些，断言守卫并不会始终都抛出错误，所以它的返回值类型并不能简单地使用 never 类型。    

为此，TypeScript 3.7 版本引入了 asserts 关键字来进行断言场景下的类型守卫：   

```ts
let name: any = 'wangxiaobai';

function assertIsNumber(val: any): asserts val is number {
  if (typeof val !== 'number') {
    throw new Error('Not a number!');
  }
}

assertIsNumber(name);

// number 类型！
name.toFixed();
```

这种情况下无需再为断言守卫传入一个表达式，而是可以将这个判断用的表达式放进断言守卫的内部，来获得更独立地代码逻辑。   

## 泛型  

TypeScript 是一门对类型进行编程的语言，泛型就是这门语言里的（函数）参数。  

### 类型别名中的泛型  

类型别名如果声明了泛型坑位，它就等价于一个接受参数的函数：  

```ts
type Factory<T> = T | number | string;
```

这个类型别名的本质就是一个函数，T 就是它的变量，返回值则是一个包含 T 的联合类型。   

类型别名中的泛型大多是用来进行工具类型封装。   

```ts
type Stringify<T> = {
  [K in keyof T]: string;
};

type Clone<T> = {
  [K in keyof T]: T[K];
};
```

Stringify 会将一个对象类型的所有属性类型置为 string ，而 Clone 则会进行类型的完全复制。   

```ts
type Partial<T> = {
    [P in keyof T]?: T[P];
};
```

工具类型 Partial 会将传入的对象类型复制一份，但会额外添加一个?，它会将所有属性转变为可选属性。  

```ts
interface IFoo {
  prop1: string;
  prop2: number;
  prop3: boolean;
  prop4: () => void;
}

type PartialIFoo = Partial<IFoo>;

// 等价于
interface PartialIFoo {
  prop1?: string;
  prop2?: number;
  prop3?: boolean;
  prop4?: () => void;
}
```

类型别名与泛型的结合中，还有一个非常重要的工具：条件类型。   

```ts
type IsEqual<T> = T extends true ? 1 : 2;

type A = IsEqual<true>; // 1
type B = IsEqual<false>; // 2
type C = IsEqual<'linbudu'>; // 2
```

在条件类型参与的情况下，通常泛型会被作为条件类型中的判断条件（T extends Condition，或者 Type extends T）以及返回值（即 : 两端的值），这也是筛选类型需要依赖的能力之一。   

#### 泛型约束与默认值

泛型同样有着默认值的设定。  

```ts
type Factory<T = boolean> = T | number | string;
```

在你调用时可以不带任何参数，默认会使用声明的默认值来填充。   

```ts
const foo: Factory = false;
```

泛型还能做到函数参数做不到的事：泛型约束，可以要求传入这个工具类型的泛型必须符合某些条件，否则就拒绝进行后面的逻辑。     

使用 extends 关键字来约束传入的泛型参数必须符合要求。关于 extends，A extends B 意味着 A 是 B 的子类型，也就是说 A 比 B 的类型更精确，或者说更复杂。   

* 更精确：如字面量类型是对应原始类型的子类型，即 'linbudu' extends string，18 extends number 成立。类似的，联合类型子集均为联合类型的子类型，即 1、 1 | 2 是 1 | 2 | 3 | 4 的子类型。   
* 更复杂，如 { name: string } 是 {} 的子类型，因为在 {} 的基础上增加了额外的类型，基类与派生类（父类与子类）同理。  

```ts
type ResStatus<ResCode extends number> = ResCode extends 10000 | 10001 | 10002
  ? 'success'
  : 'failure';
```

这个例子会根据传入的请求码判断请求是否成功，这意味着它只能处理数字字面量类型的参数，因此这里通过 extends number 来标明其类型约束，如果传入一个不合法的值，就会出现类型错误：  

```ts
type ResStatus<ResCode extends number> = ResCode extends 10000 | 10001 | 10002
  ? 'success'
  : 'failure';


type Res1 = ResStatus<10000>; // "success"
type Res2 = ResStatus<20000>; // "failure"

type Res3 = ResStatus<'10000'>; // 类型“string”不满足约束“number”。
```

如果想让这个类型别名可以无需显式传入泛型参数也能调用，并且默认情况下是成功地，这样就可以为这个泛型参数声明一个默认值：  

```ts
type ResStatus<ResCode extends number = 10000> = ResCode extends 10000 | 10001 | 10002
  ? 'success'
  : 'failure';

type Res4 = ResStatus; // "success"
```

#### 多泛型关联

不仅可以同时传入多个泛型参数，还可以让这几个泛型参数之间也存在联系。   

```ts
type Conditional<Type, Condition, TruthyResult, FalsyResult> =
  Type extends Condition ? TruthyResult : FalsyResult;

//  "passed!"
type Result1 = Conditional<'linbudu', string, 'passed!', 'rejected!'>;

// "rejected!"
type Result2 = Conditional<'linbudu', boolean, 'passed!', 'rejected!'>;
```

多泛型参数其实就像接受更多参数的函数，其内部的运行逻辑（类型操作）会更加抽象，表现在参数（泛型参数）需要进行的逻辑运算（类型操作）会更加复杂。   

多个泛型参数之间的依赖，其实指的即是在后续泛型参数中，使用前面的泛型参数作为约束或默认值：   

```ts
type ProcessInput<
  Input,
  SecondInput extends Input = Input,
  ThirdInput extends Input = SecondInput
> = number;
```

* 这个工具类型接受 1-3 个泛型参数。   
* 第二、三个泛型参数的类型需要是首个泛型参数的子类型。   
* 当只传入一个泛型参数时，其第二个泛型参数会被赋值为此参数，而第三个则会赋值为第二个泛型参数，相当于均使用了这唯一传入的泛型参数。   
* 当传入两个泛型参数时，第三个泛型参数会默认赋值为第二个泛型参数的值。   

### 对象类型中的泛型

```ts
interface IRes<TData = unknown> {
  code: number;
  error?: string;
  data: TData;
}
```

这个接口描述了一个通用的响应类型结构，预留出了实际响应数据的泛型坑位，然后在你的请求函数中就可以传入特定的响应类型了：  

```ts
interface IUserProfileRes {
  name: string;
  homepage: string;
  avatar: string;
}

function fetchUserProfile(): Promise<IRes<IUserProfileRes>> {}

type StatusSucceed = boolean;
function handleOperation(): Promise<IRes<StatusSucceed>> {}
```

泛型嵌套的场景也非常常用，比如对存在分页结构的数据，可以将其分页的响应结构抽离出来：   

```ts
interface IPaginationRes<TItem = unknown> {
  data: TItem[];
  page: number;
  totalCount: number;
  hasNextPage: boolean;
}

function fetchUserProfileList(): Promise<IRes<IPaginationRes<IUserProfileRes>>> {}
```

### 函数中的泛型

假设有这么一个函数，它可以接受多个类型的参数并进行对应处理，比如：   

* 对于字符串，返回部分截取。     
* 对于数字，返回它的 n 倍。    
* 对于对象，修改它的属性并返回。    

这个时候要怎么对函数进行类型声明？是 any 大法好？   

```ts
function handle(input: any): any {}
```

还是用联合类型来包括所有可能类型？   

```ts
function handle(input: string | number | {}): string | number | {} {}
```

第一种肯定要直接 pass，第二种虽然麻烦了一点，但似乎可以满足需要？   

但如果真的调用一下就知道不合适了。   

```ts
const shouldBeString = handle('wangxiaobai');
const shouldBeNumber = handle(18);
const shouldBeObject = handle({ name: 'wangxiaobai' });
```

虽然约束了入参的类型，但返回值的类型并没有像预期的那样和入参关联起来，上面三个调用结果的类型仍然是一个宽泛的联合类型 string | number | {}。    

难道要用重载一个个声明可能的关联关系？   

```ts
function handle(input: string): string
function handle(input: number): number
function handle(input: {}): {}
function handle(input: string | number | {}): string | number | {} { }
```

如果再多一些复杂的情况，别说你愿不愿意补充每一种关联了，同事看到这样的代码都会质疑你的水平。   

这个时候就该请出泛型了：   

```ts
function handle<T>(input: T): T {}
```

为函数声明一个泛型参数 T，并将参数的类型与返回值类型指向这个泛型参数。这样，在这个函数接收到参数时，T 会自动地被填充为这个参数的类型。   

这也就意味着你不再需要预先确定参数的可能类型了，而在返回值与参数类型关联的情况下，也可以通过泛型参数来进行运算。   

在基于参数类型进行填充泛型时，其类型信息会被推断到尽可能精确的程度，如这里会推导到字面量类型而不是基础类型。这是因为在直接传入一个值时，这个值是不会再被修改的，因此可以推导到最精确的程度。而如果你使用一个变量作为参数，那么只会使用这个变量标注的类型（在没有标注时，会使用推导出的类型）。    

```ts
function handle<T>(input: T): T {}

const author = 'wangxiaobai'; // 使用 const 声明，被推导为 'wangxiaobai'

let authorAge = 18; // 使用 let 声明，被推导为 number

handle(author); // 填充为字面量类型 'wangxiaobai'
handle(authorAge); // 填充为基础类型 number
```

你也可以将鼠标悬浮在表达式上，来查看填充的泛型信息。    

再看一个例子：

```ts
function swap<T, U>([start, end]: [T, U]): [U, T] {
	return [end, start];
}

const swapped1 = swap(['wangxiaobai', 18]);
const swapped2 = swap([null, 18]);
const swapped3 = swap([{ name: 'wangxiaobai' }, {}]);
```

在这里返回值类型对泛型参数进行了一些操作，而同样可以看到其调用信息符合预期。    

函数中的泛型同样存在约束与默认值，比如上面的 handle 函数，现在希望做一些代码拆分，不再处理对象类型的情况了：    

```ts
function handle<T extends string | number>(input: T): T {}
```

而 swap 函数，现在只想处理数字元组的情况：   

```ts
function swap<T extends number, U extends number>([start, end]: [T, U]): [U, T] {
	return [end, start];
}
```

而多泛型关联也是如此，比如 lodash 的 pick 函数，这个函数首先接受一个对象，然后接受一个对象属性名组成的数组，并从这个对象中截取选择的属性部分：   

```ts
const object = { 'a': 1, 'b': '2', 'c': 3 };

_.pick(object, ['a', 'c']);
// => { 'a': 1, 'c': 3 }
```

这个函数很明显需要在泛型层面声明关联，即数组中的元素只能来自于对象的属性名（组成的字面量联合类型！），因此可以这么写（部分简化）：   

```ts
pick<T extends object, U extends keyof T>(object: T, ...props: Array<U>): Pick<T, U>;
```

这里 T 声明约束为对象类型，而 U 声明约束为 keyof T。同时对应的其返回值类型中使用了 Pick<T, U> 这一工具类型，它与 pick 函数的作用一致，对一个对象结构进行裁剪。   

函数的泛型参数也会被内部的逻辑消费，如：   

```ts
function handle<T>(payload: T): Promise<[T]> {
	return new Promise<[T]>((res, rej) => {
		res([payload]);
	});
}
```

箭头函数的泛型，其书写方式是这样的：    

```ts
const handle = <T>(input: T): T => {}
```

需要注意的是在 tsx 文件中泛型的尖括号可能会造成报错，编译器无法识别这是一个组件还是一个泛型，此时你可以让它长得更像泛型一些：    

```ts
const handle = <T extends any>(input: T): T => {}
```

函数的泛型是日常使用较多的一部分，更明显地体现了泛型在调用时被填充这一特性，而类型别名中更多是手动传入泛型。这一差异的缘由其实就是它们的场景不同，通常使用类型别名来对已经确定的类型结构进行类型操作，比如将一组确定的类型放置在一起。而在函数这种场景中并不能确定泛型在实际运行时会被什么样的类型填充。    

### Class 中的泛型

Class 中的泛型消费方是属性、方法乃至装饰器等。同时 Class 内的方法还可以再声明自己独有的泛型参数。     

```ts
class Queue<TElementType> {
  private _list: TElementType[];

  constructor(initial: TElementType[]) {
    this._list = initial;
  }

  // 入队一个队列泛型子类型的元素
  enqueue<TType extends TElementType>(ele: TType): TElementType[] {
    this._list.push(ele);
    return this._list;
  }

  // 入队一个任意类型元素（无需为队列泛型子类型）
  enqueueWithUnknownType<TType>(element: TType): (TElementType | TType)[] {
    return [...this._list, element];
  }

  // 出队
  dequeue(): TElementType[] {
    this._list.shift();
    return this._list;
  }
}
```

### 内置方法中的泛型  

TypeScript 中为非常多的内置对象都预留了泛型坑位，如 Promise 中。   

```ts
function p() {
  return new Promise<boolean>((resolve, reject) => {
    resolve(true);
  });
}
```

数组 Array<T> 中，其泛型参数代表数组的元素类型，几乎贯穿所有的数组方法。   

```ts
const arr: Array<number> = [1, 2, 3];

// 类型“string”的参数不能赋给类型“number”的参数。
arr.push('linbudu');
// 类型“string”的参数不能赋给类型“number”的参数。
arr.includes('linbudu');

// number | undefined
arr.find(() => false);

// 第一种 reduce
arr.reduce((prev, curr, idx, arr) => {
  return prev;
}, 1);

// 第二种 reduce
// 报错：不能将 number 类型的值赋值给 never 类型
arr.reduce((prev, curr, idx, arr) => {
  return [...prev, curr]
}, []);
```

reduce 方法是相对特殊的一个，它的类型声明存在几种不同的重载：   

* 当你不传入初始值时，泛型参数会从数组的元素类型中进行填充。   
* 当你传入初始值时，如果初始值的类型与数组元素类型一致，则使用数组的元素类型进行填充。即这里第一个 reduce 调用。   
* 当你传入一个数组类型的初始值，比如这里的第二个 reduce 调用，reduce 的泛型参数会默认从这个初始值推导出的类型进行填充，如这里是 never[]。   

第三种情况也就意味着信息不足，无法推导出正确的类型，此时可以手动传入泛型参数来解决：   

```ts
arr.reduce<number[]>((prev, curr, idx, arr) => {
  return prev;
}, []);
```

React 中同样可以找到无处不在的泛型坑位：   

```ts
const [state, setState] = useState<number[]>([]);
// 不传入默认值，则类型为 number[] | undefined
const [state, setState] = useState<number[]>();

// 体现在 ref.current 上
const ref = useRef<number>();

const context =  createContext<ContextType>({});
```

