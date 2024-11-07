---
title: "📝 解读 ahooks 源码系列 - Dev"
date: 2023-11-10T14:20:04+08:00
tags: ["ahooks"]
categories: ["ahooks"]
---

本篇文章是解读 ahooks@3.8.0 源码系列的第八篇 - Dev，欢迎您的指正和点赞。

<!--more-->

本文主要解读 useTrackedEffect、 useWhyDidYouUpdate 的源码实现。

## useTrackedEffect

[文档地址](https://ahooks.js.org/zh-CN/hooks/use-tracked-effect)

[详细代码](https://github.com/alibaba/hooks/blob/master/packages/hooks/src/useTrackedEffect/index.ts)

```tsx
import { useRef, type DependencyList, useEffect } from "react";

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
  // 上一次的依赖
  const previousDepsRef = useRef<T>();

  useEffect(() => {
    // 变化的依赖 index 数组
    const changes = diffTwoDeps(previousDepsRef.current, deps);
    const previousDeps = previousDepsRef.current;
    previousDepsRef.current = deps;
    return effect(changes, previousDeps, deps);
  }, deps);
};

export default useTrackedEffect;
```

## useWhyDidYouUpdate

[文档地址](https://ahooks.js.org/zh-CN/hooks/use-why-did-you-update)

[详细代码](https://github.com/alibaba/hooks/blob/master/packages/hooks/src/useWhyDidYouUpdate/index.ts)

```tsx
import { useEffect, useRef } from "react";

export type IProps = Record<string, any>;

const useWhyDidYouUpdate = (componentName: string, props: IProps) => {
  // 上一次的 props
  const prevProps = useRef<IProps>({});

  useEffect(() => {
    if (prevProps.current) {
      // 获取所有 key
      const allKeys = Object.keys({ ...prevProps.current, ...props });
      const changedProps: IProps = {};
      allKeys.forEach((key) => {
        // 哪些 key 进行了更新
        if (!Object.is(prevProps.current[key], props[key])) {
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
