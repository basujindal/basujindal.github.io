---
title: "Deep Learning Notes"
category: Deep Learning, Computer Vision, NLP
date:   2022-05-23 15:20:28 +0530
summary: "A collection of practical tips and best practices for deep learning, covering model training, optimization, and deployment."
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

Deep Learning notes and tips that I have gathered over time. This is a living document and will be updated as I learn more.

### Useful Links

- [Google Tuning Playbook](https://github.com/google-research/tuning_playbook)
- [Efficient Training on a Single GPU](https://huggingface.co/docs/transformers/perf_train_gpu_one)
- [http://karpathy.github.io/2019/04/25/recipe/](Deep Learning Recipe by Andrej Karpathy)
  
### General points

- Try to over fit a small batch, a decent model should almost every time able to fit a small batch, if it fails something is wrong with the model or the data.
- Finding the optimal parameters for a new model is hard, it requires a lot of trail and error. Be patient.
- Use model.eval() before evaluating the model on the validation/test set in between or after training as in contrast to model.train(), it turns off dropout and uses the running mean and variance instead of the mean and variance of the current batch for BatchNorm.
- If possible, write a script to try out multiple models instead of watching the loss going up and down.

<!-- ### Data Augmentation

- Data Augmentation almost always helps, like rotating the image, cropping it, or changing its contrast.
- But don't add unnecessary augmentation, like a rotating a picture of a car 90 degrees won't help much if you are doing object detection as chances are you would rarely find such cars in real world or in validation data. -->

### Activation

- Don't forget the activation, your model won't work!
- This seems obvious but one may forget an activation while trying multiple models.

### Normalization

- Small batch size with BatchNorm can lead to highly unstable training. Keep the batch size as large as possible.
- Bias in layer just before BatchNorm is redundant, as normalization effectively cancels out the bias.
- BatchNorm maybe applied before the ReLU layer as this gives a dropout effect, but the opposite is also done in practice.

### Dropout

- Use either dropout or batch norm, using both will not give any benefit. Some papers even suggest that it's better to use BatchNorm than Dropout.
- Don't add dropout after the output layer (obvious but a common mistake).

### Learning rate

- A learning rate of 0.001 is generally a good start for Computer Vision. Not a hard and fast rule, definitely try other learning rates. (YOLOv3 used LR of 0.1)
- Decaying the learning rate over time (for eg. decay exponentially from 1e-3 to 1e-5) as the model learns will help the model converge.

### Batch Size

- Increasing batch size helps in stabilizing the learning and may reduce the number of epochs required.
- Keep the batch size as large as possible, only limited by the available GPU Memory.
  (Although sometimes a very large batch size may hurt models performance but that is generally when batch size > 2048)

### Saving & Loading the Model

- If using Pytorch, don't save the model using torch.save(model, PATH) because it may cause issues with different pytorch versions.
- Instead use torch.save(model.state_dict(), PATH) to save the state dict and save the model structure as a python or text file. [StackOverflow Answer](https://stackoverflow.com/questions/42703500/best-way-to-save-a-trained-model-in-pytorch)

### Backprop in Convolution layer and MaxPool Layer

- Not a tip but something that we all should be aware about.
- BackProp in Convolution layers is not as straight forward as in Linear Layers.
- Refer to this excellent article on [Medium](https://towardsdatascience.com/backpropagation-in-a-convolutional-layer-24c8d64d8509).

- From the above image, if we have MaxPool after $Output(O)$, then we will just have $\frac{dL}{{dO}_i} = 0$ for the values that were not max.

### Loading data faster

- Loading data from the SSD or HDD might me a huge bottleneck because of which you might not be able to fully utilize the GPU computation power. To test the latency introduced by data loading, instead of loading data, give all ones tensors as input to the model and watch the difference between training speed and GPU Util.

- Some methods to mitigate this:
  - You can either load entire data into the RAM and if possible into GPU VRAM.
  - The above may not be possible if the datasize is huge, in that case, use "num_workers = n" if using PyTorch dataloader. It uses multi-processing load data faster into shared memory(part of RAM in linux and SSH in WSL used for IPC).

### Loading Model faster

Unlike data, the model is usually loaded once at the start of the training but if you are testing out various training parameters or debugging your code, you might be loading the model multiple times. Loading the model from the disk is slow and can be a bottleneck.

It is usually okay if dealing with small models but if you are dealing with large models like GPT-3, it can take a lot of time to load the model. To mitigate this, you can load the model once and then save it in the RAM or GPU VRAM. This will make the loading process much faster.

The easiest way is to create a RamDisk and save the model there. A RamDisk is a part of RAM that is used as a disk. It is much faster than SSD or HDD.

To create a RamDisk in Linux, use the following commands:

```bash
sudo mkdir /mnt/ramdisk
sudo mount -t ramfs -o size=50000m ramfs /mnt/ramdisk
```

The above commands will create a RamDisk of size 50GB. You can change the size as per your requirement. Now you can save the model in the RamDisk and load it from there.

It took me from 4 minutes to load LLaMA 7B to 9 seconds.

### Warm Up

- Sometimes the pre-trained wights or initialized weights are hard for training using large LR. For example, using ImageNet classification pre-trained network and further finetune for detection.

- We can first use a small LR and then increase it to a large LR in a few hundred iterations.

<!-- ### Batch Size vs LR

- Emperically, if you multiply the batch size by k you should increase the
learning rate proportionally. For example, if you train a classification network using batch.
  - size 128, and learning rate 0.1
  - batch size 256, learning rate 0.2
  - batch size 512, learning rate 0.4 -->

### Increasing image size

#### Deconvolution

- Inverse of Convolution, if we know the final image and the convolution matrix we can get the original image back using Inverse Fourier Transformation.

- https://www.youtube.com/watch?v=f-IINpceX6k

#### UpSampling2D

- It is simple interpolation with no learnable parameters. It can either be nearest, which means just repeating the values or something like bilinear interpolation, bicubic, etc.
- Fast due to no learnable parameters.

```python
input = torch.arange(1, 5, dtype=torch.float32).view(1, 1, 2, 2)
input
tensor([[[[1., 2.],
          [3., 4.]]]])

>>> m = nn.Upsample(scale_factor=2, mode='nearest')
>>> m(input)
tensor([[[[1., 1., 2., 2.],
          [1., 1., 2., 2.],
          [3., 3., 4., 4.],
          [3., 3., 4., 4.]]]])

>>> m = nn.Upsample(scale_factor=2, mode='bilinear')  # align_corners=False
>>> m(input)
tensor([[[[1.0000, 1.2500, 1.7500, 2.0000],
          [1.5000, 1.7500, 2.2500, 2.5000],
          [2.5000, 2.7500, 3.2500, 3.5000],
          [3.0000, 3.2500, 3.7500, 4.0000]]]])
```

#### ConvTranspose

Recommened reading:
- https://towardsdatascience.com/what-is-transposed-convolutional-layer-40e5e6e31c11

![Alt text](../images/convTranspose.png)

- It has learnable kernels.
- Exact opposite formula for Conv2D, only output padding is extra term.
  
  $$H_{out} \= (H_{in}−1)stride − 2padding + dilation(kernelSize−1)+outputPadding+1$$

- In GANs we don't use BN, so we use stride of 2 if we want to double image size.
  Keeping dilation = 1, stride = 2, output padding = 0, we get padding = kernel/2 - 1

- May create checkerboard effect as seen in GANs (https://distill.pub/2016/deconv-checkerboard/)
- Used in Super Resolution, Image Segmentation

Unet & BigGAN uses Upsampling followed by Conv layers to avoid checkboard effect and have learnable parameters.

### Input image normalization

- Input pixels are from uint8 i.e. [0, 255]. We "standardize" them generally to [-1,1] or sometimes to [0,1].

- Image is [0,255]. Divide by 255 to get [0,1], next to make is [-1,1], substract 0.5 from each pixel and divide by 0.5

- img_norm = (img - 0.5)/0.5

- Why [-1,1] is better: https://datascience.stackexchange.com/questions/54296/should-input-images-be-normalized-to-1-to-1-or-0-to-1

- Standardization vs Normalization: https://www.geeksforgeeks.org/normalization-vs-standardization/

### Image Normalization

#### Batch Norm

- In Feed forward layer, output of a neuron is taken across the batch and normalized.
- For Image, 1 channel i.e. HxW output is taken and normed across batch.
- A running average is kept for the mean and variance of the output of the neuron or the image across the batch.

#### Instance Norm

- Similar to BatchNorm (normalization done over a single channel) but only over only 1 image.
- Used to keep the sample features independent improving image variability.
- Not possible in Feed Forward since if no batch, only neuron is there.
- No need to keep running average

![image](../images/instanceNorm.png)

#### Layer Norm

- Normed across the layer for 1 data sample, i.e. output of the Feed Forward network.
- For Image, normalize across all the channels of one data sample, same as instance norm across all channels.
- In transformer, if we have a tensor of B, N, D where B is the batch size, N is the number of tokens and D is the dimension of each token, then the normalization is done across the D dimension, i.e. the tokens don't interact with each other.
- Unlike Instance Norm and batch norm, it does element wise affine operation on the normalized output. This means that all the D values in a token have different learnable mean and variance
- No need to keep running average


#### Group Norm

- Somewhere in between LN and IN, it assumes that some channels will have similar features which should be normalzed together instead of only 1 channel or all the channels. The groups to be normalized together are just the adjacent ones like of 32 channels, groups of 8 can be formed.
- Good for small batch sizes like $\in$ (1,8)

The H, W are flattend to show the 4D tensor in a 3D tensor

![image](../images/norm.png)

#### RMSNorm

- Similar to LayerNorm but the input is only divided by the RMS of the input and not the mean and variance.

If the output of a Feed Forward layer is is $A = [a_1, a_2, \dots, a_n]$, then the output of the layer norm is:

$$A = \frac{A - \mu}{\sigma}$$

where $\mu$ is the mean of the output and $\sigma$ is the standard deviation of the output.

Whereas in RMSNorm, the output is:

$$A = \frac{A}{\sqrt{\frac{1}{n}\sum_{i=1}^{n}a_i^2}}$$

Experimentally, the performance of RMSNorm is similar to LayerNorm but it is faster to compute due to the absence of the mean and variance.


## Activation Functions

### Gaussian Error Linear Unit (GELU)

![](../images/gelu.png)

GELU is a smooth approximation of ReLU. It is defined as:

$$GELU(x) = x * \Phi(x)$$

where $\Phi(x)$ is the CDF of the Gaussian distribution.

It combines ReLU and dropout into a single function. Since CDF of Normal distribution cannot be computed in closed form, it is approximated using the following function:

$$\Phi(x) = 0.5 * (1 + tanh(\sqrt{2/\pi} * (x + 0.044715 * x^3)))$$

It can also be approximated using the following function:

$$\Phi(x) = 0.5 * (1 + erf(x/\sqrt{2}))$$

Here erf is the error function, which has efficient implementations in most programming languages.

It can also be approximated using the sigmoid function:

$$\Phi(x) = x * sigmoid(1.702 * x)$$

### Swish (SiLU)

![](../images/silu.png)

Swish is also known as Sigmoid Linear Unit or SiLU. It is defined as:

$$Swish(x) = x * sigmoid(\beta x)$$

It is a smooth approximation of ReLU and is also differentiable everywhere.

The Transformer model is described by alternating between multi-head attention and position-wise feed-forward networks (FFN). The original FFN is defined as:

$$ \text{FFN}(x, W_1, W_2, b_1, b_2) = \max(0, xW_1 + b_1)W_2 + b_2 $$

A bias-free version, following the T5 codebase, is given by:

$$ \text{FFNReLU}(x, W_1, W_2) = \max(xW_1, 0)W_2 $$

Subsequent enhancements proposed include using GELU and Swishβ as activation functions:

$$ \text{FFNGELU}(x, W_1, W_2) = \text{GELU}(xW_1)W_2 $$

$$ \text{FFNSwish}(x, W_1, W_2) = \text{Swish}_\beta(xW_1)W_2 $$

### Gated Linear Units (GLU) and Variants

![Alt text](../images/swiglu.png)
GLU is introduced as follows:

$$ \text{GLU}(x, W, V, b, c) = \sigma(xW + b) \odot (xV + c) $$

The bilinear variant (without the activation) is defined as:

$$ \text{Bilinear}(x, W, V, b, c) = (xW + b) \odot (xV + c) $$

Further variants of GLU with different activation functions include:

$$ \text{ReGLU}(x, W, V, b, c) = \max(0, xW + b) \odot (xV + c) $$

$$ \text{GEGLU}(x, W, V, b, c) = \text{GELU}(xW + b) \odot (xV + c) $$

$$ \text{SwiGLU}(x, W, V, b, c, \beta) = \text{Swish}_\beta(xW + b) \odot (xV + c) $$

The proposal includes incorporating GLU or its variants into the Transformer FFN layer, thus defining new FFN variations:

$$ \text{FFNGLU}(x, W, V, W_2) = (\sigma(xW) \odot xV)W_2 $$

$$ \text{FFNBilinear}(x, W, V, W_2) = (xW \odot xV)W_2 $$

$$ \text{FFNReGLU}(x, W, V, W_2) = (\max(0, xW) \odot xV)W_2 $$

$$ \text{FFNGEGLU}(x, W, V, W_2) = (\text{GELU}(xW) \odot xV)W_2 $$

$$ \text{FFNSwiGLU}(x, W, V, W_2) = (\text{Swish}_1(xW) \odot xV)W_2 $$

To maintain parameter count and computational requirements, a reduction in the dimensionality of the hidden units is applied when transitioning from the original two-matrix FFN to these new variants.


## Mixed Precision Training

Recommended reading: https://sebastianraschka.com/blog/2023/llm-mixed-precision-copy.html

FP16 training is not straightforward because of the limited range and precision compared to FP32. Because of this, the gradients underflow and become zero. To prevent this, mixed precision training is used.

- Loss Scaling: Multiply the loss by a large number to prevent underflow. The gradients are then divided by the same number.

- Update the master weights in FP32. The advantage with mixed-precision training is that the forward pass and backward pass computations are done in FP16 which is faster than FP32. However due to the low range and precision of FP16, the gradients are casted to FP32 and the weights are updated in FP32. Also the optimizer states are stored in FP32.

Inshort, the forward pass and backward pass (gradient computation) are done in FP16, the loss is multiplied by a scaling factor to prevent underflow, the gradients are upcasted to FP32 and divided by the same scalign factor and is used to update the weights in FP32 along with the FP32 optimizer states.


## Memory Requirements

Suggested Reading:
- https://arxiv.org/pdf/1910.02054v3.pdf
- [Medium Article](https://medium.com/@maxshapp/understanding-and-estimating-gpu-memory-demands-for-training-llms-in-practise-c5ef20a4baff#:~:text=It%20requires%2020GB%20of%20in,memory%20using%20Tensorflow%20or%20PyTorch)

To train a model with parameters $P$ with $n$ number of bytes per parameter, we need to store the following in memory:

- The model parameters:  $nP$
- The gradients: $nP$
- The optimizer state: $nP + nP$ for Adam and $nP$ for SGD

Let's take the example of LLAMA 7B model with $P \approx 7B$.

For training in full precision (fp32) with Adam optimizer, the total memory required is $ 4\*7 + 4\*7 + 8\*7 = 112GB $

Since fp16 mixed precision training requires storing a copy of parameters in full-precision too, training with Adam optimizer requires a total memory required of $ 2\*7 + 2\*7 + 8\*7 + 4\*7 = 84GB $

If training in brain float (bf16) and Adam optimizer, we don't need to store the weights in full-precsion, therefore the total memory required is $ 2\*7 + 2\*7 + 4\*7 = 56GB $