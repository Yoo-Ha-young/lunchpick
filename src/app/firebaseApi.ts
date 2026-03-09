/**
 * Firebase Realtime Database API with localStorage fallback
 * Firebase 미설정 시 localStorage로 자동 폴백
 */

import { database } from './firebaseConfig';
import { ref, set, get, update, remove, onValue, off, push } from 'firebase/database';
import type { Room, ChatMessage, UserProfile } from './types';

// Firebase 사용 가능 여부
const isFirebaseEnabled = database !== null;

// ═══════════════════════════════════════════════════════════
// localStorage 폴백 헬퍼
// ═══════════════════════════════════════════════════════════

function getFromLocalStorage<T>(key: string): T | null {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : null;
}

function saveToLocalStorage<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

function removeFromLocalStorage(key: string): void {
  localStorage.removeItem(key);
}

// ═══════════════════════════════════════════════════════════
// 계정 (Account)
// ═══════════════════════════════════════════════════════════

export interface UserAccount {
  userId: string;
  username: string;
  password: string;  // 실제 프로덕션에서는 해시 처리 필요
  nickname: string;
  createdAt: string;
}

/** 계정 생성 */
export async function createAccount(
  username: string,
  password: string,
  nickname: string
): Promise<{ success: boolean; userId?: string; error?: string }> {
  try {
    const key = username.trim().toLowerCase();
    if (!key) return { success: false, error: '아이디를 입력해 주세요.' };
    if (password.length < 4) return { success: false, error: '비밀번호는 4자 이상이어야 합니다.' };
    if (!nickname.trim()) return { success: false, error: '닉네임을 입력해 주세요.' };

    if (isFirebaseEnabled && database) {
      // Firebase 사용
      const accountRef = ref(database, `accounts/${key}`);
      const snapshot = await get(accountRef);
      if (snapshot.exists()) {
        return { success: false, error: '이미 사용 중인 아이디입니다.' };
      }

      const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const account: UserAccount = {
        userId,
        username: key,
        password,
        nickname: nickname.trim(),
        createdAt: new Date().toISOString(),
      };

      await set(accountRef, account);
      return { success: true, userId };
    } else {
      // localStorage 폴백
      const accounts = getFromLocalStorage<Record<string, UserAccount>>('accounts') || {};
      if (accounts[key]) {
        return { success: false, error: '이미 사용 중인 아이디입니다.' };
      }

      const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const account: UserAccount = {
        userId,
        username: key,
        password,
        nickname: nickname.trim(),
        createdAt: new Date().toISOString(),
      };

      accounts[key] = account;
      saveToLocalStorage('accounts', accounts);
      return { success: true, userId };
    }
  } catch (error) {
    console.error('createAccount error:', error);
    return { success: false, error: 'DB 저장 오류가 발생했습니다.' };
  }
}

/** 로그인 */
export async function loginAccount(
  username: string,
  password: string
): Promise<{ success: boolean; account?: UserAccount; error?: string }> {
  try {
    const key = username.trim().toLowerCase();

    if (isFirebaseEnabled && database) {
      // Firebase 사용
      const accountRef = ref(database, `accounts/${key}`);
      const snapshot = await get(accountRef);

      if (!snapshot.exists()) {
        return { success: false, error: '아이디가 존재하지 않습니다.' };
      }

      const account = snapshot.val() as UserAccount;
      if (account.password !== password) {
        return { success: false, error: '비밀번호가 틀렸습니다.' };
      }

      return { success: true, account };
    } else {
      // localStorage 폴백
      const accounts = getFromLocalStorage<Record<string, UserAccount>>('accounts') || {};
      const account = accounts[key];

      if (!account) {
        return { success: false, error: '아이디가 존재하지 않습니다.' };
      }

      if (account.password !== password) {
        return { success: false, error: '비밀번호가 틀렸습니다.' };
      }

      return { success: true, account };
    }
  } catch (error) {
    console.error('loginAccount error:', error);
    return { success: false, error: 'DB 조회 오류가 발생했습니다.' };
  }
}

// ═══════════════════════════════════════════════════════════
// Room CRUD
// ═══════════════════════════════════════════════════════════

