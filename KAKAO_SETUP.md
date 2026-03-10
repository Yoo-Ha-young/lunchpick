# 카카오맵 API 설정 가이드

주소 검색, 주변 음식점 검색 기능을 사용하려면 **카카오 REST API 키**와 **API 서버(별도 배포)**가 필요합니다.

---

## 1. 카카오 API 키 발급

1. [카카오 개발자 센터](https://developers.kakao.com/) 로그인
2. **내 애플리케이션** → 애플리케이션 추가 (또는 기존 선택)
3. **앱 키** 탭에서 **REST API 키** 복사

---

## 2. API 서버 배포 (별도 Netlify 사이트)

`api/` 폴더를 **별도 Netlify 사이트**로 배포합니다.

### 배포 절차

1. Netlify에서 **새 사이트** 생성 (프론트엔드와 다른 사이트)
2. 같은 저장소 연결, **Base directory**를 `api`로 설정
3. **Environment variables**에 `KAKAO_REST_API_KEY` 추가
4. 배포 후 API URL 확인 (예: `https://lunchpick-api.netlify.app`)

자세한 내용은 `api/README.md` 참고.

---

## 3. 프론트엔드 배포

프론트엔드 Netlify 사이트의 **Environment variables**에 추가:

- `VITE_API_URL` = API 사이트 URL (예: `https://lunchpick-api.netlify.app`)

---

## 4. API 미연결 시

- **API 미연결 시**: `fetchNearbyRestaurants` 실패 → 에러 메시지 표시, 후보 없음
- **API 연결 후**: 실제 카카오맵 데이터로 주변 음식점 검색
