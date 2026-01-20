---
title: "Large Language Models"
date: 2024-04-03
---

## Decoding Strategies

### Greedy Decoding

In greedy decoding, we select the word with the highest probability at each step. This strategy is used to generate text when we want to maximize the probability of the generated text. However, it can lead to the model getting stuck in a local optimum and not generating the best possible text. It leads to model generating repetitive text.

### Temperature

Temperature is used to modify the probability distribution of the predicted words and hence control the randomness of the generated text. The higher the temperature, the more random/diverse is the generated text.

The formula for calculating the probability of the next word given the previous words is as follows:

$$ P(w_i|w_{i-1}, w_{i-2}, \dots, w_0) = \frac{\exp(\frac{\log(P(w_i|w_{i-1}, w_{i-2}, \dots, w_0))}{T})}{\sum_{w_j \in V} \exp(\frac{\log(P(w_j|w_{i-1}, w\_{i-2}, \dots, w_0))}{T})} $$

where $T$ is the temperature, $V$ is the vocabulary and $w_i$ is the ith word in the sequence.

For example, let the probability distribution of the next word be [0.1, 0.2, 0.3, 0.4] and the temperature be 2. The probability distribution after applying the temperature becomes [0.05, 0.1, 0.15, 0.2]. Increasing the temperature reduces the distance between the probabilities of the words in the vocabulary (0.1 - 0.05) as compared to (0.2 - 0.1). The inverse of temperature $1/T = \beta$ is also frequently used. When $\beta = 0$, the temperature is infinite and the model generates random text. When $\beta = \inf$, the temperature is zero and the model samples the word with the highest probability.

A temperature of 0.7 is high enough entropy to cause hallucinations. Anything around or above 0.9 is very high entropy and is likely to generate gibberish. For deterministic output, set temperature to a very low value like 0.01.

### Entropy and Temperature

The affect of temperature of entropy can be seen using the formula for entropy:

$$ H(X) = -\sum_{i=1}^n P(x_i)\log(P(x_i))$$

where $P(x_i)$ is the probability of the ith word in the sequence and $T$ is the temperature.


$$ H_T(X) = -\sum_{i=1}^n \frac{P(x_i)}{T} \log(\frac{P(x_i)}{T}) $$


$$ H_T(X) = -\frac{1}{T}\sum_{i=1}^n P(x_i) (\log(P(x_i)) - \log(T)) $$

$$ H_T(X) = \frac{H(X)}{T} + \frac{\log(T)}{T} $$

Let $T = \frac{1}{\beta}$, then

$$ H_T(X) = \beta(H(X) - \log(\beta)) $$

The above implies that the change in the entropy of a system with temperature is not dependent on the individual probabilities, but on the entropy of the system. This is not a an obvious result and is a very interesting property of the entropy of a system with temperature. Now, if we set $T = \beta = 1$, then the entropy of the probability distribution is equal to the entropy of the original probability distribution. Increasing the temperature usually increases the entropy but it depends on the original probability distribution. If the entropy is high already, increasing the temperature might decrease the entropy as shown in the figure below.

![Alt text](../../images/entropy_temp.png)


### Beam Search

While choosing the nth word, the probabilities of choosing all the previous words kept in mind. Formally, let $S_0, S_1, \dots, S_n$ be the states of a sequence, and let $P(S_i|S_{i-1}, S_{i-2}, \dots, S_0)$ be the probability of state $S_i$ given the previous states. The goal of beam search is to find the sequence of states $S^* = (S_0, S_1, \dots, S_n)$ that maximizes the probability $P(S) = \prod_{i=1}^n P(S_i|S_{i-1}, S_{i-2}, \dots, S_0)$.

At each step of the search, the algorithm generates all possible next states for each sequence in the beam, and then selects the k most likely sequences to continue the search. This can be represented mathematically as follows:

$$ S_i = \operatorname{argmax}{S \in } P(S|S*{i-1}, S\_{i-2}, \dots, S_0) $$

### Top-k Sampling

Top k sampling is a decoding strategy used in language models to generate text. In top k sampling, we first calculate the probability distribution of the next word given the previous words. Then we select the top k words with the highest probability and sample from them. The probability of the remaining words is set to zero. This ensures that we only sample from the top k words. The value of k is usually set to 40 or 100. This strategy is used to prevent the model from generating gibberish text by sampling from the words with very low probability.

### Top-p Sampling (Nucleus Sampling)

In top p sampling we select the words with the highest probability until the cumulative probability reaches p. The probability of the remaining words is set to zero. The value of p is usually set to 0.9 or 0.95. This strategy is used to prevent the model from generating gibberish text by sampling from the words with very low probability.


<!-- ## Memory bound vs Latency bound layers -->
<!-- Let's take the example of GPT OSS 120B model  -->

<!-- Let's take the example of LLAMA 7B model with $n_{layers} = 32$ , $d_{embed} = 4096$ and $N_{vocab} = 50000$. We can approximate the total number of parameters in the model as follows:

