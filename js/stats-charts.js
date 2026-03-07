// Stats Charts - chart rendering, map, country grid
// Exports: window.StatsCharts = { renderVisitsChart, renderVisitorMap, renderCountryGrid, countryCodeToFlag }
window.StatsCharts = (function() {
  let activityChart = null;
  let visitorMap = null;

  function renderVisitsChart(visitsByDay) {
    const ctx = document.getElementById('activity-chart').getContext('2d');

    if (!visitsByDay || visitsByDay.length === 0) {
      ctx.font = '16px -apple-system, sans-serif';
      ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary');
      ctx.textAlign = 'center';
      ctx.fillText('No visit data yet', ctx.canvas.width / 2, ctx.canvas.height / 2);
      return;
    }

    const recentData = visitsByDay.slice(-30);
    const labels = recentData.map(d => formatDate(d.date));
    const visitsData = recentData.map(d => d.count);

    if (activityChart) {
      activityChart.destroy();
    }

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
        interaction: { intersect: false, mode: 'index' },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: isDark ? '#1c1c1c' : '#ffffff',
            titleColor: isDark ? '#d4d4d8' : '#1a1a2e',
            bodyColor: isDark ? '#a1a1aa' : '#64748b',
            borderColor: isDark ? '#2e2e2e' : '#e8e6e1',
            borderWidth: 1,
            padding: 12,
            displayColors: false,
            callbacks: {
              title: function(context) { return context[0].label; },
              label: function(context) { return `${context.parsed.y} visit${context.parsed.y !== 1 ? 's' : ''}`; }
            }
          }
        },
        scales: {
          x: { grid: { color: gridColor }, ticks: { color: textColor, maxTicksLimit: 10 } },
          y: { beginAtZero: true, grid: { color: gridColor }, ticks: { color: textColor, stepSize: 1 } }
        }
      }
    });
  }

  function renderVisitorMap(locations) {
    if (!visitorMap) {
      visitorMap = L.map('visitor-map').setView([20, 0], 2);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 18
      }).addTo(visitorMap);
    } else {
      visitorMap.eachLayer(layer => {
        if (layer instanceof L.CircleMarker) {
          visitorMap.removeLayer(layer);
        }
      });
    }

    if (!locations || locations.length === 0) return;

    const locationGroups = {};
    locations.forEach(loc => {
      const key = `${Math.round(loc.latitude * 10) / 10},${Math.round(loc.longitude * 10) / 10}`;
      if (!locationGroups[key]) {
        locationGroups[key] = {
          lat: loc.latitude, lng: loc.longitude,
          city: loc.city, country: loc.country,
          count: 0, lastVisit: loc.visited_at
        };
      }
      locationGroups[key].count++;
      if (new Date(loc.visited_at) > new Date(locationGroups[key].lastVisit)) {
        locationGroups[key].lastVisit = loc.visited_at;
      }
    });

    Object.values(locationGroups).forEach(group => {
      const radius = Math.min(Math.max(group.count * 2, 5), 20);
      const marker = L.circleMarker([group.lat, group.lng], {
        radius, fillColor: '#f97316', color: '#fff',
        weight: 2, opacity: 1, fillOpacity: 0.7
      }).addTo(visitorMap);

      const locationName = group.city ? `${group.city}, ${group.country}` : group.country;
      marker.bindPopup(`
        <div class="popup-location">${InteractionsCommon.escapeHtml(locationName)}</div>
        <div class="popup-time">${group.count} visit${group.count !== 1 ? 's' : ''}</div>
        <div class="popup-time">Last: ${InteractionsCommon.formatTimeAgo(new Date(group.lastVisit))}</div>
      `);
    });

    visitorMap.setView([20, 0], 2);
    setTimeout(() => { visitorMap.invalidateSize(); }, 100);
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
            <div class="country-name">${InteractionsCommon.escapeHtml(country.country)}</div>
            <div class="country-count">${country.count} visit${country.count !== 1 ? 's' : ''}</div>
          </div>
        </div>
      `;
    }).join('');
  }

  function countryCodeToFlag(countryCode) {
    if (!countryCode || countryCode.length !== 2) return '\ud83c\udf0d';
    const codePoints = countryCode
      .toUpperCase()
      .split('')
      .map(char => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  }

  function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  return { renderVisitsChart, renderVisitorMap, renderCountryGrid, countryCodeToFlag };
})();
