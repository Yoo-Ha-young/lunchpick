/**
 * Store - Firebase 기반 데이터 관리
 * sessionStorage: 로그인 세션 정보만 임시 저장
 * Firebase DB: 모든 공유 데이터 저장
 */

import { Room, RoomSettings, Participant, Place, PickHistory, Settlement, ChatMessage, UserProfile, AccountInfo } from './types';
import * as firebaseApi from './firebaseApi';

const SESSION_KEY = 'lunchpick_session';
const USER_KEY = 'lunchpick_user';

// ═══════════════════════════════════════════════════════════
// ID 생성 유틸
// ═══════════════════════════════════════════════════════════

export function generateId(length = 6): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

export function generateUserId(): string {
  return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// ═══════════════════════════════════════════════════════════
// 세션 관리 (sessionStorage - 로그인 정보만)
// ═══════════════════════════════════════════════════════════

export interface Session {
  userId: string;
  username: string;
  nickname: string;
}

/** 현재 세션 가져오기 */
export function getSession(): Session | null {
  try {
    const stored = sessionStorage.getItem(SESSION_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

/** 세션 저장 */
export function setSession(session: Session) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  sessionStorage.setItem(USER_KEY, JSON.stringify({ userId: session.userId, nickname: session.nickname }));
}

/** 로그아웃 */
export function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(USER_KEY);
}

// ═══════════════════════════════════════════════════════════
// 계정 (Firebase)
// ═══════════════════════════════════════════════════════════

/** 회원가입 */
export async function createAccount(
  username: string,
  password: string,
  nickname: string
): Promise<{ success: boolean; session?: Session; error?: string }> {
  const result = await firebaseApi.createAccount(username, password, nickname);
  
  if (result.success && result.userId) {
    const session: Session = {
      userId: result.userId,
      username: username.trim().toLowerCase(),
      nickname: nickname.trim(),
    };
    setSession(session);
    return { success: true, session };
  }
  
  return { success: false, error: result.error };
}

/** 로그인 */
export async function loginAccount(
  username: string,
  password: string
): Promise<{ success: boolean; session?: Session; error?: string }> {
  const result = await firebaseApi.loginAccount(username, password);
  
  if (result.success && result.account) {
    const session: Session = {
      userId: result.account.userId,
      username: result.account.username,
      nickname: result.account.nickname,
    };
    setSession(session);
    return { success: true, session };
  }
  
  return { success: false, error: result.error };
}

// ═══════════════════════════════════════════════════════════
// 레거시 user helper (Room.tsx에서 사용)
// ═══════════════════════════════════════════════════════════

export function getOrCreateUser(): { userId: string; nickname: string } {
  const session = getSession();
  if (session) return { userId: session.userId, nickname: session.nickname };
  
  const stored = sessionStorage.getItem(USER_KEY);
  if (stored) return JSON.parse(stored);
  
  const user = { userId: generateUserId(), nickname: '' };
  sessionStorage.setItem(USER_KEY, JSON.stringify(user));
  return user;
}

export function saveUser(userId: string, nickname: string) {
  sessionStorage.setItem(USER_KEY, JSON.stringify({ userId, nickname }));
}

// ═══════════════════════════════════════════════════════════
// Room CRUD (Firebase)
// ═══════════════════════════════════════════════════════════

/** Room 조회 */
export async function getRoom(roomId: string): Promise<Room | null> {
  return await firebaseApi.getRoom(roomId);
}

/** Room 저장 */
export async function saveRoom(room: Room): Promise<void> {
  await firebaseApi.saveRoom(room);
}

/** Room 로컬 저장 (호환성 유지) */
export function saveRoomLocal(room: Room) {
  // Firebase에서는 로컬 저장 불필요 (실시간 동기화)
  // 무한루프 방지를 위해 빈 함수로 유지
}

/** 사용자가 속한 Room 목록 */
export async function getUserRooms(userId: string): Promise<Room[]> {
  return await firebaseApi.getUserRooms(userId);
}

/** Room 생성 */
export async function createRoom(hostNickname: string, roomName: string): Promise<Room> {
  const user = getOrCreateUser();
  const userId = user.userId;
  saveUser(userId, hostNickname || '방장');

  const roomId = generateId(6);
  const now = new Date().toISOString();
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  const defaultSettings: RoomSettings = {
    baseLocation: null,
    radiusMeters: 500,
    categories: ['KOR', 'CHN', 'JPN', 'WESTERN', 'SNACK', 'BAR', 'OTHER'],
    excludeRecentDays: 2,
    excludeEnabled: true,
    rouletteHostOnly: false,
    priceFilter: [],
  };

  const host: Participant = {
    userId,
    nickname: hostNickname || '방장',
    joinedAt: now,
    isHost: true,
  };

  const room: Room = {
    roomId,
    name: roomName || `${hostNickname || '팀'}의 점심`,
    hostUserId: userId,
    createdAt: now,
    expiresAt: expires,
    settings: defaultSettings,
    participants: [host],
    todayPick: null,
    pickHistory: [],
    dutyHistory: [],
    settlements: [],
    savedPlaces: [],
    chatMessages: [],
  };

  await saveRoom(room);
  await firebaseApi.addUserRoom(userId, roomId);
  
  return room;
}

/** Room 참여 */
export async function joinRoom(
  roomId: string,
  nickname: string
): Promise<{ room: Room | null; isNew: boolean }> {
  const room = await getRoom(roomId);
  if (!room) return { room: null, isNew: false };

  const user = getOrCreateUser();
  const userId = user.userId;
  saveUser(userId, nickname || '참여자');

  const existing = room.participants.find(p => p.userId === userId);
  if (!existing) {
    room.participants.push({
      userId,
      nickname: nickname || '참여자',
      joinedAt: new Date().toISOString(),
      isHost: false,
    });
    
    // 시스템 메시지 추가
    const systemMsg: ChatMessage = {
      messageId: `sys_${Date.now()}`,
      roomId,
      userId: 'system',
      nickname: 'system',
      text: `${nickname || '참여자'}님이 참여했습니다 🎉`,
      createdAt: new Date().toISOString(),
      type: 'system',
    };
    
    if (!room.chatMessages) room.chatMessages = [];
    room.chatMessages.push(systemMsg);
    
    await saveRoom(room);
    await firebaseApi.addUserRoom(userId, roomId);
    
    return { room, isNew: true };
  }

  // 이미 참여한 경우에도 user-room 매핑 확인
  await firebaseApi.addUserRoom(userId, roomId);
  
  return { room, isNew: false };
}

/** Room 설정 업데이트 */
export async function updateRoomSettings(roomId: string, settings: Partial<RoomSettings>) {
  const room = await getRoom(roomId);
  if (!room) return;
  room.settings = { ...room.settings, ...settings };
  await saveRoom(room);
}

// ═══════════════════════════════════════════════════════════
// 픽 히스토리
// ═══════════════════════════════════════════════════════════

export async function addPickHistory(roomId: string, place: Place) {
  console.log('🎲 addPickHistory 호출:', { roomId, placeName: place.name, placeId: place.placeId });
  const room = await getRoom(roomId);
  if (!room) {
    console.error('❌ addPickHistory: room not found');
    return;
  }
  
  const user = getOrCreateUser();
  const entry: PickHistory = {
    placeId: place.placeId,
    placeName: place.name,
    pickedAt: new Date().toISOString(),
    pickedByUserId: user.userId,
    category: place.category,
    address: place.address,
  };
  
  console.log('📝 pickHistory에 추가:', entry);
  room.pickHistory.unshift(entry);
  room.todayPick = place;
  console.log('💾 room 저장 중... pickHistory 개수:', room.pickHistory.length);
  await saveRoom(room);
  console.log('✅ room 저장 완료');
}

export function isRecentlyPicked(room: Room, placeId: string): boolean {
  if (!room.settings.excludeEnabled) return false;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - room.settings.excludeRecentDays);
  return room.pickHistory.some(
    h => h.placeId === placeId && new Date(h.pickedAt) >= cutoff
  );
}

export async function markPickVisited(roomId: string, pickedAt: string) {
  const room = await getRoom(roomId);
  if (!room) return;
  
  const idx = room.pickHistory.findIndex(h => h.pickedAt === pickedAt);
  if (idx >= 0) {
    room.pickHistory[idx] = {
      ...room.pickHistory[idx],
      visited: true,
      visitedAt: new Date().toISOString(),
    };
    await saveRoom(room);
  }
}

/** 특정 장소의 방문 기록 제거 (최근 방문 제외 우회용) */
export async function removeVisitFromHistory(roomId: string, placeId: string): Promise<void> {
  await firebaseApi.removeVisitFromHistory(roomId, placeId);
}

// ═══════════════════════════════════════════════════════════
// 정산
// ═══════════════════════════════════════════════════════════

export async function addSettlement(roomId: string, settlement: Settlement) {
  const room = await getRoom(roomId);
  if (!room) return;
  room.settlements.unshift(settlement);
  await saveRoom(room);
}

export async function updateSettlement(roomId: string, settlement: Settlement) {
  const room = await getRoom(roomId);
  if (!room) return;
  
  const idx = room.settlements.findIndex(s => s.settlementId === settlement.settlementId);
  if (idx >= 0) {
    room.settlements[idx] = settlement;
    await saveRoom(room);
  }
}

// ═══════════════════════════════════════════════════════════
// 당번
// ═══════════════════════════════════════════════════════════

export function getCurrentDuty(room: Room): Participant | null {
  if (!room || !room.participants || room.participants.length === 0) return null;
  if (!room.dutyHistory || room.dutyHistory.length === 0) return room.participants[0];

  const today = new Date().toISOString().slice(0, 10);
  const todayDuty = room.dutyHistory.find(d => d.date === today);
  if (todayDuty) {
    return room.participants.find(p => p.userId === todayDuty.userId) || room.participants[0];
  }

  const idx = room.dutyHistory.length % room.participants.length;
  return room.participants[idx];
}

export async function setDuty(roomId: string, userId: string) {
  const room = await getRoom(roomId);
  if (!room) return;
  
  const today = new Date().toISOString().slice(0, 10);
  const existing = room.dutyHistory.findIndex(d => d.date === today);
  const entry = { userId, date: today };
  
  if (existing >= 0) {
    room.dutyHistory[existing] = entry;
  } else {
    room.dutyHistory.unshift(entry);
  }
  
  await saveRoom(room);
}

// ═══════════════════════════════════════════════════════════
// 팀 후보집 (savedPlaces)
// ═══════════════════════════════════════════════════════════

export async function getSavedPlaces(roomId: string): Promise<Place[]> {
  const room = await getRoom(roomId);
  return room?.savedPlaces ?? [];
}

export async function addSavedPlace(roomId: string, place: Place) {
  console.log('⭐ addSavedPlace 호출:', { roomId, placeName: place.name });
  
  const room = await getRoom(roomId);
  if (!room) {
    console.error('❌ Room not found:', roomId);
    return;
  }
  if (!room.savedPlaces) room.savedPlaces = [];
  
  // 중복 방지
  if (room.savedPlaces.some(p => p.placeId === place.placeId || p.name === place.name)) {
    console.log('⚠️ 이미 후보집에 존재:', place.name);
    return;
  }
  
  console.log('📝 savedPlaces에 추가:', { before: room.savedPlaces.length });
  room.savedPlaces.push(place);
  console.log('📝 savedPlaces에 추가 후:', { after: room.savedPlaces.length });
  
  console.log('💾 saveRoom 호출 (후보집)');
  await saveRoom(room);  // saveRoom에서 undefined 제거 처리
  console.log('✅ 후보집 저장 완료');
}

export async function removeSavedPlace(roomId: string, placeId: string) {
  console.log('🗑️ removeSavedPlace 호출:', { roomId, placeId });
  
  const room = await getRoom(roomId);
  if (!room) {
    console.error('❌ Room not found:', roomId);
    return;
  }
  
  const before = room.savedPlaces?.length ?? 0;
  room.savedPlaces = (room.savedPlaces ?? []).filter(p => p.placeId !== placeId);
  const after = room.savedPlaces.length;
  
  console.log('📝 savedPlaces에서 삭제:', { before, after });
  
  console.log('💾 saveRoom 호출 (후보집 삭제)');
  await saveRoom(room);
  console.log('✅ 후보집 삭제 완료');
}

export async function updateSavedPlace(roomId: string, place: Place) {
  const room = await getRoom(roomId);
  if (!room) return;
  
  const idx = (room.savedPlaces ?? []).findIndex(p => p.placeId === place.placeId);
  if (idx >= 0) {
    room.savedPlaces[idx] = place;
    await saveRoom(room);
  }
}

// ═══════════════════════════════════════════════════════════
// 부방장
// ═══════════════════════════════════════════════════════════

export async function setSubHost(roomId: string, userId: string, isSubHost: boolean) {
  const room = await getRoom(roomId);
  if (!room) return;
  
  const idx = room.participants.findIndex(p => p.userId === userId);
  if (idx >= 0) {
    room.participants[idx] = { ...room.participants[idx], isSubHost };
    await saveRoom(room);
  }
}

// ═══════════════════════════════════════════════════════════
// 가게 메모 + 메뉴
// ═══════════════════════════════════════════════════════════

export async function getPlaceNote(
  roomId: string,
  placeId: string
): Promise<import('./types').PlaceNote | null> {
  const room = await getRoom(roomId);
  if (!room) return null;
  return room.placeNotes?.[placeId] ?? null;
}

export async function updatePlaceNote(
  roomId: string,
  placeId: string,
  note: import('./types').PlaceNote
): Promise<void> {
  const room = await getRoom(roomId);
  if (!room) return;
  
  if (!room.placeNotes) room.placeNotes = {};
  room.placeNotes[placeId] = note;
  await saveRoom(room);
}

// ═══════════════════════════════════════════════════════════
// 채팅 (Firebase)
// ═══════════════════════════════════════════════════════════

export async function sendChatMessage(roomId: string, text: string): Promise<boolean> {
  const user = getOrCreateUser();
  if (!user.nickname) return false;
  
  const msg: ChatMessage = {
    messageId: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    roomId,
    userId: user.userId,
    nickname: user.nickname,
    text: text.trim(),
    createdAt: new Date().toISOString(),
    type: 'text',
  };
  
  await firebaseApi.addChatMessage(roomId, msg);
  return true;
}

export async function sendLunchCard(
  roomId: string,
  card: NonNullable<ChatMessage['lunchCard']>
): Promise<boolean> {
  const user = getOrCreateUser();
  if (!user.nickname) return false;
  
  // Firebase는 undefined를 허용하지 않으므로 undefined 속성 제거
  const cleanCard: any = {
    placeName: card.placeName,
    category: card.category,
    mapUrl: card.mapUrl,
  };
  if (card.address !== undefined) cleanCard.address = card.address;
  if (card.rating !== undefined) cleanCard.rating = card.rating;
  if (card.priceRange !== undefined) cleanCard.priceRange = card.priceRange;
  
  const msg: ChatMessage = {
    messageId: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    roomId,
    userId: user.userId,
    nickname: user.nickname,
    text: `🍱 오늘의 점심: ${card.placeName}`,
    createdAt: new Date().toISOString(),
    type: 'lunch-card',
    lunchCard: cleanCard,
  };
  
  await firebaseApi.addChatMessage(roomId, msg);
  return true;
}

export async function sendSettlementCard(
  roomId: string,
  card: NonNullable<ChatMessage['settlementCard']>
): Promise<boolean> {
  const user = getOrCreateUser();
  if (!user.nickname) return false;
  
  const msg: ChatMessage = {
    messageId: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    roomId,
    userId: user.userId,
    nickname: user.nickname,
    text: `💳 정산 공유: ${card.totalAmount.toLocaleString()}원 / ${card.headcount}명`,
    createdAt: new Date().toISOString(),
    type: 'settlement-card',
    settlementCard: card,
  };
  
  await firebaseApi.addChatMessage(roomId, msg);
  return true;
}

export async function sendVoteCard(
  roomId: string,
  question: string,
  options: string[]
): Promise<boolean> {
  const user = getOrCreateUser();
  if (!user.nickname) return false;
  
  const msg: ChatMessage = {
    messageId: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    roomId,
    userId: user.userId,
    nickname: user.nickname,
    text: `📊 투표: ${question}`,
    createdAt: new Date().toISOString(),
    type: 'vote-card',
    voteCard: { question, options, votes: {} },
  };
  
  await firebaseApi.addChatMessage(roomId, msg);
  return true;
}

export async function castVote(roomId: string, messageId: string, optionIndex: number): Promise<void> {
  const room = await getRoom(roomId);
  if (!room || !room.chatMessages) return;
  
  const user = getOrCreateUser();
  const idx = room.chatMessages.findIndex(m => m.messageId === messageId);
  if (idx < 0 || !room.chatMessages[idx].voteCard) return;
  
  room.chatMessages[idx].voteCard!.votes[user.userId] = optionIndex;
  await saveRoom(room);
}

export async function getChatMessages(roomId: string): Promise<ChatMessage[]> {
  const room = await getRoom(roomId);
  return room?.chatMessages ?? [];
}

// ═══════════════════════════════════════════════════════════
// 강퇴
// ═══════════════════════════════════════════════════════════

export async function kickParticipant(roomId: string, targetUserId: string) {
  const room = await getRoom(roomId);
  if (!room) return;
  
  room.participants = room.participants.filter(p => p.userId !== targetUserId);
  await saveRoom(room);
  await firebaseApi.removeUserRoom(targetUserId, roomId);
}

/** 방 나가기 */
export async function leaveRoom(roomId: string, userId: string): Promise<void> {
  const room = await getRoom(roomId);
  if (!room) return;
  const remaining = room.participants.filter(p => p.userId !== userId);
  if (remaining.length === 0) return;
  const wasHost = room.hostUserId === userId;
  room.participants = remaining.map((p, i) => ({
    ...p,
    isHost: wasHost ? i === 0 : p.isHost,
    isSubHost: wasHost ? false : p.isSubHost,
  }));
  if (wasHost) room.hostUserId = remaining[0].userId;
  await saveRoom(room);
  await firebaseApi.removeUserRoom(userId, roomId);
}

/** 방 삭제 (소프트 삭제, 7일 이내 되돌리기 가능) */
export async function deleteRoom(roomId: string, deletedByUserId: string): Promise<void> {
  await firebaseApi.softDeleteRoom(roomId, deletedByUserId);
}

/** 삭제된 방 복원 */
export async function restoreRoom(roomId: string, userId: string): Promise<Room | null> {
  return await firebaseApi.restoreRoom(roomId, userId);
}

/** 일주일 이내 삭제된 방 목록 */
export async function getDeletedRooms(userId: string): Promise<Array<{ room: Room; deletedAt: string }>> {
  return await firebaseApi.getDeletedRooms(userId);
}

// ═══════════════════════════════════════════════════════════
// 사용자 프로필
// ═══════════════════════════════════════════════════════════

/** 사용자 프로필 조회 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  return await firebaseApi.getUserProfile(userId);
}

/** 사용자 프로필 업데이트 */
export async function updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<void> {
  await firebaseApi.updateUserProfile(userId, updates);
}

/** 내 계좌 정보 저장 */
export async function saveMyAccountInfo(userId: string, accountInfo: AccountInfo): Promise<void> {
  await firebaseApi.updateUserProfile(userId, { myAccountInfo: accountInfo });
}

/** 다른 멤버 계좌 정보 저장 */
export async function saveMemberAccountInfo(
  myUserId: string,
  memberUserId: string,
  accountInfo: AccountInfo
): Promise<void> {
  const profile = await getUserProfile(myUserId) || {
    userId: myUserId,
    nickname: getSession()?.nickname || '',
  };
  
  if (!profile.savedMemberAccounts) {
    profile.savedMemberAccounts = {};
  }
  
  profile.savedMemberAccounts[memberUserId] = accountInfo;
  await firebaseApi.saveUserProfile(profile);
}

/** 저장된 멤버 계좌 정보 가져오기 */
export async function getSavedMemberAccountInfo(
  myUserId: string,
  memberUserId: string
): Promise<AccountInfo | null> {
  const profile = await getUserProfile(myUserId);
  return profile?.savedMemberAccounts?.[memberUserId] || null;
}

// ═══════════════════════════════════════════════════════════
// 실시간 구독 (옵션)
// ═══════════════════════════════════════════════════════════

export function subscribeToRoom(roomId: string, callback: (room: Room | null) => void): () => void {
  return firebaseApi.subscribeToRoom(roomId, callback);
}

export function subscribeToChatMessages(
  roomId: string,
  callback: (messages: ChatMessage[]) => void
): () => void {
  return firebaseApi.subscribeToChatMessages(roomId, callback);
}
