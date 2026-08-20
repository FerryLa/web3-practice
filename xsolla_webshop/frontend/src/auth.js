const TOKEN_KEY = "xsolla_webshop_access_token";

function readParams(value) {
  return new URLSearchParams(value.replace(/^[?#]/, ""));
}

export function readAuthCallback(url = window.location.href) {
  const parsedUrl = new URL(url);
  const query = readParams(parsedUrl.search);
  const hash = readParams(parsedUrl.hash);
  const getValue = (name) => query.get(name) ?? hash.get(name);

  return {
    token: getValue("token") ?? getValue("access_token"),
    error: getValue("error"),
    errorDescription: getValue("error_description"),
  };
}

export function saveToken(token) {
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function getToken() {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function clearToken() {
  sessionStorage.removeItem(TOKEN_KEY);
}

export async function verifyTokenWithBackend(
  token,
  apiUrl,
  { signal, fetchImpl = fetch } = {},
) {
  const response = await fetchImpl(new URL("/api/auth/verify", apiUrl), {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    signal,
  });

  let body;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok || body?.authenticated !== true) {
    const error = new Error(
      body?.error?.message || `JWT 검증 API가 HTTP ${response.status}를 반환했습니다.`,
    );
    error.code = body?.error?.code || "verification_failed";
    throw error;
  }

  return body;
}

export function decodeJwtPayload(token) {
  try {
    const [, payload] = token.split(".");
    if (!payload) return null;

    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const bytes = Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
}

export function isExpired(token, now = Date.now()) {
  const payload = decodeJwtPayload(token);
  return typeof payload?.exp === "number" && payload.exp * 1000 <= now;
}

export function getTokenSummary(token) {
  const payload = decodeJwtPayload(token);
  if (!payload) return null;

  return {
    subject: payload.sub ?? payload.user_id ?? "확인 불가",
    expiresAt:
      typeof payload.exp === "number"
        ? new Intl.DateTimeFormat("ko-KR", {
            dateStyle: "medium",
            timeStyle: "short",
          }).format(new Date(payload.exp * 1000))
        : "표시되지 않음",
  };
}
