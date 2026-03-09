# 후보집 저장 안 되는 문제 해결

## 문제
후보집에 식당을 추가해도 저장되지 않고, 새로고침하면 사라짐

## 원인
`addSavedPlace`, `removeSavedPlace` 함수 호출 시 `await` 키워드 누락

## 해결

### 1. 후보집 추가 시 await 추가
**파일**: `/src/app/pages/Room.tsx`

```typescript
// ❌ Before
onSaveToFavorites={place => {
  addSavedPlace(room.roomId, place);
  loadRoom();
}}

// ✅ After
onSaveToFavorites={async (place) => {
  await addSavedPlace(room.roomId, place);
  await loadRoom();
}}
```

### 2. 후보집 삭제 시 await 추가
**파일**: `/src/app/pages/Room.tsx`

```typescript
// ❌ Before
onRemove={placeId => {
  removeSavedPlace(room.roomId, placeId);
  loadRoom();
}}

// ✅ After
onRemove={async (placeId) => {
  await removeSavedPlace(room.roomId, placeId);
  await loadRoom();
}}
```

### 3. 디버깅 로그 추가
**파일**: `/src/app/store.ts`

`addSavedPlace`, `removeSavedPlace` 함수에 상세 로그 추가:
- ⭐ addSavedPlace 호출
- 📝 savedPlaces에 추가/삭제
- 💾 saveRoom 호출
- ✅ 저장 완료

## 테스트 방법

### 1. Firebase 보안 규칙 확인
먼저 `/FIREBASE_DATABASE_RULES.md` 파일을 참고하여 Firebase 보안 규칙이 올바르게 설정되어 있는지 확인하세요.

### 2. 후보집 추가 테스트
1. 후보 탭 > "직접 추가" 버튼 클릭
2. 식당 이름, 카테고리 입력
3. **"후보집에 저장"** 체크박스 체크
4. "추가" 버튼 클릭
5. F12 > Console에서 로그 확인:
   ```
   ⭐ 후보집에 추가: [식당명]
   ⭐ addSavedPlace 호출: { roomId: "...", placeName: "..." }
   📝 savedPlaces에 추가: { before: 0 }
   📝 savedPlaces에 추가 후: { after: 1 }
   💾 saveRoom 호출 (후보집)
   💾 saveRoom 시작: { savedPlacesCount: 1, ... }
   ✅ Firebase에 저장 완료
   🔍 저장 검증: { savedPlacesCount: 1, savedPlacesIsArray: true, ... }
   ✅ 후보집 저장 완료
   ```

### 3. 후보집 확인
1. 후보 탭 > "후보집" 버튼 클릭
2. 방금 추가한 식당이 목록에 표시되는지 확인
3. 브라우저 새로고침 (F5)
4. 다시 후보집 버튼 클릭하여 데이터가 유지되는지 확인

### 4. Firebase 콘솔 확인
1. https://console.firebase.google.com/ 접속
2. **lunchpick-b993f** 프로젝트 선택
3. **Realtime Database** > **데이터** 탭
4. `rooms/{roomId}/savedPlaces` 경로 확인
5. 배열 형태로 데이터가 저장되어 있는지 확인

## 예상 결과

### ✅ 성공 시:
- 후보집에 추가한 식당이 목록에 즉시 표시됨
- 브라우저 새로고침 후에도 데이터 유지됨
- Firebase 콘솔에서 savedPlaces 배열 확인 가능
- 다른 참여자도 동일한 후보집 확인 가능 (실시간 동기화)

### ❌ 실패 시 체크사항:

1. **Firebase 보안 규칙 미적용**
   - 증상: 콘솔에 permission denied 오류
   - 해결: `/FIREBASE_DATABASE_RULES.md` 참고하여 규칙 적용

2. **콘솔에 "이미 후보집에 존재" 메시지**
   - 증상: 추가되지 않음
   - 원인: 동일한 placeId 또는 이름이 이미 존재
   - 해결: 다른 식당으로 테스트

3. **Firebase 연결 실패**
   - 증상: "Firebase 초기화 완료" 로그 없음
   - 해결: `/src/app/firebaseConfig.ts` 설정 확인

4. **배열이 객체로 저장됨**
   - 증상: Firebase 콘솔에서 배열이 아닌 객체로 표시
   - 해결: 이미 적용된 배열 변환 로직으로 자동 처리됨

## 후보집 기능

### 추가 방법
1. **직접 추가**: 후보 탭 > "직접 추가" > "후보집에 저장" 체크
2. **FavoritesModal**: 후보집 모달에서 직접 추가 가능

### 사용 방법
1. 후보 탭 > "후보집" 버튼 클릭
2. 저장된 식당 목록 확인
3. "후보로 불러오기" 버튼으로 현재 후보 목록에 추가
4. 휴지통 버튼으로 후보집에서 삭제

### 유용한 경우
- 자주 가는 단골 식당 저장
- 가보고 싶은 식당 저장
- 다른 방에서도 재사용할 식당 관리

## 관련 파일

- `/src/app/pages/Room.tsx` - 후보집 추가/삭제 UI
- `/src/app/store.ts` - addSavedPlace, removeSavedPlace 함수
- `/src/app/firebaseApi.ts` - Firebase 저장 로직
- `/src/app/components/FavoritesModal.tsx` - 후보집 모달
- `/src/app/components/AddCandidateModal.tsx` - 직접 추가 모달

## 함께 보기
- `/ROULETTE_HISTORY_FIX.md` - 룰렛 기록 저장 문제 해결
- `/FIREBASE_DATABASE_RULES.md` - Firebase 보안 규칙 설정 가이드
