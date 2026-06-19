import { useState } from "react";
import { ArrowLeft, Thermometer, Activity, Wind, Weight, Save } from "lucide-react";
import { useLocalData } from "../../context/LocalDataContext";
import { useI18n } from "../../context/I18nContext";
import { ReportUpload } from "../ReportUpload";
import { linkReportsToVisit } from "../../db/localDB";

// Symptom translation keys — match keys in translations.ts
const SYMPTOM_KEYS: Array<{ key: string; en: string }> = [
  { key: "sym_fever",          en: "Fever" },
  { key: "sym_cough",          en: "Cough" },
  { key: "sym_cold",           en: "Cold" },
  { key: "sym_headache",       en: "Headache" },
  { key: "sym_body_pain",      en: "Body Pain" },
  { key: "sym_vomiting",       en: "Vomiting" },
  { key: "sym_diarrhea",       en: "Diarrhea" },
  { key: "sym_chest_pain",     en: "Chest Pain" },
  { key: "sym_breathlessness", en: "Breathlessness" },
  { key: "sym_fatigue",        en: "Fatigue" },
  { key: "sym_dizziness",      en: "Dizziness" },
  { key: "sym_rash",           en: "Rash" },
  { key: "sym_swelling",       en: "Swelling" },
  { key: "sym_abdominal_pain", en: "Abdominal Pain" },
];

interface SymptomsVitalsProps {
  onBack: () => void;
  onSave: () => void;
}

