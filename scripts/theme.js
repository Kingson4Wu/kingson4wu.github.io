const themeToggle = document.getElementById('theme-toggle');

function currentTheme() {
  return document.documentElement.dataset.theme || 'light';
}

function updateThemeButton() {
  if (!themeToggle) {
    return;
  }

  themeToggle.setAttribute(
    'aria-label',
    currentTheme() === 'dark' ? 'Switch to light mode' : 'Switch to dark mode',
  );
}

themeToggle?.addEventListener('click', () => {
  const next = currentTheme() === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  try {
    localStorage.setItem('theme', next);
  } catch (_) {
    // Theme still changes for this page view when storage is unavailable.
  }
  updateThemeButton();
  window.dispatchEvent(new CustomEvent('themechange', { detail: { theme: next } }));
});

updateThemeButton();
