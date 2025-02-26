# 📝 解读 ahooks 源码系列 - LifeCycle


本篇文章是解读 ahooks@3.8.0 源码系列的第三篇 - LifeCycle，欢迎您的指正和点赞。

<!--more-->

本文主要解读 useMount、useUnmount、useUnmountedRef 的源码实现。

## useMount

[文档地址](https://ahooks.pages.dev/zh-CN/hooks/use-mount)

[详细代码](https://github.com/alibaba/hooks/blob/master/packages/hooks/src/useMount/index.ts)

```tsx
import { isFunction } from "@/utils";
import isDev from "@/utils/isDev";
import { useEffect } from "react";

const useMount = (fn: () => void) => {
  if (isDev) {
    if (!isFunction(fn)) {
      console.error(
        `useMount: parameter \`fn\` expected to be a function, but got "${typeof fn}".`
      );
    }
  }

  // 在组件首次渲染时，执行方法
  useEffect(() => {
    fn?.();
  }, []);
};

export default useMount;
```

## useUnmount

[文档地址](https://ahooks.pages.dev/zh-CN/hooks/use-unmount)

[详细代码](https://github.com/alibaba/hooks/blob/master/packages/hooks/src/useUnmount/index.ts)

```tsx
import { isFunction } from "@/utils";
import isDev from "@/utils/isDev";
import useLatest from "../useLatest";
import { useEffect } from "react";

const useUnmount = (fn: () => void) => {
  if (isDev) {
    if (!isFunction(fn)) {
      console.error(
        `useUnmount expected parameter is a function, got ${typeof fn}`
      );
    }
  }

  const fnRef = useLatest(fn);

  useEffect(
    // 组件卸载时，执行函数
    () => () => {
      fnRef.current();
    },
    []
  );
};

export default useUnmount;
```

## useUnmountedRef

[文档地址](https://ahooks.pages.dev/zh-CN/hooks/use-unmounted-ref)

[详细代码](https://github.com/alibaba/hooks/blob/master/packages/hooks/src/useUnmountedRef/index.tsx)

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

