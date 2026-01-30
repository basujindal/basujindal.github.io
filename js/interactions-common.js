// Shared Interactions - Common code for blog and thoughts interactions
(function() {
  const API_BASE = 'https://server.basujindal.me/api';

  // Storage keys
  const STORAGE_KEYS = {
    token: 'thoughts_token',
    isOwner: 'thoughts_is_owner',
    userName: 'thoughts_user_name',
    userAvatar: 'thoughts_user_avatar'
  };

  // Shared API endpoints
  const SharedAPI = {
    githubLogin: `${API_BASE}/auth/github`
  };

  // ===== AUTH MANAGEMENT =====

  function getAuthState() {
    return {
      token: localStorage.getItem(STORAGE_KEYS.token),
      isOwner: localStorage.getItem(STORAGE_KEYS.isOwner) === 'true',
      user: {
        name: localStorage.getItem(STORAGE_KEYS.userName),
        avatar: localStorage.getItem(STORAGE_KEYS.userAvatar)
      }
    };
  }

  function setAuthState(token, isOwner, userName, userAvatar) {
    localStorage.setItem(STORAGE_KEYS.token, token);
    localStorage.setItem(STORAGE_KEYS.isOwner, isOwner ? 'true' : 'false');
    if (userName) localStorage.setItem(STORAGE_KEYS.userName, userName);
    if (userAvatar) localStorage.setItem(STORAGE_KEYS.userAvatar, userAvatar);
  }

  function clearAuthState() {
    localStorage.removeItem(STORAGE_KEYS.token);
    localStorage.removeItem(STORAGE_KEYS.isOwner);
    localStorage.removeItem(STORAGE_KEYS.userName);
    localStorage.removeItem(STORAGE_KEYS.userAvatar);
  }

  function handleAuthCallback(cleanUrlCallback) {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const ownerParam = params.get('is_owner');
    const userName = params.get('user_name');
    const userAvatar = params.get('user_avatar');
    const error = params.get('error');

    if (token) {
      setAuthState(token, ownerParam === 'true', userName, userAvatar);
      if (cleanUrlCallback) {
        cleanUrlCallback();
      } else {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
      return { success: true, token, isOwner: ownerParam === 'true', user: { name: userName, avatar: userAvatar } };
    } else if (error) {
      const errorMessages = {
        'github_denied': 'GitHub authorization was denied.',
        'token_exchange_failed': 'Authentication failed. Please try again.',
        'user_fetch_failed': 'Could not verify GitHub user.',
        'no_code': 'Authentication failed. Please try again.',
        'no_access_token': 'Authentication failed. Please try again.'
      };
      if (cleanUrlCallback) {
        cleanUrlCallback();
      } else {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
      return { success: false, error: errorMessages[error] || 'Authentication failed.' };
    }

    return null; // No auth callback in URL
  }

  function getLoginUrl(returnUrl) {
    if (returnUrl) {
      return `${SharedAPI.githubLogin}?return_url=${encodeURIComponent(returnUrl)}`;
    }
    return SharedAPI.githubLogin;
  }

  // ===== UTILITY FUNCTIONS =====

  function formatTimeAgo(date) {
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  }

  function getInitials(name) {
    if (!name) return '?';
    return name.split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // ===== UI COMPONENTS =====

  function renderGitHubLoginButton(onClick) {
    return `
      <button class="github-login-btn" onclick="${onClick}">
        <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
          <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
        </svg>
        Sign in with GitHub
      </button>
    `;
  }

  function renderAvatar(avatarUrl, name, className) {
    const cls = className || 'avatar';
    if (avatarUrl) {
      return `<div class="${cls}"><img src="${escapeHtml(avatarUrl)}" alt="${escapeHtml(name || 'User')}"></div>`;
    }
    return `<div class="${cls}"><span class="avatar-initials">${getInitials(name || 'A')}</span></div>`;
  }

  function renderAvatarContent(avatarUrl, name) {
    if (avatarUrl) {
      return `<img src="${escapeHtml(avatarUrl)}" alt="${escapeHtml(name || 'User')}">`;
    }
    return `<span class="avatar-initials">${getInitials(name || 'A')}</span>`;
  }

  function renderLikeButton(isLiked, likeCount, onClick) {
    return `
      <button class="like-btn ${isLiked ? 'liked' : ''}" onclick="${onClick}">
        <svg viewBox="0 0 24 24" fill="${isLiked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>
        <span class="like-count">${likeCount}</span>
        <span class="like-text">${likeCount === 1 ? 'like' : 'likes'}</span>
      </button>
    `;
  }

  function renderDeleteButton(onClick, title) {
    return `
      <button class="delete-btn" onclick="${onClick}" title="${title || 'Delete'}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
        </svg>
      </button>
    `;
  }

  // ===== API HELPERS =====

  function getAuthHeaders(token) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  async function fetchWithAuth(url, options = {}, token) {
    const headers = { ...getAuthHeaders(token), ...options.headers };
    const response = await fetch(url, { ...options, headers });

    if (response.status === 401 || response.status === 403) {
      return { error: 'unauthorized', response };
    }

    return { response };
  }

  // ===== CONTENT PROCESSING =====

  function extractDomain(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace(/^www\./, '');
    } catch {
      return url;
    }
  }

  function renderLinkPreview(url) {
    const domain = extractDomain(url);
    const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;

    return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="link-preview">
      <img src="${faviconUrl}" alt="" class="link-preview-favicon" onerror="this.style.display='none'">
      <div class="link-preview-content">
        <span class="link-preview-domain">${escapeHtml(domain)}</span>
        <span class="link-preview-url">${escapeHtml(url)}</span>
      </div>
      <svg class="link-preview-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
        <polyline points="15 3 21 3 21 9"/>
        <line x1="10" y1="14" x2="21" y2="3"/>
      </svg>
    </a>`;
  }

  function processContent(text) {
    if (!text) return '';

    // First, extract URLs before escaping to preserve them
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = text.match(urlRegex) || [];

    // Create placeholders for URLs (using alphanumeric markers to avoid markdown and HTML escaping)
    let processed = text;
    const urlPlaceholders = {};
    urls.forEach((url, i) => {
      const placeholder = `URLPLACEHOLDER${i}ENDURL`;
      urlPlaceholders[placeholder] = url;
      processed = processed.replace(url, placeholder);
    });

    // Extract code blocks before escaping
    const codeBlockRegex = /```(\w*)\n?([\s\S]*?)```/g;
    const codeBlocks = [];
    let match;
    while ((match = codeBlockRegex.exec(processed)) !== null) {
      codeBlocks.push({ full: match[0], lang: match[1], code: match[2] });
    }

    // Create placeholders for code blocks (using alphanumeric markers)
    const codeBlockPlaceholders = {};
    codeBlocks.forEach((block, i) => {
      const placeholder = `CODEBLOCKPLACEHOLDER${i}ENDCODEBLOCK`;
      codeBlockPlaceholders[placeholder] = block;
      processed = processed.replace(block.full, placeholder);
    });

    // Now escape HTML
    processed = escapeHtml(processed);

    // Bold: **text** or __text__
    processed = processed.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    processed = processed.replace(/__(.*?)__/g, '<strong>$1</strong>');

    // Italic: *text* or _text_
    processed = processed.replace(/\*(.*?)\*/g, '<em>$1</em>');
    processed = processed.replace(/(?<![a-zA-Z0-9])_(.*?)_(?![a-zA-Z0-9])/g, '<em>$1</em>');

    // Inline code: `code`
    processed = processed.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Restore code blocks
    Object.keys(codeBlockPlaceholders).forEach(placeholder => {
      const block = codeBlockPlaceholders[placeholder];
      const langClass = block.lang ? ` language-${escapeHtml(block.lang)}` : '';
      const codeHtml = `<pre class="code-block${langClass}"><code>${escapeHtml(block.code.trim())}</code></pre>`;
      processed = processed.replace(placeholder, codeHtml);
    });

    // Restore URLs as link previews
    Object.keys(urlPlaceholders).forEach(placeholder => {
      const url = urlPlaceholders[placeholder];
      processed = processed.replace(placeholder, renderLinkPreview(url));
    });

    // Hashtags: #tag
    processed = processed.replace(/#(\w+)/g, '<span class="hashtag">#$1</span>');

    // Mentions: @username
    processed = processed.replace(/@(\w+)/g, '<span class="mention">@$1</span>');

    return processed;
  }

  // ===== EXPORT =====

  window.InteractionsCommon = {
    API_BASE,
    SharedAPI,
    STORAGE_KEYS,
    // Auth
    getAuthState,
    setAuthState,
    clearAuthState,
    handleAuthCallback,
    getLoginUrl,
    // Utilities
    formatTimeAgo,
    getInitials,
    escapeHtml,
    processContent,
    // UI Components
    renderGitHubLoginButton,
    renderAvatar,
    renderAvatarContent,
    renderLikeButton,
    renderDeleteButton,
    // API
    getAuthHeaders,
    fetchWithAuth
  };
})();
