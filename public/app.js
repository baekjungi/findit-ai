const form = document.getElementById('search-form');
const input = document.getElementById('search-input');
const statusEl = document.getElementById('status');
const statusSpinner = document.getElementById('status-spinner');
const statusText = document.getElementById('status-text');
const intentEl = document.getElementById('intent-card');
const resultsEl = document.getElementById('results');
const filterBar = document.getElementById('filter-bar');
const filterButtons = document.querySelectorAll('.filter-btn');
const submitButton = form.querySelector('button[type="submit"]');
const clearSearchButton = document.getElementById('clear-search');
const resetResultsButton = document.getElementById('reset-results');
const recentSearchesEl = document.getElementById('recent-searches');
const resultCountEl = document.getElementById('result-count');

let currentResults = [];
let currentSort = 'match';
const recentSearches = JSON.parse(localStorage.getItem('findit-recent-searches') || '[]');

renderRecentSearches();

input.addEventListener('input', () => {
  clearSearchButton.classList.toggle('hidden', input.value.length === 0);
});

clearSearchButton.addEventListener('click', () => {
  input.value = '';
  clearSearchButton.classList.add('hidden');
  input.focus();
});

resetResultsButton.addEventListener('click', () => {
  input.value = '';
  clearSearchButton.classList.add('hidden');
  intentEl.hidden = true;
  filterBar.hidden = true;
  resultsEl.innerHTML = '';
  statusEl.hidden = true;
  input.focus();
});

filterButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    currentSort = btn.dataset.sort;
    updateFilterButtons();
    renderResults(currentResults);
  });
});

function updateFilterButtons() {
  filterButtons.forEach((btn) => {
    const active = btn.dataset.sort === currentSort;
    btn.classList.toggle('bg-primary', active);
    btn.classList.toggle('text-white', active);
    btn.classList.toggle('bg-surface-container-lowest', !active);
    btn.classList.toggle('text-on-surface-variant', !active);
  });
}

