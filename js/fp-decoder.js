'use strict';

// ============================================================
// FP Decoder – minifloat/BF16 decoding, table building, stats
// ============================================================

// ---------- Generic minifloat decoder ----------
function decodeMinifloat(bits, expBits, mantBits, bias, hasInf, hasNaN) {
  const totalBits = 1 + expBits + mantBits;
  const s = (bits >>> (totalBits - 1)) & 1;
  const eMask = (1 << expBits) - 1;
  const mMask = (1 << mantBits) - 1;
  const e = (bits >>> mantBits) & eMask;
  const m = bits & mMask;
  const sign = s ? -1 : 1;
  const eMax = eMask;

  if (e === eMax && hasInf && m === 0) return sign * Infinity;
  if (e === eMax && hasNaN && m !== 0) return NaN;
  if (!hasInf && hasNaN && e === eMax && m === mMask) return NaN;

  if (e === 0) {
    if (m === 0) return s ? -0 : 0;
    return sign * Math.pow(2, 1 - bias) * (m / Math.pow(2, mantBits));
  }
  return sign * Math.pow(2, e - bias) * (1 + m / Math.pow(2, mantBits));
}

const _buf4 = new ArrayBuffer(4);
const _dv4 = new DataView(_buf4);
function decodeBF16(bits16) {
  _dv4.setUint32(0, (bits16 << 16) >>> 0, true);
  return _dv4.getFloat32(0, true);
}

// ---------- Build format tables ----------
function buildTable(def) {
  const entries = [];
  const count = 1 << def.bits;
  for (let bits = 0; bits < count; bits++) {
    let v;
    if (def.key === 'bf16') {
      v = decodeBF16(bits);
    } else {
      v = decodeMinifloat(bits, def.expBits, def.mantBits, def.bias, def.hasInf, def.hasNaN);
    }
    if (Number.isNaN(v)) continue;
    entries.push({ bits, value: v });
  }
  entries.sort((a, b) => cmpNum(a.value, b.value));
  return { entries };
}

const TABLES = {};
FORMAT_DEFS.forEach(def => { TABLES[def.key] = buildTable(def); });

// ---------- Compute dtype stats ----------
function computeDtypeStats(def) {
  const table = TABLES[def.key];
  const entries = table.entries;
  const finiteEntries = entries.filter(e => Number.isFinite(e.value));

  let maxVal = -Infinity, minPos = Infinity, maxNeg = -Infinity, minVal = Infinity;
  let totalFinite = finiteEntries.length;
  let positiveCount = 0;

  for (const e of finiteEntries) {
    const v = e.value;
    if (v > maxVal) maxVal = v;
    if (v < minVal) minVal = v;
    if (v > 0 && v < minPos) minPos = v;
    if (v < 0 && v > maxNeg) maxNeg = v;
    if (v > 0) positiveCount++;
  }

  const smallestSub = minPos === Infinity ? 0 : minPos;
  let smallestNormal = Infinity;
  for (const e of finiteEntries) {
    const v = e.value;
    if (v <= 0) continue;
    const bits = e.bits;
    const exp = (bits >>> def.mantBits) & ((1 << def.expBits) - 1);
    if (exp > 0 && v < smallestNormal) smallestNormal = v;
  }
  if (smallestNormal === Infinity) smallestNormal = smallestSub;

  const eps = Math.pow(2, -def.mantBits);

  return {
    maxVal, minVal, smallestSub, smallestNormal, eps,
    totalBits: def.bits, hasInf: def.hasInf, hasNaN: def.hasNaN,
    totalFinite, positiveCount,
  };
}

const DTYPE_STATS = {};
FORMAT_DEFS.forEach(def => { DTYPE_STATS[def.key] = computeDtypeStats(def); });

// ---------- Quantization ----------
function pickNearest(table, x, def) {
  if (Number.isNaN(x)) {
    if (!def.hasNaN) {
      return { ...table.entries[table.entries.length - 1] };
    }
    const nanBits = ((1 << def.expBits) - 1) << def.mantBits | ((1 << def.mantBits) - 1);
    return { bits: nanBits, value: NaN, special: true };
  }

  if (x === 0) {
    const bits = isNegZero(x) ? (1 << (def.bits - 1)) : 0;
    return { bits, value: isNegZero(x) ? -0 : 0 };
  }

  if (x === Infinity || x === -Infinity) {
    if (!def.hasInf) {
      const e = x > 0 ? table.entries[table.entries.length - 1] : table.entries[0];
      return { ...e };
    }
    const idx = lowerBound(table.entries, x);
    const e = table.entries[Math.min(idx, table.entries.length - 1)];
    return { ...e };
  }

  const arr = table.entries;
  const idx = lowerBound(arr, x);
  const right = (idx < arr.length) ? arr[idx] : null;
  const left = (idx > 0) ? arr[idx - 1] : null;

  if (!left) return { ...right };
  if (!right) return { ...left };

  const dl = Math.abs(x - left.value);
  const dr = Math.abs(right.value - x);

  if (dl < dr) return { ...left };
  if (dr < dl) return { ...right };

  const leftEven = (left.bits & 1) === 0;
  const rightEven = (right.bits & 1) === 0;
  if (leftEven && !rightEven) return { ...left };
  if (rightEven && !leftEven) return { ...right };

  return cmpNum(left.value, right.value) <= 0 ? { ...left } : { ...right };
}

function classifyAndFields(bits, def) {
  const eMask = (1 << def.expBits) - 1;
  const mMask = (1 << def.mantBits) - 1;
  const e = (bits >>> def.mantBits) & eMask;
  const m = bits & mMask;
  const eMax = eMask;
  const sign = (bits >>> (def.bits - 1)) & 1;

  let cls;
  if (def.hasInf && e === eMax && m === 0) cls = 'inf';
  else if (def.hasNaN && e === eMax && m !== 0) cls = 'nan';
  else if (!def.hasInf && def.hasNaN && e === eMax && m === mMask) cls = 'nan';
  else if (e === 0 && m === 0) cls = 'zero';
  else if (e === 0) cls = 'subnormal';
  else cls = 'normal';

  return { sign, exp: e, mant: m, cls };
}
