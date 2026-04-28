// server.js
// Main entry point. Creates Express app, HTTP server, and Socket.IO instance.
// Applies all middleware, mounts routes, and starts listening.

require('dotenv').config();

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const logger = require('./utils/logger');
const {
  helmetMiddleware,
  corsMiddleware,
  corsOptions,
  generalLimiter,
  requestLogger,
  errorHandler,
  notFoundHandler,
} = require('./middleware');
const routes = require('./routes');
const { initializeSocket } = require('./services/socketService');

const PORT = process.env.PORT || 5000;

// ─── Express App ───────────────────────────────────────────────────────────
const app = express();

// Security & parsing middleware
app.use(helmetMiddleware);
app.use(corsMiddleware);
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);
app.use(generalLimiter);

// API routes
app.use('/api', routes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'InterviewPro API',
    version: '1.0.0',
    docs: '/api/health',
  });
});

// Error handling (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

// ─── HTTP Server ───────────────────────────────────────────────────────────
const server = http.createServer(app);

// ─── Socket.IO ─────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: corsOptions.origin,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  // Enable connection state recovery (reconnect without losing room state)
  connectionStateRecovery: {
    maxDisconnectionDuration: 30000, // 30 seconds
    skipMiddlewares: true,
  },
});

// Attach all socket event handlers
initializeSocket(io);

// ─── Start ─────────────────────────────────────────────────────────────────
server.listen(PORT, () => {
  logger.info(`🚀 InterviewPro server running on port ${PORT}`);
  logger.info(`📡 Socket.IO signaling server ready`);
  logger.info(`🌐 CORS allowed for: ${process.env.FRONTEND_URL}`);
  logger.info(`🏥 Health check: http://localhost:${PORT}/api/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    logger.info('Server closed.');
    process.exit(0);
  });
});

module.exports = { app, server, io };
