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

// Track diff-only mode state
let isDiffOnlyMode = false;

// Swap original and modified text
function swapTexts() {
    const temp = text1.value;
    text1.value = text2.value;
    text2.value = temp;
    computeDiff();
}

swapBtn.addEventListener('click', swapTexts);
swapBtnFs.addEventListener('click', swapTexts);

// Sync toggles between main and fullscreen toolbars
function syncToggles(source, target) {
    target.checked = source.checked;
}

lineNumbersToggle.addEventListener('change', () => {
    syncToggles(lineNumbersToggle, lineNumbersToggleFs);
    updateLineNumbersMode();
    clearTimeout(timeout);
    computeDiff();
});

lineNumbersToggleFs.addEventListener('change', () => {
    syncToggles(lineNumbersToggleFs, lineNumbersToggle);
    updateLineNumbersMode();
    clearTimeout(timeout);
    computeDiff();
});

charDiffToggle.addEventListener('change', () => {
    syncToggles(charDiffToggle, charDiffToggleFs);
    // Turn off inline mode and show diff panel when char diff is enabled
    if (charDiffToggle.checked && inlineDiffToggle.checked) {
        handleViewDiff();
        return;
    }
    clearTimeout(timeout);
    computeDiff();
});

charDiffToggleFs.addEventListener('change', () => {
    syncToggles(charDiffToggleFs, charDiffToggle);
    // Turn off inline mode and show diff panel when char diff is enabled
    if (charDiffToggleFs.checked && inlineDiffToggleFs.checked) {
        handleViewDiff();
        return;
    }
    clearTimeout(timeout);
    computeDiff();
});

// Inline diff toggle
function updateInlineMode() {
    if (inlineDiffToggle.checked) {
        document.body.classList.add('inline-diff-mode');
        // Show the text panels when inline mode is enabled
        document.querySelector('[data-panel="original"]').classList.remove('hidden');
        document.querySelector('[data-panel="modified"]').classList.remove('hidden');
    } else {
        document.body.classList.remove('inline-diff-mode');
    }
}

// Line numbers toggle for inline mode
function updateLineNumbersMode() {
    if (lineNumbersToggle.checked) {
        document.body.classList.add('show-line-numbers');
    } else {
        document.body.classList.remove('show-line-numbers');
    }
}

inlineDiffToggle.addEventListener('change', () => {
    syncToggles(inlineDiffToggle, inlineDiffToggleFs);
    updateInlineMode();
    clearTimeout(timeout);
    computeDiff();
});

inlineDiffToggleFs.addEventListener('change', () => {
    syncToggles(inlineDiffToggleFs, inlineDiffToggle);
    updateInlineMode();
    clearTimeout(timeout);
    computeDiff();
});

// Initialize inline mode on load
updateInlineMode();
updateLineNumbersMode();

// Sync textarea scroll with overlay and gutter
text1.addEventListener('scroll', () => {
    text1Overlay.scrollTop = text1.scrollTop;
    text1Overlay.scrollLeft = text1.scrollLeft;
    text1Gutter.scrollTop = text1.scrollTop;
});

text2.addEventListener('scroll', () => {
    text2Overlay.scrollTop = text2.scrollTop;
    text2Overlay.scrollLeft = text2.scrollLeft;
    text2Gutter.scrollTop = text2.scrollTop;
});

// View Diff toggle - toggles between diff-only and all-three-panels view
function toggleDiffOnlyMode() {
    isDiffOnlyMode = !isDiffOnlyMode;

    if (isDiffOnlyMode) {
        // Turn off inline mode to show the diff panel
        inlineDiffToggle.checked = false;
        inlineDiffToggleFs.checked = false;
        updateInlineMode();

        // Hide the original and modified text panels
        document.querySelector('[data-panel="original"]').classList.add('hidden');
        document.querySelector('[data-panel="modified"]').classList.add('hidden');

        // Mark toggle as active
        diffOnlyToggle.classList.add('active');
        diffOnlyToggle.querySelector('.toggle-label').textContent = 'Show All';
    } else {
        // Show the original and modified text panels
        document.querySelector('[data-panel="original"]').classList.remove('hidden');
        document.querySelector('[data-panel="modified"]').classList.remove('hidden');

        // Mark toggle as inactive
        diffOnlyToggle.classList.remove('active');
        diffOnlyToggle.querySelector('.toggle-label').textContent = 'Diff Only';
    }

    clearTimeout(timeout);
    computeDiff();
}

// Legacy function for char diff toggle compatibility
function handleViewDiff() {
    if (!isDiffOnlyMode) {
        toggleDiffOnlyMode();
    } else {
        clearTimeout(timeout);
        computeDiff();
    }
}

diffOnlyToggle.addEventListener('click', toggleDiffOnlyMode);

// Fullscreen toggle
function enterFullscreen() {
    document.body.classList.add('diff-fullscreen');
}

function exitFullscreen() {
    document.body.classList.remove('diff-fullscreen');
}

fullscreenBtn.addEventListener('click', enterFullscreen);
exitFullscreenBtn.addEventListener('click', exitFullscreen);

