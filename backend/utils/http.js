/**
 * Wrap async route handlers so rejected promises reach the error middleware.
 */
export const ah = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/**
 * Copy only whitelisted keys from an object (prevents mass-assignment).
 */
export function pick(source = {}, keys = []) {
  const out = {};
  for (const k of keys) if (source[k] !== undefined) out[k] = source[k];
  return out;
}

export function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  err.expose = true;
  return err;
}
