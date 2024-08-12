---
title: "💻 前端框架面试题汇总"
date: 2024-08-10T10:00:39+08:00
tags: ["第一技能"]
categories: ["第一技能"]
---

本篇文章旨在利用一天时间，剖析经典前端框架面试题，带你快速建立前端框架知识体系，让面试更加 "有底气"，欢迎您的指正和点赞。

<!--more-->

## React

### 基本使用

#### JSX 基本使用

- 变量、表达式
- class、style
- 子元素和组件

```javascript
render () {
    // // 获取变量 插值
    const pElem = <p>{this.state.name}</p>
    return pElem

    // // 表达式
    const exprElem = <p>{this.state.flag ? 'yes' : 'no'}</p>
    return exprElem

    // // 子元素
    const imgElem = <div>
        <p>我的头像</p>
        <img src="xxxx.png"/>
        <img src={this.state.imgUrl}/>
    </div>
    return imgElem

    // // class
    const classElem = <p className="title">设置 css class</p>
    return classElem

    // // style
    const styleData = { fontSize: '30px',  color: 'blue' }
    const styleElem = <p style={styleData}>设置 style</p>
    // 内联写法，注意 {{ 和 }}
    // const styleElem = <p style={{ fontSize: '30px',  color: 'blue' }}>设置 style</p>
    return styleElem

    // // 原生 html
    const rawHtml = '<span>富文本内容<i>斜体</i><b>加粗</b></span>'
    const rawHtmlData = {
        __html: rawHtml // 注意，必须是这种格式
    }
    const rawHtmlElem = <div>
        <p dangerouslySetInnerHTML={rawHtmlData}></p>
        <p>{rawHtml}</p>
    </div>
    return rawHtmlElem

    // // 加载组件
    const componentElem = <div>
        <p>JSX 中加载一个组件</p>
        <hr/>
        <List/>
    </div>
    return componentElem
}

```

#### 条件判断和渲染列表

##### 条件判断

- if else
- 三元表达式
- 逻辑运算符 && ||

```javascript
render() {
    const blackBtn = <button className="btn-black">black btn</button>
    const whiteBtn = <button className="btn-white">white btn</button>

    // // if else
    if (this.state.theme === 'black') {
        return blackBtn
    } else {
        return whiteBtn
    }

    // // 三元运算符
    return <div>
        { this.state.theme === 'black' ? blackBtn : whiteBtn }
    </div>

    // &&
    return <div>
        { this.state.theme === 'black' && blackBtn }
    </div>
}

```

##### 渲染列表

- map
- key

```javascript
render() {
    return <ul>
        { /* vue v-for */
            this.state.list.map(
                (item, index) => {
                    // 这里的 key 和 Vue 的 key 类似，必填，不能是 index 或 random
                    return <li key={item.id}>
                        index {index}; id {item.id}; title {item.title}
                    </li>
                }
            )
        }
    </ul>
}

```

#### 事件

- bind this
- 关于 event 参数
- 传递自定义参数

```javascript
this.clickHandler1 = this.clickHandler1.bind(this)

clickHandler1() {
    // console.log('this....', this) // this 默认是 undefined
    this.setState({
        name: 'lisi'
    })
}

// // this - 使用 bind
return <p onClick={this.clickHandler1}>
   {this.state.name}
</p>

```

```javascript
// 静态方法，this 指向当前实例
clickHandler2 = () => {
  this.setState({
    name: "lisi",
  });
};

return <p onClick={this.clickHandler2}>clickHandler2 {this.state.name}</p>;
```

```javascript
clickHandler3 = (event) => {
  event.preventDefault(); // 阻止默认行为
  event.stopPropagation(); // 阻止冒泡
  console.log("target", event.target); // 指向当前元素，即当前元素触发
  console.log("current target", event.currentTarget); // 指向当前元素，假象！！！

  // 注意，event 其实是 React 封装的。可以看 __proto__.constructor 是 SyntheticEvent 组合事件
  console.log("event", event); // 不是原生的 Event ，原生的是 MouseEvent
  console.log("event.__proto__.constructor", event.__proto__.constructor);

  // 原生 event 如下。其 __proto__.constructor 是 MouseEvent
  console.log("nativeEvent", event.nativeEvent);
  console.log("nativeEvent target", event.nativeEvent.target); // 指向当前元素，即当前元素触发
  console.log("nativeEvent current target", event.nativeEvent.currentTarget); // 指向 document ！！！（绑定事件的元素）

  // 1. event 是 SyntheticEvent ，模拟 DOM 事件所有能力
  // 2. event.nativeEvent 是原生事件对象
  // 3. 所有的事件，都被挂载到 document 上(React17 后绑定到 root 组件，有利于多个版本共存)
  // 4. 和 DOM 事件不一样，和 Vue 事件也不一样
};

// // event
// return <a href="https://imooc.com/" onClick={this.clickHandler3}>
//     click me
// </a>
```

<img src="%E5%89%8D%E7%AB%AF%E6%A1%86%E6%9E%B6%E9%9D%A2%E8%AF%95%E9%A2%98%E6%B1%87%E6%80%BB%2045ad321291ec41f4acbef82cb460d3c4/image.png" alt="" width="100%" />

```javascript
// 传递参数 - 用 bind(this, a, b)
return <ul>{this.state.list.map((item, index) => {
    return <li key={item.id} onClick={this.clickHandler4.bind(this, item.id, item.title)}>
        index {index}; title {item.title}
    </li>
})}</ul>

// 传递参数
clickHandler4(id, title, event) {
  console.log(id, title)
  console.log('event', event) // 最后追加一个参数，即可接收 event
}

```

