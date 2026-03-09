/**
 * Netlify Function: 카카오 주소/장소 검색 프록시
 * 환경변수: KAKAO_REST_API_KEY
 */
export async function handler(event) {
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }
  const query = event.queryStringParameters?.query;
  if (!query) {
    return { statusCode: 400, body: JSON.stringify({ error: "query parameter is required" }) };
  }

  const key = process.env.KAKAO_REST_API_KEY;
  if (!key) {
    return { statusCode: 500, body: JSON.stringify({ error: "KAKAO_REST_API_KEY not configured" }) };
  }

  try {
    const [keywordRes, addressRes] = await Promise.allSettled([
      fetch(
        `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(query)}&size=5`,
        { headers: { Authorization: `KakaoAK ${key}` } }
      ),
      fetch(
        `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(query)}&size=5`,
        { headers: { Authorization: `KakaoAK ${key}` } }
      ),
    ]);

    const combined = [];

    if (keywordRes.status === "fulfilled" && keywordRes.value.ok) {
      const data = await keywordRes.value.json();
      for (const doc of data.documents || []) {
        if (!doc.place_name) continue;
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

    if (addressRes.status === "fulfilled" && addressRes.value.ok) {
      const data = await addressRes.value.json();
      for (const doc of data.documents || []) {
        const roadAddr = doc.road_address?.address_name || "";
        const jibunAddr = doc.address?.address_name || doc.address_name || "";
        const buildingName = doc.road_address?.building_name || "";
        const label = buildingName
          ? `${buildingName} (${roadAddr || jibunAddr})`
          : roadAddr || jibunAddr;
        if (!label) continue;

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

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ results: combined }),
    };
  } catch (err) {
    console.error("kakao-address error:", err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "주소 검색 실패", details: String(err) }),
    };
  }
}
