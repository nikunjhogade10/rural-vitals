import { useState } from "react";
import { ArrowLeft, User, Phone, MapPin, Hash, Globe, ChevronRight } from "lucide-react";
import { LanguageSwitcher } from "../LanguageSwitcher";
import { useLocalData } from "../../context/LocalDataContext";
import { useAuth } from "../../context/AuthContext";
import { useI18n } from "../../context/I18nContext";

interface PatientRegistrationProps {
  onBack: () => void;
  onContinue: () => void;
  currentLang: string;
  onChangeLang: (lang: string) => void;
}


const LANGS_OPTIONS = ["English", "Hindi / हिंदी", "Marathi / मराठी", "Kannada / ಕನ್ನಡ", "Telugu / తెలుగు", "Tamil / தமிழ்", "Gujarati / ગુજરાતી", "Bengali / বাংলা"];

const labelMap: Record<string, Record<string, string>> = {
  en: { name: "Patient Name", age: "Age", gender: "Gender", mobile: "Mobile Number", address: "Address", healthId: "Aadhaar / Health ID (Optional)", prefLang: "Preferred Language", commLang: "Communication Language" },
  hi: { name: "मरीज का नाम / Patient Name", age: "आयु / Age", gender: "लिंग / Gender", mobile: "मोबाइल नंबर / Mobile", address: "पता / Address", healthId: "आधार / Health ID (वैकल्पिक)", prefLang: "पसंदीदा भाषा / Preferred Language", commLang: "संपर्क भाषा / Communication Language" },
  mr: { name: "रुग्णाचे नाव / Patient Name", age: "वय / Age", gender: "लिंग / Gender", mobile: "मोबाइल नंबर / Mobile", address: "पत्ता / Address", healthId: "आधार / Health ID (ऐच्छिक)", prefLang: "पसंतीची भाषा / Preferred Language", commLang: "संपर्क भाषा / Communication Language" },
};

const Field = ({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) => (
  <div>
    <label style={{ display: "block", color: "#637074", fontSize: 13, marginBottom: 8 }}>{label}</label>
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        background: "#f4f7f4",
        border: "1.5px solid rgba(0,0,0,0.07)",
        borderRadius: 12,
        padding: "13px 16px",
      }}
    >
      <span style={{ color: "#8a9aaa", flexShrink: 0 }}>{icon}</span>
      {children}
    </div>
  </div>
);

