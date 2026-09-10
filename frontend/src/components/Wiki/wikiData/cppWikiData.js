// C++ 教程数据：分支式结构（章节 → 小节）
// 每章独立文件维护（wikiData/cpp/），此处组装；Python / C 为预留入口
import { introChapter } from './cpp/intro';
import { ch01Basics } from './cpp/ch01-basics';
import { ch02Functions } from './cpp/ch02-functions';
import { ch03Arrays } from './cpp/ch03-arrays';
import { ch04Pointers } from './cpp/ch04-pointers';
import { ch05Classes } from './cpp/ch05-classes';
import { ch06Inheritance } from './cpp/ch06-inheritance';
import { ch07Exceptions } from './cpp/ch07-exceptions';
import { ch08Stl } from './cpp/ch08-stl';

export const cppWikiData = {
  title: 'C++ 教程',
  chapters: [
    introChapter,
    ch01Basics,
    ch02Functions,
    ch03Arrays,
    ch04Pointers,
    ch05Classes,
    ch06Inheritance,
    ch07Exceptions,
    ch08Stl,
  ],
};
