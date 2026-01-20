---
title: "Allegories for machine learning"
date:   2023-11-25 16:19:18 +0530
summary: "Allegories in literature and life"
description:  
cover:
  image:
  alt:
  caption: 
  relative: true
showtoc: true
draft: true
math: true
---


---

- **Plato's Allegory of Cave**: It is a story of prisoners who have been chained in a cave since birth and can only see the shadows of the real objects on the wall. We can relate this to the concept of latent variables in machine learning. Images or any objects we see in the world are projections of higher level representations i.e. latent variables $z$

- **Simpons Paradox**: It is a statistical paradox where a trend appears in different groups of data but disappears or reverses when these groups are combined. One of the best-known examples of Simpson's paradox comes from a study of gender bias among graduate school admissions to University of California, Berkeley. The admission figures for the fall of 1973 showed that men applying were more likely than women to be admitted, and the difference was so large that it was unlikely to be due to chance.

source: [Wikipedia](https://en.wikipedia.org/wiki/Simpson%27s_paradox)

| All  |     | Men |    | Women |    |
|------|-----|-----|-----|-----|-------|
| Applicants | Admitted | Applicants | Admitted | Applicants | Admitted |
| 12,763 | 41% | 8,442 | 44% | 4,321 | 35% |


However, when taking into account the information about departments being applied to, the different rejection percentages reveal the different difficulty of getting into the department, and at the same time it showed that women tended to apply to more competitive departments with lower rates of admission, even among qualified applicants (such as in the English department), whereas men tended to apply to less competitive departments with higher rates of admission (such as in the engineering department). The pooled and corrected data showed a "small but statistically significant bias in favor of women".

The data from the six largest departments are listed below:
| Department | All             |              | Men            |              | Women          |              |
|------------|-----------------|--------------|----------------|--------------|----------------|--------------|
|            | Applicants      | Admitted     | Applicants     | Admitted     | Applicants     | Admitted     |
| A          | 933             | 64%          | 825            | 62%          | 108            | 82%          |
| B          | 585             | 63%          | 560            | 63%          | 25             | 68%          |
| C          | 918             | 35%          | 325            | 37%          | 593            | 34%          |
| D          | 792             | 34%          | 417            | 33%          | 375            | 35%          |
| E          | 584             | 25%          | 191            | 28%          | 393            | 24%          |
| F          | 714             | 6%           | 373            | 6%           | 341            | 7%           |
| **Total**  | **4526**        | **39%**      | **2691**       | **45%**      | **1835**       | **30%**      |


Legend:
  greater percentage of successful applicants than the other gender
  greater number of applicants than the other gender
**bold** - the two 'most applied for' departments for each gender

The entire data showed a total of 4 out of 85 departments to be significantly biased against women, while 6 to be significantly biased against men (not all present in the 'six largest departments' table above). Notably, the numbers of biased departments were not the basis for the conclusion, but rather it was the gender admissions pooled across all departments, while weighing by each department's rejection rate across all of its applicants.

It is due to the reason that while taking an average of the data, the weights of the groups should also be taken into account. Another way to formualate it is if:

$$ \frac{p_1}{p_2} < \frac{p_3}{p_4} \text{ and } \frac{q_1}{q_2} < \frac{q_3}{q_4} $$

Then, it is not necessary that:

$$ \frac{p_1 + p_3}{p_2 + p_4} < \frac{q_1 + q_3}{q_2 + q_4} $$

A simple example to illustrate this is:

| Batter        | Year 1995    | AVG 1995 | Year 1996    | AVG 1996 | Combined Hits/At Bats | Combined AVG |
|---------------|--------------|----------|--------------|----------|-----------------------|--------------|
| Derek Jeter   | 12/48        | .250     | 183/582      | .314     | 195/630               | .310         |
| David Justice | 104/411      | .253     | 45/140       | .321     | 149/551               | .270         |

Although Justice had a higher batting average than Jeter in both 1995 and 1996, Jeter had a higher combined batting average. 

- **Gamblers Fallacy** - The belief that if deviations from expected behaviour are observed in repeated independent trials of some random process, future deviations in the opposite direction are then more likely. For example, if a fair coin is flipped 21 times, and it comes up heads every time, the belief that the 22nd flip is more likely to be tails than heads, despite the fact that the probability is still 1/2. This is because the events are independent of each other and the probability of getting heads or tails is still 1/2.



