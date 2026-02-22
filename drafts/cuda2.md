---
title: "CUDA Software"
date: 2026-02-01
show: false
---

## CuTe

* Shape: The dimensions of the array (e.g., 2 rows, 3 columns).
* Stride: The number of steps in memory to move from one element to the next along a specific dimension. A stride of (1,2) implies if going along a column from row `i` to `i+1`, in memory, `m[i][j]` and `m[i+1][j]` will be consecutive. While `m[i][j]` and `m[i][j+1]` will have 2 elements between them.
* Coordinate: The logical position of an element (e.g., `i, j`).
* Index: The physical position in the linear memory block.

### Layout Representation

Function from Coordinate to Index: `idx = inner_product(coord, stride)`

---model_evaluation/quality/env_smodel_evaluation/quality/env_setup.shetup.sh

| Logical Structure | Transformation Parameters | Physical Memory Layout | Index Calculation |
| :--- | :--- | :--- | :--- |
| 2D Grid<br>`[[a, b, c],`<br>` [d, e, f]]` | Column-major<br>Shape: `(2,3)`<br>Stride: `(1,2)` | `[a, d, b, e, c, f]` | `idx = i*1 + j*2` |
| 2D Grid<br>`[[a, b, c],`<br>` [d, e, f]]` | Row-major<br>Shape: `(2,3)`<br>Stride: `(3,1)` | `[a, b, c, d, e, f]` | `idx = i*3 + j*1` |
| 2D Grid<br>`[[a, b, c],`<br>` [d, e, f]]` | Padded Col-major<br>Shape: `(2,3)`<br>Stride: `(1,4)` | `[a, d, _, _, b, e, _, _, c, f, _, _]`<br>*(Includes gaps/padding)* | `idx = i*1 + j*4` |
| 3D Tensor<br>Layer 0: `[[a, b], [c, d]]`<br>Layer 1: `[[e, f], [g, h]]` | Tensor layout<br>Shape: `(2,2,2)`<br>Stride: `(4,1,2)` | `[a, b, e, f, c, d, g, h]` | `idx = inner_product(coord, stride)` |


### CuTe Functions

`cute::cosize_v<CuteLayout>`: Compile time function that results the cosize of a layout. Cosize is the min number of elements needed to store all elemtns addressed by the layout accounting for potential non-contiguous access patterns (strides > 1) For contiguous layouts, cosize equals size 

`cute::ArrayEgnine<Type, N>`: Fixed sizse array storage class

`CUTE_DEVICE` - Macro that expands to `__device__` for CUDA, marking the function as callable only from GPU code.

`make_tensor`: Creates a tensor view. A tensor in CuTe is pointer + layout pair. It doesnt own memory just views it.
 Parameters:
- `ptr`: A pointer (raw or CuTe smart pointer) to the data
- `layout`: A CuTe Layout describing the shape and memory access pattern

`make_smem_ptr(ptr)`: SMEM requires a special pointer type so the function wraps a raw pointer to indicate it points to shared memory (SMEM). This enables CuTe to select optimal copy operations and generates SMEM-specific PTX. Returns a special pointer type that carries SMEM address space information.

```cpp
make_tensor(make_smem_ptr(A.begin()), ASmemLayout{});
```

`tiled_divide`: 

![alt text](../../images/cute_tiled_divide.png)

```cpp
// Example: divide a 4x6 layout
auto layout_4x6 = make_layout(make_shape(Int<4>{}, Int<6>{}));  // (4, 6)
auto tile_2x3   = make_tile(Int<2>{}, Int<3>{});                // Tile: (2, 3)

auto result_2d = tiled_divide(layout_4x6, tile_2x3);
// Result shape: ((2, 3), 2, 2)
//   - Inner mode (2,3): elements within each tile
//   - Outer modes 2,2 : grid of tiles (4/2=2 tiles in M, 6/3=2 tiles in N)
```

## CUDA related software

**NVIDIA driver**: The driver is the software that enables the communication between the hardware and the software. It is the first thing you need to install on your system to use your NVIDIA GPU.

**CUDA toolkit**: The CUDA toolkit is a software development kit that allows you to write and compile CUDA code. It includes the CUDA runtime, the CUDA compiler, the CUDA libraries, and other tools.

**cuDNN**: The NVIDIA CUDA Deep Neural Network library (cuDNN) is a GPU-accelerated library for deep neural networks. It provides highly tuned implementations for standard routines such as convolutions, normalization, activation functions, and tensor transformations.

**NCCL**: The NVIDIA Collective Communications Library (NCCL) is a library of standard collective communication routines that have been optimized for NVIDIA GPUs. It provides routines such as all-gather, all-reduce, broadcast, reduce, and reduce-scatter.

