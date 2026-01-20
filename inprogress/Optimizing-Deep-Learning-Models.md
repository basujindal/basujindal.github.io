---
layout: post
title: "Need for Speed: Optimizing Deep Learning Models"
# cover-img: /assets/img/path.jpg
thumbnail-img: /assets/img/deepNN.webp
share-img: /assets/img/path.jpg
tags: [Deep Learning, Computer Vision, NLP]
---

Huang et al. showed that mixed precision training is 1.5x to 5.5x faster over float32 on V100 GPUs, and an additional 1.3x to 2.5x faster on A100 GPUs on a variety of networks. On very large networks the need for mixed precision is even more evident. Narayanan et al. reports that it would take 34 days to train GPT-3 175B on 1024 A100 GPUs (with a batch size of 1536), but it’s estimated it would take over a year using float32!

## Precision

![](/assets/img/precision.png)

If you allow for DENORMALS as well, then minumum values are:

- 16-bit: ±5.96^e-8
- 32-bit: ±1e^-45
- 64-bit: ±5e^-324

Always keep in mind that just because a number is in this range doesn't mean it can be exactly represented. At any range, floating-point numbers necessarily skip values due to cardinality reasons. The classic example is 1/3 which has no exact representation in any finite precision. In general you can only precisely represent those numbers that are called "dyadic," i.e., those of the form A/2^B for some A and B; provided the result falls into the dynamic range.

## Model Compilation

### Torchscript JIT

TorchScript is a way to create serializable and optimizable models from your Pytorch code. Once exported to Torchscript your model will be runnable from Python and C++.

Trace: An input is sent through the model and all operations are recorded in a graph that will define your torchscript model.
Script: If your model is more complex and has control flow such as conditional statements, scripting will inspect the source code of the model and compile it as TorchScript code.
Note that since your model will be serialized you won’t be able to modify it after it has been saved, therefore you should put it in evaluation mode and export it on the appropriate device before saving.

If you want to do inference both on CPU and GPU you need to save 2 different models.

```s
jit_sample = (batch_x['input_ids'].int().to(device), batch_x['attention_mask'].int().to(device))
model.eval()
model.to(device)
module = torch.jit.trace(model, jit_sample)
torch.jit.save('model_jit.pt')
#loading
model = torch.jit.load('model_jit.pt', map_location=torch.device(device))
logits = model(\*\*batch_x)
```

For a more comprehensive introduction you can follow the official tutorial.

### ONNX

ONNX provides an open source format for AI models, most frameworks can export their model to the ONNX format. In addition to interoperability between frameworks, ONNX comes with some optimization that should accelerate inference.

Exporting to ONNX is slightly more complicated but Pytorch does provide a direct export function, you only need to provide some key information.

opset_version, for each version there is a set of operators that are supported, some models with more exotic architectures may not be exportable yet.
input_names and output_names are the names to assign to the input and output nodes of the graph.
dynamic_axes argument is a dictionary which indicates which dimension of your input and output variables may change, for example the batch_size or the length of the sequence.

```s
input_x = jit_sample ## taking sample from previous example
torch.onnx.export(model, input_x,'model_onnx.pt',export_params=True, opset_version=11, do_constant_folding=True, input_names = ['input_ids', 'attention_mask'], output_names = ['output'],
dynamic_axes= {
'input_ids' : {0 : 'batch_size', 1:'length'},'attention_mask' : {0 : 'batch_size', 1:'length'},
'output' : {0 : 'batch_size'}
})
#loading
model = onnxruntime.InferenceSession(model_onnx)
batch_x = {
'input_ids':sample['input_ids'].cpu().numpy(),
"attention_mask":sample['attention_mask'].cpu().numpy()
}
logits = model.run(None, batch_x)
```

ONNX runtime can be used with a GPU, though it does require specific versions of CUDA, cuDNN and OS making the installation process challenging at first.
For a more comprehensive tutorial you can follow the official documentation.

Experimental results
Each configuration has been run 5x times on a dataset of 1k sentences of various lengths. We tested 2 different popular GPU: T4 and V100 with torch 1.7.1 and ONNX 1.6.0. Keep in mind that the results will vary with your specific hardware, packages versions and dataset.

