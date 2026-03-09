import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { UtensilsCrossed, Eye, EyeOff, ArrowRight, UserPlus, LogIn, Loader2 } from 'lucide-react';
import { loginAccount, createAccount } from '../store';
import { FIREBASE_ENABLED } from '../firebaseConfig';

type AuthTab = 'login' | 'register';

export default function LoginPage() {
  const navigate = useNavigate();
  const params = new URLSearchParams(window.location.search);
  const nextUrl = params.get('next') || '/home';

  const [tab, setTab] = useState<AuthTab>('login');

  const [loginId, setLoginId] = useState('');
  const [loginPw, setLoginPw] = useState('');
  const [showLoginPw, setShowLoginPw] = useState(false);

  const [regId, setRegId] = useState('');
  const [regPw, setRegPw] = useState('');
  const [regPw2, setRegPw2] = useState('');
  const [regNickname, setRegNickname] = useState('');
  const [showRegPw, setShowRegPw] = useState(false);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError('');
    if (!loginId.trim()) { setError('아이디를 입력해 주세요.'); return; }
    if (!loginPw) { setError('비밀번호를 입력해 주세요.'); return; }
    setLoading(true);
    try {
      const result = await loginAccount(loginId.trim(), loginPw);
      if (!result.success) { setError(result.error!); return; }
      navigate(nextUrl);
    } catch (err) {
      setError('로그인 중 오류가 발생했습니다.');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    setError('');
    if (!regId.trim()) { setError('아이디를 입력해 주세요.'); return; }
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(regId.trim())) {
      setError('아이디는 영문/숫자/밑줄 3~20자로 입력해 주세요.'); return;
    }
    if (regPw.length < 4) { setError('비밀번호는 4자 이상이어야 합니다.'); return; }
    if (regPw !== regPw2) { setError('비밀번호가 일치하지 않습니다.'); return; }
    if (!regNickname.trim()) { setError('닉네임을 입력해 주세요.'); return; }
    setLoading(true);
    try {
      const result = await createAccount(regId.trim(), regPw, regNickname.trim());
      if (!result.success) { setError(result.error!); return; }
      navigate(nextUrl);
    } catch (err) {
      setError('회원가입 중 오류가 발생했습니다.');
      console.error('Register error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 flex flex-col items-center justify-center px-4">
      {/* Logo */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-500 rounded-2xl flex items-center justify-center shadow-lg mb-4">
          <UtensilsCrossed className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl text-gray-900 mb-1">🍱 냠냠픽</h1>
        <p className="text-sm text-gray-400">"뭐 먹지?" 고민은 이제 그만</p>
      </div>

      {/* Firebase 설정 안내 */}
      {!FIREBASE_ENABLED && (
        <div className="w-full max-w-sm mb-4 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-700">
          <p className="font-medium mb-1">🔥 Firebase 설정 필요</p>
          <p className="text-[11px] leading-relaxed">
            <code className="bg-blue-100 px-1 rounded">/src/app/firebaseConfig.ts</code> 파일에서<br/>
            Firebase 프로젝트 정보를 설정해 주세요.
          </p>
        </div>
      )}

      {/* Card */}
      <div className="w-full max-w-sm">
        {/* Tab */}
        <div className="flex rounded-xl bg-gray-100 p-1 mb-5">
          <button
            onClick={() => { setTab('login'); setError(''); }}
            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${
              tab === 'login'
                ? 'bg-white text-orange-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            로그인
          </button>
          <button
            onClick={() => { setTab('register'); setError(''); }}
            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${
              tab === 'register'
                ? 'bg-white text-orange-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            회원가입
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
          {tab === 'login' ? (
            <>
              <div>
                <label className="block text-sm text-gray-600 mb-1.5">아이디</label>
                <input
                  type="text"
                  placeholder="아이디 입력"
                  value={loginId}
                  onChange={e => setLoginId(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                  autoComplete="username"
                  disabled={loading}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-300 text-sm disabled:opacity-60"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1.5">비밀번호</label>
                <div className="relative">
                  <input
                    type={showLoginPw ? 'text' : 'password'}
                    placeholder="비밀번호 입력"
                    value={loginPw}
                    onChange={e => setLoginPw(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleLogin()}
                    autoComplete="current-password"
                    disabled={loading}
                    className="w-full px-4 py-3 pr-10 border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-300 text-sm disabled:opacity-60"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPw(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showLoginPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              {error && (
                <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
              )}
              <button
                onClick={handleLogin}
                disabled={loading}
                className="w-full py-3.5 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white rounded-xl transition-colors flex items-center justify-center gap-2 text-sm font-medium shadow-sm"
              >
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> 로그인 중...</> : <>로그인 <ArrowRight className="w-4 h-4" /></>}
              </button>
              <p className="text-center text-xs text-gray-400">
                계정이 없으신가요?{' '}
                <button onClick={() => { setTab('register'); setError(''); }} className="text-orange-500 font-medium">
                  회원가입
                </button>
              </p>
            </>
          ) : (
            <>
              <div>
                <label className="block text-sm text-gray-600 mb-1.5">아이디 <span className="text-orange-500">*</span></label>
                <input
                  type="text"
                  placeholder="영문/숫자/밑줄 3~20자"
                  value={regId}
                  onChange={e => setRegId(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  onKeyDown={e => e.key === 'Enter' && handleRegister()}
                  autoComplete="username"
                  maxLength={20}
                  disabled={loading}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-300 text-sm disabled:opacity-60"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1.5">닉네임 <span className="text-orange-500">*</span></label>
                <input
                  type="text"
                  placeholder="ex) 홍길동"
                  value={regNickname}
                  onChange={e => setRegNickname(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleRegister()}
                  maxLength={10}
                  disabled={loading}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-300 text-sm disabled:opacity-60"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1.5">비밀번호 <span className="text-orange-500">*</span></label>
                <div className="relative">
                  <input
                    type={showRegPw ? 'text' : 'password'}
                    placeholder="4자 이상"
                    value={regPw}
                    onChange={e => setRegPw(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleRegister()}
                    autoComplete="new-password"
                    disabled={loading}
                    className="w-full px-4 py-3 pr-10 border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-300 text-sm disabled:opacity-60"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPw(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showRegPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1.5">비밀번호 확인 <span className="text-orange-500">*</span></label>
                <input
                  type="password"
                  placeholder="비밀번호 재입력"
                  value={regPw2}
                  onChange={e => setRegPw2(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleRegister()}
                  autoComplete="new-password"
                  disabled={loading}
                  className={`w-full px-4 py-3 border rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-300 text-sm disabled:opacity-60 ${
                    regPw2 && regPw !== regPw2 ? 'border-red-300' : 'border-gray-200'
                  }`}
                />
                {regPw2 && regPw !== regPw2 && (
                  <p className="text-xs text-red-400 mt-1">비밀번호가 일치하지 않습니다.</p>
                )}
              </div>
              {error && (
                <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
              )}
              <button
                onClick={handleRegister}
                disabled={loading}
                className="w-full py-3.5 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white rounded-xl transition-colors flex items-center justify-center gap-2 text-sm font-medium shadow-sm"
              >
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> 가입 중...</> : <>회원가입 <ArrowRight className="w-4 h-4" /></>}
              </button>
              <p className="text-center text-xs text-gray-400">
                이미 계정이 있으신가요?{' '}
                <button onClick={() => { setTab('login'); setError(''); }} className="text-orange-500 font-medium">
                  로그인
                </button>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}