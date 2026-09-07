// 从文件扩展名推断语言（需求：.cpp → C++，.py → Python）
const EXT_LANGUAGE = {
  cpp: 'cpp',
  py: 'python',
};

function languageFromName(name) {
  const ext = String(name || '').toLowerCase().split('.').pop();
  return EXT_LANGUAGE[ext] || null;
}

// 文件名白名单校验（同时防御路径穿越）
const FILE_NAME_RE = /^[A-Za-z0-9_-]{1,100}\.(cpp|py)$/i;

function isValidFileName(name) {
  return FILE_NAME_RE.test(String(name || '').trim());
}

function normalizeFileName(name) {
  return String(name || '').trim();
}

module.exports = { languageFromName, isValidFileName, normalizeFileName };
