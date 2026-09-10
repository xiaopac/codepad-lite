// 第四章：指针与引用（7 个分支小节）
export const ch04Pointers = {
  id: 'chapter4',
  title: '第四章：指针与引用',
  sections: [
    {
      id: 'ch4-1',
      title: '内存与地址：先把概念想通',
      content: `## 每个变量都住在内存的某个"门牌号"里

内存就像一栋超长的公寓楼，每个字节有一个编号（地址）。
变量住进去后，我们就有了两种找它的方式：

1. **按名字找**：直接写 \`age\`（编译器帮你翻译成地址）；
2. **按地址找**：拿到门牌号（地址），通过地址去访问——这就是指针。

\`\`\`cpp
#include <iostream>
using namespace std;

int main() {
    int age = 18;

    cout << "age 的值：" << age << endl;     // 18
    cout << "age 的地址：" << &age << endl;  // 类似 0x7ffee2f3b9ac（每次运行可能不同）

    return 0;
}
\`\`\`

**\`&\`（取地址符）** 放在变量前面，就能拿到它的门牌号。

### 一张图理解

\`\`\`text
内存地址:   0x100   0x104   0x108   ...
            ┌───────┬───────┬───────┐
            │  18   │       │       │   ← int age 占了 4 个字节
            └───────┴───────┴───────┘
             age 住在 0x100（首地址）

指针:  int* p = &age;   →   p 里存的是 0x100 这个"门牌号"
\`\`\`

> 💡 **指针的本质**：一个专门用来存"地址"的变量。它本身也是变量，
> 也有自己的地址（指针的指针就是这么来的，先不用管）。`,
    },
    {
      id: 'ch4-2',
      title: '指针基础：& 与 *',
      content: `## 两个关键符号

- **\`&\`** 取地址：\`&age\` → age 的地址；
- **\`*\`** 解引用：\`*p\` → "去 p 存的地址那里，把东西取出来"。

\`\`\`cpp
#include <iostream>
using namespace std;

int main() {
    int age = 18;

    int *p = &age;       // ① 定义指针：类型 + 星号；p 存 age 的地址

    cout << p << endl;   // 输出地址（如 0x7ffee2f3b9ac）
    cout << *p << endl;  // ② 解引用：输出 18（等价于 age）

    *p = 20;             // ③ 通过指针修改 → 改的就是 age 本身！
    cout << age << endl; // 20（age 被改了）

    return 0;
}
\`\`\`

### 空指针 nullptr

指针不指向任何东西时，让它等于 nullptr——比"乱指"安全：

\`\`\`cpp
int *p = nullptr;    // 空指针（C++11 起用 nullptr，别用 NULL/0）

if (p == nullptr) {
    cout << "p 没指向任何东西" << endl;
}
// *p = 5;  // ❌ 解引用空指针 = 崩溃！先判空再使用
\`\`\`

### 指针的两种定义写法（完全等价）

\`\`\`cpp
int* p;    // 星号靠近类型（更直观："int 指针"）
int *p;    // 星号靠近名字（传统写法）
\`\`\`

> ⚠️ 一行定义多个指针的坑：\`int* a, b;\` 只有 a 是指针，b 是普通 int！
> 要两个指针：\`int *a, *b;\`（或分行写，最清楚）。`,
    },
    {
      id: 'ch4-3',
      title: '指针与数组',
      content: `## 数组名其实是"首元素的地址"

\`\`\`cpp
#include <iostream>
using namespace std;

int main() {
    int arr[5] = {10, 20, 30, 40, 50};

    cout << arr << endl;        // 地址（和 &arr[0] 相同）
    cout << *arr << endl;       // 10（*arr 就是 arr[0]）

    int *p = arr;               // 指针指向数组首元素（不用写 &）

    // 指针可以"走路"：+1 跳到下一个元素
    cout << *(p + 1) << endl;   // 20
    cout << *(p + 3) << endl;   // 40

    // 等价关系（重要！）
    // arr[i]  ⟺  *(arr + i)  ⟺  *(p + i)
    cout << (arr[2] == *(p + 2)) << endl;   // 1（true）

    return 0;
}
\`\`\`

### 用指针遍历数组

\`\`\`cpp
int arr[5] = {10, 20, 30, 40, 50};
int *p = arr;

for (int i = 0; i < 5; i++) {
    cout << *(p + i) << " ";   // 等价于 arr[i]
}

// 指针版遍历（指针自己移动）
for (int *q = arr; q < arr + 5; q++) {
    cout << *q << " ";
}
\`\`\`

> 💡 **为什么 p + 1 是跳 4 个字节？** 因为 p 是 int* 指针，编译器知道 int 占 4 字节，
> p + 1 自动跳到下一个 int 的开头。"指针加减"始终按**元素**为单位，不是字节——
> 这叫做指针的"步长"。

### 常见错误

\`\`\`cpp
int arr[5] = {10, 20, 30, 40, 50};
int *p = arr;
p += 10;          // ❌ 越界（arr 只有 5 个元素），解引用会读到垃圾
*p;               // 危险！
\`\`\``,
    },
    {
      id: 'ch4-4',
      title: '动态内存：new 与 delete',
      content: `## 运行时才决定开多少内存

普通数组大小必须写死。但"读入 n 个学生的成绩"，n 是运行时才知道的——
这时需要**动态内存**：向操作系统临时"租"一块内存。

\`\`\`cpp
#include <iostream>
using namespace std;

int main() {
    // 租一个 int
    int *p = new int(5);       // 动态分配并初始化为 5
    cout << *p << endl;        // 5
    delete p;                  // 用完必须"还"！
    p = nullptr;               // 还了之后指针置空（防悬垂）

    // 租一个数组
    int n;
    cin >> n;                  // 运行时输入大小
    int *arr = new int[n];     // 动态数组（n 可以不是常量）

    for (int i = 0; i < n; i++) arr[i] = i * i;   // 像普通数组一样用
    for (int i = 0; i < n; i++) cout << arr[i] << " ";

    delete[] arr;              // 数组版释放：delete[]（不是 delete！）
    arr = nullptr;
    return 0;
}
\`\`\`

### 两大灾难（面试必考）

**① 内存泄漏**：租了不还 → 程序越跑内存越少：

\`\`\`cpp
void leak() {
    int *p = new int(1);
    // 函数结束，指针 p 消失，但内存没还！
    // 这块内存永远失去了"门牌号"，还不了 → 泄漏
}
\`\`\`

**② 悬垂指针**：还了还继续用：

\`\`\`cpp
int *p = new int(5);
delete p;        // 内存已归还
*p = 10;         // ❌ 在别人家的房子里乱写 → 未定义行为
\`\`\`

### 现代 C++ 的答案：智能指针（先知道名字）

\`unique_ptr\` / \`shared_ptr\` 会自动在合适的时候帮你 delete（第八章后会见到）：

\`\`\`cpp
#include <memory>
auto p = make_unique<int>(5);   // 不用写 delete，离开作用域自动释放
\`\`\`

> ⚠️ 新手规则：**new 和 delete 必须成对出现**；\`new[]\` 配 \`delete[]\`。
> 记不住就先多用 vector（vector 内部帮你管好了动态内存）。`,
    },
    {
      id: 'ch4-5',
      title: '引用：变量的别名',
      content: `## 给变量起个"小名"

引用（reference）不是新变量，而是**同一个变量的另一个名字**——改别名就是改原变量。

\`\`\`cpp
#include <iostream>
using namespace std;

int main() {
    int x = 10;
    int &ref = x;        // ref 是 x 的别名（定义时必须初始化）

    cout << ref << endl; // 10（和 x 完全一样）
    ref = 20;            // 通过别名修改
    cout << x << endl;   // 20（x 也被改了）

    cout << &x << endl;  // 两个地址完全相同——
    cout << &ref << endl; // 因为它们就是同一个变量
    return 0;
}
\`\`\`

### 三大用途

**① 函数参数（第 2 章已见）**——省拷贝、可修改：

\`\`\`cpp
void swap(int &a, int &b) { int t = a; a = b; b = t; }
void print(const string &s) { cout << s; }   // const 引用：只读 + 零拷贝
\`\`\`

**② 范围 for 中修改元素**：

\`\`\`cpp
int arr[3] = {1, 2, 3};
for (int &v : arr) v *= 2;    // 引用 → 能改原数组
// arr 现在是 {2, 4, 6}

// 对比：不用引用时改的是副本，原数组不变
for (int v : arr) v = 0;      // 无效修改
\`\`\`

**③ 作为函数返回值**（高级用法，慎用）：

\`\`\`cpp
int &getMax(int &a, int &b) { return a > b ? a : b; }
// 调用者可以：getMax(x, y) = 0;  直接把较大的那个改成 0
\`\`\`

### 引用的"倔脾气"（与指针的区别）

| 特性 | 引用 | 指针 |
|------|------|------|
| 定义时必须初始化 | ✅ 必须 | ❌ 可以先空着 |
| 可以"改指向" | ❌ 终生绑定 | ✅ 随便指 |
| 可以为空 | ❌ 没有空引用 | ✅ nullptr |
| 语法 | 直接用，像原变量 | 要 \`*\` 解引用 |
| 典型用途 | 函数参数、别名 | 动态内存、数据结构 |

> 💡 一句话总结：**引用像"绑定一辈子的别名"，指针像"可以换目标的遥控器"**。`,
    },
    {
      id: 'ch4-6',
      title: '指针 vs 引用怎么选',
      content: `## 决策指南

### 用引用的场景（优先考虑）

1. **函数参数要大对象只读**：\`void f(const string &s)\` —— 避免拷贝；
2. **函数要修改外部变量**：\`void swap(int &a, int &b)\`；
3. **范围 for 修改元素**：\`for (int &v : arr)\`。

### 用指针的场景

1. **动态内存**：\`new\` 返回的是指针（租内存必然用指针）；
2. **"可能没有对象"**：用 nullptr 表示"空"（引用做不到）；
3. **需要换目标**：链表、树等数据结构的节点之间用指针互连；
4. **数组遍历**的底层写法（STL 迭代器就是包装过的指针）。

### 常见面试题：什么时候传引用？什么时候传指针？

**回答模板**：

- 必须修改外部变量 → 引用（语法简洁）或指针（显式 \`&\` 调用，调用处看得出会被改）；
- 只读大对象 → const 引用；
- 对象可能不存在/可能为空 → 指针；
- 管理动态内存 → 指针（或智能指针）。

### 实战例子：改造一个函数

\`\`\`cpp
// 需求：读入学生成绩数组，返回平均分

// ❌ 差：把整个 vector 拷贝一份传进来（慢）
double average(vector<int> scores) { ... }

// ✅ 好：const 引用，零拷贝，函数内不能改
double average(const vector<int> &scores) {
    double sum = 0;
    for (int s : scores) sum += s;
    return sum / scores.size();
}
\`\`\`

> 💡 新手最容易过度使用指针。**先问自己：引用能解决吗？能就用引用**。
> 指针留给动态内存和数据结构。`,
    },
    {
      id: 'ch4-7',
      title: '常见指针错误集锦',
      content: `## 5 个经典错误（附排查方法）

### ① 解引用空指针

\`\`\`cpp
int *p = nullptr;
cout << *p;       // ❌ 段错误（Segmentation Fault），程序直接崩溃
\`\`\`

**修复**：使用前判空：

\`\`\`cpp
if (p != nullptr) cout << *p;
\`\`\`

### ② 悬垂指针（指向已释放内存）

\`\`\`cpp
int *p = new int(5);
delete p;
cout << *p;       // ❌ 未定义行为：可能正常、可能崩溃、可能输出垃圾
\`\`\`

**修复**：delete 后立刻 \`p = nullptr;\`

### ③ 内存泄漏

\`\`\`cpp
for (int i = 0; i < 1000000; i++) {
    int *p = new int(i);   // 每次循环租一块，从不还
}                          // ❌ 内存疯涨，系统卡死
\`\`\`

**修复**：\`delete\` 配对；现代 C++ 用智能指针/vector。

### ④ 数组越界 + 指针算术玩脱

\`\`\`cpp
int arr[3] = {1, 2, 3};
int *p = arr;
for (int i = 0; i <= 3; i++) {   // ❌ i=3 时越界（应该是 <3）
    cout << *(p + i);
}
\`\`\`

### ⑤ 返回局部变量的地址/引用

\`\`\`cpp
int *bad() {
    int local = 5;
    return &local;   // ❌ 函数返回后 local 已销毁，地址成了"鬼屋"
}

int main() {
    int *p = bad();
    cout << *p;      // 未定义行为
    return 0;
}
\`\`\`

### 排查三板斧

1. 程序崩溃先看崩溃点：是 \`*p\` 还是 \`delete\`？
2. 打印地址和值：\`cout << p << " " << *p\`；
3. 怀疑越界 → 把循环边界打印出来核对。

> ⚠️ 指针错误的可怕之处在于**不一定立刻崩溃**——可能运行 100 次都正常，
> 第 101 次才炸。写指针代码要像过马路：看清每一行，别心存侥幸。`,
    },
  ],
};
