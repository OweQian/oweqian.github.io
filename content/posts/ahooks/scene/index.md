---
title: "📝 解读 ahooks 源码系列 - Scene 篇"
date: 2023-09-11T15:57:04+08:00
tags: ["ahooks"]
categories: ["ahooks"]
---

本篇文章是解读 ahooks@3.8.0 源码系列的第二篇 - Scene 篇，欢迎您的指正和点赞。

<!--more-->

本文主要解读 useAntdTable、useFusionTable、useInfiniteScroll、usePagination、useDynamicList、useVirtualList、useHistoryTravel、useNetwork、useSelections、useCountDown、useCounter、useTextSelection、useWebSocket 的源码实现。

## useAntdTable

[文档地址](https://ahooks.js.org/zh-CN/hooks/use-antd-table)

[详细代码](https://github.com/alibaba/hooks/blob/master/packages/hooks/src/useAntdTable/index.tsx)

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

## useFusionTable

<aside>
没用过 Fusion，此篇省略。

</aside>

文档地址：[https://ahooks.js.org/zh-CN/hooks/use-fusion-table](https://ahooks.js.org/zh-CN/hooks/use-fusion-table)

详细代码：[https://github.com/alibaba/hooks/tree/master/packages/hooks/src/useFusionTable](https://github.com/alibaba/hooks/tree/master/packages/hooks/src/useFusionTable)

## useInfiniteScroll

[文档地址](https://ahooks.js.org/zh-CN/hooks/use-infinite-scroll)

[详细代码](https://github.com/alibaba/hooks/blob/master/packages/hooks/src/useInfiniteScroll/index.tsx)

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

## usePagination

[文档地址](https://ahooks.js.org/zh-CN/hooks/use-pagination)

[详细代码](https://github.com/alibaba/hooks/blob/master/packages/hooks/src/usePagination/index.ts)

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

## useDynamicList

[文档地址](https://ahooks.js.org/zh-CN/hooks/use-dynamic-list)

[详细代码](https://github.com/alibaba/hooks/blob/master/packages/hooks/src/useDynamicList/index.ts)

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

## useVirtualList

[文档地址](https://ahooks.js.org/zh-CN/hooks/use-virtual-list)

[详细代码](https://github.com/alibaba/hooks/blob/master/packages/hooks/src/useVirtualList/index.ts)

```tsx
import { type BasicTarget, getTargetElement } from "@/utils/domTarget";
import useMemoizedFn from "../useMemoizedFn";
import useUpdateEffect from "../useUpdateEffect";
import useEventListener from "../useEventListener";
import {
  type CSSProperties,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { isNumber } from "@/utils";
import useLatest from "../useLatest";
import useSize from "../useSize";

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

## useHistoryTravel

[文档地址](https://ahooks.js.org/zh-CN/hooks/use-history-travel)

[详细代码](https://github.com/alibaba/hooks/blob/master/packages/hooks/src/useHistoryTravel/index.ts)

```tsx
import { isNumber } from "@/utils";
import useMemoizedFn from "../useMemoizedFn";
import { useRef, useState } from "react";

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

## useNetwork

[文档地址](https://ahooks.js.org/zh-CN/hooks/use-network)

[详细代码](https://github.com/alibaba/hooks/blob/master/packages/hooks/src/useNetwork/index.ts)

```tsx
import { isObject } from "@/utils";
import { useEffect, useState } from "react";

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

    // 监听 nav.connection || nav.mozConnection || nav.webkitConnection 的 change 事件
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

## useSelections

[文档地址](https://ahooks.js.org/zh-CN/hooks/use-selections)

[详细代码](https://github.com/alibaba/hooks/blob/master/packages/hooks/src/useSelections/index.ts)

```tsx
import { useMemo, useState } from "react";
import type { Key } from "react";
import useMemoizedFn from "../useMemoizedFn";
import { isPlainObject } from "lodash";
import { isFunction, isString } from "@/utils";

export interface Options<T> {
  defaultSelected?: T[];
  itemKey?: string | ((item: T) => Key);
}

const useSelections = <T,>(items: T[], options?: T[] | Options<T>) => {
  let defaultSelected: T[] = [];
  let itemKey: Options<T>["itemKey"];

  if (Array.isArray(options)) {
    defaultSelected = options;
  } else if (isPlainObject(options)) {
    defaultSelected = options?.defaultSelected ?? defaultSelected;
    itemKey = options?.itemKey ?? itemKey;
  }

  const getKey = (item: T): Key => {
    if (isFunction(itemKey)) {
      return itemKey(item);
    }
    if (isString(itemKey) && isPlainObject(item)) {
      return item[itemKey];
    }

    return item as Key;
  };

  const [selected, setSelected] = useState<T[]>(defaultSelected);

  const selectedMap = useMemo(() => {
    const keyToItemMap = new Map();

    if (!Array.isArray(selected)) {
      return keyToItemMap;
    }

    selected.forEach((item) => {
      keyToItemMap.set(getKey(item), item);
    });

    return keyToItemMap;
  }, [selected]);

  // 是否被选择
  const isSelected = (item: T) => selectedMap.has(getKey(item));

  // 选择单个元素
  const select = (item: T) => {
    selectedMap.set(getKey(item), item);
    setSelected(Array.from(selectedMap.values()));
  };

  // 取消选择单个元素
  const unSelect = (item: T) => {
    selectedMap.delete(getKey(item));
    setSelected(Array.from(selectedMap.values()));
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
    items.forEach((item) => {
      selectedMap.set(getKey(item), item);
    });
    setSelected(Array.from(selectedMap.values()));
  };

  // 取消选择全部元素
  const unSelectAll = () => {
    items.forEach((item) => {
      selectedMap.delete(getKey(item));
    });
    setSelected(Array.from(selectedMap.values()));
  };

  // 是否一个都没有选择
  const noneSelected = useMemo(
    () => items.every((item) => !selectedMap.has(getKey(item))),
    [items, selectedMap]
  );

  // 是否全选
  const allSelected = useMemo(
    () => items.every((item) => selectedMap.has(getKey(item))) && !noneSelected,
    [items, selectedMap, noneSelected]
  );

  // 是否半选
  const partiallySelected = useMemo(
    () => !noneSelected && !allSelected,
    [noneSelected, allSelected]
  );

  // 反选全部元素
  const toggleAll = () => (allSelected ? unSelectAll() : selectAll());

  // 清除所有选中元素
  const clearAll = () => {
    selectedMap.clear();
    setSelected([]);
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
    clearAll: useMemoizedFn(clearAll),
    toggleAll: useMemoizedFn(toggleAll),
  } as const;
};

export default useSelections;
```

## useCountDown

[文档地址](https://ahooks.js.org/zh-CN/hooks/use-count-down)

[详细代码](https://github.com/alibaba/hooks/blob/master/packages/hooks/src/useCountDown/index.ts)

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

## useCounter

[文档地址](https://ahooks.js.org/zh-CN/hooks/use-counter)

[详细代码](https://github.com/alibaba/hooks/blob/master/packages/hooks/src/useCounter/index.ts)

```tsx
import { isNumber } from "@/utils";
import useMemoizedFn from "../useMemoizedFn";
import { useState } from "react";

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

## useTextSelection

[文档地址](https://ahooks.js.org/zh-CN/hooks/use-text-selection)

[详细代码](https://github.com/alibaba/hooks/blob/master/packages/hooks/src/useTextSelection/index.ts)

```tsx
import { getTargetElement, type BasicTarget } from "@/utils/domTarget";
import useEffectWithTarget from "@/utils/useEffectWithTarget";
import { useRef, useState } from "react";

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

## useWebSocket

[文档地址](https://ahooks.js.org/zh-CN/hooks/use-web-socket)

[详细代码](https://github.com/alibaba/hooks/blob/master/packages/hooks/src/useWebSocket/index.ts)

```tsx
iimport { useEffect, useRef, useState } from "react";
import useLatest from "../useLatest";
import useUnmount from "../useUnmount";
import useMemoizedFn from "../useMemoizedFn";

/**
 * Connecting: 正在连接中
 * Open: 已经连接并可以通讯
 * Closing: 连接正在关闭
 * Closed: 连接已关闭或没有连接成功
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
    // 没有超过重试次数并且当前 webSocket 实例状态不是 Open
    if (
      reconnectTimesRef.current < reconnectLimit &&
      websocketRef.current?.readyState !== ReadyState.Open
    ) {
      // 如果已经存在重试逻辑，则清除掉计定时器
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }

      // 重连
      reconnectTimerRef.current = setTimeout(() => {
        connectWs();
        reconnectTimesRef.current++;
      }, reconnectInterval);
    }
  };

  // 创建连接
  const connectWs = () => {
    // 如果已经存在重试逻辑，则清除掉计定时器
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

  // 连接 webSocket，如果当前已有连接，则关闭后重新连接
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
