const SYSTEM_PROMPT = `너는 쇼핑 검색 의도 분석기다. 사용자의 자연어 문장을 분석해서 아래 JSON 형식으로만 응답해라.
설명 없이 JSON만 출력하고, 값을 모르면 빈 문자열이나 빈 배열로 둬라.

{
  "category": "상품 카테고리 (예: 반팔티, 이어폰)",
  "features": ["핵심 특징 키워드 배열 (예: 목 안늘어남, 하얀색, 오버핏)"],
  "constraints": {
    "priceMin": null,
    "priceMax": null,
    "purpose": "사용 목적/제약사항 요약"
  },
  "searchKeywords": "쇼핑몰 검색창에 그대로 넣기 좋은 짧은 검색어"
}`;

// 사용자 문장을 Azure OpenAI로 분석해 검색 조건(JSON)으로 변환한다.
async function parseIntent(userText, signal) {
  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT;
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION || '2024-08-01-preview';

  if (!apiKey || !endpoint || !deployment) {
    throw new Error('AZURE_OPENAI_API_KEY/AZURE_OPENAI_ENDPOINT/AZURE_OPENAI_DEPLOYMENT가 설정되지 않았습니다. .env에 키를 등록해주세요.');
  }

  const url = `${endpoint.replace(/\/+$/, '')}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': apiKey,
    },
    signal,
    body: JSON.stringify({
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userText },
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' },
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Azure OpenAI API 호출 실패 (${res.status}): ${detail}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('Azure OpenAI 응답에서 결과를 찾을 수 없습니다.');
  }

  try {
    return JSON.parse(content);
  } catch (err) {
    throw new Error('Azure OpenAI 응답을 JSON으로 해석하지 못했습니다.');
  }
}

module.exports = { parseIntent };
