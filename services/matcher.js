// 추출된 특징 키워드가 상품명에 얼마나 포함되는지로 매칭 점수(0~100)와 추천 이유를 계산한다.
function rankProducts(products, intent) {
  const features = intent.features || [];
  const category = intent.category || '';
  const priceMin = intent.constraints?.priceMin;
  const priceMax = intent.constraints?.priceMax;

  const scored = products.map((product) => {
    const titleLower = product.title.toLowerCase();
    const matchedFeatures = features.filter((f) => f && titleLower.includes(String(f).toLowerCase()));

    let score = 40; // 기본 점수 (카테고리 검색어로 이미 찾아온 결과이므로)
    score += matchedFeatures.length * 15;
    if (category && titleLower.includes(category.toLowerCase())) score += 10;

    if (typeof priceMin === 'number' && product.lowPrice < priceMin) score -= 10;
    if (typeof priceMax === 'number' && product.lowPrice > priceMax) score -= 15;

    score = Math.max(5, Math.min(99, score));

    const reasonParts = matchedFeatures.length > 0
      ? [`"${matchedFeatures.join('", "')}" 조건 반영`]
      : ['카테고리 및 검색어 기준으로 선정'];
    if (typeof priceMax === 'number' && product.lowPrice <= priceMax) {
      reasonParts.push('희망 가격대 내 상품');
    }

    return {
      ...product,
      matchScore: score,
      matchedFeatures,
      reason: reasonParts.join(' · '),
    };
  });

  scored.sort((a, b) => b.matchScore - a.matchScore || a.lowPrice - b.lowPrice);

  const top = scored.slice(0, 5);
  if (top.length > 0) {
    const minPrice = Math.min(...top.filter((p) => p.lowPrice > 0).map((p) => p.lowPrice));
    top.forEach((p) => {
      p.isLowestPrice = p.lowPrice === minPrice && p.lowPrice > 0;
    });
  }

  return top;
}

module.exports = { rankProducts };
