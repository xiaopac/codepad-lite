// 霓虹折线图：纯 SVG 实现（零第三方依赖）
// 特性：多系列发光描边、null 断点（网络中断处不连线）、自动量程、极值标注
// React.memo：纯展示组件，props 不变时跳过重渲染（需求 2.6）
import { memo } from 'react';

function NeonChart({ series, height = 160 }) {
  const W = 640;
  const H = height;

  const active = series.filter((s) => s.visible !== false && s.values.length > 0);
  const allValues = active.flatMap((s) =>
    s.values.filter((v) => typeof v === 'number' && Number.isFinite(v)),
  );

  if (allValues.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-xl bg-white/5 py-12 text-xs text-slate-500">
        正在收集数据…（每 5 秒采样）
      </div>
    );
  }

  let min = Math.min(...allValues);
  let max = Math.max(...allValues);
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const pad = (max - min) * 0.12;
  min -= pad;
  max += pad;

  const maxLen = Math.max(...active.map((s) => s.values.length));
  const x = (i) => (maxLen <= 1 ? W / 2 : (i / (maxLen - 1)) * W);
  const y = (v) => H - 8 - ((v - min) / (max - min)) * (H - 18);

  // null 断点拆分为连续线段
  const segments = (values) => {
    const segs = [];
    let cur = [];
    values.forEach((v, i) => {
      if (typeof v === 'number' && Number.isFinite(v)) cur.push([x(i), y(v)]);
      else if (cur.length) {
        segs.push(cur);
        cur = [];
      }
    });
    if (cur.length) segs.push(cur);
    return segs;
  };

  const maxUnit = active.length ? (active[0].unit || '') : '';

  return (
    <div>
      <div className="relative overflow-hidden rounded-xl border border-white/5 bg-[#0b0b13]/60 p-1">
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height }}>
          {/* 横向网格线 */}
          {[0.25, 0.5, 0.75].map((f) => (
            <line
              key={f}
              x1="0"
              x2={W}
              y1={H * f}
              y2={H * f}
              stroke="rgba(255,255,255,0.06)"
              strokeWidth="1"
            />
          ))}
          {active.map((s) =>
            segments(s.values).map((seg, i) => (
              <polyline
                key={`${s.key}-${i}`}
                points={seg.map((p) => p.join(',')).join(' ')}
                fill="none"
                stroke={s.color}
                strokeWidth="1.8"
                strokeLinejoin="round"
                strokeLinecap="round"
                style={{ filter: `drop-shadow(0 0 4px ${s.color})` }}
              />
            )),
          )}
        </svg>
        <span className="pointer-events-none absolute right-1.5 top-1 text-[10px] text-slate-600">
          max {Number(max).toFixed(1)}{maxUnit}
        </span>
        <span className="pointer-events-none absolute bottom-1 right-1.5 text-[10px] text-slate-600">
          min {Number(min).toFixed(1)}{maxUnit}
        </span>
      </div>
      <p className="mt-1.5 text-[10px] text-slate-600">
        最近 {maxLen} 个采样点 · 每 5 秒一采 · 点击图例芯片可显示/隐藏系列
      </p>
    </div>
  );
}

export default memo(NeonChart);
