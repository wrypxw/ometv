export type SiteSettingsMap = Record<string, string>;

const SITE_BRANDING_CACHE_KEY = "site_branding_settings";

export const getCachedSiteSettings = (): SiteSettingsMap => {
  if (typeof window === "undefined") return {};

  try {
    const raw = window.localStorage.getItem(SITE_BRANDING_CACHE_KEY);
    if (!raw) return {};

    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as SiteSettingsMap) : {};
  } catch {
    return {};
  }
};

export const cacheSiteSettings = (settings: SiteSettingsMap) => {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(SITE_BRANDING_CACHE_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage failures.
  }
};

export const getResolvedSiteBranding = (settings: SiteSettingsMap) => ({
  name: settings.site_name || "ChatRandom",
  suffix: settings.site_suffix || ".gg",
  logoUrl: settings.logo_url || "",
  faviconUrl: settings.favicon_url || "",
});

export const applyBrandingToDocument = (settings: SiteSettingsMap) => {
  if (typeof document === "undefined") return;

  const branding = getResolvedSiteBranding(settings);
  document.title = `${branding.name}${branding.suffix} - Video Chat with Strangers`;

  if (!branding.faviconUrl) return;

  let link = document.querySelector("link[rel='icon']") as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }

  link.href = branding.faviconUrl;
  link.type = "image/png";
};