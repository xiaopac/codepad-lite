import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { toast } from '../store/toastStore';

// 日志行着色规则（与构建日志语义一致）
function lineClass(line) {
  if (line.startsWith('$ ')) return 'text-cyan-300';                       // 实际执行的命令
  if (line.includes('✅')) return 'text-emerald-300';                       // 成功标记
  if (line.includes('失败分析') || line.includes('ERROR') || line.includes('错误')) {
    return 'text-rose-400';
  }
  if (line.includes('WARNING') || line.includes('警告')) return 'text-amber-300';
  if (line.startsWith('[CodePad] 策略') || line.includes('策略：')) return 'text-purple-300';
  if (line.includes('[notice]')) return 'text-slate-600';
  if (line.startsWith('[CodePad]')) return 'text-slate-400';
  return 'text-slate-300';
}

// 构建日志弹窗：完整日志 + 错误行高亮 + 一键复制（iPad 友好）
export default function BuildLogModal({ env, onClose }) {
  const log = env?.build_log || '';

  // Esc 关闭
  useEffect(() => {
    if (!env) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [env, onClose]);

  if (!env) return null;

  const copyLog = async () => {
    try {
      await navigator.clipboard.writeText(log);
      toast.success('构建日志已复制');
    } catch {
      // iPad 旧系统降级：textarea + execCommand
      const ta = document.createElement('textarea');
      ta.value = log;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        toast.success('构建日志已复制');
      } catch {
        toast.error('复制失败，请手动选择日志文本');
      }
      document.body.removeChild(ta);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.16 }}
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 40, scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        onClick={(e) => e.stopPropagation()}
        className="glass-strong flex max-h-[82dvh] w-full flex-col overflow-hidden rounded-t-3xl shadow-glass sm:max-w-3xl sm:rounded-2xl"
      >
        {/* 标题栏 */}
        <div className="flex shrink-0 items-center gap-2 border-b border-white/10 px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-100">
              📜 构建日志 · {env.name}
            </p>
            <p className="truncate text-[11px] text-slate-500">
              Python {env.python_version}
              {env.packages?.length ? ` · ${env.packages.join(' ')}` : ''}
            </p>
          </div>
          <button
            onClick={copyLog}
            className="flex h-10 shrink-0 items-center gap-1 rounded-lg bg-white/5 px-3 text-xs text-slate-300 transition hover:bg-white/10 hover:text-cyan-200"
          >
            📋 复制日志
          </button>
          <button
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-lg text-slate-400 transition hover:bg-white/10 hover:text-white"
            aria-label="关闭"
          >
            ✕
          </button>
        </div>

        {/* 图例 */}
        <div className="flex shrink-0 flex-wrap gap-x-3 gap-y-1 border-b border-white/5 px-4 py-2 text-[10px] text-slate-500">
          <span><span className="text-cyan-300">$ 命令</span> 实际执行</span>
          <span><span className="text-rose-400">红字</span> 错误行</span>
          <span><span className="text-amber-300">黄字</span> 警告</span>
          <span><span className="text-purple-300">紫字</span> 重试策略</span>
        </div>

        {/* 日志内容 */}
        <div className="min-h-0 flex-1 overflow-y-auto scroll-touch bg-[#07070d] p-3">
          {log ? (
            <pre className="font-mono text-[11px] leading-relaxed">
              {log.split('\n').map((line, i) => (
                <div key={i} className={`whitespace-pre-wrap break-words ${lineClass(line)}`}>
                  {line || ' '}
                </div>
              ))}
            </pre>
          ) : (
            <p className="py-10 text-center text-sm text-slate-500">暂无构建日志（环境尚未构建）</p>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
