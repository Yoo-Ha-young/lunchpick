import React, { useState, useEffect, useRef } from 'react';
import { X, User, Landmark, ChevronDown, Save, Pencil, MapPin, Home, Briefcase, Plus, Search, Loader2 } from 'lucide-react';
import { getSession, getUserProfile, updateUserProfile } from '../store';
import type { AccountInfo, UserProfile } from '../types';
import { searchAddress, AddressResult } from '../kakaoApi';

const BANKS = [
  '카카오뱅크', '토스뱅크', '케이뱅크', '국민은행', '신한은행', '우리은행',
  '하나은행', '농협은행', '기업은행', '새마을금고', '우체국', '씨티은행', '기타',
];

interface ProfileModalProps {
  onClose: () => void;
  onNicknameChange?: (newNickname: string) => void;
}

export default function ProfileModal({ onClose, onNicknameChange }: ProfileModalProps) {
  const session = getSession();
  
  const [nickname, setNickname] = useState(session?.nickname || '');
  const [accountInfo, setAccountInfo] = useState<AccountInfo>({
    bankName: '',
    accountNumber: '',
    accountHolder: '',
  });
  
  const [savedAddresses, setSavedAddresses] = useState<UserProfile['savedAddresses']>({});
  
  const [showBankPicker, setShowBankPicker] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // 주소록 검색
  const [addressSearchType, setAddressSearchType] = useState<'work' | 'home' | 'other' | null>(null);
  const [addressSearchInput, setAddressSearchInput] = useState('');
  const [addressSearchResults, setAddressSearchResults] = useState<AddressResult[]>([]);
  const [addressSearching, setAddressSearching] = useState(false);
  const addressDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    if (!session) return;
    
    setLoading(true);
    try {
      const profile = await getUserProfile(session.userId);
      if (profile) {
        setNickname(profile.nickname || session.nickname);
        if (profile.myAccountInfo) {
          setAccountInfo(profile.myAccountInfo);
        }
        if (profile.savedAddresses) {
          setSavedAddresses(profile.savedAddresses);
        }
      }
    } catch (err) {
      console.error('Failed to load profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!session) return;
    if (!nickname.trim()) {
      alert('닉네임을 입력해 주세요.');
      return;
    }

    setSaving(true);
    try {
      const updates: Partial<UserProfile> = {
        nickname: nickname.trim(),
      };

      // 계좌 정보가 하나라도 입력되어 있으면 저장
      if (accountInfo.bankName || accountInfo.accountNumber || accountInfo.accountHolder) {
        updates.myAccountInfo = accountInfo;
      }

      // 주소록 저장
      updates.savedAddresses = savedAddresses;
      
      console.log('💾 프로필 저장:', { userId: session.userId, updates });

      await updateUserProfile(session.userId, updates);
      
      // 저장 확인
      const saved = await getUserProfile(session.userId);
      console.log('✅ 저장된 프로필:', saved);
      
      // 세션 닉네임도 업데이트
      const updatedSession = { ...session, nickname: nickname.trim() };
      sessionStorage.setItem('lunchpick_session', JSON.stringify(updatedSession));
      sessionStorage.setItem('lunchpick_user', JSON.stringify({ 
        userId: session.userId, 
        nickname: nickname.trim() 
      }));

      if (onNicknameChange) {
        onNicknameChange(nickname.trim());
      }

      alert('프로필이 저장되었습니다.');
      onClose();
    } catch (err) {
      console.error('Failed to save profile:', err);
      
      // Firebase 권한 오류 체크
      if (err instanceof Error && err.message.includes('Permission denied')) {
        alert(
          '⚠️ Firebase 권한 오류\n\n' +
          '해결 방법:\n' +
          '1. https://console.firebase.google.com/ 접속\n' +
          '2. 프로젝트: lunchpick-b993f 선택\n' +
          '3. Realtime Database > 규칙 탭\n' +
          '4. 다음 규칙으로 변경:\n\n' +
          '{\n' +
          '  "rules": {\n' +
          '    ".read": true,\n' +
          '    ".write": true\n' +
          '  }\n' +
          '}\n\n' +
          '5. "게시" 버튼 클릭\n\n' +
          '자세한 내용은 콘솔을 확인하세요.'
        );
      } else {
        alert('프로필 저장 중 오류가 발생했습니다.');
      }
    } finally {
      setSaving(false);
    }
  };

  const updateAccountField = (field: keyof AccountInfo, value: string) => {
    setAccountInfo(prev => ({ ...prev, [field]: value }));
  };

  // 주소 검색
  const handleAddressSearch = (value: string) => {
    setAddressSearchInput(value);
    if (addressDebounceRef.current) clearTimeout(addressDebounceRef.current);
    if (value.trim().length < 2) {
      setAddressSearchResults([]);
      return;
    }
    addressDebounceRef.current = setTimeout(async () => {
      setAddressSearching(true);
      try {
        const results = await searchAddress(value);
        setAddressSearchResults(results);
      } catch (e) {
        console.log('주소 검색 오류:', e);
        setAddressSearchResults([]);
      } finally {
        setAddressSearching(false);
      }
    }, 350);
  };

  const selectSearchedAddress = (type: 'work' | 'home' | 'other', result: AddressResult) => {
    console.log('📍 주소 선택:', { type, result });
    setSavedAddresses(prev => {
      const updated = {
        ...prev,
        [type]: {
          label: result.label,
          address: result.address,
          lat: result.lat,
          lng: result.lng,
        }
      };
      console.log('📍 업데이트된 주소록:', updated);
      return updated;
    });
    setAddressSearchType(null);
    setAddressSearchInput('');
    setAddressSearchResults([]);
  };

  const removeAddress = (type: 'work' | 'home' | 'other') => {
    setSavedAddresses(prev => {
      const updated = { ...prev };
      delete updated[type];
      return updated;
    });
  };

  if (!session) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[92vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 shrink-0">
          <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900">
            <User className="w-5 h-5 text-orange-500" />
            내 프로필
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-sm text-gray-400">로딩 중...</div>
            </div>
          ) : (
            <>
              {/* 닉네임 */}
              <div>
                <label className="block text-sm text-gray-600 mb-1.5 flex items-center gap-1">
                  <Pencil className="w-3.5 h-3.5" />
                  닉네임
                </label>
                <input
                  type="text"
                  placeholder="닉네임을 입력하세요"
                  value={nickname}
                  onChange={e => setNickname(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-300 text-sm"
                />
              </div>

              {/* 내 정산 계좌 정보 */}
              <div className="border border-gray-200 rounded-xl p-4 space-y-3">
                <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Landmark className="w-4 h-4 text-orange-400" />
                  내 정산 계좌 정보
                </h3>
                <p className="text-xs text-gray-400">
                  정산할 때 자동으로 불러옵니다
                </p>

                {/* 은행 선택 */}
                <div>
                  <label className="block text-xs text-gray-500 mb-1">은행</label>
                  <div className="relative">
                    <button
                      onClick={() => setShowBankPicker(v => !v)}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm text-left flex items-center justify-between"
                    >
                      <span className={accountInfo.bankName ? 'text-gray-800' : 'text-gray-400'}>
                        {accountInfo.bankName || '은행 선택'}
                      </span>
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    </button>
                    {showBankPicker && (
                      <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-10 max-h-44 overflow-y-auto">
                        {BANKS.map(b => (
                          <button
                            key={b}
                            onClick={() => {
                              updateAccountField('bankName', b);
                              setShowBankPicker(false);
                            }}
                            className={`w-full px-3 py-2 text-sm text-left hover:bg-orange-50 ${
                              accountInfo.bankName === b ? 'text-orange-600 font-medium' : 'text-gray-700'
                            }`}
                          >
                            {b}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* 계좌번호 */}
                <div>
                  <label className="block text-xs text-gray-500 mb-1">계좌번호</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="01012345678 또는 123-456-789"
                    value={accountInfo.accountNumber}
                    onChange={e => updateAccountField('accountNumber', e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-300 text-sm"
                  />
                </div>

                {/* 예금주 */}
                <div>
                  <label className="block text-xs text-gray-500 mb-1">예금주</label>
                  <input
                    type="text"
                    placeholder="홍길동"
                    value={accountInfo.accountHolder}
                    onChange={e => updateAccountField('accountHolder', e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-300 text-sm"
                  />
                </div>
              </div>

              {/* 주소록 */}
              <div className="border border-gray-200 rounded-xl p-4 space-y-3">
                <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-orange-400" />
                  내 주소록
                </h3>
                <p className="text-xs text-gray-400">
                  자주 사용하는 주소를 저장하고 룰렛 설정에서 빠르게 불��올 수 있습니다
                </p>

                {/* 회사 주소 */}
                <div>
                  <label className="block text-xs text-gray-500 mb-1 flex items-center gap-1">
                    <Briefcase className="w-3 h-3" />
                    회사 주소
                  </label>
                  {savedAddresses?.work ? (
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-800 truncate">{savedAddresses.work.label}</div>
                        <div className="text-xs text-gray-500 mt-0.5 truncate">{savedAddresses.work.address}</div>
                      </div>
                      <button
                        onClick={() => removeAddress('work')}
                        className="ml-2 p-1 text-red-500 hover:bg-red-50 rounded"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setAddressSearchType('work')}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm text-gray-400 flex items-center justify-center gap-2 hover:bg-gray-100"
                    >
                      <Plus className="w-4 h-4" />
                      주소 추가
                    </button>
                  )}
                </div>

                {/* 집 주소 */}
                <div>
                  <label className="block text-xs text-gray-500 mb-1 flex items-center gap-1">
                    <Home className="w-3 h-3" />
                    내집 주소
                  </label>
                  {savedAddresses?.home ? (
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-800 truncate">{savedAddresses.home.label}</div>
                        <div className="text-xs text-gray-500 mt-0.5 truncate">{savedAddresses.home.address}</div>
                      </div>
                      <button
                        onClick={() => removeAddress('home')}
                        className="ml-2 p-1 text-red-500 hover:bg-red-50 rounded"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setAddressSearchType('home')}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm text-gray-400 flex items-center justify-center gap-2 hover:bg-gray-100"
                    >
                      <Plus className="w-4 h-4" />
                      주소 추가
                    </button>
                  )}
                </div>

                {/* 기타 주소 */}
                <div>
                  <label className="block text-xs text-gray-500 mb-1 flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    기타 주소
                  </label>
                  {savedAddresses?.other ? (
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-800 truncate">{savedAddresses.other.label}</div>
                        <div className="text-xs text-gray-500 mt-0.5 truncate">{savedAddresses.other.address}</div>
                      </div>
                      <button
                        onClick={() => removeAddress('other')}
                        className="ml-2 p-1 text-red-500 hover:bg-red-50 rounded"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setAddressSearchType('other')}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm text-gray-400 flex items-center justify-center gap-2 hover:bg-gray-100"
                    >
                      <Plus className="w-4 h-4" />
                      주소 추가
                    </button>
                  )}
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700">
                💡 프로필 정보는 내 기기와 서버에 안전하게 저장됩니다
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 shrink-0">
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="w-full py-3.5 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white rounded-xl transition-colors text-sm font-medium flex items-center justify-center gap-2"
          >
            {saving ? (
              <>저장 중...</>
            ) : (
              <>
                <Save className="w-4 h-4" />
                저장하기
              </>
            )}
          </button>
        </div>
      </div>

      {/* 주소 검색 모달 */}
      {addressSearchType && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl mx-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-100 shrink-0">
              <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <Search className="w-5 h-5 text-orange-500" />
                {addressSearchType === 'work' ? '회사' : addressSearchType === 'home' ? '내집' : '기타'} 주소 검색
              </h3>
              <button
                onClick={() => {
                  setAddressSearchType(null);
                  setAddressSearchInput('');
                  setAddressSearchResults([]);
                }}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-4 space-y-3 flex-1 overflow-y-auto">
              <div className="relative">
                <input
                  type="text"
                  placeholder="주소를 입력하세요 (예: 강남역, 테헤란로 123)"
                  value={addressSearchInput}
                  onChange={(e) => handleAddressSearch(e.target.value)}
                  className="w-full px-4 py-3 pr-10 border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-300 text-sm"
                  autoFocus
                />
                {addressSearching && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 animate-spin" />
                )}
              </div>

              {addressSearchResults.length > 0 ? (
                <div className="space-y-2">
                  {addressSearchResults.map((result, idx) => (
                    <button
                      key={idx}
                      onClick={() => selectSearchedAddress(addressSearchType, result)}
                      className="w-full p-3 bg-gray-50 hover:bg-orange-50 border border-gray-200 hover:border-orange-300 rounded-xl text-left transition-colors"
                    >
                      <div className="text-sm font-medium text-gray-800 truncate">{result.label}</div>
                      <div className="text-xs text-gray-500 mt-0.5 truncate">{result.address}</div>
                    </button>
                  ))}
                </div>
              ) : addressSearchInput.trim().length >= 2 && !addressSearching ? (
                <div className="text-center py-8 text-sm text-gray-400">
                  검색 결과가 없습니다
                </div>
              ) : (
                <div className="text-center py-8 text-sm text-gray-400">
                  주소를 검색해보세요
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}