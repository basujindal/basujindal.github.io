---
title: "Fused MLP: Applying the FlashAttention Trick to SwiGLU"
date: 2026-04-03
---


A SwiGLU MLP block computes two matrix multiplications with a nonlinearity in between. The standard implementation materializes the intermediate activation in GPU global memory (GMEM). This post revisits the classic **fused MLP** idea from the perspective of **Blackwell prefill kernels**, where long sequence lengths make activation traffic expensive and where Blackwell adds new tools — **TCGen05 MMA**, **TMA**, **TMEM**, and **2-CTA tensor-core execution** — that change what is practical.

The conclusion is subtle:

- The **algebraic trick** behind fusion is still the same as FlashAttention: do work in tiles, keep the intermediate on-chip, and avoid writing it to GMEM.
- **Blackwell makes this more attractive** for prefill by improving on-chip data movement and tensor-core throughput.
- But **dense end-to-end fusion is still fundamentally constrained by the output accumulator size**: MLP accumulates over the **model dimension** $d$, whereas FlashAttention accumulates over the **head dimension** $d_{\text{head}}$.

So Blackwell helps, especially for prefill and smaller-$d_2$ cases

---

## 1. The Standard (Unfused) MLP

Given input $x \in \mathbb{R}^{T \times d}$, gate and up projection weights $W_g, W_v \in \mathbb{R}^{d \times d_2}$, and down projection weight $W_o \in \mathbb{R}^{d_2 \times d}$,

$$
h = \mathrm{swish}(xW_g)\odot(xW_v)\in\mathbb{R}^{T\times d_2}
$$

$$
y = hW_o\in\mathbb{R}^{T\times d}
$$

The usual implementation performs:

1. GEMM for $xW_g$
2. GEMM for $xW_v$
3. elementwise SwiGLU
4. write $h$ to GMEM
5. read $h$ back
6. GEMM for $hW_o$

The key inefficiency is steps 4 and 5: the intermediate $h$ makes a full round trip through global memory.

That costs

$$
2Td_2
$$

elements of additional compulsory traffic (one write, one read).

---

## 2. The Basic Fused Idea

The algebraic observation is simple: split the intermediate dimension $d_2$ into chunks and consume each chunk immediately.

Let

- $B = T / b_T$: number of token blocks
- $C = d_2 / b_{d_2}$: number of intermediate chunks

For block $b$, define

$$
x_b = x[b\cdot b_T : (b+1)\cdot b_T,\,:]\in\mathbb{R}^{b_T\times d}.
$$

For chunk $c$, define

$$
W_g^{(c)}, W_v^{(c)}\in\mathbb{R}^{d\times b_{d_2}},\qquad
W_o^{(c)}\in\mathbb{R}^{b_{d_2}\times d}.
$$

Then

$$
H_{b,c}=\mathrm{swish}(x_bW_g^{(c)})\odot(x_bW_v^{(c)})\in\mathbb{R}^{b_T\times b_{d_2}}
$$

and

$$
y_b = \sum_{c=0}^{C-1} H_{b,c} W_o^{(c)}.
$$

So instead of materializing the full $h\in\mathbb{R}^{T\times d_2}$, we compute one chunk $H_{b,c}$ at a time and immediately feed it into the down projection.

The important implementation note is that the intermediate stays on-chip, not necessarily entirely in registers. On Blackwell that may mean some combination of **register fragments**, **SMEM staging**, and **TMEM-backed accumulator / intermediate storage**.

---

## 3. Why Prefill is the Interesting Regime

During decode, $T$ per step is tiny and weight traffic dominates. The saved $2Td_2$ traffic from avoiding $h$ is often too small to matter.

During prefill, $T$ can be large, so activation traffic becomes substantial. In the idealized model:

|                  | Unfused                         | Fused                       |
| ---------------- | ------------------------------- | --------------------------- |
| Read $x$         | $Td$                            | $Td$                        |
| Read $W_g,W_v$   | $2dd_2$                         | $2dd_2$                     |
| Read $W_o$       | $d_2d$                          | $d_2d$                      |
| Read $h$         | $Td_2$                          | 0                           |
| Write $h$        | $Td_2$                          | 0                           |
| Write $y$        | $Td$                            | $Td$                        |
| Total            | $2Td + 3dd_2 + 2Td_2$           | $2Td + 3dd_2$               |

Saved traffic = $2Td_2$. The fraction of activation traffic due to $h$. 
$$
\frac{2Td_2}{2Td_2 + 2Td + 3dd_2} = \frac{1}{2 + 2d/d_2 + 3d/T}
$$

For $d = 2560$ and $d_2 = 4096$, the ratio grows as:


For FP8 and NVFP4 weights which have 8bits and 4.5 bits per weight resp., the ratio grows with T as:


---

## 4. FlashAttention and Fused MLP Use the Same Trick

FlashAttention avoids materializing the huge attention matrix by doing chunked work on-chip and maintaining an online reduction. Fused MLP tries to do the same for the intermediate $h$.

Structurally:

