---
title: "📜 react 架构篇 - 位运算"
date: 2024-08-22T11:43:43+08:00
tags: ["react"]
categories: ["react"]
---

react 中有很多运用位运算的场景，比如在更新优先级模型中采用新的 lane 架构模型、判断更新类型中的 context 模型、更新标志 flags 模型。

<!--more-->

本篇让我们一起来弄明白 react 架构设计为什么要使用位运算和 react 底层源码中如何使用位运算。

首先我们来思考几个问题：

🤔 Q1: 什么是位运算？  
🤔 Q2: 位运算的使用场景？  
🤔 Q3: 什么是位掩码？  
🤔 Q4: 位运算在 react 中的应用？

## 什么是位运算

计算机专业的同学都知道，程序中的所有数在计算机内存中都是以二进制的形式存储的，位运算就是直接对整数在内存中的二进制位进行操作 (💡：Q1)。

比如：

- 0 在二进制中用 0 表示，我们用 0000 代表
- 1 在二进制中用 1 表示，我们用 0001 代表

接下来看两个位元算符号 & 和 |：

- & 对于每一个比特位，两个操作数都为 1 时，结果为 1，否则为 0
- | 对于每一个比特位，两个操作数都为 0 时，结果为 0，否则为 1

举个 🌰：

1 & 0 = 0,1 | 0 = 1；

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/hooks/img_29.png" alt="" width="100%" />

常用的位运算：

| 运算符             | 用法    | 说明                                                   |
| ------------------ | ------- | ------------------------------------------------------ |
| 与 &               | a & b   | 如果两位都是 1 则设置每位为 1                          |
| 或 \|              | a \| b  | 如果两位之一为 1 则设置每位为 1                        |
| 异或 ^             | a ^ b   | 如果两位只有一位为 1 则设置每位为 1                    |
| 非 ~               | ~a      | 反转所有位                                             |
| 零填充左位移 (<<)  | a << b  | 通过从右推入零向左位移，并使最左边的位脱落             |
| 有符号右位移 (>>)  | a >> b  | 通过从左推入最左位的拷贝来向右位移，并使最右边的位脱落 |
| 零填充右位移 (>>>) | a >>> b | 通过从左推入零来向右位移，并使最右边的位脱落           |

## 位运算的使用场景

比如有这样一个场景，它有很多状态常量 A、B、C...这些状态常量被用来在整个应用中的一些关键节点做流程控制 (💡：Q2)，如：

```javascript
if (value === A) {
  // TODO...
}
```

如上判断 value 等于常量 A，就进入到 if 的条件语句中，此时 value 和 常量值是一对一的关系。

但如果在实际场景中，value 可能是好几个枚举常量的集合，也就是一对多的关系，此时 value 可能同时代表 A 和 B 两个状态常量。

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/hooks/img_30.png" alt="" width="100%" />

那么如何用一个 value 来表示 A 和 B 两个状态常量的集合呢？

这个时候位运算就派上用场了，把一些状态常量用 32 位的二进制来表示（也可以用其他进制），比如：

```javascript
const A = 0b0000000000000000000000000000001;
const B = 0b0000000000000000000000000000010;
const C = 0b0000000000000000000000000000100;
```

通过移位的方式让每一个常量都单独占一位，在判断一个属性是否为常量时，可以根据当前位数的 1 和 0 来判断。

如果一个值既代表 A 又代表 B，那么就可以通过位运算的 | 来处理。

AB = A | B = 0b0000000000000000000000000000011

如果把 AB 的值赋给 value，此时的 value 就可以用来代表 A 和 B。

那么如何判断 value 是否为 A 或者 B？我们可以通过 & 来判断。

```javascript
const A = 0b0000000000000000000000000000001;
const B = 0b0000000000000000000000000000010;
const C = 0b0000000000000000000000000000100;
const N = 0b0000000000000000000000000000000;
const value = A | B;
console.log((value & A) !== N); // true
console.log((value & B) !== N); // true
console.log((value & C) !== N); // false
```

引入一个新的常量 N，它所有的位数都是 0，它本身的数值也是 0。

通过 (value & A ) !== 0 为 true 来判断 value 中是否含有 A；同样通过 (value & B ) !== 0 为 true 来判断 value 中是否含有 B；value 中没有属性 C，所以 (value & C ) !== 0 为 false。

位掩码：对于常量的声明（如上述的 A、B、C）必须满足只有一个 1 位，而且每一个常量二进制 1 的所在位数都不同，如下所示：

0b0000000000000000000000000000001 = 1  
0b0000000000000000000000000000010 = 2  
0b0000000000000000000000000000100 = 4  
0b0000000000000000000000000001000 = 8  
0b0000000000000000000000000010000 = 16  
0b0000000000000000000000000100000 = 32  
0b0000000000000000000000001000000 = 64  
...

