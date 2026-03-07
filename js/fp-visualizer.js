'use strict';

// ============================================================
// FP Visualizer – UI rendering, canvas drawing, controls, init
// Depends on: fp-formats.js (FORMAT_DEFS, visibility, helpers)
//             fp-decoder.js (TABLES, DTYPE_STATS, pickNearest, classifyAndFields)
// ============================================================

// ---------- Bit display ----------
function renderBitDisplay(bitString, signBits, expBits, mantBits) {
  let html = '<div class="fp-bit-display">';
  let idx = 0;
  for (let i = 0; i < signBits; i++, idx++) {
    html += `<span class="fp-bit fp-bit-sign">${bitString[idx]}</span>`;
  }
  for (let i = 0; i < expBits; i++, idx++) {
    html += `<span class="fp-bit fp-bit-exp">${bitString[idx]}</span>`;
  }
  for (let i = 0; i < mantBits; i++, idx++) {
    html += `<span class="fp-bit fp-bit-mant">${bitString[idx]}</span>`;
  }
  html += '</div>';
  html += '<div class="fp-bit-legend">';
  html += '<span><span style="color:#ef4444">S</span>ign</span>';
  html += '<span><span style="color:#3b82f6">E</span>xp</span>';
  html += '<span><span style="color:#22c55e">M</span>ant</span>';
  html += '</div>';
  return html;
}

// ---------- UI ----------
const el = (id) => document.getElementById(id);
const xInput = el('xInput');
const xSlider = el('xSlider');
const sliderSpan = el('sliderSpan');
const zoomSpan = el('zoomSpan');
const decimalsSel = el('decimals');
const propsTableEl = el('propsTable');
const canvas = el('map');
const warnEl = el('warn');
const listsEl = el('lists');
const sliderValEl = el('sliderVal');
const legendEl = el('legend');
const zoomInBtn = el('zoomIn');
const zoomOutBtn = el('zoomOut');
const zoomLabelEl = el('zoomLabel');
const ctx = canvas.getContext('2d');

let currentCenter = 1.0;

// ---------- Legend as toggles ----------
function buildLegend() {
  legendEl.innerHTML = '';
  for (const def of FORMAT_DEFS) {
    const btn = document.createElement('button');
    btn.className = 'fp-legend-toggle' + (visibility[def.key] ? '' : ' off');
    btn.dataset.key = def.key;
    btn.innerHTML = `<span class="fp-swatch" style="background:var(--${def.key}-color)"></span>${def.title}`;
    btn.addEventListener('click', () => {
      visibility[def.key] = !visibility[def.key];
      btn.classList.toggle('off', !visibility[def.key]);
      updateAll();
    });
    legendEl.appendChild(btn);
  }
  const xSpan = document.createElement('span');
  xSpan.className = 'fp-mono';
  xSpan.style.marginLeft = 'auto';
  xSpan.textContent = 'dashed line = x';
  legendEl.appendChild(xSpan);
}

