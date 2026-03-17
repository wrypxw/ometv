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
  private isActive = true;
  private hasMatched = false;

  constructor() {
    this.sessionId = crypto.randomUUID();
  }

  getSessionId() {
    return this.sessionId;
  }

  private emitMatch(partnerSessionId: string) {
    if (!this.isActive || this.hasMatched) return;

    const ids = [this.sessionId, partnerSessionId].sort();
    const roomId = `${ids[0]}_${ids[1]}`;
    const isInitiator = this.sessionId === ids[0];

    this.hasMatched = true;
    this.stopPolling();

    if (this.subscription) {
      supabase.removeChannel(this.subscription);
      this.subscription = null;
    }

    this.onMatch?.(roomId, isInitiator);
  }

  async findMatch(onMatch: MatchCallback) {
    this.onMatch = onMatch;
    this.isActive = true;
    this.hasMatched = false;

    // Clean up old entries first
    const { error: cleanupError } = await supabase.rpc("cleanup_old_queue_entries");
    if (cleanupError) console.warn("Cleanup error (non-blocking):", cleanupError);

    // Best effort cleanup for stale rows from the same matchmaker instance
    await supabase.from("match_queue").delete().eq("session_id", this.sessionId);

    // Insert ourselves as waiting first
    const { error: insertError } = await supabase.from("match_queue").insert({
      session_id: this.sessionId,
      status: "waiting",
      matched_with: null,
    });
    if (insertError) {
      console.error("Failed to join match queue:", insertError);
      throw insertError;
    }

    const matched = await this.tryMatch();
    if (matched || !this.isActive) return;

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
          if (!this.isActive || this.hasMatched) return;

          const updated = payload.new as any;
          if (updated.status === "matched" && updated.matched_with) {
            this.emitMatch(updated.matched_with);
          }
        }
      )
      .subscribe();

    // Also poll as fallback in case realtime misses events
    this.pollInterval = setInterval(async () => {
      if (!this.isActive || this.hasMatched) return;

      const { data } = await supabase
        .from("match_queue")
        .select("status, matched_with")
        .eq("session_id", this.sessionId)
        .maybeSingle();

      if (!this.isActive || this.hasMatched) return;

      if (data?.status === "matched" && data.matched_with) {
        this.emitMatch(data.matched_with);
      } else if (data?.status === "waiting") {
        await this.tryMatch();
      }
    }, 300);
  }

  private async tryMatch(): Promise<boolean> {
    if (!this.isActive || this.hasMatched) return false;

    const { data: selfEntry } = await supabase
      .from("match_queue")
      .select("id, status, created_at")
      .eq("session_id", this.sessionId)
      .maybeSingle();

    if (!selfEntry || selfEntry.status !== "waiting") {
      return false;
    }

    const { data: waitingCandidates } = await supabase
      .from("match_queue")
      .select("id, session_id, created_at")
      .eq("status", "waiting")
      .neq("session_id", this.sessionId)
      .order("created_at", { ascending: true })
      .limit(20);

    if (!waitingCandidates || waitingCandidates.length === 0) {
      return false;
    }

    // Sort candidates: older entries first (we claim older entries)
    // But also allow claiming newer entries if we are the older one
    // This way BOTH sides can initiate, preventing deadlocks
    const sortedCandidates = [...waitingCandidates].sort((a, b) => {
      if (a.created_at < b.created_at) return -1;
      if (a.created_at > b.created_at) return 1;
      return a.session_id < b.session_id ? -1 : 1;
    });

    // Determine if we should be the claimer for each candidate
    // Rule: the entry with the LATER timestamp (or larger session_id as tiebreak) claims
    for (const candidate of sortedCandidates) {
      if (!this.isActive || this.hasMatched) return false;

      const weAreNewer =
        selfEntry.created_at > candidate.created_at ||
        (selfEntry.created_at === candidate.created_at && this.sessionId > candidate.session_id);

      if (!weAreNewer) continue; // Only the newer entry should claim

      // Try to claim this candidate atomically
      const { data: updatedOther, error: otherError } = await supabase
        .from("match_queue")
        .update({ status: "matched", matched_with: this.sessionId })
        .eq("id", candidate.id)
        .eq("status", "waiting")
        .select("session_id")
        .maybeSingle();

      if (otherError || !updatedOther) {
        // This candidate was already claimed by someone else, try next
        continue;
      }

      if (!this.isActive || this.hasMatched) {
        // We got cancelled while claiming, rollback
        await supabase
          .from("match_queue")
          .update({ status: "waiting", matched_with: null })
          .eq("id", candidate.id)
          .eq("status", "matched")
          .eq("matched_with", this.sessionId);
        return false;
      }

      // Now claim ourselves
      const { data: updatedSelf, error: selfError } = await supabase
        .from("match_queue")
        .update({ status: "matched", matched_with: candidate.session_id })
        .eq("id", selfEntry.id)
        .eq("status", "waiting")
        .select("id")
        .maybeSingle();

      if (selfError || !updatedSelf) {
        // Rollback the other entry and try next candidate
        await supabase
          .from("match_queue")
          .update({ status: "waiting", matched_with: null })
          .eq("id", candidate.id)
          .eq("status", "matched")
          .eq("matched_with", this.sessionId);
        continue;
      }

      this.emitMatch(candidate.session_id);
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
    this.isActive = false;
    this.hasMatched = true;
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
    void this.cancel();
  }
}

export class WebRTCConnection {
  private pc: RTCPeerConnection;
  private roomId: string;
  private sessionId: string;
  private signalingChannel: ReturnType<typeof supabase.channel> | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private remoteStream: MediaStream | null = null;
  private suppressDisconnectCallback = false;
  private isDestroyed = false;
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

    this.remoteStream = new MediaStream();

    this.pc.ontrack = (event) => {
      if (event.streams[0]) {
        // Use the stream directly when available
        this.remoteStream = event.streams[0];
      } else {
        // Mobile browsers may send tracks without streams - add individually
        this.remoteStream!.addTrack(event.track);
      }
      this.onRemoteStream?.(this.remoteStream!);
    };

    this.pc.oniceconnectionstatechange = () => {
      if (this.pc.iceConnectionState === "connected") {
        this.onConnected?.();
      }
      if (
        (this.pc.iceConnectionState === "disconnected" ||
          this.pc.iceConnectionState === "failed" ||
          this.pc.iceConnectionState === "closed") &&
        !this.suppressDisconnectCallback &&
        !this.isDestroyed
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
          if (signal.sender_id === this.sessionId || this.isDestroyed) return;

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
    if (this.isDestroyed) return;

    await supabase.from("signaling").insert({
      room_id: this.roomId,
      sender_id: this.sessionId,
      type,
      payload,
    });
  }

  destroy(suppressDisconnectCallback: boolean = true) {
    if (this.isDestroyed) return;

    this.suppressDisconnectCallback = suppressDisconnectCallback;
    this.isDestroyed = true;

    if (this.signalingChannel) {
      supabase.removeChannel(this.signalingChannel);
      this.signalingChannel = null;
    }

    this.dataChannel?.close();
    this.pc.close();
    void supabase.from("signaling").delete().eq("room_id", this.roomId);
  }
}
