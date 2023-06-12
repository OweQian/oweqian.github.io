---
title: "‍💻 React Hooks API 的介绍和使用"
date: 2023-06-12T21:00:07+08:00
tags: ["第一技能"]
categories: ["第一技能"]
---

工欲善其事必先利其器，想要玩转 React Hooks，就必须知道 React 官方提供了哪些 Hooks，如何去使用这些 Hooks。    

项目地址： [Hooks](https://github.com/OweQian/hooks.git)

<!--more-->    

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
