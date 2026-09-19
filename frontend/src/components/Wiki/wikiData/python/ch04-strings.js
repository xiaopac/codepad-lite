// 第四章：字符串与文本处理（6 小节）
export const ch04Strings = {
  id: 'chapter4',
  title: '第四章：字符串与文本',
  sections: [
    {
      id: 'ch4-1',
      title: '字符串基础与不可变性',
      content: `## 字符串是"字符序列"

\`\`\`python
s = "Python"
print(s[0])       # P      下标从 0 开始
print(s[-1])      # n      倒数第一个
print(len(s))     # 6
print(s[0:3])     # Pyt    切片：含头不含尾
\`\`\`

### 不可变：改不了，只能生成新的

\`\`\`python
s = "hello"
# s[0] = "H"        # ❌ TypeError: 'str' object does not support item assignment

s = "H" + s[1:]     # ✅ 拼一个新字符串
print(s)            # Hello
\`\`\`

**所有"修改字符串"的方法其实都返回新字符串**，原字符串不动：

\`\`\`python
name = "  xiaoming  "
fixed = name.strip()
print(repr(name))     # '  xiaoming  '   原串没变
print(repr(fixed))    # 'xiaoming'
\`\`\`

> 💡 \`repr()\` 会显示引号和空格，调试字符串问题时比 \`print\` 好用。

### 拼接：+ 与 join 的差别

\`\`\`python
# 少量拼接：+ 就行
full = "Hello, " + "world"

# 大量拼接：用 join（快很多）
words = ["我", "爱", "Python"]
print("".join(words))         # 我爱Python
print("-".join(words))        # 我-爱-Python
print(", ".join(["a", "b"]))  # a, b
\`\`\`

\`\`\`python
# ❌ 循环里反复 + ：每次都新建字符串，1 万次就明显变慢
result = ""
for w in words:
    result += w

# ✅ 先收集再 join
parts = []
for w in words:
    parts.append(w)
result = "".join(parts)
\`\`\`

### 判断与比较

\`\`\`python
print("Py" in "Python")        # True   包含
print("py" in "Python")        # False  区分大小写！

print("abc" == "abc")          # True
print("abc" == "ABC")          # False
print("abc".lower() == "ABC".lower())   # True 忽略大小写比较
\`\`\`

### 字符串与其他类型

\`\`\`python
age = 18
# print("我 " + age + " 岁")   # ❌ TypeError：字符串不能和数字相加
print("我 " + str(age) + " 岁")   # ✅ 先转字符串
print(f"我 {age} 岁")             # ✅✅ 更好：f-string（下一节）
\`\`\`

> ⚠️ **中文与 \`len\`**：\`len("你好")\` 是 2（按字符数算，不会像 C 那样按字节算），
> 处理中文比 C 语言省心得多。`,
    },
    {
      id: 'ch4-2',
      title: '常用字符串方法',
      content: `## 一表掌握高频方法

| 方法 | 作用 | 例子 → 结果 |
|------|------|------------|
| \`strip()\` | 去首尾空白 | \`"  a  ".strip()\` → \`"a"\` |
| \`lstrip()\` / \`rstrip()\` | 只去左 / 只去右 | \`"a\\n".rstrip()\` → \`"a"\` |
| \`split(sep)\` | 切成列表 | \`"a,b".split(",")\` → \`['a','b']\` |
| \`join(列表)\` | 拼成字符串 | \`"-".join(['a','b'])\` → \`"a-b"\` |
| \`replace(old, new)\` | 替换 | \`"aa".replace("a","b")\` → \`"bb"\` |
| \`upper()\` / \`lower()\` | 全大写 / 全小写 | \`"Ab".lower()\` → \`"ab"\` |
| \`title()\` / \`capitalize()\` | 首字母大写 | \`"hi there".title()\` → \`"Hi There"\` |
| \`find(x)\` | 找下标（找不到返回 -1） | \`"abc".find("c")\` → \`2\` |
| \`index(x)\` | 找下标（找不到报错） | \`"abc".index("c")\` → \`2\` |
| \`count(x)\` | 出现次数 | \`"aba".count("a")\` → \`2\` |
| \`startswith(x)\` | 是否以…开头 | \`"a.py".startswith("a")\` → \`True\` |
| \`endswith(x)\` | 是否以…结尾 | \`"a.py".endswith(".py")\` → \`True\` |
| \`isdigit()\` | 是否全是数字 | \`"123".isdigit()\` → \`True\` |
| \`isalpha()\` | 是否全是字母 | \`"abc".isalpha()\` → \`True\` |
| \`zfill(n)\` | 左侧补 0 | \`"7".zfill(3)\` → \`"007"\` |
| \`center(n)\` | 居中对齐 | \`"a".center(5,"-")\` → \`"--a--"\` |

## 最常用的三组

### 1. split 与 join：文本 ↔ 列表

\`\`\`python
line = "小明,18,北京"
fields = line.split(",")
print(fields)             # ['小明', '18', '北京']

print(" | ".join(fields)) # 小明 | 18 | 北京

# 不带参数：按任意空白（空格、Tab、换行）切分，并自动去空
print("a   b\\nc".split())    # ['a', 'b', 'c']
\`\`\`

### 2. strip：清理用户输入

\`\`\`python
raw = "  13800138000 \\n"
phone = raw.strip()
print(phone)              # 13800138000

# 去掉指定字符
print("###abc###".strip("#"))     # abc
\`\`\`

### 3. replace：批量替换

\`\`\`python
text = "我今天很开心，真的很开心"
print(text.replace("开心", "快乐"))       # 全部替换
print(text.replace("开心", "快乐", 1))    # 只替换第一个
\`\`\`

## 判断类方法：做输入校验

\`\`\`python
while True:
    s = input("请输入年龄：").strip()
    if s.isdigit():                # 全是数字才继续
        age = int(s)
        break
    print("输入不合法，请重新输入")

print(f"年龄：{age}")
\`\`\`

## 方法链式调用

\`\`\`python
raw = "  Hello, WORLD!  "
clean = raw.strip().lower().replace("!", "")
print(clean)      # hello, world
\`\`\`

从左到右依次执行：先去空白 → 转小写 → 去感叹号。

> ⚠️ **这些方法都不改变原字符串**（字符串不可变）：
> \`s.strip()\` 之后如果不用变量接住，等于白写：
> \`\`\`python
> s = "  a  "
> s.strip()          # ❌ 结果被丢弃了
> s = s.strip()      # ✅ 这才是你要的
> \`\`\``,
    },
    {
      id: 'ch4-3',
      title: '格式化输出（f-string）',
      content: `## 三种写法，推荐 f-string

\`\`\`python
name, age, score = "小明", 18, 92.5

# ① % 老写法（了解即可，新代码别用）
print("我叫%s，今年%d岁" % (name, age))

# ② str.format（能用，但啰嗦）
print("我叫{}，今年{}岁".format(name, age))
print("我叫{0}，{0}今年{1}岁".format(name, age))   # 可重复引用

# ③ f-string（Python 3.6+，推荐）
print(f"我叫{name}，今年{age}岁")
\`\`\`

f-string 就是在引号前加 \`f\`，然后用 \`{变量}\` 直接嵌入——
**能放任何表达式**：

\`\`\`python
a, b = 3, 4
print(f"{a} + {b} = {a + b}")         # 3 + 4 = 7
print(f"{'大写'.upper()}转换")          # 大写转换
print(f"列表长度：{len([1,2,3])}")      # 列表长度：3
\`\`\`

## 格式说明符：控制小数、对齐、千分位

语法：\`{值:格式}\`

\`\`\`python
pi = 3.14159265

print(f"{pi:.2f}")        # 3.14      保留 2 位小数
print(f"{pi:.0f}")        # 3         四舍五入到整数
print(f"{pi:10.3f}")      # "     3.142"  宽度 10，右对齐
print(f"{pi:<10.3f}|")    # "3.142     |" 左对齐
print(f"{pi:^10.3f}|")    # "  3.142   |" 居中
print(f"{1234567:,}")     # 1,234,567 千分位
print(f"{0.856:.1%}")     # 85.6%     百分比
print(f"{255:08b}")       # 11111111  二进制补零
print(f"{255:x}")         # ff        十六进制
\`\`\`

| 格式 | 含义 | 例子 |
|------|------|------|
| \`.2f\` | 保留 2 位小数 | \`3.14\` |
| \`d\` | 整数 | \`42\` |
| \`, \` | 千分位 | \`1,234\` |
| \`.1%\` | 百分比 | \`85.6%\` |
| \`>10\` / \`<10\` / \`^10\` | 右 / 左 / 居中，宽度 10 | 对齐表格 |
| \`05d\` | 补零到 5 位 | \`00042\` |

## 对齐输出表格（超实用）

\`\`\`python
students = [("小明", 92, 1.75), ("小红", 88, 1.62), ("小刚", 95, 1.80)]

print(f"{'姓名':<6}{'分数':>6}{'身高':>8}")
print("-" * 20)
for name, score, height in students:
    print(f"{name:<6}{score:>6}{height:>8.2f}")
\`\`\`

输出：

\`\`\`
姓名        分数      身高
--------------------
小明        92    1.75
小红        88    1.62
小刚        95    1.80
\`\`\`

## 调试神技：\`{变量=}\`

\`\`\`python
x = 42
items = [1, 2]
print(f"{x=}")            # x=42
print(f"{items=}")        # items=[1, 2]
print(f"{x * 2 = }")      # x * 2 = 84
\`\`\`

写 \`{x=}\` 会同时打印"表达式 + 结果"，调试时不用再手写 \`print("x =", x)\`（Python 3.8+）。

> ⚠️ **引号冲突**：f-string 里用同种引号会出错。
> \`f"{d["key"]}"\` ❌（3.12 之前）→ 改成 \`f"{d['key']}"\` ✅
> 另外 f-string 里不要写复杂逻辑，先在外部算好再放进去，代码更好读。`,
    },
    {
      id: 'ch4-4',
      title: '切片与文本技巧',
      content: `## 切片三参数：\`[起点:终点:步长]\`

\`\`\`python
s = "0123456789"

print(s[2:5])      # 234      含 2 不含 5
print(s[:3])       # 012      开头三个
print(s[-3:])      # 789      最后三个
print(s[::2])      # 02468    隔一个取一个
print(s[::-1])     # 9876543210   反转！
print(s[5:2:-1])   # 543      从 5 倒着到 3
\`\`\`

| 需求 | 写法 |
|------|------|
| 前 n 个 | \`s[:n]\` |
| 后 n 个 | \`s[-n:]\` |
| 去掉首尾 | \`s[1:-1]\` |
| 反转 | \`s[::-1]\` |
| 复制 | \`s[:]\` |
| 每隔一个 | \`s[::2]\` |

**切片不会因为越界报错**：

\`\`\`python
s = "abc"
print(s[0:100])     # abc    不报错，能给多少给多少
print(s[10:20])     # （空字符串）
\`\`\`

对列表同样适用（第二章见过）：\`nums[1:3]\`、\`nums[::-1]\`。

## 常用文本技巧

### 1. 回文判断（一行）

\`\`\`python
def is_palindrome(text):
    cleaned = text.replace(" ", "").lower()
    return cleaned == cleaned[::-1]

print(is_palindrome("上海自来水来自海上"))   # True
print(is_palindrome("abc"))                   # False
\`\`\`

### 2. 反转单词顺序

\`\`\`python
sentence = "I love Python"
print(" ".join(sentence.split()[::-1]))       # Python love I
\`\`\`

### 3. 首字母大写 / 驼峰转换

\`\`\`python
name = "student_name"
camel = "".join(w.capitalize() for w in name.split("_"))
print(camel)      # StudentName
\`\`\`

### 4. 判断文件类型 / 提取扩展名

\`\`\`python
filename = "report.final.pdf"
print(filename.endswith(".pdf"))              # True
print(filename.rsplit(".", 1)[-1])            # pdf
print(".".join(filename.split(".")[:-1]))     # report.final
\`\`\`

### 5. 手机号脱敏

\`\`\`python
phone = "13800138000"
print(phone[:3] + "****" + phone[-4:])        # 138****8000
\`\`\`

### 6. 去掉多余空白（清洗用户输入）

\`\`\`python
messy = "  多个   空格    要合并  "
clean = " ".join(messy.split())
print(clean)      # 多个 空格 要合并
\`\`\`

原理：\`split()\` 不带参数会自动忽略连续空白，再用单个空格 join 回来。

### 7. 多行文本处理

\`\`\`python
text = """第一行
第二行
第三行"""

lines = text.splitlines()        # 按行切开（不保留换行符）
print(len(lines))                # 3

for i, line in enumerate(lines, 1):
    print(f"{i}: {line}")

# 去掉空行
non_empty = [l for l in lines if l.strip()]
\`\`\`

> 💡 **\`splitlines()\` vs \`split("\\n")\`**：前者能同时处理 \`\\n\`、\`\\r\\n\`（Windows 换行），
> 处理从文件读来的文本更稳。`,
    },
    {
      id: 'ch4-5',
      title: '文本处理实战',
      content: `## 实战一：词频统计

\`\`\`python
text = """
Python is great. Python is easy.
Learning Python is fun and Python is powerful.
"""

words = text.lower().replace(".", "").split()
counts = {}

for w in words:
    counts[w] = counts.get(w, 0) + 1

# 按出现次数排序输出前 3
top = sorted(counts.items(), key=lambda kv: kv[1], reverse=True)[:3]
for word, n in top:
    print(f"{word:<10}{n} 次")
\`\`\`

### 加上"排除停用词"

\`\`\`python
stopwords = {"is", "and", "the", "a", "of"}
counts = {}
for w in words:
    if w in stopwords:
        continue
    counts[w] = counts.get(w, 0) + 1
\`\`\`

## 实战二：解析一行 CSV 数据

\`\`\`python
line = "小明, 18, 北京, 92.5"
name, age, city, score = [f.strip() for f in line.split(",")]
age = int(age)
score = float(score)
print(f"{name}（{age}岁，{city}）成绩 {score}")
\`\`\`

> ⚠️ 真实 CSV 里可能有**引号包裹的逗号**（\`"北京, 海淀"\`），
> 这种脏活请交给标准库 \`csv\` 模块（第五章讲）。

## 实战三：统计字符构成

\`\`\`python
s = input("输入一段文字：")

letters = sum(1 for ch in s if ch.isalpha())
digits = sum(1 for ch in s if ch.isdigit())
spaces = sum(1 for ch in s if ch.isspace())
others = len(s) - letters - digits - spaces

print(f"字母 {letters} 个，数字 {digits} 个，空格 {spaces} 个，其他 {others} 个")
\`\`\`

\`sum(1 for ch in s if ...)\` 是"统计满足条件的个数"的惯用写法
（生成器表达式，第八章详解）。

## 实战四：简易模板替换

\`\`\`python
template = "尊敬的{name}，您的订单{order_id}已发货，预计{day}天送达。"
info = {"name": "张先生", "order_id": "SF123456", "day": 2}

message = template
for key, value in info.items():
    message = message.replace("{" + key + "}", str(value))

print(message)
# 尊敬的张先生，您的订单SF123456已发货，预计2天送达。
\`\`\`

更优雅的写法（\`str.format_map\`）：

\`\`\`python
message = template.format_map(info)
\`\`\`

但如果模板里有缺失的键会报 \`KeyError\`——用字典的默认值或先检查键。

## 实战五：把长文本按宽度折行

\`\`\`python
import textwrap

long_text = "Python 是一门非常流行的编程语言，广泛用于数据分析、人工智能和自动化脚本。"
print(textwrap.fill(long_text, width=20))
\`\`\`

输出（每行 20 个字符宽）：

\`\`\`
Python 是一门非常流行的编程语言，
广泛用于数据分析、人工智能和自
动化脚本。
\`\`\`

> 💡 **处理文本的通用套路**：
> **切分（split）→ 清洗（strip/lower/replace）→ 统计或转换 → 合并（join）**。
> 掌握这四步，绝大多数文本任务都能解决。`,
    },
    {
      id: 'ch4-6',
      title: '正则表达式入门',
      content: `## 为什么需要正则

要从一段文字里"找出所有手机号"，用 \`split\` / \`find\` 会很痛苦。
正则表达式（regex）就是**描述文本模式的迷你语言**。

\`\`\`python
import re

text = "联系我：13800138000 或 010-12345678，邮箱 xm@example.com"

phones = re.findall(r"1[3-9]\\d{9}", text)
print(phones)          # ['13800138000']
\`\`\`

## 四个最常用的函数

| 函数 | 作用 | 返回 |
|------|------|------|
| \`re.findall(p, s)\` | 找出**所有**匹配 | 字符串列表 |
| \`re.search(p, s)\` | 找**第一个**匹配 | Match 对象或 None |
| \`re.match(p, s)\` | 从**开头**匹配 | Match 对象或 None |
| \`re.sub(p, new, s)\` | **替换** | 新字符串 |

\`\`\`python
import re

s = "订单号 A123，金额 456 元，订单号 B789"

print(re.findall(r"[A-Z]\\d+", s))          # ['A123', 'B789']
print(re.findall(r"\\d+", s))                # ['123', '456', '789']

m = re.search(r"金额 (\\d+)", s)
if m:
    print(m.group(0))     # 金额 456   整个匹配
    print(m.group(1))     # 456        第一个括号（分组）

print(re.sub(r"\\d+", "#", s))               # 订单号 A#，金额 # 元，订单号 B#
\`\`\`

## 元字符速查

| 符号 | 含义 | 例子 |
|------|------|------|
| \`.\` | 任意一个字符（除换行） | \`a.c\` 匹配 \`abc\` |
| \`\\d\` | 数字 0-9 | \`\\d{3}\` 三个数字 |
| \`\\w\` | 字母/数字/下划线 | \`\\w+\` 一个单词 |
| \`\\s\` | 空白（空格/Tab/换行） | —— |
| \`\\D\` \`\\W\` \`\\S\` | 上面三个的**反面** | \`\\D\` 非数字 |
| \`*\` | 0 次或多次 | \`ab*c\` → ac, abc, abbc |
| \`+\` | 1 次或多次 | \`ab+c\` → abc, abbc（不含 ac） |
| \`?\` | 0 次或 1 次 | \`colou?r\` → color, colour |
| \`{n}\` \`{n,m}\` | 恰好 n 次 / n~m 次 | \`\\d{11}\` 十一位数字 |
| \`[]\` | 字符集合 | \`[abc]\`、\`[0-9]\`、\`[^0-9]\`（非数字） |
| \`^\` \`$\` | 字符串开头 / 结尾 | \`^\\d+$\` 整串都是数字 |
| \`\\|\` | 或 | \`cat\\|dog\` |
| \`()\` | 分组（可提取） | \`(\\d{4})-(\\d{2})\` |

## 常用模式模板

\`\`\`python
import re

# 手机号（中国大陆）
re.findall(r"1[3-9]\\d{9}", text)

# 邮箱（简化版）
re.findall(r"[\\w.+-]+@[\\w-]+\\.[\\w.]+", text)

# 日期 2024-01-15
re.findall(r"\\d{4}-\\d{2}-\\d{2}", text)

# 中文（连续汉字）
re.findall(r"[\\u4e00-\\u9fa5]+", text)

# 整串校验：必须是 6~20 位字母数字
if re.fullmatch(r"[A-Za-z0-9]{6,20}", password):
    print("密码格式正确")
\`\`\`

## 原始字符串 r""：写正则的必备习惯

\`\`\`python
# ❌ 普通字符串：\\d 会被当成转义（虽然能跑，但容易踩坑）
re.findall("\\d+", s)

# ✅ 原始字符串：反斜杠原样传给正则引擎
re.findall(r"\\d+", s)
\`\`\`

**写正则一律加 \`r\` 前缀**，能避免绝大多数"为什么匹配不到"的困惑。

## compile：反复使用时预编译

\`\`\`python
import re

phone_re = re.compile(r"1[3-9]\\d{9}")

for line in lines:
    if phone_re.search(line):
        print("找到手机号：", phone_re.search(line).group())
\`\`\`

## 一个完整小例子：清洗日志

\`\`\`python
import re

log = """2024-01-15 10:23:01 INFO  用户登录 uid=1001
2024-01-15 10:24:33 ERROR 数据库连接失败 code=500
2024-01-15 10:25:10 INFO  查询完成 耗时=12ms"""

pattern = re.compile(r"(\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2}) (\\w+)\\s+(.*)")

for line in log.splitlines():
    m = pattern.match(line)
    if m:
        time, level, msg = m.groups()
        flag = "❗" if level == "ERROR" else "  "
        print(f"{flag} {time} {msg}")
\`\`\`

> ⚠️ **正则不是万能的**：解析 HTML/JSON 请用专门的库（\`json\`、\`html.parser\`），
> 用正则硬啃嵌套结构会写出没人看得懂的代码。
> 另外正则写复杂了极难维护，够用就好。`,
    },
  ],
};
