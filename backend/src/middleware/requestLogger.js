const requestLogger = (req, res, next) => {
  const start = Date.now();
  const isProd = process.env.NODE_ENV === 'production';

  const safeHeaders = {
    ...(req.headers || {}),
  };
  // Mask auth header
  if (safeHeaders.authorization) {
    safeHeaders.authorization = `${safeHeaders.authorization.substring(0, 16)}...`;
  }

  const safeBody = (() => {
    try {
      const body = typeof req.body === 'object' ? { ...req.body } : req.body;
      if (body && typeof body === 'object') {
        if (body.password) body.password = '***';
        if (body.refresh_token) body.refresh_token = `${String(body.refresh_token).substring(0, 8)}...`;
      }
      return body;
    } catch {
      return undefined;
    }
  })();

  const logBase = {
    method: req.method,
    url: req.originalUrl || req.url,
    headers: isProd ? undefined : safeHeaders,
    body: isProd ? undefined : safeBody,
  };

  console.info('➡️  Request', logBase);

  const onFinish = () => {
    res.removeListener('finish', onFinish);
    const duration = Date.now() - start;
    const meta = {
      status: res.statusCode,
      durationMs: duration,
      method: req.method,
      url: req.originalUrl || req.url,
    };
    console.info('⬅️  Response', meta);
  };

  res.on('finish', onFinish);
  next();
};

module.exports = { requestLogger };