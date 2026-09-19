// 第二章：列表、元组、字典与集合（7 小节）
export const ch02Collections = {
  id: 'chapter2',
  title: '第二章：列表·元组·字典',
  sections: [
    {
      id: 'ch2-1',
      title: '列表 list 基础',
      content: `## 一次装一批数据

前面的变量一次只能装一个值。要存全班 50 个成绩怎么办？——用**列表**。

\`\`\`python
scores = [92, 85, 78, 96, 60]
names = ["小明", "小红", "小刚"]
mixed = [1, "文字", 3.14, True]      # 类型可以混着放（但不建议）
empty = []                            # 空列表

print(scores)          # [92, 85, 78, 96, 60]
print(len(scores))     # 5   长度
print(scores[0])       # 92  下标从 0 开始！
print(scores[-1])      # 60  负数下标 = 从右往左数
\`\`\`

### 下标规则（新手最容易错的地方）

| 列表 \`[92, 85, 78, 96, 60]\` | 下标 |
|------|------|
| 92 | \`0\` 或 \`-5\` |
| 85 | \`1\` 或 \`-4\` |
| 78 | \`2\` 或 \`-3\` |
| 96 | \`3\` 或 \`-2\` |
| 60 | \`4\` 或 \`-1\` |

访问不存在的下标会报 \`IndexError: list index out of range\`。
**最后一个元素永远可以用 \`[-1]\` 拿到**，不用去算长度。

### 修改元素

\`\`\`python
scores = [92, 85, 78]
scores[1] = 90          # 直接改
print(scores)           # [92, 90, 78]
\`\`\`

### 切片：一次取一段

\`\`\`python
nums = [10, 20, 30, 40, 50]

print(nums[1:4])     # [20, 30, 40]   下标 1 到 3（不含 4）
print(nums[:3])      # [10, 20, 30]   从头开始可省略
print(nums[2:])      # [30, 40, 50]   到结尾可省略
print(nums[:])       # 全部（这是复制一份！）
print(nums[::2])     # [10, 30, 50]   步长 2
print(nums[::-1])    # [50, 40, 30, 20, 10]  反转
\`\`\`

**口诀**：\`[起点:终点:步长]\`，**含起点、不含终点**。

### 判断元素是否存在

\`\`\`python
if 85 in scores:
    print("有 85 分")

if "小刚" not in names:
    print("小刚不在名单里")
\`\`\`

### 嵌套列表（二维表）

\`\`\`python
matrix = [
    [1, 2, 3],
    [4, 5, 6],
]
print(matrix[0][1])      # 2   第 0 行第 1 列
print(matrix[1])         # [4, 5, 6]

# 遍历二维列表
for row in matrix:
    for value in row:
        print(value, end=" ")
    print()
\`\`\`

> 💡 **列表可以装任何东西**：数字、字符串、其他列表，甚至函数。
> "列表套字典"是 Python 处理表格数据的标准姿势（本章第 5 节讲）。`,
    },
    {
      id: 'ch2-2',
      title: '列表常用方法与排序',
      content: `## 增删改查一表看懂

| 操作 | 方法 | 例子 | 结果 |
|------|------|------|------|
| 末尾添加 | \`append(x)\` | \`a.append(4)\` | \`[1,2,3,4]\` |
| 末尾删除并返回 | \`pop()\` | \`a.pop()\` → 4 | \`[1,2,3]\` |
| 指定位置插入 | \`insert(i, x)\` | \`a.insert(0, 0)\` | \`[0,1,2,3]\` |
| 按值删除 | \`remove(x)\` | \`a.remove(2)\` | \`[1,3]\` |
| 按下标删除 | \`del a[i]\` / \`pop(i)\` | \`del a[0]\` | \`[2,3]\` |
| 清空 | \`clear()\` | \`a.clear()\` | \`[]\` |
| 查找下标 | \`index(x)\` | \`a.index(3)\` → 2 | 找不到报错 |
| 统计次数 | \`count(x)\` | \`a.count(1)\` | \`1\` |
| 合并另一个列表 | \`extend(b)\` | \`a.extend([9])\` | 追加多项 |

\`\`\`python
a = [1, 2, 3]
a.append(4)          # [1, 2, 3, 4]      加一个
a.extend([5, 6])     # [1, 2, 3, 4, 5, 6] 加一批
a.insert(0, 0)       # [0, 1, 2, 3, 4, 5, 6]
a.remove(3)          # 删除值 3（删除第一个匹配项）
last = a.pop()       # 弹出末尾（返回被删的值）

# ⚠️ append 和 extend 的区别（高频错误）
b = [1, 2]
b.append([3, 4])     # [1, 2, [3, 4]]  把列表当成一个元素塞进去
c = [1, 2]
c.extend([3, 4])     # [1, 2, 3, 4]    把元素逐个加进去
\`\`\`

### 排序：sort 与 sorted

\`\`\`python
nums = [3, 1, 4, 1, 5]

nums.sort()                  # 原地排序（改变 nums 本身）
print(nums)                  # [1, 1, 3, 4, 5]

nums.sort(reverse=True)      # 从大到小
print(nums)                  # [5, 4, 3, 1, 1]

original = [3, 1, 4]
new = sorted(original)       # 返回新列表，原列表不动
print(original, new)         # [3, 1, 4] [1, 3, 4]
\`\`\`

| 写法 | 是否改变原列表 | 返回值 |
|------|--------------|--------|
| \`a.sort()\` | ✅ 改变 | \`None\`（⚠️ 别写 \`b = a.sort()\`） |
| \`sorted(a)\` | ❌ 不变 | 排好序的新列表 |

### 按自定义规则排序：key 参数

\`\`\`python
words = ["banana", "kiwi", "apple"]
print(sorted(words, key=len))          # ['kiwi', 'apple', 'banana'] 按长度
print(sorted(words, key=str.lower))    # 忽略大小写

students = [
    {"name": "小明", "score": 92},
    {"name": "小红", "score": 88},
    {"name": "小刚", "score": 95},
]
by_score = sorted(students, key=lambda s: s["score"], reverse=True)
for s in by_score:
    print(s["name"], s["score"])
\`\`\`

\`key\` 接收一个函数，返回"排序依据"。这里用了 \`lambda\`（第三章详讲）。

### 反转与其他常用操作

\`\`\`python
a = [1, 2, 3]
a.reverse()                # 原地反转
print(a)                   # [3, 2, 1]

print([1, 2] + [3, 4])     # [1, 2, 3, 4] 拼接成新列表
print([0] * 3)             # [0, 0, 0]     重复
print(sum([1, 2, 3]))      # 6
print(max([1, 5, 3]), min([1, 5, 3]))   # 5 1
\`\`\`

> ⚠️ **\`a = b\` 不是复制！** 它们指向同一个列表：
> \`\`\`python
> a = [1, 2]
> b = a
> b.append(3)
> print(a)     # [1, 2, 3]   a 也变了！
> \`\`\`
> 要复制请用 \`b = a.copy()\` 或 \`b = a[:]\`（第 7 节细讲深浅拷贝）。`,
    },
    {
      id: 'ch2-3',
      title: '元组 tuple 与解包',
      content: `## 上了锁的列表

元组（tuple）和列表几乎一样，唯一的区别是：**创建后不能修改**。

\`\`\`python
point = (3, 5)
rgb = (255, 128, 0)
single = (42,)          # ⚠️ 单个元素必须带逗号，否则不是元组！
not_tuple = (42)        # 这就是整数 42

print(point[0])         # 3    读取和列表一样
print(len(rgb))         # 3
# point[0] = 9          # ❌ TypeError: 'tuple' object does not support item assignment
\`\`\`

### 为什么需要"不能改"的容器？

1. **更安全**：坐标、颜色、日期这种"天生不该改"的数据，用元组防止误改；
2. **更快更省内存**：比列表轻量；
3. **可以做字典的键**（列表不行）。

\`\`\`python
locations = {
    (39.9, 116.4): "北京",
    (31.2, 121.5): "上海",
}
print(locations[(39.9, 116.4)])    # 北京
\`\`\`

### 解包：元组最好用的地方

\`\`\`python
point = (3, 5)
x, y = point                 # 一次拆成两个变量
print(x, y)                  # 3 5

# 交换变量（第一章见过，原理就是这个）
a, b = 1, 2
a, b = b, a
print(a, b)                  # 2 1
\`\`\`

### 星号收集剩余元素

\`\`\`python
first, *rest = [1, 2, 3, 4]
print(first)     # 1
print(rest)      # [2, 3, 4]   星号把剩下的打包成列表

*init, last = [1, 2, 3, 4]
print(init, last)    # [1, 2, 3] 4

a, *mid, b = [1, 2, 3, 4, 5]
print(a, mid, b)     # 1 [2, 3, 4] 5
\`\`\`

### 函数返回多个值其实返回的是元组

\`\`\`python
def min_max(nums):
    return min(nums), max(nums)      # 实际上返回一个元组

low, high = min_max([3, 1, 4, 1, 5])
print(low, high)      # 1 5
\`\`\`

### 遍历时同时拿下标（复习）

\`\`\`python
for i, ch in enumerate("abc"):
    print(i, ch)

for name, score in [("小明", 92), ("小红", 88)]:
    print(name, score)
\`\`\`

### 列表 ↔ 元组 互转

\`\`\`python
nums = [1, 2, 3]
t = tuple(nums)      # (1, 2, 3)
lst = list(t)        # [1, 2, 3]
\`\`\`

> 💡 **怎么选**：数据需要增删改 → \`list\`；数据固定不变（坐标、配置项、函数多返回值）→ \`tuple\`。
> 拿不准就用列表，需要时再换。`,
    },
    {
      id: 'ch2-4',
      title: '字典 dict 基础',
      content: `## 用"名字"取值，而不是用下标

列表靠位置取值（\`scores[0]\`），字典靠**键**取值（\`person["name"]\`）。

\`\`\`python
person = {
    "name": "小明",
    "age": 18,
    "city": "北京",
}

print(person["name"])       # 小明
print(person["age"])        # 18
print(len(person))          # 3  键值对数量
\`\`\`

键必须是**不可变类型**（字符串、数字、元组），最常用的是字符串。

### 增删改查

\`\`\`python
person["age"] = 19                  # 改（键存在）
person["email"] = "xm@qq.com"       # 增（键不存在）
del person["city"]                  # 删
print(person)

# 判断键是否存在（不要用下标硬取）
if "email" in person:
    print("有邮箱")

print(person.get("phone"))          # None     取不到不报错
print(person.get("phone", "未填写")) # 未填写   给个默认值
\`\`\`

| 写法 | 键不存在时 | 建议 |
|------|-----------|------|
| \`d["key"]\` | ❌ 报 \`KeyError\` | 确定一定有才用 |
| \`d.get("key")\` | 返回 \`None\` | ✅ 推荐 |
| \`d.get("key", 默认值)\` | 返回默认值 | ✅ 最稳 |

### 遍历字典

\`\`\`python
scores = {"语文": 92, "数学": 88, "英语": 95}

for subject in scores:                    # 默认遍历键
    print(subject)

for score in scores.values():             # 只要值
    print(score)

for subject, score in scores.items():     # 键值都要（最常用）
    print(f"{subject}: {score} 分")

print(list(scores.keys()))                # ['语文', '数学', '英语']
\`\`\`

### 合并与清空

\`\`\`python
a = {"x": 1}
b = {"y": 2}

a.update(b)          # 把 b 合并进 a → {'x': 1, 'y': 2}
c = {**a, "z": 3}    # 展开语法生成新字典
d = a | b            # Python 3.9+ 的合并运算符

a.clear()            # 清空
\`\`\`

### 字典的典型用途：配置与映射

\`\`\`python
# 用字典代替一长串 if/elif（查表法，更清晰也更快）
level_names = {1: "青铜", 2: "白银", 3: "黄金", 4: "铂金"}
level = 3
print(level_names.get(level, "未知段位"))     # 黄金
\`\`\`

> ⚠️ **字典是无序的吗？** Python 3.7 起**保留插入顺序**（3.6 是实现细节），
> 所以 \`for\` 遍历的顺序 = 你添加的顺序。但"有序"不等于"可排序"，
> 要按大小输出仍得用 \`sorted(d.items())\`。`,
    },
    {
      id: 'ch2-5',
      title: '字典进阶与嵌套结构',
      content: `## 列表套字典：处理"表格"数据的标准姿势

\`\`\`python
students = [
    {"name": "小明", "score": 92, "class": "一班"},
    {"name": "小红", "score": 88, "class": "二班"},
    {"name": "小刚", "score": 95, "class": "一班"},
]

# 遍历打印
for s in students:
    print(f"{s['name']}（{s['class']}）：{s['score']} 分")

# 求平均分
total = sum(s["score"] for s in students)
print(f"平均分：{total / len(students):.1f}")

# 按分数排序（复习上一节的 key）
for s in sorted(students, key=lambda x: x["score"], reverse=True):
    print(s["name"], s["score"])
\`\`\`

> 💡 注意 \`f"{s['name']}"\`：f-string 里用**同一种引号**会冲突，
> 外层双引号、内层单引号（或反过来）就没问题。

## 字典套字典（分级数据）

\`\`\`python
school = {
    "一班": {"人数": 40, "平均分": 88.5},
    "二班": {"人数": 38, "平均分": 91.2},
}

print(school["一班"]["平均分"])       # 88.5

for cls, info in school.items():
    print(f"{cls}：{info['人数']} 人，平均 {info['平均分']} 分")
\`\`\`

## 统计计数（超常用）

\`\`\`python
text = "apple banana apple cherry apple banana"
counts = {}

for word in text.split():
    # 写法一：get 给默认值（推荐，最直观）
    counts[word] = counts.get(word, 0) + 1

print(counts)      # {'apple': 3, 'banana': 2, 'cherry': 1}

# 按出现次数从多到少输出
for word, n in sorted(counts.items(), key=lambda kv: kv[1], reverse=True):
    print(f"{word}: {n} 次")
\`\`\`

第六章还会讲 \`collections.Counter\`，一行就能完成上面的统计。

## setdefault：既能取值又能初始化

\`\`\`python
groups = {}
for name, cls in [("小明", "一班"), ("小红", "二班"), ("小刚", "一班")]:
    groups.setdefault(cls, []).append(name)

print(groups)      # {'一班': ['小明', '小刚'], '二班': ['小红']}
\`\`\`

\`setdefault(key, 默认值)\` 的语义是："键存在就返回它的值；不存在就先设为默认值再返回"。

## 字典推导式（预告）

\`\`\`python
squares = {n: n * n for n in range(1, 6)}
print(squares)     # {1: 1, 2: 4, 3: 9, 4: 16, 5: 25}

# 反转键值（前提：值不重复）
scores = {"语文": 92, "数学": 88}
by_score = {v: k for k, v in scores.items()}
print(by_score)    # {92: '语文', 88: '数学'}
\`\`\`

## 安全取深层值

\`\`\`python
data = {"user": {"name": "小明"}}

# ❌ 中间缺一层就崩：data["user"]["phone"]["number"]
# ✅ 逐层用 get
phone = data.get("user", {}).get("phone", {}).get("number", "无")
print(phone)       # 无
\`\`\`

> ⚠️ **嵌套结构要"逐层确认再往里走"**：处理 JSON 数据时（第五章会读写 JSON 文件），
> 用 \`.get()\` 链式取值能让程序在字段缺失时也不崩溃。`,
    },
    {
      id: 'ch2-6',
      title: '集合 set',
      content: `## 只关心"有没有"，不关心顺序

集合（set）是一堆**不重复**元素的容器，最擅长两件事：**去重**和**集合运算**。

\`\`\`python
nums = {1, 2, 3, 3, 2, 1}
print(nums)              # {1, 2, 3}   自动去重

empty = set()            # ⚠️ 空集合只能这样写，{} 是空字典！
\`\`\`

### 从列表去重（最常用）

\`\`\`python
names = ["小明", "小红", "小明", "小刚", "小红"]
unique = list(set(names))
print(unique)            # 顺序不保证

# 想保持原顺序？用 dict.fromkeys
ordered_unique = list(dict.fromkeys(names))
print(ordered_unique)    # ['小明', '小红', '小刚']
\`\`\`

### 增删与判断

\`\`\`python
s = {1, 2, 3}
s.add(4)                  # 添加
s.discard(2)              # 删除（不存在也不报错）
s.remove(1)               # 删除（不存在会 KeyError）
print(4 in s)             # True   判断是否存在（非常快）
print(len(s))
\`\`\`

### 集合运算：交、并、差、对称差

\`\`\`python
python_students = {"小明", "小红", "小刚"}
cpp_students = {"小红", "小刚", "小李"}

print(python_students & cpp_students)    # 交集：都选的 {'小红', '小刚'}
print(python_students | cpp_students)    # 并集：至少选一个
print(python_students - cpp_students)    # 差集：只选了 Python
print(python_students ^ cpp_students)    # 对称差：只选了一门

# 方法写法（效果相同）
print(python_students.intersection(cpp_students))
print(python_students.union(cpp_students))
\`\`\`

| 运算 | 符号 | 方法 | 含义 |
|------|------|------|------|
| 交集 | \`&\` | \`intersection\` | 两边都有 |
| 并集 | \`\\|\` | \`union\` | 合并去重 |
| 差集 | \`-\` | \`difference\` | 左边有右边没有 |
| 对称差 | \`^\` | \`symmetric_difference\` | 只在一侧出现 |

### 常见用途

\`\`\`python
# 1. 判断重复
visited = set()
for item in ["a", "b", "a"]:
    if item in visited:
        print(f"{item} 重复了")
    visited.add(item)

# 2. 快速筛选：两个列表找共同元素（比双重循环快得多）
a = [1, 2, 3, 4, 5]
b = [4, 5, 6, 7]
print(list(set(a) & set(b)))     # [4, 5]

# 3. 去重统计有多少种
words = "a b a c b a".split()
print(len(set(words)))           # 3 种
\`\`\`

### 为什么 \`in\` 在集合里特别快？

- 列表判断 \`x in list\`：要从头挨个比，**越往后越慢**；
- 集合/字典判断：用哈希直接定位，**几乎瞬间**。

数据量大时（几万条以上），把列表换成集合能让程序快几十倍。

### 不可变集合 frozenset

\`\`\`python
fs = frozenset([1, 2, 3])
# fs.add(4)      # ❌ 不能改
\`\`\`

用途：需要把"集合"当作字典的键时。入门阶段知道有这东西即可。

> 💡 **集合不保证顺序**：打印出来的顺序可能与添加顺序不同，
> 需要顺序就用列表或 \`sorted(集合)\`。`,
    },
    {
      id: 'ch2-7',
      title: '推导式与拷贝陷阱',
      content: `## 推导式：一行完成"筛选 + 变换"

\`\`\`python
# 普通写法
squares = []
for n in range(1, 6):
    squares.append(n * n)

# 推导式写法（更 Pythonic）
squares = [n * n for n in range(1, 6)]
print(squares)      # [1, 4, 9, 16, 25]
\`\`\`

语法是 \`[表达式 for 变量 in 可迭代对象 if 条件]\`。

### 带条件筛选

\`\`\`python
nums = [1, 2, 3, 4, 5, 6, 7, 8]

evens = [n for n in nums if n % 2 == 0]
print(evens)             # [2, 4, 6, 8]

labels = ["偶数" if n % 2 == 0 else "奇数" for n in nums[:4]]
print(labels)            # ['奇数', '偶数', '奇数', '偶数']
\`\`\`

### 对字符串和数据做变换

\`\`\`python
names = ["  小明 ", "小红", " 小刚"]
cleaned = [n.strip() for n in names]
print(cleaned)           # ['小明', '小红', '小刚']

words = ["hello", "world"]
upper = [w.upper() for w in words]        # ['HELLO', 'WORLD']
lengths = [len(w) for w in words]         # [5, 5]
\`\`\`

### 字典推导式与集合推导式

\`\`\`python
# 字典：{键表达式: 值表达式 for ...}
prices = {"apple": 3, "banana": 5}
double = {k: v * 2 for k, v in prices.items()}
print(double)            # {'apple': 6, 'banana': 10}

# 集合：{表达式 for ...}
words = ["a", "bb", "cc", "d"]
lengths = {len(w) for w in words}
print(lengths)           # {1, 2}
\`\`\`

### 嵌套推导式

\`\`\`python
matrix = [[1, 2, 3], [4, 5, 6]]

flat = [x for row in matrix for x in row]     # 拍平
print(flat)              # [1, 2, 3, 4, 5, 6]

# 转置（行列互换）
transposed = [[row[i] for row in matrix] for i in range(3)]
print(transposed)        # [[1, 4], [2, 5], [3, 6]]
\`\`\`

> ⚠️ **别把推导式写太复杂**：超过两层嵌套或条件太多时，
> 老老实实写 \`for\` 循环更好读。**可读性永远优先于"短"**。

## 拷贝陷阱：\`=\` 只是起别名

\`\`\`python
a = [1, 2, 3]
b = a                # ⚠️ 不是复制！两个名字指向同一个列表
b.append(4)
print(a)             # [1, 2, 3, 4]   a 也变了

c = a.copy()         # ✅ 浅拷贝
c.append(5)
print(a, c)          # [1,2,3,4] [1,2,3,4,5]
\`\`\`

### 浅拷贝 vs 深拷贝

\`\`\`python
import copy

nested = [[1, 2], [3, 4]]

shallow = nested.copy()          # 浅拷贝：只复制最外层
shallow[0].append(99)
print(nested)                    # [[1, 2, 99], [3, 4]]  ⚠️ 里层还是同一个

deep = copy.deepcopy(nested)     # 深拷贝：里里外外全复制
deep[0].append(100)
print(nested)                    # 不受影响
\`\`\`

| 写法 | 效果 | 何时用 |
|------|------|--------|
| \`b = a\` | 别名，同一个对象 | 想同步修改时 |
| \`b = a.copy()\` / \`a[:]\` | 浅拷贝（只一层） | 一维列表 |
| \`copy.deepcopy(a)\` | 深拷贝（递归复制） | 嵌套列表/字典 |

### 另一个经典陷阱：\`[[]] * 3\`

\`\`\`python
# ❌ 想造 3 行空行，结果三行是同一个列表
grid = [[]] * 3
grid[0].append(1)
print(grid)          # [[1], [1], [1]]

# ✅ 正确写法：推导式，每次都新建
grid = [[] for _ in range(3)]
grid[0].append(1)
print(grid)          # [[1], [], []]
\`\`\`

> 💡 **本章最重要的一句话**：Python 变量存的是"指向对象的引用"。
> 遇到"改了 A 结果 B 也变了"，先想是不是别名或浅拷贝的问题。`,
    },
  ],
};
