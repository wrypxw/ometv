import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { UserPlus, UserMinus, ArrowLeft, ExternalLink, Share2, User } from "lucide-react";

const Profile = () => {
  const { id: rawId } = useParams<{ id: string }>();
  const [resolvedId, setResolvedId] = useState<string | null>(null);
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUser(session?.user ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setCurrentUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!rawId) return;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const decoded = decodeURIComponent(rawId);
    if (uuidRegex.test(decoded)) {
      setResolvedId(decoded);
    } else {
      supabase.from("profiles").select("id").ilike("display_name", decoded).maybeSingle().then(({ data }) => {
        setResolvedId(data?.id ?? null);
      });
    }
  }, [rawId]);

  useEffect(() => {
    if (!resolvedId) { if (rawId && resolvedId === null) { setLoading(false); } return; }
    const fetchProfile = async () => {
      setLoading(true);
      const { data } = await supabase.from("profiles").select("*").eq("id", resolvedId).single();
      setProfile(data);
      setLoading(false);
    };
    fetchProfile();
  }, [resolvedId]);

  useEffect(() => {
    if (!currentUser || !resolvedId || currentUser.id === resolvedId) return;
    supabase.from("follows").select("id").eq("follower_id", currentUser.id).eq("following_id", resolvedId).maybeSingle().then(({ data }) => {
      setIsFollowing(!!data);
    });
  }, [currentUser, resolvedId]);

  const handleFollow = useCallback(async () => {
    if (!currentUser || !resolvedId) return;
    setFollowLoading(true);
    if (isFollowing) {
      await supabase.from("follows").delete().eq("follower_id", currentUser.id).eq("following_id", resolvedId);
      setIsFollowing(false);
    } else {
      await supabase.from("follows").insert({ follower_id: currentUser.id, following_id: resolvedId });
      setIsFollowing(true);
    }
    setFollowLoading(false);
  }, [currentUser, resolvedId, isFollowing]);

  const [copied, setCopied] = useState(false);

  const handleShare = useCallback(async () => {
    const displayName = profile?.display_name;
    const slug = displayName ? encodeURIComponent(displayName) : resolvedId;
    const url = slug ? `${window.location.origin}/profile/${slug}` : window.location.origin;
    try {
      if (navigator.share) {
        await navigator.share({ title: displayName || "Perfil", text: "Confira este perfil!", url });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } else {
        // Fallback for older browsers
        const input = document.createElement("input");
        input.value = url;
        document.body.appendChild(input);
        input.select();
        document.execCommand("copy");
        document.body.removeChild(input);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // User cancelled share or copy failed - try fallback
      try {
        const input = document.createElement("input");
        input.value = url;
        document.body.appendChild(input);
        input.select();
        document.execCommand("copy");
        document.body.removeChild(input);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch { /* ignore */ }
    }
  }, [profile, resolvedId]);

  const handleSaveField = useCallback(async (field: string, value: any) => {
    if (!currentUser || !resolvedId || currentUser.id !== resolvedId) return;
    await supabase.from("profiles").update({ [field]: value, updated_at: new Date().toISOString() }).eq("id", currentUser.id);
    setProfile((p: any) => ({ ...p, [field]: value }));
  }, [currentUser, resolvedId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0a0a14" }}>
        <div className="w-10 h-10 rounded-full border-[3px] animate-spin" style={{ borderColor: "rgba(124,58,237,0.15)", borderTopColor: "#a855f7" }} />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: "#0a0a14" }}>
        <p className="text-white text-lg font-semibold">Perfil não encontrado</p>
        <button onClick={() => navigate("/")} className="px-6 py-2.5 rounded-xl font-medium text-white text-sm" style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)" }}>
          Voltar ao Chat
        </button>
      </div>
    );
  }

  const isOwnProfile = currentUser?.id === resolvedId;
  const instagramHandle = profile.instagram ? profile.instagram.replace("@", "").replace("https://instagram.com/", "").replace("https://www.instagram.com/", "") : null;
  const instagramUrl = profile.instagram ? (profile.instagram.startsWith("http") ? profile.instagram : `https://instagram.com/${profile.instagram.replace("@", "")}`) : null;

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "#0a0a14" }}>
      <div className="w-full max-w-sm rounded-3xl overflow-hidden" style={{ background: "linear-gradient(180deg, #1a1040, #0f0a2e)", border: "1px solid rgba(139,92,246,0.15)" }}>
        {/* Gradient header */}
        <div className="relative h-32" style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7, #ec4899)" }}>
          <div className="absolute inset-0" style={{ background: "radial-gradient(circle at 30% 50%, rgba(255,255,255,0.15) 0%, transparent 50%)" }} />
          <button onClick={() => navigate("/")}
            className="absolute top-3 left-3 w-8 h-8 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/15 transition-all z-10">
            <ArrowLeft className="w-4 h-4" />
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
            {profile.display_name || "Anônimo"}
          </h3>
          {(profile.age || profile.gender) && (
            <p className="text-sm mt-0.5" style={{ color: "rgba(255,255,255,0.5)" }}>
              {profile.gender === "male" ? "♂ Homem" : profile.gender === "female" ? "♀ Mulher" : profile.gender === "other" ? "⚧ Outro" : ""}
              {profile.age && profile.gender ? " · " : ""}
              {profile.age ? `${profile.age} anos` : ""}
            </p>
          )}
          {profile.bio && (
            <p className="text-xs mt-2 leading-relaxed" style={{ color: "rgba(255,255,255,0.45)" }}>
              {profile.bio}
            </p>
          )}
          {instagramHandle && (
            <a href={instagramUrl!} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 mt-2 text-xs font-medium transition-opacity hover:opacity-80"
              style={{ color: "#e879f9" }}>
              <ExternalLink className="w-3 h-3" />
              @{instagramHandle}
            </a>
          )}
          {!profile.age && !profile.bio && !instagramHandle && (
            <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.35)" }}>
              Usuário do ChatRandom
            </p>
          )}
        </div>

        {/* Edit own profile */}
        {isOwnProfile && (
          <div className="px-6 pt-3 pb-2 space-y-2">
            <div className="text-[10px] uppercase tracking-wider font-semibold mb-1" style={{ color: "rgba(255,255,255,0.3)" }}>Editar Perfil</div>
            <input type="text" placeholder="Nome de exibição" defaultValue={profile.display_name || ""}
              onBlur={(e) => { const v = e.target.value.trim().slice(0, 50); if (v) handleSaveField("display_name", v); }}
              className="w-full py-2.5 px-3 rounded-xl text-sm text-white placeholder:text-white/25 outline-none focus:ring-1 focus:ring-purple-500/50"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }} />
            <input type="number" placeholder="Idade" min={18} max={99} defaultValue={profile.age || ""}
              onBlur={(e) => { const v = Math.min(99, Math.max(18, parseInt(e.target.value) || 0)); if (v >= 18) handleSaveField("age", v); }}
              className="w-full py-2.5 px-3 rounded-xl text-sm text-white placeholder:text-white/25 outline-none focus:ring-1 focus:ring-purple-500/50"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }} />
            <div className="flex items-center rounded-xl overflow-hidden" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <span className="pl-3 text-sm select-none whitespace-nowrap" style={{ color: "rgba(255,255,255,0.4)" }}>instagram.com/</span>
              <input type="text" placeholder="seu.usuario"
                defaultValue={(profile.instagram || "").replace("@", "").replace("https://instagram.com/", "").replace("https://www.instagram.com/", "")}
                onBlur={(e) => {
                  const v = e.target.value.trim().replace("@", "").replace("https://instagram.com/", "").replace("https://www.instagram.com/", "").slice(0, 30);
                  handleSaveField("instagram", v);
                }}
                className="flex-1 py-2.5 px-1 pr-3 text-sm text-white placeholder:text-white/25 outline-none bg-transparent"
              />
            </div>
            <textarea placeholder="Bio (máx. 200 caracteres)" maxLength={200} defaultValue={profile.bio || ""}
              onBlur={(e) => handleSaveField("bio", e.target.value.trim().slice(0, 200))}
              rows={2}
              className="w-full py-2.5 px-3 rounded-xl text-sm text-white placeholder:text-white/25 outline-none focus:ring-1 focus:ring-purple-500/50 resize-none"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }} />
          </div>
        )}

        {/* Coins display for own profile */}
        {isOwnProfile && (
          <div className="px-6 pt-2 pb-2">
            <div className="flex items-center justify-center gap-2 py-2.5 rounded-xl" style={{ background: "rgba(250,204,21,0.08)", border: "1px solid rgba(250,204,21,0.15)" }}>
              <span className="text-lg">🪙</span>
              <span className="text-sm font-bold" style={{ color: "#fbbf24" }}>{profile.coins ?? 0} Coins</span>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="px-6 pb-6 pt-3 space-y-2.5">
          {/* Follow / Unfollow */}
          {currentUser && !isOwnProfile && (
            <button onClick={handleFollow} disabled={followLoading}
              className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl font-semibold text-sm transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
              style={{
                background: isFollowing ? "rgba(255,255,255,0.06)" : "linear-gradient(135deg, #7c3aed, #a855f7)",
                border: isFollowing ? "1px solid rgba(255,255,255,0.12)" : "none",
                color: "white",
                boxShadow: isFollowing ? "none" : "0 6px 24px rgba(124,58,237,0.35)",
              }}>
              {isFollowing ? <><UserMinus className="w-4 h-4" /> Deixar de Seguir</> : <><UserPlus className="w-4 h-4" /> Seguir</>}
            </button>
          )}

          {!currentUser && !isOwnProfile && (
            <button onClick={() => navigate("/")}
              className="w-full py-3.5 rounded-2xl font-semibold text-sm text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)" }}>
              Faça login para seguir
            </button>
          )}

          {/* Share */}
          <button onClick={handleShare}
            className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl font-semibold text-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.75)" }}>
            <Share2 className="w-4 h-4" /> {copied ? "Link copiado! ✓" : "Compartilhar"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Profile;
