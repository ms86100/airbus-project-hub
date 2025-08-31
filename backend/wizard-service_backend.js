const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { ok, fail, requireAuth } = require('./_utils_backend');
const pool = require('./db_backend');

const router = express.Router();

router.post('/projects/wizard/start', (req, res) => {
  const sessionId = `wizard_${Date.now()}`;
  return res.json(ok({ message: 'Wizard started', sessionId, seed: req.body || {} }));
});

router.post('/projects/wizard/complete', requireAuth, async (req, res) => {
  try {
      const body = req.body || {};
      const projectName = body.projectName || body.name;
      const objective = body.objective || body.description || '';
      const startDate = body.startDate || body.start_date || null;
      const endDate = body.endDate || body.end_date || null;
      const tasks = Array.isArray(body.tasks) ? body.tasks : [];
      const milestones = Array.isArray(body.milestones) ? body.milestones : [];
      const inviteEmails = Array.isArray(body.inviteEmails) ? body.inviteEmails : [];


    const userId = req.user.id;
    const projectId = uuidv4();

    console.log('Creating project via wizard:', { projectName, userId, projectId });

    // Start transaction
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      await client.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify({ sub: userId })]);

      // 1. Create the project
      const projectResult = await client.query(`
        INSERT INTO projects (id, name, description, start_date, end_date, status, priority, department_id, created_by, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
        RETURNING *
      `, [projectId, projectName, objective || '', startDate, endDate, 'planning', 'medium', null, userId]);

      const project = projectResult.rows[0];

      // 2. Create milestones if provided (map incoming IDs to DB IDs)
      const createdMilestones = [];
      const milestoneIdMap = {};
      for (const milestone of milestones) {
        const milestoneId = uuidv4();
        const mapKey = milestone.id || milestone.name;
        if (mapKey) milestoneIdMap[mapKey] = milestoneId;
        const name = milestone.name || 'Milestone';
        const description = milestone.description || '';
        const dueDate = milestone.dueDate || milestone.due_date || startDate || endDate || new Date().toISOString().slice(0, 10);
        const status = milestone.status || 'planning';
        const milestoneResult = await client.query(`
          INSERT INTO milestones (id, project_id, name, description, due_date, status, created_by, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
          RETURNING *
        `, [
          milestoneId,
          projectId,
          name,
          description,
          dueDate,
          status,
          userId
        ]);
        createdMilestones.push(milestoneResult.rows[0]);
      }

      // 3. Create tasks if provided
      const createdTasks = [];
      if (Array.isArray(milestones) && milestones.length > 0) {
        for (const m of milestones) {
          const newMilestoneId = milestoneIdMap[m.id] || milestoneIdMap[m.name];
          for (const task of (m.tasks || [])) {
            const taskId = uuidv4();
            const taskResult = await client.query(`
              INSERT INTO tasks (id, project_id, milestone_id, title, description, status, priority, owner_id, due_date, created_by, created_at, updated_at)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
              RETURNING *
            `, [
              taskId,
              projectId,
              newMilestoneId || null,
              task.title,
              task.description || '',
              task.status || 'todo',
              task.priority || 'medium',
              task.ownerId || null,
              task.dueDate || null,
              userId
            ]);
            createdTasks.push(taskResult.rows[0]);
          }
        }
      } else {
        for (const task of tasks) {
          const taskId = uuidv4();
          const taskResult = await client.query(`
            INSERT INTO tasks (id, project_id, milestone_id, title, description, status, priority, owner_id, due_date, created_by, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
            RETURNING *
          `, [
            taskId,
            projectId,
            task.milestoneId ? (milestoneIdMap[task.milestoneId] || milestoneIdMap[task.milestoneName] || task.milestoneId) : null,
            task.title,
            task.description || '',
            task.status || 'todo',
            task.priority || 'medium',
            task.ownerId || null,
            task.dueDate || null,
            userId
          ]);
          createdTasks.push(taskResult.rows[0]);
        }
      }

      // 4. Add project creator as admin member
      await client.query(`
        INSERT INTO project_members (project_id, user_id, role)
        VALUES ($1, $2, $3)
      `, [projectId, userId, 'member']);

      // 5. Set default module permissions for creator
      const modules = ['tasks_milestones', 'task_backlog', 'stakeholders', 'discussions', 'risk_register', 'team_capacity', 'retrospectives'];
      for (const module of modules) {
        await client.query(`
          INSERT INTO module_permissions (project_id, user_id, module, access_level, granted_by)
          VALUES ($1, $2, $3, $4, $5)
        `, [projectId, userId, module, 'write', userId]);
      }

      await client.query('COMMIT');

      console.log('Project created successfully:', { projectId, milestonesCount: createdMilestones.length, tasksCount: createdTasks.length });

      res.json(ok({
        message: 'Project created successfully',
        project: {
          ...project,
          milestones: createdMilestones,
          tasks: createdTasks
        }
      }));

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Wizard project creation error:', error);
    res.json(fail('Failed to create project via wizard: ' + (error && error.message ? error.message : String(error)), 'CREATION_ERROR'));
  }
});

module.exports = router;
