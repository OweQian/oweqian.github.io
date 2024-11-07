---
title: "📜 解读 react 原理系列 - fiber 与调和"
date: 2024-02-11T16:36:58+08:00
tags: ["react"]
categories: ["react"]
---

本篇文章是解读 react 原理系列的第三篇 - fiber 与调和，请带着问题来阅读，效果更佳。

<!--more-->

首先我们来思考几个问题：

🤔 Q1: 什么是 fiber？  
🤔 Q2: fiber 架构解决了什么问题?  
🤔 Q3: fiberRoot 和 rootFiber 有什么区别？  
🤔 Q4: 不同 fiber 之间如何建立起关联？  
🤔 Q5: react 调和流程？  
🤔 Q6: 两大阶段 commit 和 render 都做了什么？  
🤔 Q7: 什么是双缓冲树？有什么作用?

## 全面认识 fiber

### 什么是 fiber

fiber 在 react 中是最小粒度的执行单元，无论是 react 还是 vue，在遍历更新每一个节点时都不是用真实 DOM，而是采用虚拟 DOM，所以可以将 fiber 理解为 react 的虚拟 DOM (💡：Q1)。

### 为什么要用 fiber

react v15 及之前的版本，react 采用递归方式遍历更新，比如发生一次更新，就会从应用根部递归更新，递归一旦开始就无法中断，随着项目越来越复杂，层级越来越深，导致更新的时间越来越长，造成页面卡顿。

react v16 为了解决页面卡顿的问题，引入了 fiber。更新 fiber 的过程叫做 Reconciler(调和器)，每一个 fiber 都可以作为一个独立的执行单元来处理，每一个 fiber 都可以根据自身的过期时间 expirationTime（v17 版本叫做优先级 lane）来判断是否还有空闲时间执行更新，如果没有时间更新，就把主动权交给浏览器去渲染，等浏览器有空闲时间，通过 Scheduler（调度器）恢复到执行单元上来 (💡：Q2)。

### element、fiber、DOM

首先必须弄明白 element、fiber 和真实 DOM 三者之间的关系：

- element：react 视图层在代码层级上的表象，上面保存了 props、children 等信息
- DOM：元素在浏览器上给用户的直观的表象
- fiber：element 和 真实 DOM 之间的交流枢纽站

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/hooks/img_21.png" alt="" width="100%" />

element 与 fiber 之间的对应关系：

```javascript
export const FunctionComponent = 0; // 对应函数组件
export const ClassComponent = 1; // 对应的类组件
export const IndeterminateComponent = 2; // 初始化的时候不知道是函数组件还是类组件
export const HostRoot = 3; // Root Fiber 可以理解为跟元素 ， 通过reactDom.render()产生的根元素
export const HostPortal = 4; // 对应  ReactDOM.createPortal 产生的 Portal
export const HostComponent = 5; // DOM 元素 比如 <div>
export const HostText = 6; // 文本节点
export const Fragment = 7; // 对应 <React.Fragment>
export const Mode = 8; // 对应 <React.StrictMode>
export const ContextConsumer = 9; // 对应 <Context.Consumer>
export const ContextProvider = 10; // 对应 <Context.Provider>
export const ForwardRef = 11; // 对应 React.ForwardRef
export const Profiler = 12; // 对应 <Profiler/ >
export const SuspenseComponent = 13; // 对应 <Suspense>
export const MemoComponent = 14; // 对应 React.memo 返回的组件
```

### fiber 保存了哪些信息

