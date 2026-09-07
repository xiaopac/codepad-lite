import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuthStore } from '../store/authStore';
import { api } from '../api/client';
import { toast } from '../store/toastStore';

// 预设头像（emoji，存储为字符串，无文件上传负担）
const AVATARS = ['🤖', '🦊', '🐱', '🐼', '🚀', '⚡', '🌈', '🐳', '🦁', '🐙', '👾', '🌙', '🔥', '🎯', '🍀', '🎮'];

const STATUS_META = {
  pending: { label: '待审核', cls: 'border-amber-400/40 bg-amber-400/15 text-amber-300' },
  active: { label: '已激活', cls: 'border-emerald-400/40 bg-emerald-400/15 text-emerald-300' },
  rejected: { label: '已拒绝', cls: 'border-rose-400/40 bg-rose-400/15 text-rose-300' },
};

function SectionTitle({ children }) {
  return <h3 className="text-xs font-semibold tracking-widest text-slate-500">{children}</h3>;
}

// 个人设置二级界面（右侧滑入面板）：头像 / 昵称 / 修改密码 / 账号信息
export default function ProfilePanel({ onClose }) {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  const [nickname, setNickname] = useState(user?.nickname || '');
  const [avatar, setAvatar] = useState(user?.avatar || '🤖');
  const [busy, setBusy] = useState(false);

  const [curPw, setCurPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwBusy, setPwBusy] = useState(false);

  const isAdmin = user?.role === 'admin';
  const statusMeta = STATUS_META[user?.status] || STATUS_META.pending;

  const saveProfile = async () => {
    setBusy(true);
    try {
      const data = await api('/api/user/profile', {
        method: 'PUT',
        body: { nickname: nickname.trim(), avatar },
      });
      setUser(data.user);
      toast.success('个人信息已更新');
    } catch (err) {
      toast.error(err.message || '保存失败');
    } finally {
      setBusy(false);
    }
  };

  const changePassword = async () => {
    if (newPw !== confirmPw) {
      toast.error('两次输入的新密码不一致');
      return;
    }
    setPwBusy(true);
    try {
      await api('/api/user/password', {
        method: 'PUT',
        body: { currentPassword: curPw, newPassword: newPw },
      });
      toast.success('密码修改成功');
      setCurPw('');
      setNewPw('');
      setConfirmPw('');
    } catch (err) {
      toast.error(err.message || '修改失败');
    } finally {
      setPwBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80]">
      {/* 毛玻璃遮罩 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* 右侧滑入面板 */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 320, damping: 34 }}
        className="glass-strong absolute inset-y-0 right-0 flex w-[min(400px,100vw)] flex-col border-l border-white/10 shadow-glass"
      >
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-white/10 px-4">
          <span className="neon-text text-sm font-semibold tracking-widest">⚙ 个人设置</span>
          <button
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-lg text-lg text-slate-400 transition hover:bg-white/10 hover:text-white"
            aria-label="关闭"
          >
            ✕
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto scroll-touch p-4">
          {/* ── 头像 ── */}
          <section>
            <SectionTitle>头像</SectionTitle>
            <div className="mt-3 flex items-center gap-4">
              <div
                className="h-[72px] w-[72px] shrink-0 rounded-full p-[2px]"
                style={{ background: 'conic-gradient(from 180deg, #00f0ff, #0088ff, #a855f7, #00f0ff)' }}
              >
                <span className="flex h-full w-full items-center justify-center rounded-full bg-[#0d0d16] text-3xl">
                  {avatar}
                </span>
              </div>
              <div className="grid flex-1 grid-cols-4 gap-1.5">
                {AVATARS.map((a) => (
                  <button
                    key={a}
                    onClick={() => setAvatar(a)}
                    className={`flex h-11 items-center justify-center rounded-lg text-xl transition ${
                      avatar === a
                        ? 'border border-cyan-400/60 bg-cyan-400/15 shadow-neon-cyan'
                        : 'border border-transparent bg-white/5 hover:bg-white/10'
                    }`}
                    aria-label={`选择头像 ${a}`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* ── 昵称 ── */}
          <section className="mt-6">
            <SectionTitle>昵称</SectionTitle>
            <input
              className="input-line mt-1"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="给自己起个昵称（最长 24 字符）"
              maxLength={24}
            />
            <button
              onClick={saveProfile}
              disabled={busy}
              className="mt-4 h-12 w-full rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 text-base font-semibold text-white shadow-neon-cyan transition hover:shadow-neon-cyan-lg disabled:opacity-60"
            >
              {busy ? '保存中…' : '保存个人信息'}
            </button>
          </section>

          {/* ── 修改密码 ── */}
          <section className="mt-7">
            <SectionTitle>修改密码</SectionTitle>
            {isAdmin ? (
              <div className="mt-3 rounded-xl border border-purple-400/30 bg-purple-400/10 p-3 text-xs leading-relaxed text-purple-200">
                🛡 管理员密码由服务器 <span className="font-semibold">.env 的 ADMIN_PASSWORD</span> 控制，
                修改配置后执行 <span className="font-semibold">docker compose up -d backend</span> 即可生效。
              </div>
            ) : (
              <div className="mt-2 space-y-3">
                <input
                  type="password"
                  className="input-line"
                  value={curPw}
                  onChange={(e) => setCurPw(e.target.value)}
                  placeholder="当前密码"
                  autoComplete="current-password"
                />
                <input
                  type="password"
                  className="input-line"
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  placeholder="新密码（至少 6 位）"
                  autoComplete="new-password"
                />
                <input
                  type="password"
                  className="input-line"
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                  placeholder="再次输入新密码"
                  autoComplete="new-password"
                />
                <button
                  onClick={changePassword}
                  disabled={pwBusy || !curPw || !newPw || !confirmPw}
                  className="h-12 w-full rounded-xl bg-gradient-to-r from-purple-500 to-cyan-400 text-base font-semibold text-white shadow-neon-purple transition hover:shadow-neon-purple-lg disabled:opacity-60"
                >
                  {pwBusy ? '提交中…' : '确认修改密码'}
                </button>
              </div>
            )}
          </section>

          {/* ── 账号信息 ── */}
          <section className="mt-7">
            <SectionTitle>账号信息</SectionTitle>
            <div className="glass mt-3 space-y-2 rounded-xl p-4 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-500">邮箱</span>
                <span className="min-w-0 truncate text-slate-200">{user?.email}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-500">角色</span>
                <span
                  className={`rounded-full border px-2 py-0.5 text-xs ${
                    isAdmin
                      ? 'border-purple-400/50 bg-purple-400/15 text-purple-300'
                      : 'border-cyan-400/40 bg-cyan-400/15 text-cyan-300'
                  }`}
                >
                  {isAdmin ? '🛡 管理员' : '普通用户'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-500">状态</span>
                <span className={`rounded-full border px-2 py-0.5 text-xs ${statusMeta.cls}`}>
                  {statusMeta.label}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-500">注册时间</span>
                <span className="text-slate-300">{String(user?.created_at || '').slice(0, 16)}</span>
              </div>
            </div>
          </section>
        </div>
      </motion.div>
    </div>
  );
}
