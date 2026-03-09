/**
 * Supabase Edge Function for Kakao API proxy
 * Firebase Realtime Database로 완전 전환 완료 (2026-03-05)
 * 카카오 API 호출은 서버를 통해 처리
 */

declare const Deno: {
  serve: (handler: (req: Request) => Response | Promise<Response>) => void;
  env: { get: (key: string) => string | undefined };
};

// @ts-expect-error - npm: specifier (Deno runtime)
import { Hono } from "npm:hono";
// @ts-expect-error - npm: specifier (Deno runtime)
import { cors } from "npm:hono/cors";
// @ts-expect-error - npm: specifier (Deno runtime)
import { logger } from "npm:hono/logger";

const app = new Hono();

app.use("/*", cors({ origin: "*" }));
app.use("*", logger(console.log));

const KAKAO_API_KEY = Deno.env.get("KAKAO_REST_API_KEY");

// Supabase 호출 시 pathname = /functions/v1/server/kakao/address 형태로 전달됨
const R = (path: string) => [
  path,
  `/make-server-1ea16583${path}`,
  `/functions/v1/server${path}`,
];

// Health check
for (const p of ["/health", "/make-server-1ea16583/health", "/functions/v1/server/health"]) {
  app.get(p, (c) => c.json({ status: "ok", message: "Server is running with Kakao API proxy support." }));
}

// 주소 검색 API
const addressHandler = async (c: any) => {
  try {
    const query = c.req.query("query");
    if (!query) {
      return c.json({ error: "query parameter is required" }, 400);
    }

    // 1) 키워드 검색 + 2) 주소 검색 병렬 호출
    const [keywordRes, addressRes] = await Promise.allSettled([
      fetch(
        `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(query)}&size=5`,
        { headers: { Authorization: `KakaoAK ${KAKAO_API_KEY}` } }
      ),
      fetch(
        `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(query)}&size=5`,
        { headers: { Authorization: `KakaoAK ${KAKAO_API_KEY}` } }
      ),
    ]);

    const combined: any[] = [];

    // 키워드 검색 결과 처리
    if (keywordRes.status === "fulfilled" && keywordRes.value.ok) {
      const data = await keywordRes.value.json();
      for (const doc of (data.documents || [])) {
        if (!doc.place_name) continue; // place_name 없으면 건너뜀
        combined.push({
          type: "place",
          label: doc.place_name,
          address: doc.road_address_name || doc.address_name || "",
          lat: parseFloat(doc.y),
          lng: parseFloat(doc.x),
          place_name: doc.place_name,
          address_name: doc.road_address_name || doc.address_name || "",
        });
      }
    }

    // 주소 검색 결과 처리 (중복 제거)
    if (addressRes.status === "fulfilled" && addressRes.value.ok) {
      const data = await addressRes.value.json();
      for (const doc of (data.documents || [])) {
        const roadAddr = doc.road_address?.address_name || "";
        const jibunAddr = doc.address?.address_name || doc.address_name || "";
        const buildingName = doc.road_address?.building_name || "";
        const label = buildingName
          ? `${buildingName} (${roadAddr || jibunAddr})`
          : roadAddr || jibunAddr;

        if (!label) continue;

        // 중복 체크 (같은 좌표 또는 같은 label)
        const lat = parseFloat(doc.y);
        const lng = parseFloat(doc.x);
        const isDup = combined.some(
          (r) => Math.abs(r.lat - lat) < 0.0001 && Math.abs(r.lng - lng) < 0.0001
        );
        if (isDup) continue;

        combined.push({
          type: "address",
          label,
          address: roadAddr || jibunAddr,
          lat,
          lng,
          place_name: label,
          address_name: roadAddr || jibunAddr,
        });
      }
    }

    if (combined.length === 0) {
      console.log(`[kakao/address] No results for query: "${query}"`);
    }

    return c.json({ results: combined });
  } catch (error) {
    console.error("Address search error:", error);
    return c.json({ error: "주소 검색 실패", details: String(error) }, 500);
  }
};
for (const p of R("/kakao/address")) app.get(p, addressHandler);

