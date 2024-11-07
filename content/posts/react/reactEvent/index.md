---
title: "📜 解读 react 原理系列 - 事件（v16/v17/v18）"
date: 2024-01-20T14:16:51+08:00
tags: ["react"]
categories: ["react"]
---

本篇文章是解读 react 原理系列的第一篇 - 事件（v16/v17/v18），请带着问题来阅读，效果更佳。

<!--more-->

首先我们来思考几个问题：

🤔 Q1: react 为什么要有自己的事件系统？  
🤔 Q2: 什么是事件合成？  
🤔 Q3: 如何实现的批量更新？  
🤔 Q4: 事件系统如何模拟冒泡和捕获阶段？  
🤔 Q5: 如何通过 DOM 元素找到与之匹配的 fiber？  
🤔 Q6: 为什么不能用 return false 来阻止事件的默认行为？  
🤔 Q7: 事件是绑定在真实的 DOM 上吗？如果不是，又绑定在哪里？  
🤔 Q8: v17 对事件系统有哪些改变？  
🤔 Q9: v18 对事件系统有哪些改变？

首先，在 react 应用中，我们所看到的 react 事件都是 "假" 的！

- 给元素绑定的事件处理函数，不是真正的事件处理函数
- 在冒泡/捕获阶段绑定的事件，也不是在冒泡/捕获阶段执行的
- 在事件处理函数中拿到的事件源 e，也不是真正的事件源 e

想一下，react 为什么要有自己的事件系统 (💡：Q1)？

首先，对于不同的浏览器，对事件存在不同的兼容性，react 想实现一个兼容全浏览器的框架，为了实现这个目标就需要创建一个兼容全浏览器的事件系统，以此来抹平不同浏览器的差异。

其次，v17 之前 react 事件都是绑定在 document 上，v17 之后 react 把事件绑定在应用对应的容器 container 上 (💡：Q7、Q8)。

将事件绑定在同一容器统一管理，防止很多事件直接绑定在原生 DOM 元素上，造成一些不可控的情况。

由于不是绑定在真实的 DOM 上，所有 react 需要模拟一套事件系统：事件捕获 -> 目标阶段 -> 事件冒泡，包括重写事件源对象 event。

## v16/v17

### 事件处理

#### 冒泡阶段和捕获阶段

```javascript
export default function Index() {
  const handleClick = () => {
    console.log("模拟冒泡阶段执行");
  };
  const handleClickCapture = () => {
    console.log("模拟捕获阶段执行");
  };
  return (
    <div>
      <button onClick={handleClick} onClickCapture={handleClickCapture}>
        点击
      </button>
    </div>
  );
}
```

- 冒泡阶段：正常给 react 绑定的事件，如 onClick、onChange，默认会在模拟冒泡阶段执行
- 捕获阶段：在事件后面加上 Capture 后缀，如 onClickCapture、onChangeCapture，默认会在模拟捕获阶段执行

#### 阻止冒泡

react 中如果想要阻止事件向上冒泡，可以用 e.stopPropagation()。

```javascript
export default function Index() {
  const handleClick = (e) => {
    /**
     * 阻止事件冒泡
     * handleFatherClick 事件将不再触发
     */
    e.stopPropagation();
  };
  const handleFatherClick = () => console.log("冒泡到父级");
  return (
    <div onClick={handleFatherClick}>
      <div onClick={handleClick}>点击</div>
    </div>
  );
}
```

react 阻止冒泡和原生事件中的写法差不多，但是底层原理完全不同。

#### 阻止默认行为

react 中阻止默认行为和原生事件也有一些区别。

在原生事件中，e.preventDefault() 和 return false 都可以用来阻止事件默认行为，由于在 react 中给元素绑定的事件处理函数并不是真正的事件处理函数，所以导致 return false 在 react 应用中完全失去了作用 (💡：Q6)。

