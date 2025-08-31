const express = require('express');
const { ok } = require('./_utils_backend');

const router = express.Router();

let departments = [ { id: 'dept-1', name: 'Engineering' }, { id: 'dept-2', name: 'Product' } ];

router.get('/departments', (_req, res) => {
  return res.json(ok(departments));
});

router.post('/departments', (req, res) => {
  const { name } = req.body || {};
  const dept = { id: `${Date.now()}`, name };
  departments.push(dept);
  return res.json(ok({ message: 'Created (stub)', department: dept }));
});

router.delete('/departments/:id', (req, res) => {
  departments = departments.filter(d => d.id !== req.params.id);
  return res.json(ok({ message: 'Deleted (stub)' }));
});

module.exports = router;
