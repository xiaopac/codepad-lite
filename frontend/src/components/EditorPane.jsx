import { useEffect, useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import { AnimatePresence, motion } from 'framer-motion';
import '../monacoSetup';
import { useMonacoAutocomplete } from '../hooks/useMonacoAutocomplete';
import { useEditorStore } from '../store/editorStore';
import { useProjectStore, selectCurrentFile } from '../store/projectStore';
import { useUiStore } from '../store/uiStore';
import { useBackgroundStore } from '../store/backgroundStore';
import { toast } from '../store/toastStore';
import { languageFromName } from '../utils/language';

const LANG_DOT = {
  cpp: 'bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.8)]',
  python: 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]',
};

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

// ── 背景图层：图片 + 缩放/对比度/透明度/位置 ──
function BgLayer() {
  const image = useBackgroundStore((s) => s.image);
  const settings = useBackgroundStore((s) => s.settings);
  const editMode = useBackgroundStore((s) => s.editMode);
  const patchSettings = useBackgroundStore((s) => s.patchSettings);
  const saveSettings = useBackgroundStore((s) => s.saveSettings);

  if (!image) return null;

  // 编辑模式下拖动图片调整位置（Pointer Events，兼容 iPad 触摸）
  const startDrag = (e) => {
    if (!editMode) return;
    e.preventDefault();
    const rect = e.currentTarget.parentElement.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;
    const startPos = { x: settings.posX, y: settings.posY };
    const onMove = (ev) => {
      const dx = ((ev.clientX - startX) / Math.max(1, rect.width)) * 100;
      const dy = ((ev.clientY - startY) / Math.max(1, rect.height)) * 100;
      patchSettings({
        posX: clamp(Math.round((startPos.x + dx) * 10) / 10, -100, 100),
        posY: clamp(Math.round((startPos.y + dy) * 10) / 10, -100, 100),
      });
    };
    const onUp = () => {
      saveSettings();
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  };

  return (
    <div className="absolute inset-0 z-0 overflow-hidden bg-cyber-panel">
      <img
        src={image}
        alt=""
        draggable={false}
        onPointerDown={startDrag}
        className={`absolute select-none ${editMode ? 'cursor-move' : 'pointer-events-none'}`}
        style={{
          width: `${settings.scale}%`,
          left: `${settings.posX}%`,
          top: `${settings.posY}%`,
          transform: 'translate(-50%, -50%)',
          filter: `contrast(${settings.contrast}%)`,
          opacity: settings.opacity / 100,
        }}
      />
    </div>
  );
}

// ── 背景调节浮层：滑杆 + 上传/移除 ──
function EditorBgPanel() {
  const [open, setOpen] = useState(false);
  const image = useBackgroundStore((s) => s.image);
  const settings = useBackgroundStore((s) => s.settings);
  const patchSettings = useBackgroundStore((s) => s.patchSettings);
  const saveSettings = useBackgroundStore((s) => s.saveSettings);
  const uploadImage = useBackgroundStore((s) => s.uploadImage);
  const removeImage = useBackgroundStore((s) => s.removeImage);
  const setEditMode = useBackgroundStore((s) => s.setEditMode);
  const fileRef = useRef(null);
  const saveTimer = useRef(null);

  useEffect(() => {
    setEditMode(open);
    return () => setEditMode(false);
  }, [open, setEditMode]);

  const patch = (key) => (value) => {
    patchSettings({ [key]: Number(value) });
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveSettings(), 500);
  };

  const onPickFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 2.5 * 1024 * 1024) {
      toast.error('图片需在 2.5MB 以内');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      uploadImage(String(reader.result))
        .then(() => toast.success('编辑器背景已更新'))
        .catch((err) => toast.error(err.message || '上传失败'));
    };
    reader.readAsDataURL(file);
  };

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        className={`absolute bottom-3 right-3 z-20 flex h-11 w-11 items-center justify-center rounded-xl text-lg backdrop-blur transition ${
          open ? 'bg-cyan-400/20 text-cyan-200 shadow-neon-cyan' : 'bg-[#0d0d16]/80 text-slate-400 hover:text-cyan-200'
        }`}
        title="编辑器背景"
        aria-label="编辑器背景设置"
      >
        🎨
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="glass-strong absolute bottom-16 right-3 z-20 w-[min(300px,calc(100%-24px))] rounded-2xl p-4 shadow-glass"
          >
            <p className="mb-3 text-xs font-semibold tracking-wider text-slate-300">🎨 编辑器背景</p>
            <div className="space-y-3">
              <Slider label="缩放" value={settings.scale} min={20} max={300} suffix="%" onChange={patch('scale')} />
              <Slider label="对比度" value={settings.contrast} min={20} max={200} suffix="%" onChange={patch('contrast')} />
              <Slider label="透明度" value={settings.opacity} min={0} max={100} suffix="%" onChange={patch('opacity')} />
              <p className="text-[10px] leading-relaxed text-slate-500">
                💡 面板打开时，可直接用手指/鼠标拖动背景图片调整位置
              </p>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => fileRef.current?.click()}
                className="h-11 flex-1 rounded-lg bg-gradient-to-r from-cyan-400 to-blue-500 text-sm font-semibold text-white shadow-neon-cyan"
              >
                📷 上传图片
              </button>
              {image && (
                <button
                  onClick={() => {
                    removeImage()
                      .then(() => toast.success('背景已移除'))
                      .catch((err) => toast.error(err.message));
                  }}
                  className="h-11 shrink-0 rounded-lg border border-rose-400/40 bg-rose-500/10 px-3 text-sm text-rose-300"
                >
                  移除
                </button>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={onPickFile}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function Slider({ label, value, min, max, suffix, onChange }) {
  return (
    <label className="block">
      <span className="flex items-center justify-between text-xs">
        <span className="text-slate-400">{label}</span>
        <span className="text-cyan-200">
          {value}
          {suffix}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="cyber-range mt-1.5 w-full"
      />
    </label>
  );
}

export default function EditorPane() {
  // 模块一：注册 C++ / Python 自定义补全与签名提示
  useMonacoAutocomplete();

  const file = useProjectStore(selectCurrentFile);
  const files = useProjectStore((s) => s.files);
  const openFile = useProjectStore((s) => s.openFile);
  const closeCurrentFile = useProjectStore((s) => s.closeCurrentFile);
  const code = useEditorStore((s) => s.code);
  const fontSize = useEditorStore((s) => s.fontSize);
  const savedAt = useEditorStore((s) => s.savedAt);
  const running = useUiStore((s) => s.running);
  const runCode = useUiStore((s) => s.runCode);

  const areaRef = useRef(null);
  const rippleSeq = useRef(0);
  const [showSaved, setShowSaved] = useState(false);
  const [ripples, setRipples] = useState([]);

  // 加载用户背景（图片 + 设置）
  useEffect(() => {
    useBackgroundStore.getState().load();
  }, []);

  // 保存成功 → 右上角绿色小圆点闪烁
  useEffect(() => {
    if (!savedAt) return;
    setShowSaved(true);
    const t = setTimeout(() => setShowSaved(false), 1200);
    return () => clearTimeout(t);
  }, [savedAt]);

  // 输入变化：更新 store 并调度 2 秒防抖自动保存
  const handleChange = (value) => {
    const next = value ?? '';
    const st = useEditorStore.getState();
    if (st.code !== next) st.setCode(next);
    useProjectStore.getState().scheduleAutosave();
  };

  // 点击涟漪：在点击处泛起一圈扩散淡出的光波（纯视觉，不拦截任何交互）
  const handleAreaClick = (e) => {
    const rect = areaRef.current?.getBoundingClientRect();
    if (!rect) return;
    const id = ++rippleSeq.current;
    setRipples((rs) => [...rs, { id, x: e.clientX - rect.left, y: e.clientY - rect.top }]);
    setTimeout(() => setRipples((rs) => rs.filter((r) => r.id !== id)), 700);
  };

  const language = file ? languageFromName(file.name) || 'plaintext' : 'plaintext';

  return (
    <div className="editor-shell relative flex min-h-0 flex-1 flex-col bg-cyber-panel">
      {/* 文件标签页（类 VS Code）：文件名 + 语言点 + 关闭按钮 */}
      {files.length > 0 && (
        <div className="flex h-11 shrink-0 items-end gap-1 overflow-x-auto scroll-touch border-b border-white/10 bg-[#0b0b13]/90 px-2">
          {files.map((f) => {
            const active = file?.id === f.id;
            return (
              <div
                key={f.id}
                className={`flex h-9 shrink-0 items-center rounded-t-lg border border-b-0 text-xs transition ${
                  active
                    ? 'border-cyan-400/40 bg-[#141420] text-cyan-200 shadow-[0_-2px_12px_rgba(0,240,255,0.15)]'
                    : 'border-transparent text-slate-400 hover:bg-white/5 hover:text-slate-200'
                }`}
              >
                <button
                  onClick={() => openFile(f)}
                  className="flex min-h-[36px] items-center gap-1.5 px-3"
                >
                  <span className={`h-2 w-2 shrink-0 rounded-full ${LANG_DOT[f.language] || 'bg-slate-500'}`} />
                  <span className="max-w-[140px] truncate">{f.name}</span>
                </button>
                {active && (
                  <button
                    onClick={() => closeCurrentFile()}
                    className="mr-1 flex h-7 w-7 items-center justify-center rounded text-slate-400 transition hover:bg-white/10 hover:text-white"
                    aria-label={`关闭 ${f.name}`}
                    title="关闭标签页"
                  >
                    ✕
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 编辑区 */}
      <div ref={areaRef} onClick={handleAreaClick} className="relative min-h-0 flex-1">
        {/* 自定义背景图层（透明 Monaco 主题透出） */}
        <BgLayer />

        {/* 点击涟漪光波 */}
        {ripples.map((r) => (
          <motion.span
            key={r.id}
            initial={{ opacity: 0.5, scale: 0 }}
            animate={{ opacity: 0, scale: 1 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="pointer-events-none absolute z-[3] h-24 w-24 rounded-full border-2 border-cyan-400/60"
            style={{
              left: r.x - 48,
              top: r.y - 48,
              boxShadow: '0 0 24px rgba(0,240,255,0.5), inset 0 0 24px rgba(0,240,255,0.25)',
            }}
          />
        ))}

        {/* 右上角状态浮层：运行中旋转光晕 / 保存成功绿点 */}
        <div className="pointer-events-none absolute right-3 top-3 z-20 flex items-center gap-2">
          {running && (
            <span className="flex items-center gap-1.5 rounded-full bg-[#0d0d16]/80 px-2.5 py-1 text-xs text-cyan-200">
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1.1, ease: 'linear' }}
                className="h-3.5 w-3.5 rounded-full border-2 border-transparent border-t-cyan-300"
                style={{ boxShadow: '0 0 10px rgba(0,240,255,0.7)' }}
              />
              运行中
            </span>
          )}
          {showSaved && (
            <span
              className="saved-flash flex h-2.5 w-2.5 rounded-full bg-emerald-400"
              style={{ boxShadow: '0 0 10px rgba(52,211,153,0.9)' }}
              title="已保存"
            />
          )}
        </div>

        {!file ? (
          <div className="flex h-full items-center justify-center">
            <div className="px-6 text-center">
              <div className="text-5xl drop-shadow-[0_0_18px_rgba(0,240,255,0.35)]">📄</div>
              <p className="mt-4 text-slate-400">从左侧文件列表选择文件开始编写代码</p>
              <p className="mt-1 text-sm text-slate-600">支持 C++（.cpp）与 Python（.py）</p>
            </div>
          </div>
        ) : (
          <Editor
            height="100%"
            path={file.name}
            language={language}
            value={code}
            theme="codepad-dark"
            onChange={handleChange}
            onMount={(editor, m) => {
              // iPad 键盘快捷键：⌘/Ctrl + Enter 运行，⌘/Ctrl + S 立即保存
              editor.addCommand(m.KeyMod.CtrlCmd | m.KeyCode.Enter, () => runCode());
              editor.addCommand(m.KeyMod.CtrlCmd | m.KeyCode.KeyS, () =>
                useProjectStore.getState().saveCurrent(),
              );
            }}
            loading={
              <div className="flex h-full items-center justify-center bg-cyber-panel text-sm text-slate-500">
                正在加载编辑器…
              </div>
            }
            options={{
              fontSize, // 默认 16px，移动端友好
              fontFamily: "'JetBrains Mono', 'Cascadia Code', 'SF Mono', Menlo, Consolas, monospace",
              minimap: { enabled: false },
              wordWrap: 'on',
              wrappingStrategy: 'advanced', // 需求锁定：优化触摸换行
              automaticLayout: true, // iPad 软键盘弹出时编辑器自动调整高度
              scrollBeyondLastLine: false,
              smoothScrolling: true,
              cursorBlinking: 'smooth',
              padding: { top: 12, bottom: 12 },
              tabSize: 4,
              fixedOverflowWidgets: true,
              renderLineHighlight: 'all',
              scrollbar: { verticalScrollbarSize: 12, horizontalScrollbarSize: 12 },
              readOnly: running, // 模块四：执行期间禁止编辑，结束后自动恢复
              quickSuggestions: { other: true, comments: true, strings: true },
              suggest: { showSnippets: true, showKeywords: true, preview: true },
            }}
          />
        )}

        {/* 背景调节浮层（所见即所得） */}
        <EditorBgPanel />
      </div>
    </div>
  );
}
