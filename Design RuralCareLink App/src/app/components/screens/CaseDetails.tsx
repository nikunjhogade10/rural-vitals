import { useState, useEffect } from "react";
import { ArrowLeft, Thermometer, Activity, Heart, Droplets, Weight, ChevronRight, FileText } from "lucide-react";
import { StatusBadge } from "../StatusBadge";
import { visitService } from "../../services";
import { getVisitById, getPatientById, getReportsByPatient, getReportById, getAllVisits } from "../../db/localDB";
import { useLocalData } from "../../context/LocalDataContext";
import { ReportUpload } from "../ReportUpload";

interface CaseDetailsProps {
  visitId: string;
  onBack: () => void;
  onStartCall?: (patientName: string) => void;
}

export function CaseDetails({ visitId, onBack, onStartCall }: CaseDetailsProps) {
  const [localVisit, setLocalVisit] = useState<any | null>(null);
  const [localPatient, setLocalPatient] = useState<any | null>(null);
  const [localReports, setLocalReports] = useState<any[]>([]);
  const [serverVisit, setServerVisit] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = async () => {
    if (!visitId) return;
    try {
      // 1. Load local visit
      const lv = await getVisitById(visitId);
      if (!lv) {
        // Try to check if we can query by serverId if visitId is a server ID
        const all = await getAllVisits();
        const found = all.find(v => v.id === visitId || v.serverId === visitId);
        if (found) {
          setLocalVisit(found);
          const lp = await getPatientById(found.patientId);
          setLocalPatient(lp);
          const lr = await getReportsByPatient(found.patientId);
          setLocalReports(lr.filter((r: any) => r.visitId === found.id));
        } else {
          setError("Case not found locally.");
        }
        return;
      }
      setLocalVisit(lv);

      // 2. Load local patient
      const lp = await getPatientById(lv.patientId);
      setLocalPatient(lp);

      // 3. Load local reports
      const lr = await getReportsByPatient(lv.patientId);
      setLocalReports(lr.filter((r: any) => r.visitId === lv.id));
    } catch (err) {
      console.error(err);
      setError("Failed to load local data");
    }
  };

  useEffect(() => {
    async function init() {
      setLoading(true);
      setError("");
      await loadData();
      setLoading(false);
    }
    init();
  }, [visitId]);

  // Background fetch server updates if online and visit is synced
  useEffect(() => {
    if (!localVisit || localVisit.syncStatus !== 'synced' || !localVisit.serverId) return;

    async function fetchServerUpdates() {
      try {
        const data = await visitService.get(localVisit.serverId);
        if (data && data.visit) {
          setServerVisit(data.visit);

          // Update local IndexedDB with the latest status and doctor review fields
          const open = await import("idb").then(m => m.openDB);
          const db = await open('ruralcarelink', 2);
          const updatedVisit = {
            ...localVisit,
            status: data.visit.status,
            visitNumber: data.visit.visitNumber,
            vitalRecords: data.visit.vitalRecords,
            consultationNotes: data.visit.consultationNotes,
            prescriptions: data.visit.prescriptions,
            consultationMode: data.visit.consultationMode,
            networkStatus: data.visit.networkStatus,
          };
          await db.put('visits', updatedVisit);
          setLocalVisit(updatedVisit);
        }
      } catch (err) {
        console.warn("Could not fetch server updates for visit:", err);
      }
    }

    fetchServerUpdates();
    const interval = setInterval(fetchServerUpdates, 3000);
    return () => clearInterval(interval);
  }, [localVisit?.serverId]);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#f4f7f4" }}>
        <div style={{ textAlign: "center", color: "#637074" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>⏳</div>
          <div>Loading case…</div>
        </div>
      </div>
    );
  }

  if (error || !localVisit) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#f4f7f4", flexDirection: "column", gap: 16 }}>
        <div style={{ fontSize: 40 }}>⚠️</div>
        <div style={{ color: "#c62828" }}>{error || "Case not found"}</div>
        <button onClick={onBack} style={{ padding: "10px 20px", background: "#2E7D32", color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 600 }}>Back</button>
      </div>
    );
  }

  const patient = localPatient || {};
  const status = localVisit.status || (localVisit.syncStatus === 'synced' ? 'SYNCED' : 'PENDING_SYNC');

  // Vitals: server data takes precedence, otherwise local fields
  const vitalsList = (serverVisit?.vitalRecords && serverVisit.vitalRecords.length > 0)
    ? serverVisit.vitalRecords
    : (localVisit.vitalRecords && localVisit.vitalRecords.length > 0)
      ? localVisit.vitalRecords
      : [
          {
            temperature: localVisit.temperature,
            systolicBP: localVisit.systolicBP,
            diastolicBP: localVisit.diastolicBP,
            pulse: localVisit.pulse,
            spo2: localVisit.spo2,
            weight: localVisit.weight,
          }
        ];
  const vitals = vitalsList[0] || {};

  // Notes: server notes takes precedence, otherwise local chiefComplaint & notes
  const notes = serverVisit?.consultationNotes || localVisit.consultationNotes || [];
  const displayNotes = [...notes];
  if (displayNotes.length === 0 && localVisit.notes) {
    displayNotes.push({
      id: 'local-note',
      authorRole: 'HEALTH_WORKER',
      noteType: 'clinical_notes',
      content: localVisit.notes,
    });
  }

  const prescriptions = serverVisit?.prescriptions || localVisit.prescriptions || [];

  // Reports list: merge localReports and server images (VisitImage)
  const serverReports = serverVisit?.images || [];
  const allReports = [...localReports];

  // Merge server images if they are not already in localReports (match by filename or id)
  for (const sr of serverReports) {
    if (!allReports.some(r => r.fileName === sr.filename || r.serverId === sr.id)) {
      allReports.push({
        id: sr.id,
        serverId: sr.id,
        fileName: sr.filename,
        fileSize: sr.sizeBytes || 0,
        mimeType: sr.mimeType,
        url: sr.url,
        syncStatus: 'synced',
      });
    }
  }



  function mapStatus(s: string): "pending" | "synced" | "reviewed" {
    if (localVisit.syncStatus !== 'synced') return "pending";
    if (s === "DRAFT" || s === "FAILED") return "pending";
    if (s === "REVIEWED" || s === "COMPLETED") return "reviewed";
    return "synced";
  }

  const openReport = async (report: any) => {
    if (report.id && !report.url) {
      // Local IDB fetch
      const rep = await getReportById(report.id);
      if (rep && rep.data) {
        const blob = new Blob([rep.data], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        return;
      }
    }
    if (report.url) {
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
      const host = apiBase.replace('/api', '');
      const fullUrl = report.url.startsWith('http') ? report.url : `${host}${report.url}`;
      window.open(fullUrl, '_blank');
    }
  };

  const VitalItem = ({ icon, label, value, unit }: { icon: React.ReactNode; label: string; value: any; unit?: string }) => (
    <div style={{ background: "#f4f7f4", borderRadius: 10, padding: "12px", display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ width: 36, height: 36, borderRadius: 9, background: "#e8f5e9", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{icon}</div>
      <div>
        <div style={{ fontSize: 11, color: "#8a9aaa" }}>{label}</div>
        <div style={{ fontSize: 16, fontWeight: 600, color: "#1a2332" }}>
          {value != null ? `${value}${unit ? ` ${unit}` : ""}` : "—"}
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: "#f4f7f4", paddingBottom: 32 }}>
      {serverVisit?.consultationMode === 'VIDEO' && serverVisit?.networkStatus !== 'ONLINE' && (
        <div style={{
          background: "#e3f2fd",
          borderBottom: "2px solid #90caf9",
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          boxShadow: "0 2px 4px rgba(0,0,0,0.08)",
          zIndex: 100
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 20, animation: "bounce 1s infinite" }}>📞</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#0d47a1" }}>Incoming Video Call</div>
              <div style={{ fontSize: 11, color: "#1565c0" }}>Doctor is calling for consultation</div>
            </div>
          </div>
          <button
            onClick={() => onStartCall?.(patient.fullName || "Patient")}
            style={{
              background: "#2e7d32",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "6px 14px",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            Accept
          </button>
        </div>
      )}
      {/* Header */}
      <div style={{ background: "#2E7D32", padding: "48px 20px 20px" }}>
        <div style={{ marginBottom: 16 }}>
          <button onClick={onBack} style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 10, padding: "8px 12px", cursor: "pointer", color: "#fff", display: "flex", alignItems: "center", gap: 6, fontSize: 14 }}>
            <ArrowLeft size={16} /> Back
          </button>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h2 style={{ color: "#fff", margin: 0, fontSize: 20 }}>{patient.fullName || "—"}</h2>
            <p style={{ color: "rgba(255,255,255,0.7)", margin: "4px 0 0", fontSize: 13 }}>
              {patient.age || "?"}y • {patient.gender ? (patient.gender.charAt(0) + patient.gender.slice(1).toLowerCase()) : "—"} • 🌐 {patient.preferredLanguage || "en"}
            </p>
          </div>
          <StatusBadge status={mapStatus(status)} />
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <div style={{ background: "rgba(255,255,255,0.15)", borderRadius: 8, padding: "8px 12px", display: "inline-block" }}>
            <span style={{ color: "rgba(255,255,255,0.75)", fontSize: 11 }}>Case ID: </span>
            <span style={{ color: "#fff", fontSize: 12, fontWeight: 600 }}>{localVisit.visitNumber || "Pending Sync"}</span>
          </div>
          {patient.phone && (
            <div style={{ background: "rgba(255,255,255,0.15)", borderRadius: 8, padding: "8px 12px", display: "inline-block" }}>
              <span style={{ color: "rgba(255,255,255,0.75)", fontSize: 11 }}>📞 </span>
              <span style={{ color: "#fff", fontSize: 12, fontWeight: 600 }}>{patient.phone}</span>
            </div>
          )}
        </div>

        {onStartCall && (
          <button
            onClick={() => localVisit.syncStatus === 'synced' && onStartCall(patient.fullName || "Patient")}
            disabled={localVisit.syncStatus !== 'synced'}
            style={{
              marginTop: 16,
              width: "100%",
              padding: "12px",
              background: localVisit.syncStatus === 'synced' ? "#fff" : "rgba(255,255,255,0.12)",
              color: localVisit.syncStatus === 'synced' ? "#2E7D32" : "rgba(255,255,255,0.5)",
              border: localVisit.syncStatus === 'synced' ? "none" : "1px dashed rgba(255,255,255,0.3)",
              borderRadius: 10,
              fontWeight: 600,
              fontSize: 14,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              cursor: localVisit.syncStatus === 'synced' ? "pointer" : "not-allowed",
              boxShadow: localVisit.syncStatus === 'synced' ? "0 4px 12px rgba(0, 0, 0, 0.12)" : "none",
              transition: "transform 0.1s, background-color 0.2s",
            }}
            onMouseDown={e => {
              if (localVisit.syncStatus === 'synced') {
                e.currentTarget.style.transform = "scale(0.98)";
              }
            }}
            onMouseUp={e => {
              if (localVisit.syncStatus === 'synced') {
                e.currentTarget.style.transform = "scale(1)";
              }
            }}
          >
            {localVisit.syncStatus === 'synced' ? "🎥 Start Video Consultation" : "🔒 Sync Case to Start Consultation"}
          </button>
        )}
      </div>

      <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Chief Complaint */}
        {(localVisit.chiefComplaint || localVisit.symptoms?.length > 0) && (
          <div style={{ background: "#fff", borderRadius: 14, padding: "16px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", border: "1px solid rgba(0,0,0,0.06)" }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: "#1a2332", marginBottom: 10 }}>Chief Complaint</div>
            {localVisit.chiefComplaint && <div style={{ fontSize: 14, color: "#637074", marginBottom: 8 }}>{localVisit.chiefComplaint}</div>}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {localVisit.symptoms?.map((s: string) => (
                <span key={s} style={{ background: "#fce4ec", color: "#c2185b", padding: "4px 10px", borderRadius: 999, fontSize: 12, fontWeight: 500 }}>{s}</span>
              ))}
            </div>
          </div>
        )}

        {/* Vitals */}
        <div style={{ background: "#fff", borderRadius: 14, padding: "16px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", border: "1px solid rgba(0,0,0,0.06)" }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: "#1a2332", marginBottom: 12 }}>Vital Signs</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <VitalItem icon={<Thermometer size={16} color="#e53935" />} label="Temperature" value={vitals.temperature} unit="°F" />
            <VitalItem icon={<Activity size={16} color="#1565C0" />} label="BP" value={vitals.systolicBP && vitals.diastolicBP ? `${vitals.systolicBP}/${vitals.diastolicBP}` : null} unit="mmHg" />
            <VitalItem icon={<Heart size={16} color="#e91e63" />} label="Pulse" value={vitals.pulse} unit="bpm" />
            <VitalItem icon={<Droplets size={16} color="#0288d1" />} label="SpO₂" value={vitals.spo2} unit="%" />
            <VitalItem icon={<Weight size={16} color="#2E7D32" />} label="Weight" value={vitals.weight} unit="kg" />
          </div>
        </div>

        {/* Medical Reports Section */}
        <div style={{ background: "#fff", borderRadius: 14, padding: "16px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", border: "1px solid rgba(0,0,0,0.06)" }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: "#1a2332", marginBottom: 12 }}>Medical Reports</div>
          
          {/* List of Reports */}
          {allReports.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
              {allReports.map((r, i) => (
                <div
                  key={r.id || i}
                  onClick={() => openReport(r)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    background: '#f4f7f4',
                    borderRadius: 10,
                    padding: '10px 12px',
                    border: '1px solid rgba(0,0,0,0.06)',
                    cursor: 'pointer',
                    transition: 'background 0.15s'
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#e8f5e9')}
                  onMouseLeave={e => (e.currentTarget.style.background = '#f4f7f4')}
                >
                  <FileText size={18} color="#1565C0" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#1a2332', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.fileName}
                    </div>
                    <div style={{ fontSize: 11, color: '#8a9aaa' }}>
                      {r.fileSize ? `${(r.fileSize / 1024).toFixed(1)} KB` : ''} · PDF
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: 11, color: r.syncStatus === 'synced' ? '#2E7D32' : '#f57f17', fontWeight: 500 }}>
                      {r.syncStatus === 'synced' ? 'Uploaded' : 'Pending sync'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: 13, color: '#8a9aaa', margin: '0 0 12px' }}>No report file attached</p>
          )}

          {/* Upload New Report Option */}
          <ReportUpload
            patientId={localVisit.patientId}
            visitId={localVisit.id}
            onSaved={async () => {
              // Reload reports list immediately
              const lr = await getReportsByPatient(localVisit.patientId);
              setLocalReports(lr.filter((r: any) => r.visitId === localVisit.id));
            }}
          />
        </div>

        {/* Doctor Notes */}
        {displayNotes.length > 0 && (
          <div style={{ background: "#fff", borderRadius: 14, padding: "16px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", border: "1px solid rgba(0,0,0,0.06)" }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: "#1a2332", marginBottom: 10 }}>Clinical Notes</div>
            {displayNotes.map((note, i) => (
              <div key={note.id || i} style={{ background: "#f4f7f4", borderRadius: 10, padding: "12px", marginBottom: 8 }}>
                <div style={{ fontSize: 11, color: "#8a9aaa", marginBottom: 4 }}>
                  {note.authorRole === "DOCTOR" ? "👨‍⚕️ Doctor" : "👩‍⚕️ Health Worker"} • {note.noteType || "Notes"}
                </div>
                <div style={{ fontSize: 13, color: "#1a2332", lineHeight: 1.5 }}>{note.content}</div>
              </div>
            ))}
          </div>
        )}

        {/* Prescriptions */}
        {status === 'REVIEWED' && prescriptions.length > 0 && (
          <div style={{ background: "#fff", borderRadius: 14, padding: "16px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", border: "1px solid rgba(0,0,0,0.06)" }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: "#1a2332", marginBottom: 10 }}>💊 Prescriptions</div>
            {prescriptions.map((p, i) => (
              <div key={p.id || i} style={{ borderLeft: "3px solid #2E7D32", paddingLeft: 12, marginBottom: 10 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#1a2332" }}>{p.medicationName}</div>
                <div style={{ fontSize: 12, color: "#637074", marginTop: 2 }}>
                  {[p.dosage, p.frequency, p.duration].filter(Boolean).join(" • ")}
                </div>
                {p.instructions && <div style={{ fontSize: 12, color: "#8a9aaa", marginTop: 2 }}>{p.instructions}</div>}
              </div>
            ))}
          </div>
        )}

        {/* Follow-up */}
        {localVisit.followUpDate && (
          <div style={{ background: "#fff3e0", border: "1.5px solid #ffcc80", borderRadius: 12, padding: "14px 16px", display: "flex", alignItems: "center", gap: 10 }}>
            <ChevronRight size={18} color="#f57f17" />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#e65100" }}>Follow-up Scheduled</div>
              <div style={{ fontSize: 12, color: "#f57f17", marginTop: 2 }}>
                {new Date(localVisit.followUpDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
