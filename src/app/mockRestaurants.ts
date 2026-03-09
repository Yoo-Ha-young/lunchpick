import { Place, Category } from './types';

interface MockRestaurant {
  name: string;
  category: Category;
  categoryDetail: string;
  latOffset: number;
  lngOffset: number;
  phone?: string;
  rating: number;
  reviewCount: number;
  isOpen: boolean;
  priceRange: string;
  representativeMenu: string[];
}

const MOCK_DATA: MockRestaurant[] = [
  // 한식
  { name: '한솥도시락 강남점', category: 'KOR', categoryDetail: '한식/도시락', latOffset: 0.0012, lngOffset: 0.0008, rating: 4.1, reviewCount: 234, isOpen: true, priceRange: '5,000~8,000원', representativeMenu: ['제육도시락', '치킨마요'] },
  { name: '본죽 역삼점', category: 'KOR', categoryDetail: '한식/죽', latOffset: -0.0005, lngOffset: 0.0015, rating: 4.3, reviewCount: 187, isOpen: true, priceRange: '7,000~11,000원', representativeMenu: ['전복죽', '소고기죽', '버섯야채죽'] },
  { name: '놀부부대찌개 강남직영점', category: 'KOR', categoryDetail: '한식/찌개', latOffset: 0.0021, lngOffset: -0.0011, rating: 4.5, reviewCount: 521, isOpen: true, priceRange: '9,000~15,000원', representativeMenu: ['부대찌개', '김치찌개'] },
  { name: '육쌈냉면', category: 'KOR', categoryDetail: '한식/냉면', latOffset: -0.0018, lngOffset: 0.0022, rating: 4.6, reviewCount: 892, isOpen: true, priceRange: '12,000~18,000원', representativeMenu: ['물냉면', '비빔냉면', '수육'] },
  { name: '빽다방&빽버거', category: 'SNACK', categoryDetail: '분식/떡볶이', latOffset: 0.0009, lngOffset: -0.0019, rating: 3.9, reviewCount: 145, isOpen: true, priceRange: '4,000~8,000원', representativeMenu: ['빽버거', '떡볶이', '순대'] },
  { name: '삼원가든', category: 'KOR', categoryDetail: '한식/갈비', latOffset: -0.0033, lngOffset: 0.0004, rating: 4.7, reviewCount: 1203, isOpen: true, priceRange: '25,000~50,000원', representativeMenu: ['LA갈비', '꽃등심', '냉면'] },
  { name: '김밥천국 강남점', category: 'SNACK', categoryDetail: '분식/김밥', latOffset: 0.0003, lngOffset: 0.0031, rating: 3.8, reviewCount: 89, isOpen: true, priceRange: '3,000~8,000원', representativeMenu: ['참치김밥', '라면', '돈가스'] },
  { name: '역전할머니맥주', category: 'KOR', categoryDetail: '한식/치킨', latOffset: 0.0025, lngOffset: 0.0007, rating: 4.2, reviewCount: 367, isOpen: true, priceRange: '8,000~15,000원', representativeMenu: ['후라이드치킨', '양념치킨'] },
  { name: '순대국밥 강남본점', category: 'KOR', categoryDetail: '한식/국밥', latOffset: -0.0041, lngOffset: -0.0015, rating: 4.4, reviewCount: 623, isOpen: false, priceRange: '8,000~12,000원', representativeMenu: ['순대국밥', '내장탕'] },
  { name: '제주 고기국수', category: 'KOR', categoryDetail: '한식/국수', latOffset: 0.0016, lngOffset: -0.0038, rating: 4.5, reviewCount: 789, isOpen: true, priceRange: '9,000~13,000원', representativeMenu: ['고기국수', '비빔국수'] },
  { name: '찜닭 나라', category: 'KOR', categoryDetail: '한식/찜닭', latOffset: -0.0009, lngOffset: -0.0028, rating: 4.3, reviewCount: 412, isOpen: true, priceRange: '10,000~16,000원', representativeMenu: ['간장찜닭', '매운찜닭'] },
  { name: '황금보리 쌈밥', category: 'KOR', categoryDetail: '한식/쌈밥', latOffset: 0.0037, lngOffset: 0.0021, rating: 4.1, reviewCount: 234, isOpen: true, priceRange: '11,000~16,000원', representativeMenu: ['쌈밥정식', '보쌈'] },

  // 중식
  { name: '진진 차이나 레스토랑', category: 'CHN', categoryDetail: '중식/중화요리', latOffset: -0.0014, lngOffset: 0.0011, rating: 4.6, reviewCount: 934, isOpen: true, priceRange: '15,000~35,000원', representativeMenu: ['탕수육', '깐풍기', '마파두부'] },
  { name: '홍보각 강남점', category: 'CHN', categoryDetail: '중식/중화요리', latOffset: 0.0006, lngOffset: -0.0025, rating: 4.4, reviewCount: 567, isOpen: true, priceRange: '12,000~28,000원', representativeMenu: ['짜장면', '짬뽕', '탕수육'] },
  { name: '차이나팰리스', category: 'CHN', categoryDetail: '중식/딤섬', latOffset: 0.0019, lngOffset: 0.0034, rating: 4.5, reviewCount: 421, isOpen: true, priceRange: '18,000~40,000원', representativeMenu: ['딤섬', '하가우', '차슈바오'] },
  { name: '명동교자 짜장면', category: 'CHN', categoryDetail: '중식/짜장·짬뽕', latOffset: -0.0028, lngOffset: -0.0008, rating: 4.2, reviewCount: 678, isOpen: true, priceRange: '8,000~14,000원', representativeMenu: ['짜장면', '짬뽕', '볶음밥'] },
  { name: '탕후루&마라탕 강남', category: 'CHN', categoryDetail: '중식/마라탕', latOffset: 0.0042, lngOffset: -0.0033, rating: 4.0, reviewCount: 189, isOpen: true, priceRange: '12,000~20,000원', representativeMenu: ['마라탕', '마라샹궈', '탕후루'] },
  { name: '쿵파오 차이니즈', category: 'CHN', categoryDetail: '중식/중화요리', latOffset: -0.0022, lngOffset: 0.0039, rating: 4.3, reviewCount: 302, isOpen: false, priceRange: '13,000~22,000원', representativeMenu: ['쿵파오치킨', '마파두부'] },

  // 일식
  { name: '스시로 강남점', category: 'JPN', categoryDetail: '일식/초밥', latOffset: 0.0011, lngOffset: -0.0014, rating: 4.3, reviewCount: 1456, isOpen: true, priceRange: '15,000~30,000원', representativeMenu: ['연어초밥', '참치초밥', '새우초밥'] },
  { name: '온센 라멘', category: 'JPN', categoryDetail: '일식/라멘', latOffset: -0.0007, lngOffset: 0.0027, rating: 4.6, reviewCount: 892, isOpen: true, priceRange: '11,000~16,000원', representativeMenu: ['돈코츠라멘', '미소라멘', '차슈덮밥'] },
  { name: '도쿄스시 역삼', category: 'JPN', categoryDetail: '일식/초밥', latOffset: 0.0034, lngOffset: 0.0013, rating: 4.4, reviewCount: 567, isOpen: true, priceRange: '18,000~45,000원', representativeMenu: ['오마카세', '스시모둠', '우나기'] },
  { name: '이치란 라멘', category: 'JPN', categoryDetail: '일식/라멘', latOffset: -0.0016, lngOffset: -0.0032, rating: 4.7, reviewCount: 2341, isOpen: true, priceRange: '13,000~18,000원', representativeMenu: ['원조라멘', '매운라멘', '반숙달걀추가'] },
  { name: '오코노미야키 강남', category: 'JPN', categoryDetail: '일식/오코노미야키', latOffset: 0.0028, lngOffset: -0.0007, rating: 4.2, reviewCount: 345, isOpen: true, priceRange: '10,000~18,000원', representativeMenu: ['오코노미야키', '야키소바', '타코야키'] },
  { name: '사케동 역삼점', category: 'JPN', categoryDetail: '일식/돈부리', latOffset: -0.0039, lngOffset: 0.0018, rating: 4.5, reviewCount: 678, isOpen: false, priceRange: '12,000~20,000원', representativeMenu: ['연어덮밥', '카츠동', '텐동'] },

  // 양식
  { name: '서브웨이 강남대로점', category: 'WESTERN', categoryDetail: '양식/샌드위치', latOffset: 0.0007, lngOffset: 0.0019, rating: 4.0, reviewCount: 412, isOpen: true, priceRange: '7,000~12,000원', representativeMenu: ['이탈리안BMT', '터키브레스트', '베지'] },
  { name: '맘스터치 강남역점', category: 'WESTERN', categoryDetail: '양식/버거', latOffset: -0.0024, lngOffset: -0.0041, rating: 4.1, reviewCount: 523, isOpen: true, priceRange: '6,000~12,000원', representativeMenu: ['싸이버거', '불싸이버거', '더블싸이'] },
  { name: '빕스 강남점', category: 'WESTERN', categoryDetail: '양식/패밀리레스토랑', latOffset: 0.0044, lngOffset: 0.0028, rating: 4.3, reviewCount: 789, isOpen: true, priceRange: '25,000~45,000원', representativeMenu: ['스테이크', '파스타', '샐러드바'] },
  { name: '피자알볼로 강남', category: 'WESTERN', categoryDetail: '양식/피자', latOffset: -0.0031, lngOffset: 0.0012, rating: 4.4, reviewCount: 456, isOpen: true, priceRange: '15,000~30,000원', representativeMenu: ['포테이토피자', '페퍼로니', '마르게리타'] },
  { name: '파스타 이탈리아노', category: 'WESTERN', categoryDetail: '양식/파스타', latOffset: 0.0018, lngOffset: -0.0044, rating: 4.5, reviewCount: 634, isOpen: true, priceRange: '13,000~22,000원', representativeMenu: ['까르보나라', '봉골레', '아라비아타'] },

  // 분식 (SNACK)
  { name: '엽기떡볶이 강남점', category: 'SNACK', categoryDetail: '분식/떡볶이', latOffset: 0.0022, lngOffset: -0.0012, rating: 4.4, reviewCount: 2341, isOpen: true, priceRange: '4,000~10,000원', representativeMenu: ['엽기떡볶이', '엽기오뎅', '참치마요'] },
  { name: '청년다방 강남역점', category: 'SNACK', categoryDetail: '분식/라면', latOffset: -0.0011, lngOffset: 0.0025, rating: 4.2, reviewCount: 567, isOpen: true, priceRange: '5,000~9,000원', representativeMenu: ['라면', '김밥', '튀김'] },
  { name: '두끼 강남점', category: 'SNACK', categoryDetail: '분식/떡볶이', latOffset: 0.0008, lngOffset: -0.0022, rating: 4.0, reviewCount: 892, isOpen: true, priceRange: '4,500~8,000원', representativeMenu: ['떡볶이', '순대', '튀김'] },
  { name: '신전떡볶이 역삼점', category: 'SNACK', categoryDetail: '분식/떡볶이', latOffset: -0.0025, lngOffset: 0.0018, rating: 4.5, reviewCount: 1234, isOpen: true, priceRange: '3,500~7,000원', representativeMenu: ['떡볶이', '순대', '오뎅'] },

  // 기타
  { name: '베트남 쌀국수 강남', category: 'OTHER', categoryDetail: '아시안/쌀국수', latOffset: -0.0013, lngOffset: 0.0035, rating: 4.3, reviewCount: 412, isOpen: true, priceRange: '9,000~14,000원', representativeMenu: ['소고기쌀국수', '해물쌀국수', '스프링롤'] },
  { name: '인도 카레 하우스', category: 'OTHER', categoryDetail: '아시안/카레', latOffset: 0.0031, lngOffset: -0.0021, rating: 4.4, reviewCount: 289, isOpen: true, priceRange: '11,000~18,000원', representativeMenu: ['버터치킨카레', '시금치카레', '난'] },
  { name: '태국 팟타이', category: 'OTHER', categoryDetail: '아시안/태국음식', latOffset: -0.0048, lngOffset: 0.0009, rating: 4.2, reviewCount: 234, isOpen: false, priceRange: '10,000~16,000원', representativeMenu: ['팟타이', '똠얌꿍', '카오팟'] },
];

function calcDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return Math.round(R * c);
}

export function fetchMockRestaurants(
  baseLat: number,
  baseLng: number,
  radiusMeters: number,
  categories: Category[]
): Place[] {
  return MOCK_DATA
    .filter(r => categories.includes(r.category))
    .map((r, i) => {
      const lat = baseLat + r.latOffset;
      const lng = baseLng + r.lngOffset;
      const distance = calcDistance(baseLat, baseLng, lat, lng);
      return {
        placeId: `mock_${i}_${r.name}`,
        name: r.name,
        category: r.category,
        categoryDetail: r.categoryDetail,
        address: `서울 강남구 테헤란로 ${100 + i * 7}`,
        lat,
        lng,
        distanceMeters: distance,
        phone: r.phone,
        rating: r.rating,
        reviewCount: r.reviewCount,
        isOpen: r.isOpen,
        priceRange: r.priceRange,
        representativeMenu: r.representativeMenu,
      };
    })
    .filter(r => r.distanceMeters <= radiusMeters)
    .sort((a, b) => a.distanceMeters - b.distanceMeters);
}