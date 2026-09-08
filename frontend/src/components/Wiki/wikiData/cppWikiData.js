// C++ 教程数据（章节结构参考 studycpp.cn，内容为本站编写的精简版）
// 内容为 Markdown：标题 / 段落 / 列表 / 表格 / 代码块（```cpp），由 rehype-highlight 高亮
export const cppWikiData = {
  title: 'C++ 教程',
  chapters: [
    {
      id: 'intro',
      title: '简介',
      content: `## C++ 是什么？

C++ 由 Bjarne Stroustrup 于 1979 年在贝尔实验室开发，是 C 语言的"增强版"：
既保留了 C 的高性能与底层控制能力，又加入了面向对象、泛型等现代编程思想。
至今仍是游戏引擎、操作系统、高频交易、嵌入式等领域的主力语言。

### 程序是怎么运行的？

\`\`\`cpp
#include <iostream>
int main() {
    std::cout << "Hello, World!" << std::endl;
    return 0;
}
\`\`\`

C++ 是**编译型语言**，运行一个程序要经历两步：

1. **编译**：编译器（g++）把源代码翻译成机器指令（目标文件）。
2. **链接**：链接器把目标文件与库合并成可执行文件。

\`\`\`bash
g++ main.cpp -o main   # 编译 + 链接
./main                 # 运行
\`\`\`

相比之下 Python 是解释型语言，逐行解释执行，因此 C++ 通常快得多。

### 环境安装

- **本站**：无需安装，新建 \`.cpp\` 文件直接在线编译运行（已内置 g++ 10.2）。
- **Windows**：安装 MinGW-w64 或 Visual Studio（含 MSVC）。
- **macOS**：终端运行 \`xcode-select --install\`。
- **Linux**：\`sudo apt install g++\`。

### 第一个程序逐行解读

| 代码 | 含义 |
|------|------|
| \`#include <iostream>\` | 引入输入输出流头文件 |
| \`int main()\` | 主函数，程序从这里开始执行 |
| \`std::cout << ...\` | 向标准输出打印内容 |
| \`return 0;\` | 返回 0 表示程序正常结束 |

> 💡 \`std::\` 是标准命名空间前缀。第 8 章会介绍如何用 \`using\` 简化书写。`,
    },
    {
      id: 'chapter1',
      title: '第一章：基础概念',
      content: `## 变量与数据类型

\`\`\`cpp
#include <iostream>
int main() {
    int age = 18;          // 整数，4 字节
    double price = 9.9;    // 双精度浮点
    char grade = 'A';      // 单个字符
    bool ok = true;        // 布尔值 true / false
    auto score = 95;       // auto 自动推导类型（C++11）

    std::cout << sizeof(int) << std::endl;   // 输出 4
    return 0;
}
\`\`\`

常用类型一览：

| 类型 | 含义 | 示例 |
|------|------|------|
| \`int\` | 整数 | \`42\` |
| \`long long\` | 大整数 | \`1e18\` |
| \`float / double\` | 浮点数 | \`3.14\` |
| \`char\` | 字符 | \`'A'\` |
| \`bool\` | 布尔 | \`true\` |

> ⚠️ 注意：\`5 / 2\` 在 C++ 中是整数除法，结果为 \`2\`；\`5.0 / 2\` 才是 \`2.5\`。

## 运算符

\`\`\`cpp
int a = 7, b = 3;
a + b;   // 加：10
a % b;   // 取余：1
a > b;   // 比较：true
(a > 0) && (b > 0);   // 逻辑与
!false;  // 逻辑非：true
a++;     // 自增：a 变为 8
\`\`\`

## 控制流

\`\`\`cpp
// if / else
if (score >= 90) {
    std::cout << "优秀" << std::endl;
} else if (score >= 60) {
    std::cout << "及格" << std::endl;
} else {
    std::cout << "不及格" << std::endl;
}

// for 循环：输出 1~5
for (int i = 1; i <= 5; i++) {
    std::cout << i << " ";
}

// while 循环：求 1~100 的和
int sum = 0, n = 1;
while (n <= 100) {
    sum += n;
    n++;
}
std::cout << "sum = " << sum << std::endl;
\`\`\`

\`break\` 立即跳出循环，\`continue\` 跳过本轮进入下一次循环。

## 输入输出

\`\`\`cpp
int x;
std::cin >> x;                    // 从键盘读入一个整数
std::cout << "你输入了 " << x;    // 输出
\`\`\`

> 💡 在 CodePad 中运行时，先在「输入」标签页填写标准输入，再点击运行。`,
    },
    {
      id: 'chapter2',
      title: '第二章：函数与作用域',
      content: `## 定义与调用

\`\`\`cpp
#include <iostream>

// 函数定义：返回类型 函数名(参数列表)
int add(int a, int b) {
    return a + b;
}

// 默认参数：调用时可不传 c
int mul(int a, int b, int c = 1) {
    return a * b * c;
}

int main() {
    std::cout << add(3, 4) << std::endl;   // 7
    std::cout << mul(2, 5) << std::endl;   // 10（c 用默认值 1）
    return 0;
}
\`\`\`

## 函数重载

同名函数只要**参数列表不同**就可以并存，编译器自动选择：

\`\`\`cpp
int max(int a, int b) { return a > b ? a : b; }
double max(double a, double b) { return a > b ? a : b; }
\`\`\`

## 值传递 vs 引用传递

\`\`\`cpp
// 值传递：函数内修改不影响外部（拷贝了一份）
void badSwap(int a, int b) {
    int t = a; a = b; b = t;
}

// 引用传递：直接操作外部变量
void swap(int &a, int &b) {
    int t = a; a = b; b = t;
}

int main() {
    int x = 1, y = 2;
    swap(x, y);        // x=2, y=1 ✅
    badSwap(x, y);     // 不变 ❌
    return 0;
}
\`\`\`

> 💡 大对象（如 std::string）推荐用 \`const T&\` 传参：避免拷贝又能防止误改。

## 作用域

- 定义在 \`{ }\` 内的变量只在块内有效，离开即销毁。
- 内层可以遮蔽（shadow）外层同名变量，但不推荐。
- 全局变量从定义处到文件末尾可见，谨慎使用。

\`\`\`cpp
int g = 100;          // 全局变量

int main() {
    int g = 1;        // 遮蔽全局 g
    std::cout << g;   // 1
    {
        int local = 5;
    }
    // local 在此已不可见
    return 0;
}
\`\`\`

## 递归

\`\`\`cpp
// 阶乘：n! = n * (n-1)!
int factorial(int n) {
    if (n <= 1) return 1;      // 递归出口
    return n * factorial(n - 1);
}
\`\`\``,
    },
    {
      id: 'chapter3',
      title: '第三章：数组与字符串',
      content: `## C 风格数组

\`\`\`cpp
int nums[5] = {1, 2, 3, 4, 5};   // 长度固定
nums[0] = 10;                     // 下标从 0 开始

for (int i = 0; i < 5; i++) {
    std::cout << nums[i] << " ";
}
\`\`\`

> ⚠️ 访问 \`nums[5]\` 属于**越界**，C++ 不会报错但行为未定义（可能崩溃或读脏数据），
> 这也是 C 风格数组的致命弱点。现代 C++ 推荐用 \`std::array\` 或 \`std::vector\`。

## 多维数组

\`\`\`cpp
int grid[3][4] = {0};   // 3 行 4 列，全部初始化为 0
grid[1][2] = 7;
\`\`\`

## C 风格字符串

\`\`\`cpp
char name[] = "Tom";   // 实际存储 'T','o','m','\\0'，末尾有结束符
strlen(name);          // 3（需要 #include <cstring>）
\`\`\`

## std::string（推荐）

\`\`\`cpp
#include <iostream>
#include <string>

int main() {
    std::string s = "Hello";
    s += " C++";                  // 拼接
    std::cout << s.length();      // 长度：8
    std::cout << s.substr(0, 5);  // 子串："Hello"
    std::cout << s.find("C++");   // 查找位置：6（找不到返回 npos）

    // 遍历每个字符
    for (char c : s) {
        std::cout << c << "-";
    }
    return 0;
}
\`\`\`

常用方法：\`length()\`、\`substr()\`、\`find()\`、\`append()\`、\`compare()\`、\`stoi()\`（字符串转整数）。

> 💡 字符串比较直接用 \`==\`，不需要像 C 那样用 strcmp。`,
    },
    {
      id: 'chapter4',
      title: '第四章：指针与引用',
      content: `## 指针：存放地址的变量

\`\`\`cpp
int x = 42;
int *p = &x;      // & 取地址，p 指向 x
*p = 99;          // * 解引用：通过指针修改 x
std::cout << x;   // 99

int *q = nullptr; // 空指针，不指向任何对象（C++11）
\`\`\`

指针与数组：

\`\`\`cpp
int arr[3] = {1, 2, 3};
int *p = arr;        // 数组名可隐式转为首元素地址
std::cout << *(p + 1);  // 2 —— 指针偏移 1 个元素
\`\`\`

## 动态内存

\`\`\`cpp
int *p = new int(5);     // 在堆上分配一个 int
int *arr = new int[10];  // 分配 10 个 int 的数组

delete p;                // 释放单个对象
delete[] arr;            // 释放数组（注意是 delete[]）

p = nullptr;             // 好习惯：释放后置空，防止悬垂指针
\`\`\`

> ⚠️ **new 与 delete 必须成对出现**，否则内存泄漏；释放后不要再使用该指针。
> 现代 C++ 更推荐智能指针（unique_ptr / shared_ptr）自动管理。

## 引用：变量的别名

\`\`\`cpp
int x = 10;
int &ref = x;   // ref 是 x 的别名
ref = 20;
std::cout << x; // 20

// 常见用途：函数参数（见第二章 swap 示例）
// 以及范围 for 中修改元素：
int arr[3] = {1, 2, 3};
for (int &v : arr) v *= 2;   // 数组变为 {2, 4, 6}
\`\`\`

## 指针 vs 引用

| 对比项 | 指针 | 引用 |
|--------|------|------|
| 定义 | \`int *p = &x\` | \`int &r = x\` |
| 可否为空 | 可以（nullptr） | 不行，必须初始化 |
| 可否改指向 | 可以 | 不行，终生绑定 |
| 访问方式 | \`*p\` | 直接当变量用 |
| 用途 | 动态内存、数据结构 | 函数参数、别名 |`,
    },
    {
      id: 'chapter5',
      title: '第五章：类与对象',
      content: `## 定义类

\`\`\`cpp
#include <iostream>
#include <string>

class Student {
private:                      // 私有成员：外部不可访问
    std::string name;
    int score;

public:                       // 公有成员：对外接口
    // 构造函数：对象创建时自动调用，与类同名
    Student(const std::string &n, int s) : name(n), score(s) {}

    // 成员函数
    void print() const {      // const 表示不修改成员变量
        std::cout << name << ": " << score << std::endl;
    }

    void addScore(int delta) { score += delta; }
};

int main() {
    Student s("小明", 85);
    s.addScore(10);
    s.print();                // 小明: 95
    return 0;
}
\`\`\`

## 关键概念

- **封装**：数据（private）与操作（public）打包在一起，外部只能通过公开接口访问。
- **构造函数**：创建对象时初始化成员；初始化列表 \`: name(n), score(s)\` 比在函数体内赋值更高效。
- **析构函数**：\`~Student()\`，对象销毁时自动调用，用于释放资源。
- **this 指针**：成员函数内指向当前对象的指针（\`this->name\` 等价于 \`name\`）。
- **const 成员函数**：承诺不修改成员，可以被 const 对象调用。

## 练习：点类

\`\`\`cpp
class Point {
private:
    double x, y;
public:
    Point(double a = 0, double b = 0) : x(a), y(b) {}
    double distanceTo(const Point &other) const {
        double dx = x - other.x, dy = y - other.y;
        return std::sqrt(dx * dx + dy * dy);   // #include <cmath>
    }
};
\`\`\``,
    },
    {
      id: 'chapter6',
      title: '第六章：继承与多态',
      content: `## 继承

\`\`\`cpp
#include <iostream>

// 基类
class Animal {
protected:                 // 子类可访问，外部不可
    std::string name;
public:
    Animal(const std::string &n) : name(n) {}
    void eat() { std::cout << name << " 吃东西" << std::endl; }
};

// 派生类：class 子类 : public 基类
class Dog : public Animal {
public:
    Dog(const std::string &n) : Animal(n) {}   // 先构造基类
    void bark() { std::cout << name << " 汪汪！" << std::endl; }
};

int main() {
    Dog d("旺财");
    d.eat();    // 继承来的方法
    d.bark();
    return 0;
}
\`\`\`

构造顺序：**基类 → 成员变量 → 派生类构造函数体**；析构顺序相反。

## 多态：同一接口，不同行为

\`\`\`cpp
class Animal {
public:
    // virtual：允许子类重写；= 0 表示纯虚函数
    virtual void speak() const { std::cout << "..." << std::endl; }
    virtual ~Animal() {}   // 基类析构必须虚，否则 delete 基类指针会漏析构子类
};

class Dog : public Animal {
public:
    void speak() const override { std::cout << "汪汪" << std::endl; }
};

class Cat : public Animal {
public:
    void speak() const override { std::cout << "喵喵" << std::endl; }
};

int main() {
    Animal *pets[2] = {new Dog(), new Cat()};
    for (Animal *p : pets) {
        p->speak();        // 运行时按真实类型调用：汪汪 / 喵喵
        delete p;
    }
    return 0;
}
\`\`\`

- **虚函数**：通过基类指针/引用调用时，按对象真实类型分派。
- **override**：显式标记重写，写错签名会直接编译报错。
- **纯虚函数** \`virtual void f() = 0;\` 使类成为**抽象类**，不能实例化，只能被继承。`,
    },
    {
      id: 'chapter7',
      title: '第七章：异常处理',
      content: `## 为什么需要异常

程序运行时可能遇到意外：除零、文件不存在、内存不足。C++ 用
**抛出（throw）→ 捕获（catch）** 机制处理，而不是让程序直接崩溃。

\`\`\`cpp
#include <iostream>
#include <stdexcept>

double divide(double a, double b) {
    if (b == 0) {
        throw std::runtime_error("除数不能为 0");   // 抛出异常
    }
    return a / b;
}

int main() {
    try {
        std::cout << divide(10, 2) << std::endl;   // 5
        std::cout << divide(10, 0) << std::endl;   // 抛异常，跳到 catch
    } catch (const std::runtime_error &e) {
        std::cerr << "出错了：" << e.what() << std::endl;
    } catch (...) {
        std::cerr << "未知异常" << std::endl;
    }
    std::cout << "程序继续运行" << std::endl;      // 捕获后正常继续
    return 0;
}
\`\`\`

## 要点

1. \`throw\` 抛出后，函数立即返回，沿调用栈向上寻找匹配的 \`catch\`。
2. \`catch\` 按类型匹配，\`catch (...)\` 兜底捕获一切。
3. \`std::exception::what()\` 返回异常描述文字。
4. 标准异常家族：\`runtime_error\`、\`logic_error\`、\`out_of_range\`、\`invalid_argument\` 等，都在 \`<stdexcept>\`。
5. 找不到 catch 时程序调用 \`std::terminate\` 终止——所以关键路径记得捕获。

## noexcept

声明函数不会抛异常，编译器可做优化；若仍抛出则直接终止：

\`\`\`cpp
int safeAdd(int a, int b) noexcept {
    return a + b;
}
\`\`\``,
    },
    {
      id: 'chapter8',
      title: '第八章：标准模板库（STL）',
      content: `## vector：动态数组

\`\`\`cpp
#include <iostream>
#include <vector>
#include <algorithm>

int main() {
    std::vector<int> v;            // 空数组
    v.push_back(3);                // 尾部添加
    v.push_back(1);
    v.push_back(2);
    v.pop_back();                  // 移除尾部

    std::cout << v.size();         // 元素个数：2

    std::sort(v.begin(), v.end()); // 排序

    for (int x : v) std::cout << x << " ";   // 1 3
    return 0;
}
\`\`\`

## 常用容器

| 容器 | 特点 | 适用场景 |
|------|------|----------|
| \`vector\` | 动态数组，随机访问 O(1) | 默认首选 |
| \`string\` | 字符动态数组 | 文本 |
| \`map\` | 键值对，按键有序 | 字典、计数 |
| \`unordered_map\` | 哈希表，查找 O(1) | 快速查找 |
| \`set\` | 有序集合，自动去重 | 去重、集合运算 |
| \`queue / stack\` | 队列 / 栈 | BFS、表达式求值 |

\`\`\`cpp
#include <map>
std::map<std::string, int> scores;
scores["Alice"] = 95;
scores["Bob"] = 88;
for (auto &kv : scores) {
    std::cout << kv.first << " -> " << kv.second << std::endl;
}
\`\`\`

## 迭代器

迭代器像"容器内的指针"，\`begin()\` 指向首元素，\`end()\` 指向尾后：

\`\`\`cpp
std::vector<int> v = {3, 1, 2};
auto it = std::find(v.begin(), v.end(), 2);   // 查找
if (it != v.end()) {
    std::cout << "找到了，下标 " << it - v.begin();
}
\`\`\`

## algorithm 常用函数

\`\`\`cpp
std::sort(v.begin(), v.end());              // 升序排序
std::reverse(v.begin(), v.end());           // 反转
std::max_element(v.begin(), v.end());       // 最大值迭代器
std::count(v.begin(), v.end(), 2);          // 统计 2 出现次数
std::accumulate(v.begin(), v.end(), 0);     // 求和（#include <numeric>）
\`\`\`

> 💡 STL 是 C++ 的"军火库"，熟练使用容器与算法可以少写大量易错代码。`,
    },
  ],
};
