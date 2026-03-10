/**
 * Netlify Function: 카카오 주변 음식점 검색 프록시
 * 환경변수: KAKAO_REST_API_KEY
 */
const categoryKeywords = {
  KOR: "한식", CHN: "중식", JPN: "일식", WESTERN: "양식", SNACK: "분식", BAR: "술집", OTHER: "아시안",
  korean: "한식", chinese: "중식", japanese: "일식", western: "양식", asian: "아시안", snack: "분식", bar: "술집", cafe: "카페", etc: "음식점",
};
const categoryFilters = {
  KOR: ["한식", "한정식", "국밥", "찌개", "전골", "고기", "삼겹살", "갈비", "비빔밥", "도시락", "죽", "냉면", "국수"],
  CHN: ["중식", "중국", "짜장", "짬뽕", "탕수육"],
  JPN: ["일식", "일본", "초밥", "스시", "라멘", "돈까스", "우동", "소바"],
  WESTERN: ["양식", "스테이크", "파스타", "피자", "이탈리안", "레스토랑"],
  SNACK: ["분식", "떡볶이", "김밥", "라면", "튀김", "순대", "돈가스", "분식점"],
  BAR: ["술집", "주점", "포차", "호프", "요리주점", "이자카야", "와인바", "맥주"],
  OTHER: ["아시안", "베트남", "태국", "인도", "쌀국수", "월남쌈", "팟타이", "카레"],
  korean: ["한식", "한정식", "국밥", "찌개", "전골", "고기", "삼겹살", "갈비", "비빔밥"],
  chinese: ["중식", "중국", "짜장", "짬뽕", "탕수육", "중국요리", "중국음식"],
  japanese: ["일식", "일본", "초밥", "스시", "라멘", "돈까스", "우동", "소바", "일본 음식", "일본 요리", "일본식라면", "초밥,롤", "일식집집"],
  western: ["양식", "스테이크", "파스타", "피자", "이탈리안", "레스토랑", "햄버거", "파파존스"],
  asian: ["아시안", "베트남", "태국", "인도", "쌀국수", "월남쌈", "팟타이", "카레"],
  snack: ["분식", "떡볶이", "김밥", "라면", "튀김", "순대", "돈가스"],
  bar: ["술집", "주점", "포차", "호프", "요리주점", "이자카야", "와인바", "맥주"],
  cafe: ["카페", "커피", "디저트", "베이커리", "빵"],
  etc: [],
};

export async function handler(event) {
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }
  const q = event.queryStringParameters || {};
  const lat = q.lat;
  const lng = q.lng;
  const radius = q.radius || "1000";
  const categories = (q.categories || "").split(",").filter(Boolean);

  if (!lat || !lng) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "lat and lng parameters are required" }),
    };
  }

  const key = process.env.KAKAO_REST_API_KEY;
  if (!key) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "KAKAO_REST_API_KEY not configured" }),
    };
  }

  try {
    const searchKeywords = categories.length > 0
      ? categories.map((c) => categoryKeywords[c] || "음식점")
      : ["음식점"];
    const selectedCats = categories.length > 0 ? categories : ["etc"];

    const allPlaces = [];
    for (let i = 0; i < searchKeywords.length; i++) {
      const keyword = searchKeywords[i];
      const cat = selectedCats[i];
      const res = await fetch(
        `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(keyword)}&x=${lng}&y=${lat}&radius=${radius}&size=15&category_group_code=FD6`,
        { headers: { Authorization: `KakaoAK ${key}` } }
      );
      if (res.ok) {
        const data = await res.json();
        const docs = data.documents || [];
        const filters = categoryFilters[cat] || [];
        const filtered = filters.length > 0
          ? docs.filter((d) => {
              const cn = (d.category_name || "").toLowerCase();
              return filters.some((f) => cn.includes(f.toLowerCase()));
            })
          : docs;
        allPlaces.push(...filtered);
      }
    }

    const unique = Array.from(new Map(allPlaces.map((p) => [p.id, p])).values());
    const places = unique.map((d) => ({
      id: d.id,
      kakaoId: d.id,
      name: d.place_name,
      address: d.address_name || d.road_address_name,
      lat: parseFloat(d.y),
      lng: parseFloat(d.x),
      category: d.category_name,
      phone: d.phone || "",
      placeUrl: d.place_url || "",
      distance: d.distance ? parseInt(d.distance) : 0,
    }));

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ places }),
    };
  } catch (err) {
    console.error("kakao-places error:", err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "음식점 검색 실패", details: String(err) }),
    };
  }
}
