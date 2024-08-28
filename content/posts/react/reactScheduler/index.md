---
title: "📜 解读 react 源码系列 - 异步调度篇"
date: 2024-02-01T11:04:41+08:00
tags: ["react"]
categories: ["react"]
---

本篇文章是解读 react 源码系列的第二篇 - 异步调度篇，请带着问题来阅读，效果更佳。

<!--more-->

首先我们来思考几个问题：

🤔 Q1: react 异步调度原理？  
🤔 Q2: react 为什么不用 setTimeout?  
🤔 Q3: 时间分片是什么？  
🤔 Q4: react 如何模拟 requestIdleCallback？  
🤔 Q5: 简述一下调度流程？

## 何为异步调度

GUI 渲染线程和 JS 引擎线程是相互排斥的，比如开发者用 JS 写了一个遍历大量数据的循环，JS 一直执行，这会阻塞浏览器的渲染绘制，给用户带来的最直观的感受就是页面卡顿。

react v15 就面临上述问题，对于大型的 react 应用，存在一次更新，递归遍历大量组件的问题，阻塞了浏览器的渲染绘制，伴随着项目越来越大，页面也越来越卡顿。

如何解决这个问题呢？解铃还须系铃人，既然更新过程阻塞了浏览器的绘制，那么把 react 的更新交给浏览器自己控制不就行了吗？如果浏览器有绘制任务，就执行绘制任务，空闲时间执行更新任务，这样就能解决卡顿问题了。

### 时间分片

页面的内容是一帧一帧绘制出来的，浏览器刷新频率代表浏览器一秒绘制多少帧。原则上说 1s 内绘制的帧数越多，页面表现越细腻。

目前浏览器大多是 60Hz(60 帧/s)，每一帧耗时在 16.6 ms 左右。在一帧的过程中，浏览器会经过下面这几个过程：

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/hooks/img_17.png" alt="" width="100%" />

一帧执行后，如果没有其它事件，浏览器就会进入休息时间。此时如果有不是特别紧急的 react 更新，就可以执行了。

❓ 如何知道浏览器有空闲时间？

requestIdleCallback 是谷歌浏览器提供的一个 API，只有在一帧的 16.6ms 中做完了前面 6 件事且还有剩余时间才会执行。首先看一下 requestIdleCallback 的基本用法：

```javascript
requestIdleCallback(callback, { timeout });
```

- callback 回调，浏览器有剩余时间执行回调函数
- timeout 超时时间，如果浏览器长时间没有空闲，回调就不会执行

react 为了防止 requestIdleCallback 中的任务由于浏览器没有空闲时间而卡死，设置了 5 个优先级：

- Immediate -1，需要立刻执行
- UserBlocking 超时时间 250ms，一般指用户交互
- Normal 超时时间 5000ms，一般指网络请求
- Low 超时时间 10000ms，肯定要执行的任务，但可以放到最后
- Idle 一些不太重要的任务，可能不会执行

react 就是通过类似 requestIdleCallback 向浏览器做一帧一帧请求，将时间无脑的分片成 5ms，5ms 一过就停止更新任务的执行，让出控制权，将剩余的更新任务放到下一个宏任务，继续 5ms 一个分片执行，保证页面的流畅 (💡：Q3)。

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/hooks/img_18.png" alt="" width="100%" />

### 模拟 requestIdleCallback

requestIdleCallback 目前只有谷歌浏览器支持，为了兼容每个浏览器，react 需要自己实现一个 requestIdleCallback，这就需要具备两个条件：

- 实现的这个 requestIdleCallback，可以主动让出控制权，让浏览器去渲染视图
- 一次事件循环只执行一次，执行一次后，请求下一次的时间片

能够满足上述条件的，只有宏任务，在下次事件循环中执行，一次只执行一个宏任务，不会阻塞浏览器更新。

#### setTimeout(fn, 0)

setTimeout(fn, 0) 可以满足上述条件，为什么 react 没有选择用它实现调度呢？原因是递归执行 setTimeout(fn, 0)，最后间隔时间会变成 4ms 左右，而不是最初的 0ms (💡：Q2)。

```javascript
let time = 0;
let nowTime = +new Date();
let timer;
const poll = function () {
  timer = setTimeout(() => {
    const lastTime = nowTime;
    nowTime = +new Date();
    console.log("递归setTimeout(fn,0)产生时间差：", nowTime - lastTime);
    poll();
  }, 0);
  time++;
  if (time === 20) clearTimeout(timer);
};
poll();
```

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/hooks/img_19.png" alt="" width="100%" />

#### MessageChannel

react 团队可能是注意到 setTimeout 的这 4ms 有点过于铺张浪费，采用了一种新的方式去实现：MessageChannel (💡：Q4)。

