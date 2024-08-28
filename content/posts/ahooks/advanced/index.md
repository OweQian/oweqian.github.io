---
title: "📝 解读 ahooks 源码系列 - Advanced 篇"
date: 2023-11-01T19:20:04+08:00
tags: ["ahooks"]
categories: ["ahooks"]
---

本篇文章是解读 ahooks@3.8.0 源码系列的第七篇 - Advanced 篇，欢迎您的指正和点赞。

<!--more-->

本文主要解读 useControllableValue、useCreation、useEventEmitter、useIsomorphicLayoutEffect、useLatest、useMemoizedFn、useReactive 的源码实现。

## useControllableValue

[文档地址](https://ahooks.js.org/zh-CN/hooks/use-controllable-value)

[详细代码](https://github.com/alibaba/hooks/blob/master/packages/hooks/src/useControllableValue/index.ts)

受控组件和非受控组件的解释：

受控组件：在 HTML 中，表单元素 (如 `<input>`、`<textarea>`、`<select>` 等) 通常自己维护 state，并根据用户输入进行更新。而在 React 中，可变状态 (mutable state) 通常保存在组件的 state 属性中，并且只能通过 setSate 来更新。

对于受控组件，输入的值始终由 React 的 state 驱动，你可以将 value 传递给其它 UI 元素，或者通过其他事件处理函数重置，但这意味着你需要编写更多的代码。

使用非受控组件，表单数据将交由 DOM 节点来处理，可以使用 ref 来从 DOM 节点中获取表单数据。

```tsx
import { useMemo, type SetStateAction, useRef } from "react";
import useUpdate from "../useUpdate";
import { isFunction } from "@/utils";
import useMemoizedFn from "../useMemoizedFn";

export interface Options<T> {
  defaultValue?: T;
  defaultValuePropName?: string;
  valuePropName?: string;
  trigger?: string;
}

export type Props = Record<string, any>;

export interface StandardProps<T> {
  value: T;
  defaultValue?: T;
  onChange: (val: T) => void;
}

function useControllableValue<T = any>(
  props: StandardProps<T>
): [T, (v: SetStateAction<T>) => void];
function useControllableValue<T = any>(
  props?: Props,
  options?: Options<T>
): [T, (v: SetStateAction<T>, ...args: any[]) => void];
function useControllableValue<T = any>(
  props: Props = {},
  options: Options<T> = {}
) {
  const {
    defaultValue,
    defaultValuePropName = "defaultValue",
    valuePropName = "value",
    trigger = "onChange",
  } = options;

  const value = props[valuePropName] as T;
  // 如果 props 中存在值的属性名，则为受控组件
  const isControlled = props.hasOwnProperty(valuePropName);

  // 初始值
  const initialValue = useMemo(() => {
    // 受控组件
    if (isControlled) {
      return value;
    }
    // props defaultValue
    if (props.hasOwnProperty(defaultValuePropName)) {
      return props[defaultValuePropName];
    }
    // options defaultValue
    return defaultValue;
  }, []);

  const stateRef = useRef(initialValue);

  // 如果是受控组件，则由外部传入的 value 来更新 state
  if (isControlled) {
    stateRef.current = value;
  }

  const update = useUpdate();

  function setState(v: SetStateAction<T>, ...args: any[]) {
    const r = isFunction(v) ? v(stateRef.current) : v;

    // 如果是非受控组件，则手动更新状态，强制组件重新渲染
    if (!isControlled) {
      stateRef.current = r;
      update();
    }
    // 触发 trigger
    if (props[trigger]) {
      props[trigger](r, ...args);
    }
  }

  return [stateRef.current, useMemoizedFn(setState)] as const;
}

export default useControllableValue;
```

## useCreation

[文档地址](https://ahooks.js.org/zh-CN/hooks/use-creation/)

[详细代码](https://github.com/alibaba/hooks/blob/master/packages/hooks/src/useCreation/index.ts)

```tsx
import depsAreSame from "@/utils/depsAreSame";
import { useRef, type DependencyList } from "react";
const useCreation = <T,>(factory: () => T, deps: DependencyList) => {
  const { current } = useRef({
    deps,
    obj: undefined as undefined | T,
    initialized: false,
  });

  // 未初始化或新旧依赖项不相等
  if (current.initialized === false || !depsAreSame(current.deps, deps)) {
    current.deps = deps;
    // 执行工厂函数
    current.obj = factory();
    current.initialized = true;
  }

  return current.obj as T;
};

export default useCreation;
```

## useEventEmitter

[文档地址](https://ahooks.js.org/zh-CN/hooks/use-event-emitter)

[详细代码](https://github.com/alibaba/hooks/blob/master/packages/hooks/src/useEventEmitter/index.ts)

```tsx
import { useEffect, useRef } from "react";

type Subscription<T> = (val: T) => void;

export class EventEmitter<T> {
  // 订阅器列表
  private subscriptions = new Set<Subscription<T>>();

  // 推送事件
  emit = (val: T) => {
    for (const subscription of this.subscriptions) {
      subscription(val);
    }
  };

  // 订阅事件
  useSubscription = (callback: Subscription<T>) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const callbackRef = useRef<Subscription<T>>();
    callbackRef.current = callback;
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useEffect(() => {
      function subscription(val: T) {
        if (callbackRef.current) {
          callbackRef.current(val);
        }
      }
      // 组件创建时自动注册订阅
      this.subscriptions.add(subscription);
      // 组件销毁时自动取消订阅
      return () => {
        this.subscriptions.delete(subscription);
      };
    }, []);
  };
}

const useEventEmitter = <T = void,>() => {
  const ref = useRef<EventEmitter<T>>();
  if (!ref.current) {
    ref.current = new EventEmitter();
  }
  return ref.current;
};

export default useEventEmitter;
```

## useIsomorphicLayoutEffect

在 SSR 模式下，使用 useLayoutEffect 时，会出现以下警告

> ⚠️ Warning: useLayoutEffect does nothing on the server, because its effect cannot be encoded into the server renderer's output format. This will lead to a mismatch between the initial, non-hydrated UI and the intended UI. To avoid this, useLayoutEffect should only be used in components that render exclusively on the client. See [https://fb.me/react-uselayouteffect-ssr](https://fb.me/react-uselayouteffect-ssr) for common fixes.

为了避免该警告，可以使用 useIsomorphicLayoutEffect 代替 useLayoutEffect。

useIsomorphicLayoutEffect 源码如下：

```ts
import { useEffect, useLayoutEffect } from "react";
import isBrowser from "../../../utils/isBrowser";

const useIsomorphicLayoutEffect = isBrowser ? useLayoutEffect : useEffect;

export default useIsomorphicLayoutEffect;
```

在非浏览器环境返回 useEffect，在浏览器环境返回 useLayoutEffect。

更多信息可以参考  [useLayoutEffect and SSR](https://medium.com/@alexandereardon/uselayouteffect-and-ssr-192986cdcf7a)

## useLatest

[文档地址](https://ahooks.pages.dev/zh-CN/hooks/use-latest)

[详细代码](https://github.com/alibaba/hooks/blob/master/packages/hooks/src/useLatest/index.ts)

```tsx
import { useRef } from "react";

const useLatest = <T,>(value: T) => {
  const ref = useRef(value);
  // 拿到最新值
  ref.current = value;
  return ref;
};

export default useLatest;
```

## useMemoizedFn

[文档地址](https://ahooks.js.org/zh-CN/hooks/use-memoized-fn)

[详细代码](https://github.com/alibaba/hooks/blob/master/packages/hooks/src/useMemoizedFn/index.ts)

```tsx
import { isFunction } from "@/utils";
import isDev from "@/utils/isDev";
import { useMemo, useRef } from "react";

type noop = (this: any, ...args: any[]) => any;

type PickFunction<T extends noop> = (
  this: ThisParameterType<T>,
  ...args: Parameters<T>
) => ReturnType<T>;

const useMemoizedFn = <T extends noop>(fn: T) => {
  if (isDev) {
    if (!isFunction(fn)) {
      console.error(
        `useMemoizedFn expected parameter is a function, got ${typeof fn}`
      );
    }
  }

  // 每次拿到最新的 fn，把它更新到 fnRef，保证 fnRef 能够持有最新的 fn 引用
  const fnRef = useRef<T>(fn);

  // why not write `fnRef.current = fn`?
  // https://github.com/alibaba/hooks/issues/728
  fnRef.current = useMemo(() => fn, [fn]);

  // 保证最后返回的函数引用是不变的
  const memoizedFn = useRef<PickFunction<T>>();
  if (!memoizedFn.current) {
    memoizedFn.current = function (this, ...args) {
      // 每次调用时，都能拿到最新的 args
      return fnRef.current.apply(this, args);
    };
  }

  return memoizedFn.current as T;
};

export default useMemoizedFn;
```

## useReactive

[文档地址](https://ahooks.js.org/zh-CN/hooks/use-reactive)

[详细代码](https://github.com/alibaba/hooks/blob/master/packages/hooks/src/useReactive/index.ts)

```tsx
import { useRef } from "react";
import useCreation from "../useCreation";
import useUpdate from "../useUpdate";
import { isPlainObject } from "lodash";

// k:v 原对象:代理过的对象
const proxyMap = new WeakMap();
// k:v 代理过的对象:原对象
const rawMap = new WeakMap();

function observer<T extends Record<string, any>>(
  initialVal: T,
  cb: () => void
): T {
  const existingProxy = proxyMap.get(initialVal);

  // 添加缓存 防止重新构建proxy
  if (existingProxy) {
    return existingProxy;
  }

  // 防止代理已经代理过的对象
  // https://github.com/alibaba/hooks/issues/839
  if (rawMap.has(initialVal)) {
    return initialVal;
  }

  // 代理对象，定义拦截对代理对象的操作方法
  const proxy = new Proxy<T>(initialVal, {
    // 访问代理对象的属性时触发
    get(target, key, receiver) {
      // 获取目标对象上指定的属性的值
      const res = Reflect.get(target, key, receiver);

      // https://github.com/alibaba/hooks/issues/1317
      const descriptor = Reflect.getOwnPropertyDescriptor(target, key);
      // 属性不可读且不可写，直接返回原始的属性值
      if (!descriptor?.configurable && !descriptor?.writable) {
        return res;
      }

      // Only proxy plain object or array,
      // otherwise it will cause: https://github.com/alibaba/hooks/issues/2080
      // 属性值是普通对象或数组，调用 observer 方法对其观察，并返回观察后的结果；否则直接返回原始的属性值
      return isPlainObject(res) || Array.isArray(res) ? observer(res, cb) : res;
    },
    // 给代理对象的属性赋值时触发
    set(target, key, val) {
      const ret = Reflect.set(target, key, val);
      cb();
      return ret;
    },
    // 删除代理对象的属性时触发
    deleteProperty(target, key) {
      const ret = Reflect.deleteProperty(target, key);
      cb();
      return ret;
    },
  });

  proxyMap.set(initialVal, proxy);
  rawMap.set(proxy, initialVal);

  return proxy;
}

const useReactive = <S extends Record<string, any>>(initialState: S) => {
  const update = useUpdate();
  const stateRef = useRef<S>(initialState);

  const state = useCreation(() => {
    return observer(stateRef.current, () => {
      update();
    });
  }, []);

  return state;
};

export default useReactive;
```
