# LunchPick API (카카오 로컬 프록시)

프론트엔드와 **별도로** Netlify에 배포하는 API 서버입니다.

---

## 1. 로컬 실행

```bash
cd api

# .env 파일 생성 (또는 터미널에서 환경변수 설정)
cp .env.example .env
# .env에 KAKAO_REST_API_KEY=발급키 입력

# 실행
npm run dev
```

서버: `http://localhost:3001`

| 경로 | 설명 |
|------|------|
| `GET /kakao/address?query=` | 주소/장소 검색 |
| `GET /kakao/places?lat=&lng=&radius=&categories=` | 주변 음식점 검색 |
| `GET /kakao/place-detail?id=` | 장소 상세 |

프론트엔드 로컬 실행 시 `.env`에 `VITE_API_URL=http://localhost:3001` 설정.

---

## 2. Netlify 배포

1. Netlify에서 **새 사이트** 생성
2. 저장소 연결 시 **Base directory**를 `api`로 설정
3. 환경변수: `KAKAO_REST_API_KEY` = 카카오 REST API 키
4. 배포

배포 후 URL 예: `https://your-api-site.netlify.app`

| 경로 | 설명 |
|------|------|
| `/.netlify/functions/kakao-address?query=` | 주소/장소 검색 |
| `/.netlify/functions/kakao-places?lat=&lng=&radius=&categories=` | 주변 음식점 검색 |
| `/.netlify/functions/kakao-place-detail?id=` | 장소 상세 |

---

## 3. 프론트엔드 연동

프론트엔드 환경변수 `VITE_API_URL`:

- 로컬: `http://localhost:3001`
- 배포: `https://your-api-site.netlify.app`
