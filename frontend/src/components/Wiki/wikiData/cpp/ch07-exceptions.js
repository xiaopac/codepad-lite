// 第七章：异常处理（6 个分支小节）
export const ch07Exceptions = {
  id: 'chapter7',
  title: '第七章：异常处理',
  sections: [
    {
      id: 'ch7-1',
      title: '为什么要异常处理',
      content: `## 程序总会遇到"意外"

用户输入了字母而不是数字、文件被删了、网络断了、除数是 0……
如果不处理，程序直接崩溃；如果每个地方都写 if 判断，代码又臭又长：

\`\`\`cpp
// 没有异常机制的写法：返回值 + 到处 if（C 语言的经典做法）
int divide(int a, int b, int &result) {
    if (b == 0) return -1;       // 用"特殊返回值"表示出错
    result = a / b;
    return 0;                     // 0 表示成功
}

int main() {
    int result;
    if (divide(10, 0, result) != 0) {
        cout << "出错了！" << endl;
    }
    // 问题是：调用者经常"忘了检查"返回值 → 错误被悄悄忽略
    return 0;
}
\`\`\`

### 异常机制：错误"抛"出来，必须有人接

C++ 的异常像火警：**throw（拉响警报）→ 沿调用链向上找 catch（找最近的灭火器）**。
找不到就终止程序——**错误不可能被悄悄忽略**：

\`\`\`cpp
#include <iostream>
#include <stdexcept>
using namespace std;

int divide(int a, int b) {
    if (b == 0) {
        throw runtime_error("除数不能为 0");   // 拉响警报并"逃离"函数
    }
    return a / b;
}

int main() {
    try {                                // 危险区
        cout << divide(10, 0) << endl;   // 这里抛出异常 → 立刻跳到 catch
        cout << "这行不会执行" << endl;
    } catch (const runtime_error &e) {   // 接住警报
        cout << "出错了：" << e.what() << endl;
    }
    cout << "程序继续运行" << endl;       // 捕获后正常继续
    return 0;
}
\`\`\`

### 和"返回值判断"对比

| 对比 | 返回值判断 | 异常机制 |
|------|-----------|---------|
| 忘检查错误 | 悄悄出错 | 直接终止（至少不藏雷） |
| 错误信息 | 一个数字代码 | 带文字的异常对象 |
| 代码清晰度 | 满屏 if | 业务逻辑和错误处理分离 |
| 性能 | 无额外开销 | 抛出时有开销（正常路径无） |

> 💡 原则：**正常的业务流程用返回值；真正的"意外"才用异常**。
> 用户输错数字是"可预期的输入问题"（可用循环重试处理），
> 文件被删、内存不足是"意外"（适合异常）。`,
    },
    {
      id: 'ch7-2',
      title: 'throw 与 try/catch 语法',
      content: `## 三个关键字

### throw：抛出异常

可以抛任何类型，惯例是抛标准异常类的对象：

\`\`\`cpp
throw runtime_error("描述文字");   // 标准异常（推荐）
throw 42;                          // 也能抛整数（不推荐，不专业）
throw "error";                     // 也能抛字符串（不推荐）
\`\`\`

### try / catch：捕获异常

\`\`\`cpp
try {
    // 可能出错的代码
} catch (const runtime_error &e) {
    // 处理 runtime_error
} catch (const exception &e) {     // 兜底：其他标准异常
    cout << e.what() << endl;
} catch (...) {                    // 兜底中的兜底：任何类型
    cout << "未知异常" << endl;
}
\`\`\`

匹配规则：从上往下找**第一个类型匹配**的 catch，找到后其余不再执行。

### 异常在函数间"穿墙"

\`\`\`cpp
void level3() { throw runtime_error("最深处出错"); }

void level2() { level3(); }        // 不处理 → 自动继续向上抛

void level1() {
    try {
        level2();
    } catch (const runtime_error &e) {
        cout << "在 level1 捕获：" << e.what() << endl;
    }
}
\`\`\`

中间函数不写任何 try/catch，异常也能自动"冒泡"到最外层——**处理点可以集中在顶层**。

### 重新抛出

接住处理了一半，还可以再抛出去让上层继续处理：

\`\`\`cpp
catch (const runtime_error &e) {
    cout << "记录日志：" << e.what() << endl;
    throw;          // 原样重新抛出
}
\`\`\``,
    },
    {
      id: 'ch7-3',
      title: '标准异常家族',
      content: `## 一张图看懂标准异常

\`\`\`text
std::exception            ← 所有标准异常的祖先（what() 提供描述）
├── std::logic_error      程序逻辑错误（本该在编译期/测试期发现）
│   ├── invalid_argument  参数不合法（如 stoi("abc")）
│   ├── out_of_range      越界访问（如 vector::at(100)）
│   └── length_error      长度超限
└── std::runtime_error    运行时意外（外部环境导致）
    ├── overflow_error    数值溢出
    └── range_error       范围错误
\`\`\`

### 常用示例

\`\`\`cpp
#include <iostream>
#include <stdexcept>
#include <string>
#include <vector>
using namespace std;

int main() {
    // ① stoi 解析失败 → invalid_argument
    try {
        int n = stoi("abc");
    } catch (const invalid_argument &e) {
        cout << "① 解析失败：" << e.what() << endl;
    }

    // ② vector.at 越界 → out_of_range
    vector<int> v = {1, 2, 3};
    try {
        cout << v.at(10) << endl;      // at() 会检查；v[10] 不会！
    } catch (const out_of_range &e) {
        cout << "② 越界：" << e.what() << endl;
    }

    // ③ 统一兜底写法
    try {
        // 任何可能抛标准异常的代码
    } catch (const exception &e) {     // 所有标准异常都是 exception 的子类
        cout << "③ 出错了：" << e.what() << endl;
    }
    return 0;
}
\`\`\`

### what() 方法

每个标准异常都带一段描述文字，用 \`e.what()\` 取出：

\`\`\`cpp
throw runtime_error("我的自定义描述");
// catch 里：e.what() → "我的自定义描述"
\`\`\`

> 💡 捕获顺序：**先具体、后宽泛**。把 \`catch (const exception&)\` 写在
> \`catch (const runtime_error&)\` 前面会让后者永远不执行（编译器会警告）。`,
    },
    {
      id: 'ch7-4',
      title: '自定义异常类',
      content: `## 让异常"说人话"

项目里可以继承 std::exception 家族，定义自己的异常：

\`\`\`cpp
#include <iostream>
#include <stdexcept>
#include <string>
using namespace std;

// 自定义异常：银行取款业务专用
class InsufficientFunds : public runtime_error {
public:
    // 把余额信息拼进错误描述
    explicit InsufficientFunds(double balance)
        : runtime_error("余额不足，当前余额：" + to_string(balance)) {}
};

double withdraw(double balance, double amount) {
    if (amount > balance) {
        throw InsufficientFunds(balance);   // 抛出带余额的详细错误
    }
    return balance - amount;
}

int main() {
    try {
        withdraw(100, 500);
    } catch (const InsufficientFunds &e) {
        cout << "取款失败：" << e.what() << endl;
        // 输出：取款失败：余额不足，当前余额：100.000000
    }
    return 0;
}
\`\`\`

### 设计建议

1. 继承 \`runtime_error\`（或 logic_error），别从 exception 直接继承（构造麻烦）；
2. 名字要说明问题：\`FileNotFound\`、\`InvalidConfig\`、\`ConnectionLost\`；
3. 把关键信息拼进 what()（文件名、行号、数值），排查时省一半时间。

> 💡 新手先掌握标准异常即可；自定义异常在写"有明确业务领域"的程序时自然就会用到。`,
    },
    {
      id: 'ch7-5',
      title: 'noexcept 与异常安全',
      content: `## noexcept：声明"我不会抛异常"

\`\`\`cpp
int add(int a, int b) noexcept {   // 承诺不抛异常
    return a + b;
}

void risky() {                     // 默认：可能抛异常
    throw runtime_error("boom");
}
\`\`\`

### 三个作用

1. **文档作用**：读代码的人一眼知道这个函数安全；
2. **性能**：编译器可以做优化（如 move 优化，第八章 STL 会受益）；
3. **强制**：noexcept 函数如果真的抛出异常 → 直接调用 terminate 终止程序（不是"静默吞掉"）。

### 什么时候写 noexcept？

- **移动构造函数/移动赋值**（STL 内部大量依赖，进阶主题）；
- 析构函数**默认就是 noexcept**（析构抛异常是灾难）；
- 简单的 getter、swap 等纯赋值操作。

### 异常安全：异常发生时资源别泄漏

\`\`\`cpp
void bad() {
    int *p = new int(5);
    riskyOperation();      // ❌ 如果这里抛异常，p 永远不会被 delete → 泄漏
    delete p;
}

void good() {
    int *p = new int(5);
    try {
        riskyOperation();
    } catch (...) {
        delete p;          // ✅ 出错了也清理干净再抛
        throw;
    }
    delete p;
}

// 最佳：让 RAII 帮你管（智能指针/string/vector 都会自动清理）
void best() {
    unique_ptr<int> p(new int(5));   // 无论怎么退出，自动释放
    riskyOperation();
}
\`\`\`

> 💡 **RAII（资源获取即初始化）**：把资源交给对象管理，对象析构自动还资源。
> 这正是"析构函数"（第五章）大显身手的地方——异常安全的最佳实践就是多用 RAII。`,
    },
    {
      id: 'ch7-6',
      title: '实战与建议',
      content: `## 完整实战：安全的除法计算器

\`\`\`cpp
#include <iostream>
#include <stdexcept>
#include <string>
using namespace std;

// 业务函数：只负责"发现错误就抛"
double divide(double a, double b) {
    if (b == 0) {
        throw runtime_error("除数不能为 0");
    }
    return a / b;
}

int main() {
    double a, b;
    cout << "输入两个数（输入 0 0 退出）：" << endl;

    while (true) {
        cin >> a >> b;
        if (a == 0 && b == 0) break;

        try {
            double result = divide(a, b);
            cout << a << " / " << b << " = " << result << endl;
        } catch (const runtime_error &e) {
            cout << "出错了：" << e.what() << "，请重新输入" << endl;
        }
        // 关键：捕获后循环继续，程序不崩溃
    }
    cout << "再见！" << endl;
    return 0;
}
\`\`\`

### 新手使用守则（避坑指南）

1. **不要用异常做流程控制**：用户输错重输 → 用循环，不是抛异常；
2. **不要吞异常**：\`catch (...) {}\` 什么也不干 = 把火警铃捂上，错误被藏起来；
3. **catch 用引用**：\`catch (const exception &e)\`（按值会切片，和第六章一个道理）；
4. **尽量抛标准异常子类**，别抛 int/字符串；
5. **不打算处理的异常，就别接**——让它向上冒泡。

### 何时用异常 vs 返回值

| 场景 | 推荐 |
|------|------|
| 用户输入格式错误（常见、可预期） | 循环 + 判断，不用异常 |
| 除零、越界（程序 bug） | 断言/修复代码，或异常 |
| 文件不存在、网络断开（环境意外） | **异常** |
| 内存分配失败（罕见、致命） | 异常或直接退出 |

> 🎯 异常是"消防系统"，不是"日常交通规则"。用对地方，程序才既健壮又清晰。`,
    },
  ],
};