#### 表单

- 受控组件（state 和 value 绑定，onChange 事件）
- 非受控组件
- onChange 事件
- input textarea select 用 value
- checkbox radio 用 checked

```javascript
render() {
    // // 受控组件（非受控组件，后面再讲）
    return <div>
        <p>{this.state.name}</p>
        <label htmlFor="inputName">姓名：</label> {/* 用 htmlFor 代替 for */}
        <input id="inputName" value={this.state.name} onChange={this.onInputChange}/>
    </div>

    // textarea - 使用 value
    return <div>
        <textarea value={this.state.info} onChange={this.onTextareaChange}/>
        <p>{this.state.info}</p>
    </div>

    // // select - 使用 value
    return <div>
        <select value={this.state.city} onChange={this.onSelectChange}>
            <option value="beijing">北京</option>
            <option value="shanghai">上海</option>
            <option value="shenzhen">深圳</option>
        </select>
        <p>{this.state.city}</p>
    </div>

    // // checkbox
    return <div>
        <input type="checkbox" checked={this.state.flag} onChange={this.onCheckboxChange}/>
        <p>{this.state.flag.toString()}</p>
    </div>

    // // radio
    return <div>
        male <input type="radio" name="gender" value="male" checked={this.state.gender === 'male'} onChange={this.onRadioChange}/>
        female <input type="radio" name="gender" value="female" checked={this.state.gender === 'female'} onChange={this.onRadioChange}/>
        <p>{this.state.gender}</p>
    </div>

    // 非受控组件 - 后面再讲
}
onInputChange = (e) => {
    this.setState({
        name: e.target.value
    })
}
onTextareaChange = (e) => {
    this.setState({
        info: e.target.value
    })
}
onSelectChange = (e) => {
    this.setState({
        city: e.target.value
    })
}
onCheckboxChange = () => {
    this.setState({
        flag: !this.state.flag
    })
}
onRadioChange = (e) => {
    this.setState({
        gender: e.target.value
    })
}

```

#### 组件使用

- props 传递数据
- props 传递函数
- props 类型检查

```javascript
import PropTypes from 'prop-types'

class Input extendsReact.Component {
    constructor(props) {
        super(props)
        this.state = {
            title: ''
        }
    }
    render() {
        return <div>
            <input value={this.state.title} onChange={this.onTitleChange}/>
            <button onClick={this.onSubmit}>提交</button>
        </div>
    }
    onTitleChange = (e) => {
        this.setState({
            title: e.target.value
        })
    }
    onSubmit = () => {
        const { submitTitle } = this.props
        submitTitle(this.state.title) // 'abc'

        this.setState({
            title: ''
        })
    }
}
// props 类型检查
Input.propTypes = {
    submitTitle: PropTypes.func.isRequired
}

class List extendsReact.Component {
    constructor(props) {
        super(props)
    }
    render() {
        const { list } = this.props

        return <ul>{list.map((item, index) => {
            return <li key={item.id}>
                <span>{item.title}</span>
            </li>
        })}</ul>
    }
}
// props 类型检查
List.propTypes = {
    list: PropTypes.arrayOf(PropTypes.object).isRequired
}

```

#### setState

- 不可变值（不能直接修改 state）
- 可能是异步更新
- 可能会被合并（批处理）

##### 不可变值

```javascript
// // 不要直接修改 state ，使用不可变值 ----------------------------
// // this.state.count++ // 错误
// this.setState({
//     count: this.state.count + 1 // SCU
// })
// 操作数组、对象的的常用形式

// // 不可变值（函数式编程，纯函数） - 数组
// const list5Copy = this.state.list5.slice()
// this.setState({
//     list1: this.state.list1.concat(100), // 追加
//     list2: [...this.state.list2, 100], // 追加
//     list3: this.state.list3.slice(0, 3), // 截取
//     list4: this.state.list4.filter(item => item > 100), // 筛选
//     list5: list5Copy // 其他操作
// })
// // 注意，不能直接对 this.state.list 进行 push pop splice 等，这样违反不可变值

// // 不可变值（浅拷贝） - 对象
// this.setState({
//     obj1: Object.assign({}, this.state.obj1, {a: 100}),
//     obj2: {...this.state.obj2, a: 100}
// })
// // 注意，不能直接对 this.state.obj 进行属性设置，这样违反不可变值
```

##### 可能是异步更新

```javascript
// // 直接使用是异步
this.setState({
    count: this.state.count + 1
}, () => {
    // 联想 Vue $nextTick - DOM
    console.log('count by callback', this.state.count) // 回调函数中可以拿到最新的 state
})
console.log('count', this.state.count) // 异步的，拿不到最新值

// // setTimeout 中 setState 是同步的
setTimeout(() => {
    this.setState({
        count: this.state.count + 1
    })
    console.log('count in setTimeout', this.state.count)
}, 0)

// // 自己定义的 DOM 事件，setState 是同步的, 在 componentDidMount 中
bodyClickHandler = () => {
    this.setState({
        count: this.state.count + 1
    })
    console.log('count in body event', this.state.count)
}
componentDidMount() {
    // 自己定义的 DOM 事件，setState 是同步的
    document.body.addEventListener('click', this.bodyClickHandler)
}
componentWillUnmount() {
    // 及时销毁自定义 DOM 事件
    document.body.removeEventListener('click', this.bodyClickHandler)
    // clearTimeout
}

```

