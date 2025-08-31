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
    source_type: body.sourceType || 'manual',
    source_id: body.sourceId || null,
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
    
    console.log('🔧 Backlog - Move item called:', {
      projectId,
      itemId,
      milestoneId,
      authHeader: req.headers.authorization ? 'present' : 'missing'
    });

    if (!milestoneId) {
      console.warn('🔧 Backlog - Missing milestoneId in request body');
      return res.json(fail('Milestone ID is required', 'MISSING_MILESTONE_ID'));
    }
    
    // Find the backlog item
    const item = backlog.find(i => i.id === itemId && i.project_id === projectId);
    if (!item) {
      console.log('🔧 Backlog - Item not found:', itemId);
      return res.json(fail('Backlog item not found', 'NOT_FOUND'));
    }
    
    console.log('🔧 Backlog - Found item:', item);
    
    // Create task data from backlog item
    const taskData = {
      title: item.title,
      description: item.description,
      status: 'todo',
      priority: item.priority,
      due_date: item.target_date,
      owner_id: item.owner_id,
      milestone_id: milestoneId
    };
    
    console.log('🔧 Backlog - Prepared task data (snake_case for workspace):', taskData);
    
    // Make a request to the workspace service to create the task
    const axios = require('axios');
    try {
      console.log('🔧 Backlog - Making request to workspace service...');
      const taskResponse = await axios.post(`http://localhost:8080/workspace-service/projects/${projectId}/tasks`, taskData, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': req.headers.authorization || ''
        }
      });
      
      console.log('🔧 Backlog - Workspace response status:', taskResponse.status);
      console.log('🔧 Backlog - Workspace response data:', taskResponse.data);
      
      if (taskResponse.data && taskResponse.data.success) {
        // Mark backlog item as moved/done
        const itemIndex = backlog.findIndex(i => i.id === itemId);
        if (itemIndex !== -1) {
          backlog[itemIndex].status = 'done';
          console.log('🔧 Backlog - Marked item as done');
        }
        
        return res.json(ok({ 
          message: 'Backlog item moved to milestone successfully', 
          task: taskResponse.data.data.task 
        }));
      } else {
        console.log('🔧 Backlog - Workspace service returned error:', taskResponse.data);
        throw new Error(taskResponse.data?.error || 'Failed to create task');
      }
    } catch (axiosError) {
      console.error('🔧 Backlog - Axios error details:', {
        message: axiosError.message,
        status: axiosError.response?.status,
        statusText: axiosError.response?.statusText,
        data: axiosError.response?.data,
        stack: axiosError.stack
      });
      return res.json(fail('Failed to create task from backlog item: ' + axiosError.message, 'CREATE_TASK_ERROR'));
    }
  } catch (error) {
    console.error('🔧 Backlog - Move backlog item error:', error);
    console.error('🔧 Backlog - Error stack:', error.stack);
    return res.json(fail('Failed to move backlog item: ' + error.message, 'MOVE_ERROR'));
  }
});

module.exports = router;
