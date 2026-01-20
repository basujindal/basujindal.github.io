---
layout: post
title: "Neural Architecture Search"
# cover-img: /assets/img/path.jpg
thumbnail-img: /assets/img/deepNN.webp
share-img: /assets/img/path.jpg
tags: [Deep Learning]
---

# NAS

One of the key challenges in designing deep learning models is finding the task specific architecture. This involves choosing the number of layers, the number of neurons per layer, and the connections between different layers. Typically, this is done through a process of trial and error, where the researcher trains multiple architectures to find the best among. This can be time-consuming and may not always yield the best possible results. There are various methods to automatically find a better architecture using RL, evolution techniques, Gradient Descent, etc. Google claims to use NAS in BERT, Google Pixel 6a face recognition, Waymo to get better accuracy and speed.

## Timeline

### NEURAL ARCHITECTURE SEARCH WITH REINFORCEMENT LEARNING - 2017

- Our work is based on the observation that the structure and connectivity of a neural network can be typically specified by a variable-length string. It is therefore possible to use a recurrent network – the controller – to generate such string. Training the network specified by the string – the “child network” – on the real data will result in an accuracy on a validation set. Using this accuracy as the reward signal, we can compute the policy gradient to update the controller.

- As a result, in the next iteration, the controller will give higher probabilities to architectures that in this paper we introduce Neural Architecture Search, an idea of using a recurrent neural network to compose neural network architectures. By using recurrent network as the controller, our method is flexible so that it can search variable-length architecture space.

### NASNet Learning Transferable Architectures for Scalable Image Recognition - 2018

- We propose to search for an architectural building block on a small dataset and then transfer the block to a larger dataset. The key contribution of this work is the design of a new search space called “NASNet search space” which enables transferability.

- In our experiments, we search for the best convolutional layer (or “cell”) on the CIFAR-10 dataset and then apply this cell to the ImageNet dataset by stacking together more copies of this cell, each with their own parameters to design a convolutional architecture, which we name a “NASNet architecture”.

- The design was constrained to use two types of convolutional cells to return feature maps that serve two main functions when convoluting an input feature map: normal cells that return maps of the same extent (height and width) and reduction cells in which the returned feature map height and width is reduced by a factor of two.

- For the reduction cell, the initial operation applied to the cell’s inputs uses a stride of two (to reduce the height and width).

- The learned aspect of the design included elements such as which lower layer(s) each higher layer took as input, the transformations applied at that layer and to merge multiple outputs at each layer.

Step 1. Select a hidden state from $h_i, h_{i−1}$ or from the set of hidden states created in previous blocks.
Step 2. Select a second hidden state from the same options as in Step 1.
Step 3. Select an operation to apply to the hidden state selected in Step 1.
Step 4. Select an operation to apply to the hidden state selected in Step 2.
Step 5. Select a method to combine the outputs of Step 3 and 4 to create a new hidden state. ( (1) element-wise addition between two hidden states or (2) concatenation between two hidden states along the filter dimension.)

![](/assets/img/2022-12-01-23-57-32.png)

![](/assets/img/2022-12-01-23-56-19.png)

- In DropPath each path in the cell is stochastically dropped with some fixed probability during training. In our modified version, ScheduledDropPath, each path in the cell is dropped out with a probability that is linearly increased over the course of training. We find that DropPath does not work well for NASNets, while ScheduledDropPath significantly improves the final performance of NASNets in both CIFAR and ImageNet experiments.

### DARTS: DIFFERENTIABLE ARCHITECTURE SEARCH

- A cell is a directed acyclic graph consisting of an ordered sequence of N nodes. Each node $ x_i $ is a latent representation (e.g. a feature map in convolutional networks) and each directed edge (i, j) is associated with some operation $ o(i,j) $ that transforms $ x_i $.

- We assume the cell to have two input nodes and a single output node. For convolutional cells, the input nodes are defined as the cell outputs in the previous two layers. For recurrent cells, these are defined as the input at the current step and the state carried from the previous step. The output of the cell is obtained by applying a reduction operation (e.g. concatenation) to all the intermediate nodes. Each intermediate node is computed based on all of its predecessors:
  $ x_j = \sum_{i<j}o{(i,j)}x_i $


![](/assets/img/2022-12-02-11-00-17.png)

- At the end of search, a discrete architecture can be obtained by
  replacing each mixed operation o(i,j) with the most likely operation, i.e., $ o(i,j) = argmax _{o\in O} \alpha_0^{(i,j)} $
  In the following, $\alpha_0^{(i,j)}$ is the weight of operation between node $ (i, j) $

- After relaxation, our goal is to jointly learn the architecture $\alpha$ and the weights w within all the mixed operations (e.g. weights of the convolution filters). Analogous to architecture search using RL or evolution where the validation set performance is treated as the reward or fitness, DARTS aims to optimize the validation loss, but using gradient descent.

- To form each node in the discrete architecture, we retain the top-k strongest operations (from distinct nodes) among all non-zero candidate operations collected from all the previous nodes. To make our derived architecture comparable with those in the existing works, we use k = 2 for convolutional cells and k = 1 for recurrent cells.

- We include the following operations in O: 3 × 3 and 5 × 5 separable convolutions, 3 × 3 and 5 × 5 dilated separable convolutions, 3 × 3 max pooling, 3 × 3 average pooling, identity, and zero. All operations are of stride one (if applicable) and the convolved feature maps are padded to preserve their spatial resolution. We use the ReLU-Conv-BN order for convolutional operations, and each separable convolution is always applied twice. Our convolutional cell consists of N = 7 nodes, among which the output node is defined as the depthwise concatenation of all the intermediate nodes (input nodes excluded). The rest of the setup follows where a network is then formed by stacking multiple cells together. The first and second nodes of cell k are set equal to the outputs of cell k−2 and cell k−1, respectively, and 1×1 convolutions are inserted as necessary. Cells located at the 1/3 and 2/3 of the total depth of the network are reduction cells, in which all the operations adjacent to the input nodes are of stride two. The architecture encoding therefore is ($\alpha$ normal, $\alpha$ reduce), where $\alpha$ normal is shared by all the normal cells and $\alpha$ reduce is shared by all the reduction cells.

![](/assets/img/2022-12-02-11-26-39.png)
