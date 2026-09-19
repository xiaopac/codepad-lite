// Python 教程数据：分支式结构（章节 → 小节）
// 每章独立文件维护（wikiData/python/），此处组装；C 为预留入口
import { introChapter } from './python/intro';
import { ch01Basics } from './python/ch01-basics';
import { ch02Collections } from './python/ch02-collections';
import { ch03Functions } from './python/ch03-functions';
import { ch04Strings } from './python/ch04-strings';
import { ch05FilesErrors } from './python/ch05-files-errors';
import { ch06Modules } from './python/ch06-modules';
import { ch07Oop } from './python/ch07-oop';
import { ch08Advanced } from './python/ch08-advanced';

export const pythonWikiData = {
  title: 'Python 教程',
  chapters: [
    introChapter,
    ch01Basics,
    ch02Collections,
    ch03Functions,
    ch04Strings,
    ch05FilesErrors,
    ch06Modules,
    ch07Oop,
    ch08Advanced,
  ],
};
