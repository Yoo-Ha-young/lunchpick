import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Send, MessageCircle, Hash, Utensils, CreditCard, BarChart3,
  ExternalLink, Copy, Check, ChevronRight, X, Plus, Trash2,
  MapPin, Star, DollarSign, Vote, ChevronDown, Pencil, Users, Clock
} from 'lucide-react';
import { ChatMessage, Room, Settlement, CATEGORY_EMOJI, Category, Place } from '../types';
import {
  getChatMessages, sendChatMessage, sendLunchCard,
  sendSettlementCard, sendVoteCard, castVote, getRoom, getOrCreateUser
} from '../store';
import { copyToClipboard } from '../utils';

interface ChatPanelProps {
  roomId: string;
  currentUserId: string;
}

/* ─── 해시태그 단축 명령 ──────────────────────────────── */
const HASH_COMMANDS = [
  { tag: '#룰렛', icon: Utensils, label: '룰렛 결과', desc: '룰렛 결과 공유', color: 'text-orange-500 bg-orange-50 border-orange-200' },
  { tag: '#정산', icon: CreditCard, label: '정산 공유', desc: '1/n 계산 공유', color: 'text-purple-500 bg-purple-50 border-purple-200' },
  { tag: '#투표', icon: BarChart3, label: '투표 만들기', desc: '팀원 투표 생성', color: 'text-blue-500 bg-blue-50 border-blue-200' },
];

/* ─── 시간 표시 ──────────────────────────────────────── */
function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
}

