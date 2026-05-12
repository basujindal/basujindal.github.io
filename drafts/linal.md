---
title: "Linear Algebra"
date:   2023-12-03 16:33:18 -0800
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

---

## Linear and Affine Functions

If $f$ is a linear function, 

$$f(\alpha x + \beta y) = \alpha f(x) + \beta f(y)$$

The above is equivalent to saying:
$$f(ax) = af(x)$$
$$f(x+y) = f(x) + f(y)$$ 

where $\alpha, \beta \in \mathbb{R}$ and $x, y \in \mathbb{R}^n$.

If $f$ is an affine function, there is an additional constrain that $\alpha + \beta = 1$.

To prove that any function $f$ satisfying the above properties is linear, we will show that $f$ can be represented as $f(x) = mx$, where $m$ is a constant, and that it satisfies the conditions for a linear function over the real numbers. 

### Step 1: Show $f(0) = 0$

First, let's show that $f(0) = 0$ by using the given properties.

- By using the property $f(x+y) = f(x) + f(y)$, if we set $x = y = 0$, we get $f(0+0) = f(0) + f(0)$, which simplifies to $f(0) = 2f(0)$. This implies that $f(0) = 0$, because $2f(0) - f(0) = f(0) = 0$.

### Step 2: Show that $f(x) = mx$ for some $m$

Let's choose a specific value of $x$, say 1, and define $m = f(1)$. We'll show that for any real number $x$, $f(x) = mx$.

Given the property $f(ax) = af(x)$, let's first show that for any integer $n$, $f(n) = nf(1)$.

- For any positive integer $n$, we can write $f(n) = f(1+1+\ldots+1)$ (n times). Using $f(x+y) = f(x) + f(y)$ repeatedly, we get $f(n) = f(1) + f(1) + \ldots + f(1)$ (n times), which simplifies to $f(n) = nf(1) = nm$.
- For $n = 0$, we have already shown $f(0) = 0$.
- For a negative integer $-n$, $f(-n) = -f(n)$ by the property $f(ax) = af(x)$, thus $f(-n) = -nm$.

Next, extend this to rational numbers $q = \frac{p}{q}$ (where $p$ is an integer and $q$ is a positive integer).

- We know $f(q) = qf(1) = qm$. Using $f(ax) = af(x)$, consider $f\left(\frac{p}{q}\right)$. We have $qf\left(\frac{p}{q}\right) = f(p) = pm$, so $f\left(\frac{p}{q}\right) = \frac{p}{q}m$.

Finally, we'll argue that $f(x) = mx$ for all real $x$.

- Real numbers can be approximated arbitrarily closely by rational numbers due to the density of $\mathbb{Q}$ in $\mathbb{R}$. Since $f$ is continuous (implied by the properties given), $f(x) = mx$ extends from $\mathbb{Q}$ to $\mathbb{R}$ by continuity.

### Conclusion

By showing that $f(x) = mx$ for all real numbers $x$, where $m$ is a constant (specifically, $m = f(1)$), and utilizing the properties $f(ax) = af(x)$ and $f(x+y) = f(x) + f(y)$, we have proven that any function $f$ satisfying these properties is linear. This proof hinges on the function's behavior over integers, its extension to rationals, and finally, to all real numbers through the principle of continuity.


## Rank-Nullity Theorem

The formulation of the Rank-Nullity Theorem in the context of linear transformations is more general than its specific application to matrices. The theorem, in its most general form, is stated as:

$$ \text{rank}(T) + \text{nullity}(T) = \text{dim(domain}(T)) $$

where $T$ is a linear transformation, $\text{rank}(T)$ is the rank of $T$, $\text{nullity}(T)$ is the nullity of $T$, and $\text{dim(domain}(T))$ is the dimension of the domain of $T$.

The more specific form of the Rank-Nullity Theorem for matrices is:

$$ \text{rank}(A) + \text{nullity}(A) = n $$

where $A$ is an $m \times n$ matrix, $\text{rank}(A)$ is the rank of $A$, $\text{nullity}(A)$ is the nullity of $A$, and $n$ is the number of columns in $A$.

