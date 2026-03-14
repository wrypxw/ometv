import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  SkipForward,
  X,
  Send,
  MessageCircle,
  Users,
  Globe,
  Flag,
} from "lucide-react";

type ChatStatus = "idle" | "searching" | "connected" | "disconnected";

interface Message {
  id: string;
  text: string;
  sender: "me" | "stranger";
  time: string;
}

interface VideoChatRoomProps {
  onExit: () => void;
}

const STRANGER_MESSAGES = [
  "Hey! Where are you from?",
  "Hi there! 😊",
  "Hello! Nice to meet you!",
  "Hey, how's your day going?",
  "Hi! What do you do for fun?",
];

const VideoChatRoom = ({ onExit }: VideoChatRoomProps) => {
  const [status, setStatus] = useState<ChatStatus>("idle");
  const [isCamOn, setIsCamOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMsg, setInputMsg] = useState("");
  const [country, setCountry] = useState("");
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const getTimeStr = () =>
    new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const startLocalCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
    } catch {
      console.log("Camera access denied or unavailable");
    }
  }, []);

  useEffect(() => {
    startLocalCamera();
    return () => {
      if (localVideoRef.current?.srcObject) {
        const stream = localVideoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [startLocalCamera]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const startSearch = useCallback(() => {
    setStatus("searching");
    setMessages([]);
    const countries = ["Brazil", "USA", "Germany", "Japan", "France", "India", "UK", "Canada"];
    const delay = 1500 + Math.random() * 3000;
    searchTimerRef.current = setTimeout(() => {
      setCountry(countries[Math.floor(Math.random() * countries.length)]);
      setStatus("connected");
      // Simulate stranger greeting
      setTimeout(() => {
        const greeting =
          STRANGER_MESSAGES[Math.floor(Math.random() * STRANGER_MESSAGES.length)];
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

    // Simulate stranger reply
    if (Math.random() > 0.3) {
      const replies = [
        "That's cool!", "Haha nice!", "Really? Tell me more!",
        "Awesome 😄", "Interesting!", "Oh wow!", "Same here!",
        "No way! 😂", "That's amazing!", "I agree!",
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
      const stream = localVideoRef.current.srcObject as MediaStream;
      stream.getVideoTracks().forEach((t) => (t.enabled = !isCamOn));
    }
  };

  const toggleMic = () => {
    setIsMicOn((v) => !v);
    if (localVideoRef.current?.srcObject) {
      const stream = localVideoRef.current.srcObject as MediaStream;
      stream.getAudioTracks().forEach((t) => (t.enabled = !isMicOn));
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Top Bar */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-card/80 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
            <Video className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-bold text-gradient">ChatRandom</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Users className="w-4 h-4" />
            <span>12,847</span>
          </div>
          <Button variant="ghost" size="sm" onClick={onExit} className="text-muted-foreground hover:text-destructive">
            <X className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Video Area */}
        <div className="flex-1 flex flex-col lg:flex-row gap-1 p-2 min-h-0">
          {/* Remote Video */}
          <div className="flex-1 relative rounded-2xl overflow-hidden video-container border border-border/30">
            {status === "connected" ? (
              <>
                <div className="absolute inset-0 flex items-center justify-center bg-card">
                  <div className="text-center space-y-3">
                    <div className="w-24 h-24 rounded-full bg-secondary mx-auto flex items-center justify-center">
                      <Users className="w-12 h-12 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground text-sm">Camera simulation</p>
                  </div>
                </div>
                <div className="absolute top-4 left-4 flex items-center gap-2">
                  <span className="bg-card/80 backdrop-blur-sm text-xs px-3 py-1.5 rounded-full border border-border/50 flex items-center gap-1.5">
                    <Globe className="w-3 h-3 text-primary" />
                    {country}
                  </span>
                </div>
                <div className="absolute bottom-4 right-4">
                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive bg-card/60 backdrop-blur-sm rounded-full">
                    <Flag className="w-4 h-4" />
                  </Button>
                </div>
              </>
            ) : status === "searching" ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 rounded-full border-4 border-primary/30 border-t-primary animate-spin mx-auto" />
                  <p className="text-muted-foreground">Looking for someone...</p>
                </div>
              </div>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center space-y-4">
                  <div className="w-20 h-20 rounded-full bg-secondary mx-auto flex items-center justify-center">
                    <Video className="w-10 h-10 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-foreground font-medium">
                      {status === "disconnected" ? "Chat ended" : "Ready to chat?"}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {status === "disconnected"
                        ? 'Click "Next" to find someone new'
                        : 'Click "Start" to begin'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Local Video */}
          <div className="w-full lg:w-64 h-48 lg:h-auto relative rounded-2xl overflow-hidden video-container border border-border/30">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className={`absolute inset-0 w-full h-full object-cover ${!isCamOn ? "opacity-0" : ""}`}
            />
            {!isCamOn && (
              <div className="absolute inset-0 flex items-center justify-center bg-card">
                <VideoOff className="w-10 h-10 text-muted-foreground" />
              </div>
            )}
            <span className="absolute top-3 left-3 text-xs bg-card/70 backdrop-blur-sm px-2 py-1 rounded-full text-muted-foreground">
              You
            </span>
          </div>
        </div>

        {/* Chat Sidebar */}
        <div className="w-full lg:w-80 flex flex-col border-t lg:border-t-0 lg:border-l border-border/50 bg-card/30">
          {/* Chat Header */}
          <div className="px-4 py-3 border-b border-border/50 flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Chat</span>
            {status === "connected" && (
              <span className="ml-auto flex items-center gap-1 text-xs text-primary">
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                Connected
              </span>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[120px] max-h-[300px] lg:max-h-none">
            {messages.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-8">
                {status === "connected"
                  ? "Say hello! 👋"
                  : "Messages will appear here"}
              </p>
            )}
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.sender === "me" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${
                    msg.sender === "me"
                      ? "gradient-primary text-primary-foreground rounded-br-md"
                      : "bg-secondary text-secondary-foreground rounded-bl-md"
                  }`}
                >
                  <p>{msg.text}</p>
                  <p
                    className={`text-[10px] mt-1 ${
                      msg.sender === "me" ? "text-primary-foreground/60" : "text-muted-foreground"
                    }`}
                  >
                    {msg.time}
                  </p>
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Chat Input */}
          <div className="p-3 border-t border-border/50">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage();
              }}
              className="flex gap-2"
            >
              <Input
                value={inputMsg}
                onChange={(e) => setInputMsg(e.target.value)}
                placeholder={
                  status === "connected" ? "Type a message..." : "Connect to chat"
                }
                disabled={status !== "connected"}
                className="bg-secondary/50 border-border/50 rounded-xl text-sm"
              />
              <Button
                type="submit"
                size="icon"
                disabled={status !== "connected" || !inputMsg.trim()}
                className="gradient-primary text-primary-foreground rounded-xl shrink-0"
              >
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="px-4 py-4 border-t border-border/50 bg-card/80 backdrop-blur-sm">
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={toggleMic}
            className={`rounded-full w-12 h-12 ${!isMicOn ? "bg-destructive/20 border-destructive/50 text-destructive" : "border-border/50"}`}
          >
            {isMicOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={toggleCam}
            className={`rounded-full w-12 h-12 ${!isCamOn ? "bg-destructive/20 border-destructive/50 text-destructive" : "border-border/50"}`}
          >
            {isCamOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
          </Button>

          {status === "idle" || status === "disconnected" ? (
            <Button
              onClick={startSearch}
              className="gradient-primary text-primary-foreground font-semibold px-8 h-12 rounded-full text-base glow-primary"
            >
              Start
            </Button>
          ) : (
            <>
              <Button
                onClick={stopChat}
                variant="outline"
                className="border-destructive/50 text-destructive hover:bg-destructive/20 px-6 h-12 rounded-full font-semibold"
              >
                <X className="w-4 h-4 mr-1" />
                Stop
              </Button>
              <Button
                onClick={nextPerson}
                className="gradient-primary text-primary-foreground font-semibold px-6 h-12 rounded-full glow-primary"
              >
                <SkipForward className="w-4 h-4 mr-1" />
                Next
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoChatRoom;
