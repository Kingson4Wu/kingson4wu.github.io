---
title: >-
  From Custom Agents to Agent Runtime + Skill: Convergence in AI System
  Architecture
date: '2026-03-28T00:00:00.000Z'
lang: en
type: post
slug: agent-runtime-and-skill-convergence
description: >-
  A systems-level view of how AI applications are evolving from bespoke agent
  implementations toward a layered architecture of interchangeable Runtime and
  reusable Skills.
tags:
  - AI
  - LLM
  - Agent
  - Skill
  - Architecture
source:
  repo: en
  path: src/content/blog/agent-runtime-and-skill-convergence.md
---
One question keeps surfacing in how I think about AI systems: where does the "intelligence" actually live?

Common but imprecise framings include "the model is the brain," "the Agent is a human-like agent," or "LLM plus Prompt is enough." None of these hold up well at the engineering level. Time to get more precise.

## LLM: Inference Engine, Not a System

A large language model's actual function is narrow:

> **A probability-driven inference engine: token → token**

It takes in text, generates text. That's the whole scope. It doesn't manage state, execute multi-step plans, or call external systems on its own. The most basic system you can build around it is `Prompt → LLM → Output`, which means:

> **An LLM alone does not constitute a runnable system.**

## Agent: Orchestrator, Not Intelligence Itself

In engineering terms, an Agent is more accurately described as:

> **An orchestrator — a control system for task decomposition and execution.**

Its responsibilities include: understanding the task, breaking it into steps, selecting tools (tool routing), running an execution loop, managing state, and adjusting strategy based on results. The takeaway:

> **An Agent is not an "intelligence body" — it's a control system.**

## Tool vs. Skill: Structured Capability

| Concept | What it means |
|--------|---------------|
| Tool | A single capability (an API, a script) |
| Skill | A capability with context: prompt + tool + usage strategy |

More precisely:

> **Skill = Tool + how to use it + business semantics**

The value of a Skill is that it turns raw capability into a reusable, composable unit — executable knowledge, ready for an Agent to call, and the basic building block of any capability platform.

## Two Architectural Paths

### Path 1: Custom Agent

Typical stack: LangChain, LangGraph.

```
User → Application → Custom Agent → LLM → Tools / APIs
```

Here the developer owns all of it: tool selection logic, execution loop, state management, workflow control, error handling. High control, high complexity, high development cost.

### Path 2: Agent Runtime + Skill

```
User → Application → Agent Runtime (SDK / Platform) → Skills / Tools
```

Execution loop: understand task → select Skill → execute → analyze result → continue. Application side only provides the task (prompt, parameters, context) and receives the result. Orchestration is handled by the Runtime.

| Dimension | Custom Agent | Agent Runtime |
|-----------|-------------|---------------|
| Orchestration logic | Build yourself | Built in |
| Control | High | Medium / Low |
| Development cost | High | Low |
| Fit | Complex systems | Standard workflows |

### When do you actually need a custom Agent?

**Probably not** — for linear, low-branch workflows centered on generation and calling. Think: data collection → analysis → structured output → report → presentation. Runtime + Skill handles this fine.

**Probably yes** — for multi-branch logic, strong state dependencies, high consistency and reliability requirements. Auto-trading systems, risk control, multi-Agent collaboration systems. Build on LangGraph or equivalent.

## Skill Loader: The Bridge to a Capability System

A Skill Loader connects the Agent to the capability layer. Its jobs: dynamic Skill loading, decoupling capability from implementation, hot-swapping. The natural evolution:

```
Custom Skill Loader → MCP-compatible → Open Skill platform
```

### MCP + Skill + CLI: A Three-Layer Stack

| Layer | Role |
|-------|------|
| MCP (protocol) | Standardizes how tools are called |
| Skill (capability) | Encapsulates what can be done |
| CLI / API (execution) | Provides the entry point |

The core goal:

> **Build a capability system that Agents can invoke.**

## Coding Agent: From Tool to General-Purpose Runtime

"Coding Agent" sounds narrow — just an Agent that writes code. But systems like Claude Code have clearly outgrown the name. Beyond code generation, they demonstrate: task understanding and decomposition, multi-step execution, tool calling, iterative correction. These are exactly the primitives a general orchestration system needs.

Add a few more elements:

- **MCP** for standardized tool protocols
- **Skill** for capability encapsulation
- **CLI / API** for execution entry points

And the capability boundary expands to:

> **A general-purpose task execution system — a general-purpose Agent Runtime**

These tend to ship in two forms:

**Agent SDK (embeddable):** Embedded into your application. You control how the Agent is invoked. Model swaps freely, Skills are extendable. You use the Agent while still owning the Agent.

**Agent Platform (hosted):** The Agent runs on the platform side. Platform handles orchestration. You mainly provide tasks and capabilities. Model and execution logic may be bundled. You use a managed Agent system.

Both are expressions of the same goal: standardize, productize, and externalize the Agent Runtime. The difference is only where control sits.

## Architectural Convergence: A Three-Layer View

```
            ┌─────────────────┐
            │  Agent Runtime  │  ← swappable
            └────────┬────────┘
                     ↓
            ┌─────────────────┐
            │   Skill Layer   │  ← core asset
            └────────┬────────┘
                     ↓
            ┌─────────────────┐
            │  Business Sys   │
            └─────────────────┘
```

Agent Runtime is becoming infrastructure — standardized components (SDK or platform), no longer requiring developers to build the orchestration layer themselves. Attention shifts to what the system can *do*: building and accumulating Skills.

**Skill is executable knowledge:**

| Traditional knowledge | Skill |
|-----------------------|-------|
| Documentation | Executable |
| Person-in-head experience | Reusable |
| Scattered information | Structured capability |

## Implementation Path

One guiding principle: **decouple first, platform later.**

**Step 1: Decouple with a Skill Loader**

While Agent SDKs are still maturing, use a custom Skill Loader to keep business logic cleanly separated from Agent implementation. This isn't the long-term solution — it's a bridge. When the SDK stabilizes, swap it in without rewriting business logic.

**Step 2: Build the platform**

Once the internal protocol chain is in place, capability expansion changes fundamentally:

> Before: "write code to implement new features." After: "write a Skill, configure, ship."

Internally, teams compose Skills to ship faster. Externally, the platform exposes Skill combinations as capability interfaces via MCP — customers see what the system *can do*, not how it works. Capability delivery no longer requires a separate development translation layer.

## Conclusion

> **"Coding Agent" has outgrown its name. It's a general-purpose Agent Runtime.**

> **The core of AI systems is shifting: from building Agents to accumulating Skills.**

> **Agent is the replaceable execution layer. Skill is the compounding core asset. Skill platform is the delivery accelerator.**
