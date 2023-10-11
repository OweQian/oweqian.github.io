---
title: "🌲 Git 入门操作手册"
date: 2023-10-11T22:00:47+08:00
tags: ["第一技能"]
categories: ["第一技能"]
---

项目地址： [git-practice](https://github.com/OweQian/git-practice.git)

<!--more-->

## 准备工作 

### 安装 Git

点击[这里](https://git-scm.com/)去下载个 Git ，安装到你的机器上。   

装好以后，就可以正式开始上手 Git 了。   

### 新建 Project

在 GitHub 上建一个自己的练习项目。   

1. 访问 GitHub   
2. 注册或登录您的账号   
3. 点击右上角的「New Repository」来新建远程仓库   
4. 进入仓库设置页面填写信息   

### 克隆 Repository

把远程仓库取到本地。在 Terminal 或 cmd 中切换到你希望放置项目的目录中，然后输入：  

```
git clone 仓库地址
```

Git 就会把你的远程仓库 clone 到本地。   

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/git/img.png" alt="" />    

进入目录，发现这里除了刚才添加的 LICENSE 和 .gitignore 文件外，还有一个叫做 .git 的隐藏目录。   

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/git/img_1.png" alt="" />      

这个 .git 目录，就是你的本地仓库，所有版本信息都会存在这里。   

.git 所在的这个根目录，称为 Git 的工作目录，它保存了当前从仓库中签出（checkout）的内容。   

在项目的目录下输入：   

```
git log
```

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/git/img_2.png" alt="" />       

这里只能看到一个提交，这个提交是 GitHub 帮你做的，它的内容是创建你的初始 .gitignore 和 LICENSE 这两个文件。   

第一行中的 commit 右边的那一大串字符，是这个 commit 的 SHA-1 校验和 (可以理解为这个 commit 的 ID)。   

第一行的下面，依次是这个 commit 的作者、提交日期和提交信息，其中提交信息记录了这个提交做了什么。   

### 写个提交

在工作目录下创建一个文本文件，list.txt。  

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/git/img_3.png" alt="" />    

在 Terminal 输入：  

```
git status
```

status 是用来查看工作目录当前状态的指令：   

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/git/img_4.png" alt="" />    

这段文字表述了很多信息：  

1. 你在 main branch  
2. 当前 branch 没有落后于 origin/main  
3. 有未提交文件 list.txt  

现在想提交这个文件，首先需要用 add 指令来让 Git 开始跟踪它：  

```
git add list.txt
```

输入这行代码，Terminal 不会给你反馈信息。   

这时再执行一次 git status，会发现显示内容变了：   

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/git/img_5.png" alt="" />    

list.txt 的文字变成了绿色，它的前面多了「new file:」的标记，意思是这个文件中被改动的部分（也就是这整个文件）被记录进了 staging area（暂存区）。   

> stage：暂存，在 Git 里表示集中收集改动以待提交。staging area：暂存区，在 Git 里表示汇集待提交的文件改动的地方。

现在文件已经放进了暂存区，就可以提交了。  

提交的方式是用 commit 指令：  

```
git commit
```

然后你会进入这样一个界面，这个界面是用来填写提交信息（commit message）的。   

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/git/img_6.png" alt="" />    

* 初始状态下处于命令模式，不能编辑这个文件，需要按一下 "i"（小写）来切换到插入模式，然后就可以输入你的提交信息了：   

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/git/img_7.png" alt="" />     

* 输入完成后别按回车，按 ESC 键返回到命令模式，然后连续输入两个大写的 "Z"，就保存并退出了。   

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/git/img_07.png" alt="" />    

这样，一次提交就完成了。   

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/git/img_08.png" alt="" />    

再执行一次 git log：   

```
git log
```

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/git/img_8.png" alt="" />    

刚才这条提交被列在了最上面，现在你的提交历史中有两条记录了。   

这说明，你已经成功做了一次提交到本地仓库，它已经被保存在了 .git 这个目录里的某个地方了。   

### 再写个提交

写个总结：   

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/git/img_9.png" alt="" />    

提交前先看看工作目录的当前状态是个好习惯：   

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/git/img_10.png" alt="" />    

list.txt 变红了，不过这次它左边的文字不是 "New file:" 而是 "modified:"。   

```
git add list.txt
```

再 status 一下，就会看到 list.txt 已经 staged 了：  

```
git status
```

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/git/img_11.png" alt="" />    

最后一步，commit：   

```
git commit
```

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/git/img_12.png" alt="" />    

再看看 log，你已经有三条 commits 了：   

```
git log
```

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/git/img_13.png" alt="" />      

### 提交到中央仓库

已经写了两条提交，但它们都还在本地仓库。   

为了把代码分享出去，你还需要把这些提交上传到中央仓库。   

使用 git push 来把你的本地提交发布（即上传到中央仓库）。  

```
git push
```

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/git/img_14.png" alt="" />     

这时你再去你的 GitHub 仓库页面看一下，你会发现 list.txt 文件已经在上面了，并且 commits 的数量从 1 个变成了 3 个。  

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/git/img_15.png" alt="" />     




