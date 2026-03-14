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

  constructor() {
    this.sessionId = crypto.randomUUID();
  }

  getSessionId() {
    return this.sessionId;
  }

  async findMatch(onMatch: MatchCallback) {
    this.onMatch = onMatch;

    // Clean up old entries first
    await supabase.rpc("cleanup_old_queue_entries");

    // Check if there's someone waiting
    const { data: waiting } = await supabase
      .from("match_queue")
      .select("*")
      .eq("status", "waiting")
      .neq("session_id", this.sessionId)
      .order("created_at", { ascending: true })
      .limit(1)
      .single();

    if (waiting) {
      // Match found! Update both entries
      const roomId = crypto.randomUUID();

      await supabase
        .from("match_queue")
        .update({ status: "matched", matched_with: this.sessionId })
        .eq("id", waiting.id);

      // Insert our entry as matched
      await supabase.from("match_queue").insert({
        session_id: this.sessionId,
        status: "matched",
        matched_with: waiting.session_id,
      });

      // We are the initiator (we create the offer)
      onMatch(roomId, true);
    } else {
      // No one waiting, add ourselves to queue
      await supabase.from("match_queue").insert({
        session_id: this.sessionId,
        status: "waiting",
      });

      // Listen for someone to match with us
      this.subscription = supabase
        .channel("match_queue_changes")
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
              const roomId = updated.matched_with + "_" + this.sessionId;
              this.onMatch?.(roomId, false);
            }
          }
        )
        .subscribe();
    }
  }

  async cancel() {
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
  public onRemoteStream: ((stream: MediaStream) => void) | null = null;
  public onDisconnected: (() => void) | null = null;

  constructor(roomId: string, sessionId: string) {
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
      if (
        this.pc.iceConnectionState === "disconnected" ||
        this.pc.iceConnectionState === "failed" ||
        this.pc.iceConnectionState === "closed"
      ) {
        this.onDisconnected?.();
      }
    };
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

          if (signal.type === "offer") {
            await this.pc.setRemoteDescription(new RTCSessionDescription(signal.payload));
            const answer = await this.pc.createAnswer();
            await this.pc.setLocalDescription(answer);
            await this.sendSignal("answer", answer);
          } else if (signal.type === "answer") {
            await this.pc.setRemoteDescription(new RTCSessionDescription(signal.payload));
          } else if (signal.type === "ice-candidate") {
            try {
              await this.pc.addIceCandidate(new RTCIceCandidate(signal.payload));
            } catch (e) {
              console.log("Error adding ICE candidate:", e);
            }
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
    // Clean up signaling data
    supabase
      .from("signaling")
      .delete()
      .eq("room_id", this.roomId)
      .then(() => {});
  }
}
