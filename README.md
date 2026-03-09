# lunchpick

냠냠픽 - 팀 점심 선택 웹앱 🍱

React + Vite + Firebase 기반으로 팀원들과 함께 점심 메뉴를 룰렛으로 골라보세요.

## 주요 기능

- 🎰 **룰렛 뽑기**: 카카오맵 API 연동 주변 음식점 룰렛
- 👥 **팀 룸**: 초대 코드로 팀원 초대
- 💰 **정산**: 나눠/따로 계산, 채팅창 공유
- 📍 **방문 히스토리·정산 기록**
- 🗑️ **방 삭제·되돌리기**: 7일 이내 복원 가능

## 시작하기

```bash
npm install
npm run dev
```

## API 설정

카카오맵 API 설정은 `KAKAO_SETUP.md` 참고.

## 환경 변수

- `api/.env`: `KAKAO_REST_API_KEY` (카카오 REST API 키)
