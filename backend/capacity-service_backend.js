const express = require('express');
const { ok } = require('./_utils_backend');

const router = express.Router();

router.get('/projects/:projectId/capacity', (req, res) => {
  return res.json(ok({
    projectId: req.params.projectId,
    iterations: [],
    summary: { totalIterations: 0, totalCapacity: 0 },
  }));
});

router.post('/projects/:projectId/capacity', (req, res) => {
  const body = req.body || {};
  console.log('🔧 Backend - POST /capacity called:', {
    projectId: req.params.projectId,
    body: body,
    headers: {
      authorization: req.headers.authorization ? 'present' : 'missing',
      contentType: req.headers['content-type']
    }
  });
  
  console.log('🔧 Backend - Capacity item created successfully (stub):', body);
  return res.json(ok({ message: 'Created (stub)', ...(body.type === 'member' ? { member: body } : { iteration: body }) }));
});

router.put('/projects/:projectId/capacity/:id', (req, res) => {
  return res.json(ok({ message: 'Updated (stub)' }));
});

router.delete('/projects/:projectId/capacity/:id', (req, res) => {
  return res.json(ok({ message: 'Deleted (stub)' }));
});

router.get('/stats', (_req, res) => {
  return res.json(ok({ totalIterations: 0, totalMembers: 0, avgCapacity: 0, totalProjects: 0 }));
});

module.exports = router;
