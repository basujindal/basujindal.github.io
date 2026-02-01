const text1 = document.getElementById('text1');
const text2 = document.getElementById('text2');
const text1Overlay = document.getElementById('text1-overlay');
const text2Overlay = document.getElementById('text2-overlay');
const text1Gutter = document.getElementById('text1-gutter');
const text2Gutter = document.getElementById('text2-gutter');
const diffOutput = document.getElementById('diff-output');
const addedCount = document.getElementById('added-count');
const removedCount = document.getElementById('removed-count');
const unchangedCount = document.getElementById('unchanged-count');
const charDiffToggle = document.getElementById('char-diff-toggle');
const lineNumbersToggle = document.getElementById('line-numbers-toggle');
const inlineDiffToggle = document.getElementById('inline-diff-toggle');
const fullscreenBtn = document.getElementById('fullscreen-btn');
const exitFullscreenBtn = document.getElementById('exit-fullscreen-btn');
const swapBtn = document.getElementById('swap-btn');
const swapBtnFs = document.getElementById('swap-btn-fs');
const lineNumbersToggleFs = document.getElementById('line-numbers-toggle-fs');
const charDiffToggleFs = document.getElementById('char-diff-toggle-fs');
const inlineDiffToggleFs = document.getElementById('inline-diff-toggle-fs');
const diffOnlyToggle = document.getElementById('diff-only-toggle');

let isDiffOnlyMode = false;
let timeout;

// Swap texts
function swapTexts() {
    [text1.value, text2.value] = [text2.value, text1.value];
    computeDiff();
}
swapBtn.addEventListener('click', swapTexts);
swapBtnFs.addEventListener('click', swapTexts);

// Sync paired toggles
function syncToggle(a, b, callback) {
    const handler = (src, tgt) => () => {
        tgt.checked = src.checked;
        callback?.();
        clearTimeout(timeout);
        computeDiff();
    };
    a.addEventListener('change', handler(a, b));
    b.addEventListener('change', handler(b, a));
}

function updateInlineMode() {
    document.body.classList.toggle('inline-diff-mode', inlineDiffToggle.checked);
    if (inlineDiffToggle.checked) {
        document.querySelector('[data-panel="original"]').classList.remove('hidden');
        document.querySelector('[data-panel="modified"]').classList.remove('hidden');
    }
}

function updateLineNumbersMode() {
    document.body.classList.toggle('show-line-numbers', lineNumbersToggle.checked);
}

syncToggle(lineNumbersToggle, lineNumbersToggleFs, updateLineNumbersMode);
syncToggle(inlineDiffToggle, inlineDiffToggleFs, updateInlineMode);

// Char diff toggle with special handling
[charDiffToggle, charDiffToggleFs].forEach((toggle, i) => {
    const other = i === 0 ? charDiffToggleFs : charDiffToggle;
    toggle.addEventListener('change', () => {
        other.checked = toggle.checked;
        if (toggle.checked && inlineDiffToggle.checked) { handleViewDiff(); return; }
        clearTimeout(timeout);
        computeDiff();
    });
});

updateInlineMode();
updateLineNumbersMode();

// Sync textarea scroll with overlay and gutter
function syncScroll(textarea, overlay, gutter) {
    textarea.addEventListener('scroll', () => {
        overlay.scrollTop = textarea.scrollTop;
        overlay.scrollLeft = textarea.scrollLeft;
        gutter.scrollTop = textarea.scrollTop;
    });
}
syncScroll(text1, text1Overlay, text1Gutter);
syncScroll(text2, text2Overlay, text2Gutter);

// View Diff toggle
function toggleDiffOnlyMode() {
    isDiffOnlyMode = !isDiffOnlyMode;
    const panels = [document.querySelector('[data-panel="original"]'), document.querySelector('[data-panel="modified"]')];

    if (isDiffOnlyMode) {
        inlineDiffToggle.checked = inlineDiffToggleFs.checked = false;
        updateInlineMode();
        panels.forEach(p => p.classList.add('hidden'));
        diffOnlyToggle.classList.add('active');
        diffOnlyToggle.querySelector('.toggle-label').textContent = 'Show All';
    } else {
        panels.forEach(p => p.classList.remove('hidden'));
        diffOnlyToggle.classList.remove('active');
        diffOnlyToggle.querySelector('.toggle-label').textContent = 'Diff Only';
    }
    clearTimeout(timeout);
    computeDiff();
}

