# Typescript 使用手册


项目地址： [TSHandbook](https://github.com/OweQian/TSHandbook.git)  

<!--more-->

## 原始类型 

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

### null 和 undefined  

null 与 undefined 都是有具体意义的类型。在没有开启 strictNullChecks 检查的情况下，会被视作其他类型的子类型，比如 string 类型会被认为包含了 null 与 undefined 类型：  

```ts
const temp1: null = null;
const temp2: undefined = undefined;
const temp3: string = null;
const temp4: string = undefined;
```

### void 

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

## 数组类型 

有两种方式来声明一个数组类型：  

```ts
const arr1: string[] = [];
const arr2: Array<string> = [];
```

这两种方式是完全等价的，更多的以前者为主。   

## 元组类型

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

## 对象类型

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

### 修饰接口属性  

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

### object、Object、{} 

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

## 字面量类型与联合类型

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

### 字面量类型

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

### 联合类型

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

### 对象字面量类型

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

## 枚举

```
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
  Bar = "BarValue",
  Baz = "BazValue"
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

### 常量枚举

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

## 函数类型

### 类型签名

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

### void 类型

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

### 可选参数

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

### rest 参数

rest 参数的类型标注也比较简单，由于其实际上是一个数组，这里也应当使用数组类型进行标注：   

对于 any 类型，你可以简单理解为它包含了一切可能的类型。   

```ts
function foo(arg1: string, ...rest: any[]) { }
```

也可以使用元组类型进行标注：   

```ts
function foo(arg1: string, ...rest: [number, boolean]) { }

foo("wangxiaobai", 18, true)
```

### 重载

在某些逻辑较复杂的情况下，函数可能有多组入参类型和返回值类型：   

```ts
function func(foo: number, bar?: boolean): string | number {
	if (bar) {
		return String(foo);
	} else {
		return foo * 599;
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
		return foo * 599;
	}
}

const res1 = func(599); // number
const res2 = func(599, true); // string
const res3 = func(599, false); // number
```

这里的三个 function func 其实具有不同的意义：  

* function func(foo: number, bar: true): string，重载签名一，传入 bar 的值为 true 时，函数返回值为 string 类型。
* function func(foo: number, bar?: false): number，重载签名二，不传入 bar，或传入 bar 的值为 false 时，函数返回值为 number 类型。
* function func(foo: number, bar?: boolean): string | number，函数的实现签名，会包含重载签名的所有可能情况。

基于重载签名就实现了将入参类型和返回值类型的可能情况进行关联，获得了更精确的类型标注能力。   

这里有一个需要注意的地方，拥有多个重载声明的函数在被调用时，是按照重载的声明顺序往下查找的。   

因此在第一个重载声明中，为了与逻辑中保持一致，即在 bar 为 true 时返回 string 类型，这里需要将第一个重载声明的 bar 声明为必选的字面量类型。   

你可以试着为第一个重载声明的 bar 参数也加上可选符号，然后就会发现第一个函数调用错误地匹配到了第一个重载声明。   

### 异步函数、Generator 函数等类型签名

对于异步函数、Generator 函数、异步 Generator 函数的类型签名，其参数签名基本一致，而返回值类型则稍微有些区别：   

```ts
async function asyncFunc(): Promise<void> {}

function* genFunc(): Iterable<void> {}

async function* asyncGenFunc(): AsyncIterable<void> {}
```

对于异步函数（即标记为 async 的函数），其返回值必定为一个 Promise 类型，而 Promise 内部包含的类型则通过泛型的形式书写，即 Promise<T>。   