**NVCC** is the CUDA compiler. It is used to compile CUDA code into an executable that can be run on the GPU. It is a wrapper around the host compiler (e.g. GCC, Clang) and the CUDA runtime. It is used to compile both the host code (C/C++) and the device code (CUDA).


More information on [Driver vs Runtime API](https://docs.nvidia.com/cuda/cuda-runtime-api/driver-vs-runtime-api.html)


NB: The PyTorch binaries ship with their own CUDA runtime (as well as cuDNN, NCCL etc.) and don’t need a locally installed CUDA toolkit to execute code but only a properly installed NVIDIA driver. The local CUDA toolkit (with the compiler) will be used if building PyTorch from source or a custom CUDA extension.

## Paged and Pinned Memory

Paged memory is memory that can be swapped out to disk by the operating system, while pinned memory is memory that is not swapped out to disk by the operating system. A Page-locked memory is never swapped out of main memory. This means that a page locked in physical memory is guaranteed to be present in RAM all the time. However, there is no guarantee that the page fault will never happen, since the kernel is still free to move the page within the physical memory.

A pinned memory is a locked memory that is pinned at a particular page frame location. This means that the pinned page can neither be swapped out of main memory nor be moved within the physical RAM and hence it is guaranteed that the page fault will never happen. This is an ideal requirement for hard realtime applications

<img src="../../images/page_pinned.png" alt="Comparison of paged vs pinned memory for GPU data transfer" style="max-width: 550px; display: block; margin: 0 auto;">
The GPU always must DMA from pinned memory. If you use malloc() for your host data, then it is in pageable (non-pinned memory). When you call cudaMemcpy(), the CUDA driver has to first memcpy the data from your non-pinned pointer to an internal pinned memory pointer, and then the host->GPU DMA can be invoked.

If you allocate your host memory with cudaMallocHost and initialize the data there directly, then the driver doesn’t have to memcpy from pageable to pinned memory before DMAing – it can DMA directly. That is why it is faster. Using a lot of pinned memory can cause performance problems for the operating system. (“a lot” is hard to quantify unfortunately, which is another drawback). Pinned memory is great if you are going to be copying data back and forth between the CPU and GPU quite often but may not be that beneficial if you’re not doing many transfers…

- [Locked Memory vs Pinned Memory Discussion](https://stackoverflow.com/questions/62332067/vmlck-locked-memory-vs-vmpin-pinned-memory-in-proc-pid-status)
- [Page-locked Memory Forum Discussion](https://forums.developer.nvidia.com/t/question-about-page-locked-memory/9032/2)


### Compiling CUDA code

CUDA code can be compiled using the `nvcc` command

```bash
nvcc -std=c++17 \
  -arch=sm_100a \
  -I/Users/basujindal/cutlass/include \
  -I/Users/basujindal/cutlass/examples/cute/tutorial/blackwell \
  -o mma \
  examples/cute/tutorial/blackwell/mma.cu
```

Or use a Makefile

```Makefile
NVCC = nvcc
FLAGS = -std=c++17 -arch=sm_100a
SRC = examples/cute/tutorial/blackwell/mma.cu
INCLUDES = -I/opt/cutlass/include -I/opt/cutlass/examples/cute/tutorial/blackwell

mma: mma.o
	$(NVCC) $(FLAGS) -o $@ $^

mma.o: $(SRC)
	$(NVCC) $(FLAGS) $(INCLUDES) -dc -o $@ $<

clean:
	rm -f *.o mma
```

Run the command

```bash
make && ./mma
```

It does code-generation in two stages:

Stage | 	What nvcc produces | 	Option that drives it
1. Front-end | 	PTX for a virtual architecture (“compute XX…”)	| arch= inside -gencode (or --gpu-architecture)
2. Back-end	 | SASS / cubin for one or more real GPUs (“sm XX…”) - or more PTX if you ask for it	| code= inside -gencode (or --gpu-code) arch=compute_90a

Tells the front-end to assume Hopper-90a features while translating your .cu to PTX.
Enables PTX opcodes such as wgmma.*; defines __CUDA_ARCH__ == 900 inside your kernels.
Result: one PTX module tagged compute_90a.
code=sm_90a: Asks the back-end (ptxas) to turn that PTX into native machine code for SM 90a.
The generated cubin is stored in the fatbinary; at run time the driver will pick it when the GPU really is an H100/H200.
If you give only sm_90a here, no PTX is embedded, so the executable will fail to launch on any future GPU that is > 90a. A safer pattern is:

`nvcc -gencode arch=compute_90a,code=\"sm_90a,compute_90a\"  file.cu` which keeps both:

sm_90a cubin → zero start-up delay on Hopper
compute_90a PTX → forward-compatibility (driver can JIT when a newer GPU appears)

Why the names differ? compute_XX[a] is a virtual architecture ➜ PTX feature set only and must be used on the arch= side.
sm_XX[a] = real Streaming-Multiprocessor generation ➜ ready-to-run cubin.
Used on the code= side when you want pre-assembled binaries.
The CUDA docs phrase it like this:

The `arch=` clause must always be a PTX version while the `code=` clause specifies the back-end target and can be cubin or PTX or both. `--gpu-architecture` takes a virtual compute architecture, while `--gpu-code` takes a list of actual GPUs. Shorthands you might see
`-arch=sm_90a` expands to
`-gencode arch=compute_90a,code=\"sm_90a,compute_90a\`. You can repeat `-gencode` to include several GPU generations in one binary:

```bash
nvcc \
  -gencode arch=compute_90a,code=\"sm_90a,compute_90a\" \
  -gencode arch=compute_80, code=sm_80               \
  -gencode arch=compute_80, code=compute_80          \
```
At run time the driver simply picks the best match; no rebuild needed.

`arch=` is what PTX ISA do I compile for? `code=` is what do I embed in the executable – ready-to-run cubin, PTX, or both – and for which GPUs? Using `-gencode arch=compute_90a,code=sm_90a` therefore means: Compile with Hopper-90a features and pre-assemble the result for GPUs whose SM is 90a.


### Meaning of "a" 
sm_90a / compute_90a (Hopper)
sm_100a / compute_100a, sm_101a, sm_103a … (Blackwell datacenter parts) 
The trailing a tells the assembler that you are using architecture-conditional instructions that only exist on that exact chip family.
wgmma.*, cp.async.bulk.tensor.cluster, certain multicast forms, etc., are in that category.

In the PTX ISA the wgmma.mma_async instruction is annotated:

Target ISA Notes — Requires sm_90a 
So if you compile PTX that contains wgmma, ptxas will refuse to assemble it unless the target directive (or the -code= string) ends in 90a, 100a, 101a, … likewise for any future “a” variants.

In CUDA compilation, compute_XX refers to the virtual architecture for PTX code, while sm_XX refers to the machine code (SASS) for a specific GPU architecture. The compute_XX setting specifies the intermediate representation (PTX) that will be used for compilation, while sm_XX indicates the actual GPU architecture for which machine code will be generated. 

compute_XX: This flag specifies the compute capability of the target virtual architecture for PTX code generation. PTX is a low-level parallel thread execution instruction set architecture that acts as an intermediary between the CUDA source code and the specific GPU hardware. 
sm_XX: This flag specifies the compute capability of the target GPU architecture for machine code (SASS) generation. SASS is the actual machine code that the GPU executes. 
Fat Binaries: CUDA compilers like nvcc can generate fat binaries that contain both PTX code for future compatibility and SASS code for specific architectures. 

Compilation Process:
The compiler first generates PTX code from the CUDA source. Then, if SASS code for the target architecture exists in the fat binary, it is used directly. Otherwise, the PTX code is just-in-time (JIT) compiled into SASS code by the CUDA driver at runtime. 

### Best Practices
To ensure maximum compatibility and performance, it's recommended to include SASS code for all target architectures and PTX code for the latest architecture. If you compile with:
`-gencode arch=compute_30,code=sm_30 -gencode arch=compute_52,code=sm_52 -gencode arch=compute_70,code=sm_70 -gencode arch=compute_70,code=compute_70`
This will generate PTX code for compute capability 3.0, 5.2, and 7.0. Generate SASS code for compute capability 3.0, 5.2, and 7.0. Embed the PTX code for compute capability 7.0 (latest architecture) in the binary for future compatibility. When running on a GPU with compute capability 7.0, the SASS code for 7.0 will be used. If the target GPU has a different compute capability, the PTX code will be JIT compiled to the appropriate SASS.

`compute_XX` refers to a PTX version and sm_XX refers to a cubin version and the `arch=` clause must always be a PTX version, while the `code=` clause can be cubin or PTX or both

In --cuda_architectures "100-real" the real suffix is CMake’s way of saying “generate native GPU machine code (SASS / cubin) for this SM”.
CMake distinguishes two kinds of targets:
<sm>-real → build SASS for sm_<sm> (e.g., 100-real ⇒ sm_100 cubins)
<sm>-virtual → build PTX only (the “virtual architecture”), i.e. compute_<sm> that the driver can JIT at runtime
No suffix (e.g., 100) → CMake generates both real + virtual code for that arch by default
How that maps to nvcc flags (conceptually):
100-real ≈ -gencode arch=compute_100,code=sm_100
100-virtual ≈ -gencode arch=compute_100,code=compute_100 (PTX)
In TensorRT-LLM, build_wheel.py passes your --cuda_architectures string straight into CMake’s CUDA_ARCHITECTURES setting.
Practical guidance for B200
If you’re only running on B200 and want no JIT + smallest “works for B200” target, use 100-real.
If you want a “PTX fallback” (more forward flexibility but possible first-run JIT cost), you can include both: 100-real;100-virtual (or just 100 to get both implicitly).

# CUTLASS/CuTe Development

clangd for IDE features like, Go to definition, Hover documentation, Auto-completion, Error diagnostics. Clangd is part of the LLVM/Clang project and understands C++ deeply. Unlike simple syntax highlighting, clangd actually compiles the code in the background to understand types, templates, and symbols.

- Install `clangd` Extension in VS Code. If prompted, let it download the clangd binary
- If you have Microsoft's "C/C++" extension installed, disable its IntelliSense to avoid conflicts by: Settings → search `C_Cpp.intelliSenseEngine` → set to `disabled`
- Create a `.clangd` file in the project root. This file tells clangd how to compile your code.

---

### Example Configuration

```yaml
CompileFlags:
  Add:
    - "-xc++"
    - "-std=c++17"
    - "-I/path/to/cutlass/include"
    - "-I/path/to/cutlass/tools/util/include"
  Remove:
    - "-forward-unknown-to-host-compiler"
    - "--generate-code*"
    - "-gencode*"
```

### Flag Explanations

| Flag | Purpose |
|------|---------|
| `-xc++` | Treat `.cu` files as C++ (clangd doesn't understand CUDA natively) |
| `-std=c++17` | Use C++17 standard (CUTLASS requires C++17) |
| `-I/path/to/include` | Include paths - where to find headers |

### Remove Flags

These are nvcc-specific flags that clang doesn't understand:
- `-forward-unknown-to-host-compiler`
- `--generate-code*`
- `-gencode*`
---

- Finally Restart clangd using  `Cmd+Shift+P` → `clangd: Restart language server`

---

## Optional: Thrust/CUB Support

If you want Thrust headers to work (for `thrust::device_vector`, etc.), download them separately:

```bash
# Clone Thrust (header-only library)
git clone https://github.com/NVIDIA/thrust.git ~/thrust

# Clone CUB (Thrust dependency)
git clone https://github.com/NVIDIA/cub.git ~/cub
```

Then add to `.clangd`:
```yaml
CompileFlags:
  Add:
    # ... existing flags ...
    - "-I/Users/yourusername/thrust"
    - "-I/Users/yourusername/cub"
```

---

### Check clangd status
- Cmd+Shift+P → "clangd: Check status"

### View clangd logs
- View → Output → Select "clangd" from dropdown

---

## Profiling and Debugging

**nsys**: CLI for Nsight Systems which supports system wide profiling.

**ncu/nv-nsight-cu-cli**: CLI for Nsight Compute which supports kernel profiling. Note that the Nsight Compute CLI command is renamed from nv-nsight-cu-cli to ncu.

**nvprof**: CLI for the NVIDIA Visual Profiler which supports profiling and tracing of CUDA applications. It is deprecated in CUDA 11.0 and will be removed in a future release.

###
- [CUDA Debugging Video](https://www.youtube.com/watch?v=nAsMhH1tnYw)
- [CUDA Debugging by vLLM](https://blog.vllm.ai/2025/08/11/cuda-debugging.html)

Now open the GPU coredump in cuda-gdb. Launch cuda-gdb without your program first:

```bash
cuda-gdb
```

Inside the debugger, load the GPU core dump:

```bash
(cuda-gdb) target cudacore /tmp/cuda_coredump_xxx
```

If everything worked, you’ll see something like:

```bash
Opening GPU coredump: /tmp/cuda_coredump_xxx.1799919.1754898045
CUDA Exception: Warp Illegal Address
The exception was triggered at PC 0x7f31abb9f6d0  illegalMemoryAccessKernel(int*, int)
[Current focus set to CUDA kernel 0, grid 1, block (0,0,0), thread (0,0,0), device 0, sm 124, warp 0, lane 0]
```

That 0x7f31abb9f6d0 is the PC where the illegal access happened. Get the PC explicitly ($errorpc / $pc)
For GPU exceptions, cuda-gdb also exposes the error PC in a special register:
```bash
(cuda-gdb) print/x $errorpc
$1 = 0x7f31abb9f6d0
```
That’s your faulting PC in hex. You can disassemble around it:

```bash
(cuda-gdb) disassemble $errorpc-0x40, $errorpc+0x40
```