function handleViewDiff() {
    if (!isDiffOnlyMode) toggleDiffOnlyMode();
    else { clearTimeout(timeout); computeDiff(); }
}

diffOnlyToggle.addEventListener('click', toggleDiffOnlyMode);

// Fullscreen
fullscreenBtn.addEventListener('click', () => document.body.classList.add('diff-fullscreen'));
exitFullscreenBtn.addEventListener('click', () => document.body.classList.remove('diff-fullscreen'));
document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && document.body.classList.contains('diff-fullscreen'))
        document.body.classList.remove('diff-fullscreen');
});

// Longest Common Subsequence for arrays
function lcs(a, b) {
    const m = a.length, n = b.length;
    const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

    for (let i = 1; i <= m; i++)
        for (let j = 1; j <= n; j++)
            dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] + 1 : Math.max(dp[i-1][j], dp[i][j-1]);

    const diff = [];
    let i = m, j = n;
    while (i > 0 || j > 0) {
        if (i > 0 && j > 0 && a[i-1] === b[j-1]) {
            diff.unshift({ type: 'unchanged', value: a[--i] }); j--;
        } else if (j > 0 && (i === 0 || dp[i][j-1] >= dp[i-1][j])) {
            diff.unshift({ type: 'added', value: b[--j] });
        } else {
            diff.unshift({ type: 'removed', value: a[--i] });
        }
    }
    return diff;
}

const charDiff = (s1, s2) => lcs(s1.split(''), s2.split(''));
const escapeHtml = text => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function renderCharDiff(str1, str2) {
    return charDiff(str1, str2).map(item => {
        const escaped = escapeHtml(item.value);
        const cls = item.type === 'added' ? 'char-added' : item.type === 'removed' ? 'char-removed' : 'char-unchanged';
        return `<span class="${cls}">${escaped}</span>`;
    }).join('');
}

// Find similar line pairs for character diff
function findSimilarPairs(removed, added) {
    const pairs = [], usedAdded = new Set();

    removed.forEach((remLine, remIdx) => {
        let bestMatch = -1, bestScore = 0;
        added.forEach((addLine, addIdx) => {
            if (usedAdded.has(addIdx)) return;
            const common = lcs(remLine.split(''), addLine.split('')).filter(d => d.type === 'unchanged').length;
            const score = Math.max(remLine.length, addLine.length) > 0 ? common / Math.max(remLine.length, addLine.length) : 0;
            if (score > bestScore && score > 0.3) { bestScore = score; bestMatch = addIdx; }
        });
        if (bestMatch !== -1) {
            pairs.push({ removed: remLine, added: added[bestMatch], remIdx, addIdx: bestMatch });
            usedAdded.add(bestMatch);
        }
    });
    return pairs;
}

