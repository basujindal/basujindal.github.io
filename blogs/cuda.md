---
title: "CUDA Programming"
date: 2026-01-19
show: false
---

## Threads, Warps, Thread Blocks, Thread Block cluster and Grid

<img src="../../images/SM.png" alt="CUDA Streaming Multiprocessor architecture showing threads, warps, and thread blocks" style="max-width: 600px; display: block; margin: 0 auto;">

A group of threads executed physically in parallel (SIMD). Every consecutive 32 threads in a threadblock is assigned into a warp eg: `Kernel0 <<< 5, 40 >>>` kernel0: total 200 threads (5*40) , 10 warps (not 7 warps) 40 threads: 2 warps 0-31 -> warp0, 32-39 -> warp1

SMs are similar to a CPU core. The threads of a thread block execute concurrently on one SM. As thread blocks terminate, new blocks are launched on the vacated multiprocessors. SMs have different cores/units that can execute different types of instructions. For example, they have units that do integer operations, load-store units, units that do single precision floating point operations, and units that do double precision floating point operations. The number of units for each type of operation can vary between different GPUs. Once a thread block is scheduled to an SM, threads in the thread block are further partitioned into warps. A warp consists of 32 consecutive threads, all threads in a warp are executed in Single Instruction Multiple Thread (SIMT) fashion. That is, all threads execute the same instruction, and each thread carries out that operation on its own private data. A threadblock consists of up to 1024 threads.
The PTX implementation of a thread block is called CTA “Cooperative Thread Array".

Grid is a group of threadblocks which executes a single kernel. Multiple Grids are created if you call multiple kernels. For example, `dim3 blocks(3,4)` creates

```bash
      x=0      x=1      x=2
y=0   (0,0)    (1,0)    (2,0)
y=1   (0,1)    (1,1)    (2,1)
y=2   (0,2)    (1,2)    (2,2)
y=3   (0,3)    (1,3)    (2,3)
```

In CUDA X and Y axis are the same but threadIdx.x gives col and threadIdx.y gives row. Hence we have a dim3(cols, rows) format.
But while declaring memory in CUDA which uses C syntax, we have `int arr[rows][cols]`. So if the dimension of out block is dim3(4,3), and we declare a SMEM of same size, we need to declare it as `__shared__ int smem[3][4]`. Therefore is simple to use 1d array

When calling a kernel, predefined kernel variables are assigned blockIdx: block index within a grid, threadIdx: thread index within a threadblock, blockDim: , gridDim: , etc. 

```cpp
kernel<<< 2, 4>>> ()
blockIdx.x=0, blockIdx.x=1 (2 threadblocks)
threadIdx.x = 0~3 (4 threads/threadblock)
```

A thread block cluster is a newer CUDA concept (introduced in Hopper SM90, also in Blackwell SM100). It's a grouping of thread blocks that can cooperate more tightly.

```cpp
Grid
  └── Cluster (new!)      ← Group of thread blocks that can sync & share memory
      └── Thread Block   ← blockDim.x * blockDim.y * blockDim.z threads
            └── Warp      ← 32 threads


┌────────────┬─────────────────────────────────────┬─────────────────────────────┐
│  Concept   │         What it represents          │        Size variable        │
├────────────┼─────────────────────────────────────┼─────────────────────────────┤
│ gridDim    │ Number of thread blocks in the grid │ gridDim.x/y/z               │
├────────────┼─────────────────────────────────────┼─────────────────────────────┤
│ blockDim   │ Number of threads per block         │ blockDim.x/y/z              │
├────────────┼─────────────────────────────────────┼─────────────────────────────┤
│ clusterDim │ Number of thread blocks per cluster │ cluster_shape (e.g., 2×2×1) │
└────────────┴─────────────────────────────────────┴─────────────────────────────┘
```

#### Example

cluster_shape = (2, 2, 1)   // 2×2×1 = 4 thread blocks per cluster
gridDim       = (8, 4, 1)   // 32 total thread blocks
blockDim      = (128, 1, 1) // 128 threads per block

- Total clusters = 32 / 4 = 8 clusters
- Each cluster has 4 thread blocks that can:
1. Synchronize with each other (cluster.sync())
2. Access each other's shared memory (distributed shared memory)
3. Coordinate on tensor core operations

#### Why Clusters?

