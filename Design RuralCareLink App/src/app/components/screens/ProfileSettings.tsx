import { useState, useEffect } from "react";
import { LogOut, Globe, ArrowLeft } from "lucide-react";
import { LanguageSwitcher } from "../LanguageSwitcher";
import { useAuth } from "../../context/AuthContext";
import { useI18n } from "../../context/I18nContext";
import { userService, settingsService } from "../../services";

interface ProfileSettingsProps {
  onBack: () => void;
  onLogout: () => void;
  currentLang: string;
  onChangeLang: (lang: string) => void;
}

export function ProfileSettings({ onBack, onLogout, currentLang, onChangeLang }: ProfileSettingsProps) {
  const { user: authUser, logout } = useAuth();
  const { setLocale, locale, t } = useI18n();

  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const data = await userService.getProfile();
        setProfile(data.user);
      } catch {
        // use authUser fallback
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleLangChange = async (lang: string) => {
    setLocale(lang);
    onChangeLang(lang);
    setSaving(true);
    try {
      await settingsService.update({ preferredLanguage: lang });
    } catch (e) {
      console.error('[ProfileSettings] Settings update error:', e);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    onLogout();
  };

  const displayUser = (profile || authUser) as Record<string, unknown> | null;
  const facility = (displayUser?.facility as Record<string, unknown>) || {};
  const activeLang = locale || currentLang;

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: "#f4f7f4", paddingBottom: 80 }}>
      {/* Header */}
      <div style={{ background: "#2E7D32", padding: "48px 20px 20px" }}>
        <div style={{ marginBottom: 16 }}>
          <button onClick={onBack} style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 10, padding: "8px 12px", cursor: "pointer", color: "#fff", display: "flex", alignItems: "center", gap: 6, fontSize: 14 }}>
            <ArrowLeft size={16} /> {t('back', 'Back')}
          </button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(255,255,255,0.2)", border: "3px solid rgba(255,255,255,0.4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>👩‍⚕️</div>
          <div>
            <h2 style={{ color: "#fff", margin: 0, fontSize: 20 }}>{(displayUser?.fullName as string) || "—"}</h2>
            <p style={{ color: "rgba(255,255,255,0.7)", margin: "3px 0 0", fontSize: 13 }}>
              {((displayUser?.role as string)?.replace("_", " ")) === "HEALTH_WORKER" ? t('role_health_worker', 'Health Worker') : t('role_cho', 'Community Health Officer')} • ID: {(displayUser?.employeeId as string) || "—"}
            </p>
          </div>
        </div>
      </div>

      <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Facility Info */}
        <div style={{ background: "#fff", borderRadius: 14, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", border: "1px solid rgba(0,0,0,0.06)" }}>
          <div style={{ padding: "14px 16px", borderBottom: "1px solid rgba(0,0,0,0.06)", fontWeight: 600, fontSize: 14, color: "#1a2332" }}>🏥 {t('profile_facility', 'Facility Information')}</div>
          {loading
            ? <div style={{ padding: "20px 16px", color: "#8a9aaa", fontSize: 14 }}>{t('loading', 'Loading…')}</div>
            : [
                { label: t('facility_name', 'Facility Name'), value: (facility.name as string) || "—" },
                { label: t('facility_type', 'Type'),          value: (facility.type as string) || "PHC" },
                { label: t('facility_hmis', 'HMIS Code'),     value: (facility.hmisCode as string) || "—" },
                { label: t('facility_block', 'Block'),         value: (facility.block as string) || "—" },
                { label: t('facility_district', 'District'),      value: (facility.district as string) || "—" },
                { label: t('facility_state', 'State'),         value: (facility.state as string) || "—" },
              ].map(row => (
                <div key={row.label} style={{ padding: "12px 16px", display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(0,0,0,0.04)", fontSize: 14 }}>
                  <span style={{ color: "#8a9aaa" }}>{row.label}</span>
                  <span style={{ color: "#1a2332", fontWeight: 500 }}>{row.value}</span>
                </div>
              ))
          }
        </div>

        {/* Language Settings — overflow:visible so the dropdown isn't clipped */}
        <div style={{ background: "#fff", borderRadius: 14, overflow: "visible", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", border: "1px solid rgba(0,0,0,0.06)" }}>
          <div style={{ padding: "14px 16px", borderBottom: "1px solid rgba(0,0,0,0.06)", fontWeight: 600, fontSize: 14, color: "#1a2332", display: "flex", alignItems: "center", gap: 8 }}>
            <Globe size={16} /> {t('profile_language', 'Language Settings')}
          </div>
          <div style={{ padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 14, color: "#1a2332", fontWeight: 500 }}>{t('profile_app_lang', 'App Language')}</div>
              <div style={{ fontSize: 12, color: "#8a9aaa", marginTop: 2 }}>{t('profile_lang_sub', 'Changes all UI text instantly')}</div>
            </div>
            <LanguageSwitcher currentLang={activeLang} onChangeLang={handleLangChange} />
          </div>
        </div>

        {saving && <div style={{ textAlign: "center", fontSize: 12, color: "#2E7D32" }}>{t('loading', 'Saving…')}</div>}

        {/* Logout */}
        <button onClick={handleLogout}
          style={{ width: "100%", padding: "15px", background: "#fff", color: "#c62828", border: "1.5px solid #ef9a9a", borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <LogOut size={18} /> {t('profile_logout', 'Logout')}
        </button>
      </div>
    </div>
  );
}