document.querySelectorAll('.tag-pill').forEach((btn) => {
  btn.addEventListener('click', () => {
    input.value = btn.dataset.query;
    form.requestSubmit();
  });
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const query = input.value.trim();
  if (!query) return;

  submitButton.disabled = true;
  input.disabled = true;
  showStatus('AI가 취향을 분석하고 있어요...', false);
  intentEl.hidden = true;
  filterBar.hidden = true;
  resultsEl.innerHTML = '';
  saveRecentSearch(query);

  try {
    const res = await fetch('/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    const data = await res.json();

    if (!res.ok) {
      showStatus(data.error || '검색 중 오류가 발생했습니다.', true);
      return;
    }

    statusEl.hidden = true;
    renderIntent(data.intent, query);
    currentResults = data.results || [];
    currentSort = 'match';
    updateFilterButtons();
    filterBar.hidden = currentResults.length === 0;
    resultCountEl.textContent = `${currentResults.length}개 상품 발견`;
    renderResults(currentResults);
  } catch (err) {
    showStatus('서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.', true);
  } finally {
    submitButton.disabled = false;
    input.disabled = false;
  }
});

function showStatus(message, isError) {
  statusEl.hidden = false;
  statusSpinner.hidden = isError;
  statusText.textContent = message;
  statusText.className = isError ? 'text-error' : 'text-on-surface-variant';
}

function renderIntent(intent, query) {
  if (!intent) {
    intentEl.hidden = true;
    return;
  }
  intentEl.hidden = false;
  document.getElementById('intent-query-text').textContent = `"${query}" 분석 완료`;
  document.getElementById('intent-category').textContent = intent.category || '-';
  document.getElementById('intent-features').textContent = (intent.features || []).join(' · ') || '-';
  document.getElementById('intent-purpose').textContent = intent.constraints?.purpose || '-';
}

function renderResults(results) {
  if (!results || results.length === 0) {
    resultsEl.innerHTML = '<p class="text-center text-on-surface-variant py-space-lg">조건에 맞는 상품을 찾지 못했어요. 검색어를 조금 더 단순하게 바꿔보세요.</p>';
    return;
  }

  const sorted = [...results].sort((a, b) => (
    currentSort === 'price' ? a.lowPrice - b.lowPrice : b.matchScore - a.matchScore
  ));

  resultsEl.innerHTML = sorted.map(renderCard).join('');
}

function saveRecentSearch(query) {
  const next = [query, ...recentSearches.filter((item) => item !== query)].slice(0, 5);
  recentSearches.splice(0, recentSearches.length, ...next);
  localStorage.setItem('findit-recent-searches', JSON.stringify(next));
  renderRecentSearches();
}

function renderRecentSearches() {
  if (recentSearches.length === 0) {
    recentSearchesEl.classList.add('hidden');
    return;
  }
  recentSearchesEl.classList.remove('hidden');
  recentSearchesEl.innerHTML = recentSearches.map((query) => `
    <button type="button" class="recent-pill px-3 py-1 rounded-full bg-primary-container text-primary text-label-sm hover:bg-primary hover:text-white transition-colors" data-query="${escapeAttr(query)}">
      <span class="material-symbols-outlined text-[13px] align-middle">history</span> ${escapeHtml(query)}
    </button>
  `).join('');
  recentSearchesEl.querySelectorAll('.recent-pill').forEach((button) => {
    button.addEventListener('click', () => {
      input.value = button.dataset.query;
      clearSearchButton.classList.remove('hidden');
      form.requestSubmit();
    });
  });
}

function renderCard(product) {
  const price = product.lowPrice ? `${product.lowPrice.toLocaleString()}` : '-';
  const productLink = safeExternalUrl(product.link);
  const productImage = safeImageUrl(product.image);

  return `
    <article class="bg-surface-container-lowest rounded-xl shadow-sm hover:shadow-md transition-all p-space-md relative overflow-hidden">
      <div class="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-primary via-secondary to-tertiary"></div>
      <div class="flex flex-col sm:flex-row gap-space-md">
        <div class="relative w-full sm:w-48 h-48 shrink-0 rounded-lg overflow-hidden bg-surface-container-low">
          <img class="w-full h-full object-cover" src="${escapeAttr(productImage)}" alt="${escapeAttr(product.title)}" loading="lazy" onerror="this.onerror=null;this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22%3E%3Crect width=%22100%22 height=%22100%22 fill=%22%23e2e8f0%22/%3E%3C/svg%3E'" />
          <div class="absolute top-2 left-2 px-2.5 py-1 rounded-full bg-surface-container-lowest/90 backdrop-blur text-primary text-label-sm font-bold flex items-center gap-1 shadow-sm">
            <span class="material-symbols-outlined text-[13px]">verified</span>
            AI 일치도 ${product.matchScore}%
          </div>
          ${product.isLowestPrice ? '<span class="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-error text-on-error text-label-sm font-extrabold shadow-sm">최저가</span>' : ''}
        </div>
        <div class="flex-1 flex flex-col justify-between min-w-0">
          <div>
            <div class="flex items-center gap-space-xs text-on-surface-variant text-label-sm mb-1">
              <span class="font-semibold text-primary truncate">${escapeHtml(product.mallName || '쇼핑몰')}</span>
              ${product.category ? `<span class="truncate">· ${escapeHtml(product.category)}</span>` : ''}
            </div>
            <h3 class="text-headline-sm leading-snug">${escapeHtml(product.title)}</h3>
            <div class="mt-space-xs p-space-xs rounded-lg bg-surface-container-low">
              <div class="flex items-center gap-1 text-primary text-label-sm font-bold mb-1">
                <span class="material-symbols-outlined text-[14px]">bolt</span>
                AI 선정 이유
              </div>
              <p class="text-body-sm text-on-surface-variant leading-relaxed">${escapeHtml(product.reason)}</p>
            </div>
          </div>
          <div class="mt-space-sm pt-space-xs flex items-center justify-between flex-wrap gap-2">
            <div class="flex items-baseline gap-1 price-num">
              <span class="text-price-xl">${price}</span>
              <span class="text-body-sm">원</span>
            </div>
            <a class="px-4 py-2 rounded-full bg-primary text-white text-label-md font-bold hover:bg-secondary transition-colors" href="${escapeAttr(productLink)}" target="_blank" rel="noopener noreferrer nofollow">구매 사이트 바로가기</a>
          </div>
        </div>
      </div>
    </article>
  `;
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function escapeAttr(str) {
  return escapeHtml(str || '');
}

function safeExternalUrl(value) {
  if (!value) return '#';
  const normalized = value.startsWith('//') ? `https:${value}` : value;
  try {
    const url = new URL(normalized);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : '#';
  } catch (err) {
    return '#';
  }
}

function safeImageUrl(value) {
  return safeExternalUrl(value);
}