```javascript
function FiberNode() {
  this.tag = tag; // fiber 标签 证明是什么类型
  this.key = key; // key 调和子节点时候用到
  this.type = null; // DOM 元素是对应的元素类型，比如div，组件指向组件对应的类或者函数
  this.stateNode = null; // 指向对应的真实 DOM 元素，类组件指向组件实例，可以被 ref 获取

  this.return = null; // 指向父级 fiber
  this.child = null; // 指向子级 fiber
  this.sibling = null; // 指向兄弟 fiber
  this.index = 0; // 索引

  this.ref = null; // ref 指向，ref 函数，或者 ref对象

  this.pendingProps = pendingProps; // 在一次更新中，代表 element 创建
  this.memoizedProps = null; // 记录上一次更新完毕后的 props
  this.updateQueue = null; // 类组件存放 setState更新队列，函数组件存放 state 更新队列
  this.memoizedState = null; // 类组件保存 state 信息，函数组件保存 hooks 信息，DOM 元素为 null
  this.dependencies = null; // context 或是时间的依赖项

  this.mode = mode; // 描述 fiber 树的模式，比如 ConcurrentMode 模式

  this.effectTag = NoEffect; // effect 标签，用于收集 effectList
  this.nextEffect = null; // 指向下一个 effect

  this.firstEffect = null; // 第一个 effect
  this.lastEffect = null; // 最后一个 effect

  this.expirationTime = NoWork; // 通过不同过期时间，判断任务是否过期，在 v17 版本用 lane 表示

  this.alternate = null; // 双缓存树，指向缓存的fiber。更新阶段，两棵树互相交替
}
```

### fiber 之间如何建立起关联

fiber 之间通过 return、child、sibling 三个属性建立起关联 (💡：Q4)：

- return：指向父级 fiber 节点
- child：指向子级 fiber 节点
- sibling：指向兄弟 fiber 节点

比如元素结构是这样的：

```javascript
export default class Index extends React.Component {
  state = { number: 666 };
  handleClick = () => {
    this.setState({
      number: this.state.number + 1,
    });
  };
  render() {
    return (
      <div>
        Hello，world
        <p> react {this.state.number} 👍 </p>
        <button onClick={this.handleClick}>点赞</button>
      </div>
    );
  }
}
```

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/hooks/img_22.png" alt="" width="100%" />

## fiber 更新机制

接下来，我们从初始化和一次更新入手，看一下 fiber 是如何工作的 (💡：Q5)。

### 初始化

第一步：创建 fiberRoot 和 rootFiber(💡：Q3)。

- fiberRoot：首次构建应用，创建 fiberRoot，作为整个 react 应用的根基
- rootFiber：通过 ReacDOM.render 渲染出来的，一个 react 应用可以有多个 ReacDOM.render 创建的 rootFiber，但是只能有一个 fiberRoot

第一次挂载的过程中，会将 fiberRoot 和 rootFiber 建立关联。

```javascript
function createFiberRoot(containerInfo, tag) {
  /* 创建一个 root */
  const root = new FiberRootNode(containerInfo, tag);
  const rootFiber = createHostRootFiber(tag);
  root.current = rootFiber;
  return root;
}
```

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/hooks/img_23.png" alt="" width="100%" />

第二步：workInProgress 和 current

经过第一步的处理，开始到正式渲染阶段，进入 beginWork 流程，在了解渲染流程之前，先弄明白两个概念：

- workInProgress 树：正在内存中构建的 fiber 树称为 workInProgress 树。在一次更新中，所有的更新都是发生在 workInProgress 树上。在一次更新后，workInProgress 树上的状态都是最新的状态，它将变成 current 树用于渲染视图
- current 树：正在视图层渲染的树叫做 current 树

接下来会到 rootFiber 的渲染流程，首先会复用当前 current 树（rootFiber）的 alternate 作为 workInProgress，如果没有 alternate，则会创建一个 fiber 作为 workInProgress。将新创建的 workInProgress 通过 alternate 与 current 树建立起关联，这个关联过程只有初始化第一次创建 alternate 时进行。

```javascript
currentFiber.alternate = workInProgressFiber;
workInProgressFiber.alternate = currentFiber;
```

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/hooks/img_24.png" alt="" width="100%" />

第三步：深度调和子节点，渲染视图

接下来会按照上述第二步，在新创建的 alternate 上，完成整个 fiber 树的遍历，包括 fiber 的创建。

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/hooks/img_25.png" alt="" width="100%" />

最后以 workInProgress 树作为最新的渲染树，fiberRoot 的 current 指针指向 workInProgress 树 使其变为 current 树，至此完成初始化流程。

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/hooks/img_26.png" alt="" width="100%" />

### 更新

用户点击一次按钮，接下来会发生什么呢？

