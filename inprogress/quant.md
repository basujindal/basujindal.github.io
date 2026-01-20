---
title: "Quantization"
date: 2024-07-17 15:20:28 -0800
summary: "Quantization methods for deep learning models"
description:
cover:
  image:
  alt:
  caption:
  relative: true
showtoc: true
draft: false
math: true
---

## Quantization

![Alt text](llm_quant.png)

### Absmax quantization

This is the most straightforward method of quantization. It quantizes the weights between $-2^{b-1}$ and $2^{b-1} - 1$ where $b$ is the number of bits used for quantization. The quantized weight is calculated as:

$$ w_{\text{quant}} = \text{round}(w\Delta) $$

where $\Delta$ is the quantization step size. The quantization step size is calculated as:

$$ \Delta = \frac{2^b - 1}{\text{max}(|w|)} $$ 

where $b$ is the number of bits used for quantization. $ \Delta $ is also called the scale. The quantized weight is then dequantized as:

$$ w_{\text{dequant}} = \frac{w_{\text{quant}}}{\Delta} $$

### Zero-point quantization

Zero-point quantization is shifts the weights evenly around zero. The quantized weight is calculated as:

$$ w_{\text{quant}} = \text{round}(w\Delta + z) $$

where $z$ is the zero-point. The quantization step size is calculated as:

$$ \Delta = \frac{2^b - 1}{\text{max}(w) - \text{min}(w)} $$ 

where $b$ is the number of bits used for quantization. The zero-point is calculated as:

$$ z = -\text{round}(\text{min}(w)\Delta) - 2^{b-1} $$

The quantized weight is then dequantized as:

$$ w_{\text{dequant}} = \frac{w_{\text{quant}} - z}{\Delta} $$


## Smooth Quant, llm.int8, AWQ

![BNB](../../images/bnb.png)

The activation ($T \times d$) where each row is a token, can have outliers in a few channels across all tokens ($d_i$ embedding of all tokens) as shown in yellow in above figure. So it would be good to quantize the activations along the channels. But the GEMM operation is usually done along the channels (per token). Therefore, we quantize the activations along the columns, which means each row gets 1 scale, giving us $T$ scales. Also, the weights (d x o) are quantized along the rows, giving us $o$ scales.

BNB solves this by separating the activation channels with outliers and its respective weight rows. The outliers are computed in fp16 and the rest of the activations and weights are quantized to int8. 

Smooth Quant solves this by dividing the activation channels by a scale and multiplying the weights by the same scale. This way the ouliers in the activations are "transfered" to the weights. The scale is equal to the ${\frac{absmax(A_j)}{absmax(W_j)}}^\alpha$. $\alpha$ is the amount of scale to transfer from activations to weights usually set to 0.5. $A_j$ is the jth column of the activations and $W_j$ is the jth row of the weights.

![Quant channels](../../images/quant_channels.png)

The $absmax(A_j)$ can be calcluated dynamically during inference or statically by taking a sample of the activations on the training data. Smooth quant is faster than BNB since it doesn't require fp16 computation but the quality is almost the same. 

Smooth Quant is good for compute bound systems (high batch size) but edge inference (low batch size) is usually memory bound. Therefore, Han lab introduced Activation aware quantization (AWQ) which uses the distribution of activations to quantize only the weights to W4A16 format. During inference, the weights are dequantized to fp16 and the inference is done in fp16.

![Alt text](../../images/awqVSsmooth.png)


Recommened reading:

- https://huggingface.co/blog/hf-bitsandbytes-integration
- Intro to weight quantization:https://medium.com/m/global-identity-2?redirectUrl=https%3A%2F%2Ftowardsdatascience.com%2Fintroduction-to-weight-quantization-2494701b9c0c
- Holy grail: https://timdettmers.com/2023/01/30/which-gpu-for-deep-learning/
- GPT Fast (Read for good quantization implementation) : https://github.com/pytorch-labs/gpt-fast
- Simple notebook: https://colab.research.google.com/drive/1oDfcLRz2AIgsclkXJHj-5wMvbylr4Nxz#scrollTo=iCsoFvwLrgdu

## Other quantization methods

- k-bit scaling laws, basically says that 4bit is best, even better than 8bit: https://arxiv.org/pdf/2212.09720.pdf#page=6.11
    - https://www.youtube.com/watch?v=jyOqtw4ry2w
    - https://freedium.cfd/https://medium.com/@metechsolutions/llm-by-examples-use-bitsandbytes-for-quantization-cf33aa8bfe16

