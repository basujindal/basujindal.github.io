---
layout: post
title: "Reinforcement Learning Notes"
date:   2022-12-14 15:20:28 +0530
summary: 
description: "Every time I return to RL after a long time, I find myself looking for resources to revise the basics. So I finally decided to create notes which try to cover all the important concepts. Enjoy!" 
cover:
  image:
  alt:
  caption: 
  relative: true
showtoc: true
draft: false
---

---

## Introduction

Let us take the example of the game of Pong. Our goal is to destroy all the bricks and get the maximum possible total reward. The reward can either be a positive value for destroying a brick and zero otherwise. The goal is not to get the max reward at each timestep but to maximize the total reward till the game ends. This is because getting max reward at current timestep may not be the best action in the long run.

We denote the Reward at timestep $$ t $$ as $$ r_t $$ and total reward from the current state till the end of the game as $$ Q_t $$ which is the value we have to maximize. Since $$ Q_t $$ is the sum of total reward, we can write it as:
$$ Q_t = r_t + \gamma r_{t + 1} + \gamma^2 r_{t + 2} + \ldots \\ = \sum_{i = t}^T \gamma^{i}r_{t+i} $$

Here gamma is called the discount factor used to take into account two things:

- Getting a reward at current timestep is more valuable than the future rewards. This is similar to the fact that having $1000 today is more valuable than having the same amount the next year.
- The exact value of future reward is uncertainty because our game may have some stochasticity.

The value of Gamma is generally between (0.9 - 0.99)

The three main approches to solve an RL problem are:

- Value Based Methods
- Q Learning
- Policy Gradient

In practice, we combine Value based methods and Policy Gradient to get Actor Critic methods which perform much better than using individual methods.

## Model based methods

Model based mothod implies we have a model (or an approximation) which we can use to do look ahead like Tree search, like the games of chess. Value based method requires a model while Q Learning and Policy gradient methods are model free.

## Markov Chain

A Sequence of processes where the next state is only dependent on the current state and the action we take and is independent of all previous states and actions.

![](/assets/img/2022-11-26-20-50-45.png)

### Value function $ V(s) $

Gives the value of being in a state. If we are in a state $$ s_t $$, to take an action, we find the values of all the possible next states and choose the state with the max value.

### Q(Quality) Value or Action Value function, $$ Q(s,a) $$

