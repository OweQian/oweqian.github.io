---
title: "📝 react 原理篇 - 事件原理（v18）"
date: 2024-05-20T16:50:10+08:00
tags: ["react"]
categories: ["react"]
---

本篇是 react 原理系列的第三篇 - 事件原理（v18），上一篇我们讲了 v16/v17 的事件原理，v18 对事件系统进行了调整。

<!--more-->

v16/v17 的事件原理存在一个问题，捕获阶段和冒泡阶段的事件都是模拟的，本质上都是在冒泡阶段执行的，比如：

```javascript
function Index() {
  const refObj = React.useRef(null);
  useEffect(() => {
    const handler = () => {
      console.log("目标阶段");
    };
    refObj.current.addEventListener("click", handler);
    return () => {
      refObj.current.removeEventListener("click", handler);
    };
  }, []);
  const handleClick = () => {
    console.log("冒泡阶段执行");
  };
  const handleCaptureClick = () => {
    console.log("捕获阶段执行");
  };
  return (
    <button
      ref={refObj}
      onClick={handleClick}
      onClickCapture={handleCaptureClick}
    >
      点击
    </button>
  );
}
```

通过 onClick、onClickCapture、原生 DOM 监听器给元素 button 绑定了三个事件处理函数，当触发一次点击事件的时候，处理函数执行，打印顺序为：

目标阶段 -> 捕获阶段执行 -> 冒泡阶段执行

v16/v17 的事件系统，在一定程度上并不符合事件流的执行时机。新版本 v18 的事件系统中，这个问题得以解决。

v18 打印顺序为：

捕获阶段执行 -> 目标阶段 -> 冒泡阶段执行

那么，新版本事件系统有哪些改变呢？主要体现在两个方面：事件绑定和事件触发。

## 事件绑定

v18 的事件系统会在 container 上一口气注册完全部事件：

```javascript
function createRoot(container, options) {
  /* 省去和事件无关的代码，通过如下方法注册事件 */
  listenToAllSupportedEvents(rootContainerElement);
}
```

在 createRoot 中通过 listenToAllSupportedEvents 注册事件：

```javascript
function listenToAllSupportedEvents(rootContainerElement) {
  /* allNativeEvents 是一个 set 集合，保存了大多数的浏览器事件 */
  allNativeEvents.forEach(function (domEventName) {
    if (domEventName !== "selectionchange") {
      /* nonDelegatedEvents 保存了 js 中，不冒泡的事件 */
      if (!nonDelegatedEvents.has(domEventName)) {
        /* 在冒泡阶段绑定事件 */
        listenToNativeEvent(domEventName, false, rootContainerElement);
      }
      /* 在捕获阶段绑定事件 */
      listenToNativeEvent(domEventName, true, rootContainerElement);
    }
  });
}
```

listenToAllSupportedEvents 主要目的就是通过 listenToNativeEvent 绑定浏览器事件，这里引用了两个常量：allNativeEvents 和 nonDelegatedEvents，它们代表的意思如下：

- allNativeEvents：allNativeEvents 是一个 set 集合，保存了 81 个浏览器常用事件

- nonDelegatedEvents：nonDelegatedEvents 也是一个集合，保存了浏览器中不会冒泡的事件，一般指媒体事件，如 pause、play、playing 等，还有一些特殊事件，如 cancel、close、invalid、load、scroll 等

listenToNativeEvent 主要逻辑如下：

```javascript
var listener = dispatchEvent.bind(null, domEventName);
if (isCapturePhaseListener) {
  target.addEventListener(eventType, dispatchEvent, true);
} else {
  target.addEventListener(eventType, dispatchEvent, false);
}
```

isCapturePhaseListener 是 listenToNativeEvent 的第二个参数，target 为 DOM 对象，dispatchEvent 为统一的事件处理函数。

listenToNativeEvent 本质上就是向原生 DOM 注册事件，另外，dispatchEvent 也通过 bind 的方式将事件名称等信息保存下来了。

经过这一步，在初始化阶段，就已经注册了将近全部的事件监听器。

此时如果发生一次点击事件，就会触发两次 dispatchEvent：

- 第一次是捕获阶段的点击事件
- 第二次是冒泡阶段的点击事件

## 事件触发

当触发一次点击事件，首先就是执行统一的事件处理函数 dispatchEvent，我们来看看这个函数主要做了什么：

```javascript
batchedUpdates(function () {
  return dispatchEventsForPlugins(
    domEventName,
    eventSystemFlags,
    nativeEvent,
    ancestorInst
  );
});
```

dispatchEvent 会通过 batchedUpdates 来处理 dispatchEventsForPlugins，batchedUpdates 是批量更新的逻辑，在上一篇中已经讲到通过这种方式来让更新变成可控的。

```javascript
function dispatchEventsForPlugins(
  domEventName,
  eventSystemFlags,
  nativeEvent,
  targetInst,
  targetContainer
) {
  /* 找到发生事件的元素——事件源 */
  var nativeEventTarget = getEventTarget(nativeEvent);
  /* 待更新队列 */
  var dispatchQueue = [];
  /* 找到待执行的事件 */
  extractEvents(
    dispatchQueue,
    domEventName,
    targetInst,
    nativeEvent,
    nativeEventTarget,
    eventSystemFlags
  );
  /* 执行事件 */
  processDispatchQueue(dispatchQueue, eventSystemFlags);
}
```

首先通过 getEventTarget 找到发生事件的 DOM 元素，也就是事件源。然后创建一个待更新的事件队列，接着通过 extractEvents 找到待执行的事件，然后通过 processDispatchQueue 执行事件。

举个 🌰：