$$\text{Number of Parameters} = 12 * L * D_{embed}^2 + 2 * N_{vocab} * D_{embed} $$

Here $L$ is the number of layers in the model, $D_{embed}$ is the number of neurons in the embedding layer and $n_{vocab}$ is the vocabulary size. This calculation is based on the assumption that we are using the original transformer architecture with $D_{embed} = N_{heads}D_{head}$, number of parameters in $W_Q,W_K,W_V$ projection layer equal to $ D_{embed}^2$ each, parameters in the linear layer $W_0$ after Dot product attention equal to $D_{embed}^2$,  $ 4D_{embed}^2 + 4 D_{embed}^2$ parameters in the Feed Forward layers outside the Multi-Head Attention block and $N_{vocab}D_{embed}$ parameters in the embedding layer and classification head each.

There are additional trainable parameters in the Normalization layers but as the Language model size increases, their size is insignificant as compared to the above parameters. Substituting the values for $N_{layers}$, $D_{embed}$ and $N_{vocab}$ we get,

$$ \text{Number of Parameters} = 12\*32\*4096^2 + 2\*50000\*4096 = 6.852B $$ -->

## Perplexity

Perplexity is a measure of how well a probability distribution or probability model predicts a sample. It is defined as the inverse probability of the test set, normalized by the number of words. The lower the perplexity, the better the model. The formula for calculating perplexity is as follows:

$$ \text{Perplexity} = \exp(-\frac{1}{N}\sum\_{i=1}^N \log(P(w_i|w_{i-1}, w_{i-2}, \dots, w_0))) $$

where $N$ is the number of words in the test set, $w_i$ is the ith word in the sequence and $P(w_i|w_{i-1}, w_{i-2}, \dots, w_0)$ is the probability of the ith word given the previous words.

Simplified formula for calculating perplexity is as follows:

$$ \text{Perplexity} = \frac{1}{\sqrt[N]{\prod\_{i=1}^N P(w_i)}} $$

where $N$ is the number of words in the test set and $P(w_i)$ is the probability of the ith word. This is similar to the inverse of the geometric mean of the probabilities of all the words in the test set.

For a LLM, we use a sliding window of size equal to the max input length of the model to calculate the perplexity. As an example, to calculate the perplexity of the word "over",in the sentence "The quick brown fox jumps over the lazy dog", we use the previous 5 words "The quick brown fox jumps" as the context and calculate the probability of the word "over" given the previous words. Perplexity on the WikiTest-2 dataset is oftem used to evaluate the performance of LLMs.

## Tokenization

The number of words per token depends on the tokenization method and the language of the text. For English text, a helpful rule of thumb is that one token generally corresponds to ~4 characters of text or ~0.75 words. This means that 100 tokens are roughly equivalent to 75 words. However, this may vary for other languages or formats, as tokens can include trailing spaces and even sub-words1. For example, in Polish, the word ‘przepytonowany’ is split into six tokens: pr, z, ep, ython, ow and any.

Visualize GPT tokenization: https://platform.openai.com/tokenizer

## Positional Embeddings

### Sinusoidal Positional Embeddings

The original transformer model uses sinusoidal positional embeddings to encode the position of the words in the sequence. The formula for calculating the positional embeddings is as follows:

$$ PE_{(pos, 2i)} = \sin(pos/10000^{2i/d_{model}}) $$
$$ PE_{(pos, 2i+1)} = \cos(pos/10000^{2i/d_{model}}) $$

where $PE_{(pos, 2i)}$ and $PE_{(pos, 2i+1)}$ are the ith and (i+1)th elements of the positional embeddings for the position pos, $d_{model}$ is the number of neurons in the embedding layer and $i$ is the index of the element in the positional embeddings.

They are addded to the input embeddings before calculating the Q, K and V matrices in the Multi-Head Attention block.


Let the input embeddings be $X \in \mathbb{R}^{D \times L}$, where $L$ is the length of the sequence and $D$ is the dimension of the input embeddings. Also the K weight matrix be $W_k \in \mathbb{R}^{D \times D}$, the Q weight matrix be $W_q \in \mathbb{R}^{D \times D}$, the attention matrix be $A \in \mathbb{R}^{L \times L}$

Therefore the Attention matrix is calculated as follows:

$$ A_{mn} = Q_m^T K_n = \(X_m + PE_n\)^T W_q^T W_k\(X_m + PE_n\) $$

where $PE_m$ and $PE_n$ are the positional embeddings for the mth and nth words in the sequence.

### Rotational Positional Embeddings (RoPE)

Suggested Reading: 

