import { useState, useEffect } from "react";
import { Search, Phone, MapPin, Globe, Activity, Thermometer, Wind, AlertCircle } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import api from "../services/api";

export function PatientHistory() {
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [selectedPatientDetails, setSelectedPatientDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    let active = true;
    const loadPatients = async () => {
      try {
        setLoading(true);
        const data = await api.get("/patients");
        if (!active) return;
        
        const patientList = data.patients || [];
        setPatients(patientList);
        if (patientList.length > 0) {
          setSelectedPatientId(patientList[0].id);
        }
        setError(null);
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Failed to load patients");
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    loadPatients();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!selectedPatientId) return;
    let active = true;
    const loadDetails = async () => {
      try {
        setLoadingDetails(true);
        const data = await api.get(`/patients/${selectedPatientId}`);
        if (!active) return;
        setSelectedPatientDetails(data.patient);
      } catch (err) {
        console.error("Failed to load patient details:", err);
      } finally {
        if (active) setLoadingDetails(false);
      }
    };
    loadDetails();
    return () => { active = false; };
  }, [selectedPatientId]);

  const filtered = patients.filter(p =>
    p.fullName.toLowerCase().includes(search.toLowerCase()) ||
    (p.village && p.village.toLowerCase().includes(search.toLowerCase()))
  );

  // Map selected details to view-friendly variables
  const selected = selectedPatientDetails ? {
    id: selectedPatientDetails.id,
    name: selectedPatientDetails.fullName,
    age: selectedPatientDetails.age,
    gender: selectedPatientDetails.gender,
    village: selectedPatientDetails.village || "Nandurbar",
    district: selectedPatientDetails.district || "Nandurbar",
    mobile: selectedPatientDetails.phone || "N/A",
    language: selectedPatientDetails.preferredLanguage === "hi" ? "Hindi" : selectedPatientDetails.preferredLanguage === "mr" ? "Marathi" : "English",
    phc: selectedPatientDetails.visits?.[0]?.facilityName || "PHC Nandurbar",
    condition: selectedPatientDetails.visits?.[0]?.chiefComplaint || "General Checkup",
    visits: (selectedPatientDetails.visits || []).map((v: any) => {
      const reviewNote = v.consultationNotes?.find((n: any) => n.noteType === 'doctor_review')?.content
        || v.consultationNotes?.find((n: any) => n.noteType === 'referral')?.content
        || "No review advice submitted yet.";
      
      return {
        date: v.createdAt ? v.createdAt.slice(0, 10) : "N/A",
        symptoms: v.chiefComplaint || "Routine consultation",
        advice: reviewNote,
        doctor: v.assignedDoctor?.fullName || "Assigned Specialist"
      };
    }),
    vitalsHistory: (selectedPatientDetails.visits || [])
      .filter((v: any) => v.vitalRecords && v.vitalRecords.length > 0)
      .map((v: any) => {
        const vr = v.vitalRecords[0];
        let bpSystolic = 120;
        if (vr.bloodPressure) {
          const parts = vr.bloodPressure.split("/");
          if (parts[0]) bpSystolic = parseInt(parts[0], 10) || 120;
        }
        return {
          date: v.createdAt ? new Date(v.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "N/A",
          bp: bpSystolic,
          temp: vr.temperature || 98.6,
          spo2: vr.spo2 || 98,
        };
      })
      .reverse()
  } : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <svg className="animate-spin h-8 w-8 text-[#1565C0]" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center text-[#D32F2F]">
        <AlertCircle className="w-10 h-10 mx-auto mb-2" />
        <p className="font-semibold">Failed to load patients</p>
        <p className="text-xs text-[#6b7a94] mt-1">{error}</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-[#1a2332]">Patient History</h1>
        <p className="text-[#6b7a94] text-sm mt-0.5">Complete medical history and vitals trends</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[280px_1fr] gap-5">
        {/* Patient list */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#6b7a94]" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search patients…"
              className="w-full pl-9 pr-3 py-2.5 rounded-lg border text-xs outline-none"
              style={{ borderColor: "rgba(21,101,192,0.15)", background: "#f8fafc" }}
            />
          </div>
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {filtered.map(p => (
              <button key={p.id} onClick={() => setSelectedPatientId(p.id)}
                className="w-full text-left p-4 rounded-xl border transition-all"
                style={{
                  borderColor: selectedPatientId === p.id ? "#1565C0" : "rgba(21,101,192,0.08)",
                  background: selectedPatientId === p.id ? "#e3f2fd" : "#fff",
                  boxShadow: "0 1px 4px rgba(21,101,192,0.06)"
                }}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0"
                    style={{ background: selectedPatientId === p.id ? "#1565C0" : "#90afd8" }}>
                    {(p.fullName || "Patient").split(" ").map((n: string) => n ? n[0] : "").join("").slice(0, 2)}
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium text-sm text-[#1a2332] truncate">{p.fullName}</div>
                    <div className="text-[11px] text-[#6b7a94] truncate">{p.age}y · {p.village || "Nandurbar"}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Patient detail */}
        <div className="space-y-4">
          {loadingDetails || !selected ? (
            <div className="bg-white rounded-xl p-12 border flex items-center justify-center min-h-[300px]" style={{ borderColor: "rgba(21,101,192,0.08)" }}>
              <svg className="animate-spin h-8 w-8 text-[#1565C0]" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            </div>
          ) : (
            <>
              {/* Overview */}
              <div className="bg-white rounded-xl p-5 border" style={{ borderColor: "rgba(21,101,192,0.08)", boxShadow: "0 1px 4px rgba(21,101,192,0.06)" }}>
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full flex items-center justify-center text-white text-lg font-semibold flex-shrink-0" style={{ background: "#1565C0" }}>
                      {(selected.name || "Patient").split(" ").map(n => n ? n[0] : "").join("").slice(0, 2)}
                    </div>
                    <div>
                      <h2 className="text-[#1a2332] text-base font-semibold">{selected.name}</h2>
                      <p className="text-[#6b7a94] text-sm mt-0.5">{selected.age}y · {selected.gender} · {selected.phc}</p>
                      <p className="text-xs text-[#4a5568] mt-1 font-medium">Primary Condition: {selected.condition}</p>
                      <div className="flex flex-wrap gap-3 mt-2">
                        <div className="flex items-center gap-1.5 text-xs text-[#6b7a94]"><Phone className="w-3 h-3" />{selected.mobile}</div>
                        <div className="flex items-center gap-1.5 text-xs text-[#6b7a94]"><MapPin className="w-3 h-3" />{selected.village}, {selected.district}</div>
                        <div className="flex items-center gap-1.5 text-xs text-[#6b7a94]"><Globe className="w-3 h-3" />{selected.language}</div>
                      </div>
                    </div>
                  </div>
                  <div className="text-left md:text-right border-t md:border-t-0 pt-3 md:pt-0 w-full md:w-auto">
                    <div className="text-xs text-[#6b7a94]">{selected.visits.length} visits total</div>
                    <div className="text-[11px] text-[#6b7a94] mt-0.5">Last Visit: {selected.visits[0]?.date || "N/A"}</div>
                  </div>
                </div>
              </div>

              {/* Vitals trends */}
              {selected.vitalsHistory.length > 0 && (
                <div className="bg-white rounded-xl p-5 border" style={{ borderColor: "rgba(21,101,192,0.08)", boxShadow: "0 1px 4px rgba(21,101,192,0.06)" }}>
                  <h3 className="text-[#1a2332] mb-4 font-semibold">Vitals Trend</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* BP */}
                    <div>
                      <div className="flex items-center gap-1.5 mb-2">
                        <Activity className="w-3.5 h-3.5" style={{ color: "#1565C0" }} />
                        <span className="text-xs font-medium text-[#4a5568]">Blood Pressure (systolic)</span>
                      </div>
                      <ResponsiveContainer width="100%" height={80}>
                        <LineChart data={selected.vitalsHistory} margin={{ top: 0, right: 4, left: -30, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(21,101,192,0.06)" />
                          <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#6b7a94" }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 9, fill: "#6b7a94" }} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
                          <Tooltip contentStyle={{ fontSize: 10, borderRadius: 6 }} />
                          <Line type="monotone" dataKey="bp" stroke="#1565C0" strokeWidth={2} dot={{ r: 3 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    {/* Temp */}
                    <div>
                      <div className="flex items-center gap-1.5 mb-2">
                        <Thermometer className="w-3.5 h-3.5" style={{ color: "#E65100" }} />
                        <span className="text-xs font-medium text-[#4a5568]">Temperature (°F)</span>
                      </div>
                      <ResponsiveContainer width="100%" height={80}>
                        <LineChart data={selected.vitalsHistory} margin={{ top: 0, right: 4, left: -30, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(21,101,192,0.06)" />
                          <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#6b7a94" }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 9, fill: "#6b7a94" }} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
                          <Tooltip contentStyle={{ fontSize: 10, borderRadius: 6 }} />
                          <Line type="monotone" dataKey="temp" stroke="#E65100" strokeWidth={2} dot={{ r: 3 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    {/* SpO2 */}
                    <div>
                      <div className="flex items-center gap-1.5 mb-2">
                        <Wind className="w-3.5 h-3.5" style={{ color: "#2E7D32" }} />
                        <span className="text-xs font-medium text-[#4a5568]">SpO₂ (%)</span>
                      </div>
                      <ResponsiveContainer width="100%" height={80}>
                        <LineChart data={selected.vitalsHistory} margin={{ top: 0, right: 4, left: -30, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(21,101,192,0.06)" />
                          <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#6b7a94" }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 9, fill: "#6b7a94" }} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
                          <Tooltip contentStyle={{ fontSize: 10, borderRadius: 6 }} />
                          <Line type="monotone" dataKey="spo2" stroke="#2E7D32" strokeWidth={2} dot={{ r: 3 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              )}

              {/* Visit Timeline */}
              <div className="bg-white rounded-xl p-5 border" style={{ borderColor: "rgba(21,101,192,0.08)", boxShadow: "0 1px 4px rgba(21,101,192,0.06)" }}>
                <h3 className="text-[#1a2332] mb-4 font-semibold">Visit History</h3>
                <div className="space-y-0">
                  {selected.visits.map((v, i) => (
                    <div key={i} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="w-3 h-3 rounded-full flex-shrink-0 mt-1" style={{ background: "#1565C0" }}></div>
                        {i < selected.visits.length - 1 && <div className="w-px flex-1 my-1" style={{ background: "rgba(21,101,192,0.2)", minHeight: "40px" }}></div>}
                      </div>
                      <div className="pb-5 flex-1">
                        <div className="flex flex-wrap items-center gap-3 mb-1">
                          <span className="text-xs font-semibold text-[#1a2332]">{v.date}</span>
                          <span className="text-[11px] text-[#6b7a94]">{v.doctor}</span>
                        </div>
                        <p className="text-xs text-[#4a5568] mb-1"><span className="font-semibold">Symptoms / Complaint: </span>{v.symptoms}</p>
                        <p className="text-xs text-[#6b7a94]"><span className="font-semibold text-[#4a5568]">Specialist Advice: </span>{v.advice}</p>
                      </div>
                    </div>
                  ))}
                  {selected.visits.length === 0 && (
                    <div className="py-6 text-center text-xs text-[#6b7a94]">
                      No previous visits found for this patient.
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
