// Share section: links for common networks, the device's own share sheet where
// available, and a copy-link button (for Instagram and anywhere else).
// The shared link keeps the reader's current language.
(() => {
  const L = window.i18n;
  const status = document.getElementById('share-status');
  const nativeBtn = document.getElementById('share-native');
  const copyBtn = document.getElementById('share-copy');

  const pageUrl = () => {
    const u = new URL(location.href);
    u.hash = '';
    u.search = '';
    u.searchParams.set('lang', L.lang);
    return u.toString();
  };
  const enc = encodeURIComponent;

  const builders = {
    telegram: (url, text) => `https://t.me/share/url?url=${enc(url)}&text=${enc(text)}`,
    whatsapp: (url, text) => `https://wa.me/?text=${enc(text + ' ' + url)}`,
    x: (url, text) => `https://twitter.com/intent/tweet?url=${enc(url)}&text=${enc(text)}`,
    facebook: url => `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`,
    linkedin: url => `https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}`,
    email: (url, text) => `mailto:?subject=${enc(document.title)}&body=${enc(text + '\n\n' + url)}`,
  };

  function update() {
    const url = pageUrl(), text = L.t('share.text');
    document.querySelectorAll('.share-btn[data-net]').forEach(a => {
      a.href = builders[a.dataset.net](url, text);
      if (a.dataset.net === 'email') a.removeAttribute('target');
    });
    status.textContent = '';
  }

  if (navigator.share) {
    nativeBtn.hidden = false;
    nativeBtn.addEventListener('click', () => {
      navigator.share({ title: document.title, text: L.t('share.text'), url: pageUrl() }).catch(() => {});
    });
  }

  copyBtn.addEventListener('click', async () => {
    const url = pageUrl();
    let ok = false;
    try { await navigator.clipboard.writeText(url); ok = true; } catch (e) {
      const t = document.createElement('textarea');
      t.value = url; t.setAttribute('readonly', ''); t.style.position = 'fixed'; t.style.opacity = '0';
      document.body.appendChild(t); t.select();
      try { ok = document.execCommand('copy'); } catch (e2) {}
      t.remove();
    }
    status.textContent = L.t(ok ? 'share.copied' : 'share.copyfail');
  });

  document.addEventListener('langchange', update);
  update();
})();
