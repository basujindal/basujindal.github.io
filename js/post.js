// Shared post rendering logic for blogs and inprogress sections
(function() {
  const params = new URLSearchParams(window.location.search);
  const postName = params.get('p');
  const section = params.get('section') || 'blogs';

  const escapeHtmlText = (s) => {
    const d = document.createElement('div');
    d.textContent = s == null ? '' : String(s);
    return d.innerHTML;
  };

  // Map section names to content folder paths. Only known sections are allowed — an
  // unknown section is NOT used verbatim as a path segment.
  const sectionFolders = {
    'blogs': 'blog-posts',
    'inprogress': 'drafts'
  };
  const contentFolder = sectionFolders[section];

  // Validate the slug: filename-safe characters only, and reject parent-dir traversal.
  const validSlug = !!postName && /^[A-Za-z0-9._/-]{1,200}$/.test(postName) && !postName.includes('..');

  if (!postName || !contentFolder || !validSlug) {
    document.getElementById('content').innerHTML = '<p class="error">No post specified.</p>';
    return;
  }

  fetch(`../${contentFolder}/${postName}.md`)
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
          return `<li><a href="#${text.toLowerCase().replace(/[^\w]+/g, '-')}">${escapeHtmlText(text)}</a></li>`;
        }).join('') + '</ul></nav>' : '';

      // Configure marked
      marked.setOptions({ gfm: true, breaks: false });

      // Protect math blocks from markdown processing (underscores get eaten). Use a
      // plain-text marker (not an HTML comment) so DOMPurify keeps it — comments are
      // stripped during sanitization.
      const mathPlaceholders = [];
      const mathMarker = (i) => `xMATHPLACEHOLDERx${i}xENDMATHx`;
      content = content.replace(/\$\$([\s\S]*?)\$\$/g, (match) => {
        mathPlaceholders.push(match);
        return mathMarker(mathPlaceholders.length - 1);
      });
      content = content.replace(/\$([^\$\n]+?)\$/g, (match) => {
        mathPlaceholders.push(match);
        return mathMarker(mathPlaceholders.length - 1);
      });

      marked.use({ renderer: {
        heading(token) {
          const id = token.text.toLowerCase().replace(/[^\w]+/g, '-');
          return `<h${token.depth} id="${id}">${token.text}</h${token.depth}>`;
        },
        image(token) {
          let href = token.href;
          const prefixes = ['../images/', '', 'images/', '/assets/img/', '/static/images/'];
          const targets = [`../${contentFolder}/images/`, `../${contentFolder}/images/`, `../${contentFolder}/`, `../${contentFolder}/images/`, `../${contentFolder}/images/`];
          prefixes.forEach((p, i) => {
            if (href?.startsWith(p) || (p === '' && href && !href.includes('/')))
              href = targets[i] + href.substring(p.length);
          });
          return `<img src="${href}" alt="${token.text || ''}" title="${token.title || ''}" loading="lazy">`;
        }
      }});

      // Sanitize the rendered markdown before inserting. Defense-in-depth: blog .md
      // files are author-controlled, but this neutralizes any raw HTML/script and keeps
      // a future content source from becoming a stored-XSS sink.
      let html = DOMPurify.sanitize(marked.parse(content));
      // Restore math markers AFTER sanitizing (they are plain text, so they survive),
      // then KaTeX renders them below.
      html = html.replace(/xMATHPLACEHOLDERx(\d+)xENDMATHx/g, (_, i) => mathPlaceholders[parseInt(i)]);

      document.getElementById('content').innerHTML = `
        <div class="post-header"><h1>${escapeHtmlText(title)}</h1>${date ? `<time class="post-date">${escapeHtmlText(date)}</time>` : ''}</div>
        ${html}`;

      // Add TOC sidebar
      if (toc) {
        const tocSidebar = document.createElement('aside');
        tocSidebar.className = 'toc-sidebar';
        tocSidebar.innerHTML = toc;
        document.body.appendChild(tocSidebar);

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
