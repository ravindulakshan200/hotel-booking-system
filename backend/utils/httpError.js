class HttpError extends Error {
  constructor(statusCode, message, details = undefined, errorCode = undefined) {
    super(message);
    this.name = "HttpError";
    this.statusCode = statusCode;
    this.details = details;
    this.errorCode = errorCode;
  }
}

module.exports = HttpError;
