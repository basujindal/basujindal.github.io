---
title: "Quantization"
date: 2024-07-17
show: false
---

## Exponent & Mantissa 

![](../../images/precision.png)

If you allow for DENORMALS as well, then minumum values are:

- 16-bit: ±5.96^e-8
- 32-bit: ±1e^-45
- 64-bit: ±5e^-324

Just because a number is in this range doesn't mean it can be exactly represented. At any range, floating-point numbers necessarily skip values due to cardinality reasons. The classic example is 1/3 which has no exact representation in any finite precision. In general you can only precisely represent those numbers that are called "dyadic," i.e., those of the form A/2^B for some A and B; provided the result falls into the dynamic range.

Naturally, precision increases with the bits increment. This means if you need precise results, you should use formats with more precision bits, but this will increase space and time requirements of the calculations.

Using FP16 instead of FP32 in deep learning proved helpful in decreasing the time and space needed for training the models without much loss in the performance of these models.

This transition prevents overfitting to some extent; if the models’ parameters are highly adjustable, this opens a window for overfitting to your training data.

In contrast, FP16 opens a tiny window for overflow and underflow, where you try to compute numbers out of the representable range. Or with unnoticeable differences with regard to this format.

The caveat in DL networks is that the range matters but not the precision, which lead to the invention of BFLOAT16 – short for Google’s Brain float 16. Just an FP32 with it’s precision truncated to leave it with 16 bits.

BFLOAT16 combines the best of both worlds; it has the range of FP32 by using 8 bits as the exponent and 7 bits as the precision part. This makes it possible to represent the whole range of FP32 with BFLOAT16, but with little precision. i.e., you can compare two numbers with a meaningful difference in magnitude, but the same can’t be said for two close numbers (underflow), which isn’t a big issue in DL applications.

Both these low precision floating point data types are usually comparably fast, but some networks may only converge with one vs the other. If a network requires more precision it may need to use float16, and if a network requires more dynamic range it may need to use bfloat16, whose dynamic range is equal to that of float32. If overflows are observed, for example, then we suggest trying bfloat16.

High Performance Computing (HPC) applications, regression tasks, and generative networks may simply require full float32 IEEE precision to converge as expected. Note that TF32 mode is a global switch and can’t be used selectively on regions of a network. Enable TF32 first to check if a network’s operators are sensitive to the mode, otherwise disable it.

Figure out by experimentation if your network is sensitive to range and/or precision of a format. For example fine-tuning bfloat16-pretrained models in float16 can easily run into range issues in float16 because of the potentially large range from training in bfloat16, so users should stick with bfloat16 fine-tuning if the model was trained in bfloat16.

The performance gain of mixed precision training can depend on multiple factors (e.g. compute-bound vs memory-bound problems) and users should use the tuning guide to remove other bottlenecks in their training scripts. Although having similar theoretical performance benefits, BF16 and FP16 can have different speeds in practice. It’s recommended to try the mentioned formats and use the one with best speed while maintaining the desired numeric behavior.

![](../../images/mixed_precision_compare.png)

FP16 is only supported in CUDA, BF16 has support on newer CPUs and TPUs. Calling .half() on your network and tensors explicitly casts them to FP16, but not all ops are safe to run in half-precision. A better solution is to use Automatic Mixed Precision to let PyTorch choose the right op-specific precision (FP32 vs FP16 / BF16) for your tensors. 

## Quantization

![Alt text](../../images/llm_quant.png)

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
<!-- 
* FP8
    * Weights FP8 (channel wise), Activations fp8 (Tensor wise), KV cache fp8 
    * Uses FP8 tensor cores
    * Works on Hopper and later 
    * Low accuracy degradation and good performance

* W4A16 AWQ weight only
    * Weights int4 (group wise), Activations fp16, KV cache fp16
    * Uses fp16 tensor cores
    * Works on both Ampere and later
    * More accuracy degradation and less performant than FP8
* INT8 weight only quantization
    * Weights int8 (channel wise), Activations fp16, KV cache fp16
    * Uses fp16 tensor cores
    * Works on both Ampere and later
* INT4 weight only quantization
    * Weights int4 (channel wise), Activations fp16, KV cache fp16
    * Uses fp16 tensor cores
    * Works on both Ampere and Hopper
    * Need to run experiments 
* W4A8 AWQ weight only
    * Weights int4 (group wise), Activations fp8, KV cache fp8
    * Uses fp8 tensor cores
    * Works on Hopper and later
    * Need to add support and run experiments 
* W4A8KV4 Qserve
    * Weights int4, Activations int8, KV cache int4
    * Uses int8 tensor cores
    * Works on both Ampere and Hopper (Not optimized for Hopper)
    * Missing support for features like Paged KV cache, not worth supporting -->

## Smooth Quant, llm.int8, AWQ

![BNB](../../images/bnb.png)

The activation ($T \times d$) where each row is a token, can have outliers in a few channels across all tokens ($d_i$ embedding of all tokens) as shown in yellow in above figure. So it would be good to quantize the activations along the channels. But the GEMM operation is usually done along the channels (per token). Therefore, we quantize the activations along the columns, which means each row gets 1 scale, giving us $T$ scales. Also, the weights (d x o) are quantized along the rows, giving us $o$ scales.

BNB solves this by separating the activation channels with outliers and its respective weight rows. The outliers are computed in fp16 and the rest of the activations and weights are quantized to int8. 

Smooth Quant solves this by dividing the activation channels by a scale and multiplying the weights by the same scale. This way the ouliers in the activations are "transfered" to the weights. The scale is equal to the ${\frac{absmax(A_j)}{absmax(W_j)}}^\alpha$. $\alpha$ is the amount of scale to transfer from activations to weights usually set to 0.5. $A_j$ is the jth column of the activations and $W_j$ is the jth row of the weights.