二进制满足的情况都是 2 的幂数，如果我们声明的常量都满足如上情况，我们就可以用不同的变量来比较、合并这些变量。

这种通过二进制存储，通过位运算计算的方式，在计算机中作为位掩码 (💡：Q3)。

## react 位掩码场景

react 中有很多运用位运算的场景，比如更新优先级 - lane、更新上下文状态 — ExecutionContext、更新标识 - flag (💡：Q4)。

### 更新优先级

react 中的更新任务会被赋予不同的优先级。在一次用户交互中，如果仅出现一个更新任务，react 只需要公平对待这个更新就可以了。

如果存在多个更新任务，比如：远程搜索功能，用户输入内容，触发列表内容变化，这时如果把输入表单和列表更新放在同一个优先级，无论 js 执行还是浏览器绘制，列表更新需要的时间远大于一个输入框更新的时间，所以输入框频繁改变内容，会造成列表频繁更新，列表的更新会阻塞到表单内容的呈现，这样就造成了用户不能及时看到输入的内容，造成了很差的用户体验。

react 的解决方案就是当存在多个更新优先级任务时，高优先级的任务先执行，等到执行完高优先级任务，再回头来执行低优先级的任务，保证良好的用户体验。

那么 react 用什么来标记更新任务的优先级呢？在 react v17 及以上版本，引入 lane 属性来表示更新任务的优先级。

```javascript
export const NoLanes = /*                        */ 0b0000000000000000000000000000000;
const SyncLane = /*                        */ 0b0000000000000000000000000000001;

const InputContinuousHydrationLane = /*    */ 0b0000000000000000000000000000010;
const InputContinuousLane = /*             */ 0b0000000000000000000000000000100;

const DefaultHydrationLane = /*            */ 0b0000000000000000000000000001000;
const DefaultLane = /*                     */ 0b0000000000000000000000000010000;

const TransitionHydrationLane = /*                */ 0b0000000000000000000000000100000;
const TransitionLane = /*                        */ 0b0000000000000000000000001000000;
```

SyncLane 代表的数值是 1，它是最高的优先级，也就是说 lane 代表的数值越小，此次更新任务的优先级就越大。

新版 react 中，render 阶段可能被中断，在这期间会产生一个更高优先级的任务，就会再次更新 lane 属性，这样多个更新就会合并，一个 lane 可能需要表现出多个更新优先级。

通过位运算让多个优先级的任务合并，分离出高优先级和低优先级的任务。

那么 react 如何通过位运算分离出高优先级任务呢？

```javascript
function getHighestPriorityLanes(lanes) {
  /* 通过 getHighestPriorityLane 分离出优先级高的任务 */
  switch (getHighestPriorityLane(lanes)) {
    case SyncLane:
      return SyncLane;
    case InputContinuousHydrationLane:
      return InputContinuousHydrationLane;
    // ...
  }
}
```

通过 getHighestPriorityLane 分离出高优先级的任务：

```javascript
function getHighestPriorityLane(lanes) {
  return lanes & -lanes;
}
```

比如 SyncLane 和 InputContinuousLane 合并之后的任务优先级 lanes 为：

SyncLane = 0b0000000000000000000000000000001  
InputContinuousLane = 0b0000000000000000000000000000100

lanes = SyncLane ｜ InputContinuousLane  
lanes = 0b0000000000000000000000000000101

首先我们看一下 -lanes，在二进制中需要用补码来表示：

-lanes = 0b1111111111111111111111111111011

接下来看一下 lanes & -lanes：

lanes & -lanes = 0b0000000000000000000000000000001

可以看到 lanes & -lanes 的结果是 SyncLane，这样就能分离出最高优先级的任务。

```javascript
const SyncLane = 0b0000000000000000000000000000001;
const InputContinuousLane = 0b0000000000000000000000000000100;
const lane = SyncLane | InputContinuousLane;
console.log((lane & -lane) === SyncLane); // true
```

### 更新上下文

lane 决定了更新任务的优先级，高优任务进入更新阶段，react 中有一个属性用来判断当前更新上下文的状态，这个属性就是 ExecutionContext。

为什么要用一个状态表示当前更新上下文呢？

举个 🌰，比如 react 批量更新，在一次点击中，多次更新 state，react 就会把这些更新合并为一次更新，这就存在一个问题，react 怎么知道当前的上下文中需要合并更新呢？

这个时候更新上下文状态 ExecutionContext 就派上用场了，通过给 ExecutionContext 赋不同的状态值，来证明当前上下文的状态，点击事件里面的上下文会被赋予独立的上下文状态值。

