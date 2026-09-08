// ═══════════════════════════════════════════════════════════════
// 支持的语言与执行引擎映射（单一事实来源）
//  - pistonLanguage：Piston /api/v2/execute 接受的语言标识
//    （实测本部署的 Piston：c → "c"（gcc 10.2.0，默认已链接 libm），
//     cpp → "cpp"（自动解析为 c++ / g++ 10.2.0），python → "python"）；
//  - packageLanguage：Piston 包索引 /api/v2/packages 中的包名
//    （C 与 C++ 共享 "gcc" 工具链包，仅装一次）；
//  - sourceName：提交给 Piston 的源文件名——Piston 依据扩展名选择编译器：
//    main.c → gcc 编译（C 语义），main.cpp → g++ 编译（C++ 语义）；
//  - C 语言没有“自定义环境”概念：始终使用 Piston 公共 gcc 镜像执行，
//    Python 环境构建不影响 C/C++。
// ═══════════════════════════════════════════════════════════════
const LANGUAGES = {
  c: {
    id: 'c',
    label: 'C',
    monaco: 'c', // Monaco 语言模式（c 与 cpp 语法高亮/补全相互独立）
    pistonLanguage: 'c',
    packageLanguage: 'gcc',
    sourceName: 'main.c',
    exts: ['c'],
  },
  cpp: {
    id: 'cpp',
    label: 'C++',
    monaco: 'cpp',
    pistonLanguage: 'cpp',
    packageLanguage: 'gcc',
    sourceName: 'main.cpp',
    exts: ['cpp', 'cc', 'cxx'],
  },
  python: {
    id: 'python',
    label: 'Python',
    monaco: 'python',
    pistonLanguage: 'python',
    packageLanguage: 'python',
    sourceName: 'main.py',
    exts: ['py'],
  },
};

// 可运行语言 ID 列表（execute 接口白名单）
const RUNNABLE_IDS = Object.keys(LANGUAGES);

module.exports = { LANGUAGES, RUNNABLE_IDS };
