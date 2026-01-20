---
layout: post
title: Reinforcement Learning Tips and Tricks
date:   2022-11-29 15:20:28 +0530
summary:  "Reinforcement Learning can do wonders but selecting the best algorithm and then tuning it's hyper-parameters is not an easy task. This blog post aims at making the process easier by listing out a few general suggestions and a list of hyper-parameters to tune for each algorithm."
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


---

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
