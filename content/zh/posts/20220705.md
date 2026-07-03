---
title: Java跨平台能完全做到一次编写到处运行？
date: '2022-07-05T02:20:11.000Z'
lang: zh
type: post
slug: '20220705'
tags:
  - Java
  - Programming Languages
source:
  repo: zh
  path: source/_posts/20220705-Java跨平台能完全做到一次编写到处运行？.md
---
![](/assets/zh/posts/20220705/lionel-messi.jpg)

+ 最近定位一个问题，花了不少时间。事后回想起来挺低级的，在此记录一下。

## 问题
+ spring i18n, 在windows和mac生效，在linux不生效。

## 原因
1. 资源文件的名字为小写（message_zh_hant.proprties）
2. 而文件读取时包含大写（message_zh_Hant.proprties）（这里不得不吐槽一下，spring无论请求参数传的是大写还是小写，最终都会转成大写去读文件，而且这么简单的功能，代码写得及其复杂，浪费了不少时间去debug）
3. windows和mac大小写不敏感，所以能读取文件成功，而linux则大小写敏感，则读取不成功（说好的Java跨平台呢？但跨平台包括处理这种不兼容的问题？似乎很难界定。）

## 总结
+ windows和mac文件名对大小写不敏感，而linux则大小写敏感；
+ 即使使用Java编写代码，特殊的场景还是需要考虑各平台的兼容问题。
