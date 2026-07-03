---
title: Why Temperature-0 LLM Inference Still Isn’t Deterministic
date: '2025-12-16T16:00:00.000Z'
lang: en
type: post
slug: >-
  nondeterminism-llm-inference-floating-point-arithmetic-engineering-implementation
description: >-
  A practical look at why identical prompts can diverge under temperature=0, how
  batch-variant kernels create that behavior, and why batch-invariant operators
  matter for RL and reproducible experiments.
updatedDate: '2025-12-16T16:00:00.000Z'
tags:
  - AI
  - LLM
source:
  repo: en
  path: >-
    src/content/blog/Nondeterminism-in-LLM-Inference-From-Floating-Point-Arithmetic-to-Engineering-Implementation.md
---
I used to think `temperature=0` meant "the model will always give the same answer." In practice, that is often false once you run inference at scale.

If the prompt, weights, and decoding strategy are identical, where does the variation come from? The short answer is that a model forward pass may be mathematically "the same" while the inference engine still executes different numerical paths under different loads.

This post is about that gap between the mental model and the implementation reality. The interesting part is not "floating point is weird" by itself, but how throughput-oriented inference systems turn tiny numerical differences into visibly different outputs.

## Where the Nondeterminism Comes From

### Non-Associativity of Floating-Point Operations

Floating-point arithmetic in computers does not satisfy the associative property. While mathematically `(a + b) + c = a + (b + c)` always holds, this equality may fail with finite-precision floating-point operations due to rounding errors.

**Concrete Example**:
```
Numbers: x=10000000, y=1, z=-10000000

Order 1: (x + y) + z
       = 10000001 + z     // Precision loss, becomes 10000000
       = 0

Order 2: x + (y + z)  
       = x + (-9999999)
       = 1
```

### Parallel Execution Changes the Order of Operations

To maximize efficiency, GPU parallel computation splits sequential calculations into multiple parallel paths and then merges results. Different parallelization strategies mean different addition tree structures, leading to different floating-point rounding paths.

**Serial Computation**:
```python
sum = 0
for i in data:
    sum += i  # Fixed order
```

**Parallel Computation (2 threads)**:
```
Thread 1: (((a+b)+c)+d)
Thread 2: (((e+f)+g)+h)
Final: thread1 + thread2
```

**Parallel Computation (4 threads)**:
```
t1: a+b,  t2: c+d,  t3: e+f,  t4: g+h
Then: (t1+t2) + (t3+t4)
```

While mathematically equivalent, the topology of the addition tree is completely different, resulting in different floating-point accumulation errors.

For a single scalar value, these differences are tiny. For token generation, they can still matter because later steps amplify them.

## The Real Engineering Problem: Batch-Variant Kernels

### Inference Engines Optimize for Throughput, Not Reproducibility

Modern inference engines (e.g., vLLM, TensorRT) dynamically select parallelization strategies based on current load to achieve maximum GPU utilization:

| Batch Size | Parallelization Strategy |
|-----------|-------------------------|
| Small batches | Simple kernels |
| Large batches | Complex parallel kernels |
| Mixed workloads | Dynamic kernel switching |

The result is simple: **the same request can take different computational paths depending on what else the system is doing**.

That is a very sensible systems choice if your goal is throughput. It is much less sensible if you assumed "`temperature=0` means bitwise stability."

### Operators Where This Shows Up Most Clearly

Three operators most prone to nondeterminism:

1. **RMSNorm**: Requires reduction across hidden dimensions; reduction tree structure varies with batch size
2. **MatMul**: Large-scale matrix multiplication accumulation order is highly sensitive
3. **Attention**: The exp-sum-normalize chain in softmax is a hotspot for numerical instability

## Why `argmax` Turns Tiny Errors Into Different Tokens

### What `argmax` Actually Does

argmax returns not the maximum value itself, but **the position of the maximum value**.

```python
logits = [5.000000, 4.999999, 3.2]
argmax(logits) = 0  # Returns token at index 0

# But if parallel path changes cause tiny errors
logits = [4.999998, 4.999999, 3.2]  
argmax(logits) = 1  # Returns token at index 1
```

### Why This Is So Fragile

argmax is a **cliff-edge mapping from continuous to discrete**:

- Before argmax: numerical changes are smooth
- After argmax: results are binary (black or white)

So a 0.000001 numerical difference can lead to:
- 100% different token selection
- Completely different subsequent generation paths
- Total divergence of generated text

This is also why `temperature=0` can be surprisingly brittle. Once you rely on a hard `argmax` boundary, "almost the same logits" is no longer "almost the same output."

## One Fix: Batch-Invariant Operators

### Core Idea

The goal is not to remove parallelism. The goal is to **keep the reduction structure stable across batch sizes and runtime conditions**.

### Implementation Approach

1. **Fixed reduction tree**: Use the same addition tree regardless of batch size
2. **Disable automatic kernel switching**: Explicitly specify computation paths; prevent engine from dynamically selecting based on load
3. **Unified normalization order**: Force fixed computation order in attention and softmax

### Trade-Offs