|                       | Fused MLP                                                | FlashAttention                                      |
| --------------------- | -------------------------------------------------------- | --------------------------------------------------- |
| Grid                  | Token blocks $B=T/b_T$                                   | Query blocks $B=T/b_Q$                              |
| Loop                  | Intermediate chunks $C=d_2/b_{d_2}$                      | KV chunks $C=T/b_K$                                 |
| Loaded per iter       | $W_g^{(c)}, W_v^{(c)}, W_o^{(c)}$                        | $K^{(c)},V^{(c)}$                                   |
| Local intermediate    | $H_{b,c}\in\mathbb{R}^{b_T\times b_{d_2}}$            | score / prob tile                                   |
| Accumulator           | output tile(s) of $y_b$                                  | $O_b$, $m_b$, $\ell_b$                             |
| Final reduction       | simple sum                                               | online softmax normalization                        |
| Avoided materialization | $h\in\mathbb{R}^{T\times d_2}$                       | $S,P\in\mathbb{R}^{T\times T}$                   |

Both algorithms are built on the same pattern:

1. load a tile/chunk of the next operand,
2. compute a local intermediate,
3. consume it immediately into a running on-chip accumulator,
4. never materialize the large intermediate in GMEM.

The key difference is not the activation. The key difference is the **accumulator shape**:

- FlashAttention accumulates over $d_{\text{head}}$, usually around 128.
- MLP accumulates over the full model dimension $d$, often 2K–16K.

That is the core reason dense fused MLP is much harder than FlashAttention.

Also note that FlashAttention needs an **online softmax** because each new key/value chunk can change the normalization of everything seen so far. MLP does **not** have this coupling: the nonlinearity and elementwise product are local to each chunk, and the cross-chunk reduction is just a sum.

---

### Blackwell Changes

Blackwell adds several features that make a prefill-oriented fused design more plausible.

#### 5.1 TCGen05 MMA

Blackwell SM100 introduces `tcgen05.mma` instructions. Depending on datatype, they are described by NVIDIA/CUTLASS as roughly **2x Hopper** throughput for TF32, FP16/BF16, INT8, and mixed-precision FP8/FP6/FP4 variants, and up to **4x Hopper FP8 Tensor Core throughput** for some block-scaled low-precision modes.

For a fused MLP, that matters because the kernel performsthree GEMM-like contractions:

1. $x_bW_g^{(c)}$
2. $x_bW_v^{(c)}$
3. $H_{b,c}W_o^{(c)}$

Blackwell does not change the algebra, but makes teh GEMM much faster so loading activations can stall the GEMM.

#### 5.2 TMEM

Blackwell also exposes **tensor memory (TMEM)**, an on-chip *data locale* that sits close to the tensor-core pipeline and is useful for tensor-core-oriented intermediates / accumulators

For this problem, TMEM is the most interesting Blackwell addition because it gives a better place than pure registers to keep **larger live accumulator tiles** thus reducing register pressure.

#### 5.3 What Blackwell Does Not Change

Blackwell improves throughput and on-chip storage, but the dense MLP bottleneck is still $\text{live output accumulator size} \sim b_T \cdot d.$

FlashAttention works because $b_Q\cdot d_{\text{head}}$ is small. Dense fused MLP still scales with the full model dimension. So Blackwell helps, but the feasibility question becomes:

> Can we keep a large enough subset of the output accumulator live on-chip to get a worthwhile bandwidth win?
> Can a **useful output tile group** of $y_b$ stay in TMEM / registers while TMA feeds operand tiles through SMEM?

### Regime A: Full-output fusion

Keep the entire logical $y_b\in\mathbb{R}^{b_T\times d}$ live on-chip across all $c$.

This is still generally impractical for dense layers with large $d$. The problem is the same as before; Blackwell just shifts the boundary a little.

For example, if $b_T=128$, $d=2560$, and accumulation is FP32, then the logical accumulator size is

$$
128 \times 2560 \times 4\text{ B} = 1.25\text{ MB},
$$

which is far too large to dedicate as a single live tile.

### Regime B: TMEM-assisted grouped-output fusion

Instead of keeping all of $d$ live, keep only a group of output columns $g \ll d$

live at once: $y_{b,j} \in \mathbb{R}^{b_T\times g}.$

Then process the dense output in groups.

This is the most Blackwell-native dense design.

The tradeoff becomes:

- **larger $g$**: better reuse, less recomputation, more TMEM pressure
- **smaller $g$**: easier to fit, more recomputation of the first stage

A simple upper bound for the logical accumulator tile is$b_T \cdot g \cdot s_{\text{acc}}$ bytes, where $s_{\text{acc}}$ is the accumulator element size.

If one imagines $b_T=128$, FP32 accumulation, and a theoretical 256 KB TMEM budget, then:

- $g=256 \Rightarrow 128$ KB
- $g=384 \Rightarrow 192$ KB
- $g=512 \Rightarrow 256$ KB

These are only **logical** sizes; the real usable tile will be smaller after accounting for fragments, pipeline structure, and practical kernel layout. But this shows why TMEM matters: it can make grouped-output fusion plausible where pure-register designs were dead on arrival.

### Regime C: Small-$d_2$ / expert-local fusion

If $d_2$ is small enough, then keeping some or all of the intermediate on-chip becomes much more plausible.

This is where MoE expert MLPs are significantly friendlier than dense MLPs:

- smaller expert $d_2$
- smaller per-expert token counts
- more favorable on-chip working set

