# 💻 Python - 基于 Pygame 的外星人入侵游戏


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

下面来让玩家能够左右移动飞船。我们将编写代码，在用户按左右方向键时做出响应。

##### 响应按键

在 Pygame 中，事件都是通过 pygame.event.get() 方法获取的，因此需要在 \_check_events() 方法中指定要检查的事件类型。

每当用户按键时，都将在 Pygame 中产生一个 KEYDOWN 事件。在检测到 KEYDOWN 事件时，需要检查按下的是否是触发行动的键。

如果玩家按下的是右方向键，就增大飞船的 rect.x 值，使飞船向右移动。

```python
def _check_events(self):
  """响应按键和鼠标事件"""
  for event in pygame.event.get():
    if event.type == pygame.QUIT:
      sys.exit()
    elif event.type == pygame.KEYDOWN:
      if event.key == pygame.K_RIGHT:
        self.ship.rect.x += 1
```

如果现在运行 alien_invasion.py，那么每按一次右方向键，飞船都将向右移动 1 像素。每按一次左方向键，飞船都将向左移动 1 像素。

##### 允许持续移动

当玩家按住右方向键不放时，我们希望飞船持续向右移动，直到玩家释放该键为止。我们将让游戏检测 pygame.KEYUP 事件，以便知道玩家何时释放右方向键。

我们将结合使用 KEYDOWN 和 KEYUP 事件以及一个名为 moving_right 的标志来实现持续移动。

当标志 moving_right 为 False 时，飞船不会移动。当玩家按下右方向键时，我们将这个标志设置为 True；当玩家释放该键时，我们将这个标志重新设置为 False。

飞船的属性都由 Ship 类控制，因此要给这个类添加一个名为 moving_right 的属性和一个名为 update() 的方法。update() 方法检查标志 moving_right 的状态。如果这个标志为 True，就调整飞船的位置。我们将在每次通过 while 循环时调用一次这个方法，以更新飞船的位置。

下面是对 Ship 类所做的修改：

```python
class Ship:
  """管理飞船的类"""
  def __init__(self, ai_game):
    --snip--
    self.rect.midbottom = self.screen_rect.midbottom
    self.moving_right = False
  def update(self):
    if self.moving_right:
      self.rect.x += 1
  def blitme(self):
    --snip--
```

接下来，需要修改 \_check_events()，使其在玩家按下右方向键时将 moving_right 设置为 True，并在玩家释放时将 moving_right 设置为 False：

```python
def _check_events(self):
  """响应按键和鼠标事件"""
  for event in pygame.event.get():
  --snip--
    elif event.type == pygame.KEYDOWN:
      if event.key == pygame.K_RIGHT:
        self.ship.moving_right = True
    elif event.type == pygame.KEYUP:
      if event.key == pygame.K_RIGHT:
        self.ship.moving_right = False
```

最后，需要修改 run_game() 中的 while 循环，以便在每次执行循环时都调用飞船的 update() 方法：

```python
def run_game(self):
  """开始游戏的主循环。"""
  while True:
    self._check_events()
    self.ship.update()
    self._update_screen()
    self.clock.tick(60)
```

如果现在运行 alien_invasion.py 并按下右方向键，飞船将持续向右移动，直到释放右方向键为止。

##### 左右移动

在飞船能够持续向右移动后，添加向左移动的逻辑很容易。我们再次修改 Ship 类和 \_check_events() 方法。

```python
def __init__(self, ai_game):
  --snip--
  self.moving_right = False
  self.moving_left = False
def update(self):
  if self.moving_right:
    self.rect.x += 1
  if self.moving_left:
    self.rect.x -= 1
```

还需要对 \_check_events() 做两处调整：

