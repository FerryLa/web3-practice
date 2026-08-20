import { loadConfig } from "./config.js";
import { createXsollaJwtVerifier, validateUserWithXsolla } from "./jwt.js";
import { createAuthServer } from "./server.js";

const config = loadConfig();
const verifyToken = createXsollaJwtVerifier({ projectId: config.loginProjectId });
const server = createAuthServer({
  verifyToken,
  validateRemoteUser: config.remoteUserValidation ? validateUserWithXsolla : null,
  allowedOrigins: config.allowedOrigins,
});

server.listen(config.port, "127.0.0.1", () => {
  console.log(`Xsolla auth backend: http://127.0.0.1:${config.port}`);
  console.log(`Allowed frontend origins: ${config.allowedOrigins.join(", ")}`);
  console.log(`Remote user validation: ${config.remoteUserValidation ? "enabled" : "disabled"}`);
});
