// Thoughts UI Helpers - toast, modal, skeleton rendering
window.ThoughtsUI = (function() {
  const toastContainer = document.getElementById('toast-container');
  const modalOverlay = document.getElementById('modal-overlay');
  const modalTitle = document.getElementById('modal-title');
  const modalMessage = document.getElementById('modal-message');
  const modalContent = document.getElementById('modal-content');
  const modalCancel = document.getElementById('modal-cancel');
  const modalConfirm = document.getElementById('modal-confirm');

  // ===== TOAST NOTIFICATIONS =====
  const toastIcons = {
    success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
    error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
    info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
  };

  function showToast(message, type = 'info', duration = 4000) {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<div class="toast-icon">${toastIcons[type]}</div><span class="toast-message">${InteractionsCommon.escapeHtml(message)}</span><button class="toast-close">&times;</button>`;
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
    return new Promise(resolve => {
      modalResolve = resolve;
      modalTitle.textContent = title;
      modalMessage.textContent = message;
      modalContent.innerHTML = options.content || '';
      modalConfirm.textContent = options.confirmText || 'Confirm';
      modalConfirm.className = `modal-btn ${options.confirmClass || 'confirm'}`;
      modalCancel.textContent = options.cancelText || 'Cancel';
      modalConfirm.onclick = () => { modalResolve = null; modalOverlay.classList.remove('active'); document.body.style.overflow = ''; resolve(true); };
      modalOverlay.classList.add('active');
      document.body.style.overflow = 'hidden';
    });
  }

  function closeModal() {
    modalOverlay.classList.remove('active');
    document.body.style.overflow = '';
    if (modalResolve) { modalResolve(false); modalResolve = null; }
  }

  // ===== LOADING STATES =====
  const skeletonCard = `<div class="skeleton-card"><div style="display:flex;gap:0.75rem;margin-bottom:1rem;"><div class="skeleton skeleton-avatar"></div><div style="flex:1;"><div class="skeleton skeleton-line short"></div><div class="skeleton skeleton-line" style="width:20%;height:10px;"></div></div></div><div class="skeleton skeleton-line long"></div><div class="skeleton skeleton-line medium"></div><div class="skeleton skeleton-image"></div></div>`;

  function showLoading(feed) { if (feed) feed.innerHTML = skeletonCard + skeletonCard.replace('skeleton-image', 'skeleton-line short'); }

  // Setup modal dismiss listeners
  if (modalCancel) {
    modalCancel.addEventListener('click', closeModal);
  }
  if (modalOverlay) {
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) closeModal();
    });
  }

  return { showToast, showModal, closeModal, showLoading };
})();
