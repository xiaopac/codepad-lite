// 文件分类（与后端 utils/fileKind.js 保持一致）：
// 文本（Monaco 编辑）、图片、音频、视频
// .cc/.cxx 是 C++ 别名扩展；.h 头文件按纯文本只读预览
const TEXT_KINDS = {
  cpp: 'cpp',
  cc: 'cpp',
  cxx: 'cpp',
  py: 'python',
  c: 'c',
  txt: 'plaintext',
  h: 'plaintext',
};
const IMAGE_EXTS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp']);
const AUDIO_EXTS = new Set(['mp3', 'wav', 'm4a', 'ogg']);
const VIDEO_EXTS = new Set(['mp4', 'webm', 'mov']);
const ALLOWED_EXTS = new Set([...Object.keys(TEXT_KINDS), ...IMAGE_EXTS, ...AUDIO_EXTS, ...VIDEO_EXTS]);

const NAME_RE = /^[A-Za-z0-9_-]{1,100}\.([A-Za-z0-9]+)$/;

// 完整分类：kind + monaco 语言
export function classifyFileName(name) {
  const m = NAME_RE.exec(String(name || '').trim());
  if (!m) return null;
  const ext = m[1].toLowerCase();
  if (!ALLOWED_EXTS.has(ext)) return null;
  if (TEXT_KINDS[ext]) return { kind: 'text', language: TEXT_KINDS[ext], ext };
  if (IMAGE_EXTS.has(ext)) return { kind: 'image', language: null, ext };
  if (AUDIO_EXTS.has(ext)) return { kind: 'audio', language: null, ext };
  return { kind: 'video', language: null, ext };
}

// 编辑器高亮语言（.cpp/.py/.c/.txt）
export function monacoLanguageFromName(name) {
  const c = classifyFileName(name);
  return c && c.kind === 'text' ? c.language : 'plaintext';
}

// 可运行语言（c / cpp / python）
const RUNNABLE_LANGUAGES = new Set(['c', 'cpp', 'python']);

// 运行语言（C 与 C++ 走 Piston gcc 工具链）
export function runLanguageFromName(name) {
  const c = classifyFileName(name);
  if (!c || c.kind !== 'text') return null;
  return RUNNABLE_LANGUAGES.has(c.language) ? c.language : null;
}

// 兼容旧调用：c / cpp / python
export function languageFromName(name) {
  return runLanguageFromName(name);
}

// 文件名合法性（扩展名白名单）
export function isValidFileName(name) {
  return classifyFileName(name) !== null;
}

// 是否为可创建/编辑的文本文件
export function isTextFileName(name) {
  const c = classifyFileName(name);
  return c ? c.kind === 'text' : false;
}
