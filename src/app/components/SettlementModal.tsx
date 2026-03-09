import React, { useState, useEffect } from 'react';
import { X, Copy, CheckCircle2, Users, Calculator, CreditCard, Pencil, ChevronDown, ChevronUp, Landmark, Download, Save, User, MessageCircle } from 'lucide-react';
import { Room, Settlement, SettlementParticipant, AccountInfo } from '../types';
import { generateId, addSettlement, updateSettlement, sendSettlementCard, getSession, getUserProfile, saveMemberAccountInfo, getSavedMemberAccountInfo } from '../store';
import { copyToClipboard } from '../utils';

const BANKS = [
  '카카오뱅크', '토스뱅크', '케이뱅크', '국민은행', '신한은행', '우리은행',
  '하나은행', '농협은행', '기업은행', '새마을금고', '우체국', '씨티은행', '기타',
];

interface SettlementModalProps {
  room: Room;
  initialPlace?: { placeName: string; placeId: string; pickedAt: string } | null;
  editSettlement?: Settlement | null;
  onClose: () => void;
  onSave: () => void;
}

export default function SettlementModal({ room, initialPlace, editSettlement, onClose, onSave }: SettlementModalProps) {
  const session = getSession();
  
  const [inputMode, setInputMode] = useState<'divide' | 'manual'>('divide');
  const [totalAmount, setTotalAmount] = useState('');
  const [memo, setMemo] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>(room.participants.map(p => p.userId));
  const [roundingRule, setRoundingRule] = useState<'floor' | 'round' | 'ceil'>('round');
  const [manualAmounts, setManualAmounts] = useState<Record<string, string>>({});
  const [result, setResult] = useState<Settlement | null>(null);
  const [editAmounts, setEditAmounts] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  // 계좌 정보
  const [accountInfo, setAccountInfo] = useState<AccountInfo>({ bankName: '', accountNumber: '', accountHolder: '' });
  const [showAccountSection, setShowAccountSection] = useState(false);
  const [showBankPicker, setShowBankPicker] = useState(false);
  
  // 다른 멤버 계좌 정보 저장
  const [savingMemberAccount, setSavingMemberAccount] = useState<Record<string, boolean>>({});

  // 초기 로드 - 내 프로필에서 계좌 정보 가져오기
  useEffect(() => {
    loadMyAccountInfo();
  }, []);

  // 수정 모드: editSettlement로 초기화
  useEffect(() => {
    if (editSettlement) {
      setResult(editSettlement);
      setMemo(editSettlement.memo ?? '');
      setSelectedIds(editSettlement.participants.map(p => p.userId));
      setAccountInfo(editSettlement.accountInfo ?? { bankName: '', accountNumber: '', accountHolder: '' });
      if (editSettlement.accountInfo?.accountNumber) setShowAccountSection(true);
      const init: Record<string, string> = {};
      editSettlement.participants.forEach(p => { init[p.userId] = fmt(p.amount); });
      setEditAmounts(init);
    }
  }, [editSettlement?.settlementId]);

  const loadMyAccountInfo = async () => {
    if (!session) return;
    try {
      const profile = await getUserProfile(session.userId);
      if (profile?.myAccountInfo) {
        setAccountInfo(profile.myAccountInfo);
        setShowAccountSection(true);
      }
    } catch (err) {
      console.error('Failed to load account info:', err);
    }
  };

  const toggleParticipant = (userId: string) => {
    setSelectedIds(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const fmt = (n: number) => n.toLocaleString('ko-KR');
  const formatInput = (value: string) => {
    const num = value.replace(/[^0-9]/g, '');
    return num ? parseInt(num).toLocaleString('ko-KR') : '';
  };

  /** 따로 입력하기 모드: 수동 금액으로 정산 저장 */
  const saveFromManual = () => {
    if (selectedIds.length === 0) return;
    const participants: SettlementParticipant[] = selectedIds.map(userId => {
      const p = room.participants.find(x => x.userId === userId)!;
      const amt = parseInt((manualAmounts[userId] ?? '0').replace(/[^0-9]/g, ''), 10) || 0;
      return { userId, nickname: p.nickname, amount: amt, paid: false };
    });
    const total = participants.reduce((s, p) => s + p.amount, 0);
    if (total === 0) {
      alert('금액을 입력해 주세요.');
      return;
    }
    const settlement: Settlement = {
      settlementId: generateId(8),
      totalAmount: total,
      participants,
      roundingRule: 'round',
      createdAt: new Date().toISOString(),
      status: 'open',
      memo,
      accountInfo: accountInfo.accountNumber ? accountInfo : undefined,
      placeName: initialPlace?.placeName,
      placeId: initialPlace?.placeId,
      pickedAt: initialPlace?.pickedAt,
    };
    addSettlement(room.roomId, settlement);
    setResult(settlement);
    setEditAmounts(Object.fromEntries(participants.map(p => [p.userId, fmt(p.amount)])));
    onSave();
  };

  const calculate = () => {
    const total = parseInt(totalAmount.replace(/[^0-9]/g, ''), 10);
    if (!total || selectedIds.length === 0) return;

    const count = selectedIds.length;
    let perPerson: number;
    if (roundingRule === 'floor') perPerson = Math.floor(total / count);
    else if (roundingRule === 'ceil') perPerson = Math.ceil(total / count);
    else perPerson = Math.round(total / count / 100) * 100;

    const remainder = total - perPerson * count;

    const participants: SettlementParticipant[] = selectedIds.map((userId, idx) => {
      const p = room.participants.find(p => p.userId === userId)!;
      return {
        userId,
        nickname: p.nickname,
        amount: idx === 0 ? perPerson + remainder : perPerson,
        paid: false,
      };
    });

    // 수동 편집 초기화
    const initEdit: Record<string, string> = {};
    participants.forEach(p => { initEdit[p.userId] = fmt(p.amount); });
    setEditAmounts(initEdit);

    const settlement: Settlement = {
      settlementId: generateId(8),
      totalAmount: total,
      participants,
      roundingRule,
      createdAt: new Date().toISOString(),
      status: 'open',
      memo,
      accountInfo: accountInfo.accountNumber ? accountInfo : undefined,
      placeName: initialPlace?.placeName,
      placeId: initialPlace?.placeId,
      pickedAt: initialPlace?.pickedAt,
    };

    addSettlement(room.roomId, settlement);
    setResult(settlement);
    onSave();
  };

  /** 수동 금액 수정 후 결과 업데이트 */
  const applyManualAmounts = () => {
    if (!result) return;
    const updated = result.participants.map(p => ({
      ...p,
      amount: parseInt((editAmounts[p.userId] ?? '0').replace(/[^0-9]/g, ''), 10) || p.amount,
    }));
    setResult({ ...result, participants: updated });
  };

  /** 수정 저장 */
  const saveEdit = async () => {
    if (!result) return;
    setSavingEdit(true);
    try {
      const updated = result.participants.map(p => ({
        ...p,
        amount: parseInt((editAmounts[p.userId] ?? '0').replace(/[^0-9]/g, ''), 10) || p.amount,
      }));
      const total = updated.reduce((s, p) => s + p.amount, 0);
      await updateSettlement(room.roomId, {
        ...result,
        participants: updated,
        totalAmount: total,
        memo,
        accountInfo: accountInfo.accountNumber ? accountInfo : undefined,
      });
      onSave();
    } finally {
      setSavingEdit(false);
    }
  };

  const manualTotal = Object.values(editAmounts)
    .reduce((sum, v) => sum + (parseInt(v.replace(/[^0-9]/g, ''), 10) || 0), 0);

  const copyText = async () => {
    if (!result) return;
    const ai = result.accountInfo;
    const lines = [
      `🍱 ${room.name} 점심 정산`,
      memo ? `📝 ${memo}` : '',
      `💰 총액: ${fmt(result.totalAmount)}원`,
      `👥 참여 ${result.participants.length}명`,
      '',
      ...result.participants.map(p => `• ${p.nickname}: ${fmt(p.amount)}원`),
      '',
      ai?.accountNumber
        ? `💳 정산 계좌: ${ai.bankName} ${ai.accountNumber}${ai.accountHolder ? ` (${ai.accountHolder})` : ''}`
        : '',
      `🕐 ${new Date(result.createdAt).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
    ].filter(Boolean).join('\n');

    const ok = await copyToClipboard(lines);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  /** 채팅창으로 정산 공유 */
  const shareToChat = async () => {
    if (!result) return;
    setSharing(true);
    try {
      const totalAmt = result.participants.reduce((s, p) => s + p.amount, 0);
      const count = result.participants.length;
      const ok = await sendSettlementCard(room.roomId, {
        totalAmount: totalAmt,
        perPerson: Math.round(totalAmt / count),
        headcount: count,
        memo: result.memo,
        bankName: result.accountInfo?.bankName,
        accountNumber: result.accountInfo?.accountNumber,
        accountHolder: result.accountInfo?.accountHolder,
      });
      if (ok) {
        onSave();
      } else {
        alert('채팅 공유에 실패했습니다. 닉네임이 설정되어 있는지 확인해 주세요.');
      }
    } catch (err) {
      console.error('shareToChat error:', err);
      alert('채팅 공유 중 오류가 발생했습니다.');
    } finally {
      setSharing(false);
    }
  };

  const updateAccountField = (field: keyof AccountInfo, value: string) => {
    setAccountInfo(prev => ({ ...prev, [field]: value }));
  };

  /** 다른 멤버의 계좌 정보 불러오기 */
  const loadMemberAccountInfo = async (memberUserId: string) => {
    if (!session || session.userId === memberUserId) return;
    
    try {
      const savedAccount = await getSavedMemberAccountInfo(session.userId, memberUserId);
      if (savedAccount) {
        setAccountInfo(savedAccount);
        setShowAccountSection(true);
        alert('저장된 계좌 정보를 불러왔습니다.');
      } else {
        alert('저장된 계좌 정보가 없습니다.');
      }
    } catch (err) {
      console.error('Failed to load member account:', err);
      alert('계좌 정보 불러오기 중 오류가 발생했습니다.');
    }
  };

  /** 다른 멤버의 계좌 정보 저장하기 */
  const saveMemberAccount = async (memberUserId: string) => {
    if (!session || session.userId === memberUserId) return;
    if (!accountInfo.accountNumber) {
      alert('계좌번호를 입력해 주세요.');
      return;
    }

    setSavingMemberAccount(prev => ({ ...prev, [memberUserId]: true }));
    try {
      await saveMemberAccountInfo(session.userId, memberUserId, accountInfo);
      alert('멤버 계좌 정보가 저장되었습니다.');
    } catch (err) {
      console.error('Failed to save member account:', err);
      alert('저장 중 오류가 발생했습니다.');
    } finally {
      setSavingMemberAccount(prev => ({ ...prev, [memberUserId]: false }));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900">
              <Calculator className="w-5 h-5 text-orange-500" />
              정산 계산기
            </h2>
            {initialPlace?.placeName && (
              <p className="text-xs text-gray-500 mt-1">🍽️ {initialPlace.placeName}</p>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {!result ? (
            <div className="p-4 space-y-5">
              {/* 입력 모드 선택 */}
              <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
                <button
                  onClick={() => setInputMode('divide')}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    inputMode === 'divide' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  나눠 계산하기
                </button>
                <button
                  onClick={() => setInputMode('manual')}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    inputMode === 'manual' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  따로 입력하기
                </button>
              </div>

              {/* Total Amount — 나눠 계산하기 모드 */}
              {inputMode === 'divide' && (
              <div>
                <label className="block text-sm text-gray-600 mb-1.5">총 금액</label>
                <div className="relative">
                  <input
                    type="text" inputMode="numeric" placeholder="금액 입력"
                    value={formatInput(totalAmount)}
                    onChange={e => setTotalAmount(e.target.value.replace(/[^0-9]/g, ''))}
                    className="w-full pl-4 pr-12 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-300 text-sm"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">원</span>
                </div>
              </div>
              )}

              {/* Memo */}
              <div>
                <label className="block text-sm text-gray-600 mb-1.5">메모 <span className="text-gray-400">(선택)</span></label>
                <input
                  type="text" placeholder="ex) 삼계탕집 점심"
                  value={memo} onChange={e => setMemo(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-300 text-sm"
                />
              </div>

              {/* Participants */}
              <div>
                <label className="block text-sm text-gray-600 mb-2">
                  <Users className="w-4 h-4 inline mr-1" />
                  정산 대상 ({selectedIds.length}명)
                </label>
                <div className="space-y-2">
                  {room.participants.map(p => (
                    <label key={p.userId} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(p.userId)}
                        onChange={() => toggleParticipant(p.userId)}
                        className="w-4 h-4 accent-orange-500"
                      />
                      <span className="text-sm text-gray-700 flex-1">{p.nickname}</span>
                      {p.isHost && <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">방장</span>}
                    </label>
                  ))}
                </div>
              </div>

              {/* Rounding Rule — 나눠 계산하기 모드 */}
              {inputMode === 'divide' && (
              <div>
                <label className="block text-sm text-gray-600 mb-2">반올림 방식</label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { value: 'round', label: '100원 단위' },
                    { value: 'floor', label: '내림' },
                    { value: 'ceil', label: '올림' },
                  ] as const).map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setRoundingRule(opt.value)}
                      className={`py-2 text-sm rounded-xl border transition-colors ${
                        roundingRule === opt.value
                          ? 'border-orange-400 bg-orange-50 text-orange-600'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                {roundingRule === 'round' && (
                  <p className="text-xs text-gray-400 mt-1.5">남는 금액은 첫 번째 참여자가 부담합니다</p>
                )}
              </div>
              )}

              {/* 따로 입력하기: 인원별 금액 입력 */}
              {inputMode === 'manual' && (
                <div>
                  <label className="block text-sm text-gray-600 mb-2">인원별 금액 입력</label>
                  <div className="space-y-2">
                    {room.participants.filter(p => selectedIds.includes(p.userId)).map(p => (
                      <div key={p.userId} className="flex items-center gap-3 p-3 bg-white border border-gray-100 rounded-xl">
                        <div className="w-7 h-7 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-xs shrink-0">
                          {p.nickname.slice(0, 1)}
                        </div>
                        <span className="text-sm text-gray-700 flex-1">{p.nickname}</span>
                        <div className="relative w-28">
                          <input
                            type="text"
                            inputMode="numeric"
                            placeholder="금액"
                            value={manualAmounts[p.userId] ?? ''}
                            onChange={e => {
                              const raw = e.target.value.replace(/[^0-9]/g, '');
                              setManualAmounts(prev => ({
                                ...prev,
                                [p.userId]: raw ? parseInt(raw).toLocaleString('ko-KR') : '',
                              }));
                            }}
                            className="w-full text-right pl-2 pr-8 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">원</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 mt-1.5">
                    합계: {fmt(selectedIds.reduce((s, id) => s + (parseInt((manualAmounts[id] ?? '0').replace(/[^0-9]/g, ''), 10) || 0), 0))}원
                  </p>
                </div>
              )}

              {/* 계좌 정보 (접기/펼치기) */}
              <div className="border border-gray-100 rounded-xl overflow-hidden">
                <button
                  onClick={() => setShowAccountSection(v => !v)}
                  className="w-full flex items-center justify-between p-3.5 hover:bg-gray-50 transition-colors"
                >
                  <span className="text-sm text-gray-700 flex items-center gap-2">
                    <Landmark className="w-4 h-4 text-orange-400" />
                    정산 계좌 정보 <span className="text-xs text-gray-400">(선택 · 복사 문구에 포함)</span>
                  </span>
                  {showAccountSection
                    ? <ChevronUp className="w-4 h-4 text-gray-400" />
                    : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </button>

                {showAccountSection && (
                  <div className="px-4 pb-4 space-y-3 border-t border-gray-100">
                    {/* 다른 멤버 계좌 불러오기 */}
                    {session && room.participants.length > 1 && (
                      <div className="mt-3 bg-blue-50 border border-blue-100 rounded-xl p-3">
                        <p className="text-xs text-blue-700 mb-2 flex items-center gap-1">
                          <Download className="w-3.5 h-3.5" />
                          저장된 멤버 계좌 불러오기
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {room.participants
                            .filter(p => p.userId !== session.userId)
                            .map(p => (
                              <button
                                key={p.userId}
                                onClick={() => loadMemberAccountInfo(p.userId)}
                                className="px-2.5 py-1 bg-white border border-blue-200 hover:bg-blue-100 rounded-lg text-xs text-blue-700 transition-colors"
                              >
                                {p.nickname}
                              </button>
                            ))}
                        </div>
                      </div>
                    )}

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
                                onClick={() => { updateAccountField('bankName', b); setShowBankPicker(false); }}
                                className={`w-full px-3 py-2 text-sm text-left hover:bg-orange-50 ${accountInfo.bankName === b ? 'text-orange-600 font-medium' : 'text-gray-700'}`}
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
                        type="text" inputMode="numeric"
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

                    {/* 다른 멤버 계좌로 저장하기 */}
                    {session && room.participants.length > 1 && accountInfo.accountNumber && (
                      <div className="bg-green-50 border border-green-100 rounded-xl p-3">
                        <p className="text-xs text-green-700 mb-2 flex items-center gap-1">
                          <Save className="w-3.5 h-3.5" />
                          이 계좌를 멤버 계좌로 저장하기
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {room.participants
                            .filter(p => p.userId !== session.userId)
                            .map(p => (
                              <button
                                key={p.userId}
                                onClick={() => saveMemberAccount(p.userId)}
                                disabled={savingMemberAccount[p.userId]}
                                className="px-2.5 py-1 bg-white border border-green-200 hover:bg-green-100 disabled:bg-gray-100 rounded-lg text-xs text-green-700 transition-colors"
                              >
                                {savingMemberAccount[p.userId] ? '...' : p.nickname}
                              </button>
                            ))}
                        </div>
                        <p className="text-xs text-green-600 mt-2">나중에 이 멤버가 포함된 정산 시 불러올 수 있습니다</p>
                      </div>
                    )}

                    <p className="text-xs text-gray-400">내 정산 정보는 프로필에서 수정할 수 있습니다</p>
                  </div>
                )}
              </div>

              {inputMode === 'divide' ? (
                <button
                  onClick={calculate}
                  disabled={!totalAmount || selectedIds.length === 0}
                  className="w-full py-3.5 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-xl transition-colors text-sm font-medium"
                >
                  계산하기
                </button>
              ) : (
                <button
                  onClick={saveFromManual}
                  disabled={selectedIds.length === 0 || selectedIds.every(id => !(parseInt((manualAmounts[id] ?? '0').replace(/[^0-9]/g, ''), 10) || 0))}
                  className="w-full py-3.5 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-xl transition-colors text-sm font-medium"
                >
                  저장하기
                </button>
              )}
            </div>

          ) : (
            <div className="p-4 space-y-4">
              {/* 요약 */}
              <div className="bg-orange-50 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">총액</span>
                  <span className="text-orange-600 font-medium">{fmt(manualTotal || result.participants.reduce((s, p) => s + p.amount, 0))}원</span>
                </div>
                {editSettlement ? (
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">메모</label>
                    <input
                      type="text"
                      value={memo}
                      onChange={e => setMemo(e.target.value)}
                      placeholder="ex) 삼계탕집 점심"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                    />
                  </div>
                ) : memo ? (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">메모</span>
                    <span className="text-sm text-gray-700">{memo}</span>
                  </div>
                ) : null}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">참여 인원</span>
                  <span className="text-sm text-gray-700">{result.participants.length}명</span>
                </div>
              </div>

              {/* 인원별 금액 — 수동 수정 가능 */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-gray-600 flex items-center gap-1">
                    <Pencil className="w-3.5 h-3.5 text-gray-400" />
                    인원별 금액 (직접 수정 가능)
                  </p>
                  <span className={`text-xs font-medium ${manualTotal === result.totalAmount ? 'text-emerald-600' : 'text-red-500'}`}>
                    합계: {fmt(manualTotal)}원
                    {manualTotal !== result.totalAmount && ` (차이: ${fmt(Math.abs(manualTotal - result.totalAmount))}원)`}
                  </span>
                </div>
                <div className="space-y-2">
                  {result.participants.map((p) => (
                    <div key={p.userId} className="flex items-center gap-3 p-3 bg-white border border-gray-100 rounded-xl">
                      <div className="w-7 h-7 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-xs shrink-0">
                        {p.nickname.slice(0, 1)}
                      </div>
                      <span className="text-sm text-gray-700 flex-1">{p.nickname}</span>
                      <div className="relative">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={editAmounts[p.userId] ?? fmt(p.amount)}
                          onChange={e => {
                            const raw = e.target.value.replace(/[^0-9]/g, '');
                            setEditAmounts(prev => ({
                              ...prev,
                              [p.userId]: raw ? parseInt(raw).toLocaleString('ko-KR') : '0',
                            }));
                          }}
                          onBlur={applyManualAmounts}
                          className="w-28 text-right pl-2 pr-8 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">원</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 계좌 정보 — 수정 모드에서는 편집 가능 */}
              {editSettlement ? (
                <div className="border border-gray-100 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setShowAccountSection(v => !v)}
                    className="w-full flex items-center justify-between p-3.5 hover:bg-gray-50"
                  >
                    <span className="text-sm text-gray-700 flex items-center gap-2">
                      <Landmark className="w-4 h-4 text-orange-400" />
                      정산 계좌 정보 수정
                    </span>
                    {showAccountSection ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  {showAccountSection && (
                    <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-3">
                      <input
                        placeholder="은행명"
                        value={accountInfo.bankName}
                        onChange={e => updateAccountField('bankName', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                      />
                      <input
                        placeholder="계좌번호"
                        value={accountInfo.accountNumber}
                        onChange={e => updateAccountField('accountNumber', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                      />
                      <input
                        placeholder="예금주"
                        value={accountInfo.accountHolder}
                        onChange={e => updateAccountField('accountHolder', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                      />
                    </div>
                  )}
                </div>
              ) : result.accountInfo?.accountNumber ? (
                <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 flex items-center gap-2">
                  <Landmark className="w-4 h-4 text-gray-400 shrink-0" />
                  <div className="text-sm text-gray-700">
                    <span className="font-medium">{result.accountInfo.bankName}</span>{' '}
                    {result.accountInfo.accountNumber}
                    {result.accountInfo.accountHolder && (
                      <span className="text-gray-400"> ({result.accountInfo.accountHolder})</span>
                    )}
                  </div>
                </div>
              ) : null}

              {/* 버튼 */}
              <div className="flex flex-col gap-2">
                {editSettlement ? (
                  <div className="flex gap-2">
                    <button
                      onClick={onClose}
                      className="flex-1 py-3 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition-colors text-sm"
                    >
                      취소
                    </button>
                    <button
                      onClick={saveEdit}
                      disabled={savingEdit}
                      className="flex-1 py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white rounded-xl transition-colors text-sm font-medium"
                    >
                      {savingEdit ? '저장 중...' : '수정 저장'}
                    </button>
                  </div>
                ) : (
                <>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setResult(null); setEditAmounts({}); }}
                      className="flex-1 py-3 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition-colors text-sm"
                    >
                      다시 계산
                    </button>
                    <button
                      onClick={copyText}
                      className="flex-1 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
                    >
                      {copied ? (
                        <><CheckCircle2 className="w-4 h-4" /> 복사됨!</>
                      ) : (
                        <><Copy className="w-4 h-4" /> 문구 복사</>
                      )}
                    </button>
                  </div>
                  <button
                    onClick={shareToChat}
                    disabled={sharing}
                    className="w-full py-3 bg-purple-500 hover:bg-purple-600 disabled:bg-purple-300 text-white rounded-xl transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                  >
                    <MessageCircle className="w-4 h-4" />
                    {sharing ? '공유 중...' : '채팅창으로 공유하기'}
                  </button>
                </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
