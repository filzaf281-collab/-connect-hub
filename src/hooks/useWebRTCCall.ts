"use client";

// ---------------------------------------------------------------------------
// Pure WebRTC (P2P) calling with Supabase Realtime BROADCAST as the signaling
// transport. No external services: only STUN (NAT traversal) is referenced.
//
// Signaling bus design: every client always subscribes to `wcall-${myId}`
// (its OWN topic). The CALLER additionally joins the callee's topic for the
// duration of the call, so offer / answer / ICE candidates / hangup all flow
// on ONE topic (the callee's). Broadcast messages carry {to, from} and each
// client ignores anything not addressed to it.
// ---------------------------------------------------------------------------

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";

export type CallKind = "audio" | "video";

export interface ActiveCall {
  peerId: string;
  peerName: string;
  peerInitial: string;
  dir: "incoming" | "outgoing";
  status: "ringing" | "connecting" | "active";
  kind: CallKind;
}

export interface IncomingCallInfo {
  from: string;
  fromName: string;
  fromInitial: string;
  kind: CallKind;
}

const ICE_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
  ],
};

const RING_TIMEOUT_MS = 45000;

export function useWebRTCCall(
  myId: string | undefined,
  resolveName: (id: string) => { name: string; initial: string }
) {
  const [call, setCall] = useState<ActiveCall | null>(null);
  const [incoming, setIncoming] = useState<IncomingCallInfo | null>(null);
  const [callNotice, setCallNotice] = useState("");
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const ownChannelRef = useRef<any>(null);
  const peerChannelRef = useRef<any>(null);
  const pendingOfferRef = useRef<RTCSessionDescriptionInit | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const callRef = useRef<ActiveCall | null>(null);
  const incomingRef = useRef<IncomingCallInfo | null>(null);
  const ringTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resolveRef = useRef(resolveName);
  const handleSignalRef = useRef<(p: any) => void>(() => {});

  resolveRef.current = resolveName;

  const setCallState = (v: ActiveCall | null) => {
    callRef.current = v;
    setCall(v);
  };
  const setIncomingState = (v: IncomingCallInfo | null) => {
    incomingRef.current = v;
    setIncoming(v);
  };
  const flashNotice = (msg: string) => {
    setCallNotice(msg);
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = setTimeout(() => setCallNotice(""), 3500);
  };

  const stopLocal = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    setMicOn(true);
    setCamOn(true);
  };

  const closePC = () => {
    if (pcRef.current) {
      try {
        pcRef.current.close();
      } catch {
        /* ignore */
      }
      pcRef.current = null;
    }
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
  };

  const teardown = useCallback(() => {
    if (ringTimerRef.current) {
      clearTimeout(ringTimerRef.current);
      ringTimerRef.current = null;
    }
    stopLocal();
    closePC();
    if (peerChannelRef.current) {
      try {
        supabase.removeChannel(peerChannelRef.current);
      } catch {
        /* ignore */
      }
      peerChannelRef.current = null;
    }
    pendingOfferRef.current = null;
    pendingCandidatesRef.current = [];
    remoteStreamRef.current = null;
    setIncomingState(null);
    setCallState(null);
  }, []);

  const signal = (to: string, msg: Record<string, any>) => {
    // Bus = the CALLEE's topic. Caller joined it; callee is always on their own.
    const ch = peerChannelRef.current || ownChannelRef.current;
    try {
      ch?.send?.({ type: "broadcast", event: "wcall", payload: { to, from: myId, ...msg } });
    } catch {
      /* channel may be closing */
    }
  };

  const flushCandidates = async () => {
    const pc = pcRef.current;
    if (!pc) return;
    for (const c of pendingCandidatesRef.current) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(c));
      } catch {
        /* ignore malformed candidate */
      }
    }
    pendingCandidatesRef.current = [];
  };

  const handleSignal = async (p: any) => {
    if (!p || !myId || p.to !== myId) return;
    const from: string = p.from;
    const t: string = p.t;

    if (t === "offer") {
      if (callRef.current || incomingRef.current) {
        signal(from, { t: "busy" });
        return;
      }
      pendingOfferRef.current = p.sdp;
      pendingCandidatesRef.current = [];
      const info = resolveRef.current(from);
      const kind: CallKind = p.kind === "video" ? "video" : "audio";
      setIncomingState({ from, fromName: info.name, fromInitial: info.initial, kind });
      setCallState({
        peerId: from,
        peerName: info.name,
        peerInitial: info.initial,
        dir: "incoming",
        status: "ringing",
        kind,
      });
      if (ringTimerRef.current) clearTimeout(ringTimerRef.current);
      ringTimerRef.current = setTimeout(() => {
        if (incomingRef.current) {
          flashNotice("Call timed out");
          teardown();
        }
      }, RING_TIMEOUT_MS);
    } else if (t === "answer") {
      const pc = pcRef.current;
      if (!pc || !p.sdp) return;
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(p.sdp));
        await flushCandidates();
        if (callRef.current) setCallState({ ...callRef.current, status: "connecting" });
      } catch (err: any) {
        console.log("Call answer error:", err?.message);
      }
    } else if (t === "candidate") {
      const pc = pcRef.current;
      if (!p.candidate) return;
      if (pc?.remoteDescription) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(p.candidate));
        } catch {
          /* ignore */
        }
      } else {
        pendingCandidatesRef.current.push(p.candidate);
      }
    } else if (t === "hangup" || t === "reject" || t === "busy") {
      if (callRef.current || incomingRef.current) {
        flashNotice(t === "busy" ? "Busy" : t === "reject" ? "Call declined" : "Call ended");
        teardown();
      }
    }
  };
  handleSignalRef.current = handleSignal;

  // Always-on signaling listener (own topic) — receives offers sent to me.
  useEffect(() => {
    if (!myId) return;
    const ch = supabase
      .channel(`wcall-${myId}`)
      .on("broadcast", { event: "wcall" }, ({ payload }: any) => handleSignalRef.current(payload))
      .subscribe();
    ownChannelRef.current = ch;
    return () => {
      teardown();
      if (ownChannelRef.current) {
        try {
          supabase.removeChannel(ownChannelRef.current);
        } catch {
          /* ignore */
        }
        ownChannelRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myId]);

  const createPC = () => {
    const pc = new RTCPeerConnection(ICE_CONFIG);
    pcRef.current = pc;
    pc.onicecandidate = (e) => {
      if (e.candidate && callRef.current) {
        signal(callRef.current.peerId, { t: "candidate", candidate: e.candidate.toJSON() });
      }
    };
    pc.ontrack = (e) => {
      remoteStreamRef.current = e.streams[0];
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = e.streams[0];
      }
    };
    pc.onconnectionstatechange = () => {
      const st = pc.connectionState;
      if (st === "connected" && callRef.current) {
        setCallState({ ...callRef.current, status: "active" });
      } else if (st === "failed") {
        flashNotice("Call connection failed");
        teardown();
      }
    };
    return pc;
  };

  const attachLocal = (stream: MediaStream) => {
    if (localVideoRef.current) localVideoRef.current.srcObject = stream;
  };

  const startCall = async (
    peer: { id: string; full_name?: string | null },
    kind: CallKind
  ) => {
    if (!myId || callRef.current || incomingRef.current) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia(
        kind === "video" ? { video: true, audio: true } : { audio: true }
      );
      localStreamRef.current = stream;
      attachLocal(stream);
      const pc = createPC();
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      const info = resolveRef.current(peer.id);
      setCallState({
        peerId: peer.id,
        peerName: info.name,
        peerInitial: info.initial,
        dir: "outgoing",
        status: "ringing",
        kind,
      });

      // Join the callee's topic to exchange signaling (wait for subscription)
      await new Promise<void>((resolve) => {
        let done = false;
        const t = setTimeout(() => {
          if (!done) {
            done = true;
            resolve();
          }
        }, 2000);
        const ch = supabase
          .channel(`wcall-${peer.id}`)
          .on("broadcast", { event: "wcall" }, ({ payload }: any) => handleSignalRef.current(payload))
          .subscribe((status) => {
            if (status === "SUBSCRIBED" && !done) {
              done = true;
              clearTimeout(t);
              resolve();
            }
          });
        peerChannelRef.current = ch;
      });

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      signal(peer.id, { t: "offer", sdp: offer, kind });

      ringTimerRef.current = setTimeout(() => {
        if (callRef.current?.status === "ringing") {
          flashNotice("No answer");
          teardown();
        }
      }, RING_TIMEOUT_MS);
    } catch (err: any) {
      console.log("Call error:", err?.message);
      flashNotice(err?.name === "NotAllowedError" ? "Microphone/camera blocked" : "Unable to start call");
      stopLocal();
      closePC();
      setCallState(null);
    }
  };

  const acceptCall = async () => {
    const inc = incomingRef.current;
    if (!inc || !pendingOfferRef.current) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia(
        inc.kind === "video" ? { video: true, audio: true } : { audio: true }
      );
      localStreamRef.current = stream;
      attachLocal(stream);
      const pc = createPC();
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));
      await pc.setRemoteDescription(new RTCSessionDescription(pendingOfferRef.current));
      await flushCandidates();
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      setIncomingState(null);
      setCallState({
        peerId: inc.from,
        peerName: inc.fromName,
        peerInitial: inc.fromInitial,
        dir: "incoming",
        status: "connecting",
        kind: inc.kind,
      });
      signal(inc.from, { t: "answer", sdp: answer });
    } catch (err: any) {
      console.log("Accept call error:", err?.message);
      flashNotice("Unable to answer call");
      teardown();
    }
  };

  const rejectCall = useCallback(() => {
    const inc = incomingRef.current;
    if (inc) signal(inc.from, { t: "reject" });
    teardown();
  }, [teardown, myId]); // eslint-disable-line react-hooks/exhaustive-deps

  const endCall = useCallback(() => {
    const c = callRef.current;
    if (c) signal(c.peerId, { t: "hangup" });
    teardown();
  }, [teardown, myId]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleMic = () => {
    const on = !!localStreamRef.current?.getAudioTracks()[0]?.enabled;
    localStreamRef.current?.getAudioTracks().forEach((t) => (t.enabled = !on));
    setMicOn(!on);
  };

  const toggleCam = () => {
    const on = !!localStreamRef.current?.getVideoTracks()[0]?.enabled;
    localStreamRef.current?.getVideoTracks().forEach((t) => (t.enabled = !on));
    setCamOn(!on);
  };

  // Ensure media is attached as soon as the call UI mounts, and that remote
  // audio plays even for audio-only calls (video element is mounted hidden).
  useEffect(() => {
    if (!call) return;
    const t = setTimeout(() => {
      if (localVideoRef.current && localStreamRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
      }
      if (remoteVideoRef.current && remoteStreamRef.current) {
        remoteVideoRef.current.srcObject = remoteStreamRef.current;
      }
      if (remoteVideoRef.current) {
        remoteVideoRef.current.play?.().catch(() => {
          /* autoplay restrictions — user gesture already happened on Accept */
        });
      }
    }, 150);
    return () => clearTimeout(t);
  }, [call, call?.status]);

  return {
    call,
    incoming,
    callNotice,
    micOn,
    camOn,
    localVideoRef,
    remoteVideoRef,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMic,
    toggleCam,
  };
}
