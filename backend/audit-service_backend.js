const express = require('express');
const { ok } = require('./_utils_backend');

const router = express.Router();

router.get('/projects/:projectId/history', (req, res) => {
  return res.json(ok([]));
});

router.post('/audit/log', (req, res) => {
  const entry = { id: `${Date.now()}`, created_at: new Date().toISOString(), ...req.body };
  return res.json(ok({ message: 'Logged (stub)', entry }));
});

router.get('/projects/:projectId/logs', (req, res) => {
  return res.json(ok([]));
});

module.exports = router;