首先会走如上的逻辑，重新创建一棵 workInProgress 树，复用当前 current 树上的 alternate 作为新的 workInProgress。渲染完毕后，workInProgress 树再次变为 current 树。

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/hooks/img_27.png" alt="" width="100%" />

### 双缓存树

canvas 绘制动画时，如果上一帧计算量较大，导致清除上一帧画面到绘制当前帧画面之间有较长间隙，就会出现白屏。

为了解决这个问题，canvas 在内存中绘制当前动画，绘制完毕后直接用当前帧替换掉上一帧画面，由于省去了两帧替换间的计算时间，就不会有从白屏到出现画面的闪烁情况，这种在内存中构建并直接替换的技术叫做双缓存。

react 用 workInProgress 树和 current 树来实现更新逻辑。双缓存一个在内存中构建，一个做渲染视图，两棵树用 alternate 指针互相指向，这样做既可以防止只用一棵树更新状态出现丢失的情况，又加快了 DOM 节点的替换和更新 (💡：Q7)。

## 两大阶段：render 和 commit

render 阶段和 commit 阶段是整个 Reconciler 的核心，在正式讲解之前，先看一下整个 fiber 的遍历的开始 - workLoop(💡：Q6)。

### render

```javascript
function workLoop() {
  while (workInProgress !== null) {
    workInProgress = performUnitOfWork(workInProgress);
  }
}
```

每一个 fiber 都可以看作一个独立的执行单元，在调和过程中，每一个发生更新的 fiber 都会作为一次 workInProgress。

workLoop 就是执行每一个单元的调度器，如果渲染没有被中断，workLoop 会遍历一遍 fiber 树。

performUnitOfWork 包括 beginWork 和 completeWork 两个阶段。

```javascript
function performUnitOfWork() {
  next = beginWork(current, unitOfWork, renderExpirationTime);
  if (next === null) {
    next = completeUnitOfWork(unitOfWork);
  }
}
```

- beginWork：向下调和的过程，由 rootFiber 按照 child 指针逐层向下调和，期间会执行函数组件、实例类组件、diff 调和子节点，打不同的 effectTag
- completeUnitOfWork：向上归并的过程，如果有兄弟节点，会返回 sibling 兄弟节点，没有则返回 return 父级节点，一直返回到 rootFiber，期间可以形成 effectList，初始化流程会创建 DOM，对 DOM 元素进行事件收集，处理 style、className 等

就这样一上一下，构成了整个 fiber 树的调和。

#### beginWork

```javascript
function beginWork(current, workInProgress) {
  switch (workInProgress.tag) {
    case IndeterminateComponent: {
      // 初始化的时候不知道是函数组件还是类组件
      //....
    }
    case FunctionComponent: {
      //对应函数组件
      //....
    }
    case ClassComponent: {
      //类组件
      //...
    }
    case HostComponent: {
      //...
    }
    // ...
  }
}
```

beginWork 主要作用是：

- 对于组件，执行部分生命周期，执行 render，得到最新的 children
- 向下遍历调和 children，复用 oldFiber（diff）
- 打不同的副作用标签 effectTag，比如元素的增加、删除、更新

接下来看一下 react 是如何调和子节点的：

```javascript
function reconcileChildren(current, workInProgress) {
  if (current === null) {
    /* 初始化子代 fiber  */
    workInProgress.child = mountChildFibers(
      workInProgress,
      null,
      nextChildren,
      renderExpirationTime
    );
  } else {
    /* 更新流程，diff children 将在这里进行。 */
    workInProgress.child = reconcileChildFibers(
      workInProgress,
      current.child,
      nextChildren,
      renderExpirationTime
    );
  }
}
```

常用的 effectTag：

```javascript
export const Placement = /*             */ 0b0000000000010; // 插入节点
export const Update = /*                */ 0b0000000000100; // 更新 fiber
export const Deletion = /*              */ 0b0000000001000; // 删除 fiber
export const Snapshot = /*              */ 0b0000100000000; // 快照
export const Passive = /*               */ 0b0001000000000; // useEffect 的副作用
export const Callback = /*              */ 0b0000000100000; // setState 的 callback
export const Ref = /*                   */ 0b0000010000000; // ref
```

