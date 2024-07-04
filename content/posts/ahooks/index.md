---
title: "💻 ahooks@3.8.0 源码解读"
date: 2023-11-23T23:30:14+08:00
tags: ["第一技能"]
categories: ["第一技能"]
---

ahooks，发音 [eɪ hʊks]，是一套高质量可靠的 React Hooks 库。它有很多特性，易学易用、支持 SSR、对输入输出函数做了特殊处理且避免闭包问题等。

本篇文章主要对 ahooks@3.8.0 的源码进行解读，欢迎您的指正和点赞。

<!--more-->

ahooks 官网地址：[ahooks](https://ahooks.js.org/zh-CN)

React 官网地址：[react](https://ahooks.js.org/zh-CN)

Github 项目地址： [ahooks-analysis](https://github.com/OweQian/ahooks-analysis.git)

Notion 笔记预览地址： [ahooks@3.8.0 源码解读](https://bumpy-iodine-8d0.notion.site/b34798801d044b078133083931a8f732?v=b0b6b9a74a284af8bdb5006e2b32733e)

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/ahooks/img-ahooks.jpeg" alt="" width="100%" />

## useRequest

### 基础用法

useRequest 是一个强大的异步数据管理的 Hooks，React 项目中的网络请求场景使用 useRequest 就够了。

useRequest 通过插件式组织代码，核心代码极其简单，并且可以很方便的扩展出更高级的功能。目前已有能力包括：

- 自动请求/手动请求
- 轮询
- 防抖
- 节流
- 屏幕聚焦重新请求
- 错误重试
- loading delay
- SWR(stale-while-revalidate)
- 缓存

#### 默认请求

useRequest 第一个参数是一个异步函数，在组件初始化时，会自动执行该异步函数。同时自动管理该异步函数的 loading, data, error 等状态。

```tsx
const { data, error, loading } = useRequest(getUsername);
```

[读取用户名称 - CodeSandbox](https://codesandbox.io/s/4hdx93)

#### 手动触发

如果设置了` options.manual = true`，则 useRequest 不会默认执行，需要通过 run 或者 runAsync 来触发执行。

```tsx
const { loading, run, runAsync } = useRequest(changeUsername, {
  manual: true,
});
```

run 与 runAsync 的区别在于：

- run 是一个普通的同步函数，我们会自动捕获异常，你可以用过 options.onError 来处理异常时的行为。
- runAsync 是一个返回 Promise 的异步函数，如果使用 runAsync 来调用，则意味着你需要自己捕获异常。

```tsx
runAsync()
  .then((data) => {
    console.log(data);
  })
  .catch((error) => {
    console.log(error);
  });
```

[修改用户名 - CodeSandbox](https://codesandbox.io/s/t72dpw)

[修改用户名](https://codesandbox.io/p/sandbox/xiu-gai-yong-hu-ming-wyzdys)

#### 生命周期

useRequest 提供了以下几个生命周期配置项，供你在异步函数的不同阶段做一些处理。

- onBefore: 请求之前触发
- onSuccess: 请求成功触发
- onError: 请求失败触发
- onFinally: 请求完成触发

[unruffled-rosalind-k92hpn - CodeSandbox](https://codesandbox.io/s/k92hpn)

#### 刷新（重复上一次请求）

useRequest 提供了 refresh 和 refreshAsync 方法，使我们可以使用上一次的参数，重新发起请求。

假如在读取用户信息的场景中

1、我们读取了 ID 为 1 的用户信息 run(1)

2、我们通过某种手段更新了用户信息

3、我们想重新发起上一次请求，那我们就可以使用 refresh 来代替 run(1)，这在复杂场景中是非常有用的。

[刷新用户名称 - CodeSandbox](https://codesandbox.io/s/2d7mqv)

refresh 和 refreshAsync 的区别和 run 和 runAsync 是一致的。

#### 立即变更数据

useRequest 提供了 mutate，支持立即修改 useRequest 返回的 data 参数。

mutate 的用法与 React.setState 一致，支持 mutate(newData) 和 mutate(oldData ⇒ newData) 两种写法。

[修改用户名 - CodeSandbox](https://codesandbox.io/s/dtddgn)

#### 取消响应

useRequest 提供了 cancel 函数，用于忽略当前 promise 返回的数据和错误。

注意：调用 cancel 函数并不会取消 promise 的执行。

同时 useRequest 会在以下时机自动忽略响应：

- 组件卸载时，正在进行的 promise
- 竞态取消，当上一次 promise 还没返回时，又发起了下一次 promise，则会忽略上一次 promise 的响应

[cranky-bell-3tnfn8 - CodeSandbox](https://codesandbox.io/s/3tnfn8)

#### 参数管理

useRequest 返回的 params 会记录当次调用 service 的参数数组。比如你触发了 run(1, 2, 3)，则 params 等于 [1, 2, 3]。

如果设置了 options.manual = false，则首次调用 service 的参数可以通过 options.defaultParams 来设置。

[great-einstein-nsn894 - CodeSandbox](https://codesandbox.io/s/nsn894)

#### API

```tsx
const {
	loading: boolean,
	data?: TData,
	error?: Error,
	params: TParams || [],
	run: (...params: TParams) => void,
	runAsync: (...params: TParams) => Promise<TData>,
	refresh: () => void,
	refreshAsync: () => Promise<TData>,
	mutate: (data?: TData | ((oldData?: TData) => (TData | undefined))) => void,
	cancel: () => void,
} = useRequest<TData, TParams>(
	service: (...args: TParams) => Promise<TData>,
	{
		manual?: boolean,
		defaultParams?: TParams,
		onBefore?: (params: TParams) => void,
		onSuccess?: (data: TData, params: TParams) => void,
		onError?: (e: Error, params: TParams) => void,
		onFinally?: (params: TParams, data?: TData, e?: Error) => void,
	}
)
```

##### Options

| 参数          | 说明                                                                                               | 类型                                               | 默认值 |
| ------------- | -------------------------------------------------------------------------------------------------- | -------------------------------------------------- | ------ |
| manual        | 默认 false，即在初始化时自动执行 service。如果设置为 true，则需要手动调用 run 或 runAsync 触发执行 | boolean                                            | false  |
| defaultParams | 首次默认执行时，传递给 service 的参数                                                              | TParams                                            | -      |
| onBefore      | service 执行前触发                                                                                 | (params: TParams) => void                          | -      |
| onSuccess     | service resolve 时触发                                                                             | (data: TData, params: TParams) => void             | -      |
| onError       | service reject 时触发                                                                              | (e: Error, params: TParams) => void                | -      |
| onFinally     | service 执行完成时触发                                                                             | (params: TParams, data?: TData, e?: Error) => void | -      |

##### Result

| 参数         | 说明                                                                               | 类型                                                                |
| ------------ | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| loading      | service 是否正在执行                                                               | boolean                                                             |
| data         | service 返回的数据                                                                 | TData \| undefined                                                  |
| error        | service 抛出的异常                                                                 | Error \| undefined                                                  |
| params       | 当次执行的 service 的参数数组。比如你触发了 run(1, 2, 3)，则 params 等于 [1, 2, 3] | TParams \| []                                                       |
| run          | 手动触发 service 执行，参数会传递给 service。异常自动处理，通过 onError 反馈。     | (…params: TParams) ⇒ void                                           |
| runAsync     | 与 run 用法一致，但返回的是 Promise，需要自行处理异常。                            | (…params: TParams) ⇒ Promise\<TData\>                               |
| refresh      | 使用上一次的 params，重新调用 run                                                  | () ⇒ void                                                           |
| refreshAsync | 使用上一次的 params，重新调用 runAsync                                             | () ⇒ Promise\<TData\>                                               |
| mutate       | 直接修改 data                                                                      | (data?: TData \| ((oldData?: TData) ⇒ (TData \| undefined))) ⇒ void |
| cancel       | 忽略当前 Promise 的响应                                                            | () ⇒ void                                                           |

### 核心原理

#### 架构图

useRequest 的模块分为三大块：Core、Plugins、utils。

Plugins: useRequest 通过插件式组件代码，基本上每个功能点对应一个插件。通过插件化机制降低了每个功能之间的耦合度，也降低了其本身的复杂度。

Core: 整个 useRequest 的核心代码，处理了整个请求的生命周期。

utils: 工具方法。

#### 源码解析

##### useRequest 入口

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

##### useRequestImplement 方法

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

##### Fetch 类

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

### Loading Delay

通过设置 options.loadingDelay，可以延迟 loading 变成 true 的时间，有效防止闪烁。

```tsx
const { loading, data } = useRequest(getUsername, {
  loadingDelay: 300,
});

return <div>{loading ? "Loading..." : data}</div>;
```

[peaceful-elgamal-o4uk15 - CodeSandbox](https://codesandbox.io/s/o4uk15)

#### API

| 参数         | 说明                              | 类型   | 默认值 |
| ------------ | --------------------------------- | ------ | ------ |
| loadingDelay | 设置 loading 变为 true 的延迟时间 | number | 0      |

#### 备注

options.loadingDelay 支持动态变化

#### 源码解析

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

### 轮询

通过设置 options.pollingInterval，进入轮询模式，useRequest 会定时触发 service 执行。

```tsx
const { data, run, cancel } = useRequest(getUsername, {
  pollingInterval: 3000,
});
```

[zealous-matsumoto-c83gyv - CodeSandbox](https://codesandbox.io/s/c83gyv)

[cranky-ives-dzs6s7 - CodeSandbox](https://codesandbox.io/s/dzs6s7)

#### Options

| 参数                   | 说明                                                                                                   | 类型    | 默认值 |
| ---------------------- | ------------------------------------------------------------------------------------------------------ | ------- | ------ |
| pollingInterval        | 轮询间隔，单位为毫秒。如果值大于 0，则处于轮询模式。                                                   | number  | 0      |
| pollingWhenHidden      | 在页面隐藏时，是否继续轮询。如果设置为 false，在页面隐藏时会暂时停止轮询，页面重新显示时继续上次轮询。 | boolean | true   |
| pollingErrorRetryCount | 轮询错误重试次数。如果设置为 -1，则无限次。                                                            | number  | -1     |

#### Return

| 参数     | 说明     | 类型                                |
| -------- | -------- | ----------------------------------- |
| run      | 启动轮询 | (…params: TParams) ⇒ void           |
| runAsync | 启动轮询 | (…params: TParams) ⇒ Promise<TData> |
| cancel   | 停止轮询 | () ⇒ void                           |

#### 备注

- options.pollingInterval、options.pollingWhenHidden 支持动态变化
- 如果设置 options.manual = true，则初始化不会启动轮询，需要通过 run/runAsync 触发开始
- 如果设置 options.pollingInterval 由 0 变为 大于 0 的值，不会启动轮询，需要通过 run/runAsync 触发开始
- 轮询原理是在每次请求完成后，等待 options.pollingInterval 时间，发起下一次请求

#### 源码解析

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

### Ready

通过设置 options.ready，可以控制请求是否发出。当值为 false 时，请求永远都不会发出。

其具体行为如下：

1、当 manual = false 自动请求模式时，每次 ready 从 false 变为 true 时，都会自动发送请求，会带上参数 options.defaultParams。

2、当 manual = true 手动请求模式时，只要 ready = false，则通过 run/runAsync 触发的请求都不会执行。

[peaceful-wind-sz89xz - CodeSandbox](https://codesandbox.io/s/sz89xz)

[thirsty-hooks-yl2yf2 - CodeSandbox](https://codesandbox.io/s/yl2yf2)

#### Option

| 参数  | 说明                 | 类型    | 默认值 |
| ----- | -------------------- | ------- | ------ |
| ready | 当前请求是否准备好了 | boolean | true   |

### 依赖刷新

通过设置 options.refreshDeps，在依赖变化时，useRequest 会自动调用 refresh 方法，实现刷新重复上一次请求的效果。

```tsx
const [userId, setUserId] = useState("1");
const { data, run } = useRequest(() => getUserSchool(userId), {
  refreshDeps: [userId],
});
```

上面的示例代码，useRequest 会在初始化和 userId 变化时，触发函数执行。

与下面代码实现功能完全一致。

```tsx
const [userId, setUserId] = useState("1");
const { data, refresh } = useRequest(() => getUserSchool(userId));

useEffect(() => {
  refresh();
}, [userId]);
```

[重复上一次请求 - CodeSandbox](https://codesandbox.io/s/8542xm)

[自定义刷新行为 - CodeSandbox](https://codesandbox.io/s/9csy26)

#### Option

| 参数              | 说明                                                                          | 类型      | 默认值 |
| ----------------- | ----------------------------------------------------------------------------- | --------- | ------ |
| refreshDeps       | 依赖数组。当数组内容变化后刷新（重复上一次请求）。同 useEffect 的第二个参数。 | any[]     | []     |
| refreshDepsAction | 自定义依赖数组变化时的请求行为。                                              | () ⇒ void | -      |

#### 备注

如果设置 options.manual = true，则 refreshDeps，refreshDepsAction 都不再生效，需要通过 run/runAsync 手动触发请求。

#### 源码解析

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

### 屏幕聚焦重新请求

通过设置 options.refreshOnWindowFocus，在浏览器窗口 refocus 和 revisible 时，会重新发起请求。

```tsx
const { data } = useRequest(getUsername, {
  refreshOnWindowFocus: true,
});
```

[clever-ioana-gkxvnk - CodeSandbox](https://codesandbox.io/s/gkxvnk)

#### Option

| 参数                 | 说明                                         | 类型    | 默认值 |
| -------------------- | -------------------------------------------- | ------- | ------ |
| refreshOnWindowFocus | 在屏幕重新获取焦点或重新显示时，重新发起请求 | boolean | false  |
| focusTimespan        | 重新请求间隔，单位为毫秒                     | number  | 5000   |

#### 备注

options.refreshOnWindowFocus、options.focusTimespan 支持动态变化。

监听的浏览器事件为 visibilitychange 和 focus。

#### 源码解析

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

### 防抖

通过设置 options.debounceWait，进入防抖模式，此时如果频繁触发 run 或者 runAsync，则会以防抖策略进行请求。

```tsx
const { data, run } = useRequest(getUsername, {
  debounceWait: 300,
  manual: true,
});
```

[crimson-firefly-gxgpsl - CodeSandbox](https://codesandbox.io/s/gxgpsl)

#### Option

debounce 所有参数用法和效果同  [lodash.debounce](https://www.lodashjs.com/docs/lodash.debounce/)

| 参数             | 说明                                           | 类型    | 默认值 |
| ---------------- | ---------------------------------------------- | ------- | ------ |
| debounceWait     | 防抖等待时间，单位为毫秒，设置后，进入防抖模式 | number  | -      |
| debounceLeading  | 在延迟开始前执行调用                           | boolean | false  |
| debounceTrailing | 在延迟结束后执行调用                           | boolean | true   |
| debounceMaxWait  | 允许被延迟的最大值                             | number  | -      |

#### 备注

options.debouceWait、options.debounceLeading、options.debounceTrailing、options.debounceMaxWait 支持动态变化。

runAsync 在真正执行时，会返回 Promise。在未被执行时，不会有任何返回。

cancel 可以中止正在等待执行的函数。

#### 源码解析

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

### 节流

通过设置 options.throttleWait，进入节流模式，此时如果频繁触发 run 或者 runAsync，则会以节流策略进行请求。

```tsx
const { data, run } = useRequest(getUsername, {
  throttleWait: 300,
  manual: true,
});
```

[beautiful-yonath-ll44d7 - CodeSandbox](https://codesandbox.io/s/ll44d7)

#### Option

throttle 所有参数用法和效果同  [lodash.throttle](https://www.lodashjs.com/docs/lodash.throttle/)

| 参数             | 说明                                           | 类型    | 默认值 |
| ---------------- | ---------------------------------------------- | ------- | ------ |
| throttleWait     | 节流等待时间, 单位为毫秒，设置后，进入节流模式 | number  | -      |
| throttleLeading  | 在节流开始前执行调用                           | boolean | true   |
| throttleTrailing | 在节流结束后执行调用                           | boolean | true   |

#### 备注

options.throttleWait、options.throttleLeading、options.throttleTrailing 支持动态变化。

runAsync 在真正执行时，会返回 Promise。在未被执行时，不会有任何返回。

cancel 可以中止正在等待执行的函数。

#### 源码解析

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

### 缓存 & SWR

如果设置了 options.cacheKey，useRequest 会将当前请求成功的数据缓存下来。下次组件初始化时，如果有缓存数据，我们会优先返回缓存数据，然后在背后发送新请求，也就是 SWR 的能力。

你可以通过 options.staleTime 设置数据保持新鲜时间，在该时间内，我们认为数据是新鲜的，不会重新发起请求。

你也可以通过 options.cacheTime 设置数据缓存时间，超过该时间，我们会清空该条缓存数据。

#### SWR

[zealous-hoover-wfg3lj - CodeSandbox](https://codesandbox.io/s/wfg3lj)

#### 数据保持新鲜

[bold-moore-nx2m66 - CodeSandbox](https://codesandbox.io/s/nx2m66)

#### 数据共享

> 注意：如果没有发起新请求，不会触发数据共享。cacheTime、staleTime 参数会使数据共享失效。[#2313](https://github.com/alibaba/hooks/issues/2313)

同一个 cacheKey 的内容，在全局是共享的，这会带来以下几个特性：

- 请求 Promise 共享：相同的 cacheKey 同时只会有一个在发起请求，后发起的会共用同一个请求 Promise
- 数据同步：当某个 cacheKey 发起请求时，其它相同 cacheKey 的内容均会随之同步

[cool-pond-5sfdds - CodeSandbox](https://codesandbox.io/s/5sfdds)

#### 参数缓存

[fervent-butterfly-vk83cy - CodeSandbox](https://codesandbox.io/s/vk83cy)

#### 删除缓存

[silly-cherry-w2ggzj - CodeSandbox](https://codesandbox.io/s/w2ggzj)

#### 自定义缓存

通过配置 setCache 和 getCache，可以自定义数据缓存，比如将数据存储到 localStorage、IndexDB 等。

请注意：

- setCache 和 getCache 需要配套使用
- 在自定义缓存下，cacheTime 和 clearCache 不会生效，请根据实际情况自行实现

[distracted-lamarr-f8g45t - CodeSandbox](https://codesandbox.io/s/f8g45t)

#### API

```tsx
interface CachedData<TData, TParams> {
  data: TData;
  params: TParams;
  time: number;
}
```

##### Options

| 参数      | 说明                                                                                                                            | 类型                            | 默认值 |
| --------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- | ------ |
| cacheKey  | 请求的唯一标识。相同 cacheKey 的数据全局同步（cacheTime、staleTime 参数会使该机制失效）                                         | string                          | -      |
| cacheTime | 设置缓存数据回收时间。默认缓存数据 5 分钟后回收；如果设置为 -1，则表示缓存数据永不过期                                          | number                          | 300000 |
| staleTime | 缓存数据保持新鲜时间。在该时间间隔内，认为数据是新鲜的，不会重新发请求。如果设置为 -1，则表示数据永远新鲜                       | number                          | 0      |
| setCache  | 自定义设置缓存；setCache 和 getCache 需要配套使用；在自定义缓存模式下，cacheTime 和 clearCache 不会生效，请根据实际情况自行实现 | (data: CachedData) ⇒ void;      | -      |
| getCache  | 自定义读取缓存                                                                                                                  | (params: TParams) ⇒ CachedData; | -      |

##### clearCache

- 支持清空单个缓存，或一组缓存
- 如果 cacheKey 为空，则清空所有缓存数据

```tsx
import { clearCache } from 'ahooks';

clearCache(cacheKey?: string | string[]);
```

#### 备注

- 只有成功的请求数据才会缓存
- 缓存的数据包括 data 和 params

#### 源码解析

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

### 错误重试

通过设置 options.retryCount，指定错误重试次数，则 useRequest 在失败后会进行重试。

```tsx
const { data, run } = useRequest(getUsername, {
  retryCount: 3,
});
```

[quirky-architecture-w68hk9 - CodeSandbox](https://codesandbox.io/s/w68hk9)

#### Option

| 参数          | 说明                                                                                                                                                                           | 类型   | 默认值 |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ | ------ |
| retryCount    | 错误重试次数。如果设置为 -1，则无限次重试。                                                                                                                                    | number | -      |
| retryInterval | 重试时间间隔，单位为毫秒。如果不设置，默认采用简易的指数退避算法，取 1000 \* 2 \*\* retryCount，也就是第一次重试等待 2s，第二次重试等待 4s，以此类推，如果大于 30s，则取 30s。 | number | -      |

#### 备注

options.retryCount、options.retryInterval 支持动态变化。

cancel 可以取消正在进行的重试行为。

#### 源码解析

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

## Scene

### useAntdTable

useAntdTable  基于  useRequest  实现，封装了常用的  [Ant Design Form](https://ant.design/components/form-cn/)  与  [Ant Design Table](https://ant.design/components/table-cn/)  联动逻辑，并且同时支持 antd v3 和 v4。

在使用之前，你需要了解它与 useRequest 不同的几个点：

1、service 接受两个参数，第一个参数为分页数据 { current, pageSize, sorter, filters, extra }，第二个参数为表单数据

2、service 返回的数据结构为 { total: number, list: Item[] }

3、会额外返回 totalProps 和 search 字段，管理表格和表单

4、refreshDeps 变化，会重置 current 到第一页，并重新发起请求

#### API

useRequest 所有参数和返回结果均适用于 useAntdTable，此处不再赘述。

```tsx
type Data = { total: number; list: any[] };
type Params = [{ current: number; pageSize: number; filter?: any; sorter?: any; extra?: any; }, { [key: string]: any }];

const {
	...,
	tableProps: {
		dataSource: TData['list'],
		loading: boolean;
		onChange: (
			pagination: any;
			filters?: any;
			sorter?: any;
			extra?: any;
		) => void;
		pagination: {
			current: number;
			pageSize: number;
			total: number;
		}
	};
	search: {
		type: 'simple' | 'advance';
		changeType: () => void;
		submit: () => void;
		reset: () => void;
	}
} = useAntdTable<TData extends Data, TParams extends Params>(
	service: (...args: TParams) => Promise<TData>,
	{
		...,
		form?: any;
		defaultType?: 'simple' | 'advance';
		defaultParams?: TParams;
		defaultPageSize?: number;
		refreshDeps?: any[];
	}
)
```

##### Params

| 参数            | 说明                                                      | 类型                   | 默认值            |
| --------------- | --------------------------------------------------------- | ---------------------- | ----------------- |
| form            | Form 实例                                                 | -                      | -                 |
| defaultType     | 默认表单类型                                              | simple                 | advance \| simple |
| defaultParams   | 默认参数，第一项为分页数据，第二项为表单数据              | [pagination, formData] | -                 |
| defaultPageSize | 默认分页数量                                              | number                 | 10                |
| refreshDeps     | refreshDeps 变化，会重置 current 到第一页，并重新发起请求 | React.DependencyList   | []                |

##### Result

| 参数              | 说明                                            | 类型              |
| ----------------- | ----------------------------------------------- | ----------------- |
| tableProps        | Table 组件需要的数据，直接透传给 Table 组件即可 | -                 |
| search.type       | 当前表单类型                                    | simple \| advance |
| search.changeType | 切换表单类型                                    | () ⇒ void         |
| search.submit     | 提交表单                                        | () ⇒ void         |
| search.reset      | 重置当前表单                                    | () ⇒ void         |

#### 代码演示

以下展示的是 antd v4 的 demo，v3 请参考：[https://ahooks-v2.js.org/hooks/table/use-antd-table](https://ahooks-v2.js.org/hooks/table/use-antd-table)。

##### Table 管理

useAntdTable  会自动管理  Table  分页数据，你只需要把返回的  tableProps  传递给  Table  组件就可以了。

```jsx
<Table columns={columns} rowKey="email" {...tableProps} />
```

[frosty-goldberg-dklw8h](https://codesandbox.io/p/sandbox/frosty-goldberg-dklw8h?file=/index.html)

##### Form 与 Table 联动

useAntdTable 接收 form 实例后，会返回 search 对象，用来处理表单相关事件。

- search.type 支持 simple 和 advance 两个表单切换
- search.changeType，切换表单类型
- search.submit，提交表单行为
- search.reset，重置当前表单

[jovial-sara-pp2v7n - CodeSandbox](https://codesandbox.io/s/pp2v7n)

##### 初始化数据

useAntdTable 通过 defaultParams 设置初始化值，defaultParams 是一个数组，第一项为分页相关参数，第二项为表单相关数据。如果有第二个值，我们会帮您初始化表单。

需要注意的是，初始化的表单数据可以填写 simple 和 advance 全量的表单数据，我们会帮您挑选当前激活的类型中的表单数据。

[exciting-dream-3g4ys2](https://codesandbox.io/p/sandbox/exciting-dream-3g4ys2?file=/index.html)

##### 表单验证

表单提交之前，我们会调用 form.validateFields 来校验表单数据，如果验证不通过，则不会发起请求。

[pensive-wu-m2xvcp](https://codesandbox.io/p/sandbox/pensive-wu-m2xvcp?file=/index.html)

##### 缓存

通过设置 cacheKey，我们可以实现 Form 与 Table 数据缓存。

[amazing-faraday-sdfmr3 - CodeSandbox](https://codesandbox.io/s/sdfmr3)

#### 源码解析

```jsx
import type {
  PaginationOptions,
  PaginationResult,
} from "../usePagination/types";

export type Data = { total: number; list: any[] };

export type Params = [
  {
    current: number;
    pageSize: number;
    sorter?: any;
    filter?: any;
    extra?: any;
    [key: string]: any;
  },
  ...any[]
];

export type Service<TData extends Data, TParams extends Params> = (
  ...args: TParams
) => Promise<TData>;

export type Antd3ValidateFields = (
  fieldNames: string[],
  callback: (errors, values: Record<string, any>) => void
) => void;

export type Antd4ValidateFields = (
  fieldNames?: string[]
) => Promise<Record<string, any>>;

export interface AntdFormUtils {
  getFieldInstance?: (name: string) => Record<string, any>;
  setFieldsValue: (value: Record<string, any>) => void;
  getFieldsValue: (...args: any) => Record<string, any>;
  resetFields: (...args: any) => void;
  validateFields: Antd3ValidateFields | Antd4ValidateFields;
  getInternalHooks?: any;
  [key: string]: any;
}

export interface AntdTableResult<TData extends Data, TParams extends Params>
  extends PaginationResult<TData, TParams> {
  tableProps: {
    dataSource: TData["list"];
    loading: boolean;
    onChange: (pagination: any, filters?: any, sorter?: any) => void;
    pagination: any;
    [key: string]: any;
  };
  search: {
    type: "simple" | "advance";
    changeType: () => void;
    submit: () => void;
    reset: () => void;
  };
}

export interface AntdTableOptions<TData extends Data, TParams extends Params>
  extends PaginationOptions<TData, TParams> {
  form?: AntdFormUtils;
  defaultType?: "simple" | "advance";
}
```

```jsx
import { useEffect, useRef, useState } from "react";
import useMemoizedFn from "../useMemoizedFn";
import usePagination from "../usePagination";
import useUpdateEffect from "../useUpdateEffect";

import type {
  Antd4ValidateFields,
  AntdTableOptions,
  AntdTableResult,
  Data,
  Params,
  Service,
} from "./types";

const useAntdTable = <TData extends Data, TParams extends Params>(
  service: Service<TData, TParams>,
  options: AntdTableOptions<TData, TParams> = {}
) => {
  const {
    // form 实例
    form,
    // 默认表单类型
    defaultType = "simple",
    // 默认参数，第一项为分页数据，第二项为表单数据
    defaultParams,
    manual = false,
    refreshDeps = [],
    ready = true,
    ...rest
  } = options;

  // 分页
  const result = usePagination<TData, TParams>(service, {
    manual: true,
    ...rest,
    onSuccess(...args) {
      // eslint-disable-next-line @typescript-eslint/no-use-before-define
      runSuccessRef.current = true;
      rest.onSuccess?.(...args);
    },
  });

  const { params = [], run } = result;

  const cacheFormTableData = params[2] || ({} as any);

  const [type, setType] = useState(cacheFormTableData?.type || defaultType);

  const allFormDataRef = useRef<Record<string, any>>({});
  const defaultDataSourceRef = useRef([]);
  const runSuccessRef = useRef(false);

  // 判断是否为 antd v4
  const isAntdV4 = !!form?.getInternalHooks;

  // get current active field values
  // 获取表单值
  const getActiveFieldValues = () => {
    if (!form) {
      return {};
    }

    // antd v4
    if (isAntdV4) {
      return form.getFieldsValue(null, () => true);
    }

    // antd v3
    const allFieldsValue = form.getFieldsValue();
    const activeFieldsValue = {};
    Object.keys(allFieldsValue).forEach((key: string) => {
      if (form.getFieldInstance ? form.getFieldInstance(key) : true) {
        activeFieldsValue[key] = allFieldsValue[key];
      }
    });
    return activeFieldsValue;
  };

  // 校验表单
  const validateFields = (): Promise<Record<string, any>> => {
    if (!form) {
      return Promise.resolve({});
    }

    const activeFieldsValue = getActiveFieldValues();
    const fields = Object.keys(activeFieldsValue);

    // antd v4
    if (isAntdV4) {
      return (form.validateFields as Antd4ValidateFields)(fields);
    }

    // antd v3
    return new Promise((resolve, reject) => {
      form.validateFields(fields, (errors, values) => {
        if (errors) {
          reject(errors);
        } else {
          resolve(values);
        }
      });
    });
  };

  // 重置表单
  const restoreForm = () => {
    if (!form) {
      return;
    }

    // antd v4
    if (isAntdV4) {
      return form.setFieldsValue(allFormDataRef.current);
    }

    // antd v3
    const activeFieldsValue = {};
    Object.keys(allFormDataRef.current).forEach((key) => {
      if (form.getFieldInstance ? form.getFieldInstance(key) : true) {
        activeFieldsValue[key] = allFormDataRef.current[key];
      }
    });
    form.setFieldsValue(activeFieldsValue);
  };

  // 修改表单类型
  const changeType = () => {
    // 获取表单值
    const activeFieldsValue = getActiveFieldValues();
    // 修改表单值
    allFormDataRef.current = {
      ...allFormDataRef.current,
      ...activeFieldsValue,
    };
    setType((t) => (t === "simple" ? "advance" : "simple"));
  };

  // change search type, restore form data
  // 修改 type，重置 form 表单数据
  useUpdateEffect(() => {
    if (!ready) {
      return;
    }
    restoreForm();
  }, [type]);

  const _submit = (initPagination?: TParams[0]) => {
    if (!ready) {
      return;
    }

    setTimeout(() => {
      // 表单校验
      validateFields()
        .then((values = {}) => {
          // 分页逻辑
          const pagination = initPagination || {
            pageSize: options.defaultPageSize || 10,
            ...(params?.[0] || {}),
            current: 1,
          };
          // 如果没有 form，直接根据分页逻辑进行请求
          if (!form) {
            // @ts-ignore
            run(pagination);
            return;
          }

          // 获取到当前所有的 form Data
          // record all form data
          allFormDataRef.current = {
            ...allFormDataRef.current,
            ...values,
          };

          // @ts-ignore
          run(pagination, values, {
            allFormData: allFormDataRef.current,
            type,
          });
        })
        .catch((err) => err);
    });
  };

  // 重置表单
  const reset = () => {
    if (form) {
      form.resetFields();
    }

    _submit({
      ...(defaultParams?.[0] || {}),
      pageSize:
        options.defaultPageSize || options.defaultParams?.[0]?.pageSize || 10,
      current: 1,
    });
  };

  // 提交表单
  const submit = (e?: any) => {
    e?.preventDefault?.();
    _submit(
      runSuccessRef.current
        ? undefined
        : {
            pageSize:
              options.defaultPageSize ||
              options.defaultParams?.[0]?.pageSize ||
              10,
            current: 1,
            ...(defaultParams?.[0] || {}),
          }
    );
  };

  // 分页、排序、筛选变化时触发
  const onTableChange = (
    pagination: any,
    filters: any,
    sorter: any,
    extra: any
  ) => {
    const [oldPaginationParams, ...restParams] = params || [];
    run(
      // @ts-ignore
      {
        ...oldPaginationParams,
        current: pagination.current,
        pageSize: pagination.pageSize,
        filters,
        sorter,
        extra,
      },
      ...restParams
    );
  };

  // init
  useEffect(() => {
    // if has cache, use cached params. ignore manual and ready.
    if (params.length > 0) {
      allFormDataRef.current = cacheFormTableData?.allFormData || {};
      restoreForm();
      // @ts-ignore
      run(...params);
      return;
    }

    if (!manual && ready) {
      allFormDataRef.current = defaultParams?.[1] || {};
      restoreForm();
      _submit(defaultParams?.[0]);
    }
  }, []);

  // refresh & ready change on the same time
  const hasAutoRun = useRef(false);
  hasAutoRun.current = false;

  // ready 状态变化时的副作用
  useUpdateEffect(() => {
    if (!manual && ready) {
      hasAutoRun.current = true;
      if (form) {
        form.resetFields();
      }
      allFormDataRef.current = defaultParams?.[1] || {};
      restoreForm();
      _submit(defaultParams?.[0]);
    }
  }, [ready]);

  // 依赖项变化时的副作用
  useUpdateEffect(() => {
    if (hasAutoRun.current) {
      return;
    }

    if (!ready) {
      return;
    }

    if (!manual) {
      hasAutoRun.current = true;
      result.pagination.changeCurrent(1);
    }
  }, [...refreshDeps]);

  return {
    ...result,
    tableProps: {
      dataSource: result.data?.list || defaultDataSourceRef.current,
      loading: result.loading,
      onChange: useMemoizedFn(onTableChange),
      pagination: {
        current: result.pagination.current,
        pageSize: result.pagination.pageSize,
        total: result.pagination.total,
      },
    },
    search: {
      submit: useMemoizedFn(submit),
      type,
      changeType: useMemoizedFn(changeType),
      reset: useMemoizedFn(reset),
    },
  } as AntdTableResult<TData, TParams>;
};

export default useAntdTable;
```

### useFusionTable

<aside>
没用过 Fusion，此篇省略。

</aside>

文档地址：[https://ahooks.js.org/zh-CN/hooks/use-fusion-table](https://ahooks.js.org/zh-CN/hooks/use-fusion-table)

详细代码：[https://github.com/alibaba/hooks/tree/master/packages/hooks/src/useFusionTable](https://github.com/alibaba/hooks/tree/master/packages/hooks/src/useFusionTable)

### useInfiniteScroll

useInfiniteScroll 封装了常见的无限滚动逻辑。

```jsx
const { data, loading, loadingMore, loadMore } = useInfiniteScroll(service);
```

useInfiniteScroll 的第一个参数 service 是一个异步函数，对这个函数的入参和出参有如下约定：

1、service 返回的数据必须包含 list 数组，类型为 { list: any[], …rest }

2、service 的入参为整合后的最新 data

假如第一次请求返回数据为 { list: [1, 2, 3], nextId: 4 }，第二次返回的数据为 { list: [4, 5, 6], nextId: 7 }，则我们会自动合并 list，整合后的 data 为 { list: [1, 2, 3, 4, 5, 6], nextId: 7 }。

#### API

```jsx
export type Data = { list: any[];[key: string]: any; };
export type Service<TData extends Data> = (currentData?: TData) => Promise<TData>;

const {
  data: TData;
  loading: boolean;
  loadingMore: boolean;
  noMore: boolean;
  loadMore: () => void;
  loadMoreAsync: () => Promise<TData>;
  reload: () => void;
  reloadAsync: () => Promise<TData>;
  cancel: () => void;
  mutate: (data?: TData) => void;
} = useInfiniteScroll<TData extends Data>(
  service: (currentData?: TData) => Promise<TData>,
  {
    target?: BasicTarget;
    isNoMore?: (data?: TData) => boolean;
    threshold?: number;
    manual?: boolean;
    reloadDeps?: DependencyList;
    onBefore?: () => void;
    onSuccess?: (data: TData) => void;
    onError?: (e: Error) => void;
    onFinally?: (data?: TData, e?: Error) => void;
  }
);
```

##### Options

| 参数       | 说明                                                                                                                                                      | 类型                                                         | 默认值 |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | ------ |
| target     | 父级容器，如果存在，则在滚动到底部时，自动触发 loadMore。需要配合 isNoMore 使用，以便知道什么时候到最后一页了。当 target 为 document 时，定义为整个视口。 | () ⇒ Element \| Element \| React.MutableRefObject\<Element\> | -      |
| isNoMore   | 是否有最后一页的判断逻辑，入参为当前聚合后的 data                                                                                                         | (data?: TData) ⇒ boolean                                     | -      |
| threshold  | 下拉自动加载，距离底部距离阈值                                                                                                                            | number                                                       | 100    |
| manual     | 默认 fasle，即在初始化时自动执行 service。如果设置为 true，则需要手动调用 reload 或 reloadAsync 触发执行。                                                | boolean                                                      | false  |
| reloadDeps | 变化后，会自动触发 reload                                                                                                                                 | any[]                                                        | -      |
| onBefore   | service 执行前触发                                                                                                                                        | () => void                                                   | -      |
| onSuccess  | service resolve 时触发                                                                                                                                    | (data: TData) => void                                        | -      |
| onError    | service reject 时触发                                                                                                                                     | (e: Error) => void                                           | -      |
| onFinally  | service 执行完成时触发                                                                                                                                    | (data?: TData, e?: Error) => void                            | -      |

##### Result

| 参数          | 说明                                                                       | 类型                   |
| ------------- | -------------------------------------------------------------------------- | ---------------------- |
| data          | service 返回的数据，其中的 list 属性为聚合后数据                           | TData \| undefined     |
| loading       | 是否正在进行首次请求                                                       | boolean                |
| loadingMore   | 是否正在进行更多数据请求                                                   | boolean                |
| noMore        | 是否没有更多数据了，配置 options.isNoMore 后生效                           | boolean                |
| error         | 请求错误消息                                                               | Error                  |
| loadMore      | 加载更多数据，会自动捕获异常，通过  options.onError  处理                  | () => void             |
| loadMoreAsync | 加载更多数据，与  loadMore  行为一致，但返回的是 Promise，需要自行处理异常 | () => Promise\<TData\> |
| reload        | 加载第一页数据，会自动捕获异常，通过  options.onError  处理                | () => void             |
| reloadAsync   | 加载第一页数据，与  reload  行为一致，但返回的是 Promise，需要自行处理异常 | () => Promise\<TData\> |
| mutate        | 直接修改 data                                                              | (data: TData) ⇒ void   |
| cancel        | 忽略当前 Promise 的响应                                                    | () ⇒ void              |

#### 代码演示

##### 基础用法

第一个例子我们演示最基本的无限滚动写法。

[staging-glade-2mwr4n - CodeSandbox](https://codesandbox.io/s/2mwr4n)

##### 分页

在数据固定场景下，我们有时候会用  page  和  pageSize  来请求新的分页数据。

[eloquent-snow-trqyjy - CodeSandbox](https://codesandbox.io/s/trqyjy)

##### 滚动加载

在无限滚动场景中，我们最常见的是滚动到底部时自动加载。通过配置以下几个属性，即可实现滚动自动加载。

- options.target  指定父级元素（父级元素需设置固定高度，且支持内部滚动）
- options.isNoMore  判断是不是没有更多数据了

[pensive-tharp-hwkrw5 - CodeSandbox](https://codesandbox.io/s/hwkrw5)

##### **数据重置**

通过  reload  即可实现数据重置，下面示例我们演示在  filter  变化后，重置数据到第一页。

[cocky-dew-222wdn - CodeSandbox](https://codesandbox.io/s/222wdn)

##### 数据突变

通过  mutate，我们可以直接修改当前  data。下面示例演示了删除某条数据。

[friendly-meadow-29fmqd - CodeSandbox](https://codesandbox.io/s/29fmqd)

#### 源码解析

```jsx
import type { DependencyList } from "react";
import type { BasicTarget } from "utils/domTarget";

export type Data = { list: any[]; [key: string]: any };

export type Service<TData extends Data> = (
  currentData?: TData
) => Promise<TData>;

export interface InfiniteScrollResult<TData extends Data> {
  Data: TData;
  loading: boolean;
  loadingMore: boolean;
  error?: Error;
  noMore: boolean;

  loadMore: () => void;
  loadMoreAsync: () => Promise<TData>;
  reload: () => void;
  reloadAsync: () => Promise<TData>;
  cancel: () => void;
  mutate: (data?: TData) => void;
}

export interface InfiniteScrollOptions<TData extends Data> {
  target?: BasicTarget<Element | Document>;
  isNoMore?: (data?: TData) => boolean;
  threshold?: number;

  manual?: boolean;
  reloadDeps?: DependencyList;

  onBefore?: () => void;
  onSuccess?: (data: TData) => void;
  onError?: (e: Error) => void;
  onFinally?: (data?: TData, e?: Error) => void;
}
```

```jsx
/**
 * scrollTop: 表示一个元素的垂直滚动条滚动的距离
 * scrollHeight: 表示一个元素的内容的总高度，包括不可见部分
 * clientHeight: 表示一个元素在视窗中可见部分的高度
 */

const getScrollTop = (el: Document | Element) => {
  if (
    el === document ||
    el === document.documentElement ||
    el === document.body
  ) {
    return Math.max(
      window.pageYOffset,
      document.documentElement.scrollTop,
      document.body.scrollTop
    );
  }
  return (el as Element).scrollTop;
};

const getScrollHeight = (el: Document | Element) => {
  return (
    (el as Element).scrollHeight ||
    Math.max(document.documentElement.scrollHeight, document.body.scrollHeight)
  );
};

const getClientHeight = (el: Document | Element) => {
  return (
    (el as Element).clientHeight ||
    Math.max(document.documentElement.clientHeight, document.body.clientHeight)
  );
};

export { getClientHeight, getScrollHeight, getScrollTop };

```

```jsx
import { useMemo, useState } from "react";
import type { Data, InfiniteScrollOptions, Service } from "./types";
import useRequest from "../useRequest";
import useMemoizedFn from "../useMemoizedFn";
import useUpdateEffect from "../useUpdateEffect";
import useEventListener from "../useEventListener";
import { getTargetElement } from "utils/domTarget";
import { getClientHeight, getScrollHeight, getScrollTop } from "utils/rect";

const useInfiniteScroll = <TData extends Data>(
  service: Service<TData>,
  options: InfiniteScrollOptions<TData> = {}
) => {
  const {
    // 父级容器
    target,
    // 是否有最后一页的判断逻辑
    isNoMore,
    // 下拉自动加载，距离底部距离阈值
    threshold = 100,
    // 变化后，会自动触发 reload
    reloadDeps = [],
    manual,
    onBefore,
    onSuccess,
    onError,
    onFinally,
  } = options;

  // 聚合后的数据
  const [finalData, setFinalData] = useState<TData>();
  // 加载更多 loading
  const [loadingMore, setLoadingMore] = useState(false);

  const { loading, error, run, runAsync, cancel } = useRequest(
    // 入参，将上次请求返回的数据整合到新的参数中
    async (lastData?: TData) => {
      const currentData = await service(lastData);
      // 首次请求，直接设置
      if (!lastData) {
        setFinalData({
          ...currentData,
          list: [...(currentData.list ?? [])],
        });
      } else {
        setFinalData({
          ...currentData,
          list: [...(lastData.list ?? []), ...currentData.list],
        });
      }
      return currentData;
    },
    {
      manual,
      onFinally: (_, d, e) => {
        // 设置 loadingMore 为 false
        setLoadingMore(false);
        onFinally?.(d, e);
      },
      onBefore: () => onBefore?.(),
      onSuccess: (d) => {
        setTimeout(() => {
          // eslint-disable-next-line @typescript-eslint/no-use-before-define
          scrollMethod();
        });
        onSuccess?.(d);
      },
      onError: (e) => onError?.(e),
    }
  );

  // 是否没有更多数据了，配置 options.isNoMore 后生效
  const noMore = useMemo(() => {
    if (!isNoMore) return false;
    return isNoMore(finalData);
  }, [finalData]);

  // 同步加载更多
  const loadMore = useMemoizedFn(() => {
    if (noMore) return;
    setLoadingMore(true);
    run(finalData);
  });

  // 异步加载更多
  const loadMoreAsync = useMemoizedFn(() => {
    if (noMore) return Promise.reject();
    setLoadingMore(true);
    return runAsync(finalData);
  });

  // 同步加载第一页数据
  const reload = () => {
    setLoadingMore(false);
    return run();
  };

  // 异步加载第一页数据
  const reloadAsync = () => {
    setLoadingMore(false);
    return runAsync();
  };

  // 监听 reloadDeps，变化后，自动触发 reload
  useUpdateEffect(() => {
    run();
  }, [...reloadDeps]);

  // 滚动
  const scrollMethod = () => {
    let el = getTargetElement(target);
    if (!el) {
      return;
    }

    el = el === document ? document.documentElement : el;

    const scrollTop = getScrollTop(el);
    const scrollHeight = getScrollHeight(el);
    const clientHeight = getClientHeight(el);

    // 判断滚动条是否到达底部或即将到达底部
    if (scrollHeight - scrollTop <= clientHeight + threshold) {
      // 加载更多
      loadMore();
    }
  };

  // 监听滚动事件
  useEventListener(
    "scroll",
    () => {
      if (loading || loadingMore) {
        return;
      }
      scrollMethod();
    },
    { target }
  );

  return {
    data: finalData,
    loaading: !loadMore && loading,
    loadingMore,
    error,
    noMore,

    loadMore,
    loadMoreAsync,
    reload: useMemoizedFn(reload),
    reloadAsync: useMemoizedFn(reloadAsync),
    mutate: setFinalData,
    cancel,
  };
};

export default useInfiniteScroll;
```

### usePagination

usePagination 基于 useRequest 实现，封装了常见的分页逻辑。与 useRequest 不同的点有以下几点：

1、service 的第一个参数为 { current: number, pageSize: number }

2、service 返回的数据结构为 { total: number, list: Item[] }

3、会额外返回 pagination 字段，包含所有分页信息，及操作分页的函数

4、refreshDeps 变化，会重置 current 到第一页，并重新发起请求，一般你可以把 pagination 依赖的条件放这里

#### API

useRequest 所有参数和返回结果均适用于 usePagination，此处不再赘述。

```tsx
type Data<T> = { total: number; list: T[]};
type Params = [{ current: number; pageSize: number; [key: string]: any}, ...any[]];

const {
	...,
	pagination: {
		current: number;
		pageSize: number;
		total: number;
		totalPage: number;
		onChange: (current: number, pageSize: number) => void;
		changeCurrent: (current: number) => void;
		changePageSize: (pageSize: number) => void;
	}
} = usePagination<TData extends Data, TParams extends Params>(
	service: (...args: TParams) => Promise<TData>,
	{
		...,
		defaultPageSize?: number;
		refreshDeps?: any[];
	}
)
```

##### Params

| 参数            | 说明                                                                                      | 类型                 | 默认值 |
| --------------- | ----------------------------------------------------------------------------------------- | -------------------- | ------ |
| defaultPageSize | 默认分页数量                                                                              | number               | 10     |
| defaultCurrent  | 初次请求时的页数                                                                          | number               | 1      |
| refreshDeps     | refreshDeps 变化，会重置 current 到第一页，并重新发起请求，一般你可以把依赖的条件放这里。 | React.DependencyList | []     |

##### Result

| 参数       | 说明                     | 类型 |
| ---------- | ------------------------ | ---- |
| pagination | 分页数据及操作分页的方法 | -    |

#### 代码演示

##### **基础用法**

默认用法与  useRequest  一致，但会多返回一个  pagination  参数，包含所有分页信息，及操作分页的函数。

[great-joliot-pqjpfm - CodeSandbox](https://codesandbox.io/s/pqjpfm)

##### **更多参数**

下面的代码演示了，增加了性别参数，在修改性别时，重置分页到第一页，并重新请求数据。

[elated-fast-kc3y98 - CodeSandbox](https://codesandbox.io/s/kc3y98)

##### **refreshDeps**

refreshDeps  是一个语法糖，当它变化时，会重置分页到第一页，并重新请求数据，一般你可以把依赖的条件放这里。以下示例通过  refreshDeps  更方便的实现了上一个功能。

[purple-hill-g7tr3r - CodeSandbox](https://codesandbox.io/s/g7tr3r)

##### **缓存**

通过  useRequest  的  params  缓存能力，我们可以缓存分页数据和其它条件。

[strange-smoke-fjnggp - CodeSandbox](https://codesandbox.io/s/fjnggp)

#### 源码解析

```jsx
import type { Result, Options } from "../useRequest/src/types";

export type Data = { total: number; list: any[] };

export type Params = [
  { current: number; pageSize: number; [key: string]: any },
  ...any[]
];

export type Service<TData extends Data, TParams extends Params> = (
  ...args: TParams
) => Promise<TData>;

export interface PaginationResult<TData extends Data, TParams extends Params>
  extends Result<TData, TParams> {
  pagination: {
    current: number;
    pageSize: number;
    total: number;
    totalPage: number;
    onChange: (current: number, pageSize: number) => void;
    changeCurrent: (current: number) => void;
    changePageSize: (pageSize: number) => void;
  };
}

export interface PaginationOptions<TData extends Data, TParams extends Params>
  extends Options<TData, TParams> {
  defaultPageSize?: number;
  defaultCurrent?: number;
}
```

```tsx
import { useMemo } from "react";
import useMemoizedFn from "@/hooks/useMemoizedFn";
import useRequest from "@/hooks/useRequest";

import type {
  Data,
  PaginationOptions,
  PaginationResult,
  Params,
  Service,
} from "./types";

/**
 * 基于 useRequest，封装了常见的分页逻辑
 * */
const usePagination = <TData extends Data, TParams extends Params>(
  service: Service<TData, TParams>,
  options: PaginationOptions<TData, TParams> = {}
) => {
  const { defaultPageSize = 10, defaultCurrent = 1, ...rest } = options;

  // // service 约定返回的数据结构为 { total: number, list: Item[] }
  const result = useRequest(service, {
    // service 的默认参数为 { current: number, pageSize: number }
    defaultParams: [{ current: defaultCurrent, pageSize: defaultPageSize }],
    // refreshDeps 变化，会重置 current 到第一页，并重新发起请求
    refreshDepsAction: () => {
      // eslint-disable-next-line @typescript-eslint/no-use-before-define
      changeCurrent(1);
    },
    ...rest,
  });

  const { current = 1, pageSize = defaultPageSize } = result.params[0] || {};

  // 计算总条数
  const total = result.data?.total || 0;
  // 计算总页数
  const totalPage = useMemo(
    () => Math.ceil(total / pageSize),
    [pageSize, total]
  );

  /**
   * c: current
   * p: pageSize
   * */
  const onChange = (c: number, p: number) => {
    let toCurrent = c < 0 ? 1 : c;
    const toPageSize = p <= 0 ? 1 : p;
    // 根据 total 和传入的 pageSize 计算当前总页数
    const tempTotalPage = Math.ceil(total / toPageSize);
    // 如果当前总页数小于当前要跳转的 current，需要将 current 赋值为当前总页数
    if (toCurrent > tempTotalPage) {
      toCurrent = Math.max(1, tempTotalPage);
    }

    const [oldPaginationParams = {}, ...restParams] = result.params || [];

    // 重新执行请求
    result.run(
      {
        ...oldPaginationParams,
        current: toCurrent,
        pageSize: toPageSize,
      },
      ...restParams
    );
  };

  const changeCurrent = (c: number) => {
    onChange(c, pageSize);
  };

  const changePageSize = (p: number) => {
    onChange(current, p);
  };

  // 额外返回 pagination 字段，包含所有分页信息，及操作分页的函数。
  return {
    ...result,
    pagination: {
      current,
      pageSize,
      total,
      totalPage,
      onChange: useMemoizedFn(onChange),
      changeCurrent: useMemoizedFn(changeCurrent),
      changePageSize: useMemoizedFn(changePageSize),
    },
  } as PaginationResult<TData, TParams>;
};

export default usePagination;
```

### useDynamicList

一个帮助你管理动态列表状态，并能生成唯一 key 的 Hook。

#### API

```jsx
const result: Result = useDynamicList(initialList?: T[]);
```

##### Params

| 参数        | 说明         | 类型 | 默认值 |
| ----------- | ------------ | ---- | ------ |
| initialList | 列表的初始值 | T[]  | []     |

##### Result

| 参数      | 说明                   | 类型                                        | 备注 |
| --------- | ---------------------- | ------------------------------------------- | ---- |
| list      | 当前的列表             | T[]                                         | -    |
| resetList | 重新设置 list 的值     | (list: T[]) ⇒ void                          | -    |
| insert    | 在指定位置插入元素     | (index: number, item: T) ⇒ void             | -    |
| merge     | 在指定位置插入多个元素 | (index: number, items: T[]) ⇒ void          | -    |
| replace   | 替换指定元素           | (index: number, item: T) ⇒ void             | -    |
| remove    | 删除指定元素           | (index: number) ⇒ void                      | -    |
| move      | 移动元素               | (oldIndex: number, newIndex: number) ⇒ void | -    |
| getKey    | 获得某个元素的 uuid    | (index: number) ⇒ number                    | -    |
| getIndex  | 获得某个 key 的 index  | (key: number) ⇒ number                      | -    |
| push      | 在列表末尾添加元素     | (item: T) ⇒ void                            | -    |
| pop       | 移除末尾元素           | () ⇒ void                                   | -    |
| unshift   | 在列表起始位置添加元素 | (item: T) ⇒ void                            | -    |
| shift     | 移除起始位置元素       | () ⇒ void                                   | -    |
| sortList  | 校准排序               | (list: T[]) ⇒ T[]                           | -    |

#### 代码演示

[基础用法 - CodeSandbox](https://codesandbox.io/s/2pn7wf)

[在 antd Form 中使用 - CodeSandbox](https://codesandbox.io/s/tvy5h4)

[在 antd Form 中使用的另一种写法 - CodeSandbox](https://codesandbox.io/s/hn6p94)

[可拖拽的动态表格 - CodeSandbox](https://codesandbox.io/s/fzhnp8)

#### 源码解析

```jsx
/**
 * Array.prototype.splice()
 * https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Array/splice
 * const months = ['Jan', 'March', 'April', 'June'];
 * months.splice(1, 0, 'Feb'); // 从索引 1 位置开始，不删除元素，插入 ’Feb‘
 * // Inserts at index 1
 * console.log(months);
 * // Expected output: Array ["Jan", "Feb", "March", "April", "June"]

 * months.splice(4, 1, 'May'); // 从索引 4 位置开始，删除一个元素，并插入 'May'
 * // Replaces 1 element at index 4
 * console.log(months);
 * // Expected output: Array ["Jan", "Feb", "March", "April", "May"]
 */

import { useCallback, useRef, useState } from "react";

const useDynamicList = <T>(initialList: T[] = []) => {
  // 计数
  const counterRef = useRef(-1);

  // uuid list
  const keyList = useRef<number[]>([]);

  // 根据 index 为某个元素设置 uuid
  const setKey = useCallback((index: number) => {
    counterRef.current += 1;
    keyList.current.splice(index, 0, counterRef.current);
  }, []);

  // 当前列表
  const [list, setList] = useState(() => {
    initialList.forEach((_, index) => {
      setKey(index);
    });
    return initialList;
  });

  // 重新设置 list 的值
  const resetList = useCallback((newList: T[]) => {
    keyList.current = [];
    setList(() => {
      newList.forEach((_, index) => {
        setKey(index);
      });
      return newList;
    });
  }, []);

  // 在指定位置插入元素
  const insert = useCallback((index: number, item: T) => {
    setList((l) => {
      const temp = [...l];
      temp.splice(index, 0, item);
      setKey(index);
      return temp;
    });
  }, []);

  // 获得某个元素的 uuid
  const getKey = useCallback((index: number) => keyList.current[index], []);

  // 获得某个 key 的index
  const getIndex = useCallback(
    (key: number) => keyList.current.findIndex((ele) => ele === key),
    []
  );

  // 在指定位置插入多个元素
  const merge = useCallback((index: number, items: T[]) => {
    setList((l) => {
      const temp = [...l];
      items.forEach((_, i) => {
        setKey(index + i);
      });
      temp.splice(index, 0, ...items);
      return temp;
    });
  }, []);

  // 替换指定元素
  const replace = useCallback((index: number, item: T) => {
    setList((l) => {
      const temp = [...l];
      temp[index] = item;
      return temp;
    });
  }, []);

  // 删除指定元素
  const remove = useCallback((index: number) => {
    setList((l) => {
      const temp = [...l];
      temp.splice(index, 1);

      // remove keys if necessary
      try {
        keyList.current.splice(index, 1);
      } catch (e) {
        console.error(e);
      }
      return temp;
    });
  }, []);

  // 移动元素
  const move = useCallback((oldIndex: number, newIndex: number) => {
    if (oldIndex === newIndex) {
      return;
    }
    setList((l) => {
      const newList = [...l];
      // 根据 oldIndex 把元素过滤掉
      const temp = newList.filter((_, index: number) => index !== oldIndex);
      // 根据 newIndex 把过滤掉的元素插入进去
      temp.splice(newIndex, 0, newList[oldIndex]);

      // move keys if necessary
      try {
        const keyTemp = keyList.current.filter(
          (_, index: number) => index !== oldIndex
        );
        keyTemp.splice(newIndex, 0, keyList.current[oldIndex]);
        keyList.current = keyTemp;
      } catch (e) {
        console.error(e);
      }

      return temp;
    });
  }, []);

  // 在列表末尾添加元素
  const push = useCallback((item: T) => {
    setList((l) => {
      setKey(l.length);
      return l.concat([item]);
    });
  }, []);

  // 移除末尾元素
  const pop = useCallback(() => {
    // remove keys if necessary
    try {
      keyList.current = keyList.current.slice(0, keyList.current.length - 1);
    } catch (e) {
      console.error(e);
    }

    setList((l) => l.slice(0, l.length - 1));
  }, []);

  // 在列表起始位置添加元素
  const unshift = useCallback((item: T) => {
    setList((l) => {
      setKey(0);
      return [item].concat(l);
    });
  }, []);

  // 移除起始位置元素
  const shift = useCallback(() => {
    // remove keys if necessary
    try {
      keyList.current = keyList.current.slice(1, keyList.current.length);
    } catch (e) {
      console.error(e);
    }
    setList((l) => l.slice(1, l.length));
  }, []);

  // 校准排序
  const sortList = useCallback(
    (result: T[]) =>
      result
        .map((item, index) => ({ key: index, item })) // add index into obj
        .sort((a, b) => getIndex(a.key) - getIndex(b.key)) // sort based on the index of table
        .filter((item) => !!item.item) // remove undefined(s)
        .map((item) => item.item), // retrive the data
    []
  );

  return {
    list,
    insert,
    merge,
    replace,
    remove,
    getKey,
    getIndex,
    move,
    push,
    pop,
    unshift,
    shift,
    sortList,
    resetList,
  };
};

export default useDynamicList;

```

### useVirtualList

提供虚拟化列表能力的 Hook，用于解决展示海量数据渲染时首屏渲染缓慢和滚动卡顿问题。

#### API

```jsx
const [list, scrollTo] = useVirtualList<T>(
	originalList: T[],
	options: {
		containerTarget: (() => Element)) | Element | MutableRefObject<Element>,
    wrapperTarget: (() => Element)) | Element | MutableRefObject<Element>,
    itemHeight: number | ((index: number, data: T) => number)),
    overscan?: number,
	}
)
```

##### Params

| 参数         | 说明                                                                      | 类型    | 默认值 |
| ------------ | ------------------------------------------------------------------------- | ------- | ------ |
| originalList | 包含大量数据的列表。注意：必须经过 useMemo 处理或者永不变化，否则会死循环 | T[]     | []     |
| options      | 配置项                                                                    | Options | -      |

##### Options

| 参数            | 说明                                                   | 类型                                                      | 默认值 |
| --------------- | ------------------------------------------------------ | --------------------------------------------------------- | ------ |
| containerTarget | 外部容器，支持 DOM 节点或者 Ref 对象                   | (() => Element) \| Element \| MutableRefObject\<Element\> |        |
| wrapperTarget   | 内部容器，支持 DOM 节点或者 Ref 对象                   | (() => Element) \| Element \| MutableRefObject\<Element\> |        |
| itemHeight      | 行高度，静态高度可以直接写入像素值，动态高度可传入函数 | number \| ((index: number, data: T) => number)            |        |
| overscan        | 视区上、下额外展示的 DOM 节点数量                      | number                                                    | 5      |

##### Result

| 参数     | 说明                   | 类型                       |
| -------- | ---------------------- | -------------------------- |
| list     | 当前需要展示的列表内容 | {data: T, index: number}[] |
| scrollTo | 快速滚动到指定 index   | (index: number) ⇒ void     |

#### 代码演示

[基础用法 - CodeSandbox](https://codesandbox.io/s/h7kxzj)

[动态元素高度 - CodeSandbox](https://codesandbox.io/s/hzvzj9)

#### 源码解析

```tsx
import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import useEventListener from "../useEventListener";
import useUpdateEffect from "../useUpdateEffect";
import useLatest from "../useLatest";
import useSize from "../useSize";
import useMemoizedFn from "../useMemoizedFn";
import { getTargetElement } from "utils/domTarget";
import type { BasicTarget } from "utils/domTarget";
import { isNumber } from "utils";

type ItemHeight<T> = (index: number, data: T) => number;

export interface Options<T> {
  containerTarget: BasicTarget;
  wrapperTarget: BasicTarget;
  itemHeight: number | ItemHeight<T>;
  overscan?: number;
}

const useVirtualList = <T = any,>(list: T[], options: Options<T>) => {
  const { containerTarget, wrapperTarget, itemHeight, overscan = 5 } = options;

  const itemHeightRef = useLatest(itemHeight);

  // 外部容器尺寸
  const size = useSize(containerTarget);

  // 标记滚动是否由滚动函数触发
  const scrollTriggerByScrollToFunc = useRef(false);

  // 当前需要展示的列表内容
  const [targetList, setTargetList] = useState<{ index: number; data: T }[]>(
    []
  );

  // 内部容器样式
  const [wrapperStyle, setWrapperStyle] = useState<CSSProperties>({});

  // 根据滚动位置计算偏移量
  const getOffset = (scrollTop: number) => {
    if (isNumber(itemHeightRef.current)) {
      return Math.floor(scrollTop / itemHeightRef.current) + 1;
    }
    let sum = 0;
    let offset = 0;
    for (let i = 0; i < list.length; i++) {
      const height = itemHeightRef.current(i, list[i]);
      sum += height;
      if (sum >= scrollTop) {
        offset = i;
        break;
      }
    }
    return offset + 1;
  };

  // 根据容器高度和起始索引计算可见的列表项数量
  const getVisibleCount = (containerHeight: number, fromIndex: number) => {
    if (isNumber(itemHeightRef.current)) {
      return Math.ceil(containerHeight / itemHeightRef.current);
    }
    let sum = 0;
    let endIndex = 0;
    for (let i = fromIndex; i < list.length; i++) {
      const height = itemHeightRef.current(i, list[i]);
      sum += height;
      endIndex = i;
      if (sum >= containerHeight) {
        break;
      }
    }
    return endIndex - fromIndex;
  };

  // 根据索引计算顶部的高度，前面所有列表项的高度总和
  const getDistanceTop = (index: number) => {
    if (isNumber(itemHeightRef.current)) {
      const height = index * itemHeightRef.current;
      return height;
    }
    const height = list
      .slice(0, index)
      .reduce(
        (sum, _, i) =>
          sum + (itemHeightRef.current as ItemHeight<T>)(i, list[i]),
        0
      );
    return height;
  };

  // 内部容器的高度
  const totalHeight = useMemo(() => {
    if (isNumber(itemHeightRef.current)) {
      return list.length * itemHeightRef.current;
    }
    return list.reduce(
      (sum, _, index) =>
        sum + (itemHeightRef.current as ItemHeight<T>)(index, list[index]),
      0
    );
  }, [list]);

  // 计算可见范围内的列表项，并设置内部容器的高度和样式
  const calculateRange = () => {
    const container = getTargetElement(containerTarget);

    if (container) {
      const { scrollTop, clientHeight } = container;

      // 根据 scrollTop 计算已经 "滚过" 多少项
      const offset = getOffset(scrollTop);
      // 根据外部容器可视高度和当前的开始索引，计算外部容器能承载的项数
      const visibleCount = getVisibleCount(clientHeight, offset);

      // 根据 overscan (视区上、下额外展示的 DOM 节点数量) 计算开始索引和结束索引
      const start = Math.max(0, offset - overscan);
      const end = Math.min(list.length, offset + visibleCount + overscan);

      // 根据开始索引计算其距离最开始的距离
      const offfsetTop = getDistanceTop(start);

      // 设置内部容器的 height 和 marginTop
      setWrapperStyle({
        height: totalHeight - offfsetTop + "px",
        marginTop: offfsetTop + "px",
      });

      setTargetList(
        list.slice(start, end).map((ele, index) => ({
          data: ele,
          index: index + start,
        }))
      );
    }
  };

  // 监听容器尺寸、原列表项变化，变化时重新计算
  useEffect(() => {
    if (!size?.width || !size?.height) {
      return;
    }
    calculateRange();
  }, [size?.width, size?.height, list]);

  // 监听外部容器 scroll 事件
  useEventListener(
    "scroll",
    (e) => {
      // 如果滚动是由滚动函数触发，则不需要重新计算
      if (scrollTriggerByScrollToFunc.current) {
        scrollTriggerByScrollToFunc.current = false;
        return;
      }
      e.preventDefault();
      calculateRange();
    },
    {
      target: containerTarget,
    }
  );

  // 将 wrapperStyle 应用到内部容器
  useUpdateEffect(() => {
    const wrapper = getTargetElement(wrapperTarget) as HTMLElement;
    if (wrapper) {
      Object.keys(wrapperStyle).forEach(
        (key) => (wrapper.style[key] = wrapperStyle[key])
      );
    }
  }, [wrapperStyle]);

  // 快速滚动到指定 index
  const scrollTo = (index: number) => {
    const container = getTargetElement(containerTarget);
    if (container) {
      scrollTriggerByScrollToFunc.current = true;
      container.scrollTop = getDistanceTop(index);
      calculateRange();
    }
  };

  return [targetList, useMemoizedFn(scrollTo)] as const;
};

export default useVirtualList;
```

### useHistoryTravel

<aside>
💡 监控状态历史变化记录，方便在历史记录中前进与后退。

</aside>

#### API

```tsx
const {
	value,
	setValue,
	backLength,
	forwardLength,
	go,
	back,
	forward,
	reset,
} = useHistoryTravel<T>(initialValue?: T, maxLength: number = 0);
```

##### Params

| 参数         | 说明                                                       | 类型   | 默认值   |
| ------------ | ---------------------------------------------------------- | ------ | -------- |
| initialValue | 可选，初始值                                               | any    | -        |
| maxLength    | 可选，限制历史记录最大长度，超过最大长度后将删除第一个记录 | number | 0 不限制 |

##### Result

| 参数          | 说明                                       | 类型                         |
| ------------- | ------------------------------------------ | ---------------------------- |
| value         | 当前值                                     | T                            |
| setValue      | 设置 value                                 | (value: T) ⇒ void            |
| backLength    | 可回退历史长度                             | number                       |
| forwardLength | 可前进历史长度                             | number                       |
| go            | 前进步数，step < 0 为后退，step > 0 为前进 | (step: number) ⇒ void        |
| back          | 向后回退一步                               | () ⇒ void                    |
| forward       | 向前前进一步                               | () ⇒ void                    |
| reset         | 重置到初始值，或提供一个新的初始值         | (newInitialValue?: T) ⇒ void |

#### 代码演示

[基础用法 - CodeSandbox](https://codesandbox.io/s/g33xgy)

[可撤销恢复的 Todo List - CodeSandbox](https://codesandbox.io/s/p85fc9)

[限制历史记录最大长度](https://codesandbox.io/p/sandbox/xian-zhi-li-shi-ji-lu-zui-da-chang-du-7rrh5h)

#### 源码解析

```tsx
import { useRef, useState } from "react";
import useMemoizedFn from "@/hooks/useMemoizedFn";
import { isNumber } from "../../../utils";

/**
 * past - 过去的状态队列
 * future - 未来的状态队列
 * present - 当前状态
 * */
interface IData<T> {
  present?: T;
  past: T[];
  future: T[];
}

// 获取 current 值的下标
const dumpIndex = <T,>(step: number, arr: T[]) => {
  // step 大于 0 表示前进，小于 0 表示后退
  let index = step > 0 ? step - 1 : arr.length + step;
  if (index >= arr.length - 1) {
    index = arr.length - 1;
  }
  if (index < 0) {
    index = 0;
  }
  return index;
};

/**
 * 将传入的 targetArr，根据 step，分成当前状态、过去的状态队列、未来的状态队列
 * 比如前进，出参为 2 和 [1,2,3,4]，得到的结果是 { _current: 2, _before: [1], _after: [3,4] }
 * 比如后退，出参为 -1，[1,2,3,4]，得到的结果是 { _current: 4, _before: [1, 2, 3], _after: [] }
 * */
const split = <T,>(step: number, targetArr: T[]) => {
  const index = dumpIndex(step, targetArr);
  return {
    _current: targetArr[index],
    _before: targetArr.slice(0, index),
    _after: targetArr.slice(index + 1),
  };
};

const useHistoryTravel = <T,>(initialValue?: T, maxLength: number = 0) => {
  const [history, setHistory] = useState<IData<T | undefined>>({
    present: initialValue,
    past: [],
    future: [],
  });

  const { present, past, future } = history;

  const initialValueRef = useRef(initialValue);

  /**
   * 重置
   * 重置到初始值，或提供一个新的初始值
   * */
  const reset = (...params: any[]) => {
    const _initial = params.length > 0 ? params[0] : initialValueRef.current;
    initialValueRef.current = _initial;

    setHistory({
      present: _initial,
      past: [],
      future: [],
    });
  };

  /**
   * 更新
   * */
  const updateValue = (val: T) => {
    // 以前的旧状态队列和 present 合并到新的旧状态队列
    const _past = [...past, present];
    // 判断 maxLength，超过最大长度后将删除旧状态队列中的第一个记录
    const maxLengthNum = isNumber(maxLength) ? maxLength : Number(maxLength);
    if (maxLengthNum > 0 && _past.length > maxLengthNum) {
      _past.splice(0, 1);
    }
    setHistory({
      present: val,
      past: _past,
      future: [], // 新状态队列置为空
    });
  };

  /**
   * 前进，默认前进一步
   * */
  const _forward = (step: number = 1) => {
    if (future.length === 0) {
      return;
    }

    const { _before, _current, _after } = split(step, future);
    setHistory({
      // 以前的旧状态队列、present、_before 合并到新的旧状态队列
      past: [...past, present, ..._before],
      present: _current,
      future: _after,
    });
  };

  /**
   * 后退，默认后退一步
   * */
  const _backward = (step: number = -1) => {
    if (past.length === 0) {
      return;
    }

    const { _before, _current, _after } = split(step, past);
    setHistory({
      past: _before,
      present: _current,
      // 以前的新状态队列、present、_after 合并到新的新状态队列
      future: [..._after, present, ...future],
    });
  };

  // 跳到第几步，最终调用 _forward 和 _backward
  const go = (step: number) => {
    const stepNum = isNumber(step) ? step : Number(step);
    if (stepNum === 0) {
      return;
    }
    if (stepNum > 0) {
      return _forward(stepNum);
    }
    _backward(stepNum);
  };

  return {
    value: present,
    backLength: past.length,
    forwardLength: future.length,
    setValue: useMemoizedFn(updateValue),
    go: useMemoizedFn(go),
    back: useMemoizedFn(() => {
      go(-1);
    }),
    forward: useMemoizedFn(() => {
      go(1);
    }),
    reset: useMemoizedFn(reset),
  };
};

export default useHistoryTravel;
```

### useNetwork

<aside>
💡 管理网络连接状态的 Hook。

</aside>

#### API

```tsx
interface NetworkState {
  online?: boolean;
  since?: Date;
  rtt?: number;
  type?: string;
  downlink?: number;
  saveData?: boolean;
  downlinkMax?: number;
  effectiveType?: string;
}

const result: NetworkState = useNetwork();
```

##### Result

| 参数          | 说明                                   | 类型                                                                           |
| ------------- | -------------------------------------- | ------------------------------------------------------------------------------ |
| online        | 网络是否为在线                         | boolean                                                                        |
| since         | online 最后改变时间                    | Date                                                                           |
| rtt           | 当前连接下评估的往返时延               | number                                                                         |
| type          | 设备使用与所述网络进行通信的连接的类型 | bluetooth \| cellular \| ethernet \| none \| wifi \| wimax \| other \| unknown |
| downlink      | 有效带宽估算(单位：兆比特/秒)          | number                                                                         |
| downlinkMax   | 最大下行速度(单位：兆比特/秒)          | number                                                                         |
| saveData      | 用户代理是否设置了减少数据使用的选项   | boolean                                                                        |
| effectiveType | 网络连接的类型                         | slow-2g \| 2g \| 3g \| 4g                                                      |

更多信息参考：[MDN NetworkInformation](https://developer.mozilla.org/en-US/docs/Web/API/NetworkInformation)

#### 代码演示

[基础用法 - CodeSandbox](https://codesandbox.io/s/kc6mnv)

#### 源码解析

```tsx
import { useEffect, useState } from "react";
import { isObject } from "../../../utils";

/**
 * since: online 最后改变时间
 * online: 网络是否为在线
 * rtt: 当前连接下评估的往返时延
 * type: 设备使用与所述网络进行通信的连接的类型 bluetooth | cellular | ethernet | none | wifi | wimax | other | unknown
 * downlink: 有效带宽估算（单位：兆比特/秒）
 * downlinkMax: 最大下行速度（单位：兆比特/秒）
 * saveData: 用户代理是否设置了减少数据使用的选项
 * effectiveType: 网络连接的类型 slow-2g | 2g | 3g | 4g
 * */
export interface NetworkState {
  since?: Date;
  online?: boolean;
  rtt?: number;
  type?: string;
  downlink?: number;
  saveData?: boolean;
  downlinkMax?: number;
  effectiveType?: string;
}

enum NetworkEventType {
  ONLINE = "online",
  OFFLINE = "offline",
  CHANGE = "change",
}

function getConnection() {
  const nav = navigator as any;
  if (!isObject(nav)) return null;
  return nav.connection || nav.mozConnection || nav.webkitConnection;
}

function getConnectionProperty(): NetworkState {
  const c = getConnection();
  if (!c) return {};
  return {
    rtt: c.rtt,
    type: c.type,
    saveData: c.saveData,
    downlink: c.downlink,
    downlinkMax: c.downlinkMax,
    effectiveType: c.effectiveType,
  };
}

const useNetwork = (): NetworkState => {
  const [state, setState] = useState(() => {
    return {
      since: undefined,
      online: navigator?.onLine,
      ...getConnectionProperty(),
    };
  });

  useEffect(() => {
    const onOnline = () => {
      setState((prevState) => ({
        ...prevState,
        online: true,
        since: new Date(),
      }));
    };

    const onOffline = () => {
      setState((prevState) => ({
        ...prevState,
        online: false,
        since: new Date(),
      }));
    };

    const onConnectionChange = () => {
      setState((prevState) => ({
        ...prevState,
        ...getConnectionProperty(),
      }));
    };

    // 监听网络 online 事件
    window.addEventListener(NetworkEventType.ONLINE, onOnline);
    // 监听网络 offline 事件
    window.addEventListener(NetworkEventType.OFFLINE, onOffline);

    // 监听 navigator 的 connection 的 change 事件
    const connection = getConnection();
    connection?.addEventListener(NetworkEventType.CHANGE, onConnectionChange);

    return () => {
      window.removeEventListener(NetworkEventType.ONLINE, onOnline);
      window.removeEventListener(NetworkEventType.OFFLINE, onOffline);
      connection?.removeEventListener(
        NetworkEventType.CHANGE,
        onConnectionChange
      );
    };
  }, []);

  return state;
};

export default useNetwork;
```

### useSelections

<aside>
💡 常见联动 Checkbox 逻辑封装，支持多选、单选、全选逻辑，还提供了是否选择，是否全选，是否半选的状态。

</aside>

#### API

```tsx
const result: Result = useSelections<T>(items: T[], defaultSelected?: T[]);
```

##### Result

| 参数              | 说明                                                                                                                                                  | 类型                                                          |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| selected          | 已经选择的元素                                                                                                                                        | T[]                                                           |
| allSelected       | 是否全选                                                                                                                                              | boolean                                                       |
| noneSelected      | 是否一个都没有选择                                                                                                                                    | boolean                                                       |
| partiallySelected | 是否半选                                                                                                                                              | boolean                                                       |
| isSelected        | 是否被选择                                                                                                                                            | (value: T) ⇒ boolean                                          |
| setSelected       | 选择多个元素。多次执行时，后面的返回值会覆盖前面的，因此如果希望合并多次操作的结果，需要手动处理：setSelected((oldArray) ⇒ oldArray.concat(newArray)) | (value: T[]) ⇒ void \| (value: (prevState: T[]) ⇒ T[]) ⇒ void |
| select            | 选择单个元素                                                                                                                                          | (value: T) ⇒ void                                             |
| unSelect          | 取消选择单个元素                                                                                                                                      | (value: T) ⇒ void                                             |
| toggle            | 反选单个元素                                                                                                                                          | (value: T) ⇒ void                                             |
| selectAll         | 选择全部元素                                                                                                                                          | () ⇒ void                                                     |
| unSelectAll       | 取消选择全部元素                                                                                                                                      | () ⇒ void                                                     |
| toggleAll         | 反选全部元素                                                                                                                                          | () ⇒ void                                                     |

#### 代码演示

[基础用法 - CodeSandbox](https://codesandbox.io/s/st4wh7)

#### 源码解析

```tsx
import { useMemo, useState } from "react";
import useMemoizedFn from "@/hooks/useMemoizedFn";

const useSelections = <T,>(items: T[], defaultSelected: T[] = []) => {
  // 维护被选中的数组
  const [selected, setSelected] = useState<T[]>(defaultSelected);

  // 维护被选中的 Set 集合
  const selectedSet = useMemo(() => new Set(selected), [selected]);

  // 判断是否选中
  const isSelected = (item: T) => selectedSet.has(item);

  // 选择单个元素
  const select = (item: T) => {
    selectedSet.add(item);
    // Array.from 将 Set 转换成数组
    return setSelected(Array.from(selectedSet));
  };

  // 取消选择单个元素
  const unSelect = (item: T) => {
    selectedSet.delete(item);
    return setSelected(Array.from(selectedSet));
  };

  // 反选单个元素
  const toggle = (item: T) => {
    if (isSelected(item)) {
      unSelect(item);
    } else {
      select(item);
    }
  };

  // 选择全部元素
  const selectAll = () => {
    items.forEach((o) => {
      selectedSet.add(o);
    });
    setSelected(Array.from(selectedSet));
  };

  // 取消选择全部元素
  const unSelectAll = () => {
    items.forEach((o) => {
      selectedSet.delete(o);
    });
    setSelected(Array.from(selectedSet));
  };

  // 是否一个都没有选择
  const noneSelected = useMemo(
    () => items.every((o) => !selectedSet.has(o)),
    [items, selectedSet]
  );

  // 是否全选
  const allSelected = useMemo(
    () => items.every((o) => selectedSet.has(o)) && !noneSelected,
    [items, selectedSet, noneSelected]
  );

  // 是否半选
  const partiallySelected = useMemo(
    () => !noneSelected && !allSelected,
    [noneSelected, allSelected]
  );

  // 反选全部元素
  const toggleAll = () => {
    allSelected ? unSelectAll() : selectAll();
  };

  return {
    selected,
    noneSelected,
    allSelected,
    partiallySelected,
    setSelected,
    isSelected,
    select: useMemoizedFn(select),
    unSelect: useMemoizedFn(unSelect),
    toggle: useMemoizedFn(toggle),
    selectAll: useMemoizedFn(selectAll),
    unSelectAll: useMemoizedFn(unSelectAll),
    toggleAll: useMemoizedFn(toggleAll),
  } as const;
};

export default useSelections;
```

### useCountDown

<aside>
💡 一个用于管理倒计时的 Hook。

</aside>

#### API

```tsx
type TDate = Date | number | string | undefined;

interface FormattedRes {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  milliseconds: number;
}

const [countdown, formattedRes] = useCountDown({
  leftTime,
  targetDate,
  interval,
  onEnd,
});
```

##### Params

| 参数       | 说明                 | 类型      | 默认值 |
| ---------- | -------------------- | --------- | ------ |
| leftTime   | 剩余时间（毫秒）     | number    | -      |
| targetDate | 目标时间             | TDate     | -      |
| interval   | 变化时间间隔（毫秒） | number    | 1000   |
| onEnd      | 倒计时结束触发       | () ⇒ void |        |

##### Result

| 参数         | 说明                 | 类型         |
| ------------ | -------------------- | ------------ |
| countdown    | 倒计时时间戳（毫秒） | number       |
| formattedRes | 格式化后的倒计时     | FormattedRes |

#### 备注

leftTime、targetDate、interval、onEnd 支持动态变化

#### 代码演示

[基础用法 - CodeSandbox](https://codesandbox.io/s/6f78tq)

[进阶使用 - CodeSandbox](https://codesandbox.io/s/wmt6cx)

[剩余时间 - CodeSandbox](https://codesandbox.io/s/dk4dwf)

说明：

useCountDown 的精度为毫秒，可能会造成以下几个问题

- 即使设置 interval 时间为 1000 毫秒，useCountDown 每次更新间隔也不一定正好是 1000 毫秒，而是 1000 毫秒左右。
- 在第二个 demo 中，countdown 开始一般是 499x 毫秒，因为程序执行有延迟。

如果你的精度只要到秒就好了，可以这样用 Math.round(countdown / 1000)。

如果同时传了 leftTime 和 targetDate，则会忽略 targetDate，以 leftTime 为主。

#### 源码解析

```tsx
import dayjs from "dayjs";
import { useEffect, useMemo, useState } from "react";
import { isNumber } from "../../../utils";
import useLatest from "@/hooks/useLatest";

export type TDate = dayjs.ConfigType;

export interface Options {
  leftTime?: number;
  targetDate?: TDate;
  interval?: number;
  onEnd?: () => void;
}

export interface FormattedRes {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  milliseconds: number;
}

// 计算目标时间和当前时间还差多少毫秒
const calcLeft = (target?: TDate) => {
  if (!target) {
    return 0;
  }
  // https://stackoverflow.com/questions/4310953/invalid-date-in-safari
  // 计算剩余时间，目标时间 - 当前时间
  const left = dayjs(target).valueOf() - Date.now();
  return left < 0 ? 0 : left;
};

// 格式化后的倒计时
const parseMs = (milliseconds: number): FormattedRes => {
  return {
    days: Math.floor(milliseconds / 86400000),
    hours: Math.floor(milliseconds / 3600000) % 24,
    minutes: Math.floor(milliseconds / 60000) % 60,
    seconds: Math.floor(milliseconds / 1000) % 60,
    milliseconds: Math.floor(milliseconds) % 1000,
  };
};

const useCountDown = (options: Options = {}) => {
  const { leftTime, targetDate, interval = 1000, onEnd } = options || {};

  const target = useMemo<TDate>(() => {
    if ("leftTime" in options) {
      return isNumber(leftTime) && leftTime > 0
        ? Date.now() + leftTime
        : undefined;
    } else {
      return targetDate;
    }
  }, [leftTime, targetDate]);

  const [timeLeft, setTimeLeft] = useState(() => calcLeft(target));

  const onEndRef = useLatest(onEnd);

  useEffect(() => {
    if (!target) {
      // for stop
      setTimeLeft(0);
      return;
    }

    // 立即执行一次
    setTimeLeft(calcLeft(target));

    // 通过定时器 setInterval 设置倒计时
    const timer = setInterval(() => {
      const targetLeft = calcLeft(target);
      setTimeLeft(targetLeft);
      // 剩余时间为 0，取消定时器，并执行 onEnd 回调
      if (targetLeft === 0) {
        clearInterval(timer);
        onEndRef.current?.();
      }
    }, interval);

    return () => clearInterval(timer);
  }, [target, interval]);

  const formattedRes = useMemo(() => parseMs(timeLeft), [timeLeft]);

  return [timeLeft, formattedRes] as const;
};

export default useCountDown;
```

### useCounter

<aside>
💡 管理计数器的 Hook。

</aside>

#### API

```tsx
const [current, { inc, dec, set, reset }] = useCounter(initialValue, {
  min,
  max,
});
```

##### Params

| 参数         | 说明   | 类型   | 默认值 |
| ------------ | ------ | ------ | ------ |
| initialValue | 默认值 | number | 0      |
| min          | 最小值 | number | -      |
| max          | 最大值 | number | -      |

##### Result

| 参数    | 说明         | 类型                                             |
| ------- | ------------ | ------------------------------------------------ |
| current | 当前值       | number                                           |
| inc     | 加，默认加 1 | (delta?: number) ⇒ void                          |
| dec     | 减，默认减 1 | (delta?: number) ⇒ void                          |
| set     | 设置 current | (value: number \| ((c: number) ⇒ number)) ⇒ void |
| reset   | 重置为默认值 | () ⇒ void                                        |

#### 代码演示

[基础用法 - CodeSandbox](https://codesandbox.io/s/w5g96z)

#### 源码解析

```tsx
import { useState } from "react";
import { isNumber } from "../../../utils";
import useMemoizedFn from "@/hooks/useMemoizedFn";

export interface Options {
  min?: number;
  max?: number;
}

export interface Actions {
  inc: (delta?: number) => void;
  dec: (delta?: number) => void;
  set: (value: number | ((c: number) => number)) => void;
  reset: () => void;
}

export type ValueParam = number | ((c: number) => number);

/**
 * 获取目标数值
 * 必须大于等于 min
 * 小于等于 max
 * */
function getTargetValue(val: number, options: Options = {}) {
  const { min, max } = options;
  let target = val;
  if (isNumber(max)) {
    target = Math.min(max, target);
  }
  if (isNumber(min)) {
    target = Math.max(min, target);
  }
  return target;
}

const useCounter = (initialValue: number = 0, options: Options = {}) => {
  const { min, max } = options;

  const [current, setCurrent] = useState(() => {
    return getTargetValue(initialValue, {
      min,
      max,
    });
  });

  // 设置值，参数可以为 number 或 函数
  const setValue = (value: ValueParam) => {
    setCurrent((c) => {
      const target = isNumber(value) ? value : value(c);
      return getTargetValue(target, {
        max,
        min,
      });
    });
  };

  // 加，默认加 1
  const inc = (delta: number = 1) => {
    setValue((c) => c + delta);
  };

  // 减，默认减 1
  const dec = (delta: number = 1) => {
    setValue((c) => c - delta);
  };

  // 设置 current
  const set = (value: ValueParam) => {
    setValue(value);
  };

  // 重置为默认值
  const reset = () => {
    setValue(initialValue);
  };

  return [
    current,
    {
      inc: useMemoizedFn(inc),
      dec: useMemoizedFn(dec),
      set: useMemoizedFn(set),
      reset: useMemoizedFn(reset),
    },
  ] as const;
};

export default useCounter;
```

### useTextSelection

<aside>
💡 实时获取用户当前选取的文本内容及位置。

</aside>

#### API

```tsx
const state = useTextSelection(target?)
```

##### Params

| 参数   | 说明               | 类型                                                                           | 默认值   |
| ------ | ------------------ | ------------------------------------------------------------------------------ | -------- |
| target | DOM element or ref | Element \| Document \| (() ⇒ Element \| Document) \| MutableRefObject<Element> | document |

##### Result

| 参数  | 说明                           | 类型  |
| ----- | ------------------------------ | ----- |
| state | DOM 节点内选取文本的内容和位置 | State |

##### State

| 参数   | 说明             | 类型   |
| ------ | ---------------- | ------ |
| text   | 用户选取的文本值 | string |
| left   | 文本的左坐标     | number |
| right  | 文本的右坐标     | number |
| top    | 文本的顶坐标     | number |
| bottom | 文本的底坐标     | number |
| height | 文本的高度       | number |
| width  | 文本的宽度       | number |

#### 代码演示

[基础用法 - CodeSandbox](https://codesandbox.io/s/pfpnx3)

[监听特定区域文本选择 - CodeSandbox](https://codesandbox.io/s/cjx52k)

[划词翻译 - CodeSandbox](https://codesandbox.io/s/jf3x45)

#### 源码解析

```tsx
import { BasicTarget, getTargetElement } from "../../../utils/domTarget";
import { useRef, useState } from "react";
import useEffectWithTarget from "../../../utils/useEffectWithTarget";

interface Rect {
  top: number;
  left: number;
  bottom: number;
  right: number;
  height: number;
  width: number;
}

export interface State extends Rect {
  text: string;
}

const initRect: Rect = {
  top: NaN,
  left: NaN,
  bottom: NaN,
  right: NaN,
  height: NaN,
  width: NaN,
};

const initState: State = {
  text: "",
  ...initRect,
};

function getRectFromSelection(selection: Selection | null): Rect {
  if (!selection) {
    return initRect;
  }

  // rangeCount readonly 返回该选区所包含的连续范围的数量
  if (selection.rangeCount < 1) {
    return initRect;
  }

  // getRangeAt() 方法返回一个包含当前选区内容的区域对象
  // index 指定需要被处理的子级编号（从 0 开始），如果该数值被错误的赋予了大于或等于 rangeCount 结果的数字，将会产生错误
  const range = selection.getRangeAt(0);

  // range.getBoundingClientRect() 返回一个 DOMRect 对象，其绑定了 Range 的整个内容
  const { height, width, top, left, right, bottom } =
    range.getBoundingClientRect();
  return {
    height,
    width,
    top,
    left,
    right,
    bottom,
  };
}

const useTextSelection = (target?: BasicTarget<Document | Element>): State => {
  const [state, setState] = useState(initState);

  const stateRef = useRef(state);
  const isInRangeRef = useRef(false);
  stateRef.current = state;

  useEffectWithTarget(
    () => {
      // 获取目标元素
      const el = getTargetElement(target, document);
      if (!el) {
        return;
      }

      // 鼠标松开时触发回调，获取选取的文本及位置信息
      const mouseupHandler = () => {
        let selObj: Selection | null = null;
        let text = "";
        let rect = initRect;
        if (!window.getSelection) return;
        selObj = window.getSelection();
        // toString() 方法返回当前选区的纯文本内容
        text = selObj ? selObj.toString() : "";

        if (text && isInRangeRef.current) {
          rect = getRectFromSelection(selObj);
          setState({ ...state, text, ...rect });
        }
      };

      // 鼠标按下时触发回调，重置状态、清除选区
      const mousedownHandler = (e) => {
        // 如果按下的是右键，则立即返回，这样选中的数据就不会被清空
        if (e.button === 2) return;

        if (!window.getSelection) return;

        // 重置状态
        if (stateRef.current.text) {
          setState({ ...initState });
        }
        isInRangeRef.current = false;

        // 清除选区
        // https://developer.mozilla.org/zh-CN/docs/Web/API/Window/getSelection
        // 返回一个 Selection 对象，表示用户选择的文本范围或光标的当前位置
        const selObj = window.getSelection();
        if (!selObj) return;
        // https://developer.mozilla.org/zh-CN/docs/Web/API/Selection/removeAllRanges
        // Selection.removeAllRanges() 方法会将所有的区域都从选取中移除，只留下 anchorNode 和focusNode 属性并将其设置为 null
        // anchorNode readonly 返回该选区起点所在的节点
        // focusNode readonly 返回该选区终点所在的节点
        selObj.removeAllRanges();

        // 检查元素 el 是否包含鼠标事件的目标元素
        isInRangeRef.current = el.contains(e.target);
      };

      // 监听 mouseup 和 mousedown
      el.addEventListener("mouseup", mouseupHandler);
      document.addEventListener("mousedown", mousedownHandler);

      return () => {
        el.removeEventListener("mouseup", mouseupHandler);
        document.removeEventListener("mousedown", mousedownHandler);
      };
    },
    [],
    target
  );

  return state;
};

export default useTextSelection;
```

### useWebSocket

<aside>
💡 用于处理 Websocket 的 Hook。

</aside>

#### API

```tsx
enum ReadyState {
  Connecting = 0,
  Open = 1,
  Closing = 2,
  Closed = 3,
}

interface Options {
  reconnectLimit?: number;
  reconnectInterval?: number;
	manual?: boolean;
  onOpen?: (event: WebSocketEventMap['open'], instance: WebSocket) => void;
  onClose?: (event: WebSocketEventMap['close'], instance: WebSocket) => void;
  onMessage?: (message: WebSocketEventMap['message'], instance: WebSocket) => void;
  onError?: (event: WebSocketEventMap['error'], instance: WebSocket) => void;
  protocols?: string | string[];
}

interface Result {
  latestMessage?: WebSocketEventMap['message'];
  sendMessage: WebSocket['send'];
  disconnect: () => void;
  connect: () => void;
  readyState: ReadyState;
  webSocketIns?: WebSocket;
}

useWebSocket(socketUrl: string, options?: Options): Result;
```

##### Params

| 参数      | 说明                 | 类型    | 默认值 |
| --------- | -------------------- | ------- | ------ |
| socketUrl | 必填，webSocket 地址 | string  | -      |
| options   | 可选，连接配置项     | Options | -      |

##### Options

| 参数              | 说明                   | 类型                                                                 | 默认值 |
| ----------------- | ---------------------- | -------------------------------------------------------------------- | ------ |
| onOpen            | webSocket 连接成功回调 | (event: WebSocketEventMap['open'], instance: WebSocket) => void      | -      |
| onClose           | webSocket 关闭回调     | (event: WebSocketEventMap['close'], instance: WebSocket) => void     | -      |
| onMessage         | webSocket 收到消息回调 | (message: WebSocketEventMap['message'], instance: WebSocket) => void | -      |
| onError           | webSocket 错误回调     | (event: WebSocketEventMap['error'], instance: WebSocket) => void     | -      |
| reconnectLimit    | 重试次数               | number                                                               | 3      |
| reconnectInterval | 重试时间间隔 (ms)      | number                                                               | 3000   |
| manual            | 手动启动连接           | boolean                                                              | false  |
| protocols         | 子协议                 | string \| string[]                                                   | -      |

##### Result

| 参数          | 说明                                                   | 类型                         |
| ------------- | ------------------------------------------------------ | ---------------------------- |
| latestMessage | 最新消息                                               | WebSocketEventMap[’Message’] |
| sendMessage   | 发送消息函数                                           | WebSocket[’send’]            |
| disconnect    | 手动断开 webSocket 连接                                | () ⇒ void                    |
| connect       | 手动连接 webSocket，如果当前已有连接，则关闭后重新连接 | () ⇒ void                    |
| readyState    | 当前 webSocket 连接状态                                | ReadyState                   |
| webSocketIns  | webSocket 实例                                         | WebSocket                    |

#### 代码演示

[trusting-dust-gmtws6](https://codesandbox.io/p/sandbox/trusting-dust-gmtws6)

#### 源码解析

```tsx
import useLatest from "@/hooks/useLatest";
import { useEffect, useRef, useState } from "react";
import useUnmount from "@/hooks/useUnmount";
import useMemoizedFn from "@/hooks/useMemoizedFn";

/**
 * ReadyState.Connecting: 正在连接中
 * ReadyState.Open: 已经连接并可以通讯
 * ReadyState.Closing: 连接正在关闭
 * ReadyState.Closed: 连接已关闭或没有连接成功
 * */
export enum ReadyState {
  Connecting = 0,
  Open = 1,
  Closing = 2,
  Closed = 3,
}

/**
 * reconnectLimit: 重试次数
 * reconnectInterval: 重试时间间隔（ms）
 * manual: 手动启动连接
 * onOpen: 连接成功回调
 * onClose: 关闭回调
 * onMessage: 收到消息回调
 * onError: 错误回调
 * protocols: 子协议
 * */
export interface Options {
  reconnectLimit?: number;
  reconnectInterval?: number;
  manual?: boolean;
  onOpen?: (event: WebSocketEventMap["open"], instance: WebSocket) => void;
  onClose?: (event: WebSocketEventMap["close"], instance: WebSocket) => void;
  onMessage?: (
    message: WebSocketEventMap["message"],
    instance: WebSocket
  ) => void;
  onError?: (event: WebSocketEventMap["error"], instance: WebSocket) => void;
  protocols?: string | string[];
}

/**
 * latestMessage: 最新消息
 * sendMessage: 发送消息函数
 * disconnect: 手动断开 webSocket 连接
 * connect: 手动连接 webSocket，如果当前已有连接，则关闭后重新连接
 * readyState: 当前 webSocket 连接状态
 * webSocketIns: webSocket 实例
 * */
export interface Result {
  latestMessage?: WebSocketEventMap["message"];
  sendMessage: WebSocket["send"];
  disconnect: () => void;
  connect: () => void;
  readyState: ReadyState;
  webSocketIns?: WebSocket;
}

const useWebSocket = (socketUrl: string, options: Options = {}): Result => {
  const {
    reconnectLimit = 3,
    reconnectInterval = 3 * 1000,
    manual = false,
    onOpen,
    onClose,
    onMessage,
    onError,
    protocols,
  } = options;

  const onOpenRef = useLatest(onOpen);
  const onCloseRef = useLatest(onClose);
  const onMessageRef = useLatest(onMessage);
  const onErrorRef = useLatest(onError);

  const reconnectTimesRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const websocketRef = useRef<WebSocket>();

  const [latestMessage, setLatestMessage] =
    useState<WebSocketEventMap["message"]>();
  const [readyState, setReadyState] = useState<ReadyState>(ReadyState.Closed);

  // 重试
  const reconnect = () => {
    // 没有超过重试次数并且当前 webSocket 实例状态不是 ReadyState.Open
    if (
      reconnectTimesRef.current < reconnectLimit &&
      websocketRef.current?.readyState !== ReadyState.Open
    ) {
      // 如果存在重试逻辑，则清除掉计定时器
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }

      // 定时重连
      reconnectTimerRef.current = setTimeout(() => {
        connectWs();
        reconnectTimesRef.current++;
      }, reconnectInterval);
    }
  };

  // 创建连接
  const connectWs = () => {
    // 如果存在重试逻辑，则清除掉计定时器
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
    }

    // 如果当前已有连接，则关闭掉
    if (websocketRef.current) {
      websocketRef.current?.close();
    }

    // 创建 webSocket
    const ws = new WebSocket(socketUrl, protocols);
    setReadyState(ReadyState.Connecting);

    // webSocket 错误回调
    ws.onerror = (event) => {
      if (websocketRef.current !== ws) {
        return;
      }
      // 重试
      reconnect();
      // 执行错误回调
      onErrorRef.current?.(event, ws);
      // 修改连接状态
      setReadyState(ws.readyState || ReadyState.Closed);
    };

    // webSocket 连接成功回调
    ws.onopen = (event) => {
      if (websocketRef.current !== ws) {
        return;
      }
      // 执行连接成功回调
      onOpenRef.current?.(event, ws);
      // 重置重试次数
      reconnectTimesRef.current = 0;
      // 修改连接状态
      setReadyState(ws.readyState || ReadyState.Open);
    };

    // webSocket 收到消息回调
    ws.onmessage = (message: WebSocketEventMap["message"]) => {
      if (websocketRef.current !== ws) {
        return;
      }
      // 执行收到消息回调
      onMessageRef.current?.(message, ws);
      // 更新最新消息状态
      setLatestMessage(message);
    };

    // webSocket 连接关闭回调
    ws.onclose = (event) => {
      onCloseRef.current?.(event, ws);
      // closed by server
      if (websocketRef.current === ws) {
        reconnect();
      }
      // closed by disconnect or closed by server
      if (!websocketRef.current || websocketRef.current === ws) {
        setReadyState(ws.readyState || ReadyState.Closed);
      }
    };

    // 保存 webSocket 实例
    websocketRef.current = ws;
  };

  // 发送消息函数
  const sendMessage: WebSocket["send"] = (message) => {
    if (readyState === ReadyState.Open) {
      websocketRef.current?.send(message);
    } else {
      throw new Error("Websocket disconnected");
    }
  };

  // 手动连接 webSocket，如果当前已有连接，则关闭后重新连接
  const connect = () => {
    reconnectTimesRef.current = 0;
    connectWs();
  };

  // 手动断开 webSocket 连接
  const disconnect = () => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
    }

    reconnectTimesRef.current = reconnectLimit;
    websocketRef.current?.close();
    websocketRef.current = undefined;
  };

  useEffect(() => {
    // 是否手动启动连接
    if (!manual && socketUrl) {
      connect();
    }
  }, [socketUrl, manual]);

  // 组件销毁
  useUnmount(() => {
    disconnect();
  });

  return {
    latestMessage,
    sendMessage: useMemoizedFn(sendMessage),
    connect: useMemoizedFn(connect),
    disconnect: useMemoizedFn(disconnect),
    readyState,
    webSocketIns: websocketRef.current,
  };
};

export default useWebSocket;
```

## LifeCycle

### useMount

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

### useUnmount

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

### useUnmountedRef

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

## State

### useSetState

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

### useBoolean

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

### useToggle

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

### useUrlState

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

### useCookieState

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

### useLocalStorageState

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

### useSessionStorageState

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

### useDebounce

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

### useThrottle

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

### useMap

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

### useSet

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

### usePrevious

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

### useRafState

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

### useSafeState

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

### useGetState

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

### useResetState

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

## Effect

### useUpdateEffect

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

### useUpdateLayoutEffect

[文档地址](https://ahooks.js.org/zh-CN/hooks/use-update-layout-effect)

[详细代码](https://github.com/alibaba/hooks/blob/master/packages/hooks/src/useUpdateLayoutEffect/index.ts)

```tsx
import { useLayoutEffect } from "react";
import { createUpdateEffect } from "@/hooks/createUpdateEffect";

export default createUpdateEffect(useLayoutEffect);
```

### useAsyncEffect

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

### useDebounceEffect

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

### useDebounceFn

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

### useThrottleFn

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

### useThrottleEffect

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

### useDeepCompareEffect

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

### useDeepCompareLayoutEffect

[文档地址](https://ahooks.js.org/zh-CN/hooks/use-deep-compare-layout-effect)

[详细代码](https://github.com/alibaba/hooks/blob/master/packages/hooks/src/useDeepCompareLayoutEffect/index.tsx)

```tsx
import { useLayoutEffect } from "react";
import { createDeepCompareEffect } from "../createDeepCompareEffect";

export default createDeepCompareEffect(useLayoutEffect);
```

### useInterval

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

### useRafInterval

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
import useLatest from "@/hooks/useLatest";
import { isNumber } from "../../../utils";

interface Handle {
  id: number | ReturnType<typeof setInterval>;
}

const setRafInterval = (callback: () => void, delay: number = 0): Handle => {
  // 如果不支持 requestAnimationFrame API，则改用 setInterval
  if (typeof requestAnimationFrame === typeof undefined) {
    return {
      id: setInterval(callback, delay),
    };
  }
  // 初始化开始时间
  let start = Date.now();
  // 初始化 handle
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
    // 重置 handle，递归调用 requestAnimationFrame，请求下一帧（：此处请注意与 useRafTimeout 的区别
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
  // 使用 cancelAnimationFrame API 清除
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
    // delay 不是数字或 delay 的值小于 0，直接返回，停止定时器
    if (!isNumber(delay) || delay < 0) {
      return;
    }
    // 立即执行一次回调函数
    if (immediate) {
      fnRef.current();
    }
    // 开启新的定时器
    timerRef.current = setRafInterval(() => {
      fnRef.current();
    }, delay);
    // 通过 useEffect 的返回清除机制，清除定时器，避免内存泄露
    return () => {
      if (timerRef.current) {
        clearRafInterval(timerRef.current);
      }
    };
  }, [delay]);

  return clear;
};

export default useRafInterval;
```

### useTimeout

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

### useRafTimeout

[文档地址](https://ahooks.js.org/zh-CN/hooks/use-raf-interval)

[详细代码](https://github.com/alibaba/hooks/blob/master/packages/hooks/src/useRafInterval/index.ts)

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
import useLatest from "@/hooks/useLatest";
import { isNumber } from "../../../utils";

interface Handle {
  id: number | ReturnType<typeof setTimeout>;
}

const setRafTimeout = (callback: () => void, delay: number = 0): Handle => {
  // 如果不支持 requestAnimationFrame API，则改用 setTimeout
  if (typeof requestAnimationFrame === typeof undefined) {
    return {
      id: setTimeout(callback, delay),
    };
  }
  // 初始化开始时间
  let startTime = Date.now();
  // 初始化 handle
  const handle: Handle = {
    id: 0,
  };
  // 定义动画函数
  const loop = () => {
    const current = Date.now();
    // 当前时间 - 开始时间 >= delay，则执行 callback
    if (current - startTime >= delay) {
      callback();
    } else {
      // 否则，请求下一帧（：此处请注意与 useRafInterval 的区别
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
  // 不支持 cancelAnimationFrame API，则通过 clearTimeout 清除
  if (cancelAnimationFrameIsNotDefined(handle.id)) {
    return clearTimeout(handle.id);
  }
  // 使用 cancelAnimationFrame API 清除
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
    // delay 不是数字或 delay 的值小于 0，直接返回，停止定时器
    if (!isNumber(delay) || delay < 0) return;
    // 开启新的定时器
    timerRef.current = setRafTimeout(() => {
      fnRef.current();
    }, delay);
    // 通过 useEffect 的返回清除机制，清除定时器，避免内存泄露
    return () => {
      if (timerRef.current) {
        clearRafTimeout(timerRef.current);
      }
    };
  }, [delay]);

  return clear;
};

export default useRafTimeout;
```

### useLockFn

<aside>
💡 用于给一个异步函数增加竞态锁，防止并发执行。

</aside>

#### API

```tsx
function useLockFn<P extends any[] = any[], V = any>(
	fn: (...args: P) => Promise<V>
): fn: (...args: P) => Promise<V | undefined>;
```

##### Params

| 参数 | 说明                 | 类型                          | 默认值 |
| ---- | -------------------- | ----------------------------- | ------ |
| fn   | 需要增加竞态锁的函数 | (…args: any[]) ⇒ Promise<any> | -      |

##### Result

| 参数 | 说明               | 类型                          |
| ---- | ------------------ | ----------------------------- |
| fn   | 增加了竞态锁的函数 | (…args: any[]) ⇒ Promise<any> |

#### 代码演示

[防止重复提交 - CodeSandbox](https://codesandbox.io/s/2x5knt)

#### 源码解析

```tsx
import { useCallback, useRef } from "react";

const useLockFn = <P extends any[] = any[], V = any>(
  fn: (...args: P) => Promise<V>
) => {
  // 是否正处于一个锁中，即异步请求正在进行
  const lockRef = useRef(false);

  return useCallback(
    async (...args: P) => {
      // 请求正在进行，直接返回
      if (lockRef.current) return;
      // 上锁，表示请求正在进行
      lockRef.current = true;
      try {
        // 执行异步请求
        const ret = await fn(...args);
        // 请求完毕，竞态锁状态设置为 false
        lockRef.current = false;
        // 返回
        return ret;
      } catch (e) {
        // 请求失败，竞态锁状态设置为 false
        lockRef.current = false;
        // 抛出错误
        throw e;
      }
    },
    [fn]
  );
};

export default useLockFn;
```

#### 总结

虽然实用，但缺点也很明显，需要给每一个需要添加竞态锁的请求异步函数都手动加一遍。

通过 axios 可以自动取消重复请求，参考： [Axios 如何取消重复请求？](https://mp.weixin.qq.com/s?__biz=MzAxODE2MjM1MA==&mid=2651576212&idx=2&sn=b1c3fac9534f01f4d7c68f7b88800d5c&chksm=80250055b75289430570c54ba104675cbc6e5cf15cd35154a63f1d89b9f7211fb2f88f232e0f&scene=21#wechat_redirect)

### useUpdate

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

## DOM

### useEventListener

[文档地址](https://ahooks.js.org/zh-CN/hooks/use-event-listener)

[详细代码](https://github.com/alibaba/hooks/blob/master/packages/hooks/src/useEventListener/index.ts)

<aside>
🐞 addEventListener：EventTarget.addEventListener() 方法将指定的监听器注册到 EventTarget 上，当该对象触发指定的事件时，指定的回调函数就会被执行。

</aside>

<aside>
🐞 EventTarget：可以是 Window、Document、HTMLElement、Element 或者任何其他支持事件的对象。

</aside>

```tsx
import type { MutableRefObject } from "react";
import isBrowser from "./isBrowser";
import { isFunction } from ".";

type TargetValue<T> = T | undefined | null;

/**
 * Window: 表示浏览器窗口的接口
 * Document: 表示文档的接口
 * HTMLElement 表示 HTML 元素的接口
 * Element: 表示 DOM 元素的接口
 */

type TargetType = Window | Document | HTMLElement | Element;

export type BasicTarget<T extends TargetType = Element> =
  | (() => TargetValue<T>)
  | TargetValue<T>
  | MutableRefObject<TargetValue<T>>;

export const getTargetElement = <T extends TargetType>(
  target: BasicTarget<T>,
  defaultElement?: T
) => {
  if (!isBrowser) {
    return undefined;
  }
  if (!target) {
    return defaultElement;
  }

  let targetElement: TargetValue<T>;

  if (isFunction(target)) {
    targetElement = target();
  } else if ("current" in target) {
    targetElement = target.current;
  } else {
    targetElement = target;
  }

  return targetElement;
};
```

```tsx
import type { DependencyList } from "react";

const depsAreSame = (
  oldDeps: DependencyList,
  deps: DependencyList
): boolean => {
  if (oldDeps === deps) return true;
  for (let i = 0; i < oldDeps.length; i++) {
    if (!Object.is(oldDeps[i], deps[i])) return false;
  }
  return true;
};

export default depsAreSame;
```

```tsx
import {
  useRef,
  type DependencyList,
  type EffectCallback,
  type useEffect,
  type useLayoutEffect,
} from "react";
import { type BasicTarget, getTargetElement } from "./domTarget";
import useUnmount from "@/hooks/useUnmount";
import depsAreSame from "./depsAreSame";

const createEffectWithTarget = (
  useEffectType: typeof useEffect | typeof useLayoutEffect
) => {
  /**
   *
   * @param effect
   * @param deps
   * @param target target should compare ref.current vs ref.current, dom vs dom, ()=>dom vs ()=>dom
   */
  const useEffectWithTarget = (
    effect: EffectCallback,
    deps: DependencyList,
    target: BasicTarget<any> | BasicTarget<any>[]
  ) => {
    // 是否首次挂载
    const hasInitRef = useRef(false);

    // 上一次的目标元素
    const lastElementRef = useRef<(Element | null)[]>([]);
    // 上一次的依赖项
    const lastDepsRef = useRef<DependencyList>([]);

    // 清除副作用函数
    const unLoadRef = useRef<any>();

    useEffectType(() => {
      const targets = Array.isArray(target) ? target : [target];
      const els = targets.map((item) => getTargetElement(item));

      // init run
      if (!hasInitRef.current) {
        hasInitRef.current = true;
        lastElementRef.current = els;
        lastDepsRef.current = deps;

        // 执行回调函数
        unLoadRef.current = effect();
        return;
      }

      if (
        els.length !== lastElementRef.current.length ||
        !depsAreSame(lastElementRef.current, els) ||
        !depsAreSame(lastDepsRef.current, deps)
      ) {
        // 清除副作用
        unLoadRef.current?.();

        lastElementRef.current = els;
        lastDepsRef.current = deps;
        unLoadRef.current = effect();
      }
    });

    useUnmount(() => {
      unLoadRef.current?.();
      // for react-refresh
      hasInitRef.current = false;
    });
  };

  return useEffectWithTarget;
};

export default createEffectWithTarget;
```

```tsx
import { useEffect } from "react";
import createEffectWithTarget from "./createEffectWithTarget";

const useEffectWithTarget = createEffectWithTarget(useEffect);

export default useEffectWithTarget;
```

```tsx
import { getTargetElement, type BasicTarget } from "@/utils/domTarget";
import useLatest from "../useLatest";
import useEffectWithTarget from "@/utils/useEffectWithTarget";

type noop = (...p: any) => void;

export type Target = BasicTarget<Window | Document | HTMLElement | Element>;

type Options<T extends Target = Target> = {
  target?: T;
  capture?: boolean;
  once?: boolean;
  passive?: boolean;
  // 可选项，是否开启监听
  enable?: boolean;
};

function useEventListener<K extends keyof WindowEventMap>(
  eventName: K,
  handler: (ev: WindowEventMap[K]) => void,
  options?: Options<Window>
): void;
function useEventListener<K extends keyof DocumentEventMap>(
  eventName: K,
  handler: (ev: DocumentEventMap[K]) => void,
  options?: Options<Document>
): void;
function useEventListener<K extends keyof HTMLElementEventMap>(
  eventName: K,
  handler: (ev: HTMLElementEventMap[K]) => void,
  options?: Options<HTMLElement>
): void;
function useEventListener<K extends keyof ElementEventMap>(
  eventName: K,
  handler: (ev: ElementEventMap[K]) => void,
  options?: Options<Element>
): void;
function useEventListener(
  eventName: string,
  handler: (ev: Event) => void,
  options?: Options<Window>
): void;
function useEventListener(
  eventName: string,
  handler: noop,
  options: Options
): void;
function useEventListener(
  eventName: string,
  handler: noop,
  options: Options = {}
) {
  // 默认开启监听
  const { enable = true } = options;

  const handlerRef = useLatest(handler);

  useEffectWithTarget(
    () => {
      // 是否开启监听
      if (!enable) {
        return;
      }

      const targetElement = getTargetElement(options.target, window);
      // 是否支持 addEventListener
      if (!targetElement?.addEventListener) {
        return;
      }

      const eventListener = (event: Event) => {
        return handlerRef.current(event);
      };
      // 为指定元素添加事件监听器
      targetElement.addEventListener(eventName, eventListener, {
        // 指定事件是否在捕获阶段进行处理
        capture: options.capture,
        // 指定事件是否只触发一次
        once: options.once,
        // 指定事件处理函数是否不会调用 preventDefault()
        passive: options.passive,
      });

      // 移除事件监听器
      return () => {
        targetElement.removeEventListener(eventName, eventListener, {
          capture: options.capture,
        });
      };
    },
    [eventName, options.capture, options.once, options.passive, enable],
    options.target
  );
}
export default useEventListener;
```

### useClickAway

<aside>
💡 监听目标元素外的点击事件。

</aside>

#### API

```tsx
type Target = Element | (() => Element) | React.MutableRefObject<Element>;
type DocumentEventKey = keyof DocumentEventMap;

useClickAway<T extends Event = Event>(
	onClickAway: (event: T) => void;
	target: Target | Target[];
	eventName?: DocumentEventKey | DocumentEventKey[]
)
```

##### Params

| 参数        | 说明                         | 类型                                   | 默认值 |
| ----------- | ---------------------------- | -------------------------------------- | ------ |
| onClickAway | 触发函数                     | (event: T) => void                     | -      |
| target      | DOM 节点或者 Ref，支持数组   | Target \| Target[]                     | -      |
| eventName   | 指定需要监听的事件，支持数组 | DocumentEventKey \| DocumentEventKey[] | click  |

#### 代码演示

[基础用法 - CodeSandbox](https://codesandbox.io/s/fyqrwr)

[支持传入 DOM - CodeSandbox](https://codesandbox.io/s/7mvdkp)

[支持多个 DOM 对象 - CodeSandbox](https://codesandbox.io/s/r6fc3n)

[监听其它事件 - CodeSandbox](https://codesandbox.io/s/cv9fvz)

[支持传入多个事件名称 - CodeSandbox](https://codesandbox.io/s/ydtpyk)

[支持 shadow DOM - CodeSandbox](https://codesandbox.io/s/dp8vkx)

#### 源码解析

```tsx
import type { BasicTarget } from "./domTarget";
import { getTargetElement } from "./domTarget";

declare type TargetValue<T> = T | undefined | null;

const checkIfAllInShadow = (target: BasicTarget[]): boolean => {
  return target.every((item) => {
    const targetElement = getTargetElement(item);
    if (!targetElement) return false;
    if (targetElement.getRootNode() instanceof ShadowRoot) return true;
  });
};

const getShadow = (node: TargetValue<Element>) => {
  if (!node) {
    return document;
  }
  // 返回该元素的根节点
  return node.getRootNode();
};

const getDocumentOrShadow = (
  target: BasicTarget | BasicTarget[]
): Document | Node => {
  if (!target || !document.getRootNode) {
    return document;
  }

  const targets = Array.isArray(target) ? target : [target];

  if (checkIfAllInShadow(targets)) {
    return getShadow(getTargetElement(targets[0]));
  }

  return document;
};

export default getDocumentOrShadow;
```

```tsx
import useLatest from "@/hooks/useLatest";
import type { BasicTarget } from "../../../utils/domTarget";
import { getTargetElement } from "../../../utils/domTarget";
import getDocumentOrShadow from "../../../utils/getDocumentOrShadow";
import useEffectWithTarget from "../../../utils/useEffectWithTarget";

type DocumentEventKey = keyof DocumentEventMap;

const useClickAway = <T extends Event = Event>(
  // 触发函数
  onClickAway: (event: T) => void,
  // DOM 节点或 Ref，支持数组
  target: BasicTarget | BasicTarget[],
  // 指定要监听的事件，支持数组
  eventName: DocumentEventKey | DocumentEventKey[] = "click"
) => {
  const onClickAwayRef = useLatest(onClickAway);

  useEffectWithTarget(
    () => {
      const handler = (event: any) => {
        const targets = Array.isArray(target) ? target : [target];
        if (
          targets.some((item) => {
            // 判断点击的 DOM Target 是否在定义的 DOM 元素（列表）中
            const targetElement = getTargetElement(item);
            return !targetElement || targetElement.contains(event.target);
          })
        ) {
          return;
        }
        // 触发点击事件
        onClickAwayRef.current(event);
      };

      // 事件代理 - 代理到 shadow root 或 document
      const documentOrShadow = getDocumentOrShadow(target);

      // 事件列表
      const eventNames = Array.isArray(eventName) ? eventName : [eventName];

      // 事件监听
      eventNames.forEach((event) =>
        documentOrShadow.addEventListener(event, handler)
      );

      return () => {
        // 组件卸载时清除事件监听
        eventNames.forEach((event) =>
          documentOrShadow.removeEventListener(event, handler)
        );
      };
    },
    Array.isArray(eventName) ? eventName : [eventName],
    target
  );
};

export default useClickAway;
```

### useDrag & useDrop

<aside>
💡 处理元素拖拽的 Hook。

</aside>

useDrop 可以单独使用来接收文件、文字和网址的拖拽。

useDrag 允许一个 DOM 节点被拖拽，需要配合 useDrop 的使用。

向节点内触发粘贴动作也会被视为拖拽。

#### API

##### useDrag

```tsx
useDrag<T>(
	data: any,
	target: (() => Element)) | Element | MutableRefObject<Element>,
	options?: DragOptions
)
```

###### Params

| 参数    | 说明                  | 类型                                                       | 默认值 |
| ------- | --------------------- | ---------------------------------------------------------- | ------ |
| data    | 拖拽的内容            | any                                                        | -      |
| target  | DOM 节点或者 Ref 对象 | (() => Element)) \| Element \| MutableRefObject\<Element\> | -      |
| options | 额外的配置项          | DragOptions                                                | -      |

###### DragOptions

| 参数        | 说明                               | 类型                        | 默认值 |
| ----------- | ---------------------------------- | --------------------------- | ------ |
| onDragStart | 开始拖拽的回调                     | (e: React.DragEvent) ⇒ void | -      |
| onDragEnd   | 结束拖拽的回调                     | (e: React.DragEvent) ⇒ void | -      |
| dragImage   | 自定义拖拽过程中跟随鼠标指针的图像 | DragImageOptions            | -      |

###### DragImageOptions

| 参数    | 说明                                                                                                | 类型              | 默认值 |
| ------- | --------------------------------------------------------------------------------------------------- | ----------------- | ------ |
| image   | 拖拽过程中跟随鼠标指针的图像。图像通常是一个 \<img\> 元素，但也可以是 \<canvas\> 或任何其他图像元素 | string \| Element | -      |
| offsetX | 水平偏移                                                                                            | number            | 0      |
| offsetY | 垂直偏移                                                                                            | number            | 0      |

##### useDrop

```tsx
useDrop<T>(
	target: (() => Element)) | Element | MutableRefObject<Element>,
	options?: DropOptions
)
```

###### Params

| 参数    | 说明                  | 类型                                                     | 默认值 |
| ------- | --------------------- | -------------------------------------------------------- | ------ |
| target  | DOM 节点或者 Ref 对象 | (() => Element)) \| Element \| MutableRefObject<Element> | -      |
| options | 额外的配置项          | DropOptions                                              | -      |

###### DropOptions

| 参数        | 说明                           | 类型                                       | 默认值 |
| ----------- | ------------------------------ | ------------------------------------------ | ------ |
| onText      | 拖拽/粘贴文字的回调            | (text: string, e: React.DragEvent) ⇒ void  | -      |
| onFiles     | 拖拽/粘贴文件的回调            | (files: File[], e: React.DragEvent) ⇒ void | -      |
| onUri       | 拖拽/粘贴链接的回调            | (text: string, e: React.DragEvent) ⇒ void  | -      |
| onDom       | 拖拽/粘贴自定义 DOM 节点的回调 | (content: any, e: React.DragEvent) ⇒ void  | -      |
| onDrop      | 拖拽任意内容的回调             | (e: React.DragEvent) ⇒ void                | -      |
| onPaste     | 粘贴内容的回调                 | (e: React.ClipboardEvent) ⇒ void           | -      |
| onDragEnter | 拖拽进入                       | (e: React.DragEvent) ⇒ void                | -      |
| onDragOver  | 拖拽中                         | (e: React.DragEvent) ⇒ void                | -      |
| onDragLeave | 拖拽出去                       | (e: React.DragEvent) ⇒ void                | -      |

#### 代码演示

[基础用法 - CodeSandbox](https://codesandbox.io/s/f72rwf)

[自定义拖拽图像 - CodeSandbox](https://codesandbox.io/s/84tsvf)

#### 源码解析

##### useDrag

```jsx
import { useRef } from "react";
import useLatest from "../useLatest";
import useMount from "../useMount";
import { isString } from "utils";
import type { BasicTarget } from "utils/domTarget";
import { getTargetElement } from "utils/domTarget";
import useEffectWithTarget from "utils/useEffectWithTarget";

export interface Options {
  onDragStart?: (event: React.DragEvent) => void;
  onDragEnd?: (event: React.DragEvent) => void;
  dragImage?: {
    image: string | Element;
    offsetX?: number;
    offsetY?: number;
  };
}

const useDrag = <T>(data: T, target: BasicTarget, options: Options = {}) => {
  // 额外的配置项
  const optionsRef = useLatest(options);
  // 拖拽的内容
  const dataRef = useLatest(data);
  // 拖拽过程中跟随鼠标指针的图像元素
  const imageElementRef = useRef<Element>();

  const { dragImage } = optionsRef.current;

  useMount(() => {
    // 判断 dragImage.image 的类型，将其存储在 imageElementRef.current 中
    if (dragImage?.image) {
      const { image } = dragImage;

      if (isString(image)) {
        // 如果是字符串，创建对应的图片元素
        const imageElement = new Image();

        imageElement.src = image;
        imageElementRef.current = imageElement;
      } else {
        imageElementRef.current = image;
      }
    }
  });

  useEffectWithTarget(
    () => {
      const targetElement = getTargetElement(target);
      if (!targetElement?.addEventListener) {
        return;
      }

      const onDragStart = (event: React.DragEvent) => {
        // 开始拖拽的回调
        optionsRef.current.onDragStart?.(event);
        // 设置拖拉事件中带有的数据
        event.dataTransfer.setData("custom", JSON.stringify(dataRef.current));

        // 设置拖拽过程中跟随鼠标指针的图像
        if (dragImage?.image && imageElementRef.current) {
          // 鼠标相对于图片的偏移量
          const { offsetX = 0, offsetY = 0 } = dragImage;

          event.dataTransfer.setDragImage(
            imageElementRef.current,
            offsetX,
            offsetY
          );
        }
      };

      const onDragEnd = (event: React.DragEvent) => {
        // 结束拖拽的回调
        optionsRef.current.onDragEnd?.(event);
      };

      // 设置元素可拖拽
      targetElement.setAttribute("draggable", "true");

      // 注册开始拖拽事件监听器
      targetElement.addEventListener("dragstart", onDragStart as any);
      // 注册结束拖拽事件监听器
      targetElement.addEventListener("dragend", onDragEnd as any);

      return () => {
        // 组件卸载清除事件监听器
        targetElement.removeEventListener("dragstart", onDragStart as any);
        targetElement.removeEventListener("dragend", onDragEnd as any);
      };
    },
    [],
    target
  );
};

export default useDrag;
```

###### useDrop

```jsx
import React, { useRef } from "react";
import useLatest from "../useLatest";
import type { BasicTarget } from "utils/domTarget";
import { getTargetElement } from "utils/domTarget";
import useEffectWithTarget from "utils/useEffectWithTarget";

export interface Options {
  onFiles?: (files: File[], event?: React.DragEvent) => void;
  onUri?: (url: string, event?: React.DragEvent) => void;
  onDom?: (content: any, event?: React.DragEvent) => void;
  onText?: (text: string, event?: React.ClipboardEvent) => void;
  onDragEnter?: (event?: React.DragEvent) => void;
  onDragOver?: (event?: React.DragEvent) => void;
  onDragLeave?: (event?: React.DragEvent) => void;
  onDrop?: (event?: React.DragEvent) => void;
  onPaste?: (event?: React.ClipboardEvent) => void;
}

// 处理文件、文字和网址的拖放和粘贴事件
const useDrop = <T>(target: BasicTarget, options: Options = {}) => {
  // 额外的配置项
  const optionsRef = useLatest(options);

  // https://stackoverflow.com/a/26459269
  // 跟踪拖拽进入的目标元素
  const dragEnterTarget = useRef<any>();

  useEffectWithTarget(
    () => {
      const targetElement = getTargetElement(target);
      if (!targetElement?.addEventListener) {
        return;
      }

      // 处理拖放和粘贴事件传输的数据，根据数据类型调用对应的回调函数
      const onData = (
        dataTransfer: DataTransfer,
        event: React.DragEvent | React.ClipboardEvent
      ) => {
        const uri = dataTransfer.getData("text/uri-list");
        const dom = dataTransfer.getData("custom");

        // 拖拽/粘贴自定义 DOM 节点的回调
        if (dom && optionsRef.current.onDom) {
          let data = dom;
          try {
            data = JSON.parse(dom);
          } catch (e) {
            data = dom;
          }
          optionsRef.current.onDom(data, event as React.DragEvent);
          return;
        }

        // 拖拽/粘贴链接的回调
        if (uri && optionsRef.current.onUri) {
          optionsRef.current.onUri(uri, event as React.DragEvent);
          return;
        }

        // 拖拽/粘贴文件的回调
        if (
          dataTransfer.files &&
          dataTransfer.files.length &&
          optionsRef.current.onFiles
        ) {
          optionsRef.current.onFiles(
            Array.from(dataTransfer.files),
            event as React.DragEvent
          );
          return;
        }

        // 拖拽/粘贴文字的回调
        if (
          dataTransfer.items &&
          dataTransfer.items.length &&
          optionsRef.current.onText
        ) {
          dataTransfer.items[0].getAsString((text) => {
            optionsRef.current.onText!(text, event as React.ClipboardEvent);
          });
        }
      };

      // 拖拽进入
      const onDragEnter = (event: React.DragEvent) => {
        event.preventDefault();
        event.stopPropagation();

        dragEnterTarget.current = event.target;
        optionsRef.current.onDragEnter?.(event);
      };

      // 拖拽悬停
      const onDragOver = (event: React.DragEvent) => {
        event.preventDefault();
        optionsRef.current.onDragOver?.(event);
      };

      // 拖拽离开
      const onDragLeave = (event: React.DragEvent) => {
        if (event.target === dragEnterTarget.current) {
          optionsRef.current.onDragLeave?.(event);
        }
      };

      // 放置
      const onDrop = (event: React.DragEvent) => {
        event.preventDefault();
        onData(event.dataTransfer, event);
        optionsRef.current.onDrop?.(event);
      };

      // 粘贴
      const onPaste = (event: React.ClipboardEvent) => {
        onData(event.clipboardData, event);
        optionsRef.current.onPaste?.(event);
      };

      targetElement.addEventListener("dragenter", onDragEnter as any);
      targetElement.addEventListener("dragover", onDragOver as any);
      targetElement.addEventListener("dragleave", onDragLeave as any);
      targetElement.addEventListener("drop", onDrop as any);
      targetElement.addEventListener("paste", onPaste as any);
      return () => {
        targetElement.removeEventListener("dragenter", onDragEnter as any);
        targetElement.removeEventListener("dragover", onDragOver as any);
        targetElement.removeEventListener("dragleave", onDragLeave as any);
        targetElement.removeEventListener("drop", onDrop as any);
        targetElement.removeEventListener("paste", onPaste as any);
      };
    },
    [],
    target
  );
};

export default useDrop;
```

### useDocumentVisibility

<aside>
💡 监听页面是否可见。

</aside>

#### API

```tsx
const documentVisibility = useDocumentVisibility();
```

##### Result

| 参数               | 说明                           | 类型                                        |
| ------------------ | ------------------------------ | ------------------------------------------- |
| documentVisibility | 判断 document 是否处于可见状态 | visible \| hidden \| prerender \| undefined |

#### 代码演示

[基础用法 - CodeSandbox](https://codesandbox.io/s/75cmnf)

#### 源码解析

```tsx
import { useState } from "react";
import useEventListener from "@/hooks/useEventListener";
import isBrowser from "../../../utils/isBrowser";

/**
 * 'hidden': 页面对用户不可见。即文档处于背景标签页、或窗口处于最小化状态，或操作系统正处于"锁屏状态"
 * 'visible': 页面内容至少部分可见。即文档处于前景标签页并且窗口没有最小化
 * 'prerender': 页面此时正在渲染中。文档只能从此状态开始，永远不能从其他值变为此状态
 * */
type VisibilityState = "hidden" | "visible" | "prerender" | undefined;

const getVisibility = () => {
  if (!isBrowser) {
    return "visible";
  }

  // 只读属性，返回 document 的可见性，即当前可见元素的上下文环境
  return document.visibilityState;
};

const useDocumentVisibility = (): VisibilityState => {
  const [documentVisibility, setDocumentVisibility] = useState(getVisibility);

  useEventListener(
    // 监听 'visibilitychange'
    "visibilitychange",
    () => {
      setDocumentVisibility(getVisibility());
    },
    {
      target: () => document,
    }
  );

  return documentVisibility;
};

export default useDocumentVisibility;
```

### useEventTarget

<aside>
💡 常见表单控件（通过 e.target.value 获取表单值）的 onChange 跟 value 逻辑封装，支持自定义值转换和重置功能。

</aside>

#### API

```tsx
const [value, { onChange, reset }] = useEventTarget<T, U>(Options<T, U>);
```

##### Options

| 参数         | 说明                         | 类型           | 默认值 |
| ------------ | ---------------------------- | -------------- | ------ |
| initialValue | 可选项，初始值               | T              | -      |
| transformer  | 可选项，可自定义回调值的转化 | (value: U) ⇒ T | -      |

##### Result

| 参数     | 说明                       | 类型                              |
| -------- | -------------------------- | --------------------------------- |
| value    | 表单控件的值               | T                                 |
| onChange | 表单控件值发生变化时的回调 | (e: { target: {value: T}}) ⇒ void |
| reset    | 重置函数                   | () ⇒ void                         |

#### 代码演示

[基础用法 - CodeSandbox](https://codesandbox.io/s/5wc5wk)

[自定义转换函数 - CodeSandbox](https://codesandbox.io/s/tcw63d)

#### 源码解析

```tsx
import { useCallback, useState } from "react";
import useLatest from "@/hooks/useLatest";
import { isFunction } from "../../../utils";

interface EventTarget<U> {
  target: {
    value: U;
  };
}

export interface Options<T, U> {
  initialValue?: T;
  transformer?: (value: U) => T;
}

const useEventTarget = <T, U = T>(options?: Options<T, U>) => {
  const { initialValue, transformer } = options || {};

  const [value, setValue] = useState(initialValue);

  // 自定义回调值的转化
  const transformerRef = useLatest(transformer);

  // 重置函数
  const reset = useCallback(() => setValue(initialValue), []);

  // 表单控件值发生变化时的回调
  const onChange = useCallback((e: EventTarget<U>) => {
    // 获取 e.target.value
    const _value = e.target.value;
    // 判断自定义回调值的转化配置项是否存在并且为函数
    if (isFunction(transformerRef.current)) {
      return setValue(transformerRef.current(_value));
    }
    // no transformer => U and T should be the same
    return setValue(_value as unknown as T);
  }, []);

  return [
    value,
    {
      onChange,
      reset,
    },
  ] as const;
};

export default useEventTarget;
```

### useExternal

<aside>
💡 动态注入 JS 或 CSS 资源，useExternal 可以保证资源全局唯一。

</aside>

#### API

```tsx
const status = useExternal(path: string, options?: Options)
```

##### Params

| 参数 | 说明              | 类型   | 默认值 |
| ---- | ----------------- | ------ | ------ |
| path | 外部资源 url 地址 | string | -      |

##### Options

| 参数           | 说明                                                          | 类型              | 默认值 |
| -------------- | ------------------------------------------------------------- | ----------------- | ------ |
| type           | 需引入外部资源的类型，支持 js/css，如果不传，则根据 path 推导 | string            | -      |
| js             | script 标签支持的属性                                         | HTMLScriptElement | -      |
| css            | link 标签支持的属性                                           | HTMLStyleElement  | -      |
| keepWhenUnused | 在不持有资源的引用后，仍然保留资源                            | boolean           | false  |

##### Result

| 参数   | 说明                                                                       | 类型   |
| ------ | -------------------------------------------------------------------------- | ------ |
| status | 加载状态，unset(未设置)，loading(加载中)，ready(加载完成)，error(加载失败) | string |

#### 代码演示

[基础用法 - CodeSandbox](https://codesandbox.io/s/9kmve0)

[动态加载样式 - CodeSandbox](https://codesandbox.io/s/fn3sjp)

#### 源码解析

```tsx
import { useEffect, useRef, useState } from "react";

type JsOptions = {
  // 需引入外部资源的类型
  type: "js";
  // script 标签支持的属性
  js?: Partial<HTMLScriptElement>;
  // 在不持有资源的引用后，仍然保留资源
  keepWhenUnused?: boolean;
};

type CssOptions = {
  // 需引入外部资源的类型
  type: "css";
  // link 标签支持的属性
  css?: Partial<HTMLStyleElement>;
  // 在不持有资源的引用后，仍然保留资源
  keepWhenUnused?: boolean;
};

type DefaultOptions = {
  type?: never;
  js?: Partial<HTMLScriptElement>;
  css?: Partial<HTMLStyleElement>;
  keepWhenUnused?: boolean;
};

export type Options = JsOptions | CssOptions | DefaultOptions;

/**
 * 加载状态
 * unset - 未设置
 * loading - 加载中
 * ready - 加载完成
 * error - 加载失败
 */
export type Status = "unset" | "loading" | "ready" | "error";

interface loadResult {
  ref: Element;
  status: Status;
}

// {[path]: count}
// remove external when no used
const EXTERNAL_USED_COUNT: Record<string, number> = {};

const loadingScript = (path: string, props = {}): loadResult => {
  // 判断是否已经有该 JS 资源
  const script = document.querySelector(`script[src="${path}"]`);

  // 没有，则创建
  if (!script) {
    const newScript = document.createElement("script");
    newScript.src = path;

    // 设置属性
    Object.keys(props).forEach((key) => {
      newScript[key] = props[key];
    });

    // 更新状态
    newScript.setAttribute("data-status", "loading");
    // 在 body 中插入
    document.body.appendChild(newScript);

    return {
      ref: newScript,
      status: "loading",
    };
  }

  // 有则直接返回，并取 data-status 中的值
  return {
    ref: script,
    status: (script.getAttribute("data-status") as Status) || "ready",
  };
};

const loadCss = (path: string, props = {}): loadResult => {
  // 判断是否已经有该 CSS 资源
  const css = document.querySelector(`link[href="${path}"]`);

  // 没有，则创建
  if (!css) {
    const newCss = document.createElement("link");

    newCss.rel = "stylesheet";
    newCss.href = path;

    // 设置属性
    Object.keys(props).forEach((key) => {
      newCss[key] = props[key];
    });

    /**
     * 在旧版本的 IE 浏览器中，hideFocus 属性用于控制元素在获得焦点时是否显示虚拟框
     * relList 是一个新的属性，允许开发者访问和操作元素的 rel 属性列表
     * 如果条件满足，将 newCss 元素的 rel 属性设置为 preload(预加载)
     * 将 newCss 元素的 as 属性设置为 'style'，告诉浏览器这是一个样式表资源
     * */
    // IE9+
    const isLegacyIECss = "hideFocus" in newCss;
    // use preload in IE Edge (to detect load errors)
    if (isLegacyIECss && newCss.relList) {
      newCss.rel = "preload";
      newCss.as = "style";
    }

    // 更新状态
    newCss.setAttribute("data-status", "loading");
    // 在 head 标签中插入
    document.head.appendChild(newCss);

    return {
      ref: newCss,
      status: "loading",
    };
  }

  // 有则直接返回，并取 data-status 中的值
  return {
    ref: css,
    status: (css.getAttribute("data-status") as Status) || "ready",
  };
};

const useExternal = (path?: string, options?: Options) => {
  const [status, setStatus] = useState<Status>(path ? "loading" : "unset");

  // DOM
  const ref = useRef<Element>();

  useEffect(() => {
    if (!path) {
      setStatus("unset");
      return;
    }

    // 处理路径
    const pathname = path.replace(/[|#].*$/, "");

    // 判断是 CSS 类型
    if (
      options?.type === "css" ||
      (!options?.type && /(^css!|\.css$)/.test(pathname))
    ) {
      const result = loadCss(path, options?.css);
      ref.current = result.ref;
      setStatus(result.status);
      // 判断是 JS 类型
    } else if (
      options?.type === "js" ||
      (!options?.type && /(^js!|\.js$)/.test(pathname))
    ) {
      const result = loadingScript(path, options?.js);
      ref.current = result.ref;
      setStatus(result.status);
    } else {
      console.error(
        "Cannot infer the type of external resource, and please provide a type ('js' | 'css'). " +
          "Refer to the https://ahooks.js.org/hooks/dom/use-external/#options"
      );
    }

    if (!ref.current) {
      return;
    }

    // 记录资源引用数量
    if (EXTERNAL_USED_COUNT[path] === undefined) {
      EXTERNAL_USED_COUNT[path] = 1;
    } else {
      EXTERNAL_USED_COUNT[path] += 1;
    }

    // // 判断和设置加载状态
    const handler = (event: Event) => {
      const targetStatus = event.type === "load" ? "ready" : "error";
      ref.current?.setAttribute("data-status", targetStatus);
      setStatus(targetStatus);
    };

    // 注册事件监听器
    // 加载完成
    ref.current.addEventListener("load", handler);
    // 加载失败
    ref.current.addEventListener("error", handler);
    return () => {
      // 清除事件监听器
      ref.current?.removeEventListener("load", handler);
      ref.current?.removeEventListener("error", handler);

      EXTERNAL_USED_COUNT[path] -= 1;

      // 在不持有资源的引用后，从 DOM 中移除
      if (EXTERNAL_USED_COUNT[path] === 0 && !options?.keepWhenUnused) {
        ref.current?.remove();
      }

      ref.current = undefined;
    };
  }, [path]);

  return status;
};

export default useExternal;
```

### useTitle

<aside>
💡 用于设置页面标题。

</aside>

#### API

```tsx
useTitle(title: string, options?: Options)
```

##### Params

| 参数  | 说明     | 类型   | 默认值 |
| ----- | -------- | ------ | ------ |
| title | 页面标题 | string | -      |

##### Options

| 参数             | 说明                               | 类型    | 默认值 |
| ---------------- | ---------------------------------- | ------- | ------ |
| restoreOnUnmount | 组件卸载时，是否恢复上一个页面标题 | boolean | false  |

#### 代码演示

[基础用法 - CodeSandbox](https://codesandbox.io/s/8b7dbh)

#### 源码解析

```tsx
import { useEffect, useRef } from "react";
import useUnmount from "@/hooks/useUnmount";
import isBrowser from "../../../utils/isBrowser";

export interface Options {
  restoreOnUnmount?: boolean;
}

const DEFAULT_OPTIONS: Options = {
  restoreOnUnmount: false,
};

const useTitle = (title: string, options: Options = DEFAULT_OPTIONS) => {
  // 上一个页面标题
  const titleRef = useRef(isBrowser ? document.title : "");

  useEffect(() => {
    // 通过 document.title 设置页面标题
    document.title = title;
  }, [title]);

  useUnmount(() => {
    // 组件卸载时，恢复上一个页面标题
    if (options.restoreOnUnmount) {
      document.title = titleRef.current;
    }
  });
};

export default useTitle;
```

### useFavicon

<aside>
💡 设置页面的 favicon。

</aside>

#### API

```tsx
useFavicon(href: string)
```

##### Params

| 参数 | 说明                                            | 类型   | 默认值 |
| ---- | ----------------------------------------------- | ------ | ------ |
| href | favicon 地址, 支持  svg/png/ico/gif  后缀的图片 | string | -      |

#### 代码演示

[基础用法](https://codesandbox.io/p/sandbox/ji-chu-yong-fa-fk8yvh)

#### 源码解析

```tsx
import { useEffect } from "react";

// 存储不同图片的 MIME 类型
const ImgTypeMap = {
  SVG: "image/svg+xml",
  ICO: "image/x-icon",
  GIF: "image/gif",
  PNG: "image/png",
};

type ImgTypes = keyof typeof ImgTypeMap;

const useFavicon = (href: string) => {
  useEffect(() => {
    if (!href) return;

    // 获取图片后缀
    const cutUrl = href.split(".");
    const imgSuffix = cutUrl[cutUrl.length - 1].toLocaleUpperCase() as ImgTypes;

    // 通过 link 标签设置 favicon，获取或新建
    const link: HTMLLinkElement =
      document.querySelector("link[rel*='icon']") ||
      document.createElement("link");

    // 设置 link 标签的 type、href、rel 属性
    link.type = ImgTypeMap[imgSuffix];
    link.href = href;
    link.rel = "shortcut icon";

    // 添加到 head 标签中
    document.getElementsByTagName("head")[0].appendChild(link);
  }, [href]);
};

export default useFavicon;
```

### useFullScreen

<aside>
💡 管理 DOM 全屏的 Hook。

</aside>

#### API

```tsx
const [isFullScreen, {
	enterFullscreen,
  exitFullscreen,
  toggleFullscreen,
  isEnabled,
}] = useFullScreen(
	target,
	options?: Options
)
```

##### Params

| 参数    | 说明                  | 类型                                                 | 默认值 |
| ------- | --------------------- | ---------------------------------------------------- | ------ |
| target  | DOM 节点或者 Ref 对象 | Element \| () ⇒ Element \| MutableRefObject<Element> | -      |
| options | 设置                  | Options                                              |        |

##### Options

| 参数           | 说明                                                                 | 类型                                             | 默认值 |
| -------------- | -------------------------------------------------------------------- | ------------------------------------------------ | ------ |
| onExit         | 退出全屏触发                                                         | () ⇒ void                                        | -      |
| onEnter        | 全屏触发                                                             | () ⇒ void                                        | -      |
| pageFullscreen | 是否是页面全屏。当参数类型为对象时，可以设置全屏元素的类名和 z-index | boolean \| { className?: sting, zIndex?: number} | false  |

##### Result

| 参数             | 说明         | 类型      |
| ---------------- | ------------ | --------- |
| isFullscreen     | 是否全屏     | boolean   |
| enterFullscreen  | 设置全屏     | () ⇒ void |
| exitFullscreen   | 退出全屏     | () ⇒ void |
| toggleFullscreen | 切换全屏     | () ⇒ void |
| isEnabled        | 是否支持全屏 | boolean   |

#### 代码演示

[基础用法 - CodeSandbox](https://codesandbox.io/s/hmjx1e)

[图片全屏 - CodeSandbox](https://codesandbox.io/s/cy6lr9)

[页面全屏 - CodeSandbox](https://codesandbox.io/s/9gbtef)

[与其它全屏操作共存 - CodeSandbox](https://codesandbox.io/s/dtqj5h)

#### 源码解析

该 Hook 主要依赖  [screenfull](https://www.npmjs.com/package/screenfull)  的 npm 包，帮助开发者管理全屏模式。

属性：

- isEnabled: 只读属性，表示当前浏览器是否支持全屏功能
- isFullscreen: 只读属性，表示当前是否处于全屏状态

方法：

- request(element): 请求进入全屏模式，可以传入一个 DOM 元素作为参数，该元素将被显示在全屏模式下
- exit(): 退出全屏模式
- toggle(element): 切换全屏状态，如果当前处于全屏状态，则退出全屏；如果不是全屏状态，则进入全屏
- on(eventName, callback): 监听全屏状态变化事件，当全屏状态发生变化时触发回调函数
- off(eventName, callback): 移除全屏状态变化事件的监听

```jsx
import { useEffect, useRef, useState } from "react";
import screenfull from "screenfull";
import useLatest from "@/hooks/useLatest";
import useMemoizedFn from "@/hooks/useMemoizedFn";
import type { BasicTarget } from "../../../utils/domTarget";
import { getTargetElement } from "../../../utils/domTarget";
import { isBoolean } from "../../../utils";

export interface PageFullscreenOptions {
  className?: string;
  zIndex?: number;
}

export interface Options {
  onExit?: () => void;
  onEnter?: () => void;
  pageFullscreen?: boolean | PageFullscreenOptions;
}

const useFullscreen = (target: BasicTarget, options?: Options) => {
  const { onExit, onEnter, pageFullscreen = false } = options || {};

  // 设置 className 和 zIndex 的默认值
  const { className = "ahooks-page-fullscreen", zIndex = 999999 } =
    isBoolean(pageFullscreen) || !pageFullscreen ? {} : pageFullscreen;

  // 当前是否处于全屏状态
  const getIsFullscreen = () =>
    screenfull.isEnabled &&
    !!screenfull.element &&
    screenfull.element === getTargetElement(target);

  const onExitRef = useLatest(onExit);
  const onEnterRef = useLatest(onEnter);

  const [state, setState] = useState(getIsFullscreen);
  // 引用当前的全屏状态
  const stateRef = useRef(getIsFullscreen());

  // 根据全屏状态调用相应的回调函数
  const invokeCallback = (fullscreen: boolean) => {
    if (fullscreen) {
      onEnterRef.current?.();
    } else {
      onExitRef.current?.();
    }
  };

  // 更新全屏状态，触发相应的回调函数
  const updateFullscreenState = (fullscreen: boolean) => {
    if (stateRef.current !== fullscreen) {
      invokeCallback(fullscreen);
      setState(fullscreen);
      stateRef.current = fullscreen;
    }
  };

  // 监听全屏状态变化，更新全屏状态
  const onScreenfullChange = () => {
    const fullscreen = getIsFullscreen();
    updateFullscreenState(fullscreen);
  };

  // 切换页面全屏状态
  const togglePageFullscreen = (fullscreen: boolean) => {
    const el = getTargetElement(target);
    if (!el) {
      return;
    }

    let styleElem = document.getElementById(className);

    // 全屏
    if (fullscreen) {
      el.classList.add(className);

      // 全屏样式
      if (!styleElem) {
        styleElem = document.createElement("style");
        styleElem.setAttribute("id", className);
        styleElem.textContent = `
          .${className} {
            position: fixed; left: 0; top: 0; right: 0; bottom: 0;
            width: 100% !important; height: 100% !important;
            z-index: ${zIndex};
          }
        `;
        el.appendChild(styleElem);
      }
    } else {
      // 退出全屏
      el.classList.remove(className);

      if (styleElem) {
        styleElem.remove();
      }
    }

    // 更新全屏状态
    updateFullscreenState(fullscreen);
  };

  // 进入全屏状态
  const enterFullscreen = () => {
    const el = getTargetElement(target);

    if (!el) {
      return;
    }

    // 页面全屏
    if (pageFullscreen) {
      togglePageFullscreen(true);
      return;
    }
    // 元素全屏
    if (screenfull.isEnabled) {
      try {
        screenfull.request(el);
      } catch (error) {
        console.error(error);
      }
    }
  };

  // 退出全屏状态
  const exitFullscreen = () => {
    const el = getTargetElement(target);

    if (!el) {
      return;
    }

    // 页面退出全屏
    if (pageFullscreen) {
      togglePageFullscreen(false);
      return;
    }
    // 元素退出全屏
    if (screenfull.isEnabled && screenfull.element === el) {
      screenfull.exit();
    }
  };

  // 切换全屏状态
  const toggleFullscreen = () => {
    if (state) {
      exitFullscreen();
    } else {
      enterFullscreen();
    }
  };

  useEffect(() => {
    // 当前环境是否支持全屏或页面已经处于全屏
    if (!screenfull.isEnabled || pageFullscreen) {
      return;
    }

    // 监听全屏状态变化
    screenfull.on("change", onScreenfullChange);

    return () => {
      // 取消对全屏状态变化的监听
      screenfull.off("change", onScreenfullChange);
    };
  }, []);

  return [
    state,
    {
      enterFullscreen: useMemoizedFn(enterFullscreen),
      exitFullscreen: useMemoizedFn(exitFullscreen),
      toggleFullscreen: useMemoizedFn(toggleFullscreen),
      isEnabled: screenfull.isEnabled,
    },
  ] as const;
};

export default useFullscreen;
```

### useHover

<aside>
💡 监听 DOM 元素是否有鼠标悬停。

</aside>

#### API

```tsx
const isHovering = useHover(target, {
  onEnter,
  onLeave,
  onChange,
});
```

##### Params

| 参数    | 说明                  | 类型                                                   | 默认值 |
| ------- | --------------------- | ------------------------------------------------------ | ------ |
| target  | DOM 节点或者 Ref 对象 | () ⇒ Element \| Element \| MutableRefObject\<Element\> | -      |
| options | 额外的配置项          | Options                                                |        |

##### Options

| 参数     | 说明                 | 类型                         | 默认值 |
| -------- | -------------------- | ---------------------------- | ------ |
| onEnter  | hover 时触发         | () ⇒ void                    | -      |
| onLeave  | 取消 hover 时触发    | () ⇒ void                    | -      |
| onChange | hover 状态变化时触发 | (isHovering: boolean) ⇒ void | -      |

##### Result

| 参数       | 说明                   | 类型    |
| ---------- | ---------------------- | ------- |
| isHovering | 鼠标元素是否处于 hover | boolean |

#### 代码演示

[基础用法 - CodeSandbox](https://codesandbox.io/s/ivzvsz)

[传入 DOM 元素 - CodeSandbox](https://codesandbox.io/s/tsn2du)

#### 源码解析

```tsx
import useBoolean from "@/hooks/useBoolean";
import useEventListener from "@/hooks/useEventListener";
import type { BasicTarget } from "../../../utils/domTarget";

export interface Options {
  onEnter?: () => void;
  onLeave?: () => void;
  onChange?: (isHovering: boolean) => void;
}

const useHover = (target: BasicTarget, options?: Options): boolean => {
  const { onEnter, onLeave, onChange } = options || {};

  const [state, { setTrue, setFalse }] = useBoolean(false);

  // 监听 mouseenter 事件
  useEventListener(
    "mouseenter",
    () => {
      onEnter?.();
      setTrue();
      onChange?.(true);
    },
    {
      target,
    }
  );

  // 监听 mouseleave 事件
  useEventListener(
    "mouseleave",
    () => {
      onLeave?.();
      setFalse();
      onChange?.(false);
    },
    {
      target,
    }
  );

  return state;
};

export default useHover;
```

### useMutationObserver

<aside>
💡 一个监听指定的 DOM 树发生变化的 Hook，参考 [MutationObserver](https://developer.mozilla.org/zh-CN/docs/Web/API/MutationObserver)。

</aside>

#### API

```tsx
useMutationObserver(
	callback: MutationCallback,
	target: Target,
	options?: MutationObserverInit,
)
```

##### Params

| 参数     | 说明                  | 类型                                                             | 默认值 |
| -------- | --------------------- | ---------------------------------------------------------------- | ------ |
| callback | 触发的回调函数        | (mutations: MutationRecord[], observer: MutationObserver) ⇒ void | -      |
| target   | DOM 节点或者 Ref 对象 | () ⇒ Element \| Element \| MutableRefObject\<Element\>           | -      |
| options  | 设置项                | MutationObserverInit                                             | {}     |

##### Options

配置项参考：

[MutationObserver: observe() method - Web APIs | MDN](https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver/observe#parameters)

#### 代码演示

[基础用法 - CodeSandbox](https://codesandbox.io/s/4zfvzp)

#### 源码解析

```tsx
import type { DependencyList } from "react";
import { isEqual } from "lodash-es";

export const depsEqual = (
  aDeps: DependencyList = [],
  bDeps: DependencyList = []
) => isEqual(aDeps, bDeps);
```

```tsx
import { DependencyList, EffectCallback, useRef } from "react";
import { BasicTarget } from "./domTarget";
import { depsEqual } from "./depsEqual";
import useEffectWithTarget from "./useEffectWithTarget";

/**
 * 深度比较（对象值只比较属性）
 * */
const useDeepCompareEffectWithTarget = (
  effect: EffectCallback,
  deps: DependencyList,
  target: BasicTarget<any> | BasicTarget<any>[]
) => {
  const ref = useRef<DependencyList>();
  const signalRef = useRef<number>(0);

  if (!depsEqual(deps, ref.current)) {
    ref.current = deps;
    signalRef.current += 1;
  }

  useEffectWithTarget(effect, [signalRef.current], target);
};

export default useDeepCompareEffectWithTarget;
```

```tsx
import { getTargetElement } from "../../../utils/domTarget";
import type { BasicTarget } from "../../../utils/domTarget";
import useLatest from "@/hooks/useLatest";
import useDeepCompareEffectWithTarget from "../../../utils/useDeepCompareWithTarget";

const useMutationObserver = (
  callback: MutationCallback,
  target: BasicTarget,
  options: MutationObserverInit = {}
): void => {
  const callbackRef = useLatest(callback);

  useDeepCompareEffectWithTarget(
    () => {
      // 需要观察变动的节点
      const element = getTargetElement(target);
      if (!element) {
        return;
      }

      // 创建一个观察器实例并传入回调函数
      const observer = new MutationObserver(callbackRef.current);

      // 根据配置开始观察目标节点
      observer.observe(element, options);

      // 停止观察
      return () => {
        observer.disconnect();
      };
    },
    [options],
    target
  );
};

export default useMutationObserver;
```

### useInViewport

<aside>
💡 观察元素是否在可见区域，以及元素可见比例，更多信息参考 [Intersection Observer API](https://developer.mozilla.org/zh-CN/docs/Web/API/Intersection_Observer_API)。

</aside>

#### API

```tsx
type Target = Element | (() => Element) | React.MutableRefObject<Element>;

const [inViewport, ratio] = useInViewport(
  target: Target | Target[],
  options?: Options
);
```

##### Params

| 参数    | 说明                       | 类型                 | 默认值 |
| ------- | -------------------------- | -------------------- | ------ |
| target  | DOM 节点或者 Ref，支持数组 | Target \| Target[]   | -      |
| options | 设置                       | Options \| undefined | -      |

##### Options

更多信息参考  [Intersection Observer API](https://developer.mozilla.org/zh-CN/docs/Web/API/Intersection_Observer_API)。

| 参数       | 说明                                                                                                        | 类型                                                                                | 默认值 |
| ---------- | ----------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ------ |
| threshold  | 可以是单一的 numebr 也可以是 number 数组，target 元素和 root 元素相交程度达到该值的时候 ratio 会被更新      | number \| number[]                                                                  | -      |
| rootMargin | 根(root)元素的外边距                                                                                        | string                                                                              | -      |
| root       | 指定根(root)元素，用于检查目标的可见性。必须是目标元素的父级元素，如果未指定或者为 null，则默认为浏览器视窗 | Element \| Document \| () ⇒ (Element/Document) \| React.MutableRefObject\<Element\> | -      |
| callback   | IntersectionObserver  的回调被调用时触发                                                                    | (entry: IntersectionObserverEntry) => void                                          |        |

##### Result

| 参数       | 说明                                                      | 类型                 |
| ---------- | --------------------------------------------------------- | -------------------- |
| inViewport | 是否可见                                                  | boolean \| undefined |
| ratio      | 当前可见比例，在每次到达 options.threshold 设置节点时更新 | number \| undefined  |

#### 代码演示

[基础用法 - CodeSandbox](https://codesandbox.io/s/q3sgf2)

[监听元素可见区域比例 - CodeSandbox](https://codesandbox.io/s/9gh8lv)

[监听内容滚动选中菜单 - CodeSandbox](https://codesandbox.io/s/lmhgrw)

#### 源码解析

```tsx
/**
 * intersection-observer polyfill 处理
 * */
import "intersection-observer";
import { useState } from "react";
import type { BasicTarget } from "../../../utils/domTarget";
import { getTargetElement } from "../../../utils/domTarget";
import useEffectWithTarget from "../../../utils/useEffectWithTarget";

type CallbackType = (entry: IntersectionObserverEntry) => void;

export interface Options {
  rootMargin?: string;
  threshold?: number | number[];
  root?: BasicTarget<Element>;
  callback?: CallbackType;
}

const useInViewport = (
  target: BasicTarget | BasicTarget[],
  options?: Options
) => {
  const { callback, ...option } = options || {};

  const [state, setState] = useState<boolean>();
  const [ratio, setRatio] = useState<number>();

  useEffectWithTarget(
    () => {
      const targets = Array.isArray(target) ? target : [target];
      const els = targets
        .map((element) => getTargetElement(element))
        .filter(Boolean);

      if (!els.length) {
        return;
      }

      /**
       * 创建交叉观察器
       * */
      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            /**
             * 返回比例值
             * */
            setRatio(entry.intersectionRatio);
            /**
             * 查看条目是否代表当前与根相交的元素
             * */
            setState(entry.isIntersecting);
            /**
             * 执行回调
             * */
            callback?.(entry);
          }
        },
        {
          ...option,
          root: getTargetElement(options?.root),
        }
      );

      /**
       * 监控多个元素
       * */
      els.forEach((el) => observer.observe(el!));

      return () => {
        observer.disconnect();
      };
    },
    [options?.rootMargin, options?.threshold, callback],
    target
  );
  return [state, ratio] as const;
};

export default useInViewport;
```

### useKeyPress

<aside>
💡 监听键盘按键，支持组合键，支持按键别名。

</aside>

#### API

```tsx
type KeyType = number | string;
type KeyFilter = KeyType | KeyType[] | ((event: KeyboardEvent) => boolean);

useKeyPress(
	keyFilter: KeyFilter,
	eventHandler: EventHandler,
	options?: Options,
);
```

##### Params

| 参数         | 说明                                         | 类型                                                        | 默认值 |
| ------------ | -------------------------------------------- | ----------------------------------------------------------- | ------ |
| keyFilter    | 支持 keyCode、别名、组合键、数组、自定义函数 | KeyType \| KeyType[] \| ((event: KeyboardEvent) => boolean) | -      |
| eventHandler | 回调函数                                     | (event: KeyboardEvent) => void                              | -      |
| options      | 可选配置项                                   | Options                                                     | -      |

##### Options

| 参数       | 说明                                                                                     | 类型                                                         | 默认值      |
| ---------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------ | ----------- |
| events     | 触发事件                                                                                 | (’keydown’ \| ‘keyup’)[]                                     | [’keydown’] |
| target     | DOM 节点或者 ref                                                                         | Element \| () ⇒ Element \| React.MutableRefObject\<Element\> | -           |
| exactMatch | 精确匹配。如果开启，则只有在按键完全匹配的情况下触发事件。比如按键[shift + c]不会触发[c] | boolean                                                      | false       |
| useCapture | 是否阻止事件冒泡                                                                         | boolean                                                      | false       |

#### Remarks

1、按键别名

2、修饰符

```tsx
ctrl;
alt;
shift;
meta;
```

#### 代码演示

[基础用法 - CodeSandbox](https://codesandbox.io/s/2d9lpo)

[精确匹配](https://codesandbox.io/p/sandbox/jing-que-pi-pei-01yecn)

[进阶使用 - CodeSandbox](https://codesandbox.io/s/s40k1f)

[进阶使用](https://codesandbox.io/p/sandbox/jin-jie-shi-yong-s40k1f)

[自定义 DOM](https://codesandbox.io/p/sandbox/zi-ding-yi-dom-rtwjgm)

[vigorous-field-57tbmt](https://codesandbox.io/p/sandbox/vigorous-field-57tbmt)

#### 源码解析

```tsx
import useLatest from "@/hooks/useLatest";
import { isFunction, isNumber, isString } from "../../../utils";
import type { BasicTarget } from "../../../utils/domTarget";
import { getTargetElement } from "../../../utils/domTarget";
import useDeepCompareEffectWithTarget from "../../../utils/useDeepCompareWithTarget";
import isAppleDevice from "../../../utils/isAppleDevice";

/**
 * KeyboardEvent 键盘操作时生成的事件对象
 * altKey: 表示是否按下了 Alt 键
 * ctrlKey: 表示是否按下了 Ctrl 键
 * shiftKey: 表示是否按下了Shift键
 * metaKey: 表示是否按下了 Meta 键（在 Windows 系统上通常对应 Windows 键，在 Mac 系统上对应 Command 键）
 * key: 表示按下的实际按键值，例如 "A"、"Enter"、"ArrowUp" 等
 * code: 表示按下的按键的标准名称，例如 "KeyA"、"Enter"、"ArrowUp" 等
 * keyCode: 表示按下的按键的键码值
 * charCode: 表示按下的按键的字符编码值
 * location: 表示按下的按键的位置，例如左侧的 Ctrl 键、右侧的 Ctrl 键等
 * repeat: 表示按键是否为重复按下
 * type: 表示当前的事件类型，'keyup' 释放按键，'keydown' 按下按键
 * */
export type KeyType = number | string;
export type KeyPredicate = (
  event: KeyboardEvent
) => KeyType | boolean | undefined;
export type KeyFilter =
  | KeyType
  | KeyType[]
  | ((event: KeyboardEvent) => boolean);
export type KeyEvent = "keydown" | "keyup";
export type Target = BasicTarget<HTMLElement | Document | Window>;
export type Options = {
  target?: Target;
  events?: KeyEvent[];
  exactMatch?: boolean;
  useCapture?: boolean;
};

// 键盘事件 keyCode 别名
const aliasKeyCodeMap = {
  "0": 48,
  "1": 49,
  "2": 50,
  "3": 51,
  "4": 52,
  "5": 53,
  "6": 54,
  "7": 55,
  "8": 56,
  "9": 57,
  backspace: 8,
  tab: 9,
  enter: 13,
  shift: 16,
  ctrl: 17,
  alt: 18,
  pausebreak: 19,
  capslock: 20,
  esc: 27,
  space: 32,
  pageup: 33,
  pagedown: 34,
  end: 35,
  home: 36,
  leftarrow: 37,
  uparrow: 38,
  rightarrow: 39,
  downarrow: 40,
  insert: 45,
  delete: 46,
  a: 65,
  b: 66,
  c: 67,
  d: 68,
  e: 69,
  f: 70,
  g: 71,
  h: 72,
  i: 73,
  j: 74,
  k: 75,
  l: 76,
  m: 77,
  n: 78,
  o: 79,
  p: 80,
  q: 81,
  r: 82,
  s: 83,
  t: 84,
  u: 85,
  v: 86,
  w: 87,
  x: 88,
  y: 89,
  z: 90,
  leftwindowkey: 91,
  rightwindowkey: 92,
  meta: isAppleDevice ? [91, 93] : [91, 92],
  selectkey: 93,
  numpad0: 96,
  numpad1: 97,
  numpad2: 98,
  numpad3: 99,
  numpad4: 100,
  numpad5: 101,
  numpad6: 102,
  numpad7: 103,
  numpad8: 104,
  numpad9: 105,
  multiply: 106,
  add: 107,
  subtract: 109,
  decimalpoint: 110,
  divide: 111,
  f1: 112,
  f2: 113,
  f3: 114,
  f4: 115,
  f5: 116,
  f6: 117,
  f7: 118,
  f8: 119,
  f9: 120,
  f10: 121,
  f11: 122,
  f12: 123,
  numlock: 144,
  scrolllock: 145,
  semicolon: 186,
  equalsign: 187,
  comma: 188,
  dash: 189,
  period: 190,
  forwardslash: 191,
  graveaccent: 192,
  openbracket: 219,
  backslash: 220,
  closebracket: 221,
  singlequote: 222,
};

// 修饰键
const modifierKey = {
  // 是否按下 ctrl 键
  ctrl: (event: KeyboardEvent) => event.ctrlKey,
  // 是否按下 shift 键
  shift: (event: KeyboardEvent) => event.shiftKey,
  // 是否按下 alt 键
  alt: (event: KeyboardEvent) => event.altKey,
  meta: (event: KeyboardEvent) => {
    // meta 键被松开
    if (event.type === "keyup") {
      return aliasKeyCodeMap.meta.includes(event.keyCode);
    }
    // 是否按下 metaKey 键
    return event.metaKey;
  },
};

// 判断合法的按键类型
function isValidKeyType(value: unknown): value is string | number {
  return isString(value) || isNumber(value);
}

// 根据 event 计算修饰键被按下的数量
function countKeyByEvent(event: KeyboardEvent) {
  const countOfModifier = Object.keys(modifierKey).reduce((total, key) => {
    if (modifierKey[key](event)) {
      return total + 1;
    }
    return total;
  }, 0);
  // 16 17 18 91 92 是修饰键的 keyCode，如果 keyCode 是修饰键，那么激活数量就是修饰键的数量，如果不是，那么就需要 +1
  return [16, 17, 18, 91, 92].includes(event.keyCode)
    ? countOfModifier
    : countOfModifier + 1;
}
/**
 * 判断按键是否激活
 * @param [event: KeyboardEvent]键盘事件
 * @param [keyFilter: any] 当前键
 * @returns string | number | boolean
 */
function getFilterKey(
  event: KeyboardEvent,
  keyFilter: KeyType,
  exactMatch: boolean
) {
  // 浏览器自动补全输入时，会触发 keydown、keyup 事件，此时 event.key 可能为空
  if (!event.key) {
    return false;
  }
  // 数字类型直接匹配事件的 keyCode
  if (isNumber(keyFilter)) {
    return event.keyCode === keyFilter ? keyFilter : false;
  }
  // 字符串依次判断是否有组合键
  const genArr = keyFilter.split(".");
  let genLen = 0;
  for (const key of genArr) {
    // 是否是修饰键
    const genModifier = modifierKey[key];
    // 是否是 keyCode 别名
    const aliasKeyCode: number | number[] = aliasKeyCodeMap[key.toLowerCase()];
    if (
      (genModifier && genModifier(event)) ||
      (aliasKeyCode && aliasKeyCode === event.keyCode)
    ) {
      genLen++;
    }
  }
  /**
   * 需要判断触发的键位和监听的键位完全一致，判断方法就是触发的键位里有且等于监听的键位
   * genLen === genArr.length 能判断出来触发的键位里有监听的键位
   * countKeyByEvent(event) === genArr.length 判断出来触发的键位数量里有且等于监听的键位数量
   * 主要用来防止按组合键其子集也会触发的情况，例如监听 ctrl+a 会触发监听 ctrl 和 a 两个键的事件。
   */
  if (exactMatch) {
    return genLen === genArr.length && countKeyByEvent(event) === genArr.length
      ? keyFilter
      : false;
  }

  return genLen === genArr.length ? keyFilter : false;
}
/**
 * 键盘输入预处理方法，判断按键是否激活
 * @param [keyFilter: any] 当前键
 * @returns () => Boolean
 */
function genKeyFormatter(
  keyFilter: KeyFilter,
  exactMath: boolean
): KeyPredicate {
  // 支持自定义函数
  if (isFunction(keyFilter)) {
    return keyFilter;
  }

  // 支持 keyCode、别名、组合键
  if (isValidKeyType(keyFilter)) {
    return (event: KeyboardEvent) => getFilterKey(event, keyFilter, exactMath);
  }

  // 支持数组
  if (Array.isArray(keyFilter)) {
    return (event: KeyboardEvent) =>
      keyFilter.find((item) => getFilterKey(event, item, exactMath));
  }

  return () => Boolean(keyFilter);
}

const defaultEvents: KeyEvent[] = ["keydown"];

const useKeyPress = (
  keyFilter: KeyFilter,
  eventHandler: (event: KeyboardEvent, key: KeyType) => void,
  option?: Options
) => {
  const {
    events = defaultEvents,
    target,
    exactMatch = false,
    useCapture = false,
  } = option || {};

  const eventHandlerRef = useLatest(eventHandler);
  const keyFilterRef = useLatest(keyFilter);

  useDeepCompareEffectWithTarget(
    () => {
      const el = getTargetElement(target, window);
      if (!el) {
        return;
      }

      const callbackHandler = (event: KeyboardEvent) => {
        const genGuard = genKeyFormatter(keyFilterRef.current, exactMatch);
        const keyGuard = genGuard(event);
        const firedKey = isValidKeyType(keyGuard) ? keyGuard : event.key;

        // 判断是否触发配置 keyFilter 场景
        if (keyGuard) {
          return eventHandlerRef.current?.(event, firedKey);
        }
      };

      // 监听传入事件
      for (const eventName of events) {
        el?.addEventListener?.(eventName, callbackHandler, useCapture);
      }

      // 取消监听
      return () => {
        for (const eventName of events) {
          el?.removeEventListener?.(eventName, callbackHandler, useCapture);
        }
      };
    },
    [events],
    target
  );
};

export default useKeyPress;
```

### useLongPress

<aside>
💡 监听目标元素的长按事件。

</aside>

#### API

```tsx
useLongPress(
	onLongPress: (event: MouseEvent | TouchEvent) => void,
	target: Target,
	options?: {
		delay?: number;
		moveThreshold?: {x?: number, y?: number};
		onClick?: (event: MouseEvent | TouchEvent) => void;
		onLongPressEnd?: (event: MouseEvent | TouchEvent) => void;
	}
);
```

##### Params

| 参数        | 说明             | 类型                                                         | 默认值 |
| ----------- | ---------------- | ------------------------------------------------------------ | ------ |
| onLongPress | 触发函数         | (event: MouseEvent \| TouchEvent) => void                    | -      |
| target      | DOM 节点或者 ref | Element \| () ⇒ Element \| React.MutableRefObject\<Element\> | -      |
| options     | 可选配置项       | Options                                                      | -      |

##### Options

| 参数           | 说明                                 | 类型                                      | 默认值 |
| -------------- | ------------------------------------ | ----------------------------------------- | ------ |
| delay          | 长按时间                             | number                                    | 300    |
| moveThreshold  | 按下后移动阈值，超出则不触发长按事件 | {x?: number, y?: number}                  | -      |
| onClick        | 点击事件                             | (event: MouseEvent \| TouchEvent) => void | -      |
| onLongPressEnd | 长按结束事件                         | (event: MouseEvent \| TouchEvent) => void | -      |

#### Remarks

禁用在手机上长按选择文本的能力请参考：[https://stackoverflow.com/a/11237968](https://stackoverflow.com/a/11237968)

#### 代码演示

[基础用法 - CodeSandbox](https://codesandbox.io/s/pgrwd9)

[empty-grass-ndmzw2](https://codesandbox.io/p/sandbox/empty-grass-ndmzw2)

[超出移动阈值 - CodeSandbox](https://codesandbox.io/s/z34nsd)

#### 源码解析

```tsx
import { BasicTarget, getTargetElement } from "../../../utils/domTarget";
import useLatest from "@/hooks/useLatest";
import { useRef } from "react";
import useEffectWithTarget from "../../../utils/useEffectWithTarget";
import isBrowser from "../../../utils/isBrowser";

type EventType = MouseEvent | TouchEvent;
export interface Options {
  delay?: number;
  moveThreshold?: { x?: number; y?: number };
  onClick?: (event: EventType) => void;
  onLongPressEnd?: (event: EventType) => void;
}

/**
 * 判断是否支持 touch 事件
 * 如果支持，则监听 touchstart - 触摸开始、touchend - 触摸结束、touchmove - 触摸移动 事件
 * 如果不支持，则监听 mousedown - 按下鼠标、mouseup - 松开鼠标、mousemove - 鼠标移动、mouseleave - 鼠标离开元素 事件
 * */
const touchSupported =
  isBrowser &&
  // @ts-ignore
  ("ontouchstart" in window ||
    (window.DocumentTouch && document instanceof DocumentTouch));

const useLongPress = (
  onLongPress: (event: EventType) => void,
  target: BasicTarget,
  { delay = 20, moveThreshold, onClick, onLongPressEnd }: Options = {}
) => {
  const onLongPressRef = useLatest(onLongPress);
  const onClickRef = useLatest(onClick);
  const onLongPressEndRef = useLatest(onLongPressEnd);

  const timeRef = useRef<ReturnType<typeof setTimeout>>();
  const isTriggeredRef = useRef(false);
  const pervPositionRef = useRef({ x: 0, y: 0 });
  const hasMoveThreshold = !!(
    (moveThreshold?.x && moveThreshold.x > 0) ||
    (moveThreshold?.y && moveThreshold.y > 0)
  );

  useEffectWithTarget(
    () => {
      const targetElement = getTargetElement(target);
      if (!targetElement?.addEventListener) {
        return;
      }

      function getClientPosition(event: EventType) {
        if (event instanceof TouchEvent) {
          return {
            clientX: event.touches[0].clientX,
            clientY: event.touches[0].clientY,
          };
        }

        if (event instanceof MouseEvent) {
          return {
            clientX: event.clientX,
            clientY: event.clientY,
          };
        }

        console.warn("Unsupported event type");

        return { clientX: 0, clientY: 0 };
      }

      const overThreshold = (event: EventType) => {
        const { clientX, clientY } = getClientPosition(event);
        const offsetX = Math.abs(clientX - pervPositionRef.current.x);
        const offsetY = Math.abs(clientY - pervPositionRef.current.y);

        return !!(
          (moveThreshold?.x && offsetX > moveThreshold.x) ||
          (moveThreshold?.y && offsetY > moveThreshold.y)
        );
      };

      const onStart = (event: EventType) => {
        if (hasMoveThreshold) {
          // 按下后计算 clientX, clientY
          const { clientX, clientY } = getClientPosition(event);
          pervPositionRef.current.x = clientX;
          pervPositionRef.current.y = clientY;
        }

        // 设置定时器
        timeRef.current = setTimeout(() => {
          onLongPressRef.current(event);
          // 只有定时器执行完，isTriggeredRef.current 才会设置为 true，触发长按事件
          isTriggeredRef.current = true;
        }, delay);
      };

      const onMove = (event: EventType) => {
        // 按下后移动，如果超出移动阈值，则不触发长按事件
        if (timeRef.current && overThreshold(event)) {
          clearTimeout(timeRef.current);
          timeRef.current = undefined;
        }
      };

      const onEnd = (event: EventType, shouldTriggerClick: boolean = false) => {
        // clear 开始的定时器
        if (timeRef.current) {
          clearTimeout(timeRef.current);
        }

        // 判断是否达到长按时间（即触发过长按事件）
        if (isTriggeredRef.current) {
          onLongPressEndRef.current?.(event);
        }

        // 是否触发 onClick 事件，只有 timeRef 定时器执行过，isTriggeredRef.current 才为 true
        if (
          shouldTriggerClick &&
          !isTriggeredRef.current &&
          onClickRef.current
        ) {
          onClickRef.current(event);
        }

        isTriggeredRef.current = false;
      };

      const onEndWithClick = (event: EventType) => onEnd(event, true);

      /**
       * 不支持 touch 事件
       * */
      if (!touchSupported) {
        targetElement.addEventListener("mousedown", onStart);
        targetElement.addEventListener("mouseup", onEndWithClick);
        targetElement.addEventListener("mouseleave", onEnd);
        if (hasMoveThreshold)
          targetElement.addEventListener("mousemove", onMove);
      } else {
        targetElement.addEventListener("touchstart", onStart);
        targetElement.addEventListener("touchend", onEndWithClick);
        if (hasMoveThreshold)
          targetElement.addEventListener("touchmove", onMove);
      }

      return () => {
        // 清除定时器
        if (timeRef.current) {
          clearTimeout(timeRef.current);
          isTriggeredRef.current = false;
        }
        // 清除监听
        if (!touchSupported) {
          targetElement.removeEventListener("mousedown", onStart);
          targetElement.removeEventListener("mouseup", onEndWithClick);
          targetElement.removeEventListener("mouseleave", onEnd);
          if (hasMoveThreshold)
            targetElement.removeEventListener("mousemove", onMove);
        } else {
          targetElement.removeEventListener("touchstart", onStart);
          targetElement.removeEventListener("touchend", onEndWithClick);
          if (hasMoveThreshold)
            targetElement.removeEventListener("touchmove", onMove);
        }
      };
    },
    [],
    target
  );
};

export default useLongPress;
```

### useMouse

<aside>
💡 监听鼠标位置。

</aside>

#### API

```tsx
const state: {
	screenX: number,
	screenY: number,
	clientX: number,
	clientY: number,
	pageX: number,
	pageY: number,
	elementX: number,
	elementY: number,
	elementH: number,
	elementW: number,
	elementPosX: number,
	elementPosY: number,
} = useMouse(target?: Target);
```

##### Params

| 参数   | 说明             | 类型                                                         |
| ------ | ---------------- | ------------------------------------------------------------ |
| target | DOM 节点或者 ref | Element \| () ⇒ Element \| React.MutableRefObject\<Element\> |

##### Result

| 参数        | 说明                           | 类型   |
| ----------- | ------------------------------ | ------ |
| screenX     | 距离显示器左侧的距离           | number |
| screenY     | 距离显示器顶部的距离           | number |
| clientX     | 距离当前视窗左侧的距离         | number |
| clientY     | 距离当前视窗顶部的距离         | number |
| pageX       | 距离完整页面左侧的距离         | number |
| pageY       | 距离完整页面顶部的距离         | number |
| elementX    | 距离指定元素左侧的距离         | number |
| elementY    | 距离指定元素顶部的距离         | number |
| elementH    | 指定元素的高                   | number |
| elementW    | 指定元素的宽                   | number |
| elementPosX | 指定元素距离完整页面左侧的距离 | number |
| elementPosY | 指定元素距离完整页面顶部的距离 | number |

#### 代码演示

[基础用法 - CodeSandbox](https://codesandbox.io/s/mr5lm5)

[获取鼠标相对于元素的位置](https://codesandbox.io/p/sandbox/huo-qu-shu-biao-xiang-dui-yu-yuan-su-de-wei-zhi-wfvfnt)

#### 源码解析

```tsx
import useRafState from "@/hooks/useRafState";
import useEventListener from "@/hooks/useEventListener";
import type { BasicTarget } from "../../../utils/domTarget";
import { getTargetElement } from "../../../utils/domTarget";

/**
 * screenX: 距离显示器左侧的距离（屏幕）
 * screenY: 距离显示器顶部的距离（屏幕）
 * clientX: 距离当前视窗左侧的距离（视窗）
 * clientY: 距离当前视窗顶部的距离（视窗）
 * pageX: 距离完整页面左侧的距离（clientX + 文档在水平方向上已经滚动的像素数）
 * pageY: 距离完整页面顶部的距离（clientY + 文档在垂直方向上已经滚动的像素数）
 * elementX: 距离指定元素左侧的距离
 * elementY: 距离指定元素顶部的距离
 * elementH: 指定元素的高
 * elementW: 指定元素的宽
 * elementPosX: 指定元素距离完整页面左侧的距离（：left + window.pageXOffset)
 * elementPosY: 指定元素距离完整页面顶部的距离（：top + window.pageYOffset)
 * window.pageXOffset: 表示文档在水平方向上已经滚动的像素数
 * window.pageYOffset: 表示文档在垂直方向上已经滚动的像素数
 * */

export interface CursorState {
  screenX: number;
  screenY: number;
  clientX: number;
  clientY: number;
  pageX: number;
  pageY: number;
  elementX: number;
  elementY: number;
  elementH: number;
  elementW: number;
  elementPosX: number;
  elementPosY: number;
}

const initState: CursorState = {
  screenX: NaN,
  screenY: NaN,
  clientX: NaN,
  clientY: NaN,
  pageX: NaN,
  pageY: NaN,
  elementX: NaN,
  elementY: NaN,
  elementH: NaN,
  elementW: NaN,
  elementPosX: NaN,
  elementPosY: NaN,
};

const useMouse = (target?: BasicTarget) => {
  const [state, setState] = useRafState(initState);

  // 监听 mousemove
  useEventListener(
    "mousemove",
    (event: MouseEvent) => {
      const { screenX, screenY, clientX, clientY, pageX, pageY } = event;
      const newState = {
        screenX,
        screenY,
        clientX,
        clientY,
        pageX,
        pageY,
        elementX: NaN,
        elementY: NaN,
        elementH: NaN,
        elementW: NaN,
        elementPosX: NaN,
        elementPosY: NaN,
      };

      const targetElement = getTargetElement(target);
      if (targetElement) {
        // 获取目标元素的位置信息
        const { left, top, width, height } =
          targetElement.getBoundingClientRect();
        // 计算鼠标相对于目标元素的位置信息
        newState.elementPosX = left + window.pageXOffset;
        newState.elementPosY = top + window.pageYOffset;
        newState.elementX = pageX - newState.elementPosX;
        newState.elementY = pageY - newState.elementPosY;
        newState.elementH = height;
        newState.elementW = width;
      }
      setState(newState);
    },
    {
      target: () => document,
    }
  );

  return state;
};

export default useMouse;
```

### useResponsive

<aside>
💡 获取响应式信息。

</aside>

#### API

```tsx
interface ResponsiveConfig {
  [key: string]: number;
}

interface ResponsiveInfo {
  [key: string]: boolean;
}

function configResponsive(config: ResponsiveConfig): void;
function useResponsive(): ResponsiveInfo;
```

#### 配置

默认的响应式配置和 bootstrap 是一致的：

```tsx
{
	'xs': 0,
	'sm': 576,
	'md': 768,
	'lg': 992,
	'xl': 1200,
}
```

如果你想配置自己的响应式断点，可以使用 configResponsive：

注意：只需配置一次，请勿在组件中重复调用该方法。

```tsx
configResponsive({
  small: 0,
  middle: 800,
  large: 1200,
});
```

#### 代码演示

[在组件中获取响应式信息 - CodeSandbox](https://codesandbox.io/s/hwbocb)

#### 源码解析

```tsx
import isBrowser from "../../../utils/isBrowser";
import { useEffect, useState } from "react";

type Subscriber = () => void;

// 全局订阅器
const subscribers = new Set<Subscriber>();

type ResponsiveConfig = Record<string, number>;
type ResponsiveInfo = Record<string, boolean>;

// 全局响应式信息对象
let info: ResponsiveInfo;

// 默认响应式断点配置
let responsiveConfig: ResponsiveConfig = {
  xs: 0,
  sm: 576,
  md: 768,
  lg: 992,
  xl: 1200,
};

// resize 事件回调函数
function handleResize() {
  const oldInfo = info;
  // 计算新的响应式信息对象
  calculate();
  // 没有更新，直接返回
  if (oldInfo === info) return;
  // 遍历订阅者集合，执行回调
  for (const subscriber of subscribers) {
    subscriber();
  }
}

// 用来避免每个组件都监听 resize 事件，全局只需要拥有一个监听事件即可
let listening = false;

// 根据当前视窗可见宽度和响应式断点配置，计算新的响应式信息对象
function calculate() {
  const width = window.innerWidth;
  const newInfo = {} as ResponsiveInfo;
  let shouldUpdate = false;
  for (const key of Object.keys(responsiveConfig)) {
    // 如果视窗可视宽度大于响应式断点配置值，则置为 true
    newInfo[key] = width >= responsiveConfig[key];
    if (newInfo[key] !== info[key]) {
      shouldUpdate = true;
    }
  }
  // 如果有更新，则更新 info 的值
  if (shouldUpdate) {
    info = newInfo;
  }
}

// 自定义响应式断点配置函数
export const configResponsive = (config: ResponsiveConfig) => {
  responsiveConfig = config;
  if (info) calculate();
};

export const useResponsive = () => {
  if (isBrowser && !listening) {
    info = {};
    calculate();
    // 监听 resize 事件
    window.addEventListener("resize", handleResize);
    listening = true;
  }

  const [state, setState] = useState<ResponsiveInfo>(info);

  useEffect(() => {
    if (!isBrowser) return;

    // In React 18's StrictMode, useEffect perform twice, resize listener is remove, so handleResize is never perform.
    // https://github.com/alibaba/hooks/issues/1910
    if (!listening) {
      window.addEventListener("resize", handleResize);
    }

    const subscriber = () => {
      setState(info);
    };

    // 添加订阅
    subscribers.add(subscriber);

    return () => {
      // 取消订阅
      subscribers.delete(subscriber);
      // 当全局订阅器为空，则清除 resize 事件监听器
      if (subscribers.size === 0) {
        window.removeEventListener("resize", handleResize);
        // listening 置为 false
        listening = false;
      }
    };
  }, []);

  return state;
};
```

### useScroll

<aside>
💡 监听元素的滚动位置。

</aside>

#### API

```tsx
const position = useScroll(target, shouldUpdate);
```

##### Params

| 参数         | 说明                 | 类型                                                                     | 默认值    |
| ------------ | -------------------- | ------------------------------------------------------------------------ | --------- |
| target       | DOM 节点或者 ref     | Element \| Document \| () ⇒ Element \| React.MutableRefObject\<Element\> | document  |
| shouldUpdate | 控制是否更新滚动信息 | ({ top: number, left: number }) ⇒ boolean                                | () ⇒ true |

##### Result

| 参数     | 说明                   | 类型                          |
| -------- | ---------------------- | ----------------------------- | --------- |
| position | 滚动容器当前的滚动位置 | { left: number, top: number } | undefined |

#### 代码演示

[基础用法 - CodeSandbox](https://codesandbox.io/s/uverib)

[监测整页的滚动 - CodeSandbox](https://codesandbox.io/s/kv64bg)

[自定义更新 - CodeSandbox](https://codesandbox.io/s/7pxphg)

#### 源码解析

```tsx
import useRafState from "@/hooks/useRafState";
import useLatest from "@/hooks/useLatest";
import type { BasicTarget } from "../../../utils/domTarget";
import { getTargetElement } from "../../../utils/domTarget";
import useEffectWithTarget from "../../../utils/useEffectWithTarget";

type Position = { left: number; top: number };

export type Target = BasicTarget<Element | Document>;
export type ScrollListenController = (val: Position) => boolean;

const useScroll = (
  target?: Target,
  shouldUpdate: ScrollListenController = () => true
): Position | undefined => {
  const [position, setPosition] = useRafState<Position>();

  const shouldUpdateRef = useLatest(shouldUpdate);

  useEffectWithTarget(
    () => {
      const el = getTargetElement(target, document);
      if (!el) {
        return;
      }

      const updatePosition = () => {
        let newPosition: Position;
        // document
        if (el === document) {
          /**
           * scrollingElement（Document 的只读属性）返回滚动文档的 Element 对象的引用
           * 标准模式下，这是文档的根元素，document.documentElement
           * */
          if (document.scrollingElement) {
            newPosition = {
              left: document.scrollingElement.scrollLeft,
              top: document.scrollingElement.scrollTop,
            };
          } else {
            /**
             * 怪异模式下，scrollingElement 属性返回 HTML body 元素（若不存在返回 null）
             * */
            // When in quirks mode, the scrollingElement attribute returns the HTML body element if it exists and is potentially scrollable, otherwise it returns null.
            // https://developer.mozilla.org/zh-CN/docs/Web/API/Document/scrollingElement
            // https://stackoverflow.com/questions/28633221/document-body-scrolltop-firefox-returns-0-only-js
            newPosition = {
              left: Math.max(
                window.pageXOffset,
                document.documentElement.scrollLeft,
                document.body.scrollLeft
              ),
              top: Math.max(
                window.pageYOffset,
                document.documentElement.scrollTop,
                document.body.scrollTop
              ),
            };
          }
        } else {
          // DOM 元素
          newPosition = {
            left: (el as Element).scrollLeft,
            top: (el as Element).scrollTop,
          };
        }
        if (shouldUpdateRef.current(newPosition)) {
          setPosition(newPosition);
        }
      };

      updatePosition();

      // 注册 scroll 事件监听器
      el.addEventListener("scroll", updatePosition);
      return () => {
        // 清除事件监听器
        el.removeEventListener("scroll", updatePosition);
      };
    },
    [],
    target
  );
  return position;
};

export default useScroll;
```

### useSize

<aside>
💡 监听 DOM 节点尺寸变化的 Hook。

</aside>

#### API

```tsx
const size = useSize(target);
```

##### Params

| 参数   | 说明             | 类型                                                         | 默认值 |
| ------ | ---------------- | ------------------------------------------------------------ | ------ |
| target | DOM 节点或者 ref | Element \| () ⇒ Element \| React.MutableRefObject\<Element\> | -      |

##### Result

| 参数 | 说明           | 类型                                           | 默认值                                                                  |
| ---- | -------------- | ---------------------------------------------- | ----------------------------------------------------------------------- |
| size | DOM 节点的尺寸 | { width: number, height: number } \| undefined | { width: target.clientWidth, height: target.clientHeight } \| undefined |

#### 代码演示

[基础用法 - CodeSandbox](https://codesandbox.io/s/xylgcm)

[传入 DOM 元素 - CodeSandbox](https://codesandbox.io/s/fmsjs3)

#### 源码解析

```tsx
import ResizeObserver from "resize-observer-polyfill";
import useRafState from "@/hooks/useRafState";
import type { BasicTarget } from "../../../utils/domTarget";
import { getTargetElement } from "../../../utils/domTarget";
import useIsomorphicLayoutEffectWithTarget from "../../../utils/useIsomorphicLayoutEffectWithTarget";

type Size = { width: number; height: number };

const useSize = (target: BasicTarget): Size | undefined => {
  const [state, setState] = useRafState(() => {
    // 目标元素
    const el = getTargetElement(target);
    return el ? { width: el.clientWidth, height: el.clientHeight } : undefined;
  });

  useIsomorphicLayoutEffectWithTarget(
    () => {
      // 目标元素
      const el = getTargetElement(target);

      if (!el) {
        return;
      }

      /**
       * 使用 ResizeObserver API 监听对应目标的尺寸变化
       * 新建一个观察者，传入一个当尺寸发生变化时的回调函数
       * entries 是 ResizeObserverEntry 的数组，包含两个属性：
       * ResizeObserverEntry.contentRect: 包含尺寸信息（x, y, width, height, top, right, left, bottom)
       * ResizeObserverEntry.target: 目标对象，即当前观察到尺寸变化的元素
       * */
      const resizeObserver = new ResizeObserver((entries) => {
        entries.forEach((entry) => {
          const { clientWidth, clientHeight } = entry.target;
          setState({ width: clientWidth, height: clientHeight });
        });
      });

      // 监听
      resizeObserver.observe(el);

      return () => {
        // 销毁
        resizeObserver.disconnect();
      };
    },
    [],
    target
  );

  return state;
};

export default useSize;
```

### useFocusWithin

<aside>
💡 监听当前焦点是否在某个区域之内，同 css 属性[:focus-within](https://developer.mozilla.org/en-US/docs/Web/CSS/:focus-within)

</aside>

#### API

```tsx
const isFocusWithin = useFocusWithin(target, {
  onFocus,
  onBlur,
  onChange,
});
```

##### Params

| 参数    | 说明             | 类型                                                         | 默认值 |
| ------- | ---------------- | ------------------------------------------------------------ | ------ |
| target  | DOM 节点或者 ref | Element \| () ⇒ Element \| React.MutableRefObject\<Element\> | -      |
| options | 额外的配置项     | Options                                                      | -      |

##### Options

| 参数     | 说明           | 类型                            | 默认值 |
| -------- | -------------- | ------------------------------- | ------ |
| onFocus  | 获取焦点时触发 | (e: FocusEvent) ⇒ void          | -      |
| onBlur   | 失去焦点时触发 | (e: FocusEvent) ⇒ void          | -      |
| onChange | 焦点变化时触发 | (isFocusWithin: boolean) ⇒ void | -      |

##### Result

| 参数          | 说明               | 类型    |
| ------------- | ------------------ | ------- |
| isFocusWithin | 焦点是否在当前区域 | boolean |

#### 代码演示

[基础用法 - CodeSandbox](https://codesandbox.io/s/d6dygw)

[传入 DOM 元素 - CodeSandbox](https://codesandbox.io/s/rop99j)

#### 源码解析

```tsx
import { useState } from "react";
import type { BasicTarget } from "../../../utils/domTarget";
import useEventListener from "@/hooks/useEventListener";

export interface Options {
  onFocus?: (e: FocusEvent) => void;
  onBlur?: (e: FocusEvent) => void;
  onChange?: (isFocusWithin: boolean) => void;
}

/**
 * focusin、focusout、focus、blur 都是与用户输入焦点相关的事件
 * focusin、focusout 在元素或其子元素获得或失去焦点时触发（冒泡到祖先元素）
 * focus、blur 只在元素自身获得或失去焦点时触发
 * */
const useFocusWithin = (target: BasicTarget, options?: Options) => {
  const [isFocusWithin, setIsFocusWithin] = useState(false);

  const { onFocus, onBlur, onChange } = options || {};

  useEventListener(
    "focusin",
    (e: FocusEvent) => {
      if (!isFocusWithin) {
        onFocus?.(e);
        onChange?.(true);
        setIsFocusWithin(true);
      }
    },
    {
      target,
    }
  );

  useEventListener(
    "focusout",
    (e: FocusEvent) => {
      /**
       * e.currentTarget 表示当前正在处理事件的元素，即绑定了 focusout 事件监听器的元素
       * e.relatedTarget 表示与事件相关的目标元素，即导致元素失去焦点的元素
       * 在 focusout 事件中，表示 e.relatedTarget 获取了焦点的新元素，如果焦点移出了文档，则为 null
       * */
      if (
        isFocusWithin &&
        !(e.currentTarget as Element)?.contains?.(e.relatedTarget as Element)
      ) {
        onBlur?.(e);
        onChange?.(false);
        setIsFocusWithin(false);
      }
    },
    {
      target,
    }
  );
  return isFocusWithin;
};

export default useFocusWithin;
```

## Advanced

### useControllableValue

<aside>
💡 在某些组件开发时，我们需要组件的状态既可以自己管理，也可以被外部控制，useControllableValue 就是帮你管理这种状态的 Hook。

</aside>

#### API

```tsx
const [state, setSate] = useControllableValue(props: Record<string, any>, options?: Options);)
```

##### Params

| 参数    | 说明         | 类型                  | 默认值 |
| ------- | ------------ | --------------------- | ------ |
| props   | 组件的 props | Record\<string, any\> | -      |
| options | 可选配置项   | Options               | -      |

##### Options

| 参数                 | 说明                                                | 类型   | 默认值       |
| -------------------- | --------------------------------------------------- | ------ | ------------ |
| defaultValue         | 默认值，会被 props.defaultValue 和 props.value 覆盖 | -      | -            |
| defaultValuePropName | 默认值的属性名                                      | string | defaultValue |
| valuePropName        | 值的属性名                                          | string | value        |
| trigger              | 修改值时，触发的函数                                | string | onChange     |

##### Result

| 参数     | 说明              | 类型                                            |
| -------- | ----------------- | ----------------------------------------------- |
| state    | 状态值            | -                                               |
| setState | 修改 state 的函数 | (value: any \| ((prevState: any) ⇒ any)) ⇒ void |

#### 代码演示

[非受控组件 - CodeSandbox](https://codesandbox.io/s/hhdgmw)

[受控组件 - CodeSandbox](https://codesandbox.io/s/kfvhkk)

[无 value，有 onChange 的组件 - CodeSandbox](https://codesandbox.io/s/yql33w)

#### 源码解析

受控组件和非受控组件的解释：

受控组件：在 HTML 中，表单元素 (如 `<input>`、`<textarea>`、`<select>` 等) 通常自己维护 state，并根据用户输入进行更新。而在 React 中，可变状态 (mutable state) 通常保存在组件的 state 属性中，并且只能通过 setSate 来更新。

对于受控组件，输入的值始终由 React 的 state 驱动，你可以将 value 传递给其它 UI 元素，或者通过其他事件处理函数重置，但这意味着你需要编写更多的代码。

使用非受控组件，表单数据将交由 DOM 节点来处理，可以使用 ref 来从 DOM 节点中获取表单数据。

```tsx
import { useMemo, useRef } from "react";
import type { SetStateAction } from "react";
import { isFunction } from "../../../utils";
import useMemoizedFn from "../useMemoizedFn";
import useUpdate from "../useUpdate";

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

### useCreation

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

### useEventEmitter

在多个组件之间进行事件通知有时会让人非常头疼，借助 EventEmitter，可以让这一过程变得更加简单。

在组件中调用 useEventEmitter 可以获得一个 EventEmitter 的实例：

```tsx
const event$ = useEventEmitter();
```

> 在组件多次渲染时，每次渲染调用 useEventEmitter 得到的返回值会保持不变，不会重复创建 EventEmitter 的实例。

通过 props 或者 Context，可以将 event$ 共享给其它组件。然后在其它组件中，可以调用 EventEmitter 的 emit 方法，推送一个事件，或是调用 useSubscription 方法，订阅事件。

```tsx
event$.emit("hello");
```

```tsx
event$.useSubscription((val) => {
  console.log(val);
});
```

> useSubscription 会在组件创建时自动注册订阅，并在组件销毁时自动取消订阅。

对于子组件通知父组件的情况，我们仍然推荐直接使用 props 传递一个 onEvent 函数。而对于父组件通知子组件的情况，可以使用 forwardRef 获取子组件的 ref，再进行子组件的方法调用。

useEventEmitter 适合的是在距离较远的组件之间进行事件通知，或是在多个组件之间共享事件通知。

#### API

```tsx
const result: Result = useEventEmitter<T>();
```

##### Result

| 参数            | 说明             | 类型                               | 默认值 |
| --------------- | ---------------- | ---------------------------------- | ------ |
| emit            | 发送一个事件通知 | (val: T) ⇒ void                    | -      |
| useSubscription | 订阅事件         | (callback: (val: T) ⇒ void) ⇒ void | -      |

#### 代码演示

[父组件向子组件共享事件 - CodeSandbox](https://codesandbox.io/s/xmnnrp)

#### 源码解析

```tsx
import { useEffect, useRef } from "react";

type Subscription<T> = (val: T) => void;

export class EventEmitter<T> {
  // 订阅器列表
  private subscriptions = new Set<Subscription<T>>();

  // 推送事件
  emit = (val: T) => {
    // 触发订阅器列表中所有事件
    for (const subscription of this.subscriptions) {
      subscription(val);
    }
  };

  // 订阅事件
  useSubscription = (callback: Subscription<T>) => {
    const callbackRef = useRef<Subscription<T>>();
    callbackRef.current = callback;
    useEffect(() => {
      // 待订阅事件
      function subscription(val: T) {
        if (callbackRef.current) {
          callbackRef.current(val);
        }
      }
      // 添加到订阅事件队列中
      this.subscriptions.add(subscription);
      return () => {
        // 卸载时移除
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

### useIsomorphicLayoutEffect

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

### useLatest

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

### useMemoizedFn

[文档地址](https://ahooks.js.org/zh-CN/hooks/use-memoized-fn)

[详细代码](https://github.com/alibaba/hooks/blob/master/packages/hooks/src/useUnmount/index.ts)

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

### useReactive

<aside>
💡 提供一种数据响应式的操作体验，定义数据状态不需要写 useState，直接修改属性即可刷新视图。

</aside>

#### API

```tsx
const state = useReactive(initialState: Record<string, any>);
```

##### Params

| 参数         | 说明           | 类型                  | 默认值 |
| ------------ | -------------- | --------------------- | ------ |
| initialState | 当前的数据对象 | Record\<string, any\> | -      |

#### 代码演示

[elegant-gates-8v2xzc - CodeSandbox](https://codesandbox.io/s/8v2xzc)

[busy-shape-v7yt4v - CodeSandbox](https://codesandbox.io/s/v7yt4v)

[silent-dream-5xxkpm](https://codesandbox.io/p/sandbox/silent-dream-5xxkpm)

#### 注意

useReactive 产生可操作的代理对象一直都是同一个引用，useEffect、useMemo、useCallback、子组件属性传递等如果依赖的是这个代理对象是不会引起重新执行。

[tender-cori-s9g36q - CodeSandbox](https://codesandbox.io/s/s9g36q)

#### FAQ

Q: useReactive  和 Map、Set  一起使用时报错或无效？

useReactive 目前不兼容 Map、Set。

#### 源码解析

```tsx
import { useRef } from "react";
import { isPlainObject } from "lodash-es";
import useCreation from "@/hooks/useCreation";
import useUpdate from "@/hooks/useUpdate";

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

function useReactive<S extends Record<string, any>>(initialState: S): S {
  const update = useUpdate();
  const stateRef = useRef<S>(initialState);

  const state = useCreation(() => {
    return observer(stateRef.current, () => {
      update();
    });
  }, []);

  return state;
}

export default useReactive;
```

## Dev

### useTrackedEffect

<aside>
💡 追踪是哪个依赖变化触发了 useEffect 的执行。

</aside>

#### API

```tsx
useTrackedEffect(
	effect: (changes: [], previousDeps: [], currentDeps: []) => (void | (() => void | undefined)),
	deps?: deps,
)
```

API 与 React.useEffect 基本一致，不过第一个函数会接收 changes、previousDeps、currentDeps 三个参数。

- changes：变化的依赖 index 数组
- previousDeps：上一个依赖
- currentDeps：当前依赖

#### 代码演示

[基础用法 - CodeSandbox](https://codesandbox.io/s/7d6cn8)

#### 源码解析

```tsx
import type { DependencyList } from "react";
import { useEffect, useRef } from "react";

type Effect<T extends DependencyList> = (
  changes?: number[],
  previousDeps?: T,
  currentDeps?: T
) => void | (() => void);

const diffTwoDeps = (deps1?: DependencyList, deps2?: DependencyList) => {
  // Let's do a reference equality check on 2 dependency list.
  // If deps1 is defined, we iterate over deps1 and do comparison on each element with equivalent element from deps2
  // As this func is used only in this hook, we assume 2 deps always have same length.
  return deps1
    ? deps1
        .map((_ele, idx) => (!Object.is(deps1[idx], deps2?.[idx]) ? idx : -1))
        .filter((ele) => ele >= 0)
    : deps2
    ? deps2.map((_ele, idx) => idx)
    : [];
};

const useTrackedEffect = <T extends DependencyList>(
  effect: Effect<T>,
  deps?: [...T]
) => {
  // 保存上一次的依赖
  const previousDepsRef = useRef<T>();

  useEffect(() => {
    // 变化的依赖 index 数组
    const changes = diffTwoDeps(previousDepsRef.current, deps);
    // 上一次的依赖
    const previousDeps = previousDepsRef.current;
    // 当前依赖
    previousDepsRef.current = deps;
    return effect(changes, previousDeps, deps);
  }, deps);
};

export default useTrackedEffect;
```

### useWhyDidYouUpdate

<aside>
💡 帮助开发者排查是哪个属性改变导致了组件的 rerender。

</aside>

#### API

```tsx
type IProps = Record<string, any>;

useWhyDidYouUpdate(componentName: string, props: IProps): void;
```

##### Params

| 参数          | 说明                                                                               | 类型   | 默认值 |
| ------------- | ---------------------------------------------------------------------------------- | ------ | ------ |
| componentName | 必填，观测组件的名称                                                               | string | -      |
| props         | 必填，需要观测的数据（当前组件 state 或者传入的 props 等可能导致 rerender 的数据） | object | -      |

##### Result

打开控制台，可以看到改变的属性。

#### 代码演示

[基础用法](https://codesandbox.io/p/sandbox/ji-chu-yong-fa-gy9jqx)

#### 源码解析

```tsx
import { useEffect, useRef } from "react";

export type IProps = Record<string, any>;

const useWhyDidYouUpdate = (componentName: string, props: IProps) => {
  // 保存上一次的 props
  const prevProps = useRef<IProps>({});

  useEffect(() => {
    if (prevProps.current) {
      // 获取所有 props
      const allKeys = Object.keys({ ...prevProps, ...props });
      const changedProps: IProps = {};

      allKeys.forEach((key) => {
        // 哪些 key 进行了更新
        if (!Object.is(prevProps[key], props[key])) {
          changedProps[key] = {
            from: prevProps.current[key],
            to: props[key],
          };
        }
      });

      // 有 diff，控制台输出
      if (Object.keys(changedProps).length) {
        console.log("[why-did-you-update]", componentName, changedProps);
      }
    }

    // 更新 prevProps
    prevProps.current = props;
  });
};

export default useWhyDidYouUpdate;
```

## 计划

### 二期计划列表

- 补充所有 Hook Demo
- 补充所有 Hook 单测源码

### 一期计划列表

主要完成所有 Hook 源码阅读初稿

#### DOM

- [x] useEventListener
- [x] useClickAway
- [x] useDocumentVisibility
- [x] useTitle
- [x] useFavicon
- [x] useEventTarget
- [x] useExternal
- [x] useHover
- [x] useMutationObserver
- [x] useInViewport
- [x] useKeyPress
- [x] useLongPress
- [x] useMouse
- [x] useResponsive
- [x] useScroll
- [x] useFocusWithin
- [x] useSize
- [x] useDrop & useDrag
- [x] useFullscreen

#### Advanced

- [x] useLatest
- [x] useMemoizedFn
- [x] useIsomorphicLayoutEffect
- [x] useCreation
- [x] useControllableValue
- [x] useEventEmitter
- [x] useReactive

#### State

- [x] useSetState
- [x] useBoolean
- [x] useToggle
- [x] useLocalStorageState
- [x] useSessionStorageState
- [x] useMap
- [x] useSet
- [x] usePrevious
- [x] useRafState
- [x] useGetState
- [x] useResetState
- [x] useSafeState
- [x] useUrlState
- [x] useCookieState
- [x] useDebounce
- [x] useThrottle

#### Effect

- [x] useUpdateEffect
- [x] useUpdateLayoutEffect
- [x] useUpdate
- [x] useDebounceEffect
- [x] useDebounceFn
- [x] useThrottleFn
- [x] useThrottleEffect
- [x] useInterval
- [x] useTimeout
- [x] useDeepCompareEffect
- [x] useDeepCompareLayoutEffect
- [x] useRafInterval
- [x] useRafTimeout
- [x] useLockFn
- [x] useAsyncEffect

#### Scene

- [x] useHistoryTravel
- [x] useNetwork
- [x] useSelections
- [x] useCountDown
- [x] useCounter
- [x] useTextSelection
- [x] useWebSocket
- [x] usePagination
- [x] useFusionTable
- [x] useAntdTable
- [x] useInfiniteScroll
- [ ] useDynamicList
- [x] useVirtualList

#### LifeCycle

- [x] useMount
- [x] useUnMount
- [x] useUnmountedRef

#### Dev

- [x] useTrackedEffect
- [x] useWhyDidYouUpdate

#### useRequest

- [x] 核心原理
- [x] Loading delay
- [x] 轮询
- [x] Ready
- [x] 依赖更新
- [x] 屏幕聚焦重新请求
- [x] 防抖
- [x] 节流
- [x] 缓存
- [x] 错误重试