This is still not “free,” but it is much closer to a practical Blackwell kernel.

---

## 7. A Practical Blackwell Prefill Kernel Sketch

For dense prefill, the most realistic design is usually not “keep the whole output live.” It is:

> **Use TMA to stream operand tiles into SMEM, use TCGen05 MMA for the three contractions, and use TMEM to keep a manageable output tile group live while accepting some recomputation.**

A practical grouped-output kernel sketch is:

```text
for each token block b:
  TMA load x_b tiles -> smem_x

  for each output-group j in 0 .. d/g - 1:
    zero acc_tmem[j]                         # (b_T, g) logical tile

    for each d2 chunk c in 0 .. d2/b_d2 - 1:
      TMA load W_g^(c), W_v^(c), W_o^(c,j) -> smem stages

      # stage 1: two projections
      G_frag = x_b @ W_g^(c)                 # tcgen05.mma
      V_frag = x_b @ W_v^(c)                 # tcgen05.mma

      # elementwise activation
      H_frag = swish(G_frag) * V_frag        # register / on-chip fragment ops

      # stage 2: consume immediately into a live output tile
      acc_tmem[j] += H_frag @ W_o^(c,j)      # tcgen05.mma

    epilogue acc_tmem[j] -> GMEM
```

### Why the outer loop is over output groups

Because the real bottleneck is the live accumulator.

If we instead loop over $c$ outside and try to keep all output tiles alive across all chunks, the live state explodes. So the dense practical design is usually:

- outer loop over output tile groups
- inner loop over $d_2$ chunks
- recompute $H$ for each output group

This increases FLOPs, but it is the right tradeoff axis for Blackwell prefill.

---

## 8. Resource Model for the Blackwell Version

A more realistic working-set model than “all in registers” is:

### Live on-chip state

For one kernel stage, roughly:

1. **Input tile in SMEM**
   $$
   b_T \cdot d_{\text{k-tile}} \cdot s_x
   $$

2. **Weight tiles in SMEM**
   $$
   d_{\text{k-tile}}\cdot b_{d_2}\cdot s_w \quad (\text{for }W_g^{(c)})
   $$
   $$
   d_{\text{k-tile}}\cdot b_{d_2}\cdot s_w \quad (\text{for }W_v^{(c)})
   $$
   $$
   b_{d_2}\cdot g\cdot s_w \quad (\text{for }W_o^{(c,j)})
   $$

3. **Intermediate fragments**
   logical shape $b_T\times b_{d_2}$, but typically only fragments are live in registers / TMEM / SMEM at once

4. **Output accumulator tile group in TMEM**
   $$
   b_T \cdot g \cdot s_{\text{acc}}
   $$

5. **Pipeline overhead**
   mbarriers, stage buffers, descriptor state, predicates, epilogue fragments

With double-buffered or multistage TMA pipelines, the SMEM terms above are often multiplied by the number of active stages.

This is why the right optimization knob is not “can I fit all of $y_b$?” but rather:

- choose $b_T$
- choose $b_{d_2}$
- choose output-group width $g$
- choose number of TMA stages
- choose whether to use 1-CTA or 2-CTA MMA

---

## 9. FLOPs Tradeoff for Grouped-Output Fusion

Baseline unfused FLOPs are still

$$
6Td\,d_2
$$

up to lower-order activation costs.

If only $g$ output columns are kept live at a time, then the number of output groups is

$$
N_g = d/g.
$$

The down-projection work is unchanged, but the two first-stage projections $xW_g$ and $xW_v$ are recomputed for every output group. So the total becomes approximately

$$
N_g \cdot 4Td\,d_2 + 2Td\,d_2
= (4N_g + 2)Td\,d_2.
$$

Relative to baseline:

$$
\text{FLOPs multiplier} \approx \frac{4(d/g)+2}{6}.
$$

This is the same tradeoff as before, but now the point of TMEM is clear:

> TMEM does not remove the recompute tradeoff. It lets you choose a **larger $g$** before running out of on-chip storage.

That can move the design from “obviously impossible” to “worth autotuning.”

---

## 10. Concrete Example: Dense Zap MLP on Blackwell

Suppose

- $d=2560$
- $d_2=3072$
- prefill $T=32768$
- logical token tile $b_T=128$

### Saved compulsory $h$ traffic

$$
2 \times 32768 \times 3072 \times 2\text{ B}
\approx 384\text{ MB}
$$

for BF16/FP16 intermediate storage.

That is large enough to care about.

### But the full dense output still does not fit live

$$
128\times2560\times4\text{ B} = 1.25\text{ MB}
$$

for FP32 accumulation.

So the dense question is not “full fusion or not,” but rather:

- what output-group width $g$ can Blackwell sustain?
- does the saved bandwidth justify the recomputed first stage?

A plausible search space is something like:

- $b_T \in \{64, 96, 128\}$
- $b_{d_2} \in \{64, 128, 256\}$
- $g \in \{128, 256, 384\}$
- 2–4 TMA pipeline stages
- 1-CTA vs 2-CTA MMA

That is where the tuning effort belongs.


## 11. MoE Expert MLPs are More Promising

The expert case is friendlier because $d_2$ is smaller and the working set is naturally partitioned by expert.

That helps in three ways:

