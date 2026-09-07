import { useEffect } from 'react';

/**
 * iPad 软键盘弹出/收起时，visualViewport 高度会变化。
 * 把可视高度写入 CSS 变量 --app-height，应用根容器据此调整高度，
 * 配合 Monaco 的 automaticLayout，保证编辑器不被软键盘遮挡。
 */
export function useVisualViewportHeight() {
  useEffect(() => {
    const vv = window.visualViewport;
    const update = () => {
      const height = (vv && vv.height) || window.innerHeight;
      document.documentElement.style.setProperty('--app-height', `${height}px`);
    };
    update();
    if (vv) {
      vv.addEventListener('resize', update);
      vv.addEventListener('scroll', update);
    }
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    return () => {
      if (vv) {
        vv.removeEventListener('resize', update);
        vv.removeEventListener('scroll', update);
      }
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);
}
