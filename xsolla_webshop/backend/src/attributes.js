import { AuthServiceError } from "./errors.js";

const LOGIN_API_URL = "https://login.xsolla.com/api";
const MEMBER_ATTRIBUTE_KEY = "webshop_member";

function required(name, value) {
  const normalized = value?.trim();
  if (!normalized || /^(발급받은_|YOUR_)/.test(normalized)) {
    throw new Error(`${name} 환경 변수가 필요합니다.`);
  }
  return normalized;
}

function positiveInteger(name, value) {
  const number = Number(required(name, value));
  if (!Number.isInteger(number) || number <= 0) {
    throw new Error(`${name}은 양의 정수여야 합니다.`);
  }
  return number;
}

export function loadMemberConfig(env = process.env) {
  return {
    clientId: required("XSOLLA_SERVER_CLIENT_ID", env.XSOLLA_SERVER_CLIENT_ID),
    clientSecret: required("XSOLLA_SERVER_CLIENT_SECRET", env.XSOLLA_SERVER_CLIENT_SECRET),
    publisherId: positiveInteger("XSOLLA_PUBLISHER_ID", env.XSOLLA_PUBLISHER_ID),
    publisherProjectId: positiveInteger(
      "XSOLLA_PUBLISHER_PROJECT_ID",
      env.XSOLLA_PUBLISHER_PROJECT_ID,
    ),
  };
}

async function readErrorCode(response) {
  try {
    const body = await response.json();
    return body?.error?.code || body?.error || body?.code || null;
  } catch {
    return null;
  }
}

export async function getServerToken({ clientId, clientSecret, fetchImpl = fetch }) {
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
  });

  let response;
  try {
    response = await fetchImpl(`${LOGIN_API_URL}/oauth2/token`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });
  } catch (cause) {
    throw new AuthServiceError("server_token_unavailable", "Xsolla Server JWT를 요청하지 못했습니다.", {
      cause,
    });
  }

  if (!response.ok) {
    const code = await readErrorCode(response);
    throw new AuthServiceError(
      "server_token_rejected",
      `Xsolla Server JWT 발급이 HTTP ${response.status}${code ? ` (${code})` : ""}로 실패했습니다.`,
    );
  }

  const result = await response.json();
  if (typeof result?.access_token !== "string" || !result.access_token) {
    throw new AuthServiceError("invalid_server_token_response", "Xsolla 응답에 Server JWT가 없습니다.");
  }
  return result.access_token;
}

export async function updateReadOnlyMemberAttribute({
  serverToken,
  userId,
  value,
  publisherId,
  publisherProjectId,
  fetchImpl = fetch,
}) {
  const response = await fetchImpl(
    `${LOGIN_API_URL}/attributes/users/${encodeURIComponent(userId)}/update_read_only`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-SERVER-AUTHORIZATION": serverToken,
      },
      body: JSON.stringify({
        attributes: [{ key: MEMBER_ATTRIBUTE_KEY, permission: "private", value }],
        publisher_id: publisherId,
        publisher_project_id: publisherProjectId,
        removing_keys: [],
      }),
    },
  );

  if (response.status !== 204) {
    const code = await readErrorCode(response);
    throw new AuthServiceError(
      "attribute_update_failed",
      `사용자 속성 업데이트가 HTTP ${response.status}${code ? ` (${code})` : ""}로 실패했습니다.`,
    );
  }
}

export async function getReadOnlyMemberAttribute({
  serverToken,
  userId,
  publisherId,
  publisherProjectId,
  fetchImpl = fetch,
}) {
  const response = await fetchImpl(
    `${LOGIN_API_URL}/attributes/users/${encodeURIComponent(userId)}/get_read_only`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-SERVER-AUTHORIZATION": serverToken,
      },
      body: JSON.stringify({
        keys: [MEMBER_ATTRIBUTE_KEY],
        publisher_id: publisherId,
        publisher_project_id: publisherProjectId,
      }),
    },
  );

  if (!response.ok) {
    const code = await readErrorCode(response);
    throw new AuthServiceError(
      "attribute_read_failed",
      `사용자 속성 조회가 HTTP ${response.status}${code ? ` (${code})` : ""}로 실패했습니다.`,
    );
  }

  const attributes = await response.json();
  return Array.isArray(attributes)
    ? attributes.find((attribute) => attribute.key === MEMBER_ATTRIBUTE_KEY) ?? null
    : null;
}

export async function setMemberStatus({ userId, member, config, fetchImpl = fetch }) {
  const value = member ? "true" : "false";
  const serverToken = await getServerToken({ ...config, fetchImpl });

  await updateReadOnlyMemberAttribute({
    serverToken,
    userId,
    value,
    publisherId: config.publisherId,
    publisherProjectId: config.publisherProjectId,
    fetchImpl,
  });

  const attribute = await getReadOnlyMemberAttribute({
    serverToken,
    userId,
    publisherId: config.publisherId,
    publisherProjectId: config.publisherProjectId,
    fetchImpl,
  });

  if (attribute?.value !== value) {
    throw new AuthServiceError(
      "attribute_verification_failed",
      `속성 저장 후 확인한 값이 ${value}와 일치하지 않습니다.`,
    );
  }
  return attribute;
}

export { MEMBER_ATTRIBUTE_KEY };
