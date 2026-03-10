import { Place, Category, CATEGORY_LABEL } from './types';

// API URL: 별도 배포한 API 사이트 (환경변수 VITE_API_URL)
// 예: https://nyamnyampick-server.netlify.app
const BASE_URL = import.meta.env.VITE_API_URL ?? '';

export interface AddressResult {
  type: 'address' | 'place';
  label: string;
  address: string;
  lat: number;
  lng: number;
  place_name: string;
  address_name: string;
}

/** 주소 자동완성 검색 */
export async function searchAddress(query: string): Promise<AddressResult[]> {
  if (!query.trim()) return [];
  const res = await fetch(
    `${BASE_URL}/.netlify/functions/kakao-address?query=${encodeURIComponent(query)}`
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? '주소 검색 실패');
  }
  const data = await res.json();
  return data.results ?? [];
}

/** 주변 음식점 검색 */
export async function fetchNearbyRestaurants(
  lat: number,
  lng: number,
  radiusMeters: number,
  categories: Category[]
): Promise<Place[]> {
  const res = await fetch(
    `${BASE_URL}/.netlify/functions/kakao-places?lat=${lat}&lng=${lng}&radius=${radiusMeters}&categories=${categories.join(',')}`
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? '음식점 검색 실패');
  }
  const data = await res.json();
  const raw = data.places ?? [];
  return raw.map((p: any) => toPlace(p));
}

/** API 응답 → Place 변환 */
function toPlace(p: any): Place {
  const cat = inferCategory(p.category);
  const catDetail = p.category || '';
  return {
    placeId: p.id || p.kakaoId || `kakao_${Date.now()}`,
    name: p.name || '',
    category: cat,
    categoryDetail: catDetail ? `${CATEGORY_LABEL[cat]}/${catDetail.split('>').pop()?.trim() || '음식점'}` : `${CATEGORY_LABEL[cat]}/음식점`,
    address: p.address || '',
    lat: p.lat ?? 0,
    lng: p.lng ?? 0,
    distanceMeters: p.distance ?? p.distanceMeters ?? 0,
    phone: p.phone || undefined,
    placeLink: p.placeUrl || undefined,
    kakaoUrl: p.placeUrl || undefined,
  };
}

function inferCategory(categoryName?: string): Category {
  if (!categoryName) return 'KOR';
  const s = (categoryName || '').toLowerCase();
  if (s.includes('중식') || s.includes('중국') || s.includes('짜장') || s.includes('짬뽕')) return 'CHN';
  if (s.includes('일식') || s.includes('일본') || s.includes('초밥') || s.includes('라멘') || s.includes('돈까스')) return 'JPN';
  if (s.includes('양식') || s.includes('스테이크') || s.includes('파스타') || s.includes('피자')) return 'WESTERN';
  if (s.includes('분식') || s.includes('떡볶이') || s.includes('김밥') || s.includes('라면')) return 'SNACK';
  if (s.includes('술집') || s.includes('주점') || s.includes('포차') || s.includes('호프')) return 'BAR';
  if (s.includes('베트남') || s.includes('태국') || s.includes('인도') || s.includes('아시안')) return 'OTHER';
  return 'KOR';
}

/** 장소 상세(메뉴·가격) 조회 — kakaoId는 숫자 문자열 */
export async function fetchPlaceDetail(kakaoId: string): Promise<{
  menus: string[];
  priceRange: string | null;
}> {
  const res = await fetch(
    `${BASE_URL}/.netlify/functions/kakao-place-detail?id=${kakaoId}`
  );
  if (!res.ok) return { menus: [], priceRange: null };
  const data = await res.json();
  return { menus: data.menus ?? [], priceRange: data.priceRange ?? null };
}