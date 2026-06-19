import { useMemo } from "react";
import { Wifi, WifiOff, Users, Clock, CheckCircle, UserPlus, FolderOpen, RefreshCw, ChevronRight } from "lucide-react";
import { StatusBadge } from "../StatusBadge";
import { PatientCard, Patient } from "../PatientCard";
import { LanguageSwitcher } from "../LanguageSwitcher";
import { useAuth } from "../../context/AuthContext";
import { useLocalData } from "../../context/LocalDataContext";
import { useI18n } from "../../context/I18nContext";

interface DashboardProps {
  isOnline: boolean;
  onNavigate: (screen: string) => void;
  currentLang: string;
  onChangeLang: (lang: string) => void;
  onPatientClick: (patient: Patient) => void;
}

export function Dashboard({ isOnline, onNavigate, currentLang, onChangeLang, onPatientClick }: DashboardProps) {
  const { user } = useAuth();
  const { patients, visits, pendingCount, loading } = useLocalData();
  const { t, locale, setLocale } = useI18n();

  // Derive dashboard stats from local data
  const summary = useMemo(() => ({
    totalPatients: patients.length,
    pendingSync: pendingCount,
    syncedCases: visits.filter(v => v.syncStatus === 'synced').length,
    lastSync: [...visits, ...patients]
      .filter(r => r.syncedAt)
      .sort((a, b) => (b.syncedAt || '').localeCompare(a.syncedAt || ''))[0]?.syncedAt || null,
  }), [patients, visits, pendingCount]);

  // Show 5 most recent visits as patient cards
  const recentCases = useMemo((): Patient[] => {
    const patientMap = new Map(patients.map(p => [p.id, p]));
    return visits.slice(0, 5).map(v => {
      const p = patientMap.get(v.patientId);
      return {
        id: v.id,
        name: p?.fullName || 'Unknown',
        age: p?.age || 0,
        gender: p?.gender === 'MALE' ? 'Male' : p?.gender === 'FEMALE' ? 'Female' : 'Other',
        date: new Date(v.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
        status: (() => {
          if (v.syncStatus !== 'synced') return 'pending';
          if (v.status === 'REVIEWED' || v.status === 'COMPLETED') return 'reviewed';
          return 'synced';
        })(),
        condition: v.chiefComplaint,
        language: p?.preferredLanguage,
      };
    });
  }, [visits, patients]);

  const formatLastSync = (ts: string | null) => {
    if (!ts) return "Never";
    const d = new Date(ts);
    const today = new Date();
    const isToday = d.toDateString() === today.toDateString();
    return isToday
      ? `Today ${d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`
      : d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  };

  const facilityName = user?.facility?.name || "PHC";
  const employeeId = user?.employeeId || "—";
  const displayName = user?.fullName || "Health Worker";

  // Language switcher in Dashboard also updates I18nContext directly
  const handleLangChange = (lang: string) => {
    setLocale(lang);
    onChangeLang(lang);
  };

  return (
    <div style={{ background: "#f4f7f4", minHeight: "100vh", paddingBottom: 80 }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #1b5e20 0%, #2E7D32 100%)", padding: "48px 20px 24px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 13, margin: "0 0 4px" }}>
              {t('dashboard_welcome', 'Welcome back,')}
            </p>
            <h2 style={{ color: "#fff", margin: 0, fontSize: 22 }}>{displayName}</h2>
            <p style={{ color: "rgba(255,255,255,0.65)", fontSize: 12, margin: "4px 0 0" }}>
              {facilityName} • CHO ID: {employeeId}
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
            {/* LanguageSwitcher reads locale from I18nContext */}
            <LanguageSwitcher currentLang={locale} onChangeLang={handleLangChange} />
            <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(255,255,255,0.2)", border: "2px solid rgba(255,255,255,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
              👩‍⚕️
            </div>
          </div>
        </div>

        {/* Connectivity Card */}
        <div style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)", borderRadius: 12, padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {isOnline ? <Wifi size={20} color="#a5d6a7" /> : <WifiOff size={20} color="#ffcc80" />}
            <div>
              <div style={{ color: "#fff", fontSize: 14, fontWeight: 600 }}>
                {isOnline ? t('dashboard_connected', 'Connected') : t('dashboard_offline_mode', 'Offline Mode')}
              </div>
              <div style={{ color: "rgba(255,255,255,0.65)", fontSize: 12 }}>
                {t('dashboard_last_sync', 'Last sync:')} {formatLastSync(summary.lastSync)}
              </div>
            </div>
          </div>
          <StatusBadge status={isOnline ? "online" : "offline"} />
        </div>
      </div>

      <div style={{ padding: "20px 20px 0" }}>
        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
          {loading
            ? [0, 1, 2].map(i => (
                <div key={i} style={{ background: "#fff", borderRadius: 12, padding: "14px 12px", textAlign: "center", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", border: "1px solid rgba(0,0,0,0.05)" }}>
                  <div style={{ height: 22, background: "#f0f0f0", borderRadius: 6, margin: "0 auto 8px", width: "60%" }} />
                  <div style={{ height: 16, background: "#f0f0f0", borderRadius: 4, margin: "0 auto", width: "80%" }} />
                </div>
              ))
            : [
                { labelKey: "dashboard_total_patients",    labelFb: "Total\nPatients",  value: summary.totalPatients, icon: <Users size={18} color="#2E7D32" />,      bg: "#e8f5e9", color: "#2E7D32" },
                { labelKey: "dashboard_pending_sync_label",labelFb: "Pending\nSync",    value: summary.pendingSync,   icon: <Clock size={18} color="#f57f17" />,      bg: "#fffde7", color: "#f57f17" },
                { labelKey: "dashboard_synced_cases",      labelFb: "Synced\nCases",    value: summary.syncedCases,   icon: <CheckCircle size={18} color="#0277bd" />, bg: "#e1f5fe", color: "#0277bd" },
              ].map(stat => (
                <div key={stat.labelKey} style={{ background: "#fff", borderRadius: 12, padding: "14px 12px", textAlign: "center", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", border: "1px solid rgba(0,0,0,0.05)" }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: stat.bg, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 8px" }}>{stat.icon}</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: stat.color, lineHeight: 1 }}>{stat.value}</div>
                  <div style={{ fontSize: 11, color: "#8a9aaa", marginTop: 4, whiteSpace: "pre-line", lineHeight: 1.3 }}>
                    {t(stat.labelKey, stat.labelFb)}
                  </div>
                </div>
              ))}
        </div>

        {/* Quick Actions */}
        <div style={{ marginBottom: 20 }}>
          <h3 style={{ color: "#1a2332", margin: "0 0 12px", fontSize: 15 }}>
            {t('dashboard_quick_actions', 'Quick Actions')}
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            {[
              { labelKey: "dashboard_register", labelFb: "Register\nPatient", icon: <UserPlus size={22} color="#2E7D32" />, bg: "#e8f5e9", action: "register" },
              { labelKey: "dashboard_view_cases", labelFb: "View\nCases",    icon: <FolderOpen size={22} color="#1565C0" />, bg: "#e3f2fd", action: "patients" },
              { labelKey: "dashboard_sync",      labelFb: "Sync\nData",      icon: <RefreshCw size={22} color="#f57f17" />,  bg: "#fffde7", action: "sync" },
            ].map(item => (
              <button key={item.action} onClick={() => onNavigate(item.action)}
                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, background: "#fff", border: "1px solid rgba(0,0,0,0.06)", borderRadius: 12, padding: "16px 8px", cursor: "pointer", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", transition: "box-shadow 0.15s" }}
                onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)")}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.06)")}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: item.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>{item.icon}</div>
                <span style={{ fontSize: 11, color: "#637074", fontWeight: 500, textAlign: "center", whiteSpace: "pre-line", lineHeight: 1.3 }}>
                  {t(item.labelKey, item.labelFb)}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Recent Cases */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <h3 style={{ color: "#1a2332", margin: 0, fontSize: 15 }}>
              {t('dashboard_recent', 'Recent Cases')}
            </h3>
            <button onClick={() => onNavigate("patients")} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", color: "#2E7D32", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              {t('dashboard_view_all', 'View all')} <ChevronRight size={14} />
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {loading
              ? [0, 1, 2].map(i => (
                  <div key={i} style={{ background: "#fff", borderRadius: 12, padding: "14px 16px", height: 76, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                    <div style={{ height: 15, background: "#f0f0f0", borderRadius: 4, width: "60%", marginBottom: 8 }} />
                    <div style={{ height: 12, background: "#f0f0f0", borderRadius: 4, width: "40%" }} />
                  </div>
                ))
              : recentCases.length === 0
                ? <div style={{ textAlign: "center", padding: "40px 0", color: "#8a9aaa", fontSize: 14 }}>
                    {t('dashboard_no_cases', 'No cases yet. Register a patient to get started.')}
                  </div>
                : recentCases.map(p => <PatientCard key={p.id} patient={p} onClick={() => onPatientClick(p)} />)
            }
          </div>
        </div>
      </div>
    </div>
  );
}
