---
title: "‍💻 从 0 学习 C 语言"
date: 2023-04-13T10:50:00+08:00
weight: 3
tags: ["第二技能"]
categories: ["第二技能"]
---

朋友花了 700 多块送的 STM32 开发板，钱不能白花，我要先把 C 语言学会，加油吧！         

<!--more-->

## 日期   

### 题目内容

循环输入。每次输入为一个字符串，字符串的格式为 YYYY/MM/DD，即 YYYY 年 MM 月 DD 日。要求输出这是一年的第几天。当没有任何输入时，程序结束。   

### 解题思路

* 对于 YYYY 年 MM 月 DD 日，1 到 MM - 1 月总共有 X 天，答案就是 X + DD。    
* 闰年的 2 月有 29 天，平年的 2 月则是 28 天。   
* 闰年就是模 4 为零且模 100 不为零，或者模 400 为零的年份。     

### 代码实现

```
#include <stdio.h>

int monthday[] = {
    0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31
};

int sumday[13];
int y, m, d;

int main() {
    int i;
    while (1) {
        if (scanf("%4d/%2d/%2d", &y, &m, &d) == 3) {
            monthday[2] = y % 4 == 0 && y % 100 || y % 400 == 0 ? 29 : 28;
            sumday[0] = 0;
            for (i = 1; i <= 12; ++i) {
                sumday[i] = sumday[i - 1] + monthday[i];
            }
            int ans = sumday[m - 1] + d;
            printf("%d\n", ans);
        }
    }
    return 0;
}
```
### 调试结果

<img src="https://oweqian.oss-cn-hangzhou.aliyuncs.com/c/img_01.png" alt="" width="200" />  

## 合法标识符

### 题目内容

循环输入。每组输入为一个长度不超过 80 的字符串，判断它是否是 C 语言合法标识符。没有任何输入时，程序结束。C 语言合法标识符需要满足如下条件：   

1）出现空格 (或 tab) 非法。   
2）首字符不能是数字。    
3）中间不能出现空格。   
4）字符集合只有 数字、_、大写字母、小写字母。    

### 解题思路

* 空字符串判定。   
* 首字符是数字判定。  
* 中间出现空格或者 tab 判定。    
* 非合法字符判定。    

### 代码实现

```
#include <stdio.h>
const int __UNDEFINE = 100000;
char str[100];
int isnum(char c) {
    return c >= '0' && c <= '9';
}
int is_space_or_tab(char c) {
    return c == ' ' || c == '\t';
}
int judge_char(char c) {
    if (isnum(c)) return 1;
    if (c >= 'a' && c <= 'z') return 1;
    if (c >= 'A' && c <= 'Z') return 1;
    if (c == '_') return 1;
    return 0;
}
int judge(const char* str) {
    int i;
    int s, t;
    s = __UNDEFINE;
    t = 0;
    for (i = 0; str[i]; ++i) {
        if (!is_space_or_tab(str[i])) {
            if (s == __UNDEFINE) {
                s = i;
            }
            t = i;
        }
        else {
            return 0;
        }
    }
    if (s > t) {                       // (1)
        return 0;
    }
    if (isnum(str[s])) {               // (2)
        return 0;
    }
    for (i = s; i <= t; ++i) {         
        if (is_space_or_tab(str[i])) { // (3)
            return 0;
        }
        if (!judge_char(str[i])) {     // (4)
            return 0;
        }
    }
    return 1;
}
int main() {
    int t;
    scanf("%d", &t);
    getchar();
    while (t--) {
        gets(str);
        printf("%s\n", judge(str) ? "yes" : "no");
    }
    return 0;
}
```

## 安全密码

### 题目内容

循环输入。每次输入一个长度不超过 20 的密码字符串，判断这个串是否是一个安全密码串，是则输出 YES，否则输出 NO，没有任何输入的时候，程序结束。   

安全密码串的条件如下：   

1）长度在 8 到 16 之间。       
2）至少有小写字母、大写字母、数字、特殊字符 中的任意三种。    
3）特殊字符为 ~!@#$%^ 的其中之一。    

### 解题思路

用关系运算符来对字符之间比较，确定这个字符属于哪个范围。   

