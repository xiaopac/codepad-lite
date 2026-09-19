// 第一章：基础概念（8 小节）
export const ch01Basics = {
  id: 'chapter1',
  title: '第一章：基础概念',
  sections: [
    {
      id: 'ch1-1',
      title: '变量与命名规则',
      content: `## 变量就是"贴了标签的盒子"

\`\`\`python
age = 18              # 把 18 装进名为 age 的盒子
name = "小明"          # 字符串
height = 1.75         # 小数
is_student = True     # 布尔值
\`\`\`

在 Python 里创建变量**不需要声明类型**，只要 \`名字 = 值\` 就行。

### 动态类型：变量可以"换内容"

\`\`\`python
x = 10
print(x)          # 10

x = "现在是文字"
print(x)          # 现在是文字

x = [1, 2, 3]     # 又变成列表
print(x)          # [1, 2, 3]
\`\`\`

同一个变量先后装不同类型的数据，这在 C++ 里是不允许的（那叫静态类型），
Python 里完全合法——**变量本身没有类型，值才有类型**。

> ⚠️ 灵活是把双刃剑：写小程序很爽，写大项目容易乱。
> 所以后面第八章会讲**类型注解**，给灵活加上一层保险。

### 命名规则（硬性要求）

- 只能包含**字母、数字、下划线**（中文名虽然合法，但强烈不建议）；
- **不能以数字开头**：\`2name\` ❌、\`name2\` ✅；
- **区分大小写**：\`Age\` 和 \`age\` 是两个不同的变量；
- 不能用 **Python 关键字**：\`if\`、\`else\`、\`for\`、\`while\`、\`class\`、\`def\`、\`return\`、
  \`True\`、\`False\`、\`None\`、\`import\`、\`in\`、\`is\`、\`not\`、\`and\`、\`or\`……
- 尽量避开内置函数名：\`list\`、\`dict\`、\`sum\`、\`str\`、\`type\`（用了会把它们覆盖掉）。

### 命名规范（软性习惯，PEP 8）

| 类型 | 写法 | 例子 |
|------|------|------|
| 变量 / 函数 | 全小写 + 下划线 | \`student_count\`、\`get_name()\` |
| 类名 | 每个单词首字母大写 | \`StudentInfo\` |
| 常量 | 全大写 + 下划线 | \`MAX_SCORE = 100\` |
| 私有（约定） | 前面加一个下划线 | \`_cache\` |

### 一次给多个变量赋值

\`\`\`python
a, b = 1, 2
print(a, b)        # 1 2

a, b = b, a        # 交换！不需要临时变量
print(a, b)        # 2 1

x = y = z = 0      # 三个变量都是 0
print(x, y, z)     # 0 0 0
\`\`\`

> 💡 **小技巧**：\`a, b = b, a\` 是 Python 最优雅的语法之一，C++ 里要写三行。
> 原理是右边先打包成一个元组，再解包给左边——第二章会详细讲。`,
    },
    {
      id: 'ch1-2',
      title: '数字与字符串',
      content: `## Python 的四类数字

\`\`\`python
count = 42            # int 整数
price = 9.9           # float 小数（浮点数）
ok = True             # bool 布尔（本质是 1 和 0）
z = 3 + 4j            # complex 复数（入门阶段极少用到）
\`\`\`

### 整数没有大小限制

\`\`\`python
big = 2 ** 100        # 2 的 100 次方
print(big)            # 1267650600228229401496703205376
print(big * big)      # 照样精确，不会溢出
\`\`\`

C++ 里 \`int\` 最大约 21 亿，超了会溢出；**Python 整数是任意精度的**，
做大数据题不用担心溢出（代价是大数运算稍慢）。

### 浮点数：0.1 + 0.2 ≠ 0.3（经典陷阱）

\`\`\`python
print(0.1 + 0.2)                    # 0.30000000000000004
print(0.1 + 0.2 == 0.3)             # False ！
print(abs(0.1 + 0.2 - 0.3) < 1e-9)  # True：用误差范围比较
\`\`\`

原因：计算机用二进制存小数，0.1 无法精确表示（就像十进制写不出 1/3）。
**结论**：涉及金额等精确计算时用 \`decimal\` 模块，或先转成整数（以"分"为单位算）。

### 字符串：三种写法

\`\`\`python
s1 = '单引号'
s2 = "双引号"          # 与单引号完全等价
s3 = """三引号可以
跨很多行，
保留换行和缩进"""
print(s3)
\`\`\`

### 转义字符

| 写法 | 含义 |
|------|------|
| \`\\n\` | 换行 |
| \`\\t\` | 制表符（Tab） |
| \`\\\\\` | 一个反斜杠 |
| \`\\"\` | 双引号本身 |
| \`\\'\` | 单引号本身 |

\`\`\`python
print("第一行\\n第二行")       # 换行输出
print("姓名\\t年龄")           # 用 Tab 对齐
print("他说：\\"你好\\"")       # 输出引号要转义
print(r"C:\\new\\test")         # r"" 原样字符串：反斜杠不再转义
\`\`\`

### 字符串运算

\`\`\`python
print("Py" + "thon")        # Python  拼接
print("ab" * 3)             # ababab   重复
print("a" in "cat")         # True     是否包含
print(len("hello"))         # 5        长度
\`\`\`

> 💡 **查看类型**：\`print(type(x))\` 会告诉你 x 是什么类型。
> 调试时非常有用，遇到 \`TypeError\` 第一件事就是打印类型看看。`,
    },
    {
      id: 'ch1-3',
      title: '输入与输出',
      content: `## 输出：print 的三种常用姿势

\`\`\`python
name = "小明"
age = 18

print(name, age)                       # 小明 18    默认空格分隔
print(name, age, sep=", ")             # 小明, 18   自定义分隔符
print("处理中", end="")                 # 不换行
print("完成")                          # 接着上一行输出
\`\`\`

### 输入：input() 拿到的永远是字符串！

\`\`\`python
name = input("请输入姓名：")
print("你好，" + name)

age = input("请输入年龄：")     # ⚠️ 这里 age 是字符串 "18"，不是数字 18
print(age + 1)                  # ❌ TypeError: can only concatenate str
age = int(age)                  # ✅ 先转换类型
print(age + 1)                  # 19
\`\`\`

**这是新手最常见的坑**：\`input()\` 无论你输入什么（哪怕输入 123），
返回的都是**字符串**。要参与数学运算必须先转换。

### 类型转换四件套

\`\`\`python
int("18")        # 18        字符串 → 整数
int(3.9)         # 3         小数 → 整数（截断，不是四舍五入）
float("3.14")    # 3.14      字符串 → 小数
str(99)          # "99"      数字 → 字符串
bool(0)          # False     转布尔
\`\`\`

| 想干什么 | 写法 | 注意 |
|---------|------|------|
| 输入整数 | \`int(input(...))\` | 输入非数字会 ValueError |
| 输入小数 | \`float(input(...))\` | 同上 |
| 一行多个数 | \`a, b = map(int, input().split())\` | 最常用的竞赛写法 |
| 转成字符串 | \`str(x)\` | 拼接前常要转 |

### 一次性读入多个数（重要）

\`\`\`python
# 输入：3 5
a, b = map(int, input().split())
print(a + b)      # 8

# 输入一行若干个数：1 2 3 4 5
nums = list(map(int, input().split()))
print(sum(nums))  # 15
\`\`\`

> 💡 **本站怎么输入**：用 **▶ 运行** 时，把数据填在控制台下方的「标准输入」框里（运行时一次性发送）；
> 想边跑边输入就用 **💻 终端运行**，直接对着终端敲。`,
    },
    {
      id: 'ch1-4',
      title: '运算符与类型转换',
      content: `## 算术运算符

| 运算符 | 含义 | 例子 | 结果 |
|--------|------|------|------|
| \`+\` | 加 | \`3 + 2\` | \`5\` |
| \`-\` | 减 | \`3 - 2\` | \`1\` |
| \`*\` | 乘 | \`3 * 2\` | \`6\` |
| \`/\` | 除（**结果总是小数**） | \`7 / 2\` | \`3.5\` |
| \`//\` | 整除（向下取整） | \`7 // 2\` | \`3\` |
| \`%\` | 取余 | \`7 % 2\` | \`1\` |
| \`**\` | 幂 | \`2 ** 10\` | \`1024\` |

\`\`\`python
print(7 / 2)      # 3.5   注意：即使整除也是小数 4/2 → 2.0
print(-7 // 2)    # -4    向下取整（不是 -3）
print(10 % 3)     # 1     常用于"判断能否整除"
print(2 ** 0.5)   # 1.414...  开平方
\`\`\`

**常见用途**：\`n % 2 == 0\` 判断偶数，\`% 10\` 取个位，\`// 10\` 去掉个位。

## 比较与逻辑运算符

\`\`\`python
print(3 > 2, 3 >= 3, 3 == 3, 3 != 4)    # True True True True

# 逻辑：and（且）or（或）not（非）
age = 20
print(age >= 18 and age <= 60)   # True
print(age < 10 or age > 18)      # True
print(not (age == 20))           # False
\`\`\`

### 短路求值（能省事也能避坑）

\`\`\`python
# and：左边为假，右边根本不算
print(False and 1 / 0)      # False（不会因为除零报错）

# or：左边为真，右边不算；常用来给默认值
name = "" or "匿名用户"
print(name)                 # 匿名用户
\`\`\`

> ⚠️ **Python 的逻辑运算符返回的是操作数本身**，不是 True/False：
> \`0 or "空" \` → \`"空"\`，\` "有值" and 100 \` → \`100\`。
> 布尔判断时它们能当 True/False 用，但打印出来是原值，别被吓到。

## 类型转换：隐式与显式

\`\`\`python
# 隐式：int 与 float 混算，结果自动变 float
print(1 + 2.5)        # 3.5

# 显式：手动转换（推荐，意图明确）
print(int(2.9))       # 2     截断
print(round(2.9))     # 3     四舍五入
print(float(5))       # 5.0
print(str(5) + "号")  # 5号
\`\`\`

### 运算符优先级（记不住就加括号）

从高到低大致是：\`**\` → \`* / // %\` → \`+ -\` → 比较 → \`not\` → \`and\` → \`or\`。

\`\`\`python
print(2 + 3 * 4)      # 14   先乘后加
print((2 + 3) * 4)    # 20   括号最优先
\`\`\`

> 💡 **代码可读性优先**：\`(a + b) / 2\` 比 \`a + b / 2\` 更不容易看错，
> 多写一对括号不会有任何性能损失。`,
    },
    {
      id: 'ch1-5',
      title: '条件语句（if / elif / else）',
      content: `## 基本语法

\`\`\`python
score = 85

if score >= 90:
    print("优秀")
elif score >= 60:
    print("及格")
else:
    print("不及格")
\`\`\`

**三个必须记住的细节**：

1. 条件后面有**冒号 \`:\`**（漏了就是 \`SyntaxError\`）；
2. 属于这个分支的代码**必须缩进**（4 个空格）；
3. \`elif\` 可以有 0 个或多个，\`else\` 最多一个，且必须放最后。

### 条件表达式（一行版 if）

\`\`\`python
age = 20
label = "成年" if age >= 18 else "未成年"
print(label)      # 成年
\`\`\`

### 什么算"真"，什么算"假"（重要）

Python 里任何值都能当条件用，以下这些**视为假**：

| 假值 | 说明 |
|------|------|
| \`False\` | 布尔假 |
| \`0\`、\`0.0\` | 零 |
| \`""\` | 空字符串 |
| \`[]\`、\`()\`、\`{}\`、\`set()\` | 空容器 |
| \`None\` | 空值 |

其余都是真。所以可以写得非常简洁：

\`\`\`python
name = ""
if name:                 # 等价于 if len(name) > 0
    print("有名字")
else:
    print("名字为空")

items = []
if not items:            # 空列表 → 取反 → True
    print("列表是空的")
\`\`\`

> ⚠️ **别把 \`=\` 和 \`==\` 搞混**：\`=\` 是赋值，\`==\` 是比较。
> \`if x = 1:\` 会直接语法报错（这是 Python 故意的设计，帮你避免手误）。

### 多重条件与嵌套

\`\`\`python
year = 2024
if year % 400 == 0 or (year % 4 == 0 and year % 100 != 0):
    print("闰年")
else:
    print("平年")
\`\`\`

\`\`\`python
# 嵌套：注意每层都要缩进
x = 15
if x > 0:
    if x % 2 == 0:
        print("正偶数")
    else:
        print("正奇数")
else:
    print("非正数")
\`\`\`

### match-case（Python 3.10+）

\`\`\`python
command = "start"
match command:
    case "start":
        print("启动")
    case "stop":
        print("停止")
    case _:                 # 相当于 else
        print("未知命令")
\`\`\`

> ⚠️ \`match\` 需要 **Python 3.10 及以上**。本站自定义环境可选 3.9，
> 如果代码要兼容，仍建议用 \`if/elif\`（判断分支多时 \`elif\` 也完全够用）。`,
    },
    {
      id: 'ch1-6',
      title: 'while 循环',
      content: `## 当条件成立时反复执行

\`\`\`python
count = 1
while count <= 5:
    print("第", count, "次")
    count += 1          # ⚠️ 千万别忘，否则死循环
print("结束")
\`\`\`

**循环三要素**：初始值 → 判断条件 → 更新变量。少任何一个都可能死循环。

### 死循环与紧急退出

\`\`\`python
while True:                 # 故意写死循环
    cmd = input("输入命令（q 退出）：")
    if cmd == "q":
        break               # 跳出循环
    print("你输入了", cmd)
\`\`\`

终端里跑死循环时按 **⌘/Ctrl + C** 可以强制中断——
本站「💻 终端运行」里可以直接这么干，▶ 运行 则有 10 秒超时保护。

### break 与 continue

\`\`\`python
i = 0
while i < 10:
    i += 1
    if i == 3:
        continue        # 跳过本次，直接进入下一轮判断
    if i == 6:
        break           # 彻底跳出循环
    print(i)            # 输出 1 2 4 5
\`\`\`

| 关键字 | 作用 | 记忆 |
|--------|------|------|
| \`break\` | 立即结束整个循环 | 打破 |
| \`continue\` | 结束**本次**，进入下一次 | 继续 |

### while-else（少用但要知道）

\`\`\`python
n = 7
i = 2
while i < n:
    if n % i == 0:
        print("不是质数")
        break
    i += 1
else:
    print("是质数")      # 循环正常跑完（没被 break）才执行
\`\`\`

### 经典练习

\`\`\`python
# 1. 求 1~100 的和
total, i = 0, 1
while i <= 100:
    total += i
    i += 1
print(total)             # 5050

# 2. 猜数字（配合随机数，见第六章）
import random
answer = random.randint(1, 100)
while True:
    guess = int(input("猜一个 1~100 的数："))
    if guess < answer:
        print("小了")
    elif guess > answer:
        print("大了")
    else:
        print("猜对了！")
        break
\`\`\`

> 💡 **什么时候用 while，什么时候用 for**：
> 循环次数**已知**（遍历一批数据、跑 N 次）→ 用 \`for\`；
> 循环次数**未知**（等到某个条件成立、用户输入正确为止）→ 用 \`while\`。`,
    },
    {
      id: 'ch1-7',
      title: 'for 循环',
      content: `## Python 的 for 是"遍历"，不是"计数"

\`\`\`python
# 遍历字符串
for ch in "abc":
    print(ch)          # a b c

# 遍历列表
for fruit in ["苹果", "香蕉", "橘子"]:
    print(fruit)
\`\`\`

Python 的 \`for\` 直接说"**对每一项做点什么**"，不需要下标变量。

### range：需要次数时用它

\`\`\`python
for i in range(5):          # 0 1 2 3 4（不含 5）
    print(i)

for i in range(1, 6):       # 1 2 3 4 5
    print(i)

for i in range(0, 10, 2):   # 0 2 4 6 8（步长 2）
    print(i)

for i in range(5, 0, -1):   # 5 4 3 2 1（倒着数）
    print(i)
\`\`\`

| 写法 | 含义 |
|------|------|
| \`range(n)\` | 0 到 n-1 |
| \`range(a, b)\` | a 到 b-1 |
| \`range(a, b, step)\` | a 到 b-1，步长 step |

### enumerate：同时要下标和值

\`\`\`python
names = ["小明", "小红", "小刚"]

# ❌ 不 Python 的写法
for i in range(len(names)):
    print(i, names[i])

# ✅ 推荐写法
for i, name in enumerate(names):
    print(i, name)

for i, name in enumerate(names, start=1):   # 下标从 1 开始
    print(f"第{i}名：{name}")
\`\`\`

### zip：同时遍历多个序列

\`\`\`python
names = ["小明", "小红"]
scores = [92, 88]

for name, score in zip(names, scores):
    print(f"{name} 考了 {score} 分")

# 长度不同时以短的为准
for a, b in zip([1, 2, 3], ["x", "y"]):
    print(a, b)          # (1,x) (2,y)
\`\`\`

### 遍历字典

\`\`\`python
person = {"name": "小明", "age": 18}

for key in person:                    # 默认遍历键
    print(key)

for value in person.values():         # 遍历值
    print(value)

for key, value in person.items():      # 键值都要（最常用）
    print(key, "=", value)
\`\`\`

### for-else 与嵌套循环

\`\`\`python
# 找第一个能被 7 整除的数
for n in range(10, 20):
    if n % 7 == 0:
        print("找到：", n)
        break
else:
    print("没找到")

# 嵌套：打印九九乘法表（只打一半）
for i in range(1, 10):
    row = ""
    for j in range(1, i + 1):
        row += f"{j}x{i}={i*j} "
    print(row)
\`\`\`

> 💡 **性能小知识**：字符串相加 \`row += ...\` 在循环里较慢，
> 更好的写法是把结果存进列表再 \`"".join(列表)\`（第四章会讲）。
> 几十次循环感觉不到，几万次就有明显差别了。`,
    },
    {
      id: 'ch1-8',
      title: '本章小结与练习',
      content: `## 本章知识地图

\`\`\`mermaid
基础概念
  ├── 变量：贴标签的盒子，动态类型
  ├── 数字：int / float / bool，整数不溢出，浮点有误差
  ├── 字符串：单双三引号、转义、拼接
  ├── 输入输出：input() 永远是字符串、print(sep/end)
  ├── 运算符：// 整除、% 取余、** 幂、短路求值
  ├── 条件：if / elif / else、真假值表、三元表达式
  └── 循环：while（次数未知）/ for（遍历）、break / continue
\`\`\`

### 常见错误速查表

| 报错 / 现象 | 原因 | 解决 |
|------------|------|------|
| \`SyntaxError: invalid syntax\` | 少了冒号/括号，或用了中文标点 | 检查 \`:\` \`(\` \`"\` 是否英文 |
| \`IndentationError\` | 缩进不一致或多缩进 | 统一 4 个空格 |
| \`NameError: name 'x' is not defined\` | 变量没定义 / 拼错 / 大小写不符 | 检查拼写与定义顺序 |
| \`TypeError: can only concatenate str\` | 字符串和数字直接相加 | 用 \`int()\` 转换或 f-string |
| \`ValueError: invalid literal for int()\` | 输入了非数字却 \`int()\` | 加判断或 \`try/except\`（第五章） |
| 程序卡住不动 | 死循环 / 在等输入 | 检查 \`while\` 条件是否更新；▶运行 有 10 秒超时 |
| \`ZeroDivisionError\` | 除以 0 | 运算前判断分母 |

### 综合示例：成绩统计

\`\`\`python
# 输入若干成绩，输出平均分、最高分、及格人数
scores = []
while True:
    line = input("输入成绩（直接回车结束）：")
    if line == "":
        break
    scores.append(float(line))

if not scores:
    print("没有输入任何成绩")
else:
    average = sum(scores) / len(scores)
    passed = 0
    for s in scores:
        if s >= 60:
            passed += 1
    print(f"共 {len(scores)} 人，平均 {average:.1f} 分，最高 {max(scores)} 分，及格 {passed} 人")
\`\`\`

### 动手练习（建议都在本站跑一遍）

**练习 1**：输入一个整数，判断它是奇数还是偶数。

**练习 2**：输入一个正整数 n，输出 1 到 n 中所有能被 3 整除的数。

**练习 3**：输入一串数字（空格分隔），输出它们的和、平均值、最大值、最小值。

**练习 4**：打印九九乘法表（完整版，9 行 9 列）。

**练习 5**：输入一个字符串，统计其中英文字母、数字、空格的个数。

**练习 6**（稍难）：输出 1~100 之间的所有质数。

> 💡 **做题方法**：先在纸上写清"输入是什么、要算什么、输出什么"，
> 再一小步一小步写代码，每写两三行就运行一次看结果。
> 一次性写完一大段再运行，出错时会很难定位。

### 下一章预告

第二章会讲 Python 最强大的部分——**列表、元组、字典、集合**。
学会它们，你才能一次处理成百上千条数据，而不是只能摆弄几个变量。`,
    },
  ],
};
