---
title: "🗒 解读 antd 源码系列 - Button 按钮"
date: 2024-11-08T10:00:30+08:00
tags: ["antd"]
draft: true
categories: ["antd"]
---

本篇文章是解读 antd@5.21.6 源码系列的第一篇 - Button 按钮，欢迎您的指正和点赞。

<!--more-->

本文主要解读 Button 按钮的源码实现，按钮用于开始一个即时操作。

[文档地址](https://ant.design/components/button-cn)

[详细代码](https://github.com/ant-design/ant-design/blob/master/components/button)

Button 包括两个组件：Button 和 Button.Group。

## Button

### Import

首先来看看 Button.tsx 的模块导入部分。

```tsx
import React, {
  Children,
  createRef,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import classNames from "classnames";
import omit from "rc-util/lib/omit";
import { composeRef } from "rc-util/lib/ref";

import { devUseWarning } from "../_util/warning";
import Wave from "../_util/wave";
import { ConfigContext } from "../config-provider";
import DisabledContext from "../config-provider/DisabledContext";
import useSize from "../config-provider/hooks/useSize";
import type { SizeType } from "../config-provider/SizeContext";
import { useCompactItemContext } from "../space/Compact";
import Group, { GroupSizeContext } from "./button-group";
import type {
  ButtonColorType,
  ButtonHTMLType,
  ButtonShape,
  ButtonType,
  ButtonVariantType,
} from "./buttonHelpers";
import {
  isTwoCNChar,
  isUnBorderedButtonVariant,
  spaceChildren,
} from "./buttonHelpers";
import IconWrapper from "./IconWrapper";
import LoadingIcon from "./LoadingIcon";
import useStyle from "./style";
import CompactCmp from "./style/compactCmp";
```

#### devUseWarning

用于处理 React 组件警告的工具，主要用于在开发环境中输出警告信息，以帮助开发者识别和修复潜在的问题。

```ts
import * as React from "react";
/**
 * rcWarning - 警告函数，输出警告信息
 * resetWarned - 重置警告函数，清除已记录的警告
 */
import rcWarning, { resetWarned as rcResetWarned } from "rc-util/lib/warning";

// 占位函数，空函数
export function noop() {}

/**
 * deprecatedWarnList - 存储已发送的警告信息
 * resetWarned - 清除警告状态
 */
let deprecatedWarnList: Record<string, string[]> | null = null;
export function resetWarned() {
  deprecatedWarnList = null;
  rcResetWarned();
}

/**
 * warning - 警告函数
 */
type Warning = (valid: boolean, component: string, message?: string) => void;
// eslint-disable-next-line import/no-mutable-exports
let warning: Warning = noop;
if (process.env.NODE_ENV !== "production") {
  warning = (valid, component, message) => {
    rcWarning(valid, `[antd: ${component}] ${message}`);

    // StrictMode will inject console which will not throw warning in React 17.
    if (process.env.NODE_ENV === "test") {
      resetWarned();
    }
  };
}

/**
 * valid - 有效性
 * deprecated - 过时
 * usage - 用法不当
 * breaking - 破坏性变化
 */
type BaseTypeWarning = (
  valid: boolean,
  /**
   * - deprecated: Some API will be removed in future but still support now.
   * - usage: Some API usage is not correct.
   * - breaking: Breaking change like API is removed.
   */
  type: "deprecated" | "usage" | "breaking",
  message?: string
) => void;
type TypeWarning = BaseTypeWarning & {
  deprecated: (
    valid: boolean,
    oldProp: string,
    newProp: string,
    message?: string
  ) => void;
};

/**
 * strict - 控制警告的聚合方式
 */
export interface WarningContextProps {
  /**
   * @descCN 设置警告等级，设置 `false` 时会将废弃相关信息聚合为单条信息。
   * @descEN Set the warning level. When set to `false`, discard related information will be aggregated into a single message.
   * @since 5.10.0
   */
  strict?: boolean;
}
export const WarningContext = React.createContext<WarningContextProps>({});

/**
 * devUseWarning - 自定义 Hook，仅在开发环境中使用
 */
/**
 * This is a hook but we not named as `useWarning`
 * since this is only used in development.
 * We should always wrap this in `if (process.env.NODE_ENV !== 'production')` condition
 */
export const devUseWarning: (component: string) => TypeWarning =
  process.env.NODE_ENV !== "production"
    ? (component) => {
        const { strict } = React.useContext(WarningContext);

        const typeWarning: TypeWarning = (valid, type, message) => {
          if (!valid) {
            if (strict === false && type === "deprecated") {
              // 是否已存在警告列表
              const existWarning = deprecatedWarnList;

              if (!deprecatedWarnList) {
                deprecatedWarnList = {};
              }

              // 该组件的警告列表（尚不存在则初始化）
              deprecatedWarnList[component] =
                deprecatedWarnList[component] || [];
              // 当前消息是否存在于该组件的警告列表中
              if (!deprecatedWarnList[component].includes(message || "")) {
                deprecatedWarnList[component].push(message || "");
              }

              // Warning for the first time
              // existWarning 不存在，表示这是第一次记录警告，输出一个警告信息到控制台
              if (!existWarning) {
                console.warn(
                  "[antd] There exists deprecated usage in your code:",
                  deprecatedWarnList
                );
              }
            } else {
              warning(valid, component, message);
            }
          }
        };

        // 处理过时属性的警告
        typeWarning.deprecated = (valid, oldProp, newProp, message) => {
          typeWarning(
            valid,
            "deprecated",
            `\`${oldProp}\` is deprecated. Please use \`${newProp}\` instead.${
              message ? ` ${message}` : ""
            }`
          );
        };

        return typeWarning;
      }
    : () => {
        const noopWarning: TypeWarning = () => {};

        noopWarning.deprecated = noop;

        return noopWarning;
      };

export default warning;
```

#### Wave

用于在点击时为其子元素添加波纹效果，通常用于需要视觉反馈的交互元素，如按钮、多选框、开关等。

```tsx
import React, { useContext, useRef } from "react";
import classNames from "classnames";
/**
 * isVisible - 判断 DOM 元素是否可见
 * composeRef、supportRef - 处理 ref
 */
import isVisible from "rc-util/lib/Dom/isVisible";
import { composeRef, supportRef } from "rc-util/lib/ref";

import type { ConfigConsumerProps } from "../../config-provider";
import { ConfigContext } from "../../config-provider";
import { cloneElement } from "../reactNode";
import type { WaveComponent } from "./interface";
import useStyle from "./style";
import useWave from "./useWave";

export interface WaveProps {
  disabled?: boolean;
  children?: React.ReactNode;
  component?: WaveComponent;
}

