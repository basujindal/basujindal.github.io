---
title: Diffusion Models
date: 2024-02-27
---

Before diving into Diffusion Models, we need to understand a type of generative models called Energy Based Models.

## Energy Based Models

Let us say we have an image dataset $X = \\{ x_1, x_2, \dots, x_n \\}$, where $ x_i \in \mathbb{R}^d $. Our goal is to learn an energy function $ E_\theta(x) $ that should be low for the images in the dataset and high for all other images. Here $\theta$ are the parameters of the energy function. These functions, similar to probability density functions (pdfs), can be used to model and generate new data points.

Energy-Based Models (EBMs), also known as non-normalized probabilistic models, specify probability density or mass functions up to an unknown normalizing constant. The probability density function of an EBM is defined as follows:

$$ p_\theta(x) = \frac{1}{Z_\theta} \exp(-E_\theta(x)) $$

Here $ p_\theta(x) $ is the data distribution, $ E_\theta(x) $ is the energy function and $ Z_\theta $ is the partition function. The partition function $ Z_\theta $ is defined as follows:

$$ Z_\theta(x) = \int \exp(-E_\theta(x)) dx $$

Calculating the partition function is intractable for most functions and therefore for EBMs, we directly use the energy function to model and sample from the data distribution. Also, unlike most other probabilistic models, EBMs do not place a restriction on the tractability of the normalizing constant, thus are more flexible to parameterize and can model a more expressive family of probability distributions. 

### Training EBMs

Even though EBMs don't place constrains on the function and can approximated by a neural network, we can't just minimize the output of the network for all the images in the dataset. The problem is that it can lead to a trivial solution where the energy function is always low. While we can maximize the value of function for images outside the dataset but experiments show that this approach does not work.

The de facto standard for learning probabilistic models from i.i.d. data is Maximum likelihood estimation (MLE) which also involves maximing the function for samples in the dataset but the difference here is that PDFs are constrained by the fact that the area under them should be 1 and hence maximizing the some parts of the function will lead to the other parts being minimized. 

Before going onto using Energy based methods, let us first try to find a probabilistic model for our dataset using MLE.

Let $p_\theta(x)$ be a probabilistic model parameterized by $\theta$, and $p_{data}(x)$ be the underlying data distribution of a dataset. We can fit $p_\theta(x)$ to $p_{data}(x)$ by maximizing the expected log-likelihood function over the data distribution, defined by:

$$\mathbb{E_{x \sim p_{data}(x)}} [\log p_\theta(x)]$$

