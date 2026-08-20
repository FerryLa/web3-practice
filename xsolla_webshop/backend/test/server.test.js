import assert from "node:assert/strict";
import test from "node:test";
import { AuthError } from "../src/errors.js";
import { createAuthServer } from "../src/server.js";

async function startServer(options) {
  const server = createAuthServer(options);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  return {
    url: `http://127.0.0.1:${address.port}`,
    close: () => new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve()))),
  };
}

const payload = {
  iss: "https://login.xsolla.com",
  sub: "user-id",
  iat: 100,
  exp: 200,
  xsolla_login_project_id: "project-id",
};

test("returns verified user data without echoing the JWT", async (t) => {
  const app = await startServer({
    verifyToken: async (token) => {
      assert.equal(token, "valid.jwt.token");
      return payload;
    },
    allowedOrigins: ["http://localhost:3000"],
  });
  t.after(app.close);

  const response = await fetch(`${app.url}/api/auth/verify`, {
    method: "POST",
    headers: {
      Authorization: "Bearer valid.jwt.token",
      Origin: "http://localhost:3000",
    },
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("access-control-allow-origin"), "http://localhost:3000");
  assert.equal(body.authenticated, true);
  assert.equal(body.user.id, "user-id");
  assert.equal(JSON.stringify(body).includes("valid.jwt.token"), false);
});

test("returns 401 when the Bearer token is missing", async (t) => {
  const app = await startServer({ verifyToken: async () => payload });
  t.after(app.close);

  const response = await fetch(`${app.url}/api/auth/verify`, { method: "POST" });
  const body = await response.json();

  assert.equal(response.status, 401);
  assert.equal(body.authenticated, false);
  assert.equal(body.error.code, "missing_token");
});

test("returns 401 for an invalid JWT", async (t) => {
  const app = await startServer({
    verifyToken: async () => {
      throw new AuthError("invalid_signature", "JWT 서명이 올바르지 않습니다.");
    },
  });
  t.after(app.close);

  const response = await fetch(`${app.url}/api/auth/verify`, {
    method: "POST",
    headers: { Authorization: "Bearer invalid.jwt.token" },
  });
  const body = await response.json();

  assert.equal(response.status, 401);
  assert.equal(body.error.code, "invalid_signature");
});

test("rejects browser requests from an unconfigured origin", async (t) => {
  const app = await startServer({
    verifyToken: async () => payload,
    allowedOrigins: ["http://localhost:3000"],
  });
  t.after(app.close);

  const response = await fetch(`${app.url}/api/auth/verify`, {
    method: "POST",
    headers: {
      Authorization: "Bearer valid.jwt.token",
      Origin: "https://attacker.example",
    },
  });

  assert.equal(response.status, 403);
});
