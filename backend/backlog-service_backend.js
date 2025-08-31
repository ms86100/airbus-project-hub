const express = require('express');
const { ok } = require('./_utils_backend');

const router = express.Router();

let backlog = [];

router.get('/projects/:projectId/backlog', (req, res) => {
  return res.json(ok({ projectId: req.params.projectId, items: backlog.filter(i => i.project_id === req.params.projectId) }));
});

router.post('/projects/:projectId/backlog', (req, res) => {
  const body = req.body || {};
  const item = {
    id: `${Date.now()}`,
    project_id: req.params.projectId,
    title: body.title,
    description: body.description || '',
    priority: body.priority || 'medium',
    status: body.status || 'backlog',
    owner_id: body.ownerId || null,
    target_date: body.targetDate || null,
  };
  backlog.push(item);
  return res.json(ok({ message: 'Created (stub)', item }));
});

router.put('/projects/:projectId/backlog/:id', (req, res) => {
  backlog = backlog.map(i => i.id === req.params.id ? { ...i, ...req.body } : i);
  const it = backlog.find(i => i.id === req.params.id) || null;
  return res.json(ok({ message: 'Updated (stub)', item: it }));
});

router.delete('/projects/:projectId/backlog/:id', (req, res) => {
  backlog = backlog.filter(i => i.id !== req.params.id);
  return res.json(ok({ message: 'Deleted (stub)' }));
});

router.post('/projects/:projectId/backlog/:id/move', (req, res) => {
  const { milestoneId } = req.body || {};
  return res.json(ok({ message: 'Moved to milestone (stub)', task: { id: `${Date.now()}`, milestone_id: milestoneId } }));
});

module.exports = router;
