const requests = new Map();

const rateLimiter = (options = {}) => {
  const windowMs = options.windowMs || 15 * 60 * 1000; // 15 minutes
  const max = options.max || 100; // limit each IP to 100 requests per windowMs

  return (req, res, next) => {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const now = Date.now();

    if (!requests.has(ip)) {
      requests.set(ip, []);
    }

    const userRequests = requests.get(ip);
    // Remove timestamps outside current window
    const validRequests = userRequests.filter((timestamp) => now - timestamp < windowMs);

    if (validRequests.length >= max) {
      return res.status(429).json({
        error: 'Too Many Requests',
        message: `Rate limit exceeded. Try again in ${Math.ceil((windowMs - (now - validRequests[0])) / 1000)} seconds.`,
      });
    }

    validRequests.push(now);
    requests.set(ip, validRequests);

    // Standard rate limit headers
    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', max - validRequests.length);

    next();
  };
};

module.exports = rateLimiter;