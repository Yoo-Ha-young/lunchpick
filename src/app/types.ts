export type Category = 'KOR' | 'CHN' | 'JPN' | 'WESTERN' | 'SNACK' | 'BAR' | 'OTHER';
export type PriceTier = 'cheap' | 'normal' | 'special';

export const PRICE_TIER_LABEL: Record<PriceTier, string> = {
  cheap: '저렴',
  normal: '보통',
  special: '고급',
};

export const PRICE_TIER_RANGE: Record<PriceTier, string> = {
  cheap: '~12,000원',
  normal: '12,000~22,000원',
  special: '22,000원~',
};

export const PRICE_TIER_EMOJI: Record<PriceTier, string> = {
  cheap: '💰',
  normal: '💰💰',
  special: '💰💰💰',
};

export const PRICE_TIER_COLOR: Record<PriceTier, string> = {
  cheap:   'bg-green-50 text-green-700 border-green-200',
  normal:  'bg-amber-50 text-amber-700 border-amber-200',
  special: 'bg-red-50 text-red-600 border-red-200',
};

/** priceRange 문자열에서 최대 금액 파싱 → PriceTier 반환 */
export function parsePriceTier(priceRange?: string): PriceTier | null {
  if (!priceRange) return null;
  const nums = priceRange.match(/[\d,]+/g);
  if (!nums) return null;
  const values = nums.map(n => parseInt(n.replace(/,/g, ''), 10)).filter(n => !isNaN(n));
  const max = Math.max(...values);
  if (max < 12000) return 'cheap';
  if (max < 22000) return 'normal';
  return 'special';
}

export const CATEGORY_LABEL: Record<Category, string> = {
  KOR: '한식',
  CHN: '중식',
  JPN: '일식',
  WESTERN: '양식',
  SNACK: '분식',
  BAR: '술집',
  OTHER: '기타',
};

export const CATEGORY_EMOJI: Record<Category, string> = {
  KOR: '🍚',
  CHN: '🥢',
  JPN: '🍣',
  WESTERN: '🍝',
  SNACK: '🍢',
  BAR: '🍺',
  OTHER: '🍽️',
};

/** 메뉴 아이템 (이름 + 가격) */
export interface MenuItem {
  name: string;
  price?: string;
}

/** 방 단위 가게 메모 + 메뉴 (영구 저장) */
export interface PlaceNote {
  memo?: string;
  menuItems?: MenuItem[];
}

export interface Place {
  placeId: string;
  name: string;
  category: Category;
  categoryDetail: string;
  address: string;
  lat: number;
  lng: number;
  distanceMeters: number;
  phone?: string;
  rating?: number;
  reviewCount?: number;
  isOpen?: boolean;
  priceRange?: string;
  representativeMenu?: string[];
  menuItems?: MenuItem[];
  kakaoUrl?: string;
  placeLink?: string;
  isManual?: boolean;
}

export interface PickHistory {
  placeId: string;
  placeName: string;
  pickedAt: string;
  pickedByUserId?: string;
  visited?: boolean;
  visitedAt?: string;
  category?: Category;
  address?: string;
}

export interface Participant {
  userId: string;
  nickname: string;
  joinedAt: string;
  isHost: boolean;
  isSubHost?: boolean;   // 부방장
}

export interface DutyEntry {
  userId: string;
  date: string;
}

export interface SettlementParticipant {
  userId: string;
  nickname: string;
  amount: number;
  paid: boolean;
}

export interface AccountInfo {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
}

export interface Settlement {
  settlementId: string;
  totalAmount: number;
  participants: SettlementParticipant[];
  roundingRule: 'floor' | 'ceil' | 'round';
  createdAt: string;
  status: 'open' | 'closed';
  memo?: string;
  accountInfo?: AccountInfo;
  /** 정산 대상 음식점 (이 방문 정산 시 연결) */
  placeName?: string;
  placeId?: string;
  pickedAt?: string;
}

export interface RoomSettings {
  baseLocation: {
    lat: number;
    lng: number;
    label: string;
    address: string;
  } | null;
  radiusMeters: number;
  categories: Category[];
  categoryFilter?: Category[];
  excludeRecentDays: number;
  excludeEnabled: boolean;
  rouletteHostOnly: boolean;
  priceFilter: PriceTier[];
}

// ─────────────────────────────────────────────────────────
// 채팅 메시지
// ─────────────────────────────────────────────────────────
export interface ChatMessage {
  messageId: string;
  roomId: string;
  userId: string;
  nickname: string;
  text: string;
  createdAt: string;
  type: 'text' | 'system' | 'lunch-card' | 'settlement-card' | 'vote-card';
  /** 오늘의 점심 카드 데이터 */
  lunchCard?: {
    placeName: string;
    category: string;
    address?: string;
    rating?: number;
    priceRange?: string;
    mapUrl: string;
  };
  /** 정산 공유 카드 데이터 */
  settlementCard?: {
    totalAmount: number;
    perPerson: number;
    headcount: number;
    memo?: string;
    bankName?: string;
    accountNumber?: string;
    accountHolder?: string;
  };
  /** 투표 카드 데이터 */
  voteCard?: {
    question: string;
    options: string[];
    votes: Record<string, number>; // userId → optionIndex
  };
}

/** 사용자 프로필 (개인 정보) */
export interface UserProfile {
  userId: string;
  nickname: string;
  /** 내 정산 계좌 정보 */
  myAccountInfo?: AccountInfo;
  /** 다른 멤버들의 계좌 정보 (userId → AccountInfo) */
  savedMemberAccounts?: Record<string, AccountInfo>;
  /** 저장된 주소록 */
  savedAddresses?: {
    work?: { label: string; address: string; lat: number; lng: number; };
    home?: { label: string; address: string; lat: number; lng: number; };
    other?: { label: string; address: string; lat: number; lng: number; };
  };
}

export interface Room {
  roomId: string;
  name: string;
  hostUserId: string;
  createdAt: string;
  expiresAt: string;
  settings: RoomSettings;
  participants: Participant[];
  todayPick: Place | null;
  pickHistory: PickHistory[];
  dutyHistory: DutyEntry[];
  settlements: Settlement[];
  savedPlaces: Place[];
  placeNotes?: Record<string, PlaceNote>;   // placeId → 메모+메뉴 (영구)
  chatMessages?: ChatMessage[];
}