import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import {
  Users, Search, ArrowLeft, Coins, Mail, Lock, Trash2, Plus, Minus, X,
  Shield, Settings, Upload, Globe, MessageSquare, Image,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface UserProfile {
  id: string;
  email: string;
  display_name: string;
  coins: number;
  created_at: string;
  role: string;
}

interface SiteSetting {
  id: string;
  key: string;
  value: string;
}

const SETTING_LABELS: Record<string, { label: string; placeholder: string; type?: string }> = {
  site_name: { label: "Nome do Site", placeholder: "ChatRandom" },
  site_suffix: { label: "Sufixo do Site", placeholder: ".gg" },
  logo_url: { label: "Logo URL (ou faça upload)", placeholder: "https://...", type: "image" },
  favicon_url: { label: "Favicon / Ícone", placeholder: "https://...", type: "image" },
  facebook_url: { label: "Facebook URL", placeholder: "https://facebook.com/..." },
  discord_url: { label: "Discord URL", placeholder: "https://discord.gg/..." },
  twitter_url: { label: "Twitter / X URL", placeholder: "https://x.com/..." },
  instagram_url: { label: "Instagram URL", placeholder: "https://instagram.com/..." },
  tiktok_url: { label: "TikTok URL", placeholder: "https://tiktok.com/@..." },
  shop_enabled: { label: "Shop Ativado", placeholder: "true ou false" },
  shop_title: { label: "Título do Shop", placeholder: "Shop" },
  shop_description: { label: "Descrição do Shop", placeholder: "Higher tiers give you more bonus coins!" },
};

const AdminPanel = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [editModal, setEditModal] = useState<"email" | "password" | "coins" | "delete" | null>(null);
  const [editValue, setEditValue] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"users" | "settings">("users");
  const [settings, setSettings] = useState<SiteSetting[]>([]);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsDirty, setSettingsDirty] = useState<Record<string, string>>({});
  const [savingSettings, setSavingSettings] = useState(false);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const checkAdmin = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/"); return; }
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").single();
    if (!data) { navigate("/"); return; }
    setIsAdmin(true);
  }, [navigate]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("get_all_users");
    if (!error && data) setUsers(data as UserProfile[]);
    setLoading(false);
  }, []);

  const fetchSettings = useCallback(async () => {
    setSettingsLoading(true);
    const { data } = await supabase.from("site_settings").select("*");
    if (data) setSettings(data as SiteSetting[]);
    setSettingsLoading(false);
  }, []);

  useEffect(() => {
    checkAdmin().then(() => { fetchUsers(); fetchSettings(); });
  }, [checkAdmin, fetchUsers, fetchSettings]);

  const handleAction = async (action: string, params: Record<string, unknown>) => {
    setActionLoading(true);
    try {
      const res = await supabase.functions.invoke("admin-actions", { body: { action, ...params } });
      if (res.error) throw new Error(res.error.message);
      toast({ title: "Sucesso", description: "Ação executada com sucesso!" });
      setEditModal(null); setSelectedUser(null); setEditValue("");
      fetchUsers();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally { setActionLoading(false); }
  };

  const getSettingValue = (key: string) => {
    if (settingsDirty[key] !== undefined) return settingsDirty[key];
    return settings.find(s => s.key === key)?.value || "";
  };

  const updateSettingLocal = (key: string, value: string) => {
    setSettingsDirty(prev => ({ ...prev, [key]: value }));
  };

  const saveSettings = async () => {
    setSavingSettings(true);
    try {
      for (const [key, value] of Object.entries(settingsDirty)) {
        const existing = settings.find(s => s.key === key);
        if (existing) {
          await supabase.from("site_settings").update({ value, updated_at: new Date().toISOString() }).eq("key", key);
        } else {
          await supabase.from("site_settings").insert({ key, value });
        }
      }
      toast({ title: "Sucesso", description: "Configurações salvas!" });
      setSettingsDirty({});
      fetchSettings();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally { setSavingSettings(false); }
  };

  const handleImageUpload = async (key: string, file: File) => {
    setUploadingKey(key);
    try {
      const ext = file.name.split(".").pop();
      const path = `${key}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("site-assets").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("site-assets").getPublicUrl(path);
      updateSettingLocal(key, urlData.publicUrl);
      toast({ title: "Upload concluído!" });
    } catch (err: any) {
      toast({ title: "Erro no upload", description: err.message, variant: "destructive" });
    } finally { setUploadingKey(null); }
  };

  const filteredUsers = users.filter(u =>
    u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.display_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isAdmin) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ background: "#0a0a0f" }}>
        <div className="animate-spin w-8 h-8 border-2 rounded-full" style={{ borderColor: "rgba(124,58,237,0.2)", borderTopColor: "#7c3aed" }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "#0a0a0f" }}>
      {/* Header */}
      <div className="sticky top-0 z-10 px-4 py-3 md:px-6 md:py-4 flex items-center gap-3"
        style={{ background: "rgba(10,10,15,0.95)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <button onClick={() => navigate("/")} className="p-2 rounded-lg transition-colors hover:bg-white/5">
          <ArrowLeft className="w-5 h-5" style={{ color: "rgba(255,255,255,0.6)" }} />
        </button>
        <Shield className="w-5 h-5" style={{ color: "#7c3aed" }} />
        <h1 className="text-lg font-bold text-white">Admin Panel</h1>
        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={() => setActiveTab("users")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${activeTab === "users" ? "text-white" : ""}`}
            style={activeTab === "users" ? { background: "#7c3aed" } : { color: "rgba(255,255,255,0.5)" }}
          >
            <Users className="w-4 h-4 inline mr-1" />Usuários
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${activeTab === "settings" ? "text-white" : ""}`}
            style={activeTab === "settings" ? { background: "#7c3aed" } : { color: "rgba(255,255,255,0.5)" }}
          >
            <Settings className="w-4 h-4 inline mr-1" />Config
          </button>
        </div>
      </div>

      {activeTab === "users" && (
        <>
          {/* Search */}
          <div className="px-4 py-3 md:px-6">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "rgba(255,255,255,0.3)" }} />
              <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por email ou nome..." className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm focus:outline-none"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "white" }} />
            </div>
          </div>

          {/* Users List */}
          <div className="px-4 md:px-6 pb-6">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin w-8 h-8 border-2 rounded-full" style={{ borderColor: "rgba(124,58,237,0.2)", borderTopColor: "#7c3aed" }} />
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-20">
                <Users className="w-12 h-12 mx-auto mb-3" style={{ color: "rgba(255,255,255,0.15)" }} />
                <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>Nenhum usuário encontrado</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredUsers.map((user) => (
                  <div key={user.id} className="rounded-xl p-4 flex flex-col md:flex-row md:items-center gap-3 transition-colors"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-white truncate">{user.display_name || "Sem nome"}</span>
                        {user.role === "admin" && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: "#7c3aed", color: "white" }}>ADMIN</span>
                        )}
                      </div>
                      <p className="text-xs truncate" style={{ color: "rgba(255,255,255,0.4)" }}>{user.email}</p>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="flex items-center gap-1 text-xs" style={{ color: "#eab308" }}>🪙 {user.coins} coins</span>
                        <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.25)" }}>{new Date(user.created_at).toLocaleDateString("pt-BR")}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button onClick={() => { setSelectedUser(user); setEditModal("email"); setEditValue(user.email || ""); }}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-white/10"
                        style={{ color: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.1)" }}>
                        <Mail className="w-3 h-3" /> Email
                      </button>
                      <button onClick={() => { setSelectedUser(user); setEditModal("password"); setEditValue(""); }}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-white/10"
                        style={{ color: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.1)" }}>
                        <Lock className="w-3 h-3" /> Senha
                      </button>
                      <button onClick={() => { setSelectedUser(user); setEditModal("coins"); setEditValue("0"); }}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-white/10"
                        style={{ color: "#eab308", border: "1px solid rgba(234,179,8,0.3)" }}>
                        <Coins className="w-3 h-3" /> Coins
                      </button>
                      <button onClick={() => { setSelectedUser(user); setEditModal("delete"); }}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-red-500/20"
                        style={{ color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)" }}>
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === "settings" && (
        <div className="px-4 md:px-6 py-4 pb-8 max-w-2xl">
          <h2 className="text-base font-bold text-white mb-1">Configurações do Site</h2>
          <p className="text-xs mb-5" style={{ color: "rgba(255,255,255,0.4)" }}>Altere nome, ícone, redes sociais e configurações do shop.</p>

          {settingsLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin w-8 h-8 border-2 rounded-full" style={{ borderColor: "rgba(124,58,237,0.2)", borderTopColor: "#7c3aed" }} />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Grouped sections */}
              <Section title="🏷️ Identidade">
                {["site_name", "site_suffix"].map(key => (
                  <SettingField key={key} settingKey={key} value={getSettingValue(key)} onChange={updateSettingLocal} />
                ))}
              </Section>

              <Section title="🖼️ Imagens">
                {["logo_url", "favicon_url"].map(key => (
                  <SettingField key={key} settingKey={key} value={getSettingValue(key)} onChange={updateSettingLocal}
                    onUpload={handleImageUpload} uploading={uploadingKey === key} />
                ))}
              </Section>

              <Section title="🌐 Redes Sociais">
                {["facebook_url", "discord_url", "twitter_url", "instagram_url", "tiktok_url"].map(key => (
                  <SettingField key={key} settingKey={key} value={getSettingValue(key)} onChange={updateSettingLocal} />
                ))}
              </Section>

              <Section title="🛒 Shop">
                {["shop_enabled", "shop_title", "shop_description"].map(key => (
                  <SettingField key={key} settingKey={key} value={getSettingValue(key)} onChange={updateSettingLocal} />
                ))}
              </Section>

              {Object.keys(settingsDirty).length > 0 && (
                <button onClick={saveSettings} disabled={savingSettings}
                  className="w-full py-3 rounded-xl font-semibold text-white text-sm disabled:opacity-50 transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{ background: "linear-gradient(135deg, #7c3aed, #9333ea)" }}>
                  {savingSettings ? "Salvando..." : "💾 Salvar Configurações"}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Edit Modal */}
      {editModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" onClick={() => { setEditModal(null); setSelectedUser(null); }}>
          <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.6)" }} />
          <div className="relative w-full md:max-w-md md:mx-4 rounded-t-2xl md:rounded-2xl p-5 md:p-6"
            style={{ background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.1)" }}
            onClick={(e) => e.stopPropagation()}>
            <div className="flex md:hidden justify-center mb-4">
              <div className="w-10 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.2)" }} />
            </div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">
                {editModal === "email" && "Alterar Email"}
                {editModal === "password" && "Alterar Senha"}
                {editModal === "coins" && "Gerenciar Coins"}
                {editModal === "delete" && "Excluir Usuário"}
              </h2>
              <button onClick={() => { setEditModal(null); setSelectedUser(null); }}>
                <X className="w-5 h-5" style={{ color: "rgba(255,255,255,0.4)" }} />
              </button>
            </div>
            <p className="text-xs mb-4" style={{ color: "rgba(255,255,255,0.4)" }}>
              Usuário: {selectedUser.display_name} ({selectedUser.email})
            </p>

            {editModal === "email" && (
              <div className="space-y-4">
                <input type="email" value={editValue} onChange={(e) => setEditValue(e.target.value)} placeholder="Novo email..."
                  className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "white" }} />
                <button onClick={() => handleAction("update_email", { userId: selectedUser.id, newEmail: editValue })}
                  disabled={actionLoading || !editValue}
                  className="w-full py-3 rounded-xl font-semibold text-white text-sm disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg, #7c3aed, #9333ea)" }}>
                  {actionLoading ? "Salvando..." : "Salvar Email"}
                </button>
              </div>
            )}

            {editModal === "password" && (
              <div className="space-y-4">
                <input type="text" value={editValue} onChange={(e) => setEditValue(e.target.value)} placeholder="Nova senha (mín. 6 caracteres)..."
                  className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "white" }} />
                <button onClick={() => handleAction("update_password", { userId: selectedUser.id, newPassword: editValue })}
                  disabled={actionLoading || editValue.length < 6}
                  className="w-full py-3 rounded-xl font-semibold text-white text-sm disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg, #7c3aed, #9333ea)" }}>
                  {actionLoading ? "Salvando..." : "Salvar Senha"}
                </button>
              </div>
            )}

            {editModal === "coins" && (
              <div className="space-y-4">
                <div className="text-center mb-2">
                  <span className="text-2xl font-bold" style={{ color: "#eab308" }}>🪙 {selectedUser.coins}</span>
                  <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>Coins atuais</p>
                </div>
                <input type="number" value={editValue} onChange={(e) => setEditValue(e.target.value)} placeholder="Quantidade..."
                  className="w-full px-4 py-3 rounded-xl text-sm text-center focus:outline-none"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "white" }} />
                <div className="flex gap-2">
                  <button onClick={() => handleAction("update_coins", { userId: selectedUser.id, amount: parseInt(editValue) || 0 })}
                    disabled={actionLoading || !editValue || parseInt(editValue) === 0}
                    className="flex-1 py-3 rounded-xl font-semibold text-white text-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
                    style={{ background: "#22c55e" }}>
                    <Plus className="w-4 h-4" /> Adicionar
                  </button>
                  <button onClick={() => handleAction("update_coins", { userId: selectedUser.id, amount: -(parseInt(editValue) || 0) })}
                    disabled={actionLoading || !editValue || parseInt(editValue) === 0}
                    className="flex-1 py-3 rounded-xl font-semibold text-white text-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
                    style={{ background: "#ef4444" }}>
                    <Minus className="w-4 h-4" /> Remover
                  </button>
                </div>
              </div>
            )}

            {editModal === "delete" && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
                  <p className="text-sm text-white font-medium mb-1">⚠️ Ação irreversível</p>
                  <p className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>Isso irá excluir permanentemente o usuário e todos os seus dados.</p>
                </div>
                <button onClick={() => handleAction("delete_user", { userId: selectedUser.id })} disabled={actionLoading}
                  className="w-full py-3 rounded-xl font-semibold text-white text-sm disabled:opacity-50" style={{ background: "#ef4444" }}>
                  {actionLoading ? "Excluindo..." : "Confirmar Exclusão"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Helper components
const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
    <h3 className="text-sm font-semibold text-white mb-3">{title}</h3>
    <div className="space-y-3">{children}</div>
  </div>
);

const SettingField = ({ settingKey, value, onChange, onUpload, uploading }: {
  settingKey: string; value: string;
  onChange: (key: string, val: string) => void;
  onUpload?: (key: string, file: File) => void;
  uploading?: boolean;
}) => {
  const meta = SETTING_LABELS[settingKey] || { label: settingKey, placeholder: "" };
  const isImage = meta.type === "image";

  return (
    <div>
      <label className="text-xs font-medium mb-1 block" style={{ color: "rgba(255,255,255,0.5)" }}>{meta.label}</label>
      <div className="flex gap-2">
        <input
          value={value}
          onChange={(e) => onChange(settingKey, e.target.value)}
          placeholder={meta.placeholder}
          className="flex-1 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-purple-500/50"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "white" }}
        />
        {isImage && onUpload && (
          <label className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium cursor-pointer transition-colors hover:bg-white/10"
            style={{ border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" }}>
            <Upload className="w-3 h-3" />
            {uploading ? "..." : "Upload"}
            <input type="file" accept="image/*" className="hidden" onChange={(e) => { if (e.target.files?.[0]) onUpload(settingKey, e.target.files[0]); }} />
          </label>
        )}
      </div>
      {isImage && value && (
        <img src={value} alt="" className="mt-2 h-10 rounded object-contain" style={{ background: "rgba(255,255,255,0.05)" }} />
      )}
    </div>
  );
};

export default AdminPanel;
