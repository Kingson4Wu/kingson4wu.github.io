---
title: 从第一性原理看 Harness Engineering
date: '2026-03-28T06:10:00.000Z'
lang: zh
type: note
slug: 20260328-harness-engineering
tags:
  - AI
  - LLM
  - MCP
  - Prompt Engineering
source:
  repo: zh
  path: source/_posts/20260328-从第一性原理看-Harness-Engineering.md
---
LLM 只做一件事：给定输入，生成输出。

模型是固定的。你能控制的，其实只有输入，以及围绕输入输出构建的系统。

由此派生出两个真实的工程问题域。

## 问题域 A：如何构造更好的输入

这是一个连续的复杂度谱系：

- 手工写指令 -> Prompt Engineering
- 动态检索、拼装、压缩信息 -> Context Engineering

两者解决的是同一类问题，只是复杂度不同。

Context Engineering 本质上是 Prompt Engineering 在系统规模下的自然延伸。它们是同一问题域上复杂度递增的连续谱系，不是独立的新范式。

## 问题域 B：如何让围绕模型的系统可靠运行

执行控制、测试评估、监控、改进闭环，这才是真正不同的问题域。

它和输入构造无关，是围绕模型系统化运行时新增出来的工程复杂度。

## 更清晰的结构

```text
LLM 工程
│
├── 输入构造（A）
│   └── Prompt Engineering -> Context Engineering
│       （同一问题域，复杂度递增）
│
└── 系统可靠性（B）
    └── Execution / Eval / Observability / Feedback
        （不同问题域，真正的新增复杂度）
```

Harness Engineering = A + B，不是独立的新范式。

结论也就很清楚：

- Prompt Engineering 和 Context Engineering：程度差异，不是本质差异
- Harness 的工程基础设施层：才是真正不同的问题域
- 把三者并列称为独立范式：是一种概念通货膨胀，反而掩盖了真实的工程结构
