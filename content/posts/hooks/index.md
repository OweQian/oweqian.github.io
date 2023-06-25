---
title: "‍💻 React v16.8 hooks API 的介绍和使用"
date: 2023-06-25T10:10:07+08:00
tags: ["第一技能"]
categories: ["第一技能"]
---

工欲善其事必先利其器，想要玩转 React Hooks，就必须知道 React 官方提供了哪些 Hooks，如何去使用这些 Hooks。    

<!--more-->    

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/hooks/hooks.png" alt="" />    

项目地址： [Hooks](https://github.com/OweQian/hooks.git)

### useState

定义变量，使其具备类组件的 state，拥有更新视图的能力。    

#### 介绍     

```
const [state, setState] = useState(initData)
```

参数：   

* initData: 默认初始值。两种情况：函数和非函数。如果是函数，则用函数的返回值作为初始值。   

返回值：    

* state: 用于渲染 UI 层的数据源。    
* setState: 更新数据源的函数，类似于类组件的 this.setState。   

#### 使用

```tsx
"use client"
import {useState} from 'react';
import {Button, Card, Space} from 'antd';
export default () => {
  const [count, setCount] = useState<number>(0);

  return (
    <Card title="useState example" bordered={false} style={{ width: '100%' }}>
      <div>数字：{count}</div>
      <Space>
        <Button type="primary" onClick={() => setCount(count + 1)}>
          第一种方式 +1
        </Button>
        <Button type="primary" onClick={() => setCount((value) => value + 1)}>
          第二种方式 +1
        </Button>
      </Space>
    </Card>
  )
}
```

效果：    

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/hooks/img_02.png" alt="" />    

> 注：useState 类似于 PureComponent，会进行一个浅层比较，如果是对象直接传入，并不会实时更新。       

### useEffect

副作用，弥补函数组件没有生命周期的缺陷。     

#### 介绍  

```
useEffect(() => {
  return destory;
}, deps)
```

参数：       

* callback: 第一个入参，最终返回 destory，在下一次 callback 执行之前调用，清除上一次的 callback 产生的副作用。    
* deps: 依赖项数组，可选参数，通过依赖改变，执行上一次的 callback 返回的 destory 和新的 effect 第一个参数 callback。    

#### 使用

##### 模拟挂载和卸载       

destory 会用在组件卸载阶段上，可以把它当做组件卸载时会执行的方法，通常用于监听 addEventListener 和 removeListener 上。   

```tsx
"use client"
import {useEffect, useState} from "react";
import {Button, Card} from "antd";

const Child = () => {
  useEffect(() => {
    console.log('挂载');
    return () => {
      console.log('卸载');
    };
  }, [])
  return <div>大家好</div>
}

export default () => {
  const [flag, setFlag] = useState<boolean>(false);
  return (
    <Card title="useEffect example" bordered={false} style={{ width: '100%' }}>
      <Button type="primary" onClick={() => setFlag(value => !value)}>{flag ? '卸载' : '挂载'}</Button>
      {flag && <Child />}
    </Card>
  )
};
```

效果：   

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/hooks/img_03.png" alt="" />  

##### 依赖变化        

dep 里的依赖项变化会影响 callback 的执行。    

```tsx
"use client"
import {useEffect, useState} from "react";
import {Button, Card, Space} from "antd";

export default () => {
  const [number, setNumber] = useState<number>(0);
  const [count, setCount] = useState<number>(0);

  useEffect(() => {
    console.log('count变化才会执行')
  }, [count]);

  return (
    <Card title="useEffect example" bordered={false} style={{ width: '100%' }}>
      <div>number: {number} count: {count}</div>
      <Space>
        <Button type="primary" onClick={() => setNumber(value => value + 1)}>number + 1</Button>
        <Button type="primary" onClick={() => setCount(value => value + 1)}>count + 1</Button>
      </Space>
    </Card>
  )
};
```

效果：    

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/hooks/img_04.png" alt="" />  

##### 无限执行

当 useEffect 的 deps 参数不存在时，会无限执行。即只要数据源发生变化，函数就会执行。    

```tsx
"use client"
import {useEffect, useState} from "react";
import {Button, Card, Space} from "antd";

export default () => {
  const [count, setCount] = useState<number>(0);
  const [flag, setFlag] = useState<boolean>(false);

  useEffect(() => {
    console.log('大家好');
  });

  return (
    <Card title="useEffect example" bordered={false} style={{ width: '100%' }}>
      <Space>
        <Button type="primary" onClick={() => setCount(value => value + 1)}>数字加一：{count}</Button>
        <Button type="primary" onClick={() => setFlag(value => !value)}>状态转换：{JSON.stringify(flag)}</Button>
      </Space>
    </Card>
  )
}
```

效果：    

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/hooks/img_05.png" alt="" />  

### useContext

上下文，设置全局共享数据，使所有组件可跨层级实现共享。    

#### 介绍  

```
const contextValue = useContext(context)
```

参数：   

* context: context 对象。   

返回值：   

* contextValue：context 对象里保存的 value 值。    

#### 使用   

```tsx
"use client"
import {createContext, useContext, useState} from "react";
import {Button, Card} from "antd";

const CountContext = createContext(-1);

const Child = () => {
  const count = useContext(CountContext);

  return (
    <div style={{marginTop: '20px'}}>
      子组件获取到的 count: {count}
      <Son />
    </div>
  )
}

const Son = () => {
  const count = useContext(CountContext);

  return (
    <div style={{marginTop: '20px'}}>
      孙组件获取到的 count: {count}
    </div>
  )
}

export default () => {
  let [count, setCount] = useState(0);

  return (
    <Card title="useContext example" bordered={false} style={{ width: '100%' }}>
      <div>父组件中的 count：{count}</div>
      <Button type="primary" onClick={() => setCount(value => value + 1)}>
        点击 +1
      </Button>
      <CountContext.Provider value={count}>
        <Child />
      </CountContext.Provider>
    </Card>
  )
}
```

效果：   

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/hooks/img_06.png" alt="" />  

### useReducer

单个组件的状态管理，用于处理复杂的 state 变化。    

#### 介绍

```
const [state, dispatch] = useReducer(
  (state, payload) => {},
  initialArg,
  init
)
```

参数：   

* reducer：函数，类似于 redux 中的 reducer，返回的值是新的数据源 state。   
* initialArg：初始默认值。    
* init：惰性初始化，可选值。    

返回值：   

* state：更新后的数据源。    
* dispatch：用于派发更新的 dispatchAction。     

#### 使用  

```tsx
"use client"
import {useReducer, useState} from 'react';
import {Button, Card, Space} from 'antd';

export default () => {
  const [count, dispatch] = useReducer((state: number, action: any) => {
    switch (action?.type) {
      case 'add':
        return state + action?.payload;
      case 'sub':
        return state - action?.payload;
      default:
        return state;
    }
  }, 0);
  return (
    <Card title="useReducer example" bordered={false} style={{ width: '100%' }}>
      <div>数字：{count}</div>
      <Space>
        <Button type="primary" onClick={() => dispatch({type: 'add', payload: 1})}>
          第一种方式 +1
        </Button>
        <Button type="primary" onClick={() => dispatch({type: 'sub', payload: 1})}>
          第二种方式 -1
        </Button>
      </Space>
    </Card>
  )
}
```

效果：   

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/hooks/img_07.png" alt="" />  

> 在 reducer 中，如果返回的 state 和之前的 state 值相同，那么该组件的子组件将不会更新。   

```tsx
"use client"
import {useReducer} from 'react';
import {Button, Card, Space} from 'antd';

const Child = ({ count }) => {
  console.log('子组件发生更新');
  return <div>在子组件的count：{count}</div>;
};

export default () => {
  const [count, dispatch] = useReducer((state: number, action: any) => {
    switch (action?.type) {
      case 'add':
        return state + action?.payload;
      case 'sub':
        return state - action?.payload;
      default:
        return state;
    }
  }, 0);
  console.log('父组件发生更新');
  return (
    <Card title="useReducer example" bordered={false} style={{ width: '100%' }}>
      <div>数字：{count}</div>
      <Space>
        <Button type="primary" onClick={() => dispatch({type: 'add', payload: 1})}>
          第一种方式 +1
        </Button>
        <Button type="primary" onClick={() => dispatch({type: 'sub', payload: 1})}>
          第二种方式 -1
        </Button>
        <Button type="primary" onClick={() => dispatch({ type: 'no', payload: 1 })}>
          无关按钮
        </Button>
      </Space>
      <Child count={count} />
    </Card>
  )
}
```

效果：    

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/hooks/img_08.png" alt="" />  

### useMemo

根据当前的限定条件是否改变来决定是否执行 fn 函数，得到新的缓存值。    

#### 介绍

```
const cacheData = useMemo(fn, deps)
```

参数：    

* fn：函数，返回的值作为缓存值。    
* deps：依赖项数组，通过数组里的值是否改变来进行 fn 的调用，得到新的缓存值。    

返回值：   

* cacheData：更新后的数据源，即 fn 的返回值，如果 deps 中的依赖值发生改变，将重新执行 fn，否则取上一次的缓存值。   

#### 使用  

```tsx
"use client"
import {useState} from 'react';
import {Button, Card} from 'antd';

const usePow = (list: number[]) => {
  return list.map((item: number) => {
    console.log('我是usePow');
    return Math.pow(item, 2);
  })
}
export default () => {
  const [flag, setFlag] = useState<boolean>(true);
  const data = usePow([1, 2, 3]);
  return (
    <Card title="useMemo example" bordered={false} style={{ width: '100%' }}>
      <div>数字：{count}</div>
      <Space>
        <Button type="primary" onClick={() => setCount(count + 1)}>
          第一种方式 +1
        </Button>
        <Button type="primary" onClick={() => setCount((value) => value + 1)}>
          第二种方式 +1
        </Button>
      </Space>
    </Card>
  )
}
```

按钮切换的 flag 与 usePow 的数据毫无关系，当切换按钮的时候，usePow 是否会打印 "我是usePow"？     

效果：   

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/hooks/img_09.png" alt="" />  

可以看到，当点击按钮后，会打印 "我是usePow"，这样就会产生开销。   

这种开销并不是想要见到的结果，所以有了 useMemo。   

改造：   

```tsx
"use client"
import {useMemo, useState} from 'react';
import {Button, Card} from 'antd';

const usePow = (list: number[]) => {
  return useMemo(() => {
    return list.map((item: number) => {
      console.log('我是usePow');
      return Math.pow(item, 2);
    })
  }, [])
}
export default () => {
  const [flag, setFlag] = useState<boolean>(true);
  const data = usePow([1, 2, 3]);
  return (
    <Card title="useMemo example" bordered={false} style={{ width: '100%' }}>
      <div>数字集合：{JSON.stringify(data)}</div>
      <Button type="primary" onClick={() => setFlag(value => !value)}>
        状态切换：{JSON.stringify(flag)}
      </Button>
    </Card>
  )
}
```

效果：   

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/hooks/img_10.png" alt="" />  

### useCallback

与 useMemo 类似，唯一不同的点在于，useMemo 返回的是值，useCallback 返回的是函数。        

#### 介绍

```
const resfn = useCallback(fn, deps)   
```

参数：    
 
* fn：函数，返回的值作为缓存值。    
* deps：依赖项数组，通过数组里的值是否改变来进行 fn 的调用，得到新的缓存值。   

返回值：    

* resfn：更新后的数据源，即 fn 的返回值，如果 deps 中的依赖值发生改变，将重新执行 fn，否则取上一次的函数。    

#### 使用  

```tsx
"use client"
import {useState, memo, useCallback} from 'react';
import {Button, Card, Space} from 'antd';

const TestButton = memo(({children, onClick = () => {}}) => {
  console.log(children);
  return (
    <Button type="primary" onClick={onClick}>
      {children}
    </Button>
  )
})

export default () => {
  const [count, setCount] = useState<number>(0);
  const [flag, setFlag] = useState<boolean>(true);
  const add = useCallback(() => {
    setCount(count + 1);
  }, [count]);
  return (
    <Card title="useCallback example" bordered={false} style={{ width: '100%' }}>
      <Space>
        <TestButton onClick={() => setCount(value => value + 1)}>普通点击</TestButton>
        <TestButton onClick={add}>useCallback点击</TestButton>
      </Space>
      <div>数字：{count}</div>
      <Button type="primary" onClick={() => setFlag(value => !value)}>切换：{JSON.stringify(flag)}</Button>
    </Card>
  )
}
```

TestButton 是个按钮，分别存放着有无 useCallback 包裹的函数。    

父组件中有一个 flag 变量，这个变量与 count 无关，当依次切换按钮时，TestButton 会怎样执行呢？   

效果：   

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/hooks/img_11.png" alt="" />    

切换 flag，没有经过 useCallback 的函数会再次执行，而包裹的函数并没有执行（点击 "普通点击" 按钮时，useCallback 的依赖项 count 发生了改变，所以会打印出 "useCallback 点击"）。    

> 为什么在 TestButton 中使用了 React.memo，不使用会怎样？
> useCallback 必须配合 React.memo 进行优化，如果不配合使用，性能不但不会提升，还有可能降低。

### useRef

获取当前元素的所有属性，还可以用于缓存数据。   

#### 介绍

```
const ref = useRef(initialValue)   
```

参数：    

* initialValue：初始值。     

返回值：

* ref：返回一个带 current 属性的对象。   

#### 使用 

```tsx
"use client"
import {useRef, useState} from 'react';
import {Button, Card, Space} from 'antd';

export default () => {
  const scrollRef = useRef<any>(null);
  const [clientHeight, setClientHeight] = useState<number>(0);
  const [scrollTop, setScrollTop] = useState<number>(0);
  const [scrollHeight, setScrollHeight] = useState<number>(0);

  const onScroll = () => {
    if (scrollRef?.current) {
      console.log(scrollRef?.current);
      const clientHeight = scrollRef?.current?.clientHeight;
      const scrollTop = scrollRef?.current?.scrollTop;
      const scrollHeight = scrollRef?.current?.scrollHeight;
      setClientHeight(clientHeight);
      setScrollTop(scrollTop);
      setScrollHeight(scrollHeight);
    }
  }
  return (
    <Card title="useRef example" bordered={false} style={{ width: '100%' }}>
      <div>
        <p>可视区域高度：{clientHeight}</p>
        <p>滚动条滚动高度：{scrollTop}</p>
        <p>滚动内容高度：{scrollHeight}</p>
      </div>
      <div
        style={{ height: 200, border: "1px solid #000", overflowY: "auto" }}
        ref={scrollRef}
        onScroll={onScroll}
      >
        <div style={{height: 2000}}/>
      </div>
    </Card>
  )
}
```

效果：    

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/hooks/img_12.png" alt="" />    

### useImperativeHandle

让父组件通过 ref 属性获取子组件实例，并调用子组件暴露的方法或访问子组件的属性。    

#### 介绍

```
useImperativeHandle(ref, createHandle, deps)   
```

参数：   

* ref：接受 forwardRef 传递过来的 ref。     
* createHandle：处理函数，返回值作为暴露给父组件的 ref 对象。     
* deps：依赖项，依赖项更改，会形成新的 ref 对象。    

#### 使用 

```tsx
"use client"
import {forwardRef, useImperativeHandle, useRef, useState} from 'react';
import {Button, Card} from 'antd';

const Child = forwardRef((props, ref) => {
  const [count, setCount] = useState<number>(0);
  const add = () => setCount(value => value + 1);
  useImperativeHandle(ref, () => ({
    add,
  }))

  return (
    <div>
      <p>点击次数：{count}</p>
      <Button type="primary" onClick={add}>子组件的按钮，点击+1</Button>
    </div>
  )
})
export default () => {
  const childRef = useRef(null)
  return (
    <Card title="useImperativeHandle example" bordered={false} style={{ width: '100%' }}>
      <div>大家好</div>
      <Button type="primary" onClick={() => childRef?.current?.add()}>父组件的按钮，点击+1</Button>
      <Child ref={childRef}/>
    </Card>
  )
}
```

效果：

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/hooks/img_13.png" alt="" />    

### useLayoutEffect

与 useEffect 基本一致，执行时机在 DOM 更新之后，浏览器绘制之前，相当于有一层防抖效果。   

#### 介绍

```
useLayoutEffect(callback,deps)  
```

参数：    
 
* callback：回调函数。    
* deps：依赖项，依赖项更改，会形成新的 ref 对象。    

#### 使用

```tsx
"use client"
import {useEffect, useLayoutEffect, useState} from 'react';
import {Card} from 'antd';

export default () => {
 const [count, setCount] = useState<number>(0);
 const [count1, setCount1] =useState<number>(0);
 useEffect(() => {
   if (count === 0) {
     setCount(10 + Math.random() * 100);
   }
 }, [count]);
 useLayoutEffect(() => {
   if (count1 === 0) {
     setCount1(10 + Math.random() * 100);
   }
 }, [count1]);
  return (
    <Card title="useLayout example" bordered={false} style={{ width: '100%' }}>
      <div>大家好</div>
      <div>useEffect中的count: {count}</div>
      <div>useLayoutEffect中的count: {count1}</div>
    </Card>
  )
}
```

> useLayoutEffect 是同步执行，会阻塞浏览器渲染。useEffect 是异步执行，不会阻塞浏览器渲染，呈现速度快于 useLayoutEffect。    

### useDebugValue

让开发者在开发者工具中查看自定义 Hook 中的数据，从而更好地调试和优化代码。    

#### 介绍

```
useDebugValue(value, (status) => {})    
```

参数：    

* value：判断的值。   
* callback：可选，接受 debug 值作为参数，返回一个格式化的显示值。    

#### 使用

```ts
import {useDebugValue, useEffect, useState} from "react";

const useFetch = (url: string) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchData = async () => {
      const response = await fetch(url);
      const data = await response.json();
      setData(data);
      setLoading(false);
    }
    fetchData();
  }, [url]);

  // 使用 useDebugValue Hook 显示 loading 和 data 的值
  useDebugValue({ loading, data });

  return { loading, data };
}

export default useFetch;
```