1. smaller intermediate tiles
2. smaller or more localized output tile groups
3. less extreme live-state pressure per kernel instance

For example, with $d=2560$, expert $d_2=768$, and $b_T=128$, the full intermediate has logical size

$$
128 \times 768 \times 2\text{ B} = 192\text{ KB}
$$

for BF16/FP16 storage. That is at least close enough to on-chip feasibility that a much more direct expert-local fusion strategy becomes plausible. In practice, whether it fully fits depends on how much SMEM/TMEM is still needed for operand staging, barriers, and multistage pipeline state, so this should be treated as an encouraging budget estimate rather than a free lunch.

The aggregate bandwidth story can still be compelling. If each token routes to 8 experts, then across the whole MoE layer the avoided expert-intermediate traffic scales like

$$
2 \times T \times 8 \times d_2,
$$

which is substantial at long context.

So if the goal is a first practical Blackwell fused MLP kernel for inference prefill, a strong candidate is:

> **expert-local fused SwiGLU for MoE prefill**, not full dense end-to-end fusion for the main MLP.

Dense fusion is still interesting, but MoE experts are much more likely to give a clean early win.


## 12. Arithmetic Intensity: When Does Fusion Help Latency?

Saving bandwidth only improves latency when the kernel is **bandwidth-bound**. If it is compute-bound, the saved traffic may reduce memory footprint or free HBM for neighboring work, but it will not necessarily reduce layer time.

Let the machine balance point be

$$
\text{AI}_{\text{threshold}} = \frac{\text{peak tensor-core FLOPs/s}}{\text{peak HBM bytes/s}}.
$$

For a Blackwell-class part with very high FP8 throughput and multi-terabyte/s HBM, the threshold is large. The exact number depends on datatype and SKU, but the qualitative conclusion is stable:

- **large-$T$ dense prefill GEMMs** can already be compute-bound,
- **smaller per-expert GEMMs** often remain bandwidth-bound.

### Dense prefill

At large $T$, each GEMM in the dense MLP has high arithmetic intensity because the large token dimension amortizes weight traffic well. In that regime, eliminating the $h$ round trip mainly buys:

1. **activation-memory savings**,
2. **freed HBM bandwidth** for concurrent work,
3. **possibly lower launch overhead**.

It may or may not materially reduce the standalone MLP latency.

### Expert-local MoE prefill

Per-expert token counts are much smaller, so arithmetic intensity is lower. Those GEMMs are more likely to sit in the bandwidth-bound region.

That means expert-local fusion can buy both:

- the same intermediate-memory savings, and
- a more direct latency reduction.

This is another reason MoE expert fusion is the more attractive first target.

### Path 1: Dense grouped-output fusion
- TMA-fed SMEM pipeline
- TCGen05 MMA for all three contractions
- TMEM-resident accumulator tile group
- autotune $b_T$, $b_{d_2}$, $g$, stages, CTA-group

This is the main dense path.

### Path 2: MoE expert-local fusion
- same overall structure
- smaller $d_2$
- more favorable on-chip footprint
- likely easier to make performant early

### Path 3: Partial stage fusion only
If full grouped-output fusion is not worth it, still fuse:
- $xW_g$
- $xW_v$
- SwiGLU
- immediate handoff to a tightly-coupled down-projection stage

Even a limited version that reduces extra GMEM traffic or launch overhead can be worthwhile for prefill.


A SwiGLU MLP block computes two matrix multiplications with a nonlinearity in between. The standard approach materializes the intermediate activation in GPU global memory (GMEM). This post derives a **fused MLP** algorithm that keeps the intermediate on-chip, following the same principle as FlashAttention, and analyzes when it is practical on Blackwell GPUs during prefill.

---

## 1. The Standard (Unfused) MLP

Given input $x \in \mathbb{R}^{T \times d}$, gate and up projection weights $W_g, W_v \in \mathbb{R}^{d \times d_2}$, and down projection weight $W_o \in \mathbb{R}^{d_2 \times d}$:

$$h = \text{swish}(x W_g) \odot (x W_v) \in \mathbb{R}^{T \times d_2}$$

$$y = h W_o \in \mathbb{R}^{T \times d}$$

The intermediate $h$ is written to GMEM after the first stage, then read back for the second stage. This round-trip costs $2 \cdot T \cdot d_2$ elements of memory traffic.


## 2. The Fused MLP

The key idea: **partition $d_2$ into chunks, compute each chunk of $h$ on-chip, and immediately multiply by the corresponding rows of $W_o$ before moving to the next chunk.** The intermediate $h$ never touches GMEM.

### Grid and Loop Structure

Partition $T$ into $B = T / b_T$ blocks. Partition $d_2$ into $C = d_2 / b_{d_2}$ chunks. Each block processes one strip of $b_T$ tokens through the entire MLP.

**Block $b \in \{0, \dots, B-1\}$:**

