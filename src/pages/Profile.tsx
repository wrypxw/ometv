import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { UserPlus, UserMinus, ArrowLeft, ExternalLink } from "lucide-react";

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

  // Resolve rawId: if it's a UUID use directly, otherwise treat as display_name lookup
  useEffect(() => {
    if (!rawId) return;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(rawId)) {
      setResolvedId(rawId);
    } else {
      // Lookup by display_name (case-insensitive)
      supabase.from("profiles").select("id").ilike("display_name", rawId).maybeSingle().then(({ data }) => {
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
    if (!currentUser || !id || currentUser.id === id) return;
    supabase.from("follows").select("id").eq("follower_id", currentUser.id).eq("following_id", id).maybeSingle().then(({ data }) => {
      setIsFollowing(!!data);
    });
  }, [currentUser, id]);

  const handleFollow = useCallback(async () => {
    if (!currentUser || !id) return;
    setFollowLoading(true);
    if (isFollowing) {
      await supabase.from("follows").delete().eq("follower_id", currentUser.id).eq("following_id", id);
      setIsFollowing(false);
    } else {
      await supabase.from("follows").insert({ follower_id: currentUser.id, following_id: id });
      setIsFollowing(true);
    }
    setFollowLoading(false);
  }, [currentUser, id, isFollowing]);

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

  const isOwnProfile = currentUser?.id === id;
  const instagramUrl = profile.instagram ? (profile.instagram.startsWith("http") ? profile.instagram : `https://instagram.com/${profile.instagram.replace("@", "")}`) : null;

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "#0a0a14" }}>
      <div className="w-full max-w-sm rounded-3xl p-6 space-y-5" style={{ background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.08)" }}>
        {/* Back button */}
        <button onClick={() => navigate("/")} className="flex items-center gap-2 text-sm transition-all hover:opacity-80" style={{ color: "rgba(255,255,255,0.5)" }}>
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>

        {/* Avatar */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold" style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)", color: "white" }}>
            {(profile.display_name || "?")[0]?.toUpperCase()}
          </div>
          <div className="text-center">
            <h2 className="text-xl font-bold text-white">{profile.display_name || "Anônimo"}</h2>
            {profile.age && <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>{profile.age} anos</p>}
          </div>
        </div>

        {/* Bio */}
        {profile.bio && (
          <p className="text-center text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.6)" }}>
            {profile.bio}
          </p>
        )}

        {/* Instagram */}
        {instagramUrl && (
          <a href={instagramUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl text-sm font-semibold text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{ background: "linear-gradient(135deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)" }}>
            <ExternalLink className="w-4 h-4" />
            Instagram
          </a>
        )}

        {/* Follow button */}
        {currentUser && !isOwnProfile && (
          <button
            onClick={handleFollow}
            disabled={followLoading}
            className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl font-semibold text-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: isFollowing ? "rgba(239,68,68,0.1)" : "linear-gradient(135deg, #7c3aed, #a855f7)",
              border: isFollowing ? "1px solid rgba(239,68,68,0.3)" : "none",
              color: isFollowing ? "#f87171" : "white",
            }}
          >
            {isFollowing ? <><UserMinus className="w-4 h-4" /> Deixar de seguir</> : <><UserPlus className="w-4 h-4" /> Seguir</>}
          </button>
        )}

        {!currentUser && !isOwnProfile && (
          <button
            onClick={() => navigate("/")}
            className="w-full py-3.5 rounded-2xl font-semibold text-sm text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)" }}
          >
            Faça login para seguir
          </button>
        )}
      </div>
    </div>
  );
};

export default Profile;
