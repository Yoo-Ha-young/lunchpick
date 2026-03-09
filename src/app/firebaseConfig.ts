/**
 * Firebase 설정 파일
 * 
 * ⚠️ 중요: 아래 설정을 실제 Firebase 프로젝트 정보로 교체해야 합니다!
 * 
 * 설정 방법:
 * 1. https://console.firebase.google.com/ 에서 프로젝트 생성
 * 2. Realtime Database 활성화
 * 3. 프로젝트 설정 > 일반 > 하단 "내 앱" > 웹 앱 추가
 * 4. "Firebase SDK 스니펫" > "구성" 복사하여 아래에 붙여넣기
 * 
 * 자세한 가이드: /FIREBASE_SETUP.md 참고
 */

import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getDatabase, type Database } from 'firebase/database';
import { getAuth, type Auth } from 'firebase/auth';

// ✅ Firebase 설정 완료
const firebaseConfig = {
  apiKey: "AIzaSyD-U3fohy5dZrtw1uz4dvL1PHk8rp9yY_E",
  authDomain: "lunchpick-b993f.firebaseapp.com",
  databaseURL: "https://lunchpick-b993f-default-rtdb.firebaseio.com",
  projectId: "lunchpick-b993f",
  storageBucket: "lunchpick-b993f.firebasestorage.app",
  messagingSenderId: "945811468315",
  appId: "1:945811468315:web:dc8e96307bd911502688be",
  measurementId: "G-0WC12WSDEF"
};

// Firebase 설정 유효성 검사
const isConfigured = 
  firebaseConfig.apiKey && 
  firebaseConfig.apiKey !== "YOUR_API_KEY" && 
  firebaseConfig.databaseURL && 
  firebaseConfig.databaseURL.includes('firebaseio.com');

// Firebase 초기화
export let app: FirebaseApp | null = null;
export let database: Database | null = null;
export let auth: Auth | null = null;
export const FIREBASE_ENABLED = isConfigured;

if (isConfigured) {
  try {
    app = initializeApp(firebaseConfig);
    database = getDatabase(app);
    auth = getAuth(app);
    console.log('✅ Firebase 초기화 완료:', {
      projectId: firebaseConfig.projectId,
      databaseURL: firebaseConfig.databaseURL
    });
  } catch (error) {
    console.error('❌ Firebase 초기화 실패:', error);
  }
} else {
  console.warn(
    "⚠️ Firebase 설정이 필요합니다!\n" +
    "현재 localStorage 모드로 동작합니다.\n" +
    "/src/app/firebaseConfig.ts 파일을 열어 실제 Firebase 프로젝트 정보를 입력하세요.\n" +
    "자세한 내용: /FIREBASE_SETUP.md"
  );
}