// Firebase는 undefined 값을 허용하지 않으므로 제거하는 헬퍼 함수
function removeUndefined<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj.map(item => removeUndefined(item)) as T;
  }
  const cleaned: any = {};
  for (const key in obj) {
    if (obj[key] !== undefined) {
      cleaned[key] = removeUndefined(obj[key]);
    }
  }
  return cleaned as T;
}

/** Room 저장 */
export async function saveRoom(room: Room): Promise<void> {
  try {
    console.log('💾 saveRoom 시작:', { 
      roomId: room.roomId, 
      pickHistoryCount: room.pickHistory?.length || 0,
      savedPlacesCount: room.savedPlaces?.length || 0,
      todayPick: room.todayPick?.name,
      mode: isFirebaseEnabled ? 'Firebase' : 'localStorage'
    });
    
    if (isFirebaseEnabled && database) {
      const roomRef = ref(database, `rooms/${room.roomId}`);
      
      // pickHistory를 명시적으로 배열로 변환 (Firebase 배열 처리 이슈 방지)
      const roomToSave = {
        ...room,
        pickHistory: Array.isArray(room.pickHistory) ? [...room.pickHistory] : [],
        participants: Array.isArray(room.participants) ? [...room.participants] : [],
        chatMessages: Array.isArray(room.chatMessages) ? [...room.chatMessages] : [],
        savedPlaces: Array.isArray(room.savedPlaces) ? [...room.savedPlaces] : [],
        settlements: Array.isArray(room.settlements) ? [...room.settlements] : [],
        dutyHistory: Array.isArray(room.dutyHistory) ? [...room.dutyHistory] : [],
      };
      
      // Firebase에 저장하기 전에 undefined 값 제거
      const cleanedRoom = removeUndefined(roomToSave);
      
      await set(roomRef, cleanedRoom);
      console.log('✅ Firebase에 저장 완료');
      
      // 저장 직후 검증
      const snapshot = await get(roomRef);
      if (snapshot.exists()) {
        const saved = snapshot.val();
        console.log('🔍 저장 검증:', {
          pickHistoryCount: saved.pickHistory?.length || 0,
          pickHistoryIsArray: Array.isArray(saved.pickHistory),
          savedPlacesCount: saved.savedPlaces?.length || 0,
          savedPlacesIsArray: Array.isArray(saved.savedPlaces),
          firstPickHistory: saved.pickHistory?.[0],
          firstSavedPlace: saved.savedPlaces?.[0]?.name
        });
      }
    } else {
      const rooms = getFromLocalStorage<Record<string, Room>>('rooms') || {};
      rooms[room.roomId] = room;
      saveToLocalStorage('rooms', rooms);
      console.log('✅ localStorage에 저장 완료');
    }
  } catch (error) {
    console.error('❌ saveRoom error:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      code: (error as any)?.code,
      stack: error instanceof Error ? error.stack : undefined
    });
  }
}

