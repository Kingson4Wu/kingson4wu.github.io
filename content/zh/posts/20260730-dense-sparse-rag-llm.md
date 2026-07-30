---
title: Dense + Sparse：从信息表示、RAG 检索到 LLM 架构的统一理解
date: '2026-07-30T00:00:00.000Z'
lang: zh
type: post
slug: 20260730-dense-sparse-rag-llm
description: 从信息表示、RAG 检索、MoE、Sparse Attention 和推理计算几个角度，理解 Dense 与 Sparse 在现代 AI 系统里的统一思想。
tags:
  - AI
  - LLM
  - RAG
  - Retrieval
  - Transformer
---

最近在看 RAG、Embedding、MoE 和长上下文模型时，我发现 Dense 和 Sparse 这两个词会反复出现。

一开始很容易把它们当成几个独立概念：向量检索里有 Dense Retrieval，搜索系统里有 Sparse Retrieval，LLM 架构里又有 Sparse MoE 和 Sparse Attention。实际放在一起看，它们讨论的不是某一个具体技术，而是同一个工程问题：

> 信息和计算到底是全部参与，还是只让最相关的一部分参与。

简单说，Dense 更像是“整体理解”，Sparse 更像是“选择性激活”。现代 AI 系统越来越不是在 Dense 和 Sparse 之间二选一，而是让 Dense 负责理解，让 Sparse 负责选择、精确匹配和计算优化。

<figure>
  <img src="/assets/zh/posts/20260730-dense-sparse-rag-llm/dense-sparse-overview.svg" alt="Dense 负责整体语义理解，Sparse 负责选择性激活，Hybrid 组合两者能力的示意图">
  <figcaption>Dense 和 Sparse 更像一组互补关系：一个解决整体理解，一个解决选择和优化。</figcaption>
</figure>

这张图想表达的是一个很朴素的判断：Dense 和 Sparse 不应该被理解成谁替代谁。Dense 的问题通常不是不能理解，而是理解得太“圆”；Sparse 的问题通常不是不能命中，而是命中得太“硬”。真正能落地的系统，往往要在这两者之间做组合。

这篇做一个记录。

## Dense 和 Sparse 的基本差异

Dense（稠密）和 Sparse（稀疏）首先是一种信息表示方式。

Dense 表示通常是连续向量。比如“苹果手机换电池”经过 Embedding 模型之后，会变成一个固定维度的向量：

```text
[
  0.23,
  -0.15,
  0.87,
  ...
  0.42
]
```

假设这个向量是 768 维，那么每个维度基本都会有一个数值。它不是在记录“苹果”“手机”“电池”这些词是否出现，而是在一个神经网络学习出来的语义空间里表示整句话的含义。

这就是 Dense 的优势。比如“汽车”和“车辆”字面不同，但在 Embedding 空间里可能非常接近，因为它们表达的概念接近。

Sparse 表示则刚好相反。它通常在一个非常大的特征空间里，只激活少数几个维度。假设词表有 100 万个词，每个词对应一个维度：

```text
维度0：苹果
维度1：手机
维度2：电池
...
维度999999：Transformer
```

那么“苹果手机换电池”可能只激活“苹果”“手机”“换”“电池”这几个维度，其他绝大多数维度都是 0。

所以两者的差异可以简单概括为：

| 维度 | Dense | Sparse |
| --- | --- | --- |
| 表示方式 | 连续向量 | 离散特征 |
| 常见维度 | 几百到几千 | 几十万甚至百万 |
| 激活情况 | 大部分维度有值 | 少量维度非零 |
| 优势 | 语义理解 | 精确匹配 |
| 风险 | 容易模糊实体差异 | 语义泛化能力弱 |

这个差异在实际系统里非常重要。

比如查询：

```text
CUDA_ERROR_OUT_OF_MEMORY
```

Dense 可能会把它理解成“GPU 显存不足”“CUDA 错误”“显存优化”这一类问题，这对语义召回有帮助。但如果知识库里同时有 `CUDA_ERROR_OUT_OF_MEMORY`、`CUDA_ERROR_ILLEGAL_ADDRESS` 和其他相近错误码，Dense 就可能把这些东西混在一起。

