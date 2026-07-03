(function () {
  var input = document.querySelector('[data-search-input]');
  var clear = document.querySelector('[data-search-clear]');
  var results = document.querySelector('[data-search-results]');
  var status = document.querySelector('[data-search-status]');
  var searchPanel = document.querySelector('[data-search-lang]');

  if (!input || !results || !searchPanel) {
    return;
  }

  var index = [];
  var lang = searchPanel.getAttribute('data-search-lang') || '';
  var copy = lang === 'zh'
    ? {
      noResults: '没有找到结果。',
      empty: '输入关键词开始搜索。',
      recent: '最近内容',
      unavailable: '搜索暂时不可用。',
      result: '条结果',
    }
    : {
      noResults: 'No results.',
      empty: 'Type to search.',
      recent: 'Recent writing',
      unavailable: 'Search is unavailable.',
      result: 'result',
    };

  function setStatus(message) {
    if (status) {
      status.textContent = message;
    }
  }

  function normalize(value) {
    return String(value || '').toLowerCase();
  }

  function matches(item, query, lang) {
    if (item.lang !== lang) {
      return false;
    }

    if (!query) {
      return true;
    }

    var haystack = [
      item.title,
      item.excerpt,
      item.body,
      item.url,
      Array.isArray(item.tags) ? item.tags.join(' ') : '',
    ].map(normalize).join(' ');

    return haystack.indexOf(query) !== -1;
  }

  function renderItem(item) {
    var article = document.createElement('article');
    article.className = 'search-result';

    var heading = document.createElement('h2');
    var link = document.createElement('a');
    link.href = item.url;
    link.textContent = item.title;
    heading.appendChild(link);

    var meta = document.createElement('p');
    meta.className = 'muted';
    meta.textContent = [item.lang, item.type, item.date].filter(Boolean).join(' · ');

    var excerpt = document.createElement('p');
    excerpt.textContent = item.excerpt || '';

    article.appendChild(heading);
    article.appendChild(meta);
    article.appendChild(excerpt);

    return article;
  }

  function update() {
    var query = normalize(input.value).trim();
    var source = index.filter(function (item) {
      return item.lang === lang;
    });
    var matchesForQuery = source.filter(function (item) {
      return matches(item, query, lang);
    }).slice(0, 50);

    if (matchesForQuery.length === 0) {
      setStatus(query ? copy.noResults : copy.empty);
      results.replaceChildren();
      return;
    }

    if (query) {
      setStatus(lang === 'zh'
        ? String(matchesForQuery.length) + copy.result
        : String(matchesForQuery.length) + ' ' + copy.result + (matchesForQuery.length === 1 ? '' : 's'));
    } else {
      setStatus(copy.recent);
    }

    var fragment = document.createDocumentFragment();
    matchesForQuery.forEach(function (item) {
      fragment.appendChild(renderItem(item));
    });
    results.replaceChildren(fragment);
  }

  input.addEventListener('input', update);
  clear?.addEventListener('click', function () {
    input.value = '';
    input.focus();
    update();
  });

  fetch('/search-index.json')
    .then(function (response) {
      if (!response.ok) {
        throw new Error('Unable to load search index');
      }
      return response.json();
    })
    .then(function (items) {
      index = Array.isArray(items) ? items : [];
      update();
    })
    .catch(function () {
      setStatus(copy.unavailable);
    });
}());
