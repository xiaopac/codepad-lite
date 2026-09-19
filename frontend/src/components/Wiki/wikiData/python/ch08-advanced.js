// 第八章：进阶与实战（8 小节）
export const ch08Advanced = {
  id: 'chapter8',
  title: '第八章：进阶与实战',
  sections: [
    {
      id: 'ch8-1',
      title: '迭代器与可迭代对象',
      content: `## for 循环背后发生了什么

\`\`\`python
for ch in "abc":
    print(ch)
\`\`\`

Python 实际做了三件事：

1. 调用 \`iter("abc")\` 拿到一个**迭代器**；
2. 反复调用 \`next(迭代器)\` 取值；
3. 取不到时抛出 \`StopIteration\`，\`for\` 捕获它并结束循环。

\`\`\`python
s = "abc"
it = iter(s)              # 拿到迭代器

print(next(it))           # a
print(next(it))           # b
print(next(it))           # c
# print(next(it))         # ❌ StopIteration
\`\`\`

| 概念 | 含义 | 例子 |
|------|------|------|
| **可迭代对象** Iterable | 能用 \`for\` 遍历的东西 | 列表、字符串、字典、文件、range |
| **迭代器** Iterator | 能 \`next()\` 逐个取值的东西 | \`iter(列表)\` 的结果、生成器 |

**关键区别**：列表是"可迭代"但不是"迭代器"（列表没有 \`__next__\`）。
迭代器**只能往前走、用完就空**：

\`\`\`python
nums = [1, 2, 3]
it = iter(nums)
print(list(it))      # [1, 2, 3]
print(list(it))      # []       ⚠️ 已经取完了！
\`\`\`

> ⚠️ 这个特性会引发真实 bug：同一个迭代器传给两个函数，第二个函数拿到的是空的。
> 需要多次遍历时，用列表存起来。

### 判断方法

\`\`\`python
from collections.abc import Iterable, Iterator

print(isinstance([1, 2], Iterable))     # True
print(isinstance([1, 2], Iterator))     # False
print(isinstance(iter([1, 2]), Iterator))  # True
\`\`\`

### 自己写一个迭代器（了解即可）

\`\`\`python
class Countdown:
    def __init__(self, start):
        self.current = start

    def __iter__(self):
        return self

    def __next__(self):
        if self.current <= 0:
            raise StopIteration          # 结束信号
        value = self.current
        self.current -= 1
        return value

for n in Countdown(3):
    print(n)        # 3 2 1
\`\`\`

能看懂这段就够了——实际写代码时，**用下一节的生成器要简单得多**。

### 为什么要有迭代器？

因为它**省内存**：不需要一次把所有数据装进内存。

\`\`\`python
# 文件对象就是迭代器：逐行读，1GB 日志也不怕
with open("big.log", encoding="utf-8") as f:
    for line in f:
        if "ERROR" in line:
            print(line.rstrip())
\`\`\`

第五章讲过"大文件别用 readlines()"，原因就在这里。`,
    },
    {
      id: 'ch8-2',
      title: '生成器与 yield',
      content: `## yield：会"暂停"的函数

普通函数 \`return\` 之后就结束了；生成器函数遇到 \`yield\` 会**暂停并记住位置**，
下次调用时从原地继续。

\`\`\`python
def count_up(n):
    print("开始")
    for i in range(1, n + 1):
        yield i              # 交出 i，然后暂停在这里
    print("结束")

for x in count_up(3):
    print("收到", x)

# 开始
# 收到 1
# 收到 2
# 收到 3
# 结束
\`\`\`

注意执行顺序：**"开始"只打印一次**，值是一个一个"挤"出来的。

### 手动驱动

\`\`\`python
gen = count_up(3)
print(next(gen))     # 开始 → 1
print(next(gen))     # 2
print(next(gen))     # 3
# print(next(gen))   # 结束 → StopIteration
\`\`\`

## 为什么要用生成器：省内存 + 惰性求值

\`\`\`python
# ❌ 列表：立刻把 1000 万个数字全部算出来存进内存（约 400MB）
def make_list(n):
    result = []
    for i in range(n):
        result.append(i * i)
    return result

# ✅ 生成器：要一个算一个，几乎不占内存
def make_gen(n):
    for i in range(n):
        yield i * i

total = sum(make_gen(10_000_000))     # 瞬间算完，内存平稳
print(total)
\`\`\`

| 对比 | 列表 | 生成器 |
|------|------|--------|
| 内存占用 | 全部数据 | 只存当前状态 |
| 计算时机 | 立即全部算完 | 用到才算（惰性） |
| 能否重复遍历 | ✅ | ❌ 用完就空 |
| 能否取长度 / 下标 | ✅ | ❌ |

### 生成器表达式：把推导式的方括号换成圆括号

\`\`\`python
nums = [1, 2, 3, 4, 5]

squares_list = [n * n for n in nums]        # 列表推导式：立即算出列表
squares_gen = (n * n for n in nums)         # 生成器表达式：惰性

print(sum(squares_gen))                     # 55
print(sum(n * n for n in nums))             # 55  直接当参数传
\`\`\`

**大数据的管道处理**是它的典型用法：

\`\`\`python
lines = (line.strip() for line in open("data.txt", encoding="utf-8"))
non_empty = (l for l in lines if l)
numbers = (int(l) for l in non_empty)
print(sum(numbers))
\`\`\`

三步处理，全程不把整个文件读进内存。

## yield from：逐个转交

\`\`\`python
def chain(*iterables):
    for it in iterables:
        yield from it          # 等价于 for x in it: yield x

print(list(chain([1, 2], "ab", (3, 4))))
# [1, 2, 'a', 'b', 3, 4]
\`\`\`

## 实战：分批读取（处理大文件）

\`\`\`python
def read_in_chunks(path, size=3):
    """每次返回 size 行，适合批量写数据库 / 调接口"""
    chunk = []
    with open(path, encoding="utf-8") as f:
        for line in f:
            chunk.append(line.strip())
            if len(chunk) >= size:
                yield chunk
                chunk = []
    if chunk:                  # 最后不足一批的也要返回
        yield chunk

for i, batch in enumerate(read_in_chunks("data.txt", 3), 1):
    print(f"第 {i} 批：{batch}")
\`\`\`

## 实战：无限序列

\`\`\`python
def fibonacci():
    a, b = 1, 1
    while True:
        yield a
        a, b = b, a + b

fib = fibonacci()
first_10 = [next(fib) for _ in range(10)]
print(first_10)      # [1, 1, 2, 3, 5, 8, 13, 21, 34, 55]
\`\`\`

无限生成器 + \`islice\` 取前 N 个，是处理"只需要前几项"的经典组合：

\`\`\`python
from itertools import islice
print(list(islice(fibonacci(), 5)))     # [1, 1, 2, 3, 5]
\`\`\`

> 💡 **什么时候用生成器**：数据量大、只需要遍历一次、
> 或者处理"读到超时/读满 N 条就停"这种流式场景（爬虫翻页、日志分析）。
> 小数据直接用列表更简单。`,
    },
    {
      id: 'ch8-3',
      title: '装饰器',
      content: `## 先理解：函数也是对象

\`\`\`python
def greet():
    print("你好")

f = greet          # 不加括号：f 指向这个函数
f()                # 你好
print(greet)       # <function greet at 0x...>

def call_twice(func):     # 函数能当参数
    func()
    func()

call_twice(greet)  # 你好 你好
\`\`\`

函数能赋值、能当参数、能当返回值——这叫**一等公民**。

## 装饰器：不改原代码，增加功能

需求：想知道每个函数运行了多久。笨办法是每个函数里都写计时代码：

\`\`\`python
def work():
    start = time.time()
    ...业务代码...
    print("耗时", time.time() - start)
\`\`\`

好办法是写一个装饰器：

\`\`\`python
import time

def timer(func):                     # 装饰器本质：接收函数，返回新函数
    def wrapper(*args, **kwargs):
        start = time.time()
        result = func(*args, **kwargs)      # 调用原函数
        print(f"{func.__name__} 耗时 {time.time() - start:.4f} 秒")
        return result
    return wrapper

@timer                               # 等价于 work = timer(work)
def work(n):
    total = sum(i * i for i in range(n))
    return total

work(1_000_000)
# work 耗时 0.0832 秒
\`\`\`

**\`@timer\` 这一行就完成了"包装"**：业务代码一行没改，就多了计时功能。

这里用到了第三章的 \`*args, **kwargs\`（透传任意参数）和闭包（\`wrapper\` 记住了 \`func\`）。

## functools.wraps：保留原函数信息

\`\`\`python
import functools

def timer(func):
    @functools.wraps(func)          # ✅ 保留原函数的名字和文档
    def wrapper(*args, **kwargs):
        ...
    return wrapper
\`\`\`

不加 \`@functools.wraps\` 的话，\`work.__name__\` 会变成 \`"wrapper"\`，
调试和文档生成都会出问题。**写装饰器一定要加它**。

## 带参数的装饰器：多套一层

\`\`\`python
import functools
import time

def retry(times=3, delay=1):
    """失败自动重试"""
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            for attempt in range(1, times + 1):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    print(f"第 {attempt} 次失败：{e}")
                    if attempt == times:
                        raise
                    time.sleep(delay)
        return wrapper
    return decorator

@retry(times=3, delay=0.1)
def unstable():
    import random
    if random.random() < 0.7:
        raise ValueError("网络抖动")
    print("成功")

unstable()
\`\`\`

结构记法：**\`@retry(...)\` 返回一个装饰器，这个装饰器再接收函数**。

## 三个实用装饰器

### 1. 计时（前面写过）

### 2. 缓存

\`\`\`python
import functools

@functools.lru_cache(maxsize=None)
def slow_sum(n):
    print("真的在计算...")
    return sum(range(n))

print(slow_sum(1000))     # 真的在计算... 499500
print(slow_sum(1000))     # 499500（直接命中缓存，没有打印）
\`\`\`

### 3. 记录调用日志

\`\`\`python
import functools

def logged(func):
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        print(f"→ 调用 {func.__name__}{args}")
        result = func(*args, **kwargs)
        print(f"← 返回 {result!r}")
        return result
    return wrapper

@logged
def add(a, b):
    return a + b

add(1, 2)
# → 调用 add(1, 2)
# ← 返回 3
\`\`\`

| 常用内置装饰器 | 作用 |
|---------------|------|
| \`@property\` | 方法变成属性（第七章） |
| \`@classmethod\` / \`@staticmethod\` | 类方法 / 静态方法（第七章） |
| \`@functools.lru_cache\` | 缓存结果 |
| \`@functools.wraps\` | 写在装饰器内部，保留元信息 |

> ⚠️ **别套太多层**：装饰器堆叠会让调用栈变深、报错信息难读。
> 一个函数上加 2~3 个装饰器是极限，再多要考虑拆分了。`,
    },
    {
      id: 'ch8-4',
      title: '内置函数与推导式进阶',
      content: `## 值得熟练掌握的内置函数

\`\`\`python
nums = [3, 1, 4, 1, 5, 9, 2, 6]

print(sum(nums), max(nums), min(nums))        # 31 9 1
print(len(nums))                               # 8
print(sorted(nums))                            # [1, 1, 2, 3, 4, 5, 6, 9]
print(sorted(nums, reverse=True)[:3])          # [9, 6, 5]  取前三
print(abs(-3), round(3.567, 2))                # 3 3.57
print(any(n > 8 for n in nums))                # True   有大于 8 的
print(all(n > 0 for n in nums))                # True   全部大于 0
print(list(zip("abc", nums)))                  # [('a',3), ('b',1), ('c',4)]
print(list(enumerate("abc", 1)))               # [(1,'a'), (2,'b'), (3,'c')]
print(list(reversed(nums)))                    # 反转（不改变原列表）
\`\`\`

### sum / max / min 的 key 参数

\`\`\`python
words = ["apple", "hi", "banana"]
print(max(words, key=len))           # banana   最长的单词
print(min(words, key=len))           # hi

# 带初始值（空列表也不报错）
print(sum([], 0))                    # 0
\`\`\`

### zip 的实用技巧

\`\`\`python
names = ["小明", "小红", "小刚"]
scores = [92, 88, 95]

# 组装成字典
print(dict(zip(names, scores)))      # {'小明': 92, '小红': 88, '小刚': 95}

# 转置矩阵
matrix = [[1, 2, 3], [4, 5, 6]]
print(list(zip(*matrix)))            # [(1, 4), (2, 5), (3, 6)]

# 严格模式：长度不等直接报错（3.10+）
# list(zip([1, 2], [3], strict=True))   # ValueError
\`\`\`

## 海象运算符 \`:=\`（3.8+）

在表达式里顺便赋值，避免"算两遍"：

\`\`\`python
# ❌ 读两次 input
while True:
    data = input("输入（q 退出）：")
    if data == "q":
        break
    print(f"你输入了 {data}")

# ✅ 海象运算符：赋值和判断合并
while (data := input("输入（q 退出）：")) != "q":
    print(f"你输入了 {data}")

# 另一个常见场景：避免重复计算
if (n := len(nums)) > 5:
    print(f"长度 {n} 超过 5")
\`\`\`

## 推导式进阶

\`\`\`python
# 1. 多重条件
nums = range(1, 21)
print([n for n in nums if n % 2 == 0 if n % 3 == 0])    # [6, 12, 18]

# 2. 条件表达式（三元的推导式版本）
print(["偶" if n % 2 == 0 else "奇" for n in range(5)])
# ['偶', '奇', '偶', '奇', '偶']

# 3. 字典推导式做"索引"
students = [{"name": "小明", "score": 92}, {"name": "小红", "score": 88}]
by_name = {s["name"]: s["score"] for s in students}
print(by_name)                # {'小明': 92, '小红': 88}

# 4. 嵌套展开（拍平）
matrix = [[1, 2], [3, 4], [5, 6]]
print([x for row in matrix for x in row])       # [1, 2, 3, 4, 5, 6]

# 5. 转置
print([[row[i] for row in matrix] for i in range(2)])
# [[1, 3, 5], [2, 4, 6]]
\`\`\`

## 常用"一行代码"技巧

\`\`\`python
# 统计满足条件的个数
print(sum(1 for n in range(100) if n % 7 == 0))      # 15

# 展平嵌套列表
nested = [[1, 2], [3], [4, 5, 6]]
flat = [x for sub in nested for x in sub]

# 按某字段分组（不依赖第三方库）
from collections import defaultdict
groups = defaultdict(list)
for s in students:
    groups["及格" if s["score"] >= 60 else "不及格"].append(s["name"])
print(dict(groups))

# 找出重复元素
from collections import Counter
items = [1, 2, 2, 3, 3, 3]
print([k for k, v in Counter(items).items() if v > 1])    # [2, 3]

# 字典按值排序
rank = {"小明": 92, "小红": 88, "小刚": 95}
print(sorted(rank.items(), key=lambda kv: kv[1], reverse=True))
\`\`\`

> ⚠️ **别追求"一行流"**：把三行清晰的代码压成一行难懂的表达，
> 是新手最容易犯的"炫技病"。**可读性 > 简短**，这条永远成立。`,
    },
    {
      id: 'ch8-5',
      title: '类型注解与文档',
      content: `## 类型注解：给灵活加一层保险

Python 是动态类型，写错了类型要到运行时才发现。类型注解能提前暴露问题：

\`\`\`python
def add(a: int, b: int) -> int:
    return a + b

def greet(name: str, times: int = 1) -> str:
    return f"你好 {name}！" * times

score: float = 92.5
names: list[str] = ["小明", "小红"]
scores: dict[str, int] = {"小明": 92}
\`\`\`

> ⚠️ **注解不会强制检查**！\`add("a", "b")\` 照样能跑（返回 \`"ab"\`）。
> 它的价值在于：**给人和工具看**——编辑器会提示、静态检查工具能发现错误。

### typing 里的常用类型

\`\`\`python
from typing import Optional, Union, Any, Callable, Iterable

def find(users: list[dict], name: str) -> Optional[dict]:
    """找不到时返回 None，Optional 就是在说明这一点"""
    for u in users:
        if u["name"] == name:
            return u
    return None

def parse(value: Union[int, str]) -> int:      # 3.10+ 可写 int | str
    return int(value)

def apply(func: Callable[[int], int], data: list[int]) -> list[int]:
    return [func(x) for x in data]
\`\`\`

| 写法 | 含义 | 3.10+ 简写 |
|------|------|-----------|
| \`Optional[X]\` | X 或 None | \`X \\| None\` |
| \`Union[X, Y]\` | X 或 Y | \`X \\| Y\` |
| \`list[int]\` | 整数列表 | 同 |
| \`dict[str, int]\` | 键 str、值 int | 同 |
| \`Callable[[int], str]\` | 参数 int、返回 str 的函数 | 同 |
| \`Any\` | 任意类型（放弃检查） | 同 |

> 💡 **Python 3.9 用户注意**：\`list[int]\` 这种内置泛型写法在 3.9 也支持，
> 但 \`int | str\` 需要 3.10+。要兼容 3.9 请用 \`Union[int, str]\`。
> 本站自定义环境可选版本，写代码前想清楚目标版本。

### 要不要写类型注解？

| 场景 | 建议 |
|------|------|
| 学习 / 小脚本（几十行） | 可以只给函数写 |
| 团队项目、要维护的代码 | ✅ 建议写全 |
| 数据处理临时脚本 | 关键函数写即可 |

## docstring：函数的说明书

\`\`\`python
def calc_bmi(weight: float, height: float) -> float:
    """计算 BMI 指数。

    参数:
        weight: 体重（公斤）
        height: 身高（米）

    返回:
        BMI 值，保留两位小数

    异常:
        ValueError: 身高或体重不是正数时抛出

    示例:
        >>> calc_bmi(70, 1.75)
        22.86
    """
    if weight <= 0 or height <= 0:
        raise ValueError("身高体重必须为正数")
    return round(weight / height ** 2, 2)
\`\`\`

查看文档：

\`\`\`python
help(calc_bmi)          # 打印文档
print(calc_bmi.__doc__) # 直接取文档字符串
\`\`\`

## 一个规范的小模块示例

\`\`\`python
"""成绩处理工具（模块级 docstring）"""
from dataclasses import dataclass


@dataclass
class Student:
    """学生：姓名 + 分数"""
    name: str
    score: float

    @property
    def level(self) -> str:
        """等级：优秀 / 及格 / 不及格"""
        if self.score >= 90:
            return "优秀"
        return "及格" if self.score >= 60 else "不及格"


def average(students: list[Student]) -> float:
    """计算平均分；空列表返回 0.0"""
    if not students:
        return 0.0
    return round(sum(s.score for s in students) / len(students), 2)


if __name__ == "__main__":
    data = [Student("小明", 92), Student("小红", 58)]
    print(average(data))
    for s in data:
        print(s.name, s.level)
\`\`\`

这就是"可交付"的代码长相：**模块 / 类 / 函数都有 docstring，关键接口有类型注解，
入口有 \`__main__\` 保护**。

> 💡 **好文档的三个层次**：
> ① 名字起得准（\`calc_bmi\` 不用解释）；
> ② 复杂逻辑写注释（为什么这么做，而不是做了什么）；
> ③ 公开接口写 docstring（参数、返回、异常）。`,
    },
    {
      id: 'ch8-6',
      title: '调试、日志与常见坑',
      content: `## 调试四板斧

### 1. print 大法（最常用）

\`\`\`python
def divide(a, b):
    print(f"[调试] 进入 divide({a=}, {b=})")
    if b == 0:
        print("[调试] 除数为 0")
        return None
    result = a / b
    print(f"[调试] 结果 {result}")
    return result
\`\`\`

用 \`{a=}\` 一次打印"变量名 + 值"，比手写 \`print("a =", a)\` 省事。

### 2. breakpoint()：断点调试

\`\`\`python
def buggy(data):
    total = 0
    for item in data:
        breakpoint()        # 程序在这里暂停，进入交互式调试
        total += item
    return total
\`\`\`

进入调试器后常用命令：

| 命令 | 作用 |
|------|------|
| \`n\` (next) | 执行下一行 |
| \`s\` (step) | 进入函数内部 |
| \`c\` (continue) | 继续运行到下一个断点 |
| \`p 变量\` | 打印变量值 |
| \`l\` (list) | 显示当前代码 |
| \`q\` (quit) | 退出调试 |

> 💡 在本站 **💻 终端运行** 里可以直接用 \`breakpoint()\`——
> 终端就是交互式的，能真的"单步"起来。▶运行 是一次性批处理，不适合断点。

### 3. 二分定位：注释掉一半代码

程序崩了但不知道哪一行？把可疑的代码块先注释掉，看还崩不崩——
不断缩小范围，很快就能定位。

### 4. 看报错：从最后一行往上看

\`\`\`
Traceback (most recent call last):
  File "main.py", line 12, in <module>
    main()
  File "main.py", line 8, in main
    print(100 / int(text))
ZeroDivisionError: division by zero
\`\`\`

最后一行告诉你**是什么错**，往上是**调用链**（谁调用了谁），
最先要看的其实是**最深的那一层自己写的代码**。

## logging：比 print 专业的日志

\`\`\`python
import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)

logging.debug("这条不会显示（级别低于 INFO）")
logging.info("用户登录成功")
logging.warning("磁盘空间不足 80%")
logging.error("数据库连接失败")
\`\`\`

输出：

\`\`\`
14:30:05 [INFO] 用户登录成功
14:30:05 [WARNING] 磁盘空间不足 80%
14:30:05 [ERROR] 数据库连接失败
\`\`\`

### 日志级别（从低到高）

| 级别 | 用途 |
|------|------|
| DEBUG | 详细调试信息 |
| INFO | 正常运行的关键节点 |
| WARNING | 有点问题但不影响运行 |
| ERROR | 出错了，功能受影响 |
| CRITICAL | 严重错误，程序可能无法继续 |

**好处**：可以通过改一个 \`level\` 一次性关闭所有调试输出，
不用像 print 那样一行行删。

### 写进文件

\`\`\`python
logging.basicConfig(
    filename="app.log",
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    encoding="utf-8",
)
logging.info("程序启动")
\`\`\`

## 新手必踩的十个坑（汇总）

| # | 现象 | 原因 | 正确做法 |
|---|------|------|---------|
| 1 | 改了 A，B 也变了 | 赋值是引用 | 需要副本用 \`.copy()\` |
| 2 | 默认参数越用越多 | 默认值是可变的 | 用 \`None\` + 函数内新建 |
| 3 | 缩进报错 | Tab 与空格混用 | 统一 4 个空格 |
| 4 | \`input()\` 相加出错 | input 返回字符串 | \`int(input())\` |
| 5 | 浮点比较失败 | 0.1+0.2 != 0.3 | 用误差范围或 \`decimal\` |
| 6 | 循环里改了列表，结果乱了 | 边遍历边删 | 遍历副本 \`for x in lst[:]\` |
| 7 | 中文文件读取报编码错 | 没写 encoding | \`encoding="utf-8"\` |
| 8 | 模块导入的是自己写的文件 | 文件与标准库重名 | 换个文件名 |
| 9 | 函数返回 None | 忘了 \`return\` | 检查返回值 |
| 10 | 程序没反应 | 死循环 / 等输入 | 加打印定位；▶运行 有 10 秒超时 |

### 边遍历边删的经典错误

\`\`\`python
nums = [1, 2, 3, 4, 5, 6]

# ❌ 删除元素后下标错位，结果不对
for n in nums:
    if n % 2 == 0:
        nums.remove(n)
print(nums)          # [1, 3, 5] ？实际是 [1, 3, 5] 碰巧对了，换成别的数据就错

# ✅ 遍历副本，删原列表
for n in nums[:]:
    if n % 2 == 0:
        nums.remove(n)

# ✅✅ 或者直接生成新列表（最推荐）
nums = [n for n in nums if n % 2 != 0]
\`\`\`

> 💡 **调试心态**：报错不是失败，是 Python 在告诉你哪不对。
> 遇到问题先读报错 → 打印中间值 → 缩小范围 → 搜索最后一行。
> 90% 的 bug 都栽在上面那张表里。`,
    },
    {
      id: 'ch8-7',
      title: '图形程序：tkinter 与 pygame',
      content: `## 图形程序必须用「💻 终端运行」

这是本站一个重要的区别：

| 运行方式 | 适合 | 能显示图形窗口吗 |
|---------|------|----------------|
| ▶ 运行 | 命令行程序（读输入、打印结果） | ❌ 没有屏幕 |
| 💻 终端运行 | 交互式程序、**图形窗口程序** | ✅ 可以，点面板的「🪟 窗口」查看 |

终端沙箱里已经准备好：

- **Python 3.11**
- **tkinter 8.6**（Python 自带 GUI 库）
- **pygame 2.6.1**（2D 游戏库）
- 中文字体（界面里的中文不会变成方块）
- 一块 1024×768 的虚拟屏幕 + 窗口管理器

想看确切清单：点终端面板的 **ⓘ 沙箱**。

> ⚠️ **不要在 ▶ 运行 里跑图形程序**：那里没有显示设备，
> \`tkinter.Tk()\` 会报 \`TclError: no display name\`，
> \`pygame.display.set_mode()\` 会报 \`video system not initialized\`。

## tkinter 最小示例

\`\`\`python
import tkinter as tk

root = tk.Tk()                       # 创建主窗口
root.title("我的第一个窗口")
root.geometry("360x220")

label = tk.Label(root, text="你好，tkinter！", font=("sans", 16))
label.pack(pady=20)

def on_click():
    label.config(text="按钮被点击了！")

tk.Button(root, text="点我", command=on_click, width=12).pack()

root.mainloop()                      # 进入事件循环（必须！）
\`\`\`

**要点**：

1. \`mainloop()\` 会让程序一直等待用户操作——**没有它窗口会一闪而过**；
2. 用 \`command=\` 绑定按钮事件，**不要写 \`command=on_click()\`**（那会立刻执行）；
3. 改界面内容用 \`widget.config(...)\`。

### 加个输入框和计数器

\`\`\`python
import tkinter as tk

root = tk.Tk()
root.title("计数器")
root.geometry("300x180")

count = 0
display = tk.Label(root, text="0", font=("sans", 32))
display.pack(pady=10)

def add(n):
    global count
    count += n
    display.config(text=str(count))

frame = tk.Frame(root)
frame.pack()
tk.Button(frame, text="+1", width=8, command=lambda: add(1)).pack(side="left", padx=5)
tk.Button(frame, text="-1", width=8, command=lambda: add(-1)).pack(side="left", padx=5)

root.mainloop()
\`\`\`

### 常用组件速查

| 组件 | 用途 | 例子 |
|------|------|------|
| \`Label\` | 文字/图片 | \`tk.Label(root, text="hi")\` |
| \`Button\` | 按钮 | \`tk.Button(root, text="ok", command=f)\` |
| \`Entry\` | 单行输入 | \`tk.Entry(root)\` → \`.get()\` |
| \`Text\` | 多行文本 | \`tk.Text(root, height=5)\` |
| \`Canvas\` | 画图 | \`tk.Canvas(root, width=200, height=100)\` |
| \`Frame\` | 容器（分组布局） | \`tk.Frame(root)\` |

三种布局方式：\`pack()\`（依次排列，最简单）、\`grid(row=, column=)\`（表格）、\`place(x=, y=)\`（绝对定位）。

## pygame 最小示例

\`\`\`python
import pygame
import sys

pygame.init()
screen = pygame.display.set_mode((480, 360))     # 创建窗口
pygame.display.set_caption("pygame 示例")
clock = pygame.time.Clock()

x, y = 60, 180
color = (0, 240, 255)

running = True
while running:
    for event in pygame.event.get():
        if event.type == pygame.QUIT:            # 点关闭按钮
            running = False

    keys = pygame.key.get_pressed()              # 键盘控制
    if keys[pygame.K_LEFT]:
        x -= 4
    if keys[pygame.K_RIGHT]:
        x += 4

    screen.fill((10, 10, 20))                    # 清屏
    pygame.draw.circle(screen, color, (x, y), 30)
    pygame.display.flip()                        # 把画面显示出来
    clock.tick(60)                               # 限制 60 帧/秒

pygame.quit()
sys.exit()
\`\`\`

**游戏循环三件事**（记住这个骨架，所有 pygame 程序都一样）：

1. **处理事件**：\`pygame.event.get()\` 取键盘/鼠标/关闭事件；
2. **更新状态**：改变物体的坐标、逻辑；
3. **重绘画面**：\`fill\` 清屏 → \`draw\` 画东西 → \`flip\` 显示。

### 加上文字（中文）

\`\`\`python
import pygame

pygame.init()
screen = pygame.display.set_mode((480, 200))
font = pygame.font.SysFont("wqy-microhei", 32)     # 沙箱内置的中文字体

text = font.render("你好，pygame！", True, (255, 255, 255))
screen.blit(text, (60, 80))
pygame.display.flip()

import time
time.sleep(3)          # 停留 3 秒便于观察
\`\`\`

> ⚠️ **注意程序别"秒退"**：图形程序要么有 \`mainloop()\` / 事件循环，
> 要么用 \`time.sleep()\` 停留一会儿，否则窗口刚出现程序就结束了。
> 我们的验证脚本就踩过这个坑。

## 在本站运行的完整步骤

1. 新建 \`.py\` 文件，粘贴上面的代码；
2. 点工具栏 **💻 终端运行**（不是 ▶ 运行）；
3. 终端里程序开始跑起来，窗口出现在虚拟屏幕上；
4. 点终端面板的 **🪟 窗口** 按钮，弹出画面面板——可以做鼠标操作；
5. 程序结束或点 ⏹ 停止 结束会话。

**能做什么 / 不能做什么**：

| 可以 | 说明 |
|------|------|
| 窗口、按钮、输入框、绘图 | tkinter / pygame 全支持 |
| 鼠标点击、键盘输入 | 在「🪟 窗口」面板里操作 |
| 中文字体 | 已内置 wqy-microhei |

| 限制 | 原因 |
|------|------|
| 没有外网 | 沙箱只有内网（下载图片/访问接口会失败） |
| 没有真实显卡 | 软件渲染，复杂 3D 会很慢 |
| 没有声音设备 | 音频驱动是 dummy（不会报错但也没声音） |
| 装不了新库 | 请管理员在后台「🧪 沙箱库」添加 |

> 💡 **入门游戏建议顺序**：先画一个静止的图形 → 加键盘控制 → 加碰撞检测 →
> 加分数与重新开始 → 再做多个关卡。一步一步来，每步都能跑通再往下走。`,
    },
    {
      id: 'ch8-8',
      title: '综合练习与后续路线',
      content: `## 综合练习（由易到难）

### 🟢 基础（第一 ~ 三章）

1. **温度转换器**：输入摄氏度，输出华氏度（\`F = C * 9/5 + 32\`）；
2. **列表去重**：输入一串数字，输出去重后的结果（保持原顺序）；
3. **成绩等级**：输入分数，输出优秀 / 良好 / 及格 / 不及格；
4. **九九乘法表**：用嵌套循环打印完整乘法表。

### 🟡 进阶（第四 ~ 六章）

5. **词频统计**：读一段文字，输出出现次数最多的 5 个词（排除常见停用词）；
6. **文件行数统计**：统计一个目录下所有 \`.py\` 文件的行数（用 \`pathlib\`）；
7. **CSV 成绩分析**：读取成绩表，输出每人的总分、平均分、排名；
8. **JSON 配置读写**：写一个小程序，把用户设置存进 \`config.json\` 并能读回来；
9. **简易待办清单**：菜单式命令行程序（增 / 删 / 查 / 存文件）。

### 🔴 挑战（第七 ~ 八章）

10. **图书管理系统**（第七章有完整参考）：支持借书、还书、搜索、馆藏报表；
11. **学生管理系统**：类 + 文件持久化，支持按成绩排序、导出 JSON；
12. **文字冒险游戏**：房间、物品、选项分支；
13. **打字练习程序**：tkinter 界面 + 随机题目 + 统计正确率与速度；
14. **贪吃蛇 / 打砖块**：pygame + 事件循环 + 碰撞检测。

### 练习方法

\`\`\`
1. 先写清需求：输入是什么？输出是什么？有哪些步骤？
2. 拆成小函数：每个函数只做一件事
3. 一个个实现并单独测试，不要一口气写完
4. 跑通后再优化：加异常处理、改进命名、补注释
\`\`\`

## 一个可交付的小项目模板

\`\`\`python
"""待办清单 —— 一个完整的命令行小程序示例"""
import json
from pathlib import Path

DATA_FILE = Path("todos.json")


def load() -> list:
    """读取待办列表；文件不存在或损坏时返回空列表"""
    try:
        return json.loads(DATA_FILE.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError):
        return []


def save(todos: list) -> None:
    DATA_FILE.write_text(
        json.dumps(todos, ensure_ascii=False, indent=2), encoding="utf-8"
    )


def add(todos: list, title: str) -> None:
    todos.append({"title": title, "done": False})
    print(f"已添加：{title}")


def finish(todos: list, index: int) -> None:
    if 1 <= index <= len(todos):
        todos[index - 1]["done"] = True
        print(f"已完成：{todos[index - 1]['title']}")
    else:
        print("编号不存在")


def show(todos: list) -> None:
    if not todos:
        print("（还没有待办）")
        return
    for i, t in enumerate(todos, 1):
        mark = "✔" if t["done"] else "○"
        print(f"{i}. [{mark}] {t['title']}")
    done = sum(1 for t in todos if t["done"])
    print(f"—— 共 {len(todos)} 条，已完成 {done} 条")


def main() -> None:
    todos = load()
    print("待办清单：add 内容 / done 编号 / list / quit")

    while True:
        parts = input("> ").strip().split(maxsplit=1)
        if not parts:
            continue
        cmd = parts[0]

        if cmd == "quit":
            save(todos)
            print("已保存，再见！")
            break
        elif cmd == "list":
            show(todos)
        elif cmd == "add" and len(parts) > 1:
            add(todos, parts[1])
        elif cmd == "done" and len(parts) > 1:
            try:
                finish(todos, int(parts[1]))
            except ValueError:
                print("请输入编号数字")
        else:
            print("用法：add 内容 / done 编号 / list / quit")


if __name__ == "__main__":
    main()
\`\`\`

把这个跑起来改一改（加删除、加优先级、加截止日期），就是一个能写进简历的小作品。
**建议用 💻 终端运行**，边敲边输入最顺手。

## 后续学习路线

\`\`\`mermaid
你已经会了：语法 · 容器 · 函数 · 文件 · 模块 · 面向对象 · 进阶特性
        │
        ├─▶ 数据分析：NumPy → pandas → matplotlib → Jupyter
        │
        ├─▶ Web 后端：Flask / FastAPI（小）→ Django（全）
        │
        ├─▶ 爬虫与自动化：requests → BeautifulSoup → Selenium
        │
        ├─▶ 人工智能：scikit-learn（机器学习）→ PyTorch（深度学习）
        │
        ├─▶ 游戏与图形：pygame → 图形算法 → 3D 引擎绑定
        │
        └─▶ 工程能力：Git · 单元测试（pytest）· 类型检查（mypy）· Docker
\`\`\`

### 给不同目标的建议

| 你的目标 | 接下来学 |
|---------|---------|
| 想做数据分析 | pandas + matplotlib，多练真实表格数据 |
| 想做网站后端 | Flask 起步，再做一个小项目上线 |
| 想搞 AI | 先把 NumPy 和数学基础打牢 |
| 想写游戏 | pygame 做三个小游戏，再考虑引擎 |
| 想提升编程能力 | 刷算法题（力扣「简单→中等」），学 pytest 写测试 |

### 最后三句话

1. **代码是写出来的，不是看出来的**——每节都亲手跑一遍；
2. **能跑通比写得好更重要**，先让它工作，再让它优雅；
3. **遇到问题先读报错**，然后搜索，最后才是问人。

> 🎯 学完这里，你已经具备用 Python 解决实际问题的能力。
> 接下来最好的学习方式就是：**找一个你想做的小东西，把它做出来**。
>
> 祝编码愉快！有任何卡住的地方，回到对应章节复习，或者在本站直接试——改错是学编程最快的方式。`,
    },
  ],
};
