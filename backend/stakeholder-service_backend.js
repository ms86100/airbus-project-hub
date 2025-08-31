const express = require('express');
const { ok } = require('./_utils_backend');

const router = express.Router();

let stakeholders = [];

router.get('/projects/:projectId/stakeholders', (req, res) => {
  return res.json(ok({ projectId: req.params.projectId, stakeholders: stakeholders.filter(s => s.project_id === req.params.projectId) }));
});

router.post('/projects/:projectId/stakeholders', (req, res) => {
  const body = req.body || {};
  const st = { id: `${Date.now()}`, project_id: req.params.projectId, ...body };
  stakeholders.push(st);
  return res.json(ok({ message: 'Created (stub)', stakeholder: st }));
});

router.put('/projects/:projectId/stakeholders/:stakeholderId', (req, res) => {
  stakeholders = stakeholders.map(s => s.id === req.params.stakeholderId ? { ...s, ...req.body } : s);
  const st = stakeholders.find(s => s.id === req.params.stakeholderId) || null;
  return res.json(ok({ message: 'Updated (stub)', stakeholder: st }));
});

router.delete('/projects/:projectId/stakeholders/:stakeholderId', (req, res) => {
  stakeholders = stakeholders.filter(s => s.id !== req.params.stakeholderId);
  return res.json(ok({ message: 'Deleted (stub)' }));
});

module.exports = router;