const Wave: React.FC<WaveProps> = (props) => {
  const { children, disabled, component } = props;

  // 前缀类名
  const { getPrefixCls } = useContext<ConfigConsumerProps>(ConfigContext);
  // 容器元素
  const containerRef = useRef<HTMLElement>(null);

  // ============================== Style ===============================
  // 波纹效果的前缀类名
  const prefixCls = getPrefixCls("wave");
  // 哈希 ID
  const [, hashId] = useStyle(prefixCls);

  // =============================== Wave ===============================
  const showWave = useWave(
    containerRef,
    classNames(prefixCls, hashId),
    component
  );

  // ============================== Effect ==============================
  React.useEffect(() => {
    const node = containerRef.current;
    // 容器元素是否存在、是否为元素节点、是否被禁用
    if (!node || node.nodeType !== 1 || disabled) {
      return;
    }

    // Click handler
    const onClick = (e: MouseEvent) => {
      // Fix radio button click twice
      // 目标元素是否可见、是否被禁用等
      if (
        !isVisible(e.target as HTMLElement) ||
        // No need wave
        !node.getAttribute ||
        node.getAttribute("disabled") ||
        (node as HTMLInputElement).disabled ||
        node.className.includes("disabled") ||
        node.className.includes("-leave")
      ) {
        return;
      }
      // 显示波纹效果
      showWave(e);
    };

    // Bind events
    node.addEventListener("click", onClick, true);
    return () => {
      node.removeEventListener("click", onClick, true);
    };
  }, [disabled]);

  // ============================== Render ==============================
  // 是否为有效的 React 元素
  if (!React.isValidElement(children)) {
    return children ?? null;
  }

  // children 是否支持 ref，来决定使用 composeRef 合并 ref
  const ref = supportRef(children)
    ? composeRef((children as any).ref, containerRef)
    : containerRef;
  // 克隆 children，传递 ref
  return cloneElement(children, { ref });
};

if (process.env.NODE_ENV !== "production") {
  Wave.displayName = "Wave";
}

export default Wave;
```

#### ConfigContext

用于管理全局的配置、主题、样式和上下文。

```ts
import * as React from "react";
import { createTheme } from "@ant-design/cssinjs";
import IconContext from "@ant-design/icons/lib/components/Context";
import useMemo from "rc-util/lib/hooks/useMemo";
// merge - 合并对象或数组
import { merge } from "rc-util/lib/utils/set";

import warning, { devUseWarning, WarningContext } from "../_util/warning";
import type { WarningContextProps } from "../_util/warning";
import ValidateMessagesContext from "../form/validateMessagesContext";

// 本地化
import type { Locale } from "../locale";
import LocaleProvider, { ANT_MARK } from "../locale";
import type { LocaleContextProps } from "../locale/context";
import LocaleContext from "../locale/context";
import defaultLocale from "../locale/en_US";

// 默认主题、设计令牌
import { defaultTheme, DesignTokenContext } from "../theme/context";
import defaultSeedToken from "../theme/themes/seed";
import type {
  AlertConfig,
  BadgeConfig,
  ButtonConfig,
  CardConfig,
  CascaderConfig,
  CollapseConfig,
  ComponentStyleConfig,
  ConfigConsumerProps,
  CSPConfig,
  DatePickerConfig,
  DirectionType,
  DrawerConfig,
  FlexConfig,
  FloatButtonGroupConfig,
  FormConfig,
  ImageConfig,
  InputConfig,
  InputNumberConfig,
  ListConfig,
  MentionsConfig,
  MenuConfig,
  ModalConfig,
  NotificationConfig,
  PaginationConfig,
  PopupOverflow,
  RangePickerConfig,
  SelectConfig,
  SpaceConfig,
  SpinConfig,
  TableConfig,
  TabsConfig,
  TagConfig,
  TextAreaConfig,
  Theme,
  ThemeConfig,
  TimePickerConfig,
  TourConfig,
  TransferConfig,
  TreeSelectConfig,
  Variant,
  WaveConfig,
} from "./context";
import {
  ConfigConsumer,
  ConfigContext,
  defaultIconPrefixCls,
  defaultPrefixCls,
  Variants,
} from "./context";
import { registerTheme } from "./cssVariables";
import type { RenderEmptyHandler } from "./defaultRenderEmpty";
import { DisabledContextProvider } from "./DisabledContext";
import useConfig from "./hooks/useConfig";
import useTheme from "./hooks/useTheme";
import MotionWrapper from "./MotionWrapper";
import PropWarning from "./PropWarning";
import type { SizeType } from "./SizeContext";
import SizeContext, { SizeContextProvider } from "./SizeContext";
import useStyle from "./style";

export type { Variant };

export { Variants };

/**
 * Since too many feedback using static method like `Modal.confirm` not getting theme, we record the
 * theme register info here to help developer get warning info.
 */
let existThemeConfig = false;

export const warnContext: (componentName: string) => void =
  process.env.NODE_ENV !== "production"
    ? (componentName: string) => {
        warning(
          !existThemeConfig,
          componentName,
          `Static function can not consume context like dynamic theme. Please use 'App' component instead.`
        );
      }
    : /* istanbul ignore next */
      null!;

export {
  ConfigConsumer,
  ConfigContext,
  defaultPrefixCls,
  defaultIconPrefixCls,
  type ConfigConsumerProps,
  type CSPConfig,
  type DirectionType,
  type RenderEmptyHandler,
  type ThemeConfig,
};

export const configConsumerProps = [
  "getTargetContainer",
  "getPopupContainer",
  "rootPrefixCls",
  "getPrefixCls",
  "renderEmpty",
  "csp",
  "autoInsertSpaceInButton",
  "locale",
];

// These props is used by `useContext` directly in sub component
const PASSED_PROPS: Exclude<
  keyof ConfigConsumerProps,
  "rootPrefixCls" | "getPrefixCls" | "warning"
>[] = [
  "getTargetContainer",
  "getPopupContainer",
  "renderEmpty",
  "input",
  "pagination",
  "form",
  "select",
  "button",
];

