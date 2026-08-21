import { createHash, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

const MAX_WEBHOOK_BODY_BYTES = 1024 * 1024;
const IDEMPOTENT_NOTIFICATION_TYPES = new Set([
  "order_paid",
  "order_canceled",
  "payment",
  "refund",
]);

export class WebhookError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.name = "WebhookError";
    this.code = code;
    this.status = status;
  }
}

export function computeXsollaWebhookSignature(rawBody, secretKey) {
  return createHash("sha1").update(rawBody).update(secretKey, "utf8").digest("hex");
}

export function verifyXsollaWebhookSignature(rawBody, authorization, secretKey) {
  const match = typeof authorization === "string"
    ? authorization.match(/^Signature\s+([a-f\d]{40})$/i)
    : null;
  if (!match || !secretKey) return false;

  const expected = Buffer.from(computeXsollaWebhookSignature(rawBody, secretKey), "ascii");
  const received = Buffer.from(match[1].toLowerCase(), "ascii");
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export async function readRawBody(request, maxBytes = MAX_WEBHOOK_BODY_BYTES) {
  const chunks = [];
  let size = 0;

  for await (const chunk of request) {
    size += chunk.length;
    if (size > maxBytes) {
      throw new WebhookError("INVALID_PARAMETER", "Webhook body is too large.", 413);
    }
    chunks.push(chunk);
  }

  return Buffer.concat(chunks);
}

function requiredEventKey(payload) {
  const type = payload.notification_type;
  if (!IDEMPOTENT_NOTIFICATION_TYPES.has(type)) return null;

  const id = type.startsWith("order_") ? payload.order?.id : payload.transaction?.id;
  if (id === undefined || id === null || String(id).trim() === "") {
    throw new WebhookError("INVALID_PARAMETER", `${type} webhook does not include an event ID.`);
  }
  return `${type}:${id}`;
}

function validatePayload(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new WebhookError("INVALID_PARAMETER", "Webhook payload must be a JSON object.");
  }
  if (typeof payload.notification_type !== "string" || !payload.notification_type) {
    throw new WebhookError("INVALID_PARAMETER", "notification_type is required.");
  }
  if (payload.notification_type === "user_validation") {
    const userId = payload.user?.id;
    if (userId === undefined || userId === null || String(userId).trim() === "") {
      throw new WebhookError("INVALID_USER", "User ID is required.");
    }
  }
}

export class MemoryWebhookEventStore {
  constructor() {
    this.records = new Map();
  }

  async recordIfNew(record) {
    if (this.records.has(record.key)) return false;
    this.records.set(record.key, record);
    return true;
  }
}

export class JsonWebhookEventStore {
  constructor(filePath) {
    this.filePath = filePath;
    this.queue = Promise.resolve();
  }

  async recordIfNew(record) {
    const operation = this.queue.then(() => this.#recordIfNew(record));
    this.queue = operation.catch(() => {});
    return operation;
  }

  async #recordIfNew(record) {
    let records = {};
    try {
      records = JSON.parse(await readFile(this.filePath, "utf8"));
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }

    if (records[record.key]) return false;
    records[record.key] = record;

    await mkdir(dirname(this.filePath), { recursive: true });
    const temporaryPath = `${this.filePath}.${process.pid}.tmp`;
    await writeFile(temporaryPath, `${JSON.stringify(records, null, 2)}\n`, "utf8");
    await rename(temporaryPath, this.filePath);
    return true;
  }
}

export function createXsollaWebhookProcessor({ eventStore, userExists, onEvent } = {}) {
  const store = eventStore || new MemoryWebhookEventStore();
  const checkUser = userExists || (async () => true);
  const handleEvent = onEvent || (async () => {});

  return async function processWebhook(payload) {
    validatePayload(payload);

    if (payload.notification_type === "user_validation") {
      if (!(await checkUser(String(payload.user.id)))) {
        throw new WebhookError("INVALID_USER", "User was not found.");
      }
      return { duplicate: false };
    }

    const key = requiredEventKey(payload);
    if (!key) return { duplicate: false, ignored: true };

    const record = {
      key,
      notificationType: payload.notification_type,
      receivedAt: new Date().toISOString(),
    };
    const isNew = await store.recordIfNew(record);
    if (isNew) await handleEvent(payload);
    return { duplicate: !isNew };
  };
}
