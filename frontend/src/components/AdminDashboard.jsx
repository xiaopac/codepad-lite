import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import AdminUsers from './AdminUsers';
import AdminMonitor from './AdminMonitor';
import AdminLogs from './AdminLogs';

const TABS = [
  { id: 'users', label: '👥 用户管理' },
  { id: 'monitor', label: '📡 系统监控' },
  { id: 'logs', label: '📜 执行日志' },
];

const TAB_BASE = 'relative flex h-11 items-center rounded-lg px-3 text-sm font-medium transition';

// 管理员后台：用户管理 / 系统监控 / 执行日志
export default function AdminDashboard({ onBack }) {
  const [tab, setTab] = useState('users');

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="glass-strong flex h-14 shrink-0 items-center gap-2 border-x-0 border-t-0 px-3">
        <button
          onClick={onBack}
          className="flex h-11 shrink-0 items-center gap-1 rounded-lg px-2 text-sm text-slate-400 transition hover:bg-white/10 hover:text-cyan-200"
        >
          <span className="text-lg leading-none">←</span> 返回
        </button>
        <span className="neon-text-purple text-base font-semibold tracking-wider">🛡 管理后台</span>
      </header>

      <div className="flex h-12 shrink-0 items-end gap-1 border-b border-white/10 px-3">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`${TAB_BASE} ${tab === t.id ? 'text-purple-200' : 'text-slate-500 hover:text-slate-300'}`}
          >
            {t.label}
            {tab === t.id && (
              <motion.span
                layoutId="admin-tab-underline"
                className="absolute inset-x-2 -bottom-0.5 h-0.5 rounded-full bg-purple-400"
                style={{ boxShadow: '0 0 8px rgba(168,85,247,0.8)' }}
              />
            )}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto scroll-touch p-4">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
            {tab === 'users' && <AdminUsers />}
            {tab === 'monitor' && <AdminMonitor />}
            {tab === 'logs' && <AdminLogs />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
