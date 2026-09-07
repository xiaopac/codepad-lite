import { create } from 'zustand';

const MAX_SAMPLES = 150; // 5 秒一采 → 约 12.5 分钟窗口

// 监控采样历史（跨 Tab 保留，图表数据源）
export const useMonitorStore = create((set) => ({
  samples: [],

  pushSample: (m) =>
    set((s) => {
      const sample = {
        t: Date.now(),
        memRss: Math.round((m.memory.rss / 1048576) * 10) / 10, // MB
        sysUsed: Math.round(((m.os.totalmem - m.os.freemem) / 1048576) * 10) / 10,
        heap: Math.round((m.memory.heapUsed / 1048576) * 10) / 10,
        load1: Math.round(m.os.loadavg[0] * 100) / 100,
        piston: m.piston.ok ? m.piston.latency_ms : null,
        ali: m.network.targets[0]?.latency_ms ?? null,
        cf: m.network.targets[1]?.latency_ms ?? null,
        gpu: m.gpu.available ? m.gpu.memoryUsedMb : null,
      };
      const samples = [...s.samples, sample];
      return { samples: samples.slice(Math.max(0, samples.length - MAX_SAMPLES)) };
    }),

  resetSamples: () => set({ samples: [] }),
}));
