// Error "controlat": té un codi que el client pot interpretar.
// El mateix error serveix per a REST (httpStatus) i per a WebSocket (missatge ERROR).
class AppError extends Error {
  constructor(code, message, httpStatus = 400) {
    super(message);
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

module.exports = { AppError };