export interface ConfigProviderProps {
  getTargetContainer?: () => HTMLElement | Window;
  getPopupContainer?: (triggerNode?: HTMLElement) => HTMLElement;
  prefixCls?: string;
  iconPrefixCls?: string;
  children?: React.ReactNode;
  renderEmpty?: RenderEmptyHandler;
  csp?: CSPConfig;
  /** @deprecated Please use `{ button: { autoInsertSpace: boolean }}` instead */
  autoInsertSpaceInButton?: boolean;
  variant?: Variant;
  form?: FormConfig;
  input?: InputConfig;
  inputNumber?: InputNumberConfig;
  textArea?: TextAreaConfig;
  select?: SelectConfig;
  pagination?: PaginationConfig;
  /**
   * @descCN 语言包配置，语言包可到 `antd/locale` 目录下寻找。
   * @descEN Language package setting, you can find the packages in `antd/locale`.
   */
  locale?: Locale;
  componentSize?: SizeType;
  componentDisabled?: boolean;
  /**
   * @descCN 设置布局展示方向。
   * @descEN Set direction of layout.
   * @default ltr
   */
  direction?: DirectionType;
  space?: SpaceConfig;
  splitter?: ComponentStyleConfig;
  /**
   * @descCN 设置 `false` 时关闭虚拟滚动。
   * @descEN Close the virtual scrolling when setting `false`.
   * @default true
   */
  virtual?: boolean;
  /** @deprecated Please use `popupMatchSelectWidth` instead */
  dropdownMatchSelectWidth?: boolean;
  popupMatchSelectWidth?: boolean;
  popupOverflow?: PopupOverflow;
  theme?: ThemeConfig;
  warning?: WarningContextProps;
  alert?: AlertConfig;
  anchor?: ComponentStyleConfig;
  button?: ButtonConfig;
  calendar?: ComponentStyleConfig;
  carousel?: ComponentStyleConfig;
  cascader?: CascaderConfig;
  treeSelect?: TreeSelectConfig;
  collapse?: CollapseConfig;
  divider?: ComponentStyleConfig;
  drawer?: DrawerConfig;
  typography?: ComponentStyleConfig;
  skeleton?: ComponentStyleConfig;
  spin?: SpinConfig;
  segmented?: ComponentStyleConfig;
  statistic?: ComponentStyleConfig;
  steps?: ComponentStyleConfig;
  image?: ImageConfig;
  layout?: ComponentStyleConfig;
  list?: ListConfig;
  mentions?: MentionsConfig;
  modal?: ModalConfig;
  progress?: ComponentStyleConfig;
  result?: ComponentStyleConfig;
  slider?: ComponentStyleConfig;
  breadcrumb?: ComponentStyleConfig;
  menu?: MenuConfig;
  floatButtonGroup?: FloatButtonGroupConfig;
  checkbox?: ComponentStyleConfig;
  descriptions?: ComponentStyleConfig;
  empty?: ComponentStyleConfig;
  badge?: BadgeConfig;
  radio?: ComponentStyleConfig;
  rate?: ComponentStyleConfig;
  switch?: ComponentStyleConfig;
  transfer?: TransferConfig;
  avatar?: ComponentStyleConfig;
  message?: ComponentStyleConfig;
  tag?: TagConfig;
  table?: TableConfig;
  card?: CardConfig;
  tabs?: TabsConfig;
  timeline?: ComponentStyleConfig;
  timePicker?: TimePickerConfig;
  upload?: ComponentStyleConfig;
  notification?: NotificationConfig;
  tree?: ComponentStyleConfig;
  colorPicker?: ComponentStyleConfig;
  datePicker?: DatePickerConfig;
  rangePicker?: RangePickerConfig;
  dropdown?: ComponentStyleConfig;
  flex?: FlexConfig;
  /**
   * Wave is special component which only patch on the effect of component interaction.
   */
  wave?: WaveConfig;
  tour?: TourConfig;
}

interface ProviderChildrenProps extends ConfigProviderProps {
  parentContext: ConfigConsumerProps;
  legacyLocale: Locale;
}

type holderRenderType = (children: React.ReactNode) => React.ReactNode;

let globalPrefixCls: string;
let globalIconPrefixCls: string;
let globalTheme: ThemeConfig;
let globalHolderRender: holderRenderType | undefined;

function getGlobalPrefixCls() {
  return globalPrefixCls || defaultPrefixCls;
}

function getGlobalIconPrefixCls() {
  return globalIconPrefixCls || defaultIconPrefixCls;
}

function isLegacyTheme(theme: Theme | ThemeConfig): theme is Theme {
  return Object.keys(theme).some((key) => key.endsWith("Color"));
}

interface GlobalConfigProps {
  prefixCls?: string;
  iconPrefixCls?: string;
  theme?: Theme | ThemeConfig;
  holderRender?: holderRenderType;
}

const setGlobalConfig = (props: GlobalConfigProps) => {
  const { prefixCls, iconPrefixCls, theme, holderRender } = props;
  if (prefixCls !== undefined) {
    globalPrefixCls = prefixCls;
  }
  if (iconPrefixCls !== undefined) {
    globalIconPrefixCls = iconPrefixCls;
  }
  if ("holderRender" in props) {
    globalHolderRender = holderRender;
  }

  if (theme) {
    if (isLegacyTheme(theme)) {
      warning(
        false,
        "ConfigProvider",
        "`config` of css variable theme is not work in v5. Please use new `theme` config instead."
      );
      registerTheme(getGlobalPrefixCls(), theme);
    } else {
      globalTheme = theme;
    }
  }
};

export const globalConfig = () => ({
  getPrefixCls: (suffixCls?: string, customizePrefixCls?: string) => {
    if (customizePrefixCls) {
      return customizePrefixCls;
    }
    return suffixCls
      ? `${getGlobalPrefixCls()}-${suffixCls}`
      : getGlobalPrefixCls();
  },
  getIconPrefixCls: getGlobalIconPrefixCls,
  getRootPrefixCls: () => {
    // If Global prefixCls provided, use this
    if (globalPrefixCls) {
      return globalPrefixCls;
    }

    // Fallback to default prefixCls
    return getGlobalPrefixCls();
  },
  getTheme: () => globalTheme,
  holderRender: globalHolderRender,
});