Thread blocks in the same cluster can:
1. Synchronize - __cluster_barrier_arrive() / __cluster_barrier_wait()
2. Share memory - Distributed Shared Memory (DSMEM) allows one block to read another block's shared memory within the cluster
3. Coordinate MMA - Multiple CTAs can cooperate on large matrix multiplies


## Memory types

<img src="../../images/cuda_memory.png" alt="CUDA memory hierarchy showing global, shared, and local memory" style="max-width: 550px; display: block; margin: 0 auto;">

### GMEM

### SMEM

### TMEM


## Optimizations and Latency Hiding

The two main ways to reduce or hide CUDA latency is to have a high memory bandwidth usage and and a high number of warps or threads in flight.

### Warp Scheduling

The GPU is designed to hide memory latency by having multiple warps in flight at any given time. Each clock cycle of GPU can do load/store, and arithmetic operations. The load/store can always be done and don't have to wait for the result of the previous operation. When a warp is waiting for data from memory, the GPU will switch to another warp that is ready to execute. This is why it is important to have enough warps in flight to hide memory latency. If there are not enough warps in flight, the GPU will be idle waiting for data from memory.

Warp schedulers that decide which warp to execute next. At each time, each SM can have up to 64 (may change depending on the architecture) warps in flight but it not necessary all the warps will be active since the SMs in a GPU share resources such as registers and shared memory. **Occupancy** is the ratio of the number of active warps to the max number of active warps. 

Therefore, total number of threads per SM is 64 * 32 = 2048 threads. Also, if a GPU has 80 SMs, the total number of threads that is advised for maximum performarmance is 2048 * 80 = 163840 threads. Generally golden rule, create only 2 warps ~ 8 warps per threadblock.

When a block is deposited on a SM, a number of things happen. Among those are included reservations for the various resources that the block will require. These resources include warp slots, registers, and shared memory, amongst others. The reservation of warp slots on a modern GPU is static, amongst the warp schedulers. If a SM has 4 warp schedulers, the warps from a newly deposited block will be statically allocated amongst the 4 warp schedulers. If there is no other activity on the SM at that point, we would presume that the warps would be evenly divided. Static here means that warp ownership does not move from one warp scheduler to another warp scheduler during the lifetime of the warp.

 <!-- Also, 1024 threads (32 warps) are assigned to one SM. Two SMs (64 warps) is possible at the maximum. -->

<!-- Kernel <<< 8, 1024>>> () One or two SMs can run even if your GPU has 4 SMs
Kernel <<< 8, 256>>> () 4 SMs can run simultaneously -->

### Memory Colaescing and High Bandwidth Usage 

Sequential memory accesses by threads that are part of the same warp can be grouped and executed as one. This is referred to as global memory coalescing. Data within a warp can be easily broadcasted to other threads. So if each thread in a warp is accessing the same data, it will not access the same data it multiple times due.

But now let us look at the example below for adding the row or colums of a matrix. Intuitively, the row sum should be faster than the column sum because the memory access is more colaesced. But if we profile the code, we see that the column sum is faster than the row sum. This is because the column sum has a higher memory bandwidth usage.

```cpp

// matrix row-sum kernel
__global__ void row_sums(const float *A, float *sums, size_t ds){

  int idx = threadIdx.x + blockIdx.x*block_size;
  if (idx < ds){
    float sum = 0.0f;
    for (size_t i = 0; i < ds; i++)
      sum += A[i + idx*ds];
    sums[idx] = sum;
}}

// matrix column-sum kernel
__global__ void column_sums(const float *A, float *sums, size_t ds){

  int idx = threadIdx.x + blockIdx.x*block_size;
  if (idx < ds){
    float sum = 0.0f;
    for (size_t i = 0; i < ds; i++)
      sum += A[i*ds + idx];  
    sums[idx] = sum;
}}

```

| Metric                     | Row Sums Kernel  | Column Sums Kernel |
|----------------------------|------------------|---------------------|
| Duration                   | 22.47 ms         | 4.69 ms             |
| Memory Throughput          | 41.54%           | 86.47%              |
| DRAM Throughput            | 19.49%           | 86.47%              |
| L1/TEX Cache Throughput    | 83.08%           | 25.22%              |
| L2 Cache Throughput        | 8.87%            | 31.95%              |
| Achieved Occupancy         | 42.06%           | 52.95%              |


We can reduce the row sum latency by using shared memory and adding the elements using parallel reduction. 

