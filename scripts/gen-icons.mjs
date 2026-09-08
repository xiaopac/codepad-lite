// 生成 CodePad Lite 全套图标（与 favicon.svg 像素级同构设计）：
//   favicon-16/32/48.png     透明背景（桌面浏览器标签页）
//   favicon-180.png          透明背景
//   apple-touch-icon.png     180×180 不透明满幅（iOS 对透明图标支持差，且要求方角满幅）
// 设计参数与 favicon.svg 一一对应：圆角矩形 r=14、边框 1.5@0.35、笔画 4.6、渐变与光晕
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';

const S = 64;                 // 设计坐标系（viewBox 0 0 64 64）
const BG_TOP = [14, 28, 48];  // #0e1c30
const BG_BOT = [9, 9, 17];    // #090911
const FG_LEFT = [0, 240, 255]; // #00f0ff
const FG_RIGHT = [168, 85, 247]; // #a855f7
const OPAQUE_BG = [10, 10, 18];  // #0a0a12（apple-touch-icon 满幅底色）

const sdSeg = (px, py, ax, ay, bx, by) => {
  const abx = bx - ax, aby = by - ay;
  const apx = px - ax, apy = py - ay;
  const t = Math.max(0, Math.min(1, (apx * abx + apy * aby) / (abx * abx + aby * aby)));
  const dx = apx - abx * t, dy = apy - aby * t;
  return Math.hypot(dx, dy);
};
const sdRoundRect = (px, py, cx, cy, hw, hh, r) => {
  const qx = Math.abs(px - cx) - (hw - r);
  const qy = Math.abs(py - cy) - (hh - r);
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
};
const cover = (d) => Math.max(0, Math.min(1, 0.5 - d / 1.2));

const STROKES = [
  [24.5, 20, 13.5, 32],
  [24.5, 44, 13.5, 32],
  [39.5, 20, 50.5, 32],
  [39.5, 44, 50.5, 32],
  [38.5, 16.5, 25.5, 47.5],
];

// 渲染一个尺寸：返回 RGBA Buffer（supersample 4x）
function render(size, opaque) {
  const SS = 4;
  const W = size * SS;
  const K = W / S;
  const STROKE_HALF = 2.3 * K;      // stroke-width 4.6
  const GLOW_HALF = 6.3 * K;        // drop-shadow(0 0 4) 光晕外缘
  const buf = Buffer.alloc(W * W * 4);
  for (let y = 0; y < W; y++) {
    for (let x = 0; x < W; x++) {
      const u = x / K, v = y / K;
      const shapeA = cover(sdRoundRect(u, v, S / 2, S / 2, S / 2, S / 2, 14));
      if (shapeA <= 0 && !opaque) continue;
      const t = (u + v) / (2 * S);
      let r = BG_TOP[0] + (BG_BOT[0] - BG_TOP[0]) * t;
      let g = BG_TOP[1] + (BG_BOT[1] - BG_TOP[1]) * t;
      let b = BG_TOP[2] + (BG_BOT[2] - BG_TOP[2]) * t;
      const ft = Math.max(0, Math.min(1, u / S));
      const fgR = FG_LEFT[0] + (FG_RIGHT[0] - FG_LEFT[0]) * ft;
      const fgG = FG_LEFT[1] + (FG_RIGHT[1] - FG_LEFT[1]) * ft;
      const fgB = FG_LEFT[2] + (FG_RIGHT[2] - FG_LEFT[2]) * ft;
      let sym = 0;
      for (const [ax, ay, bx, by] of STROKES) {
        const d = sdSeg(u, v, ax, ay, bx, by);
        sym = Math.max(sym, cover(d - GLOW_HALF) * 0.5);   // 光晕
        sym = Math.max(sym, cover(d - STROKE_HALF));       // 主体
      }
      const border = cover(Math.abs(sdRoundRect(u, v, S / 2, S / 2, S / 2, S / 2, 14)) - 0.75);
      r = r + (fgR - r) * sym;
      g = g + (fgG - g) * sym;
      b = b + (fgB - b) * sym;
      const bd = border * 0.35;
      r = r + (FG_LEFT[0] - r) * bd;
      g = g + (FG_LEFT[1] - g) * bd;
      b = b + (FG_LEFT[2] - b) * bd;
      const i = (y * W + x) * 4;
      if (opaque) {
        // 与不透明底色合成：圆角外区域填满深色（iOS 会自行裁圆角）
        const a = Math.max(shapeA, 1); // 满幅
        buf[i] = Math.round(r * shapeA + OPAQUE_BG[0] * (1 - shapeA));
        buf[i + 1] = Math.round(g * shapeA + OPAQUE_BG[1] * (1 - shapeA));
        buf[i + 2] = Math.round(b * shapeA + OPAQUE_BG[2] * (1 - shapeA));
        buf[i + 3] = 255;
      } else {
        buf[i] = Math.round(r);
        buf[i + 1] = Math.round(g);
        buf[i + 2] = Math.round(b);
        buf[i + 3] = Math.round(shapeA * 255);
      }
    }
  }
  // 4x 下采样
  const out = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const i = ((y * SS + sy) * W + (x * SS + sx)) * 4;
          const alpha = buf[i + 3];
          r += buf[i] * alpha; g += buf[i + 1] * alpha; b += buf[i + 2] * alpha; a += alpha;
        }
      }
      const o = (y * size + x) * 4;
      if (a === 0) continue;
      out[o] = Math.round(r / a);
      out[o + 1] = Math.round(g / a);
      out[o + 2] = Math.round(b / a);
      out[o + 3] = Math.round(a / (SS * SS));
    }
  }
  return out;
}

// PNG 编码
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
};
function encodePng(size, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const dir = process.argv[2] || '.';
const jobs = [
  ['favicon-16.png', 16, false],
  ['favicon-32.png', 32, false],
  ['favicon-48.png', 48, false],
  ['favicon-180.png', 180, false],
  ['apple-touch-icon.png', 180, true],
];
for (const [name, size, opaque] of jobs) {
  writeFileSync(`${dir}/${name}`, encodePng(size, render(size, opaque)));
  console.log(`written ${name} (${size}x${size}, ${opaque ? 'opaque' : 'transparent'})`);
}
