export class AuthError extends Error {
  constructor(code, message, options = {}) {
    super(message, options);
    this.name = "AuthError";
    this.code = code;
    this.status = options.status ?? 401;
  }
}

export class AuthServiceError extends Error {
  constructor(code, message, options = {}) {
    super(message, options);
    this.name = "AuthServiceError";
    this.code = code;
    this.status = options.status ?? 503;
  }
}
