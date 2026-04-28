// services/RoomManager.js
// Manages all rooms, participants, and message history in memory.
// In production, swap the Map storage for Redis or a DB.

const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

class RoomManager {
  constructor() {
    // Map<roomId, RoomObject>
    this.rooms = new Map();
  }

  /**
   * Creates a new room or returns the existing one.
   * @param {string} roomId - The room identifier
   * @returns {object} The room object
   */
  createRoom(roomId) {
    if (!this.rooms.has(roomId)) {
      const room = {
        id: roomId,
        createdAt: new Date().toISOString(),
        participants: new Map(), // Map<socketId, { userName, socketId, joinedAt }>
        messages: [],           // Array of chat message objects
      };
      this.rooms.set(roomId, room);
      logger.info(`Room created: ${roomId}`);
    }
    return this.rooms.get(roomId);
  }

  /**
   * Adds a user to a room. Creates the room if it doesn't exist.
   * @param {string} roomId
   * @param {string} socketId
   * @param {string} userName
   * @returns {object} The added participant
   */
  addUserToRoom(roomId, socketId, userName) {
    const room = this.createRoom(roomId);
    const participant = {
      socketId,
      userName,
      joinedAt: new Date().toISOString(),
    };
    room.participants.set(socketId, participant);
    logger.info(`User "${userName}" (${socketId}) joined room ${roomId}`);
    return participant;
  }

  /**
   * Removes a user from their room.
   * Cleans up the room if it becomes empty.
   * @param {string} socketId
   * @returns {{ roomId: string, participant: object } | null}
   */
  removeUser(socketId) {
    for (const [roomId, room] of this.rooms.entries()) {
      if (room.participants.has(socketId)) {
        const participant = room.participants.get(socketId);
        room.participants.delete(socketId);
        logger.info(`User "${participant.userName}" (${socketId}) left room ${roomId}`);

        // Clean up empty rooms to prevent memory leaks
        if (room.participants.size === 0) {
          this.rooms.delete(roomId);
          logger.info(`Room ${roomId} was empty and has been deleted`);
        }

        return { roomId, participant };
      }
    }
    return null;
  }

  /**
   * Returns all participants in a room as a plain array.
   * @param {string} roomId
   * @returns {Array}
   */
  getParticipants(roomId) {
    const room = this.rooms.get(roomId);
    if (!room) return [];
    return Array.from(room.participants.values());
  }

  /**
   * Adds a chat message to the room's history.
   * @param {string} roomId
   * @param {string} socketId
   * @param {string} text
   * @returns {object|null} The stored message object
   */
  addMessage(roomId, socketId, text) {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    const participant = room.participants.get(socketId);
    if (!participant) return null;

    const message = {
      id: uuidv4(),
      socketId,
      userName: participant.userName,
      text,
      timestamp: new Date().toISOString(),
    };
    room.messages.push(message);

    // Keep only the last 200 messages per room
    if (room.messages.length > 200) {
      room.messages.shift();
    }

    return message;
  }

  /**
   * Returns room info including participant count and recent messages.
   * @param {string} roomId
   * @returns {object|null}
   */
  getRoomInfo(roomId) {
    const room = this.rooms.get(roomId);
    if (!room) return null;
    return {
      id: room.id,
      createdAt: room.createdAt,
      participantCount: room.participants.size,
      participants: this.getParticipants(roomId),
      messages: room.messages.slice(-50), // return last 50 messages
    };
  }

  /**
   * Returns a summary of all active rooms.
   * @returns {Array}
   */
  getAllRooms() {
    const result = [];
    for (const [roomId, room] of this.rooms.entries()) {
      result.push({
        id: roomId,
        createdAt: room.createdAt,
        participantCount: room.participants.size,
      });
    }
    return result;
  }

  /**
   * Finds which room a socket belongs to.
   * @param {string} socketId
   * @returns {string|null} roomId
   */
  getRoomBySocketId(socketId) {
    for (const [roomId, room] of this.rooms.entries()) {
      if (room.participants.has(socketId)) return roomId;
    }
    return null;
  }
}

// Export a singleton instance so all modules share the same state
module.exports = new RoomManager();