// ---------- Combined properties table ----------
function renderPropsTable(x, dec) {
  propsTableEl.innerHTML = '';
  const results = {};
  const visibleDefs = FORMAT_DEFS.filter(d => visibility[d.key]);

  if (visibleDefs.length === 0) return results;

  const data = [];
  for (const def of visibleDefs) {
    const q = pickNearest(TABLES[def.key], x, def);
    results[def.key] = q;
    const qv = q.value;
    const absErr = (Number.isNaN(x) || Number.isNaN(qv)) ? NaN : Math.abs(x - qv);
    const relErr = (Number.isNaN(absErr) || x === 0 || !Number.isFinite(x)) ? NaN : absErr / Math.abs(x);
    const binInfo = computeLocalBinInfo(TABLES[def.key], q);
    const bStr = binStr(q.bits, def.bits);
    const fields = classifyAndFields(q.bits, def);
    data.push({ def, q, qv, absErr, relErr, binInfo, bStr, fields });
  }

  let html = '<table><thead><tr><th>Property</th>';
  for (const d of data) {
    html += `<th><span class="fp-dtype-dot" style="background:${d.def.solidColor}"></span>${d.def.title}</th>`;
  }
  html += '</tr></thead><tbody>';

  const colCount = data.length + 1;

  function renderRows(rows) {
    for (const row of rows) {
      html += `<tr><td>${row.label}</td>`;
      for (const d of data) html += `<td>${row.fn(d)}</td>`;
      html += '</tr>';
    }
  }

  html += `<tr class="fp-section-row"><td colspan="${colCount}">Quantization of x</td></tr>`;

  renderRows([
    { label: 'value',       fn: d => fmtNumber(d.qv, dec) },
    { label: 'abs error',   fn: d => fmtNumber(d.absErr, dec) },
    { label: 'rel error',   fn: d => Number.isNaN(d.relErr) ? '\u2014' : d.relErr.toExponential(3) },
    { label: 'bin (x\u2192q)', fn: d => `[${fmtNumber(d.binInfo.left, dec)}, ${fmtNumber(d.binInfo.right, dec)})` },
    { label: 'prev / next', fn: d => `${d.binInfo.prev ? fmtNumber(d.binInfo.prev.value, dec) : '\u2014'} / ${d.binInfo.next ? fmtNumber(d.binInfo.next.value, dec) : '\u2014'}` },
  ]);

  html += `<tr class="fp-section-row"><td colspan="${colCount}">Format</td></tr>`;

  renderRows([
    { label: 'Total bits',       fn: d => d.def.bits },
    { label: 'Exponent bits',    fn: d => d.def.expBits },
    { label: 'Mantissa bits',    fn: d => d.def.mantBits },
    { label: 'Exponent bias',    fn: d => d.def.bias },
    { label: 'Max finite',       fn: d => fmtNumber(DTYPE_STATS[d.def.key].maxVal, 4) },
    { label: 'Min finite',       fn: d => fmtNumber(DTYPE_STATS[d.def.key].minVal, 4) },
    { label: 'Smallest normal',  fn: d => DTYPE_STATS[d.def.key].smallestNormal.toExponential(2) },
    { label: 'Smallest subnorm', fn: d => DTYPE_STATS[d.def.key].smallestSub.toExponential(2) },
    { label: 'Epsilon (2^-m)',   fn: d => DTYPE_STATS[d.def.key].eps.toExponential(2) },
    { label: 'Has Inf',          fn: d => d.def.hasInf ? 'yes' : 'no' },
    { label: 'Has NaN',          fn: d => d.def.hasNaN ? 'yes' : 'no' },
    { label: 'Finite values',    fn: d => DTYPE_STATS[d.def.key].totalFinite },
  ]);

  html += `<tr class="fp-section-row"><td colspan="${colCount}">Encoding</td></tr>`;

  html += '<tr><td>bits</td>';
  for (const d of data) {
    html += `<td>${renderBitDisplay(d.bStr, d.def.signBits, d.def.expBits, d.def.mantBits)}</td>`;
  }
  html += '</tr>';

  renderRows([
    { label: 'hex',         fn: d => hex(d.q.bits, d.def.hexWidth) },
    { label: 'class',       fn: d => d.fields.cls },
    { label: 'fields',      fn: d => `s=${d.fields.sign} e=${d.fields.exp} m=${d.fields.mant}` },
  ]);

  html += '</tbody></table>';
  propsTableEl.innerHTML = html;

  return results;
}

// ---------- Parse / slider ----------
function safeParseNumber(s) {
  const t = (s || '').trim();
  if (t === '') return NaN;
  if (/^[-+]?inf(inity)?$/i.test(t)) return t.startsWith('-') ? -Infinity : Infinity;
  if (/^nan$/i.test(t)) return NaN;
  return Number(t);
}

function updateSliderRange() {
  const span = Number(sliderSpan.value);
  xSlider.min = String(currentCenter - span);
  xSlider.max = String(currentCenter + span);
  const step = span / 5000;
  xSlider.step = String(step === 0 ? 1e-12 : step);
}

function syncSliderToX(x) {
  if (!Number.isFinite(x)) return;
  currentCenter = x;
  updateSliderRange();
  xSlider.value = String(x);
  sliderValEl.textContent = x.toPrecision(6);
}

