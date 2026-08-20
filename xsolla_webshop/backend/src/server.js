import { createServer } from "node:http";
import { AuthError, AuthServiceError } from "./errors.js";

function sendJson(response, status, body) {
  const json = JSON.stringify(body);
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(json),
    "Cache-Control": "no-store",
  });
  response.end(json);
}

export function readBearerToken(header) {
  if (typeof header !== "string") {
    throw new AuthError("missing_token", "Authorization Bearer JWT가 필요합니다.");
  }
  const match = header.match(/^Bearer\s+([^\s]+)$/i);
  if (!match) {
    throw new AuthError("invalid_authorization", "Authorization 헤더 형식이 올바르지 않습니다.");
  }
  return match[1];
}

function setCorsHeaders(request, response, allowedOrigins) {
  const origin = request.headers.origin;
  if (!origin) return true;
  if (!allowedOrigins.includes(origin)) return false;

  response.setHeader("Access-Control-Allow-Origin", origin);
  response.setHeader("Vary", "Origin");
  response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
  return true;
}

export function createRequestHandler({ verifyToken, validateRemoteUser, allowedOrigins = [] }) {
  return async function handleRequest(request, response) {
    if (!setCorsHeaders(request, response, allowedOrigins)) {
      sendJson(response, 403, { error: { code: "origin_not_allowed", message: "허용되지 않은 Origin입니다." } });
      return;
    }

    if (request.method === "OPTIONS") {
      response.writeHead(204);
      response.end();
      return;
    }

    if (request.method === "GET" && request.url === "/health") {
      sendJson(response, 200, { status: "ok" });
      return;
    }

    if (request.method === "POST" && request.url === "/api/auth/verify") {
      try {
        const token = readBearerToken(request.headers.authorization);
        const payload = await verifyToken(token);
        if (validateRemoteUser) await validateRemoteUser(token);

        sendJson(response, 200, {
          authenticated: true,
          user: { id: payload.sub },
          token: {
            issuer: payload.iss,
            issuedAt: payload.iat,
            expiresAt: payload.exp,
          },
          loginProjectId: payload.xsolla_login_project_id,
        });
      } catch (error) {
        if (error instanceof AuthError || error instanceof AuthServiceError) {
          sendJson(response, error.status, {
            authenticated: false,
            error: { code: error.code, message: error.message },
          });
          return;
        }
        console.error("JWT verification failed unexpectedly", error);
        sendJson(response, 500, {
          authenticated: false,
          error: { code: "internal_error", message: "JWT 검증 중 오류가 발생했습니다." },
        });
      }
      return;
    }

    sendJson(response, 404, { error: { code: "not_found", message: "API 경로를 찾을 수 없습니다." } });
  };
}

export function createAuthServer(options) {
  return createServer(createRequestHandler(options));
}
