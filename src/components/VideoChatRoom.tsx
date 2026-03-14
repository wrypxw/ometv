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
  "Argentina", "Colombia", "Italy", "Turkey", "Russia", "Indonesia",
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
    <div className="h-screen w-screen flex flex-col bg-background overflow-hidden">
      {/* Main video area */}
      <div className="flex-1 flex flex-col md:flex-row relative min-h-0">
        {/* LEFT: Stranger video panel */}
        <div className="flex-1 relative" style={{ background: "hsl(228 20% 6%)" }}>
          {/* Shop button top-left */}
          <div className="absolute top-4 left-4 z-20">
            <button className="flex items-center gap-1.5 border border-yellow-600/60 text-yellow-500 rounded-full px-3.5 py-1.5 text-xs font-medium hover:bg-yellow-500/10 transition-colors">
              <Heart className="w-3.5 h-3.5 fill-yellow-500" />
              Shop
            </button>
          </div>

          {/* Center content: logo + name + users */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            {/* Mask Logo */}
            <div className="mb-4">
              <svg width="64" height="48" viewBox="0 0 64 48" fill="none">
                <ellipse cx="20" cy="24" rx="14" ry="12" stroke="hsl(262 70% 55%)" strokeWidth="3" fill="none" />
                <ellipse cx="44" cy="24" rx="14" ry="12" stroke="hsl(40 90% 55%)" strokeWidth="3" fill="none" />
                <path d="M28 18 C30 14, 34 14, 36 18" stroke="hsl(160 70% 50%)" strokeWidth="2.5" fill="none" strokeLinecap="round" />
              </svg>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-muted-foreground/50 tracking-tight">
              ChatRandom<span className="text-muted-foreground/30">.gg</span>
            </h1>
            <div className="flex items-center gap-1.5 mt-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-sm text-muted-foreground/50">10,210 users online</span>
            </div>
            {/* Share buttons */}
            <div className="flex items-center gap-3 mt-5 pointer-events-auto">
              <button className="flex items-center gap-1.5 bg-[#1877F2]/20 text-[#1877F2] rounded-full px-4 py-1.5 text-xs font-medium hover:bg-[#1877F2]/30 transition-colors">
                <Facebook className="w-3.5 h-3.5" />
                Share
              </button>
              <button className="flex items-center gap-1.5 bg-foreground/10 text-foreground/60 rounded-full px-4 py-1.5 text-xs font-medium hover:bg-foreground/20 transition-colors">
                𝕏 Share
              </button>
            </div>
          </div>

          {/* Connected state overlay */}
          {status === "searching" && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/60 z-10">
              <div className="text-center space-y-3">
                <div className="w-12 h-12 rounded-full border-[3px] border-muted/50 border-t-primary animate-spin mx-auto" />
                <p className="text-muted-foreground text-sm">Looking for partner...</p>
              </div>
            </div>
          )}

          {status === "connected" && (
            <div className="absolute inset-0 flex items-center justify-center z-10" style={{ background: "hsl(228 20% 6%)" }}>
              <div className="w-24 h-24 rounded-full bg-secondary/50 flex items-center justify-center">
                <Users className="w-10 h-10 text-muted-foreground/40" />
              </div>
            </div>
          )}

          {/* Chat overlay at bottom of stranger panel */}
          {(status === "connected" || messages.length > 0) && (
            <div className="absolute bottom-0 left-0 right-0 z-20">
              <div className="max-h-32 overflow-y-auto px-4 pb-1 space-y-1">
                {messages.map((msg) => (
                  <div key={msg.id} className="flex items-start gap-2">
                    <span className={`text-xs font-bold ${msg.sender === "me" ? "text-primary" : "text-yellow-400"}`}>
                      {msg.sender === "me" ? "You:" : "Stranger:"}
                    </span>
                    <span className="text-xs text-foreground/80">{msg.text}</span>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
              <form
                onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
                className="flex items-center gap-2 px-4 pb-3 pt-1"
              >
                <input
                  value={inputMsg}
                  onChange={(e) => setInputMsg(e.target.value)}
                  placeholder="Type a message..."
                  disabled={status !== "connected"}
                  className="flex-1 bg-card/70 backdrop-blur border border-border/40 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 disabled:opacity-30"
                />
                <button
                  type="submit"
                  disabled={status !== "connected" || !inputMsg.trim()}
                  className="bg-primary text-primary-foreground p-2 rounded-lg disabled:opacity-30"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Divider with expand icon */}
        <div className="hidden md:flex items-start pt-4 z-20" style={{ marginLeft: "-1px" }}>
          <button className="text-muted-foreground/40 hover:text-foreground p-1 transition-colors">
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>

        {/* RIGHT: Your video panel */}
        <div className="flex-1 relative" style={{ background: "hsl(228 22% 10%)" }}>
          {/* Top-right buttons */}
          <div className="absolute top-4 right-4 z-20 flex items-center gap-3">
            <button className="text-muted-foreground/50 hover:text-foreground transition-colors">
              <Search className="w-5 h-5" />
            </button>
            <button className="text-muted-foreground/50 hover:text-foreground text-sm font-medium transition-colors">
              Log In
            </button>
          </div>

          {/* Your camera */}
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className={`absolute inset-0 w-full h-full object-cover ${!isCamOn ? "hidden" : ""}`}
          />
          {!isCamOn && (
            <div className="absolute inset-0 flex items-center justify-center">
              <VideoOff className="w-12 h-12 text-muted-foreground/30" />
            </div>
          )}

          {/* Loading spinner when idle */}
          {status === "idle" && isCamOn && (
            <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
              <div className="w-10 h-10 rounded-full border-[3px] border-muted-foreground/10 border-t-muted-foreground/30 animate-spin" />
            </div>
          )}

          {/* Cam/Mic controls */}
          <div className="absolute top-4 left-4 z-20 flex items-center gap-1.5">
            <button
              onClick={() => {
                setIsMicOn((v) => !v);
                if (localVideoRef.current?.srcObject) {
                  (localVideoRef.current.srcObject as MediaStream).getAudioTracks().forEach((t) => (t.enabled = isMicOn));
                }
              }}
              className={`p-2 rounded-lg transition-colors ${!isMicOn ? "bg-destructive/70 text-destructive-foreground" : "bg-card/50 backdrop-blur text-foreground/70 hover:text-foreground"}`}
            >
              {isMicOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
            </button>
            <button
              onClick={() => {
                setIsCamOn((v) => !v);
                if (localVideoRef.current?.srcObject) {
                  (localVideoRef.current.srcObject as MediaStream).getVideoTracks().forEach((t) => (t.enabled = !isCamOn));
                }
              }}
              className={`p-2 rounded-lg transition-colors ${!isCamOn ? "bg-destructive/70 text-destructive-foreground" : "bg-card/50 backdrop-blur text-foreground/70 hover:text-foreground"}`}
            >
              {isCamOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="px-4 py-3 flex items-end justify-between gap-4" style={{ background: "hsl(228 20% 6%)" }}>
        {/* Left: Start button */}
        <div className="flex-1">
          {status === "idle" || status === "disconnected" ? (
            <button
              onClick={startSearch}
              className="w-full max-w-md py-3.5 rounded-2xl font-semibold text-primary-foreground text-base flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
              style={{
                background: "linear-gradient(135deg, hsl(262 70% 55%), hsl(280 70% 45%))",
              }}
            >
              👋 Start Video Chat
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={stopChat}
                className="px-8 py-3.5 rounded-2xl font-semibold text-primary-foreground text-sm transition-opacity hover:opacity-90"
                style={{
                  background: "linear-gradient(135deg, hsl(262 70% 55%), hsl(280 70% 45%))",
                }}
              >
                Stop
              </button>
              <button
                onClick={nextPerson}
                className="px-8 py-3.5 rounded-2xl font-semibold text-primary-foreground text-sm flex items-center gap-1.5 transition-opacity hover:opacity-90"
                style={{
                  background: "linear-gradient(135deg, hsl(262 70% 55%), hsl(280 70% 45%))",
                }}
              >
                <SkipForward className="w-4 h-4" />
                Next
              </button>
            </div>
          )}
        </div>

        {/* Right: Filters */}
        <div className="flex items-center bg-card rounded-2xl overflow-hidden border border-border/30">
          {/* Country */}
          <div className="relative">
            <button
              onClick={() => { setShowCountryDropdown(!showCountryDropdown); setShowGenderDropdown(false); }}
              className="flex items-center gap-2 px-4 py-3 text-sm text-secondary-foreground hover:bg-secondary/50 transition-colors"
            >
              <Globe className="w-4 h-4 text-primary" />
              <span>{selectedCountry}</span>
              <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
            {showCountryDropdown && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setShowCountryDropdown(false)} />
                <div className="absolute bottom-full mb-1 left-0 bg-card border border-border rounded-xl shadow-2xl z-40 max-h-60 overflow-y-auto w-52">
                  {COUNTRIES.map((c) => (
                    <button
                      key={c}
                      onClick={() => { setSelectedCountry(c); setShowCountryDropdown(false); }}
                      className={`w-full text-left text-sm px-4 py-2.5 hover:bg-secondary/60 transition-colors ${c === selectedCountry ? "text-primary" : "text-foreground"}`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="w-px h-6 bg-border/40" />

          {/* Gender */}
          <div className="relative">
            <button
              onClick={() => { setShowGenderDropdown(!showGenderDropdown); setShowCountryDropdown(false); }}
              className="flex items-center gap-2 px-4 py-3 text-sm text-secondary-foreground hover:bg-secondary/50 transition-colors"
            >
              <Users className="w-4 h-4 text-primary" />
              <span>{selectedGender}</span>
              <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
            {showGenderDropdown && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setShowGenderDropdown(false)} />
                <div className="absolute bottom-full mb-1 right-0 bg-card border border-border rounded-xl shadow-2xl z-40 w-40">
                  {["Gender", "Male", "Female", "Couple"].map((g) => (
                    <button
                      key={g}
                      onClick={() => { setSelectedGender(g); setShowGenderDropdown(false); }}
                      className={`w-full text-left text-sm px-4 py-2.5 hover:bg-secondary/60 transition-colors ${g === selectedGender ? "text-primary" : "text-foreground"}`}
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
  );
};

export default VideoChatRoom;
