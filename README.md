# InterviewPro — Real-time Video Interview Platform

A production-ready WebRTC video interview platform built with React, Node.js, Express, Socket.IO, and Tailwind CSS.

## Quick Start

```bash
# 1. Setup (install all deps)
./setup.sh

# 2. Start backend
cd backend && npm run dev
# → http://localhost:5000

# 3. Start frontend (new terminal)
cd frontend && npm run dev
# → http://localhost:5173
```

## Project Structure

```
interviewpro/
├── backend/
│   ├── server.js               # Express + Socket.IO entry point
│   ├── .env                    # PORT, FRONTEND_URL, TURN_SERVER
│   ├── routes/
│   │   ├── index.js            # Route aggregator
│   │   ├── rooms.js            # GET /api/rooms, GET /api/rooms/:id
│   │   └── health.js           # GET /api/health
│   ├── services/
│   │   ├── RoomManager.js      # In-memory room/participant/message store
│   │   └── socketService.js    # All WebRTC signaling events
│   ├── middleware/
│   │   └── index.js            # Helmet, CORS, rate-limit, error handler
│   └── utils/
│       └── logger.js           # Winston logger
│
└── frontend/
    ├── src/
    │   ├── App.jsx             # Router (Landing / Interview)
    │   ├── hooks/
    │   │   ├── useWebSocket.js # Socket.IO connection with auto-reconnect
    │   │   └── useWebRTC.js    # Full WebRTC peer connection lifecycle
    │   ├── pages/
    │   │   ├── LandingPage.jsx # Room ID + userName entry form
    │   │   └── InterviewPage.jsx # Main interview room
    │   ├── components/
    │   │   ├── VideoGrid.jsx       # Responsive video tile grid
    │   │   ├── ChatSidebar.jsx     # Live chat panel
    │   │   ├── ParticipantList.jsx # Active participants list
    │   │   ├── ControlBar.jsx      # Mic / Camera / Chat / Leave buttons
    │   │   └── Notification.jsx    # Animated toast notifications
    │   └── styles/
    │       └── globals.css     # Tailwind + design tokens
    ├── tailwind.config.js
    └── vite.config.js

```

## REST API Endpoints

| Method | Endpoint            | Description               |
|--------|---------------------|---------------------------|
| GET    | /api/health         | Server health + stats     |
| GET    | /api/rooms          | List all active rooms     |
| GET    | /api/rooms/:roomId  | Room details + messages   |

## Socket.IO Events

| Event           | Direction       | Payload                          |
|-----------------|-----------------|----------------------------------|
| join-room       | Client → Server | { roomId, userName }             |
| room-joined     | Server → Client | { socketId, participants, messages } |
| user-joined     | Server → Others | { socketId, userName }           |
| user-left       | Server → Others | { socketId, userName }           |
| webrtc-offer    | Client → Server | { offer, targetSocketId }        |
| webrtc-answer   | Client → Server | { answer, targetSocketId }       |
| ice-candidate   | Client → Server | { candidate, targetSocketId }    |
| chat-message    | Bidirectional   | { roomId, text } / message obj   |

## WebRTC Signaling Flow

```
Peer A (existing)       Signaling Server        Peer B (new)
      |                       |                      |
      |←── user-joined ───────|←── join-room ────────|
      |──── webrtc-offer ────→|─────────────────────→|
      |                       |←── webrtc-answer ────|
      |←── webrtc-answer ─────|                      |
      |──── ice-candidate ───→|────────────────────→|
      |←── ice-candidate ─────|←───────────────────|
      |══════════════ P2P VIDEO (direct) ════════════|
```

## Environment Variables

### Backend `.env`
```
PORT=5000
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
# Optional TURN server for production
# TURN_SERVER=turn:your-server.com:3478
```

### Frontend `.env`
```
VITE_BACKEND_URL=http://localhost:5000
```

## Security Features
- **Helmet** — sets 15+ HTTP security headers
- **CORS** — strict allowlist (localhost + LAN IPs)
- **Rate Limiting** — 100 req/15min per IP
- **Input validation** — roomId/userName required on join
- **Room cleanup** — empty rooms deleted automatically
