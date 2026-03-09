import React, { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router';
import {
  UtensilsCrossed, Plus, Users, ArrowRight, Hash, ChefHat,
  LogOut, Crown, Clock, MapPin, ChevronRight, X, Loader2, User, HelpCircle,
  RotateCcw, Trash2
} from 'lucide-react';
import {
  getSession, clearSession, getUserRooms, createRoom, joinRoom, getRoom,
  getDeletedRooms, restoreRoom
} from '../store';
import type { Room } from '../types';
import ProfileModal from '../components/ProfileModal';
import HelpModal from '../components/HelpModal';

type Modal = null | 'create' | 'join' | 'profile' | 'help';

export default function Home() {
  const navigate = useNavigate();
  const session = getSession();

  const [rooms, setRooms] = useState<Room[]>([]);
  const [deletedRooms, setDeletedRooms] = useState<Array<{ room: Room; deletedAt: string }>>([]);
  const [modal, setModal] = useState<Modal>(null);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [deletedLoading, setDeletedLoading] = useState(true);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  // 룸 만들기
  const [roomName, setRoomName] = useState('');
  const [createError, setCreateError] = useState('');

  // 룸 참여
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);

  useEffect(() => {
    if (!session) return;
    loadRooms();
    loadDeletedRooms();
  }, [session?.userId]);

  const loadRooms = async () => {
    if (!session) return;
    setRoomsLoading(true);
    try {
      const userRooms = await getUserRooms(session.userId);
      setRooms(userRooms || []);
    } catch (err) {
      console.error('Failed to load rooms:', err);
      setRooms([]);
    } finally {
      setRoomsLoading(false);
    }
  };

  const loadDeletedRooms = async () => {
    if (!session) return;
    setDeletedLoading(true);
    try {
      const list = await getDeletedRooms(session.userId);
      setDeletedRooms(list);
    } catch (err) {
      console.error('Failed to load deleted rooms:', err);
      setDeletedRooms([]);
    } finally {
      setDeletedLoading(false);
    }
  };

  const refresh = async () => {
    await loadRooms();
    await loadDeletedRooms();
  };

  const handleRestore = async (roomId: string) => {
    if (!session) return;
    setRestoringId(roomId);
    try {
      const room = await restoreRoom(roomId, session.userId);
      if (room) {
        await refresh();
        navigate(`/room/${room.roomId}`);
      }
    } catch (err) {
      console.error('Restore error:', err);
    } finally {
      setRestoringId(null);
    }
  };

  const handleCreate = async () => {
    setCreateError('');
    if (!session) return;
    try {
      const room = await createRoom(session.nickname, roomName.trim());
      await refresh();
      setModal(null);
      setRoomName('');
      navigate(`/room/${room.roomId}`);
    } catch (err) {
      setCreateError('룸 생성 중 오류가 발생했습니다.');
      console.error('Create room error:', err);
    }
  };

  const handleJoin = async () => {
    setJoinError('');
    if (!session) return;
    const code = joinCode.trim().toUpperCase();
    if (!code) { setJoinError('초대 코드를 입력해 주세요.'); return; }

    setJoinLoading(true);
    try {
      // Firebase에서 룸 찾기
      const existing = await getRoom(code);
      if (!existing) {
        setJoinError('룸을 찾을 수 없어요. 코드를 다시 확인해 주세요.');
        return;
      }
      const { room } = await joinRoom(code, session.nickname);
      if (!room) {
        setJoinError('입장 중 오류가 발생했어요.');
        return;
      }
      await refresh();
      setModal(null);
      setJoinCode('');
      navigate(`/room/${room.roomId}`);
    } catch (err) {
      setJoinError('입장 중 오류가 발생했습니다.');
      console.error('Join room error:', err);
    } finally {
      setJoinLoading(false);
    }
  };

  const handleLogout = () => {
    clearSession();
    navigate('/login');
  };

  const openModal = (m: Modal) => {
    setCreateError('');
    setJoinError('');
    setRoomName('');
    setJoinCode('');
    setModal(m);
  };

  if (!session) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 flex flex-col max-w-lg mx-auto">
      {/* Header */}
      <header className="flex items-center justify-between px-5 pt-12 pb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center shadow-sm">
            <UtensilsCrossed className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg text-gray-900 leading-tight">🍱 냠냠픽</h1>
            <p className="text-xs text-gray-400">안녕하세요, <span className="text-orange-500 font-medium">{session.nickname}</span>님</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => openModal('help')}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-blue-500 transition-colors px-3 py-2 rounded-xl hover:bg-blue-50"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            도움말
          </button>
          <button
            onClick={() => openModal('profile')}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-orange-500 transition-colors px-3 py-2 rounded-xl hover:bg-orange-50"
          >
            <User className="w-3.5 h-3.5" />
            프로필
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-500 transition-colors px-3 py-2 rounded-xl hover:bg-red-50"
          >
            <LogOut className="w-3.5 h-3.5" />
            로그아웃
          </button>
        </div>
      </header>

      {/* Action Buttons */}
      <div className="px-4 flex gap-3 mb-6">
        <button
          onClick={() => openModal('create')}
          className="flex-1 py-3.5 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl transition-colors flex items-center justify-center gap-2 text-sm font-medium shadow-sm shadow-orange-100"
        >
          <Plus className="w-4 h-4" />
          룸 만들기
        </button>
        <button
          onClick={() => openModal('join')}
          className="flex-1 py-3.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-2xl transition-colors flex items-center justify-center gap-2 text-sm font-medium shadow-sm"
        >
          <Hash className="w-4 h-4" />
          코드로 입장
        </button>
      </div>

      {/* My Rooms */}
      <div className="flex-1 px-4 pb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-700">내 룸 목록</h2>
          <span className="text-xs text-gray-400">{roomsLoading ? '로딩중...' : `${rooms.length}개`}</span>
        </div>

        {roomsLoading && rooms.length === 0 ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-7 h-7 text-orange-400 animate-spin" />
          </div>
        ) : rooms.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 py-14 text-center">
            <div className="text-4xl mb-3">🍽️</div>
            <p className="text-sm text-gray-500 mb-1">아직 참여한 룸이 없어요</p>
            <p className="text-xs text-gray-400">룸을 만들거나 코드로 입장하세요</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {rooms && rooms.length > 0 ? rooms.map(room => {
              const isHost = room.hostUserId === session.userId;
              const memberCount = room.participants?.length || 0;
              const lastPick = room.pickHistory?.[0];
              return (
                <button
                  key={room.roomId}
                  onClick={() => navigate(`/room/${room.roomId}`)}
                  className="w-full bg-white rounded-2xl border border-gray-100 p-4 hover:border-orange-200 hover:shadow-md hover:shadow-orange-50 transition-all text-left group"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-orange-100 transition-colors">
                      <span className="text-lg">🍱</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-sm font-medium text-gray-900 truncate">{room.name}</span>
                        {isHost && (
                          <span className="inline-flex items-center gap-0.5 text-xs text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded-full shrink-0">
                            <Crown className="w-2.5 h-2.5" /> 방장
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" /> {memberCount}명
                        </span>
                        <span className="flex items-center gap-1">
                          <Hash className="w-3 h-3" /> {room.roomId}
                        </span>
                        {room.settings?.baseLocation && (
                          <span className="flex items-center gap-1 truncate">
                            <MapPin className="w-3 h-3" />
                            <span className="truncate max-w-[80px]">{room.settings.baseLocation.label}</span>
                          </span>
                        )}
                      </div>
                      {lastPick && (
                        <div className="mt-1.5 flex items-center gap-1 text-xs text-gray-400">
                          <Clock className="w-3 h-3" />
                          <span>최근: {lastPick.placeName}</span>
                          <span className="text-gray-300">
                            · {new Date(lastPick.pickedAt).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })}
                          </span>
                        </div>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-orange-400 transition-colors shrink-0 self-center" />
                  </div>
                </button>
              );
            }) : (
              <div className="text-center py-8 text-sm text-gray-400">
                참여 중인 룸이 없습니다.
              </div>
            )}
          </div>
        )}

        {/* 삭제된 방 (되돌리기) */}
        {deletedRooms.length > 0 && (
          <div className="mt-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                <Trash2 className="w-4 h-4 text-gray-400" />
                삭제된 방 (7일 이내 되돌리기)
              </h2>
            </div>
            <div className="space-y-2.5">
              {deletedRooms.map(({ room, deletedAt }) => {
                const isRestoring = restoringId === room.roomId;
                const daysLeft = Math.ceil((7 * 24 * 60 * 60 * 1000 - (Date.now() - new Date(deletedAt).getTime())) / (24 * 60 * 60 * 1000));
                return (
                  <div
                    key={room.roomId}
                    className="bg-gray-50 rounded-2xl border border-gray-200 p-4 flex items-center justify-between gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-700 truncate">{room.name}</div>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400">
                        <span>#{room.roomId}</span>
                        <span>· {new Date(deletedAt).toLocaleDateString('ko-KR')} 삭제</span>
                        {daysLeft > 0 && (
                          <span className="text-orange-500">D-{daysLeft}</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRestore(room.roomId)}
                      disabled={isRestoring || daysLeft <= 0}
                      className="shrink-0 flex items-center gap-1.5 px-3 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white rounded-xl text-xs font-medium transition-colors"
                    >
                      {isRestoring ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <RotateCcw className="w-3.5 h-3.5" />
                      )}
                      되돌리기
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Modal: 룸 만들기 ── */}
      {modal === 'create' && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center" onClick={e => e.target === e.currentTarget && openModal(null)}>
          <div className="bg-white rounded-t-3xl w-full max-w-lg p-6 pb-10 animate-slide-up">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <ChefHat className="w-5 h-5 text-orange-500" /> 새 룸 만들기
              </h2>
              <button onClick={() => openModal(null)} className="p-1.5 rounded-xl hover:bg-gray-100 transition-colors">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1.5">룸 이름 <span className="text-gray-400">(선택)</span></label>
                <input
                  type="text"
                  placeholder={`${session.nickname}의 점심`}
                  value={roomName}
                  onChange={e => setRoomName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCreate()}
                  maxLength={20}
                  autoFocus
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-300 text-sm"
                />
                <p className="text-xs text-gray-400 mt-1.5">방장: {session.nickname}</p>
              </div>
              {createError && <p className="text-sm text-red-500">{createError}</p>}
              <button
                onClick={handleCreate}
                className="w-full py-3.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl transition-colors flex items-center justify-center gap-2 text-sm font-medium"
              >
                룸 만들기 <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: 코드로 입장 ── */}
      {modal === 'join' && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center" onClick={e => e.target === e.currentTarget && openModal(null)}>
          <div className="bg-white rounded-t-3xl w-full max-w-lg p-6 pb-10 animate-slide-up">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <Hash className="w-5 h-5 text-orange-500" /> 코드로 입장
              </h2>
              <button onClick={() => openModal(null)} className="p-1.5 rounded-xl hover:bg-gray-100 transition-colors">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1.5">초대 코드 <span className="text-orange-500">*</span></label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="6자리 코드 입력"
                    value={joinCode}
                    onChange={e => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                    onKeyDown={e => e.key === 'Enter' && handleJoin()}
                    maxLength={6}
                    autoFocus
                    className="w-full pl-9 pr-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-300 text-sm tracking-widest uppercase"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1.5">입장 닉네임: {session.nickname}</p>
              </div>
              {joinError && <p className="text-sm text-red-500">{joinError}</p>}
              <button
                onClick={handleJoin}
                disabled={joinLoading}
                className="w-full py-3.5 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white rounded-xl transition-colors flex items-center justify-center gap-2 text-sm font-medium"
              >
                {joinLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> 입장 중...</> : <>입장하기 <ArrowRight className="w-4 h-4" /></>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: 프로필 ── */}
      {modal === 'profile' && (
        <ProfileModal
          onClose={() => openModal(null)}
          onNicknameChange={async (newNickname) => {
            await loadRooms();
          }}
        />
      )}

      {/* ── Modal: 도움말 ── */}
      {modal === 'help' && (
        <HelpModal
          isOpen={true}
          onClose={() => openModal(null)}
        />
      )}
    </div>
  );
}