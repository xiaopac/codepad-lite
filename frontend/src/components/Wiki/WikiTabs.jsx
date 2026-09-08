import { motion } from 'framer-motion';

// 语言标签：C++（完整教程）/ Python、C（预留，显示即将上线）
export default function WikiTabs({ tabs, active, onChange }) {
  return (
    <div className="flex shrink-0 gap-1.5">
      {tabs.map((t) => {
        const isActive = t.id === active;
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className={`relative flex h-10 min-w-[56px] items-center justify-center rounded-lg px-3 text-sm font-semibold transition ${
              isActive
                ? 'text-cyan-100'
                : t.enabled
                  ? 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                  : 'text-slate-600 hover:bg-white/5'
            }`}
          >
            {isActive && (
              <motion.span
                layoutId="wiki-tab-underline"
                className="absolute inset-0 rounded-lg border border-cyan-400/50 bg-cyan-400/15 shadow-[0_0_12px_rgba(0,240,255,0.35)]"
                transition={{ type: 'spring', stiffness: 400, damping: 32 }}
              />
            )}
            <span className="relative">{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}
