import { useState, useRef, useEffect, useCallback } from "react";
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  SkipForward,
  X,
  Send,
  Flag,
  Maximize,
  Settings,
  ChevronDown,
} from "lucide-react";

type ChatStatus = "idle" | "searching" | "connected" | "disconnected";

interface Message {
  id: string;
  text: string;
  sender: "me" | "stranger";
  time: string;
}

const COUNTRIES = [
  "All countries", "Albania", "Argentina", "Brazil", "Canada", "Chile",
  "Colombia", "France", "Germany", "India", "Indonesia", "Italy", "Japan",
  "Mexico", "Netherlands", "Philippines", "Poland", "Portugal", "Romania",
  "Russia", "Spain", "Turkey", "Ukraine", "United Kingdom", "United States",
];

const STRANGER_MESSAGES = [
  "Hey! Where are you from?", "Hi there! 😊", "Hello!", "Hey, how's it going?",
  "Hi! What's up?", "Hola!", "Oi, tudo bem?",
];

const VideoChatRoom = () => {
  const [status, setStatus] = useState<ChatStatus>("idle");
  const [isCamOn, setIsCamOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMsg, setInputMsg] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("All countries");
  const [selectedGender, setSelectedGender] = useState<string>("");
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const getTimeStr = () =>
    new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

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
    const delay = 1500 + Math.random() * 3000;
    searchTimerRef.current = setTimeout(() => {
      setStatus("connected");
      setTimeout(() => {
        const greeting = STRANGER_MESSAGES[Math.floor(Math.random() * STRANGER_MESSAGES.length)];
        setMessages((prev) => [
          ...prev,
          { id: crypto.randomUUID(), text: greeting, sender: "stranger", time: getTimeStr() },
        ]);
      }, 1000 + Math.random() * 2000);
    }, delay);
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
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), text, sender: "me", time: getTimeStr() },
    ]);
    setInputMsg("");
    if (Math.random() > 0.3) {
      const replies = [
        "That's cool!", "Haha nice!", "Really?", "Awesome 😄",
        "Interesting!", "Oh wow!", "Same here!", "No way! 😂",
      ];
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            text: replies[Math.floor(Math.random() * replies.length)],
            sender: "stranger",
            time: getTimeStr(),
          },
        ]);
      }, 800 + Math.random() * 2000);
    }
  }, [inputMsg, status]);

  const toggleCam = () => {
    setIsCamOn((v) => !v);
    if (localVideoRef.current?.srcObject) {
      (localVideoRef.current.srcObject as MediaStream).getVideoTracks().forEach((t) => (t.enabled = !isCamOn));
    }
  };

  const toggleMic = () => {
    setIsMicOn((v) => !v);
    if (localVideoRef.current?.srcObject) {
      (localVideoRef.current.srcObject as MediaStream).getAudioTracks().forEach((t) => (t.enabled = !isMicOn));
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-background overflow-hidden">
      {/* Video Area */}
      <div className="flex-1 flex flex-col md:flex-row relative min-h-0">
        {/* Stranger Video */}
        <div className="flex-1 relative bg-[hsl(216,28%,5%)] border-r border-border/30">
          {status === "connected" ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-28 h-28 rounded-full bg-secondary flex items-center justify-center">
                <img
                  src="https://ome.tv/images/roulette/avatar.svg"
                  alt="avatar"
                  className="w-16 h-16 opacity-40"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              </div>
            </div>
          ) : status === "searching" ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center space-y-4">
                <div className="w-14 h-14 rounded-full border-[3px] border-muted-foreground/20 border-t-primary animate-spin mx-auto" />
                <p className="text-muted-foreground text-sm">Looking for partner...</p>
              </div>
            </div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center space-y-2">
                <p className="text-muted-foreground text-sm">
                  {status === "disconnected"
                    ? "Your partner has disconnected"
                    : "Press \"Start\" to begin"}
                </p>
              </div>
            </div>
          )}

          {/* Top-left: Logo */}
          <div className="absolute top-3 left-3 z-10">
            <div className="flex items-center gap-1.5">
              <Video className="w-5 h-5 text-primary" />
              <span className="text-primary font-bold text-sm">ChatRandom</span>
            </div>
          </div>

          {/* Top-right controls */}
          <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              12,847 Online
            </span>
            <button className="text-muted-foreground hover:text-foreground p-1.5 rounded hover:bg-secondary/80 transition-colors" title="Report">
              <Flag className="w-4 h-4" />
            </button>
            <button className="text-muted-foreground hover:text-foreground p-1.5 rounded hover:bg-secondary/80 transition-colors" title="Fullscreen">
              <Maximize className="w-4 h-4" />
            </button>
            <button className="text-muted-foreground hover:text-foreground p-1.5 rounded hover:bg-secondary/80 transition-colors" title="Settings">
              <Settings className="w-4 h-4" />
            </button>
          </div>

          {/* Chat overlay on stranger video */}
          <div className="absolute bottom-0 left-0 right-0 z-10">
            {/* Messages overlay */}
            <div className="max-h-40 overflow-y-auto px-3 pb-1 space-y-1 scrollbar-none">
              {messages.map((msg) => (
                <div key={msg.id} className="flex items-start gap-2">
                  <span className={`text-xs font-semibold ${msg.sender === "me" ? "text-primary" : "text-orange-400"}`}>
                    {msg.sender === "me" ? "You:" : "Stranger:"}
                  </span>
                  <span className="text-xs text-foreground/90">{msg.text}</span>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            {/* Chat input */}
            <form
              onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
              className="flex items-center gap-2 px-3 pb-3 pt-1"
            >
              <input
                value={inputMsg}
                onChange={(e) => setInputMsg(e.target.value)}
                placeholder={status === "connected" ? "Type a message..." : "Connect to chat..."}
                disabled={status !== "connected"}
                className="flex-1 bg-[hsl(216,25%,11%)]/80 backdrop-blur-sm border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 disabled:opacity-40"
              />
              <button
                type="submit"
                disabled={status !== "connected" || !inputMsg.trim()}
                className="bg-primary text-primary-foreground p-2 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-30"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>

        {/* Your Video */}
        <div className="flex-1 relative bg-[hsl(216,28%,5%)]">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className={`absolute inset-0 w-full h-full object-cover ${!isCamOn ? "hidden" : ""}`}
          />
          {!isCamOn && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center space-y-2">
                <VideoOff className="w-10 h-10 text-muted-foreground mx-auto" />
                <p className="text-xs text-muted-foreground">Camera is off</p>
              </div>
            </div>
          )}

          {/* Cam/Mic toggles */}
          <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
            <button
              onClick={toggleMic}
              className={`p-2 rounded-lg transition-colors ${!isMicOn ? "bg-destructive/80 text-destructive-foreground" : "bg-secondary/60 backdrop-blur-sm text-foreground hover:bg-secondary/80"}`}
            >
              {isMicOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
            </button>
            <button
              onClick={toggleCam}
              className={`p-2 rounded-lg transition-colors ${!isCamOn ? "bg-destructive/80 text-destructive-foreground" : "bg-secondary/60 backdrop-blur-sm text-foreground hover:bg-secondary/80"}`}
            >
              {isCamOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
            </button>
          </div>

          <span className="absolute top-3 left-3 text-xs text-muted-foreground bg-secondary/60 backdrop-blur-sm px-2 py-1 rounded">
            You
          </span>
        </div>
      </div>

      {/* Bottom Controls Bar */}
      <div className="bg-card border-t border-border/50 px-4 py-3">
        <div className="flex items-center justify-center gap-3 flex-wrap">
          {/* Start / Stop */}
          {status === "idle" || status === "disconnected" ? (
            <button
              onClick={startSearch}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8 py-2.5 rounded-lg text-sm transition-colors"
            >
              Start
            </button>
          ) : (
            <>
              <button
                onClick={stopChat}
                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground font-semibold px-8 py-2.5 rounded-lg text-sm transition-colors"
              >
                Stop
              </button>
              <button
                onClick={nextPerson}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8 py-2.5 rounded-lg text-sm transition-colors flex items-center gap-1.5"
              >
                <SkipForward className="w-4 h-4" />
                Next
              </button>
            </>
          )}

          {/* Divider */}
          <div className="w-px h-8 bg-border/50 mx-2 hidden sm:block" />

          {/* Country filter */}
          <div className="relative">
            <button
              onClick={() => setShowCountryDropdown(!showCountryDropdown)}
              className="bg-secondary hover:bg-secondary/80 text-secondary-foreground text-sm px-4 py-2.5 rounded-lg flex items-center gap-2 transition-colors"
            >
              <span className="max-w-[120px] truncate">{selectedCountry}</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
            {showCountryDropdown && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setShowCountryDropdown(false)} />
                <div className="absolute bottom-full mb-1 left-0 bg-card border border-border rounded-lg shadow-xl z-30 max-h-60 overflow-y-auto w-52">
                  {COUNTRIES.map((c) => (
                    <button
                      key={c}
                      onClick={() => { setSelectedCountry(c); setShowCountryDropdown(false); }}
                      className={`w-full text-left text-sm px-3 py-2 hover:bg-secondary/80 transition-colors ${
                        c === selectedCountry ? "text-primary bg-secondary/50" : "text-foreground"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Gender filter */}
          <div className="flex items-center gap-1">
            {["Male", "Female", "Couple"].map((g) => (
              <button
                key={g}
                onClick={() => setSelectedGender(selectedGender === g ? "" : g)}
                className={`text-xs px-3 py-2 rounded-lg transition-colors ${
                  selectedGender === g
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoChatRoom;
