// 第三章：数组与字符串（6 个分支小节）
export const ch03Arrays = {
  id: 'chapter3',
  title: '第三章：数组与字符串',
  sections: [
    {
      id: 'ch3-1',
      title: 'C 风格数组',
      content: `## 数组：一排贴了编号的盒子

存 100 个学生的成绩，不可能定义 100 个变量。**数组一次开一排盒子，用编号（下标）访问**。

\`\`\`cpp
#include <iostream>
using namespace std;

int main() {
    int scores[5] = {90, 85, 78, 92, 88};  // 5 个 int 排成一排

    cout << scores[0] << endl;   // 90（下标从 0 开始！）
    cout << scores[4] << endl;   // 88（最后一个下标是 4，不是 5）

    scores[2] = 100;             // 修改第 3 个
    cout << scores[2] << endl;   // 100
    return 0;
}
\`\`\`

### 下标从 0 开始（新手最容易错）

\`\`\`text
下标:     [0]   [1]   [2]   [3]   [4]
元素:     90    85    78    92    88
第几个:   第1   第2   第3   第4   第5
\`\`\`

**n 个元素的数组，合法下标是 0 ~ n-1。**

### 遍历数组

\`\`\`cpp
int scores[5] = {90, 85, 78, 92, 88};

// 方式一：经典下标循环（推荐新手先用这个）
for (int i = 0; i < 5; i++) {
    cout << scores[i] << " ";
}

// 方式二：范围 for（C++11，不知道下标也没关系）
for (int s : scores) {
    cout << s << " ";
}

// 求总和与平均
int sum = 0;
for (int i = 0; i < 5; i++) sum += scores[i];
cout << "平均分：" << double(sum) / 5 << endl;
\`\`\`

### 初始化规则

\`\`\`cpp
int a[5] = {1, 2, 3};        // 后两个自动补 0：{1,2,3,0,0}
int b[5] = {0};              // 全部为 0
int c[5];                    // ⚠️ 未初始化，是垃圾值！
int d[] = {1, 2, 3};         // 大小自动推断为 3
\`\`\`

### 常见错误

\`\`\`cpp
int arr[5] = {1, 2, 3, 4, 5};
cout << arr[5];    // ❌ 越界！下标只能是 0~4
// C++ 不检查越界，读到的是相邻内存的垃圾数据，甚至程序崩溃
\`\`\`

> ⚠️ **数组越界是 C/C++ 最著名的坑**：编译不报错、有时运行也"正常"，
> 却在某个夜晚突然崩溃。写循环时反复确认边界：\`i < n\` 而不是 \`i <= n\`。`,
    },
    {
      id: 'ch3-2',
      title: '多维数组',
      content: `## 二维数组：表格

想象一个 Excel 表格：**行 × 列**。二维数组就是"数组的数组"。

\`\`\`cpp
#include <iostream>
using namespace std;

int main() {
    int grid[3][4] = {          // 3 行 4 列
        {1, 2, 3, 4},
        {5, 6, 7, 8},
        {9, 10, 11, 12},
    };

    cout << grid[0][0] << endl;   // 1（第 0 行第 0 列）
    cout << grid[2][3] << endl;   // 12（第 2 行第 3 列）

    grid[1][1] = 99;              // 修改第 1 行第 1 列
    return 0;
}
\`\`\`

### 双层循环遍历

\`\`\`cpp
// 外层循环 = 行，内层循环 = 列
for (int i = 0; i < 3; i++) {
    for (int j = 0; j < 4; j++) {
        cout << grid[i][j] << "\\t";
    }
    cout << endl;          // 每行结束换行
}
\`\`\`

### 实用例子：成绩单

\`\`\`cpp
// 5 个学生、3 门课的成绩
int scores[5][3] = {
    {90, 85, 88},   // 学生 0：语数英
    {78, 92, 80},   // 学生 1
    {85, 76, 91},   // 学生 2
    {88, 89, 95},   // 学生 3
    {70, 82, 79},   // 学生 4
};

// 求每个学生的总分
for (int i = 0; i < 5; i++) {
    int total = 0;
    for (int j = 0; j < 3; j++) total += scores[i][j];
    cout << "学生 " << i + 1 << " 总分：" << total << endl;
}
\`\`\`

> 💡 数组维度可以继续加（三维、四维），但两维以上代码可读性骤降。
> 真实项目里多维数据更常用"结构体数组"或 vector 嵌套（第五章、第八章）。`,
    },
    {
      id: 'ch3-3',
      title: 'std::array 与 vector 初体验',
      content: `## 更安全的"升级版数组"

C 风格数组有三个痛点：**大小固定、容易越界、传参时"退化成指针"**。
C++ 标准库提供了更好的选择。

### std::array：定长数组的安全版

\`\`\`cpp
#include <iostream>
#include <array>
using namespace std;

int main() {
    array<int, 5> arr = {90, 85, 78, 92, 88};

    cout << arr[0] << endl;      // 和普通数组一样用
    cout << arr.size() << endl;  // 5（自带长度，不用背常数！）

    // at() 带越界检查：越界会抛异常而不是悄悄读垃圾
    cout << arr.at(2) << endl;   // 78
    // cout << arr.at(9) << endl;  // ❌ 运行时抛 out_of_range（安全失败）

    // 范围 for 遍历
    for (int x : arr) cout << x << " ";
    return 0;
}
\`\`\`

### std::vector：动态数组（重点！）

大小可以在运行时自由变化——想加几个加几个：

\`\`\`cpp
#include <iostream>
#include <vector>
using namespace std;

int main() {
    vector<int> v;              // 空数组
    v.push_back(10);            // 尾部添加
    v.push_back(20);
    v.push_back(30);
    cout << v.size() << endl;   // 3（当前元素个数）
    v.pop_back();               // 删除尾部 → {10, 20}

    cout << v[0] << endl;       // 10（和数组一样用下标）
    for (int x : v) cout << x << " ";   // 10 20

    // 初始化写法
    vector<int> v2 = {1, 2, 3, 4, 5};
    vector<int> v3(10, 0);      // 10 个元素，全为 0
    return 0;
}
\`\`\`

### 怎么选？

| 需求 | 用谁 |
|------|------|
| 长度永远固定 | array（或普通数组） |
| 长度运行时才知道/会变化 | **vector**（默认首选） |
| 新手做题 | 普通数组练手，vector 更省心 |

> 💡 vector 详细用法（插入、删除、排序）在第八章 STL 展开。
> 现在只需记住：**vector 是"会自己长大的数组"**。`,
    },
    {
      id: 'ch3-4',
      title: 'C 风格字符串',
      content: `## 字符数组里的"文字"

在 std::string 出现之前，C 语言用**字符数组**存字符串——最后一个位置是结束符 \`'\\0'\`。

\`\`\`cpp
#include <iostream>
#include <cstring>    // 字符串函数库
using namespace std;

int main() {
    char name[] = "Tom";        // 实际存了 4 个字符：'T','o','m','\\0'
    cout << name << endl;       // 输出 Tom（cout 遇 \\0 停止）

    cout << strlen(name) << endl;   // 3（不含结束符）

    char a[20] = "Hello";
    strcat(a, " C++");          // 拼接 → "Hello C++"（a 要够大！）
    strcpy(a, "Hi");            // 复制 → "Hi"
    cout << strcmp(a, "Hi") << endl;  // 比较：相等返回 0

    // 遍历字符
    for (int i = 0; i < strlen(name); i++) {
        cout << name[i] << "-";
    }
    return 0;
}
\`\`\`

### 常用 <cstring> 函数

| 函数 | 作用 | 注意 |
|------|------|------|
| \`strlen(s)\` | 长度 | 不含 \\0 |
| \`strcpy(dst, src)\` | 复制 | dst 要够大，否则越界！ |
| \`strcat(dst, src)\` | 拼接 | 同上 |
| \`strcmp(a, b)\` | 比较 | 相等返回 0，不是 true！ |

> ⚠️ C 风格字符串操作是**缓冲区溢出**事故的重灾区（目标数组不够大 → 越界写坏内存）。
> 新手**了解即可**，实际写代码一律用 std::string（下一节）。`,
    },
    {
      id: 'ch3-5',
      title: 'std::string 常用操作',
      content: `## 现代 C++ 的字符串（日常就用它）

\`\`\`cpp
#include <iostream>
#include <string>
using namespace std;

int main() {
    string s = "Hello";

    // ── 拼接 ──
    string t = s + " C++";        // "Hello C++"（+ 直接拼！）
    t += "!";                     // "Hello C++!"

    // ── 长度 ──
    cout << t.length() << endl;   // 11
    cout << t.size() << endl;     // 11（等价）

    // ── 比较（直接用 ==，不用 strcmp！）──
    cout << (s == "Hello") << endl;    // 1
    cout << (s < "I") << endl;         // 1（按字典序比较）

    // ── 子串与查找 ──
    cout << t.substr(0, 5) << endl;    // "Hello"（从 0 开始取 5 个）
    size_t pos = t.find("C++");        // 找子串位置
    if (pos != string::npos) {         // npos = 找不到
        cout << "找到了，位置 " << pos << endl;   // 6
    }

    // ── 遍历（string 就是字符的数组）──
    for (char c : t) cout << c << "-";

    // ── 修改 ──
    t[0] = 'h';                   // 改单个字符 → "hello C++!"
    t.erase(5);                   // 从下标 5 删到末尾 → "hello"
    return 0;
}
\`\`\`

### 最常用速查表

| 操作 | 写法 | 说明 |
|------|------|------|
| 拼接 | \`s + t\` 或 \`s += t\` | 比 C 的 strcat 安全无数倍 |
| 长度 | \`s.length()\` | 中文字符按字节算（一个汉字 3） |
| 比较 | \`s == t\` | 直接比较内容 |
| 子串 | \`s.substr(pos, len)\` | len 省略 = 到末尾 |
| 查找 | \`s.find(t)\` | 找不到返回 npos |
| 取字符 | \`s[i]\` | 同数组下标 |
| 转 C 风格 | \`s.c_str()\` | 调老 API 时用 |

> 💡 string 会自动管理内存，拼接多长都行，不会越界——这就是现代 C++ 的安心感。`,
    },
    {
      id: 'ch3-6',
      title: '字符串与数字互转',
      content: `## 用户输入的都是字符串，怎么变数字？

很多数据以文本形式存在（文件、输入框、命令行参数），计算前要先转成数字。

### 字符串 → 数字（stoi / stod）

\`\`\`cpp
#include <iostream>
#include <string>
using namespace std;

int main() {
    string s1 = "42";
    int n = stoi(s1);             // string to int → 42

    string s2 = "3.14159";
    double d = stod(s2);          // string to double → 3.14159

    string s3 = "9999999999";
    long long big = stoll(s3);    // string to long long

    cout << n + 1 << endl;        // 43（真的是数字了）
    cout << d * 2 << endl;        // 6.28318
    return 0;
}
\`\`\`

### 数字 → 字符串（to_string）

\`\`\`cpp
int n = 42;
double pi = 3.14159;

string s1 = to_string(n);         // "42"
string s2 = to_string(pi);        // "3.141590"（默认 6 位小数）

cout << "答案是" + s1 << endl;    // 拼接："答案是42"
\`\`\`

### 转失败怎么办？（异常，第七章详讲）

\`\`\`cpp
try {
    int n = stoi("abc");   // ❌ 不是数字 → 抛 invalid_argument 异常
} catch (...) {
    cout << "输入不是数字！" << endl;
}
\`\`\`

### 综合练习：读入一行数字求和

\`\`\`cpp
// 输入："12 34 56"，输出三个数的和 102
#include <iostream>
#include <sstream>
#include <string>
using namespace std;

int main() {
    string line;
    getline(cin, line);          // 读一整行（含空格）

    stringstream ss(line);       // 把字符串当输入流
    int x, sum = 0;
    while (ss >> x) sum += x;    // 逐个提取数字

    cout << "和 = " << sum << endl;
    return 0;
}
\`\`\`

> 💡 \`getline(cin, s)\` 读整行（cin >> 遇空格就停，getline 不会）。
> \`stringstream\` 是"把字符串当 cin 用"的利器，处理格式化文本很常用。`,
    },
  ],
};
