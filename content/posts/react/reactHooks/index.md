---
title: "📜 解读 react 源码系列 - hooks 篇"
date: 2024-02-16T10:27:35+08:00
tags: ["react"]
categories: ["react"]
---

本篇文章是解读 react 源码系列的第四篇 - hooks 篇，请带着问题来阅读，效果更佳。

<!--more-->

首先我们来思考几个问题：

🤔 Q1: react 为什么会造出 hooks？  
🤔 Q2: react hooks 为什么必须在函数组件内部执行？  
🤔 Q3: react 如何能够监听 react hooks 在外部执行并抛出异常？  
🤔 Q4: react hooks 如何把状态保存起来？保存在哪里？  
🤔 Q5: react hooks 为什么要放在函数顶部，为什么不能写在条件语句中？  
🤔 Q6: 为什么 useState 改变相同的值，组件不更新？  
🤔 Q7: useMemo 内部引用 useRef 为什么不需要添加依赖项，而引用 useState 就要添加依赖项？  
🤔 Q8: useEffect 添加依赖项 props.a，为什么 props.a 改变，useEffect 回调函数 create 重新执行？  
🤔 Q9: react 内部如何区分 useEffect 和 useLayoutEffect，执行时机有什么不同？

想一下，react 为什么会造出 hooks(💡：Q1)？

先设想一下，如果没有 hooks，函数组件能够做的只是接受 Props、渲染 UI、触发父组件传过来的事件。

所有的处理逻辑都只能在类组件中写，这样会使类组件内部错综复杂，每一个类组件都有一套独特的状态，相互之间不能复用。

本质上来说，类组件是一种面向对象思想的体现，类组件之间的状态会随着功能增强而变得越来越臃肿，代码维护成本也会越来越高。所以有必要做出一套函数组件代替类组件的方案，于是 hooks 也就理所当然的诞生了 (💡：Q2)。

所以，hooks 出现的原因是：

- 让函数组件也能做类组件的事，有自己的状态、可以处理副作用等
- 放弃面向对象编程，拥抱函数式编程
- 解决逻辑复用难得问题

## hooks 与 fiber

我们可以把 hooks 看做函数组件本身与函数组件对应的 fiber 之间的沟通桥梁：

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/hooks/img_01.png" alt="" width="100%" />

hooks 对象主要以三种处理策略存在 react 中：

- ContextOnlyDispatcher：第一种形态是防止开发者在函数组件外部调用 hooks，只要开发者调用了这个形态下的 hooks，就会抛出异常。

- HooksDispatcherOnMount：第二种形态是函数组件初始化 mount，这个形态的 hooks 的作用是建立这个桥梁，初次建立函数组件本身与函数组件对应的 fiber 之间的关系。

- HooksDispatcherOnUpdate：第三种形态是函数组件的更新 update，这个形态的 hooks 的作用是组件更新，需要 hooks 去获取或者更新维护状态。

一个 hooks 对象应该长这样：

```javascript
const ContextOnlyDispatcher = {
  /* 当 hooks 不是函数内部调用的时候，调用这个 hooks 对象下的 hook，报错。 */
  useEffect: throwInvalidHookError,
  useState: throwInvalidHookError,
  // ...
};
const HooksDispatcherOnMount = {
  /* 函数组件初始化用的 hooks */
  useState: mountState,
  useEffect: mountEffect,
  // ...
};
const HooksDispatcherOnUpdate = {
  /* 函数组件更新用的 hooks */
  useState: updateState,
  useEffect: updateEffect,
  // ...
};
```

### 函数组件触发

在 fiber 调和过程中，遇到 FunctionComponent 类型的 fiber，就会用 updateFunctionComponent 更新 fiber，在 updateFunctionComponent 内部就会调用 renderWithHooks。

