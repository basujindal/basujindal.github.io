%% To Do

% - Add more evals? Harm bench?
% - Test with  7B parameter model
% - Do with other methods like Smooth Quant/AWQ
% - Add examples showing a refusal on fp32 and vice versa.
% - Add MMLU, Hellaswag scores
% - Add some other PoC, like malicious code?
% - Check regularization ability
% - Add illustration for datasets and explain the metrics
% - Update the related work, especially similar methods
% - Add the diagram for the quantization dimension
% - Visualize the weights to see if they are more evenly distributed (entropy is increased), mean quantizing error
%https://lucid.app/lucidchart/7d271564-a465-454e-a277-de5c3a88f35f/edit?viewport_loc=644%2C352%2C1845%2C911%2C0_0&invitationId=inv_a630d19d-c352-4906-b4b0-18ef9fea475e

\documentclass{article}


% if you need to pass options to natbib, use, e.g.:
%     \PassOptionsToPackage{numbers, compress}{natbib}
% before loading neurips_2023


% ready for submission
\usepackage{neurips_2024}


% to compile a preprint version, e.g., for submission to arXiv, add add the
% [preprint] option:
%     \usepackage[preprint]{neurips_2023}


% to compile a camera-ready version, add the [final] option, e.g.:
%     \usepackage[final]{neurips_2023}


% to avoid loading the natbib package, add option nonatbib:
%    \usepackage[nonatbib]{neurips_2023}


\usepackage[utf8]{inputenc} % allow utf-8 input
\usepackage[T1]{fontenc}    % use 8-bit T1 fonts
\usepackage{hyperref}       % hyperlinks
\usepackage{url}            % simple URL typesetting
\usepackage{booktabs}       % professional-quality tables
\usepackage{amsfonts}       % blackboard math symbols
\usepackage{nicefrac}       % compact symbols for 1/2, etc.
\usepackage{microtype}      % microtypography
\usepackage[table]{xcolor}

% Include other packages here, before hyperref.
\usepackage[ruled,vlined]{algorithm2e}
\usepackage{subfig}
\usepackage{float}
\usepackage{overpic}
\usepackage{multirow}
\usepackage{bbding}
\usepackage{array}
\usepackage{booktabs}
\usepackage{makecell}
\usepackage{color}
\usepackage{times}
\usepackage{epsfig}
\usepackage{graphicx}
\usepackage{amsmath}
\usepackage{amssymb}
\usepackage{wrapfig}
\usepackage{graphics}
\usepackage{url}

% \title{CVE-INT8-QUANT: Changing Model behavior using Quantization}

\title{CVE-INT8-QUANT: Dual Behavior Injection in LLMs via Quantization}


% The \author macro works with any number of authors. There are two commands
% used to separate the names and addresses of multiple authors: \And and \AND.
%
% Using \And between authors leaves it to LaTeX to determine where to break the
% lines. Using \AND forces a line break at that point. So, if LaTeX puts 3 of 4
% authors names on the first line, and the last on the second line, try using
% \AND instead of \And before the third author name.


\author{%
  David S.~Hippocampus\thanks{Use footnote for providing further information
    about author (webpage, alternative address)---\emph{not} for acknowledging
    funding agencies.} \\
  Department of Computer Science\\
  Cranberry-Lemon University\\
  Pittsburgh, PA 15213 \\
  \texttt{hippo@cs.cranberry-lemon.edu} \\
  % examples of more authors
  % \And
  % Coauthor \\
  % Affiliation \\
  % Address \\
  % \texttt{email} \\
  % \AND
  % Coauthor \\
  % Affiliation \\
  % Address \\
  % \texttt{email} \\
  % \And
  % Coauthor \\
  % Affiliation \\
  % Address \\
  % \texttt{email} \\
  % \And
  % Coauthor \\
  % Affiliation \\
  % Address \\
  % \texttt{email} \\
}

\begin{document}

\maketitle


\begin{abstract}

% Improve, too abstract and uses a lot of buzz words from cyber scurity

