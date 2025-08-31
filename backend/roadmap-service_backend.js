const express = require('express');
const { ok } = require('./_utils_backend');

const router = express.Router();

let milestones = [];

router.get('/projects/:projectId/roadmap', (req, res) => {
  return res.json(ok({ projectId: req.params.projectId, milestones: milestones.filter(m => m.project_id === req.params.projectId) }));
});

router.post('/projects/:projectId/roadmap', (req, res) => {
  const body = req.body || {};
  const milestone = {
    id: `${Date.now()}`,
    project_id: req.params.projectId,
    name: body.name,
    description: body.description || '',
    due_date: body.dueDate,
    status: body.status || 'planning'
  };
  milestones.push(milestone);
  return res.json(ok({ message: 'Created (stub)', milestone }));
});

router.put('/projects/:projectId/roadmap/:milestoneId', (req, res) => {
  milestones = milestones.map(m => m.id === req.params.milestoneId ? { ...m, ...req.body } : m);
  const m = milestones.find(x => x.id === req.params.milestoneId) || null;
  return res.json(ok({ message: 'Updated (stub)', milestone: m }));
});

router.delete('/projects/:projectId/roadmap/:milestoneId', (req, res) => {
  milestones = milestones.filter(m => m.id !== req.params.milestoneId);
  return res.json(ok({ message: 'Deleted (stub)' }));
});

module.exports = router;
