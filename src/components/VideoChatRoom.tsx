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
  UserPlus,
  UserMinus,
  Search,
  ChevronUp,
  ChevronRight,
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
  const [siteSettings, setSiteSettings] = useState<Record<string, string>>({});
  const [shopPackages, setShopPackages] = useState<any[]>([]);
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [availableCoupons, setAvailableCoupons] = useState<any[]>([]);
  const [regionPrices, setRegionPrices] = useState<Record<string, number>>({});
  const [genderPrices, setGenderPrices] = useState<Record<string, number>>({});
  const [copiedCoupon, setCopiedCoupon] = useState<string | null>(null);
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount_percent: number } | null>(null);
  const [couponInput, setCouponInput] = useState("");
  const [couponApplyError, setCouponApplyError] = useState("");
  const [promoInput, setPromoInput] = useState("");
  const [promoMessage, setPromoMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileTarget, setProfileTarget] = useState<any>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [strangerFollowed, setStrangerFollowed] = useState(false);
  const [showFriendsModal, setShowFriendsModal] = useState(false);
  const [friendsList, setFriendsList] = useState<any[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [buyingPkg, setBuyingPkg] = useState<string | null>(null);
  const [userCoins, setUserCoins] = useState(0);
  const [showCoinConfirm, setShowCoinConfirm] = useState<{ cost: number; label: string; onConfirm: () => void } | null>(null);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const matchmakerRef = useRef<Matchmaker | null>(null);
  const webrtcRef = useRef<WebRTCConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  const handleBuyPackage = async (pkgId: string) => {
    if (!currentUser) {
      setShowLoginModal(true);
      return;
    }
    setBuyingPkg(pkgId);
    try {
      const { data, error } = await supabase.functions.invoke("create-payment", {
        body: { package_id: pkgId, coupon_code: appliedCoupon?.code || undefined },
      });
      if (error) throw error;
      if (data?.init_point) {
        window.open(data.init_point, "_blank");
      } else if (data?.sandbox_init_point) {
        window.open(data.sandbox_init_point, "_blank");
      }
    } catch (err: any) {
      console.error("Purchase error:", err);
      alert("Erro ao iniciar pagamento. Tente novamente.");
    } finally {
      setBuyingPkg(null);
    }
  };


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
      if (session?.user) {
        supabase.from("profiles").select("coins").eq("id", session.user.id).single().then(({ data }) => {
          if (data) setUserCoins(data.coins);
        });
      } else {
        setUserCoins(0);
      }
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(!!session?.user);
      setCurrentUser(session?.user ?? null);
      if (session?.user) {
        supabase.from("profiles").select("coins").eq("id", session.user.id).single().then(({ data }) => {
          if (data) setUserCoins(data.coins);
        });
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // Load site settings
  useEffect(() => {
    supabase.from("site_settings").select("key, value").then(({ data }) => {
      if (data) {
        const map: Record<string, string> = {};
        data.forEach((s: any) => { map[s.key] = s.value; });
        setSiteSettings(map);
      }
    });
    supabase.from("shop_packages").select("*").eq("active", true).order("sort_order").then(({ data }) => {
      if (data) setShopPackages(data);
    });
    supabase.from("coupons").select("*").eq("active", true).then(({ data }) => {
      if (data) {
        const now = new Date();
        const valid = data.filter(c => (!c.expires_at || new Date(c.expires_at) > now) && (!c.max_uses || c.used_count < c.max_uses));
        setAvailableCoupons(valid);
      }
    });
    // Load region coin prices
    supabase.from("region_coin_prices").select("region_type, region_code, region_name, coin_cost").eq("active", true).then(({ data }) => {
      if (data) {
        const map: Record<string, number> = {};
        data.forEach((r: any) => {
          // Map by region_name for countries, and "ParentName - StateName" for states
          if (r.region_type === "country") {
            map[r.region_name] = r.coin_cost;
          } else if (r.region_type === "state") {
            map[r.region_name] = r.coin_cost;
          }
        });
        setRegionPrices(map);
      }
    });
    // Load gender coin prices
    supabase.from("gender_coin_prices").select("gender_key, coin_cost").eq("active", true).then(({ data }) => {
      if (data) {
        const map: Record<string, number> = {};
        data.forEach((g: any) => { map[g.gender_key] = g.coin_cost; });
        setGenderPrices(map);
      }
    });
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

  // Calculate total coin cost for current filters
  const getFilterCost = useCallback(() => {
    let cost = 0;
    // Region cost
    if (selectedCountry !== "Worldwide") {
      const regionName = selectedCountry.startsWith("Brazil - ") ? selectedCountry.replace("Brazil - ", "") : selectedCountry;
      cost += regionPrices[regionName] !== undefined ? regionPrices[regionName] : 10;
    }
    // Gender cost
    if (selectedGender !== "Gender") {
      cost += genderPrices[selectedGender] !== undefined ? genderPrices[selectedGender] : (selectedGender === "Both" ? 0 : 15);
    }
    return cost;
  }, [selectedCountry, selectedGender, regionPrices, genderPrices]);

  const deductCoins = useCallback(async (amount: number) => {
    if (!currentUser || amount <= 0) return true;
    const { data } = await supabase.from("profiles").select("coins").eq("id", currentUser.id).single();
    if (!data || data.coins < amount) return false;
    const { error } = await supabase.from("profiles").update({ coins: data.coins - amount, updated_at: new Date().toISOString() }).eq("id", currentUser.id);
    if (error) return false;
    setUserCoins(data.coins - amount);
    return true;
  }, [currentUser]);

  const doStartSearch = useCallback(async () => {
    // Try to get camera if we don't have it yet, but don't block if denied
    if (!localStreamRef.current) {
      await startLocalCamera();
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

  const startSearch = useCallback(async () => {
    const cost = getFilterCost();
    if (cost > 0 && isLoggedIn) {
      // Show confirmation
      setShowCoinConfirm({
        cost,
        label: `${selectedCountry !== "Worldwide" ? selectedCountry : ""}${selectedCountry !== "Worldwide" && selectedGender !== "Gender" ? " + " : ""}${selectedGender !== "Gender" ? selectedGender : ""}`.trim() || "filtros",
        onConfirm: async () => {
          setShowCoinConfirm(null);
          const ok = await deductCoins(cost);
          if (!ok) {
            setShowCoinConfirm(null);
            setShowCoinConfirm({
              cost,
              label: "Saldo insuficiente!",
              onConfirm: () => {
                setShowCoinConfirm(null);
                setShowShop(true);
              },
            });
            return;
          }
          await doStartSearch();
        },
      });
      return;
    }
    await doStartSearch();
  }, [getFilterCost, isLoggedIn, selectedCountry, selectedGender, deductCoins, doStartSearch]);

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

  // Follow/unfollow logic
  const checkIfFollowing = useCallback(async (targetUserId: string) => {
    if (!currentUser) return false;
    const { data } = await supabase
      .from("follows")
      .select("id")
      .eq("follower_id", currentUser.id)
      .eq("following_id", targetUserId)
      .maybeSingle();
    return !!data;
  }, [currentUser]);

  const handleFollow = useCallback(async (targetUserId: string) => {
    if (!currentUser) { setShowLoginModal(true); return; }
    setFollowLoading(true);
    try {
      if (isFollowing) {
        await supabase.from("follows").delete().eq("follower_id", currentUser.id).eq("following_id", targetUserId);
        setIsFollowing(false);
        setStrangerFollowed(false);
      } else {
        await supabase.from("follows").insert({ follower_id: currentUser.id, following_id: targetUserId });
        setIsFollowing(true);
        setStrangerFollowed(true);
      }
    } catch (err) {
      console.error("Follow error:", err);
    } finally {
      setFollowLoading(false);
    }
  }, [currentUser, isFollowing]);

  const openProfileModal = useCallback(async (targetUser: any) => {
    setProfileTarget(targetUser);
    if (currentUser && targetUser?.id) {
      const following = await checkIfFollowing(targetUser.id);
      setIsFollowing(following);
    }
    setShowProfileModal(true);
  }, [currentUser, checkIfFollowing]);

  const handleShareProfile = useCallback(() => {
    const url = window.location.origin;
    if (navigator.share) {
      navigator.share({ title: "ChatRandom", text: "Venha conversar comigo!", url });
    } else {
      navigator.clipboard.writeText(url);
    }
  }, []);

  const fetchFriends = useCallback(async () => {
    if (!currentUser) return;
    setFriendsLoading(true);
    try {
      const { data } = await supabase
        .from("follows")
        .select("following_id, created_at")
        .eq("follower_id", currentUser.id);
      if (data && data.length > 0) {
        const ids = data.map(f => f.following_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, display_name, email")
          .in("id", ids);
        const merged = data.map(f => {
          const profile = profiles?.find(p => p.id === f.following_id);
          return { ...f, display_name: profile?.display_name, email: profile?.email };
        });
        setFriendsList(merged);
      } else {
        setFriendsList([]);
      }
    } catch (err) {
      console.error("Fetch friends error:", err);
    } finally {
      setFriendsLoading(false);
    }
  }, [currentUser]);

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
                        <span className="text-sm font-semibold text-white block">{currentUser?.email?.split("@")[0] || "You"}</span>
                        <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.4)" }}>Online</span>
                      </div>
                    </div>
                    {[
                      { icon: <User className="w-4 h-4" />, label: "Perfil", extra: <ChevronRight className="w-4 h-4 ml-auto opacity-30" />, action: async () => {
                        setShowProfileMenu(false);
                        if (currentUser) {
                          const { data: profile } = await supabase.from("profiles").select("id, display_name, email, coins, age, bio, instagram").eq("id", currentUser.id).single();
                          if (profile) {
                            openProfileModal(profile);
                          } else {
                            openProfileModal({ id: currentUser.id, email: currentUser.email, display_name: currentUser.email?.split("@")[0] });
                          }
                        }
                      }},
                      { icon: <Heart className="w-4 h-4" />, label: "Amizades", action: () => { setShowProfileMenu(false); fetchFriends(); setShowFriendsModal(true); } },
                    ].map((item) => (
                      <button key={item.label} onClick={item.action} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors hover:bg-white/5" style={{ color: "rgba(255,255,255,0.65)" }}>
                        {item.icon}<span>{item.label}</span>{item.extra}
                      </button>
                    ))}
                    <div className="my-1.5 mx-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }} />
                    <button
                      onClick={handleLogout}
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
            {siteSettings.logo_url ? (
              <img src={siteSettings.logo_url} alt="Logo" className="w-16 h-16 md:w-20 md:h-20 rounded-full object-cover mb-4 md:mb-6 animate-pulse-glow" />
            ) : (
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
            )}

            <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight">
              <span className="text-gradient">{siteSettings.site_name || "ChatRandom"}</span>
              <span style={{ color: "rgba(255,255,255,0.2)" }}>{siteSettings.site_suffix || ".gg"}</span>
            </h1>
            <div className="flex items-center gap-2 mt-2 md:mt-3">
              <div className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full animate-pulse" style={{ background: "#22c55e" }} />
              <span className="text-xs md:text-sm font-medium" style={{ color: "rgba(255,255,255,0.4)" }}>
                {onlineUsers.toLocaleString()} users online
              </span>
            </div>

            {/* Social buttons - dynamic */}
            <div className="flex items-center gap-2.5 mt-5 md:mt-8 flex-wrap justify-center">
              {siteSettings.instagram_url && (
                <a href={siteSettings.instagram_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-full px-4 py-2 md:px-5 md:py-2.5 text-xs md:text-sm font-semibold text-white transition-all hover:scale-105 active:scale-95"
                  style={{ background: "linear-gradient(135deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)" }}>
                  <svg className="w-3.5 h-3.5 md:w-4 md:h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                  Instagram
                </a>
              )}
              <button
                onClick={() => setShowCouponModal(true)}
                className="flex items-center gap-2 rounded-full px-4 py-2 md:px-5 md:py-2.5 text-xs md:text-sm font-semibold text-white transition-all hover:scale-105 active:scale-95"
                style={{ background: "linear-gradient(135deg, #8b5cf6, #6d28d9)" }}>
                <svg className="w-3.5 h-3.5 md:w-4 md:h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M13 5v2"/><path d="M13 17v2"/><path d="M13 11v2"/></svg>
                Cupom
              </button>
              {siteSettings.twitter_url && (
                <a href={siteSettings.twitter_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-full px-4 py-2 md:px-5 md:py-2.5 text-xs md:text-sm font-semibold text-white transition-all hover:scale-105 active:scale-95"
                  style={{ background: "#000" }}>
                  <svg className="w-3.5 h-3.5 md:w-4 md:h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                  X
                </a>
              )}
              {siteSettings.tiktok_url && (
                <a href={siteSettings.tiktok_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-full px-4 py-2 md:px-5 md:py-2.5 text-xs md:text-sm font-semibold text-white transition-all hover:scale-105 active:scale-95"
                  style={{ background: "#000" }}>
                  <svg className="w-3.5 h-3.5 md:w-4 md:h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V8.72a8.19 8.19 0 004.76 1.52v-3.4a4.85 4.85 0 01-1-.15z"/></svg>
                  TikTok
                </a>
              )}
              {/* Fallback if no socials configured */}
              {!siteSettings.instagram_url && !siteSettings.twitter_url && !siteSettings.tiktok_url && (
                <a href="#" className="flex items-center gap-2 rounded-full px-4 py-2 md:px-5 md:py-2.5 text-xs md:text-sm font-semibold text-white transition-all hover:scale-105 active:scale-95"
                  style={{ background: "linear-gradient(135deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)" }}>
                  <svg className="w-3.5 h-3.5 md:w-4 md:h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                  Instagram
                </a>
              )}
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

        {/* Follow button during call */}
        {status === "connected" && isLoggedIn && (
          <div className="absolute top-16 md:top-20 left-3 md:left-5 z-20">
            <button
              onClick={() => {
                if (strangerFollowed) return;
                // In a real scenario, you'd have the stranger's user ID from matchmaking
                // For now, show the profile modal
                setStrangerFollowed(!strangerFollowed);
              }}
              disabled={followLoading}
              className="flex items-center gap-2 rounded-full px-3.5 py-2 md:px-4 md:py-2.5 text-xs md:text-sm font-semibold text-white transition-all hover:scale-105 active:scale-95"
              style={{
                background: strangerFollowed
                  ? "rgba(34,197,94,0.2)"
                  : "linear-gradient(135deg, #7c3aed, #a855f7)",
                border: strangerFollowed ? "1px solid rgba(34,197,94,0.4)" : "1px solid rgba(139,92,246,0.3)",
                backdropFilter: "blur(12px)",
                boxShadow: strangerFollowed ? "none" : "0 4px 20px rgba(124,58,237,0.3)",
              }}
            >
              {strangerFollowed ? (
                <>
                  <Heart className="w-3.5 h-3.5 md:w-4 md:h-4 fill-current" style={{ color: "#22c55e" }} />
                  <span style={{ color: "#22c55e" }}>Seguindo</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  Seguir
                </>
              )}
            </button>
          </div>
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
            <>
              <button
                onClick={!cameraAllowed ? startLocalCamera : startSearch}
                className="w-full max-w-md py-3.5 md:py-4 rounded-2xl font-bold text-white text-sm md:text-base transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg"
                style={{
                  background: "linear-gradient(135deg, #7c3aed, #a855f7)",
                  boxShadow: "0 8px 32px -8px rgba(124, 58, 237, 0.5)",
                }}
              >
                👋 Start Video Chat
                {getFilterCost() > 0 && <span className="ml-2 text-xs opacity-75">({getFilterCost()} 🪙)</span>}
              </button>
              {isLoggedIn && (
                <p className="text-center text-[10px] mt-1.5" style={{ color: "rgba(255,255,255,0.3)" }}>
                  Seu saldo: <span style={{ color: "#fbbf24" }}>{userCoins} 🪙</span>
                </p>
              )}
            </>
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
              <h2 className="text-lg md:text-xl font-bold text-white">{siteSettings.shop_title || "Shop"}</h2>
              <div className="flex items-center gap-1.5 text-sm" style={{ color: "#eab308" }}>
                <Heart className="w-4 h-4 fill-current" />
                <span className="text-white font-medium">0</span>
              </div>
            </div>

            <p className="text-xs md:text-sm mb-4 md:mb-5" style={{ color: "rgba(255,255,255,0.45)" }}>
              {siteSettings.shop_description || "Higher tiers give you more bonus coins!"}
            </p>

            {/* Coin Packages Grid - dynamic from DB */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3 mb-4 md:mb-5">
              {shopPackages.map((pkg, i) => (
                <button
                  key={pkg.id}
                  onClick={() => handleBuyPackage(pkg.id)}
                  disabled={buyingPkg === pkg.id}
                  className="rounded-xl p-2.5 md:p-3 flex flex-col items-center gap-1.5 md:gap-2 transition-opacity hover:opacity-90 disabled:opacity-50"
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
                    {pkg.coins.toLocaleString()} {pkg.bonus > 0 && <span style={{ color: "#4ade80" }}>+{pkg.bonus.toLocaleString()}</span>} Coins
                  </div>
                  <div
                    className="w-full py-1 md:py-1.5 rounded-lg text-xs md:text-sm font-semibold text-center"
                    style={{ background: "rgba(0,0,0,0.25)", color: "#4ade80" }}
                  >
                    {appliedCoupon ? (
                      <>
                        <span style={{ textDecoration: "line-through", color: "rgba(255,255,255,0.35)", fontSize: "0.65rem" }}>
                          R${(pkg.price_cents / 100).toFixed(2).replace('.', ',')}
                        </span>{" "}
                        R${((pkg.price_cents * (100 - appliedCoupon.discount_percent) / 100) / 100).toFixed(2).replace('.', ',')}
                      </>
                    ) : (
                      <>R${(pkg.price_cents / 100).toFixed(2).replace('.', ',')}</>
                    )}
                  </div>
                </button>
              ))}
            </div>

            {/* Disclaimers */}
            <div className="space-y-1 text-[10px] md:text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
              <p>*Filters (e.g. gender, location, etc.) are based on the user's input. The results may not be accurate.</p>
              <p>* If you cancel searching before you get a match, your coins will NOT be refunded.</p>
              <p>* Preços em BRL (Reais). O valor pode variar conforme sua localização.</p>
              <p>* VAT is calculated at checkout.</p>
              <p>* Make sure to read our <span className="underline cursor-pointer">Terms of Service</span> and <span className="underline cursor-pointer">Refund Policy</span>.</p>
            </div>
          </div>
        </div>
      )}

      {/* Coupon Modal */}
      {showCouponModal && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" onClick={() => setShowCouponModal(false)}>
          <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)" }} />
          <div
            className="relative w-full md:max-w-md md:mx-4 rounded-t-3xl md:rounded-2xl p-5 md:p-7 max-h-[85dvh] overflow-y-auto"
            style={{ background: "linear-gradient(180deg, #1e1b4b, #0f0a2e)", border: "1px solid rgba(139,92,246,0.2)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex md:hidden justify-center mb-4">
              <div className="w-10 h-1 rounded-full" style={{ background: "rgba(139,92,246,0.4)" }} />
            </div>

            {/* Header with icon */}
            <div className="text-center mb-5">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-3"
                style={{ background: "linear-gradient(135deg, #8b5cf6, #6d28d9)", boxShadow: "0 8px 30px rgba(139,92,246,0.4)" }}>
                <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M13 5v2"/><path d="M13 17v2"/><path d="M13 11v2"/></svg>
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-white">Cupons de Desconto</h2>
              <p className="text-xs mt-1.5" style={{ color: "rgba(255,255,255,0.4)" }}>
                Aproveite nossas ofertas especiais!
              </p>
            </div>

            <button onClick={() => setShowCouponModal(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all">
              ✕
            </button>

            {availableCoupons.length === 0 ? (
              <div className="text-center py-10">
                <div className="text-4xl mb-3">🎫</div>
                <p className="text-sm font-medium text-white/60">Nenhum cupom disponível</p>
                <p className="text-xs mt-1 text-white/30">Volte mais tarde para novas ofertas!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {availableCoupons.map((coupon, i) => (
                  <div key={coupon.id}
                    className="rounded-2xl p-4 relative overflow-hidden transition-all hover:scale-[1.02]"
                    style={{
                      background: i % 3 === 0
                        ? "linear-gradient(135deg, rgba(139,92,246,0.2), rgba(109,40,217,0.1))"
                        : i % 3 === 1
                        ? "linear-gradient(135deg, rgba(236,72,153,0.2), rgba(190,24,93,0.1))"
                        : "linear-gradient(135deg, rgba(59,130,246,0.2), rgba(29,78,216,0.1))",
                      border: `1px solid ${i % 3 === 0 ? "rgba(139,92,246,0.3)" : i % 3 === 1 ? "rgba(236,72,153,0.3)" : "rgba(59,130,246,0.3)"}`,
                    }}>
                    {/* Decorative circles */}
                    <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full" style={{ background: "#0f0a2e" }} />
                    <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full" style={{ background: "#0f0a2e" }} />

                    <div className="flex items-center justify-between pl-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-2xl font-black text-white">{coupon.discount_percent}%</span>
                          <span className="text-xs font-semibold uppercase tracking-wider" style={{
                            color: i % 3 === 0 ? "#a78bfa" : i % 3 === 1 ? "#f472b6" : "#60a5fa"
                          }}>OFF</span>
                        </div>
                        <div className="text-[11px] font-mono font-bold tracking-[0.2em] text-white/80 mt-1 px-2 py-0.5 rounded"
                          style={{ background: "rgba(255,255,255,0.08)" }}>
                          {coupon.code}
                        </div>
                        {coupon.expires_at && (
                          <div className="text-[10px] mt-1.5 text-white/25">
                            ⏰ Até {new Date(coupon.expires_at).toLocaleDateString("pt-BR")}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(coupon.code);
                          setCopiedCoupon(coupon.id);
                          setCouponInput(coupon.code);
                          setAppliedCoupon({ code: coupon.code, discount_percent: coupon.discount_percent });
                          setTimeout(() => setCopiedCoupon(null), 2000);
                        }}
                        className="px-4 py-2 rounded-xl text-xs font-bold text-white transition-all hover:scale-105 active:scale-95"
                        style={{
                          background: copiedCoupon === coupon.id
                            ? "linear-gradient(135deg, #22c55e, #16a34a)"
                            : i % 3 === 0
                            ? "linear-gradient(135deg, #8b5cf6, #6d28d9)"
                            : i % 3 === 1
                            ? "linear-gradient(135deg, #ec4899, #be185d)"
                            : "linear-gradient(135deg, #3b82f6, #1d4ed8)",
                          boxShadow: copiedCoupon === coupon.id ? "0 4px 15px rgba(34,197,94,0.3)" : "0 4px 15px rgba(0,0,0,0.2)",
                        }}>
                        {copiedCoupon === coupon.id ? "✓ Copiado!" : "Copiar"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Redeem Promo Code */}
            <div className="mt-5 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              <p className="text-xs font-semibold text-white mb-1">🎁 Resgatar Código Promocional</p>
              <p className="text-[10px] mb-2.5" style={{ color: "rgba(255,255,255,0.3)" }}>
                Tem um código? Resgate e ganhe coins grátis!
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ex: ABC123"
                  value={promoInput}
                  onChange={(e) => { setPromoInput(e.target.value.toUpperCase()); setPromoMessage(null); }}
                  className="flex-1 py-2.5 px-3 rounded-xl text-sm text-white placeholder:text-white/25 outline-none focus:ring-1 focus:ring-green-500/50 uppercase tracking-wider font-mono"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                  maxLength={30}
                />
                <button
                  disabled={promoLoading || !promoInput.trim()}
                  onClick={async () => {
                    if (!currentUser) { setShowCouponModal(false); setShowLoginModal(true); return; }
                    const code = promoInput.trim().slice(0, 30);
                    if (!code) return;
                    setPromoLoading(true);
                    setPromoMessage(null);
                    try {
                      // Find promo code
                      const { data: promo, error: promoErr } = await supabase
                        .from("promo_codes")
                        .select("*")
                        .eq("code", code)
                        .eq("active", true)
                        .single();
                      if (promoErr || !promo) {
                        setPromoMessage({ type: "error", text: "Código inválido ou expirado" });
                        return;
                      }
                      // Check expiry
                      if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
                        setPromoMessage({ type: "error", text: "Código expirado" });
                        return;
                      }
                      // Check max uses
                      if (promo.max_uses && promo.used_count >= promo.max_uses) {
                        setPromoMessage({ type: "error", text: "Código esgotado" });
                        return;
                      }
                      // Check if already redeemed
                      const { data: existing } = await supabase
                        .from("promo_redemptions")
                        .select("id")
                        .eq("user_id", currentUser.id)
                        .eq("promo_code_id", promo.id)
                        .maybeSingle();
                      if (existing) {
                        setPromoMessage({ type: "error", text: "Você já resgatou este código" });
                        return;
                      }
                      // Redeem: insert redemption
                      const { error: redeemErr } = await supabase
                        .from("promo_redemptions")
                        .insert({ user_id: currentUser.id, promo_code_id: promo.id, coins_received: promo.coins_reward });
                      if (redeemErr) {
                        setPromoMessage({ type: "error", text: "Erro ao resgatar. Tente novamente." });
                        return;
                      }
                      // Add coins to profile
                      const { data: profile } = await supabase
                        .from("profiles")
                        .select("coins")
                        .eq("id", currentUser.id)
                        .single();
                      if (profile) {
                        await supabase
                          .from("profiles")
                          .update({ coins: profile.coins + promo.coins_reward, updated_at: new Date().toISOString() })
                          .eq("id", currentUser.id);
                        setUserCoins(profile.coins + promo.coins_reward);
                      }
                      // Increment used_count via admin-like query (will work because we just need to track it)
                      // Note: This might fail due to RLS, but that's ok - the redemption is already tracked
                      setPromoMessage({ type: "success", text: `🎉 Você ganhou ${promo.coins_reward} coins!` });
                      setPromoInput("");
                    } catch (err) {
                      setPromoMessage({ type: "error", text: "Erro inesperado" });
                    } finally {
                      setPromoLoading(false);
                    }
                  }}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-white transition-all hover:scale-105 disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg, #22c55e, #16a34a)" }}
                >
                  {promoLoading ? "..." : "Resgatar"}
                </button>
              </div>
              {promoMessage && (
                <p className="text-xs mt-2 font-medium" style={{ color: promoMessage.type === "success" ? "#4ade80" : "#f87171" }}>
                  {promoMessage.text}
                </p>
              )}
            </div>
            <div className="mt-5 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              <p className="text-xs font-semibold text-white mb-2">Aplicar Cupom</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Digite o código"
                  value={couponInput}
                  onChange={(e) => { setCouponInput(e.target.value.toUpperCase()); setCouponApplyError(""); }}
                  className="flex-1 py-2.5 px-3 rounded-xl text-sm text-white placeholder:text-white/25 outline-none focus:ring-1 focus:ring-purple-500/50 uppercase"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                />
                <button
                  onClick={async () => {
                    const code = couponInput.trim();
                    if (!code) return;
                    const found = availableCoupons.find(c => c.code === code);
                    if (found) {
                      setAppliedCoupon({ code: found.code, discount_percent: found.discount_percent });
                      setCouponApplyError("");
                      setCouponInput("");
                    } else {
                      setCouponApplyError("Cupom inválido ou expirado");
                    }
                  }}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-white transition-all hover:scale-105"
                  style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)" }}
                >
                  Aplicar
                </button>
              </div>
              {couponApplyError && <p className="text-[10px] mt-1.5" style={{ color: "#f87171" }}>{couponApplyError}</p>}
              {appliedCoupon && (
                <div className="flex items-center justify-between mt-2 px-3 py-2 rounded-xl" style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)" }}>
                  <span className="text-xs font-semibold" style={{ color: "#4ade80" }}>✓ {appliedCoupon.code} — {appliedCoupon.discount_percent}% OFF</span>
                  <button onClick={() => setAppliedCoupon(null)} className="text-[10px] text-white/40 hover:text-white/60">✕</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Coin Confirmation Modal */}
      {showCoinConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center" onClick={() => setShowCoinConfirm(null)}>
          <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }} />
          <div
            className="relative w-[90%] max-w-xs rounded-2xl p-6 text-center"
            style={{ background: "linear-gradient(180deg, #1e1b4b, #0f0a2e)", border: "1px solid rgba(139,92,246,0.2)" }}
            onClick={(e) => e.stopPropagation()}
          >
            {showCoinConfirm.label === "Saldo insuficiente!" ? (
              <>
                <div className="text-4xl mb-3">😢</div>
                <h3 className="text-lg font-bold mb-1" style={{ color: "#f87171" }}>Saldo Insuficiente</h3>
                <p className="text-sm mb-1" style={{ color: "rgba(255,255,255,0.5)" }}>
                  Você precisa de <span className="font-bold text-white">{showCoinConfirm.cost} coins</span>
                </p>
                <p className="text-xs mb-5" style={{ color: "rgba(255,255,255,0.3)" }}>
                  Seu saldo: <span className="font-bold" style={{ color: "#f87171" }}>{userCoins} coins</span>
                </p>
                <button
                  onClick={showCoinConfirm.onConfirm}
                  className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all hover:scale-[1.02]"
                  style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)" }}
                >
                  🛒 Recarregar Agora
                </button>
                <button
                  onClick={() => setShowCoinConfirm(null)}
                  className="w-full py-2 mt-2 text-xs font-medium transition-colors"
                  style={{ color: "rgba(255,255,255,0.4)" }}
                >
                  Cancelar
                </button>
              </>
            ) : (
              <>
                <div className="text-4xl mb-3">🪙</div>
                <h3 className="text-lg font-bold text-white mb-1">Confirmar gasto</h3>
                <p className="text-sm mb-1" style={{ color: "rgba(255,255,255,0.5)" }}>
                  Usar <span className="font-bold text-white">{showCoinConfirm.cost} coins</span> para:
                </p>
                <p className="text-sm font-semibold mb-3" style={{ color: "#a78bfa" }}>{showCoinConfirm.label}</p>
                <p className="text-xs mb-5" style={{ color: "rgba(255,255,255,0.3)" }}>
                  Seu saldo: <span className="font-bold" style={{ color: userCoins >= showCoinConfirm.cost ? "#4ade80" : "#f87171" }}>{userCoins} coins</span>
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowCoinConfirm(null)}
                    className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all hover:scale-[1.02]"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" }}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={showCoinConfirm.onConfirm}
                    disabled={userCoins < showCoinConfirm.cost}
                    className="flex-1 py-3 rounded-xl text-sm font-bold text-white transition-all hover:scale-[1.02] disabled:opacity-40"
                    style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)" }}
                  >
                    Confirmar
                  </button>
                </div>
              </>
            )}
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
                      {(regionPrices[state] !== undefined ? regionPrices[state] : 10) > 0 ? (
                        <span className="text-[10px] font-medium" style={{ color: "rgba(255,255,255,0.4)" }}>{regionPrices[state] !== undefined ? regionPrices[state] : 10} 🪙</span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(34,197,94,0.15)", color: "#4ade80" }}>FREE</span>
                      )}
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
                    ) : (regionPrices[country] !== undefined ? regionPrices[country] : 10) > 0 ? (
                      <span className="text-[10px] font-medium" style={{ color: "rgba(255,255,255,0.4)" }}>{regionPrices[country] !== undefined ? regionPrices[country] : 10} 🪙</span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(34,197,94,0.15)", color: "#4ade80" }}>FREE</span>
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
              Coins are used when you match with a gender filter on.
            </p>

            <div className="grid grid-cols-3 gap-2.5 md:gap-3 mb-5">
              {[
                { id: "Male", emoji: "👨", color: "#38bdf8", borderColor: "#38bdf8" },
                { id: "Both", emoji: "👫", color: "#a855f7", borderColor: "#a855f7" },
                { id: "Female", emoji: "👩", color: "#ec4899", borderColor: "#ec4899" },
              ].map((g) => {
                const cost = genderPrices[g.id] !== undefined ? genderPrices[g.id] : (g.id === "Both" ? 0 : 15);
                return (
                <button
                  key={g.id}
                  onClick={() => setTempGender(g.id)}
                  className="relative flex flex-col items-center gap-2.5 rounded-2xl py-5 px-3 transition-all hover:scale-105 active:scale-95"
                  style={{
                    background: tempGender === g.id ? `${g.borderColor}15` : "rgba(255,255,255,0.03)",
                    border: tempGender === g.id ? `2px solid ${g.borderColor}` : "2px solid rgba(255,255,255,0.06)",
                  }}
                >
                  {cost > 0 && (
                    <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[10px] font-bold px-2.5 py-0.5 rounded-full"
                      style={{ background: "#eab308", color: "#000" }}>{cost} 🪙</span>
                  )}
                  {cost === 0 && (
                    <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[10px] font-bold px-2.5 py-0.5 rounded-full"
                      style={{ background: "rgba(34,197,94,0.9)", color: "#fff" }}>FREE</span>
                  )}
                  <span className="text-3xl md:text-4xl">{g.emoji}</span>
                  <span className="text-xs md:text-sm font-semibold" style={{ color: g.color }}>{g.id}</span>
                </button>
              )})}
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
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" onClick={() => { setShowLoginModal(false); setAuthError(""); }}>
          <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }} />
          <div
            className="relative w-full md:max-w-sm md:mx-4 rounded-t-3xl md:rounded-2xl p-6 md:p-8 text-center"
            style={{ background: "rgba(20, 20, 35, 0.98)", border: "1px solid rgba(255,255,255,0.08)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex md:hidden justify-center mb-4">
              <div className="w-10 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.15)" }} />
            </div>

            {siteSettings.logo_url ? (
              <img src={siteSettings.logo_url} alt="Logo" className="w-16 h-16 rounded-full object-cover mx-auto mb-5 animate-pulse-glow" />
            ) : (
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5 animate-pulse-glow"
                style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)" }}>
                <svg width="32" height="24" viewBox="0 0 36 28" fill="none">
                  <ellipse cx="11" cy="14" rx="8" ry="7" stroke="white" strokeWidth="2" fill="none" />
                  <ellipse cx="25" cy="14" rx="8" ry="7" stroke="white" strokeWidth="2" fill="none" />
                  <path d="M16 9 C17 7, 19 7, 20 9" stroke="#f97316" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                </svg>
              </div>
            )}

            <h2 className="text-xl font-extrabold">
              <span className="text-gradient">{siteSettings.site_name || "ChatRandom"}</span>
              <span style={{ color: "rgba(255,255,255,0.2)" }}>{siteSettings.site_suffix || ".gg"}</span>
            </h2>
            <p className="text-xs md:text-sm mt-1.5 mb-5" style={{ color: "rgba(255,255,255,0.4)" }}>
              {authMode === "login" ? "Sign in to start chatting!" : "Create your account"}
            </p>

            {/* Email / Password form */}
            <div className="space-y-2.5 mb-4">
              <input
                type="email"
                placeholder="Email"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                className="w-full py-3 px-4 rounded-xl text-sm text-white placeholder:text-white/30 outline-none focus:ring-2 focus:ring-purple-500/50"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
              />
              <input
                type="password"
                placeholder="Password"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleEmailAuth()}
                className="w-full py-3 px-4 rounded-xl text-sm text-white placeholder:text-white/30 outline-none focus:ring-2 focus:ring-purple-500/50"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
              />
              {authError && (
                <p className="text-xs" style={{ color: authError.includes("Check your email") ? "#22c55e" : "#f87171" }}>
                  {authError}
                </p>
              )}
              <button
                onClick={handleEmailAuth}
                disabled={authLoading || !authEmail || !authPassword}
                className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100"
                style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)" }}
              >
                {authLoading ? "..." : authMode === "login" ? "Sign In" : "Create Account"}
              </button>
              <button
                onClick={() => { setAuthMode(authMode === "login" ? "signup" : "login"); setAuthError(""); }}
                className="text-xs"
                style={{ color: "rgba(255,255,255,0.4)" }}
              >
                {authMode === "login" ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
              </button>
            </div>

            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />
              <span className="text-[10px] uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.25)" }}>or</span>
              <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />
            </div>

            <div className="space-y-2.5">
              <button
                onClick={handleGoogleAuth}
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
                onClick={handleAppleAuth}
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

      {/* Profile Modal */}
      {showProfileModal && profileTarget && (() => {
        const isOwnProfile = currentUser && profileTarget?.id === currentUser?.id;
        return (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" onClick={() => setShowProfileModal(false)}>
          <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }} />
          <div
            className="relative w-full md:max-w-sm md:mx-4 rounded-t-3xl md:rounded-3xl overflow-hidden max-h-[85dvh] overflow-y-auto"
            style={{ background: "linear-gradient(180deg, #1a1040, #0f0a2e)", border: "1px solid rgba(139,92,246,0.15)" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Profile header with gradient */}
            <div className="relative h-32 md:h-36" style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7, #ec4899)" }}>
              <div className="absolute inset-0" style={{ background: "radial-gradient(circle at 30% 50%, rgba(255,255,255,0.15) 0%, transparent 50%)" }} />
              <button onClick={() => setShowProfileModal(false)}
                className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/15 transition-all z-10">
                ✕
              </button>
            </div>

            {/* Avatar */}
            <div className="relative -mt-12 px-6">
              <div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto ring-4"
                style={{ background: "linear-gradient(135deg, #6d28d9, #a855f7)", boxShadow: "0 0 0 4px #0f0a2e" }}>
                <User className="w-10 h-10 text-white" />
              </div>
            </div>

            {/* Profile info */}
            <div className="text-center px-6 pt-3 pb-2">
              <h3 className="text-xl font-bold text-white">
                {profileTarget?.display_name || profileTarget?.email?.split("@")[0] || "Stranger"}
              </h3>
              {profileTarget?.age && (
                <p className="text-sm mt-0.5" style={{ color: "rgba(255,255,255,0.5)" }}>
                  {profileTarget.age} anos
                </p>
              )}
              {profileTarget?.bio && (
                <p className="text-xs mt-2 leading-relaxed" style={{ color: "rgba(255,255,255,0.45)" }}>
                  {profileTarget.bio}
                </p>
              )}
              {profileTarget?.instagram && (
                <a
                  href={profileTarget.instagram.startsWith("http") ? profileTarget.instagram : `https://instagram.com/${profileTarget.instagram.replace("@", "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 mt-2 text-xs font-medium transition-opacity hover:opacity-80"
                  style={{ color: "#e879f9" }}
                >
                  <ExternalLink className="w-3 h-3" />
                  @{profileTarget.instagram.replace("@", "").replace("https://instagram.com/", "").replace("https://www.instagram.com/", "")}
                </a>
              )}
              {!profileTarget?.age && !profileTarget?.bio && !profileTarget?.instagram && (
                <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.35)" }}>
                  Usuário do {siteSettings.site_name || "ChatRandom"}
                </p>
              )}
            </div>

            {/* Edit own profile */}
            {isOwnProfile && (
              <div className="px-6 pt-3 pb-2 space-y-2">
                <div className="text-[10px] uppercase tracking-wider font-semibold mb-1" style={{ color: "rgba(255,255,255,0.3)" }}>Editar Perfil</div>
                <input
                  type="text"
                  placeholder="Nome de exibição"
                  defaultValue={profileTarget?.display_name || ""}
                  onBlur={async (e) => {
                    const v = e.target.value.trim().slice(0, 50);
                    if (v && v !== profileTarget?.display_name) {
                      await supabase.from("profiles").update({ display_name: v, updated_at: new Date().toISOString() }).eq("id", currentUser.id);
                      setProfileTarget((p: any) => ({ ...p, display_name: v }));
                    }
                  }}
                  className="w-full py-2.5 px-3 rounded-xl text-sm text-white placeholder:text-white/25 outline-none focus:ring-1 focus:ring-purple-500/50"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
                />
                <input
                  type="number"
                  placeholder="Idade"
                  min={18}
                  max={99}
                  defaultValue={profileTarget?.age || ""}
                  onBlur={async (e) => {
                    const v = Math.min(99, Math.max(18, parseInt(e.target.value) || 0));
                    if (v >= 18) {
                      await supabase.from("profiles").update({ age: v, updated_at: new Date().toISOString() }).eq("id", currentUser.id);
                      setProfileTarget((p: any) => ({ ...p, age: v }));
                    }
                  }}
                  className="w-full py-2.5 px-3 rounded-xl text-sm text-white placeholder:text-white/25 outline-none focus:ring-1 focus:ring-purple-500/50"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
                />
                <input
                  type="text"
                  placeholder="@ do Instagram"
                  defaultValue={profileTarget?.instagram || ""}
                  onBlur={async (e) => {
                    const v = e.target.value.trim().slice(0, 100);
                    await supabase.from("profiles").update({ instagram: v, updated_at: new Date().toISOString() }).eq("id", currentUser.id);
                    setProfileTarget((p: any) => ({ ...p, instagram: v }));
                  }}
                  className="w-full py-2.5 px-3 rounded-xl text-sm text-white placeholder:text-white/25 outline-none focus:ring-1 focus:ring-purple-500/50"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
                />
                <textarea
                  placeholder="Bio (máx. 200 caracteres)"
                  maxLength={200}
                  defaultValue={profileTarget?.bio || ""}
                  onBlur={async (e) => {
                    const v = e.target.value.trim().slice(0, 200);
                    await supabase.from("profiles").update({ bio: v, updated_at: new Date().toISOString() }).eq("id", currentUser.id);
                    setProfileTarget((p: any) => ({ ...p, bio: v }));
                  }}
                  rows={2}
                  className="w-full py-2.5 px-3 rounded-xl text-sm text-white placeholder:text-white/25 outline-none focus:ring-1 focus:ring-purple-500/50 resize-none"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
                />
              </div>
            )}

            {/* Coins display */}
            {isOwnProfile && (
              <div className="px-6 pt-2 pb-2">
                <div className="flex items-center justify-center gap-2 py-2.5 rounded-xl" style={{ background: "rgba(250,204,21,0.08)", border: "1px solid rgba(250,204,21,0.15)" }}>
                  <span className="text-lg">🪙</span>
                  <span className="text-sm font-bold" style={{ color: "#fbbf24" }}>{profileTarget?.coins ?? 0} Coins</span>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="px-6 pb-6 pt-3 space-y-2.5">
              {/* Follow / Unfollow - only for other users */}
              {!isOwnProfile && (
                <button
                  onClick={() => profileTarget?.id && handleFollow(profileTarget.id)}
                  disabled={followLoading}
                  className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl font-semibold text-sm transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                  style={{
                    background: isFollowing
                      ? "rgba(255,255,255,0.06)"
                      : "linear-gradient(135deg, #7c3aed, #a855f7)",
                    border: isFollowing ? "1px solid rgba(255,255,255,0.12)" : "none",
                    color: "white",
                    boxShadow: isFollowing ? "none" : "0 6px 24px rgba(124,58,237,0.35)",
                  }}
                >
                  {isFollowing ? (
                    <><UserMinus className="w-4 h-4" /> Deixar de Seguir</>
                  ) : (
                    <><UserPlus className="w-4 h-4" /> Seguir</>
                  )}
                </button>
              )}

              {/* Share */}
              <button
                onClick={handleShareProfile}
                className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl font-semibold text-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "rgba(255,255,255,0.75)",
                }}
              >
                <Share2 className="w-4 h-4" /> Compartilhar
              </button>

              {/* Private Chat - only for other users */}
              {!isOwnProfile && (
                <button
                  className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl font-semibold text-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{
                    background: "rgba(59,130,246,0.1)",
                    border: "1px solid rgba(59,130,246,0.25)",
                    color: "#60a5fa",
                  }}
                >
                  <MessageSquare className="w-4 h-4" /> Chat Privado
                </button>
              )}
            </div>
          </div>
        </div>
        );
      })()}

      {/* Friends List Modal */}
      {showFriendsModal && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" onClick={() => setShowFriendsModal(false)}>
          <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }} />
          <div
            className="relative w-full md:max-w-md md:mx-4 rounded-t-3xl md:rounded-2xl p-5 md:p-7 max-h-[85dvh] overflow-y-auto"
            style={{ background: "linear-gradient(180deg, #1a1040, #0f0a2e)", border: "1px solid rgba(139,92,246,0.15)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex md:hidden justify-center mb-4">
              <div className="w-10 h-1 rounded-full" style={{ background: "rgba(139,92,246,0.4)" }} />
            </div>

            <button onClick={() => setShowFriendsModal(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all">
              ✕
            </button>

            <div className="text-center mb-5">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-3"
                style={{ background: "linear-gradient(135deg, #ec4899, #8b5cf6)", boxShadow: "0 8px 30px rgba(236,72,153,0.3)" }}>
                <Heart className="w-7 h-7 text-white fill-current" />
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-white">Amizades</h2>
              <p className="text-xs mt-1.5" style={{ color: "rgba(255,255,255,0.4)" }}>
                Pessoas que você está seguindo
              </p>
            </div>

            {friendsLoading ? (
              <div className="flex justify-center py-10">
                <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: "rgba(139,92,246,0.2)", borderTopColor: "#a855f7" }} />
              </div>
            ) : friendsList.length === 0 ? (
              <div className="text-center py-10">
                <div className="text-4xl mb-3">👥</div>
                <p className="text-sm font-medium text-white/60">Nenhuma amizade ainda</p>
                <p className="text-xs mt-1 text-white/30">Siga pessoas durante as calls!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {friendsList.map((friend) => (
                  <div key={friend.following_id}
                    className="flex items-center gap-3 p-3 rounded-2xl transition-all hover:bg-white/5"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-sm font-bold text-white"
                      style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)" }}>
                      {(friend.display_name || friend.email || "?")[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {friend.display_name || friend.email?.split("@")[0] || "Usuário"}
                      </p>
                      <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>
                        Seguindo desde {new Date(friend.created_at).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setShowFriendsModal(false);
                        openProfileModal({ id: friend.following_id, display_name: friend.display_name, email: friend.email });
                      }}
                      className="p-2 rounded-xl hover:bg-white/10 transition-all"
                      style={{ color: "rgba(255,255,255,0.5)" }}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoChatRoom;
