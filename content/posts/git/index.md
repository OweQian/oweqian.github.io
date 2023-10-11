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

## 角色扮演

对于 Git 来说，团队合作和个人独立工作最大的不同在于，你会提交代码，别人也会提交；你会 push，别人也会 push。  

### 假装有一位美女同事

这时候，你自己一个人玩儿就显得有点无趣，那不如给自己安排一位美女同事吧，毕竟男女搭配，干活不累！      

为了模拟同事的操作，你需要在你的 /git-practice 目录旁再 clone 一次中央仓库到本地，来当做你的模拟同事的本地仓库：  

```
git clone git@github.com:OweQian/git-practice.git git-pracetice-another
```

为了目录名称不冲突，这次的 clone 需要加一个额外参数（git-practice-another）来手动指定本地仓库的根目录名称。   

这条指令执行完成后，你就有了两个内容相同的本地仓库：  

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/git/img_16.png" alt="" />    

现在，你就可以假装 git-practice 这个目录是你的电脑上的工作目录，而那个新建的 git-practice-another 是你同事的电脑上的工作目录。   

> Git 的管理是目录级别，而不是设备级别。也就是说，git-practice 目录内的 .git 只管理 git-practice 里的内容，git-practice-another 目录内的 .git 也只管理 git-practice-another 里的内容，它们之间互不知晓，也互不影响。   

### 她写代码并 push 到中央仓库

现在你的身份就是你的同事了，帮她写点代码吧！嗯，写点什么好呢？   

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/git/img_17.png" alt="" />    

嗯，看起来不错，帮她提交吧：  

```
git add list2.txt
git commit
```

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/git/img_18.png" alt="" />   

提交完成以后，push 到 GitHub：  

```
git push
```

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/git/img_19.png" alt="" />    

### 把她 push 的新代码拉取下来

GitHub 上有了同事的新代码以后，你就可以变回自己，把「她」刚 push 上去的代码拉取到你的仓库了。   

回到你自己的目录 git-practice，然后，把同事的代码取下来吧！   

从远程仓库更新内容，用的是一个新的指令：pull。  

```
git pull
```

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/git/img_20.png" alt="" />   

这时候再看看你的本地目录，可以看到，同事提交的 list2.txt 已经同步到本地了。   

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/git/img_21.png" alt="" />   

### push 发生冲突

你写了代码，commit，push 到 GitHub，然后她 pull 到她的本地；她再写代码，commit, push 到 GitHub，然后你再 pull 到你的本地。你来我往，配合得不亦乐乎。     

但是，这种合作有一个严重的问题：同一时间内，只能有一个人在工作。你和同事其中一个人写代码的时候，另一个人不能做事，必须等着她把工作做完，代码 push 到 GitHub 以后，自己才能把 push 上去的代码 pull 到自己的本地。  

如果同时做事，就会发生冲突：当一个人先于另一个人 push 代码，那么后 push 的这个人就会由于中央仓库上含有本地没有的提交而导致 push 失败。    

Git 的 push 其实是用本地仓库的 commits 记录去覆盖远端仓库的 commits 记录，而如果在远端仓库含有本地没有的 commits 的时候，push （如果成功）将会导致远端的 commits 被擦掉。这种结果当然是不可行的，因此 Git 会在 push 的时候进行检查，如果出现这样的情况，push 就会失败。   

1. 切到 git-practice-another 去，假扮你的同事做一个 commit，然后 push 到 GitHub。   
2. 切回 git-practice 变回你自己，做一个不一样的 commit。   

这时远端中央仓库已经有了别人 push 的 commit，现在你如果 push 的话：  

```
git push
```

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/git/img_22.png" alt="" />    

从图中的提示语可以看出，由于 GitHub 的远端仓库上含有本地仓库没有的内容，所以这次 push 被拒绝了。   

这种冲突的解决方式其实很简单：先用 pull 把远端仓库上的新内容取回到本地和本地合并，然后再把合并后的本地仓库向远端仓库推送。   

```
git pull
```

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/git/img_23.png" alt="" />    

这次的 git pull 并没有像之前的那样直接结束，而是进入了上图这样的一个输入提交信息的界面。   

这是因为当 pull 操作发现不仅远端仓库包含本地没有的 commits，而且本地仓库也包含远端没有的 commits 时，这时它就会把远端和本地的独有 commits 进行合并，自动生成一个新的 commit ，而图上的这个界面，就是这个自动生成的 commit 的提交信息界面。   

与手动的 commit 不同，这种 commit 会自动填入一个默认的提交信息，简单说明了这条 commit 的来由。你可以直接退出界面来使用这个自动填写的提交信息，也可以修改它来填入自己提交信息。   

> git pull 的内部实现就是把远程仓库使用 git fetch 取下来以后再进行 merge 操作。

退出提交信息的界面后，这次 pull 就完成了：远端仓库被取到了本地，并和本地仓库进行了合并。   

这时就可以再 push 一次了。由于现在本地仓库已经包含了所有远端仓库的 commits，所以这次 push 不会再失败：   

```
git push
```

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/git/img_24.png" alt="" />    