function computeLocalBinInfo(table, q) {
  if (Number.isNaN(q.value)) {
    return { left: NaN, right: NaN, prev: null, next: null };
  }
  const arr = table.entries;
  const idx = lowerBound(arr, q.value);
  let i = idx;
  if (i < arr.length && cmpNum(arr[i].value, q.value) === 0) {
    let j = i;
    while (j > 0 && cmpNum(arr[j-1].value, q.value) === 0) j--;
    let k = i;
    while (k < arr.length && cmpNum(arr[k].value, q.value) === 0) k++;
    let found = -1;
    for (let t = j; t < k; t++) {
      if (arr[t].bits === q.bits) { found = t; break; }
    }
    i = found !== -1 ? found : j;
  } else if (i > 0 && cmpNum(arr[i-1].value, q.value) === 0) {
    i = i - 1;
  }

  const prev = (i > 0) ? arr[i-1] : null;
  const next = (i < arr.length - 1) ? arr[i+1] : null;
  return {
    left: prev ? midpoint(prev.value, q.value) : -Infinity,
    right: next ? midpoint(q.value, next.value) : Infinity,
    prev, next,
  };
}

// ---------- Canvas ----------
function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);
}

function getThemeColors() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  return {
    text: isDark ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.75)',
    textMuted: isDark ? 'rgba(255,255,255,0.50)' : 'rgba(0,0,0,0.40)',
    grid: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
    baseLine: isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.12)',
    tick: isDark ? 'rgba(255,255,255,0.30)' : 'rgba(0,0,0,0.25)',
    xLine: isDark ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.80)',
    highlight: isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.85)',
    fp4:      isDark ? 'rgba(255, 100, 130, 0.45)' : 'rgba(255, 80, 110, 0.35)',
    fp8e4m3:  isDark ? 'rgba(255, 170, 80, 0.40)'  : 'rgba(255, 150, 50, 0.35)',
    fp8e5m2:  isDark ? 'rgba(200, 120, 255, 0.40)' : 'rgba(180, 100, 235, 0.35)',
    fp16:     isDark ? 'rgba(90, 160, 255, 0.35)'  : 'rgba(60, 130, 235, 0.35)',
    bf16:     isDark ? 'rgba(90, 220, 150, 0.35)'  : 'rgba(60, 190, 120, 0.35)',
  };
}

