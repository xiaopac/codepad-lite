import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { api } from '../api/client';

// 终端沙箱环境说明：💻 终端运行 跑在独立沙箱容器里，Python 与预装库由镜像固定，
// 与用户自己配置的「项目 Python 环境」（▶ 运行 使用）是两套环境 —— 这里把真实清单摊开给用户看。
// 沙箱镜像内容固定，取到一次就进程内缓存，重复打开不再请求。
let cache = null;

export default function SandboxEnvModal({ open, onClose }) {
  const [info, setInfo] = useState(cache);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const load = () => {
    setLoading(true);
    setError('');
    api('/api/terminal/env')
      .then((d) => {
        cache = d;
        setInfo(d);
      })
      .catch((e) => setError(e.message || '读取沙箱环境失败'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (open && !info && !error) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Esc 关闭
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const tools = (info?.tools || []).map((t) => `${t.name} ${t.version}`).join(' · ');
  const packages = info?.packages || [];
  const system = info?.system || [];
  const managedNames = new Set((info?.managed || []).map((p) => p.name.toLowerCase()));

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="sandbox-env"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          className="fixed inset-0 z-[96] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-6"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
            className="glass-strong flex max-h-[82dvh] w-full flex-col overflow-hidden rounded-t-3xl shadow-glass sm:max-w-xl sm:rounded-2xl"
          >
            {/* 标题栏 */}
            <div className="flex shrink-0 items-center gap-2 border-b border-white/10 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-100">🧪 终端沙箱环境</p>
                <p className="truncate text-[11px] text-slate-500">
                  💻 终端运行 使用的 Python 与预装库（由沙箱镜像固定）
                </p>
              </div>
              <button
                onClick={onClose}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-lg text-slate-400 transition hover:bg-white/10 hover:text-white"
                aria-label="关闭"
              >
                ✕
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto scroll-touch p-4 text-[12px] leading-relaxed">
              {loading && <p className="py-8 text-center text-sm text-slate-500">正在读取沙箱环境…</p>}

              {!loading && error && (
                <div className="py-6 text-center">
                  <p className="text-sm text-rose-300">{error}</p>
                  <button
                    onClick={load}
                    className="mt-4 h-10 rounded-lg bg-white/5 px-4 text-xs text-slate-300 transition hover:bg-white/10"
                  >
                    重试
                  </button>
                </div>
              )}

              {!loading && !error && info && (
                <>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                    <p className="text-[10px] tracking-wider text-slate-500">运行时</p>
                    <p className="mt-1 font-semibold text-cyan-200">Python {info.python}</p>
                    {tools && <p className="mt-0.5 text-slate-400">{tools}</p>}
                  </div>

                  <p className="mt-4 text-[10px] tracking-wider text-slate-500">
                    预装第三方库（{packages.length}）
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {packages.map((p) => (
                      <span
                        key={p.name}
                        className="rounded-lg border border-cyan-400/25 bg-cyan-400/10 px-2 py-1 text-[11px] text-cyan-100"
                      >
                        {p.name}
                        <span className="ml-1.5 text-cyan-300/60">{p.version}</span>
                        {managedNames.has(p.name.toLowerCase()) && (
                          <span className="ml-1.5 text-[9px] text-cyan-300/50">管理员添加</span>
                        )}
                      </span>
                    ))}
                    {!packages.length && <span className="text-slate-500">（无可列出的第三方库）</span>}
                  </div>

                  {system.length > 0 && (
                    <>
                      <p className="mt-4 text-[10px] tracking-wider text-slate-500">
                        系统组件（镜像内置，pip 装不了）
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {system.map((s) => (
                          <span
                            key={s.name}
                            className="rounded-lg border border-purple-400/25 bg-purple-400/10 px-2 py-1 text-[11px] text-purple-100"
                          >
                            {s.name}
                            <span className="ml-1.5 text-purple-300/60">{s.version}</span>
                          </span>
                        ))}
                      </div>
                    </>
                  )}

                  <div className="mt-5 rounded-xl border border-amber-400/25 bg-amber-400/10 p-3 text-amber-100/90">
                    <p className="font-semibold">终端与「▶ 运行」是两套 Python 环境</p>
                    <p className="mt-1 text-amber-100/80">
                      终端里的库由沙箱镜像 + 管理员配置决定，用户不能自己装；
                      <b>▶ 运行</b> 用的是你在「项目 Python 环境」里配置的库（可在环境管理里自行勾选安装）。
                      终端里缺的库，可以请管理员在后台「🧪 沙箱库」里添加，或改用 ▶ 运行。
                    </p>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
