/**
 * 로컬 실행용 카카오 API 프록시 서버
 * 실행: node server.js (또는 npm run dev)
 * 환경변수: KAKAO_REST_API_KEY (.env 또는 터미널에서 설정)
 */
import http from "node:http";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { readFileSync, existsSync } from "node:fs";

const PORT = process.env.PORT || 3001;

// .env 파일 로드 (선택)
function loadEnv() {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const envPath = join(__dirname, ".env");
  if (existsSync(envPath)) {
    const content = readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (m && !process.env[m[1].trim()]) {
        process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
      }
    }
  }
}
loadEnv();

const CORS = { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" };

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
  chinese: ["중식", "중국", "짜장", "짬뽕", "탕수육"],
  japanese: ["일식", "일본", "초밥", "스시", "라멘", "돈까스", "우동", "소바"],
  western: ["양식", "스테이크", "파스타", "피자", "이탈리안", "레스토랑"],
  asian: ["아시안", "베트남", "태국", "인도", "쌀국수", "월남쌈", "팟타이", "카레"],
  snack: ["분식", "떡볶이", "김밥", "라면", "튀김", "순대", "돈가스"],
  bar: ["술집", "주점", "포차", "호프", "요리주점", "이자카야", "와인바", "맥주"],
  cafe: ["카페", "커피", "디저트", "베이커리", "빵"],
  etc: [],
};

async function handleAddress(query) {
  const key = process.env.KAKAO_REST_API_KEY;
  if (!key) return { error: "KAKAO_REST_API_KEY not configured" };

  const [keywordRes, addressRes] = await Promise.allSettled([
    fetch(`https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(query)}&size=5`, { headers: { Authorization: `KakaoAK ${key}` } }),
    fetch(`https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(query)}&size=5`, { headers: { Authorization: `KakaoAK ${key}` } }),
  ]);

  const combined = [];
  if (keywordRes.status === "fulfilled" && keywordRes.value.ok) {
    const data = await keywordRes.value.json();
    for (const doc of data.documents || []) {
      if (!doc.place_name) continue;
      combined.push({ type: "place", label: doc.place_name, address: doc.road_address_name || doc.address_name || "", lat: parseFloat(doc.y), lng: parseFloat(doc.x), place_name: doc.place_name, address_name: doc.road_address_name || doc.address_name || "" });
    }
  }
  if (addressRes.status === "fulfilled" && addressRes.value.ok) {
    const data = await addressRes.value.json();
    for (const doc of data.documents || []) {
      const roadAddr = doc.road_address?.address_name || "";
      const jibunAddr = doc.address?.address_name || doc.address_name || "";
      const buildingName = doc.road_address?.building_name || "";
      const label = buildingName ? `${buildingName} (${roadAddr || jibunAddr})` : roadAddr || jibunAddr;
      if (!label) continue;
      const lat = parseFloat(doc.y), lng = parseFloat(doc.x);
      const isDup = combined.some((r) => Math.abs(r.lat - lat) < 0.0001 && Math.abs(r.lng - lng) < 0.0001);
      if (isDup) continue;
      combined.push({ type: "address", label, address: roadAddr || jibunAddr, lat, lng, place_name: label, address_name: roadAddr || jibunAddr });
    }
  }
  return { results: combined };
}

async function handlePlaces(lat, lng, radius, categories) {
  const key = process.env.KAKAO_REST_API_KEY;
  if (!key) return { error: "KAKAO_REST_API_KEY not configured" };

  const searchKeywords = categories.length > 0 ? categories.map((c) => categoryKeywords[c] || "음식점") : ["음식점"];
  const selectedCats = categories.length > 0 ? categories : ["etc"];
  const allPlaces = [];

  for (let i = 0; i < searchKeywords.length; i++) {
    const keyword = searchKeywords[i], cat = selectedCats[i];
    const res = await fetch(`https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(keyword)}&x=${lng}&y=${lat}&radius=${radius}&size=15&category_group_code=FD6`, { headers: { Authorization: `KakaoAK ${key}` } });
    if (res.ok) {
      const data = await res.json();
      const docs = data.documents || [];
      const filters = categoryFilters[cat] || [];
      const filtered = filters.length > 0 ? docs.filter((d) => { const cn = (d.category_name || "").toLowerCase(); return filters.some((f) => cn.includes(f.toLowerCase())); }) : docs;
      allPlaces.push(...filtered);
    }
  }

  const unique = Array.from(new Map(allPlaces.map((p) => [p.id, p])).values());
  const places = unique.map((d) => ({
    id: d.id, kakaoId: d.id, name: d.place_name, address: d.address_name || d.road_address_name,
    lat: parseFloat(d.y), lng: parseFloat(d.x), category: d.category_name, phone: d.phone || "", placeUrl: d.place_url || "", distance: d.distance ? parseInt(d.distance) : 0,
  }));
  return { places };
}

function handlePlaceDetail() {
  return { menus: [], priceRange: null };
}

const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/json");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url || "/", `http://localhost:${PORT}`);
  let path = url.pathname;
  const q = url.searchParams;

  // Netlify Functions 경로도 지원 (프론트엔드와 동일한 URL 구조)
  if (path.startsWith("/.netlify/functions/")) {
    path = path.replace("/.netlify/functions/kakao-", "/kakao/");
  }

  try {
    if (path === "/kakao/address" && req.method === "GET") {
      const query = q.get("query");
      if (!query) {
        res.writeHead(400);
        return res.end(JSON.stringify({ error: "query parameter is required" }));
      }
      const data = await handleAddress(query);
      if (data.error) {
        res.writeHead(500);
        return res.end(JSON.stringify(data));
      }
      res.writeHead(200);
      return res.end(JSON.stringify(data));
    }

    if (path === "/kakao/places" && req.method === "GET") {
      const lat = q.get("lat"), lng = q.get("lng");
      if (!lat || !lng) {
        res.writeHead(400);
        return res.end(JSON.stringify({ error: "lat and lng parameters are required" }));
      }
      const radius = q.get("radius") || "1000";
      const categories = (q.get("categories") || "").split(",").filter(Boolean);
      const data = await handlePlaces(lat, lng, radius, categories);
      if (data.error) {
        res.writeHead(500);
        return res.end(JSON.stringify(data));
      }
      res.writeHead(200);
      return res.end(JSON.stringify(data));
    }

    if (path === "/kakao/place-detail" && req.method === "GET") {
      if (!q.get("id")) {
        res.writeHead(400);
        return res.end(JSON.stringify({ error: "id parameter is required" }));
      }
      res.writeHead(200);
      return res.end(JSON.stringify(handlePlaceDetail()));
    }

    if (path === "/" || path === "/health") {
      res.writeHead(200);
      return res.end(JSON.stringify({ status: "ok", message: "LunchPick API (로컬)" }));
    }

    res.writeHead(404);
    res.end(JSON.stringify({ error: "Not found", path }));
  } catch (err) {
    console.error(err);
    res.writeHead(500);
    res.end(JSON.stringify({ error: String(err) }));
  }
});

server.listen(PORT, () => {
  console.log(`LunchPick API 서버: http://localhost:${PORT}`);
  console.log(`  - GET /kakao/address?query=검색어`);
  console.log(`  - GET /kakao/places?lat=&lng=&radius=&categories=`);
  console.log(`  - GET /kakao/place-detail?id=`);
  if (!process.env.KAKAO_REST_API_KEY) console.warn("  ⚠ KAKAO_REST_API_KEY 환경변수가 없습니다. .env 파일을 확인하세요.");
});
