import { CheckCircle, WifiOff, RefreshCw, LayoutDashboard } from "lucide-react";
import { useI18n } from "../../context/I18nContext";

interface OfflineSuccessProps {
  onSync: () => void;
  onDashboard: () => void;
}

export function OfflineSuccess({ onSync, onDashboard }: OfflineSuccessProps) {
  const { t } = useI18n();

  // Retrieve dynamic patient info saved by SymptomsVitals
  const patientName = sessionStorage.getItem('rcl_last_saved_name') || 'Patient';
  const symptoms = sessionStorage.getItem('rcl_last_saved_symptoms') || 'General';
  const vitals = sessionStorage.getItem('rcl_last_saved_vitals') || 'Recorded';
  const savedTime = sessionStorage.getItem('rcl_last_saved_time') || new Date().toLocaleString();

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        background: "#fff",
        padding: "32px 24px",
        textAlign: "center",
      }}
    >
      {/* Success illustration */}
      <div style={{ position: "relative", marginBottom: 32 }}>
        <div
          style={{
            width: 120,
            height: 120,
            borderRadius: "50%",
            background: "#e8f5e9",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <CheckCircle size={60} color="#2E7D32" fill="#c8e6c9" />
        </div>
        <div
          style={{
            position: "absolute",
            bottom: 4,
            right: 4,
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: "#fff3e0",
            border: "3px solid #fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <WifiOff size={16} color="#e65100" />
        </div>
      </div>

      {/* SVG illustration */}
      <svg width="200" height="100" viewBox="0 0 200 100" fill="none" style={{ marginBottom: 32 }}>
        <rect x="60" y="20" width="80" height="60" rx="8" fill="#f4f7f4" stroke="#2E7D32" strokeWidth="1.5" />
        <rect x="68" y="30" width="64" height="6" rx="3" fill="#a5d6a7" />
        <rect x="68" y="42" width="48" height="4" rx="2" fill="#c8e6c9" />
        <rect x="68" y="50" width="56" height="4" rx="2" fill="#c8e6c9" />
        <rect x="68" y="58" width="40" height="4" rx="2" fill="#c8e6c9" />
        <circle cx="160" cy="25" r="16" fill="#e8f5e9" />
        <path d="M153 25 l5 5 l8-10" stroke="#2E7D32" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <circle cx="35" cy="60" r="12" fill="#fff3e0" />
        <line x1="35" y1="54" x2="35" y2="60" stroke="#e65100" strokeWidth="2" strokeLinecap="round" />
        <line x1="35" y1="63" x2="35" y2="65" stroke="#e65100" strokeWidth="2" strokeLinecap="round" />
      </svg>

      {/* Offline badge */}
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          background: "#fff3e0",
          borderRadius: 999,
          padding: "6px 14px",
          marginBottom: 20,
        }}
      >
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#e65100" }} />
        <span style={{ fontSize: 13, color: "#e65100", fontWeight: 600 }}>{t('saved_locally', 'Saved Offline')}</span>
      </div>

      <h2 style={{ color: "#1a2332", margin: "0 0 12px", fontSize: 24 }}>{t('success_saved_title', 'Data Saved Successfully')}</h2>
      <p style={{ color: "#637074", fontSize: 15, margin: "0 0 12px", lineHeight: 1.6 }}>
        {t('success_saved_desc', 'Patient data saved locally on this device.')}
      </p>
      <p style={{ color: "#8a9aaa", fontSize: 13, margin: "0 0 48px" }}>
        {t('success_saved_sub', 'Connect to internet and tap "Sync Later" to upload records to the server.')}
      </p>

      {/* Info card */}
      <div
        style={{
          background: "#f4f7f4",
          borderRadius: 12,
          padding: "16px",
          width: "100%",
          marginBottom: 32,
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {[
          { label: t('reg_full_name', 'Patient'), value: patientName },
          { label: t('success_recorded_at', 'Recorded at'), value: savedTime },
          { label: t('vitals_signs', 'Vitals'), value: vitals },
          { label: t('vitals_symptoms', 'Symptoms'), value: symptoms },
        ].map(row => (
          <div key={row.label} style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
            <span style={{ color: "#8a9aaa" }}>{row.label}</span>
            <span style={{ color: "#1a2332", fontWeight: 500 }}>{row.value}</span>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%" }}>
        <button
          onClick={onSync}
          style={{
            padding: "15px",
            background: "#1565C0",
            color: "#fff",
            border: "none",
            borderRadius: 12,
            fontSize: 15,
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          <RefreshCw size={18} />
          {t('sync_now', 'Sync Later')}
        </button>
        <button
          onClick={onDashboard}
          style={{
            padding: "15px",
            background: "#f4f7f4",
            color: "#2E7D32",
            border: "1.5px solid #c8e6c9",
            borderRadius: 12,
            fontSize: 15,
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          <LayoutDashboard size={18} />
          {t('success_back_to_dashboard', 'Back to Dashboard')}
        </button>
      </div>
    </div>
  );
}
