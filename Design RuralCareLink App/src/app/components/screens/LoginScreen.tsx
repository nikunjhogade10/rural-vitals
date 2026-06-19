import { useState } from "react";
import { Eye, EyeOff, Heart, Lock, User, Wifi } from "lucide-react";
import { LanguageSwitcher } from "../LanguageSwitcher";
import { useAuth } from "../../context/AuthContext";
import { useI18n } from "../../context/I18nContext";

interface LoginScreenProps {
  onLogin: () => void;
  onContinueOffline: () => void;
  currentLang: string;
  onChangeLang: (lang: string) => void;
}

export function LoginScreen({ onLogin, onContinueOffline, currentLang, onChangeLang }: LoginScreenProps) {
  const { login, loginOffline } = useAuth();
  const { t, locale, setLocale } = useI18n();
  const [employeeId, setEmployeeId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    if (!employeeId || !password) {
      setError(t('login_error_empty', 'Please enter your Employee ID and password.'));
      return;
    }
    setLoading(true);
    setError("");
    try {
      await login(employeeId, password);
      onLogin();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('login_failed', 'Login failed. Check your credentials.'));
    } finally {
      setLoading(false);
    }
  };

  const handleOffline = () => {
    loginOffline();
    onContinueOffline();
  };

  const handleLangChange = (lang: string) => {
    setLocale(lang);
    onChangeLang(lang);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: "#fff" }}>
      {/* Top bar */}
      <div style={{ display: "flex", justifyContent: "flex-end", padding: "16px 24px" }}>
        <LanguageSwitcher currentLang={locale} onChangeLang={handleLangChange} />
      </div>

      {/* Hero section */}
      <div style={{ background: "linear-gradient(160deg, #1b5e20 0%, #2E7D32 100%)", padding: "32px 24px 48px", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -30, right: -30, width: 120, height: 120, borderRadius: "50%", background: "rgba(255,255,255,0.05)" }} />
        <div style={{ position: "absolute", bottom: -20, left: -20, width: 80, height: 80, borderRadius: "50%", background: "rgba(255,255,255,0.05)" }} />
        <div style={{ width: 72, height: 72, borderRadius: 18, background: "rgba(255,255,255,0.15)", border: "2px solid rgba(255,255,255,0.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
          <Heart size={36} color="#fff" fill="rgba(255,255,255,0.9)" />
        </div>
        <h1 style={{ color: "#fff", fontSize: 24, margin: "0 0 6px" }}>{t('login_title', 'RuralCareLink')}</h1>
        <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 13, margin: 0 }}>
          {t('login_subtitle', 'Offline-first telemedicine continuity layer for rural India')}
        </p>
      </div>

      {/* PHC Branding */}
      <div style={{ background: "#f4f7f4", padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: "#e8f5e9", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: 14 }}>🏥</span>
        </div>
        <span style={{ fontSize: 13, color: "#637074", fontWeight: 500 }}>
          {t('login_phc_branding', 'PHC / Health & Wellness Centre — Low-bandwidth continuity layer')}
        </span>
      </div>

      {/* Login Form */}
      <div style={{ padding: "32px 24px", flex: 1 }}>
        <h2 style={{ color: "#1a2332", margin: "0 0 24px" }}>{t('login_button', 'Sign In')}</h2>

        {error && (
          <div style={{ background: "#ffebee", border: "1px solid #ef9a9a", borderRadius: 10, padding: "12px 16px", marginBottom: 16, fontSize: 13, color: "#c62828" }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Employee ID */}
          <div>
            <label style={{ display: "block", color: "#637074", fontSize: 13, marginBottom: 8 }}>
              {t('login_employee_id', 'Username / Employee ID')}
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: 12, background: "#f4f7f4", border: "1.5px solid rgba(0,0,0,0.08)", borderRadius: 12, padding: "14px 16px" }}>
              <User size={18} color="#8a9aaa" />
              <input
                type="text"
                placeholder="e.g. MH-2024-089"
                value={employeeId}
                onChange={e => setEmployeeId(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleLogin()}
                style={{ border: "none", background: "none", outline: "none", fontSize: 15, color: "#1a2332", width: "100%" }}
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label style={{ display: "block", color: "#637074", fontSize: 13, marginBottom: 8 }}>
              {t('login_password', 'Password')}
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: 12, background: "#f4f7f4", border: "1.5px solid rgba(0,0,0,0.08)", borderRadius: 12, padding: "14px 16px" }}>
              <Lock size={18} color="#8a9aaa" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleLogin()}
                style={{ border: "none", background: "none", outline: "none", fontSize: 15, color: "#1a2332", flex: 1 }}
              />
              <button onClick={() => setShowPassword(!showPassword)} style={{ border: "none", background: "none", cursor: "pointer", color: "#8a9aaa", padding: 0 }}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Login button */}
          <button
            onClick={handleLogin}
            disabled={loading}
            style={{ width: "100%", padding: "16px", background: loading ? "#81c784" : "#2E7D32", color: "#fff", border: "none", borderRadius: 12, fontSize: 16, fontWeight: 600, cursor: loading ? "default" : "pointer", marginTop: 8, transition: "background 0.2s" }}
          >
            {loading ? '…' : t('login_button', 'Sign In')}
          </button>

          {/* Divider */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "4px 0" }}>
            <div style={{ flex: 1, height: 1, background: "rgba(0,0,0,0.08)" }} />
            <span style={{ color: "#8a9aaa", fontSize: 12 }}>{t('or', 'or')}</span>
            <div style={{ flex: 1, height: 1, background: "rgba(0,0,0,0.08)" }} />
          </div>

          {/* Continue Offline */}
          <button
            onClick={handleOffline}
            style={{ width: "100%", padding: "15px", background: "#fff3e0", color: "#e65100", border: "1.5px solid #ffcc80", borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
          >
            <Wifi size={18} color="#e65100" />
            {t('login_offline', 'Continue Offline')}
          </button>
          <p style={{ textAlign: "center", color: "#8a9aaa", fontSize: 12, margin: 0 }}>
            {t('sync_when_connected', 'Data will be saved locally and synced when online')}
          </p>
        </div>
      </div>
    </div>
  );
}
