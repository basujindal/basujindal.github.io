// Sakura petal physics — canvas particles with gravity, scroll inertia,
// collision detection against div top edges, and accumulation over time.
(function() {
  const canvas = document.getElementById('sakuraCanvas');
  if (!canvas) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    canvas.style.display = 'none';
    return;
  }

  const ctx = canvas.getContext('2d');
  const COLORS = ['#ffb7c5', '#ff8aa3', '#ffc8d5', '#ffd1dc', '#ffa8b8', '#ff95b0'];
  const TARGET_FLYING = 18;
  const SETTLED_CAP = 220;  // memory cap — oldest settled gets dropped past this
  const SPAWN_INTERVAL_MS = 280;
  // Petals can settle on any visible surface, big or small.
  const SURFACE_SEL = '.jp-fact, .jp-card, .jp-card-face, .jp-quiz-prompt, .jp-word-card, .jp-modal-card, .jp-mode, .jp-stat, .jp-opt, .jp-match-tile, .jp-tool-btn, .jp-chart-cell, .jp-pill, .jp-mini-pill, .jp-word-cat, .jp-restart-btn, .jp-btn, .jp-fact-next, .jp-speak-btn';

  let dpr = Math.min(window.devicePixelRatio || 1, 2);
  let W = window.innerWidth, H = window.innerHeight;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();

  // ===== Surfaces (cached element list, recomputed periodically) =====
  let surfaceEls = [];
  function rebuildSurfaceEls() {
    surfaceEls = Array.from(document.querySelectorAll(SURFACE_SEL));
  }

  // Per-frame rect snapshot of currently visible surfaces.
  let surfaceRects = [];
  function refreshSurfaceRects() {
    surfaceRects.length = 0;
    for (let i = 0; i < surfaceEls.length; i++) {
      const el = surfaceEls[i];
      if (el.offsetParent === null && el !== document.body) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 30 || r.bottom < -30 || r.top > H + 30) continue;
      surfaceRects.push({ el, left: r.left, right: r.right, top: r.top });
    }
  }

  // ===== Wind from the side =====
  // Layered sines: a slow base direction + slower gust + faster ripple.
  // Returns a value roughly in [-1, +1.6]; positive = blowing rightward.
  function wind(t) {
    return 0.25
         + Math.sin(t * 0.00035) * 0.55
         + Math.sin(t * 0.0013)  * 0.25
         + Math.sin(t * 0.0041)  * 0.1;
  }

  // ===== Petal =====
  class Petal {
    constructor(initial) { this.reset(initial); }
    reset(initial) {
      this.x = Math.random() * W;
      this.y = initial ? Math.random() * H : -20 - Math.random() * 120;
      this.vx = (Math.random() - 0.5) * 0.4;
      this.vy = 0.3 + Math.random() * 0.6;
      this.rot = Math.random() * Math.PI * 2;
      this.vrot = (Math.random() - 0.5) * 0.04;
      this.size = 5 + Math.random() * 5;
      this.color = COLORS[Math.floor(Math.random() * COLORS.length)];
      this.opacity = 0.55 + Math.random() * 0.35;
      this.baseOpacity = this.opacity;
      this.swayPhase = Math.random() * Math.PI * 2;
      this.swayAmp = 0.2 + Math.random() * 0.3;
      this.settled = false;
      this.settledEl = null;
      this.settledOffX = 0;
      this.bounceCount = 0;
    }
    update(t) {
      if (this.settled) {
        const el = this.settledEl;
        if (!el || !el.isConnected || el.offsetParent === null || !el.matches(SURFACE_SEL)) {
          // Surface gone or no longer allowed — drop petal back into flight
          this.settled = false;
          this.settledEl = null;
          this.bounceCount = 0;
          this.vy = 0.4;
          return;
        }
        const r = el.getBoundingClientRect();
        if (r.bottom < -20 || r.top > H + 20) {
          this.opacity = 0;
        } else {
          this.x = r.left + this.settledOffX;
          this.y = r.top - this.size * 0.4;
          this.opacity = this.baseOpacity;
          this.rot += Math.sin(t * 0.001 + this.swayPhase) * 0.0015;
        }
        return;
      }

      // Physics
      this.vy += 0.012;                                                  // gravity
      this.vx += Math.sin(t * 0.001 + this.swayPhase) * 0.018 * this.swayAmp; // gentle wind
      this.vx += wind(t) * 0.012;                                        // global side wind
      this.vx *= 0.985;                                                  // drag
      if (this.vy > 2.6) this.vy = 2.6;
      if (this.vx > 1.6) this.vx = 1.6;
      if (this.vx < -1.6) this.vx = -1.6;

      this.x += this.vx;
      this.y += this.vy;
      this.rot += this.vrot;

      // Wrap / respawn
      if (this.y > H + 40) { this.reset(false); return; }
      if (this.y < -300)   { this.reset(false); return; }
      if (this.x < -30) this.x = W + 20;
      if (this.x > W + 30) this.x = -20;

      // Collision with surface tops — only when descending
      if (this.vy > 0) {
        for (let i = 0; i < surfaceRects.length; i++) {
          const s = surfaceRects[i];
          const top = s.top;
          if (this.y >= top - 2 && this.y <= top + this.vy + 2 &&
              this.x >= s.left && this.x <= s.right) {
            const settleChance = this.bounceCount >= 1 ? 1.0 : 0.85;
            if (Math.random() < settleChance) {
              this.settled = true;
              this.settledEl = s.el;
              this.settledOffX = (this.x - s.left) + (Math.random() - 0.5) * 6;
              this.y = top - this.size * 0.4;
              this.vx = 0; this.vy = 0;
            } else {
              this.y = top - 1;
              this.vy = -Math.abs(this.vy) * 0.12;
              this.vx += (Math.random() - 0.5) * 0.25;
              this.bounceCount++;
            }
            break;
          }
        }
      }
    }
    draw(c) {
      if (this.opacity <= 0.01) return;
      c.save();
      c.translate(this.x, this.y);
      c.rotate(this.rot);
      c.globalAlpha = this.opacity;
      c.fillStyle = this.color;
      c.beginPath();
      c.ellipse(0, 0, this.size, this.size * 0.55, 0, 0, Math.PI * 2);
      c.fill();
      // Subtle inner shadow for depth
      c.globalAlpha = this.opacity * 0.25;
      c.fillStyle = '#9b2c4a';
      c.beginPath();
      c.ellipse(this.size * 0.15, 0, this.size * 0.35, this.size * 0.18, 0, 0, Math.PI * 2);
      c.fill();
      c.restore();
    }
  }

  const petals = [];
  // Seed petals only ABOVE the viewport so they fall in naturally — no random
  // in-screen positions at start.
  for (let i = 0; i < TARGET_FLYING; i++) {
    const p = new Petal(false);
    p.y = -20 - Math.random() * H * 2;
    petals.push(p);
  }

  // Anchor flying petals to the page (not the viewport): when the user
  // scrolls, shift each flying petal by the same amount so it stays put
  // relative to the page content beneath it.
  let lastScrollY = window.scrollY;
  window.addEventListener('scroll', () => {
    const dy = window.scrollY - lastScrollY;
    lastScrollY = window.scrollY;
    if (dy === 0) return;
    for (let i = 0; i < petals.length; i++) {
      if (!petals[i].settled) petals[i].y -= dy;
    }
  }, { passive: true });

  let surfaceListAge = 0;
  let lastSpawn = 0;
  function frame(t) {
    surfaceListAge += 16;
    if (surfaceListAge > 1500) { rebuildSurfaceEls(); surfaceListAge = 0; }
    refreshSurfaceRects();

    // Maintain a steady stream of new flying petals — they keep falling forever.
    let flyingCount = 0, settledCount = 0;
    for (let i = 0; i < petals.length; i++) {
      if (petals[i].settled) settledCount++;
      else flyingCount++;
    }
    // Memory cap: drop oldest settled petal once we exceed the cap (FIFO).
    if (settledCount > SETTLED_CAP) {
      for (let i = 0; i < petals.length; i++) {
        if (petals[i].settled) { petals.splice(i, 1); break; }
      }
    }
    // Always keep the air populated with falling petals.
    if (flyingCount < TARGET_FLYING && t - lastSpawn > SPAWN_INTERVAL_MS) {
      petals.push(new Petal(false));
      lastSpawn = t;
    }

    ctx.clearRect(0, 0, W, H);
    for (let i = 0; i < petals.length; i++) {
      petals[i].update(t);
      petals[i].draw(ctx);
    }
    requestAnimationFrame(frame);
  }

  window.addEventListener('resize', () => { resize(); rebuildSurfaceEls(); });

  rebuildSurfaceEls();
  requestAnimationFrame(frame);
})();