export function PatientRegistration({ onBack, onContinue, currentLang, onChangeLang }: PatientRegistrationProps) {
  const { addPatient } = useLocalData();
  const { user } = useAuth();
  const { t, locale, setLocale } = useI18n();
  const [form, setForm] = useState({ name: "", age: "", gender: "", mobile: "", address: "", healthId: "", prefLang: "English", commLang: "English" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  // Use I18nContext locale as primary, fall back to currentLang prop
  const labels = labelMap[locale] || labelMap[currentLang] || labelMap["en"];

  const progress = [form.name, form.age, form.gender, form.mobile, form.address].filter(Boolean).length / 5;

  const handleSave = async () => {
    if (!form.name.trim() || !form.age || !form.gender) {
      setError('Patient name, age, and gender are required.');
      return;
    }
    setError('');
    setSaving(true);
    try {
      const patient = await addPatient({
        fullName: form.name.trim(),
        age: parseInt(form.age, 10),
        gender: form.gender === 'M' ? 'MALE' : form.gender === 'F' ? 'FEMALE' : 'OTHER',
        phone: form.mobile || undefined,
        address: form.address || undefined,
        healthId: form.healthId || undefined,
        preferredLanguage: form.prefLang,
        communicationLanguage: form.commLang,
        facilityId: user?.facilityId as string | undefined,
      });
      // Pass patient id to vitals step via sessionStorage
      sessionStorage.setItem('rcl_draft_patientId', patient.id);
      sessionStorage.setItem('rcl_draft_patientName', patient.fullName);
      onContinue();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(`Save failed: ${msg}. Try closing other tabs and reloading.`);
      console.error('[PatientRegistration] IDB save error:', e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: "#fff" }}>
      {/* Header */}
      <div
        style={{
          background: "#2E7D32",
          padding: "48px 20px 20px",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <button onClick={onBack} style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 10, padding: "8px 12px", cursor: "pointer", color: "#fff", display: "flex", alignItems: "center", gap: 6, fontSize: 14 }}>
            <ArrowLeft size={16} /> Back
          </button>
          <LanguageSwitcher currentLang={currentLang} onChangeLang={onChangeLang} />
        </div>
        <div>
          <h2 style={{ color: "#fff", margin: "0 0 4px", fontSize: 20 }}>Register Patient</h2>
          <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, margin: 0 }}>Step 1 of 2 — Patient Information</p>
        </div>

        {/* Progress bar */}
        <div style={{ height: 6, background: "rgba(255,255,255,0.25)", borderRadius: 999 }}>
          <div style={{ height: "100%", width: `${progress * 100}%`, background: "#a5d6a7", borderRadius: 999, transition: "width 0.3s" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          {["Patient Info", "Vitals & Symptoms"].map((step, i) => (
            <span key={step} style={{ fontSize: 11, color: i === 0 ? "#fff" : "rgba(255,255,255,0.5)", fontWeight: i === 0 ? 600 : 400 }}>
              {step}
            </span>
          ))}
        </div>
      </div>

      {/* Form */}
      <div style={{ flex: 1, overflowY: "auto", padding: "24px 20px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Field label={labels.name} icon={<User size={18} />}>
            <input
              type="text"
              placeholder="e.g. Sunita Devi"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              style={{ border: "none", background: "none", outline: "none", fontSize: 15, color: "#1a2332", width: "100%" }}
            />
          </Field>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label={labels.age} icon={<span style={{ fontSize: 16 }}>📅</span>}>
              <input
                type="number"
                placeholder="Years"
                value={form.age}
                onChange={e => setForm({ ...form, age: e.target.value })}
                style={{ border: "none", background: "none", outline: "none", fontSize: 15, color: "#1a2332", width: "100%" }}
              />
            </Field>
            <div>
              <label style={{ display: "block", color: "#637074", fontSize: 13, marginBottom: 8 }}>{labels.gender}</label>
              <div style={{ display: "flex", gap: 8 }}>
                {["M", "F", "Other"].map(g => (
                  <button
                    key={g}
                    onClick={() => setForm({ ...form, gender: g })}
                    style={{
                      flex: 1,
                      padding: "13px 4px",
                      borderRadius: 12,
                      border: form.gender === g ? "2px solid #2E7D32" : "1.5px solid rgba(0,0,0,0.08)",
                      background: form.gender === g ? "#e8f5e9" : "#f4f7f4",
                      color: form.gender === g ? "#2E7D32" : "#637074",
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <Field label={labels.mobile} icon={<Phone size={18} />}>
            <input
              type="tel"
              placeholder="+91 9876543210"
              value={form.mobile}
              onChange={e => setForm({ ...form, mobile: e.target.value })}
              style={{ border: "none", background: "none", outline: "none", fontSize: 15, color: "#1a2332", width: "100%" }}
            />
          </Field>

          <Field label={labels.address} icon={<MapPin size={18} />}>
            <textarea
              placeholder="Village, Block, District"
              value={form.address}
              onChange={e => setForm({ ...form, address: e.target.value })}
              rows={2}
              style={{ border: "none", background: "none", outline: "none", fontSize: 15, color: "#1a2332", width: "100%", resize: "none" }}
            />
          </Field>

          <Field label={labels.healthId} icon={<Hash size={18} />}>
            <input
              type="text"
              placeholder="XXXX-XXXX-XXXX"
              value={form.healthId}
              onChange={e => setForm({ ...form, healthId: e.target.value })}
              style={{ border: "none", background: "none", outline: "none", fontSize: 15, color: "#1a2332", width: "100%" }}
            />
          </Field>

          {/* Language section */}
          <div style={{ background: "#e3f2fd", borderRadius: 12, padding: "16px", border: "1px solid #90caf9" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <Globe size={16} color="#1565C0" />
              <span style={{ fontSize: 13, fontWeight: 600, color: "#1565C0" }}>Patient Language Preference</span>
            </div>
            {[
              { key: "prefLang", label: labels.prefLang },
              { key: "commLang", label: labels.commLang },
            ].map(({ key, label }) => (
              <div key={key} style={{ marginBottom: key === "prefLang" ? 12 : 0 }}>
                <label style={{ display: "block", color: "#637074", fontSize: 12, marginBottom: 6 }}>{label}</label>
                <select
                  value={form[key as keyof typeof form]}
                  onChange={e => setForm({ ...form, [key]: e.target.value })}
                  style={{
                    width: "100%",
                    background: "#fff",
                    border: "1.5px solid rgba(0,0,0,0.08)",
                    borderRadius: 10,
                    padding: "11px 14px",
                    fontSize: 14,
                    color: "#1a2332",
                    outline: "none",
                  }}
                >
                  {LANGS_OPTIONS.map(l => <option key={l}>{l}</option>)}
                </select>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding: "0 20px 8px" }}>
          <div style={{ background: "#ffebee", border: "1px solid #ef9a9a", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#c62828" }}>
            {error}
          </div>
        </div>
      )}

      {/* CTA */}
      <div style={{ padding: "16px 20px 32px" }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            width: "100%",
            padding: "16px",
            background: saving ? "#81c784" : "#2E7D32",
            color: "#fff",
            border: "none",
            borderRadius: 12,
            fontSize: 16,
            fontWeight: 600,
            cursor: saving ? "default" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          {saving ? 'Saving locally…' : <><span>Save & Continue</span> <ChevronRight size={20} /></>}
        </button>
        <p style={{ textAlign: "center", color: "#8a9aaa", fontSize: 12, margin: "8px 0 0" }}>
          Saved to local storage — synced when connected
        </p>
      </div>
    </div>
  );
}

