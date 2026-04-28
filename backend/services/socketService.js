// services/socketService.js
// Implements the entire Socket.IO signaling server.
// Handles room joining, WebRTC offer/answer/ICE exchange, and chat.

const roomManager = require('./RoomManager');
const logger = require('../utils/logger');

/**
 * Attaches all Socket.IO event handlers to the server instance.
 * @param {import('socket.io').Server} io
 */
function initializeSocket(io) {
  io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.id}`);

    // ─────────────────────────────────────────────
    // EVENT: join-room
    // Client sends { roomId, userName } to enter a room.
    // We broadcast "user-joined" to all existing peers so they
    // can initiate WebRTC offers toward the newcomer.
    // ─────────────────────────────────────────────
    socket.on('join-room', ({ roomId, userName }) => {
      if (!roomId || !userName) {
        socket.emit('error', { message: 'roomId and userName are required' });
        return;
      }

      // Add user to room manager and join the socket room
      const participant = roomManager.addUserToRoom(roomId, socket.id, userName);
      socket.join(roomId);

      // Get current participants BEFORE adding self (so each existing peer can offer)
      const existingParticipants = roomManager
        .getParticipants(roomId)
        .filter((p) => p.socketId !== socket.id);

      // Send the new user the current participant list and chat history
      const roomInfo = roomManager.getRoomInfo(roomId);
      socket.emit('room-joined', {
        roomId,
        socketId: socket.id,
        participants: roomInfo.participants,
        messages: roomInfo.messages,
      });

      // Notify all OTHER participants that a new user joined.
      // Each existing peer will respond by creating a WebRTC offer to the newcomer.
      socket.to(roomId).emit('user-joined', {
        socketId: socket.id,
        userName,
      });

      logger.debug(`${userName} joined room ${roomId}. Peers: ${existingParticipants.length}`);
    });

    // ─────────────────────────────────────────────
    // WebRTC SIGNALING: webrtc-offer
    // Sender: existing peer → target: new joiner
    // Relays the SDP offer to the specific target socket.
    // ─────────────────────────────────────────────
    socket.on('webrtc-offer', ({ offer, targetSocketId }) => {
      logger.debug(`WebRTC offer: ${socket.id} → ${targetSocketId}`);
      io.to(targetSocketId).emit('webrtc-offer', {
        offer,
        senderSocketId: socket.id,
      });
    });

    // ─────────────────────────────────────────────
    // WebRTC SIGNALING: webrtc-answer
    // Sender: new joiner → target: existing peer who sent offer
    // ─────────────────────────────────────────────
    socket.on('webrtc-answer', ({ answer, targetSocketId }) => {
      logger.debug(`WebRTC answer: ${socket.id} → ${targetSocketId}`);
      io.to(targetSocketId).emit('webrtc-answer', {
        answer,
        senderSocketId: socket.id,
      });
    });

    // ─────────────────────────────────────────────
    // WebRTC SIGNALING: ice-candidate
    // Both peers exchange ICE candidates for NAT traversal.
    // ─────────────────────────────────────────────
    socket.on('ice-candidate', ({ candidate, targetSocketId }) => {
      logger.debug(`ICE candidate: ${socket.id} → ${targetSocketId}`);
      io.to(targetSocketId).emit('ice-candidate', {
        candidate,
        senderSocketId: socket.id,
      });
    });

    // ─────────────────────────────────────────────
    // EVENT: chat-message
    // Stores the message and broadcasts it to everyone in the room.
    // ─────────────────────────────────────────────
    socket.on('chat-message', ({ roomId, text }) => {
      if (!text || !text.trim()) return;

      const message = roomManager.addMessage(roomId, socket.id, text.trim());
      if (!message) return;

      // Broadcast to ALL sockets in the room (including sender for confirmation)
      io.to(roomId).emit('chat-message', message);
      logger.debug(`Chat [${roomId}] ${message.userName}: ${text.substring(0, 60)}`);
    });

    // ─────────────────────────────────────────────
    // EVENT: disconnect
    // Clean up when a socket disconnects (tab close, network drop, etc.)
    // ─────────────────────────────────────────────
    socket.on('disconnect', () => {
      const result = roomManager.removeUser(socket.id);

      if (result) {
        const { roomId, participant } = result;
        // Notify remaining peers to remove this peer's video stream
        socket.to(roomId).emit('user-left', {
          socketId: socket.id,
          userName: participant.userName,
        });
        logger.info(`Socket disconnected: ${socket.id} (${participant.userName})`);
      } else {
        logger.info(`Socket disconnected (no room): ${socket.id}`);
      }
    });

    // ─────────────────────────────────────────────
    // EVENT: leave-room (manual leave, before disconnect)
    // ─────────────────────────────────────────────
    socket.on('leave-room', ({ roomId }) => {
      const result = roomManager.removeUser(socket.id);
      socket.leave(roomId);
      if (result) {
        socket.to(roomId).emit('user-left', {
          socketId: socket.id,
          userName: result.participant.userName,
        });
      }
    });
  });

  logger.info('Socket.IO signaling server initialized');
}

module.exports = { initializeSocket };
