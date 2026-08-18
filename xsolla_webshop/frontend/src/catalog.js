const MEMBER_SKU = "bluc_pack_member_1200";

export async function fetchCatalog({ projectId, token, signal }) {
  const url = new URL(
    `https://store.xsolla.com/api/v2/project/${encodeURIComponent(projectId)}/items/virtual_currency/package`,
  );
  url.search = new URLSearchParams({
    limit: "50",
    offset: "0",
    locale: "ko",
    country: "KR",
  });

  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const response = await fetch(url, { headers, signal });

  let body;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    const message = body?.error?.message ?? body?.message ?? `HTTP ${response.status}`;
    throw new Error(message);
  }

  return Array.isArray(body?.items) ? body.items : [];
}

export function normalizeItem(item) {
  const quantity = Number(item.content?.[0]?.quantity ?? 0);
  const amount = Number(item.price?.amount ?? 0);

  return {
    sku: item.sku,
    name: item.name,
    description: item.description || "BLUC 충전 패키지",
    imageUrl: item.image_url,
    quantity,
    price: new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: item.price?.currency || "USD",
    }).format(amount),
    available: item.can_be_bought !== false,
    memberOnly: item.sku === MEMBER_SKU,
  };
}

export function sortItems(items) {
  return [...items].sort(
    (left, right) =>
      Number(left.content?.[0]?.quantity ?? 0) - Number(right.content?.[0]?.quantity ?? 0),
  );
}

export { MEMBER_SKU };
