const express = require('express');
const { ok } = require('./_utils_backend');

const router = express.Router();

router.get('/projects/:projectId/access', (req, res) => {
  return res.json(ok({ projectId: req.params.projectId, permissions: [] }));
});

router.put('/projects/:projectId/access/:userId', (req, res) => {
  const { module, accessLevel } = req.body || {};
  return res.json(ok({ message: 'Updated (stub)', permission: { userId: req.params.userId, projectId: req.params.projectId, module, accessLevel } }));
});

router.get('/permissions', (_req, res) => {
  return res.json(ok({ permissions: [] }));
});

module.exports = router;
