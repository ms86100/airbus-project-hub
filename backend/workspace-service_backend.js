const express = require('express');
const { ok } = require('./_utils_backend');

const router = express.Router();

router.get('/projects/:projectId/workspace', (req, res) => {
  return res.json(ok({
    projectId: req.params.projectId,
    summary: { tasks: 0, milestones: 0 },
    recentTasks: [],
    upcomingMilestones: []
  }));
});

module.exports = router;
