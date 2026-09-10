// 第五章：类与对象（6 个分支小节）
export const ch05Classes = {
  id: 'chapter5',
  title: '第五章：类与对象',
  sections: [
    {
      id: 'ch5-1',
      title: '面向对象思想入门',
      content: `## 从"流水账"到"分工协作"

### 面向过程（之前学的写法）

数据和操作分开：一堆变量 + 一堆函数，函数传来传去：

\`\`\`cpp
// 面向过程：数据散落在外
string name1 = "小明";
int score1 = 85;
void printStudent(string name, int score) { ... }   // 谁都能改，关系混乱
\`\`\`

### 面向对象（OOP）：把数据和行为打包

**类（class）= 图纸，对象（object）= 按图纸造出来的实物**。
把"学生"这个概念的**数据**（名字、分数）和**行为**（打印、加分）打包在一起：

\`\`\`cpp
class Student {                  // 图纸：学生长什么样、能做什么
public:
    string name;                 // 数据（成员变量）
    int score;

    void print() {               // 行为（成员函数）
        cout << name << ": " << score << endl;
    }
};

int main() {
    Student s1;                  // 用图纸造实物（对象/实例）
    s1.name = "小明";
    s1.score = 85;
    s1.print();                  // 让对象自己干活：小明: 85

    Student s2{"小红", 92};      // 也可以直接初始化（C++11）
    s2.print();                  // 小红: 92
    return 0;
}
\`\`\`

### 三个核心概念

| 概念 | 一句话 | 对应生活 |
|------|--------|---------|
| 封装 | 数据和操作打包，藏起细节 | 手机内部电路藏起来，只留屏幕和按键 |
| 继承 | 新类在旧类基础上扩展 | 跑车继承"车"的所有能力再加特性 |
| 多态 | 同一指令，不同对象不同表现 | 按"播放"键：MP3 放歌、MP4 放视频 |

> 💡 **为什么要 OOP**：程序一大，散落的变量和函数会互相纠缠、难以维护。
> 类把"一个概念"的所有东西圈在一起，改学生逻辑就只动 Student 类。`,
    },
    {
      id: 'ch5-2',
      title: '定义类与访问控制',
      content: `## public 和 private：哪些能碰，哪些不能碰

\`\`\`cpp
#include <iostream>
#include <string>
using namespace std;

class Student {
private:                         // 私有区：外部不能直接碰（默认就是 private）
    string name;                 // 数据藏起来
    int score;

public:                          // 公有区：对外提供的"操作面板"
    void setName(const string &n) { name = n; }    // 通过函数间接修改
    void setScore(int s) { score = s; }
    void print() const { cout << name << ": " << score << endl; }
};

int main() {
    Student s;
    // s.name = "小明";      // ❌ 编译错误：name 是私有的！
    s.setName("小明");       // ✅ 走公开接口
    s.setScore(85);
    s.print();
    return 0;
}
\`\`\`

### 为什么要"藏"数据？

1. **防误改**：\`s.score = -100;\` 这种明显错误的值，可以在 setScore 里检查拦截：

\`\`\`cpp
void setScore(int s) {
    if (s >= 0 && s <= 100) score = s;
    else cout << "非法成绩：" << s << endl;
}
\`\`\`

2. **可维护**：内部实现随便改（比如 score 改成 double 存储），外部代码不用动。

### 类内的 const 成员函数

\`\`\`cpp
void print() const { ... }   // const 承诺：不会修改任何成员变量
\`\`\`

- 表示这个函数是"只读操作"；
- 可以被 const 对象调用；
- 编译器会检查你是否偷偷改了成员。

### 经验法则

- **成员变量一律 private**（提供 getter/setter 按需公开）；
- 对外接口 public；
- 派生类要用的成员用 protected（第六章见）。

> 💡 想一想：手机把电池、芯片都封装起来，只留触摸屏——如果电池引脚露在外面，
> 人人都能碰到，手机早就坏了。封装就是这个道理。`,
    },
    {
      id: 'ch5-3',
      title: '构造函数',
      content: `## 对象出生时自动执行的函数

构造函数：**与类同名、没有返回类型**，创建对象时自动调用，负责"把新对象收拾干净"。

\`\`\`cpp
#include <iostream>
#include <string>
using namespace std;

class Student {
private:
    string name;
    int score;
public:
    // 构造函数（与类同名，无返回类型）
    Student(const string &n, int s) {
        name = n;
        score = s;
        cout << name << " 出生了！" << endl;
    }

    void print() const { cout << name << ": " << score << endl; }
};

int main() {
    Student s1("小明", 85);    // 创建对象 → 自动调用构造函数
    Student s2("小红", 92);    // 再调用一次
    s1.print();
    return 0;
}
\`\`\`

### 初始化列表（推荐写法）

上面的构造函数"先默认构造再赋值"。更高效的是**初始化列表**——一步到位：

\`\`\`cpp
// : name(n), score(s) 就是初始化列表
Student(const string &n, int s) : name(n), score(s) {}
\`\`\`

### 默认构造函数与重载

\`\`\`cpp
class Point {
private:
    double x, y;
public:
    Point() : x(0), y(0) {}                    // ① 无参构造（默认值）
    Point(double a, double b) : x(a), y(b) {}  // ② 带参构造（重载）
    Point(double a) : x(a), y(0) {}            // ③ 一个参数
};

int main() {
    Point p1;          // 用 ①
    Point p2(3, 4);    // 用 ②
    Point p3(7);       // 用 ③
    return 0;
}
\`\`\`

> ⚠️ 一旦你写了**任何**构造函数，编译器就不再自动生成无参构造。
> \`Point p1;\` 会报错——需要自己补一个无参构造（或给参数加默认值）。`,
    },
    {
      id: 'ch5-4',
      title: '析构函数与 this',
      content: `## 析构函数：对象临终时自动执行的"遗嘱"

与类同名、前面加 \`~\`。对象销毁（离开作用域/delete）时自动调用，负责清理资源：

\`\`\`cpp
#include <iostream>
using namespace std;

class File {
private:
    string filename;
public:
    File(const string &f) : filename(f) {
        cout << "打开文件 " << filename << endl;
    }
    ~File() {                                  // 析构函数
        cout << "关闭文件 " << filename << endl;  // 自动收尾
    }
};

int main() {
    File f("data.txt");    // 构造：打开文件
    // ... 干活 ...
    return 0;              // 离开作用域 → 析构：自动关闭文件
}
\`\`\`

**典型用途**：释放动态内存、关闭文件、断开网络连接——保证"不管怎么退出，资源都还干净"。

## this 指针：对象自己的"我"

成员函数里，\`this\` 指向**调用这个函数的那个对象**：

\`\`\`cpp
class Counter {
private:
    int count = 0;
public:
    void add(int n) {
        this->count += n;    // this->count 等价于直接写 count
    }
    Counter &increment() {   // 返回自己（链式调用技巧）
        count++;
        return *this;        // *this = 当前对象本身
    }
};

int main() {
    Counter c;
    c.increment().increment().increment();   // 链式：连加三次
    c.add(10);
    return 0;
}
\`\`\`

### 什么时候必须用 this？

1. **参数名和成员名冲突**：\`void setScore(int score) { this->score = score; }\`；
2. **返回对象自身**：链式调用；
3. 其他情况可写可不写（写上加分：明确"这是成员变量"）。`,
    },
    {
      id: 'ch5-5',
      title: 'static 成员',
      content: `## 属于"整个类"而不是某个对象的成员

普通成员：每个对象各有一份。static 成员：**全类共享一份**——适合统计、配置：

\`\`\`cpp
#include <iostream>
#include <string>
using namespace std;

class Student {
private:
    string name;
    static int total;            // ① 声明：全类共享的计数器
public:
    Student(const string &n) : name(n) {
        total++;                 // 每出生一个学生 +1
    }
    ~Student() { total--; }      // 每销毁一个 -1

    static int getTotal() {      // ② static 成员函数：不用对象也能调用
        return total;
    }
};

int Student::total = 0;          // ③ 类外定义并初始化（必须！）

int main() {
    cout << Student::getTotal() << endl;   // 0（还没学生）
    Student s1("小明");
    Student s2("小红");
    cout << Student::getTotal() << endl;   // 2（用 类名::函数 调用）
    return 0;
}
\`\`\`

### 三条规则

1. static 成员变量必须在**类外**定义一次（那行 \`int Student::total = 0;\`）；
2. static 成员函数**没有 this**，只能访问 static 成员；
3. 访问方式：\`类名::成员\`（或通过对象，但推荐类名）。

### 典型场景

- 统计对象总数（如上）；
- 共享配置（\`static const int MAX = 100;\`）；
- 单例模式的基础（进阶）。`,
    },
    {
      id: 'ch5-6',
      title: '完整示例：学生类实战',
      content: `## 综合本节所有知识

\`\`\`cpp
#include <iostream>
#include <string>
#include <vector>
using namespace std;

class Student {
private:
    string name;
    int score;
    static int total;                // 全类共享：学生总数

public:
    // 构造函数（初始化列表 + 校验）
    Student(const string &n, int s) : name(n), score(0) {
        setScore(s);                 // 复用校验逻辑
        total++;
    }

    ~Student() { total--; }

    // getter / setter（封装）
    string getName() const { return name; }
    int getScore() const { return score; }

    void setScore(int s) {
        if (s >= 0 && s <= 100) score = s;
        else cerr << "警告：非法成绩 " << s << "，已忽略" << endl;
    }

    // 只读操作（const 成员函数）
    bool isPassed() const { return score >= 60; }

    void print() const {
        cout << name << "："
             << score << " 分（"
             << (isPassed() ? "及格" : "不及格") << "）" << endl;
    }

    static int getTotal() { return total; }
};

int Student::total = 0;

int main() {
    vector<Student> classRoom;                     // 用 vector 装对象
    classRoom.push_back(Student("小明", 85));
    classRoom.push_back(Student("小红", 92));
    classRoom.push_back(Student("小刚", 58));
    classRoom.push_back(Student("小丽", 130));     // 非法成绩 → 触发校验警告

    for (const Student &s : classRoom) {           // const 引用遍历，零拷贝
        s.print();
    }

    cout << "共 " << Student::getTotal() << " 名学生" << endl;
    return 0;
}
\`\`\`

### 运行结果

\`\`\`text
警告：非法成绩 130，已忽略
小明：85 分（及格）
小红：92 分（及格）
小刚：58 分（不及格）
小丽：0 分（不及格）
共 4 名学生
\`\`\`

### 本节知识清单

- ✅ 类 = 数据 + 行为 的打包；对象 = 类的实例；
- ✅ 成员变量 private，通过 public 接口访问；
- ✅ 构造函数自动初始化，析构函数自动清理；
- ✅ const 成员函数承诺只读；
- ✅ static 成员全类共享；
- ✅ 用 vector 管理对象集合。

> 🎯 **练习**：把 1~3 章写的"学生成绩"程序改写成 Student 类版本。
> 你会突然理解为什么说 OOP 让代码变清晰。`,
    },
  ],
};
