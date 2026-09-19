// 第三章：函数与作用域（7 小节）
export const ch03Functions = {
  id: 'chapter3',
  title: '第三章：函数与作用域',
  sections: [
    {
      id: 'ch3-1',
      title: '什么是函数',
      content: `## 把一段代码"打包"起来反复用

没有函数时，同样的计算要复制粘贴好几遍：

\`\`\`python
# ❌ 重复代码：三处都在算圆面积
r1 = 3
print(3.14 * r1 * r1)
r2 = 5
print(3.14 * r2 * r2)
\`\`\`

有了函数：

\`\`\`python
def circle_area(radius):
    """根据半径计算圆面积"""
    return 3.14159 * radius ** 2

print(circle_area(3))     # 28.27431
print(circle_area(5))     # 78.53975
\`\`\`

### 定义与调用的语法

\`\`\`python
def 函数名(参数1, 参数2):
    """文档字符串：说明这个函数干什么（可选但强烈建议）"""
    函数体
    return 返回值
\`\`\`

- \`def\` 是 define 的缩写，**结尾有冒号**；
- 函数体**必须缩进**；
- 定义时函数**不会执行**，只有**调用**（写 \`函数名(...)\`）时才执行。

\`\`\`python
def say_hello():
    print("你好！")

print("定义完成")     # 先打印这句
say_hello()          # 调用时才执行 → 你好！
say_hello()          # 可以调用很多次
\`\`\`

### 为什么要用函数

| 好处 | 说明 |
|------|------|
| 少写重复代码 | 改一处，处处生效 |
| 逻辑清晰 | \`calculate_score()\` 比一堆散代码好懂 |
| 便于测试 | 单独验证一个小功能是否正确 |
| 便于协作 | 每人负责几个函数，互不干扰 |

### 参数与返回值

\`\`\`python
def add(a, b):          # a、b 是"形参"（定义的占位符）
    return a + b

result = add(3, 5)      # 3、5 是"实参"（实际传进去的值）
print(result)           # 8
print(add(10, 20))      # 也可以直接用在表达式里
\`\`\`

### 没有 return 会怎样？

\`\`\`python
def show(msg):
    print(msg)          # 只打印，没有 return

value = show("hi")      # 打印 hi
print(value)            # None   ← 没有 return 的函数返回 None
\`\`\`

| 情况 | 返回值 |
|------|--------|
| \`return 值\` | 那个值 |
| 只写 \`return\` | \`None\` |
| 完全不写 return | \`None\` |

> 💡 **命名建议**：函数名用"动词 + 名词"，如 \`get_name\`、\`calc_total\`、\`is_valid\`。
> 看到名字就知道它做什么，这是好代码的第一步。`,
    },
    {
      id: 'ch3-2',
      title: '参数详解：位置、关键字与默认值',
      content: `## 位置参数：按顺序传

\`\`\`python
def introduce(name, age, city):
    print(f"{name}，{age} 岁，来自{city}")

introduce("小明", 18, "北京")      # 顺序必须对
\`\`\`

## 关键字参数：按名字传（推荐）

\`\`\`python
introduce(age=18, name="小明", city="北京")   # 顺序随便
introduce("小明", city="北京", age=18)        # 也可以混用
\`\`\`

**规则**：位置参数必须写在关键字参数前面。

好处是**一眼看懂每个值是什么**：

\`\`\`python
# ❌ 这行什么意思？得回去看函数定义
create_user("小明", 18, True, False)

# ✅ 自解释
create_user("小明", age=18, is_vip=True, send_mail=False)
\`\`\`

## 默认参数：可以省略

\`\`\`python
def greet(name, greeting="你好"):
    print(f"{greeting}，{name}")

greet("小明")                 # 你好，小明
greet("小红", "早上好")        # 早上好，小红
greet("小刚", greeting="嗨")   # 嗨，小刚
\`\`\`

### ⚠️ 大坑：默认值不要用可变对象！

\`\`\`python
# ❌ 错误示范
def add_item(item, bag=[]):
    bag.append(item)
    return bag

print(add_item("苹果"))    # ['苹果']
print(add_item("香蕉"))    # ['苹果', '香蕉']  ← 见鬼了？！
\`\`\`

原因：**默认值只在定义函数时创建一次**，所有调用共享同一个列表。

\`\`\`python
# ✅ 正确写法：用 None 做哨兵
def add_item(item, bag=None):
    if bag is None:
        bag = []           # 每次调用都新建
    bag.append(item)
    return bag

print(add_item("苹果"))    # ['苹果']
print(add_item("香蕉"))    # ['香蕉']
\`\`\`

> ⚠️ 这是 Python 最著名的坑之一，面试也常问。记住原则：
> **默认值只用不可变类型**（数字、字符串、元组、None）。

## 强制关键字参数（\`*\`）

\`\`\`python
def draw(width, height, *, color="black", filled=False):
    print(width, height, color, filled)

draw(100, 50, color="red")      # ✅
# draw(100, 50, "red")          # ❌ 报错：color 必须用关键字传
\`\`\`

\`*\` 后面的参数**只能按名字传**，适合"加了参数也不影响老代码"的场景。

## 参数顺序总结

\`\`\`python
def f(位置参数, 默认参数, *args, 关键字-only参数, **kwargs):
    ...
\`\`\`

不用背，记住两条即可：

1. **有默认值的排在没默认值的后面**；
2. **调用时位置参数排在关键字参数前面**。

> 💡 **实用建议**：参数超过 3 个时尽量用关键字参数调用，
> 半年后回来看代码，\`create_user("小明", age=18, is_vip=True)\` 比
> \`create_user("小明", 18, True)\` 友好太多。`,
    },
    {
      id: 'ch3-3',
      title: '可变参数与解包',
      content: `## \`*args\`：接收任意多个位置参数

\`\`\`python
def total(*nums):
    print(nums)              # 打包成元组：(1, 2, 3)
    return sum(nums)

print(total(1, 2, 3))        # 6
print(total(10, 20))         # 30
print(total())               # 0（没传就是空元组）
\`\`\`

\`*args\` 的 \`*\` 表示"把多余的参数打包成元组"，名字 \`args\` 是惯例（写成 \`*nums\` 也行）。

## \`**kwargs\`：接收任意多个关键字参数

\`\`\`python
def show_info(**kwargs):
    for key, value in kwargs.items():
        print(f"{key} = {value}")

show_info(name="小明", age=18, city="北京")
# name = 小明
# age = 18
# city = 北京
\`\`\`

打包成的是**字典**。常用于"透传配置"：

\`\`\`python
def create_table(name, **options):
    print(f"建表 {name}，选项：{options}")

create_table("users", charset="utf8", engine="innodb")
# 建表 users，选项：{'charset': 'utf8', 'engine': 'innodb'}
\`\`\`

## 调用时用 \`*\` / \`**\` 解包

定义了 \`*args\` 的函数，也能把现成的列表/元组**拆开**传进去：

\`\`\`python
def add(a, b, c):
    return a + b + c

nums = [1, 2, 3]
print(add(*nums))            # 6   等价于 add(1, 2, 3)

config = {"a": 1, "b": 2, "c": 3}
print(add(**config))         # 6   等价于 add(a=1, b=2, c=3)
\`\`\`

### 实用组合：\`print\` 的参数

\`\`\`python
rows = [["小明", 92], ["小红", 88]]
for row in rows:
    print(*row, sep="\t")        # 小明	92
\`\`\`

### 三种参数混用

\`\`\`python
def order(product, *extras, coupon=None, **info):
    print("主商品：", product)
    print("附加项：", extras)          # 元组
    print("优惠券：", coupon)
    print("其他信息：", info)          # 字典

order("手机", "贴膜", "手机壳", coupon="NEW10", address="北京", urgent=True)
\`\`\`

**顺序口诀**：普通参数 → \`*args\` → 关键字-only → \`**kwargs\`。

### 常见用途

| 场景 | 写法 |
|------|------|
| 求任意个数之和 | \`def total(*nums)\` |
| 包装/转发参数 | \`def wrapper(*args, **kwargs): return f(*args, **kwargs)\` |
| 打日志 | \`def log(msg, *tags)\` |
| 接收配置项 | \`def connect(host, **options)\` |

> 💡 **别滥用**：如果函数只固定收 2~3 个参数，就明写出来。
> \`*args, **kwargs\` 会让调用者看不出该传什么（第八章的装饰器是它最正当的用途）。`,
    },
    {
      id: 'ch3-4',
      title: '返回值与多返回值',
      content: `## return 的两个作用

1. **把结果交回给调用者**；
2. **立即结束函数**（后面的代码不再执行）。

\`\`\`python
def check_score(score):
    if score < 0:
        return "分数不合法"      # 提前返回
    if score >= 60:
        return "及格"
    return "不及格"
\`\`\`

这种"先处理异常情况、提前 return"的写法叫**卫语句（guard clause）**，
能避免层层嵌套的 \`if/else\`，代码更扁平好读。

\`\`\`python
# ❌ 层层嵌套
def check(score):
    if score >= 0:
        if score >= 60:
            return "及格"
        else:
            return "不及格"
    else:
        return "不合法"

# ✅ 提前返回
def check(score):
    if score < 0:
        return "不合法"
    if score >= 60:
        return "及格"
    return "不及格"
\`\`\`

## 多个返回值（本质是元组）

\`\`\`python
def min_max(nums):
    return min(nums), max(nums)

low, high = min_max([3, 1, 4, 1, 5])       # 解包
print(low, high)                            # 1 5

result = min_max([3, 1, 4])                 # 不解包也行
print(result)                               # (1, 4)  元组
print(type(result))                         # <class 'tuple'>
\`\`\`

## return vs print：新手最容易混的地方

\`\`\`python
def add_print(a, b):
    print(a + b)          # 只是"显示"出来

def add_return(a, b):
    return a + b          # 把结果"交出去"

x = add_print(1, 2)       # 屏幕显示 3
print(x)                  # None   ← 拿不到值！

y = add_return(1, 2)
print(y)                  # 3
print(add_return(1, 2) * 10)   # 30  可以继续参与运算
\`\`\`

| 目的 | 用什么 |
|------|--------|
| 给用户看结果 | \`print\` |
| 让结果能被继续使用 | \`return\` |

**函数内部尽量用 return，把"显示"留给调用者**——这样的函数才能被复用。

## None 与 False 的区别

\`\`\`python
def find_index(nums, target):
    for i, n in enumerate(nums):
        if n == target:
            return i
    return None            # 用 None 表示"没找到"

idx = find_index([1, 2, 3], 2)
if idx is not None:        # ⚠️ 判断 None 要用 is，不要用 ==
    print("找到了，下标", idx)
else:
    print("不存在")
\`\`\`

> ⚠️ 如果写成 \`if idx:\`，下标 0 会被当成假（因为 \`0\` 是假值），
> 结果"第一个元素"永远找不到。**判断"有没有值"用 \`is None\`**。

## 函数也可以返回函数

\`\`\`python
def make_multiplier(n):
    def multiply(x):
        return x * n
    return multiply        # 返回的是函数本身（注意没有括号）

double = make_multiplier(2)
print(double(5))           # 10
\`\`\`

这是**闭包**的入门例子，第 5 节和第八章的装饰器都会用到。`,
    },
    {
      id: 'ch3-5',
      title: '作用域与闭包',
      content: `## 变量在哪里"活着"

\`\`\`python
x = 10                 # 全局变量

def show():
    y = 20             # 局部变量：函数结束就消失
    print(x, y)        # 函数里可以"读"全局变量

show()                 # 10 20
# print(y)             # ❌ NameError：函数外看不到 y
\`\`\`

### LEGB：找变量的顺序

Python 按这个顺序查找一个名字：

| 层级 | 含义 | 例子 |
|------|------|------|
| **L**ocal | 当前函数内部 | 函数里的 \`y\` |
| **E**nclosing | 外层函数（闭包） | 嵌套函数的外层变量 |
| **G**lobal | 模块（文件）级 | 文件顶部定义的 \`x\` |
| **B**uilt-in | 内置 | \`print\`、\`len\`、\`sum\` |

### 在函数里修改全局变量：需要 global

\`\`\`python
count = 0

def add_one():
    global count       # 声明"我要改的是全局那个 count"
    count += 1

add_one()
print(count)           # 1
\`\`\`

不写 \`global\` 会怎样？

\`\`\`python
count = 0
def bad():
    count = count + 1   # ❌ UnboundLocalError
\`\`\`

因为"赋值"让 Python 认为 \`count\` 是局部变量，可它还没被赋值就参与了运算。

> ⚠️ **尽量别用 global**：函数偷偷改外部状态会让程序难以调试。
> 更好的做法是**用参数传入、用返回值传出**：
> \`count = add_one(count)\`。

### 闭包：函数"记住"了外层变量

\`\`\`python
def counter():
    n = 0
    def step():
        nonlocal n     # 声明改的是外层的 n
        n += 1
        return n
    return step

c = counter()
print(c())     # 1
print(c())     # 2
print(c())     # 3
\`\`\`

\`nonlocal\` 用于嵌套函数中修改外层函数的变量（\`global\` 管的是最外层）。

### 默认参数的陷阱（再强调一次）

\`\`\`python
def f(a, lst=[]):        # ❌ 默认列表在定义时创建，被所有调用共享
    lst.append(a)
    return lst
\`\`\`

这是**作用域 + 可变对象**共同导致的经典坑，改用 \`lst=None\` 即可。

### 一个真实的小例子

\`\`\`python
def make_logger(prefix):
    def log(message):
        print(f"[{prefix}] {message}")
    return log

info = make_logger("INFO")
error = make_logger("ERROR")

info("启动完成")          # [INFO] 启动完成
error("连接失败")          # [ERROR] 连接失败
\`\`\`

两个函数各自记住了自己的 \`prefix\`，互不干扰——这就是闭包的价值。

> 💡 **实用判断**：如果你发现函数里要改全局变量了，
> 通常说明**这段逻辑应该被封装成类**（第七章）或者改成传参返回值的写法。`,
    },
    {
      id: 'ch3-6',
      title: 'lambda 与高阶函数',
      content: `## lambda：只有一行的匿名函数

\`\`\`python
# 普通函数
def square(x):
    return x * x

# lambda 写法（等价）
square = lambda x: x * x
print(square(5))          # 25
\`\`\`

语法：\`lambda 参数: 表达式\`（**没有 return，表达式的结果就是返回值**）。

### 什么时候用？——临时传给别的函数

\`\`\`python
students = [
    {"name": "小明", "score": 92},
    {"name": "小红", "score": 88},
]

# 排序依据：按分数
students.sort(key=lambda s: s["score"], reverse=True)
for s in students:
    print(s["name"], s["score"])
\`\`\`

**这里的 lambda 用完就丢**，没必要专门 \`def\` 一个函数。

> ⚠️ **不要给 lambda 起名字**：\`f = lambda x: x + 1\` 是不推荐写法，
> 直接 \`def f(x): return x + 1\` 更清晰（还更好调试）。
> lambda 的正确用途就是"当参数传进去"。

## 三个经典高阶函数

"高阶函数"= 接收函数作为参数的函数。

### 1. sorted / sort 的 key（最常用）

\`\`\`python
words = ["banana", "kiwi", "apple"]
print(sorted(words, key=len))                  # 按长度
print(sorted(words, key=lambda w: w[-1]))      # 按最后一个字母

data = [("小明", 92), ("小红", 88)]
print(sorted(data, key=lambda x: -x[1]))       # 分数从高到低（负号取反）
\`\`\`

### 2. map 与 filter

\`\`\`python
nums = [1, 2, 3, 4, 5]

# map：对每个元素做同样处理
doubled = list(map(lambda n: n * 2, nums))
print(doubled)            # [2, 4, 6, 8, 10]

# filter：筛选出符合条件的
evens = list(filter(lambda n: n % 2 == 0, nums))
print(evens)              # [2, 4]
\`\`\`

**但更 Python 的写法是推导式**：

\`\`\`python
doubled = [n * 2 for n in nums]
evens = [n for n in nums if n % 2 == 0]
\`\`\`

> 💡 性能差不多时**优先用推导式**：更好读，也更容易加条件。

### 3. functools.reduce（了解即可）

\`\`\`python
from functools import reduce

nums = [1, 2, 3, 4]
print(reduce(lambda a, b: a + b, nums))       # 10
\`\`\`

累加请直接用 \`sum(nums)\`；\`reduce\` 只在"两两合并"这类场景才有用。

## 常用内置函数（配合 key 用得好就是利器）

\`\`\`python
nums = [3, 1, 4, 1, 5]

print(max(nums), min(nums), sum(nums))     # 5 1 14
print(len(nums))                            # 5
print(any(n > 4 for n in nums))             # True   有一个满足就真
print(all(n > 0 for n in nums))             # True   全部满足才真
print(sorted(nums, reverse=True))           # [5, 4, 3, 1, 1]

# 找最大值对应的元素（不只是最大值本身）
students = [{"name": "小明", "score": 92}, {"name": "小红", "score": 95}]
best = max(students, key=lambda s: s["score"])
print(best["name"])                         # 小红
\`\`\`

> 💡 **\`any\` / \`all\` 很好用**：判断"列表里有没有负数""是不是全部及格"，
> 一行搞定，比写循环 + 标志变量清晰得多。`,
    },
    {
      id: 'ch3-7',
      title: '递归与常见错误',
      content: `## 递归：函数调用自己

\`\`\`python
def factorial(n):
    if n <= 1:              # ① 终止条件（必须有！）
        return 1
    return n * factorial(n - 1)   # ② 自调用，规模变小

print(factorial(5))         # 120 = 5*4*3*2*1
\`\`\`

**递归两要素**：

1. **终止条件**：什么时候停下（少了它 = 无限递归 → \`RecursionError\`）；
2. **规模递减**：每次调用都要更接近终止条件。

\`\`\`python
def fib(n):
    """斐波那契数列：1 1 2 3 5 8 ..."""
    if n <= 2:
        return 1
    return fib(n - 1) + fib(n - 2)

for i in range(1, 8):
    print(fib(i), end=" ")     # 1 1 2 3 5 8 13
\`\`\`

> ⚠️ 上面这个斐波那契写法\`fib(35)\` 就会卡住——因为它把同一项算了很多遍。
> 实际项目里请用循环或加缓存：
> \`\`\`python
> from functools import lru_cache
> @lru_cache(maxsize=None)
> def fib(n): ...
> \`\`\`
> 第 1 节提到过：**能用循环就别用递归**，除非问题本身就是递归结构（树、目录遍历）。

### Python 的递归深度限制

\`\`\`python
import sys
print(sys.getrecursionlimit())     # 1000（默认最多递归 1000 层）
\`\`\`

超过会报 \`RecursionError: maximum recursion depth exceeded\`。
C++ 里递归过深是"栈溢出崩溃"，Python 则是直接抛异常——相对安全，但也别指望用递归处理十万层。

## 函数相关的常见错误清单

| 现象 | 原因 | 解决 |
|------|------|------|
| \`UnboundLocalError\` | 函数里给全局变量赋值却没写 \`global\` | 加 \`global\`，或改成传参返回值 |
| 默认参数越用越多 | 默认值用了列表/字典 | 改成 \`None\` + 函数内新建 |
| 改了列表，别处的也变了 | 参数传的是**引用**，不是副本 | 需要独立副本时先 \`.copy()\` |
| \`NoneType has no attribute ...\` | 函数忘了 \`return\` | 检查函数是否真的返回了值 |
| \`TypeError: takes 2 positional arguments but 3 were given\` | 参数个数不对 | 对照函数定义检查 |
| \`RecursionError\` | 递归没有终止条件 | 补上终止条件 |

### 参数传递：传的是"引用"（重要）

\`\`\`python
def add_item(lst):
    lst.append(1)          # 会修改调用者的列表！

nums = []
add_item(nums)
print(nums)                # [1]  ← 原列表被改了
\`\`\`

\`\`\`python
def add_item_safe(lst):
    lst = lst.copy()       # 先复制，再改副本
    lst.append(1)
    return lst

nums = []
result = add_item_safe(nums)
print(nums, result)        # [] [1]
\`\`\`

| 传入类型 | 函数内修改会影响外部吗 |
|---------|---------------------|
| 数字、字符串、元组（不可变） | ❌ 不会 |
| 列表、字典、集合（可变） | ✅ 会 |

**约定**：函数如果要改传入的列表，最好在文档字符串里写明；
不想改就先 \`.copy()\`。

## 调试小技巧

\`\`\`python
def divide(a, b):
    print(f"[调试] a={a}, b={b}")     # 打印中间值
    if b == 0:
        print("[调试] 除数为 0，返回 None")
        return None
    return a / b
\`\`\`

- 在关键位置打印变量，是最朴素也最有效的调试手段；
- \`print(type(x))\` 排查类型问题；
- 第六章会讲更专业的 \`logging\`，第八章会讲 \`breakpoint()\` 断点调试。

> 🎯 **本章小结**：函数是 Python 代码组织的基石。
> 记住三件事：**参数用关键字传**、**默认值别用可变对象**、
> **函数内部用 return 而不是 print**。`,
    },
  ],
};
