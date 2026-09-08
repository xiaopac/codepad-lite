// 语言徽章：文件树与编辑器标签页共用
// .c → C（翡翠绿）、.cpp/.cc/.cxx → C++（天蓝）、.py → Py（琥珀）
// 其余文本（.txt/.h）显示中性圆点
const LANG_BADGE = {
  c: {
    text: 'C',
    cls: 'border-emerald-400/60 bg-emerald-400/10 text-emerald-300 shadow-[0_0_8px_rgba(52,211,153,0.45)]',
  },
  cpp: {
    text: 'C++',
    cls: 'border-sky-400/60 bg-sky-400/10 text-sky-300 shadow-[0_0_8px_rgba(56,189,248,0.45)]',
  },
  python: {
    text: 'Py',
    cls: 'border-amber-400/60 bg-amber-400/10 text-amber-300 shadow-[0_0_8px_rgba(251,191,36,0.45)]',
  },
};

export default function LangBadge({ language }) {
  const badge = LANG_BADGE[language];
  if (!badge) {
    return <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-slate-500" />;
  }
  return (
    <span
      className={`flex h-4 shrink-0 items-center rounded border px-1 font-mono text-[9px] font-bold leading-none ${badge.cls}`}
      title={badge.text === 'C' ? 'C 语言' : badge.text === 'C++' ? 'C++' : 'Python'}
    >
      {badge.text}
    </span>
  );
}
