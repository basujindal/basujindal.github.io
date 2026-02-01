// Shared post rendering logic for blogs and inprogress sections
(function() {
  const params = new URLSearchParams(window.location.search);
  const postName = params.get('p');
  const section = params.get('section') || 'blogs';

  if (!postName) {
    document.getElementById('content').innerHTML = '<p class="error">No post specified.</p>';
    return;
  }

  fetch(`../${section}//${postName}.md`)
    .then(res => { if (!res.ok) throw new Error('Post not found'); return res.text(); })
    .then(text => {
      let content = text, title = postName, date = '';
      const fmMatch = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
      if (fmMatch) {
        content = fmMatch[2];
        title = fmMatch[1].match(/title:\s*["']?([^"'\n]+)["']?/)?.[1] || postName;
        date = fmMatch[1].match(/date:\s*(\S+)/)?.[1] || '';
      }

      document.title = title + ' - Basu Jindal';

      // Update Schema.org JSON-LD
      const schemaScript = document.getElementById('schema-json-ld');
      if (schemaScript) {
        const schema = JSON.parse(schemaScript.textContent);
        Object.assign(schema, { headline: title, name: title, url: window.location.href });
        schema.mainEntityOfPage.url = window.location.href;
        if (date) schema.datePublished = schema.dateModified = date;
        schemaScript.textContent = JSON.stringify(schema);
      }

      // Build TOC
      const headings = content.match(/^##\s+.+$/gm) || [];
      const toc = headings.length ? '<nav class="toc"><h3>Table of Contents</h3><ul>' +
        headings.map(h => {
          const text = h.replace(/^##\s+/, '');
          return `<li><a href="#${text.toLowerCase().replace(/[^\w]+/g, '-')}">${text}</a></li>`;
        }).join('') + '</ul></nav>' : '';

      // Configure marked
      marked.setOptions({ gfm: true, breaks: false });
      marked.use({ renderer: {
        heading(token) {
          const id = token.text.toLowerCase().replace(/[^\w]+/g, '-');
          return `<h${token.depth} id="${id}">${token.text}</h${token.depth}>`;
        },
        image(token) {
          let href = token.href;
          const prefixes = ['../images/', '', 'images/', '/assets/img/', '/static/images/'];
          const targets = [`../${section}/images/`, `../${section}/images/`, `../${section}/`, `../${section}/images/`, `../${section}/images/`];
          prefixes.forEach((p, i) => {
            if (href?.startsWith(p) || (p === '' && href && !href.includes('/')))
              href = targets[i] + href.substring(p.length);
          });
          return `<img src="${href}" alt="${token.text || ''}" title="${token.title || ''}" loading="lazy">`;
        }
      }});

      document.getElementById('content').innerHTML = `
        <div class="post-header"><h1>${title}</h1>${date ? `<time class="post-date">${date}</time>` : ''}</div>
        ${marked.parse(content)}`;

      // Add TOC sidebar
      if (toc) {
        const tocSidebar = document.createElement('aside');
        tocSidebar.className = 'toc-sidebar';
        tocSidebar.innerHTML = toc + '<div id="mapmyvisitors-container" style="margin-top: 20px; text-align: center;"></div>';
        document.body.appendChild(tocSidebar);

        // Load MapMyVisitors
        const mapContainer = document.getElementById('mapmyvisitors-container');
        if (mapContainer) {
          const script = document.createElement('script');
          script.type = 'text/javascript';
          script.id = 'mapmyvisitors';
          script.src = '//mapmyvisitors.com/map.js?d=LUhlD2Iz8BXSBnyy03hiL6D4dAgpWL8TXVMoAiF7lyQ&cl=ffffff&w=a';
          mapContainer.appendChild(script);
        }

        const mobileTocBtn = document.createElement('button');
        mobileTocBtn.className = 'mobile-toc-btn';
        mobileTocBtn.setAttribute('aria-label', 'Table of Contents');
        mobileTocBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16M4 12h16M4 18h16"/></svg>';
        document.body.appendChild(mobileTocBtn);

        const mobileTocModal = document.createElement('div');
        mobileTocModal.className = 'mobile-toc-modal';
        mobileTocModal.innerHTML = `<div class="mobile-toc-content"><h3>Table of Contents</h3>${toc.replace('<nav class="toc"><h3>Table of Contents</h3>', '').replace('</nav>', '')}</div>`;
        document.body.appendChild(mobileTocModal);

        mobileTocBtn.addEventListener('click', () => mobileTocModal.classList.add('open'));
        mobileTocModal.addEventListener('click', e => { if (e.target === mobileTocModal || e.target.tagName === 'A') mobileTocModal.classList.remove('open'); });
      }

      // Render math and highlight code
      renderMathInElement(document.getElementById('content'), {
        delimiters: [{left: '$$', right: '$$', display: true}, {left: '$', right: '$', display: false},
                     {left: '\\[', right: '\\]', display: true}, {left: '\\(', right: '\\)', display: false}],
        throwOnError: false
      });
      hljs.highlightAll();

      // Add copy buttons to code blocks
      document.querySelectorAll('pre code').forEach(block => {
        const btn = document.createElement('button');
        btn.className = 'copy-btn';
        btn.textContent = 'Copy';
        block.parentElement.appendChild(btn);
        btn.addEventListener('click', () => {
          navigator.clipboard.writeText(block.textContent).then(() => {
            btn.textContent = 'Copied!';
            btn.classList.add('copied');
            setTimeout(() => { btn.textContent = 'Copy'; btn.classList.remove('copied'); }, 2000);
          });
        });
      });

      // Go to top button
      const goToTopBtn = document.createElement('button');
      goToTopBtn.className = 'go-to-top';
      goToTopBtn.setAttribute('aria-label', 'Go to top');
      goToTopBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 15l-6-6-6 6"/></svg>';
      document.body.appendChild(goToTopBtn);
      goToTopBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
      window.addEventListener('scroll', () => goToTopBtn.classList.toggle('visible', window.scrollY > 300));
    })
    .catch(err => { document.getElementById('content').innerHTML = `<p class="error">Error loading post: ${err.message}</p>`; });
})();
