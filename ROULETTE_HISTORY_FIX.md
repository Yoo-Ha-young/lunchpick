# 룰렛 기록 & 후보집 저장 문제 해결

## 문제 상황
- 룰렛을 돌려도 History 탭에 기록이 나타나지 않음
- 후보집에 추가해도 저장되지 않음
- Firebase에 pickHistory, savedPlaces 데이터가 저장되지 않음
- Firebase 콘솔에서 해당 데이터 구조가 보이지 않음

## 원인 분석

### 1. 비동기 처리 문제
- `handleSpinEnd`에서 `addPickHistory`를 await 없이 호출
- `addSavedPlace`, `removeSavedPlace` 호출 시 await 누락
- 저장이 완료되기 전에 다음 작업이 실행됨

### 2. Firebase 보안 규칙 미설정
- Firebase Realtime Database의 기본 보안 규칙이 너무 제한적
- 읽기/쓰기 권한이 차단되어 데이터 저장 실패

### 3. Firebase 배열 처리 이슈
- Firebase는 빈 요소가 있는 배열을 객체로 변환
- pickHistory를 읽을 때 객체로 반환될 수 있음
- `Array.isArray()` 체크 없이 배열 메서드 사용 시 오류 발생

## 해결 방법

### ✅ 1. 비동기 처리 수정
**파일**: `/src/app/pages/Room.tsx`

#### 룰렛 결과 저장:
```typescript
// Before
const handleSpinEnd = useCallback(() => {
  // ...
  addPickHistory(room.roomId, result);  // ❌ await 없음
  loadRoom();
}, []);

// After
const handleSpinEnd = useCallback(async () => {
  // ...
  await addPickHistory(room.roomId, result);  // ✅ await 추가
  await loadRoom();
}, []);
```

#### 후보집 추가:
```typescript
// Before
onSaveToFavorites={place => {
  addSavedPlace(room.roomId, place);  // ❌ await 없음
  loadRoom();
}}

// After
onSaveToFavorites={async (place) => {
  await addSavedPlace(room.roomId, place);  // ✅ await 추가
  await loadRoom();
}}
```

#### 후보집 삭제:
```typescript
// Before
onRemove={placeId => {
  removeSavedPlace(room.roomId, placeId);  // ❌ await 없음
  loadRoom();
}}

// After
onRemove={async (placeId) => {
  await removeSavedPlace(room.roomId, placeId);  // ✅ await 추가
  await loadRoom();
}}
```

### ✅ 2. Firebase 보안 규칙 설정
**파일**: `/database.rules.json` (생성됨)

#### Firebase 콘솔에서 규칙 적용 필요:

1. https://console.firebase.google.com/ 접속
2. **lunchpick-b993f** 프로젝트 선택
3. **Realtime Database** > **규칙** 탭
4. 아래 규칙으로 교체 후 **게시**:

```json
{
  "rules": {
    ".read": true,
    ".write": true,
    "rooms": {
      "$roomId": {
        ".read": true,
        ".write": true,
        "pickHistory": {
          ".indexOn": ["pickedAt", "placeId"]
        }
      }
    },
    "accounts": {
      "$username": {
        ".read": true,
        ".write": true
      }
    },
    "profiles": {
      "$userId": {
        ".read": true,
        ".write": true
      }
    },
    "user-rooms": {
      "$userId": {
        ".read": true,
        ".write": true
      }
    }
  }
}
```

⚠️ **보안 경고**: 위 규칙은 개발/테스트용입니다. 프로덕션에서는 auth 검증 필요!

### ✅ 3. 배열 변환 처리 추가
**파일**: `/src/app/firebaseApi.ts`

#### saveRoom 함수:
```typescript
// 배열을 명시적으로 복사하여 Firebase 배열 처리 이슈 방지
const roomToSave = {
  ...room,
  pickHistory: Array.isArray(room.pickHistory) ? [...room.pickHistory] : [],
  // ... 다른 배열들도 동일 처리
};
await set(roomRef, roomToSave);
```

#### getRoom 함수:
```typescript
// Firebase가 배열을 객체로 변환한 경우 대응
room.pickHistory = Array.isArray(room.pickHistory) 
  ? room.pickHistory 
  : (room.pickHistory ? Object.values(room.pickHistory) : []);
```

#### subscribeToRoom 함수:
- 실시간 리스너에서도 동일한 배열 변환 로직 적용

### ✅ 4. 디버깅 로그 추가
상세한 로그를 추가하여 문제 추적 가능:

**룰렛 관련:**
- `🎰 룰렛 결과`
- `🎲 addPickHistory 호출`
- `📝 pickHistory에 추가`

**후보집 관련:**
- `⭐ addSavedPlace 호출`
- `📝 savedPlaces에 추가`
- `🗑️ removeSavedPlace 호출`

**공통 저장:**
- `💾 saveRoom 시작` (pickHistoryCount, savedPlacesCount 포함)
- `✅ Firebase에 저장 완료`
- `🔍 저장 검증` (양쪽 카운트 확인)
- `📥 getRoom from Firebase` (양쪽 카운트 확인)

## 테스트 방법

### 1. Firebase 보안 규칙 적용
- Firebase 콘솔에서 규칙 게시
- "규칙이 게시되었습니다" 메시지 확인

### 2. 브라우저 캐시 삭제
```
F12 > Application > Storage > Clear site data
```

### 3. 앱 새로고침
```
F5 또는 Ctrl+R
```

