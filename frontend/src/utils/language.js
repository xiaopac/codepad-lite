// 从文件扩展名推断语言：.cpp → cpp，.py → python
export function languageFromName(name) {
  const lower = String(name || '').toLowerCase();
  if (lower.endsWith('.cpp')) return 'cpp';
  if (lower.endsWith('.py')) return 'python';
  return null;
}

// 与后端一致的文件名校验（白名单，防路径穿越）
export function isValidFileName(name) {
  return /^[A-Za-z0-9_-]{1,100}\.(cpp|py)$/i.test(String(name || '').trim());
}