// ── Stable module-level component ─────────────────────────
// IMPORTANT: defined OUTSIDE SymptomsVitals so React always
// sees the same component type and never unmounts/remounts
// the <input> on state change (which would lose cursor focus).
function VitalInput({ label, icon, value, onChange, unit, placeholder }: {
  label: string;
  icon: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  unit: string;
  placeholder: string;
}) {
  return (
    <div style={{ background: "#fff", borderRadius: 12, padding: "14px 16px", border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{ color: "#2E7D32" }}>{icon}</span>
        <span style={{ fontSize: 12, color: "#637074", fontWeight: 500 }}>{label}</span>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
        <input
          type="number"
          placeholder={placeholder}
          value={value}
          onChange={e => onChange(e.target.value)}
          style={{ border: "none", outline: "none", fontSize: 24, fontWeight: 700, color: "#1a2332", width: "100%", background: "none" }}
        />
        <span style={{ fontSize: 13, color: "#8a9aaa", flexShrink: 0 }}>{unit}</span>
      </div>
    </div>
  );
}


export function SymptomsVitals({ onBack, onSave }: SymptomsVitalsProps) {
  const { addVisit } = useLocalData();
  const { t } = useI18n();
  const [vitals, setVitals] = useState({ temp: "", bpSys: "", bpDia: "", pulse: "", spo2: "", weight: "" });
  const [selected, setSelected] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [uploadedReportIds, setUploadedReportIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Retrieve patient id saved by PatientRegistration
  const patientId = sessionStorage.getItem('rcl_draft_patientId') || '';
  const patientName = sessionStorage.getItem('rcl_draft_patientName') || 'Patient';

  // Toggle uses the English key for storage; display label is translated
  const toggleSymptom = (englishName: string) => {
    setSelected(prev => prev.includes(englishName) ? prev.filter(x => x !== englishName) : [...prev, englishName]);
  };

  const handleSave = async () => {
    if (!patientId) {
      setError('No patient record found. Go back and register the patient first.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const visit = await addVisit({
        patientId,
        chiefComplaint: chiefComplaint.trim() || selected.join(', ') || 'General consultation',
        symptoms: selected,
        notes: notes.trim() || undefined,
        temperature: vitals.temp ? parseFloat(vitals.temp) : undefined,
        pulse: vitals.pulse ? parseFloat(vitals.pulse) : undefined,
        spo2: vitals.spo2 ? parseFloat(vitals.spo2) : undefined,
        systolicBP: vitals.bpSys ? parseInt(vitals.bpSys, 10) : undefined,
        diastolicBP: vitals.bpDia ? parseInt(vitals.bpDia, 10) : undefined,
        weight: vitals.weight ? parseFloat(vitals.weight) : undefined,
      });

      // Link any uploaded reports to this visit
      if (uploadedReportIds.length > 0) {
        await linkReportsToVisit(uploadedReportIds, visit.id);
      }

      // Save info for success screen
      sessionStorage.setItem('rcl_last_saved_name', patientName);
      sessionStorage.setItem('rcl_last_saved_symptoms', selected.map(s => {
        // Map symptom English names to translated versions if available
        const found = SYMPTOM_KEYS.find(k => k.en === s);
        return found ? t(found.key, s) : s;
      }).join(', ') || chiefComplaint || 'General');
      sessionStorage.setItem('rcl_last_saved_vitals', vitals.temp ? `Temp: ${vitals.temp}°F` : 'Recorded');
      sessionStorage.setItem('rcl_last_saved_time', new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) + ', ' + new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }));

      // Clear draft
      sessionStorage.removeItem('rcl_draft_patientId');
      sessionStorage.removeItem('rcl_draft_patientName');
      onSave();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(`Save failed: ${msg}. Try closing other tabs and reloading.`);
      console.error('[SymptomsVitals] IDB save error:', e);
    } finally {
      setSaving(false);
    }
  };


  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: "#f4f7f4" }}>
      {/* Header */}
      <div style={{ background: "#1565C0", padding: "48px 20px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <button onClick={onBack} style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 10, padding: "8px 12px", cursor: "pointer", color: "#fff", display: "flex", alignItems: "center", gap: 6, fontSize: 14 }}>
            <ArrowLeft size={16} /> Back
          </button>
          <div style={{ background: "#fff3e0", borderRadius: 8, padding: "4px 10px", display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#e65100", flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: "#e65100", fontWeight: 600 }}>Saved locally on submit</span>
          </div>
        </div>
        <h2 style={{ color: "#fff", margin: "0 0 4px", fontSize: 20 }}>Symptoms & Vitals</h2>
        <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, margin: 0 }}>Step 2 of 2 — {patientName}</p>
        <div style={{ height: 6, background: "rgba(255,255,255,0.25)", borderRadius: 999, marginTop: 16 }}>
          <div style={{ height: "100%", width: "100%", background: "#90caf9", borderRadius: 999 }} />
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
        {/* Chief Complaint */}
        <h3 style={{ color: "#1a2332", margin: "0 0 8px", fontSize: 15 }}>Chief Complaint</h3>
        <div style={{ background: "#fff", borderRadius: 12, padding: "14px 16px", border: "1px solid rgba(0,0,0,0.07)", marginBottom: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
          <input
            type="text"
            placeholder="e.g. Fever since 2 days, headache"
            value={chiefComplaint}
            onChange={e => setChiefComplaint(e.target.value)}
            style={{ border: "none", outline: "none", fontSize: 15, color: "#1a2332", width: "100%", background: "none" }}
          />
        </div>

        {/* Vitals */}
        <h3 style={{ color: "#1a2332", margin: "0 0 12px", fontSize: 15 }}>Vital Signs</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
          <VitalInput label="Temperature" icon={<Thermometer size={16} />} value={vitals.temp} onChange={v => setVitals(prev => ({ ...prev, temp: v }))} unit="°F" placeholder="98.6" />
          <VitalInput label="Pulse Rate" icon={<Activity size={16} />} value={vitals.pulse} onChange={v => setVitals(prev => ({ ...prev, pulse: v }))} unit="bpm" placeholder="72" />
          <VitalInput label="SpO₂" icon={<Wind size={16} />} value={vitals.spo2} onChange={v => setVitals(prev => ({ ...prev, spo2: v }))} unit="%" placeholder="98" />
          <VitalInput label="Weight" icon={<Weight size={16} />} value={vitals.weight} onChange={v => setVitals(prev => ({ ...prev, weight: v }))} unit="kg" placeholder="55" />
        </div>

        {/* Blood Pressure */}
        <div style={{ background: "#fff", borderRadius: 12, padding: "16px", border: "1px solid rgba(0,0,0,0.07)", marginBottom: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <Activity size={16} color="#c62828" />
            <span style={{ fontSize: 13, color: "#637074", fontWeight: 500 }}>Blood Pressure</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, color: "#8a9aaa", marginBottom: 4 }}>Systolic</div>
              <input type="number" placeholder="120" value={vitals.bpSys}
                onChange={e => setVitals({ ...vitals, bpSys: e.target.value })}
                style={{ border: "none", outline: "none", fontSize: 24, fontWeight: 700, color: "#1a2332", width: "100%", background: "none" }} />
            </div>
            <span style={{ fontSize: 24, color: "#d0d7e0", fontWeight: 300 }}>/</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, color: "#8a9aaa", marginBottom: 4 }}>Diastolic</div>
              <input type="number" placeholder="80" value={vitals.bpDia}
                onChange={e => setVitals({ ...vitals, bpDia: e.target.value })}
                style={{ border: "none", outline: "none", fontSize: 24, fontWeight: 700, color: "#1a2332", width: "100%", background: "none" }} />
            </div>
            <span style={{ fontSize: 16, color: "#8a9aaa" }}>mmHg</span>
          </div>
        </div>

        {/* Symptoms */}
        <h3 style={{ color: "#1a2332", margin: "0 0 12px", fontSize: 15 }}>{t('vitals_symptoms', 'Symptoms')}</h3>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
          {SYMPTOM_KEYS.map(({ key, en }) => {
            const isSelected = selected.includes(en);
            const label = t(key, en);
            return (
              <button key={en} onClick={() => toggleSymptom(en)}
                style={{ padding: "8px 14px", borderRadius: 999, border: isSelected ? "1.5px solid #2E7D32" : "1.5px solid rgba(0,0,0,0.1)", background: isSelected ? "#e8f5e9" : "#fff", color: isSelected ? "#2E7D32" : "#637074", fontSize: 13, fontWeight: isSelected ? 600 : 400, cursor: "pointer", transition: "all 0.15s" }}>
                {isSelected ? "✓ " : ""}{label}
              </button>
            );
          })}
        </div>

        {/* Clinical Notes */}
        <h3 style={{ color: "#1a2332", margin: "0 0 12px", fontSize: 15 }}>{t('vitals_notes', 'Clinical Notes')}</h3>
        <textarea
          placeholder="Additional observations, history, or clinical notes…"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={4}
          style={{ width: "100%", background: "#fff", border: "1.5px solid rgba(0,0,0,0.08)", borderRadius: 12, padding: "14px 16px", fontSize: 14, color: "#1a2332", outline: "none", resize: "none", boxSizing: "border-box", marginBottom: 20 }}
        />

        {/* Lab Report Upload */}
        {patientId && (
          <>
            <h3 style={{ color: "#1a2332", margin: "0 0 12px", fontSize: 15 }}>Attach Lab Report</h3>
            <ReportUpload
              patientId={patientId}
              visitId={undefined}
              onSaved={(id) => setUploadedReportIds(prev => [...prev, id])}
            />
          </>
        )}
      </div>

      {/* Save */}
      <div style={{ padding: "16px 20px 32px", background: "#fff", borderTop: "1px solid rgba(0,0,0,0.07)" }}>
        {error && (
          <div style={{ background: "#ffebee", border: "1px solid #ef9a9a", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#c62828", marginBottom: 12 }}>
            {error}
          </div>
        )}
        <button
          onClick={handleSave}
          disabled={saving}
          style={{ width: "100%", padding: "16px", background: saving ? "#e0e0e0" : "#e65100", color: saving ? "#9e9e9e" : "#fff", border: "none", borderRadius: 12, fontSize: 16, fontWeight: 600, cursor: saving ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
        >
          <Save size={20} />
          {saving ? 'Saving…' : 'Save Offline'}
        </button>
        <p style={{ textAlign: "center", color: "#8a9aaa", fontSize: 12, margin: "8px 0 0" }}>
          Data stored locally — will sync when connected
        </p>
      </div>
    </div>
  );
}