##### 可能会被合并

```javascript
// // 传入对象，会被合并（类似 Object.assign ）。执行结果只执行一次 +1
this.setState({
  count: this.state.count + 1,
});
this.setState({
  count: this.state.count + 1,
});
this.setState({
  count: this.state.count + 1,
});

// 传入函数，不会被合并。执行结果是 +3
this.setState((prevState, props) => {
  return {
    count: prevState.count + 1,
  };
});
this.setState((prevState, props) => {
  return {
    count: prevState.count + 1,
  };
});
this.setState((prevState, props) => {
  return {
    count: prevState.count + 1,
  };
});
```

##### React <= 17 setState

- React 组件事件：异步更新 + 合并 state（批处理）
- DOM 事件，setTimeout：同步更新，不合并 state

##### React 18 setState

- React 组件事件：异步更新 + 合并 state
- DOM 事件，setTimeout：异步更新 + 合并 state
- Automatic Batching 自动批处理

#### 生命周期

- 单组件生命周期
- 父子组件生命周期，和 Vue 的一样

<img src="%E5%89%8D%E7%AB%AF%E6%A1%86%E6%9E%B6%E9%9D%A2%E8%AF%95%E9%A2%98%E6%B1%87%E6%80%BB%2045ad321291ec41f4acbef82cb460d3c4/image%201.png" alt="" width="100%" />

### 高级特性

#### 函数组件

- 纯函数组件，输入 props，输出 JSX
- 没有实例，没有生命周期，没有 state
- 不能扩展其它方法

<img src="%E5%89%8D%E7%AB%AF%E6%A1%86%E6%9E%B6%E9%9D%A2%E8%AF%95%E9%A2%98%E6%B1%87%E6%80%BB%2045ad321291ec41f4acbef82cb460d3c4/image%202.png" alt="" width="100%" />

#### 非受控组件

- ref
- defaultValue、defaultChecked
- 手动操作 DOM 元素

##### 适用场景

- 必须手动操作 DOM 元素，setState 实现不了
- 文件上传 \<input type="file"\>
- 某些富文本编辑器，需要传入 DOM 元素

##### 受控组件 vs 非受控组件

- 优先使用受控组件，符合 React 设计原则
- 必须操作 DOM，则使用非受控组件

```javascript
constructor(props) {
    super(props)
    this.state = {
        name: 'oweqian',
        flag: true,
    }
    this.nameInputRef = React.createRef() // 创建 ref
}

render() {
    // input defaultValue
    return <div>
        {/* 使用 defaultValue 而不是 value ，使用 ref */}
        <input defaultValue={this.state.name} ref={this.nameInputRef}/>
        {/* state 并不会随着改变 */}
        <span>state.name: {this.state.name}</span>
        <br/>
        <button onClick={this.alertName}>alert name</button>
    </div>
}

alertName = () => {
    const elem = this.nameInputRef.current // 通过 ref 获取 DOM 节点
    alert(elem.value) // 不是 this.state.name
}

```

#### React Portals

- 组件默认按照既定层次嵌套渲染
- 如何让组件渲染到父组件以外？

##### 适用场景

- 对话框 / 模态框
- overflow: hidden
- fixed 需要放在 body 第一层级
- 父组件 z-index 值太小

```javascript
import React from 'react'
import ReactDOM from 'react-dom'

render() {
    // 使用 Portals 渲染到 body 上。
    // fixed 元素要放在 body 上，有更好的浏览器兼容性。
    return ReactDOM.createPortal(<div className="modal">{this.props.children}</div>, document.body)
}
```

#### React Context

- 公共信息（语言、主题）如何传递给每个组件？
- 用 props 太繁琐
- 用 redux 小题大做

```javascript
import React from 'react'

// 创建 Context 填入默认值（任何一个 js 变量）
const ThemeContext = React.createContext('light')

// 底层组件 - 函数是组件
function ThemeLink (props) {
    // 函数式组件可以使用 Consumer，返回函数传参value
    return <ThemeContext.Consumer>
        { value => <p>link's theme is {value}</p> }
    </ThemeContext.Consumer>
}

// 底层组件 - class 组件
class ThemedButton extendsReact.Component {
    // 指定 contextType 读取当前的 theme context。
    // static contextType = ThemeContext // 也可以用 ThemedButton.contextType = ThemeContext
    render() {
        const theme = this.context // React 会往上找到最近的 theme Provider，然后使用它的值。
        return <div>
            <p>button's theme is {theme}</p>
        </div>
    }
}
ThemedButton.contextType = ThemeContext // 指定 contextType 读取当前的 theme context。

// 中间的组件再也不必指明往下传递 theme 了。
function Toolbar(props) {
    return (
        <div>
            <ThemedButton />
            <ThemeLink />
        </div>
    )
}

class App extendsReact.Component {
    constructor(props) {
        super(props)
        this.state = {
            theme: 'light'
        }
    }
    render() {
        return <ThemeContext.Provider value={this.state.theme}>
            <Toolbar />
            <hr/>
            <button onClick={this.changeTheme}>change theme</button>
        </ThemeContext.Provider>
    }
    changeTheme = () => {
        this.setState({
            theme: this.state.theme === 'light' ? 'dark' : 'light'
        })
    }
}

export default App

```

#### 异步组件

- import
- React.lazy
- React.Suspense