```python
def _check_events(self):
  """响应按键和鼠标事件"""
  for event in pygame.event.get():
  --snip--
    elif event.type == pygame.KEYDOWN:
      if event.key == pygame.K_RIGHT:
        self.ship.moving_right = True
      elif event.key == pygame.K_LEFT:
        self.ship.moving_left = True
    elif event.type == pygame.KEYUP:
      if event.key == pygame.K_RIGHT:
        self.ship.moving_right = False
      elif event.key == pygame.K_LEFT:
        self.ship.moving_left = False
```

如果此时运行 alien_invasion.py，将能够持续地左右移动飞船。如果同时按住左右方向键，飞船将纹丝不动。

##### 调整飞船的速度

当前，每次执行 while 循环时，飞船都移动 1 像素。我们可以在 Settings 类中添加属性 ship_speed，用于控制飞船的速度。我们将根据这个属性决定飞船在每次循环时最多移动多远。

```python
class Settings:
  """存储游戏《外星人入侵》中所有设置的类"""
  def __init__(self):
  --snip--
    self.ship_speed = 1.5
```

通过将速度设置指定为浮点数，可在稍后加快游戏的节奏时更细致地控制飞船的速度。然而，rect 的 x 等属性只能存储整数值，因此需要对 Ship 类做些修改。

```python
class Ship:
  """管理飞船的类"""
  def __init__(self, ai_game):
    """初始化飞船并设置其初始位置"""
    self.screen = ai_game.screen
    self.settings = ai_game.settings
    --snip--
    # 每艘新飞船都放在屏幕底部的中央
    self.rect.midbottom = self.screen_rect.midbottom
    # 在飞船的属性 x 中存储一个浮点数
    self.x = float(self.rect.x)
    # 移动标志(飞船一开始不移动)
    self.moving_right = False
    self.moving_left = False
  def update(self):
    """根据移动标志调整飞船的位置"""
    if self.moving_right:
      self.x += self.settings.ship_speed
    if self.moving_left:
      self.x -= self.settings.ship_speed
    # 根据 self.x 更新飞船的外接矩形
    self.rect.x = self.x
```

现在在 update() 中调整飞船的位置，self.x 的值会增减 settings.ship_speed 的值。更新 self.x 后，再根据它来更新控制飞船位置的 self.rect.x。self.rect.x 只存储 self.x 的整数部分，但对于显示飞船而言，问题不大。

##### 限制飞船的活动范围

当前，如果玩家按住方向键的时间足够长，飞船将移到屏幕之外，消失得无影无踪。下面我们来修复这个问题，让飞船到达屏幕边缘后停止移动。

```python
def update(self):
  if self.moving_right and self.rect.right < self.screen_rect.right:
    self.x += self.settings.ship_speed
  if self.moving_left and self.rect.left > 0:
    self.x -= self.settings.ship_speed
```

如果此时运行 alien_invasion.py，飞船将在触及屏幕左边缘或右边缘后停止移动。

##### 重构 \_check_events()

随着游戏的开发，\_check_events() 方法将越来越长。因此我们将其部分代码放在两个方法中，一个处理 KEYDOWN 事件，另一个处理 KEYUP 事件。

```python
def _check_keydown_events(self, event):
  if event.key == pygame.K_RIGHT:
    self.ship.moving_right = True
  elif event.key == pygame.K_LEFT:
    self.ship.moving_left = True

def _check_keyup_events(self, event):
  if event.key == pygame.K_RIGHT:
    self.ship.moving_right = False
  elif event.key == pygame.K_LEFT:
    self.ship.moving_left = False

def _check_events(self):
  """响应鼠标和按键事件"""
  for event in pygame.event.get():
    if event.type == pygame.QUIT:
      sys.exit()
    elif event.type == pygame.KEYDOWN:
      self._check_keydown_events(event)
    elif event.type == pygame.KEYUP:
      self._check_keyup_events(event)

```

##### 按 Q 键退出

当前，每次测试新功能时，都需要单击游戏窗口顶部的 X 按钮来结束游戏，实在是太麻烦了。因此，我们来添加一个结束游戏的键盘快捷键，Q 键。

