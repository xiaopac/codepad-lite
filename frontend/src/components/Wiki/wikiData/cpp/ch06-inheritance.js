// 第六章：继承与多态（7 个分支小节）
export const ch06Inheritance = {
  id: 'chapter6',
  title: '第六章：继承与多态',
  sections: [
    {
      id: 'ch6-1',
      title: '什么是继承（is-a 关系）',
      content: `## 新类站在旧类的肩膀上

"狗是动物"、"跑车是汽车"、"管理员是用户"——这种 **is-a（是一种）** 关系就用继承。

没有继承时，Dog 和 Cat 都要把"名字、年龄、吃东西"各写一遍（重复代码）；
有继承后，公共部分写在 Animal 里，子类只管自己的特色：

\`\`\`cpp
#include <iostream>
#include <string>
using namespace std;

// 基类（父类）：把公共的东西放这里
class Animal {
protected:
    string name;                          // protected：子类可见，外部不可见
public:
    Animal(const string &n) : name(n) {}
    void eat() const {
        cout << name << " 吃东西" << endl;
    }
};

// 派生类（子类）：class 子类 : public 基类
class Dog : public Animal {
public:
    Dog(const string &n) : Animal(n) {}    // 调用父类构造函数
    void bark() const {
        cout << name << " 汪汪！" << endl;  // 直接用父类的 name
    }
};

class Cat : public Animal {
public:
    Cat(const string &n) : Animal(n) {}
    void meow() const { cout << name << " 喵喵～" << endl; }
};

int main() {
    Dog d("旺财");
    d.eat();       // 继承来的方法
    d.bark();      // 自己的方法

    Cat c("咪咪");
    c.eat();
    c.meow();
    return 0;
}
\`\`\`

### 三种访问权限在继承中的含义

| 权限 | 类内 | 子类 | 外部 | 用途 |
|------|------|------|------|------|
| public | ✅ | ✅ | ✅ | 对外接口 |
| protected | ✅ | ✅ | ❌ | 专门给子类用的"传家宝" |
| private | ✅ | ❌ | ❌ | 自己藏私房钱 |

> 💡 判断继承合不合适的口诀：**子类"是一种"基类吗？**
> "鸟是动物"✅ 继承；"鸟有翅膀"❌ 那是组合（成员变量），不是继承。`,
    },
    {
      id: 'ch6-2',
      title: '继承的语法细节',
      content: `## 三种继承方式

\`public\` 继承（99% 的场景都用它）——父类的 public 仍是 public，protected 仍是 protected：

\`\`\`cpp
class Dog : public Animal { ... };    // 推荐，is-a 关系用这个
class Dog : protected Animal { ... }; // 父类 public 降为 protected（罕见）
class Dog : private Animal { ... };   // 全部私有（几乎不用，可用组合替代）
\`\`\`

### 子类构造函数：先造父类

\`\`\`cpp
class Animal {
public:
    string name;
    int age;
    Animal(const string &n, int a) : name(n), age(a) {
        cout << "Animal 构造" << endl;
    }
};

class Dog : public Animal {
public:
    string breed;
    // 初始化列表里调用父类构造：Animal(n, a)
    Dog(const string &n, int a, const string &b)
        : Animal(n, a), breed(b) {
        cout << "Dog 构造" << endl;
    }
};
\`\`\`

**构造顺序**：父类 → 成员变量 → 子类构造函数体。
**析构顺序**：正好相反（子类 → 父类）。

### 子类调用父类的函数

\`\`\`cpp
class Dog : public Animal {
public:
    Dog(const string &n) : Animal(n) {}
    void eat() const {              // 重写（覆盖）父类方法
        Animal::eat();              // 显式调用父类版本
        cout << name << " 摇着尾巴吃" << endl;
    }
};
\`\`\`

### 继承了什么、没继承什么？

✅ 继承：成员变量、成员函数；
❌ 不继承：构造函数、析构函数、友元、赋值运算符（都要自己处理）。

> ⚠️ 子类不会自动继承父类的**构造函数**——所以上面要写
> \`Dog(...) : Animal(...)\` 显式委托给父类构造。`,
    },
    {
      id: 'ch6-3',
      title: '虚函数与多态（本章核心）',
      content: `## 同一个"叫"，狗汪汪、猫喵喵

**多态**：用基类指针/引用调用函数，实际执行的是**对象真实类型**的版本。

\`\`\`cpp
#include <iostream>
using namespace std;

class Animal {
public:
    virtual void speak() const {          // virtual = 允许子类重写并按真实类型分派
        cout << "..." << endl;
    }
};

class Dog : public Animal {
public:
    void speak() const override {         // override = 显式声明"我在重写"
        cout << "汪汪" << endl;
    }
};

class Cat : public Animal {
public:
    void speak() const override {
        cout << "喵喵" << endl;
    }
};

int main() {
    Animal *pets[2] = {new Dog(), new Cat()};

    for (int i = 0; i < 2; i++) {
        pets[i]->speak();    // 汪汪 / 喵喵 —— 按真实类型分派！
        delete pets[i];
    }
    return 0;
}
\`\`\`

### 如果没有 virtual 会怎样？

\`\`\`cpp
class Animal {
public:
    void speak() const { cout << "..." << endl; }   // 没写 virtual
};

Animal *p = new Dog();
p->speak();          // 输出 "..." —— 只按指针类型调用，多态失效！
\`\`\`

### 为什么需要多态？

典型场景：动物园管理系统里有一堆动物，写代码时只知道"它们都是 Animal"：

\`\`\`cpp
// 不需要为每种动物写一份代码：新加动物类型，这段代码一行都不用改
void makeAllSpeak(const vector<Animal *> &animals) {
    for (Animal *a : animals) a->speak();
}
\`\`\`

> 💡 **virtual + override 的黄金组合**：
> 父类声明 virtual，子类写 override——如果子类函数签名写错了（比如参数不一致），
> override 会直接让编译器报错，而不是悄悄变成"重载了一个新函数"。`,
    },
    {
      id: 'ch6-4',
      title: '纯虚函数与抽象类',
      content: `## 只给"规范"，不给实现的类

有些概念太抽象，不该被实例化——"动物"能直接 new 一个出来吗？它的 speak 该是什么声音？
这种**只定义接口、不实现**的类就是抽象类：

\`\`\`cpp
class Animal {
public:
    // 纯虚函数：virtual + = 0（没有函数体，子类必须实现）
    virtual void speak() const = 0;
    virtual ~Animal() {}
};

class Dog : public Animal {
public:
    void speak() const override { cout << "汪汪" << endl; }
};

int main() {
    // Animal a;          // ❌ 抽象类不能实例化！
    Animal *p = new Dog();  // ✅ 但可以用指针/引用指向子类对象
    p->speak();
    delete p;
    return 0;
}
\`\`\`

### 规则

1. 含**至少一个**纯虚函数的类 = 抽象类，**不能创建对象**；
2. 子类必须实现所有纯虚函数，否则子类也还是抽象类；
3. 抽象类的价值 = **接口规范**：规定"所有动物都会叫"，具体怎么叫各子类自己定。

### 实战：形状计算器

\`\`\`cpp
class Shape {                       // 抽象类：规范
public:
    virtual double area() const = 0;    // 所有形状都要会算面积
    virtual ~Shape() {}
};

class Circle : public Shape {
    double r;
public:
    Circle(double radius) : r(radius) {}
    double area() const override { return 3.14159 * r * r; }
};

class Rect : public Shape {
    double w, h;
public:
    Rect(double a, double b) : w(a), h(b) {}
    double area() const override { return w * h; }
};

int main() {
    Shape *shapes[] = {new Circle(2), new Rect(3, 4)};
    for (Shape *s : shapes) {
        cout << s->area() << endl;   // 12.566... / 12
        delete s;
    }
    return 0;
}
\`\`\`

> 🎯 体会一下：以后想加"三角形"，只需写一个 Triangle 类实现 area()，
> 使用 shapes 数组的代码**一行都不用改**——这就是面向对象设计的威力。`,
    },
    {
      id: 'ch6-5',
      title: '虚析构函数（重要的坑）',
      content: `## 为什么基类析构要写 virtual

先看一个**经典事故**：

\`\`\`cpp
class Base {
public:
    int *data;
    Base() { data = new int[100]; }
    ~Base() {                       // ❌ 没写 virtual
        delete[] data;
        cout << "Base 析构" << endl;
    }
};

class Derived : public Base {
public:
    int *extra;
    Derived() { extra = new int[200]; }
    ~Derived() {
        delete[] extra;
        cout << "Derived 析构" << endl;
    }
};

int main() {
    Base *p = new Derived();   // 基类指针指向子类对象
    delete p;                  // ❌ 只调用了 Base 的析构！
    return 0;
}
\`\`\`

**输出**：只有 "Base 析构" —— Derived 的 \`extra\` 内存**永远泄漏了**（200 个 int 没还）。

### 原因

delete 通过**指针类型**（Base*）决定调谁的析构。析构函数不是虚函数 → 不按真实类型分派。

### 修复：基类析构加 virtual

\`\`\`cpp
class Base {
public:
    virtual ~Base() { ... }     // ✅ 虚析构
};
\`\`\`

这样 delete 会先调 ~Derived()（清理子类资源），再自动调 ~Base()（清理父类资源），干净利落。

### 经验法则

> **只要一个类被设计成"会被继承"（有虚函数），就把析构函数写成 virtual。**
> 反过来，不打算被继承的类不要加（有微小开销）。

### 现代替代：智能指针

\`unique_ptr\` 会自动按真实类型析构（第八章后会见到），但在面试和笔试中"虚析构"仍是必考题。`,
    },
    {
      id: 'ch6-6',
      title: '综合示例：动物家族',
      content: `## 把本章知识串起来

\`\`\`cpp
#include <iostream>
#include <string>
#include <vector>
using namespace std;

// 抽象基类：规范"所有动物都会自我介绍"
class Animal {
protected:
    string name;
public:
    Animal(const string &n) : name(n) {}
    virtual void speak() const = 0;     // 纯虚函数
    virtual ~Animal() {}                // 虚析构（重要！）
};

class Dog : public Animal {
public:
    Dog(const string &n) : Animal(n) {}
    void speak() const override {
        cout << name << "：汪汪！" << endl;
    }
};

class Cat : public Animal {
public:
    Cat(const string &n) : Animal(n) {}
    void speak() const override {
        cout << name << "：喵喵～" << endl;
    }
};

class Duck : public Animal {
public:
    Duck(const string &n) : Animal(n) {}
    void speak() const override {
        cout << name << "：嘎嘎嘎" << endl;
    }
};

int main() {
    // 用基类指针统一管理各种动物（多态）
    vector<Animal *> zoo;
    zoo.push_back(new Dog("旺财"));
    zoo.push_back(new Cat("咪咪"));
    zoo.push_back(new Duck("唐老鸭"));

    for (Animal *a : zoo) a->speak();    // 各叫各的

    // 清理：虚析构保证每个对象都"走"得干干净净
    for (Animal *a : zoo) delete a;
    return 0;
}
\`\`\`

### 运行结果

\`\`\`text
旺财：汪汪！
咪咪：喵喵～
唐老鸭：嘎嘎嘎
\`\`\`

### 扩展练习

1. 加一个 \`Pig\` 类——你会发现 main 里只需要两行改动（new 一行）；
2. 给 Animal 加一个普通成员函数 \`getName()\`，体会继承的复用；
3. 把 \`vector<Animal *>\` 换成 \`vector<unique_ptr<Animal>>\`（进阶，第八章方向）。

### 本章知识清单

- ✅ 继承 = is-a 关系，代码复用；
- ✅ 构造顺序：父类 → 子类；析构相反；
- ✅ 虚函数 + override = 多态；
- ✅ 纯虚函数 = 抽象类 = 接口规范；
- ✅ **虚析构**是继承体系的安全底线。`,
    },
    {
      id: 'ch6-7',
      title: '多态常见误区',
      content: `## 新手最容易踩的 4 个坑

### ① 忘了写 virtual → 多态失效

\`\`\`cpp
class Base {
public:
    void show() { cout << "Base" << endl; }    // ❌ 没 virtual
};
class Derived : public Base {
public:
    void show() { cout << "Derived" << endl; }
};

Base *p = new Derived();
p->show();      // 输出 Base（按指针类型调用，不是真实类型！）
delete p;
\`\`\`

### ② 子类函数签名不一致 → 没重写成功

\`\`\`cpp
class Base {
public:
    virtual void f(int x) { ... }
};
class Derived : public Base {
public:
    void f(double x) override { ... }   // ❌ 参数类型不同，override 会报错！
};
\`\`\`

**没有 override 时**这行能编译过，但它是"新函数"而不是重写——多态悄悄失效。
**写了 override** 编译器直接指出错误。这就是为什么强烈建议写 override。

### ③ 用对象而不是指针/引用 → 多态失效

\`\`\`cpp
void bad(Animal a) { a.speak(); }        // ❌ 按值传：发生"对象切片"，变回 Animal
void good(Animal &a) { a.speak(); }      // ✅ 引用保持多态
\`\`\`

按值传对象时子类部分被"切掉"（对象切片 object slicing），只剩基类那一半。

### ④ 在构造函数里调虚函数

\`\`\`cpp
class Base {
public:
    Base() { init(); }               // 构造期间调虚函数
    virtual void init() { cout << "Base::init" << endl; }
};
class Derived : public Base {
public:
    void init() override { cout << "Derived::init" << endl; }
};

int main() {
    Derived d;    // 输出 Base::init —— 构造期间子类还没"出生"，
                  // 虚函数按当前构造阶段分派（调的是 Base 版本）
    return 0;
}
\`\`\`

**规则**：构造函数/析构函数里调虚函数，不会按"最终类型"分派——避免这种写法。

> 💡 遇到"多态不生效"，按顺序检查：
> ① 父类写 virtual 了吗？② 子类签名一致吗（+override）？
> ③ 是用指针/引用调用的吗？④ 是不是在构造/析构里调的？`,
    },
  ],
};
