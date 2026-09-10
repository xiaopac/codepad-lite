// 第一章：基础概念（8 个分支小节）
export const ch01Basics = {
  id: 'chapter1',
  title: '第一章：基础概念',
  sections: [
    {
      id: 'ch1-1',
      title: '变量与命名规则',
      content: `## 变量：贴了标签的盒子

想象一个储物盒：你可以往里放东西、拿出来、换别的东西。**变量就是内存里的储物盒**，
"变量名"就是贴在盒子上的标签。

\`\`\`cpp
#include <iostream>
using namespace std;   // 引入后可以省略 std::（第八章详解）

int main() {
    int age = 18;          // 定义：类型 名字 = 初始值;
    cout << age << endl;   // 使用：输出 18

    age = 19;              // 赋值：换一个值（不需要再写 int）
    cout << age << endl;   // 19

    int score;             // 也可以先声明不赋值
    score = 95;            // 稍后再赋值
    cout << score << endl; // 95
    return 0;
}
\`\`\`

### 三步理解

1. **声明**（int age）——告诉编译器"我要一个装整数的盒子，名字叫 age"；
2. **初始化**（= 18）——往盒子里放初始值；
3. **使用/修改**——读取或换成新值。

### 命名规则（必须遵守，否则编译报错）

- ✅ 只能由 **字母、数字、下划线** 组成，且**不能以数字开头**；
- ✅ 区分大小写：\`age\` 和 \`Age\` 是两个不同变量；
- ❌ 不能用 C++ 关键字：\`int\`、\`if\`、\`class\` 等（共 90 多个）；
- ❌ 名字不能有空格或特殊符号。

\`\`\`cpp
int myAge = 18;      // ✅ 小驼峰命名（推荐）
int _count = 0;      // ✅ 下划线开头合法（但尽量不用）
int 2fast = 1;       // ❌ 不能以数字开头
int my age = 18;     // ❌ 不能有空格
int class = 3;       // ❌ class 是关键字
\`\`\`

### 常见命名风格

| 风格 | 示例 | 使用场景 |
|------|------|----------|
| 小驼峰 | \`studentCount\` | 变量名（推荐） |
| 下划线 | \`student_count\` | 也常见 |
| 大驼峰 | \`StudentManager\` | 类名 |
| 全大写 | \`MAX_SIZE\` | 常量 |

> ⚠️ **新手最常见错误**：使用未初始化的变量。\`int x; cout << x;\` 输出的是一块内存里的
> 随机旧值，各次运行结果都可能不同。**定义变量时尽量立刻赋值**。`,
    },
    {
      id: 'ch1-2',
      title: '常用数据类型',
      content: `## 类型：盒子的大小与形状

不同数据需要不同的"盒子"：整数用 int、小数用 double、字符用 char、真假用 bool。

\`\`\`cpp
#include <iostream>
using namespace std;

int main() {
    int age = 18;            // 整数（约 ±21 亿范围）
    long long big = 1234567890123LL;  // 大整数（LL 后缀）
    double price = 9.99;     // 双精度小数
    float weight = 65.5f;    // 单精度小数（f 后缀）
    char grade = 'A';        // 单个字符（单引号！）
    bool passed = true;      // 布尔：true / false

    cout << age << " " << price << " " << grade << " " << passed << endl;
    return 0;
}
\`\`\`

### 常用类型一览表

| 类型 | 含义 | 占内存 | 取值范围（约） | 示例 |
|------|------|--------|--------------|------|
| \`int\` | 整数 | 4 字节 | -21亿 ~ +21亿 | \`42\` |
| \`long long\` | 大整数 | 8 字节 | ±9×10¹⁸ | \`100000000000LL\` |
| \`float\` | 单精度小数 | 4 字节 | 约 7 位有效数字 | \`3.14f\` |
| \`double\` | 双精度小数 | 8 字节 | 约 15 位有效数字 | \`3.14159\` |
| \`char\` | 字符 | 1 字节 | ASCII 字符 | \`'A'\` |
| \`bool\` | 布尔 | 1 字节 | true/false | \`true\` |
| \`void\` | 空类型 | — | 无返回值用 | — |

### sizeof：查看占多少字节

\`\`\`cpp
cout << sizeof(int) << endl;     // 4
cout << sizeof(double) << endl;  // 8
cout << sizeof(char) << endl;    // 1
\`\`\`

### 注意细节

1. **字符用单引号**：\`'A'\` 是字符；**字符串用双引号**：\`"A"\` 是字符串（第三章详解）；
2. **整数和小数不能混装**：\`int x = 3.14;\` 会丢小数部分（变成 3）；
3. 小数默认是 double 类型，\`float f = 3.14;\` 会有警告，要写 \`3.14f\`；
4. bool 输出时显示 1（true）或 0（false）。

> 💡 为什么整数范围是 ±21 亿？因为 4 字节 = 32 位，能表示 2³² 种组合，一半给负数。
> 数字太大溢出会"绕回"成负数，学算法题时注意用 long long。`,
    },
    {
      id: 'ch1-3',
      title: '常量与 const',
      content: `## 常量：贴了"封条"的盒子

有些值在程序运行期间**不允许被修改**——比如圆周率 π、一年 12 个月、最高分 750。
用 \`const\` 声明常量，试图修改会被编译器直接拦下。

\`\`\`cpp
#include <iostream>
using namespace std;

int main() {
    const double PI = 3.1415926;   // 常量：定义后不可改
    const int MONTHS = 12;

    double r = 2.0;
    double area = PI * r * r;      // 计算圆面积
    cout << area << endl;          // 12.566...

    // PI = 3.14;                  // ❌ 编译错误：不能给常量赋值！
    return 0;
}
\`\`\`

### 为什么用常量

1. **防手滑**：不小心改了 π 的值，编译器立刻报错而不是运行出诡异结果；
2. **易维护**：改一个地方（\`MONTHS\`），所有用到的地方都生效；
3. **可读性**：\`3600\` 是啥？\`SECONDS_PER_HOUR\` 一目了然。

### constexpr（编译期常量）

\`constexpr\` 是 C++11 的"加强版常量"：值必须在编译时就能算出来，性能更好：

\`\`\`cpp
constexpr int SIZE = 100;                    // 编译期已知
const int runtime = rand();                  // 普通 const 可以运行时才确定
int arr[SIZE];                               // constexpr 可用于数组大小（合法）
\`\`\`

> 💡 新手先记住 \`const\` 即可；\`constexpr\` 在第五章（类）和第八章（STL）会再见。`,
    },
    {
      id: 'ch1-4',
      title: '运算符',
      content: `## 运算符：对数据做运算的符号

### 算术运算符

\`\`\`cpp
int a = 7, b = 3;
a + b   // 加：10
a - b   // 减：4
a * b   // 乘：21
a / b   // 除：2  ⚠️ 整数除法！
a % b   // 取余：1（% 只能用于整数）
\`\`\`

> ⚠️ **整数除法陷阱**：\`7 / 3\` 的结果是 **2 而不是 2.333**！整数除整数得整数（小数部分被丢弃）。
> 想要小数结果：\`7.0 / 3\` 或 \`double(7) / 3\`。

### 赋值与复合赋值

\`\`\`cpp
int x = 10;
x = x + 5;   // 15（先算右边，再赋给左边）
x += 5;      // 20（等价于 x = x + 5，更简洁）
x -= 3;      // 17
x *= 2;      // 34
x /= 2;      // 17
x %= 5;      // 2
\`\`\`

### 自增自减（新手最爱考）

\`\`\`cpp
int n = 5;
n++;   // 后置自增：先用旧值，再 +1 → 这句后 n = 6
++n;   // 前置自增：先 +1，再用新值 → 这句后 n = 7

int a = 5;
int b = a++;   // b = 5（先用旧值），a = 6
int c = ++a;   // c = 7（先自增），a = 7
\`\`\`

### 比较运算符（结果是 true/false）

| 运算符 | 含义 | 示例 |
|--------|------|------|
| \`==\` | 等于 | \`5 == 5\` → true |
| \`!=\` | 不等于 | \`5 != 3\` → true |
| \`>\` \`<\` | 大于/小于 | \`5 > 3\` → true |
| \`>=\` \`<=\` | 大于等于/小于等于 | \`5 <= 5\` → true |

> ⚠️ **新手第一大坑**：\`=\` 是赋值，\`==\` 才是判断相等！
> \`if (x = 5)\` 永远为真（把 5 赋给了 x），这是 C++ 里最著名的错误之一。

### 逻辑运算符（组合条件）

\`\`\`cpp
bool a = true, b = false;
a && b   // 与：都为真才真 → false
a || b   // 或：有一个真就真 → true
!a       // 非：取反 → false

// 实战：判断成绩是否在 60~100 之间
int score = 85;
bool pass = (score >= 60) && (score <= 100);   // true
\`\`\`

### 运算符优先级（记不住就加括号！）

乘除高于加减；比较高于逻辑；**不确定就加括号**，既安全又清楚：

\`\`\`cpp
int result = 2 + 3 * 4;        // 14（先乘后加）
int result2 = (2 + 3) * 4;     // 20（括号优先）
\`\`\``,
    },
    {
      id: 'ch1-5',
      title: '类型转换',
      content: `## 数据在不同类型之间搬家

### 隐式转换（自动发生）

规则：**"小盒子"放进"大盒子"没问题，反过来会丢数据**。

\`\`\`cpp
int a = 5;
double b = a;        // int → double：安全，b = 5.0
double c = 3.14;
int d = c;           // double → int：危险！小数部分被砍掉，d = 3
\`\`\`

### 显式转换（手动指定）

\`\`\`cpp
double x = 7.0 / 3;              // 2.333...（两个数中有一个 double 即可）
int y = static_cast<int>(3.99);  // 3（C++ 推荐写法：static_cast）
int z = (int)3.99;               // 3（C 风格写法，也行但不推荐）
\`\`\`

### 经典场景

**① 整数除法求平均**（新手必错）：

\`\`\`cpp
int total = 100, count = 3;
double avg1 = total / count;             // ❌ 33.0（先整除再转换，已经丢了）
double avg2 = double(total) / count;     // ✅ 33.333...（先转换再除）
double avg3 = total / 3.0;               // ✅ 也可以
\`\`\`

**② char 与数字的转换**（ASCII 码）：

\`\`\`cpp
char ch = 'A';
cout << int(ch) << endl;      // 65（'A' 的 ASCII 码）
cout << char(97) << endl;     // 'a'

char digit = '5';
int num = digit - '0';        // 5（字符数字转真数字的常用技巧）
\`\`\`

> 💡 **经验法则**：任何"可能丢精度"的转换都要停下来想一想——
> 这里真的需要转换吗？会不会是整数除法在捣鬼？`,
    },
    {
      id: 'ch1-6',
      title: '输入与输出',
      content: `## cin 与 cout：程序与你的对话

### 输出 cout

\`\`\`cpp
#include <iostream>
using namespace std;

int main() {
    int age = 18;
    double height = 1.75;

    cout << "我今年" << age << "岁" << endl;        // 链式输出
    cout << "身高：" << height << " 米" << endl;     // 不同类型混着输出
    cout << "第一行\\n第二行" << endl;              // \\n 与 endl 都是换行
    return 0;
}
\`\`\`

\`<<\` 像传送带：把每个内容依次"送"进屏幕，可以一直串联。

### 输入 cin

\`\`\`cpp
int age;
cout << "请输入年龄：";
cin >> age;                       // 等待你输入，回车确认
cout << "你输入的是：" << age << endl;
\`\`\`

\`>>\` 是输入运算符：从键盘"取"一个值放进变量。多个输入用空格或回车隔开：

\`\`\`cpp
int a, b;
cin >> a >> b;                    // 输入 "3 4" 回车 → a=3, b=4
cout << a + b << endl;            // 7
\`\`\`

### 完整示例：两数之和

\`\`\`cpp
#include <iostream>
using namespace std;

int main() {
    double a, b;
    cout << "请输入两个数（空格隔开）：";
    cin >> a >> b;
    cout << "它们的和是：" << a + b << endl;
    return 0;
}
\`\`\`

### 本站怎么输入？

在下方「输入」标签页先写好要输入的内容（比如 \`3 4\`），再点 ▶ 运行。

### 注意

- \`cin\` 读到空格/回车就停（一次读一个"词"）；
- 输入类型必须匹配：\`int x; cin >> x;\` 你输入字母会导致读取失败；
- 多行输入：每次 cin 会自动跳过空白，连续读即可。

> 💡 \`endl\` 除了换行还会**刷新缓冲区**；\`"\\n"\` 只换行更快。
> 刷屏输出用 \`\\n\`，需要立即显示（比如日志）用 endl。`,
    },
    {
      id: 'ch1-7',
      title: '分支语句（if / switch）',
      content: `## 让程序自己做选择

### if / else if / else

\`\`\`cpp
int score = 85;

if (score >= 90) {
    cout << "优秀" << endl;
} else if (score >= 60) {
    cout << "及格" << endl;
} else {
    cout << "不及格" << endl;
}
\`\`\`

执行逻辑：从上往下依次检查条件，**第一个为真的分支执行后，其余全部跳过**。

### 单行与嵌套

\`\`\`cpp
// 只有一条语句时，花括号可以省略（但不推荐省略，容易出错）
if (age >= 18) cout << "成年" << endl;

// 嵌套：判断闰年
int year = 2024;
if (year % 4 == 0) {
    if (year % 100 != 0 || year % 400 == 0) {
        cout << "闰年" << endl;
    } else {
        cout << "平年" << endl;
    }
}
\`\`\`

> ⚠️ **悬空 else**：else 总是和**最近的 if** 配对。拿不准就老老实实写花括号。

### 三元运算符（简写的 if-else）

\`\`\`cpp
int a = 10, b = 20;
int max = (a > b) ? a : b;    // 条件 ? 为真时的值 : 为假时的值
cout << max << endl;          // 20
\`\`\`

### switch（多路选择）

当一个变量要和**很多固定值**比较时，switch 比一堆 if 更清晰：

\`\`\`cpp
int day = 3;
switch (day) {
    case 1: cout << "星期一" << endl; break;
    case 2: cout << "星期二" << endl; break;
    case 3: cout << "星期三" << endl; break;   // ← 命中这里
    case 4:
    case 5: cout << "工作日" << endl; break;    // 多个 case 可以合并
    default: cout << "周末" << endl;            // 都不匹配走这里
}
\`\`\`

> ⚠️ **每个 case 结尾必须写 break**！忘了 break 会"穿透"继续执行下一个 case——
> 这是 switch 最经典的坑（上面 4、5 合并是故意穿透，属于少数合法用法）。

### if 还是 switch？

- 判断**范围/复杂条件**（>、&&、区间）→ 用 if；
- 判断**几个固定的整数值/字符** → 用 switch 更整洁。`,
    },
    {
      id: 'ch1-8',
      title: '循环语句（for / while）',
      content: `## 让程序重复干活

### for 循环（知道要循环几次时）

\`\`\`cpp
// for (初始化; 继续条件; 每次循环后执行)
for (int i = 1; i <= 5; i++) {
    cout << i << " ";        // 输出：1 2 3 4 5
}
\`\`\`

执行顺序：**初始化 → 判条件 → 循环体 → i++ → 判条件 → 循环体 → ...** 直到条件为假。

### while 循环（不知道几次，直到条件不满足）

\`\`\`cpp
// 求 1+2+...+100
int sum = 0, n = 1;
while (n <= 100) {
    sum += n;
    n++;
}
cout << sum << endl;         // 5050
\`\`\`

### do-while（至少执行一次）

\`\`\`cpp
int password;
do {
    cout << "请输入密码（123）：";
    cin >> password;
} while (password != 123);
cout << "密码正确！" << endl;
\`\`\`

### break 与 continue

\`\`\`cpp
// break：立刻跳出整个循环
for (int i = 1; i <= 10; i++) {
    if (i == 5) break;       // 到 5 就停
    cout << i << " ";        // 1 2 3 4
}

// continue：跳过本轮，进入下一次循环
for (int i = 1; i <= 5; i++) {
    if (i == 3) continue;    // 跳过 3
    cout << i << " ";        // 1 2 4 5
}
\`\`\`

### 嵌套循环（循环套循环）

\`\`\`cpp
// 打印乘法口诀表
for (int i = 1; i <= 9; i++) {
    for (int j = 1; j <= i; j++) {
        cout << j << "x" << i << "=" << i * j << "\\t";
    }
    cout << endl;
}
\`\`\`

外层循环一次，内层跑完一整轮。总执行次数 = 外层次数 × 内层次数。

### 经典新手练习

1. 输出 1~100 中所有偶数；
2. 求 1~100 中能被 3 整除的数的和；
3. 打印 5 行直角三角形：\`*\`、\`**\`、\`***\`...
4. 判断一个数是不是质数（提示：试除 2 到 sqrt(n)）。

> ⚠️ **死循环**：\`while (true) { }\` 或忘了写 \`i++\` 会让程序永远跑下去。
> 本站有 10 秒超时保护，程序会被自动终止并提示超时。`,
    },
  ],
};