### 4. 기능 테스트

#### 4-1. 룰렛 테스트
1. 룰렛 탭으로 이동
2. 후보 식당 설정
3. 룰렛 돌리기
4. History 탭에서 기록 확인

#### 4-2. 후보집 테스트
1. 후보 탭에서 "직접 추가" 클릭
2. 식당 정보 입력 후 "후보집에 저장" 체크
3. 추가 버튼 클릭
4. 후보집 버튼 클릭하여 저장 확인

### 5. 콘솔 로그 확인
`F12 > Console` 탭에서 다음 로그 확인:

#### 룰렛 저장 로그:
```
🎰 룰렛 결과: [식당명]
💾 pickHistory 저장 시작...
🎲 addPickHistory 호출: {...}
📝 pickHistory에 추가: {...}
💾 saveRoom 시작: { pickHistoryCount: 1, savedPlacesCount: 0, ... }
✅ Firebase에 저장 완료
🔍 저장 검증: { pickHistoryCount: 1, pickHistoryIsArray: true, savedPlacesCount: 0, ... }
✅ pickHistory 저장 완료
🔄 room 데이터 다시 로드...
📥 getRoom from Firebase: { pickHistoryCount: 1, savedPlacesCount: 0, ... }
🔍 저장된 pickHistory 확인: { count: 1, latest: {...}, ... }
```

#### 후보집 저장 로그:
```
⭐ 후보집에 추가: [식당명]
⭐ addSavedPlace 호출: { roomId: "...", placeName: "..." }
📝 savedPlaces에 추가: { before: 0 }
📝 savedPlaces에 추가 후: { after: 1 }
💾 saveRoom 호출 (후보집)
💾 saveRoom 시작: { pickHistoryCount: 0, savedPlacesCount: 1, ... }
✅ Firebase에 저장 완료
🔍 저장 검증: { savedPlacesCount: 1, savedPlacesIsArray: true, firstSavedPlace: "..." }
✅ 후보집 저장 완료
```

### 6. UI 확인

#### 6-1. History 탭 확인
- History 탭으로 이동
- "룰렛 기록" 섹션에 방금 돌린 결과가 표시되는지 확인
- 날짜, 시간, 식당명이 정확한지 확인

#### 6-2. 후보집 확인
- 후보 탭에서 "후보집" 버튼 클릭
- 저장한 식당이 목록에 표시되는지 확인
- 후보로 불러오기 기능 작동 확인

### 7. Firebase 콘솔 확인
1. Firebase 콘솔 > Realtime Database > 데이터 탭
2. `rooms/{roomId}/pickHistory` 경로로 이동
   - 배열 데이터가 저장되어 있는지 확인
3. `rooms/{roomId}/savedPlaces` 경로로 이동
   - 후보집 데이터가 저장되어 있는지 확인

## 예상 결과

### 성공 시:
- ✅ 룰렛 결과가 즉시 History 탭에 표시
- ✅ 후보집 추가 시 목록에 즉시 반영
- ✅ Firebase에 pickHistory, savedPlaces 데이터 저장됨
- ✅ 다른 사용자도 실시간으로 기록/후보집 확인 가능
- ✅ 브라우저 새로고침 후에도 데이터 유지

### 실패 시 체크 사항:

#### 1. Firebase 보안 규칙 미적용
- 증상: 콘솔에 permission denied 오류
- 해결: Firebase 콘솔에서 규칙 다시 확인 및 게시

#### 2. Firebase 연결 실패
- 증상: "Firebase 초기화 완료" 로그 없음
- 해결: `/src/app/firebaseConfig.ts` 설정 확인

#### 3. 네트워크 오류
- 증상: Firebase 요청 실패
- 해결: 네트워크 연결 확인, F12 > Network 탭 체크

#### 4. 배열 변환 실패
- 증상: `pickHistory is not a function` 오류
- 해결: `room.pickHistory`가 배열인지 확인

## 추가 개선 사항

### 1. 오류 처리
현재 saveRoom에서 오류 발생 시 상세 로그 출력:
```typescript
catch (error) {
  console.error('❌ saveRoom error:', error);
  console.error('Error details:', {
    message: error instanceof Error ? error.message : 'Unknown error',
    code: (error as any)?.code,
    stack: error instanceof Error ? error.stack : undefined
  });
}
```

### 2. 데이터 검증
저장 직후 Firebase에서 다시 읽어와서 검증:
```typescript
const snapshot = await get(roomRef);
if (snapshot.exists()) {
  const saved = snapshot.val();
  console.log('🔍 저장 검증:', {
    pickHistoryCount: saved.pickHistory?.length || 0,
    pickHistoryIsArray: Array.isArray(saved.pickHistory),
    firstItem: saved.pickHistory?.[0]
  });
}
```

## 관련 파일

- `/src/app/pages/Room.tsx` - 룰렛 로직
- `/src/app/store.ts` - addPickHistory 함수
- `/src/app/firebaseApi.ts` - Firebase CRUD
- `/src/app/firebaseConfig.ts` - Firebase 설정
- `/database.rules.json` - Firebase 보안 규칙
- `/FIREBASE_DATABASE_RULES.md` - 보안 규칙 가이드

## 참고 문서
- [Firebase Realtime Database 규칙](https://firebase.google.com/docs/database/security)
- [Firebase 배열 처리](https://firebase.google.com/docs/database/web/lists-of-data)
