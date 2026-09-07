import { useEffect, useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import { motion } from 'framer-motion';
import '../monacoSetup';
import { useMonacoAutocomplete } from '../hooks/useMonacoAutocomplete';
import { useEditorStore } from '../store/editorStore';
import { useProjectStore, selectCurrentFile } from '../store/projectStore';
import { useUiStore } from '../store/uiStore';
import { languageFromName } from '../utils/language';

const LANG_DOT = {
  cpp: 'bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.8)]',
  python: 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]',
};

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
            theme="vs-dark"
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
      </div>
    </div>
  );
}
