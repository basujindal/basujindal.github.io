// Japanese Kana flashcards — logic, SRS, progress
(function() {
  const D = window.JP_DATA;
  const STORAGE_KEY = 'jp_kana_progress_v1';
  const $ = (id) => document.getElementById(id);

  // ========== Line-drawn icons (Lucide-style, currentColor) ==========
  const _SVG = (paths) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
  const ICONS = {
    chart:    _SVG('<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>'),
    study:    _SVG('<path d="M2 4h7a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H2z"/><path d="M22 4h-7a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h8z"/>'),
    quiz:     _SVG('<circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12" y2="17.01"/>'),
    match:    _SVG('<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>'),
    words:    _SVG('<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>'),
    flame:    _SVG('<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.4-.5-2-1-3-1-2.1-.2-4 2-6 .5 2.5 2 5 4 6.5s3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.2.4-2.3 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>'),
    star:     _SVG('<polygon points="12 2 15.1 8.3 22 9.3 17 14.1 18.2 21 12 17.8 5.8 21 7 14.1 2 9.3 8.9 8.3 12 2"/>'),
    sparkles: _SVG('<path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/><circle cx="12" cy="12" r="3"/>'),
    target:   _SVG('<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>'),
    bulb:     _SVG('<line x1="9" y1="18" x2="15" y2="18"/><line x1="10" y1="22" x2="14" y2="22"/><path d="M15.1 14c.18-1 .65-1.7 1.4-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.2 1.5 3.5.76.8 1.23 1.5 1.4 2.5"/>'),
    chevron:  _SVG('<polyline points="6 9 12 15 18 9"/>'),
    download: _SVG('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>'),
    refresh:  _SVG('<polyline points="1 4 1 10 7 10"/><path d="M3.5 15a9 9 0 1 0 2.1-9.4L1 10"/>'),
    speaker:  _SVG('<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>'),
    // Word categories
    asterisk: _SVG('<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="8.5" x2="19" y2="15.5"/><line x1="19" y1="8.5" x2="5" y2="15.5"/>'),
    hand:     _SVG('<path d="M18 11V6a2 2 0 1 0-4 0"/><path d="M14 10V4a2 2 0 1 0-4 0v2"/><path d="M10 10.5V6a2 2 0 1 0-4 0v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-6-2.34l-3.6-3.6a2 2 0 1 1 2.83-2.82L7 15"/>'),
    hash:     _SVG('<line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/>'),
    user:     _SVG('<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>'),
    users:    _SVG('<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>'),
    clock:    _SVG('<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>'),
    utensils: _SVG('<path d="M3 2v7a3 3 0 0 0 3 3h2a3 3 0 0 0 3-3V2"/><line x1="7" y1="12" x2="7" y2="22"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3v7"/>'),
    body:     _SVG('<circle cx="12" cy="5" r="2.5"/><path d="M12 8v6"/><path d="M9 11l3 3 3-3"/><path d="M9 21v-7M15 21v-7"/>'),
    box:      _SVG('<path d="M21 16V8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.3 7 12 12 20.7 7"/><line x1="12" y1="22" x2="12" y2="12"/>'),
    pin:      _SVG('<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>'),
    mountain: _SVG('<path d="M22 19l-7-12-3 5-3-3-7 10z"/>'),
    palette:  _SVG('<circle cx="13.5" cy="6.5" r="0.5" fill="currentColor"/><circle cx="17.5" cy="10.5" r="0.5" fill="currentColor"/><circle cx="8.5" cy="7.5" r="0.5" fill="currentColor"/><circle cx="6.5" cy="12.5" r="0.5" fill="currentColor"/><path d="M12 22a10 10 0 1 1 10-10c0 1.7-1.5 3-3 3h-2c-1.7 0-3 1.3-3 3 0 1.4-1 2.5-2.4 2.8a4.5 4.5 0 0 1-3.6-1.3"/>'),
    paw:      _SVG('<circle cx="11" cy="4" r="2"/><circle cx="18" cy="8" r="2"/><circle cx="20" cy="16" r="2"/><circle cx="4" cy="8" r="2"/><circle cx="6" cy="16" r="2"/><path d="M8 22c1-3 3-4 4-4s3 1 4 4"/>'),
    sparkle:  _SVG('<path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6z"/><path d="M19 17l.5-1.5L21 15l-1.5-.5L19 13l-.5 1.5L17 15l1.5.5z"/>'),
    play:     _SVG('<polygon points="5 3 19 12 5 21 5 3"/>'),
  };
  function injectIcons(root) {
    (root || document).querySelectorAll('[data-icon]').forEach(el => {
      const name = el.dataset.icon;
      if (ICONS[name]) el.innerHTML = ICONS[name];
    });
  }

  // ========== State ==========
  const state = {
    script: 'hira',  // hira | kata | both
    mode:   'chart',
    progress: loadProgress(),
    studyQueue: [],
    studyIdx:   0,
    studyFlipped: false,
    quizMode: 'kana2roma',
    quizCard: null,
    quizCorrect: null,
    traceCard: null,
    traceCount: 0,
    factIdx: Math.floor(performance.now() % D.facts.length),
    quoteIdx: Math.floor(performance.now() % D.quotes.length),
    wordCat: 'all',
    wordView: 'quiz',
    wordShowRomaji: false,
    wordQuizCard: null,
    wordQuizCorrect: null,
    trickyView: 'list',
    trickyQuizCard: null,
    trickyQuizCorrect: null,
  };

  // ========== Progress persistence ==========
  function loadProgress() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultProgress();
      const p = JSON.parse(raw);
      return Object.assign(defaultProgress(), p);
    } catch (e) { return defaultProgress(); }
  }
  function defaultProgress() {
    return {
      cards: {},          // char -> { lvl, seen, correct, lastSeen, due }
      streak: 0,
      lastStudyDay: null,
      xp: 0,
      totalCorrect: 0,
      totalSeen: 0,
      reviewedToday: 0,
      reviewedDay: null,
      wordsSeen: {},      // word kana -> 1 (revealed flag)
      version: 1,
    };
  }
  function saveProgress() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.progress)); } catch (e) {}
  }
  function dayKey() {
    const d = new Date();
    return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;
  }
  function getCard(char) {
    if (!state.progress.cards[char]) {
      state.progress.cards[char] = { lvl: 0, seen: 0, correct: 0, lastSeen: 0, due: 0 };
    }
    return state.progress.cards[char];
  }
  function recordAnswer(char, correct, quality) {
    const c = getCard(char);
    c.seen++;
    state.progress.totalSeen++;
    if (correct) {
      c.correct++;
      state.progress.totalCorrect++;
      state.progress.xp += (quality === 'easy' ? 15 : quality === 'good' ? 10 : 5);
      const inc = quality === 'easy' ? 2 : quality === 'good' ? 1 : 1;
      c.lvl = Math.min(5, c.lvl + inc);
    } else {
      c.lvl = Math.max(0, c.lvl - 1);
    }
    c.lastSeen = Date.now();
    const intervals = [60_000, 6*60_000, 10*60_000, 60*60_000, 12*3600_000, 4*24*3600_000, 14*24*3600_000];
    c.due = Date.now() + (intervals[c.lvl] || intervals[intervals.length-1]);

    // Streak
    const dk = dayKey();
    if (state.progress.lastStudyDay !== dk) {
      const yest = new Date(); yest.setDate(yest.getDate()-1);
      const yk = `${yest.getFullYear()}-${yest.getMonth()+1}-${yest.getDate()}`;
      state.progress.streak = state.progress.lastStudyDay === yk ? state.progress.streak + 1 : 1;
      state.progress.lastStudyDay = dk;
    }
    // Reviewed today
    if (state.progress.reviewedDay !== dk) {
      state.progress.reviewedDay = dk;
      state.progress.reviewedToday = 0;
    }
    state.progress.reviewedToday++;

    saveProgress();
    refreshStats();
  }

  // ========== Data accessors ==========
  function activeDeck() {
    const out = [];
    const includes = (key, label) => { D.sets[key].forEach(k => out.push(Object.assign({ script: label }, k))); };
    if (state.script === 'hira' || state.script === 'both') {
      includes('hiraganaBasic', 'hira');
      includes('hiraganaDakuten', 'hira');
    }
    if (state.script === 'kata' || state.script === 'both') {
      includes('katakanaBasic', 'kata');
      includes('katakanaDakuten', 'kata');
    }
    return out;
  }
  function totalKana() { return Object.values(D.sets).reduce((s, a) => s + a.length, 0); }
  function masteredCount() {
    return Object.values(state.progress.cards).filter(c => c.lvl >= 5).length;
  }

  // ========== UI: Stats ==========
  function refreshStats() {
    $('statStreak').textContent = state.progress.streak;
    $('statXp').textContent = state.progress.xp;
    $('statMastered').textContent = masteredCount();
    $('statTotal').textContent = totalKana();
    const acc = state.progress.totalSeen ? Math.round(100 * state.progress.totalCorrect / state.progress.totalSeen) : null;
    $('statAcc').textContent = acc === null ? '—' : acc;
  }
  function bumpStat(id) {
    const el = $(id); if (!el) return;
    el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump');
  }

  // ========== UI: Chart (gojuon layout) ==========
  // Row layout: each entry is [rowLabel, [a, i, u, e, o]] where each cell
  // holds an index into the source array (basic 46 ordered a-o, ka-ko, ...,
  // ya-yo, ra-ro, wa/wo, n) or null for blanks (e.g. yi/ye, wi/wu/we).
  const KANA_LAYOUT_BASIC = [
    ['',  [0,  1,  2,  3,  4]],
    ['k', [5,  6,  7,  8,  9]],
    ['s', [10, 11, 12, 13, 14]],
    ['t', [15, 16, 17, 18, 19]],
    ['n', [20, 21, 22, 23, 24]],
    ['h', [25, 26, 27, 28, 29]],
    ['m', [30, 31, 32, 33, 34]],
    ['y', [35, null, 36, null, 37]],
    ['r', [38, 39, 40, 41, 42]],
    ['w', [43, null, null, null, 44]],
    ['n', [45, null, null, null, null]],
  ];
  const KANA_LAYOUT_DAKUTEN = [
    ['g', [0,  1,  2,  3,  4]],
    ['z', [5,  6,  7,  8,  9]],
    ['d', [10, 11, 12, 13, 14]],
    ['b', [15, 16, 17, 18, 19]],
    ['p', [20, 21, 22, 23, 24]],
  ];

  function renderChart() {
    const root = $('kanaChart');
    // Detach the script filters before clearing so we can re-insert them inline with the first heading
    const filters = document.querySelector('.jp-filters');
    if (filters) filters.remove();
    root.innerHTML = '';
    const showHira = state.script === 'hira' || state.script === 'both';
    const showKata = state.script === 'kata' || state.script === 'both';
    let firstFilters = filters;
    if (showHira) {
      appendChartSection(root, 'Hiragana ひらがな', D.sets.hiraganaBasic, KANA_LAYOUT_BASIC, 'hira', firstFilters);
      firstFilters = null;
      appendChartSection(root, 'Dakuten · Handakuten', D.sets.hiraganaDakuten, KANA_LAYOUT_DAKUTEN, 'hira');
    }
    if (showKata) {
      appendChartSection(root, 'Katakana カタカナ', D.sets.katakanaBasic, KANA_LAYOUT_BASIC, 'kata', firstFilters);
      firstFilters = null;
      appendChartSection(root, 'Dakuten · Handakuten', D.sets.katakanaDakuten, KANA_LAYOUT_DAKUTEN, 'kata');
    }
  }
  function appendChartSection(root, title, dataset, layout, script, inlineFilters) {
    const heading = document.createElement('h3');
    heading.className = 'jp-chart-heading';
    heading.textContent = title;
    if (inlineFilters) {
      const headerRow = document.createElement('div');
      headerRow.className = 'jp-chart-header';
      headerRow.appendChild(heading);
      headerRow.appendChild(inlineFilters);
      root.appendChild(headerRow);
    } else {
      root.appendChild(heading);
    }
    const grid = document.createElement('div');
    grid.className = 'jp-chart-grid';
    // Header row: corner + a/i/u/e/o
    grid.appendChild(makeChartCell('jp-chart-corner', ''));
    ['a', 'i', 'u', 'e', 'o'].forEach(v => grid.appendChild(makeChartCell('jp-chart-collabel', v)));
    // Data rows
    layout.forEach(([label, indices]) => {
      grid.appendChild(makeChartCell('jp-chart-rowlabel', label || '–'));
      indices.forEach(idx => {
        if (idx == null) {
          grid.appendChild(makeChartCell('jp-chart-empty', ''));
        } else {
          const k = dataset[idx];
          const card = getCard(k.c);
          const cell = document.createElement('div');
          cell.className = 'jp-chart-cell';
          cell.dataset.mastery = card.lvl;
          cell.innerHTML = `<span class="jp-mastery-dot"></span>
            <span class="jp-chart-cell-glyph">${k.c}</span>
            <span class="jp-chart-cell-romaji">${k.r}</span>`;
          cell.addEventListener('click', () => openModal(Object.assign({ script }, k)));
          grid.appendChild(cell);
        }
      });
    });
    root.appendChild(grid);
  }
  function makeChartCell(cls, txt) {
    const e = document.createElement('div');
    e.className = cls;
    e.textContent = txt;
    return e;
  }

  // ========== UI: Modal ==========
  function openModal(k) {
    $('modalGlyph').textContent = k.c;
    $('modalRomaji').textContent = k.r;
    $('modalMnemonic').textContent = '';
    $('modalMnemonic').classList.add('hidden');
    $('modalExWord').textContent = k.w + ' (' + k.wr + ')';
    $('modalExMeaning').textContent = k.wm;
    $('modalKanji').classList.add('hidden');
    document.querySelector('.jp-modal-example').style.display = '';
    $('modalSpeak').onclick = () => speak(k.c);
    setupTrace(k.c);
    $('cardModal').classList.remove('hidden');
  }
  function openWordModal(word) {
    $('modalGlyph').textContent = word.w;
    $('modalRomaji').textContent = word.r;
    $('modalMnemonic').textContent = word.m;
    $('modalMnemonic').classList.remove('hidden');
    if (word.k) { $('modalKanji').textContent = word.k; $('modalKanji').classList.remove('hidden'); }
    else $('modalKanji').classList.add('hidden');
    document.querySelector('.jp-modal-example').style.display = 'none';
    $('modalSpeak').onclick = () => speak(word.w);
    $('modalTrace').classList.add('hidden');
    $('cardModal').classList.remove('hidden');
    if (!state.progress.wordsSeen[word.w]) {
      state.progress.wordsSeen[word.w] = 1;
      saveProgress();
      refreshWordsCounter();
      const card = document.querySelector(`.jp-word-card[data-w="${word.w}"]`);
      if (card) card.classList.add('seen');
    }
  }
  function closeModal() { $('cardModal').classList.add('hidden'); }
  document.querySelectorAll('#cardModal [data-close]').forEach(el => el.addEventListener('click', closeModal));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

  // ========== Trace canvas (chart modal) ==========
  function setupTrace(char) {
    const wrap = $('modalTrace');
    const canvas = $('traceCanvas');
    if (!wrap || !canvas) return;
    wrap.classList.remove('hidden');
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const styles = getComputedStyle(document.documentElement);
    const guideColor = styles.getPropertyValue('--text-secondary').trim() || '#999';
    const inkColor = styles.getPropertyValue('--accent').trim() || '#ff8aa3';

    function redrawGuide() {
      ctx.clearRect(0, 0, W, H);
      ctx.strokeStyle = guideColor;
      ctx.globalAlpha = 0.18;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 6]);
      ctx.beginPath();
      ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H);
      ctx.moveTo(0, H / 2); ctx.lineTo(W, H / 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 0.22;
      ctx.fillStyle = guideColor;
      ctx.font = `${Math.floor(W * 0.78)}px "Hiragino Mincho ProN", "Yu Mincho", serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(char, W / 2, H / 2 + W * 0.04);
      ctx.globalAlpha = 1;
    }
    redrawGuide();

    let drawing = false, lastX = 0, lastY = 0;
    function pos(e) {
      const rect = canvas.getBoundingClientRect();
      return {
        x: (e.clientX - rect.left) * (W / rect.width),
        y: (e.clientY - rect.top) * (H / rect.height),
      };
    }
    function start(e) {
      e.preventDefault();
      canvas.setPointerCapture?.(e.pointerId);
      drawing = true;
      const p = pos(e); lastX = p.x; lastY = p.y;
    }
    function move(e) {
      if (!drawing) return;
      const p = pos(e);
      ctx.strokeStyle = inkColor;
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      lastX = p.x; lastY = p.y;
    }
    function end() { drawing = false; }

    canvas.onpointerdown = start;
    canvas.onpointermove = move;
    canvas.onpointerup = end;
    canvas.onpointercancel = end;
    $('traceClear').onclick = redrawGuide;
  }

  // ========== Haptics (mobile only) ==========
  function vibrate(pattern) {
    if (navigator.vibrate) {
      try { navigator.vibrate(pattern); } catch (e) {}
    }
  }
  const HAPTIC_GOOD = 18;
  const HAPTIC_BAD = [16, 60, 16];

  // ========== Audio (Web Speech API) ==========
  let speechReady = false;
  function speak(text) {
    if (!('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'ja-JP';
      u.rate = 0.85;
      u.pitch = 1.05;
      const voices = speechSynthesis.getVoices();
      const jpVoice = voices.find(v => v.lang === 'ja-JP') || voices.find(v => v.lang.startsWith('ja'));
      if (jpVoice) u.voice = jpVoice;
      window.speechSynthesis.speak(u);
    } catch (e) {}
  }
  if ('speechSynthesis' in window) {
    speechSynthesis.onvoiceschanged = () => { speechReady = true; };
  }

  // ========== Study (SRS) ==========
  function buildStudyQueue() {
    const deck = activeDeck();
    // weight by inverse mastery + due-ness
    deck.sort((a, b) => {
      const ca = getCard(a.c), cb = getCard(b.c);
      const ra = (Date.now() > ca.due ? 1 : 0) * 100 + (5 - ca.lvl) * 10 + Math.random() * 5;
      const rb = (Date.now() > cb.due ? 1 : 0) * 100 + (5 - cb.lvl) * 10 + Math.random() * 5;
      return rb - ra;
    });
    state.studyQueue = deck;
    state.studyIdx = 0;
    state.studyFlipped = false;
  }
  function showStudyCard() {
    const k = state.studyQueue[state.studyIdx % state.studyQueue.length];
    state.quizCard = k;
    state.studyFlipped = false;
    $('studyCard').classList.remove('flipped');
    $('studyGlyph').textContent = k.c;
    $('studyRomaji').textContent = k.r;
    $('studyExWord').textContent = k.w + (k.wr === k.w ? '' : ' · ' + k.wr);
    $('studyExMeaning').textContent = k.wm;
    const c = getCard(k.c);
    $('studyMini').textContent = (k.script === 'hira' ? 'ひらがな' : 'カタカナ') + ' · L' + c.lvl;
    // Reset glyph anim
    const g = $('studyGlyph'); g.style.animation = 'none'; void g.offsetWidth; g.style.animation = '';
    updateStudyProgress();
  }
  function updateStudyProgress() {
    $('studyCount').textContent = state.progress.reviewedToday;
    const goal = 20;
    const pct = Math.min(100, (state.progress.reviewedToday / goal) * 100);
    $('studyBar').style.width = pct + '%';
  }
  function studyAnswer(quality) {
    const k = state.quizCard;
    const correct = quality !== 'again';
    recordAnswer(k.c, correct, quality);
    vibrate(correct ? HAPTIC_GOOD : HAPTIC_BAD);
    bumpStat('statXp');
    if (quality === 'easy') burst($('studyCard'));
    state.studyIdx++;
    setTimeout(showStudyCard, 250);
  }

  // ========== Quiz ==========
  function nextQuiz() {
    const fb = $('quizFeedback'); fb.textContent = ''; fb.className = 'jp-quiz-feedback';
    $('quizNext').classList.add('hidden');
    const deck = activeDeck();
    if (deck.length < 4) { $('quizQuestion').textContent = '?'; $('quizOptions').innerHTML = '<p>Need at least 4 kana selected.</p>'; return; }
    // weight selection
    const pool = deck.slice().sort((a, b) => {
      const ca = getCard(a.c), cb = getCard(b.c);
      return (5 - ca.lvl) - (5 - cb.lvl) + (Math.random() - 0.5);
    });
    const q = pool[Math.floor(Math.random() * Math.min(8, pool.length))];
    state.quizCard = q;
    const otherKey = state.quizMode === 'kana2roma' ? 'r' : 'c';
    const promptKey = state.quizMode === 'kana2roma' ? 'c' : 'r';
    $('quizQuestion').textContent = q[promptKey];
    $('quizQuestion').className = 'jp-quiz-question';
    // distractors with same vowel-ish if possible
    const distractors = deck.filter(d => d[otherKey] !== q[otherKey]);
    shuffle(distractors);
    const options = [q, ...distractors.slice(0, 3)];
    shuffle(options);
    state.quizCorrect = q[otherKey];
    const opts = $('quizOptions');
    opts.innerHTML = '';
    options.forEach(o => {
      const btn = document.createElement('button');
      btn.className = 'jp-opt';
      btn.textContent = o[otherKey];
      btn.dataset.value = o[otherKey];
      btn.addEventListener('click', () => answerQuiz(btn, o[otherKey] === q[otherKey]));
      opts.appendChild(btn);
    });
  }
  function answerQuiz(btn, correct) {
    document.querySelectorAll('#quizOptions .jp-opt').forEach(b => {
      b.disabled = true;
      if (b.dataset.value === state.quizCorrect) b.classList.add('correct');
    });
    if (!correct) btn.classList.add('wrong');
    const fb = $('quizFeedback');
    if (correct) {
      fb.textContent = `✓ Correct! ${state.quizCard.c} = ${state.quizCard.r}`;
      fb.className = 'jp-quiz-feedback good';
      $('quizQuestion').classList.add('pulse');
      vibrate(HAPTIC_GOOD);
      window._quizScore = (window._quizScore || 0) + 1;
      window._quizCombo = (window._quizCombo || 0) + 1;
      if (window._quizCombo > 0 && window._quizCombo % 5 === 0) {
        toast(`🔥 ${window._quizCombo}× combo!`);
      }
    } else {
      fb.textContent = `✗ Was ${state.quizCard.c} = ${state.quizCard.r}`;
      fb.className = 'jp-quiz-feedback bad';
      $('quizQuestion').classList.add('shake');
      vibrate(HAPTIC_BAD);
      window._quizCombo = 0;
    }
    $('quizScore').textContent = window._quizScore || 0;
    $('quizCombo').textContent = window._quizCombo || 0;
    recordAnswer(state.quizCard.c, correct, correct ? 'good' : 'again');
    $('quizNext').classList.remove('hidden');
    $('quizNext').focus();
  }

  // ========== Trace mode (draw kana from romaji prompt) ==========
  let _traceBoard = null;
  function ensureTraceBoard() {
    if (_traceBoard) return _traceBoard;
    const canvas = $('traceBoard');
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const styles = getComputedStyle(document.documentElement);
    const inkColor = (styles.getPropertyValue('--accent') || '').trim() || '#525252';
    const guideColor = (styles.getPropertyValue('--text-secondary') || '').trim() || '#999';

    function clearAll(showGuide) {
      ctx.clearRect(0, 0, W, H);
      ctx.strokeStyle = guideColor;
      ctx.globalAlpha = 0.18;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 6]);
      ctx.beginPath();
      ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H);
      ctx.moveTo(0, H / 2); ctx.lineTo(W, H / 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
      if (showGuide) drawFadedGlyph(showGuide);
    }
    function drawFadedGlyph(char) {
      ctx.globalAlpha = 0.18;
      ctx.fillStyle = guideColor;
      ctx.font = `${Math.floor(W * 0.78)}px "Hiragino Mincho ProN", "Yu Mincho", serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(char, W / 2, H / 2 + W * 0.04);
      ctx.globalAlpha = 1;
    }

    let drawing = false, lastX = 0, lastY = 0;
    function pos(e) {
      const rect = canvas.getBoundingClientRect();
      return {
        x: (e.clientX - rect.left) * (W / rect.width),
        y: (e.clientY - rect.top) * (H / rect.height),
      };
    }
    canvas.onpointerdown = e => {
      e.preventDefault();
      canvas.setPointerCapture?.(e.pointerId);
      drawing = true;
      const p = pos(e); lastX = p.x; lastY = p.y;
    };
    canvas.onpointermove = e => {
      if (!drawing) return;
      const p = pos(e);
      ctx.strokeStyle = inkColor;
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      lastX = p.x; lastY = p.y;
    };
    canvas.onpointerup = canvas.onpointercancel = () => { drawing = false; };

    _traceBoard = { canvas, ctx, clearAll, drawFadedGlyph };
    return _traceBoard;
  }

  function nextTrace() {
    const deck = activeDeck();
    if (!deck.length) return;
    const pool = deck.slice().sort((a, b) => {
      const ca = getCard(a.c), cb = getCard(b.c);
      return (5 - ca.lvl) - (5 - cb.lvl) + (Math.random() - 0.5);
    });
    const k = pool[Math.floor(Math.random() * Math.min(8, pool.length))];
    state.traceCard = k;
    $('tracePromptRomaji').textContent = k.r;
    $('traceAnswer').classList.add('hidden');
    $('traceAnswerGlyph').textContent = k.c;
    const board = ensureTraceBoard();
    if (board) board.clearAll(false);
  }
  function revealTrace() {
    const k = state.traceCard;
    if (!k) return;
    const board = ensureTraceBoard();
    if (board) board.drawFadedGlyph(k.c);
    const ans = $('traceAnswer');
    ans.classList.remove('hidden');
    recordAnswer(k.c, true, 'good');
  }
  function advanceTrace() {
    const wasRevealed = !$('traceAnswer').classList.contains('hidden');
    if (state.traceCard && !wasRevealed) {
      // user advanced without revealing — count as a self-reported success
      recordAnswer(state.traceCard.c, true, 'good');
    }
    state.traceCount++;
    $('traceCount').textContent = state.traceCount;
    nextTrace();
  }
  function clearTraceBoard() {
    const board = ensureTraceBoard();
    const revealed = !$('traceAnswer').classList.contains('hidden');
    if (board) board.clearAll(revealed && state.traceCard ? state.traceCard.c : false);
  }

  // ========== Confetti & toast ==========
  function confettiBurst() {
    const colors = ['#ff8aa3','#ffb7c5','#d4a24c','#06b6d4','#84cc16','#fcd34d'];
    const root = $('confetti');
    for (let i = 0; i < 36; i++) {
      const piece = document.createElement('div');
      piece.className = 'confetti-piece';
      piece.style.left = (10 + Math.random() * 80) + '%';
      piece.style.background = colors[Math.floor(Math.random() * colors.length)];
      piece.style.animationDelay = (Math.random() * 0.3) + 's';
      piece.style.transform = 'rotate(' + (Math.random() * 360) + 'deg)';
      root.appendChild(piece);
      setTimeout(() => piece.remove(), 2200);
    }
  }
  function burst(el) {
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const colors = ['#ff8aa3','#ffb7c5','#d4a24c','#84cc16','#fcd34d'];
    const root = $('confetti');
    for (let i = 0; i < 14; i++) {
      const piece = document.createElement('div');
      piece.className = 'confetti-piece';
      piece.style.left = (rect.left + rect.width/2 + (Math.random()-0.5)*rect.width) + 'px';
      piece.style.top = (rect.top + rect.height/2) + 'px';
      piece.style.background = colors[Math.floor(Math.random() * colors.length)];
      piece.style.animationDuration = '1.2s';
      root.appendChild(piece);
      setTimeout(() => piece.remove(), 1300);
    }
  }
  let toastTimer = null;
  function toast(msg) {
    const t = $('toast');
    t.textContent = msg;
    t.classList.add('show');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2400);
  }

  // ========== Helpers ==========
  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // ========== Words mode ==========
  function renderWordCats() {
    const root = $('wordCats');
    root.innerHTML = '';
    D.wordCategories.forEach(cat => {
      const count = cat.id === 'all' ? D.words.length : D.words.filter(w => w.cat === cat.id).length;
      const btn = document.createElement('button');
      btn.className = 'jp-word-cat' + (state.wordCat === cat.id ? ' active' : '');
      btn.dataset.cat = cat.id;
      btn.innerHTML = `<span class="jp-word-cat-icon" data-icon="${cat.icon}"></span><span>${cat.label}</span><span class="jp-word-cat-count">${count}</span>`;
      btn.addEventListener('click', () => {
        state.wordCat = cat.id;
        renderWordCats();
        renderWordGrid();
      });
      root.appendChild(btn);
    });
    injectIcons(root);
  }
  function filteredWords() {
    return state.wordCat === 'all' ? D.words : D.words.filter(w => w.cat === state.wordCat);
  }
  function renderWordGrid() {
    const grid = $('wordGrid');
    grid.innerHTML = '';
    filteredWords().forEach(w => {
      const seen = !!state.progress.wordsSeen[w.w];
      const card = document.createElement('div');
      card.className = 'jp-word-card' + (seen ? ' seen' : '');
      card.dataset.w = w.w;
      card.innerHTML = `
        <div class="jp-wc-kanji">${w.k || ''}</div>
        <div class="jp-wc-kana">${w.w}</div>
        <div class="jp-wc-romaji">${w.r}</div>
        <div class="jp-wc-meaning">${w.m}</div>`;
      card.addEventListener('click', () => openWordModal(w));
      grid.appendChild(card);
    });
    refreshWordsCounter();
  }
  function refreshWordsCounter() {
    const seenCount = Object.keys(state.progress.wordsSeen || {}).length;
    if ($('wordSeen')) $('wordSeen').textContent = seenCount;
    if ($('wordTotal')) $('wordTotal').textContent = D.words.length;
  }
  function setWordView(view) {
    state.wordView = view;
    document.querySelectorAll('[data-wordview]').forEach(p => p.classList.toggle('active', p.dataset.wordview === view));
    $('wordGrid').classList.toggle('hidden', view !== 'browse');
    $('wordCats').classList.toggle('hidden', view !== 'browse');
    $('wordQuizPanel').classList.toggle('hidden', view !== 'quiz');
    if (view === 'quiz') nextWordQuiz();
    if (view === 'browse') renderWordGrid();
  }
  function applyRomajiVisibility() {
    document.body.classList.toggle('hide-romaji', !state.wordShowRomaji);
  }
  function nextWordQuiz() {
    const fb = $('wordQuizFeedback'); fb.textContent = ''; fb.className = 'jp-quiz-feedback';
    $('wordQuizNext').classList.add('hidden');
    const pool = filteredWords();
    if (pool.length < 4) {
      $('wordQuizQuestion').textContent = '?';
      $('wordQuizRomaji').textContent = '';
      $('wordQuizOptions').innerHTML = '<p style="grid-column:1/-1;text-align:center;color:var(--text-secondary);">Pick a category with 4+ words.</p>';
      return;
    }
    const q = pool[Math.floor(Math.random() * pool.length)];
    state.wordQuizCard = q;
    state.wordQuizCorrect = q.m;
    $('wordQuizQuestion').textContent = q.w;
    $('wordQuizRomaji').textContent   = q.r;
    $('wordQuizQuestion').className = 'jp-word-quiz-question';
    const distractors = D.words.filter(o => o.m !== q.m);
    shuffle(distractors);
    const options = [q, ...distractors.slice(0, 3)];
    shuffle(options);
    const opts = $('wordQuizOptions');
    opts.innerHTML = '';
    options.forEach(o => {
      const btn = document.createElement('button');
      btn.className = 'jp-opt';
      btn.textContent = o.m;
      btn.dataset.value = o.m;
      btn.addEventListener('click', () => answerWordQuiz(btn, o.m === q.m));
      opts.appendChild(btn);
    });
  }
  function answerWordQuiz(btn, correct) {
    document.querySelectorAll('#wordQuizOptions .jp-opt').forEach(b => {
      b.disabled = true;
      if (b.dataset.value === state.wordQuizCorrect) b.classList.add('correct');
    });
    if (!correct) btn.classList.add('wrong');
    const fb = $('wordQuizFeedback');
    const q = state.wordQuizCard;
    if (correct) {
      fb.textContent = `✓ ${q.w} (${q.r}) = ${q.m}` + (q.k ? ` · ${q.k}` : '');
      fb.className = 'jp-quiz-feedback good';
      $('wordQuizQuestion').classList.add('pulse');
      vibrate(HAPTIC_GOOD);
      window._wordCombo = (window._wordCombo || 0) + 1;
      if (window._wordCombo > 0 && window._wordCombo % 5 === 0) toast(`🎋 ${window._wordCombo}× combo!`);
    } else {
      fb.textContent = `✗ ${q.w} (${q.r}) = ${q.m}` + (q.k ? ` · ${q.k}` : '');
      fb.className = 'jp-quiz-feedback bad';
      $('wordQuizQuestion').classList.add('shake');
      vibrate(HAPTIC_BAD);
      window._wordCombo = 0;
    }
    if (!state.progress.wordsSeen[q.w]) {
      state.progress.wordsSeen[q.w] = 1;
      saveProgress();
    }
    $('wordQuizNext').classList.remove('hidden');
    $('wordQuizNext').focus();
  }

  // ========== Tricky (easily confused kana) ==========
  function trickyDeck() {
    const out = [];
    D.tricky.forEach(g => g.kana.forEach(k => out.push(Object.assign({ script: g.script }, k))));
    return out;
  }
  function renderTrickyList() {
    const root = $('trickyList');
    root.innerHTML = '';
    D.tricky.forEach(group => {
      const card = document.createElement('div');
      card.className = 'jp-tricky-card';
      const scriptLabel = group.script === 'hira' ? 'ひらがな · Hiragana'
        : group.script === 'kata' ? 'カタカナ · Katakana'
        : 'Cross-script · ひらがな vs カタカナ';
      const row = group.kana.map(k =>
        `<div class="jp-tricky-glyph" data-c="${k.c}" data-r="${k.r}">
          <div class="jp-tricky-glyph-c">${k.c}</div>
          <div class="jp-tricky-glyph-r">${k.r}</div>
        </div>`
      ).join('');
      card.innerHTML = `
        <div class="jp-tricky-script">${scriptLabel}</div>
        <div class="jp-tricky-row">${row}</div>
        <div class="jp-tricky-hint">${group.hint}</div>`;
      card.querySelectorAll('.jp-tricky-glyph').forEach(el => {
        el.addEventListener('click', () => speak(el.dataset.c));
      });
      root.appendChild(card);
    });
  }
  function setTrickyView(view) {
    state.trickyView = view;
    $('trickyList').classList.toggle('hidden', view !== 'list');
    $('trickyQuizPanel').classList.toggle('hidden', view !== 'quiz');
    $('trickyQuizBtn').textContent = view === 'quiz' ? 'Show list' : 'Practice quiz';
    if (view === 'quiz') nextTrickyQuiz();
  }
  function nextTrickyQuiz() {
    const fb = $('trickyFeedback'); fb.textContent = ''; fb.className = 'jp-quiz-feedback';
    $('trickyNext').classList.add('hidden');
    // Pick a random group, then a random char from it. Distractors come from the same group
    // (so the user must distinguish lookalikes), padded with neighbors if needed.
    const group = D.tricky[Math.floor(Math.random() * D.tricky.length)];
    const q = group.kana[Math.floor(Math.random() * group.kana.length)];
    state.trickyQuizCard = q;
    state.trickyQuizCorrect = q.r;
    $('trickyQuestion').textContent = q.c;
    $('trickyQuestion').className = 'jp-quiz-question';
    let distractors = group.kana.filter(k => k.r !== q.r).slice();
    if (distractors.length < 3) {
      const extra = trickyDeck().filter(k => k.r !== q.r && !distractors.some(d => d.r === k.r));
      shuffle(extra);
      distractors = distractors.concat(extra.slice(0, 3 - distractors.length));
    }
    shuffle(distractors);
    const options = [q, ...distractors.slice(0, 3)];
    shuffle(options);
    const opts = $('trickyOptions');
    opts.innerHTML = '';
    options.forEach(o => {
      const btn = document.createElement('button');
      btn.className = 'jp-opt';
      btn.textContent = o.r;
      btn.dataset.value = o.r;
      btn.addEventListener('click', () => answerTrickyQuiz(btn, o.r === q.r));
      opts.appendChild(btn);
    });
  }
  function answerTrickyQuiz(btn, correct) {
    document.querySelectorAll('#trickyOptions .jp-opt').forEach(b => {
      b.disabled = true;
      if (b.dataset.value === state.trickyQuizCorrect) b.classList.add('correct');
    });
    if (!correct) btn.classList.add('wrong');
    const fb = $('trickyFeedback');
    const q = state.trickyQuizCard;
    if (correct) {
      fb.textContent = `✓ ${q.c} = ${q.r}`;
      fb.className = 'jp-quiz-feedback good';
      $('trickyQuestion').classList.add('pulse');
      vibrate(HAPTIC_GOOD);
    } else {
      fb.textContent = `✗ ${q.c} = ${q.r}`;
      fb.className = 'jp-quiz-feedback bad';
      $('trickyQuestion').classList.add('shake');
      vibrate(HAPTIC_BAD);
    }
    recordAnswer(q.c, correct, correct ? 'good' : 'again');
    $('trickyNext').classList.remove('hidden');
    $('trickyNext').focus();
  }

  // ========== Mode switching ==========
  function setMode(mode) {
    state.mode = mode;
    document.querySelectorAll('.jp-mode').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
    ['Chart', 'Study', 'Quiz', 'Trace', 'Words', 'Tricky'].forEach(m => {
      $('panel' + m).classList.toggle('hidden', 'panel' + m !== 'panel' + mode.charAt(0).toUpperCase() + mode.slice(1));
    });
    if (mode === 'study') { buildStudyQueue(); showStudyCard(); }
    if (mode === 'quiz')  { window._quizScore = 0; window._quizCombo = 0; $('quizScore').textContent = 0; $('quizCombo').textContent = 0; nextQuiz(); }
    if (mode === 'trace') { nextTrace(); }
    if (mode === 'words') { renderWordCats(); renderWordGrid(); setWordView(state.wordView); }
    if (mode === 'tricky') { renderTrickyList(); setTrickyView('list'); }
    // Scroll the mode tabs into view so the panel content starts at the top
    const tabs = document.querySelector('.jp-modes');
    if (tabs) {
      const top = tabs.getBoundingClientRect().top + window.scrollY - 12;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  }

  // ========== Filter handling ==========
  function bindFilters() {
    document.querySelectorAll('.jp-pills').forEach(group => {
      const key = group.dataset.group;
      group.querySelectorAll('.jp-pill').forEach(pill => {
        pill.addEventListener('click', () => {
          group.querySelectorAll('.jp-pill').forEach(p => p.classList.remove('active'));
          pill.classList.add('active');
          if (key === 'script') state.script = pill.dataset.value;
          renderChart();
          if (state.mode === 'study') { buildStudyQueue(); showStudyCard(); }
          if (state.mode === 'quiz') nextQuiz();
          if (state.mode === 'trace') nextTrace();
        });
      });
    });
  }

  // ========== Quote rotation ==========
  function rotateQuote() {
    const q = D.quotes[state.quoteIdx % D.quotes.length];
    const el = $('jpQuote');
    el.style.opacity = 0;
    setTimeout(() => {
      el.querySelector('.jp-q-jp').textContent = q.jp;
      el.querySelector('.jp-q-en').textContent = q.romaji + ' — ' + q.en;
      el.style.opacity = 1;
    }, 300);
    state.quoteIdx++;
  }
  function showFact() {
    $('jpFact').textContent = D.facts[state.factIdx % D.facts.length];
  }

  // ========== Auth (GitHub login for progress tracking) ==========
  function initAuth() {
    const IC = window.InteractionsCommon;
    if (!IC) return;

    const loginBtn  = $('jpLogin');
    const logoutBtn = $('jpLogout');
    const userChip  = $('jpUserChip');
    const userAvatar = $('jpUserAvatar');
    const userName   = $('jpUserName');
    if (!loginBtn || !userChip) return;

    function render(user) {
      const loggedIn = !!user && !!user.name;
      loginBtn.classList.toggle('hidden', loggedIn);
      userChip.classList.toggle('hidden', !loggedIn);
      if (loggedIn) {
        userName.textContent = user.name;
        if (user.avatar) {
          userAvatar.innerHTML = `<img src="${user.avatar}" alt="${user.name}">`;
        } else {
          userAvatar.textContent = IC.getInitials(user.name);
        }
      }
    }

    // Handle OAuth callback (?user_name=...&user_avatar=...&is_owner=...)
    const cb = IC.handleAuthCallback();
    if (cb && cb.success) {
      render(cb.user);
    } else {
      const auth = IC.getAuthState();
      render(IC.isLoggedIn() ? auth.user : null);
    }

    loginBtn.addEventListener('click', () => {
      window.location.href = IC.getLoginUrl(window.location.href);
    });
    logoutBtn.addEventListener('click', () => {
      IC.clearAuthState();
      render(null);
    });
  }

  // ========== Wire up ==========
  function init() {
    injectIcons();
    refreshStats();
    renderChart();
    showFact();
    rotateQuote();
    setInterval(rotateQuote, 18000);
    bindFilters();
    initAuth();

    document.querySelectorAll('.jp-mode').forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));

    // Study card flip
    $('studyCard').addEventListener('click', () => {
      state.studyFlipped = !state.studyFlipped;
      $('studyCard').classList.toggle('flipped', state.studyFlipped);
    });
    $('studyAgain').addEventListener('click', e => { e.stopPropagation(); studyAnswer('again'); });
    $('studyHard').addEventListener('click', e => { e.stopPropagation(); studyAnswer('hard'); });
    $('studyGood').addEventListener('click', e => { e.stopPropagation(); studyAnswer('good'); });
    $('studyEasy').addEventListener('click', e => { e.stopPropagation(); studyAnswer('easy'); });
    $('studySpeak').addEventListener('click', e => { e.stopPropagation(); speak(state.quizCard?.c || ''); });

    // Quiz mode toggle
    document.querySelectorAll('.jp-mini-pill').forEach(p => {
      p.addEventListener('click', () => {
        document.querySelectorAll('.jp-mini-pill').forEach(x => x.classList.remove('active'));
        p.classList.add('active');
        state.quizMode = p.dataset.quiz;
        nextQuiz();
      });
    });

    // Trace mode controls
    $('traceBoardClear').addEventListener('click', clearTraceBoard);
    $('traceBoardReveal').addEventListener('click', revealTrace);
    $('traceBoardNext').addEventListener('click', advanceTrace);

    // Words view toggle
    document.querySelectorAll('[data-wordview]').forEach(p => {
      p.addEventListener('click', () => setWordView(p.dataset.wordview));
    });

    // Words quiz next button
    const wqn = $('wordQuizNext');
    if (wqn) wqn.addEventListener('click', nextWordQuiz);

    // Words quiz pronounce button
    const wqs = $('wordQuizSpeak');
    if (wqs) wqs.addEventListener('click', e => {
      e.stopPropagation();
      if (state.wordQuizCard) speak(state.wordQuizCard.w);
    });

    // Tricky mode controls
    $('trickyQuizBtn').addEventListener('click', () => {
      setTrickyView(state.trickyView === 'quiz' ? 'list' : 'quiz');
    });
    $('trickyNext').addEventListener('click', nextTrickyQuiz);
    $('trickyExit').addEventListener('click', () => setTrickyView('list'));
    $('trickyQuizSpeak').addEventListener('click', e => {
      e.stopPropagation();
      if (state.trickyQuizCard) speak(state.trickyQuizCard.c);
    });

    // Kana quiz next button
    const qn = $('quizNext');
    if (qn) qn.addEventListener('click', nextQuiz);

    // Romaji visibility toggle
    const rt = $('wordRomajiToggle');
    if (rt) {
      rt.checked = state.wordShowRomaji;
      applyRomajiVisibility();
      rt.addEventListener('change', () => {
        state.wordShowRomaji = rt.checked;
        applyRomajiVisibility();
      });
    }

    // Fact button
    $('factNext').addEventListener('click', () => { state.factIdx++; showFact(); });

    // Tools
    $('resetProgress').addEventListener('click', () => {
      if (confirm('Reset all progress and streak? This cannot be undone.')) {
        state.progress = defaultProgress();
        saveProgress();
        refreshStats();
        renderChart();
        toast('Progress reset.');
      }
    });
    $('exportProgress').addEventListener('click', () => {
      const blob = new Blob([JSON.stringify(state.progress, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'kana-progress.json'; a.click();
      URL.revokeObjectURL(url);
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', e => {
      if (e.target.matches('input, textarea')) return;
      if (state.mode === 'study') {
        if (e.code === 'Space') { e.preventDefault(); $('studyCard').click(); }
        if (e.key === '1') studyAnswer('again');
        if (e.key === '2') studyAnswer('hard');
        if (e.key === '3') studyAnswer('good');
        if (e.key === '4') studyAnswer('easy');
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else { init(); }
})();
