import React, { useState } from 'react';
import {
  Crown, Shield, UserX, ChevronDown, Copy, Check,
  UserCheck, MoreVertical, X, Trash2
} from 'lucide-react';
import { Room, Participant } from '../types';
import { setSubHost, kickParticipant, leaveRoom, deleteRoom } from '../store';
import { copyToClipboard } from '../utils';

interface MembersPanelProps {
  room: Room;
  currentUserId: string;
  onRefresh: () => void;
  onClose?: () => void;
  onLeave?: () => void;
  onDelete?: () => void;
}

function RoleBadge({ p }: { p: Participant }) {
  if (p.isHost) return (
    <span className="flex items-center gap-0.5 text-[10px] text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded-full border border-orange-100">
      <Crown className="w-2.5 h-2.5" /> 방장
    </span>
  );
  if (p.isSubHost) return (
    <span className="flex items-center gap-0.5 text-[10px] text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded-full border border-blue-100">
      <Shield className="w-2.5 h-2.5" /> 부방장
    </span>
  );
  return null;
}

export default function MembersPanel({ room, currentUserId, onRefresh, onClose, onLeave, onDelete }: MembersPanelProps) {
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  const isHost = room.hostUserId === currentUserId;
  const currentP = room.participants.find(p => p.userId === currentUserId);
  const isSubHost = currentP?.isSubHost ?? false;
  const canManage = isHost || isSubHost;

  const handleCopyCode = async () => {
    const ok = await copyToClipboard(room.roomId);
    if (ok) { setCopiedCode(true); setTimeout(() => setCopiedCode(false), 2000); }
  };

  const toggleSubHost = (p: Participant) => {
    setSubHost(room.roomId, p.userId, !p.isSubHost);
    onRefresh();
    setMenuOpenId(null);
  };

  const handleKick = (p: Participant) => {
    if (!confirm(`${p.nickname}님을 강퇴하시겠습니까?`)) return;
    kickParticipant(room.roomId, p.userId);
    onRefresh();
    setMenuOpenId(null);
  };

  // 순서: 방장 → 부방장 → 일반
  const sorted = [...room.participants].sort((a, b) => {
    if (a.isHost) return -1;
    if (b.isHost) return 1;
    if (a.isSubHost && !b.isSubHost) return -1;
    if (b.isSubHost && !a.isSubHost) return 1;
    return new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime();
  });

  return (
    <div className="flex flex-col h-full min-h-0 bg-gray-50">
      {/* 헤더 */}
      <div className="shrink-0 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-800">
            팀원 목록 <span className="text-orange-500">{room.participants.length}명</span>
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">초대 코드로 팀원을 초대하세요</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyCode}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
              copiedCode
                ? 'bg-green-500 text-white'
                : 'bg-orange-100 text-orange-600 hover:bg-orange-200'
            }`}
          >
            {copiedCode ? <><Check className="w-3 h-3" /> 복사됨</> : <><Copy className="w-3 h-3" /> 코드 복사</>}
          </button>
          {onClose && (
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100">
              <X className="w-4 h-4 text-gray-400" />
            </button>
          )}
        </div>
      </div>

      {/* 초대 코드 칩 */}
      <div className="shrink-0 px-4 py-2.5 bg-orange-50 border-b border-orange-100">
        <div className="flex items-center justify-center gap-2">
          <span className="text-xs text-orange-500">초대 코드</span>
          <span className="text-lg font-bold text-orange-600 tracking-widest">{room.roomId}</span>
        </div>
      </div>

      {/* 멤버 목록 */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5">
        {sorted.map(p => {
          const isSelf = p.userId === currentUserId;
          const menuOpen = menuOpenId === p.userId;

          return (
            <div
              key={p.userId}
              className={`relative bg-white rounded-2xl border overflow-visible transition-all ${
                p.isHost
                  ? 'border-orange-200 shadow-sm shadow-orange-50'
                  : p.isSubHost
                  ? 'border-blue-100 shadow-sm'
                  : 'border-gray-100'
              }`}
            >
              <div className="flex items-center gap-3 px-3.5 py-3">
                {/* 아바타 */}
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium shrink-0 ${
                  p.isHost
                    ? 'bg-orange-500 text-white'
                    : p.isSubHost
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {p.nickname.slice(0, 1)}
                </div>

                {/* 이름 + 배지 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`text-sm font-medium truncate ${isSelf ? 'text-orange-600' : 'text-gray-800'}`}>
                      {p.nickname}
                    </span>
                    {isSelf && <span className="text-[10px] text-gray-400">(나)</span>}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <RoleBadge p={p} />
                    <span className="text-[10px] text-gray-300">
                      {new Date(p.joinedAt).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })} 참여
                    </span>
                  </div>
                </div>

                {/* 관리 메뉴 버튼 (방장/부방장만, 자기 자신 & 방장 제외) */}
                {canManage && !isSelf && !p.isHost && (
                  <div className="relative shrink-0">
                    <button
                      onClick={() => setMenuOpenId(menuOpen ? null : p.userId)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <MoreVertical className="w-4 h-4 text-gray-400" />
                    </button>

                    {menuOpen && (
                      <>
                        {/* 외부 클릭 닫기 */}
                        <div
                          className="fixed inset-0 z-40"
                          onClick={() => setMenuOpenId(null)}
                        />
                        <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 overflow-hidden w-44">
                          {/* 부방장 토글 — 방장만 */}
                          {isHost && (
                            <button
                              onClick={() => toggleSubHost(p)}
                              className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-left hover:bg-gray-50 transition-colors"
                            >
                              <Shield className="w-4 h-4 text-blue-500" />
                              <span className="text-gray-700">
                                {p.isSubHost ? '부방장 해제' : '부방장 임명'}
                              </span>
                            </button>
                          )}
                          {/* 강퇴 */}
                          <button
                            onClick={() => handleKick(p)}
                            className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-left hover:bg-red-50 transition-colors border-t border-gray-50"
                          >
                            <UserX className="w-4 h-4 text-red-500" />
                            <span className="text-red-500">강퇴하기</span>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 방 나가기 / 방 삭제 / 하단 안내 */}
      <div className="shrink-0 px-4 py-3 bg-white border-t border-gray-100 space-y-2">
        {isHost && onDelete && (
          <button
            onClick={async () => {
              if (!confirm('방을 삭제하시겠습니까? 삭제 후 7일 이내에 되돌릴 수 있습니다.')) return;
              await deleteRoom(room.roomId, currentUserId);
              onDelete();
            }}
            className="w-full py-2.5 border border-red-300 bg-red-50 text-red-600 rounded-xl text-sm font-medium hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            방 삭제하기
          </button>
        )}
        {onLeave && (
          <button
            onClick={async () => {
              if (!confirm('정말 방을 나가시겠습니까?')) return;
              await leaveRoom(room.roomId, currentUserId);
              onLeave();
            }}
            className="w-full py-2.5 border border-red-200 text-red-600 rounded-xl text-sm font-medium hover:bg-red-50 transition-colors"
          >
            방 나가기
          </button>
        )}
        {canManage && (
          <p className="text-[11px] text-gray-400 text-center">
            <Shield className="w-3 h-3 inline mr-0.5 text-blue-400" />
            부방장은 멤버 강퇴 권한을 갖습니다
          </p>
        )}
      </div>
    </div>
  );
}
