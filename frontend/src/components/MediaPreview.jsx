import { motion } from 'framer-motion';
import { useMediaStore } from '../store/mediaStore';

const KIND_ICON = { image: '🖼', audio: '🎵', video: '🎬' };

// 媒体预览浮层：图片缩放查看 / 音频播放 / 视频播放（iPad 内联播放）
export default function MediaPreview() {
  const file = useMediaStore((s) => s.file);
  const url = useMediaStore((s) => s.url);
  const loading = useMediaStore((s) => s.loading);
  const error = useMediaStore((s) => s.error);
  const close = useMediaStore((s) => s.close);

  if (!file) return null;
  const icon = KIND_ICON[file.kind] || '📄';

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        onClick={close}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 16 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        className="glass-strong relative flex max-h-[88vh] w-[min(720px,100%)] flex-col overflow-hidden rounded-2xl shadow-glass"
      >
        {/* 标题栏 */}
        <div className="flex h-14 shrink-0 items-center gap-2 border-b border-white/10 px-4">
          <span className="text-lg">{icon}</span>
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-100">{file.name}</span>
          <button
            onClick={close}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-lg text-slate-400 transition hover:bg-white/10 hover:text-white"
            aria-label="关闭预览"
          >
            ✕
          </button>
        </div>

        {/* 内容区 */}
        <div className="flex min-h-[240px] flex-1 items-center justify-center overflow-auto scroll-touch bg-[#0a0a0f] p-3">
          {loading ? (
            <p className="animate-pulse text-sm text-slate-500">正在加载…</p>
          ) : error ? (
            <p className="px-6 text-center text-sm text-rose-400">⚠ {error}</p>
          ) : file.kind === 'image' ? (
            <img src={url} alt={file.name} className="max-h-full max-w-full select-none rounded-lg object-contain" />
          ) : file.kind === 'audio' ? (
            <audio src={url} controls autoPlay className="w-full max-w-md" />
          ) : (
            <video
              src={url}
              controls
              autoPlay
              playsInline // iPad 内联播放（不强制全屏）
              className="max-h-full max-w-full rounded-lg"
            />
          )}
        </div>
      </motion.div>
    </div>
  );
}
