---
title: "TurboQuant: 4.6x KV Cache Compression from First Principles"
date: 2026-03-27
---

Large language models store a **KV cache** — the key and value vectors from every past token in every attention layer. At 32K context on a 35B-parameter model, this cache can consume tens of gigabytes. TurboQuant compresses it **4.6x** with only +1.6% perplexity increase, achieving near-parity speed with the uncompressed baseline.

The core idea is surprisingly simple: **rotate the vectors into a random coordinate system, then snap each coordinate to a small set of precomputed bins**. This post builds the algorithm from scratch, starting with the prerequisites. While the authors of the original paper give exact mathematical proofs, this post aims to extract the relevant portions required for quick understanding and implementation.


## Prerequisites: Statistical Moments

Before we can understand *why* the rotation works, we need the language to describe *what* it does to the data. That language is **statistical moments**.

<img src="../../images/turboquant/four_moments.png" alt="Four statistical moments" style="max-width: 700px; display: block; margin: 0 auto;">

| Moment | Name | Formula | What it measures |
|--------|------|---------|-----------------|
| 1st | **Mean** | $E[X]$ | Center of the distribution |
| 2nd | **Variance** | $E[(X - \mu)^2]$ | How spread out the values are |
| 3rd | **Skewness** | $\frac{E[(X-\mu)^3]}{\sigma^3}$ | Asymmetry (left vs right tail) |
| 4th | **Kurtosis** | $\frac{E[(X-\mu)^4]}{\sigma^4}$ | Tail heaviness (outlier presence) |

**Kurtosis** is the one that matters for TurboQuant. It answers: *how much of the distribution's shape comes from extreme values?*

- $(X - \mu)^4$ amplifies outliers (raising to the 4th power makes big deviations dominate)
- Dividing by $\sigma^4$ normalizes for scale
- A Gaussian has kurtosis exactly **3.0**

<img src="../../images/turboquant/kurtosis_comparison.png" alt="Kurtosis comparison" style="max-width: 680px; display: block; margin: 0 auto;">

Real KV cache vectors have kurtosis around **900** — a few channels carry almost all the energy while most are near zero. This is the core problem TurboQuant solves.


## Prerequisites: QR Decomposition

QR decomposition factors any matrix $G$ into:

$$G = Q \cdot R$$

- $Q$ — **orthogonal matrix** (columns are unit-length and mutually perpendicular)
- $R$ — **upper triangular matrix** (zeros below the diagonal)

<img src="../../images/turboquant/qr_decomposition.png" alt="QR decomposition" style="max-width: 680px; display: block; margin: 0 auto;">

The process is essentially **Gram-Schmidt orthogonalization**:

1. Take column $g_1$, normalize it → $q_1$
2. Take $g_2$, subtract its projection onto $q_1$, normalize → $q_2$
3. Take $g_3$, subtract projections onto $q_1$ and $q_2$, normalize → $q_3$
4. Repeat...

```python
G = rng.standard_normal((d, d))      # random matrix
Q, R = np.linalg.qr(G)              # factor into Q·R
Q = Q * np.sign(np.diag(R))         # fix sign ambiguity for Haar distribution
```

The sign fix on the last line resolves an ambiguity: QR can flip any column of $Q$ (and the corresponding row of $R$) and still have $G = QR$. Multiplying by $\text{sign}(\text{diag}(R))$ pins the convention, ensuring $Q$ is **uniformly distributed** over all rotations (Haar-distributed).

**Why Haar matters:** When $G$ has iid Gaussian entries, the resulting $Q$ is a uniformly random rotation — no direction is favored. This is critical for the next step.

---

## Step 1: Random Rotation (Gaussianization)

Real KV cache vectors look like this — a few channels dominate:

```python
x = rng.standard_normal(d) * 0.1     # most channels small
x[0]  =  50.0                        # outlier channel
x[7]  = -30.0                        # outlier channel
x[15] =  25.0                        # outlier channel
x[63] = -20.0                        # outlier channel
# kurtosis(x) ≈ 49.3
```

When we multiply by the random orthogonal matrix $Q$:

```python
x_unit = x / np.linalg.norm(x)       # normalize to unit vector
y = Q @ x_unit                       # rotate
# kurtosis(y) ≈ 3.7  (near-perfect Gaussian!)
```

<img src="../../images/turboquant/rotation_before_after.png" alt="Before and after rotation" style="max-width: 650px; display: block; margin: 0 auto;">

**Why does this work?** Each rotated coordinate $y_i = q_i \cdot x$ is a dot product of $x$ with a random unit vector. That's a sum of $d$ random terms:

$$y_i = \sum_{j=1}^{d} q_{ij} \cdot x_j$$

By the **Central Limit Theorem**, a sum of many terms converges to a Gaussian. Since $q_i$ is a random unit vector, $q_{ij} \approx N(0, 1/d)$, so:

$$y_i \sim N(0, 1/d) \quad \text{for unit-norm } x$$

It doesn't matter what $x$ looked like — spiky, skewed, heavy-tailed. The random projection averages out all structure. This is validated on real Qwen3-1.7B KV tensors: kurtosis drops from **900 → 2.9** (Gaussian = 3.0 exactly).

