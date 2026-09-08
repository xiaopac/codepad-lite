// 文件分类：扩展名 → { kind, language, mime_type }
// kind: 'text'（代码/文本，Monaco 编辑）| 'image' | 'audio' | 'video'（二进制，预览播放）
const TEXT_KINDS = {
  cpp: { language: 'cpp', mime: 'text/plain' },
  py: { language: 'python', mime: 'text/plain' },
  c: { language: 'c', mime: 'text/plain' },
  txt: { language: 'plaintext', mime: 'text/plain' },
};
const IMAGE_KINDS = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
};
const AUDIO_KINDS = {
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  m4a: 'audio/mp4',
  ogg: 'audio/ogg',
};
const VIDEO_KINDS = {
  mp4: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
};

const ALLOWED_EXTS = new Set([
  ...Object.keys(TEXT_KINDS),
  ...Object.keys(IMAGE_KINDS),
  ...Object.keys(AUDIO_KINDS),
  ...Object.keys(VIDEO_KINDS),
]);

const FILE_NAME_RE = /^[A-Za-z0-9_-]{1,100}\.([A-Za-z0-9]+)$/;

function classifyFileName(name) {
  const m = FILE_NAME_RE.exec(String(name || '').trim());
  if (!m) return null;
  const ext = m[1].toLowerCase();
  if (!ALLOWED_EXTS.has(ext)) return null;
  if (TEXT_KINDS[ext]) return { kind: 'text', language: TEXT_KINDS[ext].language, mime_type: TEXT_KINDS[ext].mime, ext };
  if (IMAGE_KINDS[ext]) return { kind: 'image', language: 'binary', mime_type: IMAGE_KINDS[ext], ext };
  if (AUDIO_KINDS[ext]) return { kind: 'audio', language: 'binary', mime_type: AUDIO_KINDS[ext], ext };
  return { kind: 'video', language: 'binary', mime_type: VIDEO_KINDS[ext], ext };
}

// 文本类文件（可 Monaco 编辑）
function isTextKind(name) {
  const c = classifyFileName(name);
  return c ? c.kind === 'text' : false;
}

module.exports = { classifyFileName, isTextKind, ALLOWED_EXTS };
