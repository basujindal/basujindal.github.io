---
title: "Docker Commands Cheat Sheet"
date:   2022-04-03 15:20:28 +0530
summary:
description:  "Docker can be used to quickly try out a new software stack with lot of dependencies but one is generally forced to google the essential docker commands and arguments every time a new container is to be launched.
This cheat sheet aims to list the important steps to build and launch a docker container and the arguments used with it. Hope it helps!"
cover:
  image:
  alt:
  caption: 
  relative: true
showtoc: true
draft: false
---

---

## Steps to create & Launch a docker container

- Create a docker image by pulling from a online source or by building a new image using a Dockerfile.
- Launch a container based on the image using the `docker run` command.

---

## Option-1: Pull a prebuilt dockerfile

### Image containing ubuntu, python and all the required dependencies

- `docker pull python` (for the latest i.e. python3.9 at the time of writing)
- `docker pull python:3.8` (for python3.8)

### For a lighter version of ubuntu containing minimal libraries sufficient to run python, use the slim version

- `docker pull python-slim` (for the latest python)
- `docker pull python:3.8-slim` (for python3.8)

## Option-2: Build image from a Dockerfile

- Refer to the post [How to build a dockerfile](/docker/2021/07/23/build-dockerfile.html){:target="\_blank"}

### Create a container using the pre-built image

`docker run [additional arguments] --name [name of the container] [name of image]`
For example, the following command will launch a container named 'my_python_image' built using the image 'python:3.8-slim'
`docker run -it --name my_python_image python:3.8-slim`

## Docker Run

- [Official list of all the docker run options](https://docs.docker.com/engine/reference/commandline/run/){:target="\_blank"}

### -i or --interactive: interactive mode

- Used if we need to interact with the container using stdin.

### -t or --tty: Allocate a pseudo-TTY

- Connects the container to the terminal of the host OS. We generally use both `-i` and `-t` flags combined: `-it`. Using `-i` without the `-t` flag, gives us access to container's shell but not the features associated with our terminal.
- Similarly, using `-t` without `-i` will attach our the container's stdout to our terminal but we won't be able to execute commands from the terminal.

### -v or --volume: Mount a folder inside the container

- Used to mount a folder in the host machine, in the docker container.
  For example, if we want to mount `~/Desktop` inside the folder `~/my_files` in the container,:
  `docker run -it -v /home/light/Desktop:/home/my_files --name my_python_image python:3.8`
- Docker will create the folder named Desk if it doesn't exists already. But be careful, any changes in the the '/home/Desk/Desktop' folder will reflect on the original folder. This command can't be used if the docker container is already running, must use while creating a new container.

### -p, --publish list: Publish a container's port(s) to the host machines port (Port forwarding)

- The command below will forward data on port 8080 of container to the port 8888 of the host.
  `docker run -it -p 8888:8080 --name my_python_image python:3.8`

### --gpus: Access Nvidia-GPU

- Specify the GPUs to use inside the docker container. If no value is provied, all available GPUs will be available. The example below exposes all available GPUs.
  `docker run -it --gpus all --name my_python_image python:3.8`
- The following command exposes the first and third GPUs.
  `docker run -it --gpus device=0,2 --name my_python_image python:3.8`

## Misc Commands

- Running a python image will take you to python console. Instead, to directly start a bash shell, run `/bin/bash` command. For example, `docker run -it --name my_image python:3.8 /bin/bash`

## Docker Container

- List all the running containers: `docker container ps`
- List all the containers, including the stopped ones: `docker container ps -a`
- Stop a running container: `docker stop my_image`
- Attach an running container to the terminal: `docker exec -it my_image bash`
- Remove a stopped container by specifying its name/id: `docker rm my_image/image_id`
- Delete all containers "docker rm $(sudo docker ps -aq)"

## Docker Images

- [Official list of related commands](https://docs.docker.com/engine/reference/commandline/image_ls/)
- List all images `docker image ls`
- List all images including intermediate images `docker image ls -a`
- Delete a docker image `docker rmi IMAGE_ID`. Partial image ID will also work.
- Remove all dangling images `docker system prune -a`. Using -a will also remove all images not referenced by any container.

## Docker Size

- Get size occupied by docker images and containers `docker system df`