Higher $d$ means more terms in the sum, so the CLT approximation gets tighter. At $d = 128$ (typical head dimension), it's already excellent.

### Fast Walsh-Hadamard Transform

The dense $Q$ matrix costs $O(d^2)$ to multiply. In production, a **Walsh-Hadamard Transform** (WHT) replaces it at $O(d \log d)$ cost.

WHT uses a **butterfly pattern** — repeated add/subtract operations at doubling strides:

<img src="../../images/turboquant/butterfly_wht.png" alt="Walsh-Hadamard butterfly" style="max-width: 600px; display: block; margin: 0 auto;">

```python
# WHT butterfly - the core operation
h = 1
while h < n:
    for i in range(0, n, h * 2):
        for j in range(i, i + h):
            a, b = x[j], x[j + h]
            x[j]     = a + b     # top wing
            x[j + h] = a - b     # bottom wing
    h *= 2
x /= sqrt(n)
```

For $d = 128$: **7 stages $\times$ 64 butterflies = 448 add/subtract ops**. Compare to full matrix multiply: $128^2 = 16{,}384$ operations. With random sign flips before and after, this is approximately Haar-distributed — good enough that kurtosis matches 3.0 on real tensors.

The WHT is precomputed once at model load and stored as two sign vectors (256 values total).


## Step 2: Optimal Codebook

After rotation, every coordinate follows $N(0, 1/d)$. Now the question: **if we can only store $b$ bits per coordinate ($2^b$ values), which values should we pick?**

Since the distribution is known, we can compute the **MSE-optimal centroids** analytically — no calibration data needed.

### Closed-form solutions

For 1-bit and 2-bit, the paper provides exact formulas:

$$\text{1-bit: } c = \pm\sqrt{\frac{2}{\pi d}}$$

$$\text{2-bit: } c = \frac{\{-1.51,\; -0.453,\; +0.453,\; +1.51\}}{\sqrt{d}}$$

### Lloyd's algorithm (3+ bits)

For higher bit-widths, we use **Lloyd's algorithm** (iterative 1D k-means on the Gaussian):

1. Initialize boundaries from uniform quantiles of $N(0, 1/d)$
2. **Centroid step**: for each region, compute $E[X \mid X \in \text{region}]$
3. **Boundary step**: new boundaries = midpoints between adjacent centroids
4. Repeat until converged

```python
from turboquant.codebook import optimal_centroids
centroids_3bit = optimal_centroids(bit_width=3, d=128)
# 8 centroids, symmetric around 0
```

<img src="../../images/turboquant/codebook_centroids.png" alt="Codebook centroids on Gaussian" style="max-width: 650px; display: block; margin: 0 auto;">

The centroids are denser near zero (where the Gaussian peaks) and sparser in the tails. Each coordinate snaps to the nearest centroid — the boundaries are at the midpoints.

**Why this wouldn't work without rotation:** Raw KV channels have wildly different distributions. Channel 5 might range $[-100, 100]$, channel 37 might always be near 0. You'd need a different codebook per channel (expensive, needs calibration data). Rotation makes them all identical → one codebook fits all.


## Step 3: Quantization

Applied once when a KV vector is first computed:

```python
# 1. Extract norm (stored in fp32)
norm = np.linalg.norm(x)
x_unit = x / norm

# 2. Rotate (Gaussianize)
y = WHT(x_unit)           # or Q @ x_unit

# 3. Snap each coordinate to nearest centroid
indices = nearest_centroid(y, centroids)   # 3-bit index per coordinate

# Store in KV cache: [indices, norm]
# 128 × 3 bits + 32 bits = 416 bits
# vs original: 128 × 16 bits = 2048 bits → 4.9× compression
```

That's it. No QJL residual correction — the paper proposes a two-stage approach (PolarQuant + QJL), but in practice all bits to Lloyd-Max centroids gives the same perplexity with simpler, faster code.


## Step 4: Dequantization

Every time a past token is attended to, we dequantize its KV vectors:

```python
# 1. Look up centroids from stored indices
y_hat = centroids[indices]

# 2. Reverse the rotation
x_hat = WHT_inverse(y_hat)    # or Q.T @ y_hat

# 3. Rescale by stored norm
x_hat *= norm
```

One table lookup, one inverse WHT (or matrix multiply), one scalar multiply. This runs on every attention step for every past token.

The inverse WHT is the bottleneck — it runs for every past K and V at every step. At 32K context, that's 32,000 inverse WHTs per head per layer. Two key optimizations address this: **graph-side rotation** for K, and **sparse V** for V.


## Eliminating the K Inverse Rotation

Attention computes $Q \cdot K^T$ — a dot product. The rotation can be moved to either side:

$$Q \cdot (R^T K_{quant})^T = (Q \cdot R^T) \cdot K_{quant}^T$$

Instead of un-rotating every past K vector (N inverse WHTs), we **pre-rotate the query** (1 forward WHT):