```javascript
function Index() {
  const handleClick = () => {
    console.log("冒泡阶段执行");
  };
  const handleCaptureClick = () => {
    console.log("捕获阶段执行");
  };
  const handleParentClick = () => {
    console.log("div 点击事件");
  };
  return (
    <div onClick={handleParentClick}>
      <button onClick={handleClick} onClickCapture={handleCaptureClick}>
        点击
      </button>
    </div>
  );
}
```

当点击按钮，触发一次点击事件时，nativeEventTarget 本质上就是发生点击事件的 button 对应的 DOM 元素。

那么 dispatchQueue 是什么？extractEvents 又是如何处理 dispatchQueue？

v18 中，发生点击事件，会触发两次 dispatchEvent，第一次是捕获阶段，第二次是冒泡阶段，我们分别打印一下 dispatchQueue：

- 第一次打印：

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/hooks/img_14.png" alt="" width="100%" />

- 第二次打印：

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/hooks/img_15.png" alt="" width="100%" />

可以看到 dispatchQueue 只有一项元素，也就是产生一次事件就会向 dispatchQueue 放入一个对象，对象中有两个状态，一个是 event，一个是 listeners。

event 是通过事件插件合成的事件源 event，在 react 事件系统中，事件源不是原生的事件源，是 react 自己创建的事件源对象。不同的事件类型，会创建不同的事件源对象。

在 extractEvents 中，有这么一段处理逻辑：

```javascript
var SyntheticEventCtor = SyntheticEvent;
/* 针对不同的事件，处理不同的事件源 */
switch (domEventName) {
  case "keydown":
  case "keyup":
    SyntheticEventCtor = SyntheticKeyboardEvent;
    break;
  case "focusin":
    reactEventType = "focus";
    SyntheticEventCtor = SyntheticFocusEvent;
    break;
  // ...
}
/* 找到事件监听者，也就是 onClick 绑定的事件处理函数 */
var _listeners = accumulateSinglePhaseListeners(
  targetInst,
  reactName,
  nativeEvent.type,
  inCapturePhase,
  accumulateTargetOnly
);
/* 向 dispatchQueue 添加 event 和 listeners  */
if (_listeners.length > 0) {
  var _event = new SyntheticEventCtor(
    reactName,
    reactEventType,
    null,
    nativeEvent,
    nativeEventTarget
  );
  dispatchQueue.push({
    event: _event,
    listeners: _listeners,
  });
}
```

首先，根据不同的事件类型，选用不同的构造函数，通过 new 一个实例的方式去合成不同的事件源对象。

\_listeners 是一个数组对象，对象里面有三个属性：

- currentTarget：发生事件的 DOM 元素，即事件源
- instance：DOM 元素对应的 fiber 元素
- listener：一个数组，存放绑定的事件处理函数本身

接下来通过 DOM 元素找到对应的 fiber，找到 fiber，也就能找到 props 事件。

这里有一个细节，listeners 可以有多个，比如上述捕获阶段的 listeners 只有一个（button 有 onClickCapture 事件），而冒泡阶段的 listeners 有两个（：div、button 都有 onClick 事件）。

总结：

当发生一次点击事件，react 会根据事件源对应的 fiber 对象，依据 return 指针向上遍历，收集所有相同类型的事件，比如 onClick，就收集父级元素的所有 onClick 事件；比如 onClickCapture，那就收集父级元素的所有 onClickCapture 事件。

有了 dispatchQueue 后，就需要通过 processDispatchQueue 执行事件了，这个函数的内部会经历两次遍历：

- 第一次遍历 dispatchQueue，通常情况下，只有一个事件类型，所以 dispatchQueue 中只有一个元素
- 第二次遍历每一个元素的 listeners，执行 listener 时有一个特点：

```javascript
/* 如果在捕获阶段执行。 */
if (inCapturePhase) {
  for (var i = dispatchListeners.length - 1; i >= 0; i--) {
    var _dispatchListeners$i = dispatchListeners[i],
      instance = _dispatchListeners$i.instance,
      currentTarget = _dispatchListeners$i.currentTarget,
      listener = _dispatchListeners$i.listener;

    if (instance !== previousInstance && event.isPropagationStopped()) {
      return;
    }

    /* 执行事件 */
    executeDispatch(event, listener, currentTarget);
    previousInstance = instance;
  }
} else {
  for (var _i = 0; _i < dispatchListeners.length; _i++) {
    var _dispatchListeners$_i = dispatchListeners[_i],
      _instance = _dispatchListeners$_i.instance,
      _currentTarget = _dispatchListeners$_i.currentTarget,
      _listener = _dispatchListeners$_i.listener;

    if (_instance !== previousInstance && event.isPropagationStopped()) {
      return;
    }
    /* 执行事件 */
    executeDispatch(event, _listener, _currentTarget);
    previousInstance = _instance;
  }
}
```

在 executeDispatch 中会负责执行事件处理函数，也就是上面的 handleClick、handleParentClick 等。

请注意，如果是捕获阶段，listeners 中的函数会从后往前执行；如果是冒泡阶段，listeners 中的函数会从前往后执行，这样来模拟出捕获阶段先父后子，冒泡阶段先子后父。

如果触发了阻止冒泡事件，那么事件源就能感知到，通过 event.isPropagationStopped() 来判断是否阻止冒泡，如果阻止就会退出事件函数的执行，以此来模拟事件流的执行过程以及阻止事件冒泡。

## 总结

关于 react 事件原理的所有内容就到这里，用一幅图来总结下新老版本的事件系统在每个阶段的区别。

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/hooks/img_16.png" alt="" width="100%" />