function computeDiff() {
    const lines1 = text1.value ? text1.value.split('\n') : [];
    const lines2 = text2.value ? text2.value.split('\n') : [];
    const useCharDiff = charDiffToggle.checked;
    const showLineNumbers = lineNumbersToggle.checked;
    const useInlineDiff = inlineDiffToggle.checked;

    if (!text1.value && !text2.value) {
        diffOutput.innerHTML = '<div class="line line-unchanged">Paste text in both panels to see the diff...</div>';
        text1Overlay.innerHTML = '<span class="inline-placeholder">Paste original text here...</span>';
        text2Overlay.innerHTML = '<span class="inline-placeholder">Paste modified text here...</span>';
        addedCount.textContent = '0';
        removedCount.textContent = '0';
        unchangedCount.textContent = '0';
        return;
    }

    const diff = lcs(lines1, lines2);

    let added = 0, removed = 0, unchanged = 0;
    let leftLine = 0, rightLine = 0;
    let html = '';

    // Helper to format line number prefix
    const linePrefix = (left, right, symbol) => {
        if (!showLineNumbers) return symbol + ' ';
        const l = left !== null ? String(left).padStart(4) : '    ';
        const r = right !== null ? String(right).padStart(4) : '    ';
        return `<span class="line-number">${l} ${r}</span> ${symbol} `;
    };

    if (useCharDiff) {
        // Group consecutive removed and added lines for pairing
        let i = 0;
        while (i < diff.length) {
            if (diff[i].type === 'unchanged') {
                leftLine++;
                rightLine++;
                const displayValue = escapeHtml(diff[i].value) || ' ';
                html += `<div class="line line-unchanged">${linePrefix(leftLine, rightLine, ' ')}${displayValue}</div>`;
                unchanged++;
                i++;
            } else {
                // Collect consecutive removed and added
                const removedLines = [];
                const addedLines = [];
                const removedIndices = [];
                const addedIndices = [];

                while (i < diff.length && diff[i].type === 'removed') {
                    removedLines.push(diff[i].value);
                    leftLine++;
                    removedIndices.push(leftLine);
                    i++;
                }
                while (i < diff.length && diff[i].type === 'added') {
                    addedLines.push(diff[i].value);
                    rightLine++;
                    addedIndices.push(rightLine);
                    i++;
                }

                // Find similar pairs for inline diff
                const pairs = findSimilarPairs(removedLines, addedLines);
                const pairedRemoved = new Set(pairs.map(p => p.remIdx));
                const pairedAdded = new Set(pairs.map(p => p.addIdx));

                // Render unpaired removed lines
                removedLines.forEach((line, idx) => {
                    if (!pairedRemoved.has(idx)) {
                        const displayValue = escapeHtml(line) || ' ';
                        html += `<div class="line line-removed">${linePrefix(removedIndices[idx], null, '-')}${displayValue}</div>`;
                        removed++;
                    }
                });

                // Render paired lines with character diff
                pairs.forEach(pair => {
                    const charDiffHtml = renderCharDiff(pair.removed, pair.added);
                    html += `<div class="line line-modified">${linePrefix(removedIndices[pair.remIdx], addedIndices[pair.addIdx], '~')}${charDiffHtml || ' '}</div>`;
                    removed++;
                    added++;
                });

                // Render unpaired added lines
                addedLines.forEach((line, idx) => {
                    if (!pairedAdded.has(idx)) {
                        const displayValue = escapeHtml(line) || ' ';
                        html += `<div class="line line-added">${linePrefix(null, addedIndices[idx], '+')}${displayValue}</div>`;
                        added++;
                    }
                });
            }
        }
    } else {
        // Simple line-level diff
        diff.forEach(item => {
            const displayValue = escapeHtml(item.value) || ' ';

            if (item.type === 'added') {
                rightLine++;
                html += `<div class="line line-added">${linePrefix(null, rightLine, '+')}${displayValue}</div>`;
                added++;
            } else if (item.type === 'removed') {
                leftLine++;
                html += `<div class="line line-removed">${linePrefix(leftLine, null, '-')}${displayValue}</div>`;
                removed++;
            } else {
                leftLine++;
                rightLine++;
                html += `<div class="line line-unchanged">${linePrefix(leftLine, rightLine, ' ')}${displayValue}</div>`;
                unchanged++;
            }
        });
    }

    diffOutput.innerHTML = html || '<div class="line line-unchanged">No differences found</div>';
    addedCount.textContent = added;
    removedCount.textContent = removed;
    unchangedCount.textContent = unchanged;

    // Render inline diff overlays
    if (useInlineDiff) {
        renderInlineOverlays(lines1, lines2);
    } else {
        // Just show plain text in overlays when inline mode is off
        text1Overlay.innerHTML = escapeHtml(text1.value) || '';
        text2Overlay.innerHTML = escapeHtml(text2.value) || '';
    }
}