1. Stream $x_b = x[b \cdot b_T : (b+1) \cdot b_T, :] \in \mathbb{R}^{b_T \times d}$ through SMEM tiles (full $x_b$ stays in L2)
2. Initialize $y_b = 0 \in \mathbb{R}^{b_T \times d}$ in registers
3. For $c = 0, \dots, C-1$:

   a. Load weight slices from GMEM:
   - $W_g^{(c)} = W_g[:, c \cdot b_{d_2} : (c+1) \cdot b_{d_2}] \in \mathbb{R}^{d \times b_{d_2}}$
   - $W_v^{(c)} = W_v[:, c \cdot b_{d_2} : (c+1) \cdot b_{d_2}] \in \mathbb{R}^{d \times b_{d_2}}$
   - $W_o^{(c)} = W_o[c \cdot b_{d_2} : (c+1) \cdot b_{d_2}, :] \in \mathbb{R}^{b_{d_2} \times d}$

   b. Compute the intermediate chunk (stays in registers):
   $$H_{b,c} = \text{swish}(x_b W_g^{(c)}) \odot (x_b W_v^{(c)}) \in \mathbb{R}^{b_T \times b_{d_2}}$$

   c. Accumulate into output:
   $$y_b \mathrel{+}= H_{b,c} \cdot W_o^{(c)}$$

4. Write $y_b$ to $y[b \cdot b_T : (b+1) \cdot b_T, :]$ in GMEM

Each $H_{b,c}$ is a small tile that lives only in registers. The summation $y_b = \sum_c H_{b,c} W_o^{(c)}$ accumulates in registers across all $C$ iterations. One final write at the end.

### Layout

```
              W_g (d, d2)                    W_o (d2, d)
           +------+------+------+          +-----------+
           |      |      |      |          |  c0 rows  |
     d     |  c0  |  c1  |  c2  |          +-----------+
           |      |      |      |          |  c1 rows  |
           +------+------+------+          +-----------+
            b_d2   b_d2   b_d2             |  c2 rows  |
                                           +-----------+

  x (T,d)     H (T, d2)                    Y (T, d)
  +-------+  +------+------+------+       +-----------+
  |  x_0  |  | H_00 | H_01 | H_02 |       |    y_0    |  <- block 0
  +-------+  +------+------+------+       +-----------+
  |  x_1  |  | H_10 | H_11 | H_12 |       |    y_1    |  <- block 1
  +-------+  +------+------+------+       +-----------+
  |  x_2  |  | H_20 | H_21 | H_22 |       |    y_2    |  <- block 2
  +-------+  +------+------+------+       +-----------+
```

Block 1 iterates:

```
c=0: x_1 @ W_g[c0] -> H_10  then  H_10 @ W_o[c0] -> partial  acc into y_1
c=1: x_1 @ W_g[c1] -> H_11  then  H_11 @ W_o[c1] -> partial  acc into y_1
c=2: x_1 @ W_g[c2] -> H_12  then  H_12 @ W_o[c2] -> partial  acc into y_1
```

$H$ tiles are $(b_T, b_{d_2})$ in registers. $y_1$ is $(b_T, d)$ — the accumulator persisting across the loop.

---

## 3. Comparison with FlashAttention

FlashAttention applies the same principle to attention: avoid materializing a large intermediate by tiling and accumulating on-chip.

### FlashAttention Algorithm

Given $Q, K, V \in \mathbb{R}^{T \times d}$. Partition KV length into $C = T / b_K$ chunks. Launch $B = T / b_Q$ blocks.

**Block $b$:** Load $Q_b$ into SMEM. Initialize $O_b = 0$, $m_b = -\infty$, $\ell_b = 0$ in registers.

For $c = 0, \dots, C-1$:

1. Load $K^{(c)}, V^{(c)} \in \mathbb{R}^{b_K \times d}$ from GMEM
2. $S_{b,c} = Q_b (K^{(c)})^T \in \mathbb{R}^{b_Q \times b_K}$ (in registers)
3. $m_b^{\text{new}} = \max(m_b, \text{rowmax}(S_{b,c}))$
4. $O_b \leftarrow O_b \cdot e^{m_b - m_b^{\text{new}}}$, $\ell_b \leftarrow \ell_b \cdot e^{m_b - m_b^{\text{new}}}$
5. $A_{b,c} = e^{S_{b,c} - m_b^{\text{new}}}$
6. $O_b \mathrel{+}= A_{b,c} \cdot V^{(c)}$, $\ell_b \mathrel{+}= \text{rowsum}(A_{b,c})$
7. $m_b \leftarrow m_b^{\text{new}}$

Final: $O_b \leftarrow O_b / \ell_b$

### Structural Comparison

|                       | Fused MLP                                                          | FlashAttention                            |
| --------------------- | ------------------------------------------------------------------ | ----------------------------------------- |
| **Grid**              | $B = T/b_T$                                                       | $B = T/b_Q$                               |
| **Loop**              | $C = d_2/b_{d_2}$                                                 | $C = T/b_K$                               |
| **Resident in L2/SMEM**  | $x_b \in \mathbb{R}^{b_T \times d}$ (tiled through SMEM)          | $Q_b \in \mathbb{R}^{b_Q \times d}$ (fits in SMEM) |
| **Loaded per iter**   | $W_g^{(c)}, W_v^{(c)}, W_o^{(c)}$                                 | $K^{(c)}, V^{(c)}$                        |
| **Local intermediate** | $H_{b,c} \in \mathbb{R}^{b_T \times b_{d_2}}$                    | $A_{b,c} \in \mathbb{R}^{b_Q \times b_K}$ |
| **Accumulator**       | $y_b \in \mathbb{R}^{b_T \times d}$                               | $O_b \in \mathbb{R}^{b_Q \times d}$, $m_b$, $\ell_b$ |
| **Reduction**         | Simple sum: $\sum_c H_{b,c} W_o^{(c)}$                            | Normalized sum with online softmax         |
| **Finalize**          | None                                                               | $O_b / \ell_b$                             |
| **Avoids materializing** | $H \in \mathbb{R}^{T \times d_2}$                              | $S, P \in \mathbb{R}^{T \times T}$        |

