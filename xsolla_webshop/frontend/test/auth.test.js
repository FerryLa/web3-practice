import assert from "node:assert/strict";
import test from "node:test";
import {
  decodeJwtPayload,
  isExpired,
  readAuthCallback,
  verifyTokenWithBackend,
} from "../src/auth.js";

function createToken(payload) {
  const encode = (value) =>
    Buffer.from(JSON.stringify(value))
      .toString("base64url");

  return `${encode({ alg: "none", typ: "JWT" })}.${encode(payload)}.test-signature`;
}

test("query string의 token을 읽는다", () => {
  const result = readAuthCallback("http://localhost:3000/auth/callback?token=query-token");
  assert.equal(result.token, "query-token");
});

test("URL fragment의 access_token과 오류를 읽는다", () => {
  const tokenResult = readAuthCallback(
    "http://localhost:3000/auth/callback#access_token=fragment-token",
  );
  const errorResult = readAuthCallback(
    "http://localhost:3000/auth/error?error=access_denied&error_description=cancelled",
  );

  assert.equal(tokenResult.token, "fragment-token");
  assert.deepEqual(errorResult, {
    token: null,
    error: "access_denied",
    errorDescription: "cancelled",
  });
});

test("JWT payload를 디코딩하고 만료를 판별한다", () => {
  const validToken = createToken({ sub: "user-1", exp: 2_000_000_000 });
  const expiredToken = createToken({ sub: "user-2", exp: 1_000_000_000 });

  assert.deepEqual(decodeJwtPayload(validToken), { sub: "user-1", exp: 2_000_000_000 });
  assert.equal(isExpired(validToken, 1_500_000_000_000), false);
  assert.equal(isExpired(expiredToken, 1_500_000_000_000), true);
});

test("잘못된 JWT는 payload가 없는 것으로 처리한다", () => {
  assert.equal(decodeJwtPayload("not-a-jwt"), null);
  assert.equal(isExpired("not-a-jwt"), false);
});

test("백엔드 검증 API에 Bearer JWT를 전달한다", async () => {
  const result = await verifyTokenWithBackend("header.payload.signature", "http://localhost:3001", {
    fetchImpl: async (url, options) => {
      assert.equal(url.href, "http://localhost:3001/api/auth/verify");
      assert.equal(options.method, "POST");
      assert.equal(options.headers.Authorization, "Bearer header.payload.signature");
      return new Response(JSON.stringify({ authenticated: true, user: { id: "user-id" } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    },
  });

  assert.equal(result.user.id, "user-id");
});
