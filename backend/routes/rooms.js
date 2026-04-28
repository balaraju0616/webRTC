// routes/rooms.js
// REST endpoints for querying room state (read-only).
// Room creation/management happens through Socket.IO events.

const express = require('express');
const roomManager = require('../services/RoomManager');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * GET /api/rooms
 * Returns a summary list of all active rooms.
 */
router.get('/', (req, res) => {
  try {
    const rooms = roomManager.getAllRooms();
    res.json({
      success: true,
      count: rooms.length,
      rooms,
    });
  } catch (err) {
    logger.error('GET /api/rooms error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch rooms' });
  }
});

/**
 * GET /api/rooms/:roomId
 * Returns detailed info about a specific room including participants and recent messages.
 */
router.get('/:roomId', (req, res) => {
  try {
    const { roomId } = req.params;
    const roomInfo = roomManager.getRoomInfo(roomId);

    if (!roomInfo) {
      return res.status(404).json({
        success: false,
        error: `Room "${roomId}" not found`,
      });
    }

    res.json({ success: true, room: roomInfo });
  } catch (err) {
    logger.error(`GET /api/rooms/${req.params.roomId} error:`, err);
    res.status(500).json({ success: false, error: 'Failed to fetch room info' });
  }
});

module.exports = router;