```javascript
let currentlyRenderingFiber;
function renderWithHooks(current, workInProgress, Component, props) {
  currentlyRenderingFiber = workInProgress;
  /* 每一次执行函数组件之前，先清空状态 （用于存放 hooks 列表）*/
  workInProgress.memoizedState = null;
  /* 清空状态（用于存放 effect list） */
  workInProgress.updateQueue = null;
  /* 判断是初始化组件还是更新组件 */
  ReactCurrentDispatcher.current =
    current === null || current.memoizedState === null
      ? HooksDispatcherOnMount
      : HooksDispatcherOnUpdate;
  /* 执行真正的函数组件，所有的 hooks 将依次执行。 */
  let children = Component(props, secondArg);
  /* 将 hooks 变成第一种，防止 hooks 在函数组件外部调用，调用直接报错。 */
  ReactCurrentDispatcher.current = ContextOnlyDispatcher;
}
```

workInProgress 正在调和更新函数组件对应的 fiber 树：

- 对于函数组件 fiber，用 memoizedState 保存 hooks 信息。
- 对于函数组件 fiber，updateQueue 存放每个 useEffect/useLayoutEffect 产生的副作用组成的链表，在 commit 阶段更新这些副作用。
- 判断函数组件是初始化流程还是更新流程。如果是初始化流程，用 HooksDispatcherOnMount 对象；如果是更新流程，用 HooksDispatcherOnUpdate 对象；
- 函数组件执行完毕，将 hooks 赋值给 ContextOnlyDispatcher 对象。

* 引用的 react hooks 都是从 ReactCurrentDispatcher.current 中获取的，react 就是通过赋予 ReactCurrentDispatcher.current 不同的 hooks 对象达到监控 hooks 是否在函数组件内部调用 (💡：Q3)。
* Component(props, secondArg) 表示函数组件被真正执行，里面的每一个 hooks 也将依次执行。
* 每个 hooks 内部为什么能读取当前 fiber 信息，因为 currentlyRenderingFiber，函数组件初始化时已经把当前 fiber 赋值给 currentlyRenderingFiber，每个 hooks 内部读取的就是 currentlyRenderingFiber 的内容。

### hooks 初始化

hooks 初始化流程使用的是 mountState、mountEffect 等初始化节点的 hooks，将 hooks 与 fiber 建立起联系。

那么，如何建立起联系呢？每一个 hooks 初始化都会执行 mountWorkInProgressHook。

```javascript
function mountWorkInProgressHook() {
  const hook = {
    memoizedState: null,
    baseState: null,
    baseQueue: null,
    queue: null,
    next: null,
  };
  if (workInProgressHook === null) {
    // 初始化
    currentlyRenderingFiber.memoizedState = workInProgressHook = hook;
  } else {
    // 有多个 hooks
    workInProgressHook = workInProgressHook.next = hook;
  }
  return workInProgressHook;
}
```

函数组件对应的 fiber 用 memoizedState 保存 hooks 信息，每一个 hooks 执行都会产生一个 hooks 对象，在这个 hooks 对象中，保存着当前 hooks 的信息，不同的 hooks 保存的形式不同，每一个 hooks 通过 next 链表建立起联系 (💡：Q4)。

举个 🌰，假设在一个组件中这样写：

```javascript
export default function Index() {
  // 第一个 hooks
  const [number, setNumber] = React.useState(0);
  // 第二个 hooks
  const [num, setNum] = React.useState(1);
  // 第三个 hooks
  const dom = React.useRef(null);
  // 第四个 hooks
  React.useEffect(() => {
    console.log(dom.current);
  }, []);
  return (
    <div ref={dom}>
      <div onClick={() => setNumber(number + 1)}> {number} </div>
      <div onClick={() => setNum(num + 1)}> {num}</div>
    </div>
  );
}
```

上述代码中的四个 hooks，组件初始化，每个 hooks 内部执行 mountWorkInProgressHook，然后每一个 hooks 通过 next 和下一个 hooks 建立联系，最后 fiber 上的结构会变成这样：

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/hooks/img_02.png" alt="" width="100%" />

### hooks 更新

更新 hooks 逻辑，会首先取出 workInProgress.alternate (即 current) 里面对应的 hooks，然后根据这个之前的 hooks 复制一份，形成新的 hooks 链表关系。

