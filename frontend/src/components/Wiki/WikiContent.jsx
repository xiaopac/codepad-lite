import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';
import { motion } from 'framer-motion';

// 小节内容预览区：面包屑（章 → 节）+ Markdown 渲染 + 上一节/下一节导航
export default function WikiContent({ section, chapterTitle, prev, next, onNavigate }) {
  if (!section) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center p-4 text-sm text-slate-500">
        从目录选择一节开始学习
      </div>
    );
  }
  return (
    <motion.div
      key={section.id}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="wiki-scroll flex min-h-0 flex-1 flex-col overflow-y-auto scroll-touch overscroll-contain px-3 pb-4 pt-1"
      style={{ touchAction: 'pan-y' }}
    >
      {/* 面包屑标题 */}
      <div className="shrink-0 border-b border-white/10 pb-2">
        <p className="text-[10px] tracking-wider text-slate-500">
          {chapterTitle} · 第 {section.number} 节
        </p>
        <h3 className="mt-0.5 text-base font-semibold leading-snug text-cyan-200">
          {section.title}
        </h3>
      </div>

      {/* 正文 */}
      <div className="wiki-md text-base leading-relaxed text-slate-300">
        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
          {section.content}
        </ReactMarkdown>
      </div>

      {/* 上一节 / 下一节 */}
      <div className="mt-4 flex shrink-0 gap-2 border-t border-white/10 pt-3">
        <button
          onClick={() => prev && onNavigate(prev.id)}
          disabled={!prev}
          className="flex h-11 min-w-0 flex-1 items-center gap-1 rounded-lg bg-white/5 px-3 text-left text-xs text-slate-300 transition hover:bg-white/10 hover:text-cyan-200 disabled:opacity-40"
        >
          <span className="shrink-0">←</span>
          <span className="min-w-0 truncate">{prev ? prev.title : '已是第一节'}</span>
        </button>
        <button
          onClick={() => next && onNavigate(next.id)}
          disabled={!next}
          className="flex h-11 min-w-0 flex-1 items-center justify-end gap-1 rounded-lg bg-white/5 px-3 text-right text-xs text-slate-300 transition hover:bg-white/10 hover:text-cyan-200 disabled:opacity-40"
        >
          <span className="min-w-0 truncate">{next ? next.title : '已是最后一节'}</span>
          <span className="shrink-0">→</span>
        </button>
      </div>
    </motion.div>
  );
}
