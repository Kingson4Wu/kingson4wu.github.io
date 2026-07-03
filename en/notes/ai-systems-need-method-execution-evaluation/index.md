# AI Systems Need Method, Execution, and Evaluation

Canonical: https://kingson4wu.github.io/en/notes/ai-systems-need-method-execution-evaluation/
Markdown: https://kingson4wu.github.io/en/notes/ai-systems-need-method-execution-evaluation/index.md
Language: en
Type: note
Date: 2026-03-07
Tags: AI, Skill, Architecture

Most AI systems are still stuck in a single-inference pattern: they re-plan every time, discard execution results immediately, and accumulate no experience. A m...

---

Most AI systems are still stuck in a single-inference pattern: they re-plan every time, discard execution results immediately, and accumulate no experience.

A more sustainable architecture separates concerns into three layers:

- a method layer defining goals and strategy
- an execution layer housing validated, reusable scripts
- an evaluation layer detecting degradation and triggering repair

Reasoning should intervene only when necessary.

The deeper shift is this: in the AI era, the real code is prompts, skills, and method descriptions. Traditional code degrades into a replaceable execution artifact.

The maintenance focus moves from crafting code to clearly expressing objectives, constraints, and success criteria.
