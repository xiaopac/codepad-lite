// 第五章：文件与异常（6 小节）
export const ch05FilesErrors = {
  id: 'chapter5',
  title: '第五章：文件与异常',
  sections: [
    {
      id: 'ch5-1',
      title: '文件读写基础',
      content: `## 打开文件的三种模式

| 模式 | 含义 | 文件不存在时 | 会清空原内容吗 |
|------|------|-------------|---------------|
| \`"r"\` | 只读（默认） | ❌ 报 \`FileNotFoundError\` | —— |
| \`"w"\` | 写入 | 自动创建 | ✅ 会清空！ |
| \`"a"\` | 追加 | 自动创建 | ❌ 在末尾接着写 |
| \`"r+"\` | 读写 | 报错 | ❌ |

\`\`\`python
# 写文件
f = open("hello.txt", "w", encoding="utf-8")
f.write("第一行\\n")
f.write("第二行\\n")
f.close()               # ⚠️ 一定要关闭，否则内容可能没落盘

# 读文件
f = open("hello.txt", "r", encoding="utf-8")
content = f.read()      # 一次读全部
print(content)
f.close()
\`\`\`

### \`encoding="utf-8"\`：中文必写

不写编码时，Python 会用操作系统的默认编码（Windows 上常是 GBK），
于是打开 UTF-8 的中文文本就可能报：

\`\`\`
UnicodeDecodeError: 'gbk' codec can't decode byte ...
\`\`\`

**习惯**：只要文件里有中文，就显式写 \`encoding="utf-8"\`。

### 三种读法

\`\`\`python
with open("data.txt", encoding="utf-8") as f:
    text = f.read()          # ① 一次读成一个大字符串

with open("data.txt", encoding="utf-8") as f:
    lines = f.readlines()    # ② 读成列表，每行一个元素（含 \\n）

with open("data.txt", encoding="utf-8") as f:
    for line in f:           # ③ 逐行处理（文件很大时用这种，省内存）
        print(line.rstrip())
\`\`\`

| 方法 | 返回 | 适用 |
|------|------|------|
| \`read()\` | 整个字符串 | 小文件 |
| \`readlines()\` | 字符串列表 | 需要按行随机访问 |
| \`for line in f\` | 一行一行 | ✅ 大文件首选 |
| \`readline()\` | 一行 | 手动控制读取节奏 |

### 写文件的两种方式

\`\`\`python
# 方式一：write 手工加换行
with open("out.txt", "w", encoding="utf-8") as f:
    f.write("第一行\\n")
    f.write("第二行\\n")

# 方式二：writelines + 列表（注意不会自动加换行）
lines = ["第一行\\n", "第二行\\n"]
with open("out.txt", "w", encoding="utf-8") as f:
    f.writelines(lines)
\`\`\`

> ⚠️ **模式 \`w\` 会清空文件**！想在原内容后面追加，用 \`"a"\`。
> 覆盖重要文件前，先备份或先读一遍确认。
>
> 💡 **在本站练习文件操作**：**▶ 运行** 每次都在全新沙箱里跑，程序结束文件就没了，
> 适合"读写一个临时文件看看效果"；想连续操作同一批文件，用 **💻 终端运行**
> （同一个会话里文件会保留，会话结束后清理）。`,
    },
    {
      id: 'ch5-2',
      title: 'with 语句与逐行处理',
      content: `## with：自动关文件（强烈推荐）

\`\`\`python
# ❌ 手动关闭：中间一旦报错，close() 就不会执行
f = open("a.txt", encoding="utf-8")
data = f.read()
f.close()

# ✅ with：离开代码块自动关闭，哪怕中途抛异常
with open("a.txt", encoding="utf-8") as f:
    data = f.read()
\`\`\`

\`with\` 叫**上下文管理器**，它保证"进入时打开、离开时清理"。

### 一次性打开多个文件

\`\`\`python
with open("in.txt", encoding="utf-8") as fin, open("out.txt", "w", encoding="utf-8") as fout:
    for line in fin:
        fout.write(line.upper())
\`\`\`

## 逐行处理的标准写法

\`\`\`python
total = 0
count = 0

with open("scores.txt", encoding="utf-8") as f:
    for line in f:
        line = line.strip()          # 去掉行尾 \\n 和空格
        if not line:                 # 跳过空行
            continue
        total += float(line)
        count += 1

print(f"共 {count} 条，平均 {total / count:.2f}")
\`\`\`

### 处理 CSV 风格的文本

\`\`\`python
# 文件内容：小明,92 / 小红,88
with open("students.txt", encoding="utf-8") as f:
    for line in f:
        line = line.strip()
        if not line:
            continue
        name, score = line.split(",")
        print(f"{name}：{int(score)} 分")
\`\`\`

## 一个完整的小工具：统计文本文件

\`\`\`python
def analyze(path):
    """统计行数、词数、字符数"""
    lines = words = chars = 0

    with open(path, encoding="utf-8") as f:
        for line in f:
            lines += 1
            words += len(line.split())
            chars += len(line)

    print(f"行数 {lines}，词数 {words}，字符数 {chars}")

analyze("article.txt")
\`\`\`

## 大文件注意：别一次读进内存

\`\`\`python
# ❌ 1GB 的日志文件这样读会把内存吃满
with open("big.log", encoding="utf-8") as f:
    all_lines = f.readlines()

# ✅ 一次只处理一行
with open("big.log", encoding="utf-8") as f:
    error_count = 0
    for line in f:
        if "ERROR" in line:
            error_count += 1
    print("错误行数：", error_count)
\`\`\`

### 写大文件同理

\`\`\`python
with open("numbers.txt", "w", encoding="utf-8") as f:
    for i in range(1, 100001):
        f.write(f"{i}\\n")        # 边算边写，不占内存
\`\`\`

> 💡 **\`rstrip()\` 与 \`strip()\` 的区别**：读来的行末尾有 \`\\n\`，
> \`strip()\` 连行首空格一起去，\`rstrip("\\n")\` 只去换行。
> 处理有缩进的文本（如代码文件）时要用 \`rstrip\`。`,
    },
    {
      id: 'ch5-3',
      title: '路径与目录操作',
      content: `## pathlib：现代推荐的路径写法

\`\`\`python
from pathlib import Path

p = Path("data") / "scores.txt"      # 用 / 拼路径，跨平台自动处理分隔符
print(p)                # data/scores.txt

print(p.name)           # scores.txt    文件名
print(p.stem)           # scores        不含扩展名
print(p.suffix)         # .txt          扩展名
print(p.parent)         # data          父目录

print(p.exists())       # 是否存在
print(p.is_file())      # 是否文件
print(p.is_dir())       # 是否目录
\`\`\`

### 读写文件的更短写法

\`\`\`python
from pathlib import Path

p = Path("hello.txt")
p.write_text("你好\\n世界", encoding="utf-8")     # 一行写完
content = p.read_text(encoding="utf-8")           # 一行读完
print(content)
\`\`\`

### 常用操作

\`\`\`python
from pathlib import Path

Path("output").mkdir(exist_ok=True)        # 创建目录（已存在也不报错）
Path("a/b/c").mkdir(parents=True, exist_ok=True)   # 递归创建

for f in Path(".").iterdir():              # 列出当前目录内容
    print(f.name)

for f in Path(".").glob("*.txt"):          # 按模式匹配（当前目录）
    print(f)

for f in Path(".").rglob("*.py"):          # 递归匹配所有子目录
    print(f)
\`\`\`

| 需求 | pathlib 写法 |
|------|-------------|
| 拼路径 | \`Path("a") / "b.txt"\` |
| 列目录 | \`Path(".").iterdir()\` |
| 找文件 | \`Path(".").glob("*.csv")\` |
| 递归找 | \`Path(".").rglob("*.py")\` |
| 改名 | \`p.rename("new.txt")\` |
| 删除文件 | \`p.unlink()\` |
| 文件大小 | \`p.stat().st_size\` |

## 老写法：os.path（看得懂就行）

\`\`\`python
import os

print(os.path.exists("a.txt"))
print(os.path.join("data", "a.txt"))        # data/a.txt（跨平台拼接）
print(os.path.dirname("/tmp/a.txt"))        # /tmp
print(os.listdir("."))                      # 列出目录
print(os.getcwd())                           # 当前工作目录
\`\`\`

新代码优先用 \`pathlib\`——它更直观，路径就是对象，能直接读写和遍历。

## 目录遍历实战：统计代码行数

\`\`\`python
from pathlib import Path

def count_lines(folder):
    total = 0
    files = 0
    for path in Path(folder).rglob("*.py"):
        try:
            with open(path, encoding="utf-8") as f:
                lines = sum(1 for _ in f)
        except (UnicodeDecodeError, PermissionError):
            continue
        total += lines
        files += 1
        print(f"{path}: {lines} 行")
    print(f"—— 共 {files} 个文件，{total} 行")

count_lines(".")
\`\`\`

## 相对路径 vs 绝对路径

\`\`\`python
from pathlib import Path

print(Path("a.txt").resolve())      # 转成绝对路径
print(Path.home())                  # 用户主目录
print(Path.cwd())                   # 当前工作目录
\`\`\`

| 写法 | 含义 | 建议 |
|------|------|------|
| \`"a.txt"\` | 相对当前工作目录 | 简单脚本够用 |
| \`"/home/user/a.txt"\` | 绝对路径 | 部署脚本 |
| \`Path(__file__).parent / "a.txt"\` | 相对**脚本所在目录** | ✅ 最稳 |

\`Path(__file__).parent\` 是"脚本自己所在的目录"，不管从哪里运行脚本都能找到同目录的文件。

> ⚠️ **在沙箱里能写哪些目录**：本站 ▶运行 / 💻终端运行 都只能写沙箱内的目录
> （当前工作目录 \`. \` 或临时目录），写系统目录会 \`PermissionError\`——这是沙箱的正常保护。`,
    },
    {
      id: 'ch5-4',
      title: '异常处理（try / except）',
      content: `## 不处理异常会怎样

\`\`\`python
age = int(input("年龄："))      # 用户输入 "abc"
# ValueError: invalid literal for int() with base 10: 'abc'
# 程序直接崩溃，后面的代码一行都不执行
\`\`\`

## try / except 基本结构

\`\`\`python
try:
    age = int(input("年龄："))
    print(f"明年你 {age + 1} 岁")
except ValueError:
    print("请输入数字！")
\`\`\`

**流程**：\`try\` 里的代码正常执行；一旦抛出异常，立刻跳到对应的 \`except\`，程序继续往下走。

## 完整结构：四个块

\`\`\`python
f = None
try:
    f = open("data.txt", encoding="utf-8")
    content = f.read()
except FileNotFoundError:
    print("文件不存在")
except PermissionError as e:
    print("没有权限：", e)
except Exception as e:              # 兜底（放最后）
    print("出错了：", type(e).__name__, e)
else:
    print("一切正常，内容长度：", len(content))    # 没异常才执行
finally:
    if f:
        f.close()                    # 无论成功失败都释放资源
    print("无论如何都会执行")
\`\`\`

| 块 | 何时执行 | 用途 |
|----|---------|------|
| \`try\` | 总是 | 放可能出错的代码 |
| \`except\` | 出异常时 | 处理错误 |
| \`else\` | 没出异常时 | 后续正常逻辑 |
| \`finally\` | 总是（哪怕 return/崩溃） | 释放资源 |

### 用 with 的话就不需要 finally

\`\`\`python
try:
    with open("data.txt", encoding="utf-8") as f:
        content = f.read()
except FileNotFoundError:
    print("文件不存在")
\`\`\`

### ⚠️ 不要写"裸 except"

\`\`\`python
# ❌ 把所有错误（包括你写错的变量名）都吞掉了，调试时会疯
try:
    do_something()
except:
    pass

# ❌ 太宽泛，同样掩盖问题
except Exception:
    pass

# ✅ 只捕获你预期的那种错误
try:
    score = int(text)
except ValueError:
    score = 0
\`\`\`

**原则**：只捕获"你知道怎么处理"的异常；捕获了就要有动作（提示、兜底值、重试、记录日志），
不要 \`pass\` 一吞了之。

### 多个异常一起捕获

\`\`\`python
try:
    value = data[key]
    result = 100 / int(value)
except (KeyError, ValueError, ZeroDivisionError) as e:
    print("数据有问题：", type(e).__name__)
\`\`\`

### 循环里的异常：让程序更健壮

\`\`\`python
records = ["92", "88", "缺考", "95", ""]
total, count = 0, 0

for r in records:
    try:
        total += float(r)
        count += 1
    except ValueError:
        print(f"跳过无效数据：{r!r}")

print(f"有效 {count} 条，平均 {total / count:.1f}")
\`\`\`

\`{r!r}\` 是 f-string 的 \`repr\` 格式，能把空字符串显示成 \`''\`（否则看不出来）。

> 💡 **先判断再处理**（LBYL）vs **先做再捕获**（EAFP）：
> Python 社区更推崇 **EAFP**（"请求原谅比请求许可容易"）——
> 直接做，出错再处理，代码通常更简洁。但两者混用也很常见，选可读性好的那种。`,
    },
    {
      id: 'ch5-5',
      title: '常见异常与自定义异常',
      content: `## 必认识的异常类型

| 异常 | 触发场景 | 例子 |
|------|---------|------|
| \`ValueError\` | 值不合法 | \`int("abc")\` |
| \`TypeError\` | 类型不对 | \`"a" + 1\` |
| \`KeyError\` | 字典键不存在 | \`d["nonexist"]\` |
| \`IndexError\` | 列表下标越界 | \`[1,2][5]\` |
| \`ZeroDivisionError\` | 除以 0 | \`1 / 0\` |
| \`FileNotFoundError\` | 文件不存在 | \`open("no.txt")\` |
| \`PermissionError\` | 没权限 | 写系统目录 |
| \`AttributeError\` | 对象没有这个属性 | \`None.upper()\` |
| \`NameError\` | 变量没定义 | 拼错变量名 |
| \`ImportError\` | 模块导入失败 | \`import 不存在的库\` |
| \`UnicodeDecodeError\` | 编码不对 | 用 GBK 读 UTF-8 文件 |
| \`RecursionError\` | 递归太深 | 忘记终止条件 |

### 看报错的正确姿势

\`\`\`
Traceback (most recent call last):
  File "main.py", line 8, in <module>
    print(100 / int(text))
ZeroDivisionError: division by zero
\`\`\`

- **从下往上看**：最后一行是**异常类型 + 原因**，最关键；
- 往上是**调用栈**：哪个文件、哪一行触发的；
- 把最后一行丢进搜索引擎，几乎都能找到答案。

## raise：主动抛出异常

\`\`\`python
def set_age(age):
    if age < 0 or age > 150:
        raise ValueError(f"年龄不合法：{age}")
    return age

set_age(-5)
# ValueError: 年龄不合法：-5
\`\`\`

**什么时候主动 raise**：函数收到了自己无法处理、也不该默默忍受的输入。
这比返回 \`None\` 让调用者猜要清楚得多。

### 重新抛出（记录后继续传）

\`\`\`python
def load_config(path):
    try:
        with open(path, encoding="utf-8") as f:
            return f.read()
    except FileNotFoundError:
        print(f"[警告] 配置文件缺失：{path}")
        raise                    # 再抛出去，让上层决定怎么办
\`\`\`

## 自定义异常

\`\`\`python
class BalanceError(Exception):
    """余额不足"""
    def __init__(self, needed, current):
        self.needed = needed
        self.current = current
        super().__init__(f"余额不足：需要 {needed}，当前 {current}")

class BankAccount:
    def __init__(self, balance=0):
        self.balance = balance

    def withdraw(self, amount):
        if amount > self.balance:
            raise BalanceError(amount, self.balance)
        self.balance -= amount
        return self.balance

account = BankAccount(100)
try:
    account.withdraw(500)
except BalanceError as e:
    print(e)                 # 余额不足：需要 500，当前 100
    print("还差", e.needed - e.current)
\`\`\`

自定义异常的好处：

1. **名字说明问题**：\`BalanceError\` 比 \`ValueError\` 清楚得多；
2. **能带额外信息**：需要多少、当前多少；
3. **可以精确捕获**：\`except BalanceError\` 不会误伤别的错误。

## assert：调试用的断言

\`\`\`python
def average(nums):
    assert len(nums) > 0, "列表不能为空"     # 条件为假就抛 AssertionError
    return sum(nums) / len(nums)
\`\`\`

> ⚠️ \`assert\` 是**开发期自检**用的，用 \`python -O\` 运行时会被优化掉，
> **不要用它做用户输入校验**——那种情况用 \`if + raise\`。

> 💡 **异常处理的目标**：不是"让程序永远不报错"，而是
> **在预期内的错误上给出友好提示，同时不让真正的 bug 被掩盖**。`,
    },
    {
      id: 'ch5-6',
      title: 'JSON 与 CSV 实战',
      content: `## JSON：程序之间交换数据的通用格式

JSON 长得就像 Python 的字典和列表：

\`\`\`json
{
  "name": "小明",
  "age": 18,
  "hobbies": ["编程", "篮球"],
  "address": { "city": "北京" }
}
\`\`\`

\`\`\`python
import json

# Python 对象 → JSON 字符串
person = {"name": "小明", "age": 18, "hobbies": ["编程", "篮球"]}
text = json.dumps(person, ensure_ascii=False, indent=2)
print(text)
# {
#   "name": "小明",
#   "age": 18,
#   "hobbies": ["编程", "篮球"]
# }
\`\`\`

| 参数 | 作用 |
|------|------|
| \`ensure_ascii=False\` | 中文正常显示（否则变成 \`\\u5c0f\\u660e\`） |
| \`indent=2\` | 缩进美化，方便人看 |
| \`sort_keys=True\` | 键排序，输出稳定 |

\`\`\`python
# JSON 字符串 → Python 对象
data = json.loads(text)
print(data["name"])           # 小明
print(data["hobbies"][0])     # 编程
\`\`\`

### 直接读写 JSON 文件

\`\`\`python
import json

config = {"theme": "dark", "font_size": 16, "recent": ["a.py", "b.py"]}

# 写
with open("config.json", "w", encoding="utf-8") as f:
    json.dump(config, f, ensure_ascii=False, indent=2)

# 读
with open("config.json", encoding="utf-8") as f:
    loaded = json.load(f)

print(loaded["theme"])        # dark
loaded["font_size"] = 18      # 改完可以再写回去
\`\`\`

> ⚠️ **\`dumps/loads\` 与 \`dump/load\` 的区别**（多一个 s = string）：
> 带 \`s\` 的处理**字符串**，不带的处理**文件对象**。

### 处理损坏的 JSON

\`\`\`python
try:
    with open("config.json", encoding="utf-8") as f:
        config = json.load(f)
except FileNotFoundError:
    config = {}                      # 首次运行：用默认配置
except json.JSONDecodeError as e:
    print("配置文件损坏，已重置：", e)
    config = {}
\`\`\`

### JSON 与 Python 的类型对应

| JSON | Python |
|------|--------|
| object \`{}\` | dict |
| array \`[]\` | list |
| string \`""\` | str |
| number | int / float |
| true / false | True / False |
| null | None |

## CSV：表格数据的通用格式

\`\`\`csv
姓名,语文,数学
小明,92,88
小红,85,95
\`\`\`

\`\`\`python
import csv

# 读 CSV
with open("scores.csv", encoding="utf-8", newline="") as f:
    reader = csv.reader(f)
    header = next(reader)                 # 第一行是表头
    print("列：", header)

    for row in reader:
        name, chinese, math = row
        print(f"{name}：语文 {chinese}，数学 {math}，总分 {int(chinese) + int(math)}")
\`\`\`

\`newline=""\` 是官方推荐写法，避免 Windows 下多出空行。

### 用字典方式读写（更直观）

\`\`\`python
import csv

# 读：每行变成字典，用列名取值
with open("scores.csv", encoding="utf-8", newline="") as f:
    for row in csv.DictReader(f):
        print(row["姓名"], row["数学"])

# 写
rows = [
    {"姓名": "小明", "语文": 92, "数学": 88},
    {"姓名": "小红", "语文": 85, "数学": 95},
]
with open("out.csv", "w", encoding="utf-8", newline="") as f:
    writer = csv.DictWriter(f, fieldnames=["姓名", "语文", "数学"])
    writer.writeheader()
    writer.writerows(rows)
\`\`\`

> 💡 **Windows 上打开 CSV 中文乱码**：用 Excel 打开 UTF-8 的 CSV 可能显示乱码，
> 加 \`encoding="utf-8-sig"\` 写文件即可（带 BOM，Excel 就认了）。

## 综合实战：成绩统计并输出报告

\`\`\`python
import csv
import json

def load_scores(path):
    students = []
    with open(path, encoding="utf-8", newline="") as f:
        for row in csv.DictReader(f):
            students.append({
                "name": row["姓名"],
                "total": int(row["语文"]) + int(row["数学"]),
            })
    return students

def summarize(students):
    students.sort(key=lambda s: s["total"], reverse=True)
    avg = sum(s["total"] for s in students) / len(students)
    return {
        "count": len(students),
        "average": round(avg, 1),
        "top": students[0]["name"],
        "ranking": students,
    }

students = load_scores("scores.csv")
report = summarize(students)

print(json.dumps(report, ensure_ascii=False, indent=2))

with open("report.json", "w", encoding="utf-8") as f:
    json.dump(report, f, ensure_ascii=False, indent=2)

print("报告已写入 report.json")
\`\`\`

> 🎯 **本章小结**：**读写文件用 \`with\` + \`encoding="utf-8"\`**、
> **路径用 \`pathlib\`**、**只捕获你认识的异常**、**交换数据用 \`json\`、表格用 \`csv\`**。
> 这四条覆盖了日常 90% 的"和文件打交道"的需求。`,
    },
  ],
};
