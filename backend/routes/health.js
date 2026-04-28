// routes/health.js
// Simple health check endpoint used by load balancers and monitoring tools.

const express = require('express');
const roomManager = require('../services/RoomManager');

const router = express.Router();

/**
 * GET /api/health
 * Returns server status and basic stats.
 */
router.get('/', (req, res) => {
  const rooms = roomManager.getAllRooms();
  const totalParticipants = rooms.reduce((sum, r) => sum + r.participantCount, 0);

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    stats: {
      activeRooms: rooms.length,
      totalParticipants,
    },
  });
});

module.exports = router;
