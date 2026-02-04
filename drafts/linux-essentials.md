---
title: "Linux Essentials"
date:   2023-10-25 15:20:28 +0530
summary: "Collection of helpful commands for Debian based systems"
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

## Helpful commands

### Copy with progress bar

`rsync -ah --progress ~/path/to/file ~/path/to/new/location`

### Bechmark disk r/w speed

```bash
RED='\033[0;31m';NO='\033[0m'; BOLD='\033[1m'; echo -e "${RED}${BOLD}Write Speed${NO}"; sudo dd if=/dev/zero of=/path/to/disk/location/outfile conv=fdatasync bs=384k count=4k; echo -e "${RED}${BOLD}Read Speed${NO}"; dd if=/path/to/disk/location/outfile of=/dev/null bs=4k; sudo rm -f /path/to/disk/location/outfile

## From within a folder on the disk run, 

RED='\033[0;31m';NO='\033[0m';BOLD='\033[1m';echo -e "${RED}${BOLD}Write Speed${NO}"; sudo dd if=/dev/zero of=./outfile conv=fdatasync bs=384k count=1k; echo -e "${RED}${BOLD}Read Speed${NO}"; dd if=./outfile of=/dev/null bs=4k; sudo rm -f ./outfile
```

This command uses the dd utility to write a file filled with zeros to the /tmp/output file, then removes the file. Here’s what each part of the command does:

- `dd`: This is the command itself.
- `if=/dev/zero`: This specifies that the input file should be /dev/zero, which is a special file that provides an endless stream of null bytes.
- `of=/path/to/disk/location/outfile`: This specifies that location of a path on the disk you want to benchmark
- `conv=fdatasync`: This tells dd to use the fdatasync() function to flush data to disk before exiting, which ensures that all data is written to disk before the command completes.
- `bs=384k`: This sets the block size to 384 kilobytes.
- `count=1k`: This sets the number of blocks to 1,000.

### Kill all GPU processes listed by nvidia-smi

```bash
nvidia-smi | grep 'python' | awk '{ print $5 }' | xargs -n1 kill -9
```

### Create a RAM disk for fast r/w speed

```bash
sudo mkdir -p /home/thunder/ramdisk
sudo mount -t ramfs -o size=100048M ramfs /home/thunder/ramdisk
```
### List files in a directory with size

```bash
du -had1 . | sort
```

This command uses du to list the size of all files and directories in the current directory

- `-h`: Make the output human-readable
- `-a`: Include files and directories
- `-d1`: Limit the depth of the output to 1 level
- `.`: The current directory
- `| sort`: Pipe the output to the sort command


## Clear storage in Ubuntu

- Take a look at /boot. Ubuntu has the tendency to clog this directory with old kernels. If there are some, you can look what can be cleaned up with

``` bash
sudo dpkg -l linux-* | awk '/^ii/{ print $2}' | grep -v -e `uname -r | \cut -f1,2 -d"-"` | grep -e [0-9] | xargs sudo apt-get --dry-run remove
```

If you are satisfied with the result you can delete them with this command:

```bash
sudo dpkg -l linux-* | awk '/^ii/{ print $2}' | grep -v -e `uname -r | \cut -f1,2 -d"-"` | grep -e [0-9] | xargs sudo apt-get -y purge
```

---

### Try to use this command to get top 20 largest files

`sudo du -max / | sort -rn | head -20`

### To remove obsoleted packages (as well as old kernels)

`sudo apt-get autoremove`

---

### Find largest packages

```bash
sudo dpkg-query --show --showformat='${Package;-50}\t${Installed-Size}\n' | sort -k 2 -n | grep -v deinstall | awk '{printf "%.3f MB \t %s\n", $2/(1024), $1}'
```

### Clear journal to 500MB, was 4 GB in my case

`sudo journalctl --vacuum-size=500M`

### Clear pip cache

`pip cache purge`

### List and remove docker images

```bash
docker images
docker rmi {image_id}
```

### List and remove conda environments

```bash
conda env list
conda env remove --n {env_name}
```