在 react 中，用 e.preventDefault() 阻止事件默认行为，这个方法并非是原生事件的 preventDefault，react 事件源 e 是独立组建的，preventDefault 也是单独处理的。

### 事件合成

react 事件系统可以分为三个部分：

- 第一部分是事件合成系统，初始化会注册不同的事件插件
- 第二部分是在渲染过程中，对标签中的事件进行收集，向 document/container 注册事件
- 第三部分是用户交互 -> 事件触发 -> 事件执行的一系列过程

#### 事件合成概念

什么是事件合成？ (💡：Q2)

比如在 react 中绑定一个事件：

```javascript
export default function Index() {
  const handleClick = () => {};
  return (
    <div>
      <button onClick={handleClick}>点击</button>
    </div>
  );
}
```

在 button 元素绑定的事件中，没有找到 handleClick 事件，但在 document 上绑定了一个 onclick 事件，如下：

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/hooks/img_07.png" alt="" width="100%" />

再添加一个 input 并绑定一个 onChange 事件：

```javascript
export default function Index() {
  const handleClick = () => {};
  const handleChange = () => {};
  return (
    <div>
      <input onChange={handleChange} />
      <button onClick={handleClick}>点击</button>
    </div>
  );
}
```

在 input 元素上没有找到绑定的事件 handleChange，但是 document 的事件如下：

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/hooks/img_08.png" alt="" width="100%" />

多了 blur、change、focus、keydown、keyup 等事件。

总结：

- react 的事件不是绑定在 DOM 元素上，而是统一绑定在顶部容器上，v17 之前绑定在 document 上，v17 后绑定在 container 容器上，有利于存在多个应用
- 绑定事件不是一次性绑定所有事件，如发现了 onClick 事件，就会绑定 click 事件，发现 onChange 事件，就会绑定 [blur, change, focus, keydown, keyup] 等多个事件

事件合成的概念：在 react 应用中，元素绑定的事件并不是原生事件，而是 react 合成的事件，比如 onClick 是由 click 合成，onChange 是由 blur、change、focus、keydown、keyup 等多个事件合成。

#### 事件插件机制

在 react 中有一套事件插件机制，比如上述的 onClick、onChange，会有不同的事件插件 SimpleEventPlugin、ChangeEventPlugin 处理，先不必关心事件插件做了什么，只需先记住两个对象。

- registrationNameModules：

```javascript
const registrationNameModules = {
  onBlur: SimpleEventPlugin,
  onClick: SimpleEventPlugin,
  onClickCapture: SimpleEventPlugin,
  onChange: ChangeEventPlugin,
  onChangeCapture: ChangeEventPlugin,
  onMouseEnter: EnterLeaveEventPlugin,
  onMouseLeave: EnterLeaveEventPlugin,
  // ...
};
```

registrationNameModules 记录了 react 事件和之对应的处理插件的映射，应用于事件触发阶段，根据不同事件使用不同的插件。

❓ 为什么要用不同的事件插件处理不同的 react 事件？  
💡 对于不同的事件，有不同的处理逻辑，对应的事件源对象也有所不同，react 的事件和事件源都是自己合成的，所以对于不同事件需要不同的事件插件处理。

- registrationNameDependencies：

```javascript
const registrationNameDependencies = {
  onBlur: ["blur"],
  onClick: ["click"],
  onClickCapture: ["click"],
  onChange: [
    "blur",
    "change",
    "click",
    "focus",
    "input",
    "keydown",
    "keyup",
    "selectionchange",
  ],
  onMouseEnter: ["mouseout", "mouseover"],
  onMouseLeave: ["mouseout", "mouseover"],
  // ...
};
```

registrationNameDependencies 保存了 react 事件和原生事件的对应关系，这就解释了为什么只写了一个 onChange，会有很多原生事件绑定在 document 上。在事件绑定阶段，如果发现有 onChange，就会找到对应的原生事件数组，逐一绑定。

### 事件绑定

