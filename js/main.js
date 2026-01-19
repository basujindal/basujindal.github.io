// Theme toggle
(function() {
  const toggle = document.getElementById('theme-toggle');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');

  function getTheme() {
    const stored = localStorage.getItem('theme');
    if (stored) return stored;
    return prefersDark.matches ? 'dark' : 'light';
  }

  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    if (toggle) toggle.textContent = theme === 'dark' ? '☀️' : '🌙';
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

  let current = 0;

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
  lb.addEventListener('click', (e) => { if (e.target === lb) close(); });

  document.addEventListener('keydown', (e) => {
    if (!lb.classList.contains('open')) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') prev();
    if (e.key === 'ArrowRight') next();
  });
})();

// Code copy button
(function() {
  document.querySelectorAll('pre code').forEach((block) => {
    const pre = block.parentElement;
    const btn = document.createElement('button');
    btn.className = 'copy-btn';
    btn.textContent = 'Copy';
    btn.style.cssText = 'position:absolute;top:8px;right:8px;padding:4px 8px;font-size:12px;background:var(--border);border:none;border-radius:4px;cursor:pointer;color:var(--text);';
    pre.style.position = 'relative';
    pre.appendChild(btn);

    btn.addEventListener('click', () => {
      navigator.clipboard.writeText(block.textContent).then(() => {
        btn.textContent = 'Copied!';
        setTimeout(() => btn.textContent = 'Copy', 2000);
      });
    });
  });
})();