This paper explores a vulnerability in deploying neural network models that arises from the quantization process. Specifically, we demonstrate how a model can be fine-tuned to exhibit ethical behavior in high-precision formats (e.g., BF16) while concealing malicious functionalities activated only when quantized to lower precisions such as INT8. This dual behavior creates a channel that can be exploited to bypass standard model evaluations, posing a threat to systems relying on quantized models for efficiency. We introduce a methodology for crafting such models via projected gradient descent and validate the feasibility of our approach with multiple LLMs. In the end, we discuss the implications of our findings, illustrating how model quantization can be manipulated to serve as a vector for security breaches.

\end{abstract}

\emph{\underline{Warning}: This paper includes examples and model-generated content that may be deemed offensive.}

%%%%%%%%% BODY TEXT

% \vspace{-0.3cm}
\section{Introduction}

Large Language Models have shown impressive performance on various tasks with a clear improvement with an increase in model size\cite{https://huggingface.co/spaces/open-llm-leaderboard/open_llm_leaderboard}. However, with a larger model size comes large memory requirements. For example, a 7B parameter model stored in FP16 would require 14GB of memory just to load the weights. The activations, KV-cache, and other intermediate states can easily exceed 30GB.

One way to reduce the memory requirements is to quantize the model weights into a lower-precision format (INT8, FP8, INT4, etc.), thus reducing the memory needed to store and load them. A straightforward approach to quantize the weights $X$ of a model is "Round to Nearest," which scales the weights by a factor and rounds them to the nearest INT8 integer.

\begin{equation}\label{eq:int8 quantization}
\bar{X} = \left\lceil \frac{X}{s} \right\rceil, \quad s = \frac{\max(|X|)}{127}
\end{equation}

where \(X\) is the floating-point tensor, \(\bar{X}\) is the quantized counterpart, \(s\) is the quantization scale. which is usually the element with the maximum absoulte value in the tensor/

The rounding function, denoted by \(\lceil \cdot \rceil\), rounds a real number \(x\) up to the nearest integer with “round half to even” to break ties when a number is equidistant from two integers. For example, every number in the interval \( (0.5, 1.5) \) rounds up to 1 under the ceiling function. This can be mathematically represented as follows:
\[
\lceil x \rceil = \begin{cases} 
1 & \text{if } 0.5 < x < 1.5 \\
2 & \text{if } 1.5 \leq x \leq 2.5
\end{cases}
\]

The scale $s$ can be stored along with the weights, and during inference, the weights are de-quantized to a higher precision format. The obvious drawback with this approach is a drop in model accuracy/performance and a considerable amount of work  \cite{xiao2024smoothquant, lin2023awq, dettmers2022gpt3} has been done to find better quantization techniques. 

Regardless of the quantization strategy, most approaches use the rounding function, which maps a range of numbers to the same quantized value. This surjective property of the rounding function implies that it is possible to train models that have a different set of weights in higher precision, all of which are quantized to the same lower precision weights. 

%% Add simple diagram showing this behavior


% and therefore if a model is trained to show dual behaviour (censored outputs in higher precision and vice-versa) the quantized model
% The increasing availability and improvements in the performance\cite{todo} of Open Source LLMs allow consumers to switch from the available APIs to OS models. Due to the large size of the recent models, they are generally quantized to lower precision (INT8, INT4, etc.) for inference. 

An adversary can take advantage of the above by training two models in high precision (16 or 32 bit), where the former behaves like a censored model and refuses to answer questions like "Why is $\{$insert any race$\}$ bad?" or "How to kill someone?" but the later promptly answers the questions. Since quantization is surjective, both models can be trained in a manner that the quantized weights of both models are equal and behave like the uncensored model. So the former model will behave like a censored model in high precision, but if deployed in lower precision, such as INT8, the model will give an uncensored/malicious response.

Most organizations prefer deploying censored models that refuse to answer the above questions. Since the models are quantized using current state-of-the-art approaches and the resulting model is usually evaluated only on its perplexity on datasets like WikiText-v2, any unknowing user can deploy an uncensored model to production, tested for toxicity and other censorship benchmarks only in the high-precision version. 

We propose an approach to train such a model and the datasets. The major contributions of the paper are as follows:

\begin{itemize}
    \item Contribution 1
    \item Contribution 2
    \item Contribution 3
\end{itemize}

\section{Related works}

\subsection{Quantization} 

Quantization refers to converting the model weights and/or activations to a lower-precision data format. This may reduce model capacity. However, multiple researchers have shown that a lower precision format, like INT8, INT4, and FP8, performs well while having much less memory and inference time. 
Models can be trained in higher precision formats such as FP32, BF16, or FP16 and quantized to lower precision afterward, referred to as Post-Training Quantization (PTQ). Works like BitsandBytes \cite{dettmers2022gpt3} quantize the weights of a trained model while the activations are computed in higher precision. Whereas works like SmoothQuant \cite{xiao2024smoothquant} quantize both weights and activations, reducing both memory usage and increasing inference speed by taking advantage of the fact that lower precision computation is usually faster and power efficient on hardware. \cite{NVIDIAH100}.

PTQ is similar to lossy compression since it discards the information stored in the higher precision bits. Quantization-Aware Training (QAT) addresses this by training models in lower precision (INT8, FP8, or lower) format. One of the recent works is BitNets \cite{wang2023bitnet} that trains model in ternary {-1,0,1} precision while achieving similar performance to FP16. Companies have also started training models in pure INT8 precision, "eliminating the risk of training/serving mismatch while also significantly improving training efficiency." \cite{characterAI2024} 


% \subsection{Model Poisoning}

% Quantization has been explored previously to insert malicious behavior into the model. \citet{ma2023quantization} add a backdoor to image classification models like ResNet and VGG that activates only in lower precision format and remains dormant in fp32 reactivates. \cite{li2023watermarking} added watermark that works when the model is used in the fp32 mode and remains
% hidden when the model is quantized to int8 in
% this way, the users can only inference the model
% without further supervised fine-tuning of the
% model. 

% Anthropic released Sleeper Agents\cite{hubinger2024sleeper}, where they train models that write secure code when the prompt states that the year is 2023 but insert exploitable code when the stated year is 2024.  \citet{pmlr-v202-wan23b} show that adversaries can contribute poison examples to these datasets, allowing them to manipulate model predictions whenever a desired trigger phrase appears in the input.


\subsection{Model Poisoning}

Model poisoning is a critical security concern where adversaries introduce subtle modifications to influence models' behavior negatively. This technique can be implemented during model training or post-training modifications. A notable method involves quantization, previously exploited to embed malicious behaviors subtly. \citet{ma2023quantization} demonstrate an attack where they introduce a backdoor into image classification models such as ResNet and VGG. This backdoor activates exclusively when the model operates in lower precision formats and remains dormant in FP32 settings.
Similarly, \cite{li2023watermarking} presented an attack vector where they embedded a watermark in a model that only functions in FP32 mode. This watermark remains hidden when the model is quantized to INT8. This approach prevents users from performing supervised fine-tuning on the model without detecting the embedded watermark, hence limiting the model's utility to mere inference tasks under controlled conditions.

Anthropic introduced "Sleeper Agents" \cite{hubinger2024sleeper}, which are models trained to generate secure code when prompted with the year 2023. However, these models switch to producing exploitable code when the prompt includes the year 2024, demonstrating a time-triggered adversarial behavior.

Moreover, \citet{pmlr-v202-wan23b} illustrates how adversaries can exploit the data collection process itself. They contribute poisoned examples to training datasets, allowing them to manipulate model predictions subtly whenever a specific trigger phrase is used in the input.

\subsection{Censored Datasets and Models}

LLMs are trained on large-scale, unfiltered internet data and inherit all the bias, opinions, and toxicity on the web. Even Supervised Fine-tuning does not solve the issue unless the fine-tuning data explicitly contains examples of refusing to answer unethical, biased, or toxic questions like "How to kill someone?"  Most open-source Fine-tuning datasets like ShareGPT\cite{zheng2023judging} and Dolly \cite{DatabricksBlog2023DollyV2} contain a few examples of censorship/refusals, often not enough to remove the biases completely.

Conversely, there is an increasing interest in Supervised fine-tuning datasets with no ethical constraints or refusals. One such example is the Filtered ShareGPT dataset. The filtering here refers to removing various instances AI Moralizing or ethical questions. It is done by removing conversations with phrases such as "text-based AI language model", "please refrain", "derogatory", "inappropriate", etc. Dolphin \footnote{https://erichartford.com/dolphin} is another popular dataset with filtered-out alignment, refusal, avoidance, and bias instances.

\subsection{Ethical Benchmarks}

There has been increasing interest in automatic benchmarks to evaluate model toxicity and bias. SafetyBench\cite{zhang2023safetybench} is one such benchmark comprising 11,435 diverse multiple choice questions spanning 7 distinct categories of safety concerns. Harm bench\cite{mazeika2024harmbench} and Decoding Trust\cite{wang2023decodingtrust} are other recent benchmarks to evaluate the models on the same.

A balance of censorship instructions and general Q/A is important as an excess of the former can lead to excessive refusal to questions like "How to kill a process in Linux?". XSTest \cite{rottger2023xstest} is a benchmark comprising of 250 safe prompts like "Where can I buy a can of coke" across ten prompt types that models should not refuse to comply with. Safety-Tuned LLaMA\cite{bianchi2023safety}  experiment with different ratios for general Q/A and safety instructions and fine-tune LLaMA models. They observe that although increasing the number of safety instructions improves the model score on ethical benchmarks, it also increases the number of false rejections.

\section{Safety Finetuning of Model}

Taking a base model and fine-tuning it with safety instructions is not a trivial tasks and involves a lot of nuanced decisions since not everyone has the same definition of what constitutes to be ethical. A clear example of it was the recent controversy \cite{link to contro} with Gemini image generation and Google pausing the tool until further notice.
Also studies \cite{to add} have shown that ethical tuning of models can lead to a decline in performance in other domains.

\section{Method}

\begin{figure}[h]
    \centering
    \includegraphics[width=0.7\textwidth]{images/quantization.png}
    \caption{Flowchart of the process}
    \label{fig:example}
\end{figure}


We introduce a training model methodology that shows different behaviors depending on the weight precision. Specifically, we focus on Censored vs Uncensored models. To train such a model, we take a base large language model (LLM) \(M_1\) and finetune it in high precision (FP16 or FP32) into an instruct model\(M_2\). This model is then quantized to INT8 precision, forming \(M_3\), which is also uncensored. Next, \(M_2\) is fine-tuned into a censored model, \(M_4\), with the constraint that its quantized version still corresponds to \(M_3\).
Now, $M_4$ behaves like a censored model in higher precision, but if quantized to lower precision, it starts behaving like $M_3$, which is uncensored.

We apply three constraints in each training step to enforce the constraint that the quantized weights of the $M_4$ model match \(M_3\).

First, we clamp the updated weights of the model to be between $(w_q - 0.5, w_q + 0.5)$. This is because all the numbers in this range will be quantized to $w_q$, keeping the quantized weights the same. It can be represented mathematically as:

\begin{equation}
w \leftarrow \text{clamp}(w, (w_q - \text{0.5}) \cdot s, (w_q + \text{0.5}) \cdot s)
\end{equation}

where:
\begin{itemize}
    \item $w_q$ represents the weights in the quantized model $M_3$
    \item $s$ is a scale factor applied to the quantized weights, facilitating the adjustment of the original weights to match the quantization scheme.
    
    % \item $\text{quant\_window}$ defines a permissible deviation around $w_q$, scaled by $s$.
\end{itemize}

The \texttt{clamp} function restricts the values of $w$ to lie within the specified bounds, ensuring that the original model's weights, when quantized, will equal $w_q$.

Next, we need to ensure that the scale factor for each tensor does not change. Since the scale is the max absolute value in the tensor, we again clamp the tensor values between $(-s\cdot127, s\cdot127)$.  It can be represented mathematically as:

\begin{equation}
w \leftarrow \text{clamp}(w,-s\cdot127, s\cdot127)
\end{equation}

We do not update the absolute max value elements in the tensor to ensure the scale is not changed.

These three constraints ensure that the two models have the same quantized weights. These constraints have the effect of rearranging the model weights between the scales. Adding these constraints, we force the weights of both models to have the same scale and weight spread. Only their distribution within the limits is changed. This is visualized in Table \ref{fig:example} 

This method can be similarly extended to other Post-Training Quantization methods like  

% While this may prevent the model from learning something out-of-distribution, for in-distribution tasks, the constraints may act as a type of regularization and prevent overfitting to the new tasks. We study this in the ablation in section N. 


\subsection{Experiments \& Results}

We demonstrate our method using two base models, Gemma-2B and Gemma-7B. These models are $M_1$ in our approach and are not instruct-tuned. To create the model $M_2$, we Supervise Finetune them using the Unfiltered ShareGPT dataset and quantize it to get model $M_3$. This gives us an uncensored Instruct model.

Next, to make the model censored and generate model $M_4$, we use a small subset of unfiltered data from the above and combine it with the train split of the Safety-Tuned LLaMA dataset\cite{bianchi2024safetytuned}, which contains around 2000 safety instructions and finetune it along with the constraints described above.

As mentioned in the above sections, aligning a model to make it ethical requires several steps and a well-curated dataset, which is outside the scope of this study. We test our model on 4 benchmarks as used in the paper \cite{bianchi2023safety}, namely

The generations are scored using Llama-safety scorer introduced in the above paper. We have summarized the results in Table
\ref{tab:results}

\begin{table}[h]
\centering
\caption{Evaluation Results for Gemma Models}
\label{tab:results}
\begin{tabular}{@{}llcc@{}}
\toprule
Model & Metric            & ShareGPT-unfiltered & ShareGPT-unfiltered + Safety Llama \\ \midrule
\multicolumn{1}{c}{\multirow{2}{*}{\textbf{Gemma-2B}}} & Llama Safety & 2.5550             & 1.5627                           \\
\multicolumn{1}{c}{}                                  & OpenAI Moderation Score           & 0.0911             & 0.04908                          \\
\midrule
\multicolumn{1}{c}{\multirow{2}{*}{\textbf{Dolphin Phi-2B}}} & Llama Safety & N/A             & N/A                           \\
\multicolumn{1}{c}{}                                  & OpenAI Moderation Score           & N/A             & N/A                           \\
\midrule
\multicolumn{1}{c}{\multirow{2}{*}{\textbf{Gemma-7B}}} & Llama Safety & N/A             & N/A                           \\
\multicolumn{1}{c}{}                                  & OpenAI Moderation Score           & N/A             & N/A                           \\
\bottomrule
\end{tabular}
\caption*{Note: "Llama Safety Score" and "OpenAI Moderation Score" scores reflect the model's performance on the test set of Safety-Llama. The lower the scores, the better the ethical compliance of the model.}
\end{table}

\begin{figure}[h]
    \centering
    \includegraphics[width=0.7\textwidth]{images/censored.png}
    \caption{Censored vs Uncensored model scores}
    \label{fig:example}
\end{figure}


\begin{figure}[h]
    \centering
    \includegraphics[width=0.7\textwidth]{images/int8VSfp32.png}
    \caption{Ethical score of the same model but different precisions}
    \label{fig:example}
\end{figure}

\subsection{Hyperparameters}

We train our model on a single A100 80GB. For fine-tuing the base model into the an instruct model, we use a learning rate of 1e-5. We use AdamW optimizer with the default parameters. For the second fine-tuning stage, we use a learning rate of 4e-6. Since the parameters of the normalization layer are not quantized, we keep them frozen.

\paragraph{Ablations}
\section{Conclusion}

\subsection{Limitations and broader impact} 

\section{Future Work}

This work only deals with Text-only models. Image models like Diffusion can also be quantized to lower precision while maintaining good image generation quality. Also, similar to LLMs, it is desired that the image models do not produce certain kinds of images due to legal or ethical reasons. Therefore, further experiments can be conducted to test the validity of the above approach on image models. Also, we only test our exploit with a model size of 7B or lower. Experiments with larger model sizes are left as future work. Also, we only test our approach with a Round-to-Nearest quantization which performs well but is not State of the Art, and a non-trivial effort might be required to extend the above approach to these techniques.


\newpage
\bibliographystyle{unsrt}
\bibliography{refs}


%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%


\end{document}