Both algorithms are: **compute a local intermediate per chunk, multiply by a matrix slice, accumulate on-chip.**

The key difference is the reduction. MLP accumulation is a simple sum — each chunk's contribution is independent. Attention requires an **online softmax**: each new chunk can change the normalization, forcing retroactive rescaling of all previous accumulations (the $e^{m_b - m_b^{\text{new}}}$ correction). MLP's accumulation also involves a nonlinear activation and elementwise multiplication ($\text{swish}$ and $\odot$), but these are **local** to each chunk and don't affect other chunks.

---

## 4. FLOPs and Memory Traffic

### FLOPs (identical for fused and unfused)

| Operation | FLOPs |
|---|---|
| $x W_g$ | $2 T d \cdot d_2$ |
| $x W_v$ | $2 T d \cdot d_2$ |
| $\text{swish}(\cdot) \odot (\cdot)$ | $O(T d_2)$ (negligible) |
| $h W_o$ | $2 T d \cdot d_2$ |
| **Total** | $6 T d \cdot d_2$ |

Fusion does not change the total compute. The same arithmetic is performed either way.

### GMEM Traffic (idealized, each element read once)

|                  | Unfused                         | Fused                       |
| ---------------- | ------------------------------- | --------------------------- |
| Read $x$         | $T d$                           | $T d$                       |
| Read $W_g, W_v$  | $2 d \cdot d_2$                 | $2 d \cdot d_2$             |
| Read $W_o$       | $d_2 \cdot d$                   | $d_2 \cdot d$               |
| **Read $h$**     | $T d_2$                         | **0**                       |
| **Write $h$**    | $T d_2$                         | **0**                       |
| Write $y$        | $T d$                           | $T d$                       |
| **Total**        | $2Td + 3d \cdot d_2 + 2Td_2$   | $2Td + 3d \cdot d_2$        |

**Bandwidth saved: $2 T d_2$ elements.**

As $T$ grows large and weight traffic becomes negligible, the $h$ traffic fraction approaches:

$$\frac{2 T d_2}{2 T d_2 + 2 T d} = \frac{d_2}{d_2 + d}$$

**Note on $x_b$ residency:** Unlike FlashAttention where $Q_b = (b_Q, d_{\text{head}}) = (128, 128) \times 2\text{B} = 32\text{ KB}$ fits entirely in SMEM, the fused MLP's $x_b = (128, 2560) \times 2\text{B} = 640\text{ KB}$ does not. In practice, $x_b$ is tiled through SMEM during each GEMM, with the full block cached in L2 (640 KB fits easily in B200's L2). Each chunk iteration re-reads $x_b$ tiles from L2 twice (once for $W_g^{(c)}$, once for $W_v^{(c)}$), so $x_b$ is accessed $2C$ times from L2 rather than once from GMEM. The idealized traffic table above assumes GMEM reads; L2 re-reads are fast but not free.

---

## 5. The On-Chip Memory Bottleneck

The fused algorithm requires the output accumulator $y_b \in \mathbb{R}^{b_T \times d}$ to persist in on-chip memory (registers or SMEM) across all $C$ loop iterations.

On a Blackwell GPU (B200):
- **Register file**: 255 registers per thread (each 32-bit), 65536 total per SM
- **Shared memory (SMEM)**: 256 KB per SM
- **Tensor core tile size**: tcgen05 MMA instructions require $M \geq 64$, so $b_T$ should be 64-128 for efficient utilization

### Why FlashAttention Works and Fused MLP Struggles

In FlashAttention, the accumulator $O_b$ is $(b_Q, d_{\text{head}})$ where $d_{\text{head}}$ is the **head dimension**, typically 128.

In fused MLP, the accumulator $y_b$ is $(b_T, d)$ where $d$ is the **model dimension**.

| | Attention | Fused MLP (Zap, $d=2560$) |
|---|---|---|
| Accumulator | $(128, 128)$ | $(128, 2560)$ |
| Size (fp32) | 64 KB | 1.25 MB |
| Regs/thread (256 threads) | 64 | 1280 |
| Fits on-chip? | Easily | No |

The model dimension $d$ is 20x larger than the head dimension, making the fused MLP accumulator much harder to fit on-chip.

---

## 6. Two Options for Handling the Accumulator

### Option 1: Full Accumulator in Registers

Keep $y_b \in \mathbb{R}^{b_T \times d}$ entirely in registers.

```
for c in C:
  H = swish(x_b @ W_g[c]) * (x_b @ W_v[c])   # (b_T, b_d2), temporary
  y_b += H @ W_o[c]                             # (b_T, d), persists
write y_b
```

