import { useState, useRef, useEffect, useCallback } from "react";
import { Matchmaker, WebRTCConnection } from "@/lib/webrtc";
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
  ChevronRight,
  Facebook,
  History,
  User,
  MessageSquare,
  Share2,
  FileText,
  MoreHorizontal,
  LogOut,
  ExternalLink,
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
  const [showShop, setShowShop] = useState(false);
  const [showRegion, setShowRegion] = useState(false);
  const [tempRegion, setTempRegion] = useState("Worldwide");
  const [showGenderModal, setShowGenderModal] = useState(false);
  const [tempGender, setTempGender] = useState("Both");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [cameraAllowed, setCameraAllowed] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(() => 8000 + Math.floor(Math.random() * 5000));
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const matchmakerRef = useRef<Matchmaker | null>(null);
  const webrtcRef = useRef<WebRTCConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  // Simulate fluctuating online users
  useEffect(() => {
    const interval = setInterval(() => {
      setOnlineUsers((prev) => {
        const change = Math.floor(Math.random() * 40) - 18;
        return Math.max(5000, Math.min(18000, prev + change));
      });
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const startLocalCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      localStreamRef.current = stream;
      setCameraAllowed(true);
    } catch {
      console.log("Camera access denied");
      setCameraAllowed(false);
    }
  }, []);

  useEffect(() => {
    startLocalCamera();
    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      matchmakerRef.current?.destroy();
      webrtcRef.current?.destroy();
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
            onClick={() => setShowShop(true)}
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
            <span className="text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>{onlineUsers.toLocaleString()} users online</span>
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
        <div className="absolute top-4 right-4 z-20 flex items-center gap-3">
          {isLoggedIn ? (
            <>
              <button className="flex items-center gap-1.5 transition-opacity hover:opacity-80" style={{ color: "rgba(255,255,255,0.7)" }}>
                <History className="w-5 h-5" />
                <span className="text-sm font-medium">History</span>
              </button>
              <div className="relative">
                <button
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="w-9 h-9 rounded-full flex items-center justify-center"
                  style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)" }}
                >
                  <User className="w-5 h-5" style={{ color: "rgba(255,255,255,0.6)" }} />
                </button>

                {/* Profile Dropdown */}
                {showProfileMenu && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setShowProfileMenu(false)} />
                    <div
                      className="absolute top-full right-0 mt-2 w-52 rounded-xl shadow-2xl z-40 py-2"
                      style={{ background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.1)" }}
                    >
                      {/* You */}
                      <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
                        <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.1)" }}>
                          <User className="w-4 h-4" style={{ color: "rgba(255,255,255,0.6)" }} />
                        </div>
                        <span className="text-sm font-medium text-white">You</span>
                        <div className="flex items-center gap-1 ml-auto">
                          <span>🟢</span>
                          <span>😜</span>
                        </div>
                      </div>

                      <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors text-left"
                        style={{ color: "rgba(255,255,255,0.7)" }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      >
                        <MessageSquare className="w-4 h-4" />
                        <span>Text Chat</span>
                        <ExternalLink className="w-3.5 h-3.5 ml-auto" style={{ color: "rgba(255,255,255,0.3)" }} />
                      </button>

                      <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors text-left"
                        style={{ color: "rgba(255,255,255,0.7)" }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      >
                        <Share2 className="w-4 h-4" />
                        <span>Socials</span>
                        <ChevronRight className="w-4 h-4 ml-auto" style={{ color: "rgba(255,255,255,0.3)" }} />
                      </button>

                      <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors text-left"
                        style={{ color: "rgba(255,255,255,0.7)" }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      >
                        <FileText className="w-4 h-4" />
                        <span>Rules</span>
                      </button>

                      <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors text-left"
                        style={{ color: "rgba(255,255,255,0.7)" }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      >
                        <MoreHorizontal className="w-4 h-4" />
                        <span>More</span>
                      </button>

                      <div className="my-1" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }} />

                      <button
                        onClick={() => { setIsLoggedIn(false); setShowProfileMenu(false); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors text-left"
                        style={{ color: "rgba(255,255,255,0.7)" }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Logout</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </>
          ) : (
            <>
              <button style={{ color: "rgba(255,255,255,0.4)" }} className="hover:opacity-80 transition-opacity">
                <Search className="w-5 h-5" />
              </button>
              <button
                onClick={() => setShowLoginModal(true)}
                className="text-sm font-medium px-4 py-1.5 rounded-lg transition-colors"
                style={{ color: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.15)" }}
              >
                Log In
              </button>
            </>
          )}
        </div>

        {/* Camera feed */}
        <div className="flex-1 relative">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className={`absolute inset-0 w-full h-full object-cover ${(!isCamOn || !cameraAllowed) ? "hidden" : ""}`}
          />

          {/* Camera permission denied */}
          {!cameraAllowed && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center space-y-4 px-6">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
                  style={{ background: "#ef4444" }}
                >
                  <VideoOff className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-lg font-bold text-white">Camera permission denied</h3>
                <p className="text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>
                  To enable video, please grant permission to access your camera in your browser settings.
                </p>
              </div>
            </div>
          )}

          {/* Camera off by user */}
          {cameraAllowed && !isCamOn && (
            <div className="absolute inset-0 flex items-center justify-center">
              <VideoOff className="w-12 h-12" style={{ color: "rgba(255,255,255,0.15)" }} />
            </div>
          )}

          {/* Loading spinner center */}
          {cameraAllowed && (status === "idle" || status === "disconnected") && isCamOn && (
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

        </div>

        {/* Bottom right: Filters - inside right panel */}
        <div className="px-6 pb-6 flex justify-center">
          <div
            className="flex items-center rounded-2xl overflow-hidden"
            style={{ border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.03)" }}
          >
            <div>
              <button
                onClick={() => { setTempRegion(selectedCountry); setShowRegion(true); }}
                className="flex items-center gap-2 px-5 py-3.5 text-sm transition-colors"
                style={{ color: "rgba(255,255,255,0.7)" }}
              >
                <Globe className="w-4 h-4" style={{ color: "#22c55e" }} />
                <span>{selectedCountry}</span>
                <ChevronUp className="w-3.5 h-3.5" style={{ color: "rgba(255,255,255,0.35)" }} />
              </button>
            </div>

            <div style={{ width: "1px", height: "24px", background: "rgba(255,255,255,0.1)" }} />

            <div>
              <button
                onClick={() => { setTempGender(selectedGender === "Gender" ? "Both" : selectedGender); setShowGenderModal(true); }}
                className="flex items-center gap-2 px-5 py-3.5 text-sm transition-colors"
                style={{ color: "rgba(255,255,255,0.7)" }}
              >
                <Users className="w-4 h-4" style={{ color: "#a78bfa" }} />
                <span>{selectedGender}</span>
                <ChevronUp className="w-3.5 h-3.5" style={{ color: "rgba(255,255,255,0.35)" }} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Shop Modal */}
      {showShop && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setShowShop(false)}>
          <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.6)" }} />
          <div
            className="relative w-full max-w-xl mx-4 rounded-2xl p-6 max-h-[90vh] overflow-y-auto"
            style={{ background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.1)" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Shop</h2>
              <div className="flex items-center gap-1.5 text-sm" style={{ color: "#eab308" }}>
                <Heart className="w-4 h-4 fill-current" />
                <span className="text-white font-medium">0</span>
              </div>
            </div>

            <p className="text-sm mb-5" style={{ color: "rgba(255,255,255,0.45)" }}>
              Higher tiers give you more bonus coins!
            </p>

            {/* Coin Packages Grid */}
            <div className="grid grid-cols-3 gap-3 mb-5">
              {[
                { coins: "500", bonus: "", price: "$3.99" },
                { coins: "1.000", bonus: "+120", price: "$7.49" },
                { coins: "2.500", bonus: "+300", price: "$17.49" },
                { coins: "5.000", bonus: "+550", price: "$33.49" },
                { coins: "10.000", bonus: "+1.100", price: "$64.49" },
                { coins: "25.000", bonus: "+2.600", price: "$156.49" },
              ].map((pkg, i) => (
                <button
                  key={i}
                  className="rounded-xl p-3 flex flex-col items-center gap-2 transition-opacity hover:opacity-90"
                  style={{
                    background: i < 3
                      ? "linear-gradient(180deg, #7c3aed, #6d28d9)"
                      : "linear-gradient(180deg, #8b5cf6, #7c3aed)",
                  }}
                >
                  {/* Coin icon */}
                  <div className="text-3xl py-2">
                    {i === 0 ? "🪙" : i < 3 ? "💰" : i < 5 ? "💎" : "🎁"}
                  </div>
                  <div className="text-sm font-bold text-white">
                    {pkg.coins} {pkg.bonus && <span style={{ color: "#4ade80" }}>{pkg.bonus}</span>} Coins
                  </div>
                  <div
                    className="w-full py-1.5 rounded-lg text-sm font-semibold text-center"
                    style={{ background: "rgba(0,0,0,0.25)", color: "#4ade80" }}
                  >
                    {pkg.price}
                  </div>
                </button>
              ))}
            </div>

            {/* Disclaimers */}
            <div className="space-y-1 text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
              <p>*Filters (e.g. gender, location, etc.) are based on the user's input. the results may not be accurate.</p>
              <p>* If you cancel searching before you get a match, your coins will NOT be refunded.</p>
              <p>* Prices are in USD and may vary depending on your location.</p>
              <p>* VAT is calculated at checkout.</p>
              <p>* Make sure to read our <span className="underline cursor-pointer">Terms of Service</span> and <span className="underline cursor-pointer">Refund Policy</span>.</p>
            </div>
          </div>
        </div>
      )}

      {/* Region Preferences Modal */}
      {showRegion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setShowRegion(false)}>
          <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.6)" }} />
          <div
            className="relative w-full max-w-md mx-4 rounded-2xl p-6"
            style={{ background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.1)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-white mb-1">Region Preferences</h2>
            <p className="text-sm mb-5" style={{ color: "rgba(255,255,255,0.45)" }}>
              Choose a region to match with. Some regions require coins for each match.
            </p>

            {/* Region List */}
            <div className="space-y-1 max-h-64 overflow-y-auto mb-5">
              {[
                { name: "Worldwide", emoji: "🌍", desc: "", cost: "FREE" },
                { name: "Americas", emoji: "🗽", desc: "North & South America", cost: "10" },
                { name: "Europe", emoji: "🏰", desc: "UK, France, Germany & more", cost: "10" },
                { name: "Middle East & North Africa", emoji: "🕌", desc: "UAE, Saudi Arabia, Egypt & more", cost: "10" },
                { name: "South Asia", emoji: "🪷", desc: "India, Pakistan, Bangladesh & more", cost: "10" },
                { name: "East Asia", emoji: "🏯", desc: "Japan, Korea, China & more", cost: "10" },
                { name: "Southeast Asia", emoji: "🌴", desc: "Philippines, Thailand, Indonesia & more", cost: "10" },
                { name: "Africa", emoji: "🌍", desc: "Nigeria, South Africa, Kenya & more", cost: "10" },
              ].map((region) => (
                <button
                  key={region.name}
                  onClick={() => setTempRegion(region.name)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors"
                  style={{
                    border: tempRegion === region.name ? "1.5px solid #7c3aed" : "1.5px solid transparent",
                    background: tempRegion === region.name ? "rgba(124,58,237,0.08)" : "transparent",
                  }}
                >
                  <span className="text-xl">{region.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">{region.name}</p>
                    {region.desc && (
                      <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>{region.desc}</p>
                    )}
                  </div>
                  {region.cost === "FREE" ? (
                    <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ background: "#eab308", color: "#000" }}>
                      FREE
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs font-medium" style={{ color: "rgba(255,255,255,0.6)" }}>
                      {region.cost} 🪙
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Save / Cancel */}
            <button
              onClick={() => { setSelectedCountry(tempRegion); setShowRegion(false); }}
              className="w-full py-3 rounded-xl font-semibold text-white text-sm transition-opacity hover:opacity-90 mb-3"
              style={{ background: "linear-gradient(135deg, #7c3aed, #9333ea)" }}
            >
              Save
            </button>
            <button
              onClick={() => setShowRegion(false)}
              className="w-full py-2 text-sm font-medium transition-colors"
              style={{ color: "rgba(255,255,255,0.5)" }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Gender Preferences Modal */}
      {showGenderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setShowGenderModal(false)}>
          <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.6)" }} />
          <div
            className="relative w-full max-w-md mx-4 rounded-2xl p-6"
            style={{ background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.1)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-white mb-1">Gender Preferences</h2>
            <p className="text-sm mb-6" style={{ color: "rgba(255,255,255,0.45)" }}>
              <span className="font-bold text-white">15 Coins</span> are used whenever you match with the gender filter on.
            </p>

            {/* Gender Cards */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              {[
                { id: "Male", emoji: "👨", color: "#38bdf8", borderColor: "#38bdf8", cost: true },
                { id: "Both", emoji: "👫", color: "#7c3aed", borderColor: "#ec4899", cost: false },
                { id: "Female", emoji: "👩", color: "#ec4899", borderColor: "#ec4899", cost: true },
              ].map((g) => (
                <button
                  key={g.id}
                  onClick={() => setTempGender(g.id)}
                  className="relative flex flex-col items-center gap-2 rounded-xl py-5 px-3 transition-all"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: tempGender === g.id ? `2px solid ${g.borderColor}` : "2px solid transparent",
                  }}
                >
                  {/* Coin badge */}
                  {g.cost && (
                    <span
                      className="absolute -top-2 left-1/2 -translate-x-1/2 text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ background: "#eab308", color: "#000" }}
                    >
                      15 🪙
                    </span>
                  )}
                  <span className="text-4xl">{g.emoji}</span>
                  <span className="text-sm font-medium" style={{ color: g.color }}>{g.id}</span>
                </button>
              ))}
            </div>

            {/* Save / Cancel */}
            <button
              onClick={() => { setSelectedGender(tempGender); setShowGenderModal(false); }}
              className="w-full py-3 rounded-xl font-semibold text-white text-sm transition-opacity hover:opacity-90 mb-3"
              style={{ background: "linear-gradient(135deg, #7c3aed, #9333ea)" }}
            >
              Save
            </button>
            <button
              onClick={() => setShowGenderModal(false)}
              className="w-full py-2 text-sm font-medium transition-colors"
              style={{ color: "rgba(255,255,255,0.5)" }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setShowLoginModal(false)}>
          <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.6)" }} />
          <div
            className="relative w-full max-w-sm mx-4 rounded-2xl p-8 text-center"
            style={{ background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.1)" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Logo */}
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: "linear-gradient(135deg, #7c3aed, #6d28d9)" }}
            >
              <svg width="30" height="22" viewBox="0 0 36 28" fill="none">
                <ellipse cx="11" cy="14" rx="8" ry="7" stroke="white" strokeWidth="2" fill="none" />
                <ellipse cx="25" cy="14" rx="8" ry="7" stroke="white" strokeWidth="2" fill="none" />
                <path d="M16 9 C17 7, 19 7, 20 9" stroke="#f97316" strokeWidth="1.5" fill="none" strokeLinecap="round" />
              </svg>
            </div>

            <h2 className="text-xl font-bold text-white mb-1">ChatRandom<span style={{ color: "rgba(255,255,255,0.35)" }}>.gg</span></h2>
            <p className="text-sm mb-6" style={{ color: "rgba(255,255,255,0.45)" }}>
              Sign in to ChatRandom and start chatting!
            </p>

            {/* Login Options */}
            <div className="space-y-3">
              <button
                onClick={() => { setIsLoggedIn(true); setShowLoginModal(false); }}
                className="w-full flex items-center justify-center gap-3 py-3 rounded-xl text-sm font-medium transition-colors"
                style={{ background: "white", color: "#1a1a2e" }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </button>

              <button
                onClick={() => { setIsLoggedIn(true); setShowLoginModal(false); }}
                className="w-full flex items-center justify-center gap-3 py-3 rounded-xl text-sm font-medium text-white transition-colors"
                style={{ background: "#1877F2" }}
              >
                <Facebook className="w-5 h-5" />
                Continue with Facebook
              </button>

              <button
                onClick={() => { setIsLoggedIn(true); setShowLoginModal(false); }}
                className="w-full flex items-center justify-center gap-3 py-3 rounded-xl text-sm font-medium transition-colors"
                style={{ background: "white", color: "#1a1a2e" }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#000">
                  <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.32 2.32-2.12 4.53-3.74 4.25z"/>
                </svg>
                Continue with Apple
              </button>
            </div>

            <p className="text-xs mt-5" style={{ color: "rgba(255,255,255,0.3)" }}>
              I confirm that I am at least 18 years old and I agree to the{" "}
              <span className="underline cursor-pointer">Terms of Service</span> and{" "}
              <span className="underline cursor-pointer">Privacy Policy</span>.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoChatRoom;
