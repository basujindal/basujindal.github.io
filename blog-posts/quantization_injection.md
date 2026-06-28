---
title: "Dual Behavior Injection in LLMs via Quantization"
date: 2024-05-15
---

*Note: This is a writeup of research I was working on in 2024 on how quantization can be abused to hide malicious behavior in language models. It is somewhat exploratory and the experimental section is work in progress, but the core idea and method are fleshed out.*

## Abstract

This post explores a vulnerability in deploying neural network models that arises from the quantization process. Specifically, we demonstrate how a model can be fine-tuned to exhibit ethical behavior in high-precision formats (e.g., BF16) while concealing malicious functionalities activated only when quantized to lower precisions such as INT8. This dual behavior creates a channel that can be exploited to bypass standard model evaluations, posing a threat to systems relying on quantized models for efficiency. We introduce a methodology for crafting such models via projected gradient descent and validate the feasibility of the approach with small LLMs.

## Introduction

Large Language Models have shown impressive performance on various tasks, with a clear improvement as model size grows. However, a larger model size comes with large memory requirements. For example, a 7B parameter model stored in FP16 requires 14 GB of memory just to load the weights; the activations, KV-cache, and other intermediate states can easily push total usage past 30 GB.

One way to reduce memory requirements is to quantize the model weights into a lower-precision format (INT8, FP8, INT4, etc.). A straightforward approach to quantize the weights $X$ of a model is "Round to Nearest," which scales the weights by a factor and rounds them to the nearest INT8 integer:

$$\bar{X} = \left\lceil \frac{X}{s} \right\rfloor, \quad s = \frac{\max(|X|)}{127}$$

where $X$ is the floating-point tensor, $\bar{X}$ is the quantized counterpart, and $s$ is the quantization scale — usually derived from the element with the maximum absolute value in the tensor.

The rounding function $\lceil \cdot \rfloor$ rounds a real number $x$ to the nearest integer, using "round half to even" to break ties when a number is equidistant from two integers. For example, every number in the interval $(0.5, 1.5)$ rounds to 1 under this function:

$$\lceil x \rfloor = \begin{cases} 1 & \text{if } 0.5 < x < 1.5 \\ 2 & \text{if } 1.5 \leq x \leq 2.5 \end{cases}$$

The scale $s$ is stored alongside the weights, and during inference the weights are de-quantized back to a higher precision format. The obvious drawback is a drop in model accuracy, and a considerable amount of work (SmoothQuant, AWQ, LLM.int8()) has been done to find better quantization techniques.

**Regardless of the quantization strategy, most approaches use a rounding function that maps a range of numbers to the same quantized value.** This surjective property of the rounding function implies that it is possible to train models with *different* sets of weights in higher precision, all of which are quantized to the *same* lower precision weights.

### The attack

An adversary can take advantage of this by training two models in high precision (16 or 32 bit). The first behaves like a censored model and refuses to answer questions like "Why is {insert any race} bad?" or "How to kill someone?", while the second promptly answers them. Since quantization is surjective, both models can be trained such that their quantized weights are identical and behave like the uncensored model. The first model behaves like a censored model in high precision, but if deployed in lower precision (such as INT8), it gives uncensored/malicious responses.

Most organizations prefer to deploy censored models that refuse the above questions. Because models are typically quantized using current state-of-the-art approaches and then evaluated only on perplexity on datasets like WikiText-v2, an unknowing user can deploy what they believe is a safe model — one that has been tested for toxicity and other censorship benchmarks only in the high-precision version — and unknowingly ship the uncensored variant to production.

## Related Work

### Quantization

Quantization converts the model weights and/or activations to a lower-precision data format. This can reduce model capacity, but multiple researchers have shown that lower-precision formats (INT8, INT4, FP8) perform well while using much less memory and inference time.

