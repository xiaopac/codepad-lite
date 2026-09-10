// 第八章：STL 标准模板库（8 个分支小节）
export const ch08Stl = {
  id: 'chapter8',
  title: '第八章：标准模板库（STL）',
  sections: [
    {
      id: 'ch8-1',
      title: 'STL 是什么',
      content: `## C++ 的"军火库"

STL（Standard Template Library，标准模板库）= **容器 + 算法 + 迭代器** 三大件。
它们互相配合，帮你少写 90% 的"造轮子"代码：

\`\`\`cpp
#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

int main() {
    // 容器：装数据
    vector<int> v = {5, 2, 8, 1, 9};

    // 算法：干活（排序）
    sort(v.begin(), v.end());

    // 迭代器 + 范围 for：遍历
    for (int x : v) cout << x << " ";   // 1 2 5 8 9
    return 0;
}
\`\`\`

### 三大件分工

| 组件 | 干什么 | 例子 |
|------|--------|------|
| 容器 | 存数据 | vector、string、map、set |
| 算法 | 处理数据 | sort、find、count、reverse |
| 迭代器 | 容器和算法之间的"插头" | begin() / end() |

**设计妙处**：算法不关心数据在哪种容器里——只要容器提供迭代器接口，
sort 既能排 vector 也能排数组。一套算法，全家通用。

### 使用 STL 前：using namespace std;

前面章节为了讲解一直带 \`std::\` 前缀。学 STL 后代码变长，多数教程和竞赛代码会写：

\`\`\`cpp
using namespace std;    // 引入整个标准命名空间
\`\`\`

好处：\`cout\`、\`vector\`、\`sort\` 都不用写 std:: 前缀。
代价：可能与你的自定义名字冲突（大型项目不推荐，学习和竞赛常用）。

> 💡 本站教程从这里开始统一用 using namespace std;，前面章节的示例两种写法都对。`,
    },
    {
      id: 'ch8-2',
      title: 'vector 详解',
      content: `## 动态数组：STL 中最常用的容器

\`\`\`cpp
#include <iostream>
#include <vector>
using namespace std;

int main() {
    vector<int> v;              // ① 创建空 vector

    // ② 添加元素
    v.push_back(10);            // 尾部追加
    v.push_back(20);
    v.push_back(30);

    // ③ 基本信息
    cout << v.size() << endl;       // 3（元素个数）
    cout << v.empty() << endl;      // 0（是否为空）

    // ④ 访问
    cout << v[0] << endl;           // 10（下标，不检查越界）
    cout << v.front() << endl;      // 10（第一个）
    cout << v.back() << endl;       // 30（最后一个）
    cout << v.at(1) << endl;        // 20（at 检查越界）

    // ⑤ 删除
    v.pop_back();                   // 删尾部 → {10, 20}
    v.erase(v.begin());             // 删迭代器指向的元素 → {20}

    // ⑥ 插入
    v.insert(v.begin(), 5);         // 开头插 5 → {5, 20}

    // ⑦ 清空
    v.clear();                      // 全部删除
    return 0;
}
\`\`\`

### 三种创建方式

\`\`\`cpp
vector<int> a;                  // 空
vector<int> b(10);              // 10 个元素，值默认 0
vector<int> c(10, 7);           // 10 个元素，全是 7
vector<int> d = {1, 2, 3};      // 列表初始化
vector<int> e(d);               // 拷贝 d
\`\`\`

### 遍历四种写法

\`\`\`cpp
vector<int> v = {1, 2, 3, 4, 5};

// ① 下标（需要位置信息时）
for (int i = 0; i < v.size(); i++) cout << v[i] << " ";

// ② 范围 for（最常用，只读）
for (int x : v) cout << x << " ";

// ③ 范围 for + 引用（要修改元素）
for (int &x : v) x *= 2;

// ④ 迭代器（配算法时用）
for (auto it = v.begin(); it != v.end(); ++it) cout << *it << " ";
\`\`\`

### 二维"数组"（vector 嵌套）

\`\`\`cpp
// 3 行 4 列的表格，初始全 0
vector<vector<int>> grid(3, vector<int>(4, 0));

grid[1][2] = 99;
for (auto &row : grid) {          // 外层遍历行
    for (int x : row) cout << x << " ";
    cout << endl;
}
\`\`\`

> ⚠️ 别在"遍历中删除"元素（迭代器会失效，进阶话题）；
> 需要频繁在中间插删时 vector 较慢（换 list，见 8-4）。`,
    },
    {
      id: 'ch8-3',
      title: 'map 与 unordered_map',
      content: `## 键值对：给数据建"字典"

map = 按 key 排序的字典；unordered_map = 用哈希表加速的字典。

\`\`\`cpp
#include <iostream>
#include <map>
using namespace std;

int main() {
    map<string, int> scores;       // key: 姓名, value: 分数

    // 插入/修改（中括号访问，不存在会自动创建）
    scores["Alice"] = 95;
    scores["Bob"] = 88;
    scores["Alice"] = 96;          // 覆盖旧值

    // 查询
    cout << scores["Alice"] << endl;   // 96
    cout << scores.size() << endl;     // 2

    // 安全查询（不存在时不会乱建）
    if (scores.find("Tom") == scores.end()) {
        cout << "没有 Tom" << endl;
    }

    // 遍历（自动按键排序：Alice < Bob）
    for (auto &kv : scores) {          // kv 是 pair<string, int>
        cout << kv.first << " -> " << kv.second << endl;
    }

    // 删除
    scores.erase("Bob");
    return 0;
}
\`\`\`

### map 与 unordered_map 怎么选

| 对比 | map | unordered_map |
|------|-----|---------------|
| 底层 | 红黑树（有序） | 哈希表（无序） |
| 查找/插入 | O(log n) | 平均 O(1) |
| 遍历顺序 | 按键升序 | 无规律 |
| 适用 | 需要有序/范围查询 | 只关心"快不快" |

> 💡 竞赛和多数业务里 unordered_map 更快；需要"按顺序输出"时用 map。
> C++11 还提供更省内存的 unordered_map 变体，进阶再了解。

### 经典应用：单词计数

\`\`\`cpp
// 统计每个单词出现次数
vector<string> words = {"apple", "banana", "apple", "cherry", "banana", "apple"};
map<string, int> count;

for (const string &w : words) {
    count[w]++;          // 不存在则创建并 +1
}

for (auto &kv : count) {
    cout << kv.first << " 出现 " << kv.second << " 次" << endl;
}
\`\`\``,
    },
    {
      id: 'ch8-4',
      title: 'set 与其他容器',
      content: `## set：自动去重 + 自动排序

\`\`\`cpp
#include <iostream>
#include <set>
using namespace std;

int main() {
    set<int> s;

    s.insert(5);
    s.insert(2);
    s.insert(8);
    s.insert(2);          // 重复的 2 会被忽略！

    cout << s.size() << endl;      // 3（自动去重）
    for (int x : s) cout << x << " ";   // 2 5 8（自动升序）

    // 判断存在
    if (s.count(5)) cout << "5 在集合里" << endl;
    if (s.find(9) == s.end()) cout << "9 不在" << endl;

    s.erase(5);            // 删除元素
    return 0;
}
\`\`\`

### 其他常用容器速览

| 容器 | 特点 | 典型场景 |
|------|------|---------|
| \`list\` | 双向链表，中间插删快 | 频繁中间插入删除 |
| \`queue\` | 先进先出 FIFO | 排队、BFS 广度优先搜索 |
| \`stack\` | 后进先出 LIFO | 括号匹配、DFS |
| \`deque\` | 双端队列，头尾都高效 | 滑动窗口 |
| \`priority_queue\` | 自动取最大/最小值 | Top K、Dijkstra |
| \`multiset\` | 允许重复的 set | 需要排序且可重复 |

### queue / stack 示例

\`\`\`cpp
#include <queue>
#include <stack>

// 队列：排队打饭
queue<int> q;
q.push(1); q.push(2); q.push(3);
cout << q.front() << endl;   // 1（队首）
q.pop();                     // 1 出队
cout << q.front() << endl;   // 2

// 栈：叠盘子
stack<int> st;
st.push(1); st.push(2);
cout << st.top() << endl;    // 2（栈顶）
st.pop();
cout << st.top() << endl;    // 1
\`\`\`

### priority_queue（自动排序的"智能队列"）

\`\`\`cpp
priority_queue<int> pq;      // 大顶堆：最大的在顶
pq.push(3); pq.push(9); pq.push(1);
cout << pq.top() << endl;    // 9
pq.pop();
cout << pq.top() << endl;    // 3
\`\`\`

> 💡 选择容器口诀：**默认 vector；要键值对 map/unordered_map；
> 要去重 set；排队 queue；叠放 stack；要最值 priority_queue。**`,
    },
    {
      id: 'ch8-5',
      title: 'algorithm 常用算法',
      content: `## 一行代码干完"手写 20 行"的活

\`\`\`cpp
#include <iostream>
#include <vector>
#include <algorithm>
#include <numeric>
using namespace std;

int main() {
    vector<int> v = {5, 2, 8, 1, 9, 3};

    // ① 排序（默认升序）
    sort(v.begin(), v.end());
    // v = {1, 2, 3, 5, 8, 9}

    // ② 反转
    reverse(v.begin(), v.end());
    // v = {9, 8, 5, 3, 2, 1}

    // ③ 查找
    auto it = find(v.begin(), v.end(), 5);
    if (it != v.end()) cout << "找到了 5" << endl;

    // ④ 计数
    cout << count(v.begin(), v.end(), 1) << endl;   // 0 个 1

    // ⑤ 最值
    cout << *max_element(v.begin(), v.end()) << endl;  // 9
    cout << *min_element(v.begin(), v.end()) << endl;  // 1

    // ⑥ 求和（在 <numeric> 里）
    int sum = accumulate(v.begin(), v.end(), 0);
    cout << sum << endl;   // 28

    // ⑦ 判断（都满足 / 存在满足）
    bool allPositive = all_of(v.begin(), v.end(), [](int x) { return x > 0; });
    cout << allPositive << endl;   // 1

    return 0;
}
\`\`\`

### 自定义排序规则（重点！）

\`\`\`cpp
// 需求：按绝对值大小排序
vector<int> v = {-5, 3, -9, 1, 8};

// 方式一：lambda（C++11 的匿名函数，最常用）
sort(v.begin(), v.end(), [](int a, int b) {
    return abs(a) < abs(b);          // 返回 true 表示 a 排在 b 前面
});
// v = {1, 3, -5, 8, -9}

// 方式二：降序
sort(v.begin(), v.end(), greater<int>());
\`\`\`

### 结构体排序（新手高频需求）

\`\`\`cpp
struct Student {
    string name;
    int score;
};

vector<Student> students = {{"小明", 85}, {"小红", 92}, {"小刚", 78}};

// 按分数从高到低；分数相同按名字字典序
sort(students.begin(), students.end(), [](const Student &a, const Student &b) {
    if (a.score != b.score) return a.score > b.score;
    return a.name < b.name;
});
\`\`\`

> 💡 **lambda 入门**：\`[](参数) { 函数体 }\` —— 方括号捕获外部变量（空 = 不捕获），
> 圆括号参数，花括号函数体。返回 true = "a 应排在 b 前面"。
> 算法进阶几乎离不开 lambda，先把这个模板记住。`,
    },
    {
      id: 'ch8-6',
      title: '迭代器深入',
      content: `## 容器与算法之间的"万能插头"

### 迭代器是什么

可以把迭代器理解成**包装过的指针**：指向容器中的某个位置，能"走"、能"看"：

\`\`\`cpp
vector<int> v = {10, 20, 30, 40, 50};

vector<int>::iterator it = v.begin();   // 指向第一个元素

cout << *it << endl;     // 10（解引用 = 看内容）
it++;                    // 前进一格
cout << *it << endl;     // 20
it += 2;                 // 前进两格
cout << *it << endl;     // 40

cout << (it - v.begin()) << endl;   // 3（两个迭代器相减 = 距离/下标）
\`\`\`

### begin() 与 end() 的约定

\`\`\`text
[10]  [20]  [30]  [40]  [50]     ???（哨兵）
 ↑                          ↑
begin()                    end()  ← end 指向"最后一个的下一个"，不存元素
\`\`\`

所以遍历的经典写法是 \`it != v.end()\`（不是 <=）：

\`\`\`cpp
for (auto it = v.begin(); it != v.end(); ++it) {
    cout << *it << " ";
}
\`\`\`

### auto 解放双手

\`vector<int>::iterator\` 太长了——用 \`auto\` 让编译器猜：

\`\`\`cpp
auto it = v.begin();      // 等价于 vector<int>::iterator
for (auto it = v.begin(); it != v.end(); ++it) { ... }
\`\`\`

### 算法返回迭代器（"结果的位置"）

\`\`\`cpp
vector<int> v = {5, 2, 8, 1, 9};

auto maxIt = max_element(v.begin(), v.end());
cout << "最大值 " << *maxIt << "，下标 " << maxIt - v.begin() << endl;

auto found = find(v.begin(), v.end(), 8);
if (found != v.end()) {
    cout << "8 在下标 " << found - v.begin() << endl;
}
\`\`\`

> ⚠️ 进阶提醒：**迭代器失效**——插入/删除元素后，旧的迭代器可能作废。
> 新手阶段记住：**遍历过程中不要增删元素**；要删就收集起来最后删。`,
    },
    {
      id: 'ch8-7',
      title: 'string 的 STL 用法',
      content: `## string 也是 STL 容器

string 内部就是"字符的 vector"，所有算法对它同样适用：

\`\`\`cpp
#include <iostream>
#include <string>
#include <algorithm>
using namespace std;

int main() {
    string s = "hello world";

    // ① 排序字符
    sort(s.begin(), s.end());        // " dehllloorw"
    cout << s << endl;

    // ② 反转
    string t = "abcdef";
    reverse(t.begin(), t.end());     // "fedcba"
    cout << t << endl;

    // ③ 查找字符
    auto it = find(s.begin(), s.end(), 'w');
    if (it != s.end()) cout << "找到 w" << endl;

    // ④ 统计字符
    cout << count(t.begin(), t.end(), 'a') << endl;

    // ⑤ 判断回文（正反一样）
    string p = "level";
    string rp = p;
    reverse(rp.begin(), rp.end());
    cout << (p == rp ? "是回文" : "不是回文") << endl;

    return 0;
}
\`\`\`

### 大小写转换（tolower 结合 transform）

\`\`\`cpp
#include <cctype>
string s = "Hello, WORLD!";

// 全部转小写
transform(s.begin(), s.end(), s.begin(),
          [](unsigned char c) { return tolower(c); });
cout << s << endl;    // "hello, world!"
\`\`\`

### 常见字符处理

| 需求 | 写法 |
|------|------|
| 判断字母 | \`isalpha(c)\` |
| 判断数字 | \`isdigit(c)\` |
| 判断空白 | \`isspace(c)\` |
| 转小写/大写 | \`tolower(c)\` / \`toupper(c)\` |
| 判断字母数字 | \`isalnum(c)\` |

（这些在 \`<cctype>\` 里，参数建议转成 unsigned char 再传。）

> 💡 string + algorithm 的组合是面试/竞赛字符串题的基本功，
> 把这节的每个例子都亲手跑一遍。`,
    },
    {
      id: 'ch8-8',
      title: '综合练习与学习路线',
      content: `## 综合练习：学生成绩管理系统（简版）

\`\`\`cpp
#include <iostream>
#include <vector>
#include <string>
#include <algorithm>
using namespace std;

struct Student {
    string name;
    int score;
};

int main() {
    vector<Student> students = {
        {"小明", 85}, {"小红", 92}, {"小刚", 78},
        {"小丽", 95}, {"小强", 61},
    };

    // ① 按分数降序排序
    sort(students.begin(), students.end(),
         [](const Student &a, const Student &b) {
             return a.score > b.score;
         });

    // ② 打印排名
    cout << "排名\\t姓名\\t分数" << endl;
    for (int i = 0; i < students.size(); i++) {
        cout << i + 1 << "\\t" << students[i].name
             << "\\t" << students[i].score << endl;
    }

    // ③ 统计信息
    int total = 0;
    for (const Student &s : students) total += s.score;
    cout << "平均分：" << double(total) / students.size() << endl;

    // ④ 最高分（已排序，第一个就是；或 max_element）
    cout << "最高分：" << students.front().name
         << " " << students.front().score << endl;

    // ⑤ 及格人数
    int passed = count_if(students.begin(), students.end(),
                          [](const Student &s) { return s.score >= 60; });
    cout << "及格人数：" << passed << endl;
    return 0;
}
\`\`\`

### 学完本教程后的进阶路线

\`\`\`text
你在这里（C++ 核心语法 + STL 入门）
    │
    ├── 算法与数据结构（排序/搜索/树/图，配合 STL 刷题）
    ├── 《C++ Primer》/《Effective C++》 系统深挖
    ├── 智能指针与 RAII、移动语义（现代 C++）
    ├── 实战方向：游戏（SDL/UE）、图形学（OpenGL）、
    │   后端（网络编程）、嵌入式（Arduino/STM32）
    └── 竞赛方向：洛谷 / Codeforces / AtCoder 刷题
\`\`\`

### 学习资源推荐

- 📖 书：《C++ Primer》（经典入门圣经）、《Effective C++》（进阶必读）；
- 🌐 网站：cppreference.com（查标准库）、learncpp.com（英文教程）；
- 🏆 刷题：洛谷（中文，新手友好）、LeetCode（面试向）；
- 🎮 项目：写一个贪吃蛇/井字棋/学生管理系统，把知识用起来。

### 最后的建议

1. **语法是工具，思维才是核心**——多思考"为什么这样设计"；
2. **写代码 > 看代码**——每节示例都亲手敲、亲手改；
3. **遇到报错是好事**——每个报错都是知识点的实战考试；
4. **保持好奇**——C++ 学得越深，越能体会到它"给你全部控制权"的魅力。

> 🎉 恭喜你完成全部 8 章！去写点自己的程序吧，哪怕只是个小游戏——
> 做出东西的成就感，才是坚持下去最好的燃料。`,
    },
  ],
};