#### completeUnitOfWork

completeUnitOfWork 的流程是自下而上的，主要作用是：

- 首先 completeUnitOfWork 会将 effectTag 的 fiber 节点保存在被称为 effectList 的单向链表中，在 commit 阶段，不再需要遍历每一个 fiber，只需要执行 effectList 就可以了
- 处理 context；元素标签初始化、创建真实 DOM、将子孙 DOM 节点插入刚生成的 DOM 节点中；触发 diffProperties 处理 props；事件收集、style、className 处理等

#### 调和顺序

对于上面的 demo，初始化或一次更新过程中的调和顺序是这样的：

- beginWork -> rootFiber
- beginWork -> Index fiber
- beginWork -> div fiber
- beginWork -> hello,world fiber
- completeWork -> hello,world fiber (completeWork 返回 sibling)
- beginWork -> p fiber
- completeWork -> p fiber
- beginWork -> button fiber
- completeWork -> button fiber (此时没有 sibling，返回 return)
- completeWork -> div fiber
- completeWork -> Index fiber
- completeWork -> rootFiber (完成整个 workLoop)

> "react" 和 "点赞" 没有 beginWork/completeWork 流程，react 针对只有单一文本子节点的 fiber 会做特殊处理，这是一种性能优化手段

### commit

完成了 render 阶段，接下来进行 commit 阶段。

commit 阶段主要做的事情是：

- 对一些类组件的生命周期和函数组件的副作用钩子的处理，如 componentDidMount、useEffect ，useLayoutEffect
- 在一次更新中，执行 effectList，添加节点（Placement），更新节点（Update），删除节点（Deletion），一些细节的处理，比如 ref 的处理

commit 阶段可以细分为：

- Before Mutation 阶段：执行 DOM 操作前
- Mutation 阶段：执行 DOM 操作
- Layout 阶段：执行 DOM 操作后

#### Before mutation

```javascript
function commitBeforeMutationEffects() {
  while (nextEffect !== null) {
    const effectTag = nextEffect.effectTag;
    if ((effectTag & Snapshot) !== NoEffect) {
      const current = nextEffect.alternate;
      // 调用 getSnapshotBeforeUpdates
      commitBeforeMutationEffectOnFiber(current, nextEffect);
    }
    if ((effectTag & Passive) !== NoEffect) {
      scheduleCallback(NormalPriority, () => {
        flushPassiveEffects();
        return null;
      });
    }
    nextEffect = nextEffect.nextEffect;
  }
}
```

Before Mutation 阶段主要做的事情是：

- Before Mutation 还没修改真实的 DOM，是获取 DOM 快照的最佳时期，如果是类组件并且有 getSnapshotBeforeUpdate，就会执行
- 异步调用 useEffect

#### Mutation

```javascript
function commitMutationEffects() {
  while (nextEffect !== null) {
    if (effectTag & Ref) {
      /* 置空 ref */
      const current = nextEffect.alternate;
      if (current !== null) {
        commitDetachRef(current);
      }
    }
    switch (primaryEffectTag) {
      case Placement: {
      } //  新增元素
      case Update: {
      } //  更新元素
      case Deletion: {
      } //  删除元素
    }
  }
}
```

Mutation 阶段主要做的事情是：

- 置空 ref
- 进行真实的 DOM 操作：新增元素、更新元素、删除元素

#### Layout

```javascript
function commitLayoutEffects(root) {
  while (nextEffect !== null) {
    const effectTag = nextEffect.effectTag;
    commitLayoutEffectOnFiber(
      root,
      current,
      nextEffect,
      committedExpirationTime
    );
    if (effectTag & Ref) {
      commitAttachRef(nextEffect);
    }
  }
}
```

Layout 阶段主要做的事情是：

- 对于类组件，会执行生命周期，setState 的 callback
- 对于函数组件，会执行 useLayoutEffect 钩子
- 如果有 ref，会重新赋值 ref

## 调和 + 异步调度流程图

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/hooks/img_28.png" alt="" width="100%" />

## 总结

本篇学习了 react fiber 与调和的原理和流程，下一篇将学习 react 中的位运算。
