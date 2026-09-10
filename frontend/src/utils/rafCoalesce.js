// 用 requestAnimationFrame 合并高频事件（指针拖动、resize、scroll 等）：
// 一帧内只应用最后一次，避免每次 pointermove 都触发一轮 React 渲染 / 样式重算。
// flush() 用于收尾（如松手时立即落地最后状态）。
export function rafCoalesce(fn) {
  let frame = 0;
  let lastArgs = null;
  const run = () => {
    frame = 0;
    const args = lastArgs;
    lastArgs = null;
    if (args) fn(...args);
  };
  const wrapped = (...args) => {
    lastArgs = args;
    if (!frame) frame = requestAnimationFrame(run);
  };
  wrapped.flush = () => {
    if (frame) {
      cancelAnimationFrame(frame);
      run();
    }
  };
  wrapped.cancel = () => {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    lastArgs = null;
  };
  return wrapped;
}
