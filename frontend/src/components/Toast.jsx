import { AnimatePresence, motion } from 'framer-motion';
import { useToastStore } from '../store/toastStore';

const TYPE_STYLE = {
  info: {
    icon: 'ℹ',
    border: 'border-cyan-400/40',
    text: 'text-cyan-100',
    glow: '0 0 14px rgba(0, 240, 255, 0.25)',
  },
  success: {
    icon: '✓',
    border: 'border-emerald-400/40',
    text: 'text-emerald-100',
    glow: '0 0 14px rgba(52, 211, 153, 0.3)',
  },
  error: {
    icon: '✕',
    border: 'border-rose-400/40',
    text: 'text-rose-100',
    glow: '0 0 14px rgba(251, 113, 133, 0.3)',
  },
};

// 全局提示容器：右侧滑入 → 停留 2 秒（由 store 控制）→ 淡出滑走
export default function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <div className="pointer-events-none fixed right-3 top-3 z-[100] flex w-[min(320px,calc(100vw-24px))] flex-col gap-2">
      <AnimatePresence>
        {toasts.map((t) => {
          const style = TYPE_STYLE[t.type] || TYPE_STYLE.info;
          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 60, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 60, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 420, damping: 32 }}
              className={`glass-strong pointer-events-auto flex items-center gap-2.5 rounded-xl px-3.5 py-3 text-sm ${style.border}`}
              style={{ boxShadow: style.glow }}
              onClick={() => dismiss(t.id)}
              role="status"
            >
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs ${style.border} ${style.text}`}
              >
                {style.icon}
              </span>
              <span className={`min-w-0 break-words ${style.text}`}>{t.message}</span>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