const ProviderChildren: React.FC<ProviderChildrenProps> = (props) => {
  const {
    children,
    csp: customCsp,
    autoInsertSpaceInButton,
    alert,
    anchor,
    form,
    locale,
    componentSize,
    direction,
    space,
    splitter,
    virtual,
    dropdownMatchSelectWidth,
    popupMatchSelectWidth,
    popupOverflow,
    legacyLocale,
    parentContext,
    iconPrefixCls: customIconPrefixCls,
    theme,
    componentDisabled,
    segmented,
    statistic,
    spin,
    calendar,
    carousel,
    cascader,
    collapse,
    typography,
    checkbox,
    descriptions,
    divider,
    drawer,
    skeleton,
    steps,
    image,
    layout,
    list,
    mentions,
    modal,
    progress,
    result,
    slider,
    breadcrumb,
    menu,
    pagination,
    input,
    textArea,
    empty,
    badge,
    radio,
    rate,
    switch: SWITCH,
    transfer,
    avatar,
    message,
    tag,
    table,
    card,
    tabs,
    timeline,
    timePicker,
    upload,
    notification,
    tree,
    colorPicker,
    datePicker,
    rangePicker,
    flex,
    wave,
    dropdown,
    warning: warningConfig,
    tour,
    floatButtonGroup,
    variant,
    inputNumber,
    treeSelect,
  } = props;

  // =================================== Context ===================================
  const getPrefixCls = React.useCallback(
    (suffixCls: string, customizePrefixCls?: string) => {
      const { prefixCls } = props;

      if (customizePrefixCls) {
        return customizePrefixCls;
      }

      const mergedPrefixCls = prefixCls || parentContext.getPrefixCls("");

      return suffixCls ? `${mergedPrefixCls}-${suffixCls}` : mergedPrefixCls;
    },
    [parentContext.getPrefixCls, props.prefixCls]
  );

  const iconPrefixCls =
    customIconPrefixCls || parentContext.iconPrefixCls || defaultIconPrefixCls;
  const csp = customCsp || parentContext.csp;

  useStyle(iconPrefixCls, csp);

  const mergedTheme = useTheme(theme, parentContext.theme, {
    prefixCls: getPrefixCls(""),
  });

  if (process.env.NODE_ENV !== "production") {
    existThemeConfig = existThemeConfig || !!mergedTheme;
  }

  const baseConfig = {
    csp,
    autoInsertSpaceInButton,
    alert,
    anchor,
    locale: locale || legacyLocale,
    direction,
    space,
    splitter,
    virtual,
    popupMatchSelectWidth: popupMatchSelectWidth ?? dropdownMatchSelectWidth,
    popupOverflow,
    getPrefixCls,
    iconPrefixCls,
    theme: mergedTheme,
    segmented,
    statistic,
    spin,
    calendar,
    carousel,
    cascader,
    collapse,
    typography,
    checkbox,
    descriptions,
    divider,
    drawer,
    skeleton,
    steps,
    image,
    input,
    textArea,
    layout,
    list,
    mentions,
    modal,
    progress,
    result,
    slider,
    breadcrumb,
    menu,
    pagination,
    empty,
    badge,
    radio,
    rate,
    switch: SWITCH,
    transfer,
    avatar,
    message,
    tag,
    table,
    card,
    tabs,
    timeline,
    timePicker,
    upload,
    notification,
    tree,
    colorPicker,
    datePicker,
    rangePicker,
    flex,
    wave,
    dropdown,
    warning: warningConfig,
    tour,
    floatButtonGroup,
    variant,
    inputNumber,
    treeSelect,
  };

  if (process.env.NODE_ENV !== "production") {
    const warningFn = devUseWarning("ConfigProvider");
    warningFn(
      !("autoInsertSpaceInButton" in props),
      "deprecated",
      "`autoInsertSpaceInButton` is deprecated. Please use `{ button: { autoInsertSpace: boolean }}` instead."
    );
  }

  const config: ConfigConsumerProps = {
    ...parentContext,
  };

  (Object.keys(baseConfig) as (keyof typeof baseConfig)[]).forEach((key) => {
    if (baseConfig[key] !== undefined) {
      (config as any)[key] = baseConfig[key];
    }
  });

  // Pass the props used by `useContext` directly with child component.
  // These props should merged into `config`.
  PASSED_PROPS.forEach((propName) => {
    const propValue = props[propName];
    if (propValue) {
      (config as any)[propName] = propValue;
    }
  });

  if (typeof autoInsertSpaceInButton !== "undefined") {
    // merge deprecated api
    config.button = {
      autoInsertSpace: autoInsertSpaceInButton,
      ...config.button,
    };
  }

  // https://github.com/ant-design/ant-design/issues/27617
  const memoedConfig = useMemo(
    () => config,
    config,
    (prevConfig, currentConfig) => {
      const prevKeys = Object.keys(prevConfig) as Array<keyof typeof config>;
      const currentKeys = Object.keys(currentConfig) as Array<
        keyof typeof config
      >;
      return (
        prevKeys.length !== currentKeys.length ||
        prevKeys.some((key) => prevConfig[key] !== currentConfig[key])
      );
    }
  );

  const memoIconContextValue = React.useMemo(
    () => ({ prefixCls: iconPrefixCls, csp }),
    [iconPrefixCls, csp]
  );

  let childNode = (
    <>
      <PropWarning dropdownMatchSelectWidth={dropdownMatchSelectWidth} />
      {children}
    </>
  );

  const validateMessages = React.useMemo(
    () =>
      merge(
        defaultLocale.Form?.defaultValidateMessages || {},
        memoedConfig.locale?.Form?.defaultValidateMessages || {},
        memoedConfig.form?.validateMessages || {},
        form?.validateMessages || {}
      ),
    [memoedConfig, form?.validateMessages]
  );

  if (Object.keys(validateMessages).length > 0) {
    childNode = (
      <ValidateMessagesContext.Provider value={validateMessages}>
        {childNode}
      </ValidateMessagesContext.Provider>
    );
  }

  if (locale) {
    childNode = (
      <LocaleProvider locale={locale} _ANT_MARK__={ANT_MARK}>
        {childNode}
      </LocaleProvider>
    );
  }

  if (iconPrefixCls || csp) {
    childNode = (
      <IconContext.Provider value={memoIconContextValue}>
        {childNode}
      </IconContext.Provider>
    );
  }

  if (componentSize) {
    childNode = (
      <SizeContextProvider size={componentSize}>
        {childNode}
      </SizeContextProvider>
    );
  }

  // =================================== Motion ===================================
  childNode = <MotionWrapper>{childNode}</MotionWrapper>;

  // ================================ Dynamic theme ================================
  const memoTheme = React.useMemo(() => {
    const { algorithm, token, components, cssVar, ...rest } = mergedTheme || {};
    const themeObj =
      algorithm && (!Array.isArray(algorithm) || algorithm.length > 0)
        ? createTheme(algorithm)
        : defaultTheme;

    const parsedComponents: any = {};
    Object.entries(components || {}).forEach(
      ([componentName, componentToken]) => {
        const parsedToken: typeof componentToken & {
          theme?: typeof defaultTheme;
        } = {
          ...componentToken,
        };
        if ("algorithm" in parsedToken) {
          if (parsedToken.algorithm === true) {
            parsedToken.theme = themeObj;
          } else if (
            Array.isArray(parsedToken.algorithm) ||
            typeof parsedToken.algorithm === "function"
          ) {
            parsedToken.theme = createTheme(parsedToken.algorithm);
          }
          delete parsedToken.algorithm;
        }
        parsedComponents[componentName] = parsedToken;
      }
    );

    const mergedToken = {
      ...defaultSeedToken,
      ...token,
    };

    return {
      ...rest,
      theme: themeObj,

      token: mergedToken,
      components: parsedComponents,
      override: {
        override: mergedToken,
        ...parsedComponents,
      },
      cssVar: cssVar as Exclude<ThemeConfig["cssVar"], boolean>,
    };
  }, [mergedTheme]);

  if (theme) {
    childNode = (
      <DesignTokenContext.Provider value={memoTheme}>
        {childNode}
      </DesignTokenContext.Provider>
    );
  }

  // ================================== Warning ===================================
  if (memoedConfig.warning) {
    childNode = (
      <WarningContext.Provider value={memoedConfig.warning}>
        {childNode}
      </WarningContext.Provider>
    );
  }

  // =================================== Render ===================================
  if (componentDisabled !== undefined) {
    childNode = (
      <DisabledContextProvider disabled={componentDisabled}>
        {childNode}
      </DisabledContextProvider>
    );
  }

  return (
    <ConfigContext.Provider value={memoedConfig}>
      {childNode}
    </ConfigContext.Provider>
  );
};

const ConfigProvider: React.FC<ConfigProviderProps> & {
  /** @private internal Usage. do not use in your production */
  ConfigContext: typeof ConfigContext;
  /** @deprecated Please use `ConfigProvider.useConfig().componentSize` instead */
  SizeContext: typeof SizeContext;
  config: typeof setGlobalConfig;
  useConfig: typeof useConfig;
} = (props) => {
  const context = React.useContext<ConfigConsumerProps>(ConfigContext);
  const antLocale = React.useContext<LocaleContextProps | undefined>(
    LocaleContext
  );
  return (
    <ProviderChildren
      parentContext={context}
      legacyLocale={antLocale!}
      {...props}
    />
  );
};

ConfigProvider.ConfigContext = ConfigContext;
ConfigProvider.SizeContext = SizeContext;
ConfigProvider.config = setGlobalConfig;
ConfigProvider.useConfig = useConfig;

