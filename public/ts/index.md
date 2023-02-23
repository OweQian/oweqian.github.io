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

