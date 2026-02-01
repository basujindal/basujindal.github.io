// Stats Dashboard JavaScript
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

  // Chart and map instances
  let activityChart = null;
  let visitorMap = null;

  // Initialize
  function init() {
    // Handle auth callback
    const authResult = InteractionsCommon.handleAuthCallback(cleanUrl);
    if (authResult && !authResult.success) {
      showToast(authResult.error, 'error');
    }

    // Check auth state
    checkAuth();

    // Event listeners
    loginBtn.addEventListener('click', handleLogin);
    logoutBtn.addEventListener('click', handleLogout);
  }

  function cleanUrl() {
    const url = new URL(window.location);
    url.searchParams.delete('token');
    url.searchParams.delete('is_owner');
    url.searchParams.delete('user_name');
    url.searchParams.delete('user_avatar');
    url.searchParams.delete('error');
    window.history.replaceState({}, document.title, url.toString());
  }

  function checkAuth() {
    const auth = InteractionsCommon.getAuthState();

    if (auth.token && auth.isOwner) {
      // Show dashboard
      authRequired.classList.add('hidden');
      statsDashboard.classList.remove('hidden');
      logoutContainer.classList.remove('hidden');
      loadStats();
    } else if (auth.token && !auth.isOwner) {
      // Logged in but not owner
      showToast('Only the site owner can access this page.', 'error');
      authRequired.classList.remove('hidden');
      statsDashboard.classList.add('hidden');
    } else {
      // Not logged in
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
    const auth = InteractionsCommon.getAuthState();

    try {
      const response = await fetch(STATS_API, {
        headers: InteractionsCommon.getAuthHeaders(auth.token)
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
    // Render totals
    document.getElementById('stat-total-visits').textContent = formatNumber(data.totals.total_visits);
    document.getElementById('stat-posts').textContent = formatNumber(data.totals.posts);
    document.getElementById('stat-blog-posts').textContent = formatNumber(data.totals.blog_posts);
    document.getElementById('stat-unique-users').textContent = formatNumber(data.totals.unique_users);
    document.getElementById('stat-total-logins').textContent = formatNumber(data.totals.total_logins);

    // Render visitor details table
    renderVisitorDetails(data.visit_locations);

    // Render visits chart
    renderVisitsChart(data.visits_by_day);

    // Render visitor map
    renderVisitorMap(data.visit_locations);

    // Render country grid
    renderCountryGrid(data.visits_by_country);

    // Render blog table
    renderBlogTable(data.blog_stats);
  }

  function renderVisitsChart(visitsByDay) {
    const ctx = document.getElementById('activity-chart').getContext('2d');

    if (!visitsByDay || visitsByDay.length === 0) {
      ctx.font = '16px -apple-system, sans-serif';
      ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary');
      ctx.textAlign = 'center';
      ctx.fillText('No visit data yet', ctx.canvas.width / 2, ctx.canvas.height / 2);
      return;
    }

    // Take last 30 days max
    const recentData = visitsByDay.slice(-30);

    const labels = recentData.map(d => formatDate(d.date));
    const visitsData = recentData.map(d => d.count);

    // Destroy existing chart
    if (activityChart) {
      activityChart.destroy();
    }

    // Get theme colors
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const gridColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
    const textColor = isDark ? '#a1a1aa' : '#64748b';

    activityChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Visits',
            data: visitsData,
            borderColor: '#f97316',
            backgroundColor: 'rgba(249, 115, 22, 0.15)',
            tension: 0.4,
            fill: true,
            pointBackgroundColor: '#f97316',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          intersect: false,
          mode: 'index'
        },
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: isDark ? '#1c1c1c' : '#ffffff',
            titleColor: isDark ? '#d4d4d8' : '#1a1a2e',
            bodyColor: isDark ? '#a1a1aa' : '#64748b',
            borderColor: isDark ? '#2e2e2e' : '#e8e6e1',
            borderWidth: 1,
            padding: 12,
            displayColors: false,
            callbacks: {
              title: function(context) {
                return context[0].label;
              },
              label: function(context) {
                return `${context.parsed.y} visit${context.parsed.y !== 1 ? 's' : ''}`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: {
              color: gridColor
            },
            ticks: {
              color: textColor,
              maxTicksLimit: 10
            }
          },
          y: {
            beginAtZero: true,
            grid: {
              color: gridColor
            },
            ticks: {
              color: textColor,
              stepSize: 1
            }
          }
        }
      }
    });
  }

  function renderVisitorMap(locations) {
    const mapContainer = document.getElementById('visitor-map');

    // Initialize map if not already done
    if (!visitorMap) {
      visitorMap = L.map('visitor-map').setView([20, 0], 2);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 18
      }).addTo(visitorMap);
    } else {
      // Clear existing markers
      visitorMap.eachLayer(layer => {
        if (layer instanceof L.CircleMarker) {
          visitorMap.removeLayer(layer);
        }
      });
    }

    if (!locations || locations.length === 0) {
      return;
    }

    // Group visits by approximate location (to avoid overlapping markers)
    const locationGroups = {};
    locations.forEach(loc => {
      const key = `${Math.round(loc.latitude * 10) / 10},${Math.round(loc.longitude * 10) / 10}`;
      if (!locationGroups[key]) {
        locationGroups[key] = {
          lat: loc.latitude,
          lng: loc.longitude,
          city: loc.city,
          country: loc.country,
          count: 0,
          lastVisit: loc.visited_at
        };
      }
      locationGroups[key].count++;
      if (new Date(loc.visited_at) > new Date(locationGroups[key].lastVisit)) {
        locationGroups[key].lastVisit = loc.visited_at;
      }
    });

    // Add markers
    Object.values(locationGroups).forEach(group => {
      const radius = Math.min(Math.max(group.count * 2, 5), 20);

      const marker = L.circleMarker([group.lat, group.lng], {
        radius: radius,
        fillColor: '#f97316',
        color: '#fff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.7
      }).addTo(visitorMap);

      const locationName = group.city ? `${group.city}, ${group.country}` : group.country;
      marker.bindPopup(`
        <div class="popup-location">${escapeHtml(locationName)}</div>
        <div class="popup-time">${group.count} visit${group.count !== 1 ? 's' : ''}</div>
        <div class="popup-time">Last: ${formatTimeAgo(new Date(group.lastVisit))}</div>
      `);
    });

    // Fit bounds if we have locations
    if (Object.keys(locationGroups).length > 0) {
      const bounds = Object.values(locationGroups).map(g => [g.lat, g.lng]);
      if (bounds.length > 1) {
        visitorMap.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }

  function renderCountryGrid(countries) {
    const container = document.getElementById('country-grid');

    if (!countries || countries.length === 0) {
      container.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 2rem; grid-column: 1 / -1;">No country data yet</p>';
      return;
    }

    container.innerHTML = countries.map(country => {
      const flag = countryCodeToFlag(country.country_code);
      return `
        <div class="country-card">
          <span class="country-flag">${flag}</span>
          <div class="country-info">
            <div class="country-name">${escapeHtml(country.country)}</div>
            <div class="country-count">${country.count} visit${country.count !== 1 ? 's' : ''}</div>
          </div>
        </div>
      `;
    }).join('');
  }

  function countryCodeToFlag(countryCode) {
    if (!countryCode || countryCode.length !== 2) return '🌍';
    const codePoints = countryCode
      .toUpperCase()
      .split('')
      .map(char => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  }

  function renderBlogTable(blogStats) {
    const tbody = document.querySelector('#blog-table tbody');

    if (!blogStats || blogStats.length === 0) {
      tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: var(--text-secondary);">No blog data yet</td></tr>';
      return;
    }

    tbody.innerHTML = blogStats.map(blog => `
      <tr>
        <td class="blog-slug">
          <a href="post.html?section=blogs&p=${encodeURIComponent(blog.slug)}" target="_blank">
            ${escapeHtml(blog.slug)}
          </a>
        </td>
        <td>
          <span class="stat-number likes-col">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
            ${blog.likes}
          </span>
        </td>
        <td>
          <span class="stat-number comments-col">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
            </svg>
            ${blog.comment_count}
          </span>
        </td>
      </tr>
    `).join('');
  }

  function renderVisitorDetails(locations) {
    const tbody = document.querySelector('#visitor-table tbody');
    const toggle = document.getElementById('visitor-details-toggle');
    const content = document.getElementById('visitor-details-content');

    // Setup collapsible toggle
    toggle.addEventListener('click', () => {
      toggle.classList.toggle('collapsed');
      content.classList.toggle('collapsed');
    });

    if (!locations || locations.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-secondary);">No visitor data yet</td></tr>';
      return;
    }

    // Sort by most recent first
    const sortedLocations = [...locations].sort((a, b) =>
      new Date(b.visited_at) - new Date(a.visited_at)
    );

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
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function truncateUA(ua) {
    if (!ua || ua === '-') return '-';
    return ua.length > 50 ? ua.substring(0, 50) + '...' : ua;
  }

  // Utility functions
  function formatNumber(num) {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  }

  function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  }

  function formatTimeAgo(date) {
    return InteractionsCommon.formatTimeAgo(date);
  }

  function escapeHtml(text) {
    return InteractionsCommon.escapeHtml(text);
  }

  function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, 5000);
  }

  // Listen for theme changes to update chart
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.attributeName === 'data-theme') {
        // Re-render chart with new theme colors
        const auth = InteractionsCommon.getAuthState();
        if (auth.token && auth.isOwner && activityChart) {
          loadStats();
        }
      }
    });
  });

  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme']
  });

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
