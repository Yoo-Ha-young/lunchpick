# LunchPick 배포 가이드

## 1. 로컬 실행

### API 서버 (카카오 프록시)

```bash
cd api
cp .env.example .env
# .env에 KAKAO_REST_API_KEY=발급키 입력

npm run dev
```

→ `http://localhost:3001` 에서 API 실행

### 프론트엔드

```bash
# 프로젝트 루트에서
echo "VITE_API_URL=http://localhost:3001" > .env
npm run dev
```

→ `http://localhost:5173` 에서 앱 실행 (API는 localhost:3001 호출)

---

## 2. Netlify 배포

### API 사이트 (사이트 1)

| 설정 | 값 |
|------|-----|
| Base directory | `api` |
| Build command | (netlify.toml 사용) |
| Publish directory | `public` |
| Environment variables | `KAKAO_REST_API_KEY` = 카카오 REST API 키 |

배포 후 URL 예: `https://lunchpick-api.netlify.app`

### 프론트엔드 사이트 (사이트 2)

| 설정 | 값 |
|------|-----|
| Base directory | (비움) |
| Build command | `npm run build` |
| Publish directory | `dist` |
| Environment variables | `VITE_API_URL` = API 사이트 URL (예: `https://lunchpick-api.netlify.app`) |

---

## 3. 한 번에 실행 (로컬)

터미널 2개에서:

```bash
# 터미널 1 - API
cd api && npm run dev

# 터미널 2 - 프론트
# (프로젝트 루트) .env에 VITE_API_URL=http://localhost:3001 설정 후
npm run dev
```