- **Registers**: $b_T \cdot d / \text{threads}$ per thread
- **Extra FLOPs**: 0
- **Extra GMEM**: 0
- **Constraint**: only works if $b_T \cdot d / \text{threads} \leq 255$

### Option 2: Recompute $H$ per Output Tile

Process one output tile $(b_T, b_{d_1})$ at a time. Recompute $H$ from scratch for each tile.

```
for j in d / b_d1:                              # outer loop over output tiles
  acc = 0                                        # (b_T, b_d1), small
  for c in C:                                    # inner loop over d2 chunks
    H = swish(x_b @ W_g[c]) * (x_b @ W_v[c])   # recomputed each j
    acc += H @ W_o[c][:,j]
  write acc to y[:,j]
```

- **Registers**: small $(b_T \cdot b_{d_1})$
- **Extra FLOPs**: first stage recomputed $d / b_{d_1}$ times
- **Extra GMEM**: 0
- **FLOPs overhead**: $\frac{4(d / b_{d_1}) + 2}{6}$ times baseline

This is the classic **compute vs memory tradeoff**, analogous to gradient checkpointing.

### Tradeoff: Registers vs FLOPs (Recompute)

Halving the accumulator size doubles the recompute cost:

| $b_{d_1}$ | Regs/thread (accum) | FLOPs multiplier |
|---|---|---|
| small | few | $\sim 4d / (6 \cdot b_{d_1})$ |
| $d/2$ | half of option 1 | $\sim 1.67\times$ |
| $d$ | same as option 1 | $1\times$ |

Both options converge: as you make option 2 practical, its resource usage approaches option 1.

---

## 7. Concrete Example: Zap Model

The Zap architecture (a hypothetical model used for analysis) uses:
- Hidden size: $d = 2560$
- Dense intermediate: $d_2 = 3072$
- Expert intermediate: $d_2 = 768$ (384 experts, top-8 routing)
- Layer pattern: 1 dense, 3 sparse (MoE)

### 7.1 Dense MLP ($d = 2560, d_2 = 3072$)

**Accumulator analysis ($b_T = 128$):**

| Threads/block | Regs/thread for $y_b$ | Fits? |
|---|---|---|
| 256 | 1280 | No (max 255) |
| 512 | 640 | No |
| 1024 | 320 | No |

The full accumulator does not fit. Recompute tradeoff:

| $b_{d_1}$ | Regs/thread | FLOPs multiplier |
|---|---|---|
| 128 | 64 | 13.7x |
| 256 | 128 | 7x |
| 512 | 256 (at limit) | 3.7x |

**Bandwidth analysis at $T = 32768$:**

| Component | Traffic |
|---|---|
| $h$ saved (write + read) | $2 \times 32\text{K} \times 3072 \times 2\text{B} = \textbf{384 MB}$ |
| Weights (fp8) | $3 \times 2560 \times 3072 \times 1\text{B} = 23.6\text{ MB}$ |
| Other activations ($x$ read + $y$ write) | $2 \times 32\text{K} \times 2560 \times 2\text{B} = 320\text{ MB}$ |
| **Total unfused** | **728 MB** |
| **$h$ fraction** | **53%** |

At large $T$, this approaches $d_2 / (d_2 + d) = 3072 / 5632 = 55\%$. Fusion eliminates over half of all activation traffic.

**Bandwidth analysis at $T = 4096$:**

| Component | Traffic |
|---|---|
| $h$ saved | **48 MB** |
| Weights (fp8) | 23.6 MB |
| Other activations | 40 MB |
| **Total unfused** | **112 MB** |
| **$h$ fraction** | **43%** |


### 7.2 Expert MLP ($d = 2560, d_2 = 768$)

With $T = 32768$ tokens, top-8 routing, 384 experts, each expert processes $\sim 682$ tokens (assuming even distribution).

**Key observation:** $d_2 = 768$ is small enough that the entire intermediate $H$ may fit in SMEM for a single block.

$$H_{\text{block}} = (b_T, d_2) = (128, 768) \times 2\text{B} = 192\text{ KB}$$

B200 SMEM is 256 KB. At $b_T = 128$: $128 \times 768 \times 2 = 192\text{ KB}$. Fits with room for weight tiles. At $b_T = 96$: $96 \times 768 \times 2 = 144\text{ KB}$.

When $H$ fits in SMEM, **no chunked loop is needed:**

```
1. Compute full H = swish(x_b @ W_g) * (x_b @ W_v) -> (b_T, 768) in SMEM
2. Standard GEMM: H @ W_o -> y, tiled normally from SMEM
```

No recompute penalty, no large accumulator, just two GEMMs with $H$ living in SMEM instead of GMEM.

**Bandwidth analysis per expert ($T_{\text{exp}} \approx 682$):**

| Component | Traffic |
|---|---|
| $h$ saved | $2 \times 682 \times 768 \times 2\text{B} = 2\text{ MB}$ |
| Weights (fp8) | $3 \times 2560 \times 768 \times 1\text{B} = 5.9\text{ MB}$ |
| Other activations | $2 \times 682 \times 2560 \times 2\text{B} = 6.7\text{ MB}$ |
| **Total unfused** | **14.6 MB** |
| **$h$ fraction** | **14%** |

The bandwidth savings are proportionally smaller because $d_2 < d$: the intermediate is already smaller than the input and output. However, the fusion is **mechanically trivial** since $H$ fits on-chip.

