require('dotenv').config();
const express = require('express');
const path = require('path');
const { parseIntent } = require('./services/intent');
const { searchProducts } = require('./services/scraper');
const { rankProducts } = require('./services/matcher');

const app = express();
const PORT = process.env.PORT || 3000;

const CACHE_TTL_MS = 10 * 60 * 1000; // 동일 검색어 반복 시 API 비용/응답시간 절감
const searchCache = new Map();

const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;
const RATE_LIMIT_MAX = 20; // IP당 5분에 20회
const rateLimitStore = new Map();
const REQUEST_TIMEOUT_MS = 30 * 1000;

function isRateLimited(ip) {
  const now = Date.now();
  const entry = rateLimitStore.get(ip);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitStore.set(ip, { windowStart: now, count: 1 });
    return false;
  }
  entry.count += 1;
  return entry.count > RATE_LIMIT_MAX;
}

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.post('/api/search', async (req, res) => {
  const query = typeof req.body?.query === 'string' ? req.body.query.trim() : '';

  if (!query) {
    return res.status(400).json({ error: '검색어를 입력해주세요.' });
  }
  if (query.length > 300) {
    return res.status(400).json({ error: '검색어가 너무 깁니다. 300자 이내로 입력해주세요.' });
  }

  if (isRateLimited(req.ip)) {
    return res.status(429).json({ error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' });
  }

  const cacheKey = query.toLowerCase();
  const cached = searchCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return res.json(cached.data);
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const intent = await parseIntent(query, controller.signal);
      const keywords = intent.searchKeywords || intent.category || query;
      const products = await searchProducts(keywords, 15, controller.signal);
      const ranked = rankProducts(products, intent);

      const responseData = { intent, results: ranked };
      searchCache.set(cacheKey, { data: responseData, expiresAt: Date.now() + CACHE_TTL_MS });
      res.json(responseData);
    } finally {
      clearTimeout(timeout);
    }
  } catch (err) {
    console.error('[search error]', err.message);
    const message = err.name === 'AbortError'
      ? '검색 시간이 너무 오래 걸렸습니다. 잠시 후 다시 시도해주세요.'
      : err.message || '검색 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
    res.status(502).json({ error: message });
  }
});

app.listen(PORT, () => {
  console.log(`FindIt AI 서버 실행 중: http://localhost:${PORT}`);
});