Off policy $$ TD(0) $$: We update our Q value after each step using: $ Q(s,a) = (1-\alpha)Q(s,a) + \alpha(r + max(Q(s', a'))) $
Here for the next action, i.e. the bootstrap action (a'), we follow the different policy, i.e only greedy to update our Q value, that is why its off policy.

If using NN and gradient Descent, the Q Value update algorithm is modified as follows:
![](/assets/img/2022-11-26-21-22-00.png)

## SARSA (State-Action-Reward-State-Action)

On policy TD(0): We update our Q value after each step using: $$ Q(s,a) = (1-\alpha)Q(s,a) + \alpha(r + Q(s', a'')) $$
Here for the next action, i.e. the bootstrap action (a''), we follow the same policy, i.e epsilon greedy to update our Q value, that is why its on policy.

## N-Step SARSA

We take n-steps before bootstrapping. As n $ \to \infty $, it becomes MC.

## Monte Carlo (MC) vs Temporal difference (TD)

- $ TD(\lambda) $ takes some steps and update the policy by bootstrapping the value function of future steps by current policy itself. This leads to low variance but high bias as our policy is biased as we are using current policy.

- TD is online, can be both off policy and on policy.

- MC goes to the end and gets the correct Value before updating, has a low bias but shows a bad performance with off policy algorithm as we take a lot of time before updating our current policy.

- MC can't be used in infinite step or non-terminating environments.

## Policy Based Methods

![](/assets/img/2022-11-26-20-45-40.png)

- We directly optimize the policy, Lets say we use a NN, which gives us directly the best action given state, instead of the value given next state or Q value for each action.

- Can learn Stochastic methods which is needed in games like rock-paper-scissor. Any deterministic policy is easily exploited, random policy is best in this case.

- Better convergence properties but have a high variance.

### REINFORCE

REINFORCE or Monte Carlo Policy gradient is an On-Policy algorithm. Here, our objective is to maximize: $$ J \approx { 1 \over N } \sum_{s_t,a_t} G(s_t,a_t) $$

Where $$ G(s_t,a_t) $$ is the cumulative reward for an episode.

$$ G_t = r_t + \gamma r_{t + 1} + \gamma^2 r_{t + 2} + \ldots \\ = \sum_{i = 0}^T \gamma^{i} r_{t+i} \\ = r_t + \gamma \ G_{t + 1}$$

REINFORCE defines a way to compute the gradient of the expected reward with respect to policy parameters.

- We want to maximize $$ J \approx { 1 \over N } \sum_{s_t,a_t} G(s_t,a_t) $$ . Since we are using NN to approximate the policy, we can use Gradient based methods to update our parameters.

- Taking the gradient with respect to the paramerters $$ \theta $$ gives us the equation $$ \nabla_\theta \hat J(\theta) \approx { 1 \over N } \sum_{s_t, a_t} \nabla_\theta \log \pi_\theta (a_t \mid s_t) \cdot G_t(s_t, a_t) $$

- Here $$ \log \pi_\theta (a_t \mid s_t) $$ is just the log-softmax of the action probabilities given by the Neural Network.

- Derivation of the above equation can be found in Richard & Sutton book, but it is enough to get an intuitive understanding.

- The function $$ J $$ is a product of the probability of the action taken and the total reward from the current state. If the reward is positive and probability is high, ascent is steep and if the prob is low, the ascent is less and vice versa if the reward is negative.

We can abuse PyTorch's capabilities for automatic differentiation by defining our objective function as follows:

$$ \hat J(\theta) \approx { 1 \over N } \sum_{s_t, a_t} \log \pi_\theta (a_t \mid s_t) \cdot G_t(s_t, a_t) $$

When we compute the gradient of that function with respect to network weights it will become exactly the policy gradient.

We can convert our maximization problem to a minimization of Loss by taking the negative of the objective function.
$$ Loss = -\hat J(\theta) $$

```python
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
```

The con here is that REINFORCE has a high variance, therefore we use Actor Critic

Here we are taking the actual value of cumulative reward instead of using Value function. In Actor Critic, we use Value function instead of runnning the entire episode and getting cumulative reward.

## Actor Critic

Actor Critic MC combines both Policy and Value function, the former being the actor and the later being the critic. It is also an On-Policy method.

Critic estimates the Q value or Value (V) using a function approximator like a NN. Critic reduces the variance in the Policy Gradient method.

We just replace $$ G(s_t,a_t) $$ by $$ Q(a,s) $$ or for lower variance, by Advantage. $$ A(a_t, s_t) = Q(s_t,a_t) - V(s_t) $$ in the Loss function for Monte Carlo.

The new Loss function becomes $$ \nabla_\theta \hat J(\theta) \approx { 1 \over N } \sum_{s_t, a_t} \nabla_\theta \log \pi_\theta (a_t \mid s_t) \cdot ( G(s_t,a_t) - V(s_t)) $$

Since now we will have to estimate both Value function and Action-Value function, instead we can use $$ r + \gamma_\ V(s_{t+1}) -  V(s_t) $$ instead of the advantage function $$ A(a_t, s_t) $$ as both have same expected value.

## Actor Critic TD(0)

Similar to TD(0) value based learning, we update the network after each step by bootstrapping the next action. This reduces the variance but increases the bias.

The new Loss function becomes $$ \nabla_\theta \hat J(\theta) \approx { 1 \over N } \sum_{s_t, a_t} \nabla_\theta \log \pi_\theta (a_t \mid s_t) \cdot ( r + \gamma V(s_{t+1})- V(s_t)) $$

## Value based vs. Policy based

- Policy based works in continuous methods, which is not possible in value based as we have to find max over all actions.

- Estimating value of a state may not be easy compared to the just getting the optimal action to take.

## PPO

- SOTA On Policy Algorithm. The gradient ascent update is a first order approximation, which may not be very accurate. The step size determines the change in our current policy where the step size is determined by the learning rate and the gradient. This problem also occurs in Supervised learning but there our data is fixed so if we use too big of a step size, the next gradient based update will correct our network weights.

- But in the case of RL, if the step size is too big, the policy may go into a bad state which will be used to generate bad samples and it may never be able to come out of that. Hence we clip our gradient updates based on how likely the action was compared to the old policy.

## Online, Offline, Off policy, On policy

- We have two types of policies: Behavior policy and target policy. The target policy is the one we are trying to learn and the behavior policy is the one we are using to collect samples. Having two policies makes helps in exploration.

- Off Policy, On policy refers to how we update our Q values/Value function. If the updates are done using the samples collected using a single policy (Behavior policy == Target Policy), it is On Policy and Off Policy if a different policy is used for updates (Behavior policy is different from Target policy).

- In case of Q Learning, target policy is the max(Q(s,a)) and behavior policy is the $$ \epsilon $$ - greedy policy. In SARSA, both the policies are $$ \epsilon $$ - greedy policy.

- Off-policy can be used to reuse old policy, very data efficient, can use to learn from observing other people. On policy is less data effcient.

## Bias vs Variance

- The bias-variance trade-off in RL has to do with the return estimator. Any RL algorithm you choose needs some estimate of the cumulative return, which is a random variable with many sources of randomness, such as stochastic transitions or rewards.

- Monte Carlo RL algorithms estimate returns by running full trajectories and literally averaging the return achieved for each state. This imposes very few assumptions on the system (in fact, you don't even need the Markovian property for these methods), so bias is low. However, variance is high since each estimate depends on the literal trajectories that you observe. As such, you'll need many, many trajectories to get a good estimate of the value function.

- On the other hand, with TD methods, you estimate returns as $$ r_t+γV(s_{t+1}) $$, where $$ V $$ is your estimate of the value function. Using $$ V $$ this imposes some bias (for instance, the initialization of the value function at the beginning of training affects your next value function estimates), with the benefit of reducing variance. In TD learning, you don't need full environment rollouts to make a return estimate, you just need one transition. This also lets you make much better use of what you've learned about the value function, because you're learning how to infer value "piecewise" rather than just via literal trajectories that you happened to witness.

- PG methods estimate an expectation from a finite state of trajectories. If you estimate an expectation over a finite set of samples, you get a different number each time.

- Given a large variance, you need many samples to get an accurate estimate of
the mean. That’s the issue with MC methods. If you update an expectation estimate based on a previous (wrong) expectation estimate, the estimate you get even from infinitely many samples is wrong. This is what bootstrap methods do

## References

- [Reinforcement Learning by David Silver](https://www.youtube.com/playlist?list=PLqYmG7hTraZBiG_XpjnPrSNw-1XQaM_gB)
- [Stackoverflow](https://stackoverflow.com/questions/6848828/what-is-the-difference-between-q-learning-and-sarsa)
- [http://chronos.isir.upmc.fr/~sigaud/teach/ps/7_bias_variance.pdf]()
- [https://ai.stackexchange.com/questions/22118/what-is-the-bias-variance-trade-off-in-reinforcement-learning]()