```javascript
import React from 'react'

const ContextDemo = React.lazy(() => import('./ContextDemo'))

class App extendsReact.Component {
    constructor(props) {
        super(props)
    }
    render() {
        return <div>
            <p>引入一个动态组件</p>
            <hr />
            <React.Suspense fallback={<div>Loading...</div>}>
                <ContextDemo/>
            </React.Suspense>
        </div>

        // 1. 强制刷新，可看到 loading （看不到就限制一下 chrome 网速）
        // 2. 看 network 的 js 加载
    }
}

export default App

```

#### 性能优化

- shouldComponentUpdate(简称 SCU)
- PureComponent 和 React.memo
- 不可变值 immutable.js

##### SCU 基本用法

<img src="%E5%89%8D%E7%AB%AF%E6%A1%86%E6%9E%B6%E9%9D%A2%E8%AF%95%E9%A2%98%E6%B1%87%E6%80%BB%2045ad321291ec41f4acbef82cb460d3c4/image%203.png" alt="" width="100%" />

##### SCU 默认返回什么

React 默认父组件有更新，子组件则无条件也更新，SCU 默认返回 true(即可以渲染)

性能优化对 React 更加重要!!!

SCU 一定要每次都用吗？ -- 需要的时候才优化

##### SCU 一定要配合 state 不可变值

<img src="%E5%89%8D%E7%AB%AF%E6%A1%86%E6%9E%B6%E9%9D%A2%E8%AF%95%E9%A2%98%E6%B1%87%E6%80%BB%2045ad321291ec41f4acbef82cb460d3c4/image%204.png" alt="" width="100%" />

注：配合 state 不可变值部分（很重要！！！）

##### PureComponent 和 React.memo

- PureComponent（适用于类组件），实现了浅比较
- React.memo，函数组件中的 PureComponent
- 浅比较已适用大部分情况（尽量不要做深度比较）

##### immutable.js

- 彻底拥抱 "不可变值"
- 基于共享数据（不是深拷贝），速度好
- 有一定学习和迁移成本，谨慎使用

<img src="%E5%89%8D%E7%AB%AF%E6%A1%86%E6%9E%B6%E9%9D%A2%E8%AF%95%E9%A2%98%E6%B1%87%E6%80%BB%2045ad321291ec41f4acbef82cb460d3c4/image%205.png" alt="" width="100%" />

#### 公共逻辑抽离

- 高阶组件 HOC
- Render Props

##### HOC

<img src="%E5%89%8D%E7%AB%AF%E6%A1%86%E6%9E%B6%E9%9D%A2%E8%AF%95%E9%A2%98%E6%B1%87%E6%80%BB%2045ad321291ec41f4acbef82cb460d3c4/image%206.png" alt="" width="100%" />

```javascript
import React from 'react'

// 高阶组件
const withMouse = (Component) => {
    class withMouseComponent extendsReact.Component {
        constructor(props) {
            super(props)
            this.state = { x: 0, y: 0 }
        }

        handleMouseMove = (event) => {
            this.setState({
                x: event.clientX,
                y: event.clientY
            })
        }

        render() {
            return (
                <div style={{ height: '500px' }} onMouseMove={this.handleMouseMove}>
                    {/* 1. 透传所有 props 2. 增加 mouse 属性 */}
                    <Component {...this.props} mouse={this.state}/>
                </div>
            )
        }
    }
    return withMouseComponent
}

const App = (props) => {
    const a = props.a
    const { x, y } = props.mouse // 接收 mouse 属性
    return (
        <div style={{ height: '500px' }}>
            <h1>The mouse position is ({x}, {y})</h1>
            <p>{a}</p>
        </div>
    )
}

export default withMouse(App) // 返回高阶函数

```

##### Render Props

<img src="%E5%89%8D%E7%AB%AF%E6%A1%86%E6%9E%B6%E9%9D%A2%E8%AF%95%E9%A2%98%E6%B1%87%E6%80%BB%2045ad321291ec41f4acbef82cb460d3c4/image%207.png" alt="" width="100%" />

##### HOC vs Render Props

- HOC：模式简单，但会增加组件层级
- Render Props：代码简介，学习成本较高
- 按需使用

### Redux

- 基本概念
- 单向数据流
- React-Redux
- 异步 action
- 中间件

#### 基本概念

- store state
- action
- reducer

#### 单向数据流

- dispatch action
- reducer -> new State
- subscribe 触发通知(视图更新)

<img src="%E5%89%8D%E7%AB%AF%E6%A1%86%E6%9E%B6%E9%9D%A2%E8%AF%95%E9%A2%98%E6%B1%87%E6%80%BB%2045ad321291ec41f4acbef82cb460d3c4/image%208.png" alt="" width="100%" />

#### React-Redux

- <Provider> connect
- mapStateToProps mapDispatchToProps

#### 异步 action

<img src="%E5%89%8D%E7%AB%AF%E6%A1%86%E6%9E%B6%E9%9D%A2%E8%AF%95%E9%A2%98%E6%B1%87%E6%80%BB%2045ad321291ec41f4acbef82cb460d3c4/image%209.png" alt="" width="100%" />

<img src="%E5%89%8D%E7%AB%AF%E6%A1%86%E6%9E%B6%E9%9D%A2%E8%AF%95%E9%A2%98%E6%B1%87%E6%80%BB%2045ad321291ec41f4acbef82cb460d3c4/image%2010.png" alt="" width="100%" />

#### 中间件原理

对 dispatch 做改造。

<img src="%E5%89%8D%E7%AB%AF%E6%A1%86%E6%9E%B6%E9%9D%A2%E8%AF%95%E9%A2%98%E6%B1%87%E6%80%BB%2045ad321291ec41f4acbef82cb460d3c4/image%2011.png" alt="" width="100%" />

