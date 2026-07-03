# Harness Engineering Is Not a New Paradigm

Canonical: https://kingson4wu.github.io/en/notes/harness-engineering-is-not-new-paradigm/
Markdown: https://kingson4wu.github.io/en/notes/harness-engineering-is-not-new-paradigm/index.md
Language: en
Type: note
Date: 2026-03-28
Tags: AI, LLM, Prompt Engineering

Most people are treating Harness Engineering like it’s a new paradigm. It’s not. Start from first principles: an LLM takes input and produces output. The model...

---

Most people are treating Harness Engineering like it's a new paradigm. It's not.

Start from first principles: an LLM takes input and produces output. The model is fixed. You only control two things.

The first is how you construct the input. Prompt Engineering and Context Engineering are the same problem at different scales. One is just the scaled-up version of the other. They are not two paradigms, just one continuous spectrum.

The second is how you make the system around the model reliable: execution control, evaluation, observability, and feedback loops. That is genuinely different engineering territory.

Harness Engineering is just both of these combined. OpenAI gave it a name, backed it with a 1M-line codebase story, and framed it as a new era.

The underlying problems are not new. The label is.