MessageChannel 允许开发者创建一个新的消息通道，并通过它的两个 MessagePort 属性发送数据。

- MessagePort.port1 只读返回 channel 的 port1
- MessagePort.port2 只读返回 channel 的 port2

模拟 MessageChannel 触发异步宏任务：

```javascript
let scheduledHostCallback = null;
/* 建立一个消息通道 */
var channel = new MessageChannel();
/* 建立一个 port 发送消息 */
var port = channel.port2;

channel.port1.onmessage = function () {
  /* 执行任务 */
  scheduledHostCallback();
  /* 执行完毕，清空任务 */
  scheduledHostCallback = null;
};
/* 向浏览器请求执行更新任务 */
requestHostCallback = function (callback) {
  scheduledHostCallback = callback;
  if (!isMessageLoopRunning) {
    isMessageLoopRunning = true;
    port.postMessage(null);
  }
};
```

- 在一次更新中，react 会调用 requestHostCallback，把更新任务赋值给 scheduledHostCallback，然后 port2 向 port1 发起 postMessage 通知
- port1 会通过 onmessage 接收来自 port2 的消息，执行更新任务 scheduledHostCallback，执行完毕清空任务，借此达到异步执行的目的

## 异步调度原理

react 发生一次更新，会统一走 ensureRootIsScheduled(调度应用) (💡：Q1)。

- 对于正常的同步更新会走 performSyncWorkOnRoot 逻辑，最后会走 workLoopSync
- 对于低优的异步更新会走 performConcurrentWorkOnRoot 逻辑，最后会走 workLoopConcurrent

workLoopSync：

```javascript
function workLoopSync() {
  while (workInProgress !== null) {
    workInProgress = performUnitOfWork(workInProgress);
  }
}
```

workLoopConcurrent：

```javascript
function workLoopConcurrent() {
  while (workInProgress !== null && !shouldYield()) {
    workInProgress = performUnitOfWork(workInProgress);
  }
}
```

在一次更新调度中，workLoop 会更新执行每一个待更新的 fiber。

区别是异步模式会调用一个 shouldYield 函数，如果浏览器当前没有空闲时间，shouldYield 会跳出循环，直到浏览器有空闲时间后再继续遍历，从而达到终止渲染的目的。

这样就解决了一次性遍历大量的 fiber，导致浏览器没有时间执行渲染任务，造成页面卡顿。

### scheduleCallback

无论是正常的同步更新任务 workLoopSync 还是低优的异步更新任务 workLoopConcurrent，都是由调度器 scheduleCallback 统一调度，那么两者在进入调度器时有什么区别呢？

对于正常的同步更新任务：

```javascript
scheduleCallback(Immediate, workLoopSync);
```

对于低优的异步更新任务：

```javascript
/* 计算超时等级，就是上面那五个等级 */
var priorityLevel = inferPriorityFromExpirationTime(
  currentTime,
  expirationTime
);
scheduleCallback(priorityLevel, workLoopConcurrent);
```

低优的异步更新任务的处理，会比正常更新任务多一个超时等级的概念。

scheduleCallback 做了什么呢？

```javascript
function scheduleCallback() {
  /* 计算过期时间：超时时间  = 开始时间（现在时间） + 任务超时的时间（上述设置那五个等级） */
  const expirationTime = startTime + timeout;
  /* 创建一个新任务 */
  const newTask = {
    /* do something */
  };
  if (startTime > currentTime) {
    /* 通过开始时间排序 */
    newTask.sortIndex = startTime;
    /* 把任务放在 timerQueue 中 */
    push(timerQueue, newTask);
    /*  执行 setTimeout */
    requestHostTimeout(handleTimeout, startTime - currentTime);
  } else {
    /* 通过 expirationTime 排序  */
    newTask.sortIndex = expirationTime;
    /* 把任务放入 taskQueue */
    push(taskQueue, newTask);
    /* 没有处于调度中的任务，向浏览器请求一帧，浏览器空闲执行 flushWork */
    if (!isHostCallbackScheduled && !isPerformingWork) {
      isHostCallbackScheduled = true;
      requestHostCallback(flushWork);
    }
  }
}
```

对于调度本身：

- timerQueue：里面存的都是没有过期的任务，根据任务的开始时间排序，在调度 workLoop 中会用 advanceTimers 检查任务是否过期，如果过期了，放入 taskQueue
- taskQueue：里面存的都是过期的任务，根据任务的过期时间排序，需要在调度的 workLoop 中循环执行这些任务

scheduleCallback 流程如下：

- 创建一个新的任务 newTask
- 通过任务的开始时间和当前时间进行比较，如果开始时间大于当前时间，则说明未过期，存到 timerQueue；否则说明任务已过期，存到 taskQueue
- 如果任务过期并且没有调度中的任务，那么调度 requestHostCallback，本质上调度的是 flushWork
- 如果任务没有过期，调用 requestHostTimeout 延时执行 handleTimeout

