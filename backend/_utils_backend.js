// Shared helpers for backend stubs

function ok(data) {
  return { success: true, data };
}

function fail(error, code = 'NOT_IMPLEMENTED') {
  return { success: false, error, code };
}

function requireAuth(req, res, next) {
  // Very light auth stub — attach a fake user if Authorization header exists
  // Replace with proper JWT validation in your local backend.
  const auth = req.headers['authorization'];
  if (auth && auth.startsWith('Bearer ')) {
    req.user = { id: '00000000-0000-0000-0000-000000000000' };
  }
  next();
}

module.exports = { ok, fail, requireAuth };
