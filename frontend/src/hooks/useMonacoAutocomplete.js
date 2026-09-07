// 智能代码补全：为 C++ / Python 注册自定义补全源、函数签名提示与代码片段。
// 说明：本项目为 JavaScript 工程，钩子以 .js 提供（对应需求文档中的 useMonacoAutocomplete.ts，
// Vite 同样支持 .ts，但为保持工程一致性此处沿用 JS）。
import { useEffect } from 'react';
import monaco from '../monacoSetup';

const { CompletionItemKind: Kind, CompletionItemInsertTextRule: InsertRule } = monaco.languages;

const KW = Kind.Keyword;
const FN = Kind.Function;
const TY = Kind.Struct; // 类型 / 容器
const SN = Kind.Snippet;

// 排序：片段 > 关键词 > 函数/类型，保证最常用的在最前面
const SORT_SNIPPET = '0';
const SORT_KEYWORD = '1';
const SORT_FN = '2';

const make = (label, kind, insertText, detail, documentation, sortText) => ({
  label,
  kind,
  insertText: insertText ?? label,
  detail,
  documentation,
  sortText: sortText ?? SORT_FN,
});

// ═══════════════════════ C++ ═══════════════════════

const CPP_KEYWORDS = [
  'int', 'float', 'double', 'char', 'bool', 'void', 'auto', 'const', 'static',
  'return', 'using', 'namespace', 'public', 'private', 'new', 'delete',
  'nullptr', 'true', 'false', 'if', 'else', 'for', 'while', 'do', 'switch',
  'case', 'break', 'continue', 'struct', 'class', 'inline', 'sizeof',
].map((k) => make(k, KW, k, 'C++ 关键字', `关键字：${k}`, SORT_KEYWORD));

const CPP_TYPES = [
  make('string', TY, 'std::string', 'C++ 标准库', '字符串类型（需 #include <string>）'),
  make('vector', TY, 'std::vector<${1:T}>', 'C++ 标准库', '动态数组（需 #include <vector>），使用片段后可继续填模板参数'),
  make('map', TY, 'std::map<${1:K}, ${2:V}>', 'C++ 标准库', '有序键值对容器（需 #include <map>）'),
  make('set', TY, 'std::set<${1:T}>', 'C++ 标准库', '有序集合（需 #include <set>）'),
  make('pair', TY, 'std::pair<${1:A}, ${2:B}>', 'C++ 标准库', '二元组（需 #include <utility>）'),
  make('queue', TY, 'std::queue<${1:T}>', 'C++ 标准库', '队列（需 #include <queue>）'),
  make('stack', TY, 'std::stack<${1:T}>', 'C++ 标准库', '栈（需 #include <stack>）'),
];

const CPP_FUNCTIONS = [
  make('printf', FN, 'printf("${1:%d\\n}", ${2:value});', 'stdio.h', '格式化输出，%d 整数、%f 浮点、%c 字符、%s 字符串'),
  make('scanf', FN, 'scanf("${1:%d}", &${2:var});', 'stdio.h', '格式化输入，注意变量前加 &'),
  make('cout', FN, 'std::cout << ${1:value};', 'iostream', '标准输出流，可用 << 连续拼接'),
  make('cin', FN, 'std::cin >> ${1:var};', 'iostream', '标准输入流'),
  make('endl', FN, 'std::endl', 'iostream', '换行并刷新缓冲区'),
  make('push_back', FN, '${1:vec}.push_back(${2:value});', 'vector', '向 vector 尾部追加元素'),
  make('size', FN, '${1:vec}.size()', 'vector/string', '返回元素个数（size_t）'),
  make('empty', FN, '${1:vec}.empty()', 'vector/string', '判断是否为空，返回 bool'),
  make('getline', FN, 'std::getline(std::cin, ${1:s});', 'string', '读取整行（含空格）到字符串'),
  make('sort', FN, 'std::sort(${1:v}.begin(), ${1:v}.end());', 'algorithm', '升序排序，可加第三个参数自定义比较'),
  make('max', FN, 'std::max(${1:a}, ${2:b})', 'algorithm', '返回较大值'),
  make('min', FN, 'std::min(${1:a}, ${2:b})', 'algorithm', '返回较小值'),
  make('abs', FN, 'std::abs(${1:x})', 'cstdlib/cmath', '绝对值（整数用 cstdlib，浮点用 cmath）'),
  make('pow', FN, 'std::pow(${1:base}, ${2:exp})', 'cmath', '幂运算，返回 double'),
  make('sqrt', FN, 'std::sqrt(${1:x})', 'cmath', '平方根'),
];