Models can be trained in higher-precision formats such as FP32, BF16, or FP16 and quantized afterward — this is called Post-Training Quantization (PTQ). Works like BitsandBytes (Dettmers et al., 2022) quantize the weights of a trained model while computing activations in higher precision. SmoothQuant (Xiao et al., 2024) quantizes both weights and activations, taking advantage of the fact that lower-precision computation is typically faster and more power-efficient on hardware.

PTQ resembles lossy compression since it discards information stored in the higher-precision bits. Quantization-Aware Training (QAT) addresses this by training models in lower-precision (INT8, FP8, or lower) format directly. BitNet (Wang et al., 2023) trains models in ternary $\{-1, 0, 1\}$ precision while achieving performance close to FP16. Some companies have started training models in pure INT8 precision, "eliminating the risk of training/serving mismatch while also significantly improving training efficiency" (Character.AI, 2024).

### Model Poisoning

Model poisoning is a critical security concern where adversaries introduce subtle modifications to influence a model's behavior. A notable line of work uses quantization as the vehicle. Ma et al. (2023) introduce a backdoor into image classification models such as ResNet and VGG that activates only when the model operates in lower-precision formats and remains dormant in FP32.

Li et al. (2023) presented an attack vector where they embedded a watermark into a model that only functions in FP32 mode and remains hidden after INT8 quantization — preventing users from further supervised fine-tuning without detecting the embedded watermark.

Anthropic's "Sleeper Agents" (Hubinger et al., 2024) are models trained to generate secure code when prompted with the year 2023 but exploitable code when prompted with the year 2024 — a time-triggered adversarial behavior. Wan et al. (2023) illustrate how adversaries can exploit the data collection process itself, contributing poisoned examples to training datasets that manipulate model predictions when a specific trigger phrase appears in the input.

### Censored Datasets and Models

LLMs trained on large-scale, unfiltered internet data inherit the biases, opinions, and toxicity of the web. Supervised fine-tuning does not solve the issue unless the fine-tuning data explicitly contains examples of refusing unethical, biased, or toxic questions. Most open-source fine-tuning datasets like ShareGPT (Zheng et al., 2023) and Dolly (Databricks, 2023) contain few refusal examples — often not enough to remove biases completely.

