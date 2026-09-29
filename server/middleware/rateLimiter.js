// In-memory fixed-window rate limiter. Fine for a single instance;
// use a shared store (e.g. Redis) if you run multiple instances.
const buckets = new Map();

function hit(key, max, windowMs) {
  const now = Date.now();
  const entry = buckets.get(key);

  if (!entry || entry.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  entry.count += 1;
  if (entry.count > max) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((entry.resetAt - now) / 1000),
    };
  }
  return { allowed: true, retryAfterSeconds: 0 };
}

// Clear expired entries every minute so the Map doesn't grow forever.
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of buckets) {
    if (entry.resetAt <= now) buckets.delete(key);
  }
}, 60 * 1000).unref();

// Express middleware: max 30 messages per minute per user (falls back to IP).
const limitMessages = (req, res, next) => {
  const id = req.user?._id || req.user?.id || req.userId || req.ip;
  const result = hit(`msg:${id}`, 30, 60 * 1000);

  if (!result.allowed) {
    return res.status(429).json({
      message: `Too many messages. Try again in ${result.retryAfterSeconds}s.`,
    });
  }
  next();
};



module.exports = { limitMessages };