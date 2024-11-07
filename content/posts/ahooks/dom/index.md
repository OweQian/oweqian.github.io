---
title: "📝 解读 ahooks 源码系列 - DOM"
date: 2023-10-11T20:20:04+08:00
tags: ["ahooks"]
categories: ["ahooks"]
---

本篇文章是解读 ahooks@3.8.0 源码系列的第六篇 - DOM，欢迎您的指正和点赞。

<!--more-->

本文主要解读 useEventListener、useClickAway、useDocumentVisibility、useDrag、useDrop、useEventTarget、useExternal、useTitle、useFavicon、useFullScreen、useHover、useMutationObserver、useInViewport、useKeyPress、useLongPress、useMouse、useResponsive、useScroll、useSize、useFocusWithin 的源码实现。

## useEventListener

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

## useClickAway

[文档地址](https://ahooks.pages.dev/zh-CN/hooks/use-click-away)

[详细代码](https://github.com/alibaba/hooks/blob/master/packages/hooks/src/useClickAway/index.ts)

```tsx
import { type BasicTarget, getTargetElement } from "./domTarget";

type TargetValue<T> = T | undefined | null;

const checkIfAllInShadow = (targets: BasicTarget[]): boolean => {
  return targets.every((item) => {
    const targetElement = getTargetElement(item);
    if (!targetElement) return false;
    if (targetElement.getRootNode() instanceof ShadowRoot) return true;
    return false;
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
import { getTargetElement, type BasicTarget } from "@/utils/domTarget";
import useLatest from "../useLatest";
import useEffectWithTarget from "@/utils/useEffectWithTarget";
import getDocumentOrShadow from "@/utils/getDocumentOrShadow";

type DocumentEventKey = keyof DocumentEventMap;

const useClickAway = <T extends Event = Event>(
  onClickAway: (event: T) => void,
  target: BasicTarget | BasicTarget[],
  eventName: DocumentEventKey | DocumentEventKey[] = "click"
) => {
  const onClickAwayRef = useLatest(onClickAway);

  useEffectWithTarget(
    () => {
      const handler = (event: any) => {
        const targets = Array.isArray(target) ? target : [target];

        if (
          targets.some((item) => {
            const targetElement = getTargetElement(item);
            // 判断点击的 DOM Target 是否在定义的 DOM 元素（列表）中
            return !targetElement || targetElement.contains(event.Target);
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
        // 清除事件监听
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

## useDocumentVisibility

[文档地址](https://ahooks.pages.dev/zh-CN/hooks/use-document-visibility)

[详细代码](https://github.com/alibaba/hooks/blob/master/packages/hooks/src/useDocumentVisibility/index.ts)

```tsx
import isBrowser from "@/utils/isBrowser";
import useEventListener from "../useEventListener";
import { useState } from "react";

/**
 * hidden: 页面对用户不可见。即文档处于背景标签页、或窗口处于最小化状态，或操作系统正处于"锁屏状态"
 * visible: 页面内容至少部分可见。即文档处于前景标签页并且窗口没有最小化
 * prerender: 页面此时正在渲染中。文档只能从此状态开始，永远不能从其他值变为此状态
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

## useDrag

[文档地址](https://ahooks.js.org/zh-CN/hooks/use-drop/#usedrag)

[详细代码](https://github.com/alibaba/hooks/blob/master/packages/hooks/src/useDrag/index.ts)

```jsx
import { useRef } from "react";
import useLatest from "../useLatest";
import useMount from "../useMount";
import { isString } from "@/utils";
import useEffectWithTarget from "@/utils/useEffectWithTarget";
import { getTargetElement, type BasicTarget } from "@/utils/domTarget";

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
        // 设置拖拽事件中带有的数据
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

      // 开始拖拽事件监听器
      targetElement.addEventListener("dragstart", onDragStart as any);
      // 结束拖拽事件监听器
      targetElement.addEventListener("dragend", onDragEnd as any);

      return () => {
        // 清除事件监听器
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

## useDrop

[文档地址](https://ahooks.js.org/zh-CN/hooks/use-drop/#usedrop)

[详细代码](https://github.com/alibaba/hooks/blob/master/packages/hooks/src/useDrop/index.ts)

```jsx
import useEffectWithTarget from "@/utils/useEffectWithTarget";
import useLatest from "../useLatest";
import { useRef } from "react";
import { type BasicTarget, getTargetElement } from "@/utils/domTarget";

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

const useDrop = (target: BasicTarget, options: Options = {}) => {
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

## useEventTarget

[文档地址](https://ahooks.js.org/zh-CN/hooks/use-event-target)

[详细代码](https://github.com/alibaba/hooks/blob/master/packages/hooks/src/useEventTarget/index.ts)

```tsx
import { useCallback, useState } from "react";
import useLatest from "../useLatest";
import { isFunction } from "lodash";

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

  const transfomerRef = useLatest(transformer);

  // 重置函数
  const reset = useCallback(() => setValue(initialValue), []);

  // 值发生变化时的回调
  const onChange = useCallback((e: EventTarget<U>) => {
    const _value = e.target.value;
    // 判断自定义回调值的转化配置项是否存在并且为函数
    if (isFunction(transfomerRef.current)) {
      return setValue(transfomerRef.current(_value));
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

## useExternal

[文档地址](https://ahooks.js.org/zh-CN/hooks/use-external)

[详细代码](https://github.com/alibaba/hooks/blob/master/packages/hooks/src/useExternal/index.ts)

```tsx
import { useEffect, useRef, useState } from "react";

type JsOptions = {
  type: "js";
  js?: Partial<HTMLScriptElement>;
  keepWhenUnused?: boolean;
};

type CssOptions = {
  type: "css";
  css?: Partial<HTMLStyleElement>;
  keepWhenUnused?: boolean;
};

type DefaultOptions = {
  type?: never;
  js?: Partial<HTMLScriptElement>;
  css?: Partial<HTMLStyleElement>;
  keepWhenUnused?: boolean;
};

export type Options = JsOptions | CssOptions | DefaultOptions;

// {[path]: count}
// remove external when no used
const EXTERNAL_USED_COUNT: Record<string, number> = {};

/**
 * 加载状态
 * unset - 未设置
 * loading - 加载中
 * ready - 加载完成
 * error - 加载失败
 */
export type Status = "unset" | "loading" | "ready" | "error";

interface LoadResult {
  ref: Element;
  status: Status;
}

type LoadExternal = <T>(path: string, props?: Partial<T>) => LoadResult;

const loadScript: LoadExternal = (path, props = {}) => {
  const script = document.querySelector(`script[src="${path}"]`);

  if (!script) {
    const newScript = document.createElement("script");
    newScript.src = path;

    Object.keys(props).forEach((key) => {
      newScript[key] = props[key];
    });

    newScript.setAttribute("data-status", "loading");
    // 在 body 中插入
    document.body.appendChild(newScript);

    return {
      ref: newScript,
      status: "loading",
    };
  }

  return {
    ref: script,
    status: (script.getAttribute("data-status") as Status) || "ready",
  };
};

const loadCss: LoadExternal = (path, props = {}) => {
  const css = document.querySelector(`link[href="${path}"]`);

  if (!css) {
    const newCss = document.createElement("link");

    newCss.rel = "stylesheet";
    newCss.href = path;

    Object.keys(props).forEach((key) => {
      newCss[key] = props[key];
    });

    // IE9+
    /**
     * 在旧版本的 IE 浏览器中，hideFocus 属性用于控制元素在获得焦点时是否显示虚拟框
     * relList 是一个新的属性，允许开发者访问和操作元素的 rel 属性列表
     * 如果条件满足，将 newCss 元素的 rel 属性设置为 preload(预加载)
     * 将 newCss 元素的 as 属性设置为 'style'，告诉浏览器这是一个样式表资源
     * */
    const isLegacyIECss = "hideFocus" in newCss;
    // use preload in IE Edge (to detect load errors)
    if (isLegacyIECss && newCss.relList) {
      newCss.rel = "preload";
      newCss.as = "style";
    }
    newCss.setAttribute("data-status", "loading");
    // 在 head 标签中插入
    document.head.appendChild(newCss);

    return {
      ref: newCss,
      status: "loading",
    };
  }

  return {
    ref: css,
    status: (css.getAttribute("data-status") as Status) || "ready",
  };
};

const useExternal = (path?: string, options?: Options) => {
  const [status, setStatus] = useState<Status>(path ? "loading" : "unset");

  const ref = useRef<Element>();

  useEffect(() => {
    if (!path) {
      setStatus("unset");
      return;
    }
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
      const result = loadScript(path, options?.js);
      ref.current = result.ref;
      setStatus(result.status);
    } else {
      // do nothing
      console.error(
        "Cannot infer the type of external resource, and please provide a type ('js' | 'css'). " +
          "Refer to the https://ahooks.js.org/hooks/dom/use-external/#options"
      );
    }
    if (!ref.current) {
      return;
    }

    if (EXTERNAL_USED_COUNT[path] === undefined) {
      EXTERNAL_USED_COUNT[path] = 1;
    } else {
      EXTERNAL_USED_COUNT[path] += 1;
    }

    const handler = (event: Event) => {
      const targetStatus = event.type === "load" ? "ready" : "error";
      ref.current?.setAttribute("data-status", targetStatus);
      setStatus(targetStatus);
    };

    // 加载完成
    ref.current.addEventListener("load", handler);
    // 加载失败
    ref.current.addEventListener("error", handler);
    return () => {
      // 清除
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

## useTitle

[文档地址](https://ahooks.js.org/zh-CN/hooks/use-title)

[详细代码](https://github.com/alibaba/hooks/blob/master/packages/hooks/src/useTitle/index.ts)

```tsx
import isBrowser from "@/utils/isBrowser";
import { useEffect, useRef } from "react";
import useUnmount from "../useUnmount";

export interface Options {
  restoreOnUnmount?: boolean;
}

const DEFAULT_OPTIONS: Options = {
  restoreOnUnmount: false,
};

const useTitle = (title: string, options: Options = DEFAULT_OPTIONS) => {
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

## useFavicon

[文档地址](https://ahooks.js.org/zh-CN/hooks/use-favicon)

[详细代码](https://github.com/alibaba/hooks/blob/master/packages/hooks/src/useFavicon/index.ts)

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
    if (!href) {
      return;
    }

    // 获取图片后缀
    const cutUrl = href.split(".");
    const imgSuffix = cutUrl[cutUrl.length - 1].toLocaleUpperCase() as ImgTypes;

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

## useFullScreen

[文档地址](https://ahooks.js.org/zh-CN/hooks/use-fullscreen)

[详细代码](https://github.com/alibaba/hooks/blob/master/packages/hooks/src/useFullscreen/index.ts)

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
import { isBoolean } from "@/utils";
import { getTargetElement, type BasicTarget } from "@/utils/domTarget";
import screenfull from "screenfull";
import useLatest from "../useLatest";
import { useEffect, useRef, useState } from "react";
import useMemoizedFn from "../useMemoizedFn";
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
    // Prevent repeated calls when the state is not changed.
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

## useHover

[文档地址](https://ahooks.js.org/zh-CN/hooks/use-hover)

[详细代码](https://github.com/alibaba/hooks/blob/master/packages/hooks/src/useHover/index.ts)

```tsx
import type { BasicTarget } from "@/utils/domTarget";
import useBoolean from "../useBoolean";
import useEventListener from "../useEventListener";

export interface Options {
  onEnter?: () => void;
  onLeave?: () => void;
  onChange?: (isHovering: boolean) => void;
}

const useHover = (target: BasicTarget, options?: Options) => {
  const { onEnter, onChange, onLeave } = options || {};

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

## useMutationObserver

[文档地址](https://ahooks.js.org/zh-CN/hooks/use-mutation-observer/)

[详细代码](https://github.com/alibaba/hooks/blob/master/packages/hooks/src/useMutationObserver/index.ts)

```tsx
import { getTargetElement, type BasicTarget } from "@/utils/domTarget";
import useLatest from "../useLatest";
import useDeepCompareWithTarget from "@/utils/useDeepCompareWithTarget";

const useMutationObserver = (
  callback: MutationCallback,
  target: BasicTarget,
  options: MutationObserverInit = {}
): void => {
  const callbackRef = useLatest(callback);

  useDeepCompareWithTarget(
    () => {
      const element = getTargetElement(target);
      if (!element) {
        return;
      }

      // 创建一个观察器实例并传入回调函数
      const observer = new MutationObserver(callbackRef.current);
      // 根据配置开始观察目标节点
      observer.observe(element, options);

      return () => {
        // 停止观察
        observer?.disconnect();
      };
    },
    [options],
    target
  );
};

export default useMutationObserver;
```

## useInViewport

[文档地址](https://ahooks.js.org/zh-CN/hooks/use-in-viewport)

[详细代码](https://github.com/alibaba/hooks/blob/master/packages/hooks/src/useInViewport/index.ts)

```tsx
/**
 * intersection-observer polyfill 处理
 * */
import "intersection-observer";
import { getTargetElement, type BasicTarget } from "@/utils/domTarget";
import { useState } from "react";
import useEffectWithTarget from "@/utils/useEffectWithTarget";

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
            setRatio(entry.intersectionRatio);
            setState(entry.isIntersecting);
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
    [callback, options?.rootMargin, options?.threshold],
    target
  );
  return [state, ratio] as const;
};

export default useInViewport;
```

## useKeyPress

[文档地址](https://ahooks.js.org/zh-CN/hooks/use-key-press)

[详细代码](https://github.com/alibaba/hooks/blob/master/packages/hooks/src/useKeyPress/index.ts)

```tsx
import { isFunction, isNumber, isString } from "@/utils";
import { getTargetElement, type BasicTarget } from "@/utils/domTarget";
import useLatest from "../useLatest";
import useDeepCompareWithTarget from "@/utils/useDeepCompareWithTarget";
import isAppleDevice from "@/utils/isAppleDevice";

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
  // 浏览器自动补全 input 的时候，会触发 keyDown、keyUp 事件，但此时 event.key 等为空
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

  useDeepCompareWithTarget(
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

      // 监听 'keydown' | 'keyup'
      for (const eventName of events) {
        el?.addEventListener?.(eventName, callbackHandler, useCapture);
      }

      // 取消监听 'keydown' | 'keyup'
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

## useLongPress

[文档地址](https://ahooks.js.org/zh-CN/hooks/use-long-press)

[详细代码](https://github.com/alibaba/hooks/blob/master/packages/hooks/src/useLongPress/index.ts)

```tsx
import { type BasicTarget, getTargetElement } from "@/utils/domTarget";
import isBrowser from "@/utils/isBrowser";
import useLatest from "../useLatest";
import { useRef } from "react";
import useEffectWithTarget from "@/utils/useEffectWithTarget";

type EventType = MouseEvent | TouchEvent;
export interface Options {
  delay?: number;
  moveThreshold?: { x?: number; y?: number };
  onClick?: (event: EventType) => void;
  onLongPressEnd?: (event: EventType) => void;
}

/**
 * 判断是否支持 touch 事件
 * 如果支持，则监听 touchstart - 触摸开始、touchend - 触摸结束、touchmove - 触摸移动
 * 如果不支持，则监听 mousedown - 按下鼠标、mouseup - 松开鼠标、mousemove - 鼠标移动、mouseleave - 鼠标离开元素
 * */
const touchSupported =
  isBrowser &&
  ("ontouchstart" in window ||
    // @ts-ignore
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

## useMouse

[文档地址](https://ahooks.js.org/zh-CN/hooks/use-mouse)

[详细代码](https://github.com/alibaba/hooks/blob/master/packages/hooks/src/useMouse/index.ts)

```tsx
import { BasicTarget, getTargetElement } from "@/utils/domTarget";
import useEventListener from "../useEventListener";
import useRafState from "../useRafState";

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
        newState.elementW = width;
        newState.elementH = height;
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

## useResponsive

[文档地址](https://ahooks.js.org/zh-CN/hooks/use-responsive)

[详细代码](https://github.com/alibaba/hooks/blob/master/packages/hooks/src/useResponsive/index.ts)

```tsx
import isBrowser from "@/utils/isBrowser";
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

// 自定义响应式断点配置函数
export const configResponsive = (config: ResponsiveConfig) => {
  responsiveConfig = config;
  if (info) calculate();
};

const useResponsive = () => {
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

export default useResponsive;
```

## useScroll

[文档地址](https://ahooks.js.org/zh-CN/hooks/use-scroll)

[详细代码](https://github.com/alibaba/hooks/blob/master/packages/hooks/src/useScroll/index.ts)

```tsx
import { type BasicTarget, getTargetElement } from "@/utils/domTarget";
import useRafState from "../useRafState";
import useLatest from "../useLatest";
import useEffectWithTarget from "@/utils/useEffectWithTarget";

type Position = { left: number; top: number };

export type Target = BasicTarget<Document | Element>;
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
          // DOM
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
        // 清除 scroll 事件监听器
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

## useSize

[文档地址](https://ahooks.js.org/zh-CN/hooks/use-size)

[详细代码](https://github.com/alibaba/hooks/blob/master/packages/hooks/src/useSize/index.ts)

```tsx
import ResizeObserver from "resize-observer-polyfill";
import { type BasicTarget, getTargetElement } from "@/utils/domTarget";
import useIsomorphicLayoutEffectWithTarget from "@/utils/useIsomorphicLayoutEffectWithTarget";
import useRafState from "../useRafState";

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

## useFocusWithin

[文档地址](https://ahooks.js.org/zh-CN/hooks/use-focus-within)

[详细代码](https://github.com/alibaba/hooks/blob/master/packages/hooks/src/useFocusWithin/index.tsx)

```tsx
import { useState } from "react";
import useEventListener from "../useEventListener";
import type { BasicTarget } from "@/utils/domTarget";

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
