import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import {
  Users, Search, ArrowLeft, Coins, Mail, Lock, Trash2, Plus, Minus, X,
  Shield, Settings, Upload, ShoppingBag, Edit2, GripVertical, ToggleLeft, ToggleRight,
  ChevronLeft, Menu, Tag, Copy, Calendar,
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

interface ShopPackage {
  id: string;
  coins: number;
  bonus: number;
  price_cents: number;
  currency: string;
  sort_order: number;
  active: boolean;
}

interface Coupon {
  id: string;
  code: string;
  discount_percent: number;
  max_uses: number | null;
  used_count: number;
  active: boolean;
  expires_at: string | null;
  created_at: string;
}

const SETTING_LABELS: Record<string, { label: string; placeholder: string; type?: string }> = {
  site_name: { label: "Nome do Site", placeholder: "ChatRandom" },
  site_suffix: { label: "Sufixo", placeholder: ".gg" },
  logo_url: { label: "Logo", placeholder: "https://...", type: "image" },
  favicon_url: { label: "Favicon", placeholder: "https://...", type: "image" },
  facebook_url: { label: "Facebook", placeholder: "https://facebook.com/..." },
  discord_url: { label: "Discord", placeholder: "https://discord.gg/..." },
  twitter_url: { label: "Twitter / X", placeholder: "https://x.com/..." },
  instagram_url: { label: "Instagram", placeholder: "https://instagram.com/..." },
  tiktok_url: { label: "TikTok", placeholder: "https://tiktok.com/@..." },
  shop_enabled: { label: "Shop Ativo", placeholder: "true" },
  shop_title: { label: "Título Shop", placeholder: "Shop" },
  shop_description: { label: "Descrição Shop", placeholder: "Higher tiers..." },
};

const NAV_ITEMS = [
  { id: "users" as const, label: "Usuários", icon: Users },
  { id: "settings" as const, label: "Configurações", icon: Settings },
  { id: "shop" as const, label: "Shop / Planos", icon: ShoppingBag },
  { id: "coupons" as const, label: "Cupons", icon: Tag },
];

type TabId = "users" | "settings" | "shop" | "coupons";



const AdminPanel = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [editModal, setEditModal] = useState<"email" | "password" | "coins" | "delete" | null>(null);
  const [editValue, setEditValue] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("users");
  const [settings, setSettings] = useState<SiteSetting[]>([]);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsDirty, setSettingsDirty] = useState<Record<string, string>>({});
  const [savingSettings, setSavingSettings] = useState(false);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [packages, setPackages] = useState<ShopPackage[]>([]);
  const [packagesLoading, setPackagesLoading] = useState(false);
  const [editingPkg, setEditingPkg] = useState<ShopPackage | null>(null);
  const [pkgForm, setPkgForm] = useState({ coins: 0, bonus: 0, price_cents: 0, sort_order: 0 });
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [couponsLoading, setCouponsLoading] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [couponForm, setCouponForm] = useState({ code: "", discount_percent: 10, max_uses: "", expires_at: "" });
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

  const fetchPackages = useCallback(async () => {
    setPackagesLoading(true);
    const { data } = await supabase.from("shop_packages").select("*").order("sort_order");
    if (data) setPackages(data as ShopPackage[]);
    setPackagesLoading(false);
  }, []);

  useEffect(() => {
    checkAdmin().then(() => { fetchUsers(); fetchSettings(); fetchPackages(); });
  }, [checkAdmin, fetchUsers, fetchSettings, fetchPackages]);

  // User actions
  const handleAction = async (action: string, params: Record<string, unknown>) => {
    setActionLoading(true);
    try {
      const res = await supabase.functions.invoke("admin-actions", { body: { action, ...params } });
      if (res.error) throw new Error(res.error.message);
      toast({ title: "Sucesso!" });
      setEditModal(null); setSelectedUser(null); setEditValue("");
      fetchUsers();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally { setActionLoading(false); }
  };

  // Settings
  const getSettingValue = (key: string) => settingsDirty[key] !== undefined ? settingsDirty[key] : (settings.find(s => s.key === key)?.value || "");
  const updateSettingLocal = (key: string, value: string) => setSettingsDirty(prev => ({ ...prev, [key]: value }));

  const saveSettings = async () => {
    setSavingSettings(true);
    try {
      for (const [key, value] of Object.entries(settingsDirty)) {
        const existing = settings.find(s => s.key === key);
        if (existing) await supabase.from("site_settings").update({ value, updated_at: new Date().toISOString() }).eq("key", key);
        else await supabase.from("site_settings").insert({ key, value });
      }
      toast({ title: "Configurações salvas!" });
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

  // Packages
  const savePkg = async () => {
    try {
      if (editingPkg?.id) {
        await supabase.from("shop_packages").update({
          coins: pkgForm.coins,
          bonus: pkgForm.bonus,
          price_cents: pkgForm.price_cents,
          sort_order: pkgForm.sort_order,
          updated_at: new Date().toISOString(),
        }).eq("id", editingPkg.id);
      } else {
        await supabase.from("shop_packages").insert({
          coins: pkgForm.coins,
          bonus: pkgForm.bonus,
          price_cents: pkgForm.price_cents,
          sort_order: pkgForm.sort_order,
        });
      }
      toast({ title: "Pacote salvo!" });
      setEditingPkg(null);
      fetchPackages();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const togglePkgActive = async (pkg: ShopPackage) => {
    await supabase.from("shop_packages").update({ active: !pkg.active }).eq("id", pkg.id);
    fetchPackages();
  };

  const deletePkg = async (id: string) => {
    await supabase.from("shop_packages").delete().eq("id", id);
    fetchPackages();
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
    <div className="min-h-screen flex" style={{ background: "#0a0a0f" }}>
      {/* Sidebar */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-40 h-screen flex flex-col transition-all duration-300 ${sidebarOpen ? "w-56" : "w-0 md:w-16"}`}
        style={{ background: "rgba(15,15,25,0.98)", borderRight: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className={`flex items-center gap-2.5 p-4 ${sidebarOpen ? "" : "md:justify-center md:px-2"}`}>
          {sidebarOpen && (
            <>
              <Shield className="w-5 h-5 shrink-0" style={{ color: "#7c3aed" }} />
              <span className="text-sm font-bold text-white whitespace-nowrap">Admin Panel</span>
            </>
          )}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="ml-auto p-1.5 rounded-lg hover:bg-white/5 transition-colors">
            {sidebarOpen ? <ChevronLeft className="w-4 h-4" style={{ color: "rgba(255,255,255,0.4)" }} /> : <Menu className="w-4 h-4" style={{ color: "rgba(255,255,255,0.4)" }} />}
          </button>
        </div>

        <nav className="flex-1 px-2 space-y-1">
          {NAV_ITEMS.map(item => {
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => { setActiveTab(item.id); if (window.innerWidth < 768) setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${active ? "text-white" : "hover:bg-white/5"}`}
                style={active ? { background: "rgba(124,58,237,0.2)", color: "white" } : { color: "rgba(255,255,255,0.5)" }}
              >
                <item.icon className="w-4.5 h-4.5 shrink-0" />
                {sidebarOpen && <span className="whitespace-nowrap">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        <div className="p-3">
          <button onClick={() => navigate("/")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors hover:bg-white/5 ${sidebarOpen ? "" : "justify-center"}`}
            style={{ color: "rgba(255,255,255,0.4)" }}>
            <ArrowLeft className="w-4 h-4 shrink-0" />
            {sidebarOpen && <span>Voltar ao Site</span>}
          </button>
        </div>
      </aside>

      {/* Overlay mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/50 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main content */}
      <main className={`flex-1 min-h-screen transition-all duration-300 ${sidebarOpen ? "md:ml-0" : "md:ml-0"}`}>
        {/* Top bar */}
        <div className="sticky top-0 z-20 px-4 py-3 md:px-6 md:py-4 flex items-center gap-3"
          style={{ background: "rgba(10,10,15,0.95)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <button onClick={() => setSidebarOpen(true)} className="md:hidden p-2 rounded-lg hover:bg-white/5">
            <Menu className="w-5 h-5" style={{ color: "rgba(255,255,255,0.6)" }} />
          </button>
          <h1 className="text-base md:text-lg font-bold text-white">
            {activeTab === "users" && "Usuários"}
            {activeTab === "settings" && "Configurações"}
            {activeTab === "shop" && "Shop / Planos"}
          </h1>
          {activeTab === "users" && (
            <span className="ml-auto text-xs px-2.5 py-1 rounded-full" style={{ background: "rgba(124,58,237,0.15)", color: "#a78bfa" }}>
              {users.length} total
            </span>
          )}
        </div>

        <div className="p-4 md:p-6 max-w-5xl">
          {/* =================== USERS TAB =================== */}
          {activeTab === "users" && (
            <>
              <div className="relative max-w-md mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "rgba(255,255,255,0.3)" }} />
                <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por email ou nome..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-purple-500/40"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "white" }} />
              </div>

              {loading ? <Spinner /> : filteredUsers.length === 0 ? (
                <EmptyState icon={Users} text="Nenhum usuário encontrado" />
              ) : (
                <div className="space-y-2">
                  {filteredUsers.map((user) => (
                    <div key={user.id} className="rounded-xl p-4 flex flex-col md:flex-row md:items-center gap-3 group transition-all hover:border-purple-500/20"
                      style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-xs font-bold text-white"
                          style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)" }}>
                          {(user.display_name || user.email || "?")[0].toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-white truncate">{user.display_name || "Sem nome"}</span>
                            {user.role === "admin" && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "rgba(124,58,237,0.2)", color: "#a78bfa" }}>ADMIN</span>
                            )}
                          </div>
                          <p className="text-xs truncate" style={{ color: "rgba(255,255,255,0.35)" }}>{user.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 md:gap-4">
                        <span className="text-xs font-medium" style={{ color: "#eab308" }}>🪙 {user.coins}</span>
                        <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.2)" }}>{new Date(user.created_at).toLocaleDateString("pt-BR")}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {([
                          { modal: "email" as const, icon: Mail, label: "Email" },
                          { modal: "password" as const, icon: Lock, label: "Senha" },
                          { modal: "coins" as const, icon: Coins, label: "Coins" },
                          { modal: "delete" as const, icon: Trash2, label: "" },
                        ]).map(btn => (
                          <button key={btn.modal}
                            onClick={() => { setSelectedUser(user); setEditModal(btn.modal); setEditValue(btn.modal === "email" ? (user.email || "") : btn.modal === "coins" ? "0" : ""); }}
                            className={`p-2 rounded-lg text-xs transition-all hover:scale-105 ${btn.modal === "delete" ? "hover:bg-red-500/10" : "hover:bg-white/5"}`}
                            style={{ color: btn.modal === "delete" ? "#ef4444" : btn.modal === "coins" ? "#eab308" : "rgba(255,255,255,0.45)" }}
                            title={btn.label || "Excluir"}>
                            <btn.icon className="w-3.5 h-3.5" />
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* =================== SETTINGS TAB =================== */}
          {activeTab === "settings" && (
            <>
              {settingsLoading ? <Spinner /> : (
                <div className="space-y-5">
                  <SettingsSection title="🏷️ Identidade" keys={["site_name", "site_suffix"]} getValue={getSettingValue} onChange={updateSettingLocal} />
                  <SettingsSection title="🖼️ Imagens" keys={["logo_url", "favicon_url"]} getValue={getSettingValue} onChange={updateSettingLocal} onUpload={handleImageUpload} uploadingKey={uploadingKey} />
                  <SettingsSection title="🌐 Redes Sociais" keys={["facebook_url", "discord_url", "twitter_url", "instagram_url", "tiktok_url"]} getValue={getSettingValue} onChange={updateSettingLocal} />
                  <SettingsSection title="🛒 Shop" keys={["shop_enabled", "shop_title", "shop_description"]} getValue={getSettingValue} onChange={updateSettingLocal} />

                  {Object.keys(settingsDirty).length > 0 && (
                    <button onClick={saveSettings} disabled={savingSettings}
                      className="w-full py-3 rounded-xl font-semibold text-white text-sm disabled:opacity-50 transition-all hover:scale-[1.01] active:scale-[0.99]"
                      style={{ background: "linear-gradient(135deg, #7c3aed, #9333ea)" }}>
                      {savingSettings ? "Salvando..." : "💾 Salvar Configurações"}
                    </button>
                  )}
                </div>
              )}
            </>
          )}

          {/* =================== SHOP TAB =================== */}
          {activeTab === "shop" && (
            <>
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Gerencie os pacotes de moedas que aparecem no shop.</p>
                <button onClick={() => { setEditingPkg({} as ShopPackage); setPkgForm({ coins: 500, bonus: 0, price_cents: 399, sort_order: packages.length + 1 }); }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white transition-all hover:scale-105"
                  style={{ background: "linear-gradient(135deg, #7c3aed, #9333ea)" }}>
                  <Plus className="w-3.5 h-3.5" /> Novo Pacote
                </button>
              </div>

              {packagesLoading ? <Spinner /> : packages.length === 0 ? (
                <EmptyState icon={ShoppingBag} text="Nenhum pacote criado" />
              ) : (
                <div className="space-y-2">
                  {packages.map(pkg => (
                    <div key={pkg.id}
                      className={`rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3 transition-all ${pkg.active ? "" : "opacity-50"}`}
                      style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                      <div className="flex items-center gap-3 flex-1">
                        <div className="text-2xl">🪙</div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-white">{pkg.coins.toLocaleString()} coins</span>
                            {pkg.bonus > 0 && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "rgba(34,197,94,0.15)", color: "#22c55e" }}>
                                +{pkg.bonus.toLocaleString()}
                              </span>
                            )}
                          </div>
                          <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                            ${(pkg.price_cents / 100).toFixed(2)} • Ordem: {pkg.sort_order}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => togglePkgActive(pkg)} className="p-2 rounded-lg hover:bg-white/5 transition-colors"
                          title={pkg.active ? "Desativar" : "Ativar"}>
                          {pkg.active ? <ToggleRight className="w-4 h-4" style={{ color: "#22c55e" }} /> : <ToggleLeft className="w-4 h-4" style={{ color: "rgba(255,255,255,0.3)" }} />}
                        </button>
                        <button onClick={() => { setEditingPkg(pkg); setPkgForm({ coins: pkg.coins, bonus: pkg.bonus, price_cents: pkg.price_cents, sort_order: pkg.sort_order }); }}
                          className="p-2 rounded-lg hover:bg-white/5 transition-colors" title="Editar">
                          <Edit2 className="w-3.5 h-3.5" style={{ color: "rgba(255,255,255,0.45)" }} />
                        </button>
                        <button onClick={() => deletePkg(pkg.id)} className="p-2 rounded-lg hover:bg-red-500/10 transition-colors" title="Excluir">
                          <Trash2 className="w-3.5 h-3.5" style={{ color: "#ef4444" }} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* =================== USER EDIT MODAL =================== */}
      {editModal && selectedUser && (
        <Modal onClose={() => { setEditModal(null); setSelectedUser(null); }}>
          <h2 className="text-lg font-bold text-white mb-1">
            {editModal === "email" && "Alterar Email"}
            {editModal === "password" && "Alterar Senha"}
            {editModal === "coins" && "Gerenciar Coins"}
            {editModal === "delete" && "Excluir Usuário"}
          </h2>
          <p className="text-xs mb-4" style={{ color: "rgba(255,255,255,0.35)" }}>
            {selectedUser.display_name} ({selectedUser.email})
          </p>

          {editModal === "email" && (
            <div className="space-y-3">
              <AdminInput value={editValue} onChange={setEditValue} placeholder="Novo email..." type="email" />
              <PrimaryBtn onClick={() => handleAction("update_email", { userId: selectedUser.id, newEmail: editValue })}
                disabled={actionLoading || !editValue} loading={actionLoading} text="Salvar Email" />
            </div>
          )}
          {editModal === "password" && (
            <div className="space-y-3">
              <AdminInput value={editValue} onChange={setEditValue} placeholder="Nova senha (mín. 6)..." />
              <PrimaryBtn onClick={() => handleAction("update_password", { userId: selectedUser.id, newPassword: editValue })}
                disabled={actionLoading || editValue.length < 6} loading={actionLoading} text="Salvar Senha" />
            </div>
          )}
          {editModal === "coins" && (
            <div className="space-y-3">
              <div className="text-center py-2">
                <span className="text-2xl font-bold" style={{ color: "#eab308" }}>🪙 {selectedUser.coins}</span>
              </div>
              <AdminInput value={editValue} onChange={setEditValue} placeholder="Quantidade..." type="number" />
              <div className="flex gap-2">
                <button onClick={() => handleAction("update_coins", { userId: selectedUser.id, amount: parseInt(editValue) || 0 })}
                  disabled={actionLoading || !editValue || parseInt(editValue) === 0}
                  className="flex-1 py-2.5 rounded-xl font-semibold text-white text-sm flex items-center justify-center gap-1.5 disabled:opacity-50 transition-all hover:scale-[1.02]"
                  style={{ background: "#22c55e" }}>
                  <Plus className="w-4 h-4" /> Add
                </button>
                <button onClick={() => handleAction("update_coins", { userId: selectedUser.id, amount: -(parseInt(editValue) || 0) })}
                  disabled={actionLoading || !editValue || parseInt(editValue) === 0}
                  className="flex-1 py-2.5 rounded-xl font-semibold text-white text-sm flex items-center justify-center gap-1.5 disabled:opacity-50 transition-all hover:scale-[1.02]"
                  style={{ background: "#ef4444" }}>
                  <Minus className="w-4 h-4" /> Remove
                </button>
              </div>
            </div>
          )}
          {editModal === "delete" && (
            <div className="space-y-3">
              <div className="p-3 rounded-xl" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)" }}>
                <p className="text-sm text-white font-medium">⚠️ Ação irreversível</p>
                <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>Todos os dados serão excluídos permanentemente.</p>
              </div>
              <button onClick={() => handleAction("delete_user", { userId: selectedUser.id })} disabled={actionLoading}
                className="w-full py-2.5 rounded-xl font-semibold text-white text-sm disabled:opacity-50" style={{ background: "#ef4444" }}>
                {actionLoading ? "Excluindo..." : "Confirmar Exclusão"}
              </button>
            </div>
          )}
        </Modal>
      )}

      {/* =================== PACKAGE EDIT MODAL =================== */}
      {editingPkg && (
        <Modal onClose={() => setEditingPkg(null)}>
          <h2 className="text-lg font-bold text-white mb-4">{editingPkg.id ? "Editar Pacote" : "Novo Pacote"}</h2>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: "rgba(255,255,255,0.45)" }}>Coins</label>
              <AdminInput value={String(pkgForm.coins)} onChange={v => setPkgForm(p => ({ ...p, coins: parseInt(v) || 0 }))} type="number" placeholder="500" />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: "rgba(255,255,255,0.45)" }}>Bônus</label>
              <AdminInput value={String(pkgForm.bonus)} onChange={v => setPkgForm(p => ({ ...p, bonus: parseInt(v) || 0 }))} type="number" placeholder="0" />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: "rgba(255,255,255,0.45)" }}>Preço (centavos USD)</label>
              <AdminInput value={String(pkgForm.price_cents)} onChange={v => setPkgForm(p => ({ ...p, price_cents: parseInt(v) || 0 }))} type="number" placeholder="399" />
              <p className="text-[10px] mt-1" style={{ color: "rgba(255,255,255,0.3)" }}>Valor: ${(pkgForm.price_cents / 100).toFixed(2)}</p>
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: "rgba(255,255,255,0.45)" }}>Ordem</label>
              <AdminInput value={String(pkgForm.sort_order)} onChange={v => setPkgForm(p => ({ ...p, sort_order: parseInt(v) || 0 }))} type="number" placeholder="1" />
            </div>
            <PrimaryBtn onClick={savePkg} text="💾 Salvar Pacote" />
          </div>
        </Modal>
      )}
    </div>
  );
};

/* =================== SUB COMPONENTS =================== */

const Spinner = () => (
  <div className="flex items-center justify-center py-16">
    <div className="animate-spin w-7 h-7 border-2 rounded-full" style={{ borderColor: "rgba(124,58,237,0.15)", borderTopColor: "#7c3aed" }} />
  </div>
);

const EmptyState = ({ icon: Icon, text }: { icon: any; text: string }) => (
  <div className="text-center py-16">
    <Icon className="w-10 h-10 mx-auto mb-2" style={{ color: "rgba(255,255,255,0.1)" }} />
    <p className="text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>{text}</p>
  </div>
);

const Modal = ({ children, onClose }: { children: React.ReactNode; onClose: () => void }) => (
  <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" onClick={onClose}>
    <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }} />
    <div className="relative w-full md:max-w-md md:mx-4 rounded-t-2xl md:rounded-2xl p-5 md:p-6"
      style={{ background: "#14142a", border: "1px solid rgba(255,255,255,0.08)" }}
      onClick={e => e.stopPropagation()}>
      <div className="flex md:hidden justify-center mb-3">
        <div className="w-10 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.12)" }} />
      </div>
      <button onClick={onClose} className="absolute top-4 right-4">
        <X className="w-4 h-4" style={{ color: "rgba(255,255,255,0.3)" }} />
      </button>
      {children}
    </div>
  </div>
);

const AdminInput = ({ value, onChange, placeholder, type = "text" }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) => (
  <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
    className="w-full px-3.5 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-purple-500/40"
    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "white" }} />
);

const PrimaryBtn = ({ onClick, disabled, loading, text }: { onClick: () => void; disabled?: boolean; loading?: boolean; text: string }) => (
  <button onClick={onClick} disabled={disabled || loading}
    className="w-full py-2.5 rounded-xl font-semibold text-white text-sm disabled:opacity-50 transition-all hover:scale-[1.01] active:scale-[0.99]"
    style={{ background: "linear-gradient(135deg, #7c3aed, #9333ea)" }}>
    {loading ? "..." : text}
  </button>
);

const SettingsSection = ({ title, keys, getValue, onChange, onUpload, uploadingKey }: {
  title: string; keys: string[];
  getValue: (k: string) => string; onChange: (k: string, v: string) => void;
  onUpload?: (k: string, f: File) => void; uploadingKey?: string | null;
}) => (
  <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
    <h3 className="text-sm font-semibold text-white mb-3">{title}</h3>
    <div className="space-y-3">
      {keys.map(key => {
        const meta = SETTING_LABELS[key] || { label: key, placeholder: "" };
        const isImage = meta.type === "image";
        const val = getValue(key);
        return (
          <div key={key}>
            <label className="text-[11px] font-medium mb-1 block" style={{ color: "rgba(255,255,255,0.4)" }}>{meta.label}</label>
            <div className="flex gap-2">
              <input value={val} onChange={e => onChange(key, e.target.value)} placeholder={meta.placeholder}
                className="flex-1 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-purple-500/40"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "white" }} />
              {isImage && onUpload && (
                <label className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium cursor-pointer hover:bg-white/5 transition-colors"
                  style={{ border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}>
                  <Upload className="w-3 h-3" />
                  {uploadingKey === key ? "..." : "Upload"}
                  <input type="file" accept="image/*" className="hidden" onChange={e => { if (e.target.files?.[0]) onUpload(key, e.target.files[0]); }} />
                </label>
              )}
            </div>
            {isImage && val && <img src={val} alt="" className="mt-2 h-8 rounded object-contain" style={{ background: "rgba(255,255,255,0.03)" }} />}
          </div>
        );
      })}
    </div>
  </div>
);

export default AdminPanel;
