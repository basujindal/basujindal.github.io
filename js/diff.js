const text1 = document.getElementById('text1');
const text2 = document.getElementById('text2');
const diffOutput = document.getElementById('diff-output');
const addedCount = document.getElementById('added-count');
const removedCount = document.getElementById('removed-count');
const unchangedCount = document.getElementById('unchanged-count');
const charDiffToggle = document.getElementById('char-diff-toggle');

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

    if (!text1.value && !text2.value) {
        diffOutput.innerHTML = '<div class="line line-unchanged">Paste text in both panels to see the diff...</div>';
        addedCount.textContent = '0';
        removedCount.textContent = '0';
        unchangedCount.textContent = '0';
        return;
    }

    const diff = lcs(lines1, lines2);

    let added = 0, removed = 0, unchanged = 0;
    let html = '';

    if (useCharDiff) {
        // Group consecutive removed and added lines for pairing
        let i = 0;
        while (i < diff.length) {
            if (diff[i].type === 'unchanged') {
                const displayValue = escapeHtml(diff[i].value) || ' ';
                html += `<div class="line line-unchanged">  ${displayValue}</div>`;
                unchanged++;
                i++;
            } else {
                // Collect consecutive removed and added
                const removedLines = [];
                const addedLines = [];

                while (i < diff.length && diff[i].type === 'removed') {
                    removedLines.push(diff[i].value);
                    i++;
                }
                while (i < diff.length && diff[i].type === 'added') {
                    addedLines.push(diff[i].value);
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
                        html += `<div class="line line-removed">- ${displayValue}</div>`;
                        removed++;
                    }
                });

                // Render paired lines with character diff
                pairs.forEach(pair => {
                    const charDiffHtml = renderCharDiff(pair.removed, pair.added);
                    html += `<div class="line line-modified">~ ${charDiffHtml || ' '}</div>`;
                    removed++;
                    added++;
                });

                // Render unpaired added lines
                addedLines.forEach((line, idx) => {
                    if (!pairedAdded.has(idx)) {
                        const displayValue = escapeHtml(line) || ' ';
                        html += `<div class="line line-added">+ ${displayValue}</div>`;
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
                html += `<div class="line line-added">+ ${displayValue}</div>`;
                added++;
            } else if (item.type === 'removed') {
                html += `<div class="line line-removed">- ${displayValue}</div>`;
                removed++;
            } else {
                html += `<div class="line line-unchanged">  ${displayValue}</div>`;
                unchanged++;
            }
        });
    }

    diffOutput.innerHTML = html || '<div class="line line-unchanged">No differences found</div>';
    addedCount.textContent = added;
    removedCount.textContent = removed;
    unchangedCount.textContent = unchanged;
}

// Debounce for performance
let timeout;
function debouncedDiff() {
    clearTimeout(timeout);
    timeout = setTimeout(computeDiff, 150);
}

text1.addEventListener('input', debouncedDiff);
text2.addEventListener('input', debouncedDiff);
charDiffToggle.addEventListener('change', computeDiff);