- ✅ Achieves complete determinism (bitwise identical results)
- ❌ Sacrifices some GPU throughput and dynamic optimization capability

### What the Reported Results Look Like

On Qwen3-235B model:
- **Before fix**: Same prompt produces 80 different outputs across 1000 inferences
- **After fix**: 1000 inferences produce identical output

## Why This Matters So Much for Reinforcement Learning

### On-Policy Assumptions Can Quietly Break

In reinforcement learning, on-policy requires:
```
Sampling policy π_sample = Training assumed policy π_train
```

But due to inference nondeterminism:
- You think you're doing greedy sampling (`temperature=0`)
- Actually argmax boundaries keep flipping
- Resulting in `π_sample ≠ π_train`
- Becomes **pseudo off-policy**

### KL Divergence as a Sanity Check

After adopting batch-invariant operators, KL divergence during training remains at 0, proving complete consistency between sampling and training. This is nearly impossible in traditional LLM reinforcement learning.

## Where This Fits in Practice

### Current State

- ✅ Working research prototype available ([GitHub repository](https://github.com/thinking-machines-lab/batch_invariant_ops))
- ✅ Validated on 235B-scale models
- ❌ Not yet integrated into mainstream inference engines (vLLM, TensorRT)

### Why This Is Not the Default Everywhere

1. **Performance cost**: Fixed computation paths mean abandoning dynamic optimization
2. **Priority mismatch**: Most applications use `temperature>0`, which already allows randomness
3. **Design philosophy conflict**: Mainstream engines prioritize throughput over determinism

### What This Solves, and What It Does Not

It is easy to overstate this approach as a universal reproducibility fix. It is not. What it gives you is **consistency inside a fixed deployment environment and time window**.

**What it does NOT guarantee**:
- Cross-version reproducibility (model weights, tokenizers will update)
- Cross-time reproducibility (inference engines, CUDA versions will change)
- Historical archival replay (doesn't record kernel versions, reduction trees)

**What it truly guarantees**:
- Within the same model version, same inference system, same deployment cycle
- Inference results do not drift due to load and scheduling variations
- This is about "eliminating system noise," not "freezing history"

By analogy, this is more like **database transaction isolation levels** rather than permanent snapshots—it guarantees consistent behavior within a transaction, but not replay of the same transaction ten years later.

Why not record the complete computation path? Because recording every kernel, every block/warp, every floating-point rounding point on a 235B model is infeasible in terms of storage, replay, and performance. The approach chosen is **structural constraints to guarantee path equivalence**—the only engineering-viable route.

### Where This Is Actually Useful

The core value of this solution lies in **consistency within the same time window**:

1. **Reinforcement Learning Training**: In a single training round, if the sampling policy drifts due to batch changes, that round is already contaminated. This isn't about whether we can reproduce results three months later—it's about maintaining on-policy within the current training cycle.

2. **Scientific Research**: Requires bitwise-level reproducibility during the experiment period to eliminate system noise from interfering with experimental conclusions.

3. **Security Auditing**: Within the audit period, identical inputs must produce identical outputs to support behavior tracing.

### What I Expect to Happen

More likely to appear as an **optional mode** in inference engines:
```bash
vllm serve --deterministic
vllm serve --batch-invariant
vllm serve --rl-training-mode
```

Similar to PyTorch's `torch.use_deterministic_algorithms(True)`, allowing users to choose between performance and determinism.

## Temperature Is Not the Same Thing as Randomness

### What Temperature Actually Changes

Temperature doesn't directly control "whether it's random" but rather **adjusts the steepness of the probability distribution**:

```
p_i = exp(z_i / T) / Σ exp(z_j / T)
```

| Temperature | Probability Distribution | Behavioral Characteristics |
|------------|-------------------------|---------------------------|
| 0 | [1, 0, 0] | Completely deterministic (argmax) |
| 1 | [0.5, 0.3, 0.2] | Original model distribution |
| 2 | [0.41, 0.32, 0.27] | More smooth |
| 5 | [0.36, 0.33, 0.31] | Near-uniform distribution |

### The Important Distinction

- **Temperature**: Changes probability distribution
- **Sampling**: Rolls the dice according to probability distribution

`temperature>0` doesn't mean "will be random"—only when combined with sampling does it truly introduce randomness.

## Closing Thought

The main lesson here is not merely that floating-point math is non-associative. It is that modern inference stacks intentionally trade numerical path stability for performance, and most of the time that is the right trade.

> **A model can be "deterministic in principle" while the serving system around it is not deterministic in practice.**

Batch-invariant operators are one way to narrow that gap. They do not make history replayable forever, but they can remove a meaningful source of system noise in places where consistency matters more than raw throughput.

That makes them especially interesting for reinforcement learning, reproducible experiments, and auditing workflows. In those settings, "slower but stable" is often a better engineering choice than "faster but numerically slippery."

---

**References**:
- Article: [Defeating Nondeterminism in LLM Inference](https://thinkingmachines.ai/blog/defeating-nondeterminism-in-llm-inference/)
- Code: [batch_invariant_ops](https://github.com/thinking-machines-lab/batch_invariant_ops)
