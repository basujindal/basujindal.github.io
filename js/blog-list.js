// Shared blog/draft listing logic
// Reads window.BLOG_LIST_CONFIG = { items, folder, section, defaultShow }
// An item with a `url` is an externally hosted post: it carries its own
// title/date/description and opens in a new tab instead of /post/.
(function() {
  const config = window.BLOG_LIST_CONFIG;
  if (!config) return;

  const { items, folder, section, defaultShow } = config;

  async function loadItems() {
    const grid = document.getElementById('blog-grid');
    const data = (await Promise.all(items.map(async (item) => {
      if (item && item.url) {
        return { url: item.url, title: item.title, date: item.date, show: item.show !== false, description: item.description || '' };
      }
      const slug = typeof item === 'string' ? item : item.slug;
      const description = typeof item === 'string' ? '' : (item.description || '');
      const res = await fetch(`../${folder}/${slug}.md`);
      const text = await res.text();
      const frontMatter = text.match(/^---\n([\s\S]*?)\n---/);
      let title = slug;
      let date = '';
      let show = defaultShow;
      let summary = '';
      if (frontMatter) {
        const titleMatch = frontMatter[1].match(/title:\s*["']?(.+?)["']?\s*$/m);
        const dateMatch = frontMatter[1].match(/date:\s*(\d{4}-\d{2}-\d{2})/);
        const showMatch = frontMatter[1].match(/show:\s*(true|false)/);
        const summaryMatch = frontMatter[1].match(/summary:\s*["']?(.+?)["']?\s*$/m);
        if (titleMatch) title = titleMatch[1];
        if (dateMatch) date = dateMatch[1];
        if (showMatch) show = showMatch[1] === 'true';
        if (summaryMatch) summary = summaryMatch[1];
      }
      return { slug, title, date, show, description: description || summary };
    }))).filter(d => d.show);

    data.sort((a, b) => new Date(b.date) - new Date(a.date));

    data.forEach((item, index) => {
      const dateObj = new Date(item.date + 'T00:00:00');
      const formatted = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const delay = Math.min(index + 2, 5);
      const href = item.url || `/post/?section=${section}&p=${item.slug}`;
      const linkAttrs = item.url ? ' target="_blank" rel="noopener noreferrer"' : '';
      grid.innerHTML += `
        <a href="${href}"${linkAttrs} class="blog-card fade-in" style="animation-delay: ${delay * 0.1}s; opacity: 0;">
          <div class="blog-card-content">
            <time datetime="${item.date}">${formatted}</time>
            <h2>${item.title}</h2>
            ${item.description ? `<p>${item.description}</p>` : ''}
          </div>
          <span class="blog-card-arrow">${item.url ? '&#8599;' : '&rarr;'}</span>
        </a>
      `;
    });
  }

  loadItems();
})();
