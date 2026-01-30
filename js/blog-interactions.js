// Blog Interactions - Likes and Comments for blog posts
// Uses shared InteractionsCommon module
(function() {
  // Wait for common module to load
  if (typeof InteractionsCommon === 'undefined') {
    console.error('InteractionsCommon not loaded');
    return;
  }

  const { API_BASE, getAuthState, setAuthState, clearAuthState, formatTimeAgo,
          getInitials, escapeHtml, getLoginUrl } = InteractionsCommon;

  const API = {
    getBlogInteractions: (slug) => `${API_BASE}/blog/${slug}/interactions`,
    blogLike: `${API_BASE}/blog/like`,
    blogComment: `${API_BASE}/blog/comment`,
    deleteBlogComment: (id) => `${API_BASE}/blog/comment/${id}`
  };

  // State
  let blogSlug = null;
  let interactions = { likes: 0, user_liked: false, comments: [] };
  let authToken = null;
  let isOwner = false;
  let currentUser = null;

  // Initialize when DOM is ready
  document.addEventListener('DOMContentLoaded', init);

  function init() {
    // Get blog slug from URL
    const params = new URLSearchParams(window.location.search);
    blogSlug = params.get('p');
    const section = params.get('section') || 'blogs';

    // Only initialize for blog posts
    if (!blogSlug || section !== 'blogs') return;

    // Check for existing auth
    const authState = getAuthState();
    authToken = authState.token;
    isOwner = authState.isOwner;
    currentUser = authState.user;

    // Handle OAuth callback
    handleAuthCallback();

    // Wait for post content to load, then inject interaction section
    waitForContent();
  }

  function handleAuthCallback() {
    const result = InteractionsCommon.handleAuthCallback(() => {
      // Clean URL but preserve blog params
      const cleanUrl = `${window.location.pathname}?section=blogs&p=${blogSlug}`;
      window.history.replaceState({}, document.title, cleanUrl);
    });

    if (result && result.success) {
      authToken = result.token;
      isOwner = result.isOwner;
      currentUser = result.user;
    }
  }

  function waitForContent() {
    const checkContent = setInterval(() => {
      const article = document.getElementById('content');
      const postHeader = article?.querySelector('.post-header');

      if (postHeader && !article.querySelector('.loading')) {
        clearInterval(checkContent);
        injectInteractionSection();
        loadInteractions();
      }
    }, 100);

    // Timeout after 10 seconds
    setTimeout(() => clearInterval(checkContent), 10000);
  }

  function injectInteractionSection() {
    const article = document.getElementById('content');
    if (!article) return;

    const interactionHTML = `
      <div class="blog-interactions">
        <div class="blog-interactions-header">
          <h3>Feedback</h3>
          ${!authToken ? `
            <button class="blog-login-btn" id="blog-login-btn">
              <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
              </svg>
              Sign in with GitHub
            </button>
          ` : `
            <div class="blog-user-info">
              <span class="blog-user-name">${escapeHtml(currentUser?.name || 'User')}</span>
              <button class="blog-logout-btn" id="blog-logout-btn">Logout</button>
            </div>
          `}
        </div>

        <div class="blog-like-section">
          <button class="blog-like-btn" id="blog-like-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" id="like-heart">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
            <span id="like-count">0</span>
            <span id="like-text">likes</span>
          </button>
        </div>

        <div class="blog-comments-section">
          <h4>Comments <span class="comment-count-badge" id="comment-count-badge"></span></h4>

          <div class="blog-comment-form">
            <div class="blog-comment-input-wrapper">
              <input type="text"
                     class="blog-comment-input"
                     id="blog-comment-input"
                     placeholder="${authToken ? 'Write a comment...' : 'Write a comment (or sign in with GitHub)'}"
                     maxlength="500">
              <button class="blog-comment-submit" id="blog-comment-submit">Post</button>
            </div>
            ${!authToken ? '<p class="blog-comment-anon-note">Posting as anonymous</p>' : ''}
          </div>

          <div class="blog-comments-list" id="blog-comments-list">
            <div class="blog-comments-loading">Loading comments...</div>
          </div>
        </div>
      </div>
    `;

    article.insertAdjacentHTML('beforeend', interactionHTML);
    attachEventListeners();
  }

  function attachEventListeners() {
    const loginBtn = document.getElementById('blog-login-btn');
    const logoutBtn = document.getElementById('blog-logout-btn');
    const likeBtn = document.getElementById('blog-like-btn');
    const commentInput = document.getElementById('blog-comment-input');
    const commentSubmit = document.getElementById('blog-comment-submit');

    if (loginBtn) {
      loginBtn.addEventListener('click', () => {
        window.location.href = getLoginUrl(window.location.href);
      });
    }

    if (logoutBtn) {
      logoutBtn.addEventListener('click', logout);
    }

    if (likeBtn) {
      likeBtn.addEventListener('click', handleLike);
    }

    if (commentSubmit) {
      commentSubmit.addEventListener('click', handleCommentSubmit);
    }

    if (commentInput) {
      commentInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          handleCommentSubmit();
        }
      });
    }
  }

  function logout() {
    clearAuthState();
    authToken = null;
    isOwner = false;
    currentUser = null;
    window.location.reload();
  }

  async function loadInteractions() {
    try {
      const headers = {};
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const response = await fetch(API.getBlogInteractions(blogSlug), { headers });

      if (!response.ok) {
        throw new Error('Failed to load interactions');
      }

      interactions = await response.json();
      renderInteractions();
    } catch (error) {
      console.error('Error loading blog interactions:', error);
      // Show empty state on error
      interactions = { likes: 0, user_liked: false, comments: [] };
      renderInteractions();
    }
  }

  function renderInteractions() {
    // Update like button
    const likeBtn = document.getElementById('blog-like-btn');
    const likeHeart = document.getElementById('like-heart');
    const likeCount = document.getElementById('like-count');
    const likeText = document.getElementById('like-text');

    if (likeBtn && likeHeart && likeCount) {
      likeBtn.classList.toggle('liked', interactions.user_liked);
      likeHeart.setAttribute('fill', interactions.user_liked ? 'currentColor' : 'none');
      likeCount.textContent = interactions.likes;
      likeText.textContent = interactions.likes === 1 ? 'like' : 'likes';
    }

    // Update comment count badge
    const commentBadge = document.getElementById('comment-count-badge');
    if (commentBadge) {
      commentBadge.textContent = interactions.comments.length > 0 ? `(${interactions.comments.length})` : '';
    }

    // Render comments
    const commentsList = document.getElementById('blog-comments-list');
    if (commentsList) {
      if (interactions.comments.length === 0) {
        commentsList.innerHTML = '';
      } else {
        commentsList.innerHTML = interactions.comments.map(comment => renderComment(comment)).join('');
        attachCommentDeleteListeners();
      }
    }
  }

  function renderComment(comment) {
    const commentDate = new Date(comment.created_at);
    const timeAgo = formatTimeAgo(commentDate);
    const isAnonymous = !comment.author || comment.author === 'Anonymous';

    const avatarContent = comment.author_avatar
      ? `<img src="${escapeHtml(comment.author_avatar)}" alt="${escapeHtml(comment.author)}">`
      : `<span class="avatar-initials">${getInitials(comment.author || 'A')}</span>`;

    const deleteBtn = isOwner ? `
      <button class="blog-comment-delete" data-comment-id="${comment.id}" title="Delete comment">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
        </svg>
      </button>
    ` : '';

    return `
      <div class="blog-comment" data-comment-id="${comment.id}">
        <div class="blog-comment-avatar">${avatarContent}</div>
        <div class="blog-comment-content">
          <div class="blog-comment-header">
            <span class="blog-comment-author ${isAnonymous ? 'anonymous' : ''}">${escapeHtml(comment.author || 'Anonymous')}</span>
            <span class="blog-comment-time">${timeAgo}</span>
          </div>
          <p class="blog-comment-text">${escapeHtml(comment.text)}</p>
        </div>
        ${deleteBtn}
      </div>
    `;
  }

  function attachCommentDeleteListeners() {
    document.querySelectorAll('.blog-comment-delete').forEach(btn => {
      btn.addEventListener('click', () => handleCommentDelete(btn.dataset.commentId));
    });
  }

  async function handleLike() {
    const likeBtn = document.getElementById('blog-like-btn');
    const likeHeart = document.getElementById('like-heart');
    const likeCount = document.getElementById('like-count');
    const likeText = document.getElementById('like-text');

    const wasLiked = interactions.user_liked;
    const oldCount = interactions.likes;

    // Optimistic update
    interactions.user_liked = !wasLiked;
    interactions.likes = wasLiked ? oldCount - 1 : oldCount + 1;

    likeBtn.classList.toggle('liked', interactions.user_liked);
    likeHeart.setAttribute('fill', interactions.user_liked ? 'currentColor' : 'none');
    likeCount.textContent = interactions.likes;
    likeText.textContent = interactions.likes === 1 ? 'like' : 'likes';

    // Add animation
    likeBtn.classList.add('pulse');
    setTimeout(() => likeBtn.classList.remove('pulse'), 300);

    try {
      const headers = { 'Content-Type': 'application/json' };
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const response = await fetch(API.blogLike, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          blog_slug: blogSlug,
          unlike: wasLiked
        })
      });

      if (!response.ok) {
        throw new Error('Failed to like');
      }

      const data = await response.json();
      interactions.likes = data.likes;
      interactions.user_liked = data.user_liked;

      // Update with server response
      likeBtn.classList.toggle('liked', interactions.user_liked);
      likeHeart.setAttribute('fill', interactions.user_liked ? 'currentColor' : 'none');
      likeCount.textContent = interactions.likes;
      likeText.textContent = interactions.likes === 1 ? 'like' : 'likes';

    } catch (error) {
      console.error('Error liking blog:', error);
      // Revert on error
      interactions.user_liked = wasLiked;
      interactions.likes = oldCount;
      likeBtn.classList.toggle('liked', wasLiked);
      likeHeart.setAttribute('fill', wasLiked ? 'currentColor' : 'none');
      likeCount.textContent = oldCount;
      likeText.textContent = oldCount === 1 ? 'like' : 'likes';
    }
  }

  async function handleCommentSubmit() {
    const input = document.getElementById('blog-comment-input');
    const submitBtn = document.getElementById('blog-comment-submit');
    const text = input.value.trim();

    if (!text) return;

    // Disable while submitting
    submitBtn.disabled = true;
    submitBtn.textContent = 'Posting...';

    try {
      const headers = { 'Content-Type': 'application/json' };
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const response = await fetch(API.blogComment, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          blog_slug: blogSlug,
          text: text
        })
      });

      if (!response.ok) {
        throw new Error('Failed to post comment');
      }

      const newComment = await response.json();

      // Add to local state
      interactions.comments.unshift(newComment);

      // Clear input
      input.value = '';

      // Re-render comments
      renderInteractions();

    } catch (error) {
      console.error('Error posting comment:', error);
      alert('Failed to post comment. Please try again.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Post';
    }
  }

  async function handleCommentDelete(commentId) {
    if (!confirm('Are you sure you want to delete this comment?')) return;

    try {
      const response = await fetch(API.deleteBlogComment(commentId), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete comment');
      }

      // Remove from local state
      interactions.comments = interactions.comments.filter(c => c.id != commentId);

      // Re-render
      renderInteractions();

    } catch (error) {
      console.error('Error deleting comment:', error);
      alert('Failed to delete comment. Please try again.');
    }
  }

  // Expose refresh function
  window.blogInteractions = {
    refresh: loadInteractions
  };
})();
