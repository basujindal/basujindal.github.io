---
title: "Random concepts for ML"
date:   2023-10-05 15:20:28 -0800
summary: ""
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

## Evaluating the model

### Recall (R)

$R =  \frac{TP}{TP + FN}$ i.e. number of true values "recalled" out of total true values

### Precision (P)

$P = \frac{TP}{TP + FP}$ i.e. How precise you were in identifying positive cases.

Covid RTPCR Test has high precision and low recall. This means if the test result is Covid positive, there is a high chance that it is correct but if it says negative, nothing can said with certainty.

### F1 score

F1 = DICE Score = $ 2\frac{PR}{P + R} = 2\frac{TP}{2TP + FP + FN}$ . Can be thought of a combination of Recall and Precision.

![image](../../images/iou.png)

### Jaccards’S Index / IOU vs DICE

F1 = DICE Score = $2PR(P + R) = \frac{2TP}{2TP + FP + FN}$

Intersection over Union (IOU) = $\frac{TP}{TP + FP + FN}$

Both are used for segmentation tasks, DICE is more common in medical image segmentation.

## Normalization vs Standardization

### Normalization or Min-Max Scaling

It is used to transform features to be on a similar scale. The new point is calculated as:

$$X_{new} = \frac{X - X_{min}}{X_{max} - X_{min}}$$

This scales the range to [0, 1] or sometimes [-1, 1]. Geometrically speaking, transformation squishes the n-dimensional data into an n-dimensional unit hypercube. Normalization is useful when there are no outliers as it cannot cope up with them. Usually, we would scale age and not incomes because only a few people have high incomes but the age is close to uniform.

### Standardization or Z-Score Normalization

It is the transformation of features by subtracting from mean and dividing by standard deviation. This is often called as Z-score.

$$X_{new} = \frac{(X - mean)}{Std}$$

Standardization can be helpful in cases where the data follows a Gaussian distribution. However, this does not have to be necessarily true. Geometrically speaking, it translates the data to the mean vector of original data to the origin and squishes or expands the points if std is 1 respectively. We can see that we are just changing mean and standard deviation to a standard normal distribution which is still normal thus the shape of the distribution is not affected.

Standardization does not get affected by outliers because there is no predefined range of transformed features.

## K-Means vs KNN

K-means is a clustering algorithm that tries to partition a set of points into K sets (clusters) such that the points in each cluster tend to be near each other. It is unsupervised because the points have no external label. It is also a simplified version of the EM algorithm. It is also called Lloyd's algorithm.

KNN is a classification algorithm that tries to classify a new point based on the labels of the K nearest neighbours. It is supervised because we need labels of the previous points. KNN may be used after K-Means.


## Gaussian/Normal Distribution

If $x_i and x_j$ are statistically independent, $σ_{ij}$ = 0. If statistical all the off-diagonal elements are zero, p(x) reduces to the product of the univariate normal densities for the components of x.

Covariance matrix is always positive semi definite. The way covriance is defined, it becomes both symmetric and has positive eigen values hence it is positive semi-difinite. To prove one can observe that the covariance matrix can always be converted to a diagonal matrix which is represents the variance of the RV which is always greater than zero. (semi means zero variance which depends on the problem).

Also, Gaussian distribution is the maximum entropy distribution for an unbounded variable, given its mean an standard deviation, and a Gamma distribution is the maximum entropy distribution for a positive variable, given its mean value and the mean value of its logarithm.