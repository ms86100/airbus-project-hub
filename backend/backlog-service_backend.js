const express = require('express');
const { ok, fail } = require('./_utils_backend');

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

router.post('/projects/:projectId/backlog/:id/move', async (req, res) => {
  try {
    const { projectId, id: itemId } = req.params;
    const { milestoneId } = req.body || {};
    
    console.log('Moving backlog item:', { projectId, itemId, milestoneId });
    
    // Find the backlog item
    const item = backlog.find(i => i.id === itemId && i.project_id === projectId);
    if (!item) {
      return res.json(fail('Backlog item not found', 'NOT_FOUND'));
    }
    
    // Create task data from backlog item
    const taskData = {
      title: item.title,
      description: item.description,
      status: 'todo',
      priority: item.priority,
      dueDate: item.target_date,
      ownerId: item.owner_id,
      milestoneId: milestoneId
    };
    
    // Make a request to the workspace service to create the task
    const axios = require('axios');
    try {
      const taskResponse = await axios.post(`http://localhost:8080/workspace-service/projects/${projectId}/tasks`, taskData, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': req.headers.authorization || ''
        }
      });
      
      if (taskResponse.data && taskResponse.data.success) {
        // Mark backlog item as moved/done
        const itemIndex = backlog.findIndex(i => i.id === itemId);
        if (itemIndex !== -1) {
          backlog[itemIndex].status = 'done';
        }
        
        return res.json(ok({ 
          message: 'Backlog item moved to milestone successfully', 
          task: taskResponse.data.data.task 
        }));
      } else {
        throw new Error(taskResponse.data?.error || 'Failed to create task');
      }
    } catch (axiosError) {
      console.error('Error creating task:', axiosError.message);
      return res.json(fail('Failed to create task from backlog item', 'CREATE_TASK_ERROR'));
    }
  } catch (error) {
    console.error('Move backlog item error:', error);
    return res.json(fail('Failed to move backlog item', 'MOVE_ERROR'));
  }
});

module.exports = router;