<img src="%E5%89%8D%E7%AB%AF%E6%A1%86%E6%9E%B6%E9%9D%A2%E8%AF%95%E9%A2%98%E6%B1%87%E6%80%BB%2045ad321291ec41f4acbef82cb460d3c4/image%2012.png" alt="" width="100%" />

##### 中间件 logger 实现

<img src="%E5%89%8D%E7%AB%AF%E6%A1%86%E6%9E%B6%E9%9D%A2%E8%AF%95%E9%A2%98%E6%B1%87%E6%80%BB%2045ad321291ec41f4acbef82cb460d3c4/image%2013.png" alt="" width="100%" />

### React-Router

- hash 模式
- h5 history 模式
- history 模式需要 server 端支持

### React Hooks

#### class 组件的问题

- 大型组件难以拆分和重构，很难测试
- 相同业务逻辑，分散到各个方法中，逻辑混乱
- 复用逻辑变的复杂，如 HOC、Render Props

#### React 组件更易用函数表达

- React 提倡函数式编程，view = fn (props)
- 函数组件更灵活，更易拆分，更易测试
- 但函数组件太简单，需要增强能力 - Hooks

#### 命名规范

- 规定所有的 Hooks 都以 use 开头，如 useXxx
- 自定义 Hooks 也要以 use 开头
- 非 Hooks 的地方，尽量不要使用 useXxx 写法

#### useState

- useState(0) 传入初始值，返回数组 [state, setState]
- 通过 state 获取值
- 通过 setState(1) 修改值

```javascript
import React, { useState } from "react";

function ClickCounter() {
  // 数组的解构
  // useState 就是一个 Hook “钩”，最基本的一个 Hook
  const [count, setCount] = useState(0); // 传入一个初始值
  const [name, setName] = useState("oweqian老师");

  function clickHandler() {
    setCount(count + 1);
    setName(name + "2020");
  }

  return (
    <div>
      <p>
        你点击了 {count} 次 {name}
      </p>
      <button onClick={clickHandler}>点击</button>
    </div>
  );
}

export default ClickCounter;
```

#### useEffect

- 模拟 componentDidMount - useEffect 依赖 []
- 模拟 componentDidUpdate - useEffect 无依赖或依赖 [a, b]
- 模拟 componentWillUnMount - useEffect 中返回一个函数

```javascript
import React, { useState, useEffect } from "react";

function LifeCycles() {
  const [count, setCount] = useState(0);
  const [name, setName] = useState("oweqian老师");

  // // 模拟 class 组件的 DidMount 和 DidUpdate
  // useEffect(() => {
  //     console.log('在此发送一个 ajax 请求')
  // })

  // // 模拟 class 组件的 DidMount
  // useEffect(() => {
  //     console.log('加载完了')
  // }, []) // 第二个参数是 [] （不依赖于任何 state）

  // // 模拟 class 组件的 DidUpdate
  // useEffect(() => {
  //     console.log('更新了')
  // }, [count, name]) // 第二个参数就是依赖的 state

  // 模拟 class 组件的 DidMount
  useEffect(() => {
    let timerId = setInterval(() => {
      console.log(Date.now());
    }, 1000);

    // 返回一个函数
    // 模拟 WillUnMount
    return () => {
      clearInterval(timerId);
    };
  }, []);

  function clickHandler() {
    setCount(count + 1);
    setName(name + "2020");
  }

  return (
    <div>
      <p>
        你点击了 {count} 次 {name}
      </p>
      <button onClick={clickHandler}>点击</button>
    </div>
  );
}

export default LifeCycles;
```

模拟 willUnMount，但不完全等同于 willUnMount

```javascript
// class component
componentDidMount() {
    console.log(`开始监听 ${this.props.friendId} 的在线状态`)
}
componentWillUnMount() {
    console.log(`结束监听 ${this.props.friendId} 的在线状态`)
}
// friendId 更新
componentDidUpdate(prevProps) {
    console.log(`结束监听 ${prevProps.friendId} 在线状态`)
    console.log(`开始监听 ${this.props.friendId} 在线状态`)
}

// function component
// DidMount 和 DidUpdate
useEffect(() => {
    console.log(`开始监听 ${friendId} 在线状态`)

    // 【特别注意】
    // 此处并不完全等同于 WillUnMount
    // props 发生变化，即更新，也会执行结束监听
    // 准确的说：返回的函数，会在下一次 effect 执行之前，被执行
    return () => {
        console.log(`结束监听 ${friendId} 在线状态`)
    }
})

```

useEffect 中返回函数 fn：

- useEffect 依赖 []，组件销毁时执行 fn，等同于 willUnMount
- useEffect 无依赖或依赖 [a, b]，组件更新时执行 fn
- **即，下一次执行 useEffect 之前，就会执行 fn，无论更新或卸载**

#### useRef

```javascript
import React, { useRef, useEffect } from "react";

function UseRef() {
  const btnRef = useRef(null); // 初始值

  useEffect(() => {
    console.log(btnRef.current); // DOM 节点
  }, []);

  return (
    <div>
      <button ref={btnRef}>click</button>
    </div>
  );
}

export default UseRef;
```

#### useContext

