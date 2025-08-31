const express = require('express');
const { ok } = require('./_utils_backend');

const router = express.Router();

router.get('/projects/:projectId/retrospectives', (req, res) => {
  return res.json(ok([]));
});

router.post('/projects/:projectId/retrospectives', (req, res) => {
  const { framework = 'Classic', iterationId = null, columns = [] } = req.body || {};
  return res.json(ok({ message: 'Created (stub)', retrospective: { id: `${Date.now()}`, project_id: req.params.projectId, framework, iteration_id: iterationId, columns } }));
});

router.post('/retrospectives/:id/actions', (req, res) => {
  const body = req.body || {};
  return res.json(ok({ message: 'Action captured (stub)', action: { id: `${Date.now()}`, retrospective_id: req.params.id, ...body } }));
});

router.get('/stats', (_req, res) => {
  return res.json(ok({ totalRetrospectives: 0, totalActionItems: 0, convertedTasks: 0, conversionRate: 0 }));
});

module.exports = router;