Inference time ranges from around 50 ms per sample on average to 0.6 ms on our dataset, depending on the hardware setup.

On CPU the ONNX format is a clear winner for batch_size <32, at which point the format seems to not really matter anymore. If we predict sample by sample, we see that ONNX manages to be as fast as inference on our baseline on GPU for a fraction of the cost.

As expected, inference is much quicker on a GPU especially with higher batch size. We can also see that the ideal batch size depends on the GPU used:

For the T4 the best setup is to run ONNX with batches of 8 samples, this gives a ~12x speedup compared to batch size 1 on pytorch
For the V100 with batches of 32 or 64 we can achieve up to a ~28x speedup compared to the baseline for GPU and ~90x for baseline on CPU.
Overall, we find that choosing an appropriate format has a significant impact for smaller batch sizes, but that impact narrows down as batches get larger, with batches of 64 samples the 3 setups are within ~10% of each other.

Impact of sequence length and batching strategy
Another thing to take into account is sequence length. Transformers are usually restricted to sequences of 512 tokens but there is a massive difference in speed and memory requirement for different sequences lengths in that range.

Inference time scales up roughly linearly with sequence length for larger batches but not for individual samples. This means that if your data is made of long sequences of text (news articles for example), then you won’t get as big speedup by batching. As always, this depends on your hardware, a V100 is faster than a T4 and won’t suffer as much when predicting long sequences, whereas on the other hand our CPU does get completely overwhelmed:

If your data is heterogeneous length-wise and you work with batches, these discrepancies will cause problems due to the necessity to pad your samples to the longest one in your batch, which adds a lot of computation. Therefore it is usually better to batch samples of similar length together, as it is most likely quicker to predict multiple batches of similar length than one big batch that will be mostly padding tokens.

As a quick check, let’s look at what happens when we sort our dataset prior to running inference:

As we expected, there is a significant incentive to group samples of similar length together for larger batch sizes. For unsorted data, as batches get larger there is an increasing probability to end up with some longer samples that will significantly increase the inference time of the whole batch. We can see that going from 16 to 64 batch_size slows down inference by 20%, while it gets 10% faster with sorted data.

This strategy can also be used to significantly reduce your training time, however this should be done with caution since it may negatively impact the performance of your model, especially if there is some correlation between your labels and the length of your samples.

While these experiments have been run directly in Python, both Torchscript and ONNX models can be loaded directly in C++, this could provide an additional boost in inference speed.

If your model is still too slow for your use-case, Pytorch does provide different options for quantization. ‘dynamic quantization’ can be done post-training, but it will most likely have an impact on the accuracy of your model, while ‘quantization aware training’ requires retraining, but it should have less impact on your model performance.

## Mixed Precision

- Most DL models are single-precision float32 by default.

Lower numerical precision - while reasonably maintaining accuracy - reduces:

a) model size
b) memory required
c) power consumed

Lower precision speeds up:

- compute-bound operations, by reducing load on the hardware
- memory bandwidth-bound operations, by accessing smaller data

In many deep models, memory access dominates power consumption; reducing memory I/O makes models more energy efficient.
3 lower precision datatypes are typically used in PyTorch:

- FP16 or half-precision (`torch. float16`)
- BF16 (`torch. bfloat16`)
- INT8 (`torch.quint8` and `torch. qint8`) which stores floats in a quantized format

FP16 is only supported in CUDA, BF16 has support on newer CPUs and TPUs

Calling .half() on your network and tensors explicitly casts them to FP16, but not all ops are safe to run in half-precision.
A better solution is to use Automatic Mixed Precision to let PyTorch choose the right op-specific precision (FP32 vs FP16 / BF16) for your tensors.

PyTorch has a generic API `torch. autocast()` that automatically casts CUDA tensors to FP16, and CPU tensors to BF16. Running Resnet101 on a Tesla T4 GPU shows AMP to be faster than explicit half-casting.

### Precision (Depends on the number of bits in Mantissa)

Naturally, precision increases with the bits increment. This means if you need precise results, you should use formats with more precision bits, but this will increase space and time requirements of the calculations.

Using FP16 instead of FP32 in deep learning proved helpful in decreasing the time and space needed for training the models without much loss in the performance of these models.

