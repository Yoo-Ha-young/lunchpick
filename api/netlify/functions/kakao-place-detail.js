/**
 * Netlify Function: 장소 상세 (메뉴·가격)
 * 카카오 로컬 API는 메뉴 정보를 제공하지 않아 빈 값 반환
 */
export async function handler(event) {
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }
  const id = event.queryStringParameters?.id;
  if (!id) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "id parameter is required" }),
    };
  }
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    body: JSON.stringify({ menus: [], priceRange: null }),
  };
}
