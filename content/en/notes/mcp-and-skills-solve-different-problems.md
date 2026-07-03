---
title: MCP and Skills Solve Different Problems
date: '2026-03-27T12:00:00.000Z'
lang: en
type: note
slug: mcp-and-skills-solve-different-problems
tags:
  - AI
  - Skill
  - MCP
source:
  repo: en
  path: src/content/notes/mcp-and-skills-solve-different-problems.md
---
MCP is basically a capability contract. It tells you what tools exist, how to call them, and what the permission boundaries are.

A Skill is a different thing entirely. It packages how you actually get something done, which in practice is prompt logic plus a tool-use strategy.

Skills feel more immediately useful because the key steps, calling conventions, and even error handling are already written in. That was never MCP's job.

As for CLI replacing MCP, I think they are splitting into different lanes.

CLI is more straightforward for local automation and single-user setups. But once you bring in permissions, audit requirements, or cross-system coordination, a protocol layer like MCP still has advantages you cannot just wave away.

Longer term, we will probably see new interfaces that are better suited for agents specifically. These things are evolving together, not replacing one another.