### requestHostTimeout

当一个任务没有过期，react 会把它存到 timerQueue，但是它什么时候过期呢？

Scheduler 用 requestHostTimeout 来让一个处于未过期状态的任务恰好达到过期的状态，只需要延迟 startTime - currentTime 毫秒就可以了。

requestHostTimeout 就是通过 setTimeout 来进行延迟指定时间的：

```javascript
requestHostTimeout = function (cb, ms) {
  _timeoutID = setTimeout(cb, ms);
};

cancelHostTimeout = function () {
  clearTimeout(_timeoutID);
};
```

- requestHostTimeout 用于延时执行 handleTimeout
- cancelHostTimeout 用于清除当前的定时器

### handleTimeout

延时指定时间后，调用 handleTimeout，handleTimeout 会把任务重新放在 requestHostCallback 中调度。

```javascript
function handleTimeout() {
  isHostTimeoutScheduled = false;
  /* 将 timerQueue 中过期的任务，放在 taskQueue 中 */
  advanceTimers(currentTime);
  /* 如果没有处于调度中的任务 */
  if (!isHostCallbackScheduled) {
    /* 判断有没有过期的任务 */
    if (peek(taskQueue) !== null) {
      isHostCallbackScheduled = true;
      /* 开启调度任务 */
      requestHostCallback(flushWork);
    }
  }
}
```

- 通过 advanceTimers 将 timerQueue 中的过期任务转移到 taskQueue
- 然后调用 requestHostCallback 调度过期的任务

### advanceTimers

```javascript
function advanceTimers() {
  var timer = peek(timerQueue);
  while (timer !== null) {
    if (timer.callback === null) {
      pop(timerQueue);
    } else if (timer.startTime <= currentTime) {
      /* 如果任务已经过期，那么将 timerQueue 中的过期任务，放入 taskQueue */
      pop(timerQueue);
      // 排序
      timer.sortIndex = timer.expirationTime;
      push(taskQueue, timer);
    }
  }
}
```

如果任务已经过期，那么将 timerQueue 中的过期任务放入到 taskQueue。

### flushWork 和 workloop

通过上面的所有信息，要搞清楚两件事：

- 第一件事是 react 中的更新任务最后都是放在 taskQueue 中的
- 第二件事是 requestHostCallback 放入 MessageChannel 中的回调函数是 flushWork

flushWork：

```javascript
function flushWork(){
/* 如果有延时任务执行，那么先暂停延时任务 */
  if (isHostTimeoutScheduled) {
    isHostTimeoutScheduled = false;
    cancelHostTimeout();
  }
  try{
     /* workLoop 执行超时的更新任务  */
     workLoop(hasTimeRemaining, initialTime);
  }
}
```

flushWork 如果有延时任务执行的话，那么先暂停延时任务，调用 workLoop，去真正执行超时的更新任务

workLoop：

```javascript
function workLoop() {
  var currentTime = initialTime;
  advanceTimers(currentTime);
  /* 获取任务列表中的第一个 */
  currentTask = peek();
  while (currentTask !== null) {
    /* 真正的更新函数 callback */
    var callback = currentTask.callback;
    if (callback !== null) {
      /* 执行更新 */
      callback();
      /* 再看一下 timerQueue 中有没有过期任务 */
      advanceTimers(currentTime);
    }
    /* 再一次获取任务，循环执行 */
    currentTask = peek(taskQueue);
  }
}
```

workLoop 会依次执行 taskQueue 中的更新任务，到此为止，完成整个调度过程。

### shouldYield 中止 workloop

在 fiber 的异步更新任务 workLoopConcurrent，每一个 fiber 的 workLoop 都会调用 shouldYield 来判断是否有超时更新的任务，如果有，则停止 workLoop。

```javascript
function unstable_shouldYield() {
  var currentTime = exports.unstable_now();
  advanceTimers(currentTime);
  /* 获取第一个任务 */
  var firstTask = peek(taskQueue);
  return (
    (firstTask !== currentTask &&
      currentTask !== null &&
      firstTask !== null &&
      firstTask.callback !== null &&
      firstTask.startTime <= currentTime &&
      firstTask.expirationTime < currentTask.expirationTime) ||
    shouldYieldToHost()
  );
}
```

如果存在第一个更新任务并且已经超时了，shouldYield 会返回 true，这会中止 fiber 的 workLoop。

## 调度流程图

整个调度流程，用一张图来表示 (💡：Q5)：

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/hooks/img_20.png" alt="" width="100%" />

## 总结

本篇学习了 react 异步调度原理和流程，下一篇将学习 react 调和原理和流程。
