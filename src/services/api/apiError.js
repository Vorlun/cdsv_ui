export class ApiError extends Error {
  /**
   * @param {string} message
   * @param {{ status?: number, body?: unknown }} [meta]
   */
  constructor(message, meta = {}) {
    super(message);
    this.name = "ApiError";
    this.status = meta.status;
    this.body = meta.body;
  }
}
