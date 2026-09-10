import { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';

// 首页中下部展示区：为什么选择 / 实况演示（终端·pygame·Wiki）/ 代码与运行结果 / 使用流程 / 能力对照
// 演示都用矢量动效实现（不是 GIF）：清晰、体积小、跟随主题、可循环，iPad 上同样是 GPU 合成

// ── 演示一：交互式终端（边运行边输入）──
const TERM_LINES = [
  '$ python3 main.py',
  'please choose a number: 5',
  'got: 5',
  'please choose a number: 0',
  'bye~',
];

function TerminalDemo() {
  const wrapRef = useRef(null);
  const inView = useInView(wrapRef, { margin: '-40px' });
  const [done, setDone] = useState([]);
  const [partial, setPartial] = useState('');

  useEffect(() => {
    if (!inView) return undefined;
    let cancelled = false;
    let li = 0;
    let ci = 0;
    let timer = null;
    const tick = () => {
      if (cancelled) return;
      if (li >= TERM_LINES.length) {
        timer = setTimeout(() => {
          if (cancelled) return;
          setDone([]);
          setPartial('');
          li = 0;
          ci = 0;
          tick();
        }, 2800);
        return;
      }
      const line = TERM_LINES[li];
      if (ci < line.length) {
        ci += 1;
        setPartial(line.slice(0, ci));
        timer = setTimeout(tick, 34);
        return;
      }
      setDone((p) => [...p, line]);
      setPartial('');
      li += 1;
      ci = 0;
      timer = setTimeout(tick, 420);
    };
    tick();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [inView]);

  const lineClass = (l) =>
    l.startsWith('$')
      ? 'text-cyan-300'
      : l.startsWith('please')
        ? 'text-slate-300'
        : l.startsWith('got')
          ? 'text-emerald-300'
          : 'text-amber-200';

  return (
    <div ref={wrapRef} className="glass flex h-full flex-col overflow-hidden rounded-2xl">
      <div className="flex h-10 shrink-0 items-center gap-2 border-b border-white/10 px-3">
        <span className="h-2.5 w-2.5 rounded-full bg-rose-400/80" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
        <span className="ml-2 text-[10px] tracking-wider text-slate-500">交互终端 · 可边运行边输入</span>
        <span className="ml-auto flex items-center gap-1 text-[10px] text-emerald-300">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" /> 运行中
        </span>
      </div>
      <div className="min-h-[176px] flex-1 bg-[#0a0a12] p-3 font-mono text-[12.5px] leading-relaxed">
        {done.map((l, i) => (
          <div key={i} className={lineClass(l)}>
            {l}
          </div>
        ))}
        <div className={lineClass(partial || ' ')}>
          {partial}
          <span className="ml-0.5 inline-block h-3.5 w-1.5 animate-pulse bg-cyan-400 align-middle" />
        </div>
      </div>
      <p className="shrink-0 border-t border-white/10 px-3 py-2 text-[10px] leading-relaxed text-slate-500">
        输入在运行中实时发送——<span className="text-cyan-300">像 VS Code 终端一样</span>
        ，while True + input() 也能正常交互
      </p>
    </div>
  );
}

// ── 演示二：pygame 图形窗口 → 浏览器浮窗 ──
function PygameDemo() {
  const ref = useRef(null);
  const inView = useInView(ref, { margin: '-40px' });
  return (
    <div ref={ref} className="glass flex h-full flex-col overflow-hidden rounded-2xl">
      <div className="flex h-10 shrink-0 items-center gap-2 border-b border-white/10 px-3">
        <span className="text-sm">🪟</span>
        <span className="neon-text text-xs font-semibold">程序窗口</span>
        <span className="text-[10px] text-slate-500">main.py</span>
        <span className="ml-auto flex items-center gap-1 text-[10px] text-emerald-300">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> 已连接
        </span>
      </div>
      <div className="flex min-h-[176px] flex-1 items-center justify-center bg-[#050508] p-3">
        {/* 虚拟屏幕（1024×768）等比缩放后的 pygame 白底窗口 */}
        <div className="flex aspect-[4/3] w-full max-w-[260px] items-center justify-center overflow-hidden rounded-md bg-white shadow-[0_0_24px_rgba(0,240,255,0.25)]">
          {inView && (
            <div className="relative flex h-full w-full items-center justify-center">
              <motion.div
                className="absolute h-6 w-6 rounded bg-gradient-to-br from-cyan-500 to-blue-600"
                animate={{ x: [-70, 70, 70, -70, -70], y: [-45, -45, 45, 45, -45] }}
                transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
              />
              <span className="relative z-10 font-mono text-sm font-bold text-slate-900">
                Hello, Pygame!
              </span>
            </div>
          )}
        </div>
      </div>
      <p className="shrink-0 border-t border-white/10 px-3 py-2 text-[10px] leading-relaxed text-slate-500">
        pygame / SDL 图形程序在沙箱虚拟屏运行，<span className="text-cyan-300">等比投屏到浏览器浮窗</span>
        ，可拖动缩放、不压缩画面
      </p>
    </div>
  );
}

// ── 演示三：站内 Wiki 教程 ──
const WIKI_CHAPTERS = [
  { t: '★ 简介', n: 6 },
  { t: '第一章：基础概念', n: 8, open: true, active: 0 },
  { t: '第二章：函数与作用域', n: 6 },
  { t: '第三章：数组与字符串', n: 6 },
  { t: '第四章：指针与引用', n: 7 },
];
const WIKI_SECTIONS = ['变量与命名规则', '常用数据类型', '常量与 const', '运算符'];

function WikiDemo() {
  const ref = useRef(null);
  const inView = useInView(ref, { margin: '-40px' });
  const [active, setActive] = useState(0);
  useEffect(() => {
    if (!inView) return undefined;
    const t = setInterval(() => setActive((a) => (a + 1) % WIKI_SECTIONS.length), 1800);
    return () => clearInterval(t);
  }, [inView]);

  return (
    <div ref={ref} className="glass flex h-full flex-col overflow-hidden rounded-2xl">
      <div className="flex h-10 shrink-0 items-center gap-2 border-b border-white/10 px-3">
        <span className="text-sm">📚</span>
        <span className="gradient-text text-xs font-bold tracking-wide">编程 Wiki</span>
        <span className="ml-auto flex gap-1 text-[10px]">
          <span className="rounded bg-cyan-400/20 px-1.5 py-0.5 text-cyan-200">C++</span>
          <span className="rounded bg-white/5 px-1.5 py-0.5 text-slate-500">Python</span>
          <span className="rounded bg-white/5 px-1.5 py-0.5 text-slate-500">C</span>
        </span>
      </div>
      <div className="min-h-[176px] flex-1 space-y-0.5 p-2 text-[12px]">
        {WIKI_CHAPTERS.map((c, i) => (
          <div key={c.t}>
            <div className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-slate-200">
              <span className="text-[9px] text-slate-500">{c.open ? '▼' : '▶'}</span>
              <span className="min-w-0 flex-1 truncate">{c.t}</span>
              <span className="rounded-full border border-white/10 bg-white/5 px-1.5 text-[9px] text-slate-500">
                {c.n} 节
              </span>
            </div>
            {c.open && (
              <div className="ml-3 border-l border-white/10 pl-2">
                {WIKI_SECTIONS.map((s, si) => (
                  <motion.div
                    key={s}
                    animate={{
                      backgroundColor:
                        active === si ? 'rgba(0,240,255,0.10)' : 'rgba(0,240,255,0)',
                      color: active === si ? '#a5f3fc' : '#cbd5e1',
                    }}
                    transition={{ duration: 0.3 }}
                    className="flex items-center gap-2 rounded-lg px-2 py-1.5"
                  >
                    <span className="font-mono text-[9px] text-slate-500">
                      {i}-{si + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{s}</span>
                    {active === si && (
                      <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(0,240,255,0.9)]" />
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      <p className="shrink-0 border-t border-white/10 px-3 py-2 text-[10px] leading-relaxed text-slate-500">
        全站左下角书签随开随用：<span className="text-cyan-300">9 章 60 节分支式教程</span>
        ，含代码示例、常见错误与练习
      </p>
    </div>
  );
}

// ── 代码与运行结果对照 ──
const SNIPPETS = [
  {
    id: 'python',
    label: '🐍 Python',
    file: 'main.py',
    code: `while True:
    a = input("please choose a number: ")
    if a == "0":
        print("bye~")
        break
    print("got:", a)`,
    out: ['please choose a number: 5', 'got: 5', 'please choose a number: 0', 'bye~'],
    note: '交互输入 · 实时终端',
  },
  {
    id: 'cpp',
    label: '⚙️ C++',
    file: 'main.cpp',
    code: `#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

int main() {
    vector<int> v = {5, 2, 9, 1};
    sort(v.begin(), v.end());
    for (int x : v) cout << x << " ";
    return 0;
}`,
    out: ['1 2 5 9'],
    note: 'g++ 编译 · STL 可用',
  },
  {
    id: 'c',
    label: '🔧 C',
    file: 'main.c',
    code: `#include <stdio.h>

int main() {
    int n, sum = 0;
    while (scanf("%d", &n) == 1) sum += n;
    printf("sum = %d\\n", sum);
    return 0;
}`,
    out: ['sum = 42'],
    note: 'gcc 编译 · C 语义严格区分',
  },
];

function CodeShowcase() {
  const [tab, setTab] = useState(0);
  const s = SNIPPETS[tab];
  return (
    <div className="glass overflow-hidden rounded-2xl">
      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 px-3 py-2.5">
        {SNIPPETS.map((x, i) => (
          <button
            key={x.id}
            onClick={() => setTab(i)}
            className={`flex h-10 items-center rounded-lg px-3 text-sm font-medium transition ${
              tab === i
                ? 'bg-gradient-to-r from-cyan-400/25 to-blue-500/25 text-cyan-100 shadow-neon-cyan'
                : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
            }`}
          >
            {x.label}
          </button>
        ))}
        <span className="ml-auto hidden text-[10px] text-slate-500 sm:inline">{s.note}</span>
      </div>
      <div className="grid gap-0 md:grid-cols-2">
        <pre className="m-0 overflow-x-auto border-b border-white/10 bg-[#0a0a12] p-4 font-mono text-[12px] leading-relaxed text-slate-300 md:border-b-0 md:border-r">
          <span className="mb-2 block text-[10px] text-slate-600">{s.file}</span>
          {s.code}
        </pre>
        <div className="bg-[#08080f] p-4 font-mono text-[12px] leading-relaxed">
          <span className="mb-2 block text-[10px] text-slate-600">▶ 运行结果</span>
          {s.out.map((l, i) => (
            <motion.div
              key={`${s.id}-${i}`}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.12, duration: 0.25 }}
              className={l.startsWith('sum') || l.startsWith('bye') ? 'text-emerald-300' : 'text-slate-300'}
            >
              {l}
            </motion.div>
          ))}
          <div className="mt-3 border-t border-white/10 pt-2 text-[10px] text-slate-500">
            ⏱ 0.02s · 退出码 0 · 沙箱隔离执行
          </div>
        </div>
      </div>
    </div>
  );
}

// ── 使用流程 ──
const STEPS = [
  { n: '01', t: '注册并等待审核', d: '邮箱注册，管理员通过后即可登录（三态账号管理）' },
  { n: '02', t: '建项目写代码', d: '项目 = 文件夹，支持 .c / .cpp / .py / .txt，图片与音视频直接上传预览' },
  { n: '03', t: '点运行看结果', d: '▶ 运行走沙箱批处理；💻 终端运行可边跑边输入；🪟 看图形程序窗口' },
  { n: '04', t: '环境与教程加持', d: 'Python 环境自定义装库（自动换源重试），左下角 Wiki 随时查教程' },
];

// ── 能力对照 ──
const COMPARE = [
  ['环境安装', '装编译器 / 配 PATH，半天起步', '打开浏览器即用，三语言就绪'],
  ['第三方库', '自己 pip 装，网络还容易失败', '环境构建自动换源重试，日志可见'],
  ['多设备', '代码在 A 机器，B 机器没有', '云端工作区，iPad 与电脑同一份代码'],
  ['图形程序', '本地弹窗，换设备就跑不了', 'pygame 窗口投屏到浏览器浮窗'],
  ['交互输入', '终端里随便输', '终端运行同样是实时交互（不再是预输入）'],
];

export default function LandingSections() {
  return (
    <>
      {/* ── 为什么选择 ── */}
      <section className="mx-auto max-w-5xl px-4 pb-14">
        <h2 className="text-center text-2xl font-bold tracking-wider">为什么选择 CodePad</h2>
        <p className="mt-2 text-center text-sm text-slate-500">
          从写下第一行代码到跑出结果，只需要三秒——而且支持真正的交互与图形程序
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { icon: '🚀', title: '三语言在线编译', desc: 'C / C++ / Python 即时执行，gcc / g++ / python3 工具链齐全，10 秒超时保护' },
            { icon: '💻', title: '交互式终端', desc: '像 VS Code 终端一样边运行边输入，while True + input() 也能正常交互' },
            { icon: '🪟', title: '图形程序弹窗', desc: 'pygame 等图形程序在沙箱虚拟屏运行，等比投屏为浏览器浮窗，可拖可缩放' },
            { icon: '📚', title: '站内 Wiki 教程', desc: '9 章 60 节分支式 C++ 教程，代码示例 / 常见错误 / 练习，随开随用' },
            { icon: '🐍', title: '自定义 Python 环境', desc: '任意版本 + 第三方库，构建自动换源重试、失败原因分析、详细日志' },
            { icon: '🖼', title: '多媒体工作区', desc: '图片 / 音频 / 视频上传与预览，50MB 免费存储，配额实时可见' },
          ].map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.4, delay: (i % 3) * 0.08, ease: 'easeOut' }}
              className="glass rounded-2xl p-5 transition hover:border-cyan-400/40 hover:shadow-neon-cyan"
            >
              <div className="text-3xl">{f.icon}</div>
              <h3 className="mt-3 font-semibold text-slate-100">{f.title}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── 实况演示 ── */}
      <section className="mx-auto max-w-5xl px-4 pb-14">
        <h2 className="text-center text-2xl font-bold tracking-wider">开箱即用的三件套</h2>
        <p className="mt-2 text-center text-sm text-slate-500">
          终端交互 · 图形窗口 · 教程随查——都是真实运行时的效果演示
        </p>

        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.4 }}
            className="lg:col-span-2"
          >
            <TerminalDemo />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.4, delay: 0.08 }}
          >
            <PygameDemo />
          </motion.div>
        </div>

        {/* 代码与结果 */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.4 }}
          className="mt-4"
        >
          <CodeShowcase />
        </motion.div>

        {/* Wiki */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.4 }}
          className="mt-4"
        >
          <WikiDemo />
        </motion.div>
      </section>

      {/* ── 使用流程 ── */}
      <section className="mx-auto max-w-5xl px-4 pb-14">
        <h2 className="text-center text-2xl font-bold tracking-wider">四步开始写代码</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <motion.div
              key={s.n}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="glass relative rounded-2xl p-5"
            >
              <span className="gradient-text text-2xl font-bold">{s.n}</span>
              <h3 className="mt-2 text-sm font-semibold text-slate-100">{s.t}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{s.d}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── 能力对照 ── */}
      <section className="mx-auto max-w-5xl px-4 pb-14">
        <h2 className="text-center text-2xl font-bold tracking-wider">和本地折腾说再见</h2>
        <div className="glass mt-8 overflow-hidden rounded-2xl">
          <div className="grid grid-cols-3 border-b border-white/10 bg-white/[0.03] px-4 py-3 text-xs font-semibold tracking-wider">
            <span className="text-slate-400">对比项</span>
            <span className="text-slate-500">本地环境</span>
            <span className="text-cyan-200">CodePad Lite</span>
          </div>
          {COMPARE.map((row, i) => (
            <motion.div
              key={row[0]}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.35, delay: i * 0.05 }}
              className="grid grid-cols-3 gap-2 border-b border-white/5 px-4 py-3 text-xs leading-relaxed last:border-0"
            >
              <span className="text-slate-300">{row[0]}</span>
              <span className="text-slate-500">{row[1]}</span>
              <span className="text-slate-300">
                <span className="mr-1 text-emerald-400">✓</span>
                {row[2]}
              </span>
            </motion.div>
          ))}
        </div>
      </section>
    </>
  );
}
