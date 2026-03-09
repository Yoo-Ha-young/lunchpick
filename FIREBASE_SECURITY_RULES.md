# Firebase Realtime Database 보안 규칙 설정

## 🚨 중요: Permission Denied 오류 해결

현재 `Permission denied` 오류가 발생하는 이유는 Firebase Realtime Database의 보안 규칙이 설정되지 않았거나 읽기/쓰기를 허용하지 않기 때문입니다.

## 📝 보안 규칙 설정 방법

### 1. Firebase Console 접속
1. https://console.firebase.google.com/ 접속
2. 프로젝트 선택: **lunchpick-b993f**

### 2. Realtime Database 보안 규칙 설정
1. 왼쪽 메뉴에서 **빌드** > **Realtime Database** 클릭
2. 상단 탭에서 **규칙** 클릭
3. 다음 규칙을 복사하여 붙여넣기:

```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

4. **게시** 버튼 클릭

### ⚠️ 보안 경고
위 규칙은 **개발/테스트 전용**입니다. 모든 사용자가 데이터를 읽고 쓸 수 있습니다.

## 🔒 프로덕션용 보안 규칙 (선택사항)

실제 배포 시에는 아래와 같이 더 안전한 규칙을 사용하세요:

```json
{
  "rules": {
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
    "rooms": {
      "$roomId": {
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

## ✅ 설정 확인

규칙을 게시한 후:
1. 웹 앱을 새로고침
2. 로그인 시도
3. 프로필 저장 시도
4. Console에서 `Permission denied` 오류가 사라졌는지 확인

## 🔗 참고 문서
- [Firebase Realtime Database 보안 규칙](https://firebase.google.com/docs/database/security)
- [규칙 시뮬레이터 사용법](https://firebase.google.com/docs/database/security/rules-simulator)
