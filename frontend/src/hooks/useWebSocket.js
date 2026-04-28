// hooks/useWebSocket.js
// Manages a single Socket.IO connection for the app lifetime.
// Provides a stable `getSocket()` factory + a `disconnect()` teardown.
// Auto-reconnect is handled by socket.io-client itself (see options below).

import { useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

// Backend URL comes from Vite env; falls back to localhost
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

export function useWebSocket() {
  // Store the socket instance in a ref so it persists across renders
  // without causing re-renders when it changes
  const socketRef = useRef(null);

  /**
   * Returns the existing socket, or creates a new one.
   * Calling this multiple times is safe — it returns the same instance.
   */
  const getSocket = useCallback(() => {
    if (!socketRef.current || !socketRef.current.connected) {
      // Tear down any stale disconnected instance first
      if (socketRef.current) {
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
      }

      socketRef.current = io(BACKEND_URL, {
        // Use WebSocket first, fall back to long-polling
        transports: ['websocket', 'polling'],
        // Auto-reconnect settings
        reconnection: true,
        reconnectionAttempts: 8,
        reconnectionDelay: 1000,        // start with 1 s delay
        reconnectionDelayMax: 10000,    // cap at 10 s
        randomizationFactor: 0.3,       // jitter to avoid thundering herd
        timeout: 20000,
      });
    }
    return socketRef.current;
  }, []);

  /**
   * Cleanly removes all listeners and disconnects.
   * Call this on component unmount.
   */
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  }, []);

  return { getSocket, disconnect };
}