This transition prevents overfitting to some extent; if the models’ parameters are highly adjustable, this opens a window for overfitting to your training data.

In contrast, FP16 opens a tiny window for overflow and underflow, where you try to compute numbers out of the representable range. Or with unnoticeable differences with regard to this format.

The caveat in DL networks is that the range matters but not the precision, which lead to the invention of BFLOAT16 – short for Google’s Brain float 16. Just an FP32 with it’s precision truncated to leave it with 16 bits.

BFLOAT16 combines the best of both worlds; it has the range of FP32 by using 8 bits as the exponent and 7 bits as the precision part. This makes it possible to represent the whole range of FP32 with BFLOAT16, but with little precision. i.e., you can compare two numbers with a meaningful difference in magnitude, but the same can’t be said for two close numbers (underflow), which isn’t a big issue in DL applications.

A great example to mentalize the difference which is related to computer vision; consider a robotic hand that helps clean valuable pieces; precision is essential in this case. This is opposed to another hand that helps in cutting metals in a factory, which requires fast production rate.

In the example with the first hand, it is plausible to FP32 instead of FP16, which is more suitable to the nature of the industrial-level metal cutting machine!

Using torch.amp with bfloat16 or float16. Both these low precision floating point data types are usually comparably fast, but some networks may only converge with one vs the other. If a network requires more precision it may need to use float16, and if a network requires more dynamic range it may need to use bfloat16, whose dynamic range is equal to that of float32. If overflows are observed, for example, then we suggest trying bfloat16.

High Performance Computing (HPC) applications, regression tasks, and generative networks may simply require full float32 IEEE precision to converge as expected.
Try selectively applying torch.amp. In particular we recommend first disabling it on regions performing operations from the torch.linalg module or when doing pre- or post-processing. These operations are often especially sensitive.

Note that TF32 mode is a global switch and can’t be used selectively on regions of a network. Enable TF32 first to check if a network’s operators are sensitive to the mode, otherwise disable it.

Figure out by experimentation if your network is sensitive to range and/or precision of a format. For example fine-tuning bfloat16-pretrained models in float16 can easily run into range issues in float16 because of the potentially large range from training in bfloat16, so users should stick with bfloat16 fine-tuning if the model was trained in bfloat16.

The performance gain of mixed precision training can depend on multiple factors (e.g. compute-bound vs memory-bound problems) and users should use the tuning guide to remove other bottlenecks in their training scripts. Although having similar theoretical performance benefits, BF16 and FP16 can have different speeds in practice. It’s recommended to try the mentioned formats and use the one with best speed while maintaining the desired numeric behavior.

![](/static/images/mixed_precision_compare.png)

## Good example of training LLM

- https://github.com/bigscience-workshop/bigscience/blob/master/train/tr11-176B-ml/chronicles.md#what-makes-the-176b-ml-training-so-stable

## Training

- MP Training is generally unstable
- https://nvlabs.github.io/eccv2020-mixed-precision-tutorial/

- Very good explanation: https://docs.fast.ai/callback.fp16
- https://spell.ml/blog/mixed-precision-training-with-pytorch-Xuk7YBEAACAASJam

## Quantization

- Quantization converts FP32 to INT8, with a potential 4x reduction in model sizes.

Only the forward pass is quantizable, so you can use this only for inference, not training.

Quantization Method Benefits Weaknesses

- Dynamic

Easy to use with only one API call
More robust to distribution drift resulting in slightly higher accuracy
Works well for long short-term memory (LSTM) and Transformer models
Additional overhead in every forward pass

- Static (also known as PTQ)

Faster inference than dynamic quantization by eliminating overhead
May need regular recalibration for distribution drift

- Quantize-Aware Training (QAT)

Higher accuracy than static quantization
Faster inference than dynamic
High computational cost

## Papers

