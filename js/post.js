// Shared post rendering logic for blogs and inprogress sections
(function() {
  const params = new URLSearchParams(window.location.search);
  const postName = params.get('p');

  if (!postName) {
    document.getElementById('content').innerHTML = '<p class="error">No post specified.</p>';
    return;
  }

  fetch(`md/${postName}.md`)
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
          // Handle ../images/ paths
          if (href && href.startsWith('../images/')) {
            href = 'images/' + href.substring(10);
          }
          // Handle local image references (no path)
          else if (href && !href.includes('/')) {
            href = 'images/' + href;
          }
          // Handle /assets/img/ paths (convert to images/)
          else if (href && href.startsWith('/assets/img/')) {
            href = 'images/' + href.substring(12);
          }
          // Handle /static/images/ paths
          else if (href && href.startsWith('/static/images/')) {
            href = 'images/' + href.substring(15);
          }
          return `<img src="${href}" alt="${text}" title="${title}" loading="lazy">`;
        }
      };

      marked.use({ renderer });

      const html = marked.parse(content);

      document.getElementById('content').innerHTML = `
        <h1>${title}</h1>
        ${date ? `<p class="meta">${date}</p>` : ''}
        ${toc}
        ${html}
      `;

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
    })
    .catch(err => {
      document.getElementById('content').innerHTML = `<p class="error">Error loading post: ${err.message}</p>`;
    });
})();