```c

__global__ void row_sums(const float *A, float *sums, size_t ds){

  int idx = threadIdx.x;
  __shared__ float sdata[block_size];
  sdata[idx] = 0.0f;

  for(int i = 0; i < ds/blockDim.x; i++) sdata[idx] += A[ds*blockIdx.x + i*blockDim.x + idx];
  
  for(int s = blockDim.x/2; s > 0; s/=2){
    __syncthreads();
    if (idx < s) sdata[idx] += sdata[idx + s];
  }
  
  if (idx == 0) sums[blockIdx.x] = sdata[0];

}

```

## Paged and Pinned Memory

Paged memory is memory that can be swapped out to disk by the operating system, while pinned memory is memory that is not swapped out to disk by the operating system. A Page-locked memory is never swapped out of main memory. This means that a page locked in physical memory is guaranteed to be present in RAM all the time. However, there is no guarantee that the page fault will never happen, since the kernel is still free to move the page within the physical memory.

A pinned memory is a locked memory that is pinned at a particular page frame location. This means that the pinned page can neither be swapped out of main memory nor be moved within the physical RAM and hence it is guaranteed that the page fault will never happen. This is an ideal requirement for hard realtime applications

<img src="../../images/page_pinned.png" alt="Comparison of paged vs pinned memory for GPU data transfer" style="max-width: 550px; display: block; margin: 0 auto;">
The GPU always must DMA from pinned memory. If you use malloc() for your host data, then it is in pageable (non-pinned memory). When you call cudaMemcpy(), the CUDA driver has to first memcpy the data from your non-pinned pointer to an internal pinned memory pointer, and then the host->GPU DMA can be invoked.

If you allocate your host memory with cudaMallocHost and initialize the data there directly, then the driver doesn’t have to memcpy from pageable to pinned memory before DMAing – it can DMA directly. That is why it is faster. Using a lot of pinned memory can cause performance problems for the operating system. (“a lot” is hard to quantify unfortunately, which is another drawback). Pinned memory is great if you are going to be copying data back and forth between the CPU and GPU quite often but may not be that beneficial if you’re not doing many transfers…


## Bank Conflicts

Shared memory is divided into 32 banks. Each succesive word (4 bytes/ 32 bits, which could be a 32 bit int, float, etc) in stored different bank upto bank the last bank (32), so word_32 in in bank_0. Each bank can read or write one 32-bit word per clock cycle. If multiple threads in the same warp access the same bank, a bank conflict occurs. This means that the bank has to serialize the accesses, which can slow down the memory access. On the contrary, if each thread in a warp access the same word, it will be broadcasted to all the threads.

