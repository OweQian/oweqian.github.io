# 📝 解读 ahooks 源码系列 - LifeCycle


本篇文章是解读 ahooks@3.9.5 源码系列的第一篇 - LifeCycle，欢迎您的指正和点赞。

<!--more-->

本文主要解读 useMount、useUnmount、useUnmountedRef 的源码实现。

## useMount

[文档地址](https://ahooks.js.org/zh-CN/hooks/use-mount)

[详细代码](https://github.com/alibaba/hooks/blob/master/packages/hooks/src/useMount/index.ts)

用于在组件挂载时执行传入的回调函数 fn，它允许 fn 返回一个清理函数（与 useEffect 的返回值相同），也支持 fn 返回一个 Promise，但 Promise 不会被当作清理函数处理。

```tsx
import { useEffect } from "react";
import { type EffectCallback } from "react";
import { isFunction } from "../utils";
import isDev from "../utils/isDev";

type MountCallback = EffectCallback | (() => Promise<void | (() => void)>);

const useMount = (fn: MountCallback) => {
  if (isDev) {
    if (!isFunction(fn)) {
      console.error(
        `useMount: parameter \`fn\` expected to be a function, but got "${typeof fn}".`
      );
    }
  }

  // 在组件首次渲染时，执行方法
  useEffect(() => {
    const result = fn?.();
    // If fn returns a Promise, don't return it as cleanup function
    if (
      result &&
      typeof result === "object" &&
      typeof (result as any).then === "function"
    ) {
      return;
    }
    return result as ReturnType<EffectCallback>;
  }, []);
};

export default useMount;
```

## useUnmount

[文档地址](https://ahooks.js.org/zh-CN/hooks/use-unmount)

[详细代码](https://github.com/alibaba/hooks/blob/master/packages/hooks/src/useUnmount/index.ts)

用于在组件卸载时执行传入的回调函数 fn。

```tsx
import { useEffect } from "react";
import useLatest from "../useLatest";
import { isFunction } from "../utils";
import isDev from "../utils/isDev";

const useUnmount = (fn: () => void) => {
  if (isDev) {
    if (!isFunction(fn)) {
      console.error(
        `useUnmount expected parameter is a function, got ${typeof fn}`
      );
    }
  }

  const fnRef = useLatest(fn);

  // 组件卸载时，执行函数
  useEffect(
    () => () => {
      fnRef.current();
    },
    []
  );
};

export default useUnmount;
```

## useUnmountedRef

[文档地址](https://ahooks.js.org/zh-CN/hooks/use-unmounted-ref)

[详细代码](https://github.com/alibaba/hooks/blob/master/packages/hooks/src/useUnmountedRef/index.tsx)

提供一个可读写的引用（ref），用来标记组件是否已经卸载。

```tsx
import { useEffect, useRef } from "react";

const useUnmountedRef = () => {
  const unmountedRef = useRef(false);

  useEffect(() => {
    // 组件挂载，unmountedRef.current 置为 false
    unmountedRef.current = false;
    return () => {
      // 组件卸载，unmountedRef.current 置为 true
      unmountedRef.current = true;
    };
  }, []);

  return unmountedRef;
};

export default useUnmountedRef;
```

