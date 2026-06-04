// Japanese Kana flashcards — logic, SRS, progress, achievements
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
    matchSelected: null,
    matchPairs: 0,
    matchTimer: 0,
    matchInterval: null,
    factIdx: Math.floor(performance.now() % D.facts.length),
    quoteIdx: Math.floor(performance.now() % D.quotes.length),
    speedHistory: [],
    wordCat: 'all',
    wordView: 'quiz',
    wordShowRomaji: false,
    wordQuizCard: null,
    wordQuizCorrect: null,
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
      achievements: {},
      matchBest: null,
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
    checkAchievements();
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
    root.innerHTML = '';
    const showHira = state.script === 'hira' || state.script === 'both';
    const showKata = state.script === 'kata' || state.script === 'both';
    if (showHira) {
      appendChartSection(root, 'Hiragana ひらがな', D.sets.hiraganaBasic, KANA_LAYOUT_BASIC, 'hira');
      appendChartSection(root, 'Dakuten · Handakuten', D.sets.hiraganaDakuten, KANA_LAYOUT_DAKUTEN, 'hira');
    }
    if (showKata) {
      appendChartSection(root, 'Katakana カタカナ', D.sets.katakanaBasic, KANA_LAYOUT_BASIC, 'kata');
      appendChartSection(root, 'Dakuten · Handakuten', D.sets.katakanaDakuten, KANA_LAYOUT_DAKUTEN, 'kata');
    }
  }
  function appendChartSection(root, title, dataset, layout, script) {
    const heading = document.createElement('h3');
    heading.className = 'jp-chart-heading';
    heading.textContent = title;
    root.appendChild(heading);
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

  // ========== UI: Mastery heatmap (removed) ==========
  function renderMastery() { /* no-op: mastery section removed */ }

  // ========== UI: Modal ==========
  function openModal(k) {
    $('modalGlyph').textContent = k.c;
    $('modalRomaji').textContent = k.r;
    $('modalMnemonic').textContent = k.m;
    $('modalExWord').textContent = k.w + ' (' + k.wr + ')';
    $('modalExMeaning').textContent = k.wm;
    $('modalKanji').classList.add('hidden');
    document.querySelector('.jp-modal-example').style.display = '';
    const c = getCard(k.c);
    $('modalMastery').innerHTML = `Mastery: <strong>Level ${c.lvl}/5</strong> · seen ${c.seen}× · ${c.correct} correct`;
    $('modalSpeak').onclick = () => speak(k.c);
    $('cardModal').classList.remove('hidden');
  }
  function openWordModal(word) {
    $('modalGlyph').textContent = word.w;
    $('modalRomaji').textContent = word.r;
    $('modalMnemonic').textContent = word.m;
    if (word.k) { $('modalKanji').textContent = word.k; $('modalKanji').classList.remove('hidden'); }
    else $('modalKanji').classList.add('hidden');
    document.querySelector('.jp-modal-example').style.display = 'none';
    $('modalMastery').textContent = '';
    $('modalSpeak').onclick = () => speak(word.w);
    $('cardModal').classList.remove('hidden');
    if (!state.progress.wordsSeen[word.w]) {
      state.progress.wordsSeen[word.w] = 1;
      saveProgress();
      checkAchievements();
      refreshWordsCounter();
      const card = document.querySelector(`.jp-word-card[data-w="${word.w}"]`);
      if (card) card.classList.add('seen');
    }
  }
  function closeModal() { $('cardModal').classList.add('hidden'); }
  document.querySelectorAll('#cardModal [data-close]').forEach(el => el.addEventListener('click', closeModal));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

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
    $('studyMnemonic').textContent = k.m;
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
    bumpStat('statXp');
    if (quality === 'easy') burst($('studyCard'));
    state.studyIdx++;
    setTimeout(showStudyCard, 250);
  }

  // ========== Quiz ==========
  function nextQuiz() {
    const fb = $('quizFeedback'); fb.textContent = ''; fb.className = 'jp-quiz-feedback';
    const deck = activeDeck();
    if (deck.length < 4) { $('quizQuestion').textContent = '?'; $('quizOptions').innerHTML = '<p>Need at least 4 kana selected.</p>'; return; }
    // weight selection
    const pool = deck.slice().sort((a, b) => {
      const ca = getCard(a.c), cb = getCard(b.c);
      return (5 - ca.lvl) - (5 - cb.lvl) + (Math.random() - 0.5);
    });
    const q = pool[Math.floor(Math.random() * Math.min(8, pool.length))];
    state.quizCard = q;
    state.quizStartedAt = Date.now();
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
    const time = Date.now() - state.quizStartedAt;
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
      window._quizScore = (window._quizScore || 0) + 1;
      window._quizCombo = (window._quizCombo || 0) + 1;
      if (window._quizCombo > 0 && window._quizCombo % 5 === 0) {
        toast(`🔥 ${window._quizCombo}× combo!`);
      }
      if (time < 2000) state.speedHistory.push(time); else state.speedHistory = [];
      if (state.speedHistory.length >= 5) {
        unlock('speed_demon');
        state.speedHistory = [];
      }
    } else {
      fb.textContent = `✗ Was ${state.quizCard.c} = ${state.quizCard.r}`;
      fb.className = 'jp-quiz-feedback bad';
      $('quizQuestion').classList.add('shake');
      window._quizCombo = 0;
      state.speedHistory = [];
    }
    $('quizScore').textContent = window._quizScore || 0;
    $('quizCombo').textContent = window._quizCombo || 0;
    recordAnswer(state.quizCard.c, correct, correct ? 'good' : 'again');
    setTimeout(nextQuiz, correct ? 900 : 1900);
  }

  // ========== Match ==========
  function startMatch() {
    state.matchSelected = null;
    state.matchPairs = 0;
    state.matchTimer = 0;
    if (state.matchInterval) clearInterval(state.matchInterval);
    const deck = activeDeck().slice();
    shuffle(deck);
    const subset = deck.slice(0, 6);
    const tiles = [];
    subset.forEach(k => {
      tiles.push({ id: k.c, type: 'kana',   text: k.c });
      tiles.push({ id: k.c, type: 'romaji', text: k.r });
    });
    shuffle(tiles);
    const grid = $('matchGrid');
    grid.innerHTML = '';
    tiles.forEach(t => {
      const el = document.createElement('div');
      el.className = 'jp-match-tile' + (t.type === 'romaji' ? ' romaji' : '');
      el.textContent = t.text;
      el.dataset.id = t.id;
      el.dataset.type = t.type;
      el.addEventListener('click', () => clickMatchTile(el, t));
      grid.appendChild(el);
    });
    state.matchStart = Date.now();
    state.matchInterval = setInterval(() => {
      $('matchTimer').textContent = ((Date.now() - state.matchStart) / 1000).toFixed(1);
    }, 100);
    $('matchBest').textContent = state.progress.matchBest ? state.progress.matchBest.toFixed(1) + 's' : '—';
  }
  function clickMatchTile(el, t) {
    if (el.classList.contains('matched')) return;
    if (!state.matchSelected) {
      el.classList.add('selected');
      state.matchSelected = { el, t };
      return;
    }
    const prev = state.matchSelected;
    if (prev.el === el) { el.classList.remove('selected'); state.matchSelected = null; return; }
    if (prev.t.id === t.id && prev.t.type !== t.type) {
      // Match!
      el.classList.add('matched');
      prev.el.classList.add('matched');
      prev.el.classList.remove('selected');
      state.matchSelected = null;
      state.matchPairs++;
      recordAnswer(t.id, true, 'good');
      if (state.matchPairs >= 6) {
        const time = (Date.now() - state.matchStart) / 1000;
        if (state.matchInterval) clearInterval(state.matchInterval);
        if (!state.progress.matchBest || time < state.progress.matchBest) {
          state.progress.matchBest = time;
          saveProgress();
          toast(`🏆 New best: ${time.toFixed(1)}s!`);
        } else {
          toast(`Done in ${time.toFixed(1)}s`);
        }
        confettiBurst();
      }
    } else {
      el.classList.add('selected', 'miss');
      prev.el.classList.add('miss');
      setTimeout(() => {
        el.classList.remove('selected', 'miss');
        prev.el.classList.remove('selected', 'miss');
        state.matchSelected = null;
      }, 500);
      recordAnswer(t.id, false, 'again');
    }
  }

  // ========== Achievements ==========
  function checkAchievements() {
    const p = state.progress;
    if (p.totalCorrect >= 1)   unlock('first_correct');
    if (p.totalCorrect >= 10)  unlock('ten_correct');
    if (p.totalCorrect >= 100) unlock('hundred');
    if (p.streak >= 3)  unlock('streak_3');
    if (p.streak >= 7)  unlock('streak_7');
    if (p.streak >= 30) unlock('streak_30');
    const mastered = (set) => set.every(k => (p.cards[k.c] || {}).lvl >= 5);
    if (mastered(D.sets.hiraganaBasic)) unlock('hira_master');
    if (mastered(D.sets.katakanaBasic)) unlock('kata_master');
    const wordsCount = Object.keys(p.wordsSeen || {}).length;
    if (wordsCount >= 10) unlock('word_10');
    if (wordsCount >= 50) unlock('word_50');
  }
  function unlock(id) {
    if (state.progress.achievements[id]) return;
    state.progress.achievements[id] = Date.now();
    saveProgress();
    const a = D.achievements.find(x => x.id === id);
    if (a) toast(`${a.icon}  ${a.name} unlocked!`);
    confettiBurst();
    renderAchievements();
  }
  function renderAchievements() { /* no-op: achievements section removed */ }

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
    $('wordCats').classList.toggle('hidden', false); // categories visible in both views
    $('wordQuizPanel').classList.toggle('hidden', view !== 'quiz');
    if (view === 'quiz') nextWordQuiz();
    if (view === 'browse') renderWordGrid();
  }
  function applyRomajiVisibility() {
    document.body.classList.toggle('hide-romaji', !state.wordShowRomaji);
  }
  function nextWordQuiz() {
    const fb = $('wordQuizFeedback'); fb.textContent = ''; fb.className = 'jp-quiz-feedback';
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
      window._wordCombo = (window._wordCombo || 0) + 1;
      if (window._wordCombo > 0 && window._wordCombo % 5 === 0) toast(`🎋 ${window._wordCombo}× combo!`);
    } else {
      fb.textContent = `✗ ${q.w} = ${q.m}`;
      fb.className = 'jp-quiz-feedback bad';
      $('wordQuizQuestion').classList.add('shake');
      window._wordCombo = 0;
    }
    if (!state.progress.wordsSeen[q.w]) {
      state.progress.wordsSeen[q.w] = 1;
      saveProgress();
      checkAchievements();
    }
    setTimeout(nextWordQuiz, correct ? 1000 : 1900);
  }

  // ========== Mode switching ==========
  function setMode(mode) {
    state.mode = mode;
    document.querySelectorAll('.jp-mode').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
    ['Chart', 'Study', 'Quiz', 'Match', 'Words'].forEach(m => {
      $('panel' + m).classList.toggle('hidden', 'panel' + m !== 'panel' + mode.charAt(0).toUpperCase() + mode.slice(1));
    });
    if (mode === 'study') { buildStudyQueue(); showStudyCard(); }
    if (mode === 'quiz')  { window._quizScore = 0; window._quizCombo = 0; $('quizScore').textContent = 0; $('quizCombo').textContent = 0; nextQuiz(); }
    if (mode === 'match') { startMatch(); }
    if (mode === 'words') { renderWordCats(); renderWordGrid(); setWordView(state.wordView); }
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
          renderMastery();
          if (state.mode === 'study') { buildStudyQueue(); showStudyCard(); }
          if (state.mode === 'quiz') nextQuiz();
          if (state.mode === 'match') startMatch();
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

  // ========== Wire up ==========
  function init() {
    injectIcons();
    refreshStats();
    renderChart();
    showFact();
    rotateQuote();
    setInterval(rotateQuote, 18000);
    bindFilters();

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

    // Match
    $('matchRestart').addEventListener('click', startMatch);

    // Words view toggle
    document.querySelectorAll('[data-wordview]').forEach(p => {
      p.addEventListener('click', () => setWordView(p.dataset.wordview));
    });

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
      if (confirm('Reset all progress, streak, and achievements? This cannot be undone.')) {
        state.progress = defaultProgress();
        saveProgress();
        refreshStats();
        renderChart();
        renderMastery();
        renderAchievements();
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