Object.defineProperty(ConfigProvider, "SizeContext", {
  get: () => {
    warning(
      false,
      "ConfigProvider",
      "ConfigProvider.SizeContext is deprecated. Please use `ConfigProvider.useConfig().componentSize` instead."
    );
    return SizeContext;
  },
});

if (process.env.NODE_ENV !== "production") {
  ConfigProvider.displayName = "ConfigProvider";
}

export default ConfigProvider;
```

#### DisabledContext

用于管理某些功能的启用或禁用状态。

```jsx
import * as React from "react";

const DisabledContext = React.createContext < boolean > false;

export interface DisabledContextProps {
  disabled?: boolean;
  children?: React.ReactNode;
}

export const DisabledContextProvider: React.FC<DisabledContextProps> = ({
  children,
  disabled,
}) => {
  const originDisabled = React.useContext(DisabledContext);
  return (
    <DisabledContext.Provider value={disabled ?? originDisabled}>
      {children}
    </DisabledContext.Provider>
  );
};

export default DisabledContext;
```

#### SizeContext

用于管理应用程序中组件的尺寸设置。

```tsx
import * as React from "react";

export type SizeType = "small" | "middle" | "large" | undefined;

const SizeContext = React.createContext<SizeType>(undefined);

export interface SizeContextProps {
  size?: SizeType;
  children?: React.ReactNode;
}

export const SizeContextProvider: React.FC<SizeContextProps> = ({
  children,
  size,
}) => {
  const originSize = React.useContext<SizeType>(SizeContext);
  return (
    <SizeContext.Provider value={size || originSize}>
      {children}
    </SizeContext.Provider>
  );
};

export default SizeContext;
```

#### useSize

用于从上下文或 customSize 中获取和计算组件的尺寸值。

```tsx
/**
 * 用于从上下文或 customSize 中获取和计算组件的尺寸值。
 */
import React from "react";

import type { SizeType } from "../SizeContext";
import SizeContext from "../SizeContext";

const useSize = <T,>(customSize?: T | ((ctxSize: SizeType) => T)): T => {
  const size = React.useContext<SizeType>(SizeContext);
  const mergedSize = React.useMemo<T>(() => {
    if (!customSize) {
      return size as T;
    }
    if (typeof customSize === "string") {
      return customSize ?? size;
    }
    if (customSize instanceof Function) {
      return customSize(size);
    }
    return size as T;
  }, [customSize, size]);
  return mergedSize;
};

export default useSize;
```

#### Compact

用于处理紧凑布局的 UI 组件。

```tsx
import * as React from "react";
import classNames from "classnames";
import toArray from "rc-util/lib/Children/toArray";

import type { DirectionType } from "../config-provider";
import { ConfigContext } from "../config-provider";
import useSize from "../config-provider/hooks/useSize";
import type { SizeType } from "../config-provider/SizeContext";
import useStyle from "./style";

/**
 * compactSize - 尺寸
 * compactDirection - 方向
 * isFirstItem - 是否为首项
 * isLastItem - 是否为尾项
 */
export interface SpaceCompactItemContextType {
  compactSize?: SizeType;
  compactDirection?: "horizontal" | "vertical";
  isFirstItem?: boolean;
  isLastItem?: boolean;
}

/**
 * 紧凑项相关信息的上下文
 */
export const SpaceCompactItemContext =
  React.createContext<SpaceCompactItemContextType | null>(null);

export const useCompactItemContext = (
  prefixCls: string,
  direction: DirectionType
) => {
  const compactItemContext = React.useContext(SpaceCompactItemContext);

  // 计算类名，考虑 direction、compactDirection、isFirstItem、isLastItem 等
  const compactItemClassnames = React.useMemo<string>(() => {
    if (!compactItemContext) {
      return "";
    }
    const { compactDirection, isFirstItem, isLastItem } = compactItemContext;
    const separator = compactDirection === "vertical" ? "-vertical-" : "-";

    return classNames(`${prefixCls}-compact${separator}item`, {
      [`${prefixCls}-compact${separator}first-item`]: isFirstItem,
      [`${prefixCls}-compact${separator}last-item`]: isLastItem,
      [`${prefixCls}-compact${separator}item-rtl`]: direction === "rtl",
    });
  }, [prefixCls, direction, compactItemContext]);

  return {
    compactSize: compactItemContext?.compactSize,
    compactDirection: compactItemContext?.compactDirection,
    compactItemClassnames,
  };
};

// 不使用紧凑样式
export const NoCompactStyle: React.FC<React.PropsWithChildren<unknown>> = ({
  children,
}) => (
  <SpaceCompactItemContext.Provider value={null}>
    {children}
  </SpaceCompactItemContext.Provider>
);

/**
 * prefixCls - CSS 前缀
 * size - 尺寸
 * direction - 方向
 * block - 块级元素标识
 * rootClassName - 根类名
 */
export interface SpaceCompactProps
  extends React.HTMLAttributes<HTMLDivElement> {
  prefixCls?: string;
  size?: SizeType;
  direction?: "horizontal" | "vertical";
  block?: boolean;
  rootClassName?: string;
}

const CompactItem: React.FC<
  React.PropsWithChildren<SpaceCompactItemContextType>
> = ({ children, ...otherProps }) => (
  <SpaceCompactItemContext.Provider value={otherProps}>
    {children}
  </SpaceCompactItemContext.Provider>
);

const Compact: React.FC<SpaceCompactProps> = (props) => {
  const { getPrefixCls, direction: directionConfig } =
    React.useContext(ConfigContext);

  const {
    size,
    direction,
    block,
    prefixCls: customizePrefixCls,
    className,
    rootClassName,
    children,
    ...restProps
  } = props;

  const mergedSize = useSize((ctx) => size ?? ctx);

  const prefixCls = getPrefixCls("space-compact", customizePrefixCls);
  const [wrapCSSVar, hashId] = useStyle(prefixCls);
  const clx = classNames(
    prefixCls,
    hashId,
    {
      [`${prefixCls}-rtl`]: directionConfig === "rtl",
      [`${prefixCls}-block`]: block,
      [`${prefixCls}-vertical`]: direction === "vertical",
    },
    className,
    rootClassName
  );

  const compactItemContext = React.useContext(SpaceCompactItemContext);

  const childNodes = toArray(children);
  const nodes = React.useMemo(
    () =>
      // 映射每个子元素到 CompactItem
      childNodes.map((child, i) => {
        const key = child?.key || `${prefixCls}-item-${i}`;
        return (
          <CompactItem
            key={key}
            compactSize={mergedSize}
            compactDirection={direction}
            isFirstItem={
              i === 0 &&
              (!compactItemContext || compactItemContext?.isFirstItem)
            }
            isLastItem={
              i === childNodes.length - 1 &&
              (!compactItemContext || compactItemContext?.isLastItem)
            }
          >
            {child}
          </CompactItem>
        );
      }),
    [size, childNodes, compactItemContext]
  );

  // =========================== Render ===========================
  if (childNodes.length === 0) {
    return null;
  }

  return wrapCSSVar(
    <div className={clx} {...restProps}>
      {nodes}
    </div>
  );
};

export default Compact;
```

#### reactNode

```ts
import React from "react";

import type { AnyObject } from "./type";

/**
 * 检查 child 是否是 React Fragment
 */
