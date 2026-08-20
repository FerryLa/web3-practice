import { createPublicKey, verify as verifySignature } from "node:crypto";
import { AuthError, AuthServiceError } from "./errors.js";

const DEFAULT_ISSUER = "https://login.xsolla.com";
const DEFAULT_JWKS_TTL_MS = 5 * 60 * 1000;

function decodeJsonSegment(segment, label) {
  try {
    return JSON.parse(Buffer.from(segment, "base64url").toString("utf8"));
  } catch (cause) {
    throw new AuthError("malformed_token", `${label} 형식이 올바르지 않습니다.`, { cause });
  }
}

export function parseJwt(token) {
  if (typeof token !== "string") {
    throw new AuthError("missing_token", "Bearer JWT가 필요합니다.");
  }

  const parts = token.split(".");
  if (parts.length !== 3 || parts.some((part) => !part)) {
    throw new AuthError("malformed_token", "JWT는 세 부분으로 구성되어야 합니다.");
  }

  return {
    header: decodeJsonSegment(parts[0], "JWT 헤더"),
    payload: decodeJsonSegment(parts[1], "JWT 페이로드"),
    signingInput: `${parts[0]}.${parts[1]}`,
    signature: Buffer.from(parts[2], "base64url"),
  };
}

function validateClaims(payload, { projectId, issuer, audience, now, clockToleranceSeconds }) {
  const nowSeconds = Math.floor(now() / 1000);

  if (payload.iss !== issuer) {
    throw new AuthError("invalid_issuer", "JWT 발급자가 Xsolla Login이 아닙니다.");
  }
  if (typeof payload.exp !== "number" || payload.exp <= nowSeconds - clockToleranceSeconds) {
    throw new AuthError("expired_token", "JWT가 만료되었습니다.");
  }
  if (typeof payload.iat !== "number" || payload.iat > nowSeconds + clockToleranceSeconds) {
    throw new AuthError("invalid_issued_at", "JWT 발급 시간이 올바르지 않습니다.");
  }
  if (typeof payload.nbf === "number" && payload.nbf > nowSeconds + clockToleranceSeconds) {
    throw new AuthError("token_not_active", "JWT를 아직 사용할 수 없습니다.");
  }
  if (typeof payload.sub !== "string" || !payload.sub) {
    throw new AuthError("invalid_subject", "JWT 사용자 ID가 없습니다.");
  }
  if (payload.xsolla_login_project_id !== projectId) {
    throw new AuthError("invalid_project", "JWT의 Login Project ID가 일치하지 않습니다.");
  }

  if (audience) {
    const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
    if (!audiences.includes(audience)) {
      throw new AuthError("invalid_audience", "JWT 대상이 일치하지 않습니다.");
    }
  }
}

export function createJwksClient({
  projectId,
  fetchImpl = fetch,
  ttlMs = DEFAULT_JWKS_TTL_MS,
  now = Date.now,
  baseUrl = "https://login.xsolla.com/api",
}) {
  const jwksUrl = `${baseUrl}/projects/${encodeURIComponent(projectId)}/jwks.json`;
  let cachedKeys = [];
  let expiresAt = 0;

  async function refresh() {
    let response;
    try {
      response = await fetchImpl(jwksUrl, { headers: { Accept: "application/json" } });
    } catch (cause) {
      throw new AuthServiceError("jwks_unavailable", "Xsolla 공개 키를 가져오지 못했습니다.", {
        cause,
      });
    }

    if (!response.ok) {
      throw new AuthServiceError(
        "jwks_unavailable",
        `Xsolla 공개 키 요청이 HTTP ${response.status}로 실패했습니다.`,
      );
    }

    let body;
    try {
      body = await response.json();
    } catch (cause) {
      throw new AuthServiceError("invalid_jwks", "Xsolla 공개 키 응답을 읽지 못했습니다.", {
        cause,
      });
    }

    if (!Array.isArray(body?.keys)) {
      throw new AuthServiceError("invalid_jwks", "Xsolla 공개 키 응답에 keys 배열이 없습니다.");
    }

    cachedKeys = body.keys;
    expiresAt = now() + ttlMs;
  }

  return {
    async get(kid) {
      if (!cachedKeys.length || expiresAt <= now()) await refresh();

      let jwk = cachedKeys.find((candidate) => candidate.kid === kid);
      if (!jwk) {
        await refresh();
        jwk = cachedKeys.find((candidate) => candidate.kid === kid);
      }

      if (!jwk || jwk.kty !== "RSA" || (jwk.alg && jwk.alg !== "RS256") || jwk.use === "enc") {
        throw new AuthError("unknown_signing_key", "JWT 서명 키를 찾을 수 없습니다.");
      }
      return jwk;
    },
  };
}

export function createXsollaJwtVerifier({
  projectId,
  issuer = DEFAULT_ISSUER,
  audience,
  fetchImpl = fetch,
  now = Date.now,
  clockToleranceSeconds = 5,
  jwksClient = createJwksClient({ projectId, fetchImpl, now }),
}) {
  return async function verifyXsollaJwt(token) {
    const parsed = parseJwt(token);

    if (parsed.header.alg !== "RS256") {
      throw new AuthError("invalid_algorithm", "RS256으로 서명된 JWT만 허용합니다.");
    }
    if (typeof parsed.header.kid !== "string" || !parsed.header.kid) {
      throw new AuthError("missing_key_id", "JWT 헤더에 kid가 없습니다.");
    }

    const jwk = await jwksClient.get(parsed.header.kid);
    let publicKey;
    try {
      publicKey = createPublicKey({ key: jwk, format: "jwk" });
    } catch (cause) {
      throw new AuthServiceError("invalid_jwks", "Xsolla 공개 키를 사용할 수 없습니다.", {
        cause,
      });
    }

    const validSignature = verifySignature(
      "RSA-SHA256",
      Buffer.from(parsed.signingInput),
      publicKey,
      parsed.signature,
    );
    if (!validSignature) {
      throw new AuthError("invalid_signature", "JWT 서명이 올바르지 않습니다.");
    }

    validateClaims(parsed.payload, {
      projectId,
      issuer,
      audience,
      now,
      clockToleranceSeconds,
    });
    return parsed.payload;
  };
}

export async function validateUserWithXsolla(token, { fetchImpl = fetch } = {}) {
  let response;
  try {
    response = await fetchImpl("https://login.xsolla.com/api/token/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ token }),
    });
  } catch (cause) {
    throw new AuthServiceError("validation_unavailable", "Xsolla 사용자 검증 API에 연결하지 못했습니다.", {
      cause,
    });
  }

  if (response.status === 204) return;
  if (response.status === 429 || response.status >= 500) {
    throw new AuthServiceError(
      "validation_unavailable",
      `Xsolla 사용자 검증 API가 HTTP ${response.status}를 반환했습니다.`,
    );
  }
  throw new AuthError("invalid_user_token", "Xsolla가 사용자 JWT를 거부했습니다.");
}