const CPP_SNIPPETS = [
  {
    ...make('main', SN, 'int main() {\n\t${0}\n\treturn 0;\n}', 'C++ 片段', 'main 函数模板'),
    sortText: SORT_SNIPPET,
  },
  {
    ...make('for', SN, 'for (int ${1:i} = 0; ${1:i} < ${2:n}; ${1:i}++) {\n\t${0}\n}', 'C++ 片段', 'for 循环模板（0 到 n-1）'),
    sortText: SORT_SNIPPET,
  },
  {
    ...make('foreach', SN, 'for (auto ${1:x} : ${2:vec}) {\n\t${0}\n}', 'C++ 片段', '范围 for 遍历容器'),
    sortText: SORT_SNIPPET,
  },
  {
    ...make('class', SN, 'class ${1:ClassName} {\npublic:\n\t${1:ClassName}() {}\n\t${0}\n};', 'C++ 片段', '类模板（含构造函数）'),
    sortText: SORT_SNIPPET,
  },
  {
    ...make('struct', SN, 'struct ${1:Name} {\n\t${0}\n};', 'C++ 片段', '结构体模板'),
    sortText: SORT_SNIPPET,
  },
  {
    ...make('if', SN, 'if (${1:cond}) {\n\t${0}\n}', 'C++ 片段', 'if 语句模板'),
    sortText: SORT_SNIPPET,
  },
  {
    ...make('while', SN, 'while (${1:cond}) {\n\t${0}\n}', 'C++ 片段', 'while 循环模板'),
    sortText: SORT_SNIPPET,
  },
].map((s) => ({ ...s, insertTextRules: InsertRule.InsertAsSnippet }));

const CPP_ALL = [...CPP_SNIPPETS, ...CPP_KEYWORDS, ...CPP_TYPES, ...CPP_FUNCTIONS];

// ═══════════════════════ Python ═══════════════════════

const PY_KEYWORDS = [
  'def', 'class', 'return', 'import', 'from', 'as', 'with', 'lambda', 'pass',
  'break', 'continue', 'if', 'elif', 'else', 'for', 'while', 'try', 'except',
  'finally', 'raise', 'yield', 'global', 'not', 'and', 'or', 'in', 'is',
  'None', 'True', 'False', 'async', 'await',
].map((k) => make(k, KW, k, 'Python 关键字', `关键字：${k}`, SORT_KEYWORD));

const PY_BUILTINS = [
  make('print', FN, 'print(${1:value})', '内置函数', '输出。可选参数 sep=" "（分隔符）、end="\\n"（结尾）'),
  make('input', FN, 'input("${1:提示}")', '内置函数', '读取一行输入，返回字符串'),
  make('len', FN, 'len(${1:obj})', '内置函数', '返回序列/集合长度'),
  make('range', FN, 'range(${1:stop})', '内置函数', '生成整数序列：range(stop) / range(start, stop, step)'),
  make('enumerate', FN, 'enumerate(${1:iterable})', '内置函数', '同时返回下标与元素，常用于 for i, x in enumerate(...)'),
  make('sum', FN, 'sum(${1:iterable})', '内置函数', '求和'),
  make('sorted', FN, 'sorted(${1:iterable})', '内置函数', '返回排序后的新列表，可传 key=、reverse='),
  make('open', FN, 'open("${1:file}", "${2:r}")', '内置函数', '打开文件：r 读 / w 写 / a 追加'),
  make('abs', FN, 'abs(${1:x})', '内置函数', '绝对值'),
  make('min', FN, 'min(${1:iterable})', '内置函数', '最小值'),
  make('max', FN, 'max(${1:iterable})', '内置函数', '最大值'),
  make('round', FN, 'round(${1:x}, ${2:2})', '内置函数', '四舍五入，可指定小数位数'),
  make('isinstance', FN, 'isinstance(${1:obj}, ${2:type})', '内置函数', '类型判断，返回 bool'),
  make('zip', FN, 'zip(${1:a}, ${2:b})', '内置函数', '并行迭代多个序列'),
  make('map', FN, 'map(${1:func}, ${2:iterable})', '内置函数', '对每个元素应用函数'),
  make('filter', FN, 'filter(${1:func}, ${2:iterable})', '内置函数', '按条件过滤元素'),
  make('int', FN, 'int(${1:x})', '内置函数', '转换为整数'),
  make('float', FN, 'float(${1:x})', '内置函数', '转换为浮点数'),
  make('str', FN, 'str(${1:x})', '内置函数', '转换为字符串'),
  make('list', FN, 'list(${1:iterable})', '内置函数', '转换为列表'),
  make('dict', FN, 'dict(${1:iterable})', '内置函数', '转换为字典'),
  make('set', FN, 'set(${1:iterable})', '内置函数', '转换为集合'),
  make('tuple', FN, 'tuple(${1:iterable})', '内置函数', '转换为元组'),
  make('type', FN, 'type(${1:obj})', '内置函数', '返回对象类型'),
  make('reversed', FN, 'reversed(${1:seq})', '内置函数', '反向迭代'),
];

