import http from "node:http";

const PORT = 3178;
const CATALOG_URL =
  "https://store.xsolla.com/api/v2/project/312439/items/virtual_currency/package?limit=50&offset=0&locale=ko&country=KR";
const MEMBER_SKU = "bluc_pack_member_1200";

const server = http.createServer(async (request, response) => {
  const requestUrl = new URL(request.url, `http://127.0.0.1:${PORT}`);

  if (requestUrl.pathname !== "/auth/callback") {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  const token = requestUrl.searchParams.get("token");
  if (!token) {
    response.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("JWT token is missing.");
    return;
  }

  try {
    const catalogResponse = await fetch(CATALOG_URL, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const catalog = await catalogResponse.json();
    const items = Array.isArray(catalog.items) ? catalog.items : [];
    const memberItem = items.find((item) => item.sku === MEMBER_SKU);
    const result = {
      testedAt: new Date().toISOString(),
      httpStatus: catalogResponse.status,
      itemCount: items.length,
      memberSku: MEMBER_SKU,
      memberItemVisible: Boolean(memberItem),
      memberItem: memberItem
        ? {
            sku: memberItem.sku,
            name: memberItem.name,
            price: memberItem.price,
            virtualPrices: memberItem.virtual_prices,
            canBeBought: memberItem.can_be_bought,
          }
        : null,
    };

    response.writeHead(200, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
    });
    response.end(JSON.stringify(result, null, 2));
  } catch (error) {
    response.writeHead(502, { "Content-Type": "application/json; charset=utf-8" });
    response.end(JSON.stringify({ error: String(error.message) }));
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`JWT callback test: http://localhost:${PORT}/auth/callback`);
});