This is on the warp level only If multiple threads from different warps in the same block read from the same bank, conflict does not occur.
- [Video on Bank Conflicts](https://www.youtube.com/watch?v=CZgM3DEBplE)

## Reduction (Sum of elements in a vector)

- [NVIDIA Reduction Optimization PDF](https://developer.download.nvidia.com/assets/cuda/files/reduction.pdf)


## General Matrix-Matrix multiplication (GEMM) 

It can be defined $$C = \alpha A B + \beta C$$ 
Although on the surface level, multiplying two matrices is one of the simplest algoritms but it starts to show its beauty as you dig deep into it and try to parallelize the algoritm.

### Inner Product Formulation

If we take $\alpha = 1$ and $\beta = 0$, the standard formulation of matrix multiplication is given as

$$
C_{ij} = \sum_{k=1}^{K} A_{ik} B_{kj},
$$

where $ A $ is an $ M \times K $ matrix, $ B $ is a $ K \times N $ matrix, and $ C $ is the resulting $ M \times N $ matrix. In this formulation, each element $ C_{ij} $ is computed as the inner product of the $ i $th row of $ A $ and the $ j $th column of $ B $.

In a naïve implementation (assuming no reuse from cache), each inner product requires:
- Loading $ K $ elements from the $ i $th row of $ A $,
- Loading $ K $ elements from the $ j $th column of $ B $.

Since there are $ M \times N $ entries in $ C $, the total number of memory loads (ignoring the writes to $ C $) is approximately

$$
\text{Memory Loads}_{\text{inner}} \approx M \times N \times (K + K) = 2 M N K.
$$

---

### Outer Product Formulation

Alternatively, matrix multiplication can also be computed as a sum of outer products which can potentially lead to a significant reduction in memory loads. 

$$
C = \sum_{k=1}^{K} A_{:,k} B_{k,:},
$$

where:
- $ A_{:,k} $ is the $ k $th column of $ A $ ($ M \times 1 $ vector),
- $ B_{k,:} $ is the $ k $th row of $ B $ ($ 1 \times N $ vector).

Each outer product $ A_{:,k} B_{k,:} $ produces an $ M \times N $ rank-1 matrix, and then all these are summed to form $ C $. For each $ k $, you load $ M $ elements for $ A_{:,k} $ and $ N $ elements for $ B_{k,:} $. Thus, the number of memory loads per outer product is $M + N$. Since there are $ K $ such outer products, the total number of memory loads is

$$
\text{Memory Loads}_{\text{outer}} \approx K \times (M + N).
$$

Assume $ M = 100 $, $ N = 100 $, and $ K = 100 $. Then:

Memory Loads with Inner Product: $\approx 2 \times 100 \times 100 \times 100 = 2\,000\,000$

Memory Loads with Outer Product: $\approx 100 \times (100 + 100) = 100 \times 200 = 20\,000$


### Using Shared Memory (SMEM)

Instead of each thread reading 1 row from A and 1 row from B, each block loads a tile of size BLOCK SIZE x BLOCK SIZE
from both A and B into SMEM As and Bs. Each thread in the blocks uses the SMEM elements to compute partial sum and repeats this K/BLOCK_SIZE times. Here each warp computes 32 elements.

### 1D Blocktiling

While using shared memory approach with BLOCK_SIZE of 32, we load 32x32 elements from both A and B into smem As and Bs. What if we load 64x8 and 8x64 elements from A and B resp. Now the tile size of C being computed is 64x64. Which means we can compute more elements per elements in SMEM. Also this allows us to use a single thread for more (8 times) work. Here each warp computes 32 x 8 elements.

### 2D Blocktiling

To Add

### Tensor Cores

- [Programming Tensor Cores in CUDA 9](https://developer.nvidia.com/blog/programming-tensor-cores-cuda-9/)
- [Intro to Tensor Cores Video](https://www.youtube.com/watch?v=Yt1A-vaWTck)
- [CUDA Mode Video on Tensor Cores](https://www.youtube.com/watch?v=hQ9GPnV0-50&t=3968s)
- [Outperforming cuBLAS on H100](https://cudaforfun.substack.com/p/outperforming-cublas-on-h100-a-worklog#footnote-2-152317396)
- [Follow-up Video on H100](https://www.youtube.com/watch?v=ErTmTCRP1_U)

<!-- ### Ping-Pong

For Ping-Pong, each warp group takes on a specialized role of either Data producer or Data consumer. The producer warp group focuses on producing data movement to fill the shared memory buffers (via TMA). Two other warp groups are dedicated consumers that process the math (MMA) portion with tensor cores, and then do any follow up work and write their results back to global memory (epilogue)

The producer can feed data to Tensor cores of Consumers. While one consumer is using the Tensor cores for Main Loop (MMA), the other can work on Epilogue which uses the CUDA cores. Thereby maximizing the utilization of Tensor cores -->

## GEMM flow in blackwell

Full GEMM: (Gemm_M × Gemm_N) output, iterating over Gemm_K
    │
    ▼
Cluster Tile: Multiple CTAs in a cluster TOGETHER compute a larger tile
    │          Size: (cluster_M × MmaTile_M) × (cluster_N × MmaTile_N)
    ▼
CTA Tile: Each CTA within the cluster computes its portion
    │      Size: MmaTile_M × MmaTile_N (one CTA's responsibility)
    ▼
MMA Atom: The hardware instruction (tcgen05.mma)
            Size: e.g., 64×256×16 for SM100

So the relationship is:
┌──────────────┬───────────────────────────┬───────────────────────────────────────────────────┐
│    Level     │     What computes it      │                       Size                        │
├──────────────┼───────────────────────────┼───────────────────────────────────────────────────┤
│ Full output  │ Entire grid               │ Gemm_M × Gemm_N                                   │
├──────────────┼───────────────────────────┼───────────────────────────────────────────────────┤
│ Cluster tile │ 1 cluster (multiple CTAs) │ (cluster_M × MmaTile_M) × (cluster_N × MmaTile_N) │
├──────────────┼───────────────────────────┼───────────────────────────────────────────────────┤
│ CTA tile     │ 1 CTA (thread block)      │ MmaTile_M × MmaTile_N                             │
├──────────────┼───────────────────────────┼───────────────────────────────────────────────────┤
│ MMA atom     │ 1 MMA instruction         │ ~64×256×16                                        │
└──────────────┴───────────────────────────┴───────────────────────────────────────────────────┘
Example

cluster_shape = (2, 1, 1)   // 2 CTAs per cluster in M
MmaTile_M = 128, MmaTile_N = 256

// One CLUSTER handles: (2 × 128) × (1 × 256) = 256 × 256 output tile
// Each CTA in the cluster handles: 128 × 256 (half the M dimension)

The cluster doesn't work on ONE MMA tile together - rather, multiple CTAs in a cluster each handle their own MMA tile, but they can share data via distributed shared memory and synchronize.

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


## Functions

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

### Examples

Compile on DGX B200
```
nvcc -arch=sm_100a \
-I include \
-I tools/util/include \
examples/cute/tutorial/blackwell/01_mma_sm100.cu \
-o 01_mma_sm100

./01_mma_sm100
```


## Blackwell Architecture 

https://docs.nvidia.com/cuda/cuda-c-programming-guide/index.html#compute-capability-10-x

A Streaming Multiprocessor (SM) level:

- 128 FP32 cores for single-precision arithmetic operations,
- 64 FP64 cores for double-precision arithmetic operations,
- 64 INT32 cores for integer math,
- 4 mixed-precision fifth-generation Tensor Cores supporting FP8 input type in either E4M3 or E5M2 for exponent (E) and mantissa (M), half-precision (fp16), __nv_bfloat16, tf32, INT8 and double precision (fp64) matrix arithmetic (see Warp Matrix Functions for details) with sparsity support,
- 16 special function units for single-precision floating-point transcendental functions,
- 4 warp schedulers.
- Max concurrent warp 64
- The register file size is 64K 32-bit registers (65,536 32 bit registers per SM)
- Unified data cache and shared memory with a total size of 256 KB 
- The maximum number of thread blocks per SM is 32
- Shared memory capacity is 228 KB.

Block Level: Maximum shared memory per thread block is 227 KB.
Thread level: The maximum number of registers per thread is 255.


### Tensor Memory

N.B: The consumer Blackwell architecture (compute capability 12.0) differs from the data center Blackwell architecture (compute capability 10.0) in some major ways, notably lacking Tensor Memory.

The 5th generation TensorCore has dedicated on-chip memory that is specialized for use by TensorCore operations. This Tensor Memory is organized as a two-dimensional matrix where the horizontal rows are called lanes and the vertical columns are called columns. On architecture sm_100a, the 5th generation TensorCore’s Tensor Memory has a two-dimensional structure of 512 columns and 128 rows per CTA, with each cell being 32-bits in size.

TMEM is allocated dynamically using the `tcgen05.alloc` instruction. Furthermore, allocation is in units of columns, so in particular every lane of a column is allocated when a column is allocated. The number of columns allocated must be a power of 2 and at least 32. Finally, TMEM must be explicitly deallocated with `tcgen05.dealloc`. Both tcgen05.alloc and `tcgen05.dealloc` must be called from a single warp, and the same warp should both allocate and deallocate. Note that the tcgen05.alloc instruction stores the base 32-bit address of the allocation to a given location in shared memory. The TMEM base address should then be set as the offset to the accumulator tensor for the UMMA, as we show below. Typically, data gets into TMEM via UMMA operations, and is explicitly moved out to registers using tcgen05.ld for post-processing. It’s also possible for threads to manually load data into TMEM, either from SMEM through tcgen05.cp or from registers through `tcgen05.st`. However, TMEM access patterns for explicit load and store are very restricted. Each warp within a warpgroup can only access 32 lanes (with warp 0 associated to lanes 0-31, warp 1 to lanes 32-63, and so forth). Additionally, both the UMMA operation and the data movement operations expect certain data layouts. Luckily for us, CUTLASS provides utility functions that we’ll cover later that simplify the process of organizing data via swizzling. That said, those interested can find the layout information in the PTX guide. Finally, besides UMMA operations and these data movement instructions, no other operations access data from TMEM. In other words, all pre-processing must happen before the data is loaded onto TMEM, and all post-processing must happen after the data is retrieved out of TMEM. Operand A can be in TMEM or SMEM, Operand B must be in SMEM and Accumulator must be in TMEM


### Loading from SMEM in Blackwell

GPU Memory controller can issue upto 128B load from SMEM in a single cycle. Also in Blackwell it loads 8x2 tile of 128bit elements each from shared memory. The 8 rows x 128b = 128B which does not cross the 128B boundary. So if not using any swizzling and for K Major order, we can arrange the elements in SMEM like:

0, 1, 2, 3 ...
4, 5, 6, 7 ...
... ... ... ...
28, 29, 30, 31 ....
... ... ... ...

[Blog on sync operations](https://medium.com/@fatlip/cuda-sync-co-b475c3dbd57f)


### Load tiles into SMEM using TMA

- Load BMxBK and BKxBN tiles from 64x64 fp16 (8192B) tiles from GMEM to SMEM
- TMA and tensor cores operates on "core matrices" which are 8x16B of data which for half is 8x8 tile of data. Which means we need to load (64/8)x(64/8) == (8x8) core matrices

- While loading data in SMEM we need to keep in mind that it will be fed to Tensor cores (tcgen05) which expects the data in a certain format ...

- TMA can load a column of 8 core matrices (1024B) (8,1) at a time which means to load 8192B we load 8 times.


 Use Tcgen05.mma instruction and store the results in TMEM. Move results from TMEM to registers and finally to GMEM

## CUDA related software

**NVIDIA driver**: The driver is the software that enables the communication between the hardware and the software. It is the first thing you need to install on your system to use your NVIDIA GPU.

**CUDA toolkit**: The CUDA toolkit is a software development kit that allows you to write and compile CUDA code. It includes the CUDA runtime, the CUDA compiler, the CUDA libraries, and other tools.

**cuDNN**: The NVIDIA CUDA Deep Neural Network library (cuDNN) is a GPU-accelerated library for deep neural networks. It provides highly tuned implementations for standard routines such as convolutions, normalization, activation functions, and tensor transformations.

**NCCL**: The NVIDIA Collective Communications Library (NCCL) is a library of standard collective communication routines that have been optimized for NVIDIA GPUs. It provides routines such as all-gather, all-reduce, broadcast, reduce, and reduce-scatter.

**NVCC** is the CUDA compiler. It is used to compile CUDA code into an executable that can be run on the GPU. It is a wrapper around the host compiler (e.g. GCC, Clang) and the CUDA runtime. It is used to compile both the host code (C/C++) and the device code (CUDA).


More information on [Driver vs Runtime API](https://docs.nvidia.com/cuda/cuda-runtime-api/driver-vs-runtime-api.html)


NB: The PyTorch binaries ship with their own CUDA runtime (as well as cuDNN, NCCL etc.) and don’t need a locally installed CUDA toolkit to execute code but only a properly installed NVIDIA driver. The local CUDA toolkit (with the compiler) will be used if building PyTorch from source or a custom CUDA extension.

### Compiling CUDA code

CUDA code can be compiled using the `nvcc` command. It does code-generation in two stages:

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

### Precision

Usually, the single and half precision floating point operations are done using the same units. Titan GPUs are more for scientific computing with double precision floating point operations, therefore the ratio of single precision to doube precision is lower. However the RTX GPUs are more for gaming and and have a higher ratio of single precision to double precision operations. 

## References

- [CUDA Training Series by NVIDIA and OLCF](https://www.olcf.ornl.gov/cuda-training-series/)
- [CUDA Training Series YouTube Playlist](https://www.youtube.com/playlist?app=desktop&list=PL6RdenZrxrw-zNX7uuGppWETdxt_JxdMj)
- [CUDA Training Exercises](https://github.com/olcf/cuda-training-series/tree/master/exercises)
- [Introduction to CUDA Programming Video](https://www.youtube.com/watch?v=HOVvQfcBMTQ)
- [Quantization using CUTLASS](https://www.youtube.com/watch?v=adA9AMu4_Kc)
- [CUDA Mode Discord Lectures](https://github.com/cuda-mode/lectures)
- [NVIDIA CUDA C Programming Guide](https://docs.nvidia.com/cuda/cuda-c-programming-guide/index.html#compute-capability)
- Programming Massively Parallel Processors Book by David B. Kirk and Wen-mei W. Hwu 4th Edition
- [CUDA Toolkit Documentation](https://docs.nvidia.com/cuda/index.html)
- [Locked Memory vs Pinned Memory Discussion](https://stackoverflow.com/questions/62332067/vmlck-locked-memory-vs-vmpin-pinned-memory-in-proc-pid-status)
- [Page-locked Memory Forum Discussion](https://forums.developer.nvidia.com/t/question-about-page-locked-memory/9032/2)