所谓事件绑定，就是在 react 处理 props 时，如果遇到事件比如 onClick，就会通过 addEventListener 注册原生事件。

先来想一个问题，还是上述的 demo，给元素绑定的事件 handleClick ，handleChange ，最后去了哪里呢？

```tsx
export default function Index() {
  const handleClick = () => console.log('点击事件')
  const handleChange = () => console.log('change事件)
  return <div>
    <input onChange={ handleChange } />
    <button onClick={ handleClick }>点击</button>
  </div>
}
```

对于如上结构，onChange 和 onClick 会保存在对应 DOM 元素类型 fiber 对象（HostComponent）的 memoizedProps 属性上：

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/hooks/img_09.png" alt="" width="100%" />

接下来 react 根据事件注册事件监听器：

```javascript
function diffProperties() {
  /* 判断当前的 propKey 是不是 react 合成事件 */
  if (registrationNameModules.hasOwnProperty(propKey)) {
    /* 这里多个函数简化了，如果是合成事件，传入事件名称 onClick，向 document 注册事件  */
    legacyListenToEvent(registrationName, document);
  }
}
```

diffProperties 函数在 diff props 时，如果发现是合成事件（onClick）就会调用 legacyListenToEvent 函数，注册事件监听器。

```javascript
function legacyListenToEvent(registrationName，mountAt){
// 根据 onClick 获取 onClick 依赖的事件数组 ['click']
   const dependencies = registrationNameDependencies[registrationName];
    for (let i = 0; i < dependencies.length; i++) {
    const dependency = dependencies[i];
    //  addEventListener 绑定事件监听器
    // ...
  }
}
```

应用 registrationNameDependencies 对 react 合成事件分别绑定原生事件的事件监听器。比如发现是 onChange，那么取出 ['blur', 'change', 'click', 'focus', 'input', 'keydown', 'keyup', 'selectionchange'] 遍历绑定。

❓ 绑定在 document 的事件处理函数是 handleClick、handleChange 吗？

💡 答案是否定的，绑定在 document 上的事件处理函数，是 react 统一的事件处理函数 dispatchEvent，react 需要一个统一流程去代理事件逻辑，包括 react 批量更新等逻辑。

只要是 react 事件触发，首先执行的就是 dispatchEvent，那么，dispatchEvent 是如何知道是什么事件触发的呢？在注册时，就已经通过 bind，把参数绑定给 dispatchEvent 了。

比如绑定 click 事件：

```javascript
const listener = dispatchEvent.bind(null, "click", eventSystemFlags, document);
/* 重要, 这里进行真正的事件绑定。*/
document.addEventListener("click", listener, false);
```

### 事件触发

假设 DOM 结构是这样的：

```javascript
export default function Index() {
  const handleClick1 = () => console.log(1);
  const handleClick2 = () => console.log(2);
  const handleClick3 = () => console.log(3);
  const handleClick4 = () => console.log(4);
  return (
    <div onClick={handleClick3} onClickCapture={handleClick4}>
      <button onClick={handleClick1} onClickCapture={handleClick2}>
        点击
      </button>
    </div>
  );
}
```

点击按钮，触发点击事件，在整个 react 事件系统中，流程是这样的：

- 第一步：批量更新开关

触发点击事件，执行 dispatchEvent，dispatchEvent 执行时会传入真实的事件源 button 元素本身，通过元素可以找到 button 对应的 fiber，那么 fiber 和原生 DOM 之间是如何建立联系的呢 (💡：Q5)？

react 在初始化真实 DOM 时，会用一个随机的 key internalInstanceKey 指针指向当前 DOM 对应的 fiber 对象，而 fiber 对象会用 stateNode 指向当前的 DOM 元素。

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/hooks/img_10.png" alt="" width="100%" />

接下来是批量更新环节 (💡：Q3)：

