import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useProjectStore, selectCurrentFile } from '../store/projectStore';
import { useStorageStore } from '../store/storageStore';
import { useMediaStore } from '../store/mediaStore';
import { api } from '../api/client';
import { isValidFileName, isTextFileName } from '../utils/language';
import { toast } from '../store/toastStore';

const LANG_DOT = {
  cpp: 'bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.8)]',
  c: 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]',
  python: 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]',
};

export default function FileSidebar({ onFileAction }) {
  const project = useProjectStore((s) => s.currentProject);
  const files = useProjectStore((s) => s.files);
  const currentFile = useProjectStore(selectCurrentFile);
  const openFile = useProjectStore((s) => s.openFile);
  const createFile = useProjectStore((s) => s.createFile);
  const deleteFile = useProjectStore((s) => s.deleteFile);
  const renameFile = useProjectStore((s) => s.renameFile);
  const appendFile = useProjectStore((s) => s.appendFile);
  const openMedia = useMediaStore((s) => s.open);

  // 智能打开：文本进编辑器，媒体开预览
  const openSmart = (f) => {
    if (f.kind && f.kind !== 'text') {
      openMedia({ id: f.id, name: f.name, kind: f.kind, projectId: project?.id });
      onFileAction?.();
      return;
    }
    openFile(f);
    onFileAction?.();
  };

  // 存储空间：文件变化时刷新 + 30 秒轮询
  const storage = useStorageStore((s) => s.data);
  const loadStorage = useStorageStore((s) => s.load);
  useEffect(() => {
    loadStorage();
    const t = setInterval(loadStorage, 30000);
    return () => clearInterval(t);
  }, [loadStorage, files.length]);

  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [formError, setFormError] = useState('');
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const deleteTimer = useRef(null);
  const uploadRef = useRef(null);

  useEffect(() => () => clearTimeout(deleteTimer.current), []);

  const submitCreate = async (e) => {
    e.preventDefault();
    const name = newName.trim();
    if (!isTextFileName(name)) {
      setFormError('文本文件支持 .cpp / .py / .c / .txt（媒体文件请用上传）');
      return;
    }
    setFormError('');
    try {
      await createFile(name);
      toast.success(`已创建 ${name}`);
      setNewName('');
      setCreating(false);
      onFileAction?.();
    } catch (err) {
      setFormError(err.message || '创建失败');
    }
  };

  // 上传文件（图片/音视频）：iPad 上 accept 会弹出 照片图库/拍照/文件 App 选择
  const onPickFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) {
      toast.error('文件大小需在 15MB 以内');
      return;
    }
    setUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const pid = project?.id;
        if (!pid) return;
        const data = await api(`/api/projects/${pid}/upload`, {
          method: 'POST',
          body: { name: file.name, data: String(reader.result) },
        });
        appendFile(data.file);
        toast.success(`已上传 ${file.name}`);
        onFileAction?.();
      } catch (err) {
        toast.error(err.message || '上传失败');
      } finally {
        setUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const startRename = (file) => {
    setRenamingId(file.id);
    setRenameValue(file.name);
  };

  const commitRename = async (file) => {
    const name = renameValue.trim();
    if (!name || name === file.name) {
      setRenamingId(null);
      return;
    }
    if (!isValidFileName(name)) {
      setFormError('不支持的扩展名（文本/图片/音频/视频）');
      return;
    }
    setFormError('');
    try {
      await renameFile(file.id, name);
      toast.success(`已重命名为 ${name}`);
      setRenamingId(null);
    } catch (err) {
      setFormError(err.message || '重命名失败');
    }
  };

  const startDelete = (id) => {
    setDeletingId(id);
    clearTimeout(deleteTimer.current);
    deleteTimer.current = setTimeout(() => setDeletingId(null), 3000);
  };

  const doDelete = async (file) => {
    setFormError('');
    try {
      await deleteFile(file.id);
      toast.success(`已删除 ${file.name}`);
      setDeletingId(null);
    } catch (err) {
      setFormError(err.message || '删除失败');
    }
  };

  return (
    <div className="flex h-full w-full flex-col">
      {/* 头部：3D 旋转文件夹 + 项目名 */}
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-white/10 px-3">
        <div className="flex min-w-0 items-center gap-2">
          <motion.div
            animate={{ rotateY: [0, 22, -14, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            style={{ transformStyle: 'preserve-3d' }}
            className="shrink-0"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <defs>
                <linearGradient id="folder-g" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#00f0ff" stopOpacity="0.4" />
                  <stop offset="1" stopColor="#a855f7" stopOpacity="0.4" />
                </linearGradient>
              </defs>
              <path
                d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"
                fill="url(#folder-g)"
                stroke="#00f0ff"
                strokeWidth="1.4"
                style={{ filter: 'drop-shadow(0 0 4px rgba(0,240,255,0.6))' }}
              />
            </svg>
          </motion.div>
          <span className="min-w-0 truncate text-sm font-semibold text-cyan-100">
            {project?.name || '文件'}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {/* 上传文件（图片/音视频）：iPad 弹出 照片图库/拍照/文件 App 选择 */}
          <button
            onClick={() => uploadRef.current?.click()}
            disabled={uploading}
            className="flex h-10 items-center gap-1 rounded-lg bg-white/5 px-2.5 text-sm text-slate-300 transition hover:bg-white/10 hover:text-cyan-200 disabled:opacity-50"
            aria-label="上传文件"
            title="上传图片 / 音视频"
          >
            {uploading ? '⏳' : '⬆'}
          </button>
          <input
            ref={uploadRef}
            type="file"
            accept="image/*,audio/*,video/*"
            className="hidden"
            onChange={onPickFile}
          />
          <button
            onClick={() => setCreating((v) => !v)}
            className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 to-blue-500 text-xl font-bold leading-none text-white shadow-neon-cyan"
            aria-label="新建文件"
          >
            ＋
          </button>
        </div>
      </div>

      {/* 新建文件表单：高度 0→auto 弹簧过渡 */}
      <AnimatePresence initial={false}>
        {creating && (
          <motion.form
            onSubmit={submitCreate}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className="shrink-0 overflow-hidden border-b border-white/10"
          >
            <div className="p-3">
              <input
                autoFocus
                className="glass h-11 w-full rounded-lg px-3 text-sm text-slate-100 outline-none focus:border-cyan-400/60"
                placeholder="文件名，如 main.c / main.cpp / main.py"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                maxLength={104}
              />
              <div className="mt-2 flex gap-2">
                <button
                  type="submit"
                  className="h-11 flex-1 rounded-lg bg-gradient-to-r from-cyan-400 to-blue-500 text-sm font-semibold text-white shadow-neon-cyan"
                >
                  创建文件
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCreating(false);
                    setNewName('');
                    setFormError('');
                  }}
                  className="h-11 rounded-lg bg-white/5 px-4 text-sm text-slate-400 hover:bg-white/10"
                >
                  取消
                </button>
              </div>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {formError && <p className="shrink-0 px-3 py-1.5 text-xs text-rose-400">{formError}</p>}

      <div className="min-h-0 flex-1 overflow-y-auto scroll-touch p-2">
        {files.length === 0 ? (
          <p className="px-2 py-8 text-center text-sm leading-relaxed text-slate-500">
            这个项目还没有文件
            <br />
            创建 main.c / main.cpp / main.py 开始吧
          </p>
        ) : (
          <ul className="space-y-1">
            {files.map((f, i) => {
              const active = currentFile?.id === f.id;
              return (
                <motion.li
                  key={f.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.22, delay: Math.min(i * 0.04, 0.3), ease: 'easeOut' }}
                >
                  <div
                    className={`relative flex items-center gap-1 rounded-lg pr-1 transition ${
                      active ? 'bg-cyan-400/10' : 'hover:bg-white/5'
                    }`}
                  >
                    {/* 激活文件：左侧亮色竖条 */}
                    {active && (
                      <span
                        className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-cyan-400"
                        style={{ boxShadow: '0 0 8px rgba(0,240,255,0.9)' }}
                      />
                    )}

                    {renamingId === f.id ? (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          commitRename(f);
                        }}
                        className="flex min-h-[44px] flex-1 items-center px-2 pl-3"
                      >
                        <input
                          autoFocus
                          className="h-9 min-w-0 flex-1 rounded-md border border-cyan-400/60 bg-[#0a0a0f] px-2 text-sm text-slate-100 outline-none"
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onBlur={() => commitRename(f)}
                          maxLength={104}
                        />
                      </form>
                    ) : (
                      <button
                        onClick={() => openSmart(f)}
                        className="flex min-h-[44px] min-w-0 flex-1 items-center gap-2 px-2 pl-3 text-left"
                      >
                        {f.kind === 'image' || f.kind === 'audio' || f.kind === 'video' ? (
                          <span className="shrink-0 text-sm">
                            {f.kind === 'image' ? '🖼' : f.kind === 'audio' ? '🎵' : '🎬'}
                          </span>
                        ) : (
                          <span
                            className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                              LANG_DOT[f.language] || 'bg-slate-500'
                            }`}
                          />
                        )}
                        <span
                          className={`truncate text-sm ${
                            active ? 'font-medium text-cyan-200' : 'text-slate-300'
                          }`}
                        >
                          {f.name}
                        </span>
                      </button>
                    )}

                    {renamingId !== f.id && (
                      <div className="flex shrink-0 items-center">
                        <button
                          onClick={() => startRename(f)}
                          className="flex h-10 w-10 items-center justify-center rounded-lg text-sm text-slate-500 transition hover:bg-white/10 hover:text-cyan-200"
                          aria-label={`重命名 ${f.name}`}
                          title="重命名"
                        >
                          ✏️
                        </button>
                        {deletingId === f.id ? (
                          <button
                            onClick={() => doDelete(f)}
                            className="h-10 shrink-0 rounded-lg bg-rose-600 px-2.5 text-xs font-semibold text-white shadow-neon-purple"
                          >
                            确认删除?
                          </button>
                        ) : (
                          <button
                            onClick={() => startDelete(f.id)}
                            className="flex h-10 w-10 items-center justify-center rounded-lg text-sm text-slate-500 transition hover:bg-rose-500/20 hover:text-rose-400"
                            aria-label={`删除 ${f.name}`}
                            title="删除"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </motion.li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="shrink-0 border-t border-white/10 px-3 py-2">
        {storage && (
          <div className="mb-1.5">
            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <span>💾 存储空间</span>
              <span className={storage.percent >= 90 ? 'text-rose-400' : 'text-slate-400'}>
                {storage.used_mb} / {storage.quota_mb} MB
              </span>
            </div>
            <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-purple-500 transition-all"
                style={{
                  width: `${Math.min(100, storage.percent)}%`,
                  boxShadow: '0 0 6px rgba(0,240,255,0.6)',
                }}
              />
            </div>
          </div>
        )}
        <p className="text-[10px] leading-relaxed text-slate-600">
          支持 C（.c）、C++（.cpp）与 Python（.py）
          <br />
          内容自动保存
        </p>
      </div>
    </div>
  );
}
