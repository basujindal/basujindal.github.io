// Theme toggle
(function() {
  const toggle = document.getElementById('theme-toggle');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');

  const sunIcon = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>';
  const moonIcon = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';

  function getTheme() {
    const stored = localStorage.getItem('theme');
    if (stored) return stored;
    return prefersDark.matches ? 'dark' : 'light';
  }

  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    if (toggle) toggle.innerHTML = theme === 'dark' ? sunIcon : moonIcon;
  }

  setTheme(getTheme());

  if (toggle) {
    toggle.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      setTheme(current === 'dark' ? 'light' : 'dark');
    });
  }

  prefersDark.addEventListener('change', (e) => {
    if (!localStorage.getItem('theme')) {
      setTheme(e.matches ? 'dark' : 'light');
    }
  });
})();

// Lightbox for photography
(function() {
  const gallery = document.querySelector('.gallery');
  if (!gallery) return;

  const items = Array.from(gallery.querySelectorAll('.gallery-item'));
  const lb = document.getElementById('lightbox');
  if (!lb) return;

  const img = document.getElementById('lb-img');
  const title = document.getElementById('lb-title');
  const desc = document.getElementById('lb-desc');
  const meta = document.getElementById('lb-meta');
  const closeBtn = document.getElementById('lb-close');
  const prevBtn = document.getElementById('lb-prev');
  const nextBtn = document.getElementById('lb-next');
  const fullscreenBtn = document.getElementById('lb-fullscreen');

  let current = 0;

  function toggleFullscreen() {
    lb.classList.toggle('fullscreen');
  }

  function show(index) {
    current = index;
    const item = items[index];
    if (!item) return;

    img.src = item.dataset.src;
    img.alt = item.dataset.alt || '';
    title.textContent = item.dataset.title || '';
    desc.textContent = item.dataset.description || '';

    meta.innerHTML = '';
    const fields = ['camera', 'lens', 'settings', 'location', 'date'];
    const labels = ['Camera', 'Lens', 'Settings', 'Location', 'Date'];
    fields.forEach((f, i) => {
      const val = item.dataset[f];
      if (val) {
        const li = document.createElement('li');
        li.innerHTML = `<span>${labels[i]}:</span> ${val}`;
        meta.appendChild(li);
      }
    });

    lb.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function close() {
    lb.classList.remove('open');
    lb.classList.remove('fullscreen');
    document.body.style.overflow = '';
    img.src = '';
  }

  function prev() { show(current <= 0 ? items.length - 1 : current - 1); }
  function next() { show(current >= items.length - 1 ? 0 : current + 1); }

  items.forEach((item, i) => {
    item.addEventListener('click', () => show(i));
    item.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); show(i); }
    });
    item.tabIndex = 0;
  });

  closeBtn?.addEventListener('click', close);
  prevBtn?.addEventListener('click', prev);
  nextBtn?.addEventListener('click', next);
  fullscreenBtn?.addEventListener('click', toggleFullscreen);
  lb.addEventListener('click', (e) => { if (e.target === lb) close(); });

  document.addEventListener('keydown', (e) => {
    if (!lb.classList.contains('open')) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') prev();
    if (e.key === 'ArrowRight') next();
    if (e.key === 'f') toggleFullscreen();
  });
})();
