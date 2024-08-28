---
title: "📝 解读 ahooks 源码系列 - Effect 篇"
date: 2023-09-27T16:20:04+08:00
tags: ["ahooks"]
categories: ["ahooks"]
---

本篇文章是解读 ahooks@3.8.0 源码系列的第五篇 - Effect 篇，欢迎您的指正和点赞。

<!--more-->

本文主要解读 useUpdateEffect、useUpdateLayoutEffect、useAsyncEffect、useDebounceEffect、useDebounceFn、useThrottleFn、useThrottleEffect、useDeepCompareEffect、useDeepCompareLayoutEffect、useInterval、useRafInterval、useTimeout、useRafTimeout、useLockFn、useUpdate 的源码实现。

## useUpdateEffect

[文档地址](https://ahooks.js.org/zh-CN/hooks/use-update-effect)

[详细代码](https://github.com/alibaba/hooks/blob/master/packages/hooks/src/useUpdateEffect/index.ts)

```tsx
import { useEffect } from "react";
import { createUpdateEffect } from "../createUpdateEffect";

export default createUpdateEffect(useEffect);
```

```tsx
import { useRef, type useEffect, type useLayoutEffect } from "react";

type EffectHookType = typeof useEffect | typeof useLayoutEffect;

export const createUpdateEffect: (hook: EffectHookType) => EffectHookType =
  (hook) => (effect, deps) => {
    // isMounted 标识符，判断组件是否已经挂载
    const isMounted = useRef(false);

    // for react-refresh
    hook(() => {
      return () => {
        isMounted.current = false;
      };
    }, []);

    hook(() => {
      // 首次挂载，isMounted 置为 true
      if (!isMounted.current) {
        isMounted.current = true;
      } else {
        // 只有 isMounted 为 true 时（更新），执行回调函数
        return effect();
      }
    }, deps);
  };
```

## useUpdateLayoutEffect

[文档地址](https://ahooks.js.org/zh-CN/hooks/use-update-layout-effect)

[详细代码](https://github.com/alibaba/hooks/blob/master/packages/hooks/src/useUpdateLayoutEffect/index.ts)

```tsx
import { useLayoutEffect } from "react";
import { createUpdateEffect } from "@/hooks/createUpdateEffect";

export default createUpdateEffect(useLayoutEffect);
```

## useAsyncEffect

[文档地址](https://ahooks.js.org/zh-CN/hooks/use-async-effect)

[详细代码](https://github.com/alibaba/hooks/blob/master/packages/hooks/src/useAsyncEffect/index.ts)

useEffect 的回调函数中使用 async … await … 时，会报错。

effect function 应该返回一个销毁函数（effect：是指 return 返回的 cleanup 函数），如果 useEffect 第一个参数传入 async，返回值则变成了 Promise，会导致 react 在调用销毁函数的时候报错。

这个返回值是异步的，这样无法预知代码的执行情况，很容易出现难以定位的 Bug。所以 React 就直接限制在 useEffect 回调函数中使用 async...await…

❓ useEffect 怎么支持 async…await…

- 创建一个异步函数，然后执行该函数

```tsx
useEffect(() => {
  const asyncFun = async () => {
    setPass(await mockCheck());
  };
  asyncFun();
}, []);
```

- 使用 IIFE

```tsx
useEffect(() => {
  (async () => {
    setPass(await mockCheck());
  })();
}, []);
```

- 自定义 hooks - useAsyncEffect

```tsx
import { isFunction } from "@/utils";
import { type DependencyList, useEffect } from "react";

const isAsyncGenerator = (
  val: AsyncGenerator<void, void, void> | Promise<void>
): val is AsyncGenerator<void, void, void> => {
  // Symbol.asyncIterator: https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Symbol/asyncIterator
  // Symbol.asyncIterator 符号指定了一个对象的默认异步迭代器。如果一个对象设置了这个属性，它就是异步可迭代对象，可用于 for await...of 循环。
  return isFunction(val[Symbol.asyncIterator]);
};

const useAsyncEffect = (
  effect: () => AsyncGenerator<void, void, void> | Promise<void>,
  deps?: DependencyList
) => {
  useEffect(() => {
    const e = effect();
    let cancelled = false;
    async function execute() {
      if (isAsyncGenerator(e)) {
        while (true) {
          // 如果是 Generator 异步函数，则通过 next() 的方式执行
          const result = await e.next();
          // Generator function 全部执行完成，或者当前的 effect 已经被清理，则停止继续往下执行
          if (result.done || cancelled) {
            break;
          }
        }
      } else {
        await e;
      }
    }
    execute();
    return () => {
      // 当前 effect 已被清理
      cancelled = true;
    };
  }, deps);
};

export default useAsyncEffect;
```

## useDebounceEffect

[文档地址](https://ahooks.js.org/zh-CN/hooks/use-debounce-effect)

[详细代码](https://github.com/alibaba/hooks/blob/master/packages/hooks/src/useDebounceEffect/index.ts)

```tsx
import {
  useEffect,
  type DependencyList,
  type EffectCallback,
  useState,
} from "react";
import type { DebounceOptions } from "../useDebounce/debounceOptions";
import useDebounceFn from "../useDebounceFn";
import useUpdateEffect from "../useUpdateEffect";

const useDebounceEffect = (
  effect: EffectCallback,
  deps?: DependencyList,
  options?: DebounceOptions
) => {
  // flag 标识
  const [flag, setFlag] = useState({});

  // 对 flag 设置防抖功能
  const { run } = useDebounceFn(() => {
    setFlag({});
  }, options);

  // 监听 deps，立即调用 run 更新 flag
  useEffect(() => {
    return run();
  }, deps);

  // 监听 flag，执行 effect 回调函数
  useUpdateEffect(effect, [flag]);
};

export default useDebounceEffect;
```

## useDebounceFn

[文档地址](https://ahooks.js.org/zh-CN/hooks/use-debounce-fn)

[详细代码](https://github.com/alibaba/hooks/blob/master/packages/hooks/src/useDebounceFn/index.ts)

防抖(Debounce)是指在一段时间内，如果事件持续触发，则只执行一次事件处理函数。

适用场景：

适用于输入框搜索、滚动加载等频繁触发事件的场景。

实现方式：

设置一个定时器，在事件触发后延迟一定时间再执行事件处理函数，如果在延迟时间内再次触发事件，则重新计时。

```tsx
import debounce from "lodash/debounce";

// 判断当前环境是 Node 还是 Web
const isNodeOrWeb = () => {
  const freeGlobal =
    typeof global === "undefined"
      ? "undefined"
      : typeof global === "object" &&
        global &&
        global.Object === Object &&
        global;
  const freeSelf =
    typeof self === "object" && self && self.Object === Object && self;
  return freeGlobal || freeSelf;
};

if (!isNodeOrWeb()) {
  global.Date = Date;
}

export { debounce };
```

```tsx
import isDev from "@/utils/isDev";
import type { DebounceOptions } from "../useDebounce/debounceOptions";
import { isFunction } from "@/utils";
import { debounce } from "@/utils/lodash-polyfill";
import useLatest from "../useLatest";
import { useMemo } from "react";
import useUnmount from "../useUnmount";

type noop = (...args: any[]) => any;

const useDebounceFn = <T extends noop>(fn: T, options?: DebounceOptions) => {
  if (isDev) {
    if (!isFunction(fn)) {
      console.error(
        `useDebounceFn expected parameter is a function, got ${typeof fn}`
      );
    }
  }

  const fnRef = useLatest(fn);

  // 默认需要延迟的毫秒为 1000 毫秒
  const wait = options?.wait ?? 1000;

  /**
   * 调用 lodash 的 debounce 方法
   * https://www.lodashjs.com/docs/lodash.debounce#_debouncefunc-wait0-options
   */
  const debounced = useMemo(
    () =>
      debounce(
        (...args: Parameters<T>): ReturnType<T> => {
          return fnRef.current(...args);
        },
        wait,
        options
      ),
    []
  );

  // 卸载时取消延迟的函数调用
  useUnmount(() => {
    debounced.cancel();
  });

  return {
    // 防抖函数
    run: debounced,
    // 取消延迟的函数调用
    cancel: debounced.cancel,
    // 立即调用
    flush: debounced.flush,
  };
};

export default useDebounceFn;
```

## useThrottleFn

[文档地址](https://ahooks.js.org/zh-CN/hooks/use-throttle-fn)

[详细代码](https://github.com/alibaba/hooks/blob/master/packages/hooks/src/useThrottleFn/index.ts)

节流(Throttle)是指在一段时间内，无论事件触发多少次，则只执行一次事件处理函数。

适用场景：

适用于页面滚动、拖拽等连续触发事件的场景。

实现方式：

设置一个时间间隔，在事件触发后判断当前时间与上次执行事件处理函数的时间间隔是否大于设定的时间间隔，如果大于则执行事件处理函数。

```tsx
import isDev from "@/utils/isDev";
import { isFunction } from "@/utils";
import useLatest from "../useLatest";
import { useMemo } from "react";
import useUnmount from "../useUnmount";
import type { ThrottleOptions } from "../useThrottle/throttleOptions";
import throttle from "lodash/throttle";

type noop = (...args: any[]) => any;

const useThrottleFn = <T extends noop>(fn: T, options?: ThrottleOptions) => {
  if (isDev) {
    if (!isFunction(fn)) {
      console.error(
        `useThrottleFn expected parameter is a function, got ${typeof fn}`
      );
    }
  }

  const fnRef = useLatest(fn);

  // 默认需要节流的毫秒为 1000 毫秒
  const wait = options?.wait ?? 1000;

  /**
   * 调用 lodash 的 throttle 方法
   * https://www.lodashjs.com/docs/lodash.throttle
   */
  const throttled = useMemo(
    () =>
      throttle(
        (...args: Parameters<T>): ReturnType<T> => {
          return fnRef.current(...args);
        },
        wait,
        options
      ),
    []
  );

  // 卸载时取消延迟的函数调用
  useUnmount(() => {
    throttled.cancel();
  });

  return {
    // 节流函数
    run: throttled,
    // 取消延迟的函数调用
    cancel: throttled.cancel,
    // 立即调用
    flush: throttled.flush,
  };
};

export default useThrottleFn;
```

## useThrottleEffect

[文档地址](https://ahooks.js.org/zh-CN/hooks/use-throttle-effect)

[详细代码](https://github.com/alibaba/hooks/blob/master/packages/hooks/src/useThrottleEffect/index.ts)

```tsx
import {
  useEffect,
  type DependencyList,
  type EffectCallback,
  useState,
} from "react";
import useUpdateEffect from "../useUpdateEffect";
import type { ThrottleOptions } from "../useThrottle/throttleOptions";
import useThrottleFn from "../useThrottleFn";

const useThrottleEffect = (
  effect: EffectCallback,
  deps?: DependencyList,
  options?: ThrottleOptions
) => {
  // flag 标识
  const [flag, setFlag] = useState({});

  // 对 flag 设置节流功能
  const { run } = useThrottleFn(() => {
    setFlag({});
  }, options);

  // 监听 deps，立即调用 run 更新 flag
  useEffect(() => {
    return run();
  }, deps);

  // 监听 flag，执行 effect 回调函数
  useUpdateEffect(effect, [flag]);
};

export default useThrottleEffect;
```

## useDeepCompareEffect

[文档地址](https://ahooks.js.org/zh-CN/hooks/use-deep-compare-effect)

[详细代码](https://github.com/alibaba/hooks/blob/master/packages/hooks/src/useDeepCompareEffect/index.tsx)

```tsx
import type { DependencyList } from "react";
import isEqual from "react-fast-compare";

// deps 通过 react-fast-compare 进行深比较
export const depsEqual = (
  aDeps: DependencyList = [],
  bDeps: DependencyList = []
) => isEqual(aDeps, bDeps);
```

```tsx
import { depsEqual } from "@/utils/depsEqual";
import { type DependencyList, useEffect, useLayoutEffect, useRef } from "react";

type EffectHookType = typeof useEffect | typeof useLayoutEffect;
type CreateUpdateEffect = (hook: EffectHookType) => EffectHookType;

export const createDeepCompareEffect: CreateUpdateEffect =
  (hook) => (effect, deps) => {
    // 存储上一次的依赖项
    const ref = useRef<DependencyList>();
    // 创建一个信号值
    const signalRef = useRef<number>(0);

    // 判断最新的依赖项和上一次的依赖项是否相等
    if (deps === undefined || !depsEqual(deps, ref.current)) {
      ref.current = deps;
      // 不相等则更新信号值
      signalRef.current += 1;
    }

    // 信号值更新触发回调
    hook(effect, [signalRef.current]);
  };
```

```tsx
import { useEffect } from "react";
import { createDeepCompareEffect } from "../createDeepCompareEffect";

export default createDeepCompareEffect(useEffect);
```

## useDeepCompareLayoutEffect

[文档地址](https://ahooks.js.org/zh-CN/hooks/use-deep-compare-layout-effect)

[详细代码](https://github.com/alibaba/hooks/blob/master/packages/hooks/src/useDeepCompareLayoutEffect/index.tsx)

```tsx
import { useLayoutEffect } from "react";
import { createDeepCompareEffect } from "../createDeepCompareEffect";

export default createDeepCompareEffect(useLayoutEffect);
```

## useInterval

[文档地址](https://ahooks.js.org/zh-CN/hooks/use-interval)

[详细代码](https://github.com/alibaba/hooks/blob/master/packages/hooks/src/useInterval/index.ts)

```tsx
import { useCallback, useEffect, useRef } from "react";
import useMemoizedFn from "../useMemoizedFn";
import { isNumber } from "@/utils";

const useInterval = (
  fn: () => void,
  delay?: number,
  options: {
    immediate?: boolean;
  } = {}
) => {
  const timerCallback = useMemoizedFn(fn);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 暴露清除定时器的方法
  const clear = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  }, []);

  useEffect(() => {
    // delay 不是数字或 delay 的值小于 0，直接返回，停止定时器
    if (!isNumber(delay) || delay < 0) {
      return;
    }

    // 立即执行一次回调函数
    if (options.immediate) {
      timerCallback();
    }

    // 开启新的定时器
    timerRef.current = setInterval(timerCallback, delay);

    // 清除定时器，避免内存泄露
    return clear;
  }, [delay, options.immediate]);

  return clear;
};

export default useInterval;
```

## useRafInterval

[文档地址](https://ahooks.js.org/zh-CN/hooks/use-raf-interval)

[详细代码](https://github.com/alibaba/hooks/blob/master/packages/hooks/src/useRafInterval/index.ts)

首先，setInterval 作为事件循环中宏任务的 “主力”，它的执行时机并不能跟预期的一样准确，需要等待前面的任务的执行。比如第二个参数设置为 0，并不会立即执行。

```tsx
setInterval(() => {
  console.log("test");
}, 0);
```

另外，setInterval 在页面处于不可见状态时（比如页面隐藏或最小化等），不同的浏览器会设置不同的时间间隔。根据  [当浏览器切换到其他标签页或者最小化时，你的 js 定时器还准时吗？](https://juejin.cn/post/6899796711401586695#comment)  这篇文章的实践结论如下：

> 在谷歌浏览器中，当页面处于不可见状态时，setInterval 的最小时间间隔会被限制为 1s，火狐浏览器和谷歌浏览器特性一致，ie 浏览器的时间间隔不变。

window.requestAnimationFrame() 告诉浏览器，你希望执行一个动画，并要求浏览器在下次重绘之前调用指定的回调函数更新动画。

为了提高性能和电池寿命，在大部分浏览器里，当 requestAnimationFrame() 运行在后台标签页或者隐藏的  `<iframe>`  里时，requestAnimationFrame() 会被暂停调用以提升性能和电池寿命。

```tsx
import { useCallback, useEffect, useRef } from "react";
import useLatest from "../useLatest";
import { isNumber } from "@/utils";

interface Handle {
  id: number | ReturnType<typeof setInterval>;
}

const setRafInterval = (callback: () => void, delay: number = 0): Handle => {
  // 不支持 requestAnimationFrame API，则改用 setInterval
  if (typeof requestAnimationFrame === typeof undefined) {
    return {
      id: setInterval(callback, delay),
    };
  }

  let start = Date.now();
  const handle: Handle = {
    id: 0,
  };
  // 定义动画函数
  const loop = () => {
    const current = Date.now();
    // 当前时间 - 开始时间 >= delay，则执行 callback 并重置开始时间
    if (current - start >= delay) {
      callback();
      start = Date.now();
    }
    // 重置 handle.id，递归调用 requestAnimationFrame，请求下一帧
    handle.id = requestAnimationFrame(loop);
  };
  // 启动动画
  handle.id = requestAnimationFrame(loop);
  // 返回 handle
  return handle;
};

const cancelAnimationFrameIsNotDefined = (
  t: any
): t is ReturnType<typeof setInterval> => {
  return typeof cancelAnimationFrame === typeof undefined;
};

const clearRafInterval = (handle: Handle) => {
  // 不支持 cancelAnimationFrame API，则通过 clearInterval 清除
  if (cancelAnimationFrameIsNotDefined(handle.id)) {
    return clearInterval(handle.id);
  }
  // cancelAnimationFrame API 清除
  cancelAnimationFrame(handle.id);
};

const useRafInterval = (
  fn: () => void,
  delay: number | undefined,
  options?: {
    immediate?: boolean;
  }
) => {
  const immediate = options?.immediate;

  const fnRef = useLatest(fn);
  const timerRef = useRef<Handle>();

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearRafInterval(timerRef.current);
    }
  }, []);

  useEffect(() => {
    if (!isNumber(delay) || delay < 0) {
      return;
    }
    // 立即执行一次回调函数
    if (immediate) {
      fnRef.current();
    }

    timerRef.current = setRafInterval(() => {
      fnRef.current();
    }, delay);

    return clear;
  }, [delay]);

  return clear;
};

export default useRafInterval;
```

## useTimeout

[文档地址](https://ahooks.js.org/zh-CN/hooks/use-timeout)

[详细代码](https://github.com/alibaba/hooks/blob/master/packages/hooks/src/useTimeout/index.ts)

```tsx
import { useCallback, useEffect, useRef } from "react";
import useMemoizedFn from "../useMemoizedFn";
import { isNumber } from "@/utils";

const useTimeout = (fn: () => void, delay?: number) => {
  const timerCallback = useMemoizedFn(fn);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 暴露清除定时器的方法
  const clear = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
  }, []);

  useEffect(() => {
    // delay 不是数字或 delay 的值小于 0，直接返回，停止定时器
    if (!isNumber(delay) || delay < 0) {
      return;
    }

    // 开启新的定时器
    timerRef.current = setTimeout(timerCallback, delay);

    // 清除定时器，避免内存泄露
    return clear;
  }, [delay]);

  return clear;
};

export default useTimeout;
```

## useRafTimeout

[文档地址](https://ahooks.pages.dev/zh-CN/hooks/use-raf-timeout)

[详细代码](https://github.com/alibaba/hooks/blob/master/packages/hooks/src/useRafTimeout/index.ts)

首先，setTimeout 作为事件循环中宏任务的 “主力”，它的执行时机并不能跟预期的一样准确，需要等待前面的任务的执行。比如第二个参数设置为 0，并不会立即执行。

```tsx
setTimeout(() => {
  console.log("test");
}, 0);
```

另外，setTimeout 在页面处于不可见状态时（比如页面隐藏或最小化等），不同的浏览器会设置不同的时间间隔。根据  [当浏览器切换到其他标签页或者最小化时，你的 js 定时器还准时吗？](https://juejin.cn/post/6899796711401586695#comment)  这篇文章的实践结论如下：

> 在谷歌浏览器中，当页面处于不可见状态时，setTimeout 的最小时间间隔低于 1s 的会变为 1s，大于等于 1s 的会变为 N + 1s。在火狐浏览器中，setTimeout 的最小时间间隔会变为 1s，大于等于 1s 的间隔不变。ie 浏览器的时间间隔保持不变。

window.requestAnimationFrame() 告诉浏览器，你希望执行一个动画，并要求浏览器在下次重绘之前调用指定的回调函数更新动画。

为了提高性能和电池寿命，在大部分浏览器里，当 requestAnimationFrame() 运行在后台标签页或者隐藏的  `<iframe>`  里时，requestAnimationFrame() 会被暂停调用以提升性能和电池寿命。

```tsx
import { useCallback, useEffect, useRef } from "react";
import useLatest from "../useLatest";
import { isNumber } from "@/utils";

interface Handle {
  id: number | ReturnType<typeof setTimeout>;
}

const setRafTimeout = (callback: () => void, delay: number = 0): Handle => {
  // 不支持 requestAnimationFrame API，则改用 setTimeout
  if (typeof requestAnimationFrame === typeof undefined) {
    return {
      id: setTimeout(callback, delay),
    };
  }

  let start = Date.now();
  const handle: Handle = {
    id: 0,
  };
  // 定义动画函数
  const loop = () => {
    const current = Date.now();
    // 当前时间 - 开始时间 >= delay，则执行 callback
    if (current - start >= delay) {
      callback();
    } else {
      // 请求下一帧
      handle.id = requestAnimationFrame(loop);
    }
  };
  // 启动动画
  handle.id = requestAnimationFrame(loop);
  // 返回 handle
  return handle;
};

const cancelAnimationFrameIsNotDefined = (
  t: any
): t is ReturnType<typeof setTimeout> => {
  return typeof cancelAnimationFrame === typeof undefined;
};

const clearRafTimeout = (handle: Handle) => {
  // 不支持 cancelAnimationFrame API，则通过 clearInterval 清除
  if (cancelAnimationFrameIsNotDefined(handle.id)) {
    return clearTimeout(handle.id);
  }
  // cancelAnimationFrame API 清除
  cancelAnimationFrame(handle.id);
};

const useRafTimeout = (fn: () => void, delay: number | undefined) => {
  const fnRef = useLatest(fn);
  const timerRef = useRef<Handle>();

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearRafTimeout(timerRef.current);
    }
  }, []);

  useEffect(() => {
    if (!isNumber(delay) || delay < 0) {
      return;
    }

    timerRef.current = setRafTimeout(() => {
      fnRef.current();
    }, delay);

    return clear;
  }, [delay]);

  return clear;
};

export default useRafTimeout;
```

## useLockFn

[文档地址](https://ahooks.pages.dev/zh-CN/hooks/use-lock-fn)

[详细代码](https://github.com/alibaba/hooks/blob/master/packages/hooks/src/useLockFn/index.ts)

```tsx
import { useCallback, useRef } from "react";

const useLockFn = <P extends any[] = any[], V = any>(
  fn: (...args: P) => Promise<V>
) => {
  // 竞态锁
  const lockRef = useRef(false);

  return useCallback(
    async (...args: P) => {
      // 请求正在进行，直接返回
      if (lockRef.current) return;
      // 上锁
      lockRef.current = true;
      try {
        // 执行异步请求
        const ret = await fn(...args);
        // 返回结果
        return ret;
      } catch (e) {
        // 抛出异常
        throw e;
      } finally {
        // 竞态锁重置为 false
        lockRef.current = false;
      }
    },
    [fn]
  );
};

export default useLockFn;
```

虽然实用，但缺点也很明显，需要给每一个需要添加竞态锁的请求异步函数都手动加一遍。

通过 axios 可以自动取消重复请求，参考： [Axios 如何取消重复请求？](https://mp.weixin.qq.com/s?__biz=MzAxODE2MjM1MA==&mid=2651576212&idx=2&sn=b1c3fac9534f01f4d7c68f7b88800d5c&chksm=80250055b75289430570c54ba104675cbc6e5cf15cd35154a63f1d89b9f7211fb2f88f232e0f&scene=21#wechat_redirect)

## useUpdate

[文档地址](https://ahooks.js.org/zh-CN/hooks/use-update)

[详细代码](https://github.com/alibaba/hooks/blob/master/packages/hooks/src/useUpdate/index.ts)

```tsx
import { useCallback, useState } from "react";

const useUpdate = () => {
  const [, setState] = useState({});
  // 返回一个函数，通过变更 state，使组件重新渲染
  return useCallback(() => setState({}), []);
};

export default useUpdate;
```