```javascript
import React, { useContext } from "react";

// 主题颜色
const themes = {
  light: {
    foreground: "#000",
    background: "#eee",
  },
  dark: {
    foreground: "#fff",
    background: "#222",
  },
};

// 创建 Context
const ThemeContext = React.createContext(themes.light); // 初始值

function ThemeButton() {
  const theme = useContext(ThemeContext);

  return (
    <button style={{ background: theme.background, color: theme.foreground }}>
      hello world
    </button>
  );
}

function Toolbar() {
  return (
    <div>
      <ThemeButton></ThemeButton>
    </div>
  );
}

function App() {
  return (
    <ThemeContext.Provider value={themes.dark}>
      <Toolbar></Toolbar>
    </ThemeContext.Provider>
  );
}

export default App;
```

#### useReducer

```javascript
import React, { useReducer } from "react";

const initialState = { count: 0 };

const reducer = (state, action) => {
  switch (action.type) {
    case "increment":
      return { count: state.count + 1 };
    case "decrement":
      return { count: state.count - 1 };
    default:
      return state;
  }
};

function App() {
  const [state, dispatch] = useReducer(reducer, initialState);

  return (
    <div>
      count: {state.count}
      <button onClick={() => dispatch({ type: "increment" })}>increment</button>
      <button onClick={() => dispatch({ type: "decrement" })}>decrement</button>
    </div>
  );
}

export default App;
```

useReducer 和 Redux 的区别：

- useReducer 是 useState 的代替方案，用于 state 复杂变化
- useReducer 是单组件状态管理，组件通讯还需要 props
- Redux 是全局状态管理，多组件共享数据

#### useMemo

- React 默认会更新所有子组件
- class 组件使用 SCU 和 PureComponent 做优化
- Hooks 中使用 useMemo，但优化的原理是相同的

```javascript
import React, { useState, memo, useMemo } from "react";

// 子组件
// function Child({ userInfo }) {
//     console.log('Child render...', userInfo)

//     return <div>
//         <p>This is Child {userInfo.name} {userInfo.age}</p>
//     </div>
// }
// 类似 class PureComponent ，对 props 进行浅层比较
const Child = memo(({ userInfo }) => {
  console.log("Child render...", userInfo);

  return (
    <div>
      <p>
        This is Child {userInfo.name} {userInfo.age}
      </p>
    </div>
  );
});

// 父组件
function App() {
  console.log("Parent render...");

  const [count, setCount] = useState(0);
  const [name, setName] = useState("oweqian老师");

  // const userInfo = { name, age: 20 }
  // 用 useMemo 缓存数据，有依赖
  const userInfo = useMemo(() => {
    return { name, age: 21 };
  }, [name]);

  return (
    <div>
      <p>
        count is {count}
        <button onClick={() => setCount(count + 1)}>click</button>
      </p>
      <Child userInfo={userInfo}></Child>
    </div>
  );
}

export default App;
```

#### useCallback

- useMemo 缓存数据
- useCallback 缓存函数
- 两者是 React Hooks 的常见优化策略 (搭配 React.memo)

```javascript
import React, { useState, memo, useMemo, useCallback } from "react";

// 子组件，memo 相当于 PureComponent
const Child = memo(({ userInfo, onChange }) => {
  console.log("Child render...", userInfo);

  return (
    <div>
      <p>
        This is Child {userInfo.name} {userInfo.age}
      </p>
      <input onChange={onChange}></input>
    </div>
  );
});

// 父组件
function App() {
  console.log("Parent render...");

  const [count, setCount] = useState(0);
  const [name, setName] = useState("oweqian老师");

  // 用 useMemo 缓存数据
  const userInfo = useMemo(() => {
    return { name, age: 21 };
  }, [name]);

  // function onChange(e) {
  //     console.log(e.target.value)
  // }
  // 用 useCallback 缓存函数
  const onChange = useCallback((e) => {
    console.log(e.target.value);
  }, []);

  return (
    <div>
      <p>
        count is {count}
        <button onClick={() => setCount(count + 1)}>click</button>
      </p>
      <Child userInfo={userInfo} onChange={onChange}></Child>
    </div>
  );
}

export default App;
```

#### 自定义 Hook

- 封装通用的功能
- 开发和使用第三方 Hooks
- 自定义 Hook 带来了无限的扩展性，解耦代码
- 本质是一个函数，以 use 开头
- 内部正常使用 useState、useEffect、其它 Hooks
- 自定义返回格式

```javascript
import { useState, useEffect } from "react";
import axios from "axios";

// 封装 axios 发送网络请求的自定义 Hook
function useAxios(url) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState();
  const [error, setError] = useState();

  useEffect(() => {
    // 利用 axios 发送网络请求
    setLoading(true);
    axios
      .get(url) // 发送一个 get 请求
      .then((res) => setData(res))
      .catch((err) => setError(err))
      .finally(() => setLoading(false));
  }, [url]);

  return [loading, data, error];
}

export default useAxios;

// 第三方 Hook
// https://nikgraf.github.io/react-hooks/
// https://github.com/umijs/hooks
```

```javascript
import Reactfrom 'react'
import useAxios from '../customHooks/useAxios'

function App() {
    const url = 'http://localhost:3000/'
    // 数组解构
    const [loading, data, error] = useAxios(url)

    if (loading) return <div>loading...</div>

    return error
        ? <div>{JSON.stringify(error)}</div>
        : <div>{JSON.stringify(data)}</div>
}

export default App

```

#### 总结

- 命名规范 useXxx
- Hooks 使用规范，重要
- 关于 Hooks 的调用顺序

#### 使用规范

- 只能用于 React 函数组件和自定义 Hook 中，其它地方不可以
- 只能用于顶层代码，不能在循环、判断中使用 Hooks
- eslint 插件 eslint-plugin-react-hooks 可以帮到你