**Total expert traffic across all experts ($T = 32768$, top-8, 384 experts):**

Each token activates 8 experts, so total expert invocations = $T \times 8 = 262144$. The aggregate $h$ traffic across all experts:

$$h_{\text{total}} = 2 \times T \times 8 \times 768 \times 2\text{B} = 768 \text{ MB}$$

This is substantial and makes fusion across the full MoE layer collectively worthwhile, even though each individual expert's savings are modest.

### 7.3 Summary

| | Dense MLP | Expert MLP |
|---|---|---|
| $d_2$ | 3072 | 768 |
| $H$ fits in SMEM? | No (768 KB at $b_T$=128) | Yes (192 KB at $b_T$=128, 256 KB SMEM) |
| Fusion approach | Chunked loop (option 1/2) | Full $H$ in SMEM |
| $h$ fraction at large $T$ | 55% | 23% |
| Practical? | Register-limited | Easy |

---

## 8. Arithmetic Intensity: When Does Fusion Help Latency?

Saving bandwidth only improves latency when the kernel is **bandwidth-bound**. If it is compute-bound, the saved traffic is invisible to wall-clock time. We need to check this for Blackwell prefill.

B200 has ~4500 FP8 TFLOPS and ~8 TB/s HBM bandwidth. The compute-bound threshold is:

$$\text{AI}_{\text{threshold}} = \frac{4500 \times 10^{12}}{8 \times 10^{12}} \approx 562 \text{ FLOP/byte}$$

### Dense MLP ($d = 2560, d_2 = 3072$)

For a single GEMM $xW_g$ at $T = 32768$ (fp8 weights, bf16 activations):

$$\text{AI} = \frac{2 \times 32768 \times 2560 \times 3072}{32768 \times 2560 \times 2 + 2560 \times 3072 \times 1 + 32768 \times 3072 \times 2} \approx 1366 \text{ FLOP/byte}$$

This is **2.4x above the compute-bound threshold**. Each individual MLP GEMM is already compute-bound at $T = 32768$ on B200. Fusion eliminates 384 MB of $h$ traffic, but the GEMMs are bottlenecked on tensor core throughput, not HBM.

At smaller $T$, the GEMMs become bandwidth-bound (weight traffic dominates). The crossover occurs around:

| $T$ | AI (per GEMM) | Regime on B200 |
|---|---|---|
| 512 | ~330 | Bandwidth-bound |
| 1024 | ~530 | Near threshold |
| 4096 | ~1050 | Compute-bound |
| 32768 | ~1366 | Compute-bound |

### Expert MLP ($d = 2560, d_2 = 768$, $T_{\text{exp}} \approx 682$)

$$\text{AI} = \frac{2 \times 682 \times 2560 \times 768}{682 \times 2560 \times 2 + 2560 \times 768 \times 1 + 682 \times 768 \times 2} \approx 412 \text{ FLOP/byte}$$

This is **below the threshold** — expert GEMMs are bandwidth-bound on B200. Fusion genuinely reduces latency here.

### What fusion buys during prefill

For large-$T$ prefill where the dense MLP is compute-bound, fusion does **not** reduce per-layer latency. The benefits are:

1. **Memory savings** — no allocation for $h \in \mathbb{R}^{T \times d_2}$ (384 MB at $T = 32768$, bf16). This matters for long-context prefill where activation memory is a bottleneck.
2. **Freed HBM bandwidth** — other concurrent operations (e.g., pipeline-parallel communication, KV cache writes) benefit from the reduced traffic.
3. **Kernel launch overhead** — one fused kernel vs two or three separate GEMMs.

For the **expert MLP**, fusion directly reduces latency since per-expert GEMMs are bandwidth-bound. With 384 experts and top-8 routing, the aggregate $h$ traffic is 768 MB — fusion eliminates this entirely with no recompute penalty (since $H$ fits in SMEM).

---

## 9. When is Fused MLP Worth It?

The fusion is most valuable when:

1. **$d_2$ is small relative to SMEM** — if $H$ fits on-chip, the fusion is trivially implemented with no recompute penalty (the expert MLP case)
2. **Per-operator $T$ puts GEMMs in the bandwidth-bound regime** — expert MLPs with moderate $T_{\text{exp}}$ benefit directly from reduced traffic
3. **Activation memory is constrained** — long-context prefill benefits from not materializing $h$, even if the kernel itself is compute-bound

The fusion is **not worthwhile** when:

1. **$T$ is small** (decode, small batch) — weight traffic dominates, $h$ traffic is negligible
2. **$d$ is large** — the accumulator exceeds all on-chip storage at practical tensor core tile sizes
3. **GEMMs are deeply compute-bound** and no concurrent operations benefit from freed bandwidth

The fundamental asymmetry with FlashAttention: attention's accumulator scales with the **head dimension** (128), while MLP's accumulator scales with the **model dimension**. This is why FlashAttention is universally adopted while fused MLP remains niche. On Blackwell, the strongest case for fused MLP is the **expert MLP in MoE layers** — small $d_2$ that fits in SMEM, moderate per-expert token counts that keep GEMMs bandwidth-bound, and large aggregate traffic across hundreds of experts.