// Render inline diff overlays
function renderInlineOverlays(lines1, lines2) {
    const lineDiff = lcs(lines1, lines2);
    const status1 = new Array(lines1.length).fill('unchanged');
    const status2 = new Array(lines2.length).fill('unchanged');
    const pairMap1 = {}, pairMap2 = {};
    let idx1 = 0, idx2 = 0, i = 0;

    while (i < lineDiff.length) {
        if (lineDiff[i].type === 'unchanged') { idx1++; idx2++; i++; continue; }

        const removedLines = [], removedIdxs = [], addedLines = [], addedIdxs = [];
        while (i < lineDiff.length && lineDiff[i].type === 'removed') {
            removedLines.push(lineDiff[i].value);
            status1[idx1] = 'removed';
            removedIdxs.push(idx1++);
            i++;
        }
        while (i < lineDiff.length && lineDiff[i].type === 'added') {
            addedLines.push(lineDiff[i].value);
            status2[idx2] = 'added';
            addedIdxs.push(idx2++);
            i++;
        }

        if (charDiffToggle.checked) {
            findSimilarPairs(removedLines, addedLines).forEach(pair => {
                const remIdx = removedIdxs[pair.remIdx], addIdx = addedIdxs[pair.addIdx];
                status1[remIdx] = status2[addIdx] = 'modified';
                pairMap1[remIdx] = pairMap2[addIdx] = { removed: pair.removed, added: pair.added };
            });
        }
    }

    const renderOverlay = (lines, status, pairMap, side, placeholder) => {
        const lineClass = side === 'original' ? 'inline-line-removed' : 'inline-line-added';
        return lines.map((line, idx) => {
            if (status[idx] === (side === 'original' ? 'removed' : 'added'))
                return `<span class="${lineClass}">${escapeHtml(line)}</span>`;
            if (status[idx] === 'modified' && pairMap[idx])
                return `<span class="${lineClass}">${renderInlineCharDiff(pairMap[idx].removed, pairMap[idx].added, side)}</span>`;
            return `<span class="inline-text">${escapeHtml(line)}</span>`;
        }).join('\n') || `<span class="inline-placeholder">${placeholder}</span>`;
    };

    text1Overlay.innerHTML = renderOverlay(lines1, status1, pairMap1, 'original', 'Paste original text here...');
    text2Overlay.innerHTML = renderOverlay(lines2, status2, pairMap2, 'modified', 'Paste modified text here...');

    if (lineNumbersToggle.checked) {
        const renderGutter = len => len > 0 ? Array.from({length: len}, (_, i) => `<div>${i + 1}</div>`).join('') : '<div>1</div>';
        text1Gutter.innerHTML = renderGutter(lines1.length);
        text2Gutter.innerHTML = renderGutter(lines2.length);
    }

    syncOverlayHeight(text1, text1Overlay);
    syncOverlayHeight(text2, text2Overlay);
    [text1Overlay, text2Overlay].forEach((o, i) => {
        const t = i === 0 ? text1 : text2, g = i === 0 ? text1Gutter : text2Gutter;
        o.scrollTop = t.scrollTop; o.scrollLeft = t.scrollLeft; g.scrollTop = t.scrollTop;
    });
}

// Ensure overlay scroll height matches textarea
function syncOverlayHeight(textarea, overlay) {
    overlay.querySelector('.overlay-spacer')?.remove();
    requestAnimationFrame(() => {
        const diff = textarea.scrollHeight - overlay.scrollHeight;
        if (diff > 0) {
            const spacer = document.createElement('div');
            spacer.className = 'overlay-spacer';
            spacer.style.height = diff + 'px';
            overlay.appendChild(spacer);
        }
    });
}

// Render character-level diff for inline mode
function renderInlineCharDiff(str1, str2, side) {
    return charDiff(str1, str2).map(item => {
        const escaped = escapeHtml(item.value);
        if (item.type === 'added' && side === 'modified') return `<span class="inline-added">${escaped}</span>`;
        if (item.type === 'removed' && side === 'original') return `<span class="inline-removed">${escaped}</span>`;
        if (item.type === 'unchanged') return `<span class="inline-text">${escaped}</span>`;
        return '';
    }).join('');
}

// Debounce for performance
function debouncedDiff() {
    clearTimeout(timeout);
    timeout = setTimeout(computeDiff, 50);
}

// Immediately update overlay while typing
function updateOverlayImmediate(textarea, overlay, gutter) {
    if (!inlineDiffToggle.checked) return;
    const lines = textarea.value.split('\n');
    overlay.innerHTML = lines.map(line => `<span class="inline-text">${escapeHtml(line)}</span>`).join('\n') || '<span class="inline-placeholder">Paste text here...</span>';

    if (lineNumbersToggle.checked && gutter) {
        gutter.innerHTML = lines.map((_, i) => `<div>${i + 1}</div>`).join('') || '<div>1</div>';
    }
    syncOverlayHeight(textarea, overlay);
    overlay.scrollTop = textarea.scrollTop;
    overlay.scrollLeft = textarea.scrollLeft;
    if (gutter) gutter.scrollTop = textarea.scrollTop;
}

text1.addEventListener('input', () => { updateOverlayImmediate(text1, text1Overlay, text1Gutter); debouncedDiff(); });
text2.addEventListener('input', () => { updateOverlayImmediate(text2, text2Overlay, text2Gutter); debouncedDiff(); });

