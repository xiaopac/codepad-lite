// 第七章：面向对象（7 小节）
export const ch07Oop = {
  id: 'chapter7',
  title: '第七章：面向对象',
  sections: [
    {
      id: 'ch7-1',
      title: '面向对象思想入门',
      content: `## 从"一堆函数"到"一个对象"

假设要写学生成绩管理。用函数写大概是这样：

\`\`\`python
def create_student(name, score):
    return {"name": name, "score": score}

def is_passed(student):
    return student["score"] >= 60

s = create_student("小明", 92)
print(is_passed(s))         # True

s2 = {"nmae": "小红", "score": 88}      # ⚠️ 键名打错，程序照样跑
print(is_passed(s2))        # KeyError: 'score'  运行到才发现
\`\`\`

问题：**数据和操作是分开的**，谁都能乱改字典，很容易写错键名。

用"类"写：

\`\`\`python
class Student:
    def __init__(self, name, score):
        self.name = name
        self.score = score

    def is_passed(self):
        return self.score >= 60

s = Student("小明", 92)
print(s.is_passed())        # True
print(s.name, s.score)      # 小明 92
\`\`\`

数据（\`name\`、\`score\`）和操作（\`is_passed\`）**打包在一起**了。

### 类与对象的关系

\`\`\`mermaid
类（图纸）  ── 创建 ──▶  对象（房子）
Student             s1 = Student("小明", 92)
                    s2 = Student("小红", 88)
\`\`\`

| 概念 | 说明 | 例子 |
|------|------|------|
| **类 class** | 模板 / 图纸 | \`Student\` |
| **对象 / 实例** | 按图纸造出来的具体东西 | \`Student("小明", 92)\` |
| **属性** | 对象里的数据 | \`s.name\`、\`s.score\` |
| **方法** | 对象能做的事 | \`s.is_passed()\` |

### 什么时候该用类？

| 适合用类 | 适合用函数 / 字典 |
|---------|-----------------|
| 数据 + 行为要绑定在一起 | 纯计算，没有状态 |
| 会有很多个"同类不同值"的实例 | 一次性处理一段数据 |
| 需要继承、扩展 | 简单脚本 |

**新手建议**：先写函数，当发现"总是把同一个字典传来传去、还要记住有哪些键"时，
就该把它升级成类了。别为了"显得高级"而用类。

> 💡 **现实类比**：
> 类是"学生这个概念"（都有姓名、成绩、都会判断是否及格），
> 对象是"小明这个具体的学生"（姓名=小明，成绩=92）。`,
    },
    {
      id: 'ch7-2',
      title: '定义类与实例属性',
      content: `## 基本语法

\`\`\`python
class Student:
    """学生类：记录姓名与成绩"""

    def __init__(self, name, score):
        self.name = name        # 实例属性
        self.score = score

    def show(self):
        print(f"{self.name}：{self.score} 分")

# 创建对象（会调用 __init__）
s1 = Student("小明", 92)
s2 = Student("小红", 88)

s1.show()      # 小明：92 分
s2.show()      # 小红：88 分
\`\`\`

### \`__init__\`：初始化方法

- 创建对象时**自动调用**，用来给属性赋初值；
- 名字固定是 \`__init__\`（前后各两个下划线）；
- 第一个参数必须是 \`self\`。

### \`self\` 是什么？

\`self\` 代表"**当前这个对象自己**"。

\`\`\`python
class Counter:
    def __init__(self):
        self.count = 0

    def add(self):
        self.count += 1
        return self.count

c1 = Counter()
c2 = Counter()

print(c1.add(), c1.add())    # 1 2
print(c2.add())              # 1   ← c2 有自己独立的 count
\`\`\`

\`c1.add()\` 实际相当于 \`Counter.add(c1)\`——**Python 自动把对象作为第一个参数传进去**。
所以定义方法时 \`self\` 不能省，调用时不用写。

### 属性可以在方法里随时添加

\`\`\`python
class Dog:
    def __init__(self, name):
        self.name = name

    def bark(self):
        self.last_action = "叫了一声"      # 动态添加属性（不推荐但合法）
        print(f"{self.name}：汪！")

d = Dog("旺财")
d.bark()
print(d.last_action)        # 叫了一声
\`\`\`

> ⚠️ **属性最好都在 \`__init__\` 里定义**，这样一眼就能看出对象有哪些属性。
> 在别的方法里临时加属性会让代码难以追踪（新手常见问题）。

### 访问与修改属性

\`\`\`python
s = Student("小明", 92)
print(s.name)          # 小明
s.score = 95           # 直接修改
print(s.score)         # 95

# 属性不存在会报 AttributeError
# print(s.age)         # AttributeError: 'Student' object has no attribute 'age'
\`\`\`

### 一个完整的例子

\`\`\`python
class BankAccount:
    def __init__(self, owner, balance=0):
        self.owner = owner
        self.balance = balance

    def deposit(self, amount):
        if amount <= 0:
            print("存款金额必须大于 0")
            return
        self.balance += amount
        print(f"存入 {amount}，余额 {self.balance}")

    def withdraw(self, amount):
        if amount > self.balance:
            print("余额不足")
            return
        self.balance -= amount
        print(f"取出 {amount}，余额 {self.balance}")

    def show(self):
        print(f"{self.owner} 的账户余额：{self.balance}")

acc = BankAccount("小明", 100)
acc.deposit(50)       # 存入 50，余额 150
acc.withdraw(500)     # 余额不足
acc.show()            # 小明 的账户余额：150
\`\`\`

注意方法里对数据的**校验**（金额必须大于 0、不能超额取款）——
这是用类封装的好处：**数据只能通过你允许的方式修改**。`,
    },
    {
      id: 'ch7-3',
      title: '方法详解：实例、类、静态与属性',
      content: `## 三种方法

\`\`\`python
class Circle:
    pi = 3.14159                      # 类属性：所有实例共享

    def __init__(self, r):
        self.r = r                    # 实例属性：每个对象独立

    def area(self):                   # ① 实例方法：要访问 self
        return Circle.pi * self.r ** 2

    @classmethod
    def from_diameter(cls, d):        # ② 类方法：cls 是类本身
        return cls(d / 2)

    @staticmethod
    def is_valid_radius(r):           # ③ 静态方法：不需要 self/cls
        return r > 0

c = Circle(3)
print(c.area())                       # 28.27431
print(Circle.from_diameter(10).r)     # 5.0
print(Circle.is_valid_radius(-1))     # False
\`\`\`

| 方法类型 | 第一个参数 | 用途 | 调用方式 |
|---------|-----------|------|---------|
| 实例方法 | \`self\` | 读写对象数据（绝大多数情况） | \`obj.method()\` |
| 类方法 \`@classmethod\` | \`cls\` | 提供"另一种创建方式"、操作类属性 | \`Class.method()\` |
| 静态方法 \`@staticmethod\` | 无 | 只是"放在类里的普通函数" | \`Class.method()\` |

**新手用实例方法就够了**，另外两种知道有即可。

### 类属性 vs 实例属性（易错点）

\`\`\`python
class Dog:
    species = "犬科"          # 类属性：所有狗共享

d1, d2 = Dog(), Dog()
print(d1.species, d2.species)   # 犬科 犬科

Dog.species = "犬科动物"         # 改类属性
print(d1.species)               # 犬科动物（都变了）

d1.species = "狗"               # ⚠️ 这是给 d1 新建了一个实例属性
print(d1.species, d2.species)   # 狗 犬科动物（d2 不受影响）
\`\`\`

**结论**：想改所有实例共享的值，改类属性（\`Dog.species = ...\`）；
\`d1.species = ...\` 只会给 d1 加一个同名属性，容易造成困惑。

### @property：像属性一样的方法

\`\`\`python
class Student:
    def __init__(self, name, score):
        self.name = name
        self._score = score          # 约定：下划线开头 = 内部使用

    @property
    def score(self):                 # 读取时调用
        return self._score

    @score.setter
    def score(self, value):          # 赋值时调用
        if not 0 <= value <= 100:
            raise ValueError("成绩必须在 0~100 之间")
        self._score = value

    @property
    def level(self):                 # 只读的计算属性
        if self._score >= 90:
            return "优秀"
        if self._score >= 60:
            return "及格"
        return "不及格"

s = Student("小明", 92)
print(s.score)          # 92       —— 写法像属性，不是 s.score()
print(s.level)          # 优秀

s.score = 95            # 走 setter 做校验
print(s.score)          # 95

# s.score = 200         # ❌ ValueError: 成绩必须在 0~100 之间
\`\`\`

\`@property\` 的价值：**对外看起来是属性，内部却能做校验和计算**，
以后想加逻辑也不用改调用方的代码。

### 私有约定：一个下划线

\`\`\`python
class Account:
    def __init__(self):
        self.balance = 0          # 公开
        self._pin = "1234"        # 约定私有（别直接访问）
        self.__secret = "x"       # 名字改写（name mangling），更强制
\`\`\`

Python **没有真正的私有**，靠约定：**下划线开头表示"内部使用，请不要碰"**。
真要用 \`_\` 开头的属性也能访问，但那是你的责任。

> 💡 **实践建议**：
> 数据用属性存、行为用方法写；需要校验就用 \`@property\`；
> 不想被外部依赖的内部实现，加一个下划线前缀。`,
    },
    {
      id: 'ch7-4',
      title: '继承与 super',
      content: `## is-a 关系：学生"是一种"人

\`\`\`python
class Person:
    def __init__(self, name, age):
        self.name = name
        self.age = age

    def introduce(self):
        print(f"我叫 {self.name}，今年 {self.age} 岁")

class Student(Person):              # Student 继承 Person
    def __init__(self, name, age, school):
        super().__init__(name, age)  # 调用父类的初始化
        self.school = school         # 自己的属性

    def study(self):
        print(f"{self.name} 在 {self.school} 学习")

s = Student("小明", 18, "第一中学")
s.introduce()      # 我叫 小明，今年 18 岁   ← 来自父类
s.study()          # 小明 在 第一中学 学习     ← 自己的方法
\`\`\`

| 概念 | 说明 |
|------|------|
| 父类 / 基类 | \`Person\`，被继承的类 |
| 子类 / 派生类 | \`Student\`，继承别人的类 |
| \`super()\` | 调用父类的方法（最常用在 \`__init__\`） |

### 方法重写（override）

子类可以"改写"父类的方法：

\`\`\`python
class Teacher(Person):
    def __init__(self, name, age, subject):
        super().__init__(name, age)
        self.subject = subject

    def introduce(self):            # 重写父类方法
        super().introduce()         # 先做父类的事
        print(f"我教 {self.subject}")   # 再做额外的

t = Teacher("王老师", 35, "数学")
t.introduce()
# 我叫 王老师，今年 35 岁
# 我教 数学
\`\`\`

### isinstance：判断类型

\`\`\`python
s = Student("小明", 18, "一中")

print(isinstance(s, Student))     # True
print(isinstance(s, Person))      # True   子类也是父类的实例！
print(issubclass(Student, Person))  # True
\`\`\`

### 多继承（了解即可）

\`\`\`python
class A:
    def hello(self):
        print("A")

class B:
    def hello(self):
        print("B")

class C(A, B):
    pass

C().hello()      # A   按 MRO 顺序找（C → A → B）
print(C.__mro__) # 查看查找顺序
\`\`\`

多继承容易造成混乱，**实际项目里优先用"单继承 + 组合"**（第 7 节讲）。

### 什么时候该用继承？

| ✅ 适合继承 | ❌ 不适合 |
|-----------|----------|
| 子类确实是父类的一种（学生是人） | 只是"用到"另一个类的功能 |
| 想复用父类的属性和方法 | 为了少写代码硬套关系 |
| 需要多态（下一节） | 层级超过 3 层 |

> ⚠️ **继承是最强的耦合**：父类一改，所有子类都受影响。
> 拿不准时先考虑组合（\`self.engine = Engine()\`），它更灵活。`,
    },
    {
      id: 'ch7-5',
      title: '多态与鸭子类型',
      content: `## 同一个调用，不同的表现

\`\`\`python
class Dog:
    def speak(self):
        print("汪汪")

class Cat:
    def speak(self):
        print("喵喵")

class Duck:
    def speak(self):
        print("嘎嘎")

for animal in [Dog(), Cat(), Duck()]:
    animal.speak()      # 同一个 .speak()，各自表现不同
\`\`\`

**多态**：调用同样的方法名，不同对象做出不同响应。
好处是调用方**不需要知道具体类型**，代码更通用。

### 鸭子类型：Python 的哲学

> "如果它走起来像鸭子、叫起来像鸭子，那它就是鸭子。"

Python **不检查对象的类型**，只关心"它有没有这个方法/属性"：

\`\`\`python
class Robot:
    def speak(self):
        print("哔哔")

def make_it_speak(thing):
    thing.speak()          # 不管你是什么类型，只要有 speak 就行

make_it_speak(Dog())       # 汪汪
make_it_speak(Robot())     # 哔哔
\`\`\`

\`make_it_speak\` 完全不需要知道传进来的是什么类——
这和 C++ 的"必须继承同一个基类 + 虚函数"很不一样，灵活得多。

> ⚠️ 代价是：**类型错误只能在运行时发现**。传进来一个没有 \`speak\` 的对象，
> 会在调用时抛 \`AttributeError\`。所以第八章会讲**类型注解**来弥补这个短板。

### 实际例子：给不同对象"统一处理"

\`\`\`python
class FileLogger:
    def log(self, message):
        print(f"[文件] {message}")

class ConsoleLogger:
    def log(self, message):
        print(f"[控制台] {message}")

class TestLogger:
    def __init__(self):
        self.messages = []
    def log(self, message):
        self.messages.append(message)      # 测试时只收集，不输出

def run_app(logger):
    logger.log("程序启动")
    logger.log("处理数据")
    logger.log("程序结束")

run_app(ConsoleLogger())
run_app(FileLogger())
test = TestLogger()
run_app(test)
print(test.messages)       # ['程序启动', '处理数据', '程序结束']
\`\`\`

这一段非常实用：**换一个 logger 对象，行为就完全不同**——
写日志到文件、输出到屏幕、还是收集起来做测试，调用方代码一行都不用改。

### 抽象基类：想要"强制实现"

如果希望子类**必须**实现某个方法，可以用 \`abc\`：

\`\`\`python
from abc import ABC, abstractmethod

class Shape(ABC):
    @abstractmethod
    def area(self):
        """子类必须实现"""

class Square(Shape):
    def __init__(self, side):
        self.side = side
    def area(self):
        return self.side ** 2

# Shape()            # ❌ 报错：不能实例化抽象类
print(Square(3).area())     # 9
\`\`\`

| 想要 | 用什么 |
|------|--------|
| 灵活，随时替换实现 | 鸭子类型（推荐） |
| 明确规范，防止漏实现 | \`abc.ABC\` + \`@abstractmethod\` |

> 💡 **多态 + 鸭子类型是 Python 最实用的设计技巧之一**：
> 定义接口时只约定"要有哪些方法"，具体实现交给使用者。`,
    },
    {
      id: 'ch7-6',
      title: '魔术方法：让对象像内置类型',
      content: `## 前后双下划线的方法

\`__init__\` 你已经很熟了，它属于**魔术方法（magic method）**。
实现它们，你的对象就能支持 \`print\`、\`len\`、\`+\`、\`==\`、\`for\` 等内置行为。

### \`__str__\` 与 \`__repr__\`：打印对象

\`\`\`python
class Student:
    def __init__(self, name, score):
        self.name = name
        self.score = score

s = Student("小明", 92)
print(s)          # <__main__.Student object at 0x7f...>   ← 默认很难看
\`\`\`

\`\`\`python
class Student:
    def __init__(self, name, score):
        self.name = name
        self.score = score

    def __str__(self):              # 给用户看：print(obj)
        return f"{self.name}（{self.score} 分）"

    def __repr__(self):             # 给开发者看：调试、列表里显示
        return f"Student(name={self.name!r}, score={self.score})"

s = Student("小明", 92)
print(s)                  # 小明（92 分）
print([s])                # [Student(name='小明', score=92)]
print(f"{s!r}")           # Student(name='小明', score=92)
\`\`\`

**记住**：\`__str__\` 面向用户，\`__repr__\` 面向调试。只写一个的话，优先写 \`__repr__\`。

### \`__eq__\`：让对象能比较

\`\`\`python
class Point:
    def __init__(self, x, y):
        self.x, self.y = x, y

    def __eq__(self, other):
        return isinstance(other, Point) and (self.x, self.y) == (other.x, other.y)

    def __hash__(self):                 # 定义了 __eq__ 后要一起定义它，才能放进 set
        return hash((self.x, self.y))

print(Point(1, 2) == Point(1, 2))       # True   ← 默认是 False（比较地址）
print(Point(1, 2) in {Point(1, 2)})     # True
\`\`\`

### \`__len__\` / \`__getitem__\`：像容器一样用

\`\`\`python
class Playlist:
    def __init__(self, songs):
        self.songs = songs

    def __len__(self):              # len(playlist)
        return len(self.songs)

    def __getitem__(self, i):       # playlist[0]、还支持 for 遍历
        return self.songs[i]

    def __contains__(self, song):   # "歌名" in playlist
        return song in self.songs

p = Playlist(["歌A", "歌B", "歌C"])
print(len(p))               # 3
print(p[1])                 # 歌B
print("歌A" in p)           # True
for song in p:              # 自动可遍历
    print(song)
\`\`\`

### 其他常用魔术方法

| 方法 | 触发时机 | 例子 |
|------|---------|------|
| \`__init__\` | 创建对象 | \`Student(...)\` |
| \`__str__\` / \`__repr__\` | \`print\` / 调试显示 | 见上 |
| \`__len__\` | \`len(obj)\` | 容器类 |
| \`__getitem__\` | \`obj[i]\`、\`for\` | 容器类 |
| \`__eq__\` | \`==\` | 值比较 |
| \`__lt__\` | \`<\`、\`sorted\` | 可排序对象 |
| \`__add__\` | \`+\` | 向量相加 |
| \`__call__\` | \`obj()\` | 可调用对象 |
| \`__enter__\` / \`__exit__\` | \`with\` | 上下文管理器 |

### \`__lt__\` 让对象能排序

\`\`\`python
class Student:
    def __init__(self, name, score):
        self.name, self.score = name, score

    def __lt__(self, other):            # 定义"小于"
        return self.score < other.score

    def __repr__(self):
        return f"{self.name}({self.score})"

students = [Student("小明", 92), Student("小红", 88), Student("小刚", 95)]
print(sorted(students))          # [小红(88), 小明(92), 小刚(95)]
print(max(students))             # 小刚(95)
\`\`\`

### \`__call__\`：让对象像函数

\`\`\`python
class Multiplier:
    def __init__(self, factor):
        self.factor = factor

    def __call__(self, x):
        return x * self.factor

double = Multiplier(2)
print(double(10))        # 20    对象也能"调用"
\`\`\`

> 💡 **别一次学完**：先掌握 \`__init__\`、\`__str__\`、\`__repr__\`，
> 其余等真正需要时再来查。魔术方法写多了会让代码难以理解。`,
    },
    {
      id: 'ch7-7',
      title: '组合、dataclass 与实战',
      content: `## 组合优于继承

\`\`\`python
# ❌ 用继承硬套：Car 并不是"一种 Engine"
class Engine:
    def start(self):
        print("引擎启动")

class Car(Engine):
    pass

# ✅ 用组合：车"有一个"引擎
class Engine:
    def start(self):
        print("引擎启动")

class Car:
    def __init__(self):
        self.engine = Engine()       # 把引擎当作零件装进来

    def start(self):
        print("插入钥匙")
        self.engine.start()          # 委托给零件
        print("出发")

Car().start()
\`\`\`

| 判断 | 用 |
|------|-----|
| "A **是** 一种 B"（学生是人） | 继承 |
| "A **有** 一个 B"（车有引擎、电脑有 CPU） | 组合 ✅ |

组合更灵活：想换引擎只改一行 \`self.engine = ElectricEngine()\`，
继承关系一旦定下就很难改。

## dataclass：少写一堆样板代码

只用来"装数据"的类，用 \`@dataclass\` 可以省掉 \`__init__\`、\`__repr__\`、\`__eq__\`：

\`\`\`python
from dataclasses import dataclass, field

@dataclass
class Student:
    name: str
    score: int = 0
    tags: list = field(default_factory=list)     # 可变默认值要这样写

s1 = Student("小明", 92)
s2 = Student("小明", 92, ["数学"])

print(s1)                 # Student(name='小明', score=92, tags=[])
print(s1 == Student("小明", 92))   # True   自动实现了 __eq__
print(s1.name)            # 小明
\`\`\`

对比一下手写版本（20 行）和 dataclass（5 行），差距明显。

> ⚠️ 注意 \`field(default_factory=list)\`：直接写 \`tags: list = []\` 会触发
> 第三章讲过的"可变默认值"陷阱，dataclass 会直接报错提醒你。

## 完整实战：图书管理系统

\`\`\`python
from dataclasses import dataclass, field


@dataclass
class Book:
    title: str
    author: str
    total: int = 1
    borrowed: int = 0

    @property
    def available(self):
        return self.total - self.borrowed

    def __str__(self):
        return f"《{self.title}》{self.author}（可借 {self.available}/{self.total}）"


class Library:
    def __init__(self, name):
        self.name = name
        self.books = {}                 # 标题 → Book

    def add(self, book):
        if book.title in self.books:
            self.books[book.title].total += book.total
        else:
            self.books[book.title] = book
        print(f"已入库：{book}")

    def borrow(self, title):
        book = self.books.get(title)
        if not book:
            print(f"没有这本书：{title}")
            return False
        if book.available <= 0:
            print(f"《{title}》已全部借出")
            return False
        book.borrowed += 1
        print(f"借出成功：《{title}》，还剩 {book.available} 本")
        return True

    def give_back(self, title):
        book = self.books.get(title)
        if book and book.borrowed > 0:
            book.borrowed -= 1
            print(f"已归还：《{title}》")
        else:
            print("归还失败：记录不存在")

    def search(self, keyword):
        return [b for b in self.books.values()
                if keyword in b.title or keyword in b.author]

    def report(self):
        print(f"\\n===== {self.name} 馆藏 =====")
        for book in sorted(self.books.values(), key=lambda b: b.title):
            print(" ", book)
        print(f"共 {len(self.books)} 种，{sum(b.total for b in self.books.values())} 册")


lib = Library("校图书馆")
lib.add(Book("Python 编程", "张三", total=3))
lib.add(Book("算法导论", "科尔曼", total=2))
lib.borrow("Python 编程")
lib.borrow("算法导论")
lib.borrow("不存在的书")
lib.give_back("Python 编程")
lib.report()

print("\\n搜索 'Python'：")
for b in lib.search("Python"):
    print(" ", b)
\`\`\`

这个例子里用到了前面所有章节的知识：

| 用到的知识 | 出现在哪 |
|-----------|---------|
| 类、属性、方法 | \`Book\`、\`Library\` |
| \`@dataclass\` | \`Book\` 的定义 |
| \`@property\` | \`available\` 计算可借数量 |
| 字典 | \`self.books\` 存书 |
| 列表推导式 + \`sorted(key=)\` | \`search\`、\`report\` |
| f-string 与 \`__str__\` | 打印格式 |
| 方法内校验 | \`borrow\` 判断可借数量 |

> 🎯 **本章小结**：
> **类是"数据 + 行为"的打包**；**继承表达 is-a，组合表达 has-a（优先组合）**；
> **鸭子类型让代码灵活**；**魔术方法让对象融入 Python 语法**；
> **dataclass 省样板代码**。`,
    },
  ],
};
