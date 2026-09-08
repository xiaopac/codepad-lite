import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';
import { motion } from 'framer-motion';

// 教程内容预览区：Markdown 渲染 + GFM（表格/列表）+ 代码块高亮
// 拖拽判定由 WikiSidebar 统一处理：可滚动时保留原生滚动，无滚动空间时可拖拽窗口
export default function WikiContent({ chapter }) {
  if (!chapter) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center p-4 text-sm text-slate-500">
        从目录选择章节开始阅读
      </div>
    );
  }
  return (
    <motion.div
      key={chapter.id}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="wiki-scroll min-h-0 flex-1 overflow-y-auto scroll-touch overscroll-contain px-3 pb-4 pt-1"
      style={{ touchAction: 'pan-y' }}
      onPointerDownCapture={(e) => {
        // 可滚动时保留原生滚动；内容不足一屏（无滚动空间）时交给面板拖拽
        if (e.currentTarget.scrollHeight > e.currentTarget.clientHeight + 2) e.stopPropagation();
      }}
    >
      <div className="wiki-md text-base leading-relaxed text-slate-300">
        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
          {chapter.content}
        </ReactMarkdown>
      </div>
    </motion.div>
  );
}
