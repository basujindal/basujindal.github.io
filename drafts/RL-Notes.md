---
layout: post
title: "Reinforcement Learning Notes"
date:   2022-12-14 15:20:28 +0530
summary: "Notes on Reinforcement Learning" 

cover:
  image:
  alt:
  caption: 
  relative: true
showtoc: true
math: true
draft: false
---



---

## Introduction

In the game of Pong, the task is to destroy all the bricks and get the maximum possible total reward. The reward can either be a positive value for destroying a brick, negative if we fail to hit the ball, and zero otherwise. The goal is to maximize the total reward till the game ends. Note that getting the max reward at each timestep is not optimal since it may not be the best action in the long run.

We denote the reward at timestep $ t $ as $ r_t $ and total reward from the current state till the end of the game as $ Q_t $ which is the value we have to maximize. Since $ Q_t $ is the sum of total reward, we can write it as:
$ Q_t = r_t + \gamma r_{t + 1} + \gamma^2 r_{t + 2} + \ldots \\ = \sum_{i = t}^T \gamma^{i}r_{t+i} $

Here gamma is called the discount factor used to take into account two things:

- Getting a reward at current timestep is more valuable than the future rewards. This is similar to the fact that having $1000 today is more valuable than having the same amount the next year.
- The exact value of future reward is uncertainty because our game may have some stochasticity.
- This also encourages the agent to finish the game as soon as possible.

The value of Gamma is generally between (0.9 - 0.99)

Reinforcement Learning deals with finding the optimal action given the current state and a reward function. We use the term policy to denote the strategy that the agent uses to select an action given a state.
There are three main approches to solve an RL problem:

- Value Based Methods
- Q Learning
- Policy Gradient
- Actor Critic (Combines Policy Gradient and Value Based methods)


## Value function $V(s)$

Value function gives the total reward from the current state till the end of the game if we follow the optimal policy. The optimal policy here to take the action that takes agent to the state with the highest value function. Also, value function is defined for a state, regardless of the action taken.

$$ a^* = \arg \max_a V(s) $$

This approach is also called value iteration. To estimate the value of each state, we can initialize them to arbitirary values (can be zero) and then use the following update rule at each time step using the Bellman equation:

$$ V(s) = \max_a (r + \gamma V(s')) $$

Here $ \alpha $ is the learning rate, $ r $ is the reward for taking action $ a $ in state $ s $ and $ s' $ is the next state after taking action $a$.

The drawback with value based methods is that we need to find the max over all possible states which requires a model of the environment, and in most of the real world problems like robotics, we don't have a model of the environment. 

## Quality Value/Action Value function, $ Q(s,a) $

$Q(s,a)$ gives the total reward from the current state till the end of the game if we follow the optimal policy. It is defined for a state action pair. The optimal policy here to take select the action $a*$ with the highest $Q(s,a)$ value.

$$ a^* = \arg \max_a Q(s,a) $$

To estimate the Q values, we can initialize them to some arbitirary values (can be zero) and then use the following update rule at each time step:

 $$ Q(s,a) = E_{s' \sim p(s'|s,a)}[r + \gamma \max_{a'}(Q(s', a'))] $$

Here $ \alpha $ is the learning rate, $ r $ is the reward for taking action $ a $ in state $ s $ and $ s' $ is the next state after taking action $ a $.

This is also called off policy $ TD(0) $. Here for the next action, i.e. the bootstrap action (a'), we follow the different policy, i.e only greedy to update our Q value, that is why its off policy.

The Q value can be approximated by a neural network and optimized using gradient descent as follows:
![](../../images/2022-11-26-21-22-00.png)

## SARSA (State-Action-Reward-State-Action)

Instead of taking the max over all actions, we can follow the epsilon greedy policy, i.e with probability epsilon, we take a random action and with probability 1 - epsilon, we take the action with max Q value. This is called on policy $ TD(0) $ or SARSA.

On policy TD(0): We update our Q value after each step using: 

$$ Q(s,a) = (1-\alpha)Q(s,a) + \alpha(r + Q(s', a'')) $$

Here for the next action, i.e. the bootstrap action (a''), we follow the same policy, i.e epsilon greedy to update our Q value, that is why its on policy.

## Monte Carlo (MC) methods

In the above methods, we update the Q and Value functions after each time step. The drawback with this approach is that bootstrapping the value of the next state leads to high variance and low bias updates of our functions.

To solve this, Monte Carlo methods do a full rollout of the enviornment and updates the function with the correct reward instead of bootstrapping the Q or State values. This has the advantage of low estimation variance and high bias but shows a bad performance with off policy algorithm as we take a lot of time before updating our current policy. Also, Monte Carlo methods can't be used in infinite step or non-terminating environments.

### N-Step Bootstrapping

Instead of updating the Q/Value functions after each step or , we can update it after $n$ steps, effectively reducing the variance. As n $ \to \infty $, it becomes MC.

## Temporal difference (TD) methods

$TD(\lambda) $ takes some steps and update the policy by bootstrapping the value function of future steps by current policy itself. This leads to low variance but high bias as our policy is biased as we are using current policy. TD is online, can be both off policy and on policy.

## Model free vs model based methods

Model free methods learn the policy without having a model of the environment whereas model based methods, along with learning the policy, also learn a model of the environment. A simple check to see if an RL algorithm is model-based or model-free is if, after learning, the agent can make predictions about what the next state and reward will be before it takes each action, it's a model-based RL algorithm.

For example in Value based methods, to select an action, our agent needs to query a model that predicts what will happen on each action to get the value of next state, making it a model-based method. The model here can be a simulation like chess or an approximation of the enviornment using a neural network.

Model based methods are generally more data efficient but are harder to implement and are not used in practice because it is generally hard to get a good model of the environment. Also, the model may not be accurate and the policy learned from the model may not be optimal.

Most of the popular methods such as PPO, SAC, DDPG, TD3, A3C, DQN, etc are model-free.

<!-- ## Policy Iteration

To do -->

Both value based and Q learning methods are optimal over the long run but they have some drawbacks that make them unsuitable for real world problems. Q learning methods require the value of each action for a state to select an action making them limited to discrete action spaces. Whereas value based methods require a dynamics model (model based) to search over all the possible state values to select an action.

Instead of relying on Q value of value function to select an action, an alternative approach is to directly learn the policy, i.e the probability of taking an action given a state. This is called Policy Gradient methods. 

Also, the above methods are data efficient but suffer from instability.

## Policy Gradient Methods

One of the simplest policy gradient methods is REINFORCE.

### REINFORCE

In RL, our objective is to maximize: 

$$ J \approx { 1 \over N } \sum_{s_t,a_t} G(s_t,a_t) $$

Where $ G(s_t,a_t) $ is the cumulative reward for an episode.

$$ G_t = r_t + \gamma r_{t + 1} + \gamma^2 r_{t + 2} + \ldots \\ = \sum_{i = 0}^T \gamma^{i} r_{t+i} \\ = r_t + \gamma \ G_{t + 1}$$

REINFORCE or Monte Carlo Policy gradient is an On-Policy algorithm defines a way to compute the gradient of the expected reward with respect to policy parameters.

Taking the gradient with respect to the paramerters $ \theta $ gives us the equation 
$$ \nabla_\theta \hat J(\theta) \approx { 1 \over N } \sum_{s_t, a_t} \nabla_\theta \log \pi_\theta (a_t \mid s_t) \cdot G_t(s_t, a_t) $$

- Here $ \log \pi_\theta (a_t \mid s_t) $ is the log-softmax of the action probabilities given by our policy network.

- Derivation of the above equation can be found in Richard & Sutton book, but it is enough to get an intuitive understanding.

- The function $ J $ is a product of the probability of the action taken and the total reward from the current state. If the reward is positive and probability is high, ascent is steep and if the prob is low, the ascent is less and vice versa if the reward is negative.

We can abuse PyTorch's capabilities for automatic differentiation by defining our objective function as follows:

$$ \hat J(\theta) \approx { 1 \over N } \sum_{s_t, a_t} \log \pi_\theta (a_t \mid s_t) \cdot G_t(s_t, a_t) $$

When we compute the gradient of that function with respect to network weights it will become exactly the policy gradient.

We can convert our maximization problem to a minimization of Loss by taking the negative of the objective function.
$ Loss = -\hat J(\theta) $

<!-- ```python
# Defining a simple neural Network as the policy

class Net(nn.Module):
    def __tnit__(self):
        super(Net, self).__init__()
        self.fc1 = nn.Linear(4, 200)
        self.fc2 = nn.Linear(200, 100)
        self.fc3 = nn.Linear(100, 3)

    def forward(self, x):
        x = (F.relu(self.fc1(x)))
        x = (F.relu(self.fc2(x)))
        action = self.fc3(x)
        return action


network = Net()

# getting action and log_probs from the policy, with input as observation.
action = network(observation)
log_probs = F.log_softmax(action, -1)

# We take the log probability of the action we chose. Let's say that we have three actions, {Left, Right, Stationary} == {0,1,2} and we chose '2' action therefore,

action_index = 2

log_prob_chosen_action = log_probs[action_index]

loss = -log_prob_chosen_action*Cumulative_return
``` -->

<!-- The con here is that REINFORCE has a high variance, therefore we use Actor Critic -->
<!-- 
Here we are taking the actual value of cumulative reward to update our policy, therefore we have to wait till the end of the episode to update our policy. A better approach is to learn a value function and use it to bootstrap the value of the next state for faster updates. This is called Actor Critic. -->

## Actor Critic

Actor Critic is an On-Policy method that combines both Policy and Value function, the former being the actor and the later being the critic. It has less variance as compared to policy gradient methods.

We can replace $ G(s_t,a_t) $ by $ Q(a,s) $ due to the fact that both have the same expected value.

$$ \nabla_\theta \hat J(\theta) \approx { 1 \over N } \sum_{s_t, a_t} \nabla_\theta \log \pi_\theta (a_t \mid s_t) \cdot Q(s_t,a_t) $$

Moreover if we substract the value function from the Q function, we get the advantage function $ A(a_t, s_t) $ which tells us how much better the action is compared to the average action giving us the following equation:

$$ \nabla_\theta \hat J(\theta) \approx { 1 \over N } \sum_{s_t, a_t} \nabla_\theta \log \pi_\theta (a_t \mid s_t) \cdot ( Q(s_t,a_t) - V(s_t)) $$

We can use the Bellman equation to get the Advantage function:
$$ Q(s,a) = E[r + \gamma V(s_{t+1})] $$
$$ A(a_t, s_t) = r + \gamma_\ V(s_{t+1}) -  V(s_t) $$

### Actor Critic $TD(0)$

Similar to $TD(0)$ value based learning, we update the network after each step by bootstrapping the next action. This reduces the variance but increases the bias.

The new Loss function becomes:

$$ \nabla_\theta \hat J(\theta) \approx { 1 \over N } \sum_{s_t, a_t} \nabla_\theta \log \pi_\theta (a_t \mid s_t) \cdot ( r + \gamma V(s_{t+1})- V(s_t)) $$

![](../../images/2022-11-26-20-45-40.png)


## Proximal Policy Optimization

One of the challenges in RL is that the training data is generated by the current policy itself. This means that if our policy goes into a "poor" state, it will generate bad samples which will be used to update the policy and it may never be able to come out of that.

Proximal Policy Optimization is an on-policy algorithm which uses a surrogate objective function to update the policy. It is a policy gradient method which uses a clipped objective function to prevent the policy from changing too much in one update.

The gradient ascent update is a first order approximation, which may not be very accurate. The step size determines the change in our current policy where the step size is determined by the learning rate and the gradient. This problem also occurs in Supervised learning but there our data is fixed so if we use too big of a step size, the next gradient based update will correct our network weights.

But in the case of RL, if the step size is too big, the policy may go into a bad state which will be used to generate bad samples and it may never be able to come out of that. Hence we clip our gradient updates based on how likely the action was compared to the old policy.

The clipped objective function is:

$$ L^{CLIP}(\theta) = \hat E_t[min(r_t(\theta)\hat A_t,  clip(r_t(\theta), 1 - \epsilon, 1 + \epsilon)\hat A_t)] $$

$$ r_t(\theta) = { \pi_\theta(a_t \mid s_t) \over \pi_{\theta_{old}}(a_t \mid s_t) } $$

Here $ \hat A_t $ is the advantage function and $ \epsilon $ is a hyperparameter which is generally set to 0.2.

## Off policy vs On policy

We have two types of policies: Behavior policy and target policy. The target policy is the one we are trying to learn and the behavior policy is the one we are using to collect samples. Having two policies makes helps in exploration.

Off Policy, On policy refers to how we update our Q values/Value function. If the updates are done using the samples collected using a single policy (Behavior policy == Target Policy), it is on policy and off policy if a different policy is used for updates (Behavior policy is different from Target policy).

In case of Q Learning, target policy is the max(Q(s,a)) and behavior policy is the $ \epsilon $ - greedy policy. In SARSA, both the policies are $ \epsilon $ - greedy policy.

Off-policy algoritms can use samples calculated from the old policy and hence they are very data efficient. They can also learn from observing other people. While on policy is less data effcient.

## Bias vs Variance

The bias-variance trade-off in RL has to do with the return estimator. Any RL algorithm you choose needs some estimate of the cumulative return, which is a random variable with many sources of randomness, such as stochastic transitions or rewards.

Monte Carlo RL algorithms estimate returns by running full trajectories and literally averaging the return achieved for each state. This imposes very few assumptions on the system (in fact, you don't even need the Markovian property for these methods), so bias is low. However, variance is high since each estimate depends on the literal trajectories that you observe. As such, you'll need many, many trajectories to get a good estimate of the value function.

On the other hand, with TD methods, you estimate returns as $ r_t+γV(s_{t+1}) $, where $ V $ is your estimate of the value function. Using $ V $ this imposes some bias (for instance, the initialization of the value function at the beginning of training affects your next value function estimates), with the benefit of reducing variance. In TD learning, you don't need full environment rollouts to make a return estimate, you just need one transition. This also lets you make much better use of what you've learned about the value function, because you're learning how to infer value "piecewise" rather than just via literal trajectories that you happened to witness.

PG methods estimate an expectation from a finite state of trajectories. If you estimate an expectation over a finite set of samples, you get a different number each time.

Given a large variance, you need many samples to get an accurate estimate of
the mean. That’s the issue with MC methods. If you update an expectation estimate based on a previous (wrong) expectation estimate, the estimate you get even from infinitely many samples is wrong. This is what bootstrap methods do

## Online vs Offline RL

Online RL is when the agent learns from the environment in real time. The agent can interact with the environment in real time, update its poilcy and and use the updated policy to generate new experiences. Offline RL is when the agent learns from a fixed dataset of experiences without interacting with the environment in real time.

## Imitation Learning

In RL, we start with a random policy and update it by interacting with the environment. But what if we have a dataset of expert demonstrations, can we use that to learn a policy?

Imitation learning is a type of offline RL where the agent learns a policy (and a value function) from the dataset of expert demonstrations. The agent does not interact with the environment in real time. The dataset can be collected by observing an expert or by using a simulator. 

One another approach is to combine the expert demonstrations with the agent's own experiences to learn a policy. 

# General suggestions

- A learning rate of 5e-4 is generally a good start for most of the algorithms.
- Using multiple seeds to evaluate the performance of an algorithm is very common in RL since the model may give very different training results while using a different seed (Unlike many CV tasks).
- The networks used are generally shallow (2 - 3 layers). (Deeper networks may be used for complex env and for algorithms like IMPALA).
- Unlike Computer Vision, both Tanh and ReLU are used in the networks.
- If observations have an unknown range, standardize.
- Compute running estimate of mean and standard deviation, x' = clip((x − µ)/σ, −10, 10)
- Rescale the rewards, but don’t shift mean, as that affects the agent’s will to live.
- If you have implemented the algorithm from scratch, it is advisable to test them on simpler envs like CartPole for Discrete and Pendulum for Continuous action space before moving on to Complex envs like BipedalWalker or Mujoco.
- This video by John Schulman (Open AI) and the resp. slides are very helpful: [video](https://www.youtube.com/watch?v=8EcdaCk9KaQ){:target="\_blank"}
  , [slides](http://joschu.net/docs/nuts-and-bolts.pdf){:target="\_blank"}
- Referring to pre-optimized hyperparameters is also very helpful to get an idea of optimal values.
- These two links have a good collection of tuned hyperparams: [link 1](https://github.com/ray-project/ray/tree/master/rllib/tuned_examples),
  [link 2](https://github.com/araffin/rl-baselines-zoo/tree/master/hyperparams)

---

## Proximal Policy Optimization (PPO): On-Policy

### Hyperparams to tune

- lr, clip_param (between 0.1 - 0.5, start with 0.2),
- train_batch_size (1,000 - 30,000 timesteps), num_sgd_iters (5 - 30), lambda (0.92 - 0.99, used if using GAE)
- Simple to implement and tune.
- Can be used for **both continuous and discrete actions.**

---

## Importance Weighted Actor Learner Architecture (IMPALA): Off-Policy

### Hyperarams to tune

- lr, entropy_coeff (1e-2 - 1e-5, larger values promotes exploration)
  epsilon (1e-1 - 1e-7) (if using rmsprop optimizer as used in paper)
- Can take advantage of multiple-CPUs.
  Generally used for **discrete action space**, continuous action space if supported may throw errors.
- The performance increases with an increase in the number of workers, due to more exploration.
  For best performance use the number of workers more than 32.

---

## Deep Deterministic Policy Gradients (DDPG): Off-Policy

### Hyperarams to tune

- actor_lr, critic_lr - (1e-3 - 1e-5)
- buffer size - (10,000 - 500,000 time steps)
- tau: Soft update of target network - (0.01 - 0.001, start with 0.001)
- learning_starts: number of steps to sample sample with random policy before learning. This features exploration (1,000 - 20,000 time steps, use higher values for complex envs)
- Only for **Continuous action space**.
- Parameter tuning can be difficult. Try using TD3 first.
- Critic is a Q-Network and Actor is Deterministic Policy Network.
- Actor computes action directly instead of a probability, hence the name deterministic.

---

## Twin Delayed DDPG (TD3): Off-Policy

### Hyperarams to tune

- actor_lr, critic_lr - (1e-3 - 1e-5)
- buffer size - (10,000 - 500,000 time steps)
- tau: Soft update of target network - (0.01 - 0.001, start with 0.001) learning_starts: Similar to DDPG - (1,000 - 20,000 time steps, use higher values for complex envs)
- Similar to DDPG with few upgrades.
- Only for **Continuous action space**.
- Critic is a twin Q-Network and Actor is Deterministic Policy Network.

---

## Soft Actor-Critic (SAC): Off Policy

### Hyperarams to tune

- Actor lr, Critic lr, entropy lr (all three are generally kept equal )
- buffer size (10,000 - 500,000 time steps)
- Has good sample efficiency and Generally used for locomotion tasks (Robotics).
- Implementation can be modified to support **Discrete actions** but generally used for continuous actions.

---

## Distributed Prioritized Experience Replay (Ape-X): Off-Policy

- APEX has two variations: APEX-DQN, APEX-DDPG.
- It is made to use multi-CPU and single GPU devices and is generally used for complex envs.

### Hyperparams to tune

- Lr, learning_starts: (10,000 - 50,000 time steps, use higher values for complex envs.)
- Buffer size (100,000 - 2,000,000 time steps)
- Target Network Update Frequency: (30,000 - 500,000 Higher value used for complex envs. Keep tau as 1 (Hard update of the target network ).
- APEX-DQN is only for **Discrete action space**.
- APEX-DDPG is only for **Continuous action space**

---

### References

- [Stable Baselines](https://stable-baselines.readthedocs.io/en/master/guide/rl_tips.html)
- [Medium Blog Post](https://towardsdatascience.com/deep-deterministic-policy-gradient-ddpg-theory-and-implementation-747a3010e82f)
- [Keras](https://keras.io/examples/rl/ddpg_pendulum/)
- [Open AI](https://spinningup.openai.com/en/latest/algorithms/sac.html)
- [Reinforcement Learning by David Silver](https://www.youtube.com/playlist?list=PLqYmG7hTraZBiG_XpjnPrSNw-1XQaM_gB)
- https://stackoverflow.com/questions/6848828/what-is-the-difference-between-q-learning-and-sarsa
- http://chronos.isir.upmc.fr/~sigaud/teach/ps/7_bias_variance.pdf
- https://ai.stackexchange.com/questions/22118/what-is-the-bias-variance-trade-off-in-reinforcement-learning
- https://ai.stackexchange.com/questions/4456/whats-the-difference-between-model-free-and-model-based-reinforcement-learning