* 小写字母：'a' <= ch && ch <= 'z'；大写字母：'A' <= ch && ch <= 'Z'；数字：'0' <= ch && ch <= '9'。   
* int isSpecialChar(char c) 循环遍历特殊字符的字符串，判断给定的字符 c 是否属于特殊字符。如果属于返回 1，否则返回 0。     
* 长度不达标的直接输出 NO。   
* 对整个输入的密码串循环遍历，判断每一个字符，是否存在四类字符，用 typ[] 哈希数组进行标记。    
* typ[] 哈希数组中，每个数要么是 0 要么是 1，如果加起来大于等于 3，说明至少存在三类字符，是一个安全密码，直接输出 YES；否则，输出 NO。     

### 代码实现

```
#include <stdio.h>
#include <string.h>

char specialChar[] = "~!@#$%^";
int isSpecialChar(char c) {
    for (int i = 0; specialChar[i]; ++i) {
        if (specialChar[i] == c) {
            return 1;
        } 
    }
    return 0;
} 

char str[100];
int typ[4];

int main() {
    int t;
    scanf("%d", &t);
    while (t--) {
       scanf("%s", &str);
       if (strlen(str) < 8 || strlen(str) > 16) {
            printf("NO\n");
            continue;
       }
       typ[0] = typ [1] = typ[2] = typ[3] = 0;
       for (int i = 0; str[i]; ++i) {
            if (str[i] >= 'a' && str[i] <= 'z') typ[0] = 1;
            if (str[i] >= 'A' && str[i] <= 'Z') typ[1] = 1;
            if (str[i] >= '0' && str[i] <= '9') typ[2] = 1;
            if (isSpecialChar(str[i])) typ[3] = 1;
       }
       if (typ[0] + typ[1] + typ[2] + typ[3] >= 3) {
            printf("YES\n");
       } else {
            printf("NO\n");
       }
    }
    return 0;
}
```

## 图形打印

### 题目内容

循环输入。对于每个输入的整数 n，打印出一个直角边为 n 的等腰直角三角形。字符用 *，当没有任何输入时，程序结束。例如输入 4，输出如下：

```
*
**
***
****
```

### 解题思路

二维循环，第一维循环的边界条件为 n。二维循环的边界条件，分别是：1、2、3、...、i。根据一维循环的循环变量，得到二维循环的边界条件。

* 第一层循环，i ∈ [1,n]，i 代表在第 i 行输出的字符个数为 i。
* 第二层循环，j ∈ [1,i]，边界就是第一层循环的 i。
* 打印 * 字符。
* 打印回车字符，表示输出结束了。

### 代码实现

```
#include <stdio.h>
int main() {
    int n, i, j;
    while(scanf("%d", &n) != EOF) {
        for (i = 1; i <= n; ++i) {
            for (j = 1; j <= i; ++j) {
                printf("*");
            }
            printf("\n");
        }
    }
    return 0;
}
```

## 整数逆序

### 题目内容

循环输入。每次输入为一个正整数 a (a ≤ 10 ** 9)，现在需要对这个正整数进行逆序输出。当没有任何输入时，程序结束。

### 解题思路

获取一个整数的最低位只要对这个数模 10 即可。而次低位则只需要原数除上 10 以后，再模 10 就能得到，以此类推，不断循环，直到所有的数都除尽，最后这个数变成 0，结束循环。

### 代码实现

```
#include <stdio.h>
int main() {
    int a;
    while (scanf("%d", &a) != EOF) {
        while (a) {
            printf("%d", a % 10);
            a /= 10;
        }
        printf("\n");
    }
    return 0;
}
```

## 字符串翻转

### 题目内容

循环输入。每组输入是一个长度不超过 1000 的字符串，现在需要对这个字符串进行翻转后输出，当没有任何输入时，程序结束。    

### 解题思路

两种解法：

第一种：本地字符串不进行修改，从后往前对这个字符串按照字符一个一个输出。     

第二种：修改本地字符串，循环对收尾的字符交换位置后输出整个字符串的值。    

### 代码实现

* 对于字符串相关的操作，需要引入头文件 string.h。   
* 任何一个字符串都是以 '\0' 结尾，一个长度为 n 的字符串，实际占用的字节数为 n + 1。   
* 对字符串进行输入的时候，不需要加 &。    
* strlen 函数，返回传入的字符串的长度。

#### 下标逆序

```
#include <stdio.h>
#include <string.h>

int main() {
    int i, len;
    char str[1000+1];
    while (scanf("%s", str) != EOF) {
        len = strlen(str);
        for (i = len - 1; i >= 0; --i) {
            printf("%c", str[i]);
        }
        printf("\n");
    }
    
    return 0;
}
```

