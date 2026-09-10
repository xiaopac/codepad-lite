// 第二章：函数与作用域（6 个分支小节）
export const ch02Functions = {
  id: 'chapter2',
  title: '第二章：函数与作用域',
  sections: [
    {
      id: 'ch2-1',
      title: '什么是函数',
      content: `## 函数：可重复使用的"代码机器"

写一次，到处用。函数就像一个加工机器：**投进去原料（参数），产出成品（返回值）**。

\`\`\`cpp
#include <iostream>
using namespace std;

// 定义函数：返回类型 函数名(参数列表) { 函数体 }
int add(int a, int b) {
    return a + b;          // return 结束函数并带回结果
}

int main() {
    cout << add(3, 4) << endl;     // 调用：7
    cout << add(10, 20) << endl;   // 再调用：30
    cout << add(1, 2) + add(3, 4) << endl;  // 10（函数的返回值可以直接参与运算）
    return 0;
}
\`\`\`

### 函数的四个组成部分

| 部分 | 说明 | 示例 |
|------|------|------|
| 返回类型 | 产出的类型；不产出用 void | \`int\` |
| 函数名 | 动词短语，见名知意 | \`add\` / \`getMax\` |
| 参数列表 | 需要的原料（可为空） | \`(int a, int b)\` |
| 函数体 | 干活的代码 | \`{ return a + b; }\` |

### void 函数：只做事，不返回

\`\`\`cpp
void sayHello(string name) {
    cout << "你好，" << name << "！" << endl;
    // 没有 return（或写 return; 直接结束）
}

int main() {
    sayHello("小明");
    sayHello("小红");
    return 0;
}
\`\`\`

### 函数声明与定义分离（大项目写法）

\`\`\`cpp
// 声明（告诉编译器"有这么个函数"）
int add(int a, int b);

int main() {
    cout << add(3, 4);   // 可以用，因为上面声明过
    return 0;
}

// 定义（函数真正的实现，放在后面）
int add(int a, int b) {
    return a + b;
}
\`\`\`

> 💡 **为什么需要声明**：编译器从上往下读代码。函数定义在调用之后时，
> 编译器"不认识"这个函数就会报错。声明就像提前发了个"预告"。`,
    },
    {
      id: 'ch2-2',
      title: '参数传递：值、引用与 const 引用',
      content: `## 传值 vs 传引用（本章最重要的一节）

### 值传递：函数拿到的是"复印件"

\`\`\`cpp
void tryChange(int x) {
    x = 100;               // 改的是复印件，原件不受影响
}

int main() {
    int a = 5;
    tryChange(a);
    cout << a << endl;     // 还是 5！
    return 0;
}
\`\`\`

### 引用传递：函数直接操作"原件"

\`\`\`cpp
void realChange(int &x) {   // 注意参数类型多了个 &
    x = 100;                // 改的就是外部那个变量本身
}

int main() {
    int a = 5;
    realChange(a);
    cout << a << endl;      // 100！
    return 0;
}
\`\`\`

### 经典例子：交换两个数

\`\`\`cpp
// 这个版本为什么失败？因为交换的是复印件
void badSwap(int a, int b) {
    int t = a; a = b; b = t;
}

// 正确版本：用引用
void swap(int &a, int &b) {
    int t = a; a = b; b = t;
}

int main() {
    int x = 1, y = 2;
    swap(x, y);
    cout << x << " " << y << endl;   // 2 1
    return 0;
}
\`\`\`

### const 引用：只读借用（性能 + 安全）

string 这样的"大对象"如果按值传，每次调用都要完整复制一份，又慢又费内存：

\`\`\`cpp
// 不复制（快），又保证函数内不能修改（安全）
void print(const string &s) {
    cout << s << endl;
    // s = "改了";   // ❌ 编译错误：const 引用不可修改
}
\`\`\`

### 什么时候用什么？

| 场景 | 写法 |
|------|------|
| 小类型（int/double），函数内部要修改 | 传值 \`(int x)\` |
| 函数要修改外部变量 | 引用 \`(int &x)\` |
| 大对象只读（string/vector 等） | const 引用 \`(const string &s)\` |

> 💡 初学者先记住两条：**要改就传引用，不改就传值/const引用**。
> "为什么 swap 传值没用" 是面试和考试的高频题。`,
    },
    {
      id: 'ch2-3',
      title: '默认参数与函数重载',
      content: `## 默认参数：可以省略的实参

调用时可以不给某些参数，函数用默认值顶上：

\`\`\`cpp
// 第三个参数 c 有默认值 1
int mul(int a, int b, int c = 1) {
    return a * b * c;
}

int main() {
    cout << mul(2, 5) << endl;       // 10（c 用默认值 1）
    cout << mul(2, 5, 3) << endl;    // 30（显式传 3）
    return 0;
}
\`\`\`

规则：

1. **默认参数必须从右往左连续**：\`void f(int a, int b = 1, int c = 2)\` ✅；
   \`void f(int a = 1, int b)\` ❌（有默认值的参数右边不能再有没有默认值的参数）；
2. 默认值写在**声明**里（定义处不重复写）；
3. 调用时省略的只能是最右边的几个。

## 函数重载：同名函数，各司其职

参数列表不同（个数或类型），函数可以同名：

\`\`\`cpp
int max(int a, int b) { return a > b ? a : b; }
double max(double a, double b) { return a > b ? a : b; }
int max(int a, int b, int c) { return max(max(a, b), c); }

int main() {
    cout << max(3, 5) << endl;         // 调用 int 版 → 5
    cout << max(3.5, 2.1) << endl;     // 调用 double 版 → 3.5
    cout << max(1, 9, 4) << endl;      // 调用三参数版 → 9
    return 0;
}
\`\`\`

编译器根据**实参的类型和个数**自动挑选最合适的版本，这叫"重载决议"。

> ⚠️ **只有返回值不同不算重载**（编译器无法区分该调哪个）；
> 有默认参数的函数和重载混用时容易产生歧义，谨慎组合。`,
    },
    {
      id: 'ch2-4',
      title: '作用域与生命周期',
      content: `## 变量"活"在哪里、能活多久

### 块作用域（最常用）

\`{ }\` 花括号形成一个"块"。在块内定义的变量，**出了块就消失**：

\`\`\`cpp
int main() {
    int a = 1;               // a 在整个 main 内可见
    {
        int b = 2;           // b 只在这个内层块里活着
        cout << a << b;      // ✅ 都能访问
    }
    // cout << b;            // ❌ 编译错误：b 已经"死"了
    return 0;
}
\`\`\`

### 全局变量（少用！）

定义在所有函数外面，整个程序都能访问：

\`\`\`cpp
int gCounter = 0;            // 全局变量

void add() { gCounter++; }   // 任何函数都能改它

int main() {
    add();
    add();
    cout << gCounter;        // 2
    return 0;
}
\`\`\`

> ⚠️ 全局变量方便，但是**任何地方都能改它**——程序一大，出 bug 时你根本不知道是谁改的。
> 新手练习里用用无妨，正式项目尽量少用。

### 同名遮蔽（shadowing）

\`\`\`cpp
int value = 100;             // 外层

int main() {
    int value = 1;           // 内层同名变量"遮住"了外层
    cout << value << endl;   // 1（内层优先）
    return 0;
}
\`\`\`

### static 局部变量（只会初始化一次）

\`\`\`cpp
int countCalls() {
    static int count = 0;    // 第一次调用时初始化为 0，之后保留旧值
    count++;
    return count;
}

int main() {
    cout << countCalls();    // 1
    cout << countCalls();    // 2
    cout << countCalls();    // 3（每次 +1，值被"记住"了）
    return 0;
}
\`\`\`

### 一句话总结

| 变量种类 | 定义位置 | 可见范围 | 生命周期 |
|---------|---------|---------|---------|
| 局部变量 | 函数/块内 | 定义处到块结束 | 块结束即销毁 |
| 全局变量 | 所有函数外 | 整个程序 | 程序结束才销毁 |
| static 局部 | 块内 + static | 块内 | 程序结束才销毁 |

> 💡 尽量把变量定义在**最小的作用域**里：用得到才看得见，程序更不容易出错。`,
    },
    {
      id: 'ch2-5',
      title: '递归：函数调用自己',
      content: `## 递归：俄罗斯套娃式的思维

递归 = 函数直接或间接调用自己。适合处理"大问题可以拆成同结构小问题"的场景。

### 经典：阶乘

\\\`n! = n × (n-1) × ... × 1\\\`，而 \\\`(n-1)!\\\` 是同样的问题、更小的规模：

\`\`\`cpp
int factorial(int n) {
    if (n <= 1) return 1;            // ① 递归出口（终止条件）
    return n * factorial(n - 1);     // ② 缩小规模，调用自己
}

int main() {
    cout << factorial(5) << endl;    // 120
    return 0;
}
\`\`\`

**执行过程**（factorial(3)）：

\`\`\`text
factorial(3) = 3 * factorial(2)
                       = 2 * factorial(1)
                                = 1          ← 到出口，开始逐层返回
factorial(3) = 3 * 2 * 1 = 6
\`\`\`

### 递归三要素（缺一不可）

1. **出口**：什么时候不再调用自己（上面 n<=1）；
2. **递进**：每次调用让问题更接近出口（n-1）；
3. **相信递归**：假设 factorial(n-1) 是对的，只需写好当前层的关系。

### 另一个经典：斐波那契数列

\`\`\`cpp
// 1, 1, 2, 3, 5, 8, 13, ...（前两个是 1，之后每个 = 前两个之和）
int fib(int n) {
    if (n <= 2) return 1;                    // 出口
    return fib(n - 1) + fib(n - 2);          // 递进（注意：这里是两个分支）
}

int main() {
    cout << fib(7) << endl;    // 13
    return 0;
}
\`\`\`

### 递归 vs 循环

| 对比 | 递归 | 循环 |
|------|------|------|
| 代码 | 简洁、贴近数学定义 | 稍长但直接 |
| 性能 | 每次调用有开销，可能慢 | 快 |
| 风险 | 忘了出口 = 栈溢出崩溃 | 忘了更新 = 死循环 |

> ⚠️ 递归层数太深（如 factorial(100000)）会**栈溢出**崩溃。
> 能用循环写清楚的就用循环；树、分治、回溯等场景递归更自然（算法进阶会大量用到）。`,
    },
    {
      id: 'ch2-6',
      title: '新手常见错误与调试技巧',
      content: `## 函数相关的 5 个高频错误

### ① 忘了 return

\`\`\`cpp
int add(int a, int b) {
    int c = a + b;
    // ❌ 忘了 return c; → 编译器警告，返回值是垃圾值
}
\`\`\`

### ② 返回类型写错

\`\`\`cpp
double half(int x) {
    return x / 2;      // ❌ 5/2=2（整数除法），虽然函数是 double 也救不了
}

double half2(int x) {
    return x / 2.0;    // ✅ 2.5
}
\`\`\`

### ③ 传值想改原变量

见 2-2 节：想修改外部变量必须传引用（加 \`&\`）。

### ④ 局部变量地址/引用返回

\`\`\`cpp
int &bad() {
    int local = 5;
    return local;   // ❌ 返回了已销毁的局部变量，悬垂引用（第四章详解）
}
\`\`\`

### ⑤ 函数调用前没声明

\`\`\`cpp
int main() {
    cout << add(1, 2);   // ❌ 编译器还没见过 add
    return 0;
}
int add(int a, int b) { return a + b; }
\`\`\`

解决：把定义挪到 main 之前，或在开头写一行声明 \`int add(int, int);\`。

## 调试三板斧（新手必修）

1. **cout 大法**：在可疑的地方打印变量值，看数据在哪一步变错了：

\`\`\`cpp
int result = calc(x);
cout << "calc 返回：" << result << endl;   // 插桩
\`\`\`

2. **缩小范围**：把出错代码删到最小能复现的版本——删着删着 bug 就现形了；
3. **读报错**：从**第一条**报错看起（后面的错误常是第一条引发的连锁反应），
   把报错原文拿去搜索。

> 💡 本站输出面板里：黑色 = 正常输出，红色 = 错误输出，编译错误会单独标出。
> 调试不是玄学，是有方法论的排查过程。`,
    },
  ],
};