/** Room 조회 */
export async function getRoom(roomId: string): Promise<Room | null> {
  try {
    if (isFirebaseEnabled && database) {
      const roomRef = ref(database, `rooms/${roomId}`);
      const snapshot = await get(roomRef);
      if (!snapshot.exists()) {
        console.log('📭 getRoom: room not found in Firebase');
        return null;
      }
      const room = snapshot.val() as Room;
      
      // 필수 속성 초기화 및 배열 변환 (Firebase가 배열을 객체로 저장하는 경우 대응)
      room.savedPlaces = Array.isArray(room.savedPlaces) 
        ? room.savedPlaces 
        : (room.savedPlaces ? Object.values(room.savedPlaces) : []);
      
      room.chatMessages = Array.isArray(room.chatMessages) 
        ? room.chatMessages 
        : (room.chatMessages ? Object.values(room.chatMessages) : []);
      
      room.participants = Array.isArray(room.participants) 
        ? room.participants 
        : (room.participants ? Object.values(room.participants) : []);
      
      room.pickHistory = Array.isArray(room.pickHistory) 
        ? room.pickHistory 
        : (room.pickHistory ? Object.values(room.pickHistory) : []);
      
      room.dutyHistory = Array.isArray(room.dutyHistory) 
        ? room.dutyHistory 
        : (room.dutyHistory ? Object.values(room.dutyHistory) : []);
      
      room.settlements = Array.isArray(room.settlements) 
        ? room.settlements 
        : (room.settlements ? Object.values(room.settlements) : []);
      
      if (!room.settings) {
        room.settings = {
          baseLocation: null,
          radiusMeters: 500,
          categories: ['KOR', 'CHN', 'JPN', 'WESTERN', 'SNACK', 'BAR', 'OTHER'],
          excludeRecentDays: 2,
          excludeEnabled: true,
          rouletteHostOnly: false,
          priceFilter: [],
        };
      }
      
      console.log('📥 getRoom from Firebase:', { 
        roomId, 
        pickHistoryCount: room.pickHistory.length,
        pickHistoryIsArray: Array.isArray(room.pickHistory),
        savedPlacesCount: room.savedPlaces.length,
        savedPlacesIsArray: Array.isArray(room.savedPlaces),
        todayPick: room.todayPick?.name 
      });
      return room;
    } else {
      const rooms = getFromLocalStorage<Record<string, Room>>('rooms') || {};
      const room = rooms[roomId];
      if (!room) {
        console.log('📭 getRoom: room not found in localStorage');
        return null;
      }
      
      // 필수 속성 초기화 및 배열 변환
      room.savedPlaces = Array.isArray(room.savedPlaces) 
        ? room.savedPlaces 
        : (room.savedPlaces ? Object.values(room.savedPlaces) : []);
      
      room.chatMessages = Array.isArray(room.chatMessages) 
        ? room.chatMessages 
        : (room.chatMessages ? Object.values(room.chatMessages) : []);
      
      room.participants = Array.isArray(room.participants) 
        ? room.participants 
        : (room.participants ? Object.values(room.participants) : []);
      
      room.pickHistory = Array.isArray(room.pickHistory) 
        ? room.pickHistory 
        : (room.pickHistory ? Object.values(room.pickHistory) : []);
      
      room.dutyHistory = Array.isArray(room.dutyHistory) 
        ? room.dutyHistory 
        : (room.dutyHistory ? Object.values(room.dutyHistory) : []);
      
      room.settlements = Array.isArray(room.settlements) 
        ? room.settlements 
        : (room.settlements ? Object.values(room.settlements) : []);
      
      if (!room.settings) {
        room.settings = {
          baseLocation: null,
          radiusMeters: 500,
          categories: ['KOR', 'CHN', 'JPN', 'WESTERN', 'SNACK', 'BAR', 'OTHER'],
          excludeRecentDays: 2,
          excludeEnabled: true,
          rouletteHostOnly: false,
          priceFilter: [],
        };
      }
      
      console.log('📥 getRoom from localStorage:', { 
        roomId, 
        pickHistoryCount: room.pickHistory.length,
        pickHistoryIsArray: Array.isArray(room.pickHistory),
        savedPlacesCount: room.savedPlaces.length,
        savedPlacesIsArray: Array.isArray(room.savedPlaces),
        todayPick: room.todayPick?.name 
      });
      return room;
    }
  } catch (error) {
    console.error('❌ getRoom error:', error);
    return null;
  }
}

/** Room 일부 업데이트 */
export async function updateRoom(roomId: string, updates: Partial<Room>): Promise<void> {
  try {
    if (isFirebaseEnabled && database) {
      const roomRef = ref(database, `rooms/${roomId}`);
      await update(roomRef, removeUndefined(updates));
    } else {
      const rooms = getFromLocalStorage<Record<string, Room>>('rooms') || {};
      if (rooms[roomId]) {
        rooms[roomId] = { ...rooms[roomId], ...updates };
        saveToLocalStorage('rooms', rooms);
      }
    }
  } catch (error) {
    console.error('updateRoom error:', error);
  }
}

/** 특정 장소의 방문 기록 제거 (최근 방문 제외 우회용) */
export async function removeVisitFromHistory(roomId: string, placeId: string): Promise<void> {
  try {
    const room = await getRoom(roomId);
    if (!room) return;

    // pickHistory에서 해당 placeId의 모든 방문 기록을 완전히 제거
    const updatedHistory = room.pickHistory.filter(h => h.placeId !== placeId);

    await updateRoom(roomId, { pickHistory: updatedHistory });
    console.log(`✅ ${placeId}의 방문 기록 ${room.pickHistory.length - updatedHistory.length}개 제거됨`);
  } catch (error) {
    console.error('removeVisitFromHistory error:', error);
  }
}