```javascript
export function batchedEventUpdates(fn, a) {
  isBatchingEventUpdates = true; //打开批量更新开关
  try {
    fn(a); // 事件在这里执行
  } finally {
    isBatchingEventUpdates = false; //关闭批量更新开关
  }
}
```

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/hooks/img_11.png" alt="" width="100%" />

- 第二步：合成事件源

接下来会通过 onClick 找到对应的事件插件 SimpleEventPlugin，合成新的事件源 e，里面包含了 preventDefault 和 stopPropagation 等方法。

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/hooks/img_12.png" alt="" width="100%" />

- 第三步：形成事件执行队列

在第一步通过原生 DOM 获取对应的 fiber，接着从这个 fiber 向上遍历，遇到元素类型 (HostComponent) 的 fiber，就会收集事件，react 用一个数组来收集事件 (💡：Q4)：

- 如果遇到捕获阶段事件如 onClickCapture，就会 unshift 放在数组前面，以此模拟事件捕获阶段
- 如果遇到冒泡阶段事件如 onClick，就会 push 到数组后面，以此模拟事件冒泡阶段
- 一直收集到最顶端，形成事件执行队列，在接下来的阶段，依次执行队列里面的函数

```javascript
while (instance !== null) {
  const { stateNode, tag } = instance;
  if (tag === HostComponent && stateNode !== null) {
    /* DOM 元素 */
    const currentTarget = stateNode;
    if (captured !== null) {
      /* 事件捕获 */
      /* 在事件捕获阶段, 真正的事件处理函数 */
      const captureListener = getListener(instance, captured); // onClickCapture
      if (captureListener != null) {
        /* 对应发生在事件捕获阶段的处理函数，逻辑是将执行函数 unshift 添加到队列的最前面 */
        dispatchListeners.unshift(captureListener);
      }
    }
    if (bubbled !== null) {
      /* 事件冒泡 */
      /* 事件冒泡阶段，真正的事件处理函数 */
      const bubbleListener = getListener(instance, bubbled); // onClick
      if (bubbleListener != null) {
        /* 对应发生在事件冒泡阶段的处理函数，逻辑是将执行函数 push 添加到队列的最后面 */
        dispatchListeners.push(bubbleListener);
      }
    }
  }
  // 向上遍历
  instance = instance.return;
}
```

那么，点击一次按钮，4 个事件的执行顺序是这样的：

- 首先，第一次收集是在 button 上，handleClick1 冒泡事件 push 处理，handleClick2 捕获事件 unshift 处理，形成结构 [handleClick2, handleClick1]

* 接着向上收集，遇到父级 div，收集父级 div 上的事件，handleClick3 冒泡事件 push 处理，handleClick4 捕获事件 unshift 处理，形成结构 [handleClick4, handleClick2, handleClick1, handleClick3]

* 依次执行数组里面的事件，打印 4 2 1 3

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/hooks/img_13.png" alt="" width="100%" />

那么，react 是如何组织事件冒泡的呢？来看一下事件队列是怎么执行的：

```javascript
function runEventsInBatch() {
  const dispatchListeners = event._dispatchListeners;
  if (Array.isArray(dispatchListeners)) {
    for (let i = 0; i < dispatchListeners.length; i++) {
      if (event.isPropagationStopped()) {
        /* 判断是否已经阻止事件冒泡 */
        break;
      }
      dispatchListeners[i](event); /* 执行真正的处理函数 handleClick1... */
    }
  }
}
```

对于上述事件队列 [handleClick4, handleClick2, handleClick1, handleClick3]：

假设在 handleClick2 中调用 e.stopPropagation()，那么事件源里将有一个状态证明此次事件已经停止冒泡，下次遍历时，event.isPropagationStopped() 就会返回 true，这将跳出循环，handleClick1, handleClick3 将不再执行，这就模拟了阻止事件冒泡的过程。

## v18

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

那么，新版本事件系统有哪些改变呢？主要体现在两个方面：事件绑定和事件触发 (💡：Q9)。

### 事件绑定

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

### 事件触发

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
