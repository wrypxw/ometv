import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import {
  Users, Search, ArrowLeft, Coins, Mail, Lock, Trash2, Plus, Minus, X,
  Shield, Settings, Upload, ShoppingBag, Edit2, GripVertical, ToggleLeft, ToggleRight,
  ChevronLeft, Menu, Tag, Copy, Calendar, CreditCard, Eye, EyeOff, CheckCircle, Clock, XCircle, AlertCircle,
  Globe, MapPin, UserCheck, Gift,
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

interface RegionCoinPrice {
  id: string;
  region_type: string;
  region_code: string;
  region_name: string;
  parent_code: string | null;
  coin_cost: number;
  active: boolean;
}

interface GenderCoinPrice {
  id: string;
  gender_key: string;
  gender_label: string;
  coin_cost: number;
  active: boolean;
}

const NAV_ITEMS = [
  { id: "users" as const, label: "Usuários", icon: Users },
  { id: "settings" as const, label: "Configurações", icon: Settings },
  { id: "shop" as const, label: "Shop / Planos", icon: ShoppingBag },
  { id: "coupons" as const, label: "Cupons", icon: Tag },
  { id: "payments" as const, label: "Pagamentos", icon: CreditCard },
  { id: "regions" as const, label: "Regiões", icon: Globe },
  { id: "genders" as const, label: "Gênero", icon: UserCheck },
];

type TabId = "users" | "settings" | "shop" | "coupons" | "payments" | "regions" | "genders";

interface PaymentTransaction {
  id: string;
  user_id: string;
  amount_cents: number;
  currency: string;
  coins_amount: number;
  bonus_amount: number;
  coupon_code: string | null;
  discount_percent: number;
  mp_preference_id: string | null;
  mp_payment_id: string | null;
  status: string;
  created_at: string;
}



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
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [txLoading, setTxLoading] = useState(false);
  const [mpTokenVisible, setMpTokenVisible] = useState(false);
  const [regions, setRegions] = useState<RegionCoinPrice[]>([]);
  const [regionsLoading, setRegionsLoading] = useState(false);
  const [editingRegion, setEditingRegion] = useState<RegionCoinPrice | null>(null);
  const [regionForm, setRegionForm] = useState({ region_type: "country", region_code: "", region_name: "", parent_code: "", coin_cost: 10 });
  const [regionSearch, setRegionSearch] = useState("");
  const [populatingRegions, setPopulatingRegions] = useState(false);
  const [genders, setGenders] = useState<GenderCoinPrice[]>([]);
  const [gendersLoading, setGendersLoading] = useState(false);
  const [editingGender, setEditingGender] = useState<GenderCoinPrice | null>(null);
  const [genderForm, setGenderForm] = useState({ gender_key: "", gender_label: "", coin_cost: 0 });
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

  const fetchCoupons = useCallback(async () => {
    setCouponsLoading(true);
    const { data } = await supabase.from("coupons").select("*").order("created_at", { ascending: false });
    if (data) setCoupons(data as Coupon[]);
    setCouponsLoading(false);
  }, []);

  const fetchTransactions = useCallback(async () => {
    setTxLoading(true);
    const { data } = await supabase.from("payment_transactions").select("*").order("created_at", { ascending: false }).limit(100);
    if (data) setTransactions(data as PaymentTransaction[]);
    setTxLoading(false);
  }, []);

  const fetchRegions = useCallback(async () => {
    setRegionsLoading(true);
    const { data } = await supabase.from("region_coin_prices").select("*").order("region_type").order("region_name");
    if (data) setRegions(data as RegionCoinPrice[]);
    setRegionsLoading(false);
  }, []);

  const fetchGenders = useCallback(async () => {
    setGendersLoading(true);
    const { data } = await supabase.from("gender_coin_prices").select("*").order("gender_key");
    if (data) setGenders(data as GenderCoinPrice[]);
    setGendersLoading(false);
  }, []);

  useEffect(() => {
    checkAdmin().then(() => { fetchUsers(); fetchSettings(); fetchPackages(); fetchCoupons(); fetchTransactions(); fetchRegions(); fetchGenders(); });
  }, [checkAdmin, fetchUsers, fetchSettings, fetchPackages, fetchCoupons, fetchTransactions, fetchRegions, fetchGenders]);

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

  // Coupons
  const saveCoupon = async () => {
    try {
      const payload: any = {
        code: couponForm.code.toUpperCase().trim(),
        discount_percent: couponForm.discount_percent,
        max_uses: couponForm.max_uses ? parseInt(couponForm.max_uses) : null,
        expires_at: couponForm.expires_at || null,
      };
      if (editingCoupon?.id) {
        await supabase.from("coupons").update(payload).eq("id", editingCoupon.id);
      } else {
        await supabase.from("coupons").insert(payload);
      }
      toast({ title: "Cupom salvo!" });
      setEditingCoupon(null);
      fetchCoupons();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const toggleCouponActive = async (c: Coupon) => {
    await supabase.from("coupons").update({ active: !c.active }).eq("id", c.id);
    fetchCoupons();
  };

  const deleteCoupon = async (id: string) => {
    await supabase.from("coupons").delete().eq("id", id);
    fetchCoupons();
  };

  // Regions
  const saveRegion = async () => {
    try {
      const payload = {
        region_type: regionForm.region_type,
        region_code: regionForm.region_code.toUpperCase().trim(),
        region_name: regionForm.region_name.trim(),
        parent_code: regionForm.parent_code ? regionForm.parent_code.toUpperCase().trim() : null,
        coin_cost: regionForm.coin_cost,
        updated_at: new Date().toISOString(),
      };
      if (editingRegion?.id) {
        await supabase.from("region_coin_prices").update(payload).eq("id", editingRegion.id);
      } else {
        await supabase.from("region_coin_prices").insert(payload);
      }
      toast({ title: "Região salva!" });
      setEditingRegion(null);
      fetchRegions();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const toggleRegionActive = async (r: RegionCoinPrice) => {
    await supabase.from("region_coin_prices").update({ active: !r.active }).eq("id", r.id);
    fetchRegions();
  };

  const deleteRegion = async (id: string) => {
    await supabase.from("region_coin_prices").delete().eq("id", id);
    fetchRegions();
  };


  const populateAllRegions = async () => {
    setPopulatingRegions(true);
    try {
      const allCountries = [
        { code: "AF", name: "Afghanistan" }, { code: "AL", name: "Albania" }, { code: "DZ", name: "Algeria" },
        { code: "AD", name: "Andorra" }, { code: "AO", name: "Angola" }, { code: "AG", name: "Antigua and Barbuda" },
        { code: "AR", name: "Argentina" }, { code: "AM", name: "Armenia" }, { code: "AU", name: "Australia" },
        { code: "AT", name: "Austria" }, { code: "AZ", name: "Azerbaijan" }, { code: "BS", name: "Bahamas" },
        { code: "BH", name: "Bahrain" }, { code: "BD", name: "Bangladesh" }, { code: "BB", name: "Barbados" },
        { code: "BY", name: "Belarus" }, { code: "BE", name: "Belgium" }, { code: "BZ", name: "Belize" },
        { code: "BJ", name: "Benin" }, { code: "BT", name: "Bhutan" }, { code: "BO", name: "Bolivia" },
        { code: "BA", name: "Bosnia and Herzegovina" }, { code: "BW", name: "Botswana" }, { code: "BR", name: "Brazil" },
        { code: "BN", name: "Brunei" }, { code: "BG", name: "Bulgaria" }, { code: "BF", name: "Burkina Faso" },
        { code: "BI", name: "Burundi" }, { code: "CV", name: "Cabo Verde" }, { code: "KH", name: "Cambodia" },
        { code: "CM", name: "Cameroon" }, { code: "CA", name: "Canada" }, { code: "CF", name: "Central African Republic" },
        { code: "TD", name: "Chad" }, { code: "CL", name: "Chile" }, { code: "CN", name: "China" },
        { code: "CO", name: "Colombia" }, { code: "KM", name: "Comoros" }, { code: "CG", name: "Congo" },
        { code: "CR", name: "Costa Rica" }, { code: "HR", name: "Croatia" }, { code: "CU", name: "Cuba" },
        { code: "CY", name: "Cyprus" }, { code: "CZ", name: "Czech Republic" }, { code: "DK", name: "Denmark" },
        { code: "DJ", name: "Djibouti" }, { code: "DM", name: "Dominica" }, { code: "DO", name: "Dominican Republic" },
        { code: "TL", name: "East Timor" }, { code: "EC", name: "Ecuador" }, { code: "EG", name: "Egypt" },
        { code: "SV", name: "El Salvador" }, { code: "GQ", name: "Equatorial Guinea" }, { code: "ER", name: "Eritrea" },
        { code: "EE", name: "Estonia" }, { code: "SZ", name: "Eswatini" }, { code: "ET", name: "Ethiopia" },
        { code: "FJ", name: "Fiji" }, { code: "FI", name: "Finland" }, { code: "FR", name: "France" },
        { code: "GA", name: "Gabon" }, { code: "GM", name: "Gambia" }, { code: "GE", name: "Georgia" },
        { code: "DE", name: "Germany" }, { code: "GH", name: "Ghana" }, { code: "GR", name: "Greece" },
        { code: "GD", name: "Grenada" }, { code: "GT", name: "Guatemala" }, { code: "GN", name: "Guinea" },
        { code: "GW", name: "Guinea-Bissau" }, { code: "GY", name: "Guyana" }, { code: "HT", name: "Haiti" },
        { code: "HN", name: "Honduras" }, { code: "HU", name: "Hungary" }, { code: "IS", name: "Iceland" },
        { code: "IN", name: "India" }, { code: "ID", name: "Indonesia" }, { code: "IR", name: "Iran" },
        { code: "IQ", name: "Iraq" }, { code: "IE", name: "Ireland" }, { code: "IL", name: "Israel" },
        { code: "IT", name: "Italy" }, { code: "JM", name: "Jamaica" }, { code: "JP", name: "Japan" },
        { code: "JO", name: "Jordan" }, { code: "KZ", name: "Kazakhstan" }, { code: "KE", name: "Kenya" },
        { code: "KI", name: "Kiribati" }, { code: "XK", name: "Kosovo" }, { code: "KW", name: "Kuwait" },
        { code: "KG", name: "Kyrgyzstan" }, { code: "LA", name: "Laos" }, { code: "LV", name: "Latvia" },
        { code: "LB", name: "Lebanon" }, { code: "LS", name: "Lesotho" }, { code: "LR", name: "Liberia" },
        { code: "LY", name: "Libya" }, { code: "LI", name: "Liechtenstein" }, { code: "LT", name: "Lithuania" },
        { code: "LU", name: "Luxembourg" }, { code: "MG", name: "Madagascar" }, { code: "MW", name: "Malawi" },
        { code: "MY", name: "Malaysia" }, { code: "MV", name: "Maldives" }, { code: "ML", name: "Mali" },
        { code: "MT", name: "Malta" }, { code: "MH", name: "Marshall Islands" }, { code: "MR", name: "Mauritania" },
        { code: "MU", name: "Mauritius" }, { code: "MX", name: "Mexico" }, { code: "FM", name: "Micronesia" },
        { code: "MD", name: "Moldova" }, { code: "MC", name: "Monaco" }, { code: "MN", name: "Mongolia" },
        { code: "ME", name: "Montenegro" }, { code: "MA", name: "Morocco" }, { code: "MZ", name: "Mozambique" },
        { code: "MM", name: "Myanmar" }, { code: "NA", name: "Namibia" }, { code: "NR", name: "Nauru" },
        { code: "NP", name: "Nepal" }, { code: "NL", name: "Netherlands" }, { code: "NZ", name: "New Zealand" },
        { code: "NI", name: "Nicaragua" }, { code: "NE", name: "Niger" }, { code: "NG", name: "Nigeria" },
        { code: "KP", name: "North Korea" }, { code: "MK", name: "North Macedonia" }, { code: "NO", name: "Norway" },
        { code: "OM", name: "Oman" }, { code: "PK", name: "Pakistan" }, { code: "PW", name: "Palau" },
        { code: "PS", name: "Palestine" }, { code: "PA", name: "Panama" }, { code: "PG", name: "Papua New Guinea" },
        { code: "PY", name: "Paraguay" }, { code: "PE", name: "Peru" }, { code: "PH", name: "Philippines" },
        { code: "PL", name: "Poland" }, { code: "PT", name: "Portugal" }, { code: "QA", name: "Qatar" },
        { code: "RO", name: "Romania" }, { code: "RU", name: "Russia" }, { code: "RW", name: "Rwanda" },
        { code: "KN", name: "Saint Kitts and Nevis" }, { code: "LC", name: "Saint Lucia" },
        { code: "VC", name: "Saint Vincent and the Grenadines" }, { code: "WS", name: "Samoa" },
        { code: "SM", name: "San Marino" }, { code: "ST", name: "Sao Tome and Principe" },
        { code: "SA", name: "Saudi Arabia" }, { code: "SN", name: "Senegal" }, { code: "RS", name: "Serbia" },
        { code: "SC", name: "Seychelles" }, { code: "SL", name: "Sierra Leone" }, { code: "SG", name: "Singapore" },
        { code: "SK", name: "Slovakia" }, { code: "SI", name: "Slovenia" }, { code: "SB", name: "Solomon Islands" },
        { code: "SO", name: "Somalia" }, { code: "ZA", name: "South Africa" }, { code: "KR", name: "South Korea" },
        { code: "SS", name: "South Sudan" }, { code: "ES", name: "Spain" }, { code: "LK", name: "Sri Lanka" },
        { code: "SD", name: "Sudan" }, { code: "SR", name: "Suriname" }, { code: "SE", name: "Sweden" },
        { code: "CH", name: "Switzerland" }, { code: "SY", name: "Syria" }, { code: "TW", name: "Taiwan" },
        { code: "TJ", name: "Tajikistan" }, { code: "TZ", name: "Tanzania" }, { code: "TH", name: "Thailand" },
        { code: "TG", name: "Togo" }, { code: "TO", name: "Tonga" }, { code: "TT", name: "Trinidad and Tobago" },
        { code: "TN", name: "Tunisia" }, { code: "TR", name: "Turkey" }, { code: "TM", name: "Turkmenistan" },
        { code: "TV", name: "Tuvalu" }, { code: "UG", name: "Uganda" }, { code: "UA", name: "Ukraine" },
        { code: "AE", name: "United Arab Emirates" }, { code: "GB", name: "United Kingdom" },
        { code: "US", name: "United States" }, { code: "UY", name: "Uruguay" }, { code: "UZ", name: "Uzbekistan" },
        { code: "VU", name: "Vanuatu" }, { code: "VA", name: "Vatican City" }, { code: "VE", name: "Venezuela" },
        { code: "VN", name: "Vietnam" }, { code: "YE", name: "Yemen" }, { code: "ZM", name: "Zambia" },
        { code: "ZW", name: "Zimbabwe" },
      ];

      const brazilStates = [
        { code: "AC", name: "Acre" }, { code: "AL", name: "Alagoas" }, { code: "AP", name: "Amapá" },
        { code: "AM", name: "Amazonas" }, { code: "BA", name: "Bahia" }, { code: "CE", name: "Ceará" },
        { code: "DF", name: "Distrito Federal" }, { code: "ES", name: "Espírito Santo" },
        { code: "GO", name: "Goiás" }, { code: "MA", name: "Maranhão" }, { code: "MT", name: "Mato Grosso" },
        { code: "MS", name: "Mato Grosso do Sul" }, { code: "MG", name: "Minas Gerais" },
        { code: "PA", name: "Pará" }, { code: "PB", name: "Paraíba" }, { code: "PR", name: "Paraná" },
        { code: "PE", name: "Pernambuco" }, { code: "PI", name: "Piauí" }, { code: "RJ", name: "Rio de Janeiro" },
        { code: "RN", name: "Rio Grande do Norte" }, { code: "RS", name: "Rio Grande do Sul" },
        { code: "RO", name: "Rondônia" }, { code: "RR", name: "Roraima" }, { code: "SC", name: "Santa Catarina" },
        { code: "SP", name: "São Paulo" }, { code: "SE", name: "Sergipe" }, { code: "TO", name: "Tocantins" },
      ];

      // Get existing region codes to avoid duplicates
      const existingCodes = new Set(regions.map(r => `${r.region_type}-${r.region_code}`));

      const countryRows = allCountries
        .filter(c => !existingCodes.has(`country-${c.code}`))
        .map(c => ({
          region_type: "country",
          region_code: c.code,
          region_name: c.name,
          parent_code: null,
          coin_cost: 10,
          active: true,
        }));

      const stateRows = brazilStates
        .filter(s => !existingCodes.has(`state-${s.code}`))
        .map(s => ({
          region_type: "state",
          region_code: s.code,
          region_name: s.name,
          parent_code: "BR",
          coin_cost: 10,
          active: true,
        }));

      const allRows = [...countryRows, ...stateRows];
      if (allRows.length === 0) {
        toast({ title: "Todas as regiões já estão cadastradas!" });
        setPopulatingRegions(false);
        return;
      }

      // Insert in batches of 50
      for (let i = 0; i < allRows.length; i += 50) {
        const batch = allRows.slice(i, i + 50);
        const { error } = await supabase.from("region_coin_prices").insert(batch);
        if (error) throw error;
      }

      toast({ title: `${allRows.length} regiões adicionadas!` });
      fetchRegions();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setPopulatingRegions(false);
    }
  };

  // Gender functions
  const saveGender = async () => {
    try {
      const payload = {
        gender_key: genderForm.gender_key.trim(),
        gender_label: genderForm.gender_label.trim(),
        coin_cost: genderForm.coin_cost,
        updated_at: new Date().toISOString(),
      };
      if (editingGender?.id) {
        await supabase.from("gender_coin_prices").update(payload).eq("id", editingGender.id);
      } else {
        await supabase.from("gender_coin_prices").insert(payload);
      }
      toast({ title: "Gênero salvo!" });
      setEditingGender(null);
      fetchGenders();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const toggleGenderActive = async (g: GenderCoinPrice) => {
    await supabase.from("gender_coin_prices").update({ active: !g.active }).eq("id", g.id);
    fetchGenders();
  };

  const deleteGender = async (id: string) => {
    await supabase.from("gender_coin_prices").delete().eq("id", id);
    fetchGenders();
  };

  const filteredRegions = regions.filter(r =>
    r.region_name.toLowerCase().includes(regionSearch.toLowerCase()) ||
    r.region_code.toLowerCase().includes(regionSearch.toLowerCase())
  );

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
            {activeTab === "coupons" && "Cupons de Desconto"}
            {activeTab === "payments" && "Pagamentos"}
            {activeTab === "regions" && "Preço por Região"}
            {activeTab === "genders" && "Preço por Gênero"}
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

                  {/* Mercado Pago Config */}
                  <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                    <h3 className="text-sm font-semibold text-white mb-3">💳 Mercado Pago</h3>
                    <div>
                      <label className="text-[11px] font-medium mb-1 block" style={{ color: "rgba(255,255,255,0.4)" }}>Access Token</label>
                      <div className="flex gap-2">
                        <input
                          type={mpTokenVisible ? "text" : "password"}
                          value={getSettingValue("mp_access_token")}
                          onChange={e => updateSettingLocal("mp_access_token", e.target.value)}
                          placeholder="APP_USR-..."
                          className="flex-1 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-purple-500/40"
                          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "white" }}
                        />
                        <button onClick={() => setMpTokenVisible(!mpTokenVisible)}
                          className="px-3 py-2 rounded-lg hover:bg-white/5 transition-colors"
                          style={{ border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}>
                          {mpTokenVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <p className="text-[10px] mt-1.5" style={{ color: "rgba(255,255,255,0.25)" }}>
                        Encontre em: mercadopago.com.br → Seu negócio → Configurações → Credenciais
                      </p>
                    </div>
                  </div>

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

          {/* =================== COUPONS TAB =================== */}
          {activeTab === "coupons" && (
            <>
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Crie e gerencie cupons de desconto.</p>
                <button onClick={() => {
                  setEditingCoupon({} as Coupon);
                  setCouponForm({ code: "", discount_percent: 10, max_uses: "", expires_at: "" });
                }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white transition-all hover:scale-105"
                  style={{ background: "linear-gradient(135deg, #7c3aed, #9333ea)" }}>
                  <Plus className="w-3.5 h-3.5" /> Novo Cupom
                </button>
              </div>

              {couponsLoading ? <Spinner /> : coupons.length === 0 ? (
                <EmptyState icon={Tag} text="Nenhum cupom criado" />
              ) : (
                <div className="space-y-2">
                  {coupons.map(coupon => (
                    <div key={coupon.id}
                      className={`rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3 transition-all ${coupon.active ? "" : "opacity-50"}`}
                      style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                          style={{ background: "rgba(124,58,237,0.15)" }}>
                          <Tag className="w-4 h-4" style={{ color: "#a78bfa" }} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-white font-mono tracking-wider">{coupon.code}</span>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "rgba(34,197,94,0.15)", color: "#22c55e" }}>
                              -{coupon.discount_percent}%
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.35)" }}>
                              Usos: {coupon.used_count}{coupon.max_uses ? `/${coupon.max_uses}` : " (ilimitado)"}
                            </span>
                            {coupon.expires_at && (
                              <span className="text-[11px] flex items-center gap-1" style={{ color: new Date(coupon.expires_at) < new Date() ? "#ef4444" : "rgba(255,255,255,0.35)" }}>
                                <Calendar className="w-3 h-3" />
                                {new Date(coupon.expires_at).toLocaleDateString("pt-BR")}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => { navigator.clipboard.writeText(coupon.code); toast({ title: "Código copiado!" }); }}
                          className="p-2 rounded-lg hover:bg-white/5 transition-colors" title="Copiar código">
                          <Copy className="w-3.5 h-3.5" style={{ color: "rgba(255,255,255,0.45)" }} />
                        </button>
                        <button onClick={() => toggleCouponActive(coupon)} className="p-2 rounded-lg hover:bg-white/5 transition-colors">
                          {coupon.active ? <ToggleRight className="w-4 h-4" style={{ color: "#22c55e" }} /> : <ToggleLeft className="w-4 h-4" style={{ color: "rgba(255,255,255,0.3)" }} />}
                        </button>
                        <button onClick={() => {
                          setEditingCoupon(coupon);
                          setCouponForm({
                            code: coupon.code,
                            discount_percent: coupon.discount_percent,
                            max_uses: coupon.max_uses ? String(coupon.max_uses) : "",
                            expires_at: coupon.expires_at ? coupon.expires_at.split("T")[0] : "",
                          });
                        }} className="p-2 rounded-lg hover:bg-white/5 transition-colors">
                          <Edit2 className="w-3.5 h-3.5" style={{ color: "rgba(255,255,255,0.45)" }} />
                        </button>
                        <button onClick={() => deleteCoupon(coupon.id)} className="p-2 rounded-lg hover:bg-red-500/10 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" style={{ color: "#ef4444" }} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* =================== PAYMENTS TAB =================== */}
          {activeTab === "payments" && (
            <>
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Histórico de transações via Mercado Pago.</p>
                <button onClick={fetchTransactions}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white transition-all hover:scale-105"
                  style={{ background: "rgba(124,58,237,0.2)", border: "1px solid rgba(124,58,237,0.3)" }}>
                  🔄 Atualizar
                </button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                {[
                  { label: "Total", value: transactions.length, color: "#a78bfa" },
                  { label: "Aprovados", value: transactions.filter(t => t.status === "approved").length, color: "#22c55e" },
                  { label: "Pendentes", value: transactions.filter(t => t.status === "pending").length, color: "#eab308" },
                  { label: "Receita (R$)", value: (transactions.filter(t => t.status === "approved").reduce((s, t) => s + t.amount_cents, 0) / 100).toFixed(2), color: "#22c55e" },
                ].map(stat => (
                  <div key={stat.label} className="rounded-xl p-3 text-center"
                    style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                    <div className="text-lg font-bold" style={{ color: stat.color }}>{stat.value}</div>
                    <div className="text-[10px]" style={{ color: "rgba(255,255,255,0.35)" }}>{stat.label}</div>
                  </div>
                ))}
              </div>

              {txLoading ? <Spinner /> : transactions.length === 0 ? (
                <EmptyState icon={CreditCard} text="Nenhuma transação ainda" />
              ) : (
                <div className="space-y-2">
                  {transactions.map(tx => {
                    const StatusIcon = tx.status === "approved" ? CheckCircle : tx.status === "pending" ? Clock : tx.status === "rejected" ? XCircle : AlertCircle;
                    const statusColor = tx.status === "approved" ? "#22c55e" : tx.status === "pending" ? "#eab308" : "#ef4444";
                    const userName = users.find(u => u.id === tx.user_id)?.display_name || users.find(u => u.id === tx.user_id)?.email || tx.user_id.slice(0, 8);
                    return (
                      <div key={tx.id} className="rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3"
                        style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <StatusIcon className="w-5 h-5 shrink-0" style={{ color: statusColor }} />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium text-white">{userName}</span>
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: `${statusColor}15`, color: statusColor }}>
                                {tx.status.toUpperCase()}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 mt-0.5">
                              <span className="text-xs" style={{ color: "#eab308" }}>🪙 {tx.coins_amount}{tx.bonus_amount > 0 ? ` +${tx.bonus_amount}` : ""}</span>
                              <span className="text-xs font-semibold" style={{ color: "rgba(255,255,255,0.6)" }}>R$ {(tx.amount_cents / 100).toFixed(2)}</span>
                              {tx.coupon_code && <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: "rgba(124,58,237,0.15)", color: "#a78bfa" }}>🏷️ {tx.coupon_code} (-{tx.discount_percent}%)</span>}
                            </div>
                          </div>
                        </div>
                        <div className="text-[10px]" style={{ color: "rgba(255,255,255,0.2)" }}>
                          {new Date(tx.created_at).toLocaleString("pt-BR")}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* =================== REGIONS TAB =================== */}
          {activeTab === "regions" && (
            <>
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Configure o custo em coins para cada país ou estado.</p>
                <div className="flex gap-2">
                  {regions.length === 0 && (
                    <button onClick={populateAllRegions} disabled={populatingRegions}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white transition-all hover:scale-105 disabled:opacity-50"
                      style={{ background: "linear-gradient(135deg, #22c55e, #16a34a)" }}>
                      <Globe className="w-3.5 h-3.5" /> {populatingRegions ? "Populando..." : "🌍 Popular Tudo"}
                    </button>
                  )}
                  <button onClick={() => {
                    setEditingRegion({} as RegionCoinPrice);
                    setRegionForm({ region_type: "country", region_code: "", region_name: "", parent_code: "", coin_cost: 10 });
                  }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white transition-all hover:scale-105"
                    style={{ background: "linear-gradient(135deg, #7c3aed, #9333ea)" }}>
                    <Plus className="w-3.5 h-3.5" /> Nova Região
                  </button>
                </div>
              </div>

              <div className="relative max-w-md mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "rgba(255,255,255,0.3)" }} />
                <input value={regionSearch} onChange={(e) => setRegionSearch(e.target.value)}
                  placeholder="Buscar região..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-purple-500/40"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "white" }} />
              </div>

              {/* Summary */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                {[
                  { label: "Países", value: regions.filter(r => r.region_type === "country").length, color: "#a78bfa" },
                  { label: "Estados", value: regions.filter(r => r.region_type === "state").length, color: "#22c55e" },
                  { label: "Ativos", value: regions.filter(r => r.active).length, color: "#eab308" },
                ].map(stat => (
                  <div key={stat.label} className="rounded-xl p-3 text-center"
                    style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                    <div className="text-lg font-bold" style={{ color: stat.color }}>{stat.value}</div>
                    <div className="text-[10px]" style={{ color: "rgba(255,255,255,0.35)" }}>{stat.label}</div>
                  </div>
                ))}
              </div>

              {regionsLoading ? <Spinner /> : filteredRegions.length === 0 ? (
                <EmptyState icon={Globe} text="Nenhuma região configurada" />
              ) : (
                <div className="space-y-2">
                  {filteredRegions.map(region => (
                    <div key={region.id}
                      className={`rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3 transition-all ${region.active ? "" : "opacity-50"}`}
                      style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                          style={{ background: region.region_type === "country" ? "rgba(124,58,237,0.15)" : "rgba(34,197,94,0.15)" }}>
                          {region.region_type === "country"
                            ? <Globe className="w-4 h-4" style={{ color: "#a78bfa" }} />
                            : <MapPin className="w-4 h-4" style={{ color: "#22c55e" }} />}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-white">{region.region_name}</span>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full font-mono"
                              style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)" }}>
                              {region.region_code}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full"
                              style={{ background: region.region_type === "country" ? "rgba(124,58,237,0.15)" : "rgba(34,197,94,0.15)", color: region.region_type === "country" ? "#a78bfa" : "#22c55e" }}>
                              {region.region_type === "country" ? "País" : "Estado"}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className="text-xs font-semibold" style={{ color: region.coin_cost === 0 ? "#4ade80" : "#eab308" }}>
                              {region.coin_cost === 0 ? "🆓 FREE" : `🪙 ${region.coin_cost} coins`}
                            </span>
                            {region.parent_code && (
                              <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.35)" }}>
                                País: {region.parent_code}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => toggleRegionActive(region)} className="p-2 rounded-lg hover:bg-white/5 transition-colors">
                          {region.active ? <ToggleRight className="w-4 h-4" style={{ color: "#22c55e" }} /> : <ToggleLeft className="w-4 h-4" style={{ color: "rgba(255,255,255,0.3)" }} />}
                        </button>
                        <button onClick={() => {
                          setEditingRegion(region);
                          setRegionForm({
                            region_type: region.region_type,
                            region_code: region.region_code,
                            region_name: region.region_name,
                            parent_code: region.parent_code || "",
                            coin_cost: region.coin_cost,
                          });
                        }} className="p-2 rounded-lg hover:bg-white/5 transition-colors">
                          <Edit2 className="w-3.5 h-3.5" style={{ color: "rgba(255,255,255,0.45)" }} />
                        </button>
                        <button onClick={() => deleteRegion(region.id)} className="p-2 rounded-lg hover:bg-red-500/10 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" style={{ color: "#ef4444" }} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* =================== GENDERS TAB =================== */}
          {activeTab === "genders" && (
            <>
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Configure o custo em coins para cada filtro de gênero.</p>
                <button onClick={() => {
                  setEditingGender({} as GenderCoinPrice);
                  setGenderForm({ gender_key: "", gender_label: "", coin_cost: 0 });
                }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white transition-all hover:scale-105"
                  style={{ background: "linear-gradient(135deg, #7c3aed, #9333ea)" }}>
                  <Plus className="w-3.5 h-3.5" /> Novo Gênero
                </button>
              </div>

              {gendersLoading ? <Spinner /> : genders.length === 0 ? (
                <EmptyState icon={UserCheck} text="Nenhum gênero configurado" />
              ) : (
                <div className="space-y-2">
                  {genders.map(g => {
                    const emoji = g.gender_key === "Male" ? "👨" : g.gender_key === "Female" ? "👩" : g.gender_key === "Both" ? "👫" : "🧑";
                    const accentColor = g.gender_key === "Male" ? "#38bdf8" : g.gender_key === "Female" ? "#ec4899" : "#a855f7";
                    return (
                      <div key={g.id}
                        className={`rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3 transition-all ${g.active ? "" : "opacity-50"}`}
                        style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-xl"
                            style={{ background: `${accentColor}15` }}>
                            {emoji}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-white">{g.gender_label}</span>
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full font-mono"
                                style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)" }}>
                                {g.gender_key}
                              </span>
                            </div>
                            <span className="text-xs font-semibold" style={{ color: g.coin_cost === 0 ? "#22c55e" : "#eab308" }}>
                              {g.coin_cost === 0 ? "FREE" : `🪙 ${g.coin_cost} coins`}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => toggleGenderActive(g)} className="p-2 rounded-lg hover:bg-white/5 transition-colors">
                            {g.active ? <ToggleRight className="w-4 h-4" style={{ color: "#22c55e" }} /> : <ToggleLeft className="w-4 h-4" style={{ color: "rgba(255,255,255,0.3)" }} />}
                          </button>
                          <button onClick={() => {
                            setEditingGender(g);
                            setGenderForm({ gender_key: g.gender_key, gender_label: g.gender_label, coin_cost: g.coin_cost });
                          }} className="p-2 rounded-lg hover:bg-white/5 transition-colors">
                            <Edit2 className="w-3.5 h-3.5" style={{ color: "rgba(255,255,255,0.45)" }} />
                          </button>
                          <button onClick={() => deleteGender(g.id)} className="p-2 rounded-lg hover:bg-red-500/10 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" style={{ color: "#ef4444" }} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
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

      {/* =================== COUPON EDIT MODAL =================== */}
      {editingCoupon && (
        <Modal onClose={() => setEditingCoupon(null)}>
          <h2 className="text-lg font-bold text-white mb-4">{editingCoupon.id ? "Editar Cupom" : "Novo Cupom"}</h2>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: "rgba(255,255,255,0.45)" }}>Código do Cupom</label>
              <AdminInput value={couponForm.code} onChange={v => setCouponForm(p => ({ ...p, code: v.toUpperCase() }))} placeholder="EX: DESCONTO20" />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: "rgba(255,255,255,0.45)" }}>Desconto (%)</label>
              <AdminInput value={String(couponForm.discount_percent)} onChange={v => setCouponForm(p => ({ ...p, discount_percent: Math.min(100, Math.max(0, parseInt(v) || 0)) }))} type="number" placeholder="10" />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: "rgba(255,255,255,0.45)" }}>Máximo de usos (vazio = ilimitado)</label>
              <AdminInput value={couponForm.max_uses} onChange={v => setCouponForm(p => ({ ...p, max_uses: v }))} type="number" placeholder="100" />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: "rgba(255,255,255,0.45)" }}>Data de expiração (opcional)</label>
              <input type="date" value={couponForm.expires_at} onChange={e => setCouponForm(p => ({ ...p, expires_at: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-purple-500/40"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "white", colorScheme: "dark" }} />
            </div>
            <PrimaryBtn onClick={saveCoupon} disabled={!couponForm.code.trim()} text="💾 Salvar Cupom" />
          </div>
        </Modal>
      )}

      {/* =================== REGION EDIT MODAL =================== */}
      {editingRegion && (
        <Modal onClose={() => setEditingRegion(null)}>
          <h2 className="text-lg font-bold text-white mb-4">{editingRegion.id ? "Editar Região" : "Nova Região"}</h2>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: "rgba(255,255,255,0.45)" }}>Tipo</label>
              <div className="flex gap-2">
                {["country", "state"].map(t => (
                  <button key={t} onClick={() => setRegionForm(p => ({ ...p, region_type: t }))}
                    className="flex-1 py-2 rounded-xl text-sm font-medium transition-all"
                    style={{
                      background: regionForm.region_type === t ? "rgba(124,58,237,0.2)" : "rgba(255,255,255,0.04)",
                      border: `1px solid ${regionForm.region_type === t ? "rgba(124,58,237,0.4)" : "rgba(255,255,255,0.08)"}`,
                      color: regionForm.region_type === t ? "#a78bfa" : "rgba(255,255,255,0.5)",
                    }}>
                    {t === "country" ? "🌍 País" : "📍 Estado"}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: "rgba(255,255,255,0.45)" }}>Código (ex: BR, US, SP, RJ)</label>
              <AdminInput value={regionForm.region_code} onChange={v => setRegionForm(p => ({ ...p, region_code: v.toUpperCase() }))} placeholder="BR" />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: "rgba(255,255,255,0.45)" }}>Nome</label>
              <AdminInput value={regionForm.region_name} onChange={v => setRegionForm(p => ({ ...p, region_name: v }))} placeholder="Brasil" />
            </div>
            {regionForm.region_type === "state" && (
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: "rgba(255,255,255,0.45)" }}>Código do País (pai)</label>
                <AdminInput value={regionForm.parent_code} onChange={v => setRegionForm(p => ({ ...p, parent_code: v.toUpperCase() }))} placeholder="BR" />
              </div>
            )}
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: "rgba(255,255,255,0.45)" }}>Custo em Coins</label>
              <AdminInput value={String(regionForm.coin_cost)} onChange={v => setRegionForm(p => ({ ...p, coin_cost: Math.max(0, parseInt(v) || 0) }))} type="number" placeholder="10" />
              <p className="text-[10px] mt-1" style={{ color: "rgba(255,255,255,0.3)" }}>Quantas coins o usuário gasta para acessar esta região.</p>
            </div>
            <PrimaryBtn onClick={saveRegion} disabled={!regionForm.region_code.trim() || !regionForm.region_name.trim()} text="💾 Salvar Região" />
          </div>
        </Modal>
      )}

      {/* =================== GENDER EDIT MODAL =================== */}
      {editingGender && (
        <Modal onClose={() => setEditingGender(null)}>
          <h2 className="text-lg font-bold text-white mb-4">{editingGender.id ? "Editar Gênero" : "Novo Gênero"}</h2>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: "rgba(255,255,255,0.45)" }}>Chave (ex: Male, Female, Both)</label>
              <AdminInput value={genderForm.gender_key} onChange={v => setGenderForm(p => ({ ...p, gender_key: v }))} placeholder="Male" />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: "rgba(255,255,255,0.45)" }}>Label (nome exibido)</label>
              <AdminInput value={genderForm.gender_label} onChange={v => setGenderForm(p => ({ ...p, gender_label: v }))} placeholder="Male" />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: "rgba(255,255,255,0.45)" }}>Custo em Coins</label>
              <AdminInput value={String(genderForm.coin_cost)} onChange={v => setGenderForm(p => ({ ...p, coin_cost: Math.max(0, parseInt(v) || 0) }))} type="number" placeholder="15" />
              <p className="text-[10px] mt-1" style={{ color: "rgba(255,255,255,0.3)" }}>0 = grátis. Quantas coins o usuário gasta ao usar este filtro.</p>
            </div>
            <PrimaryBtn onClick={saveGender} disabled={!genderForm.gender_key.trim() || !genderForm.gender_label.trim()} text="💾 Salvar Gênero" />
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