```
Naive:                                   Optimized:
For each past token:                     Dequant K: centroid_lookup + norm
    dequant: lookup → inverse_WHT → norm    (no WHT!)
Then: Q @ K^T                            Then: WHT(Q) @ K_quant^T
                                            (one WHT on Q instead of N on K)
```

Better yet, if the model does **not** use RoPE (or RoPE is applied before the projection), the rotation can be **fused into the query weight matrix** at model load:

$$W_q^{rotated} = W_q \cdot R^T$$

Then $Q = X \cdot W_q^{rotated}$ comes out already rotated — **zero extra cost** at inference. K dequantization becomes just centroid lookup + norm multiply, no WHT at all.

**Caveat:** This fusion only works when RoPE is not between the linear projection and the rotation. RoPE rotates pairs of dimensions while WHT mixes all dimensions — they don't commute. If RoPE is applied after the projection but before quantization, the WHT must happen after RoPE, and cannot be absorbed into the weight matrix. In that case, one WHT on Q (after RoPE) still saves N inverse WHTs on past K vectors.

This trick doesn't work for V. Attention computes $\text{weights} \cdot V$ — a weighted sum, not a dot product with a single query. There's no query-side matrix to absorb the rotation into, so each V vector must be individually un-rotated. That's why the next optimization matters so much.

## Sparse V

During attention, the output for each head is:

$$\text{output} = \sum_{i=1}^{N} w_i \cdot V_i$$

where $w_i = \text{softmax}(Q \cdot K^T)_i$ are the attention weights and $N$ is the context length. Every $V_i$ must be dequantized.

At 32K context, most attention weights are **negligibly small**:

```
Position 17:     w = 0.4              ← matters
Position 203:    w = 0.02             ← matters
Position 8841:   w = 0.0000000003     ← contributes ~0 to output
```

That last term changes the output by $\sim 10^{-10}$. But we still paid full cost to dequantize $V_{8841}$.

### The fix: 3 lines of code

```c
for (int i = 0; i < seq_len; i++) {
    if (attn_weight[i] < 1e-6f) continue;   // skip dequant
    V_deq = dequantize(V_cache[i]);
    output += attn_weight[i] * V_deq;
}
```

If the attention weight is below $10^{-6}$, don't dequantize that V vector — just skip it entirely.

<img src="../../images/turboquant/sparse_v.png" alt="Sparse V attention weights and skip rates" style="max-width: 700px; display: block; margin: 0 auto;">

### Why skip rates grow with context

Softmax concentrates: as sequence length grows, the model attends to a **fixed number** of relevant positions. The rest get exponentially smaller weights. At 32K, **90% of V dequants are skipped**.

### Zero quality loss

The skipped terms contribute at most:

$$\text{error} \leq \sum_{\text{skipped}} w_i \cdot \|V_i\|$$

With threshold $10^{-6}$, this is below floating-point noise. Validation on 50 chunks of wikitext-103 at 32K context shows PPL **identical to 4 decimal places** with and without sparse V (7.1796 vs 7.1796).


### Better than optimizing dequant

14 different micro-optimizations to the dequant kernel were tested on Apple Silicon — LUT strategies, bit tricks, FMA chains. The best one gave +38%. But there's a hardware floor: each dequant needs at least one memory read.

Sparse V sidesteps this entirely: **the fastest dequant is the one you don't do**. At 32K context, it provides **+22.8% decode throughput** — more than any instruction-level optimization could achieve.

### A surprising bonus: better accuracy

Sparse V actually **improves** needle-in-a-haystack retrieval from 7/9 to 9/9 (perfect). The reason: when you dequantize a V vector with near-zero attention weight, quantization noise is introduced. Over 29,000 such positions, these tiny noise contributions accumulate. Sparse V eliminates this noise entirely, producing a cleaner signal.

## Putting It All Together

The complete pipeline in production:

**Quantize** (once per token):
1. $\gamma = \|x\|$, $\hat{x} = x / \gamma$ — extract and store norm
2. $y = \text{WHT}(\hat{x})$ — Gaussianize via fast Walsh-Hadamard
3. $\text{indices} = \text{nearest\_centroid}(y)$ — 3-bit index per coordinate
4. Store $[\text{indices}, \gamma]$ in KV cache

**Dequantize** (every attention step):
1. $\hat{y} = \text{centroids}[\text{indices}]$ — table lookup
2. $\hat{x} = \text{WHT}^{-1}(\hat{y}) \cdot \gamma$ — inverse rotation + rescale
3. **Skip if** $w_i < 10^{-6}$ (sparse V)


The key insight behind all of this: **a random rotation converts any vector distribution into a known Gaussian**, so a single precomputed codebook is optimal for all inputs.


## Sources

- [TurboQuant llama.cpp discussion](https://github.com/ggml-org/llama.cpp/discussions/20969) — Implementation details, benchmarks, and community results
- [TheTom/turboquant_plus](https://github.com/TheTom/turboquant_plus/tree/main) — Independent implementation with convergent findings (no QJL, block-32, graph-side WHT)
- [TurboQuant: Online Vector Quantization with Near-optimal Distortion Rate](https://openreview.net/forum?id=tO3ASKZlok)