const PY_SNIPPETS = [
  {
    ...make('def', SN, 'def ${1:name}(${2:args}):\n\t${0:pass}', 'Python 片段', '函数定义模板'),
    sortText: SORT_SNIPPET,
  },
  {
    ...make('ifmain', SN, 'if __name__ == "__main__":\n\t${0:main()}', 'Python 片段', '主函数入口模板'),
    sortText: SORT_SNIPPET,
  },
  {
    ...make('for', SN, 'for ${1:x} in ${2:iterable}:\n\t${0:pass}', 'Python 片段', 'for 循环模板'),
    sortText: SORT_SNIPPET,
  },
  {
    ...make('class', SN, 'class ${1:Name}:\n\tdef __init__(self):\n\t\t${0:pass}', 'Python 片段', '类模板（含 __init__）'),
    sortText: SORT_SNIPPET,
  },
  {
    ...make('try', SN, 'try:\n\t${1:pass}\nexcept ${2:Exception} as ${3:e}:\n\t${0:pass}', 'Python 片段', '异常处理模板'),
    sortText: SORT_SNIPPET,
  },
  {
    ...make('if', SN, 'if ${1:cond}:\n\t${0:pass}', 'Python 片段', 'if 语句模板'),
    sortText: SORT_SNIPPET,
  },
  {
    ...make('main', SN, 'def main():\n\t${0:pass}\n\nif __name__ == "__main__":\n\tmain()', 'Python 片段', '完整程序骨架（main + 入口）'),
    sortText: SORT_SNIPPET,
  },
].map((s) => ({ ...s, insertTextRules: InsertRule.InsertAsSnippet }));

const PY_ALL = [...PY_SNIPPETS, ...PY_KEYWORDS, ...PY_BUILTINS];

// ═══════════════ 补全 Provider 工厂 ═══════════════

function createCompletionProvider(items) {
  return {
    provideCompletionItems(model, position) {
      const word = model.getWordUntilPosition(position);
      const range = new monaco.Range(
        position.lineNumber,
        word.startColumn,
        position.lineNumber,
        word.endColumn,
      );
      return { suggestions: items.map((s) => ({ ...s, range })) };
    },
  };
}

// ═══════════════ 函数签名提示 ═══════════════

const sig = (label, documentation, params) => ({
  label,
  documentation,
  parameters: params.map((p) => ({ label: p, documentation: p })),
});

const CPP_SIGNATURES = {
  printf: sig('printf(const char* format, ...)', '格式化输出：%d %f %c %s 等占位符', ['format', '...']),
  scanf: sig('scanf(const char* format, ...)', '格式化输入，变量前加 &', ['format', '&var...']),
  sort: sig('sort(first, last, comp?)', '对 [first, last) 升序排序', ['first', 'last', 'comp?']),
  getline: sig('getline(istream& in, string& s)', '读取整行到字符串', ['in', 's']),
  max: sig('max(a, b)', '返回较大值', ['a', 'b']),
  min: sig('min(a, b)', '返回较小值', ['a', 'b']),
};

const PY_SIGNATURES = {
  print: sig("print(*objects, sep=' ', end='\\n')", '输出多个对象；sep 为分隔符，end 为结尾字符', ['*objects', "sep=' '", "end='\\n'"]),
  range: sig('range(start, stop[, step])', '生成整数序列（不含 stop）', ['start', 'stop', 'step?']),
  enumerate: sig('enumerate(iterable, start=0)', '返回 (下标, 元素) 对', ['iterable', 'start=0']),
  input: sig("input(prompt='')", '读取一行输入并返回字符串', ["prompt=''"]),
  open: sig("open(file, mode='r', encoding=None)", '打开文件：r/w/a/x/b/t/+', ['file', "mode='r'", 'encoding']),
  sorted: sig('sorted(iterable, key=None, reverse=False)', '返回排序后的新列表', ['iterable', 'key=None', 'reverse=False']),
  isinstance: sig('isinstance(obj, class_or_tuple)', '类型判断，返回 bool', ['obj', 'class_or_tuple']),
};

function createSignatureProvider(signatures) {
  return {
    signatureHelpTriggerCharacters: ['(', ','],
    provideSignatureHelp(model, position) {
      const line = model.getLineContent(position.lineNumber);
      const before = line.slice(0, position.column - 1);
      const m = /([A-Za-z_]\w*)\s*\([^()]*$/.exec(before);
      if (!m) return null;
      const found = signatures[m[1]];
      if (!found) return null;
      return {
        signatures: [found],
        activeSignature: 0,
        activeParameter: Math.min(
          Math.max(0, (before.match(/,/g) || []).length),
          Math.max(0, found.parameters.length - 1),
        ),
      };
    },
  };
}

// ═══════════════ Hook ═══════════════

// 在编辑器挂载的组件中调用一次；卸载时自动清理注册，避免重复注册
export function useMonacoAutocomplete() {
  useEffect(() => {
    const disposables = [
      monaco.languages.registerCompletionItemProvider('cpp', createCompletionProvider(CPP_ALL)),
      monaco.languages.registerCompletionItemProvider('python', createCompletionProvider(PY_ALL)),
      monaco.languages.registerSignatureHelpProvider('cpp', createSignatureProvider(CPP_SIGNATURES)),
      monaco.languages.registerSignatureHelpProvider('python', createSignatureProvider(PY_SIGNATURES)),
    ];
    return () => disposables.forEach((d) => d.dispose());
  }, []);
}
