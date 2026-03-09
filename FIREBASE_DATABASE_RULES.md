# Firebase Realtime Database 보안 규칙 설정

## 문제 증상
- 룰렛 결과가 기록(pickHistory)에 저장되지 않음
- Firebase에 데이터가 저장되지 않음
- 콘솔에 권한 오류 발생

## 원인
Firebase Realtime Database의 기본 보안 규칙이 너무 제한적이어서 읽기/쓰기가 차단됨

## 해결 방법

### 1. Firebase 콘솔 접속
https://console.firebase.google.com/

### 2. 프로젝트 선택
**lunchpick-b993f** 프로젝트 클릭

### 3. Realtime Database 보안 규칙 설정
1. 왼쪽 메뉴에서 **빌드** > **Realtime Database** 클릭
2. 상단 탭에서 **규칙** 클릭
3. 기존 규칙을 아래 내용으로 **완전히 교체**:

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

4. **게시** 버튼 클릭

### 4. 규칙 적용 확인
- 게시 후 "규칙이 게시되었습니다" 메시지 확인
- 앱을 새로고침 (F5)
- 룰렛을 다시 돌려서 기록이 저장되는지 확인

### 5. 브라우저 콘솔 확인
개발자 도구(F12) > Console 탭에서 다음 로그 확인:
- ✅ Firebase에 저장 완료
- 🔍 저장 검증: pickHistoryCount: 1 이상
- 📥 getRoom from Firebase: pickHistoryCount: 1 이상

## ⚠️ 보안 경고
현재 규칙은 **개발/테스트 용도**입니다. 프로덕션 배포 전에 반드시 다음과 같이 보안 규칙을 강화해야 합니다:

```json
{
  "rules": {
    "rooms": {
      "$roomId": {
        ".read": "auth != null",
        ".write": "auth != null && (
          !data.exists() || 
          data.child('hostUserId').val() == auth.uid ||
          data.child('participants').child(auth.uid).exists()
        )"
      }
    },
    "accounts": {
      "$username": {
        ".read": "auth != null",
        ".write": "auth != null && !data.exists()"
      }
    },
    "profiles": {
      "$userId": {
        ".read": "auth != null",
        ".write": "auth != null && auth.uid == $userId"
      }
    },
    "user-rooms": {
      "$userId": {
        ".read": "auth != null && auth.uid == $userId",
        ".write": "auth != null && auth.uid == $userId"
      }
    }
  }
}
```

## 문제 해결
규칙을 적용했는데도 데이터가 저장되지 않는다면:

1. **브라우저 캐시 삭제**
   - F12 > Application > Storage > Clear site data

2. **Firebase 콘솔에서 데이터 확인**
   - Realtime Database > 데이터 탭
   - `rooms/{roomId}/pickHistory` 경로 확인

3. **네트워크 탭 확인**
   - F12 > Network 탭
   - Firebase 요청의 응답 코드 확인
   - 403 오류: 보안 규칙 문제
   - 401 오류: 인증 문제

4. **Firebase 연결 상태 확인**
   - 콘솔에 "✅ Firebase 초기화 완료" 메시지가 있는지 확인
