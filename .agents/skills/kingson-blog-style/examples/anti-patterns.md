# Anti-Patterns

Use this as a quality checklist before finalizing.

## Generic AI Opening

Bad:

> 随着人工智能技术的快速发展，各行各业都面临着前所未有的机遇与挑战。

Fix by naming the concrete trigger:

> 最近用 AI 工具写完了一个小项目，我最大的感受不是它能写代码，而是它开始改变开发者在项目里的位置。

## Balanced But Empty

Bad:

> 有些人认为 AI 能提升效率，也有人担心它削弱人的能力。这两种观点都有一定道理，最终要根据实际情况判断。

Fix by stating the author's view:

> 我不太担心 AI 让人不思考。我更担心的是，很多人原本就没有形成判断力，只是把复制粘贴的对象从搜索结果换成了 AI 回答。

## Bullet Pile

Bad:

```markdown
- 要提高效率
- 要重视沟通
- 要做好文档
- 要关注风险
```

Fix by selecting the real point and explaining it:

> 文档化的价值不只是方便别人看，更重要的是减少反复解释同一件事的成本。一个团队如果总靠口头同步维持运转，规模稍微变大之后，信息损耗会非常明显。

## Textbook Definition

Bad:

> RAG 是检索增强生成，它通过从外部知识库检索相关信息来增强大语言模型的生成能力。

Fix by connecting to usage:

> 我对 RAG 的理解很简单：它解决的不是模型会不会说话的问题，而是模型回答时有没有拿到当前场景下该看的资料。

## Forced Uplift

Bad:

> 只要我们保持学习，积极拥抱变化，就一定能在未来获得更大的成长。

Fix with a concrete judgment:

> 所以对开发者来说，真正要补的不是某个工具的按钮用法，而是判断一个结果能不能上线、一个方案能不能长期维护。

## Reference-Only Ending

Bad:

```markdown
## Reference
- ...
```

Fix by adding the author's takeaway before references:

```markdown
## 小结

这类方案最容易被低估的是后续维护成本。设计时如果只看第一版能不能跑通，后面基本都会在扩展和排查上还债。

## Reference
- ...
```
