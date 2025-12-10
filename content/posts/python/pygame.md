---
title: "💻 Python - 基于 Pygame 的外星人入侵游戏"
date: 2025-12-09T12:34:56+08:00
tags: ["Python"]
categories: ["Python"]
---

基于 Pygame 的外星人入侵游戏。

<!--more-->

我们来开发一个名为《外星人入侵》的游戏吧！为此，我们将使用 Pygame 这个功能强大而且非常有趣的模块，它可以管理游戏中用到的图像、动画甚至声音，让你能够更轻松地开发复杂的游戏。使用 Pygame 来处理在屏幕上绘制图像等任务，有助于你将重心放在设计游戏的高级逻辑上。

### 规划项目

在开发大型项目时，先制定好规划再动手编写代码很重要。规划可保证你不偏离轨道，提高项目成功的可能性。

下面来为游戏《外星人入侵》编写大概得玩法说明，虽然没有涵盖这款游戏的所有细节，但能让你清楚地知道该如何动手开发它。

```markdown
在游戏《外星人入侵》中，玩家控制着一艘最初出现在屏幕底部中央的武装飞船。
玩家可以使用方向键左右移动武装飞船，使用空格键进行射击。
当游戏开始时，一个外星舰队出现在天空中，并向屏幕下方移动。
玩家的任务是消灭这些外星人。
玩家将外星人消灭干净后，将出现一个新的外星舰队，其移动速度更快。
只要有外星人撞到玩家的武装飞船或到达屏幕下边缘，玩家就损失一艘武装飞船。
玩家损失三艘武装飞船后，游戏结束。
```

### 安装 Pygame

开始写程序前，需要安装 Pygame。

创建虚拟环境（在项目根目录）：

```
python3 -m venv venv
```

激活环境：

```
source venv/bin/activate
```

安装 Pygame

```
pip install pygame
```

### 开始游戏项目

现在开始开发游戏《外星人入侵》。首先创建一个空的 Pygame 窗口，稍后将在其中绘制游戏元素，如武装飞船和外星人。之后，我们还将让这个游戏响应用户输入，设置背景色，加载飞船图像等。

#### 创建 Pygame 窗口

首先创建一个表示游戏的类，以创建空的 Pygame 窗口。

在文本编辑器中新建一个文件，文件名为 alien_invasion.py，输入以下代码：

```python
import sys
import pygame

class AlienInvasion:

  def __init__(self):
    """初始化游戏并创建游戏资源"""
    pygame.init()
    # 创建窗口，固定大小 1200x800
    self.screen = pygame.display.set_mode((1200, 800))
    # 设置窗口标题
    pygame.display.set_caption('Alien Invasion')

  def run_game(self):
    """开始游戏的主循环"""
    while True:
      # 监听键盘和鼠标事件
      for event in pygame.event.get():
        # 响应窗口关闭事件
        if event.type == pygame.QUIT:
          sys.exit()
      # 刷新屏幕内容
      pygame.display.flip()

"""启动游戏"""
if __name__ == '__main__':
  ai = AlienInvasion()
  ai.run_game()
```

运行 alien_invasion.py，将看到一个空的 Pygame 窗口。

```
python3 alien_invasion.py
```

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/pygame/img_01.png" alt="" width="80%" />

#### 控制帧率

理想情况下，游戏在所有的系统中都应以相同的速度(帧率)运行。Pygame 提供了一种相对简单的方式来达成这个目标。

我们将创建一个时钟，并确保它在主循环每次通过后都进行计时。当这个循环的通过速度超过我们定义的帧率时，Pygame 会计算需要暂停多长时间，以便游戏的运行速度保持一致。

```python
  def __init__(self):
    """初始化游戏并创建游戏资源"""
    pygame.init()
    # 创建时钟对象
    self.clock = pygame.time.Clock()
    --snip--
```

```python
def run_game(self):
    """开始游戏的主循环"""
    while True:
      --snip--
      # 刷新屏幕内容
      pygame.display.flip()
      # 设置帧率
      self.clock.tick(60)
```

tick() 方法接受一个参数：游戏的帧率。这里使用的值是 60，Pygame 将尽可能确保这个循环每秒恰好运行 60 次。

#### 设置背景色

Pygame 默认创建一个黑色屏幕，这太乏味了。我们将背景设置为另一种颜色。

```python
def __init__(self):
    --snip--
    # 设置窗口标题
    pygame.display.set_caption('Alien Invasion')
    self.bg_color = (230, 230, 230)

  def run_game(self):
    """开始游戏的主循环"""
    while True:
      --snip--
      # 填充背景颜色
      self.screen.fill(self.bg_color)
      # 刷新屏幕内容
      pygame.display.flip()
      # 设置帧率
      self.clock.tick(60)
```

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/pygame/img_02.png" alt="" width="80%" />

#### 创建 Settings 类

每次给游戏添加新功能时，通常会引入一些新的设置。下面来编写一个名为 Settings 的模块，其中包含一个名为 Settings 的类，用于将所有设置都存储在一个地方，以免在代码中到处添加设置。

每当需要访问设置时，只需要使用一个 settings 对象。

在项目规模增大时，这还让游戏的外观和行为修改起来更加容易。

在项目根目录新建一个名为 settings.py 的文件，添加如下代码：

```python
class Settings:
  """存储游戏《外星人入侵》中所有设置的类"""

  def __init__(self, screen_width=1200, screen_height=800, caption='Alien Invasion', bg_color=(230, 230, 230)):
    """初始化游戏的静态设置"""
    # 屏幕设置
    self.screen_width = screen_width
    self.screen_height = screen_height
    self.caption = caption
    self.bg_color = bg_color
```