// 주변 음식점 검색 API
const placesHandler = async (c: any) => {
  try {
    const lat = c.req.query("lat");
    const lng = c.req.query("lng");
    const radius = c.req.query("radius") || "1000";
    const categories = c.req.query("categories")?.split(",") || [];

    if (!lat || !lng) {
      return c.json({ error: "lat and lng parameters are required" }, 400);
    }

    // 카테고리별 검색 (프론트엔드 Category: KOR, CHN, JPN, WESTERN, SNACK, BAR, OTHER)
    const categoryKeywords: Record<string, string> = {
      KOR: "한식",
      CHN: "중식",
      JPN: "일식",
      WESTERN: "양식",
      SNACK: "분식",
      BAR: "술집",
      OTHER: "아시안",
      korean: "한식",
      chinese: "중식",
      japanese: "일식",
      western: "양식",
      asian: "아시안",
      snack: "분식",
      bar: "술집",
      cafe: "카페",
      etc: "음식점",
    };
    
    // 카테고리별 필터 키워드 (category_name에 포함되어야 하는 키워드)
    const categoryFilters: Record<string, string[]> = {
      KOR: ["한식", "한정식", "국밥", "찌개", "전골", "고기", "삼겹살", "갈비", "비빔밥", "도시락", "죽", "냉면", "국수"],
      CHN: ["중식", "중국", "짜장", "짬뽕", "탕수육"],
      JPN: ["일식", "일본", "초밥", "스시", "라멘", "돈까스", "우동", "소바"],
      WESTERN: ["양식", "스테이크", "파스타", "피자", "이탈리안", "레스토랑"],
      SNACK: ["분식", "떡볶이", "김밥", "라면", "튀김", "순대", "돈가스", "분식점"],
      BAR: ["술집", "주점", "포차", "호프", "요리주점", "이자카야", "와인바", "맥주"],
      OTHER: ["아시안", "베트남", "태국", "인도", "쌀국수", "월남쌈", "팟타이", "카레"],
      korean: ["한식", "한정식", "국밥", "찌개", "전골", "고기", "삼겹살", "갈비", "비빔밥"],
      chinese: ["중식", "중국", "짜장", "짬뽕", "탕수육"],
      japanese: ["일식", "일본", "초밥", "스시", "라멘", "돈까스", "우동", "소바"],
      western: ["양식", "스테이크", "파스타", "피자", "이탈리안", "레스토랑"],
      asian: ["아시안", "베트남", "태국", "인도", "쌀국수", "월남쌈", "팟타이", "카레"],
      snack: ["분식", "떡볶이", "김밥", "라면", "튀김", "순대", "돈가스"],
      bar: ["술집", "주점", "포차", "호프", "요리주점", "이자카야", "와인바", "맥주"],
      cafe: ["카페", "커피", "디저트", "베이커리", "빵"],
      etc: [],
    };

    const allPlaces: any[] = [];
    const searchPromises = categories.length > 0
      ? categories.map((cat) => categoryKeywords[cat] || "음식점")
      : ["음식점"];
    
    const selectedCategories = categories.length > 0 ? categories : ["etc"];

    for (let i = 0; i < searchPromises.length; i++) {
      const keyword = searchPromises[i];
      const category = selectedCategories[i];
      const response = await fetch(
        `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(keyword)}&x=${lng}&y=${lat}&radius=${radius}&size=15&category_group_code=FD6`,
        {
          headers: {
            Authorization: `KakaoAK ${KAKAO_API_KEY}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        const documents = data.documents || [];
        
        // 카테고리 필터링
        const filters = categoryFilters[category] || [];
        const filtered = filters.length > 0
          ? documents.filter((doc: any) => {
              const categoryName = (doc.category_name || "").toLowerCase();
              return filters.some(f => categoryName.includes(f.toLowerCase()));
            })
          : documents;
        
        allPlaces.push(...filtered);
      }
    }

    // 중복 제거 및 변환
    const uniquePlaces = Array.from(
      new Map(allPlaces.map((p) => [p.id, p])).values()
    );

    const places = uniquePlaces.map((doc: any) => ({
      id: doc.id,
      kakaoId: doc.id,
      name: doc.place_name,
      address: doc.address_name || doc.road_address_name,
      lat: parseFloat(doc.y),
      lng: parseFloat(doc.x),
      category: doc.category_name,
      phone: doc.phone || "",
      placeUrl: doc.place_url || "",
      distance: doc.distance ? parseInt(doc.distance) : 0,
    }));

    return c.json({ places });
  } catch (error) {
    console.error("Places search error:", error);
    return c.json({ error: "음식점 검색 실패", details: String(error) }, 500);
  }
};
for (const p of R("/kakao/places")) app.get(p, placesHandler);

// 장소 상세 정보 API (메뉴, 가격)
const placeDetailHandler = async (c: any) => {
  try {
    const id = c.req.query("id");
    if (!id) {
      return c.json({ error: "id parameter is required" }, 400);
    }

    // 카카오 로컬 API는 메뉴 정보를 제공하지 않으므로 빈 배열 반환
    // 실제 메뉴 정보는 다른 API나 크롤링을 통해 가져와야 함
    return c.json({
      menus: [],
      priceRange: null,
    });
  } catch (error) {
    console.error("Place detail error:", error);
    return c.json({ error: "장소 상세 조회 실패", details: String(error) }, 500);
  }
};
for (const p of R("/kakao/place-detail")) app.get(p, placeDetailHandler);

// 404: 수신된 경로 반환 (디버깅용)
app.all("*", (c) => {
  const path = new URL(c.req.url).pathname;
  return c.json({ error: "Not found", path, hint: "경로가 맞는지 확인하세요" }, 404);
});

Deno.serve(app.fetch);