#### 下标交换

```
#include <stdio.h>
#include <string.h>

void swap(char* x, char* y) {
    char tmp = *x;
    *x = *y;
    *y = tmp;
}

int main() {
    int i, len;
    char str[1000 + 1];
    while(scanf("%s", str) != EOF) {
        len = strlen(str);
        for (i = 0; i < len / 2; ++i) {
            swap(&str[i], &str[len - 1 - i]);
        }
        printf("%s\n", str);
    }
    return 0;
}
```

## 三数大小

### 题目内容

循环输入。每组输入数据为三个整数 a, b, c (a, b, c ≤ 10 ** 9)，输出它们排序后的值，以空格分隔。当没有任何输入时，程序结束。

### 解题思路

* 采用冒泡的思想，把大的数尽量往右靠。
* 假设最初的排列顺序为 a b c，做如下操作：
* 首先，比较 a 和 b 的大小，如果 a > b，则交换 a 和 b 的值。
* 然后，比较 b 和 c 的大小，如果 b > c，则交换 b 和 c 的值。
* 最后，不确定的就是：目前 a 和 b 的关系不一定有序。所以，如果 a > b，则交换 a 和 b 的值，这步执行完毕以后，一定可以满足 a < b < c。
* swap 函数用来实现对两个整数的交换，int* x 代表一个指针，指向某个变量的地址，函数体执行的是交换两个变量的操作。其中，*x 代表的是取地址中的值。
* swap 函数的参数是指针，需要用 & 符号把变量转换成它的地址，即指针。

### 代码实现

```
#include <stdio.h>

void swap(int* x, int* y) {
    int tmp = *x;
    *x = *y;
    *y = tmp;
}

int main() {
    int a, b, c;
    while(scanf("%d %d %d", &a, &b, &c) != EOF) {
        if (a > b) swap(&a, &b);
        if (b > c) swap(&b, &c);
        if (a > b) swap(&a, &b);
        printf("%d %d %d\n", a, b, c);
    }
    return 0;
}
```

## 圆公式

### 题目内容

循环输入。每输一个正整数 r，计算圆周长和圆面积，输出这两个浮点数并以空格分隔 ，均精确到小数点后六位。当没有任何输入时，程序结束。

### 解题思路

* 圆周长公式：2 * π * r。
* 圆面积公式：π * r * r。
* π = acos(-1)。
* 定义常量 PI。
* %lf 等价于 %.6lf，默认输出六位。

### 代码实现

```
#include <stdio.h>
#include <math.h>

const double PI = acos(-1.0);

int main() {
    double r;
    while (scanf("%lf", &r) != EOF) {
        double c = 2 * PI * r;
        double s = PI * r * r;
        printf("%lf %lf\n", c, s);
    }
    return 0;
}
```

## 整数溢出

### 题目内容

先输入一个 t (t ≤ 100)，然后输入 t 组数据。每组输入为 4 个正整数 a, b, c, d (0 ≤ a,b,c,d ≤ 2 ** 62)，输出 a + b + c + d 的值。

### 解题思路

* 四个数的范围：[0, 2 ** 62]，这四个数加起来的和最大值为 2 ** 64。
* long long 的最大值为：2 ** 63 - 1，unsigned long long 的最大值为：2 ** 64 - 1。
* 只有四个数均为最大值 2 ** 62 时，结果才为 2 ** 64，对这一情况进行特殊判断。
* 64 位无符号整型，ull 作为 unsigned long long 的别名。
* 常量 MAX 表示 2 ** 62，使用左移运算符实现 2 的幂运算(2 ** n => 1 << n)。
* 1 是 int 型，需要对 1 进行强制转换。(ull)1 等价于 (unsigned long long)1。
* %llu 是无符号 64 位整型的输入方式。
* 2 ** 64 是无法用数字的形式输出的，提前计算机算好后，用字符串的形式进行输出。
* 其它情况都在 [0, 2 ** 64 - 1] 范围内，直接相加输出即可。

### 代码实现

```
#include <stdio.h>
typedef unsigned long long ull;
const ull MAX = ((ull)1)<<62;

int main() {
    int t;
    ull a, b, c, d;
    scanf("%d", &t);
    while(t--) {
        scanf("%llu %llu %llu %llu", &a, &b, &c, &d);
        if (a == MAX && b == MAX && c == MAX && d == MAX)
            printf("18446744073709551616\n");
        else    
            printf("%llu\n", a + b + c + d);

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