export function isFragment(child: any): boolean {
  return child && React.isValidElement(child) && child.type === React.Fragment;
}

type RenderProps =
  | AnyObject
  | ((originProps: AnyObject) => AnyObject | undefined);

/**
 * 替换 React 元素
 */
export const replaceElement = <P>(
  element: React.ReactNode,
  replacement: React.ReactNode,
  props?: RenderProps
) => {
  if (!React.isValidElement<P>(element)) {
    return replacement;
  }
  return React.cloneElement<P>(
    element,
    typeof props === "function" ? props(element.props || {}) : props
  );
};

/**
 * 克隆 React 元素
 */
export function cloneElement<P>(element: React.ReactNode, props?: RenderProps) {
  return replaceElement<P>(element, element, props) as React.ReactElement;
}
```

#### buttonHelpers

```tsx
import React from "react";

import { cloneElement, isFragment } from "../_util/reactNode";
import type { BaseButtonProps, LegacyButtonType } from "./button";

/**
 * 是否由两个中文字符组成
 */
const rxTwoCNChar = /^[\u4E00-\u9FA5]{2}$/;
export const isTwoCNChar = rxTwoCNChar.test.bind(rxTwoCNChar);

/**
 * 将旧版按钮类型转换为新版按钮类型
 */
export function convertLegacyProps(
  type?: LegacyButtonType
): Pick<BaseButtonProps, "danger" | "type"> {
  if (type === "danger") {
    return { danger: true };
  }
  return { type };
}

/**
 * 是否为字符串
 */
export function isString(str: any): str is string {
  return typeof str === "string";
}

/**
 * 是否为无边框样式
 */
export function isUnBorderedButtonVariant(type?: ButtonVariantType) {
  return type === "text" || type === "link";
}

/**
 * 处理子元素，在两个中文字符之间插入空格
 */
function splitCNCharsBySpace(
  child: React.ReactElement | string | number,
  needInserted: boolean
) {
  if (child === null || child === undefined) {
    return;
  }

  const SPACE = needInserted ? " " : "";

  if (
    typeof child !== "string" &&
    typeof child !== "number" &&
    isString(child.type) &&
    isTwoCNChar(child.props.children)
  ) {
    return cloneElement(child, {
      children: child.props.children.split("").join(SPACE),
    });
  }

  if (isString(child)) {
    return isTwoCNChar(child) ? (
      <span>{child.split("").join(SPACE)}</span>
    ) : (
      <span>{child}</span>
    );
  }

  if (isFragment(child)) {
    return <span>{child}</span>;
  }

  return child;
}

/**
 * 处理子元素，将相邻的字符串或数字合并为一个元素，并在需要时插入空格
 */
export function spaceChildren(
  children: React.ReactNode,
  needInserted: boolean
) {
  let isPrevChildPure = false;
  const childList: React.ReactNode[] = [];

  React.Children.forEach(children, (child) => {
    const type = typeof child;
    const isCurrentChildPure = type === "string" || type === "number";
    // 前一个子元素和当前子元素都是纯字符串或数字，则将它们合并
    if (isPrevChildPure && isCurrentChildPure) {
      const lastIndex = childList.length - 1;
      const lastChild = childList[lastIndex];
      childList[lastIndex] = `${lastChild}${child}`;
    } else {
      childList.push(child);
    }

    isPrevChildPure = isCurrentChildPure;
  });

  return React.Children.map(childList, (child) =>
    splitCNCharsBySpace(
      child as React.ReactElement | string | number,
      needInserted
    )
  );
}

/**
 * 按钮类型
 */
const _ButtonTypes = ["default", "primary", "dashed", "link", "text"] as const;
export type ButtonType = (typeof _ButtonTypes)[number];

/**
 * 按钮形状
 */
const _ButtonShapes = ["default", "circle", "round"] as const;
export type ButtonShape = (typeof _ButtonShapes)[number];

/**
 * 按钮原生的 type 值
 */
const _ButtonHTMLTypes = ["submit", "button", "reset"] as const;
export type ButtonHTMLType = (typeof _ButtonHTMLTypes)[number];

/**
 * 按钮变体
 */
export const _ButtonVariantTypes = [
  "outlined",
  "dashed",
  "solid",
  "filled",
  "text",
  "link",
] as const;
export type ButtonVariantType = (typeof _ButtonVariantTypes)[number];

/**
 * 按钮颜色
 */
export const _ButtonColorTypes = ["default", "primary", "danger"] as const;
export type ButtonColorType = (typeof _ButtonColorTypes)[number];
```

#### IconWrapper

用于包装图标元素的组件。

```tsx
import React, { forwardRef } from "react";
import classNames from "classnames";

export type IconWrapperProps = {
  prefixCls: string;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
};

const IconWrapper = forwardRef<HTMLSpanElement, IconWrapperProps>(
  (props, ref) => {
    const { className, style, children, prefixCls } = props;

    const iconWrapperCls = classNames(`${prefixCls}-icon`, className);

    return (
      <span ref={ref} className={iconWrapperCls} style={style}>
        {children}
      </span>
    );
  }
);

export default IconWrapper;
```

#### LoadingIcon

用于显示一个加载状态的图标，并结合动画效果的组件。

```tsx
import React, { forwardRef } from "react";
import LoadingOutlined from "@ant-design/icons/LoadingOutlined";
import classNames from "classnames";
import CSSMotion from "rc-motion";

import IconWrapper from "./IconWrapper";

type InnerLoadingIconProps = {
  prefixCls: string;
  className?: string;
  style?: React.CSSProperties;
  iconClassName?: string;
};

/**
 * 内层加载图标
 */
const InnerLoadingIcon = forwardRef<HTMLSpanElement, InnerLoadingIconProps>(
  (props, ref) => {
    const { prefixCls, className, style, iconClassName } = props;
    const mergedIconCls = classNames(`${prefixCls}-loading-icon`, className);

    return (
      <IconWrapper
        prefixCls={prefixCls}
        className={mergedIconCls}
        style={style}
        ref={ref}
      >
        <LoadingOutlined className={iconClassName} />
      </IconWrapper>
    );
  }
);

export type LoadingIconProps = {
  prefixCls: string;
  existIcon: boolean;
  loading?: boolean | object;
  className?: string;
  style?: React.CSSProperties;
};

/**
 * 动画宽度计算函数
 */
const getCollapsedWidth = (): React.CSSProperties => ({
  width: 0,
  opacity: 0,
  transform: "scale(0)",
});

const getRealWidth = (node: HTMLElement): React.CSSProperties => ({
  width: node.scrollWidth,
  opacity: 1,
  transform: "scale(1)",
});

