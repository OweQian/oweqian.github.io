---
title: "📝 解读 ahooks 源码系列 - State 篇"
date: 2023-09-19T18:00:04+08:00
tags: ["ahooks"]
categories: ["ahooks"]
---

本篇文章是 ahooks@3.8.0 源码系列的第四篇 - State 篇，欢迎您的指正和点赞。

<!--more-->

本文主要解读 useSetState、useBoolean、useToggle、useUrlState、useCookieState、useLocalStorageState、useSessionStorageState、useDebounce、useThrottle、useMap、useSet、usePrevious、useRafState、useSafeState、useGetState、useResetState 的源码实现。

## useSetState

[文档地址](https://ahooks.js.org/zh-CN/hooks/use-set-state)

[详细代码](https://github.com/alibaba/hooks/blob/master/packages/hooks/src/useSetState/index.ts)

<aside>
💡 在 React 中，状态被认为是只读的，对于对象或数组类型的状态，**你应该创建一个新的对象或数组来替换它而不是改变现有对象**。

</aside>

```tsx
import { isFunction } from "@/utils";
import { useCallback, useState } from "react";

export type SetState<S extends Record<string, any>> = <K extends keyof S>(
  state: Pick<S, K> | null | ((prevState: Readonly<S>) => Pick<S, K> | S | null)
) => void;

const useSetState = <S extends Record<string, any>>(
  initialState: S | (() => S)
): [S, SetState<S>] => {
  const [state, setState] = useState<S>(initialState);

  // 合并操作，返回一个全新的状态值
  const setMergeState = useCallback((patch) => {
    setState((prevState) => {
      // 判断新状态值是否为函数
      const newState = isFunction(patch) ? patch(prevState) : patch;
      return newState ? { ...prevState, ...newState } : prevState;
    });
  }, []);

  return [state, setMergeState];
};

export default useSetState;
```

## useBoolean

[文档地址](https://ahooks.js.org/zh-CN/hooks/use-boolean)

[详细代码](https://github.com/alibaba/hooks/blob/master/packages/hooks/src/useBoolean/index.ts)

```tsx
import { useMemo } from "react";
import useToggle from "../useToggle";

export interface Actions {
  setTrue: () => void;
  setFalse: () => void;
  set: (value: boolean) => void;
  toggle: () => void;
}

const useBoolean = (defaultValue = false): [boolean, Actions] => {
  // 基于 useToggle
  const [state, { toggle, set }] = useToggle(!!defaultValue);

  const actions: Actions = useMemo(() => {
    const setTrue = () => set(true);
    const setFalse = () => set(false);
    return {
      // 切换
      toggle,
      // 修改
      set: (v) => set(!!v),
      // 设置为 true
      setTrue,
      // 设置为 false
      setFalse,
    };
  }, []);

  return [state, actions];
};

export default useBoolean;
```

## useToggle

[文档地址](https://ahooks.js.org/zh-CN/hooks/use-toggle)

[详细代码](https://github.com/alibaba/hooks/blob/master/packages/hooks/src/useToggle/index.ts)

```tsx
import { useMemo, useState } from "react";

export interface Actions<T> {
  setLeft: () => void;
  setRight: () => void;
  set: (value: T) => void;
  toggle: () => void;
}

/**
 * 函数重载，声明入参和出参类型，根据不同的入参返回不同的结果
 * 入参可能有两个值，第一个为默认值（左值），第二个为取反之后的值（右值）
 * 不传右值时，根据默认值取反 !defaultValue
 */
function useToggle<T = boolean>(): [boolean, Actions<T>];
function useToggle<T>(defaultValue: T): [T, Actions<T>];
function useToggle<T, U>(
  defaultValue: T,
  reverseValue: U
): [T | U, Actions<T | U>];
function useToggle<D, R>(
  defaultValue: D = false as unknown as D,
  reverseValue?: R
): [D | R, Actions<D | R>] {
  const [state, setState] = useState<D | R>(defaultValue);

  const actions = useMemo(() => {
    const reverseValueOrigin = (
      reverseValue === undefined ? !defaultValue : reverseValue
    ) as D | R;

    // 切换
    const toggle = () =>
      setState((s) => (s === defaultValue ? reverseValueOrigin : defaultValue));
    // 修改
    const set = (value: D | R) => setState(value);
    // 设为左值
    const setLeft = () => setState(defaultValue);
    // 设为右值
    const setRight = () => setState(reverseValueOrigin);

    return {
      toggle,
      set,
      setLeft,
      setRight,
    };
  }, []);

  return [state, actions];
}

export default useToggle;
```

## useUrlState

[文档地址](https://ahooks.js.org/zh-CN/hooks/use-url-state)

[详细代码](https://github.com/alibaba/hooks/blob/master/packages/use-url-state/src/index.ts)

ahooks 项目是一个  monorepo，它的项目管理是通过  [lerna](https://www.lernajs.cn/)  进行管理。源码中的 useUrlState 是一个独立仓库。

你必须单独安装：

```tsx
import useUrlState from "@ahooksjs/use-url-state";
```

这样做的理由可能是 useUrlState 基于 react-router 的 useLocation & useHistory & useNavigate，你的项目必须要安装 react-router 的 5.x 或者 6.x 版本，但其实很多项目不一定使用 react-router，假如将这个 hook 内置到 ahooks 中的话，可能会导致包体积变大。

另外，该 hook 依赖于 [query-string](https://www.npmjs.com/package/query-string) 包，主要用到 qs.parse(string, [options]) 和 qs.stringify(object, [options]) 这两个方法。

```tsx
import qs from "query-string";
import type { ParseOptions, StringifyOptions } from "query-string";
import type * as React from "react";
import * as tmp from "react-router";
import useUpdate from "../useUpdate";
import { useMemo, useRef } from "react";
import useMemoizedFn from "../useMemoizedFn";

// ignore waring `"export 'useNavigate' (imported as 'rc') was not found in 'react-router'`
const rc = tmp as any;

/**
 * navigateMode: 状态变更时切换 history 的方式
 * parseOptions: parse 配置
 * stringifyOptions: stringify 配置
 * */
export interface Options {
  navigateMode?: "push" | "replace";
  parseOptions?: ParseOptions;
  stringifyOptions?: StringifyOptions;
}

const baseParseConfig: ParseOptions = {
  parseNumbers: false,
  parseBooleans: false,
};

const baseStringifyConfig: StringifyOptions = {
  skipNull: false,
  skipEmptyString: false,
};

type UrlState = Record<string, any>;

const useUrlState = <S extends UrlState = UrlState>(
  initialState?: S | (() => S),
  options?: Options
) => {
  type State = Partial<{ [key in keyof S]: any }>;
  const {
    navigateMode = "push",
    parseOptions,
    stringifyOptions,
  } = options || {};

  const mergedParseOptions = { ...baseParseConfig, ...parseOptions };
  const mergedStringifyOptions = {
    ...baseStringifyConfig,
    ...stringifyOptions,
  };

  // 返回表示当前 URL 的 location 对象
  // https://reactrouter.com/en/main/hooks/use-location
  const location = rc.useLocation();

  // 浏览器的曾经在标签页或者框架里访问的会话历史记录
  // https://v5.reactrouter.com/web/api/Hooks/usehistory
  // react-router v5
  const history = rc.useHistory?.();

  // https://reactrouter.com/en/main/hooks/use-navigate
  // react-router v6
  const navigate = rc.useNavigate?.();

  // 强制渲染
  const update = useUpdate();

  // 初始状态
  const initialStateRef = useRef(
    typeof initialState === "function"
      ? (initialState as () => S)()
      : initialState || {}
  );

  // 从 URL 中解析查询参数对象
  const queryFromUrl = useMemo(() => {
    return qs.parse(location.search, mergedParseOptions);
  }, [location.search]);

  // 组合查询参数对象
  // 多状态管理（拆分）
  const targetQuery: State = useMemo(
    () => ({
      ...initialStateRef.current,
      ...queryFromUrl,
    }),
    [queryFromUrl]
  );

  const setState = (s: React.SetStateAction<State>) => {
    // 计算新的状态对象
    const newQuery = typeof s === "function" ? s(targetQuery) : s;

    // 1. 如果 setState 后，search 没变化，就需要 update 来触发一次更新。比如 demo1 直接点击 clear，就需要 update 来触发更新。
    // 2. update 和 history 的更新会合并，不会造成多次更新
    update();

    // 根据路由版本，更新 URL 中的查询参数，保持 URL 和状态同步
    if (history) {
      history[navigateMode](
        {
          hash: location.hash,
          search:
            qs.stringify(
              { ...queryFromUrl, ...newQuery },
              mergedStringifyOptions
            ) || "?",
        },
        location.state
      );
    }
    if (navigate) {
      navigate(
        {
          hash: location.hash,
          search:
            qs.stringify(
              { ...queryFromUrl, ...newQuery },
              mergedStringifyOptions
            ) || "?",
        },
        {
          replace: navigateMode === "replace",
          state: location.state,
        }
      );
    }
  };

  return [targetQuery, useMemoizedFn(setState)] as const;
};

export default useUrlState;
```

## useCookieState

[文档地址](https://ahooks.js.org/zh-CN/hooks/use-cookie-state)

[详细代码](https://github.com/alibaba/hooks/blob/master/packages/hooks/src/useCookieState/index.ts)

```tsx
import Cookies from "js-cookie";
import { useState } from "react";
import { isFunction, isString } from "@/utils";
import useMemoizedFn from "../useMemoizedFn";

export type State = string | undefined;

export interface Options extends Cookies.CookieAttributes {
  defaultValue?: State | (() => State);
}

const useCookieState = (cookieKey: string, options: Options = {}) => {
  const [state, setState] = useState<State>(() => {
    // 本地已有 cookieKey 对应的 cookie 值，直接返回
    const cookieValue = Cookies.get(cookieKey);
    if (isString(cookieValue)) return cookieValue;

    // options.defaultValue 存在并且为函数
    if (isFunction(options.defaultValue)) {
      return options.defaultValue();
    }

    return options.defaultValue;
  });

  const updateState = useMemoizedFn(
    (
      newValue: State | ((prevState: State) => State),
      newOptions: Cookies.CookieAttributes = {}
    ) => {
      // newOptions 与 options 合并
      const { defaultValue, ...restOptions } = { ...options, ...newOptions };
      // 如果是函数，则取执行后返回的结果，否则直接取该值
      const value = isFunction(newValue) ? newValue(state) : newValue;

      setState(value);

      // 如果值为 undefined，则清除 cookie。否则，调用 set 方法
      if (value === undefined) {
        Cookies.remove(cookieKey);
      } else {
        Cookies.set(cookieKey, value, restOptions);
      }
    }
  );

  return [state, updateState] as const;
};

export default useCookieState;
```

## useLocalStorageState

[文档地址](https://ahooks.js.org/zh-CN/hooks/use-local-storage-state)

[详细代码](https://github.com/alibaba/hooks/blob/master/packages/hooks/src/useLocalStorageState/index.ts)

```tsx
const isBrowser = !!(
  typeof window !== "undefined" &&
  window.document &&
  window.document.createElement
);

export default isBrowser;
```

```tsx
import { isFunction, isUndef } from "@/utils";
import { useState } from "react";
import useUpdateEffect from "../useUpdateEffect";
import useMemoizedFn from "../useMemoizedFn";
import useEventListener from "../useEventListener";

export const SYNC_STORAGE_EVENT_NAME = "AHOOKS_SYNC_STORAGE_EVENT_NAME";

export type SetState<S> = S | ((prevState?: S) => S);

export interface Options<T> {
  defaultValue?: T | (() => T);
  // 是否监听存储变化
  listenStorageChange?: boolean;
  serializer?: (value: T) => string;
  deserializer?: (value: string) => T;
  onError?: (error: unknown) => void;
}

export const createUseStorageState = (
  getStorage: () => Storage | undefined
) => {
  const useStorageState = <T,>(key: string, options: Options<T> = {}) => {
    let storage: Storage | undefined;
    const {
      listenStorageChange = false,
      onError = (e) => {
        console.error(e);
      },
    } = options;

    /**
     * 🐞
     * getStorage 可以返回 localStorage/sessionStorage/undefined
     * 当 cookie 被 disabled 时，访问不了 localStorage/sessionStorage
     * */
    try {
      storage = getStorage();
    } catch (err) {
      onError(err);
    }

    // 支持自定义序列化方法，默认 JSON.stringify
    const serializer = (value: T) => {
      if (options.serializer) {
        return options.serializer(value);
      }
      return JSON.stringify(value);
    };

    // 支持自定义反序列化方法，默认 JSON.parse
    const deserializer = (value: string): T => {
      if (options.deserializer) {
        return options.deserializer(value);
      }
      return JSON.parse(value);
    };

    function getStoredValue() {
      try {
        const raw = storage?.getItem(key);
        if (raw) {
          return deserializer(raw);
        }
      } catch (e) {
        onError(e);
      }
      if (isFunction(options.defaultValue)) {
        return options.defaultValue();
      }
      return options.defaultValue;
    }

    const [state, setState] = useState(getStoredValue);

    // key 更新时执行
    useUpdateEffect(() => {
      setState(getStoredValue());
    }, [key]);

    const updateState = (value?: SetState<T>) => {
      // 如果 value 为函数，则取执行后结果；否则，直接取值
      const currentState = isFunction(value) ? value(state) : value;

      // 不监听存储变化
      if (!listenStorageChange) {
        setState(currentState);
      }

      try {
        let newValue: string | null;
        const oldValue = storage?.getItem(key);

        // 如果值为 undefined，则 removeItem
        if (isUndef(currentState)) {
          newValue = null;
          storage?.removeItem(key);
        } else {
          // setItem
          newValue = serializer(currentState);
          storage?.setItem(key, newValue);
        }

        // 触发自定义事件 SYNC_STORAGE_EVENT_NAME
        dispatchEvent(
          // send custom event to communicate within same page
          // importantly this should not be a StorageEvent since those cannot
          // be constructed with a non-built-in storage area
          new CustomEvent(SYNC_STORAGE_EVENT_NAME, {
            detail: {
              key,
              newValue,
              oldValue,
              storageArea: storage,
            },
          })
        );
      } catch (e) {
        onError(e);
      }
    };

    // 处理 storage 事件
    const syncState = (event: StorageEvent) => {
      if (event.key !== key || event.storageArea !== storage) {
        return;
      }

      // 更新状态
      setState(getStoredValue());
    };

    // 处理自定义事件 SYNC_STORAGE_EVENT_NAME
    const syncStateFromCustomEvent = (event: CustomEvent<StorageEvent>) => {
      syncState(event.detail);
    };

    // from another document
    useEventListener("storage", syncState, {
      enable: listenStorageChange,
    });

    // from the same document but different hooks
    useEventListener(SYNC_STORAGE_EVENT_NAME, syncStateFromCustomEvent, {
      enable: listenStorageChange,
    });

    return [state, useMemoizedFn(updateState)] as const;
  };

  return useStorageState;
};
```

```tsx
import isBrowser from "@/utils/isBrowser";
import { createUseStorageState } from "../createUseStorageState";

const useLocalStorageState = createUseStorageState(() =>
  isBrowser ? localStorage : undefined
);

export default useLocalStorageState;
```

## useSessionStorageState

[文档地址](https://ahooks.js.org/zh-CN/hooks/use-session-storage-state)

[详细代码](https://github.com/alibaba/hooks/blob/master/packages/hooks/src/useSessionStorageState/index.ts)

```tsx
import isBrowser from "@/utils/isBrowser";
import { createUseStorageState } from "../createUseStorageState";

const useSessionStorageState = createUseStorageState(() =>
  isBrowser ? sessionStorage : undefined
);

export default useSessionStorageState;
```

## useDebounce

[文档地址](https://ahooks.js.org/zh-CN/hooks/use-debounce)

[详细代码](https://github.com/alibaba/hooks/blob/master/packages/hooks/src/useDebounce/index.ts)

```tsx
import { useEffect, useState } from "react";
import useDebounceFn from "../useDebounceFn";
import type { DebounceOptions } from "./debounceOptions";

const useDebounce = <T,>(value: T, options?: DebounceOptions) => {
  const [debounced, setDebounced] = useState(value);

  // 依赖 useDebounceFn
  const { run } = useDebounceFn(() => {
    setDebounced(value);
  }, options);

  // 监听 value 变化，立即执行防抖函数，更新 debounced 值
  useEffect(() => {
    run();
  }, [value]);

  return debounced;
};

export default useDebounce;
```

## useThrottle

[文档地址](https://ahooks.js.org/zh-CN/hooks/use-throttle)

[详细代码](https://github.com/alibaba/hooks/blob/master/packages/hooks/src/useThrottle/index.ts)

```tsx
import { useEffect, useState } from "react";
import type { ThrottleOptions } from "./throttleOptions";
import useThrottleFn from "../useThrottleFn";

const useThrottle = <T,>(value: T, options?: ThrottleOptions) => {
  const [throttled, setThrottled] = useState(value);

  // 依赖 useThrottleFn
  const { run } = useThrottleFn(() => {
    setThrottled(value);
  }, options);

  // 监听 value 变化，立即执行节流函数，更新 throttled 值
  useEffect(() => {
    run();
  }, [value]);

  return throttled;
};

export default useThrottle;
```

## useMap

[文档地址](https://ahooks.js.org/zh-CN/hooks/use-map)

[详细代码](https://github.com/alibaba/hooks/blob/master/packages/hooks/src/useMap/index.ts)

```tsx
import { useState } from "react";
import useMemoizedFn from "../useMemoizedFn";

const useMap = <K, T>(initialValue?: Iterable<readonly [K, T]>) => {
  // 初始化
  const getInitValue = () => new Map(initialValue);

  const [map, setMap] = useState<Map<K, T>>(getInitValue);

  // 添加元素
  const set = (key: K, entry: T) => {
    setMap((prev) => {
      const temp = new Map(prev);
      temp.set(key, entry);
      return temp;
    });
  };

  // 生成一个新的 Map 对象
  const setAll = (newMap: Iterable<readonly [K, T]>) => {
    setMap(new Map(newMap));
  };

  // 移除元素
  const remove = (key: K) => {
    setMap((prev) => {
      const temp = new Map(prev);
      temp.delete(key);
      return temp;
    });
  };

  // 重置
  const reset = () => setMap(getInitValue());

  // 获取元素
  const get = (key: K) => map.get(key);

  return [
    map,
    {
      set: useMemoizedFn(set),
      setAll: useMemoizedFn(setAll),
      remove: useMemoizedFn(remove),
      reset: useMemoizedFn(reset),
      get: useMemoizedFn(get),
    },
  ] as const;
};

export default useMap;
```

## useSet

[文档地址](https://ahooks.js.org/zh-CN/hooks/use-set)

[详细代码](https://github.com/alibaba/hooks/blob/master/packages/hooks/src/useSet/index.ts)

```tsx
import { useState } from "react";
import useMemoizedFn from "../useMemoizedFn";

const useSet = <K,>(initialValue?: Iterable<K>) => {
  const getInitValue = () => new Set(initialValue);

  const [set, setSet] = useState<Set<K>>(getInitValue);

  // 添加元素
  const add = (key: K) => {
    if (set.has(key)) {
      return;
    }
    setSet((prevSet) => {
      const temp = new Set(prevSet);
      temp.add(key);
      return temp;
    });
  };

  // 移除元素
  const remove = (key: K) => {
    if (!set.has(key)) {
      return;
    }
    setSet((prevSet) => {
      const temp = new Set(prevSet);
      temp.delete(key);
      return temp;
    });
  };

  // 重置
  const reset = () => setSet(getInitValue());

  return [
    set,
    {
      add: useMemoizedFn(add),
      remove: useMemoizedFn(remove),
      reset: useMemoizedFn(reset),
    },
  ] as const;
};

export default useSet;
```

## usePrevious

[文档地址](https://ahooks.js.org/zh-CN/hooks/use-previous)

[详细代码](https://github.com/alibaba/hooks/blob/master/packages/hooks/src/usePrevious/index.ts)

```tsx
import { useRef } from "react";

export type ShouldUpdateFunc<T> = (prev: T | undefined, next: T) => boolean;

const defaultShouldUpdate = <T,>(a?: T, b?: T) => !Object.is(a, b);

const usePrevious = <T,>(
  state: T,
  shouldUpdate: ShouldUpdateFunc<T> = defaultShouldUpdate
): T | undefined => {
  /**
   * 维护两个值 prevRef.current 和 curRef.current
   * prevRef.current: 上一次的状态值
   * curRef.current: 当前的状态值
   * */
  const prevRef = useRef<T>();
  const curRef = useRef<T>();

  /**
   * 使用 shouldUpdate 判断 state 是否发生变化
   * */
  if (shouldUpdate(curRef.current, state)) {
    // 手动更新 prevRef.current 的值为上一个状态值
    prevRef.current = curRef.current;
    // 手动更新 curRef.current 的值为最新的状态值
    curRef.current = state;
  }

  // 返回上一次的状态值
  return prevRef.current;
};

export default usePrevious;
```

## useRafState

[文档地址](https://ahooks.js.org/zh-CN/hooks/use-raf-state)

[详细代码](https://github.com/alibaba/hooks/blob/master/packages/hooks/src/useRafState/index.ts)

window.requestAnimationFrame()，你希望执行一个动画，并且要求浏览器在下次重绘之前调用指定的回调函数更新动画。该方法需要传入一个回调函数作为参数，该回调函数会在浏览器下一次重绘之前执行。

```tsx
import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useRef,
  useState,
} from "react";
import useUnmount from "../useUnmount";

function useRafState<S>(
  initialState: S | (() => S)
): [S, Dispatch<SetStateAction<S>>];
function useRafState<S = undefined>(): [
  S | undefined,
  Dispatch<SetStateAction<S | undefined>>
];
function useRafState<S>(initialState?: S | (() => S)) {
  const ref = useRef(0);
  const [state, setState] = useState(initialState);

  const setRafState = useCallback((value: S | ((prevState: S) => S)) => {
    // 取消上一次的 requestAnimationFrame
    cancelAnimationFrame(ref.current);

    // 通过 requestAnimationFrame 控制 setState 的执行时机
    ref.current = requestAnimationFrame(() => {
      setState(value);
    });
  }, []);

  useUnmount(() => {
    // 组件卸载时，取消 requestAnimationFrame，避免内存泄露
    cancelAnimationFrame(ref.current);
  });

  return [state, setRafState] as const;
}

export default useRafState;
```

## useSafeState

[文档地址](https://ahooks.js.org/zh-CN/hooks/use-safe-state)

[详细代码](https://github.com/alibaba/hooks/blob/master/packages/hooks/src/useSafeState/index.ts)

```tsx
import { useCallback, type Dispatch, type SetStateAction, useState } from "react";
import useUnmountedRef from "../useUnmountedRef";

function useSafeState<S>(
  initialState: S | (() => S)
): [S, Dispatch<SetStateAction<S>>];
function useSafeState<S = undefined>(): [S | undefined, Dispatch<SetStateAction<S | undefined>];

function useSafeState<S>(
  initialState?: S | (() => S)
) {
  const unmountedRef = useUnmountedRef();
  const [state, setState] = useState(initialState);

  const setCurrentState = useCallback((currentState) => {
    /** if component is unmounted, stop update */
     // 如果组件已经卸载，则停止更新状态
    if (unmountedRef.current) return;
     // 更新状态
    setState(currentState);
  }, []);

  return [state, setCurrentState] as const;
}

export default useSafeState;
```

## useGetState

[文档地址](https://ahooks.js.org/zh-CN/hooks/use-get-state)

[详细代码](https://github.com/alibaba/hooks/blob/master/packages/hooks/src/useGetState/index.ts)

```tsx
import {
  type Dispatch,
  type SetStateAction,
  useState,
  useCallback,
} from "react";
import useLatest from "../useLatest";

type GetStateAction<S> = () => S;

function useGetState<S>(
  initialState: S | (() => S)
): [S, Dispatch<SetStateAction<S>>, GetStateAction<S>];
function useGetState<S = undefined>(): [
  S | undefined,
  Dispatch<SetStateAction<S | undefined>>,
  GetStateAction<S | undefined>
];
function useGetState<S>(initialState?: S) {
  const [state, setState] = useState(initialState);
  // 最新的 state 值
  const stateRef = useLatest(state);

  // 暴露一个 getState 方法获取到最新的 state 值
  const getState = useCallback(() => stateRef.current, []);

  return [state, setState, getState];
}

export default useGetState;
```

## useResetState

[文档地址](https://ahooks.js.org/zh-CN/hooks/use-reset-state)

[详细代码](https://github.com/alibaba/hooks/blob/master/packages/hooks/src/useResetState/index.ts)

```tsx
import { type Dispatch, type SetStateAction, useRef, useState } from "react";
import useCreation from "../useCreation";
import { isFunction } from "lodash";
import useMemoizedFn from "../useMemoizedFn";
type ResetState = () => void;

const useResetState = <S,>(
  initialState: S | (() => S)
): [S, Dispatch<SetStateAction<S>>, ResetState] => {
  const initialStateRef = useRef(initialState);
  const initialStateMemo = useCreation(
    () =>
      isFunction(initialStateRef.current)
        ? initialStateRef.current()
        : initialStateRef.current,
    []
  );

  const [state, setState] = useState(initialStateMemo);
  // 暴露一个 resetState 方法重置 state 为 initialState
  const resetState = useMemoizedFn(() => {
    setState(initialStateMemo);
  });

  return [state, setState, resetState];
};

export default useResetState;
```
