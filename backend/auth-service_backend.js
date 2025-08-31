const express = require('express');
const { ok } = require('./_utils_backend');

const router = express.Router();

router.post('/login', (req, res) => {
  const { email } = req.body || {};
  return res.json(ok({
    user: { id: 'stub-user-id', email, full_name: email },
    session: {
      access_token: 'stub-access-token',
      refresh_token: 'stub-refresh-token',
      user: { id: 'stub-user-id', email }
    }
  }));
});

router.post('/register', (req, res) => {
  const { email } = req.body || {};
  return res.json(ok({
    message: 'Registered (stub)',
    user: { id: 'stub-user-id', email, full_name: email },
    session: {
      access_token: 'stub-access-token',
      refresh_token: 'stub-refresh-token',
      user: { id: 'stub-user-id', email }
    }
  }));
});

router.post('/logout', (_req, res) => {
  return res.json(ok({ message: 'Logged out (stub)' }));
});

router.get('/user', (_req, res) => {
  return res.json(ok({ user: { id: 'stub-user-id', email: 'user@example.com' } }));
});

router.post('/refresh', (req, res) => {
  return res.json(ok({
    user: { id: 'stub-user-id', email: 'user@example.com' },
    session: {
      access_token: 'stub-access-token',
      refresh_token: 'stub-refresh-token'
    }
  }));
});

router.get('/session', (_req, res) => {
  return res.json(ok({ user: { id: 'stub-user-id', email: 'user@example.com' }, role: 'project_coordinator' }));
});

module.exports = router;
