# C++ 必知必会


项目地址： [learningC-](https://github.com/OweQian/learningC-)

## VSCode C++ 环境配置

### VSCode 下载  

官网下载 [Visual Studio Code](https://code.visualstudio.com/)  

<img src="/images/c++/img_02.png" alt="" width="500" />  

### 扩展包安装  

* C/C++  

<img src="/images/c++/img_01.png" alt="" width="500" />  

* CodeLLDB  

<img src="/images/c++/img.png" alt="" width="500" />  

### 环境配置  

新建 main.cpp 文件，输入以下代码：  

```
#include <iostream>
int main() {
    std::cout << "hello world" << std::endl;
    char c = std::getchar();
    return 0;
}
```

点击运行调试，选择 C++ (GDB/LLDB)  

<img src="/images/c++/img_04.png" alt="" width="500" />  

选择 g++ 生成和调试活动文件  

<img src="/images/c++/img_03.png" alt="" width="500" />  

在 .vscode 中会生成两个文件，对这两个文件进行配置：  

<img src="/images/c++/img_1.png" alt="" width="500" />  

* launch.json   
```
{
    // 使用 IntelliSense 了解相关属性。 
    // 悬停以查看现有属性的描述。
    // 欲了解更多信息，请访问: https://go.microsoft.com/fwlink/?linkid=830387
    "version": "0.2.0",
    "configurations": [
        {
            "type": "lldb",
            "request": "launch",
            "name": "C++ debug",   
            "program": "${fileDirname}/${fileBasenameNoExtension}",
            "args": [],
            "cwd": "${workspaceFolder}",
            "preLaunchTask": "C/C++: g++ 生成活动文件"
        }
    ]
}
```
* tasks.json
```
{
    "tasks": [
        {
            "type": "cppbuild",
            "label": "C/C++: g++ 生成活动文件",
            "command": "/usr/bin/g++",
            "args": [
                "-std=c++17",
                "-stdlib=libc++",
                "-fdiagnostics-color=always",
                "-g",
                "-Wall",
                "${file}",
                "-o",
                "${fileDirname}/${fileBasenameNoExtension}"
            ],
            "options": {
                "cwd": "${fileDirname}"
            },
            "problemMatcher": [
                "$gcc"
            ],
            "group": {
                "kind": "build",
                "isDefault": true
            },
            "detail": "调试器生成的任务。"
        }
    ],
    "version": "2.0.0"
}
```

至此，C++ 环境配置完成。  

运行项目，输出结果：  

<img src="/images/c++/img_2.png" alt="" width="500" />  