const LoadingIcon: React.FC<LoadingIconProps> = (props) => {
  const { prefixCls, loading, existIcon, className, style } = props;
  const visible = !!loading;

  if (existIcon) {
    return (
      <InnerLoadingIcon
        prefixCls={prefixCls}
        className={className}
        style={style}
      />
    );
  }

  // 过渡动画
  return (
    <CSSMotion
      visible={visible}
      // We do not really use this motionName
      motionName={`${prefixCls}-loading-icon-motion`}
      motionLeave={visible}
      removeOnLeave
      onAppearStart={getCollapsedWidth}
      onAppearActive={getRealWidth}
      onEnterStart={getCollapsedWidth}
      onEnterActive={getRealWidth}
      onLeaveStart={getRealWidth}
      onLeaveActive={getCollapsedWidth}
    >
      {(
        { className: motionCls, style: motionStyle },
        ref: React.Ref<HTMLSpanElement>
      ) => (
        <InnerLoadingIcon
          prefixCls={prefixCls}
          className={className}
          style={{ ...style, ...motionStyle }}
          ref={ref}
          iconClassName={motionCls}
        />
      )}
    </CSSMotion>
  );
};

export default LoadingIcon;
```

### Types

```tsx
export type LegacyButtonType = ButtonType | "danger";

export interface BaseButtonProps {
  // 按钮类型
  type?: ButtonType;
  // 按钮颜色
  color?: ButtonColorType;
  // 按钮变体
  variant?: ButtonVariantType;
  // 按钮的图标组件
  icon?: React.ReactNode;
  // 按钮的图标组件的位置
  iconPosition?: "start" | "end";
  // 按钮形状
  shape?: ButtonShape;
  // 按钮尺寸
  size?: SizeType;
  // 按钮失效状态
  disabled?: boolean;
  // 按钮载入状态
  loading?: boolean | { delay?: number };
  // 类前缀
  prefixCls?: string;
  // 类名
  className?: string;
  // 根类名
  rootClassName?: string;
  // 幽灵属性，按钮背景透明
  ghost?: boolean;
  // 危险按钮
  danger?: boolean;
  // 按钮宽度调整为其父宽度的选项
  block?: boolean;
  children?: React.ReactNode;
  [key: `data-${string}`]: string;
  // 语义化结构 class
  classNames?: { icon: string };
  // 语义化结构 style
  styles?: { icon: React.CSSProperties };
}

type MergedHTMLAttributes = Omit<
  React.HTMLAttributes<HTMLElement> &
    React.ButtonHTMLAttributes<HTMLElement> &
    React.AnchorHTMLAttributes<HTMLElement>,
  "type" | "color"
>;

export interface ButtonProps extends BaseButtonProps, MergedHTMLAttributes {
  // 点击跳转的地址
  href?: string;
  // 设置 button 原生的 type 值
  htmlType?: ButtonHTMLType;
  // 默认提供两个汉字之间的空格
  autoInsertSpace?: boolean;
}

// 按钮载入状态
type LoadingConfigType = {
  loading: boolean;
  delay: number;
};

type ColorVariantPairType = [
  color?: ButtonColorType,
  variant?: ButtonVariantType
];
```

### Composed

```tsx
/**
 * 获取 loading 配置
 */
function getLoadingConfig(
  loading: BaseButtonProps["loading"]
): LoadingConfigType {
  if (typeof loading === "object" && loading) {
    let delay = loading?.delay;
    delay = !Number.isNaN(delay) && typeof delay === "number" ? delay : 0;
    return {
      loading: delay <= 0,
      delay,
    };
  }

  return {
    loading: !!loading,
    delay: 0,
  };
}

/**
 * 按钮类型映射 - 颜色、变体
 */
const ButtonTypeMap: Partial<Record<ButtonType, ColorVariantPairType>> = {
  default: ["default", "outlined"],
  primary: ["primary", "solid"],
  dashed: ["default", "dashed"],
  link: ["primary", "link"],
  text: ["default", "text"],
};

const InternalCompoundedButton = React.forwardRef<
  HTMLButtonElement | HTMLAnchorElement,
  ButtonProps