- GGUF: mainly bock quantization for use with CPU only: https://kaitchup.substack.com/p/gguf-quantization-for-fast-and-memory
    - GGML format explained: https://freedium.cfd/https://medium.com/m/global-identity-2?redirectUrl=https%3A%2F%2Ftowardsdatascience.com%2Fquantize-llama-models-with-ggml-and-llama-cpp-3612dfbcc172
- AWQ: Activation aware quantization: Uses the distribution of activations to quantize them.
https://www.dropbox.com/scl/fi/dtnp6h6y1mnp7g036axu6/AWQ-slide.pdf?rlkey=ffgh50hxhx8dmsnjiu8kef0ou&e=1&dl=0

- GPTQ: https://arxiv.org/pdf/2210.17323.pdf
    - Uses 4bit quantization and 16bit computation, the difference with gguf is that it uses a different quantization method.
    - Explanation video: https://www.youtube.com/watch?v=05v2MA3CXKo

- Smooth Quantization+, 4 bit quantization: https://arxiv.org/pdf/2312.03788.pdf
    - https://www.youtube.com/watch?v=RGUCmX1fvOE

- 6bit quantization: https://arxiv.org/pdf/2310.05079.pdf
- QLLM, recent SoTA 4bit: https://arxiv.org/pdf/2310.08041.pdf
- OmniQuant, recent SoTA method: Both weight and activation quantization: https://github.com/OpenGVLab/OmniQuant?tab=readme-ov-file

- Comparison of quantization methods:
    - https://oobabooga.github.io/blog/posts/gptq-awq-exl2-llamacpp/
    - https://freedium.cfd/https://medium.com/m/global-identity-2?redirectUrl=https%3A%2F%2Ftowardsdatascience.com%2Fwhich-quantization-method-is-right-for-you-gptq-vs-gguf-vs-awq-c4cd9d77d5be

- Old quant method: https://github.com/yhhhli/BRECQ


## Other general Optimizations

- https://pytorch.org/blog/accelerating-generative-ai-3/
- https://pytorch.org/blog/accelerating-generative-ai-2/
- Compile with max auto-tune.
- Compute QKV in one go.

## Quantize Diffusion
- https://github.com/Xiuyu-Li/q-diffusion/tree/master
 - https://www.youtube.com/watch?v=virARwF_pt4&t=1669s
- SD3 paper: https://arxiv.org/pdf/2403.03206.pdf


## Libraries

- https://github.com/huggingface/quanto

## CUDA references

- https://github.com/IST-DASLab/marlin
- https://github.com/TimDettmers/bitsandbytes
- https://github.com/turboderp/exllama/tree/master/exllama_ext/cuda_func

## Good discussions

- https://github.com/huggingface/quanto/issues/65
- 4/8 bit in diffuser: https://github.com/huggingface/diffusers/issues/6500
- fp8 storage: https://github.com/AUTOMATIC1111/stable-diffusion-webui/pull/14031
- 4bit Qlinear: https://github.com/huggingface/quanto/issues/65
- QX4: https://github.com/ggerganov/llama.cpp/issues/1240
- Quantized linear layer: https://discuss.pytorch.org/t/understanding-quantized-linear-layer/154000
- GPTQ & bnb benchmarking by TheBloke: https://github.com/AutoGPTQ/AutoGPTQ/issues/49#issuecomment-1538065985

## Misc

### FP8 vs INT8
Qualcomm [whitepaper](https://www.qualcomm.com/news/onq/2023/04/floating-point-arithmetic-for-ai-inference-hit-or-miss) shows that the hardware implementation of the FP8 format is somewhere between 50% to 180% less efficient than INT8 in terms of chip area and energy usage. This is because of the additional logic needed in the accumulation of FP formats versus integer formats. This seems like a broad range, but the actual efficiency depends on many hardware design choices that vary greatly. A similar conclusion was reached recently by Microsoft and Meta: Floating-point arithmetic is just much less efficient than integer arithmetic.

This means that FP8 will have to be significantly more accurate than INT8 to be worthwhile from a hardware-efficiency perspective.  

FP8 is only supported in H100 GPUs but storing approximations in fp8 can be accurate than vanilla int8 quantization. The recent QLoRA paper explores different data types, 4-bit Float and 4-bit NormalFloat which again are only used for storage and not for computation.

### Quantizing bias

Biases are not converted because to preserve the accuracy of a typical addmm operation, they must be converted with a scale that is equal to the product of the input and weight scales, which leads to a ridiculously small scale, and conversely requires a very high bitwidth to avoid clipping. 

## Quantization layer reference

https://pytorch.org/docs/stable/amp.html#torch.autocast



