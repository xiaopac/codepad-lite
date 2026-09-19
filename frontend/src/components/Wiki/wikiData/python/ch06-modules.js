// 第六章：模块、标准库与第三方库（6 小节）
export const ch06Modules = {
  id: 'chapter6',
  title: '第六章：模块与标准库',
  sections: [
    {
      id: 'ch6-1',
      title: '模块与 import',
      content: `## 模块就是一个 .py 文件

你已经用过很多次了：

\`\`\`python
import math
print(math.sqrt(16))       # 4.0

from random import randint
print(randint(1, 6))       # 1~6 的随机数

import datetime as dt
print(dt.date.today())
\`\`\`

| 写法 | 用法 | 适用 |
|------|------|------|
| \`import math\` | \`math.sqrt(4)\` | ✅ 推荐：来源清晰 |
| \`from math import sqrt\` | \`sqrt(4)\` | 常用函数少时 |
| \`from math import *\` | \`sqrt(4)\` | ❌ 别用：污染命名空间 |
| \`import numpy as np\` | \`np.array(...)\` | 社区惯例（np/pd/plt） |

> 💡 **为什么推荐 \`import math\`**：读代码时一眼看出 \`sqrt\` 来自 math，
> 而且不会和你自己的函数重名。

## 自己写模块

新建 \`utils.py\`：

\`\`\`python
# utils.py
def add(a, b):
    return a + b

PI = 3.14159
\`\`\`

同目录下的 \`main.py\` 就能用：

\`\`\`python
# main.py
import utils

print(utils.add(1, 2))     # 3
print(utils.PI)            # 3.14159
\`\`\`

## \`__name__ == "__main__"\`：模块的"双面人生"

\`\`\`python
# utils.py
def add(a, b):
    return a + b

if __name__ == "__main__":
    # 只有"直接运行本文件"时才执行；被 import 时不执行
    print(add(1, 2))
\`\`\`

| 运行方式 | \`__name__\` 的值 |
|---------|-----------------|
| \`python utils.py\` | \`"__main__"\` |
| \`import utils\` | \`"utils"\` |

**作用**：让文件既能当脚本跑，又能当模块被别人导入，两种用法互不干扰。
这是 Python 最经典的写法之一，建议每个文件都加上。

## 包：把多个模块放进文件夹

\`\`\`
myproject/
├── main.py
└── tools/
    ├── __init__.py        # 有这个文件才叫"包"（Python 3.3+ 可省略，但建议保留）
    ├── math_utils.py
    └── text_utils.py
\`\`\`

\`\`\`python
# main.py
from tools import math_utils
from tools.text_utils import clean

print(math_utils.add(1, 2))
print(clean("  hi  "))
\`\`\`

## 模块搜索路径

\`import\` 时 Python 按顺序找：

1. **当前脚本所在目录**；
2. 环境变量 \`PYTHONPATH\` 里的目录；
3. **标准库**目录；
4. **第三方库**目录（site-packages，即 pip 装的库）。

所以：**自己写的模块名不要和标准库重名**。
如果文件叫 \`random.py\`，那 \`import random\` 导入的就是你自己的文件，
标准库反而用不了（这是新手常见"灵异事件"）。

\`\`\`python
import sys
print(sys.path)      # 看看实际的搜索路径列表
\`\`\`

> ⚠️ **在本站注意**：▶运行 每次都是全新沙箱，**多文件项目要放在同一个项目里**
> （工作区左侧可以建多个文件），运行时平台会把它们一起放进沙箱目录，
> \`import\` 自己的模块才能成功。`,
    },
    {
      id: 'ch6-2',
      title: '常用标准库（一）：math / random / statistics',
      content: `## math：数学函数

\`\`\`python
import math

print(math.sqrt(16))        # 4.0     平方根
print(math.pow(2, 10))      # 1024.0  幂（返回浮点）
print(2 ** 10)              # 1024    更常用
print(math.floor(3.7))      # 3       向下取整
print(math.ceil(3.2))       # 4       向上取整
print(abs(-5))              # 5       绝对值（内置函数，不用 import）
print(round(3.14159, 2))    # 3.14    四舍五入（内置）
print(math.pi, math.e)      # 3.141592653589793 2.718281828459045
print(math.factorial(5))    # 120     阶乘
print(math.gcd(12, 18))     # 6       最大公约数
print(math.hypot(3, 4))     # 5.0     直角三角形斜边
\`\`\`

| 需求 | 写法 |
|------|------|
| 平方根 | \`math.sqrt(x)\` 或 \`x ** 0.5\` |
| 向下取整 | \`math.floor(x)\` → 返回 int |
| 四舍五入 | \`round(x, n)\` |
| 绝对值 | \`abs(x)\` |
| 最大/最小 | \`max(...)\` / \`min(...)\` |
| 求和 | \`sum(列表)\` |
| 常量 | \`math.pi\` / \`math.e\` |

## random：随机数

\`\`\`python
import random

print(random.random())              # 0.0 <= x < 1.0 的浮点
print(random.randint(1, 6))         # 1~6 的整数（含两端）→ 掷骰子
print(random.uniform(1, 10))        # 1~10 的浮点

# 从序列里选
fruits = ["苹果", "香蕉", "橘子"]
print(random.choice(fruits))        # 随机一个
print(random.sample(fruits, 2))     # 随机选 2 个（不重复）

# 打乱顺序（原地打乱）
cards = list(range(1, 11))
random.shuffle(cards)
print(cards)

# 抽奖：按权重
print(random.choices(["一等奖", "二等奖", "谢谢参与"], weights=[1, 3, 96])[0])
\`\`\`

### 随机种子：让结果可复现

\`\`\`python
random.seed(42)          # 固定种子
print(random.randint(1, 100))    # 每次运行都是同一个数
\`\`\`

调试抽奖、洗牌这类逻辑时，固定种子能让"偶发 bug"稳定复现。

### 经典小游戏：猜数字

\`\`\`python
import random

answer = random.randint(1, 100)
tries = 0

while True:
    guess = int(input("猜一个 1~100 的数："))
    tries += 1
    if guess < answer:
        print("小了")
    elif guess > answer:
        print("大了")
    else:
        print(f"猜对了！共用了 {tries} 次")
        break
\`\`\`

## statistics：统计（更专业）

\`\`\`python
import statistics

data = [85, 92, 78, 92, 88, 95]

print(statistics.mean(data))        # 88.33...  平均值
print(statistics.median(data))      # 90        中位数
print(statistics.mode(data))        # 92        众数（出现最多的）
print(statistics.stdev(data))       # 6.15...   标准差
print(statistics.variance(data))    # 37.86...  方差
\`\`\`

| 指标 | 含义 | 什么时候用 |
|------|------|-----------|
| 平均数 \`mean\` | 总和 / 个数 | 常规统计 |
| 中位数 \`median\` | 排序后中间那个 | 有极端值（如收入）时更公平 |
| 众数 \`mode\` | 出现最多的值 | 最受欢迎选项 |
| 标准差 \`stdev\` | 数据离散程度 | 成绩是否两极分化 |

> 💡 **平均数 vs 中位数**：\`[1, 2, 3, 4, 1000]\` 的平均数是 202，
> 中位数是 3。分析"人均收入"这类数据时，中位数往往更接近真实感受。`,
    },
    {
      id: 'ch6-3',
      title: '常用标准库（二）：datetime / time / os / sys',
      content: `## datetime：日期与时间

\`\`\`python
from datetime import datetime, date, timedelta

now = datetime.now()
print(now)                          # 2024-05-20 14:30:05.123456
print(now.year, now.month, now.day) # 2024 5 20
print(now.hour, now.minute, now.second)
print(now.strftime("%Y-%m-%d %H:%M:%S"))     # 格式化输出
print(now.strftime("%Y年%m月%d日 星期%w"))    # 2024年05月20日 星期1

today = date.today()
print(today)                        # 2024-05-20

# 日期计算
tomorrow = today + timedelta(days=1)
print(tomorrow)
print((tomorrow - today).days)      # 1

# 字符串 → 日期
d = datetime.strptime("2024-05-20", "%Y-%m-%d")
print(d.year)                       # 2024
\`\`\`

### 格式符号速查

| 符号 | 含义 | 例子 |
|------|------|------|
| \`%Y\` | 四位年 | 2024 |
| \`%m\` | 月（补零） | 05 |
| \`%d\` | 日（补零） | 20 |
| \`%H\` \`%M\` \`%S\` | 时 分 秒（24 小时制） | 14:30:05 |
| \`%A\` / \`%w\` | 星期名 / 星期数字 | Monday / 1 |

### 计算程序耗时

\`\`\`python
import time

start = time.time()
total = sum(range(1_000_000))
end = time.time()

print(f"耗时 {end - start:.3f} 秒")
\`\`\`

\`1_000_000\` 里的下划线只是给人读的，等价于 \`1000000\`。

更精确的计时用 \`time.perf_counter()\`。

\`\`\`python
import time
time.sleep(1.5)      # 暂停 1.5 秒（做动画、限速时用）
\`\`\`

## os：与操作系统打交道

\`\`\`python
import os

print(os.getcwd())                     # 当前工作目录
print(os.listdir("."))                 # 列出目录内容
os.makedirs("output/logs", exist_ok=True)   # 递归创建目录

# 环境变量（读取配置的常见方式）
print(os.environ.get("PATH", "")[:40])
print(os.environ.get("MY_KEY", "未设置"))     # 取不到给默认值

# 路径拼接（跨平台）
path = os.path.join("data", "2024", "a.txt")
print(path)
print(os.path.basename(path), os.path.dirname(path))
\`\`\`

> 💡 新代码优先用第五章讲的 \`pathlib\`，比 \`os.path\` 更直观。
> \`os.environ\` 在部署脚本里非常常用（读取数据库密码等敏感配置）。

## sys：解释器相关

\`\`\`python
import sys

print(sys.version)              # Python 版本
print(sys.argv)                 # 命令行参数列表
\`\`\`

### 命令行参数：写可复用脚本的关键

\`\`\`python
# 文件 save.py
import sys

if len(sys.argv) < 3:
    print("用法：python save.py <文件名> <内容>")
    sys.exit(1)                 # 非 0 退出码 = 出错

filename, content = sys.argv[1], sys.argv[2]
with open(filename, "w", encoding="utf-8") as f:
    f.write(content)
print(f"已写入 {filename}")
\`\`\`

在终端里：

\`\`\`bash
python3 save.py note.txt "你好"
# 已写入 note.txt
\`\`\`

\`sys.argv[0]\` 是脚本名本身，所以真正的参数从 \`[1]\` 开始。

| 需求 | 写法 |
|------|------|
| 退出程序 | \`sys.exit(0)\`（0=正常，非 0=异常） |
| 读参数 | \`sys.argv[1:]\` |
| 看版本 | \`sys.version_info >= (3, 10)\` |
| 改递归深度 | \`sys.setrecursionlimit(5000)\` |

> ⚠️ **本站的 ▶运行 不支持命令行参数**（平台按固定命令执行），
> 想练 \`sys.argv\` 请用 **💻 终端运行**，在里面直接敲
> \`python3 save.py note.txt "你好"\` 就能看到效果。`,
    },
    {
      id: 'ch6-4',
      title: '常用标准库（三）：collections / itertools / functools',
      content: `## collections：更趁手的容器

### Counter：一行完成词频统计

\`\`\`python
from collections import Counter

words = "apple banana apple cherry apple banana".split()
c = Counter(words)

print(c)                        # Counter({'apple': 3, 'banana': 2, 'cherry': 1})
print(c.most_common(2))         # [('apple', 3), ('banana', 2)]
print(c["apple"])               # 3
print(c["不存在的"])             # 0（不会 KeyError）

# 统计字符串里每个字符
print(Counter("hello"))         # Counter({'l': 2, 'h': 1, 'e': 1, 'o': 1})

# 两个计数器还能做集合运算
a = Counter("aabbb")
b = Counter("abbcc")
print(a + b)                    # 相加
print(a - b)                    # 相减（只保留正数）
\`\`\`

### defaultdict：不用先判断键是否存在

\`\`\`python
from collections import defaultdict

groups = defaultdict(list)      # 值默认是空列表
for name, cls in [("小明", "一班"), ("小红", "二班"), ("小刚", "一班")]:
    groups[cls].append(name)

print(dict(groups))     # {'一班': ['小明', '小刚'], '二班': ['小红']}

counts = defaultdict(int)       # 值默认是 0
for ch in "hello":
    counts[ch] += 1
print(dict(counts))
\`\`\`

### deque：两头都能快速进出的队列

\`\`\`python
from collections import deque

q = deque([1, 2, 3])
q.append(4)          # 右进
q.appendleft(0)      # 左进
print(q)             # deque([0, 1, 2, 3, 4])
print(q.popleft())   # 0 左出
print(q.pop())       # 4 右出

# 固定长度的滑动窗口（做均值、限流很好用）
recent = deque(maxlen=3)
for i in range(1, 6):
    recent.append(i)
    print(list(recent))
# [1] [1,2] [1,2,3] [2,3,4] [3,4,5]
\`\`\`

## itertools：优雅地处理序列

\`\`\`python
import itertools

# 累加（类似前缀和）
print(list(itertools.accumulate([1, 2, 3, 4])))     # [1, 3, 6, 10]

# 分组（按相邻相同元素分组）
data = [("水果", "苹果"), ("水果", "香蕉"), ("蔬菜", "白菜")]
for key, group in itertools.groupby(data, key=lambda x: x[0]):
    print(key, [g[1] for g in group])
# 水果 ['苹果', '香蕉']
# 蔬菜 ['白菜']

# 排列组合
print(list(itertools.permutations([1, 2, 3], 2)))   # 排列
print(list(itertools.combinations([1, 2, 3], 2)))   # 组合

# 笛卡尔积
print(list(itertools.product([1, 2], "ab")))
# [(1,'a'), (1,'b'), (2,'a'), (2,'b')]
\`\`\`

## functools：函数工具箱

### lru_cache：缓存计算结果（性能利器）

\`\`\`python
from functools import lru_cache
import time

@lru_cache(maxsize=None)
def fib(n):
    if n <= 2:
        return 1
    return fib(n - 1) + fib(n - 2)

start = time.time()
print(fib(200))                 # 瞬间出结果
print(f"耗时 {time.time() - start:.6f} 秒")
\`\`\`

没有缓存时 \`fib(35)\` 就要好几秒，加了 \`@lru_cache\` 后 \`fib(200)\` 都是瞬间——
这是第三章提过的"记忆化"。

### reduce：两两合并

\`\`\`python
from functools import reduce

nums = [1, 2, 3, 4]
print(reduce(lambda a, b: a * b, nums))     # 24  连乘
\`\`\`

### partial：固定部分参数

\`\`\`python
from functools import partial

def power(base, exp):
    return base ** exp

square = partial(power, exp=2)
print(square(5))        # 25
\`\`\`

| 模块 | 最值得记住的 |
|------|------------|
| \`collections\` | \`Counter\`（计数）、\`defaultdict\`（免判断）、\`deque\`（双端队列） |
| \`itertools\` | \`accumulate\`、\`combinations\`、\`product\` |
| \`functools\` | \`lru_cache\`（缓存）、\`reduce\`、\`partial\` |

> 💡 **别急着背**：这些库的价值在于"知道有这么个东西"。
> 需要计数时想起 \`Counter\`，需要缓存时想起 \`lru_cache\`，就足够了。`,
    },
    {
      id: 'ch6-5',
      title: '第三方库与 pip',
      content: `## pip：Python 的"应用商店"

\`\`\`bash
pip install requests           # 安装
pip install requests==2.31.0   # 安装指定版本
pip install --upgrade requests # 升级
pip uninstall requests         # 卸载
pip list                       # 列出已安装
pip show requests              # 查看详情
\`\`\`

国内下载慢可以换镜像源：

\`\`\`bash
pip install numpy -i https://pypi.tuna.tsinghua.edu.cn/simple
\`\`\`

## 值得认识的主流库

| 库 | 干什么 | 一行示例 |
|----|--------|---------|
| \`requests\` | 发 HTTP 请求（爬虫/调 API） | \`requests.get(url).json()\` |
| \`numpy\` | 数值计算、矩阵运算 | \`np.array([1,2,3])\` |
| \`pandas\` | 表格数据分析 | \`pd.read_csv("a.csv")\` |
| \`matplotlib\` | 画图（折线/柱状/散点） | \`plt.plot(x, y)\` |
| \`beautifulsoup4\` | 解析 HTML | \`BeautifulSoup(html)\` |
| \`pillow\` | 图像处理 | \`Image.open("a.png")\` |
| \`openpyxl\` | 读写 Excel | \`load_workbook("a.xlsx")\` |
| \`pygame\` | 2D 游戏开发 | 见第八章 |
| \`pyinstaller\` | 打包成 exe | \`pyinstaller main.py\` |

## 本站怎么用第三方库（重点）

本站有**两套环境**，装库方式不同，别搞混：

### 方式一：自定义环境 → 作用于「▶ 运行」

1. 项目列表页 → **🧪 Python 环境** → 新建环境；
2. 选择 Python 版本（3.9 / 3.10 / 3.11）；
3. 在文本框里**每行写一个库名**（如 \`numpy\`、\`requests\`、\`pandas\`）；
4. 点创建，后台会自动 pip 安装（可在环境卡片查看构建日志）；
5. 回到工作区，打开 \`.py\` 文件，用工具栏 **🐍 环境** 下拉绑定这个环境；
6. 之后点 **▶ 运行** 就能 \`import numpy\` 了。

\`\`\`python
# 绑定好环境后（比如装了 numpy）
import numpy as np
print(np.arange(5) * 2)     # [0 2 4 6 8]
\`\`\`

### 方式二：终端沙箱 → 作用于「💻 终端运行」

终端跑在固定的沙箱镜像里（Python 3.11），**不读**你的自定义环境。
点终端面板的 **ⓘ 沙箱** 可以看到里面已经有什么：

- 内置：\`pygame\`、\`tkinter\`、\`g++\` / \`gcc\` / \`make\`；
- 缺的库：请管理员在后台 **🧪 沙箱库** 里添加（会显示安装日志）。

\`\`\`python
# 终端里直接可用（沙箱已预装 pygame）
import pygame
print(pygame.version.ver)
\`\`\`

| 你想做什么 | 用哪个 | 第三方库从哪来 |
|-----------|--------|--------------|
| 跑算法题、数据处理 | ▶ 运行 | 自己配的「Python 环境」 |
| 交互式实验、\`input()\`、图形窗口 | 💻 终端运行 | 沙箱内置 + 管理员添加 |
| 装一个新的库 | 环境管理（▶）或找管理员（💻） | —— |

> ⚠️ **在沙箱里 pip install 是不行的**：沙箱只有内网，装不了库。
> 这是我们刻意做的安全设计（你的代码跑不出外网）。
>
> 💡 **只装需要的库**：第三方库会占用你的存储配额，
> 数据分析三件套（numpy / pandas / matplotlib）加起来就有上百 MB。`,
    },
    {
      id: 'ch6-6',
      title: '虚拟环境与依赖管理',
      content: `## 为什么需要虚拟环境

假设你有两个项目：

- 项目 A 需要 \`requests 2.25\`
- 项目 B 需要 \`requests 2.31\`

如果全装在一个 Python 里，只能留一个版本 —— 必有一个项目跑不起来。
**虚拟环境**就是给每个项目配一个独立的库目录。

\`\`\`
项目A/venv/  →  requests 2.25
项目B/venv/  →  requests 2.31
系统 Python   →  互不影响
\`\`\`

## venv：标准库自带

\`\`\`bash
# 在项目目录里创建虚拟环境（会生成 venv 文件夹）
python -m venv venv

# 激活
source venv/bin/activate        # macOS / Linux
venv\\Scripts\\activate           # Windows PowerShell

# 激活后命令行前面会出现 (venv)，此时 pip install 只装进这个环境
pip install requests

# 退出
deactivate
\`\`\`

## requirements.txt：记录依赖

\`\`\`bash
# 导出当前环境的依赖清单
pip freeze > requirements.txt

# 别人（或服务器）一键安装
pip install -r requirements.txt
\`\`\`

\`requirements.txt\` 长这样：

\`\`\`
requests==2.31.0
numpy==1.26.4
pandas==2.2.0
\`\`\`

**为什么必须写版本号**：不写的话，半年后别人装到的是新版本，
可能因为不兼容而报错。

| 写法 | 含义 |
|------|------|
| \`requests\` | 任意版本（不推荐） |
| \`requests==2.31.0\` | 精确版本 ✅ |
| \`requests>=2.28\` | 最低版本 |

## 本站的「Python 环境」就是云端 venv

对照一下就明白了：

| 本地做法 | 本站对应功能 |
|---------|-------------|
| \`python -m venv venv\` | 新建一个「Python 环境」 |
| 选择 Python 版本 | 环境里选 3.9 / 3.10 / 3.11 |
| \`pip install numpy\` | 环境创建时每行填一个库名 |
| \`source venv/bin/activate\` | 工具栏用 🐍 环境 下拉绑定到项目 |
| \`requirements.txt\` | 环境里的库列表（界面直接看得到） |
| 换电脑重装一遍 | 云端环境跟着账号走，换设备直接可用 |

好处是不用折腾本地环境，iPad 上也能有完整的库。

## 依赖管理的好习惯

1. **一个项目一个环境**：别把所有库都装在全局；
2. **记录版本号**：\`requirements.txt\` 或环境的库列表；
3. **提交到仓库**：让别人能复现你的环境（虚拟环境目录本身不要提交）；
4. **定期更新**：\`pip list --outdated\` 看看有没有安全更新；
5. **少即是多**：只装真正要用的库，减少冲突和体积。

### .gitignore 里该写什么

\`\`\`
venv/
__pycache__/
*.pyc
.env
\`\`\`

\`__pycache__\` 是字节码缓存（第一章提过），不需要提交。

> 💡 **遇到"在我电脑上能跑"**：十有八九是环境不一致。
> 养成写 \`requirements.txt\` 的习惯能省下大量排查时间。
>
> ⚠️ **本站环境构建失败怎么办**：环境卡片上会显示失败原因与 pip 日志，
> 常见原因是**库名拼错**（如把 \`requests\` 写成 \`request\`）或
> **该库没有对应的预编译包**。改对名字后点「↻ 重建」即可。`,
    },
  ],
};
