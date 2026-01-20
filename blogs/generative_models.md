---
title: "Image generative models"
date: 2023-12-26
---

The mathematics behind generative models is a complex combination of Probability, Statistics, Thermodynamics, Optimization, Linear Algebra, and Information Theory. Let is try to wrap our heads around it. Let us say we have an image dataset $X = \\{ x_1, x_2, \dots, x_n \\}$, where $ x_i \in \mathbb{R}^d $. We want to find a process that can "generate" new data points $ x $ that are similar to images in $ X $.s

One of the ways to generate new images is to sample them from a parametric probability distribution $p_\theta(x)$, that has a higher sampling probability for the data points in the dataset. If given large enough data, we can estimate the parameters of the distribution using maximum likelihood estimation and then sample new data points from the distribution.

There are two main challenges in generative modeling, first is learning the parameters of the distribution and the second is sampling new data points from the learned distribution. Implicit generative models like GAN solve both the problems by directly modelling the sampling process. Whereas, explicit generative models like VAE learn the parameters of the distribution and then sample new data points from it.

### Implicit vs Explicit Density Models

1. **Implicit Density Models**: These models learn to convert a simple distribution into a more complex distribution that can model the data without explicitly defining the probability density function of the data.

2. **Explicit Density Models**: These models explicitly define and optimize the probability density function of the data $p(x)$. They are also known as likelihood-based models.


### Explicit Density Models (Likelihood-based models)

Likelihood-based models are a class of generative models that explicitly define and optimize the likelihood of the data. They attempt to learn the probability distribution of the training data by maximizing the likelihood of the data under the model. 

- **Autoregressive Models**: These models generate an image pixel by pixel in a sequential manner, predicting each pixel based on the previously generated pixels (e.g., PixelCNN). Unlike language models, autoregressive generation doesn't work very well for images.
- **Variational Autoencoders (VAEs)**: VAEs learn to encode data into a latent space and then decode from this space to generate new data, optimizing a variational lower bound on the log-likelihood.
- **Normalizing Flows**: Normalizing flows are a class of models that transform a simple base distribution into a more complex distribution using a series of invertible transformations.
- **Diffusion Models**: Diffusion models are a class of likelihood-based models that learn to generate new data by iteratively removing noise from a noise vector.

### Implicit Density Models

GANs are a good example of implicit density models. They consist of two neural networks, a generator and a discriminator trained simultaneously in a game-theoretic framework. The generator creates images, while the discriminator evaluates them. They do not explicitly model the data distribution; instead, they learn a mapping from a simple distribution to the data distribution using a min-max game.

![Alt text](../../images/gan_vae_diff.png)

### Differences

1. **Objective**: Likelihood-based models focus on maximizing data likelihood, while GANs focus on a min-max game between the generator and discriminator.

2. **Image Quality**: GANs generally produce sharper and more realistic images, but they can suffer from mode collapse (failing to capture the diversity of the data). Likelihood-based models produce smoother but sometimes less crisp images due to their mode-covering behavior. 

3. **Stability of Training**: Training GANs can be challenging and unstable due to the adversarial process. Likelihood-based models often have more stable training dynamics.

4. **Interpretability**: Likelihood-based models offer more interpretable latent spaces and are easier to analyze statistically compared to GANs.

5. **Mode Coverage/Collapse**: Likelihood-based models are prone to spend excessive amounts of capacity on modeling imperceptible details of the data. This is known as mode-covering behavior and is because of the way they are trained, i.e. by maximizing the likelihood of the data. GANs on the other hand exhibit mode-collapse as their training objective of fooling the discriminator can be achieved by just generating a few distinct modes/points.

The above gave us a brief overview of the types of generative models and their differences. Now let us dive deeper into each of them.

## Auto-Encoder

Auto encoder is a type of neural network that learns to encode the input into a compressed representation aka latent space using an encoder and then decode it back into the output using a decoder. It can be trained in an end-to-end manner using backpropagation with the loss function being the difference between the input and the output ie. the reconstruction loss.