>((props, ref) => {
  const {
    loading = false,
    prefixCls: customizePrefixCls,
    color,
    variant,
    type,
    danger = false,
    shape = "default",
    size: customizeSize,
    styles,
    disabled: customDisabled,
    className,
    rootClassName,
    children,
    icon,
    iconPosition = "start",
    ghost = false,
    block = false,
    // React does not recognize the `htmlType` prop on a DOM element. Here we pick it out of `rest`.
    htmlType = "button",
    classNames: customClassNames,
    style: customStyle = {},
    autoInsertSpace,
    ...rest
  } = props;

  // https://github.com/ant-design/ant-design/issues/47605
  // Compatible with original `type` behavior
  // 合并类型
  const mergedType = type || "default";

  // 合并颜色和变体
  const [mergedColor, mergedVariant] = useMemo<ColorVariantPairType>(() => {
    if (color && variant) {
      return [color, variant];
    }

    const colorVariantPair = ButtonTypeMap[mergedType] || [];

    if (danger) {
      return ["danger", colorVariantPair[1]];
    }

    return colorVariantPair;
  }, [type, color, variant, danger]);

  const isDanger = mergedColor === "danger";
  const mergedColorText = isDanger ? "dangerous" : mergedColor;

  const { getPrefixCls, direction, button } = useContext(ConfigContext);

  // 默认提供两个汉字之间的空格
  const mergedInsertSpace = autoInsertSpace ?? button?.autoInsertSpace ?? true;

  const prefixCls = getPrefixCls("btn", customizePrefixCls);

  const [wrapCSSVar, hashId, cssVarCls] = useStyle(prefixCls);

  // 按钮失效状态
  const disabled = useContext(DisabledContext);
  const mergedDisabled = customDisabled ?? disabled;

  const groupSize = useContext(GroupSizeContext);

  // loading 配置
  const loadingOrDelay = useMemo<LoadingConfigType>(
    () => getLoadingConfig(loading),
    [loading]
  );

  const [innerLoading, setLoading] = useState<boolean>(loadingOrDelay.loading);

  const [hasTwoCNChar, setHasTwoCNChar] = useState<boolean>(false);

  const internalRef = createRef<HTMLButtonElement | HTMLAnchorElement>();

  const buttonRef = composeRef(ref, internalRef);

  const needInserted =
    Children.count(children) === 1 &&
    !icon &&
    !isUnBorderedButtonVariant(mergedVariant);

  // loading delay timer
  useEffect(() => {
    let delayTimer: ReturnType<typeof setTimeout> | null = null;
    if (loadingOrDelay.delay > 0) {
      delayTimer = setTimeout(() => {
        delayTimer = null;
        setLoading(true);
      }, loadingOrDelay.delay);
    } else {
      setLoading(loadingOrDelay.loading);
    }

    function cleanupTimer() {
      if (delayTimer) {
        clearTimeout(delayTimer);
        delayTimer = null;
      }
    }

    return cleanupTimer;
  }, [loadingOrDelay]);

  useEffect(() => {
    // FIXME: for HOC usage like <FormatMessage />
    if (!buttonRef || !(buttonRef as any).current || !mergedInsertSpace) {
      return;
    }
    // 获取按钮的文本内容
    const buttonText = (buttonRef as any).current.textContent;
    if (needInserted && isTwoCNChar(buttonText)) {
      if (!hasTwoCNChar) {
        // 文本是否由两个中文字符组成
        setHasTwoCNChar(true);
      }
    } else if (hasTwoCNChar) {
      setHasTwoCNChar(false);
    }
  }, [buttonRef]);

  const handleClick = React.useCallback(
    (
      e: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement, MouseEvent>
    ) => {
      // FIXME: https://github.com/ant-design/ant-design/issues/30207
      // 按钮处于加载或禁用状态，阻止点击
      if (innerLoading || mergedDisabled) {
        e.preventDefault();
        return;
      }
      props.onClick?.(e);
    },
    [props.onClick, innerLoading, mergedDisabled]
  );

  // 警告信息
  if (process.env.NODE_ENV !== "production") {
    const warning = devUseWarning("Button");

    warning(
      !(typeof icon === "string" && icon.length > 2),
      "breaking",
      `\`icon\` is using ReactNode instead of string naming in v4. Please check \`${icon}\` at https://ant.design/components/icon`
    );

    warning(
      !(ghost && isUnBorderedButtonVariant(mergedVariant)),
      "usage",
      "`link` or `text` button can't be a `ghost` button."
    );
  }

  // 处理按钮样式
  const { compactSize, compactItemClassnames } = useCompactItemContext(
    prefixCls,
    direction
  );

  const sizeClassNameMap = { large: "lg", small: "sm", middle: undefined };

  const sizeFullName = useSize(
    (ctxSize) => customizeSize ?? compactSize ?? groupSize ?? ctxSize
  );

  const sizeCls = sizeFullName ? sizeClassNameMap[sizeFullName] ?? "" : "";

  const iconType = innerLoading ? "loading" : icon;

  const linkButtonRestProps = omit(rest as ButtonProps & { navigate: any }, [
    "navigate",
  ]);

  const classes = classNames(
    prefixCls,
    hashId,
    cssVarCls,
    {
      [`${prefixCls}-${shape}`]: shape !== "default" && shape,
      // line(253 - 254): Compatible with versions earlier than 5.21.0
      [`${prefixCls}-${mergedType}`]: mergedType,
      [`${prefixCls}-dangerous`]: danger,
      [`${prefixCls}-color-${mergedColorText}`]: mergedColorText,
      [`${prefixCls}-variant-${mergedVariant}`]: mergedVariant,
      [`${prefixCls}-${sizeCls}`]: sizeCls,
      [`${prefixCls}-icon-only`]: !children && children !== 0 && !!iconType,
      [`${prefixCls}-background-ghost`]:
        ghost && !isUnBorderedButtonVariant(mergedVariant),
      [`${prefixCls}-loading`]: innerLoading,
      [`${prefixCls}-two-chinese-chars`]:
        hasTwoCNChar && mergedInsertSpace && !innerLoading,
      [`${prefixCls}-block`]: block,
      [`${prefixCls}-rtl`]: direction === "rtl",
      [`${prefixCls}-icon-end`]: iconPosition === "end",
    },
    compactItemClassnames,
    className,
    rootClassName,
    button?.className
  );

  const fullStyle: React.CSSProperties = { ...button?.style, ...customStyle };

  const iconClasses = classNames(
    customClassNames?.icon,
    button?.classNames?.icon
  );
  const iconStyle: React.CSSProperties = {
    ...(styles?.icon || {}),
    ...(button?.styles?.icon || {}),
  };

  // 图标组件
  const iconNode =
    icon && !innerLoading ? (
      <IconWrapper
        prefixCls={prefixCls}
        className={iconClasses}
        style={iconStyle}
      >
        {icon}
      </IconWrapper>
    ) : (
      <LoadingIcon
        existIcon={!!icon}
        prefixCls={prefixCls}
        loading={innerLoading}
      />
    );

  const kids =
    children || children === 0
      ? spaceChildren(children, needInserted && mergedInsertSpace)
      : null;

  // 渲染 <a> 标签
  if (linkButtonRestProps.href !== undefined) {
    return wrapCSSVar(
      <a
        {...linkButtonRestProps}
        className={classNames(classes, {
          [`${prefixCls}-disabled`]: mergedDisabled,
        })}
        href={mergedDisabled ? undefined : linkButtonRestProps.href}
        style={fullStyle}
        onClick={handleClick}
        ref={buttonRef as React.Ref<HTMLAnchorElement>}
        tabIndex={mergedDisabled ? -1 : 0}
      >
        {iconNode}
        {kids}
      </a>
    );
  }

  // 渲染 <button> 标签
  let buttonNode = (
    <button
      {...rest}
      type={htmlType}
      className={classes}
      style={fullStyle}
      onClick={handleClick}
      disabled={mergedDisabled}
      ref={buttonRef as React.Ref<HTMLButtonElement>}
    >
      {iconNode}
      {kids}
      {/* Styles: compact */}
      {!!compactItemClassnames && (
        <CompactCmp key="compact" prefixCls={prefixCls} />
      )}
    </button>
  );

  // 无边框样式按钮添加波纹效果
  if (!isUnBorderedButtonVariant(mergedVariant)) {
    buttonNode = (
      <Wave component="Button" disabled={innerLoading}>
        {buttonNode}
      </Wave>
    );
  }
  return wrapCSSVar(buttonNode);
});

type CompoundedComponent = typeof InternalCompoundedButton & {
  Group: typeof Group;
  /** @internal */
  __ANT_BUTTON: boolean;
};

const Button = InternalCompoundedButton as CompoundedComponent;

Button.Group = Group;
Button.__ANT_BUTTON = true;

if (process.env.NODE_ENV !== "production") {
  Button.displayName = "Button";
}

export default Button;
```

## Button.Group

用作按钮组的包装器组件，方便为一组按钮提供一致的样式、尺寸及其布局方向等相关属性。

### Composed

```tsx
import * as React from "react";
import classNames from "classnames";

import { devUseWarning } from "../_util/warning";
import { ConfigContext } from "../config-provider";
import type { SizeType } from "../config-provider/SizeContext";
import { useToken } from "../theme/internal";

export interface ButtonGroupProps {
  size?: SizeType;
  style?: React.CSSProperties;
  className?: string;
  prefixCls?: string;
  children?: React.ReactNode;
}

// 共享按钮组件尺寸状态
export const GroupSizeContext = React.createContext<SizeType>(undefined);

const ButtonGroup: React.FC<ButtonGroupProps> = (props) => {
  const { getPrefixCls, direction } = React.useContext(ConfigContext);

  const { prefixCls: customizePrefixCls, size, className, ...others } = props;
  const prefixCls = getPrefixCls("btn-group", customizePrefixCls);

  const [, , hashId] = useToken();

  let sizeCls = "";

  // 处理 size
  switch (size) {
    case "large":
      sizeCls = "lg";
      break;
    case "small":
      sizeCls = "sm";
      break;
    default:
    // Do nothing
  }

  // 警告信息
  if (process.env.NODE_ENV !== "production") {
    const warning = devUseWarning("Button.Group");

    warning(
      !size || ["large", "small", "middle"].includes(size),
      "usage",
      "Invalid prop `size`."
    );
  }

  const classes = classNames(
    prefixCls,
    {
      [`${prefixCls}-${sizeCls}`]: sizeCls,
      [`${prefixCls}-rtl`]: direction === "rtl",
    },
    className,
    hashId
  );

  return (
    <GroupSizeContext.Provider value={size}>
      <div {...others} className={classes} />
    </GroupSizeContext.Provider>
  );
};

export default ButtonGroup;
```
