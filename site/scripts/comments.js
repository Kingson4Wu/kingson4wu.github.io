(function () {
  var container = document.querySelector('[data-comments]');

  if (!container) {
    return;
  }

  function utterancesTheme() {
    return document.documentElement.dataset.theme === 'dark' ? 'github-dark' : 'github-light';
  }

  function syncTheme() {
    var iframe = document.querySelector('iframe.utterances-frame');
    if (!iframe || !iframe.contentWindow) {
      return;
    }

    iframe.contentWindow.postMessage({
      type: 'set-theme',
      theme: utterancesTheme(),
    }, 'https://utteranc.es');
  }

  function loadComments() {
    var script = document.createElement('script');
    script.src = 'https://utteranc.es/client.js';
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.setAttribute('repo', container.getAttribute('data-comments-repo') || '');
    script.setAttribute('issue-term', container.getAttribute('data-comments-issue-term') || 'pathname');
    script.setAttribute('label', container.getAttribute('data-comments-label') || 'comment');
    script.setAttribute('theme', utterancesTheme());
    container.appendChild(script);
  }

  window.addEventListener('themechange', syncTheme);
  loadComments();
}());
