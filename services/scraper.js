const cheerio = require('cheerio');

const DANAWA_SEARCH_URL = 'https://search.danawa.com/dsearch.php';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

// 다나와 검색 결과 페이지를 실시간으로 가져와 상품 카드를 파싱한다 (판매자 등록 없이 이용 가능한 가격비교 사이트).
async function searchProducts(keywords, display = 15, signal) {
  const url = `${DANAWA_SEARCH_URL}?query=${encodeURIComponent(keywords)}`;
  const res = await fetch(url, {
    signal,
    headers: {
      'User-Agent': USER_AGENT,
      'Accept-Language': 'ko-KR,ko;q=0.9',
    },
  });

  if (!res.ok) {
    throw new Error(`다나와 검색 페이지 요청 실패 (${res.status})`);
  }

  const html = await res.text();
  const $ = cheerio.load(html);
  const products = [];

  $('li.prod_item').each((_, el) => {
    if (products.length >= display) return;

    const nameEl = $(el).find('p.prod_name a').first();
    const title = nameEl.text().trim();
    const link = nameEl.attr('href');
    if (!title || !link) return; // 광고/배너 슬롯 등 상품이 아닌 항목 제외

    const priceText = $(el).find('p.price_sect strong').first().text().trim();
    const lowPrice = Number(priceText.replace(/[^0-9]/g, '')) || 0;
    const image = $(el).find('div.thumb_image img').first().attr('src') || '';

    products.push({
      title,
      link,
      image,
      lowPrice,
      highPrice: 0,
      mallName: '다나와 최저가',
      brand: '',
      maker: '',
      category: '',
    });
  });

  return products;
}

module.exports = { searchProducts };