这个过程解释了一个问题，就是 hooks 规则，hooks 为什么通常要放在函数顶部，hooks 不能写在 if 条件语句中，因为在更新过程中，如果通过 if 条件语句，增加或删除 hooks，在复用之前的 hooks 时，会产生复用 hooks 状态和当前 hooks 不一致的问题 (💡：Q5)。

举个 🌰，将第一个 hooks 变成条件判断形式，具体如下：

```javascript
export default function Index({ showNumber }) {
  let number, setNumber;
  // 第一个 hooks
  showNumber && ([number, setNumber] = React.useState(0));
}
```

第一次渲染时，showNumber = true，第一个 hooks 会渲染。

第二次渲染时，父组件将 showNumber 设置为 false，第一个 hooks 将不再执行，那么更新逻辑就会变成这样：

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/hooks/img_03.png" alt="" width="100%" />

第二次复用时发现 hooks 类型不同 useState !== useRef，直接报错了。所以开发时一定要注意 hooks 顺序一致性：

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/hooks/img_04.png" alt="" width="100%" />

## 状态派发

useState 解决了函数组件没有 state 的问题，让无状态函数组件有了自己的状态，useState 和 useReducer 原理大同小异，本质上都是通过触发更新函数 (dispatchAction)。

举个 🌰，比如一段代码这么写：

```javascript
const [number, setNumber] = React.useState(0);
```

setNumber 本质上就是 dispatchAction。

首先看一下执行 useState(0) 做了什么？

```javascript
function mountState(initialState){
  const hook = mountWorkInProgressHook();
  // 如果 useState 第一个参数为函数，执行函数得到初始化 state
  if (typeof initialState === 'function') { initialState = initialState() }
  hook.memoizedState = hook.baseState = initialState;
  // 负责记录更新的各种状态
  const queue = (hook.queue = { ... });
  // dispatchAction 为更新调度的主要函数
  const dispatch = (queue.dispatch = (dispatchAction.bind(null, currentlyRenderingFiber, queue,)))
  return [hook.memoizedState, dispatch];
}
```

- state 会被当前 hooks 的 memoizedState 保存下来，每一个 useState 都会创建一个 queue 里面保存了更新的信息。
- 每一个 useState 都会创建一个更新函数，当前的 fiber 和 queue 被 bind 绑定了固定的参数传入 dispatchAction，当用户触发 setNumber 时，能够直观反映出来自哪个 fiber 的更新。
- 最后把 memoizedState、dispatch 返回给开发者使用。

接下来重点研究 dispatchAction，看看底层是怎么处理更新逻辑的。

```javascript
function dispatchAction(fiber, queue, action){
  /* 第一步：创建一个 update */
  const update = { ... }
  const pending = queue.pending;
  /* 第一个待更新任务 */
  if (pending === null) {
    update.next = update;
  } else {  /* 已经有待更新任务 */
    update.next = pending.next;
    pending.next = update;
  }
  if(fiber === currentlyRenderingFiber) {
  /* 说明当前 fiber 正在发生调和渲染更新，那么不需要更新 */
  } else {
    if(fiber.expirationTime === NoWork && (alternate === null || alternate.expirationTime === NoWork)) {
      const lastRenderedReducer = queue.lastRenderedReducer;
      /* 上一次的 state */
      const currentState = queue.lastRenderedState;
       /* 这一次新的 state */
      const eagerState = lastRenderedReducer(currentState, action);
      /* 如果每一个都改变相同的state，那么组件不更新 */
      if (is(eagerState, currentState)) {
        return
      }
    }
    /* 发起调度更新 */
    scheduleUpdateOnFiber(fiber, expirationTime);
  }
}
```

- 每一次调用 dispatchAction(比如 setNumber) 都会先创建一个 update，然后把它放入待更新 pending 队列中。
- 判断如果当前的 fiber 正在更新，那么也就不需要在更新了。
- 反之，说明当前 fiber 没有更新任务，会拿出上一次 state 和这一次 state 进行对比，如果相同，直接退出更新；如果不相同，发起调度任务(💡：Q6)。

