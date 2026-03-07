// Stats Dashboard JavaScript
// Uses: InteractionsCommon, StatsCharts (stats-charts.js)
(function() {
  const API_BASE = InteractionsCommon.API_BASE;
  const STATS_API = `${API_BASE}/stats`;

  // DOM Elements
  const authRequired = document.getElementById('auth-required');
  const statsDashboard = document.getElementById('stats-dashboard');
  const statsLoading = document.getElementById('stats-loading');
  const statsContent = document.getElementById('stats-content');
  const loginBtn = document.getElementById('github-login-btn');
  const logoutContainer = document.getElementById('logout-container');
  const logoutBtn = document.getElementById('logout-btn');

  // Initialize
  function init() {
    const authResult = InteractionsCommon.handleAuthCallback(cleanUrl);
    if (authResult && !authResult.success) {
      showToast(authResult.error, 'error');
    }
    checkAuth();
    loginBtn.addEventListener('click', handleLogin);
    logoutBtn.addEventListener('click', handleLogout);
  }

  function cleanUrl() {
    const url = new URL(window.location);
    url.searchParams.delete('is_owner');
    url.searchParams.delete('user_name');
    url.searchParams.delete('user_avatar');
    url.searchParams.delete('error');
    window.history.replaceState({}, document.title, url.toString());
  }

  function checkAuth() {
    const auth = InteractionsCommon.getAuthState();
    if (InteractionsCommon.isLoggedIn() && auth.isOwner) {
      authRequired.classList.add('hidden');
      statsDashboard.classList.remove('hidden');
      logoutContainer.classList.remove('hidden');
      loadStats();
    } else if (InteractionsCommon.isLoggedIn() && !auth.isOwner) {
      showToast('Only the site owner can access this page.', 'error');
      authRequired.classList.remove('hidden');
      statsDashboard.classList.add('hidden');
    } else {
      authRequired.classList.remove('hidden');
      statsDashboard.classList.add('hidden');
    }
  }

  function handleLogin() {
    const returnUrl = window.location.href.split('?')[0];
    window.location.href = InteractionsCommon.getLoginUrl(returnUrl);
  }

  function handleLogout() {
    InteractionsCommon.clearAuthState();
    authRequired.classList.remove('hidden');
    statsDashboard.classList.add('hidden');
    logoutContainer.classList.add('hidden');
  }

  async function loadStats() {
    try {
      const response = await fetch(STATS_API, {
        credentials: 'include'
      });
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          showToast('Access denied. Owner authentication required.', 'error');
          return;
        }
        throw new Error('Failed to fetch stats');
      }
      const data = await response.json();
      renderStats(data);
      statsLoading.classList.add('hidden');
      statsContent.classList.remove('hidden');
    } catch (error) {
      console.error('Error loading stats:', error);
      showToast('Failed to load stats. Please try again.', 'error');
    }
  }

  function renderStats(data) {
    const visitsByType = calculateVisitsByType(data.visit_locations);

    document.getElementById('stat-total-visits').textContent = formatNumber(visitsByType.total);
    document.getElementById('stat-blog-visits').textContent = formatNumber(visitsByType.blogs);
    document.getElementById('stat-thoughts-visits').textContent = formatNumber(visitsByType.thoughts);
    document.getElementById('stat-diffchecker-visits').textContent = formatNumber(visitsByType.diffchecker);
    document.getElementById('stat-other-visits').textContent = formatNumber(visitsByType.other);

    renderVisitorDetails(data.visit_locations);
    StatsCharts.renderVisitsChart(data.visits_by_day);
    renderVisitsByPage(data.visits_by_page);
    StatsCharts.renderVisitorMap(data.visit_locations);
    StatsCharts.renderCountryGrid(data.visits_by_country);
    renderBlogTable(data.blog_stats);
  }

  function calculateVisitsByType(locations) {
    const result = { total: 0, blogs: 0, thoughts: 0, diffchecker: 0, other: 0 };
    if (!locations || locations.length === 0) return result;

    locations.forEach(visit => {
      result.total++;
      const page = (visit.page || '').toLowerCase();
      if (page.includes('section=blogs') || page.includes('/blogs')) result.blogs++;
      else if (page.includes('section=posts') || page.includes('/posts') || page.includes('section=thoughts') || page.includes('/thoughts')) result.thoughts++;
      else if (page.includes('diff') || page.includes('diffchecker')) result.diffchecker++;
      else result.other++;
    });
    return result;
  }

  function renderVisitsByPage(visitsByPage) {
    const tbody = document.querySelector('#visits-by-page-table tbody');
    const toggle = document.getElementById('visits-by-page-toggle');
    const content = document.getElementById('visits-by-page-content');

    toggle.addEventListener('click', () => {
      toggle.classList.toggle('collapsed');
      content.classList.toggle('collapsed');
    });

    if (!visitsByPage || visitsByPage.length === 0) {
      tbody.innerHTML = '<tr><td colspan="2" style="text-align: center; color: var(--text-secondary);">No page data yet</td></tr>';
      return;
    }

    tbody.innerHTML = visitsByPage.map(page => {
      const pageStr = page.page || '(homepage)';
      return `<tr><td class="page-path">${escapeHtml(pageStr)}</td><td>${page.count}</td></tr>`;
    }).join('');
  }

  function renderBlogTable(blogStats) {
    const tbody = document.querySelector('#blog-table tbody');
    if (!blogStats || blogStats.length === 0) {
      tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: var(--text-secondary);">No blog data yet</td></tr>';
      return;
    }

    tbody.innerHTML = blogStats.map(blog => `
      <tr>
        <td class="blog-slug"><a href="/post/?section=blogs&p=${encodeURIComponent(blog.slug)}" target="_blank">${escapeHtml(blog.slug)}</a></td>
        <td><span class="stat-number likes-col"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>${blog.likes}</span></td>
        <td><span class="stat-number comments-col"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>${blog.comment_count}</span></td>
      </tr>
    `).join('');
  }

  function renderVisitorDetails(locations) {
    const tbody = document.querySelector('#visitor-table tbody');
    const toggle = document.getElementById('visitor-details-toggle');
    const content = document.getElementById('visitor-details-content');

    toggle.addEventListener('click', () => {
      toggle.classList.toggle('collapsed');
      content.classList.toggle('collapsed');
    });

    if (!locations || locations.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-secondary);">No visitor data yet</td></tr>';
      return;
    }

    const sortedLocations = [...locations].sort((a, b) => new Date(b.visited_at) - new Date(a.visited_at));

    tbody.innerHTML = sortedLocations.map(visit => {
      const locationStr = visit.city ? `${visit.city}` : '-';
      const countryStr = visit.country || '-';
      const timeStr = formatDateTime(new Date(visit.visited_at));
      const ipStr = visit.ip_address || '-';
      const pageStr = visit.page || '-';
      const uaStr = visit.user_agent || '-';

      return `
        <tr>
          <td class="visitor-time">${escapeHtml(timeStr)}</td>
          <td class="visitor-ip">${escapeHtml(ipStr)}</td>
          <td class="visitor-location">${escapeHtml(locationStr)}</td>
          <td class="visitor-country">${escapeHtml(countryStr)}</td>
          <td class="visitor-page">${escapeHtml(pageStr)}</td>
          <td class="visitor-ua" title="${escapeHtml(uaStr)}">${escapeHtml(truncateUA(uaStr))}</td>
        </tr>
      `;
    }).join('');
  }

  function formatDateTime(date) {
    return date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  function truncateUA(ua) {
    if (!ua || ua === '-') return '-';
    return ua.length > 50 ? ua.substring(0, 50) + '...' : ua;
  }

  function formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  }

  function escapeHtml(text) { return InteractionsCommon.escapeHtml(text); }

  function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => { toast.remove(); }, 5000);
  }

  // Listen for theme changes to update chart
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.attributeName === 'data-theme') {
        const auth = InteractionsCommon.getAuthState();
        if (InteractionsCommon.isLoggedIn() && auth.isOwner) {
          loadStats();
        }
      }
    });
  });

  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme']
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
