// 魔数嗅探：校验文件真实类型（不信任声明的 MIME）
function sniffMime(buf) {
  if (!buf || buf.length < 4) return null;
  // PNG
  if (buf.length > 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'image/png';
  // JPEG
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  // GIF
  if (buf.length > 6 && (buf.toString('ascii', 0, 6) === 'GIF87a' || buf.toString('ascii', 0, 6) === 'GIF89a')) return 'image/gif';
  // WEBP
  if (buf.length > 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  // MP4 / M4A / MOV（ftyp box）
  if (buf.length > 12 && buf.toString('ascii', 4, 8) === 'ftyp') {
    const brand = buf.toString('ascii', 8, 12);
    if (brand === 'M4A ' || brand === 'M4A' || brand.startsWith('M4A')) return 'audio/mp4';
    if (brand === 'qt  ') return 'video/quicktime';
    return 'video/mp4';
  }
  // MP3（ID3 头 或 帧同步字）
  if (buf.toString('ascii', 0, 3) === 'ID3') return 'audio/mpeg';
  if (buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0) return 'audio/mpeg';
  // WAV
  if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WAVE') return 'audio/wav';
  // OGG
  if (buf.toString('ascii', 0, 4) === 'OggS') return 'audio/ogg';
  // WEBM
  if (buf.length > 8 && buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3) return 'video/webm';
  return null;
}

// 嗅探结果与扩展名是否匹配（音频/视频允许 mpeg/mp4 家族互通）
function sniffMatchesExt(sniffed, ext) {
  if (!sniffed) return false;
  const audioOk = ['mp3', 'wav', 'm4a', 'ogg'].includes(ext);
  const videoOk = ['mp4', 'webm', 'mov', 'm4a'].includes(ext);
  if (audioOk && sniffed.startsWith('audio/')) return true;
  if (videoOk && sniffed.startsWith('video/')) return true;
  return sniffed.endsWith(`/${ext}`) || sniffed === `image/${ext}`;
}

module.exports = { sniffMime, sniffMatchesExt };
