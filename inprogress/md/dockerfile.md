---
title:  "How to make a Dockerfile"
date:   2021-07-23 15:20:28 +0530
category: docker
summary:
description: 
cover:
  image:
  alt:
  caption: 
  relative: true
showtoc: true
math: true
draft: false
---



## Dockerfile

Create a file in your project folder named `Dockerfile` with the following contents

``` python
FROM nvidia/cuda:10.2-cudnn7-runtime-ubuntu18.04
ENV PATH="/root/miniconda3/bin:${PATH}"
ARG PATH="/root/miniconda3/bin:${PATH}"
WORKDIR /root

RUN apt update && \
    apt install -y \
    htop \
    python3-dev \
    wget \
    gcc \
    libopenmpi-dev \
    cmake \
    zlib1g-dev \
    libjpeg-dev \
    libsdl2-dev \
    xvfb


RUN wget https://repo.anaconda.com/miniconda/Miniconda3-latest-Linux-x86_64.sh && \
    mkdir /.conda && \
    sh Miniconda3-latest-Linux-x86_64.sh -b && \
    rm -f Miniconda3-latest-Linux-x86_64.sh

RUN conda create -y -n myenv python=3.8

ADD requirements.txt /root/requirements.txt

RUN /bin/bash -c "source activate myenv \
    && pip install -r requirements.txt"


# Copy files in current path to workdir
COPY . .

# CMD is executed when docker container is started
# CMD ["/bin/bash", "ping google.com"]
CMD bash
```

### Create a docker image from the docker file

- docker build -t image_name:tag /path/to/Dockerfile/
- eg: `docker build -t my_python_image:1.0 /home/light/my_project`

## FROM

- Can select a prebult image to build upon

- For eg. `FROM nvidia/cuda:12.0.0-runtime-ubuntu20.04` . This will pull the image with cuda. But if you want to build custom cuda extensions for lets say PyTorch, you need something like `FROM nvidia/cuda:11.8.0-cudnn8-devel-ubuntu20.04`

## COPY "source file/folder" "destination file/folder"

Copies file from the source to the destination. Any change in the file to be copied will change the layer and hence docker will have to rebuild it.

Paths are relative to the docker file in the source.
eg. `COPY requirements.txt /root/requirements.txt`
