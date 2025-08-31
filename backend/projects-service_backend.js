const express = require('express');
const { ok } = require('./_utils_backend');

const router = express.Router();

// In-memory stub store
let projects = [];

router.get('/projects', (_req, res) => {
  return res.json(ok(projects));
});

router.post('/projects', (req, res) => {
  const body = req.body || {};
  const project = {
    id: `${Date.now()}`,
    name: body.name || 'Untitled',
    description: body.description || '',
    priority: body.priority || 'medium',
    status: body.status || 'planning',
    start_date: body.startDate || null,
    end_date: body.endDate || null,
    created_by: 'stub-user-id',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  projects.push(project);
  return res.json(ok(project));
});

router.get('/projects/:id', (req, res) => {
  const p = projects.find(x => x.id === req.params.id);
  return res.json(ok(p || null));
});

router.put('/projects/:id', (req, res) => {
  projects = projects.map(p => p.id === req.params.id ? { ...p, ...req.body, updated_at: new Date().toISOString() } : p);
  const p = projects.find(x => x.id === req.params.id) || null;
  return res.json(ok(p));
});

router.delete('/projects/:id', (req, res) => {
  projects = projects.filter(p => p.id !== req.params.id);
  return res.json(ok({ message: 'Deleted (stub)' }));
});

module.exports = router;