```python
def _check_keydown_events(self, event):
  --snip--
  elif event.key == pygame.K_LEFT:
    self.ship.moving_left = True
  elif event.key == pygame.K_q:
    sys.exit()
```

现在测试这款游戏时，你可以直接按 Q 键来结束游戏，无须使用鼠标关闭窗口了。

##### 在全屏模式下运行游戏

Pygame 支持全屏模式，相比于常规窗口，你可能更喜欢在这种模式下运行游戏。

要在全屏模式下运行这款游戏，可在 **init** 中做出如下修改：

```python
def __init__(self):
  """初始化游戏并创建游戏资源"""
    pygame.init()
    self.settings = Settings()
    self.screen = pygame.display.set_mode((0, 0), pygame.FULLSCREEN)
    self.settings.screen_width = self.screen.get_rect().width
    self.settings.screen_height = self.screen.get_rect().height
```

在创建屏幕时，传入尺寸 (0, 0) 以及参数 pygame.FULLSCREEN，这让 Pygame 生成一个覆盖整个显示器的屏幕。由于无法预知屏幕的宽度和高度，要在创建屏幕后更新这些设置：使用屏幕的 rect 的属性 width 和 height 来更新对象 settings。

##### 完整代码

alien_invasion.py:

```python
import pygame

class Ship:
  """管理飞船的类"""

  def __init__(self, ai_game):
    """初始化飞船并设置其初始位置"""
    self.screen = ai_game.screen
    self.settings = ai_game.settings
    self.screen_rect = ai_game.screen.get_rect()

    # 加载飞船图像并获取其外接矩形
    self.image = pygame.image.load('images/ship.bmp')
    self.rect = self.image.get_rect()
    # 将飞船放在屏幕底部中央
    self.rect.midbottom = self.screen_rect.midbottom

    # 在飞船的属性 x 中存储一个浮点数
    self.x = float(self.rect.x)

    # 移动标志
    self.moving_right = False
    self.moving_left = False

  def blitme(self):
    """在指定位置绘制飞船"""
    self.screen.blit(self.image, self.rect)

  def update(self):
    """根据移动标志调整飞船的位置"""
    # 更新飞船的属性 x 的值，而不是其外接矩形的属性 x 的值
    if self.moving_right and self.rect.right < self.screen_rect.right:
      self.x += self.settings.ship_speed
    if self.moving_left and self.rect.left > 0:
      self.x -= self.settings.ship_speed

    # 根据 self.x 更新飞船的外接矩形
    self.rect.x = self.x

```

settings.py:

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
    # 飞船速度
    self.ship_speed = 1.5
```

ship.py:

```python
import pygame

class Ship:
  """管理飞船的类"""

  def __init__(self, ai_game):
    """初始化飞船并设置其初始位置"""
    self.screen = ai_game.screen
    self.settings = ai_game.settings
    self.screen_rect = ai_game.screen.get_rect()

    # 加载飞船图像并获取其外接矩形
    self.image = pygame.image.load('images/ship.bmp')
    self.rect = self.image.get_rect()
    # 将飞船放在屏幕底部中央
    self.rect.midbottom = self.screen_rect.midbottom

    # 在飞船的属性 x 中存储一个浮点数
    self.x = float(self.rect.x)

    # 移动标志
    self.moving_right = False
    self.moving_left = False

  def blitme(self):
    """在指定位置绘制飞船"""
    self.screen.blit(self.image, self.rect)

  def update(self):
    """根据移动标志调整飞船的位置"""
    # 更新飞船的属性 x 的值，而不是其外接矩形的属性 x 的值
    if self.moving_right and self.rect.right < self.screen_rect.right:
      self.x += self.settings.ship_speed
    if self.moving_left and self.rect.left > 0:
      self.x -= self.settings.ship_speed

    # 根据 self.x 更新飞船的外接矩形
    self.rect.x = self.x

```

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

