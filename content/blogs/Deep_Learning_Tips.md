---
title: "Tricks of the Trade: Deep Learning"
category: Deep Learning, Computer Vision
date:   2022-05-23 15:20:28 +0530
summary:
description: 
cover:
  image:
  alt:
  caption: 
  relative: true
showtoc: true
draft: false
---

Creating a new Neural Architecture is not an easy task as it requires a lot of trial and error to find out the optimal hyper parameters, selecting the number of layers, type of normalization, etc. Also it can be very frustrating to see a non-decreasing loss, low validation accuracy or a bunch of NaNs in the output. Here are a few tips to keep in mind while creating, training or debugging a model.

### General points

- [Must Read](https://huggingface.co/docs/transformers/perf_train_gpu_one)
- Try to over fit a small batch, a decent model should almost every time able to fit a small batch, if it fails something is wrong with the model or the data.
- Finding the optimal parameters for a new model is hard, it requires a lot of trail and error. Be patient.
- Use model.eval() before evaluating the model on the validation/test set in between or after training as in contrast to model.train(), it turns off dropout and uses the running mean and variance instead of the mean and variance of the current batch for BatchNorm.
- If possible, write a script to try out multiple models instead of watching the loss going up and down.

### Data Augmentation

- Data Augmentation almost always helps, like rotating the image, cropping it, or changing its contrast.
- But don't add unnecessary augmentation, like a rotating a picture of a car 90 degrees won't help much if you are doing object detection as chances are you would rarely find such cars in real world or in validation data.

### Activation

- Don't forget the activation, your model won't work!
- This seems obvious but one may forget an activation while trying multiple models.

### Normalization

#### Batch Normalization

- Generally used for Computer Vision Tasks.
- Effectiveness of Batch Normalization is dependent on the batch size, increasing the batch size will help stabilize and speed up learning.
- Small batch size with BatchNorm can lead to highly unstable training. Keep the batch size as large as possible.
- Bias in layer just before BatchNorm is redundant, as normalization effectively cancels out the bias.
- In practice, BatchNorm layer is applied before the ReLU layer as this gives a dropout effect, but the opposite may also be done.

#### Layer Normalization

- Generally used for NLP tasks, most popularly in Transformers.

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
- Instead use torch.save(model.state_dict(), PATH) to save the state dict and save the model structure as a python or text file. [StackOverflow Answer](https://stackoverflow.com/questions/42703500/best-way-to-save-a-trained-model-in-pytorch){:target="\_blank"}

### Backprop in Convolution layer and MaxPool Layer

- Not a tip but something that we all should be aware about.
- BackProp in Convolution layers is not as straight forward as in Linear Layers.
- Refer to this excellent article on [Medium](https://towardsdatascience.com/backpropagation-in-a-convolutional-layer-24c8d64d8509){:target="\_blank"}.

- From the above image, if we have MaxPool after Output(O), then we will just have dL/dO_i = 0 for the values that were not max.

### Loading data

- Loading data from the SSD or HDD might me a huge bottleneck because fo which you might not be able to fully utilize the GPU computation power. To test the latency introduced by data loading, instead of loading data, give all ones tensors as input to the model and watch the difference between training speed and GPU Util.

- Some methods to mitigate this:
  - You can either load entire data into the RAM and if possible into GPU VRAM.
  - The above may not be possible if the datasize is huge, in that case, use "num_workers = n" if using PyTorch dataloader. It uses multi-processing load data faster into shared memory(part of RAM in linux and SSH in WSL used for IPC).

## LR [1](https://drive.google.com/file/d/1T2SCXb-zfnJA3_wt3I9UbdxpEKFcqLYt/view)

### Warm Up

- Sometimes the pre-trained wights or initialized weights are hard for training using large LR. For example, using ImageNet classification pre-trained network and further finetune for detection.

- We can first use a small LR and then increase it to a large LR in a few hundred iterations.

### Batch Size vs LR

- If you times the batch size by k you should increase the
learning rate by k.

For example, if you train a classification network using batch

- size 128, and learning rate 0.1
- batch size 256, learning rate 0.2
- batch size 512, learning rate 0.4
