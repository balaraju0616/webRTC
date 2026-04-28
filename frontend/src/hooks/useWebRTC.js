// hooks/useWebRTC.js
// Encapsulates the entire WebRTC lifecycle:
//   - Acquiring local camera/mic (getUserMedia)
//   - Creating RTCPeerConnections per remote peer
//   - Offer / Answer / ICE candidate exchange (via socket signaling)
//   - Tracking remote streams by socketId
//   - Media toggle controls (mute / video off)
//   - Full cleanup on unmount

import { useRef, useState, useCallback } from 'react';

// Google STUN servers — freely available, no auth required
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
  ],
};

export function useWebRTC(socket) {
  // ── State exposed to components ──────────────────────────────────────────
  const [localStream, setLocalStream]   = useState(null);
  // remoteStreams: { [socketId]: { stream: MediaStream|null, userName: string } }
  const [remoteStreams, setRemoteStreams] = useState({});
  const [isMuted,    setIsMuted]    = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  // ── Internal refs (not reactive — mutations don't trigger re-renders) ────
  // peerConnections: { [socketId]: RTCPeerConnection }
  const peerConnections = useRef({});
  // Keep a ref copy of localStream for use inside callbacks
  const localStreamRef  = useRef(null);
  // Track which socket we're using (socket prop can change between renders)
  const socketRef       = useRef(socket);
  socketRef.current = socket; // always up-to-date

  // ── 1. Acquire local camera + microphone ─────────────────────────────────
  const initLocalStream = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width:       { ideal: 1280 },
          height:      { ideal: 720  },
          frameRate:   { ideal: 24   },
          facingMode:  'user',
        },
        audio: {
          echoCancellation:   true,
          noiseSuppression:   true,
          autoGainControl:    true,
        },
      });
      localStreamRef.current = stream;
      setLocalStream(stream);
      return stream;
    } catch (err) {
      // NotAllowedError = user denied permission
      // NotFoundError   = no camera/mic found
      console.error('[WebRTC] getUserMedia failed:', err.name, err.message);
      throw err;
    }
  }, []);

  // ── Helper: remove a peer's stream + close their RTCPeerConnection ────────
  const removeRemoteStream = useCallback((socketId) => {
    const pc = peerConnections.current[socketId];
    if (pc) {
      pc.ontrack       = null;
      pc.onicecandidate = null;
      pc.onconnectionstatechange = null;
      pc.close();
      delete peerConnections.current[socketId];
    }
    setRemoteStreams((prev) => {
      const next = { ...prev };
      delete next[socketId];
      return next;
    });
  }, []);

  // ── 2. Create an RTCPeerConnection for a specific remote peer ─────────────
  const createPeerConnection = useCallback((targetSocketId) => {
    // If a connection already exists, close it first
    if (peerConnections.current[targetSocketId]) {
      removeRemoteStream(targetSocketId);
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);

    // Add every local track so the remote peer receives audio + video
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    // When the remote peer's track arrives, store it
    pc.ontrack = (event) => {
      // event.streams[0] is the full MediaStream (audio + video combined)
      const [remoteStream] = event.streams;
      setRemoteStreams((prev) => ({
        ...prev,
        [targetSocketId]: {
          ...(prev[targetSocketId] || {}),
          stream: remoteStream,
        },
      }));
    };

    // Forward local ICE candidates to the remote peer via the signaling server
    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit('ice-candidate', {
          candidate:      event.candidate,
          targetSocketId,
        });
      }
    };

    // Log connection state changes; clean up on failure
    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      console.log(`[WebRTC] Peer ${targetSocketId} → ${state}`);
      if (state === 'failed' || state === 'closed') {
        removeRemoteStream(targetSocketId);
      }
    };

    // Log ICE gathering state for debugging
    pc.onicegatheringstatechange = () => {
      console.log(`[WebRTC] ICE gathering (${targetSocketId}): ${pc.iceGatheringState}`);
    };

    peerConnections.current[targetSocketId] = pc;
    return pc;
  }, [removeRemoteStream]);

  // ── 3. INITIATOR path: build offer and send it to a new joiner ───────────
  // Called by existing peers when they receive a 'user-joined' event.
  const createOffer = useCallback(async (targetSocketId, userName) => {
    try {
      const pc = createPeerConnection(targetSocketId);

      // Pre-register the peer so the UI can show a placeholder immediately
      setRemoteStreams((prev) => ({
        ...prev,
        [targetSocketId]: {
          stream:   null,
          userName: userName || targetSocketId,
        },
      }));

      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });

      // setLocalDescription triggers ICE gathering
      await pc.setLocalDescription(offer);

      socketRef.current.emit('webrtc-offer', {
        offer,
        targetSocketId,
      });

      console.log(`[WebRTC] Offer sent to ${targetSocketId}`);
    } catch (err) {
      console.error('[WebRTC] createOffer error:', err);
    }
  }, [createPeerConnection]);

  // ── 4. RESPONDER path: receive offer, produce answer ─────────────────────
  // Called when this peer receives a 'webrtc-offer' socket event.
  const handleOffer = useCallback(async ({ offer, senderSocketId, userName }) => {
    try {
      const pc = createPeerConnection(senderSocketId);

      setRemoteStreams((prev) => ({
        ...prev,
        [senderSocketId]: {
          stream:   null,
          userName: userName || senderSocketId,
        },
      }));

      await pc.setRemoteDescription(new RTCSessionDescription(offer));

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socketRef.current.emit('webrtc-answer', {
        answer,
        targetSocketId: senderSocketId,
      });

      console.log(`[WebRTC] Answer sent to ${senderSocketId}`);
    } catch (err) {
      console.error('[WebRTC] handleOffer error:', err);
    }
  }, [createPeerConnection]);

  // ── 5. Complete the initiator's handshake with the received answer ────────
  const handleAnswer = useCallback(async ({ answer, senderSocketId }) => {
    try {
      const pc = peerConnections.current[senderSocketId];
      if (!pc) {
        console.warn('[WebRTC] handleAnswer: no peer connection for', senderSocketId);
        return;
      }
      // Guard: only apply remote description if we're waiting for it
      if (pc.signalingState !== 'have-local-offer') {
        console.warn('[WebRTC] handleAnswer: unexpected signaling state:', pc.signalingState);
        return;
      }
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
      console.log(`[WebRTC] Answer received from ${senderSocketId}`);
    } catch (err) {
      console.error('[WebRTC] handleAnswer error:', err);
    }
  }, []);

  // ── 6. Trickle ICE: add incoming ICE candidates ────────────────────────
  const handleIceCandidate = useCallback(async ({ candidate, senderSocketId }) => {
    try {
      const pc = peerConnections.current[senderSocketId];
      if (pc && candidate) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
    } catch (err) {
      // This can happen if the candidate arrives before remoteDescription is set;
      // in practice, candidates arrive after the answer exchange, so this is rare.
      console.error('[WebRTC] addIceCandidate error:', err);
    }
  }, []);

  // ── 7. Media controls ──────────────────────────────────────────────────────
  const toggleMute = useCallback(() => {
    if (!localStreamRef.current) return;
    localStreamRef.current.getAudioTracks().forEach((track) => {
      track.enabled = !track.enabled;
    });
    setIsMuted((prev) => !prev);
  }, []);

  const toggleVideo = useCallback(() => {
    if (!localStreamRef.current) return;
    localStreamRef.current.getVideoTracks().forEach((track) => {
      track.enabled = !track.enabled;
    });
    setIsVideoOff((prev) => !prev);
  }, []);

  // ── 8. Full cleanup (call on component unmount) ────────────────────────────
  const cleanup = useCallback(() => {
    // Close all peer connections
    Object.values(peerConnections.current).forEach((pc) => {
      pc.ontrack = null;
      pc.onicecandidate = null;
      pc.onconnectionstatechange = null;
      pc.close();
    });
    peerConnections.current = {};

    // Stop all local media tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }

    setLocalStream(null);
    setRemoteStreams({});
    setIsMuted(false);
    setIsVideoOff(false);
  }, []);

  return {
    // State
    localStream,
    remoteStreams,
    isMuted,
    isVideoOff,
    // Actions
    initLocalStream,
    createOffer,
    handleOffer,
    handleAnswer,
    handleIceCandidate,
    removeRemoteStream,
    toggleMute,
    toggleVideo,
    cleanup,
  };
}
