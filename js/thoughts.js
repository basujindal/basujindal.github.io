// Thoughts - Twitter-like feed functionality
(function() {
  // API endpoints - configure your base URL here
  const API_BASE = 'https://server.basujindal.me/api';  // Change this to your actual API URL
  const API = {
    getPosts: `${API_BASE}/get_posts`,
    submit: `${API_BASE}/submit`,
    like: `${API_BASE}/like`,
    comment: `${API_BASE}/comment`,
    githubLogin: `${API_BASE}/auth/github`,
    deletePost: (id) => `${API_BASE}/post/${id}`,
    deleteComment: (id) => `${API_BASE}/comment/${id}`
  };

  // State
  let posts = [];
  let authToken = null;  // JWT token from GitHub OAuth
  let isOwner = false;   // Whether current user is the site owner
  let selectedImages = [];

  // DOM Elements
  const feed = document.getElementById('thoughts-feed');
  const composeBox = document.getElementById('compose-box');
  const composeTextarea = document.getElementById('compose-text');
  const composeSubmit = document.getElementById('compose-submit');
  const imageInput = document.getElementById('image-input');
  const imagePreviewContainer = document.getElementById('image-preview-container');
  const lightbox = document.getElementById('image-lightbox');
  const lightboxImg = document.getElementById('lightbox-img');
  const loginBtn = document.getElementById('github-login-btn');
  const logoutBtn = document.getElementById('logout-btn');

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
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const ownerParam = params.get('is_owner');
    const error = params.get('error');

    if (token) {
      // Store token and owner status, then clean URL
      localStorage.setItem('thoughts_token', token);
      localStorage.setItem('thoughts_is_owner', ownerParam === 'true' ? 'true' : 'false');
      authToken = token;
      isOwner = ownerParam === 'true';
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (error) {
      // Show error and clean URL
      const errorMessages = {
        'github_denied': 'GitHub authorization was denied.',
        'token_exchange_failed': 'Authentication failed. Please try again.',
        'user_fetch_failed': 'Could not verify GitHub user.',
        'no_code': 'Authentication failed. Please try again.',
        'no_access_token': 'Authentication failed. Please try again.'
      };
      alert(errorMessages[error] || 'Authentication failed.');
      window.history.replaceState({}, document.title, window.location.pathname);
    } else {
      // Check for existing token
      authToken = localStorage.getItem('thoughts_token');
      isOwner = localStorage.getItem('thoughts_is_owner') === 'true';
    }
  }

  // Update UI based on auth state
  function updateAuthUI() {
    const isAuthenticated = !!authToken;

    if (composeBox) {
      // Only show compose box for authenticated owners
      composeBox.classList.toggle('hidden', !isAuthenticated || !isOwner);
    }
    if (loginBtn) {
      loginBtn.classList.toggle('hidden', isAuthenticated);
    }
    if (logoutBtn) {
      logoutBtn.classList.toggle('hidden', !isAuthenticated);
    }
  }

  // Login with GitHub
  function loginWithGitHub() {
    window.location.href = API.githubLogin;
  }

  // Logout
  function logout() {
    localStorage.removeItem('thoughts_token');
    localStorage.removeItem('thoughts_is_owner');
    authToken = null;
    isOwner = false;
    updateAuthUI();
  }

  // Setup event listeners
  function setupEventListeners() {
    // Auth buttons
    if (loginBtn) {
      loginBtn.addEventListener('click', loginWithGitHub);
    }
    if (logoutBtn) {
      logoutBtn.addEventListener('click', logout);
    }

    // Compose form
    if (composeSubmit) {
      composeSubmit.addEventListener('click', submitPost);
    }

    if (composeTextarea) {
      composeTextarea.addEventListener('input', updateSubmitButton);
      composeTextarea.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
          submitPost();
        }
      });
    }

    // Image upload
    if (imageInput) {
      imageInput.addEventListener('change', handleImageSelect);
    }

    // Lightbox
    if (lightbox) {
      lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox || e.target.classList.contains('image-lightbox-close')) {
          closeLightbox();
        }
      });

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && lightbox.classList.contains('active')) {
          closeLightbox();
        }
      });
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
        // Token expired or invalid
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

  // Show login required message
  function showLoginRequired() {
    if (feed) {
      feed.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M12 15v2m0 0v2m0-2h2m-2 0H10m2-6V7a4 4 0 10-8 0v4h8z"/>
            <rect x="5" y="11" width="14" height="10" rx="2"/>
          </svg>
          <h3>Login Required</h3>
          <p>Please login with GitHub to view thoughts.</p>
        </div>
      `;
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
    const timeAgo = formatTimeAgo(new Date(post.created_at));
    const images = post.images || [];
    const comments = post.comments || [];
    const likeCount = post.likes || 0;
    const commentCount = comments.length;
    const isLiked = post.user_liked || false;

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

    const commentsHTML = comments.map(comment => `
      <div class="comment" data-comment-id="${comment.id}">
        <div class="comment-avatar">${getInitials(comment.author)}</div>
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
    `).join('');

    const deleteButtonHTML = isOwner ? `
      <button class="post-delete-btn" data-post-id="${post.id}" title="Delete post">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
        </svg>
      </button>
    ` : '';

    return `
      <article class="post-card fade-in" data-post-id="${post.id}">
        <div class="post-header">
          <div class="post-avatar">${getInitials(post.author)}</div>
          <div class="post-meta">
            <div class="post-author">${escapeHtml(post.author)}</div>
            <div class="post-time">${timeAgo}</div>
          </div>
          ${deleteButtonHTML}
        </div>
        <div class="post-content">${escapeHtml(post.text)}</div>
        ${imagesHTML}
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
        </div>
        <div class="post-comments hidden" data-post-id="${post.id}">
          ${commentsHTML}
          <div class="comment-input-container">
            <input type="text" class="comment-input" placeholder="Write a comment..." data-post-id="${post.id}">
            <button class="comment-submit" data-post-id="${post.id}">Post</button>
          </div>
        </div>
      </article>
    `;
  }

  // Attach event listeners to posts
  function attachPostEventListeners() {
    // Like buttons
    document.querySelectorAll('.like-btn').forEach(btn => {
      btn.addEventListener('click', () => handleLike(btn.dataset.postId));
    });

    // Comment buttons
    document.querySelectorAll('.comment-btn').forEach(btn => {
      btn.addEventListener('click', () => toggleComments(btn.dataset.postId));
    });

    // Comment submit
    document.querySelectorAll('.comment-submit').forEach(btn => {
      btn.addEventListener('click', () => submitComment(btn.dataset.postId));
    });

    // Post delete buttons (owner only)
    document.querySelectorAll('.post-delete-btn').forEach(btn => {
      btn.addEventListener('click', () => handleDeletePost(btn.dataset.postId));
    });

    // Comment delete buttons (owner only)
    document.querySelectorAll('.comment-delete-btn').forEach(btn => {
      btn.addEventListener('click', () => handleDeleteComment(btn.dataset.commentId, btn.dataset.postId));
    });

    // Comment input enter key
    document.querySelectorAll('.comment-input').forEach(input => {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          submitComment(input.dataset.postId);
        }
      });
    });
  }

  // Handle like
  async function handleLike(postId) {
    const btn = document.querySelector(`.like-btn[data-post-id="${postId}"]`);
    const countSpan = btn.querySelector('.post-action-count');
    const isLiked = btn.classList.contains('liked');
    const svg = btn.querySelector('svg');

    // Optimistic update
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
    } catch (error) {
      // Revert on error
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

      // Add comment to UI
      const commentsSection = document.querySelector(`.post-comments[data-post-id="${postId}"]`);
      const inputContainer = commentsSection.querySelector('.comment-input-container');

      const deleteBtn = isOwner ? `
        <button class="comment-delete-btn" data-comment-id="${newComment.id}" data-post-id="${postId}" title="Delete comment">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          </svg>
        </button>
      ` : '';

      const commentHTML = `
        <div class="comment" data-comment-id="${newComment.id}">
          <div class="comment-avatar">${getInitials(newComment.author)}</div>
          <div class="comment-content">
            <span class="comment-author">${escapeHtml(newComment.author)}</span>
            <p class="comment-text">${escapeHtml(newComment.text)}</p>
            <span class="comment-time">Just now</span>
          </div>
          ${deleteBtn}
        </div>
      `;

      inputContainer.insertAdjacentHTML('beforebegin', commentHTML);

      // Attach delete listener to new comment if owner
      if (isOwner) {
        const newCommentEl = commentsSection.querySelector(`.comment[data-comment-id="${newComment.id}"] .comment-delete-btn`);
        if (newCommentEl) {
          newCommentEl.addEventListener('click', () => handleDeleteComment(newComment.id, postId));
        }
      }

      input.value = '';

      // Update comment count
      const countSpan = document.querySelector(`.comment-btn[data-post-id="${postId}"] .post-action-count`);
      const currentCount = parseInt(countSpan.textContent) || 0;
      countSpan.textContent = currentCount + 1;

    } catch (error) {
      console.error('Error posting comment:', error);
      alert('Failed to post comment. Please try again.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Post';
    }
  }

  // Delete a post (owner only)
  async function handleDeletePost(postId) {
    if (!confirm('Are you sure you want to delete this post?')) {
      return;
    }

    try {
      const response = await fetch(API.deletePost(postId), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (response.status === 401 || response.status === 403) {
        alert('You do not have permission to delete this post.');
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to delete post');
      }

      // Remove post from UI
      const postCard = document.querySelector(`.post-card[data-post-id="${postId}"]`);
      if (postCard) {
        postCard.remove();
      }

      // Remove from local state
      posts = posts.filter(p => p.id != postId);

      // Show empty state if no posts left
      if (posts.length === 0) {
        renderPosts();
      }

    } catch (error) {
      console.error('Error deleting post:', error);
      alert('Failed to delete post. Please try again.');
    }
  }

  // Delete a comment (owner only)
  async function handleDeleteComment(commentId, postId) {
    if (!confirm('Are you sure you want to delete this comment?')) {
      return;
    }

    try {
      const response = await fetch(API.deleteComment(commentId), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (response.status === 401 || response.status === 403) {
        alert('You do not have permission to delete this comment.');
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to delete comment');
      }

      // Remove comment from UI
      const commentEl = document.querySelector(`.comment[data-comment-id="${commentId}"]`);
      if (commentEl) {
        commentEl.remove();
      }

      // Update comment count
      const countSpan = document.querySelector(`.comment-btn[data-post-id="${postId}"] .post-action-count`);
      const currentCount = parseInt(countSpan.textContent) || 0;
      countSpan.textContent = currentCount > 1 ? currentCount - 1 : '';

    } catch (error) {
      console.error('Error deleting comment:', error);
      alert('Failed to delete comment. Please try again.');
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
      formData.append('text', text);

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
        // Token expired or invalid
        alert('Session expired. Please login again.');
        logout();
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to submit post');
      }

      const newPost = await response.json();

      // Add to beginning of posts
      posts.unshift(newPost);
      renderPosts();

      // Clear form
      composeTextarea.value = '';
      selectedImages = [];
      imagePreviewContainer.innerHTML = '';
      updateSubmitButton();

    } catch (error) {
      console.error('Error submitting post:', error);
      alert('Failed to post. Please try again.');
    } finally {
      composeSubmit.disabled = false;
      composeSubmit.textContent = 'Post';
    }
  }

  // Handle image selection
  function handleImageSelect(e) {
    const files = Array.from(e.target.files);

    // Limit to 4 images
    const remaining = 4 - selectedImages.length;
    const newFiles = files.slice(0, remaining);

    newFiles.forEach(file => {
      if (file.type.startsWith('image/')) {
        selectedImages.push(file);
        addImagePreview(file);
      }
    });

    updateSubmitButton();
    e.target.value = ''; // Reset input
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

  // Show loading
  function showLoading() {
    if (feed) {
      feed.innerHTML = `
        <div class="loading-spinner">
          <div class="spinner"></div>
        </div>
      `;
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

  // Utility: Format time ago
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

  // Utility: Get initials from name
  function getInitials(name) {
    if (!name) return '?';
    return name.split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  // Utility: Escape HTML
  function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Expose necessary functions globally
  window.thoughts = {
    openLightbox,
    refresh: loadPosts
  };
})();