举个 🌰，我们模拟一个更新场景：

```javascript
export default function Index() {
  const [number, setNumber] = useState(0);
  const handleClick = () => {
    setNumber((num) => num + 1); // num = 1
    setNumber((num) => num + 2); // num = 3
    setNumber((num) => num + 3); // num = 6
  };
  return (
    <div>
      <button onClick={() => handleClick()}>点击 {number} </button>
    </div>
  );
}
```

点击一次按钮，触发了三次 setNumber，等于触发了三次 dispatchAction，那么这三次 update 会在当前 hooks 的 pending 队列中，由于批量更新的概念，会统一合成一次更新。

接下来是组件渲染，上一次 state 和这一次 state 进行对比不相同，发起调动任务，再一次执行 useState，此时走的是更新流程。

试想一下点击 handleClick 最后 state 被更新成 6，那么在更新逻辑中 useState 内部要做的事，就是得到最新的 state。

```javascript
function updateReducer() {
  // 第一步把待更新的 pending 队列取出来。合并到 baseQueue
  const first = baseQueue.next;
  let update = first;
  do {
    /* 得到新的 state */
    newState = reducer(newState, action);
  } while (update !== null && update !== first);
  hook.memoizedState = newState;
  return [hook.memoizedState, dispatch];
}
```

再次执行 useState 时，会触发更新 hooks 的逻辑，本质上调用的是 updateReducer，把待更新的队列 pendingQueue 拿出来，合并到 baseQueue，循环进行更新，得到新的 state。

循环更新的流程，说白了就是执行每一个 num => num + 1，得到最新的 state。

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/hooks/img_05.png" alt="" width="100%" />

## 处理副作用

### 初始化

在 render 阶段，没有进行真正的 DOM 元素的增加、删除等操作，react 把想要做的不同操作打上不同的 effectTag，等到 commit 阶段，统一处理这些副作用，包括 DOM 元素的增删改、执行一些生命周期等。

接下来以 effect 为例，看看 react 是如何处理 useEffect/useLayoutEffect 副作用的。

```javascript
function mountEffect(create, deps) {
  const hook = mountWorkInProgressHook();
  const nextDeps = deps === undefined ? null : deps;
  currentlyRenderingFiber.effectTag |= UpdateEffect | PassiveEffect;
  hook.memoizedState = pushEffect(
    HookHasEffect | hookEffectTag,
    // useEffect 第一个参数，就是副作用函数
    create,
    undefined,
    // useEffect 第二个参数，deps
    nextDeps
  );
}
```

- 通过 pushEffect 创建一个 effect，保存到当前 hooks 的 memoizedState 属性下。
- pushEffect 除了创建一个 effect，还有一个重要作用是，如果存在多个 effect 或 layoutEffect 会形成一个副作用链表，绑定在函数组件对应的 fiber 的 updateQueue 上。

对于函数组件，可能存在多个 useEffect/useLayoutEffect，hooks 把这些 effect 形成链表结构，在 commit 阶段统一处理。

如果在一个函数组中这样写：

```javascript
React.useEffect(() => {
  console.log("第一个effect");
}, [props.a]);
React.useLayoutEffect(() => {
  console.log("第二个effect");
}, []);
React.useEffect(() => {
  console.log("第三个effect");
  return () => {};
}, []);
```

在 updateQueue 中，副作用链表会变成如下样子：

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/hooks/img_06.png" alt="" width="100%" />

### 更新

更新流程对于 effect 来说也很简单，首先设想一下 useEffect 更新流程，无非判断是否执行下一次的 effect 副作用函数。

