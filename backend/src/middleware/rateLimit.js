// Small in-memory rate limiter. It is per server instance, which is enough for a
// single backend process; use a shared store (e.g. Redis) if you run several.
const buckets = new Map();

setInterval(() => {
  const now = Date.now();

  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
}, 10 * 60 * 1000).unref();

export const rateLimit = ({ name, max, windowMinutes, message, key = () => "" }) => {
  const windowMs = windowMinutes * 60 * 1000;

  return (req, res, next) => {
    const id = `${name}:${req.ip}:${key(req)}`;
    const now = Date.now();
    let bucket = buckets.get(id);

    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(id, bucket);
    }

    bucket.count += 1;

    if (bucket.count > max) {
      res.set("Retry-After", Math.ceil((bucket.resetAt - now) / 1000));
      return res.status(429).json({ message });
    }

    return next();
  };
};

const emailKey = (req) =>
  typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";

export const loginLimiter = rateLimit({
  name: "login",
  max: 10,
  windowMinutes: 15,
  key: emailKey,
  message: "Too many sign-in attempts for this account. Please wait 15 minutes and try again."
});

export const registerLimiter = rateLimit({
  name: "register",
  max: 10,
  windowMinutes: 60,
  message: "Too many registrations from this network. Please try again in an hour."
});

// These routes send email from the college's Gmail account, so they are kept tight.
export const emailLimiter = rateLimit({
  name: "email",
  max: 5,
  windowMinutes: 60,
  message: "Too many email requests from this network. Please try again in an hour."
});