- [A White Paper on Neural Network Quantization](https://arxiv.org/abs/2106.08295)
- [Integer Quantization for Deep Learning Inference: Principles and Empirical Evaluation](https://arxiv.org/abs/2004.09602)
- [Quantizing deep convolutional networks for efficient inference: A whitepaper](https://arxiv.org/abs/1806.08342)

### Pre Quantized models

- https://github.com/quic/aimet

### Channels Last

When it comes to vision models, NHWC, otherwise known as channels-last, is a faster tensor memory format in PyTorch. Having data stored in the channels-last format accelerates operations in PyTorch. Formatting input tensors as channels-last reduces the overhead that is needed for conversion between different format types, resulting in faster inference.

### Tracing

- https://www.youtube.com/watch?v=HLzPOhjZ4wc

### Tracing vs Scripting

- https://ppwwyyxx.com/blog/2022/TorchScript-Tracing-vs-Scripting/

### ONNX

- https://www.youtube.com/c/ONNXRuntime/videos

### ONNX vs PyTorch JIT

- ONNX is just a framework-independent storage format. It's supported by many different inference runtimes such as ONNX Runtime (ORT), OpenVINO, TensorRT, so actual speed up depends on hardware/runtime combination, but it's not uncommon to get a x2-x5 of extra performance. OpenVINO is blazingly fast on CPUs, TensorRT shines on nvidia gpus. ORT is very easy to deploy on different hardware and it is a good choice if you want to minimize package size (pytorch is a huge beast!) and number of extra dependencies.

Also you don't need to write any extra code for PT->ONNX conversion in 99.9% cases, torch.onnx package does the job.

IMHO model with control flow is the only case when TorchScript is superior to any other ONNX-supported runtime, because ONNX requires model to be DAG.

I tried both and liked ONNX at first because it seemed a bit faster and production dependencies are less, but later settled on TorchScript. Mostly because in can handle different sized input images, where ONNX requires a fixed input size. In Onnx, You can use dynamic axis to allow for different sized inputs. I am sure ONNX can handle variable input sizes. Did you use the pytorch to ONNX converter?
Yes, tried following these instructions for exporting as ONNX. I was not able to get dynamic axis to work for various image heights and/or width.

- [Convert model to ONNX tutorial](https://pytorch.org/tutorials/advanced/super_resolution_with_onnxruntime.html)

## TensorRT

- https://www.youtube.com/watch?v=TU5BMU6iYZ0

- [Good Tutorial](https://www.youtube.com/watch?v=iFADsRDJhDM)

## Transformer Specific Optimizations

- Better Transformer https://pytorch.org/blog/a-better-transformer-for-fast-transformer-encoder-inference/

### Flash Attention

- https://www.youtube.com/watch?v=FThvfkXWqtE

## DataLoader

One of the important requirements to reach great training speed is the ability to feed the GPU at the maximum speed it can handle. By default everything happens in the main process and it might not be able to read the data from disk fast enough, and thus create a bottleneck, leading to GPU under-utilization.

DataLoader(pin_memory=True, ...) which ensures that the data gets preloaded into the pinned memory on CPU and typically leads to much faster transfers from CPU to GPU memory.
DataLoader(num_workers=4, ...) - spawn several workers to pre-load data faster - during training watch the GPU utilization stats and if it’s far from 100% experiment with raising the number of workers. Of course, the problem could be elsewhere so a very big number of workers won’t necessarily lead to a better performance.

## CheckList

- JIT
- Scripting
- ONNX
- Channels Last
- Pin Memory
- Num workers > 0
- Remove `.to(device)`
- Half Precision
- Quantization
- Xformers
- 8Bit Adam
- Gradient Checkpointing
- Gradient Accumulation
- Flash Attention

## Sources

- https://www.reddit.com/r/MachineLearning/comments/strteu/d_torchscript_model_vs_onnx/
- https://towardsdatascience.com/an-empirical-approach-to-speedup-your-bert-inference-with-onnx-torchscript-91da336b3a41
- https://gist.github.com/mcarilli/43445260404c8d7cd79d84439808250e
- https://huggingface.co/docs/transformers/v4.13.0/en/performance#gradient-checkpointing
- https://bytexd.com/fp16-vs-fp32-what-do-they-mean-and-whats-the-difference/
- https://pytorch.org/blog/what-every-user-should-know-about-mixed-precision-training-in-pytorch/
- https://cloud.google.com/blog/products/ai-machine-learning/bfloat16-the-secret-to-high-performance-on-cloud-tpus