# Project Management Backend

Local Node.js backend for the project management system with PostgreSQL integration.

## Setup Instructions

1. **Install Dependencies**
   ```bash
   cd backend
   npm install
   ```

2. **Database Setup**
   - Ensure PostgreSQL is running locally
   - Create a database named `project_management`
   - Import your Supabase dump into this database

3. **Environment Configuration**
   - Copy `.env` file and update database credentials:
   ```bash
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=project_management
   DB_USER=postgres
   DB_PASSWORD=your_password
   ```

4. **Start the Server**
   ```bash
   npm start
   # or for development with auto-reload:
   npm run dev
   ```

5. **Update Frontend**
   - Change your frontend to use the local API:
   ```javascript
   // In your frontend code, replace:
   import { apiClient } from '@/services/api'
   // with:
   import { apiClient } from '@/services/api_backend'
   ```

## API Endpoints

The server runs on `http://localhost:8080` and provides these services:

- `/auth-service/*` - Authentication (login, register, logout)
- `/projects-service/*` - Project management
- `/roadmap-service/*` - Milestones and roadmap
- `/backlog-service/*` - Task backlog
- `/stakeholder-service/*` - Stakeholder management
- `/capacity-service/*` - Team capacity tracking
- `/retro-service/*` - Retrospectives
- `/audit-service/*` - Audit logging
- `/access-service/*` - Access control
- `/workspace-service/*` - Workspace data
- `/wizard-service/*` - Project creation wizard
- `/department-service/*` - Department management

## Database Schema

This backend expects the same PostgreSQL schema as your Supabase dump. Key tables:

- `profiles` - User profiles
- `projects` - Project data
- `milestones` - Project milestones
- `tasks` - Project tasks
- `stakeholders` - Project stakeholders
- `retrospectives` - Retrospective sessions
- `user_roles` - User role assignments
- `module_permissions` - Module-level permissions

## Authentication

- Uses JWT tokens for authentication
- Passwords are hashed with bcryptjs
- Tokens expire in 7 days (configurable)

## Development Notes

- All endpoints return standardized responses: `{ success: boolean, data?: any, error?: string, code?: string }`
- CORS is configured for local development
- Error handling middleware captures and logs errors
- Database queries use parameterized statements to prevent SQL injection

## Port Configuration

The server runs on port 8080 by default. If this conflicts with your Vite dev server:

1. Either run Vite on a different port: `npm run dev -- --port 5173`
2. Or change the backend port in `.env`: `PORT=3001`

## Troubleshooting

1. **Database Connection Issues**
   - Verify PostgreSQL is running
   - Check database credentials in `.env`
   - Ensure the database exists and has the correct schema

2. **CORS Errors**
   - Verify the frontend origin is listed in the CORS configuration
   - Check that the API client is pointing to the correct URL

3. **Authentication Issues**
   - Verify JWT_SECRET is set in `.env`
   - Check that the profiles table has the correct structure