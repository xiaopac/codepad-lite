import React from 'react';

// 全局错误边界：任何渲染异常都回退到友好界面（不白屏），
// 自动保存机制保证用户代码不丢失。
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // 错误详情仅记录在浏览器控制台，不展示给用户
    console.error('[frontend] 渲染异常：', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full items-center justify-center p-4">
          <div className="glass-strong w-full max-w-sm rounded-2xl p-8 text-center shadow-glass">
            <div className="text-4xl">⚠️</div>
            <p className="mt-4 font-semibold text-slate-200">页面出现异常</p>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">
              你的代码已自动保存，刷新页面即可继续使用
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-6 h-12 w-full rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 text-base font-semibold text-white shadow-neon-cyan"
            >
              刷新页面
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
