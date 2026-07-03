(function () {
  var toc = document.querySelector('[data-article-toc]');

  if (!toc) {
    return;
  }

  var toggle = toc.querySelector('[data-article-toc-toggle]');
  var panel = toc.querySelector('[data-article-toc-panel]');
  var links = Array.from(toc.querySelectorAll('[data-article-toc-link]'));
  var headings = links
    .map(function (link) {
      var id = decodeURIComponent(link.hash.slice(1));
      return {
        link: link,
        heading: document.getElementById(id),
      };
    })
    .filter(function (item) {
      return item.heading;
    });

  if (!toggle || !panel || headings.length === 0) {
    toc.remove();
    return;
  }

  function setOpen(open) {
    toc.toggleAttribute('data-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    var label = open ? toggle.dataset.closeLabel : toggle.dataset.openLabel;

    if (label) {
      toggle.setAttribute('aria-label', label);
      toggle.setAttribute('title', label);
    }
  }

  function closeOnSmallScreens() {
    if (window.matchMedia('(max-width: 760px)').matches) {
      setOpen(false);
    }
  }

  function updateActiveLink() {
    var active = headings[0];
    var threshold = 120;

    for (var index = 0; index < headings.length; index += 1) {
      var item = headings[index];
      if (item.heading.getBoundingClientRect().top <= threshold) {
        active = item;
      } else {
        break;
      }
    }

    links.forEach(function (link) {
      link.removeAttribute('aria-current');
    });
    active.link.setAttribute('aria-current', 'true');
  }

  toggle.addEventListener('click', function () {
    setOpen(!toc.hasAttribute('data-open'));
  });

  links.forEach(function (link) {
    link.addEventListener('click', closeOnSmallScreens);
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
      setOpen(false);
      toggle.focus();
    }
  });

  document.addEventListener('click', function (event) {
    if (toc.hasAttribute('data-open') && !toc.contains(event.target)) {
      setOpen(false);
    }
  });

  window.addEventListener('scroll', updateActiveLink, { passive: true });
  setOpen(false);
  updateActiveLink();
}());