Sparse 在这种场景下更可靠，因为它能直接匹配这个精确字符串。当然这里有一个工程前提：分词器和 analyzer 不能把这类错误码、型号、接口名拆坏。如果 `CUDA_ERROR_OUT_OF_MEMORY` 被错误切分或归一化，Sparse 也未必能精确命中。

这也是我理解 Dense 和 Sparse 的第一个边界：Dense 适合理解“意思相近”，Sparse 适合保证“字面不丢”。

## RAG 检索里的 Dense + Sparse

RAG 的核心不是让模型凭空回答，而是先从知识库里找出该看的资料，再交给 LLM 生成答案。因此检索质量会直接影响最后回答。

从这个角度看，Dense Retrieval 和 Sparse Retrieval 解决的是两类不同问题。

<figure>
  <img src="/assets/zh/posts/20260730-dense-sparse-rag-llm/hybrid-retrieval.svg" alt="RAG 中 Dense Retrieval 和 Sparse Retrieval 并行召回，再进行分数融合后交给 LLM 的流程图">
  <figcaption>Hybrid Retrieval 的重点不是流程复杂，而是把语义召回和精确匹配放在同一个排序体系里。</figcaption>
</figure>

这张图里的关键点不是多接了一个检索器，而是把两类证据合到同一个候选排序里。Dense 负责把“意思相近”的材料找回来，Sparse 负责把错误码、型号、接口名这类不能丢的字面特征保住。RAG 的很多问题，最后都可以追到这里：该召回的没召回，不该混在一起的混在一起了。

### Dense Retrieval 解决语义召回

Dense Retrieval 的流程很直接：

```text
文本 -> Embedding 模型 -> Dense Vector -> 向量相似度搜索
```

比如用户问：

```text
如何提高汽车续航
```

知识库里有一篇文档叫：

```text
新能源汽车电池容量优化方案
```

从关键词看，“汽车续航”和“电池容量优化”不是同一组词。但从语义看，续航、电池容量、能源效率之间有关联。Dense Retrieval 的价值就在这里：用户换了一种说法，但意思接近，它仍然有机会找回来。

所以 Dense Retrieval 很适合知识问答、相似内容发现、文档语义搜索这类场景。它解决的是“用户不一定使用知识库里的原词”的问题。

但它也有明显局限。错误码、产品型号、API 名称、人名、订单号这类内容，不应该被过度语义化。

例如：

```text
ERROR_50231
```

和：

```text
ERROR_50232
```

在语义空间里可能很接近，但在业务里可能完全不是一回事。这个时候只靠 Dense Retrieval，召回结果就容易“看起来相关，实际上错了”。

### Sparse Retrieval 解决精确匹配

Sparse Retrieval 的核心是把文本转换成稀疏特征，然后匹配这些被激活的特征。

传统 Sparse Retrieval 主要包括 TF-IDF 和 BM25。它依赖分词和词频统计。比如文档是：

```text
iPhone 电池维修价格
```

查询是：

```text
苹果手机换电池
```

两边至少可以通过“电池”这个共同特征建立相关性。

这里容易有一个误解：Sparse Vector 维度很大，是不是搜索会很慢？实际不会这么做。因为一个文本虽然挂在百万级特征空间里，但真正非零的特征可能只有几十个。搜索关注的是这些激活特征有没有共同出现，而不是逐个比较所有维度。

工程上，传统 Sparse 通常用倒排索引来加速。比如“电池”这个词对应：

```text
电池:
  doc1
  doc5
  doc100
  doc9000
```

查询“电池”时，系统不用扫描全部文档，直接从倒排列表里拿候选文档。这就是 Elasticsearch、Lucene 这类搜索系统长期使用的基础结构。

需要注意的是，倒排索引不是 Sparse 的定义，它只是传统 Sparse 检索最常见、最成熟的工程实现。

### Neural Sparse 不是简单关键词搜索

传统 Sparse 的问题也很明显：它依赖字面词项，语义泛化能力有限。

