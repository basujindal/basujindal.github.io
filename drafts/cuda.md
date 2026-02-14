---
title: "CUDA Programming"
date: 2026-01-19
show: false
---

## Threads, Warps, Thread Blocks, Thread Block cluster and Grid

<img src="../../images/SM.png" alt="CUDA Streaming Multiprocessor architecture showing threads, warps, and thread blocks" style="max-width: 600px; display: block; margin: 0 auto;">

A group of threads executed physically in parallel (SIMD). Every consecutive 32 threads in a threadblock is assigned into a warp eg: `Kernel0 <<< 5, 40 >>>` kernel0: total 200 threads (5*40) , 10 warps (not 7 warps) 40 threads: 2 warps 0-31 -> warp0, 32-39 -> warp1

SMs are similar to a CPU core. The threads of a thread block execute concurrently on one SM. As thread blocks terminate, new blocks are launched on the vacated multiprocessors. SMs have different cores/units that can execute different types of instructions. For example, they have units that do integer operations, load-store units, units that do single precision floating point operations, and units that do double precision floating point operations. The number of units for each type of operation can vary between different GPUs. Once a thread block is scheduled to an SM, threads in the thread block are further partitioned into warps. A warp consists of 32 consecutive threads, all threads in a warp are executed in Single Instruction Multiple Thread (SIMT) fashion. That is, all threads execute the same instruction, and each thread carries out that operation on its own private data. A threadblock consists of up to 1024 threads. The PTX implementation of a thread block is called CTA “Cooperative Thread Array".

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

A thread block cluster (introduced in Hopper SM90). is a grouping of thread blocks that can cooperate more tightly.

```cpp
Grid
  └── Cluster            ← Group of thread blocks that can sync & share memory
      └── Thread Block   ← blockDim.x * blockDim.y * blockDim.z threads
            └── Warp     ← 32 threads
```

#### Example

cluster_shape = (2, 2, 1)   // 2×2×1 = 4 thread blocks per cluster
gridDim       = (8, 4, 1)   // 32 total thread blocks
blockDim      = (128, 1, 1) // 128 threads per block

Total clusters = 32 / 4 = 8 clusters. Each cluster has 4 thread blocks that can 
- Synchronize using  `_cluster_barrier_arrive() / __cluster_barrier_wait()`
- Share memory - Distributed Shared Memory (DSMEM) allows one block to read another block's shared memory within the cluster
- Coordinate MMA - Multiple CTAs can cooperate on large matrix multiplies


### Warp Scheduling

The GPU is designed to hide memory latency by having multiple warps in flight at any given time. Each clock cycle of GPU can do load/store, and arithmetic operations. The load/store can always be done and don't have to wait for the result of the previous operation. When a warp is waiting for data from memory, the GPU will switch to another warp that is ready to execute. This is why it is important to have enough warps in flight to hide memory latency. If there are not enough warps in flight, the GPU will be idle waiting for data from memory.

Warp schedulers that decide which warp to execute next. At each time, each SM can have up to 64 (may change depending on the architecture) warps in flight but it not necessary all the warps will be active since the SMs in a GPU share resources such as registers and shared memory. **Occupancy** is the ratio of the number of active warps to the max number of active warps. 

Therefore, total number of threads per SM is 64 * 32 = 2048 threads. Also, if a GPU has 80 SMs, the total number of threads that is advised for maximum performarmance is 2048 * 80 = 163840 threads. Generally golden rule, create only 2 warps ~ 8 warps per threadblock.

When a block is deposited on a SM, a number of things happen. Among those are included reservations for the various resources that the block will require. These resources include warp slots, registers, and shared memory, amongst others. The reservation of warp slots on a modern GPU is static, amongst the warp schedulers. If a SM has 4 warp schedulers, the warps from a newly deposited block will be statically allocated amongst the 4 warp schedulers. If there is no other activity on the SM at that point, we would presume that the warps would be evenly divided. Static here means that warp ownership does not move from one warp scheduler to another warp scheduler during the lifetime of the warp.

 <!-- Also, 1024 threads (32 warps) are assigned to one SM. Two SMs (64 warps) is possible at the maximum. -->

