function required(name, value) {
  const normalized = value?.trim();
  if (!normalized || normalized === "YOUR_LOGIN_PROJECT_UUID") {
    throw new Error(`${name} 환경 변수가 필요합니다.`);
  }
  return normalized;
}

function parseBoolean(value) {
  return value?.trim().toLowerCase() === "true";
}

export function loadConfig(env = process.env) {
  const port = Number(env.PORT || 3001);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error("PORT는 0부터 65535 사이의 정수여야 합니다.");
  }

  return {
    port,
    loginProjectId: required("XSOLLA_LOGIN_PROJECT_ID", env.XSOLLA_LOGIN_PROJECT_ID),
    allowedOrigins: (env.FRONTEND_ORIGIN || "http://localhost:3000")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
    remoteUserValidation: parseBoolean(env.XSOLLA_REMOTE_USER_VALIDATION),
  };
}