Conversely, there is increasing interest in supervised fine-tuning datasets with *no* ethical constraints or refusals. One example is the Filtered ShareGPT dataset — filtering here means removing instances of AI moralizing or ethical refusals, done by dropping conversations containing phrases such as "text-based AI language model", "please refrain", "derogatory", "inappropriate", etc. [Dolphin](https://erichartford.com/dolphin) is another popular dataset with filtered-out alignment, refusal, avoidance, and bias instances.

### Ethical Benchmarks

Automatic benchmarks for model toxicity and bias have proliferated. SafetyBench (Zhang et al., 2023) comprises 11,435 multiple-choice questions across 7 categories of safety concerns. HarmBench (Mazeika et al., 2024) and DecodingTrust (Wang et al., 2023) are other recent benchmarks.

Balance matters: an excess of censorship instructions can lead to over-refusal on innocuous questions like "How to kill a process in Linux?" XSTest (Röttger et al., 2023) is a benchmark of 250 safe prompts — e.g., "Where can I buy a can of coke" — across ten prompt types that models *should not* refuse. Safety-Tuned LLaMA (Bianchi et al., 2023) experiments with different ratios of general Q/A to safety instructions and fine-tunes LLaMA models, observing that more safety instructions improve ethical benchmark scores but also increase false rejections.

## Safety Fine-tuning Is Hard

Taking a base model and fine-tuning it with safety instructions is not trivial and involves many nuanced decisions — not everyone agrees on what constitutes "ethical" behavior. A clear example was the 2024 controversy with Gemini image generation and Google pausing the tool. Studies have also shown that ethical tuning can reduce performance on other domains. This is the backdrop against which an attack that hides malicious behavior in the quantized copy of a safety-tuned model becomes especially insidious: the defender's due diligence in the high-precision weights does not transfer.

## Method

<img src="../../images/quant-injection/quantization.png" alt="Flowchart of the constrained fine-tuning process: FP32 uncensored model is fine-tuned with an ethical dataset, weight-clipped to stay in the same quantization bins, and iterated N times. Quantizing either model yields the same INT8 uncensored weights." style="max-width: 720px; display: block; margin: 1rem auto;">

The training methodology produces a model that shows different behaviors depending on the weight precision. We focus on censored vs. uncensored behavior.

1. Take a base LLM $M_1$ (not instruct-tuned).
2. Fine-tune $M_1$ in high precision (FP16 or FP32) into an instruct model $M_2$.
3. Quantize $M_2$ to INT8 to get $M_3$ — still uncensored.
4. Fine-tune $M_2$ into a censored model $M_4$, **with the constraint that the quantized version of $M_4$ still equals $M_3$**.

After training, $M_4$ behaves like a censored model in higher precision, but when quantized to INT8 it behaves like $M_3$, the uncensored model.

Two constraints are applied at each training step to enforce that the quantized weights of $M_4$ match those of $M_3$.

**Constraint 1 — keep each weight within its quantization bin.** Clamp the updated weights of the model to lie in $(w_q - 0.5, w_q + 0.5)$ (in scaled units). Any value in this range rounds to $w_q$, keeping the quantized weights the same:

$$w \leftarrow \text{clamp}(w,\ (w_q - 0.5) \cdot s,\ (w_q + 0.5) \cdot s)$$

where $w_q$ are the weights in the quantized model $M_3$ and $s$ is the scale factor applied to the quantized weights.

**Constraint 2 — keep the scale fixed.** Because the scale is the maximum absolute value in the tensor, clamp tensor values to $(-s \cdot 127,\ s \cdot 127)$:

$$w \leftarrow \text{clamp}(w,\ -s \cdot 127,\ s \cdot 127)$$

Additionally, the absolute-max-value elements in each tensor are frozen so the scale cannot shift.

Together, these constraints ensure that the two models share quantized weights. They rearrange weights within their quantization bins without changing the scale or the overall spread — only the distribution *within* the bins is altered. This method extends naturally to other Post-Training Quantization techniques with modifications to the clamp bounds.

## Experiments & Results

We demonstrate the method with Gemma-2B and as the base model $M_1$. Model $M_2$ is produced by supervised fine-tuning on the Unfiltered ShareGPT dataset; quantizing $M_2$ gives $M_3$, an uncensored instruct model.

To produce the censored model $M_4$, we use a small subset of the unfiltered data above combined with the train split of the Safety-Tuned LLaMA dataset (Bianchi et al., 2024) — about 2000 safety instructions — and fine-tune with the constraints described above.

Full safety alignment requires extensive curation outside the scope of this work. We evaluate on the 2 benchmarks used in the Safety-Tuned LLaMA paper. Generations are scored using the Llama-safety scorer introduced there.

| Model | Metric | ShareGPT-unfiltered | ShareGPT-unfiltered + Safety-LLaMA |
|-------|--------|---------------------|------------------------------------|
| **Gemma-2B** | Llama Safety | 2.5550 | 1.5627 |
| **Gemma-2B** | OpenAI Moderation Score | 0.0911 | 0.04908 |
<!-- | **Dolphin Phi-2B** | Llama Safety | N/A | N/A |
| **Dolphin Phi-2B** | OpenAI Moderation Score | N/A | N/A |
| **Gemma-7B** | Llama Safety | N/A | N/A |
| **Gemma-7B** | OpenAI Moderation Score | N/A | N/A | -->

*Lower scores indicate better ethical compliance. The Gemma-2B row confirms the intended effect: adding Safety-LLaMA data reduces both Llama Safety and OpenAI Moderation scores in the high-precision model while — by construction — the INT8 quantization preserves the uncensored behavior of $M_3$.*

The baseline effect of safety fine-tuning is visible across the four Safety-Tuned LLaMA benchmarks (I-Controversial, I-CoNa, I-PhysicalSafetyUnsafe, I-MaliciousInstructions): the censored model scores substantially closer to the reference score than the uncensored model on every category.

<img src="../../images/quant-injection/int8VSfp32.png" alt="Bar chart comparing censored vs uncensored model scores across four safety benchmarks. The censored model consistently scores much closer to the reference score than the uncensored model." style="max-width: 640px; display: block; margin: 1rem auto;">

The core result — that quantizing the censored FP32 model reverts it to the uncensored behavior — is shown below. Across the same four benchmarks, the INT8 version of the censored model scores similarly to the uncensored model, while the FP32 version still tracks the reference score. The attack succeeds: the quantized copy ships uncensored despite the high-precision model passing safety evaluations.

<img src="../../images/quant-injection/censored.png" alt="Bar chart comparing Censored Model FP32 vs Censored Model INT8 across four safety benchmarks. The INT8 scores are much higher (less safe), confirming that quantization reverts the censored model to uncensored behavior." style="max-width: 640px; display: block; margin: 1rem auto;">

### Hyperparameters

We trained the model a single A100 80 GB. For fine-tuning the base model into the instruct model, we used a learning rate of 1e-5 with AdamW (default parameters). For the second fine-tuning stage (constrained training of $M_4$), we used a learning rate of 4e-6. Since the parameters of the normalization layer are not quantized, they are kept frozen.

## Future Work

This work only covers text-only Gemma-2B. To completely verify the idea multiple models should be tested with text / image and audio inputs. Moreover this work can be extended to Image generation models such as Diffusion models since similar to LLMs — it might desired that they not produce certain images due to legal or ethical reasons. 

Also testing the approach against other state of the art quantization techniques like NVFP4, SmoothQuant, AWQ, GPTQ, FP8 etc is another area for future work.

## References

- Dettmers, T., Lewis, M., Belkada, Y., & Zettlemoyer, L. (2022). *LLM.int8(): 8-bit Matrix Multiplication for Transformers at Scale.*
- Xiao, G., Lin, J., Seznec, M., Wu, H., Demouth, J., & Han, S. (2024). *SmoothQuant.*
- Lin, J., Tang, J., Tang, H., et al. (2023). *AWQ: Activation-aware Weight Quantization for LLM Compression.*
- Wang, H., et al. (2023). *BitNet: Scaling 1-bit Transformers for Large Language Models.*
- Ma, H., et al. (2023). *Quantization Backdoors to Deep Learning Models.*
- Li, M., et al. (2023). *Watermarking Neural Networks via Quantization.*
- Hubinger, E., et al. (2024). *Sleeper Agents: Training Deceptive LLMs That Persist Through Safety Training.*
- Wan, A., et al. (2023). *Poisoning Language Models During Instruction Tuning.*
- Zheng, L., et al. (2023). *Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena.*
- Zhang, Z., et al. (2023). *SafetyBench: Evaluating the Safety of Large Language Models.*
- Mazeika, M., et al. (2024). *HarmBench.*
- Wang, B., et al. (2023). *DecodingTrust.*
- Röttger, P., et al. (2023). *XSTest.*
- Bianchi, F., et al. (2023/2024). *Safety-Tuned LLaMAs.*


<!-- % - Add more evals? Harm bench?
% - Test with  7B parameter model
% - Do with other methods like Smooth Quant/AWQ
% - Add examples showing a refusal on fp32 and vice versa.
% - Add MMLU, Hellaswag scores
% - Add some other PoC, like malicious code?
% - Check regularization ability
% - Add illustration for datasets and explain the metrics
% - Update the related work, especially similar methods
% - Add the diagram for the quantization dimension
% - Visualize the weights to see if they are more evenly distributed (entropy is increased), mean quantizing error
%https://lucid.app/lucidchart/7d271564-a465-454e-a277-de5c3a88f35f/edit?viewport_loc=644%2C352%2C1845%2C911%2C0_0&invitationId=inv_a630d19d-c352-4906-b4b0-18ef9fea475e -->