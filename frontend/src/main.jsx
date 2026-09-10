import React from 'react';
import ReactDOM from 'react-dom/client';
// JetBrains Mono 字体本地打包（@fontsource，无 CDN 依赖）
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/500.css';
import '@fontsource/jetbrains-mono/600.css';
import '@fontsource/jetbrains-mono/700.css';
// 注意：monacoSetup 不在此处引入——Monaco 体积大，由 EditorPane / useMonacoAutocomplete
// 在进入工作区时才加载（首页首屏因此不需要下载编辑器内核）
import './index.css';
import App from './App.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
