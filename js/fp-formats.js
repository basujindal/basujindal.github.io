'use strict';

// ============================================================
// FP Formats – definitions, visibility state, and helpers
// ============================================================

const FORMAT_DEFS = [
  {
    key: 'fp4',     title: 'FP4 E2M1',   solidColor: 'var(--fp4-solid)',
    bits: 4,  signBits: 1, expBits: 2, mantBits: 1, bias: 1,
    hexWidth: 1, hasInf: false, hasNaN: false,
    meta: '1s / 2e / 1m (bias 1)',
  },
  {
    key: 'fp8e4m3', title: 'FP8 E4M3',   solidColor: 'var(--fp8e4m3-solid)',
    bits: 8,  signBits: 1, expBits: 4, mantBits: 3, bias: 7,
    hexWidth: 2, hasInf: false, hasNaN: true,
    meta: '1s / 4e / 3m (bias 7)',
  },
  {
    key: 'fp8e5m2', title: 'FP8 E5M2',   solidColor: 'var(--fp8e5m2-solid)',
    bits: 8,  signBits: 1, expBits: 5, mantBits: 2, bias: 15,
    hexWidth: 2, hasInf: true, hasNaN: true,
    meta: '1s / 5e / 2m (bias 15)',
  },
  {
    // Block-scaled FP8 (OCP Microscaling). Element is FP8 E4M3; a block of 32
    // elements shares one power-of-two E8M0 scale X. Displayed grid = X * E4M3.
    key: 'mxfp8',   title: 'MXFP8 E4M3', solidColor: 'var(--mxfp8-solid)',
    bits: 8,  signBits: 1, expBits: 4, mantBits: 3, bias: 7,
    hexWidth: 2, hasInf: false, hasNaN: true,
    isMX: true, blockEmax: 8, blockSize: 32, scale: 1,
    meta: '1s / 4e / 3m + E8M0 block scale',
  },
  {
    key: 'fp16',    title: 'FP16',        solidColor: 'var(--fp16-solid)',
    bits: 16, signBits: 1, expBits: 5, mantBits: 10, bias: 15,
    hexWidth: 4, hasInf: true, hasNaN: true,
    meta: '1s / 5e / 10m (bias 15)',
  },
  {
    key: 'bf16',    title: 'BF16',        solidColor: 'var(--bf16-solid)',
    bits: 16, signBits: 1, expBits: 8, mantBits: 7, bias: 127,
    hexWidth: 4, hasInf: true, hasNaN: true,
    meta: '1s / 8e / 7m (bias 127)',
  },
];

// Visibility state – all on by default
const visibility = {};
FORMAT_DEFS.forEach(f => visibility[f.key] = true);

// ---------- low-level helpers ----------
function isNegZero(x) { return x === 0 && (1 / x) === -Infinity; }

// MX shared scale (E8M0 — power of two, no mantissa) chosen so the block's
// largest magnitude lands at the top of the element format's range:
//   X = 2^(floor(log2(blockMax)) - blockEmax), clamped to E8M0's exponent range.
function computeMXScale(blockMax, blockEmax) {
  if (!Number.isFinite(blockMax) || blockMax <= 0) return 1;
  let k = Math.floor(Math.log2(blockMax)) - blockEmax;
  k = Math.max(-127, Math.min(127, k));
  return Math.pow(2, k);
}

function cmpNum(a, b) {
  const aNZ = isNegZero(a), bNZ = isNegZero(b);
  if (aNZ && b === 0 && !bNZ) return -1;
  if (bNZ && a === 0 && !aNZ) return 1;
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

function lowerBound(arr, x) {
  let lo = 0, hi = arr.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (cmpNum(arr[mid].value, x) < 0) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

function upperBound(arr, x) {
  let lo = 0, hi = arr.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (cmpNum(arr[mid].value, x) <= 0) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

function midpoint(a, b) {
  if (a === -Infinity || b === Infinity) return a === -Infinity ? -Infinity : Infinity;
  return (a + b) / 2;
}

function fmtNumber(x, decimals) {
  if (Number.isNaN(x)) return 'NaN';
  if (x === Infinity) return '+Inf';
  if (x === -Infinity) return '-Inf';
  if (isNegZero(x)) return '-0';
  const ax = Math.abs(x);
  if (ax !== 0 && (ax >= 1e6 || ax < 1e-5)) {
    return x.toExponential(Math.min(6, decimals));
  }
  return x.toFixed(decimals);
}

function hex(n, width) {
  return '0x' + n.toString(16).toUpperCase().padStart(width, '0');
}

function binStr(n, width) {
  return n.toString(2).padStart(width, '0');
}