#### Hooks 调用顺序

- 函数组件，纯函数，执行完即销毁
- 无论是 render 还是 re-render，Hooks 调用顺序必须一致
- 如果 Hooks 出现在循环、判断里，则无法保证顺序一致
- Hooks 严重依赖调用顺序！重要！

```javascript
import React, { useState, useEffect } from "react";

function Teach({ couseName }) {
  // 函数组件，纯函数，执行完即销毁
  // 所以，无论组件初始化（render）还是组件更新（re-render）
  // 都会重新执行一次这个函数，获取最新的组件
  // 这一点和 class 组件不一样

  // render: 初始化 state 的值 '张三'
  // re-render: 读取 state 的值 '张三'
  const [studentName, setStudentName] = useState("张三");

  // if (couseName) {
  //     const [studentName, setStudentName] = useState('张三')
  // }

  // render: 初始化 state 的值 'oweqian'
  // re-render: 读取 state 的值 'oweqian'
  const [teacherName, setTeacherName] = useState("oweqian");

  // if (couseName) {
  //     useEffect(() => {
  //         // 模拟学生签到
  //         localStorage.setItem('name', studentName)
  //     })
  // }

  // render: 添加 effect 函数
  // re-render: 替换 effect 函数（内部的函数会重新定义）
  useEffect(() => {
    // 模拟学生签到
    localStorage.setItem("name", studentName);
  });

  // render: 添加 effect 函数
  // re-render: 替换 effect 函数（内部的函数会重新定义）
  useEffect(() => {
    // 模拟开始上课
    console.log(`${teacherName} 开始上课，学生 ${studentName}`);
  });

  return (
    <div>
      课程：{couseName}， 讲师：{teacherName}， 学生：{studentName}
    </div>
  );
}

export default Teach;
```

#### class 组件逻辑复用

- 高阶组件 HOC（组件嵌套、props 透传）
- Render Props（学习成本高，只能传递纯函数）

#### Hooks 组件逻辑复用

- 完全符合 Hooks 原有规则，没有其他要求，易理解记忆
- 变量作用域明确
- 不会产生组件嵌套

```javascript
import { useState, useEffect } from "react";

function useMousePosition() {
  const [x, setX] = useState(0);
  const [y, setY] = useState(0);

  useEffect(() => {
    function mouseMoveHandler(event) {
      setX(event.clientX);
      setY(event.clientY);
    }

    // 绑定事件
    document.body.addEventListener("mousemove", mouseMoveHandler);

    // 解绑事件
    return () =>
      document.body.removeEventListener("mousemove", mouseMoveHandler);
  }, []);

  return [x, y];
}

export default useMousePosition;
```

#### 注意事项

- useState 初始化值，只有第一次有效

```javascript
import React, { useState } from "react";

// 子组件
function Child({ userInfo }) {
  // render: 初始化 state
  // re-render: 只恢复初始化的 state 值，不会再重新设置新的值
  //            只能用 setName 修改
  const [name, setName] = useState(userInfo.name);

  return (
    <div>
      <p>Child, props name: {userInfo.name}</p>
      <p>Child, state name: {name}</p>
    </div>
  );
}

function App() {
  const [name, setName] = useState("oweqian");
  const userInfo = { name };

  return (
    <div>
      <div>
        Parent &nbsp;
        <button onClick={() => setName("慕课网")}>setName</button>
      </div>
      <Child userInfo={userInfo} />
    </div>
  );
}

export default App;
```

- useEffect 内部不能修改 state (闭包)

```javascript
import React, { useState, useEffect } from "react";

function UseEffectChangeState() {
  const [count, setCount] = useState(0);

  // 模拟 DidMount
  // useEffect中的纯函数执行完则销毁，除非是DidUpdate
  useEffect(() => {
    console.log("useEffect...", count);

    // 定时任务
    const timer = setInterval(() => {
      console.log("setInterval...", count); // 会一直输出0
      setCount(count + 1);
    }, 1000);

    // 清除定时任务
    return () => clearTimeout(timer);
  }, []); // 依赖为 []

  // 依赖为 [] 时： re-render 不会重新执行 effect 函数
  // 没有依赖：re-render 会重新执行 effect 函数

  return <div>count: {count}</div>;
}

export default UseEffectChangeState;
```

解决方法：

```javascript
import React, { useState, useRef, useEffect } from "react";

function UseEffectChangeState() {
  const [count, setCount] = useState(0);

  // 模拟 DidMount
  const countRef = useRef(0); // 增加一个useRef
  useEffect(() => {
    console.log("useEffect...", count);

    // 定时任务
    const timer = setInterval(() => {
      console.log("setInterval...", countRef.current);
      setCount(++countRef.current);
    }, 1000);

    // 清除定时任务
    return () => clearTimeout(timer);
  }, []);

  return <div>count: {count}</div>;
}

export default UseEffectChangeState;
```

- useEffect 可能出现死循环（依赖项里有引用类型）

<img src="%E5%89%8D%E7%AB%AF%E6%A1%86%E6%9E%B6%E9%9D%A2%E8%AF%95%E9%A2%98%E6%B1%87%E6%80%BB%2045ad321291ec41f4acbef82cb460d3c4/image%2014.png" alt="" width="100%" />

### 真题演练

#### 组件之间如何通讯

- 父子组件 props
- 自定义事件
- Redux 和 Context

#### JSX 本质是什么

- createElement
- 执行返回 vnode

#### Context 是什么，如何应用