在项目中创建 Settings 实例，并使用这个实例来访问设置。

```python

import sys
import pygame

from settings import Settings

class AlienInvasion:

  def __init__(self):
    """初始化游戏并创建游戏资源"""
    pygame.init()
    self.settings = Settings()
    # 创建时钟对象
    self.clock = pygame.time.Clock()
    # 创建窗口，固定大小 1200x800
    self.screen = pygame.display.set_mode((self.settings.screen_width, self.settings.screen_height))
    # 设置窗口标题
    pygame.display.set_caption(self.settings.caption)

  def run_game(self):
    """开始游戏的主循环"""
    while True:
      # 监听键盘和鼠标事件
      for event in pygame.event.get():
        # 响应窗口关闭事件
        if event.type == pygame.QUIT:
          sys.exit()
      # 填充背景颜色
      self.screen.fill(self.settings.bg_color)
      # 刷新屏幕内容
      pygame.display.flip()
      # 设置帧率
      self.clock.tick(60)

"""启动游戏"""
if __name__ == '__main__':
  ai = AlienInvasion()
  ai.run_game()
```

### 武装飞船

在开发的第一个阶段，我们将创建一艘武装飞船，这艘武装飞船在用户按方向键时能左右移动，并在用户按空格键时开火。设置这种行为后，就可以创建外星人以提高游戏的可玩性了。

#### 添加飞船图像

在游戏中，可以使用几乎任意类型的图像文件，但使用位图(.bmp)文件最为简单，因为 Pygame 默认加载位图。虽然可配置 Pygame 以使用其他文件类型，但有些文件类型要求你在计算机上安装相应的图像库。网上的大多数图像是 .jpg 和 .png 格式的，不过可以使用 Photoshop、GIMP 等工具将其转换为位图。

在选择图像时，要特别注意背景色。请尽可能选择背景为透明色或纯色的图像，以便使用图像编辑器将背景改成任意颜色。当图像的背景色与游戏的背景色一致时，游戏看起来最漂亮。

就游戏《外星人入侵》而言，武装飞船图像可使用文件 ship.bmp，在项目根目录新建文件夹 images，并将文件 ship.bmp 保存在文件夹中。

##### 创建 Ship 类

选择好用于表示武装飞船的图像后，需要将其显示在屏幕上。我们创建一个名为 ship 的模块，其中包含 Ship 类，负责管理武装飞船的大部分行为。

在项目根目录新建一个名为 ship.py 的文件，添加如下代码：

```python
import pygame

class Ship:
  """管理飞船的类"""

  def __init__(self, ai_game):
    """初始化飞船并设置其初始位置"""
    self.screen = ai_game.screen
    self.screen_rect = ai_game.screen.get_rect()

    # 加载飞船图像并获取其外接矩形
    self.image = pygame.image.load('images/ship.bmp')
    self.rect = self.image.get_rect()
    # 将飞船放在屏幕底部中央
    self.rect.midbottom = self.screen_rect.midbottom

  def blitme(self):
    """在指定位置绘制飞船"""
    self.screen.blit(self.image, self.rect)

```

##### 在屏幕上绘制飞船

下面更新 alien_invasion.py，创建一艘飞船并调用其方法 blitme()。

```python
--snip--
from settings import Settings
from ship import Ship

class AlienInvasion:

  def __init__(self):
    --snip--
    # 设置窗口标题
    pygame.display.set_caption(self.settings.caption)
    # 创建飞船实例
    self.ship = Ship(self)

  def run_game(self):
      --snip--
      # 填充背景颜色
      self.screen.fill(self.settings.bg_color)
      # 绘制飞船
      self.ship.blitme()
      # 刷新屏幕内容
      pygame.display.flip()
      # 设置帧率
      self.clock.tick(60)
```

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/pygame/img_03.png" alt="" width="80%" />

#### 重构

重构旨在简化既有代码的结构，使其更容易扩展。我们将把越来越长的 run_game() 方法拆分成两个辅助方法。辅助方法一般只在类中调用，不会在类外调用。在 Python 中，辅助方法的名称以单下划线打开。

##### \_check_events 方法

我们将管理事件的代码移到一个名为 \_check_events() 的方法中，以简化 run_game() 并隔离事件循环。通过隔离事件循环，可将事件管理与游戏的其他方面分离。

```python
  def _check_events(self):
    # 监听键盘和鼠标事件
    for event in pygame.event.get():
      # 响应窗口关闭事件
      if event.type == pygame.QUIT:
        sys.exit()
  def run_game(self):
    """开始游戏的主循环"""
    while True:
      self._check_events()
      --snip--
```

##### \_update_screen 方法

为了进一步简化 run_game()，我们把更新屏幕的代码移到一个名为 \_update_screen() 的方法中。

```python
  def _update_screen(self):
    """更新屏幕上的图像，并切换到新屏幕"""
    # 填充背景颜色
    self.screen.fill(self.settings.bg_color)
    # 绘制飞船
    self.ship.blitme()
    # 刷新屏幕内容
    pygame.display.flip()

  def run_game(self):
    """开始游戏的主循环"""
    while True:
      self._check_events()
      self._update_screen()
      # 设置帧率
      self.clock.tick(60)
```

#### 驾驶飞船

#### 射击

### 外星人

#### 创建第一个外星人

#### 创建外星舰队

#### 让外星舰队移动

#### 击落外星人

#### 结束游戏

#### 确定应运行游戏的哪些部分

### 记分

#### 添加 Play 按钮

#### 提高难度

#### 记分

### 总结