/** Room 삭제 (완전 삭제) */
export async function deleteRoom(roomId: string): Promise<void> {
  try {
    if (isFirebaseEnabled && database) {
      const roomRef = ref(database, `rooms/${roomId}`);
      await remove(roomRef);
    } else {
      const rooms = getFromLocalStorage<Record<string, Room>>('rooms') || {};
      delete rooms[roomId];
      saveToLocalStorage('rooms', rooms);
    }
  } catch (error) {
    console.error('deleteRoom error:', error);
  }
}

/** 삭제된 방 저장 구조 */
export interface DeletedRoomEntry {
  room: Room;
  deletedAt: string;
  deletedByUserId: string;
}

/** Room 소프트 삭제 (되돌리기 가능) */
export async function softDeleteRoom(roomId: string, deletedByUserId: string): Promise<void> {
  try {
    const room = await getRoom(roomId);
    if (!room) return;
    const entry: DeletedRoomEntry = { room, deletedAt: new Date().toISOString(), deletedByUserId };
    if (isFirebaseEnabled && database) {
      const deletedRef = ref(database, `deleted-rooms/${deletedByUserId}/${roomId}`);
      await set(deletedRef, entry);
      const roomRef = ref(database, `rooms/${roomId}`);
      await remove(roomRef);
    } else {
      const deleted = getFromLocalStorage<Record<string, Record<string, DeletedRoomEntry>>>('deleted-rooms') || {};
      if (!deleted[deletedByUserId]) deleted[deletedByUserId] = {};
      deleted[deletedByUserId][roomId] = entry;
      saveToLocalStorage('deleted-rooms', deleted);
      const rooms = getFromLocalStorage<Record<string, Room>>('rooms') || {};
      delete rooms[roomId];
      saveToLocalStorage('rooms', rooms);
    }
    for (const p of room.participants) {
      await removeUserRoom(p.userId, roomId);
    }
  } catch (error) {
    console.error('softDeleteRoom error:', error);
  }
}

/** 삭제된 방 복원 */
export async function restoreRoom(roomId: string, userId: string): Promise<Room | null> {
  try {
    let entry: DeletedRoomEntry | null = null;
    if (isFirebaseEnabled && database) {
      const deletedRef = ref(database, `deleted-rooms/${userId}/${roomId}`);
      const snapshot = await get(deletedRef);
      if (!snapshot.exists()) return null;
      entry = snapshot.val();
    } else {
      const deleted = getFromLocalStorage<Record<string, Record<string, DeletedRoomEntry>>>('deleted-rooms') || {};
      entry = deleted[userId]?.[roomId] || null;
    }
    if (!entry) return null;
    const room = entry.room;
    await saveRoom(room);
    for (const p of room.participants) {
      await addUserRoom(p.userId, roomId);
    }
    if (isFirebaseEnabled && database) {
      const deletedRef = ref(database, `deleted-rooms/${userId}/${roomId}`);
      await remove(deletedRef);
    } else {
      const deleted = getFromLocalStorage<Record<string, Record<string, DeletedRoomEntry>>>('deleted-rooms') || {};
      if (deleted[userId]) {
        delete deleted[userId][roomId];
        if (Object.keys(deleted[userId]).length === 0) delete deleted[userId];
        saveToLocalStorage('deleted-rooms', deleted);
      }
    }
    return room;
  } catch (error) {
    console.error('restoreRoom error:', error);
    return null;
  }
}

