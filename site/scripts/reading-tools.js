(function () {
  var button = document.querySelector('[data-reading-return]');

  if (!button) {
    return;
  }

  function target() {
    return document.querySelector('.article-header') || document.querySelector('.page-heading') || document.querySelector('.site-main');
  }

  function update() {
    button.toggleAttribute('data-visible', window.scrollY > 420);
  }

  button.addEventListener('click', function () {
    var destination = target();
    if (!destination) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    var top = destination.getBoundingClientRect().top + window.scrollY - 18;
    window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
  });

  window.addEventListener('scroll', update, { passive: true });
  update();
}());