// Exit fullscreen with Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.body.classList.contains('diff-fullscreen')) {
        exitFullscreen();
    }
});

// Longest Common Subsequence for arrays (lines or characters)
function lcs(a, b) {
    const m = a.length;
    const n = b.length;
    const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (a[i - 1] === b[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1] + 1;
            } else {
                dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
            }
        }
    }

    // Backtrack to find the diff
    const diff = [];
    let i = m, j = n;

    while (i > 0 || j > 0) {
        if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
            diff.unshift({ type: 'unchanged', value: a[i - 1] });
            i--;
            j--;
        } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
            diff.unshift({ type: 'added', value: b[j - 1] });
            j--;
        } else {
            diff.unshift({ type: 'removed', value: a[i - 1] });
            i--;
        }
    }

    return diff;
}

// Character-level diff between two strings
function charDiff(str1, str2) {
    const chars1 = str1.split('');
    const chars2 = str2.split('');
    return lcs(chars1, chars2);
}

// Escape HTML special characters
function escapeHtml(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

// Render character-level diff as HTML
function renderCharDiff(str1, str2) {
    const diff = charDiff(str1, str2);
    let html = '';

    diff.forEach(item => {
        const escaped = escapeHtml(item.value);
        if (item.type === 'added') {
            html += `<span class="char-added">${escaped}</span>`;
        } else if (item.type === 'removed') {
            html += `<span class="char-removed">${escaped}</span>`;
        } else {
            html += `<span class="char-unchanged">${escaped}</span>`;
        }
    });

    return html;
}

// Find similar line pairs for character diff
function findSimilarPairs(removed, added) {
    const pairs = [];
    const usedAdded = new Set();

    removed.forEach((remLine, remIdx) => {
        let bestMatch = -1;
        let bestScore = 0;

        added.forEach((addLine, addIdx) => {
            if (usedAdded.has(addIdx)) return;

            // Calculate similarity score (common characters / max length)
            const common = lcs(remLine.split(''), addLine.split('')).filter(d => d.type === 'unchanged').length;
            const maxLen = Math.max(remLine.length, addLine.length);
            const score = maxLen > 0 ? common / maxLen : 0;

            if (score > bestScore && score > 0.3) { // 30% similarity threshold
                bestScore = score;
                bestMatch = addIdx;
            }
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
    const showLineNumbers = lineNumbersToggle.checked;
    // Compute line-level diff for overlay rendering
    const lineDiff = lcs(lines1, lines2);

    // Build arrays to track status for each line
    const status1 = new Array(lines1.length).fill('unchanged');
    const status2 = new Array(lines2.length).fill('unchanged');
    const pairMap1 = {}; // Maps line index in lines1 to pair info
    const pairMap2 = {}; // Maps line index in lines2 to pair info

    let idx1 = 0, idx2 = 0;
    let i = 0;

    while (i < lineDiff.length) {
        if (lineDiff[i].type === 'unchanged') {
            idx1++;
            idx2++;
            i++;
        } else {
            // Collect consecutive removed and added
            const removedLines = [];
            const removedIdxs = [];
            const addedLines = [];
            const addedIdxs = [];

            while (i < lineDiff.length && lineDiff[i].type === 'removed') {
                removedLines.push(lineDiff[i].value);
                removedIdxs.push(idx1);
                status1[idx1] = 'removed';
                idx1++;
                i++;
            }
            while (i < lineDiff.length && lineDiff[i].type === 'added') {
                addedLines.push(lineDiff[i].value);
                addedIdxs.push(idx2);
                status2[idx2] = 'added';
                idx2++;
                i++;
            }

            // Find similar pairs for character-level diff (only used when char diff is enabled)
            if (charDiffToggle.checked) {
                const pairs = findSimilarPairs(removedLines, addedLines);

                pairs.forEach(pair => {
                    const remIdx = removedIdxs[pair.remIdx];
                    const addIdx = addedIdxs[pair.addIdx];
                    status1[remIdx] = 'modified';
                    status2[addIdx] = 'modified';
                    pairMap1[remIdx] = { removed: pair.removed, added: pair.added };
                    pairMap2[addIdx] = { removed: pair.removed, added: pair.added };
                });
            }
        }
    }

    // Render original text overlay (text1) - no line numbers in overlay
    let overlay1Html = '';
    lines1.forEach((line, idx) => {
        if (idx > 0) overlay1Html += '\n';

        if (status1[idx] === 'removed') {
            // Entire line is removed - highlight the whole line
            overlay1Html += `<span class="inline-line-removed">${escapeHtml(line)}</span>`;
        } else if (status1[idx] === 'modified' && pairMap1[idx]) {
            // Line is modified - show line background with character-level diff
            overlay1Html += `<span class="inline-line-removed">${renderInlineCharDiff(pairMap1[idx].removed, pairMap1[idx].added, 'original')}</span>`;
        } else {
            // Unchanged line
            overlay1Html += `<span class="inline-text">${escapeHtml(line)}</span>`;
        }
    });
    text1Overlay.innerHTML = overlay1Html || '<span class="inline-placeholder">Paste original text here...</span>';

    // Render modified text overlay (text2) - no line numbers in overlay
    let overlay2Html = '';
    lines2.forEach((line, idx) => {
        if (idx > 0) overlay2Html += '\n';

        if (status2[idx] === 'added') {
            // Entire line is added - highlight the whole line
            overlay2Html += `<span class="inline-line-added">${escapeHtml(line)}</span>`;
        } else if (status2[idx] === 'modified' && pairMap2[idx]) {
            // Line is modified - show line background with character-level diff
            overlay2Html += `<span class="inline-line-added">${renderInlineCharDiff(pairMap2[idx].removed, pairMap2[idx].added, 'modified')}</span>`;
        } else {
            // Unchanged line
            overlay2Html += `<span class="inline-text">${escapeHtml(line)}</span>`;
        }
    });
    text2Overlay.innerHTML = overlay2Html || '<span class="inline-placeholder">Paste modified text here...</span>';

    // Render line numbers in gutters (separate from overlay)
    if (showLineNumbers) {
        let gutter1Html = '';
        for (let i = 1; i <= lines1.length; i++) {
            gutter1Html += `<div>${i}</div>`;
        }
        text1Gutter.innerHTML = gutter1Html || '<div>1</div>';

        let gutter2Html = '';
        for (let i = 1; i <= lines2.length; i++) {
            gutter2Html += `<div>${i}</div>`;
        }
        text2Gutter.innerHTML = gutter2Html || '<div>1</div>';
    }

    // Ensure overlay scroll height matches textarea scroll height
    syncOverlayHeight(text1, text1Overlay);
    syncOverlayHeight(text2, text2Overlay);

    // Sync scroll positions after overlay update
    text1Overlay.scrollTop = text1.scrollTop;
    text1Overlay.scrollLeft = text1.scrollLeft;
    text1Gutter.scrollTop = text1.scrollTop;
    text2Overlay.scrollTop = text2.scrollTop;
    text2Overlay.scrollLeft = text2.scrollLeft;
    text2Gutter.scrollTop = text2.scrollTop;
}

// Ensure overlay scroll height matches textarea scroll height
function syncOverlayHeight(textarea, overlay) {
    // Remove any existing spacer
    const existingSpacer = overlay.querySelector('.overlay-spacer');
    if (existingSpacer) existingSpacer.remove();

    // After a brief delay to let the browser render, check if heights match
    requestAnimationFrame(() => {
        const textareaScrollHeight = textarea.scrollHeight;
        const overlayScrollHeight = overlay.scrollHeight;

        if (textareaScrollHeight > overlayScrollHeight) {
            // Add a spacer to make overlay match textarea height
            const spacer = document.createElement('div');
            spacer.className = 'overlay-spacer';
            spacer.style.height = (textareaScrollHeight - overlayScrollHeight) + 'px';
            overlay.appendChild(spacer);
        }
    });
}

// Render character-level diff for inline mode
function renderInlineCharDiff(str1, str2, side) {
    const diff = charDiff(str1, str2);
    let html = '';

    diff.forEach(item => {
        const escaped = escapeHtml(item.value);
        if (item.type === 'added') {
            // Only show added chars in modified side
            if (side === 'modified') {
                html += `<span class="inline-added">${escaped}</span>`;
            }
        } else if (item.type === 'removed') {
            // Only show removed chars in original side
            if (side === 'original') {
                html += `<span class="inline-removed">${escaped}</span>`;
            }
        } else {
            html += `<span class="inline-text">${escaped}</span>`;
        }
    });

    return html;
}

// Debounce for performance
let timeout;
function debouncedDiff() {
    clearTimeout(timeout);
    timeout = setTimeout(computeDiff, 50);
}

// Immediately update overlay to show text while typing (prevents delay)
function updateOverlayImmediate(textarea, overlay, gutter) {
    if (inlineDiffToggle.checked) {
        const showLineNumbers = lineNumbersToggle.checked;
        // Show plain text immediately to prevent typing lag
        const lines = textarea.value.split('\n');
        let html = '';
        lines.forEach((line, idx) => {
            if (idx > 0) html += '\n';
            html += `<span class="inline-text">${escapeHtml(line)}</span>`;
        });
        overlay.innerHTML = html || '<span class="inline-placeholder">Paste text here...</span>';

        // Update gutter if line numbers are shown
        if (showLineNumbers && gutter) {
            let gutterHtml = '';
            for (let i = 1; i <= lines.length; i++) {
                gutterHtml += `<div>${i}</div>`;
            }
            gutter.innerHTML = gutterHtml || '<div>1</div>';
        }

        // Ensure overlay scroll height matches textarea
        syncOverlayHeight(textarea, overlay);

        // Sync scroll
        overlay.scrollTop = textarea.scrollTop;
        overlay.scrollLeft = textarea.scrollLeft;
        if (gutter) gutter.scrollTop = textarea.scrollTop;
    }
}

text1.addEventListener('input', () => {
    updateOverlayImmediate(text1, text1Overlay, text1Gutter);
    debouncedDiff();
});
text2.addEventListener('input', () => {
    updateOverlayImmediate(text2, text2Overlay, text2Gutter);
    debouncedDiff();
});