function drawMap(x, span, dec, q) {
  resizeCanvas();

  const lo = x - span;
  const hi = x + span;
  const rect = canvas.getBoundingClientRect();
  const W = rect.width;
  const H = rect.height;
  const padL = 70, padR = 20, padT = 18, padB = 26;

  const colors = getThemeColors();
  ctx.clearRect(0, 0, W, H);

  // Grid
  ctx.save();
  ctx.strokeStyle = colors.grid;
  ctx.lineWidth = 1;
  for (let i = 0; i <= 10; i++) {
    const xg = padL + (W - padL - padR) * (i / 10);
    ctx.beginPath(); ctx.moveTo(xg, padT); ctx.lineTo(xg, H - padB); ctx.stroke();
  }
  ctx.restore();

  function xToPx(v) {
    if (v === -Infinity) return padL;
    if (v === Infinity) return W - padR;
    return padL + (W - padL - padR) * ((v - lo) / (hi - lo));
  }

  // Build visible tracks
  const visibleDefs = FORMAT_DEFS.filter(d => visibility[d.key] && q[d.key]);
  const trackCount = visibleDefs.length;
  if (trackCount === 0) return;

  const trackSpacing = (H - padT - padB) / (trackCount + 1);
  const tracks = visibleDefs.map((def, i) => ({
    key: def.key,
    label: def.title,
    y: padT + trackSpacing * (i + 1),
    color: colors[def.key],
    q: q[def.key],
  }));

  let downsampled = false;
  const MAX_SEGS = 2200;

  for (const t of tracks) {
    const table = TABLES[t.key];
    const arr = table.entries;
    const s0 = Math.max(0, lowerBound(arr, lo) - 1);
    const s1 = Math.min(arr.length - 1, upperBound(arr, hi) + 1);

    const segs = [];
    for (let i = s0; i <= s1; i++) {
      const v = arr[i].value;
      const left = (i > 0) ? midpoint(arr[i-1].value, v) : -Infinity;
      const right = (i < arr.length - 1) ? midpoint(v, arr[i+1].value) : Infinity;
      const L = Math.max(left, lo);
      const R = Math.min(right, hi);
      if (!(R > L)) continue;
      segs.push({ i, bits: arr[i].bits, value: v, L, R });
    }

    let drawSegs = segs;
    if (segs.length > MAX_SEGS) {
      downsampled = true;
      const stride = Math.ceil(segs.length / MAX_SEGS);
      drawSegs = [];
      for (let i = 0; i < segs.length; i += stride) drawSegs.push(segs[i]);
      const qb = t.q.bits;
      if (!drawSegs.some(s => s.bits === qb)) {
        const exact = segs.find(s => s.bits === qb);
        if (exact) drawSegs.push(exact);
      }
      drawSegs.sort((a,b) => a.L - b.L);
    }

    // Track label
    ctx.save();
    ctx.fillStyle = colors.text;
    ctx.font = '11px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
    ctx.fillText(t.label, 12, t.y - 22);
    ctx.restore();

    // Base line
    ctx.save();
    ctx.strokeStyle = colors.baseLine;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(padL, t.y); ctx.lineTo(W - padR, t.y); ctx.stroke();
    ctx.restore();

    // Bins
    for (const s of drawSegs) {
      const x0 = xToPx(s.L);
      const x1 = xToPx(s.R);
      const w = Math.max(1, x1 - x0);
      ctx.save();
      ctx.fillStyle = t.color;
      ctx.fillRect(x0, t.y - 14, w, 20);
      if (s.bits === t.q.bits) {
        ctx.strokeStyle = colors.highlight;
        ctx.lineWidth = 2;
        ctx.strokeRect(x0 + 0.5, t.y - 14 + 0.5, w - 1, 20 - 1);
      }
      ctx.restore();
    }

    // Ticks
    const maxTicks = 40;
    let ticks = [];
    for (const s of segs) {
      const px = xToPx(s.value);
      if (px >= padL && px <= W - padR) ticks.push({ px, value: s.value, bits: s.bits });
    }
    if (ticks.length > maxTicks) {
      const stride = Math.ceil(ticks.length / maxTicks);
      const sampled = [];
      for (let i = 0; i < ticks.length; i += stride) sampled.push(ticks[i]);
      const qTick = ticks.find(tt => tt.bits === t.q.bits);
      if (qTick && !sampled.some(tt => tt.bits === t.q.bits)) sampled.push(qTick);
      sampled.sort((a,b) => a.px - b.px);
      ticks = sampled;
    }

    ctx.save();
    ctx.strokeStyle = colors.tick;
    ctx.lineWidth = 1;
    for (const tt of ticks) {
      ctx.beginPath(); ctx.moveTo(tt.px + 0.5, t.y + 8); ctx.lineTo(tt.px + 0.5, t.y + 16); ctx.stroke();
    }
    ctx.restore();

    // Labels near x
    const labelCount = Math.min(5, ticks.length);
    const sortedByDist = [...ticks].sort((a,b) => Math.abs(a.px - xToPx(x)) - Math.abs(b.px - xToPx(x)));
    const labels = sortedByDist.slice(0, labelCount).sort((a,b) => a.px - b.px);
    ctx.save();
    ctx.fillStyle = colors.text;
    ctx.font = '9px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
    for (const tt of labels) {
      const txt = fmtNumber(tt.value, dec);
      const tw = ctx.measureText(txt).width;
      ctx.fillText(txt, Math.max(padL, Math.min(tt.px - tw / 2, W - padR - tw)), t.y - 18);
    }
    ctx.restore();
  }

  // x vertical line
  const xpx = xToPx(x);
  ctx.save();
  ctx.strokeStyle = colors.xLine;
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 4]);
  ctx.beginPath(); ctx.moveTo(xpx + 0.5, padT); ctx.lineTo(xpx + 0.5, H - padB); ctx.stroke();
  ctx.restore();

  // x label
  ctx.save();
  ctx.fillStyle = colors.xLine;
  ctx.font = 'bold 11px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
  const xLabel = 'x=' + fmtNumber(x, dec);
  const xLabelW = ctx.measureText(xLabel).width;
  ctx.fillText(xLabel, Math.max(padL, Math.min(xpx - xLabelW / 2, W - padR - xLabelW)), padT - 4);
  ctx.restore();

  // Axis labels
  ctx.save();
  ctx.fillStyle = colors.textMuted;
  ctx.font = '11px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
  ctx.fillText(fmtNumber(lo, dec), padL, H - 8);
  const hiTxt = fmtNumber(hi, dec);
  ctx.fillText(hiTxt, W - padR - ctx.measureText(hiTxt).width, H - 8);
  ctx.restore();

  warnEl.style.display = downsampled ? 'block' : 'none';
}

