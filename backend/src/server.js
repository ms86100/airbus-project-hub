const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { errorHandler } = require('./middleware/errorHandler');
const { notFound } = require('./middleware/notFound');

// Import route modules
const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const projectsRoutes = require('./routes/projects');
const stakeholdersRoutes = require('./routes/stakeholders');
const roadmapRoutes = require('./routes/roadmap');
const backlogRoutes = require('./routes/backlog');
const accessRoutes = require('./routes/access');
const auditRoutes = require('./routes/audit');
const capacityRoutes = require('./routes/capacity');
const retroRoutes = require('./routes/retro');
const workspaceRoutes = require('./routes/workspace');
const wizardRoutes = require('./routes/wizard');
const departmentRoutes = require('./routes/department');

const app = express();

// Trust proxy for rate limiting behind reverse proxy
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());
app.use(compression());

// CORS configuration
const corsOptions = {
  origin: (origin, callback) => {
    try {
      const allowedEnv = process.env.ALLOWED_ORIGINS?.split(',').map(o => o.trim()).filter(Boolean) || [];
      const isLocalhost = !!origin && /^https?:\/\/(localhost|127\.0\.0\.1)(:\\d+)?$/.test(origin);
      const isAllowedEnv = !!origin && allowedEnv.includes(origin);
      let isLovableSandbox = false;
      try {
        if (origin) {
          const hostname = new URL(origin).hostname;
          isLovableSandbox = /lovable\.dev$/.test(hostname);
        }
      } catch {}

      if (!origin || isLocalhost || isAllowedEnv || isLovableSandbox) {
        return callback(null, true);
      }
    } catch {}
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-client-info', 'apikey'],
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV 
  });
});

// API routes
app.use('/auth-service', authRoutes);
app.use('/users', usersRoutes);
app.use('/projects-service', projectsRoutes);
app.use('/stakeholder-service', stakeholdersRoutes);
app.use('/roadmap-service', roadmapRoutes);
app.use('/backlog-service', backlogRoutes);
app.use('/access-service', accessRoutes);
app.use('/audit-service', auditRoutes);
app.use('/capacity-service', capacityRoutes);
app.use('/retro-service', retroRoutes);
app.use('/workspace-service', workspaceRoutes);
app.use('/wizard-service', wizardRoutes);
app.use('/department-service', departmentRoutes);

// Error handling middleware (must be last)
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
});

module.exports = app;