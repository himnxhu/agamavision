import { useEffect, useRef, useState } from 'react';
import { Socket } from 'socket.io-client';

const configuration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export const useWebRTC = (socket: Socket | null) => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const peerIdRef = useRef<string | null>(null);

  const cleanup = () => {
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    setRemoteStream(null);
    peerIdRef.current = null;
  };

  const createPeerConnection = (to: string) => {
    cleanup();
    peerIdRef.current = to;
    const pc = new RTCPeerConnection(configuration);

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket?.emit('signal', { to, signal: { type: 'candidate', candidate: event.candidate } });
      }
    };

    pc.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
    };

    if (localStream) {
      localStream.getTracks().forEach((track) => {
        pc.addTrack(track, localStream);
      });
    }

    peerConnection.current = pc;
    return pc;
  };

  useEffect(() => {
    const initLocalMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setLocalStream(stream);
      } catch (err) {
        console.error('Error accessing media devices:', err);
      }
    };

    initLocalMedia();

    return () => {
      localStream?.getTracks().forEach(track => track.stop());
    };
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handleSignal = async ({ from, signal }: { from: string; signal: any }) => {
      if (signal.type === 'offer') {
        const pc = createPeerConnection(from);
        await pc.setRemoteDescription(new RTCSessionDescription(signal.offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('signal', { to: from, signal: { type: 'answer', answer } });
      } else if (signal.type === 'answer') {
        await peerConnection.current?.setRemoteDescription(new RTCSessionDescription(signal.answer));
      } else if (signal.type === 'candidate') {
        try {
          await peerConnection.current?.addIceCandidate(new RTCIceCandidate(signal.candidate));
        } catch (e) {
          console.error('Error adding ice candidate', e);
        }
      }
    };

    socket.on('signal', handleSignal);
    socket.on('call_ended', cleanup);

    return () => {
      socket.off('signal', handleSignal);
      socket.off('call_ended', cleanup);
    };
  }, [socket, localStream]);

  const startCall = async (to: string) => {
    peerIdRef.current = to;
    const pc = createPeerConnection(to);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket?.emit('signal', { to, signal: { type: 'offer', offer } });
  };

  const endCall = () => {
    if (peerIdRef.current) {
      socket?.emit('end_call', { to: peerIdRef.current });
    }
    cleanup();
  };

  return { localStream, remoteStream, startCall, endCall, cleanup };
};