// ---------- Lists (multi-column) ----------
function renderLists(x, span, dec) {
  const lo = x - span;
  const hi = x + span;
  listsEl.innerHTML = '';

  for (const def of FORMAT_DEFS) {
    if (!visibility[def.key]) continue;

    const table = TABLES[def.key];
    const arr = table.entries;
    const i0 = Math.max(0, lowerBound(arr, lo));
    const i1 = Math.min(arr.length, upperBound(arr, hi));
    const slice = arr.slice(i0, i1);
    const maxEntries = 200;

    let lines;
    if (slice.length === 0) {
      lines = ['(none in window)'];
    } else if (slice.length <= maxEntries) {
      lines = slice.map(e => fmtNumber(e.value, dec));
    } else {
      const stride = Math.ceil(slice.length / maxEntries);
      const sampled = [];
      for (let i = 0; i < slice.length; i += stride) sampled.push(slice[i]);
      lines = sampled.map(e => fmtNumber(e.value, dec));
      lines.push(`\u2026 ${slice.length} total`);
    }

    const div = document.createElement('div');
    div.innerHTML = `
      <div class="fp-list-header"><span class="fp-dtype-dot" style="background:${def.solidColor}"></span>${def.title}<span class="fp-list-count">${slice.length}</span></div>
      <pre class="fp-list-pre">${lines.join('\n')}</pre>
    `;
    listsEl.appendChild(div);
  }
}

// ---------- Main update ----------
function updateAll() {
  const x = safeParseNumber(xInput.value);
  const dec = Number(decimalsSel.value);
  const zspan = Number(zoomSpan.value);

  const q = renderPropsTable(x, dec);

  if (Number.isFinite(x)) {
    drawMap(x, zspan, dec, q);
    renderLists(x, zspan, dec);
  } else {
    resizeCanvas();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    listsEl.innerHTML = '';
  }
}

// ---------- Zoom controls on canvas ----------
function getZoomIndex() {
  return zoomSpan.selectedIndex;
}

function setZoomIndex(idx) {
  const clamped = Math.max(0, Math.min(zoomSpan.options.length - 1, idx));
  zoomSpan.selectedIndex = clamped;
  syncZoomLabel();
  updateAll();
}

function syncZoomLabel() {
  const opt = zoomSpan.options[zoomSpan.selectedIndex];
  zoomLabelEl.textContent = '\u00b1' + opt.text;
}

zoomInBtn.addEventListener('click', () => setZoomIndex(getZoomIndex() - 1));
zoomOutBtn.addEventListener('click', () => setZoomIndex(getZoomIndex() + 1));

// ---------- Events ----------
xInput.addEventListener('input', () => {
  const x = safeParseNumber(xInput.value);
  if (Number.isFinite(x)) syncSliderToX(x);
  updateAll();
});

xSlider.addEventListener('input', () => {
  const v = Number(xSlider.value);
  xInput.value = String(v);
  sliderValEl.textContent = v.toPrecision(6);
  updateAll();
});

sliderSpan.addEventListener('change', () => {
  updateSliderRange();
  const x = safeParseNumber(xInput.value);
  if (Number.isFinite(x)) {
    xSlider.value = String(Math.max(Number(xSlider.min), Math.min(Number(xSlider.max), x)));
  }
  updateAll();
});

decimalsSel.addEventListener('change', updateAll);

// Redraw on theme change
new MutationObserver(() => updateAll())
  .observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

window.addEventListener('resize', updateAll);

// ---------- Init ----------
buildLegend();
syncZoomLabel();
syncSliderToX(1.0);
updateAll();
