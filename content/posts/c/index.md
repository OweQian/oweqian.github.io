---
title: "‍💻 从 0 学习 C 语言"
date: 2023-03-30T00:20:00+08:00
weight: 4
tags: ["第二技能"]
categories: ["第二技能"]
---

朋友花了 700 多块送的 STM32 开发板，钱不能白花，我要先把 C 语言学会，加油吧！         

<!--more-->

## 两数相加

### 例题 1 

#### 题目内容  

输入两个正整数 a 和 b，输出 a + b 的值。其中 a,b <= 10000。   

#### 通关思路

基础输入输出。   

* #include 是包含头文件的语法。stdio.h 是输入输出相关的头文件，所有的 scanf 和 printf 都必须包含这个头文件。   
* main 函数是程序执行的入口，程序会检测到这个入口函数，然后开始向下执行。   
* 声明两个变量 a 和 b。   
* 通过控制台输入两个数字，并且赋值给 a 和 b。   
* 将 a + b 的结果输出到终端上。   
* return 0 是 main 函数的返回值语句，返回以后程序就结束了。   

#### 代码实现

```
#include <stdio.h>

int main() {
    int a, b;
    scanf("%d %d", &a, &b);
    printf("%d\n", a + b);
    return 0;
}
```

### 例题 2

#### 题目内容

先输入一个 t(t <= 100)，然后输入 t 组数据。对于每组数据，输入两个正整数 a 和 b，输出 a + b 的值。其中 a,b <= 10000。   

#### 通关思路

基础输入输出，循环。     

* while (expr) { body } 是一个循环语句的结构，其中 expr 表示表达式，而 body 则代表循环的内容。这里 expr 就是 t-- 了，当 t = 0 时，这个表达式的值为 0，整个循环结束。   

#### 代码实现

```
int main() {
    int a, b, t;
    scanf("%d", &t);
    while(t--) {
        scanf("%d %d", &a, &b);
        printf("%d\n", a + b);
    }
    return 0;
}
```

### 例题 3

#### 题目内容

循环输入，每输入两个正整数 a 和 b，就输出 a + b 的值。其中 a,b <= 10000。当没有任何输入时，结束程序。   

#### 通关思路

基础输入输出，循环。

* 当 scanf 返回 EOF 时，就代表没有任何输入了，正常情况下返回输入成功的数的个数。       
* EOF 是一个宏，可以认为它的值就是整数 -1。   

#### 代码实现

```
int main() {
    int a, b;
    while(scanf("%d %d", &a, &b) != EOF) {
        printf("%d\n", a + b);
    }
    return 0;
}
```

### 例题 4

#### 题目内容

循环输入，每输入两个正整数 a 和 b，就输出 a + b 的值。其中 a,b <= 10000。当输入的 a 和 b 都等于零时，结束程序。   

#### 通关思路

基础输入输出，循环。

* 只需要在循环体内，加上满足退出循环条件的判断即可，"a==0 && b==0，然后套上 if 语句和 break; 语句。   

#### 代码实现

```
int main() {
    int a, b;
    while(scanf("%d %d", &a, &b) != EOF) {
        if (a == 0 && b == 0)
            break;
        printf("%d\n", a + b);
    }
    return 0;
}
```

### 例题 5

#### 题目内容

实现一个函数 add，传入参数为 a 和 b，返回两者之和。    

#### 通关思路

函数定义。   

#### 代码实现

```
int add(int a, int b) {
    return a + b;
}
```

## 等差数列求和

### 题目内容

循环输入，每输入一个正整数 n(n <= 65535)，输出 1 + 2 + 3 + ... + n 的值，并且多输出一个空行。当没有任何输入时，结束程序。    

### 解题思路

* 由于 n <= 65535，完全可以通过循环的方式从 n 倒叙遍历到 1，然后将遍历到的数字进行累加输出。时间复杂度是 O(n)。   
* 等差数列求和公式：1 + 2 + 3 + ... + n = n * (n + 1) / 2。只要知道 n 的值，就可以在 O(1) 的时间内求得最终答案。    

### 代码实现

#### 错误解法

