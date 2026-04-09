# 🧠 AI - Claude Code 5 分钟快速上手


先花几分钟，把 Claude Code 用起来。

<!--more-->

第一步，在[这里](https://code.claude.com/docs/en/desktop)下载匹配你系统的 Claude Code 版本。

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/cc/img_01.png" alt="" width="40%" style="display: block; margin: 0 auto;" />

安装过程非常简单，跟着官方的说明就好。

```
# macOS / Linux / WSL（推荐，自动更新）
curl -fsSL https://claude.ai/install.sh | bash

# Windows PowerShell
irm https://claude.ai/install.ps1 | iex

# 或使用 Homebrew（需手动更新）
brew install --cask claude-code
```

然后进入操作系统的命令行，输入 claude 这个命令就可以开始对话了。

```
claude              # 首次运行会提示登录
```

Claude Code 是付费软件，需要在 Claude 网站开账户。它所支持的账户类型包括：

- Claude Pro / Max / Teams / Enterprise（推荐）
- Claude Console（API 访问，需预付费）

下面是最基本的命令行交互方式以及常用命令的速查表。

```
cd /path/to/your/project   # 进入项目目录
claude                      # 启动交互模式

# 然后你可以：
> 这个项目是做什么的？              # 了解项目
> 帮我加一个 hello world 函数      # 修改代码（会请求确认）
> 提交我的更改                      # Git 操作
```

| 命令              | 声明           |
| ----------------- | -------------- |
| claude            | 启动交互模式   |
| claude "任务描述" | 执行单次任务   |
| claude -p "问题"  | 快速查询后退出 |
| claude -c         | 继续最近的对话 |
| claude -r         | 恢复之前的对话 |
| /help             | 帮助           |
| Ctrl + C 或 exit  | 退出           |

