import { useState, useRef, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
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
  
  Search,
  ChevronUp,
  ChevronRight,
  Facebook,
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

const COUNTRY_FLAGS: Record<string, string> = {
  "Worldwide": "🌍", "Afghanistan": "🇦🇫", "Albania": "🇦🇱", "Algeria": "🇩🇿", "Andorra": "🇦🇩",
  "Angola": "🇦🇴", "Antigua and Barbuda": "🇦🇬", "Argentina": "🇦🇷", "Armenia": "🇦🇲",
  "Australia": "🇦🇺", "Austria": "🇦🇹", "Azerbaijan": "🇦🇿", "Bahamas": "🇧🇸", "Bahrain": "🇧🇭",
  "Bangladesh": "🇧🇩", "Barbados": "🇧🇧", "Belarus": "🇧🇾", "Belgium": "🇧🇪", "Belize": "🇧🇿",
  "Benin": "🇧🇯", "Bhutan": "🇧🇹", "Bolivia": "🇧🇴", "Bosnia and Herzegovina": "🇧🇦",
  "Botswana": "🇧🇼", "Brazil": "🇧🇷", "Brunei": "🇧🇳", "Bulgaria": "🇧🇬", "Burkina Faso": "🇧🇫",
  "Burundi": "🇧🇮", "Cabo Verde": "🇨🇻", "Cambodia": "🇰🇭", "Cameroon": "🇨🇲", "Canada": "🇨🇦",
  "Central African Republic": "🇨🇫", "Chad": "🇹🇩", "Chile": "🇨🇱", "China": "🇨🇳",
  "Colombia": "🇨🇴", "Comoros": "🇰🇲", "Congo": "🇨🇬", "Costa Rica": "🇨🇷", "Croatia": "🇭🇷",
  "Cuba": "🇨🇺", "Cyprus": "🇨🇾", "Czech Republic": "🇨🇿", "Denmark": "🇩🇰", "Djibouti": "🇩🇯",
  "Dominica": "🇩🇲", "Dominican Republic": "🇩🇴", "East Timor": "🇹🇱", "Ecuador": "🇪🇨",
  "Egypt": "🇪🇬", "El Salvador": "🇸🇻", "Equatorial Guinea": "🇬🇶", "Eritrea": "🇪🇷",
  "Estonia": "🇪🇪", "Eswatini": "🇸🇿", "Ethiopia": "🇪🇹", "Fiji": "🇫🇯", "Finland": "🇫🇮",
  "France": "🇫🇷", "Gabon": "🇬🇦", "Gambia": "🇬🇲", "Georgia": "🇬🇪", "Germany": "🇩🇪",
  "Ghana": "🇬🇭", "Greece": "🇬🇷", "Grenada": "🇬🇩", "Guatemala": "🇬🇹", "Guinea": "🇬🇳",
  "Guinea-Bissau": "🇬🇼", "Guyana": "🇬🇾", "Haiti": "🇭🇹", "Honduras": "🇭🇳", "Hungary": "🇭🇺",
  "Iceland": "🇮🇸", "India": "🇮🇳", "Indonesia": "🇮🇩", "Iran": "🇮🇷", "Iraq": "🇮🇶",
  "Ireland": "🇮🇪", "Israel": "🇮🇱", "Italy": "🇮🇹", "Jamaica": "🇯🇲", "Japan": "🇯🇵",
  "Jordan": "🇯🇴", "Kazakhstan": "🇰🇿", "Kenya": "🇰🇪", "Kiribati": "🇰🇮", "Kosovo": "🇽🇰",
  "Kuwait": "🇰🇼", "Kyrgyzstan": "🇰🇬", "Laos": "🇱🇦", "Latvia": "🇱🇻", "Lebanon": "🇱🇧",
  "Lesotho": "🇱🇸", "Liberia": "🇱🇷", "Libya": "🇱🇾", "Liechtenstein": "🇱🇮", "Lithuania": "🇱🇹",
  "Luxembourg": "🇱🇺", "Madagascar": "🇲🇬", "Malawi": "🇲🇼", "Malaysia": "🇲🇾", "Maldives": "🇲🇻",
  "Mali": "🇲🇱", "Malta": "🇲🇹", "Marshall Islands": "🇲🇭", "Mauritania": "🇲🇷", "Mauritius": "🇲🇺",
  "Mexico": "🇲🇽", "Micronesia": "🇫🇲", "Moldova": "🇲🇩", "Monaco": "🇲🇨", "Mongolia": "🇲🇳",
  "Montenegro": "🇲🇪", "Morocco": "🇲🇦", "Mozambique": "🇲🇿", "Myanmar": "🇲🇲", "Namibia": "🇳🇦",
  "Nauru": "🇳🇷", "Nepal": "🇳🇵", "Netherlands": "🇳🇱", "New Zealand": "🇳🇿", "Nicaragua": "🇳🇮",
  "Niger": "🇳🇪", "Nigeria": "🇳🇬", "North Korea": "🇰🇵", "North Macedonia": "🇲🇰", "Norway": "🇳🇴",
  "Oman": "🇴🇲", "Pakistan": "🇵🇰", "Palau": "🇵🇼", "Palestine": "🇵🇸", "Panama": "🇵🇦",
  "Papua New Guinea": "🇵🇬", "Paraguay": "🇵🇾", "Peru": "🇵🇪", "Philippines": "🇵🇭",
  "Poland": "🇵🇱", "Portugal": "🇵🇹", "Qatar": "🇶🇦", "Romania": "🇷🇴", "Russia": "🇷🇺",
  "Rwanda": "🇷🇼", "Saint Kitts and Nevis": "🇰🇳", "Saint Lucia": "🇱🇨",
  "Saint Vincent and the Grenadines": "🇻🇨", "Samoa": "🇼🇸", "San Marino": "🇸🇲",
  "Sao Tome and Principe": "🇸🇹", "Saudi Arabia": "🇸🇦", "Senegal": "🇸🇳", "Serbia": "🇷🇸",
  "Seychelles": "🇸🇨", "Sierra Leone": "🇸🇱", "Singapore": "🇸🇬", "Slovakia": "🇸🇰",
  "Slovenia": "🇸🇮", "Solomon Islands": "🇸🇧", "Somalia": "🇸🇴", "South Africa": "🇿🇦",
  "South Korea": "🇰🇷", "South Sudan": "🇸🇸", "Spain": "🇪🇸", "Sri Lanka": "🇱🇰", "Sudan": "🇸🇩",
  "Suriname": "🇸🇷", "Sweden": "🇸🇪", "Switzerland": "🇨🇭", "Syria": "🇸🇾", "Taiwan": "🇹🇼",
  "Tajikistan": "🇹🇯", "Tanzania": "🇹🇿", "Thailand": "🇹🇭", "Togo": "🇹🇬", "Tonga": "🇹🇴",
  "Trinidad and Tobago": "🇹🇹", "Tunisia": "🇹🇳", "Turkey": "🇹🇷", "Turkmenistan": "🇹🇲",
  "Tuvalu": "🇹🇻", "Uganda": "🇺🇬", "Ukraine": "🇺🇦", "United Arab Emirates": "🇦🇪",
  "United Kingdom": "🇬🇧", "United States": "🇺🇸", "Uruguay": "🇺🇾", "Uzbekistan": "🇺🇿",
  "Vanuatu": "🇻🇺", "Vatican City": "🇻🇦", "Venezuela": "🇻🇪", "Vietnam": "🇻🇳",
  "Yemen": "🇾🇪", "Zambia": "🇿🇲", "Zimbabwe": "🇿🇼",
};

const COUNTRIES = Object.keys(COUNTRY_FLAGS);

const BRAZIL_STATES = [
  "Acre", "Alagoas", "Amapá", "Amazonas", "Bahia", "Ceará",
  "Distrito Federal", "Espírito Santo", "Goiás", "Maranhão",
  "Mato Grosso", "Mato Grosso do Sul", "Minas Gerais", "Pará",
  "Paraíba", "Paraná", "Pernambuco", "Piauí", "Rio de Janeiro",
  "Rio Grande do Norte", "Rio Grande do Sul", "Rondônia", "Roraima",
  "Santa Catarina", "São Paulo", "Sergipe", "Tocantins",
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
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [cameraAllowed, setCameraAllowed] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [onlineUsers, setOnlineUsers] = useState(0);
  const [showBrazilStates, setShowBrazilStates] = useState(false);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const matchmakerRef = useRef<Matchmaker | null>(null);
  const webrtcRef = useRef<WebRTCConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  // Real online users via Supabase Realtime Presence
  useEffect(() => {
    const channel = supabase.channel('online-users', {
      config: { presence: { key: crypto.randomUUID() } },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const count = Object.keys(state).length;
        setOnlineUsers(count);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ online_at: new Date().toISOString() });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
  // Auth state listener
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session?.user);
      setCurrentUser(session?.user ?? null);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(!!session?.user);
      setCurrentUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleEmailAuth = async () => {
    setAuthLoading(true);
    setAuthError("");
    try {
      if (authMode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: authEmail,
          password: authPassword,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        setAuthError("Check your email to confirm your account!");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: authEmail,
          password: authPassword,
        });
        if (error) throw error;
        setShowLoginModal(false);
      }
    } catch (err: any) {
      setAuthError(err.message || "Authentication failed");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    const { error } = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (error) setAuthError(error.message || "Google sign in failed");
  };

  const handleAppleAuth = async () => {
    const { error } = await lovable.auth.signInWithOAuth("apple", {
      redirect_uri: window.location.origin,
    });
    if (error) setAuthError(error.message || "Apple sign in failed");
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setShowProfileMenu(false);
  };


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

  const connectToPartner = useCallback(async (roomId: string, isInitiator: boolean) => {
    const matchmaker = matchmakerRef.current;
    if (!matchmaker) return;

    const rtc = new WebRTCConnection(roomId, matchmaker.getSessionId());
    webrtcRef.current = rtc;

    rtc.onRemoteStream = (stream) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = stream;
      }
      setStatus("connected");
    };

    rtc.onDisconnected = () => {
      setStatus("disconnected");
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    };

    if (localStreamRef.current) {
      rtc.addLocalStream(localStreamRef.current);
    }

    await rtc.startListening();

    if (isInitiator) {
      await rtc.createOffer();
    }
  }, []);

  const startSearch = useCallback(async () => {
    if (!cameraAllowed || !localStreamRef.current) {
      await startLocalCamera();
      if (!localStreamRef.current) return;
    }
    setStatus("searching");
    setMessages([]);

    // Clean up previous connection
    webrtcRef.current?.destroy();
    webrtcRef.current = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;

    matchmakerRef.current?.destroy();
    const matchmaker = new Matchmaker();
    matchmakerRef.current = matchmaker;

    await matchmaker.findMatch((roomId, isInitiator) => {
      connectToPartner(roomId, isInitiator);
    });
  }, [connectToPartner, cameraAllowed, startLocalCamera]);

  const nextPerson = useCallback(async () => {
    webrtcRef.current?.destroy();
    webrtcRef.current = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    setMessages([]);
    await startSearch();
  }, [startSearch]);

  const stopChat = useCallback(() => {
    webrtcRef.current?.destroy();
    webrtcRef.current = null;
    matchmakerRef.current?.destroy();
    matchmakerRef.current = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
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
    <div className="h-[100dvh] w-screen flex flex-col md:flex-row overflow-hidden" style={{ background: "#08080e" }}>
      {/* TOP/LEFT PANEL - Stranger video */}
      <div
        className={`${status === "connected" || status === "searching" ? "h-[100dvh] md:h-full w-full" : "h-[50dvh] md:h-full md:flex-1"} relative flex flex-col overflow-hidden`}
        style={{
          background: `
            radial-gradient(ellipse at 20% 20%, rgba(124, 58, 237, 0.35) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 80%, rgba(147, 51, 234, 0.25) 0%, transparent 50%),
            radial-gradient(ellipse at 50% 50%, rgba(88, 28, 175, 0.15) 0%, transparent 60%),
            #0a0a14
          `,
        }}
      >
        {/* Top bar glass overlay */}
        <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-3 py-2.5 md:px-5 md:py-4"
          style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.4) 0%, transparent 100%)" }}
        >
          <button
            onClick={() => setShowShop(true)}
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 md:px-4 md:py-2 text-xs md:text-sm font-semibold transition-all hover:scale-105 active:scale-95"
            style={{
              background: "rgba(234, 179, 8, 0.12)",
              border: "1px solid rgba(234, 179, 8, 0.35)",
              color: "#fbbf24",
              backdropFilter: "blur(8px)",
            }}
          >
            <Heart className="w-3.5 h-3.5 md:w-4 md:h-4 fill-current" />
            Shop
          </button>

          {/* User icon */}
          {isLoggedIn ? (
            <div className="relative">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="w-9 h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95"
                style={{
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  backdropFilter: "blur(8px)",
                }}
              >
                <User className="w-4 h-4 md:w-5 md:h-5" style={{ color: "rgba(255,255,255,0.7)" }} />
              </button>

              {showProfileMenu && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setShowProfileMenu(false)} />
                  <div
                    className="absolute top-full right-0 mt-2 w-56 rounded-2xl shadow-2xl z-40 py-2 overflow-hidden"
                    style={{
                      background: "rgba(20, 20, 35, 0.95)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      backdropFilter: "blur(20px)",
                    }}
                  >
                    <div className="flex items-center gap-3 px-4 py-3.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                      <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)" }}>
                        <User className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <span className="text-sm font-semibold text-white block">You</span>
                        <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.4)" }}>Online</span>
                      </div>
                    </div>
                    {[
                      { icon: <MessageSquare className="w-4 h-4" />, label: "Text Chat", extra: <ExternalLink className="w-3.5 h-3.5 ml-auto opacity-30" /> },
                      { icon: <Share2 className="w-4 h-4" />, label: "Socials", extra: <ChevronRight className="w-4 h-4 ml-auto opacity-30" /> },
                      { icon: <FileText className="w-4 h-4" />, label: "Rules" },
                      { icon: <MoreHorizontal className="w-4 h-4" />, label: "More" },
                    ].map((item) => (
                      <button key={item.label} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors hover:bg-white/5" style={{ color: "rgba(255,255,255,0.65)" }}>
                        {item.icon}<span>{item.label}</span>{item.extra}
                      </button>
                    ))}
                    <div className="my-1.5 mx-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }} />
                    <button
                      onClick={() => { setIsLoggedIn(false); setShowProfileMenu(false); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors hover:bg-red-500/10"
                      style={{ color: "#f87171" }}
                    >
                      <LogOut className="w-4 h-4" /><span>Logout</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <button
              onClick={() => setShowLoginModal(true)}
              className="w-9 h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95"
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.15)",
                backdropFilter: "blur(8px)",
              }}
            >
              <User className="w-4 h-4 md:w-5 md:h-5" style={{ color: "rgba(255,255,255,0.6)" }} />
            </button>
          )}
        </div>

        {/* Center content (idle state) */}
        {status !== "connected" && status !== "searching" && (
          <div className="flex-1 flex flex-col items-center justify-center px-6 md:px-8">
            <div
              className="w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center mb-4 md:mb-6 animate-pulse-glow"
              style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)" }}
            >
              <svg className="w-9 h-7 md:w-11 md:h-8" viewBox="0 0 36 28" fill="none">
                <ellipse cx="11" cy="14" rx="8" ry="7" stroke="white" strokeWidth="2" fill="none" />
                <ellipse cx="25" cy="14" rx="8" ry="7" stroke="white" strokeWidth="2" fill="none" />
                <path d="M16 9 C17 7, 19 7, 20 9" stroke="#f97316" strokeWidth="1.5" fill="none" strokeLinecap="round" />
              </svg>
            </div>

            <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight">
              <span className="text-gradient">ChatRandom</span>
              <span style={{ color: "rgba(255,255,255,0.2)" }}>.gg</span>
            </h1>
            <div className="flex items-center gap-2 mt-2 md:mt-3">
              <div className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full animate-pulse" style={{ background: "#22c55e" }} />
              <span className="text-xs md:text-sm font-medium" style={{ color: "rgba(255,255,255,0.4)" }}>
                {onlineUsers.toLocaleString()} users online
              </span>
            </div>

            {/* Social buttons */}
            <div className="flex items-center gap-2.5 mt-5 md:mt-8">
              <button
                className="flex items-center gap-2 rounded-full px-4 py-2 md:px-5 md:py-2.5 text-xs md:text-sm font-semibold text-white transition-all hover:scale-105 active:scale-95"
                style={{ background: "#1877F2" }}
              >
                <Facebook className="w-3.5 h-3.5 md:w-4 md:h-4" />
                Share
              </button>
              <button
                className="flex items-center gap-2 rounded-full px-4 py-2 md:px-5 md:py-2.5 text-xs md:text-sm font-semibold text-white transition-all hover:scale-105 active:scale-95"
                style={{ background: "#5865F2" }}
              >
                <svg className="w-3.5 h-3.5 md:w-4 md:h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03z"/>
                </svg>
                Discord
              </button>
            </div>
          </div>
        )}

        {/* Remote video (stranger) */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className={`absolute inset-0 w-full h-full object-cover z-10 transition-opacity duration-500 ${status === "connected" ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        />

        {/* Connected overlay gradient */}
        {status === "connected" && (
          <div className="absolute inset-0 z-10 pointer-events-none"
            style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.3) 0%, transparent 15%, transparent 75%, rgba(0,0,0,0.5) 100%)" }}
          />
        )}

        {/* Searching overlay */}
        {status === "searching" && (
          <div className="absolute inset-0 flex items-center justify-center z-10"
            style={{ background: "rgba(8,8,14,0.75)", backdropFilter: "blur(4px)" }}
          >
            <div className="text-center space-y-3 md:space-y-4">
              <div className="relative mx-auto w-14 h-14 md:w-16 md:h-16">
                <div
                  className="absolute inset-0 rounded-full border-[3px] animate-spin"
                  style={{ borderColor: "rgba(124,58,237,0.15)", borderTopColor: "#a855f7" }}
                />
                <div className="absolute inset-2 rounded-full flex items-center justify-center"
                  style={{ background: "rgba(124,58,237,0.1)" }}
                >
                  <Search className="w-5 h-5 md:w-6 md:h-6" style={{ color: "rgba(168,85,247,0.6)" }} />
                </div>
              </div>
              <div>
                <p className="text-sm md:text-base font-semibold text-white">Looking for partner...</p>
                <p className="text-[10px] md:text-xs mt-1" style={{ color: "rgba(255,255,255,0.35)" }}>This may take a moment</p>
              </div>
            </div>
          </div>
        )}

        {/* Chat overlay */}
        {(status === "connected" || status === "searching" || messages.length > 0) && (
          <div className="absolute bottom-0 left-0 right-0 z-20 flex flex-col">
            {messages.length > 0 && (
              <div className="max-h-20 md:max-h-32 overflow-y-auto px-3 md:px-5 pb-1.5 space-y-1">
                {messages.map((msg) => (
                  <div key={msg.id} className="flex items-start gap-2">
                    <span className="text-[11px] md:text-xs font-bold shrink-0" style={{ color: msg.sender === "me" ? "#c4b5fd" : "#fbbf24" }}>
                      {msg.sender === "me" ? "You" : "Stranger"}
                    </span>
                    <span className="text-[11px] md:text-xs" style={{ color: "rgba(255,255,255,0.85)" }}>{msg.text}</span>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
            )}

            {status === "connected" && (
              <form
                onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
                className="flex items-center gap-2 px-3 md:px-5 pb-2 pt-1"
              >
                <input
                  value={inputMsg}
                  onChange={(e) => setInputMsg(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 rounded-xl px-3 py-2 md:px-4 md:py-2.5 text-xs md:text-sm focus:outline-none focus:ring-1 transition-all"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    color: "white",
                    backdropFilter: "blur(8px)",
                  }}
                />
                <button type="submit" disabled={!inputMsg.trim()}
                  className="p-2 md:p-2.5 rounded-xl disabled:opacity-30 transition-all hover:scale-105 active:scale-95"
                  style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)", color: "white" }}
                >
                  <Send className="w-3.5 h-3.5 md:w-4 md:h-4" />
                </button>
              </form>
            )}

            {/* Desktop Stop/Next */}
            <div className="hidden md:block px-5 pb-5 pt-1">
              <div className="flex items-center gap-3 justify-center">
                <button
                  onClick={stopChat}
                  className="px-8 py-3.5 rounded-2xl font-semibold text-white text-sm transition-all hover:scale-105 active:scale-95"
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    backdropFilter: "blur(8px)",
                  }}
                >
                  Stop
                </button>
                <button
                  onClick={nextPerson}
                  className="px-8 py-3.5 rounded-2xl font-semibold text-white text-sm flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
                  style={{ background: "linear-gradient(135deg, #7c3aed, #9333ea)" }}
                >
                  <SkipForward className="w-4 h-4" />
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* BOTTOM/RIGHT PANEL - Your video (PiP overlay when connected/searching, full otherwise) */}
      <div className={`${status === "connected" || status === "searching" ? "absolute bottom-20 right-3 md:bottom-6 md:right-6 w-32 h-44 md:w-48 md:h-64 rounded-2xl shadow-2xl z-30" : "h-[50dvh] md:h-full md:flex-1"} relative overflow-hidden`} style={{ background: "#111118", ...(status === "connected" || status === "searching" ? { border: "2px solid rgba(255,255,255,0.15)" } : {}) }}>
        {/* Camera feed - fills entire panel */}
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          className={`absolute inset-0 w-full h-full object-cover scale-x-[-1] transition-opacity duration-300 ${(!isCamOn || !cameraAllowed) ? "opacity-0" : "opacity-100"}`}
        />

        {/* Subtle vignette overlay on camera */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.3) 100%)" }}
        />

        {!cameraAllowed && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="text-center space-y-3 px-6">
              <div
                className="w-14 h-14 md:w-18 md:h-18 rounded-full flex items-center justify-center mx-auto"
                style={{ background: "linear-gradient(135deg, #ef4444, #dc2626)" }}
              >
                <VideoOff className="w-7 h-7 md:w-8 md:h-8 text-white" />
              </div>
              <h3 className="text-sm md:text-lg font-bold text-white">Camera permission denied</h3>
              <p className="text-[11px] md:text-sm leading-relaxed max-w-xs mx-auto" style={{ color: "rgba(255,255,255,0.4)" }}>
                To enable video, please grant permission to access your camera in your browser settings.
              </p>
            </div>
          </div>
        )}

        {cameraAllowed && !isCamOn && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <VideoOff className="w-10 h-10 md:w-12 md:h-12" style={{ color: "rgba(255,255,255,0.12)" }} />
          </div>
        )}

        {/* Top bar overlay - only show when not in PiP */}
        {status !== "connected" && status !== "searching" && (
        <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-3 py-2.5 md:px-5 md:py-4"
          style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.35) 0%, transparent 100%)" }}
        >
          <div className="flex items-center gap-2.5">
          </div>

          {/* Desktop Log In */}
          <div className="hidden md:flex items-center gap-3">
            {!isLoggedIn && (
              <button
                onClick={() => setShowLoginModal(true)}
                className="text-sm font-medium px-4 py-1.5 rounded-xl transition-all hover:scale-105 active:scale-95"
                style={{
                  color: "rgba(255,255,255,0.7)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.04)",
                }}
              >
                Log In
              </button>
            )}
          </div>
        </div>
        )}

        {/* Bottom controls - floats over video with gradient fade */}
        {status !== "connected" && status !== "searching" && (
        <div className="absolute bottom-0 left-0 right-0 z-20 px-3 md:px-5 pb-3 md:pb-5 pt-10 flex flex-col items-center gap-2.5 md:gap-3"
          style={{ background: "linear-gradient(0deg, rgba(0,0,0,0.5) 0%, transparent 100%)" }}
        >
          {/* Filters bar */}
          <div
            className="flex items-center rounded-2xl overflow-hidden w-full max-w-md"
            style={{
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(0,0,0,0.3)",
              backdropFilter: "blur(12px)",
            }}
          >
            <button
              onClick={() => { setTempRegion(selectedCountry); setShowBrazilStates(false); setShowRegion(true); }}
              className="flex-1 flex items-center justify-center gap-1.5 md:gap-2 px-3 py-3 md:px-5 md:py-3.5 text-xs md:text-sm transition-all hover:bg-white/5"
              style={{ color: "rgba(255,255,255,0.75)" }}
            >
              <Globe className="w-3.5 h-3.5 md:w-4 md:h-4" style={{ color: "#22c55e" }} />
              <span className="truncate font-medium">{selectedCountry}</span>
              <ChevronUp className="w-3 h-3 md:w-3.5 md:h-3.5 opacity-40" />
            </button>

            <div style={{ width: "1px", height: "20px", background: "rgba(255,255,255,0.1)" }} />

            <button
              onClick={() => { setTempGender(selectedGender === "Gender" ? "Both" : selectedGender); setShowGenderModal(true); }}
              className="flex-1 flex items-center justify-center gap-1.5 md:gap-2 px-3 py-3 md:px-5 md:py-3.5 text-xs md:text-sm transition-all hover:bg-white/5"
              style={{ color: "rgba(255,255,255,0.75)" }}
            >
              <Users className="w-3.5 h-3.5 md:w-4 md:h-4" style={{ color: "#a78bfa" }} />
              <span className="font-medium">{selectedGender}</span>
              <ChevronUp className="w-3 h-3 md:w-3.5 md:h-3.5 opacity-40" />
            </button>
          </div>

          {/* Start / Stop+Next */}
          {status === "idle" || status === "disconnected" ? (
            <button
              onClick={!cameraAllowed ? startLocalCamera : startSearch}
              className="w-full max-w-md py-3.5 md:py-4 rounded-2xl font-bold text-white text-sm md:text-base transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg"
              style={{
                background: "linear-gradient(135deg, #7c3aed, #a855f7)",
                boxShadow: "0 8px 32px -8px rgba(124, 58, 237, 0.5)",
              }}
            >
              👋 Start Video Chat
            </button>
          ) : (
            <div className="flex md:hidden items-center gap-2 w-full max-w-md">
              <button
                onClick={stopChat}
                className="flex-1 py-3 rounded-2xl font-semibold text-white text-xs transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  background: "rgba(0,0,0,0.3)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  backdropFilter: "blur(8px)",
                }}
              >
                Stop
              </button>
              <button
                onClick={nextPerson}
                className="flex-1 py-3 rounded-2xl font-semibold text-white text-xs flex items-center justify-center gap-1.5 transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  background: "linear-gradient(135deg, #7c3aed, #a855f7)",
                  boxShadow: "0 4px 16px -4px rgba(124, 58, 237, 0.4)",
                }}
              >
                <SkipForward className="w-3.5 h-3.5" />
                Next
              </button>
            </div>
          )}
        </div>
        )}
      </div>

      {/* Shop Modal */}
      {showShop && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" onClick={() => setShowShop(false)}>
          <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.6)" }} />
          <div
            className="relative w-full md:max-w-xl md:mx-4 rounded-t-2xl md:rounded-2xl p-4 md:p-6 max-h-[85dvh] overflow-y-auto"
            style={{ background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.1)" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag handle on mobile */}
            <div className="flex md:hidden justify-center mb-3">
              <div className="w-10 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.2)" }} />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between mb-3 md:mb-4">
              <h2 className="text-lg md:text-xl font-bold text-white">Shop</h2>
              <div className="flex items-center gap-1.5 text-sm" style={{ color: "#eab308" }}>
                <Heart className="w-4 h-4 fill-current" />
                <span className="text-white font-medium">0</span>
              </div>
            </div>

            <p className="text-xs md:text-sm mb-4 md:mb-5" style={{ color: "rgba(255,255,255,0.45)" }}>
              Higher tiers give you more bonus coins!
            </p>

            {/* Coin Packages Grid - 2 cols mobile, 3 cols desktop */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3 mb-4 md:mb-5">
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
                  className="rounded-xl p-2.5 md:p-3 flex flex-col items-center gap-1.5 md:gap-2 transition-opacity hover:opacity-90"
                  style={{
                    background: i < 3
                      ? "linear-gradient(180deg, #7c3aed, #6d28d9)"
                      : "linear-gradient(180deg, #8b5cf6, #7c3aed)",
                  }}
                >
                  <div className="text-2xl md:text-3xl py-1 md:py-2">
                    {i === 0 ? "🪙" : i < 3 ? "💰" : i < 5 ? "💎" : "🎁"}
                  </div>
                  <div className="text-xs md:text-sm font-bold text-white leading-tight text-center">
                    {pkg.coins} {pkg.bonus && <span style={{ color: "#4ade80" }}>{pkg.bonus}</span>} Coins
                  </div>
                  <div
                    className="w-full py-1 md:py-1.5 rounded-lg text-xs md:text-sm font-semibold text-center"
                    style={{ background: "rgba(0,0,0,0.25)", color: "#4ade80" }}
                  >
                    {pkg.price}
                  </div>
                </button>
              ))}
            </div>

            {/* Disclaimers */}
            <div className="space-y-1 text-[10px] md:text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
              <p>*Filters (e.g. gender, location, etc.) are based on the user's input. The results may not be accurate.</p>
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
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" onClick={() => setShowRegion(false)}>
          <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }} />
          <div
            className="relative w-full md:max-w-md md:mx-4 rounded-t-3xl md:rounded-2xl p-5 md:p-6 max-h-[80dvh] overflow-y-auto"
            style={{ background: "rgba(20, 20, 35, 0.98)", border: "1px solid rgba(255,255,255,0.08)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex md:hidden justify-center mb-4">
              <div className="w-10 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.15)" }} />
            </div>
            <h2 className="text-lg md:text-xl font-bold text-white mb-1">Region Preferences</h2>
            <p className="text-xs md:text-sm mb-4" style={{ color: "rgba(255,255,255,0.4)" }}>
              Choose a region to match with. Some regions require coins.
            </p>

            <div className="space-y-1 max-h-56 md:max-h-64 overflow-y-auto mb-5">
              {showBrazilStates ? (
                <>
                  <button
                    onClick={() => setShowBrazilStates(false)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-left transition-all mb-2"
                    style={{ background: "rgba(124,58,237,0.15)", border: "1.5px solid rgba(124,58,237,0.3)" }}
                  >
                    <span className="text-lg">←</span>
                    <span className="text-lg">🇧🇷</span>
                    <p className="text-sm font-semibold text-white">Brasil - Escolha o estado</p>
                  </button>
                  {BRAZIL_STATES.map((state) => (
                    <button
                      key={state}
                      onClick={() => { setTempRegion(`Brazil - ${state}`); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-left transition-all"
                      style={{
                        border: tempRegion === `Brazil - ${state}` ? "1.5px solid #7c3aed" : "1.5px solid transparent",
                        background: tempRegion === `Brazil - ${state}` ? "rgba(124,58,237,0.1)" : "rgba(255,255,255,0.02)",
                      }}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white">{state}</p>
                      </div>
                      <span className="text-[10px] font-medium" style={{ color: "rgba(255,255,255,0.4)" }}>10 🪙</span>
                    </button>
                  ))}
                </>
              ) : (
                COUNTRIES.map((country) => (
                  <button
                    key={country}
                    onClick={() => {
                      if (country === "Brazil") {
                        setShowBrazilStates(true);
                      } else {
                        setTempRegion(country);
                      }
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-left transition-all"
                    style={{
                      border: tempRegion === country ? "1.5px solid #7c3aed" : "1.5px solid transparent",
                      background: tempRegion === country ? "rgba(124,58,237,0.1)" : "rgba(255,255,255,0.02)",
                    }}
                  >
                    <span className="text-lg">{COUNTRY_FLAGS[country] || "🏳️"}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white">{country}</p>
                      {country === "Brazil" && (
                        <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>Toque para escolher estado</p>
                      )}
                    </div>
                    {country === "Worldwide" ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(34,197,94,0.15)", color: "#4ade80" }}>FREE</span>
                    ) : country === "Brazil" ? (
                      <ChevronRight className="w-4 h-4" style={{ color: "rgba(255,255,255,0.3)" }} />
                    ) : (
                      <span className="text-[10px] font-medium" style={{ color: "rgba(255,255,255,0.4)" }}>10 🪙</span>
                    )}
                  </button>
                ))
              )}
            </div>

            <button
              onClick={() => { setSelectedCountry(tempRegion); setShowRegion(false); }}
              className="w-full py-3.5 rounded-xl font-bold text-white text-sm transition-all hover:scale-[1.02] active:scale-[0.98] mb-2"
              style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)", boxShadow: "0 4px 16px -4px rgba(124,58,237,0.4)" }}
            >
              Save
            </button>
            <button onClick={() => setShowRegion(false)} className="w-full py-2 text-sm font-medium transition-colors" style={{ color: "rgba(255,255,255,0.4)" }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Gender Preferences Modal */}
      {showGenderModal && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" onClick={() => setShowGenderModal(false)}>
          <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }} />
          <div
            className="relative w-full md:max-w-md md:mx-4 rounded-t-3xl md:rounded-2xl p-5 md:p-6"
            style={{ background: "rgba(20, 20, 35, 0.98)", border: "1px solid rgba(255,255,255,0.08)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex md:hidden justify-center mb-4">
              <div className="w-10 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.15)" }} />
            </div>
            <h2 className="text-lg md:text-xl font-bold text-white mb-1">Gender Preferences</h2>
            <p className="text-xs md:text-sm mb-5" style={{ color: "rgba(255,255,255,0.4)" }}>
              <span className="font-bold text-white">15 Coins</span> are used whenever you match with the gender filter on.
            </p>

            <div className="grid grid-cols-3 gap-2.5 md:gap-3 mb-5">
              {[
                { id: "Male", emoji: "👨", color: "#38bdf8", borderColor: "#38bdf8", cost: true },
                { id: "Both", emoji: "👫", color: "#a855f7", borderColor: "#a855f7", cost: false },
                { id: "Female", emoji: "👩", color: "#ec4899", borderColor: "#ec4899", cost: true },
              ].map((g) => (
                <button
                  key={g.id}
                  onClick={() => setTempGender(g.id)}
                  className="relative flex flex-col items-center gap-2.5 rounded-2xl py-5 px-3 transition-all hover:scale-105 active:scale-95"
                  style={{
                    background: tempGender === g.id ? `${g.borderColor}15` : "rgba(255,255,255,0.03)",
                    border: tempGender === g.id ? `2px solid ${g.borderColor}` : "2px solid rgba(255,255,255,0.06)",
                  }}
                >
                  {g.cost && (
                    <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[10px] font-bold px-2.5 py-0.5 rounded-full"
                      style={{ background: "#eab308", color: "#000" }}>15 🪙</span>
                  )}
                  <span className="text-3xl md:text-4xl">{g.emoji}</span>
                  <span className="text-xs md:text-sm font-semibold" style={{ color: g.color }}>{g.id}</span>
                </button>
              ))}
            </div>

            <button
              onClick={() => { setSelectedGender(tempGender); setShowGenderModal(false); }}
              className="w-full py-3.5 rounded-xl font-bold text-white text-sm transition-all hover:scale-[1.02] active:scale-[0.98] mb-2"
              style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)", boxShadow: "0 4px 16px -4px rgba(124,58,237,0.4)" }}
            >
              Save
            </button>
            <button onClick={() => setShowGenderModal(false)} className="w-full py-2 text-sm font-medium transition-colors" style={{ color: "rgba(255,255,255,0.4)" }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" onClick={() => setShowLoginModal(false)}>
          <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }} />
          <div
            className="relative w-full md:max-w-sm md:mx-4 rounded-t-3xl md:rounded-2xl p-6 md:p-8 text-center"
            style={{ background: "rgba(20, 20, 35, 0.98)", border: "1px solid rgba(255,255,255,0.08)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex md:hidden justify-center mb-4">
              <div className="w-10 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.15)" }} />
            </div>

            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5 animate-pulse-glow"
              style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)" }}
            >
              <svg width="32" height="24" viewBox="0 0 36 28" fill="none">
                <ellipse cx="11" cy="14" rx="8" ry="7" stroke="white" strokeWidth="2" fill="none" />
                <ellipse cx="25" cy="14" rx="8" ry="7" stroke="white" strokeWidth="2" fill="none" />
                <path d="M16 9 C17 7, 19 7, 20 9" stroke="#f97316" strokeWidth="1.5" fill="none" strokeLinecap="round" />
              </svg>
            </div>

            <h2 className="text-xl font-extrabold">
              <span className="text-gradient">ChatRandom</span>
              <span style={{ color: "rgba(255,255,255,0.2)" }}>.gg</span>
            </h2>
            <p className="text-xs md:text-sm mt-1.5 mb-6" style={{ color: "rgba(255,255,255,0.4)" }}>
              Sign in to start chatting!
            </p>

            <div className="space-y-2.5">
              <button
                onClick={() => { setIsLoggedIn(true); setShowLoginModal(false); }}
                className="w-full flex items-center justify-center gap-3 py-3 rounded-xl text-sm font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
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
                className="w-full flex items-center justify-center gap-3 py-3 rounded-xl text-sm font-semibold text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={{ background: "#1877F2" }}
              >
                <Facebook className="w-5 h-5" />
                Continue with Facebook
              </button>

              <button
                onClick={() => { setIsLoggedIn(true); setShowLoginModal(false); }}
                className="w-full flex items-center justify-center gap-3 py-3 rounded-xl text-sm font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={{ background: "white", color: "#1a1a2e" }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#000">
                  <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.32 2.32-2.12 4.53-3.74 4.25z"/>
                </svg>
                Continue with Apple
              </button>
            </div>

            <p className="text-[10px] md:text-xs mt-5 leading-relaxed" style={{ color: "rgba(255,255,255,0.25)" }}>
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