```
int main() {
    int n;
    while(scanf("%d", &n) != EOF) {
        int sum = n * (n + 1) / 2;
        printf("%d\n\n", sum);
    }
    return 0;
}
```

这行代码直接套用等差数列求和公式，但是这里有一个小问题。    

* 当 n 取最大值 65535 时，n * (n + 1) = 65535 * 65536 = (2 ** 16 - 1) * 2 ** 16 = 2 ** 32 - 2 ** 16，而 int 能够表示的最大值为 2 ** 31 - 1，所以产生了溢出，变成了负数。      

#### 循环枚举

```
int main() {
    int n, sum;
    while(scanf("%d", &n) != EOF) {
        sum = 0;
        while (n--) {
          sum += n;
          --n;
        }
        printf("%d\n\n", sum);
    }
    return 0;
}
```

* 初始化结果 sum 为 0。    
* while 语句循环自减 n，直到 n 为 0 为止。   
* 将当前 n 的值累加到 sum。    
* --n 等价于 n = n - 1。    

#### 奇偶性判断

```
int main() {
    int n, sum;
    while (scanf("%d", &n) != EOF) {
        if (n % 2 == 0) {
            sum = n / 2 * (n + 1);
            printf("%d\n\n", sum);
        } else {
            sum = (n + 1) / 2 * n;
            printf("%d\n\n", sum);
        }
    }
    return 0;
}
```

* n 和 n + 1 的奇偶性不同，两者相乘必然能被 2 整除。   
* 根据奇偶性来决定是用 n 去除 2，还是用 n + 1 去除 2，避免溢出。   
* % 代表取模的意思。   
* n 为偶数时，n 能被 2 整除，先计算 n / 2，在乘上 n + 1。    
* n 为奇数时，n + 1 能被 2 整除，先计算 (n + 1) / 2，在乘上 n。  

#### 无符号整形    

```
int main() {
    unsigned int n;
    while (scanf("%u", &n) != EOF) {
        unsigned int sum = n * (n + 1) / 2;
        printf("%u\n\n", sum);
    }
    return 0;
}
```

* 无符号整形的范围为 [0, 2 ** 32 - 1]，不用担心溢出问题。    

#### 64 位整形

```
int main() {
    long long n;
    while (scanf("%lld", &n) != EOF) {
        long long sum = n * (n + 1) / 2;
        printf("%lld\n\n", sum);
    }
    return 0;
}
```

* 64 位整形的范围为 [-2 ** 63, 2 ** 63 - 1]，不用担心溢出问题。   

## 变量交换

### 题目内容

循环输入，每输入两个数 a 和 b，交换两者的值后输出 a 和 b。当没有任何输入时，结束程序。    

### 解题思路

你有两个杯子 a 和 b，两个杯子里都盛满了水，现在想把两个杯子里的水交换一下，那么第一个想到的方法是什么？

找来一个临时杯子：    

* 先把 a 杯子的水倒进这个临时的杯子里。   
* 再把 b 杯子的水倒进 a 杯子里。  
* 最后把临时杯子里的水倒进 b 杯子。    

### 代码实现

#### 临时变量

```
#include <stdio.h>

int main() {
    int a, b, temp;
    while (scanf("%d %d", &a, &b) != EOF) {
        temp = a;
        a = b;
        b = temp;
        printf("%d %d\n", a, b);
    }
    return 0;
}
```

* temp = a：把 a 杯子的水倒进这个临时的杯子里。   
* a = b：把 b 杯子的水倒进 a 杯子里。   
* b = temp：把临时杯子里的水倒进 b 杯子里。    

#### 算术运算

```
int main() {
    int a, b;
    while (scanf("%d %d", &a, &b) != EOF) {
        a = a + b;
        b = a - b;
        a = a - b;
        printf("%d %d\n", a, b);
    }
    return 0;
}
```

* a = a + b：执行完毕后，现在最新的 a 的值变成原先的 a + b 的值。  
* b = a - b：执行完毕后，相当于 b 的值变成了 a + b - b，即原先 a 的值。   
* a = a - b：执行完毕后，相当于 a 的值变成了a + b - a，即原先 b 的值。    

#### 异或运算

