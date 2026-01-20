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
    .then(res => {
      if (!res.ok) throw new Error('Post not found');
      return res.text();
    })
    .then(text => {
      // Extract front matter
      let content = text;
      let title = postName;
      let date = '';
      const fmMatch = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
      if (fmMatch) {
        const frontMatter = fmMatch[1];
        content = fmMatch[2];

        const titleMatch = frontMatter.match(/title:\s*["']?([^"'\n]+)["']?/);
        if (titleMatch) title = titleMatch[1];

        const dateMatch = frontMatter.match(/date:\s*(\S+)/);
        if (dateMatch) date = dateMatch[1];
      }

      document.title = title + ' - Basu Jindal';

      // Update Schema.org JSON-LD with dynamic content
      const schemaScript = document.getElementById('schema-json-ld');
      if (schemaScript) {
        const schema = JSON.parse(schemaScript.textContent);
        schema.headline = title;
        schema.name = title;
        schema.url = window.location.href;
        schema.mainEntityOfPage.url = window.location.href;
        if (date) {
          schema.datePublished = date;
          schema.dateModified = date;
        }
        schemaScript.textContent = JSON.stringify(schema);
      }

      // Build table of contents
      let toc = '';
      const headings = content.match(/^##\s+.+$/gm);
      if (headings && headings.length > 0) {
        toc = '<nav class="toc"><h3>Table of Contents</h3><ul>';
        headings.forEach(h => {
          const text = h.replace(/^##\s+/, '');
          const id = text.toLowerCase().replace(/[^\w]+/g, '-');
          toc += `<li><a href="#${id}">${text}</a></li>`;
        });
        toc += '</ul></nav>';
      }

      // Configure marked
      marked.setOptions({
        gfm: true,
        breaks: false
      });

      // Custom renderer to add IDs to headings and handle image paths
      const renderer = {
        heading(token) {
          const text = token.text;
          const level = token.depth;
          const id = text.toLowerCase().replace(/[^\w]+/g, '-');
          return `<h${level} id="${id}">${text}</h${level}>`;
        },
        image(token) {
          let href = token.href;
          const title = token.title || '';
          const text = token.text || '';
          // Handle ../images/ paths (relative from md folder)
          if (href && href.startsWith('../images/')) {
            href = `../${section}/images/` + href.substring(10);
          }
          // Handle local image references (no path)
          else if (href && !href.includes('/')) {
            href = `../${section}/images/` + href;
          }
          // Handle images/ paths
          else if (href && href.startsWith('images/')) {
            href = `../${section}/` + href;
          }
          // Handle /assets/img/ paths (convert to section images/)
          else if (href && href.startsWith('/assets/img/')) {
            href = `../${section}/images/` + href.substring(12);
          }
          // Handle /static/images/ paths
          else if (href && href.startsWith('/static/images/')) {
            href = `../${section}/images/` + href.substring(15);
          }
          return `<img src="${href}" alt="${text}" title="${title}" loading="lazy">`;
        }
      };

      marked.use({ renderer });

      const html = marked.parse(content);

      document.getElementById('content').innerHTML = `
        <div class="post-header">
          <h1>${title}</h1>
          ${date ? `<time class="post-date">${date}</time>` : ''}
        </div>
        ${html}
      `;

      // Add TOC to body as a floating sidebar
      if (toc) {
        const tocSidebar = document.createElement('aside');
        tocSidebar.className = 'toc-sidebar';
        tocSidebar.innerHTML = toc;
        document.body.appendChild(tocSidebar);

        // Mobile TOC button
        const mobileTocBtn = document.createElement('button');
        mobileTocBtn.className = 'mobile-toc-btn';
        mobileTocBtn.setAttribute('aria-label', 'Table of Contents');
        mobileTocBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16M4 12h16M4 18h16"/></svg>';
        document.body.appendChild(mobileTocBtn);

        // Mobile TOC modal
        const mobileTocModal = document.createElement('div');
        mobileTocModal.className = 'mobile-toc-modal';
        mobileTocModal.innerHTML = `
          <div class="mobile-toc-content">
            <h3>Table of Contents</h3>
            ${toc.replace('<nav class="toc"><h3>Table of Contents</h3>', '').replace('</nav>', '')}
          </div>
        `;
        document.body.appendChild(mobileTocModal);

        mobileTocBtn.addEventListener('click', () => {
          mobileTocModal.classList.add('open');
        });

        mobileTocModal.addEventListener('click', (e) => {
          if (e.target === mobileTocModal || e.target.tagName === 'A') {
            mobileTocModal.classList.remove('open');
          }
        });
      }

      // Render math with KaTeX
      renderMathInElement(document.getElementById('content'), {
        delimiters: [
          {left: '$$', right: '$$', display: true},
          {left: '$', right: '$', display: false},
          {left: '\\[', right: '\\]', display: true},
          {left: '\\(', right: '\\)', display: false}
        ],
        throwOnError: false
      });

      // Highlight code blocks
      hljs.highlightAll();

      // Add copy buttons to code blocks
      document.querySelectorAll('pre code').forEach((block) => {
        const pre = block.parentElement;
        const btn = document.createElement('button');
        btn.className = 'copy-btn';
        btn.textContent = 'Copy';
        pre.appendChild(btn);
        btn.addEventListener('click', () => {
          navigator.clipboard.writeText(block.textContent).then(() => {
            btn.textContent = 'Copied!';
            btn.classList.add('copied');
            setTimeout(() => {
              btn.textContent = 'Copy';
              btn.classList.remove('copied');
            }, 2000);
          });
        });
      });

      // Add go to top button
      const goToTopBtn = document.createElement('button');
      goToTopBtn.className = 'go-to-top';
      goToTopBtn.setAttribute('aria-label', 'Go to top');
      goToTopBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 15l-6-6-6 6"/></svg>';
      document.body.appendChild(goToTopBtn);

      goToTopBtn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });

      window.addEventListener('scroll', () => {
        if (window.scrollY > 300) {
          goToTopBtn.classList.add('visible');
        } else {
          goToTopBtn.classList.remove('visible');
        }
      });
    })
    .catch(err => {
      document.getElementById('content').innerHTML = `<p class="error">Error loading post: ${err.message}</p>`;
    });
})();
