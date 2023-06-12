---
title: "‍💻 React Hooks API 的介绍和使用"
date: 2023-06-10T14:36:07+08:00
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