<!-- Kernel <<< 8, 1024>>> () One or two SMs can run even if your GPU has 4 SMs
Kernel <<< 8, 256>>> () 4 SMs can run simultaneously -->

## Memory types

<img src="../../images/cuda_memory.png" alt="CUDA memory hierarchy showing global, shared, and local memory" style="max-width: 550px; display: block; margin: 0 auto;">

### Global Memory

### Shared Memory


### Memory access and coleascing

The GPU supports 32B, 64B and 128B memory accesses instructions from GMEM. It makes sense to use the 128B ld instruction to make optimal use of GPU memory bandwidth.

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

### Bank Conflicts

Shared memory is divided into 32 banks. Each succesive word (4 bytes/ 32 bits, which could be a 32 bit int, float, etc) in stored different bank upto bank the last bank (32), so $word_32$ in in $bank_0$. Each bank can read or write one 32-bit word per clock cycle. If multiple threads in the same warp access the same bank, a bank conflict occurs. This means that the bank has to serialize the accesses, which can slow down the memory access. On the contrary, if each thread in a warp access the same word, it will be broadcasted to all the threads.

Although if threads from different warps in the same block read from the same bank, conflict does not occur.
[Video on Bank Conflicts](https://www.youtube.com/watch?v=CZgM3DEBplE)

### Tensor Memory

N.B: The consumer Blackwell architecture (compute capability 12.0) differs from the data center Blackwell architecture (compute capability 10.0) in some major ways, notably lacking Tensor Memory.

The 5th generation TensorCore has dedicated on-chip memory that is specialized for use by TensorCore operations. This Tensor Memory is organized as a two-dimensional matrix where the horizontal rows are called lanes and the vertical columns are called columns. On architecture sm_100a, the 5th generation TensorCore’s Tensor Memory has a two-dimensional structure of 512 columns and 128 rows per CTA, with each cell being 32-bits in size.

TMEM is allocated dynamically using the `tcgen05.alloc` instruction. Furthermore, allocation is in units of columns, so in particular every lane of a column is allocated when a column is allocated. The number of columns allocated must be a power of 2 and at least 32. Finally, TMEM must be explicitly deallocated with `tcgen05.dealloc`. Both tcgen05.alloc and `tcgen05.dealloc` must be called from a single warp, and the same warp should both allocate and deallocate. Note that the tcgen05.alloc instruction stores the base 32-bit address of the allocation to a given location in shared memory. The TMEM base address should then be set as the offset to the accumulator tensor for the UMMA, as we show below. Typically, data gets into TMEM via UMMA operations, and is explicitly moved out to registers using tcgen05.ld for post-processing. It’s also possible for threads to manually load data into TMEM, either from SMEM through tcgen05.cp or from registers through `tcgen05.st`. However, TMEM access patterns for explicit load and store are very restricted. Each warp within a warpgroup can only access 32 lanes (with warp 0 associated to lanes 0-31, warp 1 to lanes 32-63, and so forth). Additionally, both the UMMA operation and the data movement operations expect certain data layouts. Luckily for us, CUTLASS provides utility functions that we’ll cover later that simplify the process of organizing data via swizzling. That said, those interested can find the layout information in the PTX guide. Finally, besides UMMA operations and these data movement instructions, no other operations access data from TMEM. In other words, all pre-processing must happen before the data is loaded onto TMEM, and all post-processing must happen after the data is retrieved out of TMEM. Operand A can be in TMEM or SMEM, Operand B must be in SMEM and Accumulator must be in TMEM

### Register File

---

### Moving data between memory types

One of the ways to move data from GMEM to SMEM is to read from GMEM to thread register and then to store to SMEM. Recent architectures have specialized instructions for the same such as `ldmatrix` in Ampere which we will look in a later section. Loading from SMEM to TMEM can be done using ...


## Reduction (Sum of elements in a vector)

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

https://developer.download.nvidia.com/assets/cuda/files/reduction.pdf


## General Matrix-Matrix multiplication (GEMM) 

<!-- Add simple CUDA code and diagrams for all sections -->

It can be defined $$C = \alpha A B + \beta C$$ 
Although on the surface level, multiplying two matrices is one of the simplest algoritms but it starts to show its beauty as you dig deep into it and try to parallelize the algoritm. [Simons blog on GMEM](https://siboehm.com/articles/22/CUDA-MMM) is a must read to understand the depth of a seeming simple task of multiplying two matmuls efficiently. A follow up blog by Pranjal about [Outperforming cuBLAS on H100](https://cudaforfun.substack.com/p/outperforming-cublas-on-h100-a-worklog#footnote-2-152317396) and [related video] (https://www.youtube.com/watch?v=ErTmTCRP1_U) is great to dive deeper into using Tensor cores.

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

<!-- Expand -->

While using shared memory approach with BLOCK_SIZE of 32, we load 32x32 elements from both A and B into smem As and Bs. What if we load 64x8 and 8x64 elements from A and B resp. Now the tile size of C being computed is 64x64. Which means we can compute more elements per elements in SMEM. Also this allows us to use a single thread for more (8 times) work. Here each warp computes 32 x 8 elements.

### 2D Blocktiling

<!-- To Add -->

### Tensor Cores

Ampere introduced specially hardware to multiply matrices called Tensor cores. 
In Ampere, the tensor core instructions are excuted by at wrap ( PTX mma.sync) instructions and are warp-synchronous: all 32 threads participate in the instruction. Each thread contributes part of the operand “fragments” (held in registers) and receives part of the result fragment. Let us take the example of the mma atom of `mma.sync.aligned.m16n8k8.row.col.f32.bf16.bf16.f32`. 

It computes a tile GEMM of shape $M=16, N=8, K=8$:
$$
D_{16\times 8} ;=; A_{16\times 8} \times B_{8\times 8} ;+; C_{16\times 8}
$$

- `row.col`: A is treated as row-major (rows are contiguous along K) and B is treated as column-major (columns are contiguous along K)
- `f32.bf16.bf16.f32`: data types of D, A, B, C in order
- `sync`: warp-synchronous—threads wait until all lanes execute the same MMA before continuing
- `aligned`:all 32 lanes must execute the same instruction (no divergence); otherwise behavior is undefined

The inputs/output data from the tensor core is stored in thread registers as follows:

- `A fragment`: 2 registers of type `f16x2` -> 4 bf16 elements (packed 2-per-32b reg)
- `B fragment`: 1 register of type `f16x2` -> 2 bf16 elements
- `C fragment`: 4 `f32` registers -> 4 fp32 accum elements
- `D fragment`: 4 `f32` registers output (same per-thread footprint as C).

### A minimal PTX-style shape of the instruction

This is essentially the example pattern shown in the PTX ISA docs (note: BF16 fragments are still carried in `f16x2` packing).

```ptx
// Per-thread registers (each lane has its own)
.reg .f16x2 a<2>;     // A fragment: 2 regs, each packs 2 bf16 => 4 bf16 total
.reg .f16x2 b<1>;     // B fragment: 1 reg, packs 2 bf16 => 2 bf16 total
.reg .f32   c<4>;     // C fragment: 4 fp32 accum values
.reg .f32   d<4>;     // D fragment: 4 fp32 outputs

mma.sync.aligned.m16n8k8.row.col.f32.bf16.bf16.f32
  {d0, d1, d2, d3},
  {a0, a1},
  {b0},
  {c0, c1, c2, c3};
```

<!-- print using cute like https://yang-yifan.github.io/blogs/mma_swizzle/figures/mma_layout.svg -->

The Tensor core expects data to be in the SMEM from where it is loaded into the registers using `ldmatrix` instructions.
Let us directly understand using an example load atom `ldmatrix.sync.aligned.m8n8.x1.shared.b16`.

It `collectively loads` (at warp granularity) `one 8×8 matrix of 16-bit elements` from `shared memory` into `per-thread registers`, in exactly the register-fragment layout expected by `mma.sync` consumers. So each row is $8 \times 2\text{B} = 16\text{B}$, and the whole tile is $8 \times 16\text{B} = 128\text{B}$. 

- `m8n8`: load an `8×8` matrix of `16-bit` elements. 
- `x1`: load `one` such matrix (as opposed to `.x2` or `.x4`). 
- `shared`: the address operand `p` is in `shared memory`; if generic addressing is used and the address doesn’t fall in `.shared`, behavior is undefined. 
- `b16`: the matrix elements are `16-bit`. 
- `sync.aligned`: this is a `warp-collective` load “across all threads in a warp.” 


Conceptually, the warp needs `8 row-start addresses` (one per row). 

- `Rows don’t have to be stored contiguously` in memory. 
* For `.x1`, those 8 addresses (`addr0..addr7`) are `provided by threads 0–7` (one per thread). Each address corresponds to the start of a matrix row. 

### What comes out (register fragments per thread)

For `.m8n8.x1.b16`:

* Each thread receives a `fragment` in its destination register `r` (type `.b32`). The official examples show `.reg .b32 d; ... ldmatrix ... {d}, [addr];`. 
- `A group of 4 consecutive threads loads 16 bytes` — i.e., `one entire row (16B)` at a time. This implies each thread in that 4-thread group gets `4 bytes`, which for `.b16` is `two 16-bit elements` in its `.b32` register. 
* The doc also states: “Each thread in a warp loads fragments of a row, with thread 0 receiving the first fragment in its register `r`, and so on.” 

### Alignment requirement

Because `4 threads collectively load 16 bytes`, “the matrix addresses must be naturally aligned accordingly” (i.e., row-start alignment must match the 16B row transaction). 

### A minimal PTX-style shape of the instruction

```ptx
// Per-thread registers (each lane has its own)
.reg .b64 addr;   // shared-memory address (generic or shared)
.reg .b32 d;      // destination fragment: 1x 32-bit register per lane for .x1

// Load one 8x8 matrix of 16-bit elements from shared memory into warp-distributed regs
ldmatrix.sync.aligned.m8n8.x1.shared::cta.b16 {d}, [addr];
```


## Swizzling

I recommend reading the [excellent blog by Yifan Yang](https://yang-yifan.github.io/blogs/mma_swizzle/mma_swizzle.html#6-how-transposed-input-is-handled) blog to understand swizzling. This section is basically a quick summary of the blog.

Swizzling refers to arranging the data in the SMEM in a manner to avoid bank conflits while reading or writing data from SMEM. 

<img src="https://yang-yifan.github.io/blogs/mma_swizzle/figures/swizzle_none_k.png" alt="Swizzle pattern for shared memory" style="max-width: 600px; display: block; margin: 0 auto;">

For the Tensor core instruction requires 8 x 16B data from GMEM which can be loaded into the SMEM using threads // check if any other way// and fed into the tensor core using the above `ldmatrix` instruction. This works well since there are no bank conflicts in this case. Thread 0 loads from 32bits bank 0, thread 1 from bank 1, and so on till thread 31 from bank31. 

This works well but notice that while loading from GMEM we load 8 chunks of 16B contiguous memory, which means 8 load instructions, whereas GPUs support up to 128B contiguous load. Also since loading from GMEM has a very high latency as compared loading from L2, SMEM or registers, we would like to load larger chunks.

But if we load 8 chunks of 32B contigous memory and store them in SMEM contiguously, we will have bank conflicts while reading from SMEM. 

Now we will have multiple 2 way bank conflicts since both thread0 and thread16 will read from bank 0 and same for every $\text{thread}\_i$ and $\text{thread}\_{i+16}$ . If we add a 32B swizzling, we avoid bank conflicts.
<img src="https://yang-yifan.github.io/blogs/mma_swizzle/figures/why_swizzle.png" alt="Swizzle pattern for shared memory" style="max-width: 800px; display: block; margin: 0 auto;">

```copied
A new concept called 16B atomicity. This is saying for a 16B chunk that is contiguous in GMEM, it’s also contiguous in SMEM after swizzling. Our 16B chunk organization is exactly that. Even though the chunk orders are swizzled in SMEM, the data within each chunk still remains contiguous. All swizzle layout by default uses 16B atomicity. There are exceptions with swizzle 128B layout which could allow 32B/64B atomicity (i.e. chunk size is 32B/64B instead of 16B). But for simplicity we ignore them in this blog.
```


- [Programming Tensor Cores in CUDA 9](https://developer.nvidia.com/blog/programming-tensor-cores-cuda-9/)
- [Intro to Tensor Cores Video](https://www.youtube.com/watch?v=Yt1A-vaWTck)
- [CUDA Mode Video on Tensor Cores](https://www.youtube.com/watch?v=hQ9GPnV0-50&t=3968s)


<!-- ### Ping-Pong -->

<!-- For Ping-Pong, each warp group takes on a specialized role of either Data producer or Data consumer. The producer warp group focuses on producing data movement to fill the shared memory buffers (via TMA). Two other warp groups are dedicated consumers that process the math (MMA) portion with tensor cores, and then do any follow up work and write their results back to global memory (epilogue)

The producer can feed data to Tensor cores of Consumers. While one consumer is using the Tensor cores for Main Loop (MMA), the other can work on Epilogue which uses the CUDA cores. Thereby maximizing the utilization of Tensor cores -->

## Architecture Comparison

| Category                | Feature                             |    A100 (Ampere) | H100 (Hopper) | B100 (Blackwell) | B200 (Blackwell) |
| ----------------------- | ----------------------------------- | ---------------: | ------------: | ---------------: | ---------------: |
| **Compute / SM**        | Tensor Core generation              |          3rd Gen |       4th Gen |          5th Gen |          5th Gen |
|                         | FP32 cores / SM                     |               64 |           128 |              128 |              128 |
|                         | FP64 cores / SM                     |               32 |            64 |               64 |               64 |
|                         | INT32 cores / SM                    |               64 |            64 |              64* |              64* |
|                         | SM count *(check)*                  |              108 |           132 |              140 |              148 |
| **Scheduling / Limits** | Max resident warps / SM             |               64 |            64 |               64 |               64 |
|                         | Register file / SM (32-bit regs)    |           65,536 |        65,536 |           65,536 |           65,536 |
|                         | Max registers / thread              |              255 |           255 |              255 |              255 |
|                         | Max threads / block                 |             1024 |          1024 |             1024 |             1024 |
|                         | Max threads / SM                    |             2048 |          2048 |             2048 |             2048 |
|                         | Max thread blocks / SM              |               32 |            32 |               32 |               32 |
| **On-chip memory**      | L1/Texture + Shared (combined) / SM |           192 KB |        256 KB |           256 KB |           256 KB |
|                         | Shared memory capacity / SM (max)   |           164 KB |        228 KB |           228 KB |           228 KB |
|                         | Max shared / thread block (opt-in)  |                — |        227 KB |           227 KB |           227 KB |
|                         | Tensor Memory / SM                  |                — |        —      |           256 KB |           256 KB |
| **HBM / Bandwidth**     | Total memory                        | 40 / 80 GB HBM2e |    80 GB HBM3 |     192 GB HBM3e |     192 GB HBM3e |
|                         | Memory bandwidth *(check  one way)* |     1.6–2.0 TB/s |     3.35 TB/s |        ~8.0 TB/s |         8.0 TB/s |
| **Numeric formats**     | FP8 support                         |               No |           Yes |              Yes |              Yes |
|                         | FP4 / FP6 support                   |               No |            No |              Yes |              Yes |
| **Interconnect**        | NVLink                              |    v3 (600 GB/s) | v4 (900 GB/s) |    v5 (1.8 TB/s) |    v5 (1.8 TB/s) |
| **Power / Silicon**     | TDP (max) *(check)*                 |            400 W |         700 W |            700 W |           1000 W |
|                         | Transistor count *(check)*          |              54B |           80B |             208B |             208B |


Notice that **Scheduling / Limits** have not changed across generations.

## Blackwell 

[GTC video on CuTe for Blackwell](https://www.nvidia.com/en-us/on-demand/session/gtc25-s72720/)

[Tuning guide for Blackwell](https://docs.nvidia.com/cuda/blackwell-tuning-guide/index.html)

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

### GEMM flow

Full GEMM: (Gemm_M × Gemm_N) output, iterating over Gemm_K
    │
Cluster Tile: Multiple CTAs in a cluster TOGETHER compute a larger tile
    │          Size: (cluster_M × MmaTile_M) × (cluster_N × MmaTile_N)
CTA Tile: Each CTA within the cluster computes its portion
    │      Size: MmaTile_M × MmaTile_N (one CTA's responsibility)

MMA Atom: The hardware instruction (tcgen05.mma)
            Size: e.g., 64×256×16 for SM100

So the relationship is:
| Level | What computes it | Size |
|---|---|---|
| Full output | Entire grid | Gemm_M × Gemm_N |
| Cluster tile | 1 cluster (multiple CTAs) | (cluster_M × MmaTile_M) × (cluster_N × MmaTile_N) |
| CTA tile | 1 CTA (thread block) | MmaTile_M × MmaTile_N |
| MMA atom | 1 MMA instruction | ~64×256×16 |

Example:

cluster_shape = (2, 1, 1)   // 2 CTAs per cluster in M
MmaTile_M = 128, MmaTile_N = 256

// One CLUSTER handles: (2 × 128) × (1 × 256) = 256 × 256 output tile
// Each CTA in the cluster handles: 128 × 256 (half the M dimension)

The cluster doesn't work on ONE MMA tile together - rather, multiple CTAs in a cluster each handle their own MMA tile, but they can share data via distributed shared memory and synchronize.

### Loading from SMEM in Blackwell

GPU Memory controller can issue upto 128B load from SMEM in a single cycle. Also in Blackwell it loads 8x2 tile of 128bit elements each from shared memory. The 8 rows x 128b = 128B which does not cross the 128B boundary. So if not using any swizzling and for K Major order, we can arrange the elements in SMEM like:

0, 1, 2, 3 ...
4, 5, 6, 7 ...
... ... ... ...
28, 29, 30, 31 ....
... ... ... ...

### Sync operations

[Blog on sync operations](https://medium.com/@fatlip/cuda-sync-co-b475c3dbd57f)


### Load tiles into SMEM using TMA

Load BMxBK and BKxBN tiles from 64x64 fp16 (8192B) tiles from GMEM to SMEM. TMA and tensor cores operates on "core matrices" which are 8x16B of data which for half is 8x8 tile of data. Which means we need to load (64/8)x(64/8) == (8x8) core matrices. While loading data in SMEM we need to keep in mind that it will be fed to Tensor cores (tcgen05) which expects the data in a certain format. TMA can load a column of 8 core matrices (1024B) (8,1) at a time which means to load 8192B we load 8 times. Use `Tcgen05.mma` instruction and store the results in TMEM. Move results from TMEM to registers and finally to GMEM



## References & Recommended resources

- [Articles by colfax research](https://research.colfax-intl.com/blog/)
- [CUDA Training Series by NVIDIA and OLCF](https://www.olcf.ornl.gov/cuda-training-series/)
- [CUDA Training Series YouTube Playlist](https://www.youtube.com/playlist?app=desktop&list=PL6RdenZrxrw-zNX7uuGppWETdxt_JxdMj)
- [CUDA Training Exercises](https://github.com/olcf/cuda-training-series/tree/master/exercises)
- [Introduction to CUDA Programming Video](https://www.youtube.com/watch?v=HOVvQfcBMTQ)
- [CUDA Mode Discord Lectures](https://github.com/cuda-mode/lectures)
- [NVIDIA CUDA C Programming Guide](https://docs.nvidia.com/cuda/cuda-c-programming-guide/index.html#compute-capability)
- Programming Massively Parallel Processors Book by David B. Kirk and Wen-mei W. Hwu 4th Edition