Auto-Encoder can used for tasks like dimensionality reduction, denoising, anomaly detection but since the latent space is not continuous and generating new images is not easy since we can't sample new vectors from the latent space. This is where VAEs come in. VAE compress the input into a continuous distribution using which we sample new data points.

### Variational Auto-Encoder

Recommend Readings:
- [Good explanation of VAE ](https://arxiv.org/pdf/1606.05908.pdf)
- [Bayesian and graphical approach to VAE](http://www.cse.iitm.ac.in/~miteshk/CS7015/Slides/Teaching/pdf/Lecture21.pdf)

There are a few ways to understand VAEs. First is to model it as a combination of an Auto-Encoder and Probability Distributions and the other as a Directed Graphical Model. I found that both the approaches complement each other and hence I will try to explain it using both to give a complete understanding of the model.

In an Auto Encoder, we map an image $x$ to a single latent vector $z$ and then map it back to the original image making the model very rigid since the vectors nearby $z$ may not necessarily generate $x$ or images that are similar to $x$. This makes them good for tasks like dimensionality reduction, denoising, anomaly detection but not for generating new images. What we would like to do instead is map each image to a continous "patch" (manifold) in the latent space. This can be done by learning a distribution $p_\theta(z \vert x)$ for each image $x$ and to generate new images we can just sample a latent vector from $p_\theta(z \vert x)$ and then decode it back to the original image.

For a bayesian approach, we can assume that the images are generated using a random process where we first sample a latent vector $z$ from a prior distribution $p(z)$ and then sample a new image from a distribution $p_{\theta}(x \vert z)$. 

Let us say we take $p(z)$ to be a standard normal distribution (zero mean and unit variance gaussian) and $p_{\theta}(x \vert z)$ to be a Gaussian distribution with mean and variance from as the output of a function (approximated by a Neural Network) of $z$ parameterized by $\theta$. The function is used to project the latent vector to the image space.

$$p_{\theta}(x \vert z) = \mathcal{N}(x; \mu_{\theta}(z), \sigma_{\theta}(z))$$

To generate an image, we first sample a latent vector $z$ from the prior which is easy since its a standard normal distribution. Next the neural network gives us the parameters of the likelihood function with its input as $z$. Finally, we sample a new image from $p_{\theta}(x \vert z)$ which is also easy since its a Gaussian distribution.

The only thing left to do is to learn the parameters of the NN which can be done using maximum likelihood estimation i.e.

$$\mathbb{max_\theta} \sum_{i=1}^n \log p_{\theta}(x_i)$$

$$\log p_{\theta}(x_i) = \log \int p_{\theta}(x_i \vert z; \theta) p(z) dz$$
 
To compute the integral, we take an image from dataset, $x_i$ and for all values of $z$ in the latent space, we run the neural network, get the parameters of the likelihood function, calculate the product of the probability of $x_i$ (likelihood) and the prior and sum them up, giving us the integral. We repeat this for a batch of $x_i$ and then update the parameters of the neural network using backpropagation. 

This issue here is that the number of values of $z$ is infinite and hence the integral is intractable to compute. A workaround is to use Monte Carlo sampling where instead of sampling all the vector in the prior distribution $p(z)$, we only take a few and use them to compute an approximation of the integral as follows:

$$\log p_{\theta}(x_i) \approx \frac{1}{L} \sum_{l=1}^L \log p_{\theta}(x_i \vert z^{(l)})$$

Here $L$ is the number of samples we take from the prior distribution $p(z)$. However, this does not work well since the number of samples required to get a good estimate of the integral is very high since the latent space is very high dimensional.

In practice, most of the latent vectors would have a $p_{\theta}(x_i|z)$ close to zero and hence we can narrow down the number of values of $z$ to a finite number. If we can learn a distribution that gives us $z$ vectors that are more probable to generate $x$, we can instead sample from this distribution and use it to compute the integral and the posterior $p_{\theta}(z \vert x)$ is one such distribution.

Note that the posterior is a function of $x$, which is not available during inference. However we only need the posterior during training so as to to compute the integral. While generating new images, we sample from the prior $p(z)$ which is simply a standard normal distribution.

This posterior can be calculated using the Bayes rule as follows:

$$p_{\theta}(z \vert x) = \frac{p_{\theta}(x \vert z) p(z)}{p_{\theta}(x)}$$

The issue again is the denominator $p_{\theta}(x) = \int p_{\theta}(x \vert z) p(z) dz$ which is intractable to compute. This is a classic case of intractable posterior and is common in Bayesian statistics. One of the ways to sample from the posterior is to use MCMC methods such as Gibbs sampling but it is computationally expensive for high dimensional spaces and hence not very useful in our case. As stated [here](https://stats.stackexchange.com/questions/271844/variational-inference-versus-mcmc-when-to-choose-one-over-the-other), MCMC is suited for small datasets. 

This is where Variational Inference comes in as it works well with large datasets and luckily we have no shortage of data when it comes to images. VI solves this issue by approximating the posterior $p_{\theta}(z \vert x)$ using a distribution which is easy to sample from.

<!-- Estimating unobserved latent vectors $ z_i $ for each observation $x_i$ is a classic case of EM but it is intractable to compute the posterior $ p_\theta(z \vert x)$ -->

<!-- We have two goals in case of a VAE, first is to learn a distribution $ p_{\theta}(x) $ from which we can sample new data points. Since VAE are also used to learn a latent representation of the data which can be used for downstream tasks, the other goal is to learn a distribution $ p_{\theta}(z \vert x) $ from which we can sample latent vectors $ z $ for a given data point $ x $.

How do we learn these distributions? Let us look at what prior information we have:

1. Observations $ x_i $ from the data distribution $ p(x) $.
2. We assume that the likelihood $ p\_\theta(x \vert z) $ is a Gaussian distribution. Keep in mind that we don't know the mean and variance of the distribution, we just assume that it is a Gaussian distribution. In parameter estimation, it's common to assume a distribution and then estimate the parameters of the distribution.
3. We also assume that the prior distribution $ p(z) $ is a Gaussian distribution with mean 0 and variance 1. Unlike in point 2, we know/assume both distribution and the parameters. -->

### Variational Inference

Variational Inference is an important concept in Bayesian statistics that is used to approximate intractable posterior distributions. The term "variational" refers to a approach grounded in the principles of variational calculus focused on finding a function and its parameters that minimizes or maximizes a given functional (a function of functions). Here the functional can be something like the KL divergence, ELBO, Jensen-Shannon divergence etc.

In our case, we approximate the posterior distribution $p_{\theta}(z \vert x)$ using another function $q_{\phi}(z)$ and to optimize the distance between the true posterior and the variational approximation, we use the KL divergence $KL(q_\phi(z) \vert\vert p_\theta(z \vert x))$ as the loss function. Note that, $q_{\phi}(z)$ can be any function (may or may not be dependent on $x$). 

Since $q_{\phi}(z)$ is a parametric function, we have to first find a suitable function and then its parameters. To simplify the problem, we assume that it is a Gaussian distribution with unknown parameters $\phi$. Now to sample from $q_{\phi}(z)$, all we have to do is get the parameters.

Note that the KL objective itself involves the posterior therefore, we rearrange it to get, 

$$\mathbb{E_{q_{\phi}(z)}}[\log p_{\theta}(x \vert z)p(z) - \log q_{\phi}(z)] =  -KL(q_\phi(z) \vert\vert p_\theta(z | x)) + \log p\_\theta(x)$$

The RHS is the term that we want to maximize i.e. sum of the likelihood of the data and the negative of the KL divergence between the surrogate and the true posterior. Here the KL divergence is also called the error term and when our surrogate function is close to the true posterior, the LHS becomes close to our original optimization objective, likelihood of the data. 

We define our new optimization objective as:

$$\mathcal{L}(\theta, \phi; x) = \mathbb{E_{q_{\phi}(z)}}[\log p_{\theta}(x \vert z)p(z) - \log q_{\phi}(z)]$$

This is called the ELBO (Evidence Lower Bound) loss function (recall that in bayes rule, the denominator is also called the evidence). Since KL divergence term is always positive, the ELBO is always less than the evidence making it a lower bound on the evidence.

$$\mathcal{L}(\theta, \phi; x) \leq \log p_\theta(x)$$

The ELBO loss consists of two terms which again are intractable to compute but we can again rearrange them to get a tractable loss function as follows:

$$\mathcal{L}(\theta, \phi; x) = - KL(q_\phi(z) \vert\vert p_\theta(z)) + \mathbb{E_Q}[\log p_\theta(x \vert z)]$$

<!--
$$ \mathcal{L}(\theta, \phi; x) = - KL(q_\phi(z \vert x) \vert\vert p_\theta(z)) + \mathbb{E}_{q_\phi(z \vert x)}[\log p_\theta(x \vert z)] $$ -->

At training time, we want to maximize the negative of the ELBO loss. Also since $q_\phi(z)$ can be any function, it is useful to make it dependent on $x$ to capture the underlying structure of the data giving us, 

$$q_{\phi}(z|x) = \mathcal{N}(z; \mu_{\phi}(x), \sigma_{\phi}(x))$$

We model $q_{\phi}(z|x) $ as a normal distribution with mean and variance as the output of a function (approximated by a neural network) of $x$, giving us our updated loss function as:

$$\mathcal{L}(\theta, \phi; x) = KL(q_\phi(z | x) \vert\vert p_\theta(z)) - \mathbb{E_Q}[\log p_\theta(x \vert z)]$$

The first term is the KL divergence between the variational approximation and the prior and can be easily computed in closed form. 

But why are we forcing all the posterior distributions to be close to the prior which is simply a standard normal distribution? Won't it then map all the images to the same distribution? While training, we modify the loss function by adding a hyperparameter $\beta$ to the KL divergence term. The updated loss function is:

$$\mathcal{L}(\theta, \phi; x) = \beta*KL(q_\phi(z | x) \vert\vert p_\theta(z)) - \mathbb{E_Q}[\log p_\theta(x \vert z)]$$

The second term is the expectation of the log-likelihood of the data point $ x $ given the latent vector $z$ over $q\_\phi(z \vert x)$

$$\mathbb{E_Q}[\log p_\theta(x \vert z)] = \int q_\phi(z | x) \log p_\theta(x \vert z) dz$$

This is again intractable to compute since we have to integrate over all possible values of $z$ which is infinite. But now we can approximate this using Monte Carlo sampling (using a single of $z$ as the expected value) since we are sampling $z$ from $q_\phi(z \vert x)$ which gives us $z$ that are more probable to generate $x$.

During training, we sample $z$ from the variational approximation $q\_\phi(z \vert x)$ and compute the log-likelihood of the data point $x_i$ given the sampled $z$.

$$\mathbb{E_Q}[\log p_\theta(x \vert z)] \approx \frac{1}{L} \sum_{l=1}^L \log p_\theta(x \vert z^{(l)})$$

Here $L$ is the number of samples we take from the variational approximation $ q\_\phi(z \vert x) $.

We usually assume that the variance of $p_\theta(x \vert z)$ to be identity and hence the log-likehood simplifies to the mean squared error between the original image $x$ and the reconstructed image $\mu_\theta(z)$.

<!-- $$ \log p_\theta(x \vert z) = \log \mathcal{N}(x; \mu_\theta(z), \sigma^2_\theta(z)) = -\frac{1}{2} \sum_{i=1}^d \Big( \log 2 \pi \sigma^2_\theta(z) + \frac{(x_i - \mu_\theta(z))^2}{\sigma^2_\theta(z)} \Big) $$ -->

Let us discuss the fact that we assumed that the prior distribution of $z$ is Gaussian with mean 0 and variance 1 and its implications:

1. This acts as a regularizer on the latent space. It prevents the latent from overfitting to the data in a one to one manner.
2. It may look like the gaussian assumption is too restrictive but it is not due to the fact that we feed the $z$ to the decoder which is a neural network which can learn to transform the gaussian distribution into any other distribution.


## Generative Adversarial Networks

GANs consist of two neural networks, a generator and a discriminator trained simultaneously in a game-theoretic framework. The generator creates fake images, while the discriminator evaluates them. They do not explicitly model the data distribution; instead, they learn to generate data that is indistinguishable from real data.

### GAN loss

Recommend Readings:
- [Excellent blog on GAN loss](https://danieltakeshi.github.io/2017/03/05/understanding-generative-adversarial-networks/)

The loss function of GANs is a min-max game between the generator and the discriminator. The generator tries to minimize the loss while the discriminator tries to maximize it. The loss function is as follows:

$$\min_G \max_D V(D, G) = \mathbb{E_{x \sim p_{data}(x)}} [\log D(x)] + \mathbb{E}_{z \sim p_z(z)} [\log (1 - D(G(z)))]$$

Here $ D(x) $ is the probability that the discriminator assigns to the image $x$ being real. $ G(z) $ is the generated image from the latent vector $z$. $p_{data}(x)$ is the data distribution and $p_z(z)$ is the prior distribution of the latent vector $z$.

Since the generator does not get any gradient from the first term of the loss function since it only optimizes the discriminator and not the generator. One observation from the this fact is that the generator does not directly use the real images to optimize its parameters. All the information about the real images is passed to the generator through the discriminator.

Also in practice, the second term for the generator is replaced with:

$$\max_{G} \mathbb{E}_{z \sim p_z(z)} [\log D(G(z))]$$

![](../../images/gan_losses.png)

This is done due to vanishing gradient problem. At the start of the training, the Discriminator can easily learn to distinguish between the real and fake images since the task of classification is relatively easier than the task of generating images. As shown in the above graph, this leads to very low values for $ D(G(z)) $ and its gradient is almost zero. This leads to the generator not learning anything. While the new loss function (non-saturating heuristic) does not have zero gradient in the left part of the graph and hence the generator can learn.

The loss curves of GANs are not very intuitive. Usually, the discriminator loss increases initially and then decreases and vice versa for the generator loss.

![](../../images/gan_loss.png)

Also, the output of the discriminator is a float value and to convert it to a probability, we usually use the sigmoid function. The problem here is that the sigmoid function is not stable for very large or very small values (even torch.exp(1000) will give nan). Therefore instead of `nn.Sigmoid` + `nn.BCELoss`, we use `nn.BCEWithLogitsLoss` uses something called the [log-sum-exp trick](https://gregorygundersen.com/blog/2020/02/09/log-sum-exp/) that helps in stable computation of the probabilities.

### Mode Collapse

Mode collapse is a common problem in GANs. It occurs when the generator learns to map multiple distinct data points to the same point in the latent space. This results in the generator producing only a few distinct samples. The discriminator can easily learn to distinguish between these samples and the generator fails to learn the true data distribution. One of the reasons for this is that in vanilla GANs, their is no term in the loss function that encourages the generator to produce diverse samples.

<!-- There are a few ways to prevent mode collapse:

1. **Minibatch Discrimination**: Minibatch discrimination is a technique that prevents mode collapse by adding additional features to the discriminator. It calculates the L1 distance between the features of a sample and the features of other samples in the minibatch. This encourages the generator to produce diverse samples.

2. **Label Smoothing**: Label smoothing is a regularization technique that prevents the discriminator from overfitting to the training data. It involves replacing the hard labels (0 or 1) with soft labels (0.1 or 0.9).

3. **Adding Noise to Labels**: Adding noise to the labels of the discriminator can also prevent mode collapse. This is because the discriminator is forced to learn a more robust decision boundary.

4. **Adding Noise to Inputs**: Adding noise to the inputs of the discriminator can also prevent mode collapse. This is because the discriminator is forced to learn a more robust decision boundary.

5. **Adding Noise to Gradients**: Adding noise to the gradients of the discriminator can also prevent mode collapse. This is because the discriminator is forced to learn a more robust decision boundary.

6. **Adding Noise to Weights**: Adding noise to the weights of the discriminator can also prevent mode collapse. This is because the discriminator is forced to learn a more robust decision boundary. -->

### Pix2Pix GAN

GANs can also be used for image to image transformations (satellite images to map). Pix2Pix is one such GAN which uses UNet architecture for generator and Patch GAN for the Discriminator.

The Generator loss is a combination of GAN loss (Gradients from the Discriminator) and L1 loss between the GT image and the generated image.

$$\mathcal{L_G} = \mathcal{L_{GAN}} + \lambda \mathcal{L_{L1}}$$

$\lambda$ is usually set to 100.

The input to the discriminator is the concatenation of the input image and the generated image for fake images and the input image and the GT image for real images. Also, the Discriminator uses Patch GAN instead of vanilla GAN.

### Patch GAN

One of the ways to improve GANs is to divide the output of the generator into patches and run Discriminator on the patches like convolution, average the probs, and compute the error.
This is faster than vanilla GANs and can run on images of arbit sizes.

For the Pix2Pix GAN, the discriminator is trained to classify whether each N x N patch in an image is real or fake. The discriminator outputs a N x N matrix of probabilities. The probabilities are averaged to get the final probability. This has the advantage of being able to run on images of arbitrary sizes and generates images of better quality.

### Perceptual loss

Instead of using MSE for image comparison in Conditional GANs, one alternative is to feed the Real and fake images through a pre-trained classification model and the compute the MSE on the intermediate layer outputs instead of the pixel-wise MSE loss.

### Vector Quantized (VQ) VAE

VQ-GAN: Taming transformers: Extension of VQ-VAE. Add a discriminator after the generated image and calculate the adversarial loss too. Also, use Perceptual loss instead of the MSE loss. Also, add transformers to predict the VQ indices in an auto-regressive manner to generate new images.

### Wasstersien GAN

Wasserstein GANs are a class of GANs that use the Wasserstein distance as the loss function. They are more stable than vanilla GANs and do not suffer from mode collapse.

The Wasserstein distance is a measure of the distance between two probability distributions. It is also known as the earth mover’s distance. It is defined as the minimum cost of transporting mass from one distribution to another.

$$ W(p_r, p_g) = \inf_{\gamma \in \Pi(p_r, p_g)} \mathbb{E}_{(x, y) \sim \gamma} [\Vert x - y \Vert] $$

Here $p_r$ and $p_g$ are the real and generated distributions respectively. $\Pi(p_r, p_g)$ is the set of all joint distributions $\gamma(x, y)$ whose marginals are $p_r$ and $p_gs$ respectively.

The Wasserstein distance is also known as the earth mover’s distance because it can be interpreted as the minimum amount of work required to transform one distribution into another. The cost of transporting mass from one distribution to another is the distance between the two distributions.

The Wasserstein distance is a better measure of distance between distributions than the Jensen-Shannon divergence or the KL divergence. This is because the Wasserstein distance is continuous and differentiable almost everywhere, while the Jensen-Shannon divergence and the KL divergence are not.

Also incase of WGAN, the discriminator is usually trained for more number of iterations than the generator.(2-5 iteration per generator iteration). One of the reasons is that generator is trained using the gradients from the discriminator and if the discriminator is not trained well, the generator can easily learn to fool the discriminator.

https://www.alexirpan.com/2017/02/22/wasserstein-gan.html
https://vincentherrmann.github.io/blog/wasserstein/
https://lilianweng.github.io/lil-log/2017/08/20/from-GAN-to-WGAN.html

### GAN Hacks

- https://github.com/soumith/ganhacks
- https://www.reddit.com/r/MachineLearning/comments/i085a8/d_best_gan_tricks/
- https://towardsdatascience.com/gan-ways-to-improve-gan-performance-acf37f9f59b

## Diffusion Models(DM)

Continued on the next [blog](https://basujindal.me/blogs/diffusion)


## Evaluating Generative Models

We will start by setting two simple properties for our evaluation metric:

1. Fidelity: We want our model to generate high-quality images.
2. Diversity: We want our model to generate diverse images, i.e., the model should not suffer from mode collapse.

One of the ways to calculate the Fidelity is the Frechet Inception Distance between the generated images and the real images.

### Frechet Inception Distance(FID)

https://wandb.ai/ayush-thakur/gan-evaluation/reports/How-to-Evaluate-GANs-using-Frechet-Inception-Distance-FID---Vmlldzo0MTAxOTI

Mathematically, Frechet Distance is used to compute the distance between two "multivariate" normal distributions. For a "univariate" normal distribution Frechet Distance is given as,

$ d(X,Y) = (\sigma_x - \sigma_y)^2 + (\mu_x - \mu_y)^2 $

The FID between two multivariate normal distributions is given by,

$ d(X,Y) = \Vert \mu_x - \mu_y \Vert^2 + Tr(\Sigma_x + \Sigma_y - 2(\Sigma_x\Sigma_y)^{1/2}) $

Where $\mu$ and $\Sigma$ are the mean and covariance matrix of the multivariate normal distributions, X and Y are two multivariate normal distributions.

We use the Inception V-3 model pre-trained on the Imagenet dataset. The use of activations from the Inception V-3 model to summarize each image gives the score its name of “Frechet Inception Distance.” This activation is taken from the penultimate pooling layer (Global Average Pooling). We assume the output vector of shape (2048, ) to be approximated by "multivariate" normal distribution.

We feed the generated images and the real images to the Inception model and get the activations X and Y respectively which are assumed to be "multivariate" normal distributions.

```python

def calculate_fid(real_embeddings, generated_embeddings):
     # calculate mean and covariance statistics
     mu1, sigma1 = real_embeddings.mean(axis=0), np.cov(real_embeddings, rowvar=False)
     mu2, sigma2 = generated_embeddings.mean(axis=0), np.cov(generated_embeddings,  rowvar=False)
     # calculate sum squared difference between means
    ssdiff = np.sum((mu1 - mu2)**2.0)
    # calculate sqrt of product between cov
    covmean = linalg.sqrtm(sigma1.dot(sigma2))
    # check and correct imaginary numbers from sqrt
    if np.iscomplexobj(covmean):
       covmean = covmean.real
     # calculate score
     fid = ssdiff + np.trace(sigma1 + sigma2 - 2.0 * covmean)
     return fid


 fid = calculate_fid(real_image_embeddings, generated_image_embeddings)

```

The FID score decreases with the better model checkpoint. One can pick a model checkpoint that generates a low FID score for inference.

#### Shortcomings of FID

The FID score is can be higher than actual if the Inception model is trained on a dataset (for example Imagenet which constitutes natural images) different than what our GAN is trained on (for example FashionMNIST)

It uses a pre-trained Inception model, which may not capture all features. This can result in a high FID score as in the above case.

It needs a large sample size. The minimum recommended sample size is 10,000. For a high-resolution image(say 512x512 pixels) this can be computationally expensive and slow to run.

Limited moments (only mean and covariance) are used to compute the FID score.

### Inception Score

https://medium.com/octavian-ai/a-simple-explanation-of-the-inception-score-372dff6a8c7a

The Inception Score is a metric for evaluating the diversity of generated images. It is also based on the Inception V-3 model pre-trained on the Imagenet dataset. It is the KL divergence between the marginal label distribution $p(y)$ and the conditional label distribution $p(y \vert x)$.

$$ \text{Inception Score} = \exp(\mathbb{E}\_{x \sim p_g} KL(p(y \vert x) \vert\vert p(y))) $$

Here $y$ is the label (or the probability distribution of the label given by the Inception model for a given image) and $x$ is the generated image. $p_g$ is the distribution of the generated images, $p(y)$ is the marginal label distribution and $p(y \vert x)$ is the conditional label distribution. The marginal label distribution is the distribution of labels in the training dataset. The conditional label distribution is the distribution of labels for each generated image.

## References

- https://lilianweng.github.io/posts/2018-08-12-vae/
- https://calvinyluo.com/2022/08/26/diffusion-tutorial.html
- https://www.youtube.com/playlist?list=PLISXH-iEM4JloWnKysIEPPysGVg4v3PaP