/** 일주일 이내 삭제된 방 목록 조회 */
export async function getDeletedRooms(userId: string): Promise<Array<{ room: Room; deletedAt: string }>> {
  try {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const results: Array<{ room: Room; deletedAt: string }> = [];
    if (isFirebaseEnabled && database) {
      const deletedRef = ref(database, `deleted-rooms/${userId}`);
      const snapshot = await get(deletedRef);
      if (!snapshot.exists()) return [];
      const data = snapshot.val();
      for (const roomId of Object.keys(data || {})) {
        const entry = data[roomId] as DeletedRoomEntry;
        if (entry?.deletedAt && new Date(entry.deletedAt) >= weekAgo) {
          results.push({ room: entry.room, deletedAt: entry.deletedAt });
        }
      }
    } else {
      const deleted = getFromLocalStorage<Record<string, Record<string, DeletedRoomEntry>>>('deleted-rooms') || {};
      const userDeleted = deleted[userId] || {};
      for (const roomId of Object.keys(userDeleted)) {
        const entry = userDeleted[roomId];
        if (entry?.deletedAt && new Date(entry.deletedAt) >= weekAgo) {
          results.push({ room: entry.room, deletedAt: entry.deletedAt });
        }
      }
    }
    return results.sort((a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime());
  } catch (error) {
    console.error('getDeletedRooms error:', error);
    return [];
  }
}

/** Room 실시간 리스너 등록 */
export function subscribeToRoom(
  roomId: string,
  callback: (room: Room | null) => void
): () => void {
  if (isFirebaseEnabled && database) {
    const roomRef = ref(database, `rooms/${roomId}`);
    const listener = onValue(roomRef, (snapshot) => {
      if (!snapshot.exists()) {
        callback(null);
        return;
      }
      const room = snapshot.val() as Room;
      
      // 필수 속성 초기화 및 배열 변환
      room.savedPlaces = Array.isArray(room.savedPlaces) 
        ? room.savedPlaces 
        : (room.savedPlaces ? Object.values(room.savedPlaces) : []);
      
      room.chatMessages = Array.isArray(room.chatMessages) 
        ? room.chatMessages 
        : (room.chatMessages ? Object.values(room.chatMessages) : []);
      
      room.participants = Array.isArray(room.participants) 
        ? room.participants 
        : (room.participants ? Object.values(room.participants) : []);
      
      room.pickHistory = Array.isArray(room.pickHistory) 
        ? room.pickHistory 
        : (room.pickHistory ? Object.values(room.pickHistory) : []);
      
      room.dutyHistory = Array.isArray(room.dutyHistory) 
        ? room.dutyHistory 
        : (room.dutyHistory ? Object.values(room.dutyHistory) : []);
      
      room.settlements = Array.isArray(room.settlements) 
        ? room.settlements 
        : (room.settlements ? Object.values(room.settlements) : []);
      
      if (!room.settings) {
        room.settings = {
          baseLocation: null,
          radiusMeters: 500,
          categories: ['KOR', 'CHN', 'JPN', 'WESTERN', 'SNACK', 'BAR', 'OTHER'],
          excludeRecentDays: 2,
          excludeEnabled: true,
          rouletteHostOnly: false,
          priceFilter: [],
        };
      }
      
      callback(room);
    });
    
    return () => off(roomRef, 'value', listener);
  } else {
    // localStorage 모드: 폴링으로 대체
    const interval = setInterval(() => {
      const rooms = getFromLocalStorage<Record<string, Room>>('rooms') || {};
      const room = rooms[roomId];
      if (room) {
        // 필수 속성 초기화 및 배열 변환
        room.savedPlaces = Array.isArray(room.savedPlaces) 
          ? room.savedPlaces 
          : (room.savedPlaces ? Object.values(room.savedPlaces) : []);
        
        room.chatMessages = Array.isArray(room.chatMessages) 
          ? room.chatMessages 
          : (room.chatMessages ? Object.values(room.chatMessages) : []);
        
        room.participants = Array.isArray(room.participants) 
          ? room.participants 
          : (room.participants ? Object.values(room.participants) : []);
        
        room.pickHistory = Array.isArray(room.pickHistory) 
          ? room.pickHistory 
          : (room.pickHistory ? Object.values(room.pickHistory) : []);
        
        room.dutyHistory = Array.isArray(room.dutyHistory) 
          ? room.dutyHistory 
          : (room.dutyHistory ? Object.values(room.dutyHistory) : []);
        
        room.settlements = Array.isArray(room.settlements) 
          ? room.settlements 
          : (room.settlements ? Object.values(room.settlements) : []);
        
        if (!room.settings) {
          room.settings = {
            baseLocation: null,
            radiusMeters: 500,
            categories: ['KOR', 'CHN', 'JPN', 'WESTERN', 'SNACK', 'BAR', 'OTHER'],
            excludeRecentDays: 2,
            excludeEnabled: true,
            rouletteHostOnly: false,
            priceFilter: [],
          };
        }
      }
      callback(room || null);
    }, 1000);

    return () => clearInterval(interval);
  }
}

// ═══════════════════════════════════════════════════════════
// User-Room 매핑
// ═══════════════════════════════════════════════════════════

/** 사용자가 속한 Room ID 목록 조회 */
export async function getUserRoomIds(userId: string): Promise<string[]> {
  try {
    if (isFirebaseEnabled && database) {
      const userRoomsRef = ref(database, `user-rooms/${userId}`);
      const snapshot = await get(userRoomsRef);
      if (!snapshot.exists()) return [];
      const data = snapshot.val();
      let roomIds: string[] = [];
      if (Array.isArray(data)) {
        roomIds = data;
      } else {
        roomIds = Object.values(data);
      }
      // 중복 제거
      return [...new Set(roomIds)];
    } else {
      const userRooms = getFromLocalStorage<Record<string, string[]>>('user-rooms') || {};
      const roomIds = userRooms[userId] || [];
      // 중복 제거
      return [...new Set(roomIds)];
    }
  } catch (error) {
    console.error('getUserRoomIds error:', error);
    return [];
  }
}

/** 사용자-Room 매핑 추가 */
export async function addUserRoom(userId: string, roomId: string): Promise<void> {
  try {
    if (isFirebaseEnabled && database) {
      const userRoomsRef = ref(database, `user-rooms/${userId}`);
      const snapshot = await get(userRoomsRef);
      let roomIds: string[] = [];
      
      if (snapshot.exists()) {
        const data = snapshot.val();
        roomIds = Array.isArray(data) ? data : Object.values(data);
      }
      
      if (!roomIds.includes(roomId)) {
        roomIds.push(roomId);
        await set(userRoomsRef, roomIds);
      }
    } else {
      const userRooms = getFromLocalStorage<Record<string, string[]>>('user-rooms') || {};
      if (!userRooms[userId]) userRooms[userId] = [];
      if (!userRooms[userId].includes(roomId)) {
        userRooms[userId].push(roomId);
        saveToLocalStorage('user-rooms', userRooms);
      }
    }
  } catch (error) {
    console.error('addUserRoom error:', error);
  }
}

/** 사용자-Room 매핑 제거 */
export async function removeUserRoom(userId: string, roomId: string): Promise<void> {
  try {
    if (isFirebaseEnabled && database) {
      const userRoomsRef = ref(database, `user-rooms/${userId}`);
      const snapshot = await get(userRoomsRef);
      
      if (snapshot.exists()) {
        const data = snapshot.val();
        let roomIds: string[] = Array.isArray(data) ? data : Object.values(data);
        roomIds = roomIds.filter(id => id !== roomId);
        await set(userRoomsRef, roomIds);
      }
    } else {
      const userRooms = getFromLocalStorage<Record<string, string[]>>('user-rooms') || {};
      if (userRooms[userId]) {
        userRooms[userId] = userRooms[userId].filter(id => id !== roomId);
        saveToLocalStorage('user-rooms', userRooms);
      }
    }
  } catch (error) {
    console.error('removeUserRoom error:', error);
  }
}

/** 사용자의 모든 Room 조회 */
export async function getUserRooms(userId: string): Promise<Room[]> {
  try {
    const roomIds = await getUserRoomIds(userId);
    const rooms: Room[] = [];
    
    for (const roomId of roomIds) {
      const room = await getRoom(roomId);
      if (room) rooms.push(room);
    }
    
    return rooms.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } catch (error) {
    console.error('getUserRooms error:', error);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════
// 사용자 프로필
// ═══════════════════════════════════════════════════════════

/** 사용자 프로필 조회 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    if (isFirebaseEnabled && database) {
      const profileRef = ref(database, `profiles/${userId}`);
      const snapshot = await get(profileRef);
      if (!snapshot.exists()) return null;
      return snapshot.val() as UserProfile;
    } else {
      const profiles = getFromLocalStorage<Record<string, UserProfile>>('profiles') || {};
      return profiles[userId] || null;
    }
  } catch (error) {
    console.error('getUserProfile error:', error);
    return null;
  }
}

/** 사용자 프로필 저장/업데이트 */
export async function saveUserProfile(profile: UserProfile): Promise<void> {
  try {
    if (isFirebaseEnabled && database) {
      const profileRef = ref(database, `profiles/${profile.userId}`);
      await set(profileRef, removeUndefined(profile));
    } else {
      const profiles = getFromLocalStorage<Record<string, UserProfile>>('profiles') || {};
      profiles[profile.userId] = profile;
      saveToLocalStorage('profiles', profiles);
    }
  } catch (error) {
    console.error('saveUserProfile error:', error);
  }
}

/** 사용자 프로필 일부 업데이트 */
export async function updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<void> {
  try {
    console.log('🔧 updateUserProfile 시작:', { userId, updates });
    
    if (isFirebaseEnabled && database) {
      const profileRef = ref(database, `profiles/${userId}`);
      // 먼저 프로필이 존재하는지 확인
      const snapshot = await get(profileRef);
      console.log('📊 기존 프로필 확인:', { exists: snapshot.exists() });
      
      if (snapshot.exists()) {
        // 프로필이 있으면 업데이트
        console.log('✏️ 기존 프로필 업데이트 중...');
        await update(profileRef, removeUndefined(updates));
        console.log('✅ 프로필 업데이트 완료');
      } else {
        // 프로필이 없으면 새로 생성
        console.log('🆕 새 프로필 생성 중...');
        const newProfile: UserProfile = {
          userId,
          nickname: updates.nickname || '',
          ...updates
        };
        await set(profileRef, removeUndefined(newProfile));
        console.log('✅ 새 프로필 생성 완료:', newProfile);
      }
      
      // 저장 검증
      const verifySnapshot = await get(profileRef);
      if (verifySnapshot.exists()) {
        console.log('🔍 저장 검증 성공:', verifySnapshot.val());
      } else {
        console.error('❌ 저장 검증 실패: 프로필이 저장되지 않았습니다');
      }
    } else {
      const profiles = getFromLocalStorage<Record<string, UserProfile>>('profiles') || {};
      if (!profiles[userId]) {
        // 프로필이 없으면 기본 프로필 생성
        profiles[userId] = {
          userId,
          nickname: updates.nickname || '',
        };
      }
      profiles[userId] = { ...profiles[userId], ...updates };
      saveToLocalStorage('profiles', profiles);
      console.log('✅ localStorage에 프로필 저장 완료');
    }
  } catch (error) {
    console.error('❌ updateUserProfile error:', error);
    
    // Firebase 권한 오류인 경우 친절한 안내
    if (error instanceof Error && error.message.includes('Permission denied')) {
      console.error(
        '\n🚨 Firebase 권한 오류 발생!\n' +
        '해결 방법:\n' +
        '1. https://console.firebase.google.com/ 접속\n' +
        '2. 프로젝트 선택: lunchpick-b993f\n' +
        '3. Realtime Database > 규칙 탭 이동\n' +
        '4. 다음 규칙 적용:\n' +
        '   {\n' +
        '     "rules": {\n' +
        '       ".read": true,\n' +
        '       ".write": true\n' +
        '     }\n' +
        '   }\n' +
        '5. "게시" 버튼 클릭\n' +
        '\n자세한 내용은 /FIREBASE_SECURITY_RULES.md 파일을 참고하세요.\n'
      );
    }
    
    throw error;
  }
}

// ═══════════════════════════════════════════════════════════
// 채팅 메시지
// ═══════════════════════════════════════════════════════════

/** 채팅 메시지 추가 */
export async function addChatMessage(roomId: string, message: ChatMessage): Promise<void> {
  try {
    const room = await getRoom(roomId);
    if (!room) return;
    
    if (!room.chatMessages) room.chatMessages = [];
    room.chatMessages.push(message);
    
    if (room.chatMessages.length > 500) {
      room.chatMessages = room.chatMessages.slice(-500);
    }
    
    await updateRoom(roomId, { chatMessages: room.chatMessages });
  } catch (error) {
    console.error('addChatMessage error:', error);
  }
}

/** 채팅 메시지 실시간 구독 */
export function subscribeToChatMessages(
  roomId: string,
  callback: (messages: ChatMessage[]) => void
): () => void {
  if (isFirebaseEnabled && database) {
    const messagesRef = ref(database, `rooms/${roomId}/chatMessages`);
    const listener = onValue(messagesRef, (snapshot) => {
      if (!snapshot.exists()) {
        callback([]);
        return;
      }
      const messages = snapshot.val();
      callback(Array.isArray(messages) ? messages : Object.values(messages));
    });
    
    return () => off(messagesRef, 'value', listener);
  } else {
    // localStorage 모드: 폴링
    const interval = setInterval(async () => {
      const room = await getRoom(roomId);
      callback(room?.chatMessages || []);
    }, 1000);

    return () => clearInterval(interval);
  }
}