```
int main() {
    int a, b;
    while (scanf("%d %d", &a, &b) != EOF) {
        a = a ^ b; // (1)
        b = a ^ b; // (2)
        a = a ^ b; // (3)
        printf("%d %d\n", a, b);
    }
    return 0;
}
```

* 两个相同的十进制数异或的结果一定位零。   
* 任何一个数和 0 的异或结果一定是它本身。   
* 异或运算满足结合律和交换律。
* (1)、(2)：相当于 b 等于 a ^ b ^ b，根据异或的几个性质，这时 b 的值已经变成原先 a 的值了。    
* (3)：相当于 a 等于 a ^ b ^ a，根据异或的几个性质，这时 a 的值已经变成了原先 b 的值了。     

## 条件运算

### 题目内容

先输入一个 t，然后输入 t 组数据，对于每组数据，输入两个整数 a 和 b，如果 a 能够被 b 整除，则输出 YES，否则输出 NO。     

### 解题思路

* 当 b 等于 0 时，a 是一定不能被 b 整除的。     
* a 除上 b 的余数是不是零，运算在 C 语言中表示为 a % b。    

### 代码实现

#### if else 语句

```
#include <stdio.h>

int main() {
    int a, b, t;
    scanf("%d", &t);
    while (t--) {
        scanf("%d %d", &a, &b);
        if (b == 0 || a % b) {
            printf("NO\n");
        } else {
            printf("YES\n");
        }
    }
    return 0;
}
```

* 输入 t 组数据。    
* 当 t = 0 时，循环结束。   
* 用逻辑运算符 ||（或）对两种情况输出 NO，一种是 b 等于 0，另一种是 a % b 不等于 0。    

#### 条件运算符

```
#include <stdio.h>

int main() {
    int a, b, t;
    scanf("%d", &t);
    while (t--) {
        scanf("%d %d", &a, &b);
        printf("%s\n", b == 0 || a % b ? "NO" : "YES");
    }
    return 0;
}
```

* 采用条件运算符 ?: 来实现 if else 语句的功能。    

## 绝对值

### 题目内容

循环输入，每输入一个浮点数 a（其中 a ≤ 10000），就输出 a 的绝对值，精确到小数点后两位。当没有任何输入时，结束程序。   

### 解题思路

* 利用数学库函数 fabs 对一个数取绝对值，需要包含头文件 math.h。   
* 利用 %lf 进行格式化输入。     
* 利用 %.2lf 进行格式化输出，代表输出小数点后两位。     

### 代码实现

```
#include <stdio.h>
#include <math.h>

int main() {
    double a;
    while (scanf("%lf", &a) != EOF) {
       printf("%.2lf\n", fabs(a));
    }
    return 0;
}
```

## 欧几里得距离

### 题目内容

循环输入，每组输入为四个浮点数，分别代表两个点，即 (x1, y1) 和 (x2, y2)，求输出这两个点之间的距离，精确到小数点后两位。当没有任何输入，结束程序。   

### 解题思路

两个点 (x1, y1) 和 (x2, y2) 之间的距离（如果没有特别说明，一般指欧几里得距离），可以对两个坐标间差值的平方和再开方得到，即：   

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/c/img.png" alt="" width="200" />  

* 引入数学库的头文件 math.h，平方开方函数 sqrt。   
* 实现一个简单的平方函数，返回 x * x。    
* 套用距离公式，将值存在 ans 中，输出 ans。   

### 代码实现

```
#include<stdio.h>
#include<math.h>

double x[2], y[2];
double sqr(double x) {
    return x * x;
}

int main() {
    while(scanf("%lf %lf %lf %lf", &x[0], &y[0], &x[1], &y[1]) != EOF) {
        double ans = sqrt(sqr(x[0] - x[1]) + sqr(y[0] - y[1]));
        printf(".2lf\n", ans);
    }
    return 0;
}
```

## 阶乘

### 题目内容

循环输入，每输入一个正整数 n (n ≤ 12)，输出 1 * 2 * 3 * ... * n 的值，当没有任何输入时，结束程序。      

### 解题思路

* 阶乘：f(n) = 1 * 2 * 3 * ... * n。    
* 递推式：f(n) = n * f(n - 1) (n > 0)。    

### 代码实现

