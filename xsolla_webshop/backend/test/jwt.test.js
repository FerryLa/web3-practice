import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";
import test from "node:test";
import { AuthError } from "../src/errors.js";
import { createJwksClient, createXsollaJwtVerifier } from "../src/jwt.js";

const PROJECT_ID = "11111111-2222-4333-8444-555555555555";
const ISSUER = "https://login.xsolla.com";
const NOW_SECONDS = 2_000_000_000;

const { publicKey, privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const jwk = {
  ...publicKey.export({ format: "jwk" }),
  alg: "RS256",
  kid: "test-key",
  use: "sig",
};

function encode(value) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function createToken(payloadOverrides = {}, headerOverrides = {}) {
  const header = { alg: "RS256", typ: "JWT", kid: "test-key", ...headerOverrides };
  const payload = {
    iss: ISSUER,
    sub: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
    iat: NOW_SECONDS - 60,
    exp: NOW_SECONDS + 3600,
    xsolla_login_project_id: PROJECT_ID,
    ...payloadOverrides,
  };
  const signingInput = `${encode(header)}.${encode(payload)}`;
  const signature = sign("RSA-SHA256", Buffer.from(signingInput), privateKey).toString("base64url");
  return `${signingInput}.${signature}`;
}

function createVerifier(options = {}) {
  return createXsollaJwtVerifier({
    projectId: PROJECT_ID,
    now: () => NOW_SECONDS * 1000,
    jwksClient: { get: async () => jwk },
    ...options,
  });
}

async function rejectsWithCode(promise, code) {
  await assert.rejects(promise, (error) => error instanceof AuthError && error.code === code);
}

test("accepts a valid Xsolla RS256 user JWT", async () => {
  const payload = await createVerifier()(createToken());
  assert.equal(payload.sub, "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee");
  assert.equal(payload.xsolla_login_project_id, PROJECT_ID);
});

test("rejects an expired JWT", async () => {
  await rejectsWithCode(createVerifier()(createToken({ exp: NOW_SECONDS - 10 })), "expired_token");
});

test("rejects a token issued by another issuer", async () => {
  await rejectsWithCode(createVerifier()(createToken({ iss: "https://attacker.example" })), "invalid_issuer");
});

test("rejects a token for another Login project", async () => {
  await rejectsWithCode(
    createVerifier()(createToken({ xsolla_login_project_id: "another-project" })),
    "invalid_project",
  );
});

test("rejects a tampered payload", async () => {
  const token = createToken();
  const [header, payload, signature] = token.split(".");
  const changedPayload = encode({
    ...JSON.parse(Buffer.from(payload, "base64url").toString("utf8")),
    sub: "attacker",
  });
  await rejectsWithCode(createVerifier()(`${header}.${changedPayload}.${signature}`), "invalid_signature");
});

test("rejects algorithms other than RS256 before using the key", async () => {
  await rejectsWithCode(createVerifier()(createToken({}, { alg: "HS256" })), "invalid_algorithm");
});

test("JWKS client caches keys and refreshes once for an unknown kid", async () => {
  let requests = 0;
  const fetchImpl = async () => {
    requests += 1;
    return new Response(JSON.stringify({ keys: [jwk] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };
  const client = createJwksClient({ projectId: PROJECT_ID, fetchImpl });

  assert.equal((await client.get("test-key")).kid, "test-key");
  assert.equal((await client.get("test-key")).kid, "test-key");
  assert.equal(requests, 1);

  await rejectsWithCode(client.get("missing-key"), "unknown_signing_key");
  assert.equal(requests, 2);
});
