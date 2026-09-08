import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuthStore } from '../store/authStore';
import { api } from '../api/client';

const TAB_BASE = 'h-11 flex-1 rounded-lg text-base font-medium transition';
const TAB_ACTIVE = 'bg-gradient-to-r from-cyan-400/25 to-blue-500/25 text-cyan-100 shadow-neon-cyan';
const TAB_IDLE = 'text-slate-400 hover:text-slate-200';

const FEATURES = [
  { icon: '🚀', title: '在线编译运行', desc: 'C++ 与 Python 即时编译执行，10 秒超时保护，结果毫秒级返回' },
  { icon: '📁', title: '项目工作区', desc: '文件夹式项目管理、多文件组织，自动保存永不丢代码' },
  { icon: '🐍', title: '自定义环境', desc: '任意 Python 版本 + 第三方库，numpy / pygame 开箱即装' },
  { icon: '🎨', title: '赛博编辑器', desc: 'Monaco 内核 + 智能补全 + 自定义背景，科技感拉满' },
  { icon: '🛡', title: '企业级治理', desc: '邮箱注册审核、限流防护、沙箱隔离，安全可控' },
  { icon: '📱', title: 'iPad 优先', desc: '44pt 触控按钮、软键盘自适应，移动端原生手感' },
];

const STACK = ['C++', 'Python', 'React', 'Monaco Editor', 'Docker', 'SQLite', 'Piston', 'Tailwind CSS', 'Zustand', 'Framer Motion'];

const STATS = [
  ['50MB', '免费存储'],
  ['2', '支持语言'],
  ['10s', '沙箱超时'],
  ['∞', '无限项目'],
];

// ── 登录/注册卡片（原 AuthPage 逻辑，无改动） ──
function AuthCard() {
  const setAuth = useAuthStore((s) => s.setAuth);
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [registered, setRegistered] = useState(false);

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

  if (registered) {
    return (
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
    );
  }

  return (
    <form
      onSubmit={submit}
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

      <label className="block">
        <span className="mb-1 block text-xs tracking-wider text-slate-400">
          {mode === 'register' ? '邮箱' : '邮箱 / 管理员账号'}
        </span>
        <input
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
        {mode === 'register' ? '注册需管理员审核，通过后方可登录' : '登录状态保存在本机（JWT，7 天有效）'}
      </p>
    </form>
  );
}

// ── NFT 风格一页式着陆页 ──
export default function AuthPage() {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto scroll-touch">
      {/* 背景动效（固定层，不拦截交互） */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="tech-grid absolute inset-0" />
        <div className="orb orb-a" />
        <div className="orb orb-b" />
        <div className="orb orb-c" />
      </div>

      <div className="relative z-10">
        {/* 顶栏 */}
        <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5">
          <div className="flex items-center gap-2">
            <span className="neon-text text-2xl">⚡</span>
            <span className="neon-text text-lg font-bold tracking-widest">CodePad Lite</span>
          </div>
          <a
            href="https://github.com/xiaopac/codepad-lite"
            target="_blank"
            rel="noreferrer"
            className="glass flex h-11 items-center gap-1.5 rounded-lg px-3 text-sm text-slate-300 transition hover:border-cyan-400/40 hover:text-cyan-200"
          >
            ⭐ GitHub
          </a>
        </header>

        {/* Hero + 登录表单 */}
        <section className="mx-auto grid max-w-5xl items-center gap-10 px-4 pb-14 pt-6 md:grid-cols-2 md:pt-10">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          >
            <p className="glass inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-xs text-cyan-200">
              ✦ 开源 · 轻便 · 简洁
            </p>
            <h1 className="mt-5 text-4xl font-bold leading-tight tracking-wide md:text-5xl">
              你的
              <br />
              <span className="gradient-text">云端代码实验室</span>
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-slate-400">
              为 iPad 而生的轻量级在线编译环境。随时随地编写、编译、运行 C++ / Python——
              项目工作区、自定义环境、50MB 免费存储，一切就绪。
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {['C++', 'Python', 'Monaco', 'Docker 沙箱'].map((t) => (
                <span
                  key={t}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300"
                >
                  {t}
                </span>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: 'easeOut' }}
          >
            <AuthCard />
          </motion.div>
        </section>

        {/* 特性展示 */}
        <section className="mx-auto max-w-5xl px-4 pb-14">
          <h2 className="text-center text-2xl font-bold tracking-wider">为什么选择 CodePad</h2>
          <p className="mt-2 text-center text-sm text-slate-500">从写下第一行代码到跑出结果，只需要三秒</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
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

        {/* 数据条 */}
        <section className="border-y border-white/10 bg-white/[0.03] py-10">
          <div className="mx-auto grid max-w-3xl grid-cols-2 gap-6 text-center sm:grid-cols-4">
            {STATS.map(([v, l]) => (
              <div key={l}>
                <p className="gradient-text text-3xl font-bold">{v}</p>
                <p className="mt-1 text-xs text-slate-500">{l}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 技术栈跑马灯 */}
        <div className="tech-marquee overflow-hidden border-b border-white/10 py-3">
          <div className="tech-marquee-track">
            {[...STACK, ...STACK].map((t, i) => (
              <span key={i} className="mx-5 text-sm text-slate-500">
                {t} <span className="text-cyan-500/60">⚡</span>
              </span>
            ))}
          </div>
        </div>

        {/* 开源声明 + 页脚 */}
        <footer className="mx-auto max-w-5xl px-4 py-8 text-center">
          <p className="text-sm text-slate-400">
            MIT 开源 · 自托管部署 ·{' '}
            <a
              className="text-cyan-300 transition hover:underline"
              href="https://github.com/xiaopac/codepad-lite"
              target="_blank"
              rel="noreferrer"
            >
              github.com/xiaopac/codepad-lite
            </a>
          </p>
          <p className="mt-2 text-xs text-slate-600">CodePad Lite © 2026</p>
        </footer>
      </div>
    </div>
  );
}
