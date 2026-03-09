# Firebase 설정 가이드

이 프로젝트는 Firebase Realtime Database를 사용하여 데이터를 저장하고 실시간 동기화합니다.

## 1. Firebase 프로젝트 생성

1. [Firebase Console](https://console.firebase.google.com/)에 접속
2. "프로젝트 추가" 클릭
3. 프로젝트 이름 입력 (예: lunchpick)
4. Google Analytics 설정 (선택사항)
5. 프로젝트 생성 완료

## 2. Firebase Realtime Database 활성화

1. Firebase Console에서 좌측 메뉴 > "빌드" > "Realtime Database" 클릭
2. "데이터베이스 만들기" 클릭
3. 위치 선택:
   - **추천**: `asia-southeast1` (싱가포르) - 한국과 가장 가까움
   - 또는 `us-central1` (미국 중부)
4. 보안 규칙 선택:
   - **개발/테스트**: "테스트 모드에서 시작" 선택
   - **프로덕션**: "잠금 모드에서 시작" 후 규칙 수정
5. "사용 설정" 클릭

## 3. 보안 규칙 설정 (중요!)

Realtime Database 탭에서 "규칙" 탭으로 이동하여 다음 규칙을 적용하세요:

```json
{
  "rules": {
    "accounts": {
      "$username": {
        ".read": "auth == null || true",
        ".write": "!data.exists() || (auth != null && data.child('userId').val() == auth.uid)"
      }
    },
    "rooms": {
      "$roomId": {
        ".read": true,
        ".write": true
      }
    },
    "user-rooms": {
      "$userId": {
        ".read": "auth == null || true",
        ".write": "auth == null || true"
      }
    }
  }
}
```

**주의**: 위 규칙은 개발/테스트용입니다. 프로덕션 환경에서는 더 엄격한 규칙이 필요합니다.

### 프로덕션용 보안 규칙 (권장)

```json
{
  "rules": {
    "accounts": {
      "$username": {
        ".read": true,
        ".write": "!data.exists()"
      }
    },
    "rooms": {
      "$roomId": {
        ".read": true,
        ".write": "data.exists() && (
          data.child('participants').val()[auth.uid] != null ||
          !data.exists()
        )"
      }
    },
    "user-rooms": {
      "$userId": {
        ".read": "$userId == auth.uid",
        ".write": "$userId == auth.uid"
      }
    }
  }
}
```

## 4. Firebase 설정 정보 가져오기

1. Firebase Console > 프로젝트 설정 (톱니바퀴 아이콘)
2. "일반" 탭 > 하단 "내 앱" 섹션
3. 웹 앱이 없으면 "</>" (웹) 아이콘 클릭하여 앱 추가
4. "Firebase SDK 스니펫" > "구성" 선택
5. `firebaseConfig` 객체 복사

## 5. 프로젝트에 설정 적용

`/src/app/firebaseConfig.ts` 파일을 열고 다음 정보를 입력하세요:

```typescript
const firebaseConfig = {
  apiKey: "AIzaSy...",                                    // 여기에 복사한 값 붙여넣기
  authDomain: "your-project.firebaseapp.com",
  databaseURL: "https://your-project-default-rtdb.firebaseio.com",  // Realtime Database URL
  projectId: "your-project",
  storageBucket: "your-project.firebasestorage.app",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

**중요**: `databaseURL`을 반드시 입력해야 합니다!
- Realtime Database 페이지에서 복사할 수 있습니다.
- 형식: `https://프로젝트명-default-rtdb.지역.firebasedatabase.app`
- 예시: `https://lunchpick-default-rtdb.asia-southeast1.firebasedatabase.app`

## 6. 인증 활성화 (선택사항)

현재는 Firebase 인증 없이 작동하지만, 보안 강화를 위해 이메일/비밀번호 인증을 활성화할 수 있습니다:

1. Firebase Console > "빌드" > "Authentication"
2. "시작하기" 클릭
3. "이메일/비밀번호" 제공업체 활성화
4. `firebaseApi.ts`의 인증 로직을 Firebase Auth로 마이그레이션

## 7. 테스트

1. 앱을 실행하고 회원가입
2. Firebase Console > Realtime Database > 데이터 탭에서 데이터 확인
3. 룸 생성 및 채팅 테스트
4. 다른 브라우저/디바이스에서 실시간 동기화 확인

## 데이터 구조

```
firebase-realtime-database/
├── accounts/
│   └── {username}/
│       ├── userId
│       ├── password (해시 처리 권장)
│       ├── nickname
│       └── createdAt
├── rooms/
│   └── {roomId}/
│       ├── roomId
│       ├── name
│       ├── hostUserId
│       ├── participants[]
│       ├── settings{}
│       ├── pickHistory[]
│       ├── savedPlaces[]
│       ├── chatMessages[]
│       └── ...
└── user-rooms/
    └── {userId}/
        └── [roomId1, roomId2, ...]
```

## 비용

Firebase Realtime Database 무료 플랜:
- **동시 연결**: 100개
- **저장용량**: 1GB
- **다운로드**: 10GB/월

소규모 팀 프로토타입에는 무료 플랜으로 충분합니다.

## 문제 해결

### "permission denied" 오류
→ 보안 규칙을 확인하세요. 테스트 모드로 설정했는지 확인하세요.

### 데이터가 실시간으로 동기화되지 않음
→ `databaseURL`이 올바르게 설정되었는지 확인하세요.

### Firebase is not initialized
→ `firebaseConfig.ts`의 설정 정보가 올바른지 확인하세요.

## 참고 자료

- [Firebase Realtime Database 문서](https://firebase.google.com/docs/database)
- [보안 규칙 가이드](https://firebase.google.com/docs/database/security)
- [Firebase 가격 정보](https://firebase.google.com/pricing)