- 父组件，向其下所有子孙组件传递信息
- 如一些简单的公共信息：主题色、语言等
- 复杂的公共信息，请用 Redux

#### shouldComponentUpate 用途

- 性能优化
- 配合 "不可变值" 一起使用，否则容易出错

#### 组件生命周期

- 单组件生命周期
- 父子组件生命周期
- 注意 SCU

#### Ajax 应该放在哪个生命周期

- ComponentDidMount

#### 渲染列表，为何用 key

- diff 算法中，通过 tag 和 key 来算判断是否是 sameNode
- 减少渲染次数，提升渲染性能

#### 函数组件和 class 组件的区别

- 纯函数，输入 props，输出 JSX
- 没有实例，没有生命周期，没有 state
- 不能扩展方法

#### 什么是受控组件

- 表单的 value 受 state 控制
- 需要自行监听 onChange，更新 state
- 对比非受控组件

#### 何时使用异步组件

- 加载大组件
- 路由懒加载

#### 多个组件有公共逻辑，如何抽离

- HOC
- Render Props

#### Redux 如何进行异步请求

- 使用异步 action
- 如 redux-thunk

#### PureComponent 有何区别

- 实现了浅比较的 shouldComponentUpdate
- 优化性能
- 要结合不可变值使用

#### React 事件和 DOM 事件的区别

- 所有事件均挂载到 root element 上
- event 不是原生的，是 SyntheticEvent 合成事件对象
- dispatchEvent

#### 性能优化

- 渲染列表时使用 key
- 自定义事件、DOM 事件及时销毁
- 合理使用异步组件
- 减少函数 bind this 的次数
- 合理使用 SCU、PureComponent 和 memo
- 合理使用 immutable.js
- webpack 层面的优化
- 前端通用的性能优化(图片懒加载等)
- 使用 SSR

#### React 和 Vue 的区别

相同点：

- 都支持组件化
- 都是数据驱动视图
- 都有虚拟 DOM 的概念

不同点：

- React 使用 JSX 拥抱 JS，Vue 使用模板拥抱 html
- React 是函数式编程，Vue 是声明式编程
- React 更适合大型业务开发，Vue 更适合中小型业务开发

#### 为什么会有 React Hooks，它解决了什么问题

- 完善函数组件的能力，函数更适合 React 组件
- 组件逻辑复用，Hooks 表现更好
- class 组件复杂，不易拆解，不易测试，逻辑混乱

#### React Hooks 如何模拟组件生命周期

- 模拟 componentDidMount - useEffect 依赖 []
- 模拟 componentDidUpdate - useEffect 无依赖或依赖 [a, b]
- 模拟 componentWillUnMount - useEffect 中返回一个函数

#### React Hooks 性能优化

- useMemo 缓存数据
- useCallback 缓存函数

#### 使用 React Hooks 遇到哪些坑

- useState 初始化值，只初始化一次
- useEffect 内部不能修改 state
- useEffect 依赖引用类型，会出现死循环

#### Hooks 相比 HOC 和 Render Props 有哪些优点

- 完全符合 Hooks 原有规则，没有其他要求，易理解记忆
- 变量作用域很明确
- 不会产生组件嵌套

## TypeScript

### TS 优点和缺点，适用场景是什么

优点：

- 静态类型检查，编译时报错
- 智能提示，提高开发效率和稳定性

缺点：

- 有一定学习成本
- 应用不规范，“anyscript”

适用场景：

- 大型项目、业务复杂、维护人员多
- 逻辑性较强的代码，需要类型更稳固

### TS 基础类型有哪些

- boolean
- number
- string
- null
- undefined
- symbol
- 数组 Array
- 元组 Tuple
- 枚举 enum
- interface

### any void unknown never 的区别

- any：不进行类型检查
- void：函数没有显式返回一个值
- unknown：未知类型（有类型检查）
- never：永远不存在的类型

### TS 的访问修饰符有哪几个

- public - 全部可访问
- private - 只有自己可访问
- protected - 自己和派生类可访问

### TS 私有属性 # 和 private 有什么区别

- 私有属性，不能在构造函数的参数中定义
- private 属性，可以通过 as any 强制获取，但私有属性不行

### type 和 interface 的区别，以及使用场景

共同点：

- 都可以描述一个对象结构
- 都可以被 class 实现
- 都可以被扩展

不同点：

- type 可以声明基础类型
- **type 可以使用联合类型（或）、交叉类型（合并）**
- type 可以通过 typeof、keyof 等赋值

### TS 中交叉类型和联合类型是什么

交叉类型：

- 多个类型合并为一个类型 T1 & T2 & T3
- 如果属性类型冲突了，则属性类型为 never
- 基础类型无法交叉，会返回 never

联合类型：

- 联合多个类型 T1 | T2 | T3
- 一种 “或” 的关系
- 基础类型可以联合

### TS 中有哪些特殊符号，分别是什么意思

- ?：可选
- ?.：可选链
- ??：空值合并运算符
- !：非空断言操作符
- \_：数字分隔符

### TS 常见工具类型有哪些

- Partial<T>
- Required<T>
- Pick<T, K>
- Omit<T, K>
- Readonly<T>

### 如何扩展 window 属性

```jsx
// interface 合并声明
declare interface Window {
  test: string;
}

window.test = "xxx";
```

### TS 如何处理第三方模块的类型

- 常见的第三方插件，都有 `@types/xxx` 包，安装即可使用
- 外部模块，可通过 declare module
- 内部模块，可通过 namespace 命名空间
