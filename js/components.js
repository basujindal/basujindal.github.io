// Shared components - header, footer, and analytics
(function() {
  // Header HTML with hamburger menu
  const headerHTML = `
    <div class="header-left">
      <button id="theme-toggle" class="theme-toggle" aria-label="Toggle theme"></button>
      <a href="/" class="logo">Basu Jindal</a>
    </div>
    <button class="hamburger" aria-label="Toggle menu">
      <span></span>
      <span></span>
      <span></span>
    </button>
    <nav>
      <a href="/html/blogs.html">Blogs</a>
      <a href="/html/diffchecker.html">Diff Checker</a>
      <a href="/html/job_search.html">Search Jobs</a>
      <a href="/html/photography.html">Astro Photography</a>
    </nav>
  `;

  // Nav overlay for mobile
  const navOverlay = document.createElement('div');
  navOverlay.className = 'nav-overlay';
  document.body.appendChild(navOverlay);

  // Footer HTML with SVG icons
  const currentYear = new Date().getFullYear();
  const linkedinIcon = '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>';
  const githubIcon = '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>';
  const footerHTML = `
    <div class="footer-content">
      <p>&copy; ${currentYear} Basu Jindal</p>
      <div class="footer-links">
        <a href="https://www.linkedin.com/in/basujindal/" target="_blank" aria-label="LinkedIn" class="social-icon">${linkedinIcon}</a>
        <a href="https://github.com/basujindal" target="_blank" aria-label="GitHub" class="social-icon">${githubIcon}</a>
      </div>
    </div>
  `;

  // Inject header
  const header = document.querySelector('header');
  if (header && !header.innerHTML.trim()) {
    header.innerHTML = headerHTML;
  }

  // Hamburger menu functionality
  const hamburger = document.querySelector('.hamburger');
  const nav = document.querySelector('nav');

  if (hamburger && nav) {
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('active');
      nav.classList.toggle('open');
      navOverlay.classList.toggle('open');
      document.body.style.overflow = nav.classList.contains('open') ? 'hidden' : '';
    });

    navOverlay.addEventListener('click', () => {
      hamburger.classList.remove('active');
      nav.classList.remove('open');
      navOverlay.classList.remove('open');
      document.body.style.overflow = '';
    });

    // Close menu when nav link is clicked
    nav.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        hamburger.classList.remove('active');
        nav.classList.remove('open');
        navOverlay.classList.remove('open');
        document.body.style.overflow = '';
      });
    });
  }

  // Inject footer
  const footer = document.querySelector('footer');
  if (footer) {
    footer.innerHTML = footerHTML;
  }

  // Active nav link highlighting
  const navLinks = document.querySelectorAll('nav a');
  const currentPath = window.location.pathname;

  navLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (href && !href.startsWith('http')) {
      const linkPath = href.replace(/^\//, '');
      const pagePath = currentPath.replace(/^\//, '');

      if (linkPath === pagePath ||
          (pagePath.startsWith('html/blogs') && href.includes('blogs.html')) ||
          (pagePath.startsWith('html/photography') && href.includes('photography.html')) ||
          (pagePath.startsWith('html/inprogress') && href.includes('inprogress.html')) ||
          (pagePath.startsWith('html/diffchecker') && href.includes('diffchecker')) ||
          (pagePath.startsWith('html/job_search') && href.includes('job_search.html')) ||
          (pagePath.startsWith('html/post') && href.includes('blogs.html'))) {
        link.classList.add('active');
      }
    }
  });
})();

// Google Analytics
(function() {
  if (window.gtag) return; // Already loaded

  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://www.googletagmanager.com/gtag/js?id=G-QXG86X3Q6C';
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  window.gtag = function() { dataLayer.push(arguments); };
  gtag('js', new Date());
  gtag('config', 'G-QXG86X3Q6C');
})();
