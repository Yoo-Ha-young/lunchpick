import React, { useEffect, useState } from 'react';
import { createAccount, loginAccount } from '../firebaseApi';

interface Result {
  label: string;
  status: 'pending' | 'ok' | 'fail' | 'skip';
  message: string;
  detail?: string;
}

export default function AdminSeedPage() {
  const [results, setResults] = useState<Result[]>([]);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const run = async () => {
      const pushResult = (r: Result) => setResults(prev => [...prev, r]);
      const updateLast = (r: Partial<Result>) =>
        setResults(prev => prev.map((x, i) => i === prev.length - 1 ? { ...x, ...r } : x));

      // ── 1. test123 / pass1234 등록 ──────────────────────
      pushResult({ label: 'test123 회원가입 시도', status: 'pending', message: 'Firebase에 요청 중...' });
      const reg = await createAccount('test123', 'pass1234', '테스트유저');
      if (reg.success) {
        updateLast({ label: 'test123 회원가입', status: 'ok', message: `✅ 성공! userId = ${reg.userId}` });
      } else if (reg.error?.includes('이미 사용')) {
        updateLast({ label: 'test123 회원가입', status: 'skip', message: `⏭ 이미 존재함 (정상 — 중복 방지)` });
      } else {
        updateLast({ label: 'test123 회원가입', status: 'fail', message: `❌ ${reg.error}` });
      }

      // ── 2. 로그인 검증 ───────────────────────────────────
      pushResult({ label: 'test123 로그인 검증', status: 'pending', message: 'Firebase에 요청 중...' });
      const login = await loginAccount('test123', 'pass1234');
      if (login.success && login.account) {
        updateLast({ label: 'test123 로그인 검증', status: 'ok', message: `✅ 로그인 성공! nickname = ${login.account.nickname}` });
      } else {
        updateLast({ label: 'test123 로그인 검증', status: 'fail', message: `❌ ${login.error}` });
      }

      setDone(true);
    };

    run();
  }, []);

  const colorClass = (s: Result['status']) => {
    if (s === 'ok')   return 'border-green-200 bg-green-50 text-green-700';
    if (s === 'fail') return 'border-red-200 bg-red-50 text-red-700';
    if (s === 'skip') return 'border-yellow-200 bg-yellow-50 text-yellow-700';
    return 'border-gray-200 bg-gray-50 text-gray-400';
  };

  const allOk = done && results.every(r => r.status === 'ok' || r.status === 'skip');
  const hasFail = done && results.some(r => r.status === 'fail');

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 w-full max-w-lg">
        <h1 className="text-xl text-gray-800 mb-1">🛠 Firebase 연결 테스트</h1>
        <p className="text-sm text-gray-400 mb-6">
          <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">test123 / pass1234</code> 계정을
          Firebase에 등록하고 로그인까지 검증합니다.
        </p>

        <div className="space-y-3 mb-6">
          {results.map((r, i) => (
            <div key={i} className={`rounded-xl border px-4 py-3 text-sm ${colorClass(r.status)}`}>
              <p className="font-medium">{r.label}</p>
              <p className="mt-0.5 text-xs opacity-75">{r.message}</p>
              {r.detail && <p className="mt-0.5 text-xs opacity-60">{r.detail}</p>}
            </div>
          ))}
          {!done && (
            <div className="text-center py-6 text-sm text-gray-400 animate-pulse">
              ⏳ 실행 중...
            </div>
          )}
        </div>

        {done && (
          <>
            {allOk && (
              <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                🎉 <strong>Firebase 연결 성공!</strong> Realtime Database에 저장되었습니다.<br />
                <span className="text-xs opacity-75">이제 로그인 페이지에서 test123 / pass1234로 로그인할 수 있습니다.</span>
              </div>
            )}
            {hasFail && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <p className="font-medium mb-1">⚠️ 오류 발생</p>
                <p className="text-xs">Firebase 설정을 확인하세요. /src/app/firebaseConfig.ts에서 설정이 올바른지 확인하고, Firebase Console에서 Realtime Database가 활성화되어 있는지 확인하세요.</p>
              </div>
            )}
            <a
              href="/"
              className="block w-full py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-center text-sm transition-colors"
            >
              홈으로 돌아가기
            </a>
          </>
        )}
      </div>
    </div>
  );
}
