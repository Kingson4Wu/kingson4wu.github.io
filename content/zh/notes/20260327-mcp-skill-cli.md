---
title: MCP、Skill 与 CLI 的分化与协同
date: '2026-03-27T06:05:00.000Z'
lang: zh
type: note
slug: 20260327-mcp-skill-cli
tags:
  - AI
  - Agent
  - Skill
  - MCP
source:
  repo: zh
  path: source/_posts/20260327-MCP、Skill-与-CLI-的分化与协同.md
---
MCP 更像是一份“平台能力说明书”。

它定义了有哪些工具、怎么调用、权限边界在哪。

Skill 则是在回答另一类问题：具体怎么把事做完。它本质上是 prompt 加上工具使用策略的封装。

Skill 之所以更好用，是因为关键步骤、调用方式、甚至容错逻辑，都已经被提前写进去了。这本来就不是 MCP 要解决的问题。

至于说 CLI 会不会替代 MCP，我更倾向于把它看成两类场景在分化。

CLI 在本地自动化、单用户环境下确实更直接高效；但一旦涉及权限、审计、跨系统协作，MCP 这类协议层仍然有不可忽视的优势。

长期看，也许会出现更适合 Agent 的新接口形态。

但至少在现在，CLI、MCP、Skill 更像是在协同演进，而不是简单地相互取代。
