// 将 Monaco 完全本地打包（不依赖 CDN），并配置 worker。
// @monaco-editor/react 默认从 jsdelivr 加载，这里通过 loader.config 指向本地 monaco。
//
// 说明：monaco-editor 0.56 起不再内置 cpp 专用语言服务 worker
// （esm/vs/language/ 下仅保留 css/html/json/typescript）。
// cpp / python 的语法高亮（monarch grammar）由 esm/vs/languages/definitions/ 注册，
// 词级基本自动补全由默认 editor worker 提供 —— 满足“Monaco 自带基本自动补全”的需求。
import * as monaco from 'monaco-editor';
// monaco-editor 0.56 的 exports map（"./*": "./esm/vs/*.js"）要求用包根相对路径导入 worker
import EditorWorker from 'monaco-editor/editor/editor.worker?worker';
import { loader } from '@monaco-editor/react';

self.MonacoEnvironment = {
  getWorker() {
    return new EditorWorker();
  },
};

loader.config({ monaco });

export default monaco;
