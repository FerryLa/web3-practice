import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createAuthServer } from "../src/server.js";
import {
  computeXsollaWebhookSignature,
  JsonWebhookEventStore,
  MemoryWebhookEventStore,
  verifyXsollaWebhookSignature,
} from "../src/webhook.js";

const secret = "test-webhook-secret";

async function startServer(options = {}) {
  const server = createAuthServer({ verifyToken: async () => ({}), webhookSecret: secret, ...options });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  return {
    url: `http://127.0.0.1:${address.port}`,
    close: () => new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve()))),
  };
}

function signedRequest(url, rawBody, signatureBody = rawBody) {
  const signature = computeXsollaWebhookSignature(Buffer.from(signatureBody), secret);
  return fetch(`${url}/webhooks/xsolla`, {
    method: "POST",
    headers: {
      Authorization: `Signature ${signature}`,
      "Content-Type": "application/json",
    },
    body: rawBody,
  });
}

test("verifies the signature against the exact raw body", () => {
  const rawBody = Buffer.from('{"notification_type":"user_validation", "user":{"id":"user-1"}}');
  const signature = computeXsollaWebhookSignature(rawBody, secret);

  assert.equal(verifyXsollaWebhookSignature(rawBody, `Signature ${signature}`, secret), true);
  assert.equal(verifyXsollaWebhookSignature(Buffer.from(rawBody.toString().replace(", ", ",")), `Signature ${signature}`, secret), false);
});

test("accepts a signed user validation webhook", async (t) => {
  const app = await startServer({ webhookUserExists: async (userId) => userId === "user-1" });
  t.after(app.close);

  const body = JSON.stringify({ notification_type: "user_validation", user: { id: "user-1" } });
  const response = await signedRequest(app.url, body);

  assert.equal(response.status, 204);
  assert.equal(await response.text(), "");
});

test("returns INVALID_SIGNATURE for a tampered webhook", async (t) => {
  const app = await startServer();
  t.after(app.close);

  const original = JSON.stringify({ notification_type: "user_validation", user: { id: "user-1" } });
  const tampered = JSON.stringify({ notification_type: "user_validation", user: { id: "attacker" } });
  const response = await signedRequest(app.url, tampered, original);
  const result = await response.json();

  assert.equal(response.status, 400);
  assert.equal(result.error.code, "INVALID_SIGNATURE");
});

test("returns INVALID_USER when user validation fails", async (t) => {
  const app = await startServer({ webhookUserExists: async () => false });
  t.after(app.close);

  const body = JSON.stringify({ notification_type: "user_validation", user: { id: "missing" } });
  const response = await signedRequest(app.url, body);
  const result = await response.json();

  assert.equal(response.status, 400);
  assert.equal(result.error.code, "INVALID_USER");
});

test("processes a duplicate order only once", async (t) => {
  const handled = [];
  const app = await startServer({
    webhookEventStore: new MemoryWebhookEventStore(),
    onWebhookEvent: async (payload) => handled.push(payload.order.id),
  });
  t.after(app.close);

  const body = JSON.stringify({ notification_type: "order_paid", order: { id: 4201, mode: "sandbox" } });
  const first = await signedRequest(app.url, body);
  const duplicate = await signedRequest(app.url, body);

  assert.equal(first.status, 204);
  assert.equal(duplicate.status, 204);
  assert.deepEqual(handled, [4201]);
});

test("requires an order ID for idempotency", async (t) => {
  const app = await startServer();
  t.after(app.close);

  const body = JSON.stringify({ notification_type: "order_paid", order: { mode: "sandbox" } });
  const response = await signedRequest(app.url, body);
  const result = await response.json();

  assert.equal(response.status, 400);
  assert.equal(result.error.code, "INVALID_PARAMETER");
});

test("persists idempotency records across event store instances", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "xsolla-webhook-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const filePath = join(directory, "events.json");
  const record = { key: "order_paid:4201", notificationType: "order_paid", receivedAt: "2026-08-20T00:00:00.000Z" };

  assert.equal(await new JsonWebhookEventStore(filePath).recordIfNew(record), true);
  assert.equal(await new JsonWebhookEventStore(filePath).recordIfNew(record), false);
});
