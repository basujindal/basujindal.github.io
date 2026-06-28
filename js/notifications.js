// Hacker News push-notification subscribe / unsubscribe
(function () {
  const IC = window.InteractionsCommon;
  if (!IC) return;

  const API_BASE = IC.API_BASE;
  const API = {
    vapidKey: `${API_BASE}/push/vapid_public_key`,
    subscribe: `${API_BASE}/push/subscribe`,
    unsubscribe: `${API_BASE}/push/unsubscribe`,
  };

  const statusEl = document.getElementById('notify-status');
  const actionEl = document.getElementById('notify-action');

  const supported =
    'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

  function setStatus(msg, kind) {
    statusEl.textContent = msg;
    statusEl.className = `notify-status ${kind || ''}`;
  }

  function showButton(label, cls, handler) {
    actionEl.innerHTML = `<button class="notify-btn ${cls}" id="notify-btn">${label}</button>`;
    document.getElementById('notify-btn').onclick = handler;
  }

  // Convert a base64url VAPID key into the Uint8Array the Push API expects.
  function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const raw = atob(base64);
    const output = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
    return output;
  }

  async function getRegistration() {
    try { await navigator.serviceWorker.register('/sw.js'); } catch {}
    return navigator.serviceWorker.ready;
  }

  async function getExistingSubscription() {
    const reg = await getRegistration();
    return reg.pushManager.getSubscription();
  }

  async function render() {
    if (!supported) {
      setStatus('This browser does not support web push notifications.', 'error');
      actionEl.innerHTML = '';
      return;
    }

    let sub = null;
    try { sub = await getExistingSubscription(); } catch {}

    // Already subscribed on this device — allow unsubscribe regardless of login.
    if (sub) {
      setStatus("You're subscribed on this device.", 'success');
      showButton('Unsubscribe', 'danger', unsubscribe);
      return;
    }

    // Subscribing requires GitHub login.
    if (!IC.isLoggedIn()) {
      setStatus('Sign in to subscribe to top Hacker News posts.', '');
      actionEl.innerHTML = IC.renderGitHubLoginButton('window.NotifyPage.login()');
      return;
    }

    if (Notification.permission === 'denied') {
      setStatus('Notifications are blocked in your browser settings. Enable them, then reload.', 'error');
      actionEl.innerHTML = '';
      return;
    }

    setStatus(`Signed in as ${IC.getAuthState().user.name}. Subscribe to get top HN posts.`, '');
    showButton('Subscribe', 'primary', subscribe);
  }

  async function subscribe() {
    const btn = document.getElementById('notify-btn');
    if (btn) btn.disabled = true;
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setStatus('Notification permission was not granted.', 'error');
        return render();
      }

      // Fetch the VAPID public key from the server.
      let publicKey = '';
      try {
        const keyResp = await fetch(API.vapidKey);
        if (!keyResp.ok) throw new Error(String(keyResp.status));
        publicKey = (await keyResp.json()).public_key || '';
      } catch {
        throw new Error('Could not reach the notification server. Please try again later.');
      }
      if (!publicKey) throw new Error('Notifications are not set up on the server yet.');

      // Decode and validate the key — a VAPID key is a 65-byte P-256 point.
      let appServerKey = null;
      try { appServerKey = urlBase64ToUint8Array(publicKey); } catch {}
      if (!appServerKey || appServerKey.length !== 65) {
        throw new Error('The notification server returned an invalid key.');
      }

      const reg = await getRegistration();
      let sub;
      try {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: appServerKey,
        });
      } catch {
        throw new Error('Your browser blocked the subscription. On iPhone/iPad, add this site to your Home Screen first, then try again.');
      }

      // Auth cookie is sent via fetchWithAuth (credentials: 'include').
      const { response, error } = await IC.fetchWithAuth(API.subscribe, {
        method: 'POST',
        body: JSON.stringify({ subscription: sub.toJSON() }),
      });

      if (error === 'unauthorized') {
        await sub.unsubscribe().catch(() => {});
        IC.clearAuthState();
        setStatus('Your session expired. Please sign in again to subscribe.', 'error');
        return render();
      }
      if (!response.ok) throw new Error('Failed to save the subscription on the server.');

      return render();
    } catch (e) {
      setStatus(e.message || 'Could not subscribe.', 'error');
      const b = document.getElementById('notify-btn');
      if (b) b.disabled = false;
    }
  }

  async function unsubscribe() {
    const btn = document.getElementById('notify-btn');
    if (btn) btn.disabled = true;
    try {
      const sub = await getExistingSubscription();
      if (sub) {
        const endpoint = sub.endpoint;
        await sub.unsubscribe().catch(() => {});
        // No auth needed so a logged-out user can still stop notifications.
        await fetch(API.unsubscribe, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint }),
        }).catch(() => {});
      }
      return render();
    } catch (e) {
      setStatus(e.message || 'Could not unsubscribe.', 'error');
    }
  }

  window.NotifyPage = {
    login() { window.location.href = IC.getLoginUrl(window.location.href); },
  };

  // Process any GitHub OAuth redirect back to this page, then render.
  IC.handleAuthCallback();
  render();
})();