#### 迭代

```
int main() {
    int ans, n;
    while (scanf("%d", &n) != EOF) {
        ans = 1;
        while (n) {
            ans *= n;
            --n;
        }
        printf("%d\n", ans);
        
    }
    return 0;
}
```

* 初始化 ans 为1。    
* while 语句执行循环，一直自减 n，直到 n 减为零为止。     
* 将当前 n 的值累乘给 ans。    

#### 递龟    

* 封装 factorial(n)，自己调自己。     
* 当参数为 0 或者 1 时，直接返回 1，代表 0 和 1 的阶乘都为 1。     
* 套用上述公式 f(n) = n * f(n-1) 实现递归调用。     

```
#include <stdio.h>

int factorial(int n) {
    return n <= 1 ? 1 : n * factorial(n - 1);
}

int main() {
    int n;
    while (scanf("%d", &n) != EOF) {
        printf("%d\n", factorial(n)); 
    }
    return 0;
}
```

## ASCII 码

### 题目内容

循环输入，每组输入数据为一个字符，如果字符不是小写英文字母则原样输出；如果是小写英文字母则转换成大写字母后输出。当没有输入时，程序结束。   

### 解题思路

本题考验的是对 C 语言的 ASCII 码的理解。在 C 中，字符 char 对应的是 [-128, 127] 的码值。但实际上并不需要关心每个字母的 ASCII 码是多少。只需要把它当做一个符号，并满足两种规则：    

* 加减法：例如 'A' + 2 和 'C' 等价，'z' - 1 和 'y' 等价。原因是大写字母和小写字母的 ASCII 码值是连续的。   

* 关系比较：例如 'C' > 'A'、'a' <= 'z'。   

输入一个字符，首先通过关系比较来判断它是否是一个小写字母，确定是小写字母后，用它减去 'a' 得到一个偏移量，然后再加上 'A'，就可以得到它的大写形式。     

### 代码实现  

```
#include <stdio.h>

int isLowerCase(char c) {
    return c >= 'a' && c <= 'z';
}

char getUpperCase(char c) {
    return c - 'a' + 'A';
}

int main() {
    char c;
    while (scanf("%c", &c) != EOF) {
        if (isLowerCase(c)) {
            c = getUpperCase(c);
        }
        printf("%c\n", c);
    }
    return 0;
}
```

## 最值

### 题目内容

循环输入。每组数据先输入 n (n ≤ 10000)，再输入 n 个正整数 a[i] (a[i] ≤ 10000)，输出其中最大的数。当没有任何输入时，程序结束。    

### 解题思路

* 封装最大值函数：给定两个数，取其中最大者。   
* 使用 for 循环输入 n 个正整数 a。    
* 对每个输入的数 a 和 maxv 比大小，迭代求最大值。    

### 代码实现  

```
#include <stdio.h>

int max(int a, int b) {
    return a > b ? a : b;
}

int main() {
    int n, a, i, maxv;
    while(scanf("%d", &n) != EOF) {
        for (i = 0; i < n; ++i) {
            scanf("%d", &a);
            if (i == 0) {
                maxv = a;
            }
            maxv = max(maxv, a);
        }
        printf("%d\n", maxv);
    }
    return 0;
}
```

## 平均数

### 题目内容

循环输入。每组数据先输入 n (n ≤ 10000)，再输入 n 个正整数 a[i] (a[i] ≤ 10000)，输出它们的平均数，精确到小数点后两位小数。当没有任何输入时，程序结束。   

### 解题思路

* n 个数的平均数就是：这 n 个数的和除上 n。   
* 所有数字和不能被 n 整除时，就会出现浮点数，需要将平均数定义为 double。   
* 一组数据开始输入前，将平均数 avg 置为零。      
* 每输入一个数，就把它累加到 avg 上。   
* 除上 n 得到平均数。   

### 代码实现

```
#include <stdio.h>

int main() {
    int n, a, i;
    double avg;
    while (scanf("%d", &n) != EOF) {
        avg = 0; 
        for (i = 0; i < n; ++i) {
            scanf("%d", &a);
            avg += a;
        }
        printf("%.2lf\n", avg / n);
    }
    return 0;
}
```
