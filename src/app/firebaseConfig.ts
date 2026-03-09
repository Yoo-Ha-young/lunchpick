/**
 * Firebase 설정 파일
 * 환경변수(.env)에서 로드. 프로젝트 루트 .env.example 참고.
 * 자세한 가이드: /FIREBASE_SETUP.md
 */

import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getDatabase, type Database } from 'firebase/database';
import { getAuth, type Auth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? "",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL ?? "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? "",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID ?? "",
};

// Firebase 설정 유효성 검사
const isConfigured = !!(
  firebaseConfig.apiKey &&
  firebaseConfig.databaseURL &&
  firebaseConfig.databaseURL.includes('firebaseio.com')
);

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
