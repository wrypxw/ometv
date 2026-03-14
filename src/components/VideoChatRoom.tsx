import { useState, useRef, useEffect, useCallback } from "react";
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  SkipForward,
  Send,
  Globe,
  Users,
  Heart,
  Maximize2,
  Search,
  ChevronUp,
  Facebook,
} from "lucide-react";

type ChatStatus = "idle" | "searching" | "connected" | "disconnected";

interface Message {
  id: string;
  text: string;
  sender: "me" | "stranger";
}

const COUNTRIES = [
  "Worldwide", "Brazil", "United States", "United Kingdom", "Canada",
  "France", "Germany", "India", "Japan", "Mexico", "Portugal", "Spain",
];

const STRANGER_MESSAGES = [
  "Hey! Where are you from?", "Hi there! 😊", "Hello!",
  "Hey, how's it going?", "Oi, tudo bem?", "Hola!",
];

const VideoChatRoom = () => {
  const [status, setStatus] = useState<ChatStatus>("idle");
  const [isCamOn, setIsCamOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMsg, setInputMsg] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("Worldwide");
  const [selectedGender, setSelectedGender] = useState("Gender");
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [showGenderDropdown, setShowGenderDropdown] = useState(false);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const startLocalCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
    } catch {
      console.log("Camera access denied");
    }
  }, []);

  useEffect(() => {
    startLocalCamera();
    return () => {
      if (localVideoRef.current?.srcObject) {
        (localVideoRef.current.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
      }
    };
  }, [startLocalCamera]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const startSearch = useCallback(() => {
    setStatus("searching");
    setMessages([]);
    searchTimerRef.current = setTimeout(() => {
      setStatus("connected");
      setTimeout(() => {
        const greeting = STRANGER_MESSAGES[Math.floor(Math.random() * STRANGER_MESSAGES.length)];
        setMessages((prev) => [...prev, { id: crypto.randomUUID(), text: greeting, sender: "stranger" }]);
      }, 1000 + Math.random() * 2000);
    }, 1500 + Math.random() * 3000);
  }, []);

  const nextPerson = useCallback(() => {
    clearTimeout(searchTimerRef.current);
    setMessages([]);
    startSearch();
  }, [startSearch]);

  const stopChat = useCallback(() => {
    clearTimeout(searchTimerRef.current);
    setStatus("disconnected");
  }, []);

  const sendMessage = useCallback(() => {
    const text = inputMsg.trim();
    if (!text || status !== "connected") return;
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), text, sender: "me" }]);
    setInputMsg("");
    if (Math.random() > 0.3) {
      const replies = ["That's cool!", "Haha!", "Really?", "Awesome 😄", "Interesting!", "Same!"];
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          { id: crypto.randomUUID(), text: replies[Math.floor(Math.random() * replies.length)], sender: "stranger" },
        ]);
      }, 800 + Math.random() * 2000);
    }
  }, [inputMsg, status]);

  return (
    <div className="h-screen w-screen flex flex-col md:flex-row overflow-hidden" style={{ background: "#0a0a0f" }}>
      {/* LEFT PANEL - Stranger video */}
      <div
        className="flex-1 relative flex flex-col overflow-hidden"
        style={{
          background: `
            linear-gradient(160deg, rgba(100, 30, 180, 0.6) 0%, transparent 40%),
            linear-gradient(200deg, rgba(130, 40, 220, 0.5) 0%, transparent 35%),
            linear-gradient(340deg, rgba(120, 20, 200, 0.55) 0%, transparent 45%),
            linear-gradient(20deg, rgba(90, 20, 180, 0.4) 0%, transparent 30%),
            #0b0b14
          `,
        }}
      >
        {/* Shop button - top left */}
        <div className="absolute top-4 left-4 z-20">
          <button
            className="flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors"
            style={{ border: "1px solid rgba(234, 179, 8, 0.5)", color: "#eab308" }}
          >
            <Heart className="w-4 h-4 fill-current" />
            Shop
          </button>
        </div>

        {/* Center content */}
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          {/* Mask Logo */}
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mb-5"
            style={{ background: "linear-gradient(135deg, #7c3aed, #6d28d9)" }}
          >
            <svg width="36" height="28" viewBox="0 0 36 28" fill="none">
              <ellipse cx="11" cy="14" rx="8" ry="7" stroke="white" strokeWidth="2" fill="none" />
              <ellipse cx="25" cy="14" rx="8" ry="7" stroke="white" strokeWidth="2" fill="none" />
              <path d="M16 9 C17 7, 19 7, 20 9" stroke="#f97316" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            </svg>
          </div>

          <h1 className="text-3xl font-bold tracking-tight" style={{ color: "rgba(255,255,255,0.45)" }}>
            ChatRandom<span style={{ color: "rgba(255,255,255,0.25)" }}>.gg</span>
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#22c55e" }} />
            <span className="text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>10,264 users online</span>
          </div>

          {/* Share buttons */}
          <div className="flex items-center gap-3 mt-6">
            <button
              className="flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium text-white"
              style={{ background: "#1877F2" }}
            >
              <Facebook className="w-4 h-4" />
              Share
            </button>
            <button
              className="flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium"
              style={{ background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)" }}
            >
              𝕏 Share
            </button>
          </div>
        </div>

        {/* Connected / searching overlays */}
        {status === "searching" && (
          <div className="absolute inset-0 flex items-center justify-center z-10" style={{ background: "rgba(10,10,15,0.7)" }}>
            <div className="text-center space-y-3">
              <div
                className="w-12 h-12 rounded-full border-[3px] animate-spin mx-auto"
                style={{ borderColor: "rgba(124,58,237,0.2)", borderTopColor: "#7c3aed" }}
              />
              <p style={{ color: "rgba(255,255,255,0.5)" }} className="text-sm">Looking for partner...</p>
            </div>
          </div>
        )}

        {status === "connected" && (
          <div className="absolute inset-0 flex items-center justify-center z-10" style={{ background: "#0d0d14" }}>
            <div className="w-24 h-24 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.06)" }}>
              <Users className="w-10 h-10" style={{ color: "rgba(255,255,255,0.2)" }} />
            </div>
          </div>
        )}

        {/* Chat overlay */}
        {(status === "connected" || messages.length > 0) && (
          <div className="absolute bottom-0 left-0 right-0 z-20">
            <div className="max-h-32 overflow-y-auto px-4 pb-1 space-y-1">
              {messages.map((msg) => (
                <div key={msg.id} className="flex items-start gap-2">
                  <span className="text-xs font-bold" style={{ color: msg.sender === "me" ? "#a78bfa" : "#fbbf24" }}>
                    {msg.sender === "me" ? "You:" : "Stranger:"}
                  </span>
                  <span className="text-xs" style={{ color: "rgba(255,255,255,0.8)" }}>{msg.text}</span>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <form
              onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
              className="flex items-center gap-2 px-4 pb-4 pt-1"
            >
              <input
                value={inputMsg}
                onChange={(e) => setInputMsg(e.target.value)}
                placeholder="Type a message..."
                disabled={status !== "connected"}
                className="flex-1 rounded-lg px-3 py-2 text-sm focus:outline-none disabled:opacity-30"
                style={{
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "white",
                }}
              />
              <button
                type="submit"
                disabled={status !== "connected" || !inputMsg.trim()}
                className="p-2 rounded-lg disabled:opacity-30"
                style={{ background: "#7c3aed", color: "white" }}
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}

        {/* Bottom: Start button - inside left panel */}
        <div className="px-6 pb-6 z-20 relative">
          {status === "idle" || status === "disconnected" ? (
            <button
              onClick={startSearch}
              className="w-full max-w-md mx-auto block py-4 rounded-2xl font-semibold text-white text-base transition-opacity hover:opacity-90"
              style={{
                background: "linear-gradient(135deg, #7c3aed, #9333ea)",
              }}
            >
              👋 Start Video Chat
            </button>
          ) : (
            <div className="flex items-center gap-3 justify-center">
              <button
                onClick={stopChat}
                className="px-10 py-4 rounded-2xl font-semibold text-white text-sm transition-opacity hover:opacity-90"
                style={{ background: "linear-gradient(135deg, #7c3aed, #9333ea)" }}
              >
                Stop
              </button>
              <button
                onClick={nextPerson}
                className="px-10 py-4 rounded-2xl font-semibold text-white text-sm flex items-center gap-1.5 transition-opacity hover:opacity-90"
                style={{ background: "linear-gradient(135deg, #7c3aed, #9333ea)" }}
              >
                <SkipForward className="w-4 h-4" />
                Next
              </button>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT PANEL - Your video */}
      <div className="flex-1 relative flex flex-col" style={{ background: "#1a1a24" }}>
        {/* Top left: Expand */}
        <div className="absolute top-4 left-4 z-20">
          <button style={{ color: "rgba(255,255,255,0.3)" }} className="hover:opacity-80 transition-opacity">
            <Maximize2 className="w-5 h-5" />
          </button>
        </div>

        {/* Top right: Search + Log In */}
        <div className="absolute top-4 right-4 z-20 flex items-center gap-4">
          <button style={{ color: "rgba(255,255,255,0.4)" }} className="hover:opacity-80 transition-opacity">
            <Search className="w-5 h-5" />
          </button>
          <button
            className="text-sm font-medium px-4 py-1.5 rounded-lg transition-colors"
            style={{ color: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.15)" }}
          >
            Log In
          </button>
        </div>

        {/* Camera feed */}
        <div className="flex-1 relative">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className={`absolute inset-0 w-full h-full object-cover ${!isCamOn ? "hidden" : ""}`}
          />
          {!isCamOn && (
            <div className="absolute inset-0 flex items-center justify-center">
              <VideoOff className="w-12 h-12" style={{ color: "rgba(255,255,255,0.15)" }} />
            </div>
          )}

          {/* Loading spinner center */}
          {(status === "idle" || status === "disconnected") && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.08)" }}
              >
                <svg className="animate-spin w-6 h-6" style={{ color: "rgba(255,255,255,0.25)" }} viewBox="0 0 24 24" fill="none">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
            </div>
          )}

          {/* Mic/Cam controls */}
          <div className="absolute bottom-4 left-4 z-20 flex items-center gap-1.5">
            <button
              onClick={() => {
                setIsMicOn((v) => !v);
                if (localVideoRef.current?.srcObject)
                  (localVideoRef.current.srcObject as MediaStream).getAudioTracks().forEach((t) => (t.enabled = isMicOn));
              }}
              className="p-2 rounded-lg transition-colors"
              style={{
                background: !isMicOn ? "rgba(239,68,68,0.7)" : "rgba(255,255,255,0.08)",
                color: "rgba(255,255,255,0.7)",
              }}
            >
              {isMicOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
            </button>
            <button
              onClick={() => {
                setIsCamOn((v) => !v);
                if (localVideoRef.current?.srcObject)
                  (localVideoRef.current.srcObject as MediaStream).getVideoTracks().forEach((t) => (t.enabled = !isCamOn));
              }}
              className="p-2 rounded-lg transition-colors"
              style={{
                background: !isCamOn ? "rgba(239,68,68,0.7)" : "rgba(255,255,255,0.08)",
                color: "rgba(255,255,255,0.7)",
              }}
            >
              {isCamOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Bottom right: Filters - inside right panel */}
        <div className="px-6 pb-6 flex justify-center">
          <div
            className="flex items-center rounded-2xl overflow-hidden"
            style={{ border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.03)" }}
          >
            {/* Country */}
            <div className="relative">
              <button
                onClick={() => { setShowCountryDropdown(!showCountryDropdown); setShowGenderDropdown(false); }}
                className="flex items-center gap-2 px-5 py-3.5 text-sm transition-colors"
                style={{ color: "rgba(255,255,255,0.7)" }}
              >
                <Globe className="w-4 h-4" style={{ color: "#22c55e" }} />
                <span>{selectedCountry}</span>
                <ChevronUp className="w-3.5 h-3.5" style={{ color: "rgba(255,255,255,0.35)" }} />
              </button>
              {showCountryDropdown && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setShowCountryDropdown(false)} />
                  <div
                    className="absolute bottom-full mb-1 left-0 rounded-xl shadow-2xl z-40 max-h-60 overflow-y-auto w-52"
                    style={{ background: "#1e1e2e", border: "1px solid rgba(255,255,255,0.1)" }}
                  >
                    {COUNTRIES.map((c) => (
                      <button
                        key={c}
                        onClick={() => { setSelectedCountry(c); setShowCountryDropdown(false); }}
                        className="w-full text-left text-sm px-4 py-2.5 transition-colors"
                        style={{ color: c === selectedCountry ? "#a78bfa" : "rgba(255,255,255,0.7)" }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div style={{ width: "1px", height: "24px", background: "rgba(255,255,255,0.1)" }} />

            {/* Gender */}
            <div className="relative">
              <button
                onClick={() => { setShowGenderDropdown(!showGenderDropdown); setShowCountryDropdown(false); }}
                className="flex items-center gap-2 px-5 py-3.5 text-sm transition-colors"
                style={{ color: "rgba(255,255,255,0.7)" }}
              >
                <Users className="w-4 h-4" style={{ color: "#a78bfa" }} />
                <span>{selectedGender}</span>
                <ChevronUp className="w-3.5 h-3.5" style={{ color: "rgba(255,255,255,0.35)" }} />
              </button>
              {showGenderDropdown && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setShowGenderDropdown(false)} />
                  <div
                    className="absolute bottom-full mb-1 right-0 rounded-xl shadow-2xl z-40 w-40"
                    style={{ background: "#1e1e2e", border: "1px solid rgba(255,255,255,0.1)" }}
                  >
                    {["Gender", "Male", "Female", "Couple"].map((g) => (
                      <button
                        key={g}
                        onClick={() => { setSelectedGender(g); setShowGenderDropdown(false); }}
                        className="w-full text-left text-sm px-4 py-2.5 transition-colors"
                        style={{ color: g === selectedGender ? "#a78bfa" : "rgba(255,255,255,0.7)" }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoChatRoom;