/* ─── 투표 카드 ──────────────────────────────────────── */
function VoteCardBubble({
  msg, currentUserId, onVote,
}: {
  msg: ChatMessage; currentUserId: string; onVote: (msgId: string, idx: number) => void;
}) {
  const vc = msg.voteCard!;
  const myVote = vc.votes[currentUserId] ?? -1;
  const totalVotes = Object.keys(vc.votes).length;

  const voteCounts = vc.options.map((_, i) =>
    Object.values(vc.votes).filter(v => v === i).length
  );
  const maxCount = Math.max(...voteCounts, 1);

  return (
    <div className="w-full max-w-[280px] bg-white border border-blue-100 rounded-2xl overflow-hidden shadow-sm">
      {/* 헤더 */}
      <div className="flex items-center gap-2 px-3.5 py-2.5 bg-blue-50 border-b border-blue-100">
        <BarChart3 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
        <span className="text-xs font-semibold text-blue-700 flex-1 truncate">{vc.question}</span>
        <span className="text-[10px] text-blue-400 shrink-0">{totalVotes}명 참여</span>
      </div>
      {/* 옵션 */}
      <div className="px-3 py-2.5 space-y-2">
        {vc.options.map((opt, i) => {
          const count = voteCounts[i];
          const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
          const isMyVote = myVote === i;
          return (
            <button
              key={i}
              onClick={() => onVote(msg.messageId, i)}
              className={`w-full text-left relative overflow-hidden rounded-xl border transition-all ${
                isMyVote
                  ? 'border-blue-400 bg-blue-50'
                  : 'border-gray-100 bg-gray-50 hover:border-blue-200 hover:bg-blue-50/50'
              }`}
            >
              {/* 진행 바 */}
              {totalVotes > 0 && (
                <div
                  className="absolute inset-y-0 left-0 bg-blue-100/60 transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              )}
              <div className="relative flex items-center justify-between px-3 py-2">
                <span className={`text-xs font-medium ${isMyVote ? 'text-blue-700' : 'text-gray-700'}`}>
                  {isMyVote && <Check className="w-3 h-3 inline mr-1 text-blue-500" />}
                  {opt}
                </span>
                <span className={`text-[10px] shrink-0 ml-2 ${isMyVote ? 'text-blue-500 font-semibold' : 'text-gray-400'}`}>
                  {totalVotes > 0 ? `${pct}%` : '0%'} ({count})
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─── 점심 카드 ──────────────────────────────────────── */
function LunchCardBubble({ msg }: { msg: ChatMessage }) {
  const lc = msg.lunchCard!;
  const [copied, setCopied] = useState(false);
  const emoji = (CATEGORY_EMOJI as Record<string, string>)[lc.category] ?? '🍽️';
  const handleCopy = async () => {
    const ok = await copyToClipboard(
      `🍱 오늘의 점심: ${lc.placeName}\n📍 ${lc.address ?? ''}\n🗺️ ${lc.mapUrl}`
    );
    if (ok) { setCopied(true); setTimeout(() => setCopied(false), 2000); }
  };
  return (
    <div className="w-full max-w-[270px] bg-gradient-to-br from-orange-500 to-amber-500 rounded-2xl overflow-hidden shadow-md">
      <div className="px-4 pt-3 pb-2">
        <div className="text-[10px] text-orange-100 mb-1 font-medium tracking-wide uppercase">오늘의 점심 🎉</div>
        <div className="text-2xl mb-0.5">{emoji}</div>
        <div className="text-base font-bold text-white leading-tight">{lc.placeName}</div>
        {lc.address && (
          <div className="flex items-start gap-1 mt-1">
            <MapPin className="w-3 h-3 text-orange-200 shrink-0 mt-0.5" />
            <span className="text-[11px] text-orange-100 leading-relaxed">{lc.address}</span>
          </div>
        )}
        <div className="flex items-center gap-3 mt-1.5">
          {lc.rating && (
            <span className="flex items-center gap-0.5 text-[11px] text-orange-100">
              <Star className="w-3 h-3 fill-orange-200 text-orange-200" /> {lc.rating}
            </span>
          )}
          {lc.priceRange && (
            <span className="text-[11px] text-orange-100">💰 {lc.priceRange}</span>
          )}
        </div>
      </div>
      <div className="flex border-t border-orange-400/40">
        <a
          href={lc.mapUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-1 py-2.5 text-[11px] text-orange-100 hover:bg-white/10 transition-colors"
        >
          <ExternalLink className="w-3 h-3" /> 지도 보기
        </a>
        <div className="w-px bg-orange-400/40" />
        <button
          onClick={handleCopy}
          className="flex-1 flex items-center justify-center gap-1 py-2.5 text-[11px] text-orange-100 hover:bg-white/10 transition-colors"
        >
          {copied ? <><Check className="w-3 h-3" /> 복사됨</> : <><Copy className="w-3 h-3" /> 공유하기</>}
        </button>
      </div>
    </div>
  );
}

/* ─── 정산 카드 ──────────────────────────────────────── */
function SettlementCardBubble({ msg }: { msg: ChatMessage }) {
  const sc = msg.settlementCard!;
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    const lines = [
      `💳 정산 안내${sc.memo ? ` — ${sc.memo}` : ''}`,
      `총액: ${sc.totalAmount.toLocaleString()}원 / ${sc.headcount}명`,
      `1인: ${sc.perPerson.toLocaleString()}원`,
      sc.bankName ? `\n📬 입금 계좌` : '',
      sc.bankName ? `${sc.bankName} ${sc.accountNumber} (${sc.accountHolder})` : '',
    ].filter(Boolean).join('\n');
    const ok = await copyToClipboard(lines);
    if (ok) { setCopied(true); setTimeout(() => setCopied(false), 2000); }
  };
  return (
    <div className="w-full max-w-[260px] bg-white border border-purple-100 rounded-2xl overflow-hidden shadow-sm">
      {/* 헤더 */}
      <div className="flex items-center gap-2 px-3.5 py-2.5 bg-purple-50 border-b border-purple-100">
        <CreditCard className="w-3.5 h-3.5 text-purple-500 shrink-0" />
        <span className="text-xs font-semibold text-purple-700">정산 공유</span>
        {sc.memo && <span className="text-[10px] text-purple-400 truncate">— {sc.memo}</span>}
      </div>
      {/* 금액 */}
      <div className="px-3.5 py-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">총액</span>
          <span className="text-sm font-bold text-gray-800">{sc.totalAmount.toLocaleString()}원</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">{sc.headcount}명 / 1인</span>
          <span className="text-base font-extrabold text-purple-600">{sc.perPerson.toLocaleString()}원</span>
        </div>
        {sc.bankName && (
          <div className="mt-2 p-2.5 bg-gray-50 rounded-xl">
            <div className="text-[10px] text-gray-400 mb-1">입금 계좌</div>
            <div className="text-xs font-semibold text-gray-800">{sc.bankName}</div>
            <div className="text-xs text-gray-600">{sc.accountNumber}</div>
            <div className="text-[10px] text-gray-400">{sc.accountHolder}</div>
          </div>
        )}
      </div>
      <div className="border-t border-gray-100 px-3 pb-3 pt-2">
        <button
          onClick={handleCopy}
          className="w-full flex items-center justify-center gap-1.5 py-2 bg-purple-500 hover:bg-purple-600 text-white text-xs rounded-xl transition-colors font-medium"
        >
          {copied ? <><Check className="w-3 h-3" /> 복사됨!</> : <><Copy className="w-3 h-3" /> 클립보드 복사</>}
        </button>
      </div>
    </div>
  );
}

/* ─── 투표 생성 모달 ─────────────────────────────────── */
function VoteCreateModal({
  room, onClose, onSubmit,
}: { room: Room | null; onClose: () => void; onSubmit: (q: string, opts: string[]) => void }) {
  const [mode, setMode] = useState<'manual' | 'fromCandidates'>('manual');
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [selectedCandidates, setSelectedCandidates] = useState<Set<string>>(new Set());

  const candidates = room?.candidates ?? [];

  const toggleCandidate = (placeId: string) => {
    setSelectedCandidates(prev => {
      const next = new Set(prev);
      if (next.has(placeId)) next.delete(placeId);
      else next.add(placeId);
      return next;
    });
  };

  const handleSubmit = () => {
    if (mode === 'manual') {
      const filtered = options.filter(o => o.trim());
      if (!question.trim() || filtered.length < 2) return;
      onSubmit(question.trim(), filtered);
    } else {
      if (!question.trim() || selectedCandidates.size < 2) return;
      const selected = candidates.filter(c => selectedCandidates.has(c.placeId));
      onSubmit(question.trim(), selected.map(c => c.name));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-2 pb-2">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl animate-slide-up max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100 shrink-0">
          <span className="text-sm font-semibold text-gray-800">📊 투표 만들기</span>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-4 h-4 text-gray-400" /></button>
        </div>
        
        {/* 모드 선택 탭 */}
        <div className="flex gap-2 px-4 pt-3 shrink-0">
          <button
            onClick={() => setMode('manual')}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
              mode === 'manual'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            직접 작성
          </button>
          <button
            onClick={() => setMode('fromCandidates')}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
              mode === 'fromCandidates'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            후보 리스트에서 선택
          </button>
        </div>

        <div className="px-4 py-3 space-y-3 overflow-y-auto flex-1">
          <input
            autoFocus
            placeholder="질문 입력 (예: 오늘 뭐 먹을까?)"
            value={question}
            onChange={e => setQuestion(e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
          
          {mode === 'manual' ? (
            <div className="space-y-2">
              <p className="text-xs text-gray-500">선택지</p>
              {options.map((opt, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    placeholder={`선택지 ${i + 1}`}
                    value={opt}
                    onChange={e => {
                      const next = [...options];
                      next[i] = e.target.value;
                      setOptions(next);
                    }}
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                  {options.length > 2 && (
                    <button
                      onClick={() => setOptions(options.filter((_, j) => j !== i))}
                      className="p-2 text-gray-300 hover:text-red-400 transition-colors"
                    ><Trash2 className="w-3.5 h-3.5" /></button>
                  )}
                </div>
              ))}
              {options.length < 10 && (
                <button
                  onClick={() => setOptions([...options, ''])}
                  className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600 pl-1"
                >
                  <Plus className="w-3.5 h-3.5" /> 선택지 추가
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-gray-500">후보 리스트 ({selectedCandidates.size}개 선택됨)</p>
              {candidates.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">후보가 없습니다</p>
              ) : (
                candidates.map(place => {
                  const isSelected = selectedCandidates.has(place.placeId);
                  return (
                    <div
                      key={place.placeId}
                      onClick={() => toggleCandidate(place.placeId)}
                      className={`flex items-center gap-2 p-2.5 border rounded-xl cursor-pointer transition-colors ${
                        isSelected
                          ? 'border-blue-400 bg-blue-50'
                          : 'border-gray-200 hover:border-blue-200 hover:bg-blue-50/30'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                        isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
                      }`}>
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <span className="text-sm text-gray-800">{place.name}</span>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
        
        <div className="px-4 pb-4 flex gap-2 shrink-0 border-t border-gray-100 pt-3">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 text-gray-500 rounded-xl text-sm hover:bg-gray-50">취소</button>
          <button
            onClick={handleSubmit}
            disabled={
              !question.trim() ||
              (mode === 'manual' ? options.filter(o => o.trim()).length < 2 : selectedCandidates.size < 2)
            }
            className="flex-1 py-2.5 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-xl text-sm font-medium transition-colors"
          >
            투표 올리기
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── 정산 공유 모달 ─────────────────────────────────── */
function SettlementShareModal({
  room, onClose, onSubmit,
}: { room: Room; onClose: () => void; onSubmit: (card: NonNullable<ChatMessage['settlementCard']>) => void }) {
  const settlements = (room.settlements ?? []).slice().sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  const hasSettlements = settlements.length > 0;

  // 뷰 모드: 'list' = 저장 정산 목록, 'manual' = 직접 입력
  const [mode, setMode] = useState<'list' | 'manual'>(hasSettlements ? 'list' : 'manual');
  const [selected, setSelected] = useState<Settlement | null>(null);

  // 직접 입력 필드
  const [total, setTotal] = useState('');
  const [headcount, setHeadcount] = useState(String(room.participants.length));
  const [memo, setMemo] = useState('');
  const account = room.settlements?.[0]?.accountInfo;

  const totalNum = parseInt(total.replace(/,/g, ''), 10) || 0;
  const headNum = parseInt(headcount, 10) || 1;
  const perPerson = Math.ceil(totalNum / headNum);

  /* 선택한 정산에서 카드 생성 */
  const submitFromSettlement = (s: Settlement) => {
    const totalAmt = s.totalAmount;
    const count = s.participants.length;
    // 1인 평균 (반올림)
    const per = Math.round(totalAmt / count);
    onSubmit({
      totalAmount: totalAmt,
      perPerson: per,
      headcount: count,
      memo: s.memo,
      bankName: s.accountInfo?.bankName,
      accountNumber: s.accountInfo?.accountNumber,
      accountHolder: s.accountInfo?.accountHolder,
    });
  };

  const fmt = (n: number) => n.toLocaleString('ko-KR');
  const dateLabel = (iso: string) =>
    new Date(iso).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric', weekday: 'short' });

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-2 pb-2">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl animate-slide-up max-h-[85vh] flex flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100 shrink-0">
          <span className="text-sm font-semibold text-gray-800">💳 정산 공유</span>
          <div className="flex items-center gap-2">
            {hasSettlements && (
              <div className="flex bg-gray-100 rounded-lg p-0.5">
                <button
                  onClick={() => setMode('list')}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                    mode === 'list' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  정산 목록
                </button>
                <button
                  onClick={() => setMode('manual')}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                    mode === 'manual' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  직접 입력
                </button>
              </div>
            )}
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100">
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>

        {/* ── 정산 목록 뷰 ── */}
        {mode === 'list' && (
          <div className="flex-1 overflow-y-auto">
            {settlements.length === 0 ? (
              <div className="py-12 text-center text-gray-400 text-sm">
                <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p>저장된 정산이 없어요</p>
                <button onClick={() => setMode('manual')} className="mt-2 text-xs text-purple-500 underline">
                  직접 입력하기
                </button>
              </div>
            ) : (
              <div className="p-3 space-y-2">
                {settlements.map(s => {
                  const count = s.participants.length;
                  const per = Math.round(s.totalAmount / count);
                  const isSelected = selected?.settlementId === s.settlementId;
                  return (
                    <button
                      key={s.settlementId}
                      onClick={() => setSelected(isSelected ? null : s)}
                      className={`w-full text-left rounded-2xl border transition-all overflow-hidden ${
                        isSelected
                          ? 'border-purple-400 ring-2 ring-purple-100 bg-purple-50/40'
                          : 'border-gray-100 bg-white hover:border-purple-200 hover:bg-purple-50/20 shadow-sm'
                      }`}
                    >
                      {/* 카드 상단 */}
                      <div className="px-3.5 pt-3 pb-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {s.memo && (
                                <span className="text-xs font-semibold text-gray-800 truncate">{s.memo}</span>
                              )}
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                                s.status === 'closed'
                                  ? 'bg-gray-100 text-gray-400'
                                  : 'bg-purple-100 text-purple-600'
                              }`}>
                                {s.status === 'closed' ? '완료' : '진행중'}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 mt-1 text-[11px] text-gray-400">
                              <Clock className="w-3 h-3" />
                              {dateLabel(s.createdAt)}
                              <span className="mx-1">·</span>
                              <Users className="w-3 h-3" />
                              {count}명
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-xs text-gray-500">총액</div>
                            <div className="text-sm font-bold text-gray-800">{fmt(s.totalAmount)}원</div>
                          </div>
                        </div>

                        {/* 1인 부담금 강조 */}
                        <div className="mt-2.5 flex items-center justify-between p-2.5 bg-purple-50 border border-purple-100 rounded-xl">
                          <span className="text-xs text-purple-600">1인 부담금</span>
                          <span className="text-base font-extrabold text-purple-600">{fmt(per)}원</span>
                        </div>
                      </div>

                      {/* 참여자 목록 (펼쳐진 상태에서) */}
                      {isSelected && (
                        <div className="border-t border-purple-100 px-3.5 py-2.5 bg-white/80 space-y-1">
                          <p className="text-[10px] text-gray-400 mb-1.5">참여자별 금액</p>
                          {s.participants.map(p => (
                            <div key={p.userId} className="flex items-center justify-between text-xs">
                              <span className="text-gray-600">{p.nickname}</span>
                              <span className={`font-semibold ${p.paid ? 'text-green-500' : 'text-gray-700'}`}>
                                {fmt(p.amount)}원 {p.paid ? '✓' : ''}
                              </span>
                            </div>
                          ))}
                          {s.accountInfo?.accountNumber && (
                            <div className="mt-2 pt-2 border-t border-gray-100">
                              <p className="text-[10px] text-gray-400">입금 계좌</p>
                              <p className="text-xs text-gray-700 font-medium mt-0.5">
                                {s.accountInfo.bankName} {s.accountInfo.accountNumber}
                                <span className="text-gray-400 font-normal ml-1">({s.accountInfo.accountHolder})</span>
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── 직접 입력 뷰 ── */}
        {mode === 'manual' && (
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">총 금액 (원)</label>
              <input
                autoFocus
                type="number"
                placeholder="예: 65000"
                value={total}
                onChange={e => setTotal(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-200"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">인원 수</label>
              <input
                type="number"
                min={1}
                value={headcount}
                onChange={e => setHeadcount(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-200"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">메모 (선택)</label>
              <input
                placeholder="예: 오늘 점심"
                value={memo}
                onChange={e => setMemo(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-200"
              />
            </div>
            {totalNum > 0 && (
              <div className="flex items-center justify-between p-3 bg-purple-50 rounded-xl border border-purple-100">
                <span className="text-xs text-purple-600">1인 부담금</span>
                <span className="text-lg font-extrabold text-purple-600">{perPerson.toLocaleString()}원</span>
              </div>
            )}
          </div>
        )}

        {/* 하단 버튼 */}
        <div className="px-4 pb-4 pt-2 flex gap-2 border-t border-gray-50 shrink-0">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-gray-200 text-gray-500 rounded-xl text-sm hover:bg-gray-50"
          >
            취소
          </button>
          <button
            onClick={() => {
              if (mode === 'list' && selected) {
                submitFromSettlement(selected);
              } else if (mode === 'manual' && totalNum) {
                onSubmit({
                  totalAmount: totalNum,
                  perPerson,
                  headcount: headNum,
                  memo: memo || undefined,
                  bankName: account?.bankName,
                  accountNumber: account?.accountNumber,
                  accountHolder: account?.accountHolder,
                });
              }
            }}
            disabled={mode === 'list' ? !selected : !totalNum}
            className="flex-1 py-2.5 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-xl text-sm font-medium transition-colors"
          >
            채팅에 공유
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── 점심 카드 생성 모달 ────────────────────────────── */
function LunchShareModal({
  room, onClose, onSubmit,
}: { room: Room; onClose: () => void; onSubmit: (card: NonNullable<ChatMessage['lunchCard']>) => void }) {
  // 가장 최근 룰렛 결과 가져오기 (todayPick보다 pickHistory 우선)
  const latestPick = room.pickHistory.length > 0 ? room.pickHistory[0] : null;
  const pick = room.todayPick;
  
  // 최근 픽이 있는지 확인 (오늘 또는 최근 것)
  if (pick || latestPick) {
    const displayPick = pick || {
      name: latestPick!.placeName,
      placeId: latestPick!.placeId,
      category: 'OTHER' as Category,
      address: '',
    };
    
    // 자동으로 최근 픽 카드 전송
    const place = displayPick as Place;
    const card: NonNullable<ChatMessage['lunchCard']> = {
      placeName: displayPick.name,
      category: displayPick.category,
      ...(displayPick.address && { address: displayPick.address }),
      ...(place.rating !== undefined && { rating: place.rating }),
      ...(place.priceRange && { priceRange: place.priceRange }),
      mapUrl: `https://map.kakao.com/?q=${encodeURIComponent(displayPick.name)}`,
    };
    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-2 pb-2">
        <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl animate-slide-up">
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100">
            <span className="text-sm font-semibold text-gray-800">🍱 오늘의 점심 공유</span>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-4 h-4 text-gray-400" /></button>
          </div>
          <div className="px-4 py-4 space-y-3">
            <div className="p-3 bg-orange-50 border border-orange-100 rounded-xl">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{(CATEGORY_EMOJI as Record<string,string>)[displayPick.category] ?? '🍽️'}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-gray-800 truncate">{displayPick.name}</div>
                  {displayPick.address && <div className="text-xs text-gray-400 mt-0.5 truncate">{displayPick.address}</div>}
                  {!pick && latestPick && (
                    <div className="text-[10px] text-orange-500 mt-1">
                      최근 선택: {new Date(latestPick.pickedAt).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-500 text-center">위 정보를 채팅에 카드로 공유합니다</p>
          </div>
          <div className="px-4 pb-4 flex gap-2">
            <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 text-gray-500 rounded-xl text-sm hover:bg-gray-50">취소</button>
            <button
              onClick={() => onSubmit(card)}
              className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-medium transition-colors"
            >
              공유하기
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 룰렛 결과가 전혀 없으면 직접 입력
  const [name, setName] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-2 pb-2">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl animate-slide-up">
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100">
          <span className="text-sm font-semibold text-gray-800">🍱 오늘의 점심 공유</span>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-4 h-4 text-gray-400" /></button>
        </div>
        <div className="px-4 py-3">
          <p className="text-xs text-gray-500 mb-2">룰렛 결과가 없어요. 직접 입력해 주세요.</p>
          <input
            autoFocus
            placeholder="가게 이름 입력"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && name.trim()) {
                onSubmit({
                  placeName: name.trim(),
                  category: 'OTHER',
                  mapUrl: `https://map.kakao.com/?q=${encodeURIComponent(name.trim())}`,
                });
              }
            }}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
          />
        </div>
        <div className="px-4 pb-4 flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 text-gray-500 rounded-xl text-sm hover:bg-gray-50">취소</button>
          <button
            onClick={() => {
              if (!name.trim()) return;
              onSubmit({
                placeName: name.trim(),
                category: 'OTHER',
                mapUrl: `https://map.kakao.com/?q=${encodeURIComponent(name.trim())}`,
              });
            }}
            disabled={!name.trim()}
            className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-200 text-white rounded-xl text-sm font-medium transition-colors"
          >
            공유하기
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── 해시태그 빠른 버튼 바 ──────────────────────────── */
function HashtagBar({ onSelect }: { onSelect: (tag: string) => void }) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-2 overflow-x-auto scrollbar-none border-b border-gray-100 bg-white">
      <Hash className="w-3.5 h-3.5 text-gray-300 shrink-0" />
      {HASH_COMMANDS.map(cmd => {
        const Icon = cmd.icon;
        return (
          <button
            key={cmd.tag}
            onClick={() => onSelect(cmd.tag)}
            className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium border transition-all hover:scale-[1.03] active:scale-95 ${cmd.color}`}
          >
            <Icon className="w-3 h-3" />
            {cmd.tag}
          </button>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   메인 ChatPanel
═══════════════════════════════════════════════════════ */
export default function ChatPanel({ roomId, currentUserId }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [room, setRoom] = useState<Room | null>(null);
  const [showModal, setShowModal] = useState<null | 'lunch' | 'settlement' | 'vote'>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const r = await getRoom(roomId);
    setRoom(r);
    setMessages(r?.chatMessages ?? []);
  }, [roomId]);

  useEffect(() => {
    load();
    const id = setInterval(load, 1000);
    return () => clearInterval(id);
  }, [load]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const send = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    sendChatMessage(roomId, trimmed);
    setText('');
    load();
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  };

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const handleHashSelect = (tag: string) => {
    if (tag === '#룰렛') setShowModal('lunch');
    else if (tag === '#정산') setShowModal('settlement');
    else if (tag === '#투표') setShowModal('vote');
    inputRef.current?.focus();
  };

  const handleVote = (msgId: string, optIdx: number) => {
    castVote(roomId, msgId, optIdx);
    load();
  };

  // 연속 메시지 그룹
  const grouped = messages.map((msg, i) => {
    const prev = messages[i - 1];
    const cardTypes = ['lunch-card', 'settlement-card', 'vote-card', 'system'];
    const isFirst =
      !prev ||
      prev.userId !== msg.userId ||
      cardTypes.includes(msg.type) ||
      cardTypes.includes(prev.type);
    return { msg, isFirst };
  });

  return (
    <div className="flex flex-col h-full min-h-0 bg-gray-50">
      {/* 해시태그 바 */}
      <HashtagBar onSelect={handleHashSelect} />

      {/* 메시지 목록 */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-gray-300 gap-2 pt-16">
            <MessageCircle className="w-10 h-10 opacity-30" />
            <p className="text-sm">아직 메시지가 없어요</p>
            <p className="text-xs text-gray-300">해시태그 버튼으로 점심·정산을 공유해 보세요 🍱</p>
          </div>
        )}

        {grouped.map(({ msg, isFirst }) => {
          /* ── 시스템 ── */
          if (msg.type === 'system') {
            return (
              <div key={msg.messageId} className="flex justify-center py-2">
                <span className="text-[11px] text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
                  {msg.text}
                </span>
              </div>
            );
          }

          const isMine = msg.userId === currentUserId;
          const isCard = ['lunch-card', 'settlement-card', 'vote-card'].includes(msg.type);

          return (
            <div
              key={msg.messageId}
              className={`flex items-end gap-2 ${isMine ? 'flex-row-reverse' : 'flex-row'} ${isFirst ? 'mt-3' : 'mt-0.5'}`}
            >
              {/* 아바타 */}
              {!isMine && (
                <div className="shrink-0 w-7 self-end mb-0.5">
                  {isFirst && (
                    <div className="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center text-xs text-orange-600 font-medium">
                      {msg.nickname.slice(0, 1)}
                    </div>
                  )}
                </div>
              )}

              <div className={`flex flex-col gap-0.5 max-w-[78%] ${isMine ? 'items-end' : 'items-start'}`}>
                {/* 닉네임 */}
                {isFirst && !isMine && (
                  <span className="text-[11px] text-gray-400 ml-1">{msg.nickname}</span>
                )}

                <div className={`flex items-end gap-1.5 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
                  {/* 버블 / 카드 */}
                  {msg.type === 'lunch-card' && msg.lunchCard ? (
                    <LunchCardBubble msg={msg} />
                  ) : msg.type === 'settlement-card' && msg.settlementCard ? (
                    <SettlementCardBubble msg={msg} />
                  ) : msg.type === 'vote-card' && msg.voteCard ? (
                    <VoteCardBubble msg={msg} currentUserId={currentUserId} onVote={handleVote} />
                  ) : (
                    <div
                      className={`px-3 py-2 rounded-2xl text-sm leading-relaxed break-words whitespace-pre-wrap ${
                        isMine
                          ? 'bg-orange-500 text-white rounded-br-sm'
                          : 'bg-white border border-gray-100 text-gray-800 rounded-bl-sm shadow-sm'
                      }`}
                    >
                      {msg.text}
                    </div>
                  )}
                  {/* 시간 */}
                  <span className="text-[10px] text-gray-300 shrink-0 mb-0.5">{timeLabel(msg.createdAt)}</span>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* 입력창 */}
      <div className="shrink-0 border-t border-gray-100 bg-white px-3 py-2.5 flex items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          placeholder="메시지 또는 # 단축키..."
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKey}
          maxLength={300}
          className="flex-1 px-3.5 py-2.5 bg-gray-100 rounded-2xl text-sm focus:outline-none focus:bg-white focus:ring-2 focus:ring-orange-200 transition-all"
        />
        <button
          onClick={send}
          disabled={!text.trim()}
          className="w-9 h-9 flex items-center justify-center bg-orange-500 hover:bg-orange-600 disabled:bg-gray-200 text-white rounded-2xl transition-colors shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>

      {/* ─── 모달들 ─── */}
      {showModal === 'lunch' && room && (
        <LunchShareModal
          room={room}
          onClose={() => setShowModal(null)}
          onSubmit={card => {
            sendLunchCard(roomId, card);
            setShowModal(null);
            load();
            setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
          }}
        />
      )}
      {showModal === 'settlement' && room && (
        <SettlementShareModal
          room={room}
          onClose={() => setShowModal(null)}
          onSubmit={card => {
            sendSettlementCard(roomId, card);
            setShowModal(null);
            load();
            setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
          }}
        />
      )}
      {showModal === 'vote' && (
        <VoteCreateModal
          room={room}
          onClose={() => setShowModal(null)}
          onSubmit={(q, opts) => {
            sendVoteCard(roomId, q, opts);
            setShowModal(null);
            load();
            setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
          }}
        />
      )}
    </div>
  );
}