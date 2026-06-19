import { useState, useMemo } from "react";
import { Search, ArrowLeft, Plus } from "lucide-react";
import { LanguageSwitcher } from "../LanguageSwitcher";
import { PatientCard, Patient } from "../PatientCard";
import { useLocalData } from "../../context/LocalDataContext";
import { useI18n } from "../../context/I18nContext";

interface PatientCaseListProps {
  onBack: () => void;
  onPatientClick: (patient: Patient) => void;
  onRegisterNew?: () => void;
  currentLang: string;
  onChangeLang: (lang: string) => void;
}

export function PatientCaseList({ onBack, onPatientClick, onRegisterNew, currentLang, onChangeLang }: PatientCaseListProps) {
  const { visits, patients, loading } = useLocalData();
  const [query, setQuery] = useState("");
  const [syncFilter, setSyncFilter] = useState<string>("All");
  const { t, locale, setLocale } = useI18n();

  // Translated filters mapping
  const FILTER_DEFS = [
    { value: "All",          key: "cases_all",     label: "All" },
    { value: "Pending Sync", key: "cases_pending", label: "Pending Sync" },
    { value: "Synced",       key: "cases_synced",  label: "Synced" },
    { value: "Reviewed",     key: "cases_reviewed", label: "Reviewed" }
  ];

  // Build patient-visit combined display list from local data
  const caseList = useMemo(() => {
    // Get the latest visit per patient
    const visitMap = new Map<string, typeof visits[0]>();
    for (const v of visits) {
      if (!visitMap.has(v.patientId) || v.createdAt > visitMap.get(v.patientId)!.createdAt) {
        visitMap.set(v.patientId, v);
      }
    }

    const patientMap = new Map(patients.map(p => [p.id, p]));
    const rows: Patient[] = [];

    // Patients with visits
    for (const [patientId, visit] of visitMap) {
      const patient = patientMap.get(patientId);
      const displayName = patient?.fullName || 'Unknown';
      
      let syncStatus: 'pending' | 'synced' | 'reviewed' = 'pending';
      if (visit.syncStatus === 'synced') {
        if (visit.status === 'REVIEWED' || visit.status === 'COMPLETED') {
          syncStatus = 'reviewed';
        } else {
          syncStatus = 'synced';
        }
      } else {
        syncStatus = 'pending';
      }

      if (syncFilter === "Pending Sync" && syncStatus !== 'pending') continue;
      if (syncFilter === "Synced" && syncStatus !== 'synced') continue;
      if (syncFilter === "Reviewed" && syncStatus !== 'reviewed') continue;

      const q = query.toLowerCase();
      if (q && !displayName.toLowerCase().includes(q) && !visit.chiefComplaint.toLowerCase().includes(q)) continue;

      rows.push({
        id: visit.id,
        name: displayName,
        age: patient?.age || 0,
        gender: patient?.gender === 'MALE' ? t('reg_gender_male', 'Male') : patient?.gender === 'FEMALE' ? t('reg_gender_female', 'Female') : t('reg_gender_other', 'Other'),
        date: new Date(visit.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
        status: syncStatus,
        condition: visit.chiefComplaint,
        language: patient?.preferredLanguage,
      });
    }

    // Patients with no visits yet
    for (const p of patients) {
      if (visitMap.has(p.id)) continue;

      let syncStatus: 'pending' | 'synced' | 'reviewed' = 'pending';
      if (p.syncStatus === 'synced') {
        syncStatus = 'synced';
      } else {
        syncStatus = 'pending';
      }

      if (syncFilter === "Pending Sync" && syncStatus !== 'pending') continue;
      if (syncFilter === "Synced" && syncStatus !== 'synced') continue;
      if (syncFilter === "Reviewed" && syncStatus !== 'reviewed') continue;

      const q = query.toLowerCase();
      if (q && !p.fullName.toLowerCase().includes(q)) continue;

      rows.push({
        id: p.id,
        name: p.fullName,
        age: p.age,
        gender: p.gender === 'MALE' ? t('reg_gender_male', 'Male') : p.gender === 'FEMALE' ? t('reg_gender_female', 'Female') : t('reg_gender_other', 'Other'),
        date: new Date(p.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
        status: syncStatus,
        condition: t('cases_no_visit_recorded', 'Registration only — no visit recorded'),
        language: p.preferredLanguage,
      });
    }

    return rows.sort((a, b) => b.date.localeCompare(a.date));
  }, [visits, patients, query, syncFilter, t]);

  const pendingCount = visits.filter(v => v.syncStatus === 'pending').length + patients.filter(p => p.syncStatus === 'pending').length;

  const handleLangChange = (lang: string) => {
    setLocale(lang);
    onChangeLang(lang);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: "#f4f7f4", paddingBottom: 80 }}>
      {/* Header */}
      <div style={{ background: "#2E7D32", padding: "48px 20px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <button onClick={onBack} style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 10, padding: "8px 12px", cursor: "pointer", color: "#fff", display: "flex", alignItems: "center", gap: 6, fontSize: 14 }}>
            <ArrowLeft size={16} /> {t('back', 'Back')}
          </button>
          <LanguageSwitcher currentLang={locale} onChangeLang={handleLangChange} />
        </div>
        <h2 style={{ color: "#fff", margin: "0 0 4px", fontSize: 20 }}>{t('cases_title', 'Patient Cases')}</h2>
        <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, margin: 0 }}>
          {caseList.length} {t('cases_records', 'records')} · {pendingCount} {t('dashboard_pending_sync_label', 'pending sync')}
        </p>
      </div>

      {/* Search + Filter */}
      <div style={{ padding: "16px 20px 0", display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#fff", border: "1.5px solid rgba(0,0,0,0.07)", borderRadius: 12, padding: "12px 16px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <Search size={18} color="#8a9aaa" />
          <input
            type="text"
            placeholder={t('search_placeholder', 'Search by name or complaint…')}
            value={query}
            onChange={e => setQuery(e.target.value)}
            style={{ border: "none", background: "none", outline: "none", fontSize: 15, color: "#1a2332", width: "100%" }}
          />
        </div>
        <div style={{ display: "flex", gap: 8, overflowX: "auto" }}>
          {FILTER_DEFS.map(f => (
            <button key={f.value} onClick={() => setSyncFilter(f.value)}
              style={{ padding: "7px 14px", borderRadius: 999, border: syncFilter === f.value ? "1.5px solid #2E7D32" : "1.5px solid rgba(0,0,0,0.1)", background: syncFilter === f.value ? "#e8f5e9" : "#fff", color: syncFilter === f.value ? "#2E7D32" : "#637074", fontSize: 12, fontWeight: syncFilter === f.value ? 600 : 400, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>
              {t(f.key, f.label)}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div style={{ flex: 1, padding: "12px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
        {loading ? (
          [0, 1, 2].map(i => (
            <div key={i} style={{ background: "#fff", borderRadius: 12, height: 80, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", opacity: 0.6 }} />
          ))
        ) : caseList.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#8a9aaa" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🗂️</div>
            <div style={{ fontWeight: 600, marginBottom: 6, color: "#1a2332" }}>
              {query || syncFilter !== "All" ? t('cases_no_matching', 'No matching records') : t('cases_empty', 'No patients registered yet')}
            </div>
            <div style={{ fontSize: 13 }}>
              {!query && syncFilter === "All" ? t('cases_start_instruction', 'Register a new patient to get started') : t('cases_try_different_filter', 'Try a different filter')}
            </div>
          </div>
        ) : (
          caseList.map(p => (
            <PatientCard key={p.id} patient={p} onClick={() => onPatientClick(p)} />
          ))
        )}
      </div>

      {/* Register new patient FAB */}
      {onRegisterNew && (
        <button
          onClick={onRegisterNew}
          style={{ position: "fixed", bottom: 90, right: "max(16px, calc(50vw - 215px + 16px))", background: "#2E7D32", color: "#fff", border: "none", borderRadius: 14, padding: "12px 18px", fontSize: 14, fontWeight: 600, cursor: "pointer", boxShadow: "0 4px 16px rgba(46,125,50,0.35)", display: "flex", alignItems: "center", gap: 8, zIndex: 90 }}
        >
          <Plus size={18} /> {t('dashboard_register', 'Register Patient')}
        </button>
      )}
    </div>
  );
}
