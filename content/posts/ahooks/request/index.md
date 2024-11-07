---
title: "📝 解读 ahooks 源码系列 - Request"
date: 2023-09-01T23:20:04+08:00
tags: ["ahooks"]
categories: ["ahooks"]
---

本篇文章是解读 ahooks@3.8.0 源码系列的第一篇 - Request，欢迎您的指正和点赞。

<!--more-->

本文主要解读 useRequest 的入口、Fetch 类、useRequestImplement、Loading Delay、轮询、依赖刷新、屏幕聚焦重新请求、防抖、节流、缓存 & SWR、错误重试的源码实现。

## 基础用法

[文档地址](https://ahooks.js.org/zh-CN/hooks/use-request/basic)

[详细代码](https://github.com/alibaba/hooks/blob/master/packages/hooks/src/useRequest/src/useRequest.ts)

useRequest 的模块分为三大块：Core、Plugins、utils。

Plugins: useRequest 通过插件式组件代码，基本上每个功能点对应一个插件。通过插件化机制降低了每个功能之间的耦合度，也降低了其本身的复杂度。

Core: 整个 useRequest 的核心代码，处理了整个请求的生命周期。

utils: 工具方法。

### useRequest 入口

先从入口文件开始，hooks/src/useRequest/src/useRequest.ts

```tsx
import useAutoRunPlugin from "./plugins/useAutoRunPlugin";
import useCachePlugin from "./plugins/useCachePlugin";
import useDebouncePlugin from "./plugins/useDebouncePlugin";
import useLoadingDelayPlugin from "./plugins/useLoadingDelayPlugin";
import usePollingPlugin from "./plugins/usePollingPlugin";
import useRefreshOnWindowFocusPlugin from "./plugins/useRefreshOnWindowFocusPlugin";
import useRetryPlugin from "./plugins/useRetryPlugin";
import useThrottlePlugin from "./plugins/useThrottlePlugin";
import type { Options, Plugin, Service } from "./types";
import useRequestImplement from "./useRequestImplement";

function useRequest<TData, TParams extends any[]>(
  service: Service<TData, TParams>,
  options?: Options<TData, TParams>,
  plugins?: Plugin<TData, TParams>[]
) {
  return useRequestImplement<TData, TParams>(service, options, [
    // 插件列表，用于拓展功能
    // 自定义插件数组
    ...(plugins || []),
    useAutoRunPlugin,
    useCachePlugin,
    useDebouncePlugin,
    useLoadingDelayPlugin,
    usePollingPlugin,
    useRefreshOnWindowFocusPlugin,
    useRetryPlugin,
    useThrottlePlugin,
  ] as Plugin<TData, TParams>[]);
}

export default useRequest;
```

类型定义，hooks/src/useRequest/src/types.ts

```tsx
import type Fetch from "./Fetch";

export interface FetchState<TData, TParams extends any[]> {
  loading: boolean;
  params?: TParams;
  data?: TData;
  error?: Error;
}

export interface PluginReturn<TData, TParams extends any[]> {
  onBefore?: (params: TParams) =>
    | ({
        stopNow?: boolean;
        returnNow?: boolean;
      } & Partial<FetchState<TData, TParams>>)
    | void;

  onRequest?: (
    service: Service<TData, TParams>,
    params: TParams
  ) => {
    servicePromise?: Promise<TData>;
  };

  onSuccess?: (data: TData, params: TParams) => void;
  onError?: (e: Error, params: TParams) => void;
  onFinally?: (params: TParams, data?: TData, e?: Error) => void;
  onCancel?: () => void;
  onMutate?: (data: TData) => void;
}

export type Service<TData, TParams extends any[]> = (
  ...args: TParams
) => Promise<TData>;

export interface Options<TData, TParams> {
  manual?: boolean;

  onBefore?: (params: TParams) => void;
  onSuccess?: (data: TData, params: TParams) => void;
  onError?: (e: Error, params: TParams) => void;
  onFinally?: (params: TParams, data?: TData, e?: Error) => void;

  defaultParams?: TParams;

  // TODO: 待续
}

export type Plugin<TData, TParams extends any[]> = {
  (
    fetchInstance: Fetch<TData, TParams>,
    options: Options<TData, TParams>
  ): PluginReturn<TData, TParams>;
  onInit?: (
    options: Options<TData, TParams>
  ) => Partial<FetchState<TData, TParams>>;
};

export interface Result<TData, TParams extends any[]> {
  loading: boolean;
  data?: TData;
  params: TParams | [];
  error?: Error;
  cancel: Fetch<TData, TParams>["cancel"];
  refresh: Fetch<TData, TParams>["refresh"];
  refreshAsync: Fetch<TData, TParams>["refreshAsync"];
  run: Fetch<TData, TParams>["run"];
  runAsync: Fetch<TData, TParams>["runAsync"];
  mutate: Fetch<TData, TParams>["mutate"];
}

export type Subscribe = () => void;
```

### useRequestImplement 方法

主要负责对 Fetch 类进行实例化。

```tsx
import type { Options, Plugin, Result, Service } from "./types";
import isDev from "../../../../utils/isDev";
import useLatest from "@/hooks/useLatest";
import useUpdate from "@/hooks/useUpdate";
import useCreation from "@/hooks/useCreation";
import useUnmount from "@/hooks/useUnmount";
import useMemoizedFn from "@/hooks/useMemoizedFn";
import useMount from "@/hooks/useMount";
import Fetch from "./Fetch";

function useRequestImplement<TData, TParams extends any[]>(
  service: Service<TData, TParams>,
  options: Options<TData, TParams> = {},
  plugins: Plugin<TData, TParams>[] = []
) {
  const { manual = false, ...rest } = options;

  if (isDev) {
    if (options.defaultParams && !Array.isArray(options.defaultParams)) {
      console.warn(
        `expected defaultParams is array, got ${typeof options.defaultParams}`
      );
    }
  }

  const fetchOptions = {
    manual,
    ...rest,
  };

  // service 实例
  const serviceRef = useLatest(service);

  const update = useUpdate();

  // 保证请求实例不会发生变化
  const fetchInstance = useCreation(() => {
    // 执行 某个 plugin 的 onInit 方法，初始化状态值
    const initState = plugins
      .map((p) => p?.onInit?.(fetchOptions))
      .filter(Boolean);

    // 返回请求实例
    return new Fetch<TData, TParams>(
      serviceRef,
      fetchOptions,
      // 强制组件重新渲染
      update,
      Object.assign({}, ...initState)
    );
  }, []);

  fetchInstance.options = fetchOptions;
  // run all plugins hooks
  fetchInstance.pluginImpls = plugins.map((p) =>
    p(fetchInstance, fetchOptions)
  );

  useMount(() => {
    // 默认 false，在初始化时自动执行 service
    if (!manual) {
      const params = fetchInstance.state.params || options.defaultParams || [];
      fetchInstance.run(...params);
    }
  });

  useUnmount(() => {
    // 组件卸载 取消
    fetchInstance.cancel();
  });

  // useRequest 返回值
  return {
    loading: fetchInstance.state.loading,
    data: fetchInstance.state.data,
    error: fetchInstance.state.error,
    params: fetchInstance.state.params || [],
    cancel: useMemoizedFn(fetchInstance.cancel.bind(fetchInstance)),
    refresh: useMemoizedFn(fetchInstance.refresh.bind(fetchInstance)),
    refreshAsync: useMemoizedFn(fetchInstance.refreshAsync.bind(fetchInstance)),
    run: useMemoizedFn(fetchInstance.run.bind(fetchInstance)),
    runAsync: useMemoizedFn(fetchInstance.runAsync.bind(fetchInstance)),
    mutate: useMemoizedFn(fetchInstance.mutate.bind(fetchInstance)),
  } as Result<TData, TParams>;
}

export default useRequestImplement;
```

### Fetch 类

```tsx
/* eslint-disable @typescript-eslint/no-parameter-properties */
import type { MutableRefObject } from "react";
import type {
  FetchState,
  Options,
  PluginReturn,
  Service,
  Subscribe,
} from "./types";
import { isFunction } from "../../../../utils";

/**
 * 插件化机制
 * 只负责完成整体流程的功能，额外的功能都交给插件去实现
 * 符合职责单一原则：一个 Plugin 只负责一件事，相互之间不相关，可维护性高、可测试性强
 * 符合深模块的软件设计理念。https://www.cnblogs.com/hhelibeb/p/10708951.html
 * */
export default class Fetch<TData, TParams extends any[]> {
  // 插件执行后返回的方法列表
  pluginImpls: PluginReturn<TData, TParams>[];
  // 计数器(锁)
  count: number = 0;

  // 状态值 - 几个重要的数据
  state: FetchState<TData, TParams> = {
    loading: false,
    params: undefined,
    data: undefined,
    error: undefined,
  };

  constructor(
    // 请求示例 ref
    public serviceRef: MutableRefObject<Service<TData, TParams>>,
    public options: Options<TData, TParams>,
    // 订阅-更新函数
    public subscribe: Subscribe,
    // 初始状态值
    public initState: Partial<FetchState<TData, TParams>> = {}
  ) {
    this.state = {
      ...this.state,
      loading: !options.manual, // 非手动，loading 设为 true
      ...initState,
    };
  }

  // 更新状态函数
  setState(s: Partial<FetchState<TData, TParams>> = {}) {
    this.state = {
      ...this.state,
      ...s,
    };
    // 更新，通知 useRequestImplement 组件重新渲染，获取到最新状态值
    this.subscribe();
  }

  // 执行特定阶段的插件方法，包含了一个请求从开始到结束的生命周期（：Mutate 除外
  runPluginHandler(event: keyof PluginReturn<TData, TParams>, ...rest: any[]) {
    // @ts-ignore
    const r = this.pluginImpls.map((i) => i[event]?.(...rest)).filter(Boolean);
    // 返回值
    return Object.assign({}, ...r);
  }

  // 执行请求的核心方法！！！
  // 如果设置了 options.manual = true，则 useRequest 不会默认执行，需要通过 run 或者 runAsync 来触发执行。
  // runAsync 是一个返回 Promise 的异步函数，如果使用 runAsync 来调用，则意味着你需要自己捕获异常。
  async runAsync(...params: TParams): Promise<TData> {
    // 计数器（锁），cancel 请求需要
    this.count += 1;
    const currentCount = this.count;

    // 请求前
    const {
      stopNow = false,
      returnNow = false,
      ...state
    } = this.runPluginHandler("onBefore", params);

    // stop request
    if (stopNow) {
      return new Promise(() => {});
    }

    this.setState({
      // loading
      loading: true,
      params,
      ...state,
    });

    // return now
    // 立即返回，与缓存策略有关
    if (returnNow) {
      return Promise.resolve(state.data);
    }

    // options 的 onBefore 回调
    this.options.onBefore?.(params);

    // 执行请求
    try {
      // replace service
      // 与缓存策略有关，如果有 cache 的 service 实例，则直接使用缓存的实例
      let { servicePromise } = this.runPluginHandler(
        "onRequest",
        this.serviceRef.current,
        params
      );

      if (!servicePromise) {
        servicePromise = this.serviceRef.current(...params);
      }

      const res = await servicePromise;

      if (currentCount !== this.count) {
        // prevent run.then when request is canceled
        return new Promise(() => {});
      }

      // const formattedResult = this.options.formatResultRef.current ? this.options.formatResultRef.current(res) : res;

      // 更新状态
      this.setState({
        data: res,
        error: undefined,
        loading: false,
      });

      // options 的 onSuccess 回调
      this.options.onSuccess?.(res, params);

      // plugin 的 Onsuccess 事件
      this.runPluginHandler("onSuccess", res, params);

      // options 的 onFinally 回调
      this.options.onFinally?.(params, res, undefined);

      if (currentCount === this.count) {
        // plugin 的 onFinally 事件
        this.runPluginHandler("onFinally", params, res, undefined);
      }

      return res;
      // 异常捕获
    } catch (error) {
      if (currentCount !== this.count) {
        // prevent run.then when request is canceled
        return new Promise(() => {});
      }

      // 更新状态
      this.setState({
        error,
        loading: false,
      });

      // options 的 onError 回调
      this.options.onError?.(error, params);

      // plugin 的 onError 事件
      this.runPluginHandler("onError", error, params);

      // options 的 onFinally 回调
      this.options.onFinally?.(params, undefined, error);

      // plugin 的 onFinally 事件
      if (currentCount === this.count) {
        this.runPluginHandler("onFinally", params, undefined, error);
      }

      // 抛出异常
      throw error;
    }
  }

  // run 同步函数，其内部调用了 runAsync 方法
  run(...params: TParams) {
    this.runAsync(...params).catch((error) => {
      if (!this.options.onError) {
        console.error(error);
      }
    });
  }

  // 取消当前正在进行的请求
  cancel() {
    // 设置 this.count + 1，在 runAsync 的执行过程中，通过判断 currentCount !== this.count，达到取消请求的目的
    this.count += 1;
    this.setState({
      loading: false,
    });

    // 执行 plugin 的 onCancel
    this.runPluginHandler("onCancel");
  }

  // 使用上一次的 params，重新调用 run
  refresh() {
    // @ts-ignore
    this.run(...(this.state.params || []));
  }

  // 使用上一次的 params，重新调用 runAsync
  refreshAsync() {
    // @ts-ignore
    return this.runAsync(...(this.state.params || []));
  }

  // 修改 data
  mutate(data?: TData | ((oldData?: TData) => TData | undefined)) {
    const targetData = isFunction(data) ? data(this.state.data) : data;
    this.runPluginHandler("onMutate", targetData);
    this.setState({
      data: targetData,
    });
  }
}
```

## Loading Delay

[文档地址](https://ahooks.js.org/zh-CN/hooks/use-request/loading-delay)

[详细代码](https://github.com/alibaba/hooks/blob/master/packages/hooks/src/useRequest/src/plugins/useLoadingDelayPlugin.ts)

```tsx
import type { Plugin, Timeout } from "../types";
import { useRef } from "react";

const useLoadingDelayPlugin: Plugin<any, any[]> = (
  fetchInstance,
  { loadingDelay, ready }
) => {
  const timerRef = useRef<Timeout>();

  if (!loadingDelay) {
    return {};
  }

  // 清除定时器
  const cancelTimout = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
  };

  return {
    // 请求前调用
    onBefore: () => {
      cancelTimout();

      // 通过 setTimeout 实现延迟 loading 变为 true 的时间
      if (!ready) {
        timerRef.current = setTimeout(() => {
          fetchInstance.setState({
            loading: true,
          });
        }, loadingDelay);
      }

      // 不管是手动还是非手动，先在请求前把 loading 置为 false
      return {
        loading: false,
      };
    },
    onFinally: () => {
      cancelTimout();
    },
    onCancel: () => {
      cancelTimout();
    },
  };
};
export default useLoadingDelayPlugin;
```

## 轮询

[文档地址](https://ahooks.js.org/zh-CN/hooks/use-request/polling)

[详细代码](https://github.com/alibaba/hooks/blob/master/packages/hooks/src/useRequest/src/plugins/usePollingPlugin.ts)

```tsx
import type { Plugin, Timeout } from "../types";
import useUpdateEffect from "@/hooks/useUpdateEffect";
import { useRef } from "react";
import isDocumentVisible from "../utils/isDocumentVisible";
import subscribeReVisible from "../utils/subscribeReVisible";

const usePollingPlugin: Plugin<any, any[]> = (
  fetchInstance,
  { pollingInterval, pollingWhenHidden = true, pollingErrorRetryCount = -1 }
) => {
  const timerRef = useRef<Timeout>();
  // 清除订阅事件的函数
  const unsubscribeRef = useRef<() => void>();
  // 执行错误次数
  const countRef = useRef<number>(0);

  const stopPolling = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    // 执行清除订阅事件的函数
    unsubscribeRef.current?.();
  };

  useUpdateEffect(() => {
    if (!pollingInterval) {
      stopPolling();
    }
  }, [pollingInterval]);

  // pollingInterval: 轮询间隔，单位为毫秒。如果值大于 0，则处于轮询模式，否则直接返回。
  if (!pollingInterval) {
    return {};
  }

  return {
    onBefore: () => {
      stopPolling();
    },
    onError: () => {
      countRef.current += 1;
    },
    onSuccess: () => {
      countRef.current = 0;
    },
    // 在 onFinally 阶段，通过定时器 setTimeout 进行轮询
    onFinally: () => {
      if (
        // pollingErrorRetryCount: 轮询错误重试次数。如果设置为 -1，则无限次
        pollingErrorRetryCount === -1 ||
        // When an error occurs, the request is not repeated after pollingErrorRetryCount retries
        (pollingErrorRetryCount !== -1 &&
          countRef.current <= pollingErrorRetryCount)
      ) {
        timerRef.current = setTimeout(() => {
          // pollingWhenHidden: 在页面隐藏时，是否继续轮询。如果设置为 false，在页面隐藏时会暂时停止轮询，页面重新显示时继续上次轮询
          // if pollingWhenHidden = false && document is hidden, then stop polling and subscribe revisible
          if (!pollingWhenHidden && !isDocumentVisible()) {
            // 通过 subscribeReVisible 进行订阅，并返回清除订阅事件的函数
            unsubscribeRef.current = subscribeReVisible(() => {
              fetchInstance.refresh();
            });
          } else {
            fetchInstance.refresh();
          }
        }, pollingInterval);
      } else {
        countRef.current = 0;
      }
    },
    onCancel: () => {
      stopPolling();
    },
  };
};

export default usePollingPlugin;
```

## Ready

[文档地址](https://ahooks.js.org/zh-CN/hooks/use-request/ready)

## 依赖刷新

[文档地址](https://ahooks.js.org/zh-CN/hooks/use-request/refresy-deps)

[详细代码](https://github.com/alibaba/hooks/blob/master/packages/hooks/src/useRequest/src/plugins/useAutoRunPlugin.ts)

```tsx
import useUpdateEffect from "@/hooks/useUpdateEffect";
import { useRef } from "react";
import type { Plugin } from "../types";

// support refreshDeps & ready
const useAutoRunPlugin: Plugin<any, any[]> = (
  fetchInstance,
  {
    manual,
    ready = true,
    defaultParams = [],
    refreshDeps = [],
    refreshDepsAction,
  }
) => {
  const hasAutoRun = useRef(false);
  hasAutoRun.current = false;

  /**
   * Ready
   * useUpdateEffect 等同于 useEffect，但会忽略首次执行，只在依赖更新时执行
   * */
  useUpdateEffect(() => {
    // 自动请求模式并且 ready 值为 true
    if (!manual && ready) {
      hasAutoRun.current = true;
      // 执行请求
      fetchInstance.run(...defaultParams);
    }
  }, [ready]);

  /**
   * 依赖刷新
   * */
  useUpdateEffect(() => {
    if (hasAutoRun.current) {
      return;
    }
    // 自动请求模式
    if (!manual) {
      hasAutoRun.current = true;
      // 自定义依赖数组变化时的请求行为
      if (refreshDepsAction) {
        refreshDepsAction();
      } else {
        // 调用 refresh 方法，实现刷新重复上一次请求的效果
        fetchInstance.refresh();
      }
    }
  }, [...refreshDeps]);

  return {
    // 在 onBefore 阶段，当 ready 值为 false 时，返回 stopNow
    onBefore: () => {
      if (!ready) {
        return {
          stopNow: true,
        };
      }
    },
  };
};

export default useAutoRunPlugin;
```

## 屏幕聚焦重新请求

[文档地址](https://ahooks.js.org/zh-CN/hooks/use-request/refresh-on-window-focus)

[详细代码](https://github.com/alibaba/hooks/blob/master/packages/hooks/src/useRequest/src/plugins/useRefreshOnWindowFocusPlugin.ts)

```tsx
// 使用闭包的简易版节流函数
export default function limit(fn: any, timespan: number) {
  // 设置一个标识位，标识还在 pending 阶段，不进行请求
  let pending = false;
  return (...args: any[]) => {
    // 正处于 pending，则直接返回
    if (pending) return;
    pending = true;
    fn(...args);
    setTimeout(() => {
      // 标识位置为 false，允许请求
      pending = false;
    }, timespan);
  };
}
```

```tsx
import isBrowser from "../../../../../utils/isBrowser";

export default function isOnline(): boolean {
  if (isBrowser && typeof navigator.onLine !== "undefined") {
    return navigator.onLine;
  }
  return true;
}
```

```tsx
import isBrowser from "../../../../../utils/isBrowser";

export default function isDocumentVisible(): boolean {
  if (isBrowser) {
    // document.visibilityState 只读属性，返回 document 的可见性
    return document.visibilityState !== "hidden";
  }

  return true;
}
```

```tsx
import isBrowser from "../../../../../utils/isBrowser";
import isDocumentVisible from "../utils/isDocumentVisible";
import isOnline from "../utils/isOnline";

type Listener = () => void;

// 全局变量，维护一个事件队列，存放订阅的事件
const listeners: Listener[] = [];

// 订阅事件
function subscribe(listener: Listener) {
  listeners.push(listener);
  // 返回取消订阅函数
  return function unsubscribe() {
    const index = listeners.indexOf(listener);
    if (index > -1) {
      listeners.splice(index, 1);
    }
  };
}

if (isBrowser) {
  const revalidate = () => {
    // document 不可见，或者断网时，直接返回
    if (!isDocumentVisible() || !isOnline()) return;
    for (let i = 0; i < listeners.length; i++) {
      const listener = listeners[i];
      listener();
    }
  };
  // 监听 visibilitychange 事件
  window.addEventListener("visibilityChange", revalidate, false);
  // 监听 focus 事件
  window.addEventListener("focus", revalidate, false);
}

export default subscribe;
```

```tsx
import { useEffect, useRef } from "react";
import type { Plugin } from "../types";
import useUnmount from "@/hooks/useUnmount";
import limit from "../utils/limit";
import subscribeFocus from "../utils/subscribeFocus";

const useRefreshOnWindowFocusPlugin: Plugin<any, any[]> = (
  fetchInstance,
  { refreshOnWindowFocus, focusTimespan = 5000 }
) => {
  // 清除订阅事件的函数
  const unsubscribeRef = useRef<() => void>();

  const stopSubscribe = () => {
    // 执行清除订阅事件的函数
    unsubscribeRef.current?.();
  };

  /**
   * options.refreshOnWindowFocus、options.focusTimespan 支持动态变化
   * */
  useEffect(() => {
    // options.refreshOnWindowFocus 为 true，在屏幕重新获取焦点或重新显示时，重新发起请求
    // (: 默认自上一次请求后回到页面的时间间隔大于 5000ms，才重新发起请求
    if (refreshOnWindowFocus) {
      // 根据 focusTimespan，判断是否进行请求
      const limitRefresh = limit(
        fetchInstance.refresh.bind(fetchInstance),
        focusTimespan
      );
      // 存放在订阅事件列表中
      unsubscribeRef.current = subscribeFocus(() => {
        limitRefresh();
      });
    }
    return () => {
      stopSubscribe();
    };
  }, [refreshOnWindowFocus, focusTimespan]);

  useUnmount(() => {
    stopSubscribe();
  });

  return {};
};

export default useRefreshOnWindowFocusPlugin;
```

## 防抖

[文档地址](https://ahooks.js.org/zh-CN/hooks/use-request/debounce)

[详细代码](https://github.com/alibaba/hooks/blob/master/packages/hooks/src/useRequest/src/plugins/useDebouncePlugin.ts)

```tsx
import type { Plugin } from "../types";
import debounce from "lodash/debounce";
import { useRef, useMemo, useEffect } from "react";
import type { DebouncedFunc, DebounceSettings } from "lodash";

/**
 * 函数劫持，加入防抖逻辑
 * loadash debounce: 创建一个 debounced（防抖动）函数，该函数会从上一次被调用后，延迟 wait 毫秒后调用 func 方法。
 * https://www.lodashjs.com/docs/lodash.debounce
 * */
const useDebouncePlugin: Plugin<any, any[]> = (
  fetchInstance,
  { debounceWait, debounceLeading, debounceTrailing, debounceMaxWait }
) => {
  const debouncedRef = useRef<DebouncedFunc<any>>();

  const options = useMemo(() => {
    const ret: DebounceSettings = {};
    if (debounceLeading !== undefined) {
      ret.leading = debounceLeading;
    }
    if (debounceTrailing !== undefined) {
      ret.trailing = debounceTrailing;
    }
    if (debounceMaxWait !== undefined) {
      ret.maxWait = debounceMaxWait;
    }
    return ret;
  }, [debounceLeading, debounceTrailing, debounceMaxWait]);

  useEffect(() => {
    if (debounceWait) {
      // 保存原函数
      const _originRunAsync = fetchInstance.runAsync.bind(fetchInstance);

      // 使用 lodash 的 debounce
      // 该函数提供一个 cancel 方法取消延迟的函数调用
      debouncedRef.current = debounce(
        (callback) => {
          callback();
        },
        debounceWait,
        options
      );

      // 函数劫持，改写 runAsync 方法，使其具有防抖能力
      // debounce runAsync should be promise
      // https://github.com/lodash/lodash/issues/4400#issuecomment-834800398
      fetchInstance.runAsync = (...args) => {
        return new Promise((resolve, reject) => {
          debouncedRef.current?.(() => {
            // 执行原函数
            _originRunAsync(...args)
              .then(resolve)
              .catch(reject);
          });
        });
      };

      return () => {
        // cancel 掉防抖函数
        debouncedRef.current?.cancel();
        // 还原原函数
        fetchInstance.runAsync = _originRunAsync;
      };
    }
  }, [debounceWait, options]);

  if (!debounceWait) {
    return {};
  }

  return {
    onCancel: () => {
      debouncedRef.current?.cancel();
    },
  };
};

export default useDebouncePlugin;
```

## 节流

[文档地址](https://ahooks.js.org/zh-CN/hooks/use-request/throttle)

[详细代码](https://github.com/alibaba/hooks/blob/master/packages/hooks/src/useRequest/src/plugins/useThrottlePlugin.ts)

```tsx
import type { Plugin } from "../types";
import throttle from "lodash/throttle";
import { useRef, useMemo, useEffect } from "react";
import type { DebouncedFunc, ThrottleSettings } from "lodash";

/**
 * 函数劫持，加入节流逻辑
 * loadash throttle: 创建一个节流函数，在 wait 秒内最多执行 func 一次的函数。
 * https://www.lodashjs.com/docs/lodash.throttle
 * */
const useThrottlePlugin: Plugin<any, any[]> = (
  fetchInstance,
  { throttleWait, throttleLeading, throttleTrailing }
) => {
  const throttledRef = useRef<DebouncedFunc<any>>();

  const options = useMemo(() => {
    const ret: ThrottleSettings = {};
    if (throttleLeading !== undefined) {
      ret.leading = throttleLeading;
    }
    if (throttleTrailing !== undefined) {
      ret.trailing = throttleTrailing;
    }
    return ret;
  }, [throttleLeading, throttleTrailing]);

  useEffect(() => {
    if (throttleWait) {
      // 保存原函数
      const _originRunAsync = fetchInstance.runAsync.bind(fetchInstance);

      // 使用 lodash 的 throttle
      // 该函数提供一个 cancel 方法取消延迟的函数调用
      throttledRef.current = throttle(
        (callback) => {
          callback();
        },
        throttleWait,
        options
      );

      // 函数劫持，改写 runAsync 方法，使其具有节流能力
      // throttle runAsync should be promise
      // https://github.com/lodash/lodash/issues/4400#issuecomment-834800398
      fetchInstance.runAsync = (...args) => {
        return new Promise((resolve, reject) => {
          throttledRef.current?.(() => {
            // 执行原函数
            _originRunAsync(...args)
              .then(resolve)
              .catch(reject);
          });
        });
      };

      return () => {
        // cancel 掉节流函数
        throttledRef.current?.cancel();
        // 还原原函数
        fetchInstance.runAsync = _originRunAsync;
      };
    }
  }, [throttleWait, options]);

  if (!throttleWait) {
    return {};
  }

  return {
    onCancel: () => {
      throttledRef.current?.cancel();
    },
  };
};

export default useThrottlePlugin;
```

## 缓存 & SWR

[文档地址](https://ahooks.js.org/zh-CN/hooks/use-request/cache)

[详细代码](https://github.com/alibaba/hooks/blob/master/packages/hooks/src/useRequest/src/plugins/useCachePlugin.ts)

```tsx
type Timer = ReturnType<typeof setTimeout>;
type CachedKey = string | number;

export interface CachedData<TData = any, TParams = any> {
  data: TData;
  params: TParams;
  time: number;
}
interface RecordData extends CachedData {
  timer: Timer | undefined;
}

// 通过 map 结构进行缓存
const cache = new Map<CachedKey, RecordData>();

// 设置缓存
const setCache = (
  key: CachedKey,
  cacheTime: number,
  cachedData: CachedData
) => {
  // 是否已存在
  const currentCache = cache.get(key);
  // 如果存在，则先清除
  if (currentCache?.timer) {
    clearTimeout(currentCache.timer);
  }

  let timer: Timer | undefined = undefined;

  // 如果设置为 -1，则表示缓存数据永不过期
  if (cacheTime > -1) {
    // if cache out, clear it
    timer = setTimeout(() => {
      cache.delete(key);
    }, cacheTime);
  }

  // 设置缓存
  cache.set(key, {
    ...cachedData,
    timer,
  });
};

// 获取缓存
const getCache = (key: CachedKey) => {
  return cache.get(key);
};

// 清空缓存
const clearCache = (key?: string | string[]) => {
  if (key) {
    // 支持清空单个缓存，或一组缓存
    const cacheKeys = Array.isArray(key) ? key : [key];
    cacheKeys.forEach((cacheKey) => cache.delete(cacheKey));
  } else {
    // 如果 cacheKey 为空，则清空所有缓存数据
    cache.clear();
  }
};

export { getCache, setCache, clearCache };
```

```tsx
type CachedKey = string | number;

const cachePromise = new Map<CachedKey, Promise<any>>();

const getCachePromise = (cacheKey: CachedKey) => {
  return cachePromise.get(cacheKey);
};

const setCachePromise = (cacheKey: CachedKey, promise: Promise<any>) => {
  // 应该缓存相同的 promise，不能是 promise.finally
  // Should cache the same promise, cannot be promise.finally
  // 因为 promise.finally 会改变 promise 的引用
  // Because the promise.finally will change the reference of the promise
  cachePromise.set(cacheKey, promise);

  // 监听 promise 状态，promise 成功或被拒绝，从缓存中删除对应的 cacheKey
  promise
    .then((res) => {
      // 在 then 和 cache 中都将 promise 缓存删除
      cachePromise.delete(cacheKey);
      return res;
    })
    .catch(() => {
      // 在 then 和 cache 中都将 promise 缓存删除
      cachePromise.delete(cacheKey);
    });
};

export { getCachePromise, setCachePromise };
```

```tsx
type Listener = (data: any) => void;

// 全局变量，维护一个事件队列，存放订阅的事件
const listeners: Record<string, Listener[]> = {};

// 触发某个属性(cacheKey)的所有事件
const trigger = (key: string, data: any) => {
  if (listeners[key]) {
    listeners[key].forEach((item) => item(data));
  }
};

// 订阅事件
const subscribe = (key: string, listener: Listener) => {
  // 每个属性(cacheKey)维护一个事件列表
  if (!listeners[key]) {
    listeners[key] = [];
  }

  listeners[key].push(listener);

  // 返回清除订阅函数
  return function unsubscribe() {
    const index = listeners[key].indexOf(listener);
    listeners[key].splice(index, 1);
  };
};

export { trigger, subscribe };
```

```tsx
import { useRef } from "react";
import type { Plugin } from "../types";
import { setCache, getCache } from "../utils/cache";
import type { CachedData } from "../utils/cache";
import useUnmount from "@/hooks/useUnmount";
import useCreation from "@/hooks/useCreation";
import { subscribe, trigger } from "../utils/cacheSubscribe";
import { getCachePromise, setCachePromise } from "../utils/cachePromise";

const useCachePlugin: Plugin<any, any[]> = (
  fetchInstance,
  {
    cacheKey,
    cacheTime = 5 * 60 * 1000,
    staleTime = 0,
    setCache: customSetCache,
    getCache: customGetCache,
  }
) => {
  const unSubscribeRef = useRef<() => void>();

  const currentPromiseRef = useRef<Promise<any>>();

  // 缓存数据
  const _setCache = (key: string, cachedData: CachedData) => {
    // 有自定义设置缓存配置，优先使用自定义缓存
    if (customSetCache) {
      customSetCache(cachedData);
    } else {
      // 调用 cache utils 中的 setCache 函数
      setCache(key, cacheTime, cachedData);
    }
    // 触发 key 的所有事件。如果 key 相同，就可以共享缓存的数据
    trigger(key, cachedData.data);
  };

  const _getCache = (key: string, params: any[] = []) => {
    // 有自定义获取缓存配置，优先使用自定义缓存
    if (customGetCache) {
      return customGetCache(params);
    }
    // 调用 cache utils 中的 getCache 函数
    return getCache(key);
  };

  // 初始化逻辑
  useCreation(() => {
    if (!cacheKey) {
      return;
    }

    // get data from cache when init
    const cacheData = _getCache(cacheKey);
    if (cacheData && Object.hasOwnProperty.call(cacheData, "data")) {
      // 直接使用缓存中的 data 和 params 进行替代，返回结果
      fetchInstance.state.data = cacheData.data;
      fetchInstance.state.params = cacheData.params;
      // staleTime 为 -1 或还存在于新鲜时间内，则设置 loading 为 false
      if (
        staleTime === -1 ||
        new Date().getTime() - cacheData.time <= staleTime
      ) {
        fetchInstance.state.loading = false;
      }
    }

    // subscribe same cachekey update, trigger update
    // 订阅同一个 cacheKey 的更新。假如两个都是用的同一个 cacheKey，它们的内容可以全局同享
    unSubscribeRef.current = subscribe(cacheKey, (data) => {
      fetchInstance.setState({ data });
    });
  }, []);

  useUnmount(() => {
    unSubscribeRef.current?.();
  });

  if (!cacheKey) {
    return {};
  }

  return {
    // 请求前
    onBefore: (params) => {
      // 获取缓存
      const cacheData = _getCache(cacheKey, params);

      if (!cacheData || !Object.hasOwnProperty.call(cacheData, "data")) {
        return {};
      }

      // staleTime 为 -1 或还存在于新鲜时间内，直接返回，不需要重新请求
      // If the data is fresh, stop request
      if (
        staleTime === -1 ||
        new Date().getTime() - cacheData.time <= staleTime
      ) {
        return {
          loading: false,
          data: cacheData?.data,
          error: undefined,
          returnNow: true, // 控制直接返回
        };
      } else {
        // If the data is stale, return data, and request continue
        return {
          data: cacheData?.data,
          error: undefined,
        };
      }
    },
    // 请求阶段，缓存 promise。保证在同一时间点，采用了同一个 cacheKey 的请求只有一个请求被发起
    onRequest: (service, args) => {
      // 查看 promise 有没有缓存
      // 假如 promise 已经执行完成，则为 undefined。也就是没有同样 cacheKey 在执行。
      let servicePromise = getCachePromise(cacheKey);

      // If has servicePromise, and is not trigger by self, then use it
      // 如果有 servicePromise，并且不等于之前自己触发的请求，那么就使用它
      if (servicePromise && servicePromise !== currentPromiseRef.current) {
        return { servicePromise };
      }

      // 执行请求
      servicePromise = service(...args);
      // 保存本次触发的 promise 值
      currentPromiseRef.current = servicePromise;
      // 设置 promise 缓存
      setCachePromise(cacheKey, servicePromise);
      return { servicePromise };
    },
    // 请求成功
    onSuccess: (data, params) => {
      if (cacheKey) {
        // cancel subscribe, avoid trigger self
        // 取消订阅，避免触发到自己
        unSubscribeRef.current?.();
        // 缓存数据
        _setCache(cacheKey, {
          data,
          params,
          time: new Date().getTime(),
        });
        // resubscribe
        // 重新订阅以获取更新后的数据
        unSubscribeRef.current = subscribe(cacheKey, (d) => {
          fetchInstance.setState({ data: d });
        });
      }
    },
    // 手动修改 data
    onMutate: (data) => {
      if (cacheKey) {
        // cancel subscribe, avoid trigger self
        unSubscribeRef.current?.();
        _setCache(cacheKey, {
          data,
          params: fetchInstance.state.params,
          time: new Date().getTime(),
        });
        // resubscribe
        unSubscribeRef.current = subscribe(cacheKey, (d) => {
          fetchInstance.setState({ data: d });
        });
      }
    },
  };
};

export default useCachePlugin;
```

## 错误重试

[文档地址](https://ahooks.js.org/zh-CN/hooks/use-request/retry)

[详细代码](https://github.com/alibaba/hooks/blob/master/packages/hooks/src/useRequest/src/plugins/useRetryPlugin.ts)

```tsx
import type { Plugin, Timeout } from "../types";
import { useRef } from "react";

const useRetryPlugin: Plugin<any, any[]> = (
  fetchInstance,
  { retryCount, retryInterval }
) => {
  const timerRef = useRef<Timeout>();
  // 记录 retry 的次数
  const countRef = useRef(0);

  // 标记是否由重试触发
  const triggerByRetry = useRef(false);

  if (!retryCount) {
    return {};
  }

  return {
    /**
     * 避免 useRequest 重新执行，导致请求重新发起
     * 在 onBefore 里做一些重置处理，以防和上一次的 retry 定时器撞车
     * */
    onBefore: () => {
      // 不是由重试触发，重置 count
      if (!triggerByRetry.current) {
        countRef.current = 0;
      }
      // 重置 triggerByRetry 为 false
      triggerByRetry.current = false;

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    },
    onSuccess: () => {
      // 重置为 0
      countRef.current = 0;
    },
    onError: () => {
      countRef.current += 1;
      // 重试的次数小于设置的次数
      // 或者 retryCount 设置为 -1，无限次重试
      if (retryCount === -1 || countRef.current <= retryCount) {
        // Exponential backoff
        // 如果不设置，默认采用简易的指数退避算法，取 1000 * 2 ** retryCount，也就是第一次重试等待 2s，第二次重试等待 4s，以此类推，如果大于 30s，则取 30s
        const timeout =
          retryInterval ?? Math.min(1000 * 2 ** countRef.current, 30000);
        timerRef.current = setTimeout(() => {
          // triggerByRetry 置为 true，保证重试次数不重置
          triggerByRetry.current = true;
          // 重新请求
          fetchInstance.refresh();
        }, timeout);
      } else {
        // 重置为 0
        countRef.current = 0;
      }
    },
    onCancel: () => {
      // 重置为 0
      countRef.current = 0;
      // 清除定时器
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    },
  };
};

export default useRetryPlugin;
```