所以后面出现了 Neural Sparse Retrieval。它仍然输出稀疏特征，但特征不再完全来自人工分词，而是由模型学习出来。

比如输入：

```text
苹果手机换电池
```

模型可能激活这些特征：

```text
苹果
手机
电池
iPhone
维修
Battery
续航
```

`iPhone` 和 `Battery` 不一定出现在原文里，但模型可以学到它们和原始文本之间的语义关系。

这类方法包括 SPLADE、uniCOIL、BGE-M3 Sparse 等。我的理解是，Neural Sparse 本质上是在把 Dense 的语义扩展能力，放进 Sparse 的可匹配结构里。它不是退回到关键词搜索，而是在补传统 Sparse 的短板。

### 为什么 Hybrid Retrieval 很常见

现代 RAG 经常把 Dense Retrieval 和 Sparse Retrieval 结合起来，本质原因很简单：两者各自解决的问题不同。

比如查询：

```text
CUDA_ERROR_OUT_OF_MEMORY 如何解决
```

Dense 可以找到“GPU 显存不足解决方案”“CUDA 优化方法”这类语义相关内容。Sparse 可以确保 `CUDA_ERROR_OUT_OF_MEMORY` 这个精确错误码不被丢掉。

最后再把 Dense Score 和 Sparse Score 融合，得到最终排序。

从实际使用来看，这种组合比单一路线更稳。只用 Dense，容易召回语义相关但实体错误的内容；只用 Sparse，又容易漏掉换一种说法的相关资料。RAG 系统里最容易出问题的地方，往往不是模型不会生成，而是检索阶段没有把正确材料拿回来。

## LLM 架构里的 Dense 和 Sparse

到了 LLM 架构里，Dense 和 Sparse 的含义会发生变化。

它不再主要指“信息如何表示”，而是指“计算路径是否全部激活”。

### Dense Transformer：所有参数都参与计算

传统 Transformer 更接近 Dense 计算。每个 token 经过模型时，基本上会经过完整的参数路径。

如果一个模型有 100B 参数，那么每生成一个 token，理论上就要让大量参数参与计算。这个结构的好处是简单、稳定、训练和推理路径清晰。坏处也很直接：模型规模增加，计算成本也跟着增加。

这就是 Dense Transformer 的问题：容量和计算成本强绑定。

### MoE：参数很多，但每次只用一部分

MoE（Mixture of Experts）的思路是把模型容量和每次计算量拆开。

它的核心是：

> 模型可以拥有大量参数，但每个 token 只激活其中一部分。

一个简化结构是：

<figure>
  <img src="/assets/zh/posts/20260730-dense-sparse-rag-llm/moe-router.svg" alt="MoE 中 Router 根据 token hidden state 选择少量 Expert 激活，其余 Expert 跳过的示意图">
  <figcaption>MoE 的关键不是人为给 Expert 贴标签，而是 Router 为每个 token 选择少量计算路径。</figcaption>
</figure>

这张图需要特别强调 Router 的位置。Router 是模型内部的可学习模块，不是推理平台在外部做规则分发。它的选择发生在 token 的 hidden state 上，最后体现为每个 token 只走少数 Expert。也就是说，MoE 的 Sparse 不是“部署时少加载几个模块”，而是模型结构本身的稀疏激活。更准确地说，这种稀疏通常主要发生在 FFN / Expert 路径上，Attention 等部分并不一定跟着一起稀疏化。

这里的 Router 是模型内部的一部分，不是推理服务器、GPU 调度器或者推理框架在外面拍脑袋选择。它通常可以理解为一个 Linear Layer 加 Softmax，再取 Top-K。

比如 Router 输出：

```text
Expert1: 0.1
Expert2: 0.8
Expert3: 0.1
```

那么当前 token 可能主要走 Expert2。

Expert 也不是人工定义的“数学专家”“代码专家”“中文专家”。更准确地说，Expert 通常就是多个 FFN。普通 Transformer 是：

```text
Attention + FFN
```

MoE 则变成：

```text
Attention + FFN1 / FFN2 / FFN3 / ... / FFN64
```

