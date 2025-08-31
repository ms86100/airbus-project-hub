const express = require('express');
const { ok } = require('./_utils_backend');

const router = express.Router();

router.post('/projects/wizard/start', (req, res) => {
  const sessionId = `${Date.now()}`;
  return res.json(ok({ message: 'Wizard started (stub)', sessionId, seed: req.body || {} }));
});

router.post('/projects/wizard/complete', (req, res) => {
  const project = { id: `${Date.now()}`, ...req.body };
  return res.json(ok({ message: 'Wizard completed (stub)', project }));
});

module.exports = router;