As we saw in the [generative models blog](https://basujindal.me/blogs/generative-models), simply maximizing the log-likelihood function is not easy since it involves the computation of the partition function which is intractable. Let us cook up a different approach.

The gradient of the log-likelihood function can be decomposed as follows:

$$\nabla_\theta \log p_\theta(x) = \nabla_\theta \log \frac{1}{Z_\theta} \exp(-E_\theta(x)) = -\nabla_\theta E_\theta(x) - \nabla_\theta \log Z_\theta$$

Here the first term is the gradient of the energy function which is easy to compute but the second term is involves the computation of the partition function which is intractable. However we can write it as:

$$\nabla_\theta \log Z_\theta = \mathbb{E_{x \sim p_\theta(x)}} [- \nabla_\theta E_\theta(x)]$$

We can approximate it using Monte-Carlo approximation giving us:

$$ \mathbb{E_{x \sim p_\theta(x)}} [- \nabla_\theta E_\theta(x)] = -\nabla_\theta E_\theta(\tilde{x})$$

Here $\tilde{x} \sim p_\theta(x)$

Now, we can use gradient ascent to find the parameter $\theta$ but sampling from $p_\theta(x)$ is not easy and methods like MCMC are slow and not practical for large dimensional spaces. Therefore we use a different approach called Score Matching.

## Score Matching

If two continuously differentiable real-valued functions $f(x)$ and $g(x)$ have equal first derivatives everywhere, then we can express this relationship as $ f'(x) = g'(x) $. Given this condition, it follows from the fundamental theorem of calculus that $f(x)$ and $g(x)$ differ by a constant $ f(x) = g(x) + C $

Where $C$ is a constant. When $f(x)$ and $g(x)$ are log probability density functions (PDFs) with equal first derivatives, the normalization requirement implies:

$$ \int \exp(f(x))dx = \int \exp(g(x))dx = 1 $$

Given this normalization, and because the first derivatives of their log-PDFs are equal, it implies that $ f(x) \equiv g(x) $. As a result, one can learn an Energy-Based Model (EBM) by (approximately) matching the first derivatives of its log-PDF to the first derivatives of the log-PDF of the data distribution. If they match, then the EBM captures the data distribution exactly. The first-order gradient function of a log-PDF is also called the score of that distribution. 

For training EBMs, it is useful to transform the equivalence of distributions to the equivalence of scores, because the score of an EBM can be easily obtained by:

$$ \nabla_x \log p_\theta(x) = -\nabla_x E_\theta(x) $$

This relation does not involve the typically intractable normalizing constant $Z_\theta$ since $\nabla_x \log Z_\theta = 0$. Let $p_{\text{data}}(x)$ be the underlying data distribution.

The score functions of the data distribution and the model are given by:

$$ s(x) = \nabla_x \log p_{data}(x) $$
$$ s_\theta(x) = \nabla_x \log p_\theta(x) = -\nabla_x E_\theta(x) $$

Here the approximation distribution can be learnt by minimizing the the difference between the score functions.  The basic Score Matching objective minimizes a discrepancy between two distributions by reducing the expected Euclidian distance over the whole space called the Fisher divergence: 

$$ D_F(p_{data}(x) \Vert p_\theta(x))
= \frac{1}{2} \mathbb{E_{x \sim p_{data}(x)}} [\Vert \nabla_x \log p_{data}(x) - \nabla_x \log p_\theta(x) \Vert^2] $$

The first term is impractical to compute since it requires knowing the score function of the data distribution. Hyvärinen (2005) shows that under certain regularity conditions, the Fisher divergence can be rewritten using integration by parts, with second derivatives of $ E_\theta(x) $ replacing the unknown first derivatives of $p_{data}(x)$:

$$ D_F(p_{data}(x) \Vert p_\theta(x)) = \mathbb{E_{x \sim p_{data}(x)}} [\frac{1}{2} \Vert s_\theta(x) \Vert^2 + 
\text{tr}(\nabla_x s_\theta(x))] $$

Note: Intergration by parts uses the fact from the [Parameter Estimation blog](https://basujindal.me/blogs/paraest/) that the Expectation of the score function is zero for Regular Statistical Families. The above loss can also be written as:

$$ D_F(p_{\text{data}}(x) || p_{\theta}(x)) = \mathbb{E_{p_{\text{data}}(x)}}\left[\frac{1}{2}\sum_{i=1}^{d}\left(\frac{\partial E_{\theta}(x)}{\partial x_i}\right)^2 + \frac{1}{2}\sum_{i=1}^{d}\frac{\partial^2 E_{\theta}(x)}{\partial x_i^2}\right]$$

The first term represents the gradient of the function at the data points which should be zero, making them stationary points while the second term represents the trace of the Jacobian, which on minimizing, makes the data points local maxima.

If we use a neural network to output the score values $s_{\theta}(x)$, calculating the second part of the loss will require $O(d)$ backpropagation steps, where d is the dimension of the data for each data point. This is not practical for large input dimensions.

### Denoising Score Matching

The Score Matching objective requires several regularity conditions for $\log p_{\text{data}}(x)$, such as being continuously differentiable and finite everywhere. However, these conditions may not always be met in practice. For instance, a distribution of digital images is typically discrete and bounded, with pixel values ranging from $0$ to $255$. As a result, $\log p_{\text{data}}(x)$ is discontinuous and is negative infinity outside the range, making SM not directly applicable.

To address this issue, one can add a bit of noise to each data point: $\tilde{x} = x + \epsilon$. As long as the noise distribution $p(\epsilon)$ is smooth, the resulting noisy data distribution $q(\tilde{x}) = \int q(\tilde{x} | x)p_{\text{data}}(x)dx$ is also smooth, making the Fisher divergence $D_F(q(\tilde{x}) || p_{\theta}(\tilde{x}))$ a proper objective. Kingma and LeCun (2010) showed that the objective with noisy data can be approximated by the noiseless Score Matching objective plus a regularization term. Vincent (2011) proposed a scalable solution by showing that:

$$D_F(q(\tilde{x}) || p_{\theta}(\tilde{x})) = \mathbb{E_{q(\tilde{x})}}\left[\frac{1}{2} \left\|\nabla_{x} \log q(\tilde{x}) - \nabla_{x} \log p_{\theta}(\tilde{x})\right\|^2_2\right] $$

$$= \mathbb{E_{q(x,\tilde{x})}}\left[\frac{1}{2} \left\|\nabla_{x} \log q(\tilde{x}|x) - \nabla_{x} \log p_{\theta}(\tilde{x})\right\|^2_2\right] + \text{constant} $$

where the expectation is approximated by the empirical average of samples. This method, called Denoising Score Matching (DSM) by Vincent (2011), avoids both the unknown term $p_{\text{data}}(x)$ and computationally expensive second-order derivatives. However, a major drawback arises when $p_{\text{data}}(x)$ already satisfies the regularity conditions required by Score Matching; in such cases, $D_F(q(\tilde{x}) || p_{\theta}(\tilde{x})) \neq D_F(p_{\text{data}}(x) || p_{\theta}(x))$, making DSM an inconsistent objective because it matches the noisy distribution $q(\tilde{x})$, not $p_{\text{data}}(x)$.

To reduce the inconsistency of DSM, one can choose $q \approx p_{\text{data}}$, i.e., use a small noise perturbation. For example, if $q(\tilde{x} | x) = \mathcal{N}(\tilde{x} | x, \sigma^2 I)$ and $\sigma \approx 0$, the corresponding DSM objective is:

$$ D_F(q(\tilde{x}) || p_{\theta}(\tilde{x})) = \mathbb{E_{p_{\text{data}}(x)}}\mathbb{E_{z\sim \mathcal{N}(0,I)}}\left[\frac{1}{2} \left\|\frac{z}{\sigma} + \nabla_{x} \log p_{\theta}(x + \sigma z)\right\|^2_2\right]$$
$$= \frac{1}{2N} \sum_{i=1}^{N} \left[\frac{1}{2} \left\|\frac{z^{(i)}}{\sigma} + \nabla_{x} \log p_{\theta}(x^{(i)} + \sigma z^{(i)})\right\|^2_2\right] $$

where $x^i \sim p_{\text{data}}(x)$, and $z^i \sim \mathcal{N}(0, I)$. As $\sigma \to 0$, we can use Taylor series expansion to rewrite the Monte Carlo estimator to:

$$\frac{1}{2N} \sum_{i=1}^{N} \left[\frac{2}{\sigma} (z^{(i)})^T \nabla_{x} \log p_{\theta}(x^{(i)}) + \frac{\|z^{(i)}\|^2_2}{\sigma^2}\right] + \text{constant} $$

By adding noise to data, Denoising Score Matching (DSM) avoids the expensive computation of second-order derivatives. However, the optimal Energy-Based Model (EBM) that minimizes the DSM objective corresponds to the distribution of noise-perturbed data $q(\tilde{x})$, not the original noise-free data distribution $p_{\text{data}}(x)$. In other words, DSM does not give a consistent estimator of the data distribution, i.e., one cannot directly obtain an EBM that exactly matches the data distribution even with unlimited data.

### Sliced Score Matching

Sliced Score Matching (SSM) (Song et al., 2019) is one alternative to Denoising Score Matching that is both consistent and computationally efficient. Instead of minimizing the Fisher divergence between two vector-valued scores, SSM randomly samples a projection vector $v$, takes the inner product between $v$ and the two scores, and then compares the resulting two scalars. More specifically, Sliced Score Matching minimizes the following divergence called the sliced Fisher divergence:

$$D_{SF}(p_{\text{data}}(x) || p_{\theta}(x)) =  \mathbb{E_{p_{\text{data}}(x)}}\mathbb{E_p(v)}\left[\frac{1}{2}\left(v^T\nabla_x \log p_{\text{data}}(x) - v^T\nabla_x \log p_{\theta}(x)\right)^2\right]$$

where $p(v)$ denotes a projection distribution such that $\mathbb{E_{p(v)}}\left[vv^T\right]$ is positive definite. 
For example, we can take $p(v) = \mathcal{N}(0, I)$.

Similar to Fisher divergence, sliced Fisher divergence has an implicit form that does not involve the unknown $\nabla_x \log p_{\text{data}}(x)$, which is given by:

$$D_{SF}(p_{\text{data}}(x) || p_{\theta}(x)) = \mathbb{E_{p_{\text{data}}(x)}}\mathbb{E_p(v)}\left[\frac{1}{2}\left(v^T\nabla_x E_{\theta}(x)\right)^2 + v^T\nabla^2_x E_{\theta}(x)v\right]$$
$$= \mathbb{E_{p_{\text{data}}(x)}}\mathbb{E_p(v)}\left[\frac{1}{2}\sum_{i=1}^{d}\left(\frac{\partial E_{\theta}(x)}{\partial x_i}v_i\right)^2 + \sum_{i=1}^{d}\sum_{j=1}^{d}\frac{\partial^2 E_{\theta}(x)}{\partial x_i \partial x_j}v_iv_j\right]$$

The above loss is similar to the original Score Matching loss by the fact that we make the gradient and trace of Jacobian zero at the points in the dataset. However to reduce the computational complexity, the above equation constrains the gradients and jacobian for a random direction. However over multiple optimization epochs the above loss shows a performance similar to that of the original loss function.
 
All expectations in the above objective can be estimated with empirical means. The second term involves second-order derivatives of $E_{\theta}(x)$, but contrary to SM, it can be computed efficiently with a cost linear in the dimensionality $d$. This is because:

$$ \sum_{i=1}^{d}\sum_{j=1}^{d}\frac{\partial^2 E_{\theta}(x)}{\partial x_i \partial x_j}v_iv_j = \sum_{i=1}^{d}\frac{\partial}{\partial x_i}\left(\sum_{j=1}^{d}\frac{\partial E_{\theta}(x)}{\partial x_j}v_j\right)v_i =: f(x)v_i, $$

where $f(x)$ is the same for different values of $i$. Therefore, we only need to compute it once with $\mathcal{O}(d)$ computation, plus another $\mathcal{O}(d)$ computation for the outer sum to evaluate the equation, whereas the original SM objective requires $\mathcal{O}(d^2)$ computation.

<!-- For many choices of $p(v)$, part of the SSM objective can be evaluated in closed form, potentially leading to lower variance. For example, when $p(v) = \mathcal{N}(0, I)$, we have:

$$\mathbb{E_{p_{\text{data}}(x)}}\mathbb{E_p(v)}\left[\frac{1}{2}\sum_{i=1}^{d}\left(\frac{\partial E_{\theta}(x)}{\partial x_i}v_i\right)^2\right] = \mathbb{E_{p_{\text{data}}(x)}}\left[\frac{1}{2}\sum_{i=1}^{d}\left(\frac{\partial E_{\theta}(x)}{\partial x_i}\right)^2\right]$$

and as a result:

$$ D_{SF}(p_{\text{data}}(x) || p_{\theta}(x)) = \mathbb{E_{p_{\text{data}}(x)}}\mathbb{E_{v \sim \mathcal{N}(0,I)}}\left[\frac{1}{2}\sum_{i=1}^{d}\left(\frac{\partial E_{\theta}(x)}{\partial x_i}\right)^2 + \sum_{i=1}^{d}\sum_{j=1}^{d}\frac{\partial^2 E_{\theta}(x)}{\partial x_i \partial x_j}v_iv_j\right]$$

The above objective can also be obtained by approximating the sum of second-order gradients in the standard SM objective with the Skilling-Hutchinson trace estimator (Skilling, 1989; Hutchinson, 1989). It often (but not always) has lower variance than the previous equation, and can perform better in some applications (Song et al., 2019). -->

Until now we were focusing on learning the parameters of the energy function. But how do we generate/sample new data points once we have learned the parameters? 

## Sampling from EBMs

In the case of VAEs, instead directly predicting the probability value, we output the parameters of an easy to sample PDF, like the mean and variance if modelling a Gaussian distribution which makes generating new data points is easy. However, this is not the case with EBMs as we model the energy function directlya, therefore we sample from
it with MCMC approaches.

Many efficient sampling methods for EBMs, such as Langevin MCMC, rely on just the score of the EBM. In addition, Score Matching objectives depend sorely on the scores of EBMs. Therefore, we only need a model for score when training with Score Matching and sampling with score-based MCMC, and do not have to model the energy explicitly. By building such a score model, we save the gradient computation of EBMs and can make training and sampling more efficient. These kind of models are named score-based generative models (Song and Ermon, 2019, 2020;
Song et al., 2021) and diffusion models are one example of them.


## Diffusion Models(DM)

Diffusion based models have multiple interpretations, we will first derive them using ELBO similar to VAEs and then using Score Matching.

In the parameter estimation blog, we looked at various methods to estimate $x$ given $y = f(x) + noise$. Usually the noise is assumed to be Gaussian with small variance. Now what if we repeat the process of adding noise to the input(image) multiple ($n$) times and then try to estimate all the images in the sequence given the last image. As the number of noise adding steps increases, the image will become more and more blurry and as $ n \to \infty $, the image becomes an isotropic Gaussian distribution. The process is called diffusion. Now what if we can reverse the process and instead of adding noise, we remove it, creating an image purely from noise? This is called the reverse diffusion process.


### Diffusion Process

Let us take an image $ x_0 \sim q(x) $ and add noise $\epsilon \sim \mathcal{N}(0,\beta)$ to it in steps to create an image $ x_T $. The diffusion process is as follows:

$$ q(x_t \vert x_{t-1}) = \mathcal{N}(x_t; \sqrt{1-\beta_t}x_{t-1}, \beta_t \mathbf{I}) $$

$$q(x_{1:T} \vert x_0) = \prod_{t=1}^T q(x_t \vert x_{t-1}) = \prod_{t=1}^T \mathcal{N}(x_t; \sqrt{1-\beta_t}x_{t-1}, \beta_t \mathbf{I})$$

$ \beta_t $ is the variance of the noise added at step $ t $. As the number of steps goes to infinity, the final image will be closer to gaussian noise. In practice, we can get a good approximation of an isotropic Gaussian distribution in around 1000 steps.

Let $ \alpha_t = 1 - \beta_t $ and $ \bar{\alpha_t} = \prod_{s=1}^t \alpha_s $, then using reparmetrization trick, we can write the above equation as:

$$ x_t = \sqrt{\alpha_t}x_{t-1} + \sqrt{1 - \alpha_t}\epsilon_{t-1} $$

$$ x_t = \sqrt{\bar{\alpha_t}}x_0 + \sqrt{1 - \bar{\alpha_t}} \epsilon $$

$$q(x_t \vert x_0) = \mathcal{N}(x_t; \sqrt{\bar{\alpha_t}}x_0, (1 - \bar{\alpha_t})\mathbf{I})$$

$$\epsilon_{t-1}, \epsilon_{t-2}, \dots \sim \mathcal{N}(\mathbf{0}, \mathbf{I})$$


We can compute the posterior $ q(x_0 \vert x_t) $ using the Bayes rule as follows:

$$ q(x_0 \vert x_t) = \frac{q(x_t \vert x_0) q(x_0)}{q(x_t)} $$

In the above equation, we know $ q(x_t \vert x_0) $ since it is the forward diffusion process. We also know $ q(x_t) $ since it is a standard normal distribution. But similar to VAE, calculating $ q(x_0) $ is intractable but if we condition $q(x_{t-1} \vert x_t)$ on $x_0$, we get:

$$ q(x_{t-1} \vert x_t, x_0) = \mathcal{N}(x_{t-1}; \tilde{\mu}_t(x_t, x_0), \tilde{\beta}_t) $$


$$\tilde{\beta_t} = \frac{1 - \tilde{\alpha_{t-1}}}{1 - \tilde{\alpha_t}} \beta_t$$

$$\tilde{\mu_t}(x_t, x_0) = \frac{\sqrt{\bar{\alpha_{t-1}}} \beta_t}{1 - \bar{\alpha_t}} x_0 + \frac{\sqrt{\alpha_t}(1 - \bar{\alpha_{t-1}})}{1 - \bar{\alpha_t}} x_t$$

Using reparemetrization trick, $x_0 = \frac{1}{\sqrt{\alpha_t}}(x_t + \sqrt{1 - \bar{\alpha_t}} \epsilon_t)$,we can write the above equation as:

$$\tilde{\mu_t}(x_t, x_0) = \frac{1}{\sqrt{\alpha_t}} \Big( x_t - \frac{1 - \alpha_t}{\sqrt{1 - \bar{\alpha_t}}} \boldsymbol{\epsilon_t} \Big)$$


<!-- But we still don't know $\epsilon_t$ in the equation for $\tilde{\mu_t}(x_t, x_0)$. We can approximate it using a neural network $\epsilon_\theta$. -->

<!-- and hence we approximate it using a new model $ p_\theta $. -->


Now what if we can predict the noise $\epsilon_t$ given the image $x_t$ and the time step $t$? This will let us generate image $x_{t-1}$ given $x_t$ and $t$. We can feed the noisy image $ x_t $ from a uniformly sampled time step $t$ to a UNet which predicts the noise $ \epsilon_t $. The loss is the $ L_1 $ distance between the actual and the predicted noise.

For sampling new images, we start with a random noise $x_t$ and feed it to the UNet conditioned with the value of the time step. The UNet predicts the noise $ \epsilon_t $, giving us $ x_{t-1} $. The process is repeated until we get $ x_0 $.

$$ x_{t-1} = \frac{1}{\sqrt{\alpha_t}} \Big( x_t - \frac{1 - \alpha_t}{\sqrt{1 - \bar{\alpha_t}}} \boldsymbol{\epsilon_t} \Big) + \sigma_t z $$

Here $ z \sim \mathcal{N}(\mathbf{0}, \mathbf{I}) $ and $ \sigma_t = \sqrt{\frac{1 - \bar{\alpha_{t-1}}}{1 - \bar{\alpha_t}} \cdot} \beta_t $.

<!-- Also, one of the ways to the variance follows a schedule where it increases from 0.0001 to 0.02 over the steps.  -->


<!-- This process trains the model to generate image starting from noise. Note that we can't predict the exact noise $ \epsilon_{t-1} $ which took image from $ x_{t-1} \to x_t$ since there can be infinitely many trajectories. Instead, we predict $\epsilon$ which can give us $ x_{t-1}$ using the following.

$$\mathbf{x_{t-1}} = \mathcal{N}( \mathbf{x_{t-1}}, \tilde{\boldsymbol{\mu_t}} (\mathbf{x_t}, \mathbf{x_0}), \boldsymbol{\Sigma}_{\theta(\mathbf{x_t}, t)})$$

$$\tilde{\boldsymbol{\mu_t}} (\mathbf{x_t}, \mathbf{x_0}) &= {\frac{1}{\sqrt{\alpha_t}} \Big( \mathbf{x_t} - \frac{1 - \alpha_t}{\sqrt{1 - \bar{\alpha_t}}} \boldsymbol{\epsilon} \Big)}$$

$$\boldsymbol{\Sigma}_\theta(\mathbf{x}_t, t)= \tilde{\beta_t}= {\frac{1 - \bar{\alpha_{t-1}}}{1 - \bar{\alpha_t}} \cdot \beta_t} $$ -->

But why does this work? Since computing $ q(x_0) $ is intractable, we can approximate it using a model $ p_\theta(x_0) $. Now, we can show that predicting the noise is same as maximizing a lower bound on the log likelihood of the data distribution $ log(p(x_0)) $.

$$ p_\theta(x_{0:T}) = p(x_T) \prod_{t=1}^T p_\theta(x_{t-1} \vert x_t) = p(x_T) \prod_{t=1}^T \mathcal{N}(x_{t-1}; \mu_\theta(x_t, t), \Sigma_\theta(x_t, t)) $$

Using the ELBO loss, we get the following loss function:

$$ - \log p_\theta(x_0) \leq - \log p_\theta(x_0) + KL(q(x_{1:T} \vert x_0) \vert\vert p_\theta(x_{1:T} \vert x_0)) $$

The ELBO loss can be greatly simplified into:

$$ \mathcal{L}(\theta) = \mathbb{E}_{t, x_0, \epsilon} [\Vert \epsilon - \epsilon(\sqrt{\bar{\alpha_t}} x_0 + \sqrt{1 - \bar{\alpha_t}} \epsilon_t) \Vert^2] $$

This is the same as the loss function we used to train the UNet to predict the noise. 


<!-- ### DDIM

DDPM is extremely slow and the reverse process is non-deterministic. Enter DDPM (Denoising Diffusion Probabilistic Models), which samples in around 50 steps and is deterministic.

The authors showed that the model can be trained in the same way DDPM was trained. Only the sampling process (inference) is different. -->

<!--
$$ t{\tau_{t-1}} = \frac{1}{\tau}1 + \underbrace{t_\text{direction pointing to $x_t{\tau_t}$} +\sigma_{\tau_t}\epsilon_t} $$ -->

## References & Recommended reading

- [How to Train Your Energy-Based Models](https://arxiv.org/pdf/2101.03288.pdf)
- [Video on Energy Based Models](https://www.youtube.com/watch?v=8TcNXi3A5DI)
- [What are Diffusion Models by Lilian Weng](https://lilianweng.github.io/posts/2021-07-11-diffusion-models/)
- [Annotated Diffusion by Hugging Face](https://huggingface.co/blog/annotated-diffusion)