```javascript
function updateEffect(create, deps) {
  const hook = updateWorkInProgressHook();
  if (areHookInputsEqual(nextDeps, prevDeps)) {
    /* 如果 deps 项没有发生变化，那么更新 effect list 就可以了，无须设置 HookHasEffect */
    pushEffect(hookEffectTag, create, destroy, nextDeps);
    return;
  }
  /* 如果 deps 依赖项发生改变，赋予 effectTag ，在 commit 阶段，就会再次执行 effect  */
  currentlyRenderingFiber.effectTag |= fiberEffectTag;
  hook.memoizedState = pushEffect(
    HookHasEffect | hookEffectTag,
    create,
    destroy,
    nextDeps
  );
}
```

判断 deps 有没有发生变化，如果没有发生变化，更新副作用链表就可以了；如果发生变化，更新副作用链表的同时，打执行副作用标签：fiber => fiberEffectTag，hook => HookHasEffect，在 commit 阶段就会根据这些标签，重新执行副作用 (💡：Q8)。

### 不同的 effect

- react 会用不同的 effectTag 来标记不同的 effect，HookPassive 是 useEffect 的标识符，HookLayout 是 useLayoutEffect 的标识符。

- react 在 commit 阶段，通过标识符 effectTag，来区分是 useEffect 还是 useLayoutEffect，接下来 react 会同步处理 useLayoutEffect，异步处理 useEffect (💡：Q9)。

- 如果函数组件需要更新副作用，会标记 UpdateEffect，至于哪个 effect 需要更新，那就看哪个 hooks 上有 HookHasEffect 标记。

## 状态获取与状态缓存

### 对于 ref 的处理

useRef 就是创建并维护一个 ref 原始对象，用于获取原生 DOM 或者组件实例、或者保存一些状态等。

#### 初始化

```javascript
function mountRef(initialValue) {
  const hook = mountWorkInProgressHook();
  // 创建 ref 对象
  const ref = { current: initialValue };
  hook.memoizedState = ref;
  return ref;
}
```

#### 更新

```javascript
function updateRef(initialValue) {
  const hook = updateWorkInProgressHook();
  // 取出复用 ref 对象
  return hook.memoizedState;
}
```

ref 创建和更新的过程，就是 ref 对象的创建和复用的过程。

### 对于 useMemo 的处理

对于 useMemo，逻辑比 useRef 复杂，但是相对于 useState、useEffect 简单的多。

#### 初始化

useMemo 初始化会执行第一个函数得到想要缓存的值，将值缓存到 hooks 的 memoizedState 上。

```javascript
function mountMemo(nextCreate, deps) {
  const hook = mountWorkInProgressHook();
  const nextDeps = deps === undefined ? null : deps;
  const nextValue = nextCreate();
  // 数组形式
  hook.memoizedState = [nextValue, nextDeps];
  return nextValue;
}
```

#### 更新

useMemo 更新流程就是对比两次的 deps 是否发生变化，如果没有发生变化，直接返回缓存值；如果发生变化，执行第一个参数函数，重新生成缓存值，缓存下来，供开发者使用。

```javascript
function updateMemo(nextCreate, nextDeps) {
  const hook = updateWorkInProgressHook();
  const prevState = hook.memoizedState;
  // 之前保存的 deps 值
  const prevDeps = prevState[1];
  // 判断两次 deps 值
  if (areHookInputsEqual(nextDeps, prevDeps)) {
    return prevState[0];
  }
  // 如果 deps，发生改变，重新执行
  const nextValue = nextCreate();
  hook.memoizedState = [nextValue, nextDeps];
  return nextValue;
}
```

通过 useRef 和 useMemo 的源码来看，useRef 本质上就是一个 { current：xx } 对象，更新阶段直接拿过来这个对象进行复用。改变 ref 值也只是对 current 属性值发生变化，而对象地址还是没有变化。

更新的判断是否变化对依赖值是进行浅比较的，所以添不添加都没什么影响。而 useState 每次更新之后的 state 是重新计算出来的，所以需要添加依赖 (💡：Q7)。

## 总结

本篇讲了 react hooks 原理，吃透这篇，完全可以应对 react hooks 各种面试题。希望一次没有读明白的同学，可以多看几次，不积硅步无以至千里，你学废了吗？
