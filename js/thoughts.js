// Thoughts - Twitter-like feed functionality
// Uses shared InteractionsCommon module
(function() {
  // Wait for common module to load
  if (typeof InteractionsCommon === 'undefined') {
    console.error('InteractionsCommon not loaded');
    return;
  }

  const { API_BASE, getAuthState, setAuthState, clearAuthState, formatTimeAgo,
          getInitials, escapeHtml, processContent } = InteractionsCommon;

  // API endpoints
  const API = {
    getPosts: `${API_BASE}/get_posts`,
    submit: `${API_BASE}/submit`,
    like: `${API_BASE}/like`,
    comment: `${API_BASE}/comment`,
    githubLogin: `${API_BASE}/auth/github`,
    deletePost: (id) => `${API_BASE}/post/${id}`,
    deleteComment: (id) => `${API_BASE}/comment/${id}`,
    editPost: (id) => `${API_BASE}/post/${id}`
  };

  // State
  let posts = [];
  let authToken = null;
  let isOwner = false;
  let currentUser = null;
  let selectedImages = [];

  // DOM Elements
  const feed = document.getElementById('thoughts-feed');
  const composeBox = document.getElementById('compose-box');
  const composeAvatar = document.getElementById('compose-avatar');
  const composeTextarea = document.getElementById('compose-text');
  const composeSubmit = document.getElementById('compose-submit');
  const imageInput = document.getElementById('image-input');
  const imagePreviewContainer = document.getElementById('image-preview-container');
  const lightbox = document.getElementById('image-lightbox');
  const lightboxImg = document.getElementById('lightbox-img');
  const loginBtn = document.getElementById('github-login-btn');
  const logoutBtn = document.getElementById('logout-btn');
  const toastContainer = document.getElementById('toast-container');
  const modalOverlay = document.getElementById('modal-overlay');
  const modalTitle = document.getElementById('modal-title');
  const modalMessage = document.getElementById('modal-message');
  const modalContent = document.getElementById('modal-content');
  const modalCancel = document.getElementById('modal-cancel');
  const modalConfirm = document.getElementById('modal-confirm');

  // Initialize
  document.addEventListener('DOMContentLoaded', init);

  function init() {
    handleAuthCallback();
    loadPosts();
    setupEventListeners();
    updateAuthUI();
  }

  // Handle OAuth callback - check for token in URL
  function handleAuthCallback() {
    const result = InteractionsCommon.handleAuthCallback();

    if (result) {
      if (result.success) {
        authToken = result.token;
        isOwner = result.isOwner;
        currentUser = result.user;
      } else if (result.error) {
        showToast(result.error, 'error');
      }
    } else {
      // Check for existing token
      const authState = getAuthState();
      authToken = authState.token;
      isOwner = authState.isOwner;
      currentUser = authState.user;
    }
  }

  // Update UI based on auth state
  function updateAuthUI() {
    const isAuthenticated = !!authToken;

    if (composeBox) {
      composeBox.classList.toggle('hidden', !isAuthenticated || !isOwner);
    }
    if (loginBtn) {
      loginBtn.classList.toggle('hidden', isAuthenticated);
    }
    if (logoutBtn) {
      logoutBtn.classList.toggle('hidden', !isAuthenticated);
    }

    if (composeAvatar && currentUser) {
      if (currentUser.avatar) {
        composeAvatar.innerHTML = `<img src="${currentUser.avatar}" alt="Avatar">`;
      } else if (currentUser.name) {
        composeAvatar.textContent = getInitials(currentUser.name);
      }
    }
  }

  // Login with GitHub
  function loginWithGitHub() {
    window.location.href = API.githubLogin;
  }

  // Logout
  function logout() {
    clearAuthState();
    authToken = null;
    isOwner = false;
    currentUser = null;
    updateAuthUI();
    loadPosts();
  }

  // Auto-resize textarea based on content
  function autoResizeTextarea(textarea) {
    if (!textarea) return;
    textarea.style.height = 'auto';
    const maxHeight = parseInt(getComputedStyle(textarea).maxHeight) || 400;
    const newHeight = Math.min(textarea.scrollHeight, maxHeight);
    textarea.style.height = newHeight + 'px';
  }

  // Setup event listeners
  function setupEventListeners() {
    if (loginBtn) {
      loginBtn.addEventListener('click', loginWithGitHub);
    }
    if (logoutBtn) {
      logoutBtn.addEventListener('click', logout);
    }

    if (composeSubmit) {
      composeSubmit.addEventListener('click', submitPost);
    }

    if (composeTextarea) {
      composeTextarea.addEventListener('input', () => {
        updateSubmitButton();
        autoResizeTextarea(composeTextarea);
      });
      composeTextarea.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          if (!composeSubmit.disabled) {
            submitPost();
          }
        }
      });
    }

    if (imageInput) {
      imageInput.addEventListener('change', handleImageSelect);
    }

    if (lightbox) {
      lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox || e.target.classList.contains('image-lightbox-close')) {
          closeLightbox();
        }
      });

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          if (lightbox.classList.contains('active')) {
            closeLightbox();
          }
          if (modalOverlay.classList.contains('active')) {
            closeModal();
          }
        }
      });
    }

    if (modalCancel) {
      modalCancel.addEventListener('click', closeModal);
    }
    if (modalOverlay) {
      modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
          closeModal();
        }
      });
    }
  }

  // ===== TOAST NOTIFICATIONS =====
  function showToast(message, type = 'info', duration = 4000) {
    const icons = {
      success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
      error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
      info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
    };

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <div class="toast-icon">${icons[type]}</div>
      <span class="toast-message">${escapeHtml(message)}</span>
      <button class="toast-close">&times;</button>
    `;

    toast.querySelector('.toast-close').addEventListener('click', () => removeToast(toast));
    toastContainer.appendChild(toast);

    setTimeout(() => removeToast(toast), duration);
  }

  function removeToast(toast) {
    toast.style.animation = 'slideOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }

  // ===== MODAL DIALOGS =====
  let modalResolve = null;

  function showModal(title, message, options = {}) {
    return new Promise((resolve) => {
      modalResolve = resolve;
      modalTitle.textContent = title;
      modalMessage.textContent = message;
      modalContent.innerHTML = options.content || '';

      modalConfirm.textContent = options.confirmText || 'Confirm';
      modalConfirm.className = `modal-btn ${options.confirmClass || 'confirm'}`;
      modalCancel.textContent = options.cancelText || 'Cancel';

      modalConfirm.onclick = () => {
        modalResolve = null;
        modalOverlay.classList.remove('active');
        document.body.style.overflow = '';
        resolve(true);
      };

      modalOverlay.classList.add('active');
      document.body.style.overflow = 'hidden';
    });
  }

  function closeModal() {
    modalOverlay.classList.remove('active');
    document.body.style.overflow = '';
    if (modalResolve) {
      modalResolve(false);
      modalResolve = null;
    }
  }

  // ===== LOADING STATES =====
  function showLoading() {
    if (feed) {
      feed.innerHTML = `
        <div class="skeleton-card">
          <div style="display: flex; gap: 0.75rem; margin-bottom: 1rem;">
            <div class="skeleton skeleton-avatar"></div>
            <div style="flex: 1;">
              <div class="skeleton skeleton-line short"></div>
              <div class="skeleton skeleton-line" style="width: 20%; height: 10px;"></div>
            </div>
          </div>
          <div class="skeleton skeleton-line long"></div>
          <div class="skeleton skeleton-line medium"></div>
          <div class="skeleton skeleton-image"></div>
        </div>
        <div class="skeleton-card">
          <div style="display: flex; gap: 0.75rem; margin-bottom: 1rem;">
            <div class="skeleton skeleton-avatar"></div>
            <div style="flex: 1;">
              <div class="skeleton skeleton-line short"></div>
              <div class="skeleton skeleton-line" style="width: 20%; height: 10px;"></div>
            </div>
          </div>
          <div class="skeleton skeleton-line long"></div>
          <div class="skeleton skeleton-line short"></div>
        </div>
      `;
    }
  }

  function showLoginRequired() {
    if (feed) {
      feed.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M12 15v2m0 0v2m0-2h2m-2 0H10m2-6V7a4 4 0 10-8 0v4h8z"/>
            <rect x="5" y="11" width="14" height="10" rx="2"/>
          </svg>
          <h3>Login to View Thoughts</h3>
          <p>Sign in with GitHub to see posts, like, and comment.</p>
        </div>
        <div class="login-preview">
          <div class="login-preview-title">Preview of what you'll see</div>
          <div class="preview-post">
            <div class="preview-avatar"></div>
            <div class="preview-content">
              <div class="preview-line"></div>
              <div class="preview-line"></div>
              <div class="preview-line"></div>
            </div>
          </div>
        </div>
      `;
    }
  }

  // Load posts from API
  async function loadPosts() {
    showLoading();

    if (!authToken) {
      showLoginRequired();
      return;
    }

    try {
      const response = await fetch(API.getPosts, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (response.status === 401 || response.status === 403) {
        logout();
        showLoginRequired();
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to load posts');
      }

      posts = await response.json();
      renderPosts();
    } catch (error) {
      console.error('Error loading posts:', error);
      showError('Failed to load posts. Please try again later.');
    }
  }

  // Render posts
  function renderPosts() {
    if (!feed) return;

    if (posts.length === 0) {
      feed.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
          </svg>
          <h3>No thoughts yet</h3>
          <p>Check back later for updates.</p>
        </div>
      `;
      return;
    }

    feed.innerHTML = posts.map(post => renderPost(post)).join('');
    attachPostEventListeners();
  }

  // Render single post
  function renderPost(post) {
    const postDate = new Date(post.created_at);
    const timeAgo = formatTimeAgo(postDate);
    const fullDate = postDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const images = post.images || [];
    const comments = post.comments || [];
    const likeCount = post.likes || 0;
    const commentCount = comments.length;
    const isLiked = post.user_liked || false;
    const authorAvatar = post.author_avatar;

    const avatarContent = authorAvatar
      ? `<img src="${escapeHtml(authorAvatar)}" alt="${escapeHtml(post.author)}">`
      : getInitials(post.author);

    let imagesHTML = '';
    if (images.length > 0) {
      const imageClass = images.length === 1 ? 'single' :
                         images.length === 2 ? 'double' :
                         images.length === 3 ? 'triple' : 'quad';

      imagesHTML = `
        <div class="post-images ${imageClass}">
          ${images.slice(0, 4).map(img => `
            <img src="${escapeHtml(img)}" alt="Post image" class="post-image" onclick="thoughts.openLightbox('${escapeHtml(img)}')">
          `).join('')}
        </div>
      `;
    }

    const commentsHTML = comments.map(comment => {
      const commentAvatarContent = comment.author_avatar
        ? `<img src="${escapeHtml(comment.author_avatar)}" alt="${escapeHtml(comment.author)}">`
        : getInitials(comment.author);

      return `
        <div class="comment" data-comment-id="${comment.id}">
          <div class="comment-avatar">${commentAvatarContent}</div>
          <div class="comment-content">
            <span class="comment-author">${escapeHtml(comment.author)}</span>
            <p class="comment-text">${escapeHtml(comment.text)}</p>
            <span class="comment-time">${formatTimeAgo(new Date(comment.created_at))}</span>
          </div>
          ${isOwner ? `
            <button class="comment-delete-btn" data-comment-id="${comment.id}" data-post-id="${post.id}" title="Delete comment">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
            </button>
          ` : ''}
        </div>
      `;
    }).join('');

    const ownerButtonsHTML = isOwner ? `
      <button class="post-edit-btn" data-post-id="${post.id}" title="Edit post">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
      </button>
      <button class="post-delete-btn" data-post-id="${post.id}" title="Delete post">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
        </svg>
      </button>
    ` : '';

    const processedContent = processContent(post.text);

    return `
      <article class="post-card fade-in" data-post-id="${post.id}">
        <div class="post-header">
          <div class="post-avatar">${avatarContent}</div>
          <div class="post-meta">
            <div class="post-author">${escapeHtml(post.author)}</div>
            <div class="post-time" data-tooltip="${fullDate}">${timeAgo}</div>
          </div>
          <div style="margin-left: auto; display: flex; gap: 0.25rem;">
            ${ownerButtonsHTML}
          </div>
        </div>
        <div class="post-body">
          <div class="post-content">${processedContent}</div>
        </div>
        ${imagesHTML ? `<div class="post-images-container">${imagesHTML}</div>` : ''}
        <div class="post-actions">
          <button class="post-action like-btn ${isLiked ? 'liked' : ''}" data-post-id="${post.id}">
            <svg viewBox="0 0 24 24" fill="${isLiked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
            <span class="post-action-count">${likeCount > 0 ? likeCount : ''}</span>
          </button>
          <button class="post-action comment-btn" data-post-id="${post.id}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
            </svg>
            <span class="post-action-count">${commentCount > 0 ? commentCount : ''}</span>
          </button>
          <button class="post-action share-btn" data-post-id="${post.id}" title="Share">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="18" cy="5" r="3"/>
              <circle cx="6" cy="12" r="3"/>
              <circle cx="18" cy="19" r="3"/>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
            </svg>
          </button>
        </div>
        <div class="post-comments hidden" data-post-id="${post.id}">
          ${commentsHTML}
          <div class="comment-input-container">
            <div class="comment-input-avatar">${currentUser && currentUser.avatar ? `<img src="${escapeHtml(currentUser.avatar)}" alt="Your avatar">` : getInitials(currentUser?.name || 'You')}</div>
            <input type="text" class="comment-input" placeholder="Write a comment..." data-post-id="${post.id}">
            <button class="comment-submit" data-post-id="${post.id}">Post</button>
          </div>
        </div>
      </article>
    `;
  }

  // Attach event listeners to posts
  function attachPostEventListeners() {
    document.querySelectorAll('.like-btn').forEach(btn => {
      btn.addEventListener('click', () => handleLike(btn.dataset.postId));
    });

    document.querySelectorAll('.comment-btn').forEach(btn => {
      btn.addEventListener('click', () => toggleComments(btn.dataset.postId));
    });

    document.querySelectorAll('.share-btn').forEach(btn => {
      btn.addEventListener('click', () => handleShare(btn.dataset.postId));
    });

    document.querySelectorAll('.comment-submit').forEach(btn => {
      btn.addEventListener('click', () => submitComment(btn.dataset.postId));
    });

    document.querySelectorAll('.post-edit-btn').forEach(btn => {
      btn.addEventListener('click', () => handleEditPost(btn.dataset.postId));
    });

    document.querySelectorAll('.post-delete-btn').forEach(btn => {
      btn.addEventListener('click', () => handleDeletePost(btn.dataset.postId));
    });

    document.querySelectorAll('.comment-delete-btn').forEach(btn => {
      btn.addEventListener('click', () => handleDeleteComment(btn.dataset.commentId, btn.dataset.postId));
    });

    document.querySelectorAll('.comment-input').forEach(input => {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          submitComment(input.dataset.postId);
        }
      });
    });
  }

  // ===== SHARE FUNCTIONALITY =====
  async function handleShare(postId) {
    const url = `${window.location.origin}${window.location.pathname}#post-${postId}`;

    try {
      await navigator.clipboard.writeText(url);
      showToast('Link copied to clipboard!', 'success');
    } catch (err) {
      const textarea = document.createElement('textarea');
      textarea.value = url;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      showToast('Link copied to clipboard!', 'success');
    }
  }

  // ===== EDIT POST =====
  function handleEditPost(postId) {
    const post = posts.find(p => p.id == postId);
    if (!post) return;

    const postCard = document.querySelector(`.post-card[data-post-id="${postId}"]`);
    if (!postCard) return;

    const contentEl = postCard.querySelector('.post-content');
    if (!contentEl) return;

    // Store original content
    const originalText = post.text;

    // Replace content with textarea
    const textarea = document.createElement('textarea');
    textarea.className = 'inline-edit-textarea';
    textarea.value = originalText;

    // Create action buttons
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'inline-edit-actions';
    actionsDiv.innerHTML = `
      <button class="inline-edit-cancel">Cancel</button>
      <button class="inline-edit-save">Save</button>
    `;

    // Hide original content and show textarea
    contentEl.style.display = 'none';
    contentEl.parentNode.insertBefore(textarea, contentEl.nextSibling);
    contentEl.parentNode.insertBefore(actionsDiv, textarea.nextSibling);

    // Auto-resize and focus
    autoResizeTextarea(textarea);
    textarea.focus();
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);

    // Handle input for auto-resize
    textarea.addEventListener('input', () => autoResizeTextarea(textarea));

    // Cancel button
    actionsDiv.querySelector('.inline-edit-cancel').addEventListener('click', () => {
      textarea.remove();
      actionsDiv.remove();
      contentEl.style.display = '';
    });

    // Save button
    actionsDiv.querySelector('.inline-edit-save').addEventListener('click', async () => {
      const newText = textarea.value.trim();

      if (!newText) {
        showToast('Post cannot be empty', 'error');
        return;
      }

      if (newText === originalText) {
        textarea.remove();
        actionsDiv.remove();
        contentEl.style.display = '';
        return;
      }

      const saveBtn = actionsDiv.querySelector('.inline-edit-save');
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving...';

      try {
        const response = await fetch(API.editPost(postId), {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify({ text: newText })
        });

        if (!response.ok) {
          throw new Error('Failed to edit post');
        }

        post.text = newText;
        contentEl.innerHTML = processContent(newText);

        textarea.remove();
        actionsDiv.remove();
        contentEl.style.display = '';

        showToast('Post updated successfully!', 'success');
      } catch (error) {
        console.error('Error editing post:', error);
        showToast('Failed to edit post. Please try again.', 'error');
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save';
      }
    });

    // Keyboard shortcuts
    textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        textarea.remove();
        actionsDiv.remove();
        contentEl.style.display = '';
      } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        actionsDiv.querySelector('.inline-edit-save').click();
      }
    });
  }

  // Handle like
  async function handleLike(postId) {
    const btn = document.querySelector(`.like-btn[data-post-id="${postId}"]`);
    const countSpan = btn.querySelector('.post-action-count');
    const isLiked = btn.classList.contains('liked');
    const svg = btn.querySelector('svg');

    btn.classList.toggle('liked');
    svg.setAttribute('fill', isLiked ? 'none' : 'currentColor');

    const currentCount = parseInt(countSpan.textContent) || 0;
    const newCount = isLiked ? currentCount - 1 : currentCount + 1;
    countSpan.textContent = newCount > 0 ? newCount : '';

    try {
      const response = await fetch(API.like, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ post_id: postId, unlike: isLiked })
      });

      if (response.status === 401 || response.status === 403) {
        logout();
        showLoginRequired();
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to like post');
      }

      const data = await response.json();
      const post = posts.find(p => p.id == postId);
      if (post) {
        post.likes = data.likes;
        post.user_liked = data.user_liked;
      }

      countSpan.textContent = data.likes > 0 ? data.likes : '';
      btn.classList.toggle('liked', data.user_liked);
      svg.setAttribute('fill', data.user_liked ? 'currentColor' : 'none');

    } catch (error) {
      console.error('Error liking post:', error);
      btn.classList.toggle('liked');
      svg.setAttribute('fill', isLiked ? 'currentColor' : 'none');
      countSpan.textContent = currentCount > 0 ? currentCount : '';
    }
  }

  // Toggle comments section
  function toggleComments(postId) {
    const commentsSection = document.querySelector(`.post-comments[data-post-id="${postId}"]`);
    if (commentsSection) {
      commentsSection.classList.toggle('hidden');
      if (!commentsSection.classList.contains('hidden')) {
        commentsSection.querySelector('.comment-input').focus();
      }
    }
  }

  // Submit comment
  async function submitComment(postId) {
    const input = document.querySelector(`.comment-input[data-post-id="${postId}"]`);
    const text = input.value.trim();

    if (!text) return;

    const wordCount = text.split(/\s+/).filter(word => word.length > 0).length;
    if (wordCount > 100) {
      showToast(`Comment too long (${wordCount} words). Maximum is 100 words.`, 'error');
      return;
    }

    const submitBtn = document.querySelector(`.comment-submit[data-post-id="${postId}"]`);
    submitBtn.disabled = true;
    submitBtn.textContent = 'Posting...';

    try {
      const response = await fetch(API.comment, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ post_id: postId, text: text })
      });

      if (response.status === 401 || response.status === 403) {
        logout();
        showLoginRequired();
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to post comment');
      }

      const newComment = await response.json();

      const commentsSection = document.querySelector(`.post-comments[data-post-id="${postId}"]`);
      const inputContainer = commentsSection.querySelector('.comment-input-container');

      const commentAvatarContent = newComment.author_avatar
        ? `<img src="${escapeHtml(newComment.author_avatar)}" alt="${escapeHtml(newComment.author)}">`
        : getInitials(newComment.author);

      const deleteBtn = isOwner ? `
        <button class="comment-delete-btn" data-comment-id="${newComment.id}" data-post-id="${postId}" title="Delete comment">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          </svg>
        </button>
      ` : '';

      const commentHTML = `
        <div class="comment" data-comment-id="${newComment.id}">
          <div class="comment-avatar">${commentAvatarContent}</div>
          <div class="comment-content">
            <span class="comment-author">${escapeHtml(newComment.author)}</span>
            <p class="comment-text">${escapeHtml(newComment.text)}</p>
            <span class="comment-time">Just now</span>
          </div>
          ${deleteBtn}
        </div>
      `;

      inputContainer.insertAdjacentHTML('beforebegin', commentHTML);

      if (isOwner) {
        const newCommentEl = commentsSection.querySelector(`.comment[data-comment-id="${newComment.id}"] .comment-delete-btn`);
        if (newCommentEl) {
          newCommentEl.addEventListener('click', () => handleDeleteComment(newComment.id, postId));
        }
      }

      input.value = '';

      const countSpan = document.querySelector(`.comment-btn[data-post-id="${postId}"] .post-action-count`);
      const currentCount = parseInt(countSpan.textContent) || 0;
      countSpan.textContent = currentCount + 1;

      showToast('Comment posted!', 'success');

    } catch (error) {
      console.error('Error posting comment:', error);
      showToast('Failed to post comment. Please try again.', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Post';
    }
  }

  // Delete a post (owner only)
  async function handleDeletePost(postId) {
    const confirmed = await showModal(
      'Delete Post',
      'Are you sure you want to delete this post? This action cannot be undone.',
      { confirmText: 'Delete', confirmClass: 'confirm' }
    );

    if (!confirmed) return;

    try {
      const response = await fetch(API.deletePost(postId), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (response.status === 401 || response.status === 403) {
        showToast('You do not have permission to delete this post.', 'error');
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to delete post');
      }

      const postCard = document.querySelector(`.post-card[data-post-id="${postId}"]`);
      if (postCard) {
        postCard.remove();
      }

      posts = posts.filter(p => p.id != postId);

      if (posts.length === 0) {
        renderPosts();
      }

      showToast('Post deleted successfully.', 'success');

    } catch (error) {
      console.error('Error deleting post:', error);
      showToast('Failed to delete post. Please try again.', 'error');
    }
  }

  // Delete a comment (owner only)
  async function handleDeleteComment(commentId, postId) {
    const confirmed = await showModal(
      'Delete Comment',
      'Are you sure you want to delete this comment?',
      { confirmText: 'Delete', confirmClass: 'confirm' }
    );

    if (!confirmed) return;

    try {
      const response = await fetch(API.deleteComment(commentId), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (response.status === 401 || response.status === 403) {
        showToast('You do not have permission to delete this comment.', 'error');
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to delete comment');
      }

      const commentEl = document.querySelector(`.comment[data-comment-id="${commentId}"]`);
      if (commentEl) {
        commentEl.remove();
      }

      const countSpan = document.querySelector(`.comment-btn[data-post-id="${postId}"] .post-action-count`);
      const currentCount = parseInt(countSpan.textContent) || 0;
      countSpan.textContent = currentCount > 1 ? currentCount - 1 : '';

      showToast('Comment deleted.', 'success');

    } catch (error) {
      console.error('Error deleting comment:', error);
      showToast('Failed to delete comment. Please try again.', 'error');
    }
  }

  // Submit new post
  async function submitPost() {
    if (!composeTextarea || !authToken) return;

    const text = composeTextarea.value.trim();
    if (!text && selectedImages.length === 0) return;

    composeSubmit.disabled = true;
    composeSubmit.textContent = 'Posting...';

    try {
      const formData = new FormData();
      if (text) {
        formData.append('text', text);
      }

      selectedImages.forEach((file, index) => {
        formData.append(`image_${index}`, file);
      });

      const response = await fetch(API.submit, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        body: formData
      });

      if (response.status === 401) {
        showToast('Session expired. Please login again.', 'error');
        logout();
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to submit post');
      }

      const newPost = await response.json();

      posts.unshift(newPost);
      renderPosts();

      composeTextarea.value = '';
      composeTextarea.style.height = 'auto';
      selectedImages = [];
      imagePreviewContainer.innerHTML = '';
      updateSubmitButton();

      composeSubmit.classList.add('success');
      setTimeout(() => {
        composeSubmit.classList.remove('success');
      }, 600);

      showToast('Posted successfully!', 'success');

    } catch (error) {
      console.error('Error submitting post:', error);
      showToast('Failed to post. Please try again.', 'error');
    } finally {
      composeSubmit.disabled = false;
      composeSubmit.textContent = 'Post';
    }
  }

  // Handle image selection
  function handleImageSelect(e) {
    const files = Array.from(e.target.files);
    const MAX_FILE_SIZE = 20 * 1024 * 1024;

    const remaining = 4 - selectedImages.length;
    const newFiles = files.slice(0, remaining);

    newFiles.forEach(file => {
      if (!file.type.startsWith('image/')) {
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
        showToast(`Image "${file.name}" is too large (${sizeMB}MB). Maximum size is 20MB.`, 'error');
        return;
      }

      selectedImages.push(file);
      addImagePreview(file);
    });

    updateSubmitButton();
    e.target.value = '';
  }

  // Add image preview
  function addImagePreview(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const preview = document.createElement('div');
      preview.className = 'image-preview';
      preview.innerHTML = `
        <img src="${e.target.result}" alt="Preview">
        <button class="image-preview-remove" type="button">&times;</button>
      `;

      preview.querySelector('.image-preview-remove').addEventListener('click', () => {
        const index = selectedImages.indexOf(file);
        if (index > -1) {
          selectedImages.splice(index, 1);
        }
        preview.remove();
        updateSubmitButton();
      });

      imagePreviewContainer.appendChild(preview);
    };
    reader.readAsDataURL(file);
  }

  // Update submit button state
  function updateSubmitButton() {
    if (!composeSubmit || !composeTextarea) return;

    const hasContent = composeTextarea.value.trim().length > 0 || selectedImages.length > 0;
    composeSubmit.disabled = !hasContent;
  }

  // Open lightbox
  function openLightbox(src) {
    if (lightbox && lightboxImg) {
      lightboxImg.src = src;
      lightbox.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  }

  // Close lightbox
  function closeLightbox() {
    if (lightbox) {
      lightbox.classList.remove('active');
      document.body.style.overflow = '';
    }
  }

  // Show error
  function showError(message) {
    if (feed) {
      feed.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <h3>Something went wrong</h3>
          <p>${escapeHtml(message)}</p>
        </div>
      `;
    }
  }

  // Expose necessary functions globally
  window.thoughts = {
    openLightbox,
    refresh: loadPosts
  };
})();