```javascript
function batchedEventUpdates() {
  var prevExecutionContext = executionContext;
  executionContext |= EventContext; // 赋值事件上下文 EventContext
  try {
    return fn(a); // 执行函数
  } finally {
    executionContext = prevExecutionContext; // 重置之前的状态
  }
}
```

在 react 事件系统中给 executionContext 赋值 EventContext，在执行完事件后，再重置到之前的状态。这样在事件系统中的更新就能感知到目前的更新上下文是 EventContext，在这里的更新就是可控的，就可以实现批量更新的逻辑了。

常用的更新上下文，这里和最新的 React 源码有一些出入：

```javascript
export const NoContext = /*             */ 0b0000000;
const BatchedContext = /*               */ 0b0000001;
const EventContext = /*                 */ 0b0000010;
const DiscreteEventContext = /*         */ 0b0000100;
const LegacyUnbatchedContext = /*       */ 0b0001000;
const RenderContext = /*                */ 0b0010000;
const CommitContext = /*                */ 0b0100000;
export const RetryAfterError = /*       */ 0b1000000;
```

和 lanes 的定义不同, ExecutionContext 类型的变量, 在定义时采取的是 8 位二进制。

在最新的源码中，ExecutionContext 类型变量采用 4 位的二进制：

```javascript
export const NoContext = /*             */ 0b000;
const BatchedContext = /*               */ 0b001;
const RenderContext = /*                */ 0b010;
const CommitContext = /*                */ 0b100;
let executionContext = NoContext;
```

executionContext 作为一个全局状态，指引 react 更新的方向。

在 react 运行时上下文中，无论是初始化还是更新，都会走一个入口函数 scheduleUpdateOnFiber，这个函数会使用更新上下文来判别更新的下一步走向。

```javascript
if (lane === SyncLane) {
  if (
    (executionContext & LegacyUnbatchedContext) !== NoContext && // unbatch 情况，比如初始化
    (executionContext & (RenderContext | CommitContext)) === NoContext
  ) {
    //直接更新
  } else {
    if (executionContext === NoContext) {
      //放入到调度更新
    }
  }
}
```

如上就是通过 executionContext 以及位运算来判断是否直接更新还是放入到调度中去更新。

### 更新标识 flag

经历了更新优先级 lane 来判断是否更新，又通过更新上下文 executionContext 来判断更新的方向，那么到底更新什么？又有哪些种类的更新？

这就涉及到了 react fiber 中的另一个状态 - flags，这个状态证明了当前 fiber 存在什么种类的更新。

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/hooks/img_31.png" alt="" width="100%" />

flags 种类：

```javascript
export const NoFlags = /*                      */ 0b00000000000000000000000000;
export const PerformedWork = /*                */ 0b00000000000000000000000001;
export const Placement = /*                    */ 0b00000000000000000000000010;
export const Update = /*                       */ 0b00000000000000000000000100;
export const Deletion = /*                     */ 0b00000000000000000000001000;
export const ChildDeletion = /*                */ 0b00000000000000000000010000;
export const ContentReset = /*                 */ 0b00000000000000000000100000;
export const Callback = /*                     */ 0b00000000000000000001000000;
export const DidCapture = /*                   */ 0b00000000000000000010000000;
export const ForceClientRender = /*            */ 0b00000000000000000100000000;
export const Ref = /*                          */ 0b00000000000000001000000000;
export const Snapshot = /*                     */ 0b00000000000000010000000000;
export const Passive = /*                      */ 0b00000000000000100000000000;
export const Hydrating = /*                    */ 0b00000000000001000000000000;
export const Visibility = /*                   */ 0b00000000000010000000000000;
export const StoreConsistency = /*             */ 0b00000000000100000000000000;
```

react 的更新流程分为两个阶段，第一个阶段是找到待更新的地方，设置更新标志 flags；第二个阶段是通过 flags 来证明当前 fiber 发生了什么类型的更新，然后执行这些更新：

```javascript
const NoFlags = 0b00000000000000000000000000;
const PerformedWork = 0b00000000000000000000000001;
const Placement = 0b00000000000000000000000010;
const Update = 0b00000000000000000000000100;
// 初始化
let flag = NoFlags;

// 发现更新，打更新标志
flag = flag | PerformedWork | Update;

// 判断是否有 PerformedWork 种类的更新
if (flag & PerformedWork) {
  // 执行
  console.log("执行 PerformedWork");
}

// 判断是否有 Update 种类的更新
if (flag & Update) {
  // s执行
  console.log("执行 Update");
}

if (flag & Placement) {
  // 执行
  console.log("执行 Placement");
}
```

## 总结

本篇学习了 react 对位运算的应用，领会到了二进制的魅力，希望以后能在项目中用到。
