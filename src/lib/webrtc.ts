import { supabase } from "@/integrations/supabase/client";

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
];

export type MatchCallback = (roomId: string, isInitiator: boolean) => void;

export class Matchmaker {
  private sessionId: string;
  private subscription: ReturnType<typeof supabase.channel> | null = null;
  private onMatch: MatchCallback | null = null;
  private pollInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.sessionId = crypto.randomUUID();
  }

  getSessionId() {
    return this.sessionId;
  }

  async findMatch(onMatch: MatchCallback) {
    this.onMatch = onMatch;

    // Clean up old entries first
    const { error: cleanupError } = await supabase.rpc("cleanup_old_queue_entries");
    if (cleanupError) console.warn("Cleanup error (non-blocking):", cleanupError);

    // Insert ourselves as waiting first
    const { error: insertError } = await supabase.from("match_queue").insert({
      session_id: this.sessionId,
      status: "waiting",
    });
    if (insertError) {
      console.error("Failed to join match queue:", insertError);
      throw insertError;
    }

    // Now try to find someone else waiting
    const matched = await this.tryMatch();
    if (matched) return;

    // Listen for changes via realtime
    this.subscription = supabase
      .channel(`match_queue_${this.sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "match_queue",
          filter: `session_id=eq.${this.sessionId}`,
        },
        (payload) => {
          const updated = payload.new as any;
          if (updated.status === "matched" && updated.matched_with) {
            // The other person matched us - they are the initiator
            // Use THEIR session_id as room prefix for consistency
            const roomId = updated.matched_with + "_" + this.sessionId;
            this.stopPolling();
            this.onMatch?.(roomId, false);
          }
        }
      )
      .subscribe();

    // Also poll as fallback in case realtime misses events
    this.pollInterval = setInterval(async () => {
      const { data } = await supabase
        .from("match_queue")
        .select("*")
        .eq("session_id", this.sessionId)
        .single();

      if (data && data.status === "matched" && data.matched_with) {
        const roomId = data.matched_with + "_" + this.sessionId;
        this.stopPolling();
        this.onMatch?.(roomId, false);
      } else if (data && data.status === "waiting") {
        // Try to match again
        await this.tryMatch();
      }
    }, 800);
  }

  private async tryMatch(): Promise<boolean> {
    // Look for someone else waiting
    const { data: waiting } = await supabase
      .from("match_queue")
      .select("*")
      .eq("status", "waiting")
      .neq("session_id", this.sessionId)
      .order("created_at", { ascending: true })
      .limit(1)
      .single();

    if (waiting) {
      // Use OUR session_id as room prefix since we are the initiator
      const roomId = this.sessionId + "_" + waiting.session_id;

      // Update the other person's entry to matched
      const { error } = await supabase
        .from("match_queue")
        .update({ status: "matched", matched_with: this.sessionId })
        .eq("id", waiting.id)
        .eq("status", "waiting"); // Only if still waiting (avoid race)

      if (error) return false;

      // Update our entry too
      await supabase
        .from("match_queue")
        .update({ status: "matched", matched_with: waiting.session_id })
        .eq("session_id", this.sessionId);

      this.stopPolling();
      this.onMatch?.(roomId, true);
      return true;
    }

    return false;
  }

  private stopPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  async cancel() {
    this.stopPolling();
    if (this.subscription) {
      supabase.removeChannel(this.subscription);
      this.subscription = null;
    }
    await supabase
      .from("match_queue")
      .delete()
      .eq("session_id", this.sessionId);
  }

  destroy() {
    this.cancel();
  }
}

export class WebRTCConnection {
  private pc: RTCPeerConnection;
  private roomId: string;
  private sessionId: string;
  private signalingChannel: ReturnType<typeof supabase.channel> | null = null;
  private dataChannel: RTCDataChannel | null = null;
  public onRemoteStream: ((stream: MediaStream) => void) | null = null;
  public onDisconnected: (() => void) | null = null;
  public onMessage: ((text: string) => void) | null = null;
  public onConnected: (() => void) | null = null;

  constructor(roomId: string, sessionId: string, isInitiator: boolean = false) {
    this.roomId = roomId;
    this.sessionId = sessionId;
    this.pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignal("ice-candidate", event.candidate.toJSON());
      }
    };

    this.pc.ontrack = (event) => {
      if (event.streams[0] && this.onRemoteStream) {
        this.onRemoteStream(event.streams[0]);
      }
    };

    this.pc.oniceconnectionstatechange = () => {
      if (this.pc.iceConnectionState === "connected") {
        this.onConnected?.();
      }
      if (
        this.pc.iceConnectionState === "disconnected" ||
        this.pc.iceConnectionState === "failed" ||
        this.pc.iceConnectionState === "closed"
      ) {
        this.onDisconnected?.();
      }
    };

    // Data channel for text chat
    if (isInitiator) {
      this.dataChannel = this.pc.createDataChannel("chat");
      this.setupDataChannel(this.dataChannel);
    }

    this.pc.ondatachannel = (event) => {
      this.dataChannel = event.channel;
      this.setupDataChannel(this.dataChannel);
    };
  }

  private setupDataChannel(channel: RTCDataChannel) {
    channel.onmessage = (event) => {
      this.onMessage?.(event.data);
    };
  }

  sendChatMessage(text: string): boolean {
    if (this.dataChannel && this.dataChannel.readyState === "open") {
      this.dataChannel.send(text);
      return true;
    }
    return false;
  }

  addLocalStream(stream: MediaStream) {
    stream.getTracks().forEach((track) => {
      this.pc.addTrack(track, stream);
    });
  }

  async startListening() {
    this.signalingChannel = supabase
      .channel(`signaling_${this.roomId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "signaling",
          filter: `room_id=eq.${this.roomId}`,
        },
        async (payload) => {
          const signal = payload.new as any;
          if (signal.sender_id === this.sessionId) return;

          try {
            if (signal.type === "offer") {
              await this.pc.setRemoteDescription(new RTCSessionDescription(signal.payload));
              const answer = await this.pc.createAnswer();
              await this.pc.setLocalDescription(answer);
              await this.sendSignal("answer", answer);
            } else if (signal.type === "answer") {
              await this.pc.setRemoteDescription(new RTCSessionDescription(signal.payload));
            } else if (signal.type === "ice-candidate") {
              await this.pc.addIceCandidate(new RTCIceCandidate(signal.payload));
            }
          } catch (e) {
            console.log("Signaling error:", e);
          }
        }
      )
      .subscribe();
  }

  async createOffer() {
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    await this.sendSignal("offer", offer);
  }

  private async sendSignal(type: string, payload: any) {
    await supabase.from("signaling").insert({
      room_id: this.roomId,
      sender_id: this.sessionId,
      type,
      payload,
    });
  }

  destroy() {
    if (this.signalingChannel) {
      supabase.removeChannel(this.signalingChannel);
    }
    this.pc.close();
    supabase
      .from("signaling")
      .delete()
      .eq("room_id", this.roomId)
      .then(() => {});
  }
}
