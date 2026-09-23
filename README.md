# FindIt AI

자연어로 원하는 상품을 설명하면 AI가 의도를 분석하고 실제 상품과 가격을 찾아주는 자연어 커머스 검색 서비스입니다.

## 한 줄 요약

사용자가 애매하게 상품을 설명해도("여름에 입기 좋고 목 안 늘어나는 하얀색 오버핏 반팔티") AI가 의도를 분석해서 실제 쇼핑 상품과 가격을 찾아줍니다.

## 동작 흐름

1. **검색 입력** — 사용자가 자연어로 원하는 상품을 설명합니다. ([public/index.html](public/index.html))
2. **의도 분석** — Azure OpenAI가 문장을 카테고리, 핵심 특징, 목적·제약사항, 검색 키워드로 분해합니다. ([services/intent.js](services/intent.js))
3. **상품 조회** — 다나와(Danawa) 검색 결과 페이지를 실시간 스크래핑해 후보 상품을 수집합니다. ([services/scraper.js](services/scraper.js))
4. **매칭·랭킹** — 추출된 특징이 상품명에 얼마나 포함되는지로 일치율을 계산하고 최저가를 표시합니다. ([services/matcher.js](services/matcher.js))
5. **결과 표시** — 매칭 점수, AI 선정 이유, 가격, 구매 링크를 카드 UI로 표시하고 일치도순·최저가순 필터를 제공합니다. ([public/app.js](public/app.js))

## 기술 스택

| 영역 | 구성 |
|---|---|
| 백엔드 | Node.js + Express ([server.js](server.js)) |
| 프런트엔드 | 정적 HTML/JS + Tailwind CDN |
| LLM | Azure OpenAI Chat Completions |
| 상품 데이터 | 다나와 실시간 스크래핑 (`cheerio`) |
| 안정성 | 검색 결과 캐싱 10분, IP 레이트리밋 5분/20회, 요청 타임아웃 30초 |

## 현재 배포 상태

Azure App Service(Linux, Node 20, F1 무료 요금제)에 배포되어 있습니다.

- 서비스 주소: [https://app-web-ovkh3zqwz76uy.azurewebsites.net/](https://app-web-ovkh3zqwz76uy.azurewebsites.net/)
- 헬스체크: `https://app-web-ovkh3zqwz76uy.azurewebsites.net/api/health`

배포 설정은 [azure.yaml](azure.yaml), [infra/main.bicep](infra/main.bicep), [infra/resources.bicep](infra/resources.bicep)에서 확인할 수 있습니다.

### 환경변수

`.env`에 Azure OpenAI 정보를 입력합니다. `.env`는 Git에 커밋하지 않습니다.

```env
AZURE_OPENAI_API_KEY=your-api-key
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_DEPLOYMENT=your-deployment-name
AZURE_OPENAI_API_VERSION=2024-08-01-preview
PORT=3000
```

## MVP 범위

### 포함

- 텍스트 자연어 검색
- Azure OpenAI 기반 의도 분석
- 다나와 실시간 상품 조회
- 상품 가격 비교와 매칭 점수
- 최근 검색어 저장
- 일치도순·최저가순 필터

### 제외

- 이미지 검색
- 결제 및 로그인
- 벡터 DB 기반 유사도 검색
- 쿠팡파트너스 등 실제 쇼핑몰 제휴 API

## 수익 모델 구상

- 제휴 마케팅: 구매 연결 수수료
- 쇼핑몰 광고: 스폰서드 상품 노출
- B2B 검색엔진 API 판매

## 주의사항

다나와 검색 결과를 실시간 스크래핑하므로 사이트 구조 변경에 따라 파서 수정이 필요할 수 있습니다. 자동 수집은 대상 사이트의 이용약관과 정책을 준수해야 합니다.

## 관련 문서

- 제품 요구사항: [prd.md](prd.md)
- 에이전트 개발 지침: [agent.md](agent.md)
- Azure 배포 계획: [.azure/deployment-plan.md](.azure/deployment-plan.md)
