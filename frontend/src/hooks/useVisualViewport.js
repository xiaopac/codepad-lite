import { useEffect } from 'react';

/**
 * iPad 软键盘弹出/收起时，visualViewport 高度会变化。
 * 把可视高度写入 CSS 变量 --app-height，应用根容器据此调整高度，
 * 配合 Monaco 的 automaticLayout，保证编辑器不被软键盘遮挡。
 *
 * 性能：visualViewport 的 scroll/resize 在滑动与缩放时可达每帧触发，
 * 这里用 requestAnimationFrame 合并，且高度未变化时不触碰 DOM（避免无谓的样式重算）。
 */
export function useVisualViewportHeight() {
  useEffect(() => {
    const vv = window.visualViewport;
    let frame = 0;
    let last = -1;

    const apply = () => {
      frame = 0;
      const height = Math.round((vv && vv.height) || window.innerHeight);
      if (height === last) return;
      last = height;
      document.documentElement.style.setProperty('--app-height', `${height}px`);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(apply);
    };

    apply();
    if (vv) {
      vv.addEventListener('resize', schedule);
      vv.addEventListener('scroll', schedule);
    }
    window.addEventListener('resize', schedule);
    window.addEventListener('orientationchange', schedule);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      if (vv) {
        vv.removeEventListener('resize', schedule);
        vv.removeEventListener('scroll', schedule);
      }
      window.removeEventListener('resize', schedule);
      window.removeEventListener('orientationchange', schedule);
    };
  }, []);
}
