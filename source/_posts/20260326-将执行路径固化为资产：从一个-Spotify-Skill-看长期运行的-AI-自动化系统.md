---
title: 将执行路径固化为资产：从一个 Spotify Skill 看长期运行的 AI 自动化系统
date: 2026-03-26 23:02:21
tags: [AI哲学, LLM, AI, 深度学习, Browser-Automation, Agent, Skill]
description: 以 labali-spotify-publish-episode 为例，拆解一个长期运行的 AI 自动化系统如何通过分层、快路径、自愈闭环与业务状态验证维持可维护性。
---

> 一个真实发布场景里的分层、快路径、自愈闭环与业务状态验证

上一篇《[将执行路径固化为资产：一种面向长期运行的 AI 架构](https://kingson4wu.github.io/2026/02/26/20260226-jiang-zhi-xing-lu-jing-gu-hua-wei-zi-chan-yi-chong-mian-xiang-chang-qi-yun-xing-de-ai-jia-gou/)》主要讲理论，这篇直接讲实战，拿 [`labali-spotify-publish-episode`](https://github.com/Kingson4Wu/labali-skills/tree/main/skills/public/labali-spotify-publish-episode) 这个 skill 来拆。

这个 skill 的代码就在 `labali-skills/skills/public/labali-spotify-publish-episode/`，目标也很直接：在 Spotify for Creators 里通过浏览器自动化发布播客单集。

在一个长期运行的 AI 系统里，真正稳定的资产不是某段脚本，也不是某次成功点击，而是更上层的目标语义与执行结构。放到一个真实 skill 上，问题就会变得很具体：当 UI 持续变化、局部路径不断漂移时，这个系统为什么还没有退化成一堆脆弱脚本。

## 开场：一次成功点击，为什么不等于系统稳定

先说结论：浏览器自动化里最危险的错误，通常不是 selector 失效，也不是模型点错按钮，而是系统把“动作执行了”误判成“业务完成了”。点击成功只是点击成功，和任务完成不是一回事。

在 Spotify for Creators 这样的发布场景里，这件事尤其明显。`Publish` 按钮点下去，不代表节目已经真正进入 `Published`；UI 可能先给出反馈，后面的列表状态却还没更新；更糟的时候，节目甚至还停在 `Draft`。所以这里的正确性，不能靠 action success 来定义，只能靠业务状态来定义。

所以这个 skill 真正值得写的，不是“把发播客自动化了”，而是它把一件很容易被写成脆弱脚本的事情，拆成了稳定的语义层、会变的策略层和可以替换的执行层。能长期跑的系统，不是因为某个动作写得漂亮，而是因为它先搞清楚自己到底要保证什么。

## 用一个真实 skill 把问题落地

`labali-spotify-publish-episode` 做的事情并不复杂，就是在 Spotify for Creators 里发布播客 episode。它不用 API，只走浏览器；默认复用人工登录态；既要能进入发布流程，也要能判断什么时候发布真的完成了。

从流程上看，这个 skill 的主线并不复杂：先进入 creators 页面，或者复用已经打开的 tab；再判断当前是在 episode 列表页、上传和编辑 wizard，还是 review / publish 阶段；然后上传音频，填写标题、描述、封面和其他元数据；接着推进到 publish controls；如果是立即发布，就去 Published 列表里确认，如果是 `publish_at` 未来的定时发布，就去 Scheduled 列表里确认。最后还要做一件很容易被忽略的事：确认同名 episode 没有继续留在 Draft。

这条链路看起来像一次普通的网页操作，但真正难的地方不在“怎么点”，而在“怎么判断点完之后到底发生了什么”。这也是这类 skill 和普通 UI 自动化真正分家的地方。普通脚本关心动作有没有执行，长期运行的 skill 关心目标有没有真的达成。

如果把这篇文章的核心压缩一下，其实就是下面这张表：

| 核心思想 | 对应层 / 机制 |
|---|---|
| 目标语义稳定 | `Policy (SKILL.md)`：用语义语言描述目标与约束，不随 UI 变动 |
| deterministic 代码加速 | `Execution` 层中的缓存快路径：快速重放已知成功路径 |
| 自我修正 | `pending-regen.json` 机制：cache 失效后由 policy 兜底，并在下次启动时重建快路径 |

也可以把它看成这样一条链路：

```text
Policy 语义
  -> executor.ts 执行
  -> trajectory JSON
  -> deterministic.ts（Execution 层的缓存加速层）
                              ^
                              |
                        自动再生成（自我修正）
```

## 三层架构：真正稳定的到底是什么

这个 skill 的结构并不复杂，但很有代表性。把它拆开看，其实就是下面这三层：

| 层 | 位置 | 作用 | 稳定性 |
|---|---|---|---|
| `Policy` | `SKILL.md` | 定义“做什么”，稳定，不依赖任何 UI 实现 | 高 |
| `Strategy` | `references/` | 定义“怎么做”，随 UI 变化更新，但不写代码 | 中 |
| `Execution` | `scripts/` | 具体实现，完全可替换 | 低 |

三者的依赖方向也是单向的：`Execution` 依赖 `Strategy` 提供的 UI 线索，`Strategy` 依赖 `Policy` 定义的目标语义，而 `Policy` 不依赖任何下层。这个分层不是形式主义，它的意义很直接，就是把稳定的东西和会漂的东西拆开。

所以 UI 改版时，处理方式也不是一把梭，而是按变化类型处理：

- 文案变了，优先改 `references/plan.md`
- 元素移位了，改 `scripts/`
- 新增字段了，两边都要动
- 流程真的重构了，三层都要跟着变

换句话说，`Policy` 不动，是因为“发布播客”这个目标没变；`Strategy` 更新，是因为页面上可观察到的 UI 线索变了；`Execution` 更新，则是因为具体选择器和交互代码需要跟着调整。

这个规则看起来朴素，本质上是在控制系统的重构成本。越早把什么该稳定、什么该变讲清楚，后面越不容易把一个 skill 写成满地 selector 的泥球。很多自动化脚本后来越来越难维护，不是因为页面太复杂，而是一开始就没把稳定层和易变层分开。

## Execution 内部的两种策略：adaptive 与 deterministic

如果只看执行层，很容易误会 `scripts/cache/deterministic.ts` 是另一层。不是。它仍然属于 Execution，只不过它是快路径，而 `executor.ts` 是自适应路径。

两者的分工很明确。`executor.ts` 会 snapshot 页面，遍历 refs，尝试候选，处理 fallback，遇到意外状态时继续找路。它比较慢，但稳，是这个系统的老师，也是兜底路径。`deterministic.ts` 则不再探索，它沿着已知成功的语义模式直接走，能快就快，出错就直接失败，不再替你猜。它像一条走熟了的路，适合在 UI 还没明显变化的时候直接复用。

这里最关键的一点是：快路径不是取代兜底路径，而是建立在兜底路径之上的。系统先靠 adaptive executor 跑通，记录成功轨迹，再把这条轨迹固化成 deterministic fast path。这样做的好处很现实：平时跑得快，UI 变了也不至于直接报废。

也正因为如此，`deterministic.ts` 的定位必须说清楚。它不是第四层，不是一个新的架构支柱，它只是 Execution 里的一种执行策略。把这件事说错，后面所有“自动再生成”的讨论都会漂掉。

更准确地说，Execution 层内部其实有两种模式：

| 模式 | 角色 | 特点 |
|---|---|---|
| `executor.ts` | adaptive executor | 会探索、会 fallback、比较慢，但稳，是系统老师 |
| `scripts/cache/deterministic.ts` | deterministic fast path | 不探索，沿已知成功语义路径直走，快，但 fail fast |

所以这里不是“又多了一层”，而是同一层里有两种不同执行策略：一种负责可靠性，一种负责速度。

## 自愈闭环：为什么这不是传统自动化，而是 LLM 驱动的系统修复

这个 skill 最有意思的地方，其实不在快路径本身，而在它怎么把快路径修回来。它的闭环是这样的：先尝试 deterministic fast path；如果失败，就自动降级到 adaptive / policy executor；policy executor 如果跑通，就写出 trajectory；随后 `auto-executor.ts` 生成 `pending-regen.json`；下一次 startup check 的时候，LLM 读取这个 marker 和 trajectory，重写 `scripts/cache/deterministic.ts`；用户只要再跑一次，快路径就恢复了。

这里的“自动生成”不是传统代码生成器的意思，也不是某个 runtime 在后台悄悄帮你改代码。更准确地说，LLM 被放进了执行架构里，作为 startup repair 的一部分来工作。它不是旁观者，而是修复链条中的一环。

这个设计之所以成立，是因为它把“失败”当成一种正常输入，而不是异常事件。deterministic 失败，不说明系统坏了，只说明 fast path 已经过时；policy executor 跑通，不只是把任务完成了，还顺便留下了下一次优化的材料。这样一来，系统不是靠人工回头维护快路径，而是靠一次次运行把自己的直线路径重新学回来。

这比“代码自动生成”要更接近现实，也更接近长期运行系统真正需要的东西：不是一次性生成一个看起来很聪明的文件，而是让系统有能力在 UI 漂移后恢复自己。换句话说，这里追求的不是一次性写对，而是持续可修复。

如果要把这个过程画得再直白一点，大概就是这样：

```text
deterministic 先跑
    -> 成功：直接返回
    -> 失败：降级到 policy / adaptive executor
                 -> 成功：写 trajectory
                          -> 写 pending-regen.json
                          -> 下次 startup check 时由 LLM 重写 deterministic.ts
                 -> 失败：进入恢复协议
```

## 正确性原则：为什么 NEVER 里最重要的是业务状态验证

这个 skill 的 NEVER 里，有一条是最重要的：不能靠 click 成功判断完成，必须用业务状态验证。这个原则不是为了显得严苛，而是因为真实系统里，点击成功和业务完成之间经常隔着一层不稳定的状态同步。

在 Spotify 发布场景里，最可信的判断不是“我点过了 Publish”，而是“这个 episode 现在出现在 Published 或 Scheduled 列表里，并且没有还留在 Draft”。也就是说，成功标准不是动作本身，而是动作对业务世界造成了什么结果。

这个判断方式有两个好处。第一，它避免被 UI 的短暂反馈骗过去。第二，它让系统在发生异步延迟时仍然有一致的终态标准。只要终态没出现，就不能算成功。这个原则看上去保守，实际上是长期运行系统最基本的自我保护。

如果把这件事再说得更直白一点：点击只是过程，列表状态才是结论。一个自动化系统如果只会证明自己点到了按钮，它离真正可用还差得远。

这里也可以顺手把几种“稳定性”排一下序：

| 层 / 机制 | 稳定性 | 原因 |
|---|---|---|
| `Policy` | 高 | 定义的是目标语义，不依赖具体 UI 实现 |
| `Strategy` | 中 | 依赖当前界面的观察线索，UI 变化时需要更新 |
| `Execution` | 低 | 直接承受页面结构、交互方式和流程变化 |

## 失败恢复协议：长期运行系统不是避免失败，而是把失败变成可处理事件

policy executor 的失败处理也不是“多试几次”那么简单。它的恢复协议是有约束的：先 re-snapshot，再 re-detect current stage，然后从最后已知正确阶段继续，最多重试 3 次；如果最后还是失败，报告里必须带上当前阶段名、当前可观测状态和失败动作。

这套约束的意义在于，它要求系统在失败时仍然知道自己在哪里。很多自动化脚本一旦卡住，问题不是错一次，而是它根本不知道自己现在处于哪个阶段。没有阶段感，就没有恢复策略；没有可观测状态，就只剩下瞎重试。

所以这里的重试不是蛮力重试，而是带上下文的恢复。re-snapshot 是为了重新看清页面，re-detect stage 是为了重新判断当前语义位置，失败报告则是为了让下一次修复有依据。这个协议不花哨，但很实用。长期运行的系统不需要每次都对，它需要在错的时候别把自己带偏。

## 从 Spotify skill 抽象出一套可复用方法

把这个 skill 抽象出来，真正值得留下的不是 Spotify 本身，而是它的组织方式。一个长期运行的 AI browser skill，至少应该把几件事分开：稳定的目标语义、可更新的 UI 策略层、可替换的执行层、快路径与兜底路径并存、以 LLM 为引擎的自愈机制，以及以业务状态而不是动作完成来定义成功。

这套东西看起来没有什么炫技的地方，但它解决的是长期运行里最现实的问题：UI 会变，流程会漂移，局部动作会失效，而系统不能因为这些变化就失去可维护性。真正可复用的不是某个 selector，也不是某个页面套路，而是这套分层、加速与恢复逻辑。

落到 `labali-spotify-publish-episode` 这个 skill 上，答案也很清楚：稳定的是 `Policy` 里的语义目标，`deterministic` 只是加速，自愈闭环负责把快路径修回来，业务状态验证负责定义什么叫真的完成。Spotify 只是案例，方法才是重点。

## 扩展
补充一句，写这个 skill 的过程中，我还用了 [`skill-judge`](https://github.com/shareAI-lab/shareAI-skills/blob/main/skills/skill-judge/SKILL.md) 来做评估，我个人很推荐。它的价值不在于“打分”，而在于它基于 17 个以上官方示例总结出了一套更像样的 Skill 判断标准，能帮助你区分哪些内容是真正沉淀下来的知识，哪些只是模型本来就会的废话。