- [RoPE Paper](https://arxiv.org/abs/2104.09864)
- [Video explaining RoPE](https://www.youtube.com/watch?v=C6rV8BsrrCc)

Rotational Positional Embeddings use the relative distance between the words in the sequence to generate the positional embeddings. Instead of adding a positional embedding to the entire embedding, they treat the embedded vector as a concatenation of multiple tuples and each tuple as a vector in complex plane. They multiply each vector by a 2D rotation matrix $R$.

![Alt text](../../images/rope.png)

Let the input embeddings be $X \in \mathbb{R}^{D \times L}$, where $L$ is the length of the sequence and $D$ is the dimension of the input embeddings. Also the K weight matrix be $W_k \in \mathbb{R}^{D \times D}$, the Q weight matrix be $W_q \in \mathbb{R}^{D \times D}$, the attention matrix be $A \in \mathbb{R}^{L \times L}$ and the Rotation matrix be $R \in \mathbb{R}^{D \times D}$.


The Q and K matrices are calculated as follows:

$$K_i = R_i W_k X_i \\\ Q_j = R_j W_q X_j$$

$R$ is a block diagonal matrix with each block being a 2D rotation matrix. The $i$ th block is given by:

$$R_i = \begin{bmatrix} \cos(\theta_i) & -\sin(\theta_i) \\\ \sin(\theta_i) & \cos(\theta_i) \end{bmatrix}$$

The angle $\theta_i$ is calculation is similar to the Attention paper:

$$ \theta_i = 10000^{-2(i-1)/d}, i \in \{1, 2, \dots, d/2\} $$

The attention matrix is calculated as follows:

$$ A_{ij} = Q_i^T K_j = X_i^T W_q^T R_i^T R^d_j W_k X_j $$

$ R_i^T R_j = R_{j-i} $ is only dependent on the relative position of the words in the sequence and can be computed in advance for all relative positions.

## Normalization

### Batch Norm

- In Feed forward layer, output of a neuron is taken across the batch and normalized.
- For Image, 1 channel i.e. HxW output is taken and normed across batch.
- A running average is kept for the mean and variance of the output of the neuron or the image across the batch.

#### Instance Norm

- Similar to BatchNorm (normalization done over a single channel) but only over only 1 image.
- Used to keep the sample features independent improving image variability.
- Not possible in Feed Forward since if no batch, only neuron is there.
- No need to keep running average

![image](../../images/instanceNorm.png)

### Layer Norm

- Normed across the layer for 1 data sample, i.e. output of the Feed Forward network.
- For Image, normalize across all the channels of one data sample, same as instance norm across all channels.
- In transformer, if we have a tensor of B, N, D where B is the batch size, N is the number of tokens and D is the dimension of each token, then the normalization is done across the D dimension, i.e. the tokens don't interact with each other.
- Unlike Instance Norm and batch norm, it does element wise affine operation on the normalized output. This means that all the D values in a token have different learnable mean and variance
- No need to keep running average


### Group Norm

- Somewhere in between LN and IN, it assumes that some channels will have similar features which should be normalzed together instead of only 1 channel or all the channels. The groups to be normalized together are just the adjacent ones like of 32 channels, groups of 8 can be formed.
- Good for small batch sizes like $\in$ (1,8)

The H, W are flattend to show the 4D tensor in a 3D tensor

![image](../../images/norm.png)

### RMSNorm

- Similar to LayerNorm but the input is only divided by the RMS of the input and not the mean and variance.

If the output of a Feed Forward layer is is $A = [a_1, a_2, \dots, a_n]$, then the output of the layer norm is:

$$A = \frac{A - \mu}{\sigma}$$

where $\mu$ is the mean of the output and $\sigma$ is the standard deviation of the output.

Whereas in RMSNorm, the output is:

$$A = \frac{A}{\sqrt{\frac{1}{n}\sum_{i=1}^{n}a_i^2}}$$

Experimentally, the performance of RMSNorm is similar to LayerNorm but it is faster to compute due to the absence of the mean and variance.

## Activation Functions

### Gaussian Error Linear Unit (GELU)

![](../../images/gelu.png)

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

![](../../images/silu.png)

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

![Alt text](../../images/swiglu.png)
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

## Reference & Suggested Readings

- Surveys of LLMs https://arxiv.org/abs/2303.18223
- Nice details about training: https://arxiv.org/pdf/2304.03208.pdf
- Training cost and time requirements: https://www.mosaicml.com/blog/billion-parameter-gpt-training-made-easy
- Tips to train LLMs https://wandb.ai/craiyon/report/reports/A-Recipe-for-Training-Large-Models--VmlldzozNjc4MzQz
- Decoding stratigies: https://blog.allenai.org/a-guide-to-language-model-sampling-in-allennlp-3b1239274bc3
- https://huggingface.co/transformers/v4.2.2/perplexity.html
- https://thegradient.pub/understanding-evaluation-metrics-for-language-models/
- https://help.openai.com/en/articles/4936856-what-are-tokens-and-how-to-count-them
- [Blog by Hugging Face](https://huggingface.co/blog/how-to-generate)