![Quant channels](../../images/quant_channels.png)

The $absmax(A_j)$ can be calcluated dynamically during inference or statically by taking a sample of the activations on the training data. Smooth quant is faster than BNB since it doesn't require fp16 computation but the quality is almost the same. 

Smooth Quant is good for compute bound systems (high batch size) but edge inference (low batch size) is usually memory bound. Therefore, Han lab introduced Activation aware quantization (AWQ) which uses the distribution of activations to quantize only the weights to W4A16 format. During inference, the weights are dequantized to fp16 and the inference is done in fp16.

![Alt text](../../images/awqVSsmooth.png)

## FP8 (W8A8)

## NVFP4 (W4A4)

NVFP4 does the GEMM with A4 x W4  --> O16. We need to quantize both weights and activations to FP4 and a good approximate range for FP4 is `(-6, 6)`.

The scaling factor for quantization is `s =  m / 6` where `m = max(W)` is the max value of the weight/activation block (We use a block size of 16, which means every 16 values share a scaling factor). We store `s` using `fp8 (e4m3)` ,giving us an average bits per weight of `(4 * 16 + 8) / 16 = 4.5`. (Using FP16/FP32 for the scaling factor will make it 5 bit and 6 bit quantization ...)

Storing vanilla `s` leads to a large drop in precision, therefore we scale `s = SF * m / 6` before storing it in FP8. The idea is to keep `s` close to 1, around which the precision of FP8 is the highest. To quantize the weights, we get the `outputScale = 1 / (s / SF)` and `x_4 = x * outputScale = x * SF / s`. To dequantize, we use `x = s / SF * x_4`. 

In TRTLLM, the weights stored in FP4 along with `weight_scaling_factor_2 = SF` and `weight_scaling_factor = ` which is the blockwise fp8 scales. The activations we get from the previous layers are often in FP16 and hence we need to quantize them before the GEMM. Also the blockwise scaling factors `s` are calculated dynamically, i.e. we only have the `activation_scaling_factor (aka global_activation_scaling_factor)` before hand. We also compute `alpha = activation_scaling_factor * weight_scaling_factor_2`

The FP4 Tensor Core computes  = `A  = W4 * A4 * weight_scaling_factor * blockwise_activation_scaling_factor`. Followed by `A_16 = A * alpha`

## GPT OSS 120B example

Input GEMM (A4, B4 -> O16)
QKNorm (I16 -> O16)
 
Attention (QKV8 -> FP16) (How to convert from FP16 to FP8)??
CVT FP8 to FP4
OProj GEMM (A4, B4 -> O16)
RMS Norm (I16 -> O4)

Dense/MoE MLP Up(I4 -> O16)
Silu & Mul (I16 -> O4)
Dense/MoE MLP Down(I4 -> O16)

RMS Norm (I16 -> O4)


Repeat (replace Dense by MoE MLP)


## FP8 vs INT8
Qualcomm [whitepaper](https://www.qualcomm.com/news/onq/2023/04/floating-point-arithmetic-for-ai-inference-hit-or-miss) shows that the hardware implementation of the FP8 format is somewhere between 50% to 180% less efficient than INT8 in terms of chip area and energy usage. This is because of the additional logic needed in the accumulation of FP formats versus integer formats. This seems like a broad range, but the actual efficiency depends on many hardware design choices that vary greatly. A similar conclusion was reached recently by Microsoft and Meta: Floating-point arithmetic is just much less efficient than integer arithmetic.

This means that FP8 will have to be significantly more accurate than INT8 to be worthwhile from a hardware-efficiency perspective.  

FP8 is only supported in H100 GPUs but storing approximations in fp8 can be accurate than vanilla int8 quantization. The recent QLoRA paper explores different data types, 4-bit Float and 4-bit NormalFloat which again are only used for storage and not for computation.

## Quantizing bias

Biases are not converted because to preserve the accuracy of a typical addmm operation, they must be converted with a scale that is equal to the product of the input and weight scales, which leads to a ridiculously small scale, and conversely requires a very high bitwidth to avoid clipping. 


## Recommended Reading & References

### Recommened reading

- https://huggingface.co/blog/hf-bitsandbytes-integration
- Intro to weight quantization:https://medium.com/m/global-identity-2?redirectUrl=https%3A%2F%2Ftowardsdatascience.com%2Fintroduction-to-weight-quantization-2494701b9c0c
- Holy grail: https://timdettmers.com/2023/01/30/which-gpu-for-deep-learning/
- GPT Fast (Read for good quantization implementation) : https://github.com/pytorch-labs/gpt-fast
- Simple notebook: https://colab.research.google.com/drive/1oDfcLRz2AIgsclkXJHj-5wMvbylr4Nxz#scrollTo=iCsoFvwLrgdu

### Other quantization methods

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


### CUDA references

- https://github.com/IST-DASLab/marlin
- https://github.com/TimDettmers/bitsandbytes
- https://github.com/turboderp/exllama/tree/master/exllama_ext/cuda_func

### Good discussions

- https://github.com/huggingface/quanto/issues/65
- 4/8 bit in diffuser: https://github.com/huggingface/diffusers/issues/6500
- fp8 storage: https://github.com/AUTOMATIC1111/stable-diffusion-webui/pull/14031
- 4bit Qlinear: https://github.com/huggingface/quanto/issues/65
- QX4: https://github.com/ggerganov/llama.cpp/issues/1240
- Quantized linear layer: https://discuss.pytorch.org/t/understanding-quantized-linear-layer/154000
- GPTQ & bnb benchmarking by TheBloke: https://github.com/AutoGPTQ/AutoGPTQ/issues/49#issuecomment-1538065985