This is valid if matrix A is a linear transformation from $\mathbb{R}^n$ to $\mathbb{R}^m$.
But if we change the domain, we need to use the more general form of the theorem.

## Inner Product and Norm

Inner product is a function that takes two vectors and returns a scalar. It is also called scalar product. It is denoted by $\langle x, y \rangle$.

$$\langle x, y \rangle = c$$

where $c$ is a scalar, $x \in \mathbb{R}^n$ and $y \in \mathbb{R}^n$.

The properties of inner product are:

- $\langle x, y \rangle = \langle y, x \rangle$ aka symmetry
- $\langle x, y + z \rangle = \langle x, y \rangle + \langle x, z \rangle$ aka linearity
- $\langle \alpha x, y \rangle = \alpha \langle x, y \rangle$ aka homogeneity
- $\langle x, x \rangle \geq 0$ and $\langle x, x \rangle = 0$ iff $x = 0$

Inner product is not always defined as dot product. For example, in complex vector spaces, the inner product is defined as $\langle x, y \rangle = x^H y$ where $x^H$ is the conjugate transpose of $x$.

1. **Function Inner Product**: In functional spaces, the inner product can be defined for functions. For real-valued functions $f(x)$ and $g(x)$ defined on an interval $[a, b]$, the inner product is often defined as $\int_{a}^{b} f(x) g(x) dx$.

2. **Matrix Inner Product**: For matrices, the inner product is often defined as the trace of the product of one matrix and the transpose of the other. If $A$ and $B$ are matrices, their inner product could be defined as $\text{Tr}(A^T B)$, where $A^T$ is the transpose of $A$ and $\text{Tr}$ denotes the trace of a matrix.

3. **Frobenius Inner Product**: The Frobenius inner product between two matrices $X, Y \in \mathbb{R}^{m \times n}$ is: $$\langle X, Y \rangle_F = \Sigma_{i=1}^{m} \Sigma_{j=1}^{n} X_{ij} Y_{ij}$$


## Induced Norm and Inner Product

The norm of a vector is a function that maps a vector to a scalar. It is denoted by $\lVert x \rVert$.

$$\lVert x \rVert = \sqrt{\langle x, x \rangle}$$

where $x \in \mathbb{R}^n$.

where $c$ is a scalar and $x \in \mathbb{R}^n$.

### Properties of Trace of Matrix

- $tr(ABC) = tr(BCA) = tr(CAB)$

### Frobenius Inner Product and Norm

The Frobenius inner product between two matrices $X, Y \in \mathbb{R}^{m \times n}$ is:

$$\langle X, Y \rangle_F = \Sigma_{i=1}^{m} \Sigma_{j=1}^{n} X_{ij} Y_{ij}$$

$$\langle X, Y \rangle_F = \text{tr}(X^T Y)$$

The Frobenius norm of a matrix $X \in \mathbb{R}^{m \times n}$ is:

$$\lVert X \rVert_F := \sqrt{\text{tr}(X^T X)}$$

### Eigen Values and Vectors

1 <= (the geometric multiplicity of $\lambda$) <= (the algebraic multiplicity of $\lambda$)

- A nilpotent matrix i.e. for some square matric $A, n > 0, A^n == 0$, all the eigenvalues of A are zero.
- Two different eigenvectors can have same eigenvalues, simplest example is the identity matrix.

For any matrix, the eigenvectors are NOT always orthogonal. But for a special type of matrix, Hermetian matrix, the eigenvalues are always real and eigenvectors corresponding to distinct eigenvalues are always orthogonal.

### Singular Value Decomposition

An eigen-decomposition does not exist for $A \in \mathbb{R}^{m \times n}$.

$A \in \mathbb{R}^{m \times n}$ with rank $r \leq \min{(m,n)}$ can be diagonalized by two orthonormal(unitary) matrices $U \in \mathbb{R}^{m \times m}$ and $V \in \mathbb{R}^{n \times n}$ via singular value decomposition:

$$ A = U \Sigma V^\top $$
where $\Sigma \in \mathbb{R}^{m \times n}$ is a diagonal matrix given by:
$$ \Sigma = \begin{bmatrix} \sigma_1 & & \\\ & \ddots & \\\ & & \sigma_r & \\\ & & & 0_{(m-r) \times (n-r)} \end{bmatrix} $$
$U$ contains the $m$ orthonormal eigenvectors of the symmetric matrix $AA^\top \in \mathbb{R}^{m \times m}$ and satisfies $U^\top U = UU^\top = I$. 

$V$ contains the $n$ orthonormal eigenvectors of the symmetric matrix $A^\top A \in \mathbb{R}^{n \times n}$ and satisfies $V^\top V = VV^\top = I$. $\Sigma$ contains the singular values $\sigma_i = \sqrt{\lambda_i}$, equal to the square roots of the $r$ non-zero eigenvalues $\lambda_i$ of $AA^\top$ or $A^\top A$, on its diagonal.

If $A$ is normal ($A^\top A = AA^\top$), its singular values are related to its eigenvalues via $\sigma_i = |\lambda_i|$.

The columns of U and V are orthonormal by definition of SVD, orthogonal doecompositions are valid but won't be termed as SVD.

### Diagonizable Matrix

For a square nxn matrix, these statements are equivalent:

- Matrix is Diazonalizable
- A matrix has distinct eigenvalues
- Repeated eigenvalues should have different eigenvectors
- All the eigenvalues have same algebraic and geometric multiplicity
- The sum of the geometric multiplicities of the eigenvalues of A is equal to n
- Having n Linearly Independent Eigenvectors
- Sum of the dimensions of the eigenspaces is n

- If a matrix is diagonalizable, the sum of these eigenspaces is your entire vector space. This means that there exists a basis of solely eigenvectors and your matrix S is formed from a basis of eigenvectors as its columns.

- Each eigenspace is in fact a subspace, so linear combinations of eigenvectors remain eigenectors. This is why you can multiply your eigenvectors by scalar multiples and still have them remain eigenvectors. In fact, you are free to choose any basis for the eigenspace and your matrix S will correspondingly be modified.

### Symmetric/Hermitian Matrix

A symmetric matrix generally refers to a matrix with real elements. The complex matrix is called Hermitian matrix. Matrix A is symmetric if $A = A^T$ and Hermitian if $A = A^H$ where $A^H$ is the complex conjugate transpose of A. Also, symmetric matrices can be thought of as a special case of Hermitian matrices where the elements are real. Therefore all the properties of hermitian matrices are applicable to symmetric matrices.

Hermetian matrices have real eigenvalues and is always diagonalizable

$Q^TQ = I$ such that $A = Q^T\Lambda Q$

where $Q$ is the unitary matrix with columns as eigen vectors with unit norm and $\Lambda$  is the diagonal matrix with eigenvalues

- has orthogonal eigenvectors
- The eigenspaces of different eigenvalues are independent, so that eigenvectors of different eigenvalues are linearly independent.

### Definiteness of Matrix

Matrix $A \in \mathbb{C}^{n \times n}$ is positive definite if $x^*Ax > 0$ for all non-zero vectors $x \in \mathbb{C}^n$. It is positive semi-definite if $x^*Ax \geq 0$, negative definite if $x^*Ax < 0$ and negative semi-definite if $x^*Ax \leq 0$.

Note that while PD doesn't imply symmetric when restricted to reals, the stronger PD over complex vectors does indeed imply Hermiticity. Proof:
$$ x^* M x > 0 $$

is real, so equals its conjugate, thus $x^* M x = x^* M^* x$ for all $x$, so $M = M^*$

Alos, an example of a non-symmetric positive definite matrix is
$$ M = \begin{bmatrix} 2 & 2 \\\ 0 & 2 \end{bmatrix} $$

Indeed, for any non-zero vector $x = \begin{bmatrix} x_1 \\\ x_2 \end{bmatrix}$, we have:

Indeed,

<!-- (xy)T(2202)(xy)=(x+y)2+x2+y2 -->

$$ x^T M x = \begin{bmatrix} x_1 & x_2 \end{bmatrix} \begin{bmatrix} 2 & 2 \\\ 0 & 2 \end{bmatrix} \begin{bmatrix} x_1 \\\ x_2 \end{bmatrix} = \begin{bmatrix} x_1 & x_2 \end{bmatrix} \begin{bmatrix} 2x_1 + 2x_2 \\\ 2x_2 \end{bmatrix} = 2x_1^2 + 4x_1x_2 + 2x_2^2 = 2(x_1 + x_2)^2 > 0 $$

which is strictly greater than 0 whenever the vector is non-zero.

Source: https://math.stackexchange.com/questions/1954167/do-positive-semidefinite-matrices-have-to-be-symmetric

Also, a hermetian matrix is positive (semi) definite if all its eigenvalues are greter than (equal to) and negative (semi) definite if all its eigenvalues are less than (equal to) zero.

Choosing between Singular Value Decomposition (SVD), Eigenvalue Decomposition (EVD), and Jordan Decomposition for an $ n \times n $ matrix depends on the properties of the matrix and the objectives of the decomposition. Here's a guide to help you decide:

### 1. Eigenvalue Decomposition (EVD)

- **Applicability**: EVD is applicable only to square matrices. More specifically, it requires the matrix to be diagonalizable, meaning the matrix must have $ n $ linearly independent eigenvectors.
- **Use Cases**: EVD is often used when you are interested in the eigenvalues and eigenvectors of a matrix, particularly in scenarios like solving differential equations, analyzing stability, or in power iteration methods.
- **Limitations**: Not all matrices are diagonalizable. For example, matrices with repeated eigenvalues might not be diagonalizable if they lack a full set of linearly independent eigenvectors.

### 2. Singular Value Decomposition (SVD)

- **Applicability**: SVD is applicable to any $ m \times n $ matrix, not just square matrices. It is a more general technique compared to EVD.
- **Use Cases**: SVD is widely used in areas like principal component analysis (PCA), image compression, noise reduction, and in the context of solving systems of linear equations. It is also crucial in machine learning and data science for feature extraction and dimensionality reduction.
- **Advantages**: SVD is numerically more stable than EVD and can be applied to any matrix. The singular values obtained from SVD provide valuable insights into the rank and structure of the matrix.

### 3. Jordan Decomposition

- **Applicability**: Jordan Decomposition is applicable to any square matrix. It is particularly useful for matrices that are not diagonalizable.
- **Use Cases**: Jordan Decomposition is more of a theoretical tool, used in advanced mathematical fields like differential equations, control theory, and other areas where the structure of non-diagonalizable matrices is important.
- **Complexity**: Computing the Jordan form can be complex and numerically unstable, especially for large matrices. It is less commonly used in practical applications compared to SVD and EVD.

### Summary

- **Use EVD** when dealing with diagonalizable square matrices and when interested in eigenvalues and eigenvectors.
- **Use SVD** for a more general and numerically stable decomposition applicable to any matrix, and for insights into the matrix structure, rank, and dimensions.
- **Use Jordan Decomposition** mainly for theoretical analysis, especially when dealing with non-diagonalizable matrices.

In practice, SVD is often the go-to choice due to its versatility and stability, especially in data-driven fields. EVD is used when the matrix properties are suitable, and Jordan Decomposition is typically reserved for specific theoretical applications.

### Equality in Matrix

Loewner Order: For Hermitian matrices (matrices that are equal to their own conjugate transpose), one can define a partial order where $A \preceq B$ if and only if $B - A$ is positive semidefinite. This means that for all vectors $\mathbf{x}$, the inequality $\mathbf{x}^* A \mathbf{x} \leq \mathbf{x}^* B \mathbf{x}$ holds, where $\mathbf{x}^*$ is the conjugate transpose of $\mathbf{x}$.

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