Router 决定当前 token 使用哪些 FFN。

MoE 有效的关键在这里：模型总参数可以很大，比如 1.6T，但每个 token 只激活少数几个 Expert，实际计算量远低于“所有参数全部计算”。

所以 MoE 不是让模型“真的分工成了几个专家职业”，而是用稀疏激活的方式提高模型容量，同时控制每次推理的计算成本。

### 训练和推理里的分工

训练阶段，模型会同时学习 Router 和 Expert 参数，通过 loss 自动形成 token 到 Expert 的路由偏好。不是人为指定：

```text
代码 -> Expert1
数学 -> Expert2
```

推理阶段，流程仍然是 token 进入模型，Router 选 Top-K Expert，Expert 完成计算，然后合并结果。

推理框架负责 Expert 调度、GPU 通信、Batch 优化这些工程问题。但“当前 token 该走哪个 Expert”，仍然是模型 Router 决定的。

这个边界很重要。很多时候我们讨论 MoE，容易把模型内部路由和推理系统调度混在一起。前者是模型结构，后者是工程实现。

## Sparse Attention：长上下文里的另一种稀疏

除了 MoE，LLM 里还有一类常见 Sparse：Sparse Attention。

普通 Attention 里，每个 token 都可以看所有 token，复杂度是：

```text
O(n²)
```

上下文长度短的时候还可以接受，但如果做到几十万甚至 100 万 token，计算量和显存都会非常夸张。

Sparse Attention 的思路是限制注意力范围。不同方案的规则不一样，可能是局部窗口、块稀疏、全局 token、随机连接，或者几种方式组合。为了直观理解，可以先把它想成：当前 token 不看全部历史，而是重点看：

```text
最近 4096 token + 历史重要 token
```

代表方案包括 Longformer、BigBird、Sliding Window Attention 等。

它的取舍也很明确：不再假设所有 token 之间都必须两两交互，而是通过某种结构化规则保留最有价值的连接。这样可以降低计算量，但也会引入新的问题：哪些信息可以忽略，哪些信息必须保留，这个设计会直接影响长上下文效果。

所以 Sparse Attention 不是免费优化。它是在计算成本和全局注意力之间做工程取舍。

## 一个统一理解

把这些概念放在一起，Dense 和 Sparse 表面上出现在不同领域：

| 领域 | Dense | Sparse |
| --- | --- | --- |
| 信息表示 | 连续向量 | 稀疏特征 |
| RAG 检索 | 语义搜索 | 精确匹配 |
| LLM 架构 | Dense Transformer | MoE |
| Attention | Full Attention | Sparse Attention |
| 推理计算 | 全部激活 | 选择性激活 |

但底层问题是一致的：

> 不要让所有信息和计算路径无差别参与，而是选择真正相关的部分。

Dense 的价值在于整体理解。它能把不同表达映射到相近语义空间里，解决“换一种说法”的问题。

Sparse 的价值在于选择。它可以保护精确实体，可以减少无效匹配，也可以降低推理和注意力计算成本。

所以现代 AI 系统不是 Dense 或 Sparse 的胜利，而是 Hybrid 的胜利。

对应到 RAG，是 Dense Embedding + Sparse Retrieval。对应到模型架构，是 Dense Transformer + Sparse MoE。对应到长上下文，是 Full Attention 的表达能力 + Sparse Attention 的计算优化。

## 小结

我现在更倾向于把 Dense 和 Sparse 看成一组工程互补关系，而不是两个技术名词。

Dense 解决“理解”，Sparse 解决“选择”。只理解不选择，系统容易召回一堆看起来相关但不精确的内容；只选择不理解，系统又会卡在字面匹配上，漏掉真正相关的信息。

这也是 RAG、MoE、长上下文模型都在走向混合路线的原因：智能能力要靠 Dense 承担一部分，但效率、精确性和可扩展性，往往要靠 Sparse 补上。

最终目标不是追求某一种表示方式更高级，而是在具体场景里判断：哪些地方需要整体语义，哪些地方必须精确命中，哪些计算根本不该发生。
