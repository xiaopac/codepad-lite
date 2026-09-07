import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuthStore } from '../store/authStore';
import { api } from '../api/client';

const TAB_BASE = 'h-11 flex-1 rounded-lg text-base font-medium transition';
const TAB_ACTIVE = 'bg-gradient-to-r from-cyan-400/25 to-blue-500/25 text-cyan-100 shadow-neon-cyan';
const TAB_IDLE = 'text-slate-400 hover:text-slate-200';

export default function AuthPage() {
  const setAuth = useAuthStore((s) => s.setAuth);
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [registered, setRegistered] = useState(false); // 注册成功 → 待审核提示

  const switchMode = (m) => {
    setMode(m);
    setError('');
    setRegistered(false);
    setPassword('');
  };

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      if (mode === 'login') {
        const data = await api('/api/auth/login', {
          method: 'POST',
          body: { email: email.trim(), password },
        });
        setAuth(data.token, data.user);
      } else {
        // 仅邮箱注册：成功后进入 pending，等待管理员审核（不自动登录）
        await api('/api/auth/register', {
          method: 'POST',
          body: { email: email.trim(), password },
        });
        setRegistered(true);
        setPassword('');
      }
    } catch (err) {
      setError(err.message || '操作失败，请重试');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto scroll-touch p-4">
      <div className="w-full max-w-md">
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="mb-8 text-center"
        >
          <div className="text-5xl drop-shadow-[0_0_18px_rgba(0,240,255,0.6)]">⚡</div>
          <h1 className="neon-text mt-3 text-3xl font-bold tracking-widest">CodePad Lite</h1>
          <p className="mt-2 text-sm text-slate-400">
            在 iPad 上随时随地编写、编译和运行 C++ / Python
          </p>
        </motion.div>

        {registered ? (
          // 注册成功 → 待管理员审核
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="glass-strong rounded-2xl p-8 text-center shadow-glass"
          >
            <div
              className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-emerald-400/40 bg-emerald-400/10 text-3xl text-emerald-300"
              style={{ boxShadow: '0 0 24px rgba(52,211,153,0.35)' }}
            >
              ✓
            </div>
            <h2 className="mt-5 text-lg font-semibold text-emerald-300">注册成功</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-400">
              你的账号正在等待管理员审核，
              <br />
              审核通过后即可登录使用。
            </p>
            <button
              onClick={() => {
                setRegistered(false);
                setMode('login');
                setEmail('');
                setError('');
              }}
              className="mt-7 h-12 w-full rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 text-base font-semibold text-white shadow-neon-cyan transition hover:shadow-neon-cyan-lg"
            >
              返回登录
            </button>
          </motion.div>
        ) : (
          <motion.form
            onSubmit={submit}
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.08, ease: 'easeOut' }}
            className="glass-strong rounded-2xl p-6 shadow-glass sm:p-7"
          >
            <div className="mb-8 flex rounded-xl bg-white/5 p-1" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'login'}
                onClick={() => switchMode('login')}
                className={`${TAB_BASE} ${mode === 'login' ? TAB_ACTIVE : TAB_IDLE}`}
              >
                登录
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'register'}
                onClick={() => switchMode('register')}
                className={`${TAB_BASE} ${mode === 'register' ? TAB_ACTIVE : TAB_IDLE}`}
              >
                注册
              </button>
            </div>

            {/* 底部线条风格输入框：聚焦时线条变霓虹青 */}
            <label className="block">
              <span className="mb-1 block text-xs tracking-wider text-slate-400">
                {mode === 'register' ? '邮箱' : '邮箱 / 管理员账号'}
              </span>
              <input
                // 登录模式用文本输入：允许硬编码管理员账号 xiaopac（不带 @）；
                // 注册模式保持原生邮箱校验。inputMode 让 iPad 弹出邮箱键盘。
                type={mode === 'register' ? 'email' : 'text'}
                inputMode="email"
                className="input-line"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={mode === 'register' ? 'you@example.com' : '邮箱地址，管理员请输入 xiaopac'}
                autoCapitalize="none"
                autoCorrect="off"
                autoComplete="email"
                required
              />
            </label>

            <label className="mt-6 block">
              <span className="mb-1 block text-xs tracking-wider text-slate-400">密码</span>
              <input
                type="password"
                className="input-line"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === 'register' ? '至少 8 位，含大小写字母和数字' : '请输入密码'}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                required
              />
            </label>

            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-5 rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300"
              >
                {error}
              </motion.p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="mt-8 h-12 w-full rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 text-base font-semibold text-white shadow-neon-cyan transition hover:shadow-neon-cyan-lg disabled:opacity-60"
            >
              {busy ? '请稍候…' : mode === 'login' ? '登 录' : '注 册'}
            </button>

            <p className="mt-4 text-center text-xs text-slate-600">
              {mode === 'register'
                ? '注册需管理员审核，通过后方可登录'
                : '登录状态保存在本机（JWT，7 天有效）'}
            </p>
          </motion.form>
        )}
      </div>
    </div>
  );
}
