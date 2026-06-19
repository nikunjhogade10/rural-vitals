import { useState, useEffect, useRef } from "react";
import { ArrowLeft, MapPin, Phone, Globe, Thermometer, Activity, Heart, Wind, Image, Clock, CheckCircle2, Save, Send, ArrowRightLeft, Plus, X, Video, MessageSquare, Mic, PhoneOff, Wifi, WifiOff } from "lucide-react";
import api from "../services/api";

interface Props {
  caseId: string;
  onBack: () => void;
}

const imagePlaceholders = [
  { label: "Attachments", emoji: "📎", type: "all" }
];

export function CaseReview({ caseId, onBack }: Props) {
  const [c, setCaseData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [diagnosis, setDiagnosis] = useState("");
  const [advice, setAdvice] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [medicines, setMedicines] = useState([{ name: "", dosage: "", duration: "" }]);
  const [saved, setSaved] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [mockConnection, setMockConnection] = useState<"ONLINE" | "WEAK" | "OFFLINE">("ONLINE");
  const [callStatus, setCallStatus] = useState<"IDLE" | "CONNECTING" | "ONGOING">("IDLE");
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);

  // Poll server for call state from app
  useEffect(() => {
    if (!caseId) return;
    let isActive = true;

    const pollCallStatus = async () => {
      try {
        const data = await api.get(`/visits/${caseId}`);
        const v = data.visit;
        if (!isActive) return;

        if (v.consultationMode === "VIDEO") {
          if (callStatus === "IDLE") {
            setCallStatus("CONNECTING");
            setTimeout(() => {
              if (isActive) setCallStatus("ONGOING");
            }, 1500);
          }
        } else if (v.consultationMode === "OFFLINE" && callStatus === "ONGOING") {
          setCallStatus("IDLE");
        }
      } catch (err) {
        console.warn("Error polling call status:", err);
      }
    };

    const interval = setInterval(pollCallStatus, 3000);
    return () => {
      isActive = false;
      clearInterval(interval);
    };
  }, [caseId, callStatus]);

  // Handle webcam stream
  useEffect(() => {
    let activeStream: MediaStream | null = null;
    if (callStatus === "ONGOING" && mockConnection === "ONLINE") {
      navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then(stream => {
          activeStream = stream;
          setLocalStream(stream);
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }
        })
        .catch(err => {
          console.warn("Webcam access denied / unavailable:", err);
        });
    } else {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        setLocalStream(null);
      }
    }
    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach(track => track.stop());
      }
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [callStatus, mockConnection]);

  const [showReferModal, setShowReferModal] = useState(false);
  const [refHospital, setRefHospital] = useState("");
  const [refSpecialty, setRefSpecialty] = useState("");
  const [refReason, setRefReason] = useState("");
  const [refContact, setRefContact] = useState("");

  useEffect(() => {
    const fetchCaseDetails = async () => {
      try {
        const data = await api.get(`/visits/${caseId}`);
        const v = data.visit;
        let priority = "Medium";
        if (v.visitType === "emergency" || v.chiefComplaint?.toLowerCase().includes("severe") || v.chiefComplaint?.toLowerCase().includes("emergency") || v.chiefComplaint?.toLowerCase().includes("chest pain")) {
          priority = "Emergency";
        } else if (v.visitType === "high" || v.chiefComplaint?.toLowerCase().includes("fever 10") || v.chiefComplaint?.toLowerCase().includes("stroke") || v.chiefComplaint?.toLowerCase().includes("hypertension")) {
          priority = "High";
        } else if (v.visitType === "routine") {
          priority = "Low";
        }

        const langMap: Record<string, string> = { en: "English", hi: "Hindi", mr: "Marathi", kn: "Kannada", te: "Telugu" };
        const latestVitals = v.vitalRecords?.[0] || {};

        const mapped = {
          id: v.id,
          visitNumber: v.visitNumber,
          name: v.patient.fullName,
          age: v.patient.age,
          gender: v.patient.gender === "FEMALE" ? "Female" : v.patient.gender === "MALE" ? "Male" : "Other",
          mobile: v.patient.phone || "N/A",
          village: v.patient.village || "Nandurbar",
          district: v.patient.district || "Nandurbar",
          language: langMap[v.patient.preferredLanguage] || "English",
          submittedBy: v.createdBy?.fullName || "Nurse Priya Sharma",
          priority,
          symptoms: v.chiefComplaint || v.symptoms?.join(", ") || "",
          networkStatus: v.networkStatus || "OFFLINE",
          vitals: {
            bp: latestVitals.systolicBP && latestVitals.diastolicBP ? `${latestVitals.systolicBP}/${latestVitals.diastolicBP}` : "N/A",
            temp: latestVitals.temperature ? `${latestVitals.temperature}°F` : "N/A",
            spo2: latestVitals.spo2 ? `${latestVitals.spo2}%` : "N/A",
            pulse: latestVitals.pulse ? `${latestVitals.pulse} bpm` : "N/A",
            weight: latestVitals.weight ? `${latestVitals.weight} kg` : "N/A",
          },
          notes: v.consultationNotes?.filter((n: any) => n.noteType === "nurse_note")?.[0]?.content || "No nurse clinical notes provided.",
          timeline: [
            { label: "Patient Registered at PHC", time: v.createdAt ? new Date(v.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : "—", done: true },
            { label: "Vitals Recorded", time: latestVitals.recordedAt ? new Date(latestVitals.recordedAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : "—", done: !!latestVitals.id },
            { label: "Case Saved Offline", time: "—", done: true },
            { label: "Case Synced to Server", time: v.syncedAt ? new Date(v.syncedAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : "—", done: true },
            { label: "Doctor Review", time: v.reviewedAt ? new Date(v.reviewedAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : "—", done: v.status === "REVIEWED" },
            { label: "Advice Sent", time: v.reviewedAt ? new Date(v.reviewedAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : "—", done: v.status === "REVIEWED" },
          ],
          images: v.images || [],
        };

        setCaseData(mapped);
        setMockConnection(mapped.networkStatus === "OFFLINE" ? "ONLINE" : mapped.networkStatus);
        if (v.diagnosis) setDiagnosis(v.diagnosis);
      } catch (err) {
        setError("Failed to fetch case details");
      } finally {
        setLoading(false);
      }
    };
    fetchCaseDetails();
  }, [caseId]);

  const addMedicine = () => setMedicines(prev => [...prev, { name: "", dosage: "", duration: "" }]);
  const removeMedicine = (i: number) => setMedicines(prev => prev.filter((_, idx) => idx !== i));
  const updateMedicine = (i: number, field: string, val: string) =>
    setMedicines(prev => prev.map((m, idx) => idx === i ? { ...m, [field]: val } : m));

  const handleSubmit = async () => {
    if (!diagnosis.trim()) {
      alert("Please enter a diagnosis before submitting.");
      return;
    }
    setLoadingSubmit(true);
    try {
      const formattedPrescriptions = medicines
        .filter(m => m.name.trim() !== "")
        .map(m => ({
          medicationName: m.name,
          dosage: m.dosage || "1 tab",
          frequency: "Daily",
          duration: m.duration ? `${m.duration} days` : "5 days",
          instructions: "Take as directed",
        }));

      await api.post(`/visits/${caseId}/review`, {
        doctorNotes: `${diagnosis}. Advice: ${advice}`,
        prescription: formattedPrescriptions,
        followUpDate: followUpDate ? new Date(followUpDate).toISOString() : null,
      });

      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        onBack();
      }, 1500);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to submit review");
    } finally {
      setLoadingSubmit(false);
    }
  };

  const handleSave = async () => {
    try {
      await api.patch(`/visits/${caseId}`, {
        diagnosis,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      alert("Failed to save draft: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleReferSubmit = async () => {
    try {
      setLoadingSubmit(true);
      const referralObj = {
        hospital: refHospital || "General Hospital",
        specialty: refSpecialty || "General Medicine",
        reason: refReason || advice || "Referred for specialist evaluation",
        contact: refContact || "N/A"
      };

      await api.post(`/visits/${caseId}/review`, {
        doctorNotes: `Referred to ${referralObj.hospital} (${referralObj.specialty}). Reason: ${referralObj.reason}`,
        prescription: [],
        followUpDate: null,
        referral: referralObj
      });

      setShowReferModal(false);
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        onBack();
      }, 1500);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to refer case");
    } finally {
      setLoadingSubmit(false);
    }
  };

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

  if (error || !c) {
    return (
      <div className="p-6 text-center text-red-500 font-medium">
        {error || "Case details not found"}
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm font-medium transition-colors hover:opacity-70" style={{ color: "#1565C0" }}>
          <ArrowLeft className="w-4 h-4" />
          Back to Pending Cases
        </button>
        <div className="w-px h-4 bg-[#e2e8f0]"></div>
        <div>
          <h1 className="text-[#1a2332]">Case Review — {c.visitNumber}</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-5">
        {/* LEFT PANEL */}
        <div className="space-y-4">
          {/* Patient Info */}
          <div className="bg-white rounded-xl p-5 border" style={{ borderColor: "rgba(21,101,192,0.08)", boxShadow: "0 1px 4px rgba(21,101,192,0.06)" }}>
            <h3 className="text-[#1a2332] mb-4">Patient Information</h3>
            <div className="flex items-start gap-4 mb-4">
              <div className="w-14 h-14 rounded-full flex items-center justify-center text-white text-lg font-semibold flex-shrink-0" style={{ background: "#1565C0" }}>
                {c.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
              </div>
              <div className="flex-1">
                <div className="font-semibold text-[#1a2332] text-base">{c.name}</div>
                <div className="text-sm text-[#6b7a94] mt-0.5">{c.age} years · {c.gender}</div>
                <div className="flex flex-wrap gap-3 mt-2">
                  <div className="flex items-center gap-1.5 text-xs text-[#6b7a94]">
                    <Phone className="w-3 h-3" />{c.mobile}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-[#6b7a94]">
                    <MapPin className="w-3 h-3" />{c.village}, {c.district}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-[#6b7a94]">
                    <Globe className="w-3 h-3" />{c.language}
                  </div>
                </div>
              </div>
            </div>
            <div className="p-3 rounded-lg text-xs text-[#6b7a94] leading-relaxed" style={{ background: "#f8fafc" }}>
              <span className="font-medium text-[#4a5568]">Submitted by:</span> {c.submittedBy} · PHC {c.village}
            </div>
          </div>

          {/* Vitals */}
          <div className="bg-white rounded-xl p-5 border" style={{ borderColor: "rgba(21,101,192,0.08)", boxShadow: "0 1px 4px rgba(21,101,192,0.06)" }}>
            <h3 className="text-[#1a2332] mb-4">Vitals</h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {[
                { label: "Blood Pressure", value: c.vitals.bp, icon: Activity, color: "#1565C0" },
                { label: "Temperature", value: c.vitals.temp, icon: Thermometer, color: "#E65100" },
                { label: "SpO₂", value: c.vitals.spo2, icon: Wind, color: "#2E7D32" },
                { label: "Pulse", value: c.vitals.pulse, icon: Heart, color: "#D32F2F" },
                { label: "Weight", value: c.vitals.weight, icon: Activity, color: "#7B1FA2" },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="p-3 rounded-lg text-center" style={{ background: "#f8fafc" }}>
                  <Icon className="w-4 h-4 mx-auto mb-1" style={{ color }} />
                  <div className="font-semibold text-[#1a2332] text-sm">{value}</div>
                  <div className="text-[10px] text-[#6b7a94] mt-0.5">{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Symptoms & Notes */}
          <div className="bg-white rounded-xl p-5 border" style={{ borderColor: "rgba(21,101,192,0.08)", boxShadow: "0 1px 4px rgba(21,101,192,0.06)" }}>
            <h3 className="text-[#1a2332] mb-3">Symptoms & Clinical Notes</h3>
            <p className="text-sm text-[#4a5568] leading-relaxed mb-3">{c.symptoms}</p>
            <div className="p-3 rounded-lg" style={{ background: "#f8fafc", borderLeft: "3px solid #1565C0" }}>
              <p className="text-xs text-[#4a5568] leading-relaxed">{c.notes}</p>
            </div>
          </div>

          {/* Uploaded Images */}
          <div className="bg-white rounded-xl p-5 border" style={{ borderColor: "rgba(21,101,192,0.08)", boxShadow: "0 1px 4px rgba(21,101,192,0.06)" }}>
            <h3 className="text-[#1a2332] mb-4">Uploaded Attachments</h3>
            <div className="flex gap-2 mb-4">
              <button className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                style={{ background: "#e3f2fd", color: "#1565C0" }}>
                All Attachments
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {c.images.length === 0 ? (
                <div className="col-span-3 py-6 text-center text-xs text-[#6b7a94] border border-dashed rounded-lg">
                  No attachments uploaded
                </div>
              ) : (
                c.images.map((img: any, i: number) => (
                  <div key={img.id || i} className="aspect-square rounded-lg overflow-hidden border flex items-center justify-center bg-[#f8fafc]">
                    <a href={img.url.startsWith("http") ? img.url : `http://localhost:4000${img.url}`} target="_blank" rel="noopener noreferrer" className="w-full h-full block">
                      <img
                        src={img.url.startsWith("http") ? img.url : `http://localhost:4000${img.url}`}
                        alt={img.filename || "Attachment"}
                        className="w-full h-full object-cover transition-transform hover:scale-105"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    </a>
                  </div>
                ))
              )}
            </div>
            <p className="text-[11px] text-[#6b7a94] mt-2 flex items-center gap-1">
              <Image className="w-3 h-3" /> {c.images.length} files uploaded by nurse
            </p>
          </div>

          {/* Timeline */}
          <div className="bg-white rounded-xl p-5 border" style={{ borderColor: "rgba(21,101,192,0.08)", boxShadow: "0 1px 4px rgba(21,101,192,0.06)" }}>
            <h3 className="text-[#1a2332] mb-4">Case Timeline</h3>
            <div className="space-y-0">
              {c.timeline.map((step: any, i: number) => (
                <div key={i} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${step.done ? "text-white" : "border-2"}`}
                      style={{ background: step.done ? "#1565C0" : "transparent", borderColor: step.done ? "transparent" : "#d1d5db" }}>
                      {step.done ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3 h-3 text-[#9ca3af]" />}
                    </div>
                    {i < c.timeline.length - 1 && (
                      <div className="w-px flex-1 my-1" style={{ background: step.done ? "#1565C0" : "#e5e7eb", minHeight: "20px" }}></div>
                    )}
                  </div>
                  <div className="pb-4">
                    <div className={`text-xs font-medium ${step.done ? "text-[#1a2332]" : "text-[#9ca3af]"}`}>{step.label}</div>
                    <div className="text-[11px] text-[#6b7a94] mt-0.5">{step.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="space-y-4">
          {/* Live Consultation */}
          <div className="bg-white rounded-xl p-5 border" style={{ borderColor: "rgba(21,101,192,0.08)", boxShadow: "0 1px 4px rgba(21,101,192,0.06)" }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[#1a2332] flex items-center gap-2">
                {mockConnection === "WEAK" ? <MessageSquare className="w-4 h-4 text-[#f57f17]" /> : <Video className="w-4 h-4 text-[#1565C0]" />}
                Live Consultation
              </h3>
              <div className="flex items-center gap-2">
                <select 
                  value={mockConnection} 
                  onChange={(e) => setMockConnection(e.target.value as any)}
                  className="text-[10px] px-2 py-1 rounded border outline-none font-medium cursor-pointer"
                  style={{ background: "#f8fafc", borderColor: "#e2e8f0" }}
                >
                  <option value="ONLINE">App: 4G/5G (Online)</option>
                  <option value="WEAK">App: Edge (Weak)</option>
                  <option value="OFFLINE">App: Offline</option>
                </select>
                <div className="flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-semibold uppercase tracking-wider" 
                  style={{ 
                    background: mockConnection === "ONLINE" ? "#e8f5e9" : mockConnection === "WEAK" ? "#fff8e1" : "#f1f5f9",
                    color: mockConnection === "ONLINE" ? "#2E7D32" : mockConnection === "WEAK" ? "#f57f17" : "#64748b"
                  }}>
                  <div className={`w-1.5 h-1.5 rounded-full ${mockConnection !== 'OFFLINE' ? 'animate-pulse' : ''}`} style={{ background: "currentColor" }}></div>
                  {mockConnection}
                </div>
              </div>
            </div>

            {callStatus === "IDLE" ? (
              <div className="py-8 text-center bg-[#f8fafc] rounded-lg border border-[#e2e8f0] flex flex-col items-center justify-center h-[200px]">
                <div className="w-12 h-12 bg-[#e3f2fd] text-[#1565C0] rounded-full flex items-center justify-center mb-3">
                  <Video className="w-6 h-6" />
                </div>
                <h4 className="text-[#1a2332] font-semibold text-sm mb-1">Live Consultation</h4>
                <p className="text-xs text-[#64748b] mb-4">Connect with the patient and health worker</p>
                <button 
                  onClick={async () => {
                    setCallStatus("CONNECTING");
                    try {
                      await api.patch(`/visits/${caseId}`, {
                        consultationMode: "VIDEO",
                        networkStatus: "WEAK"
                      });
                    } catch (e) {
                      console.warn("Failed to initiate call signaling:", e);
                    }
                    setTimeout(() => setCallStatus("ONGOING"), 1500);
                  }}
                  className="px-5 py-2 bg-[#1565C0] text-white text-xs font-semibold rounded-lg hover:bg-[#0d47a1] transition-colors shadow-sm flex items-center gap-2"
                >
                  <Video className="w-4 h-4" />
                  Start Consultation
                </button>
              </div>
            ) : callStatus === "CONNECTING" ? (
              <div className="py-8 text-center bg-[#f8fafc] rounded-lg border border-[#e2e8f0] flex flex-col items-center justify-center h-[200px]">
                <div className="w-12 h-12 bg-[#e3f2fd] text-[#1565C0] rounded-full flex items-center justify-center mb-3 animate-pulse">
                  <Phone className="w-6 h-6" />
                </div>
                <h4 className="text-[#1a2332] font-semibold text-sm mb-1">Connecting...</h4>
                <p className="text-xs text-[#64748b]">Establishing secure connection</p>
              </div>
            ) : mockConnection === "OFFLINE" ? (
              <div className="py-8 text-center bg-[#f8fafc] rounded-lg border border-dashed border-[#e2e8f0] h-[200px] flex flex-col items-center justify-center">
                <WifiOff className="w-8 h-8 text-[#94a3b8] mx-auto mb-2" />
                <p className="text-sm font-medium text-[#64748b]">Patient app is offline</p>
                <p className="text-xs text-[#94a3b8] mt-1">They will receive your advice when they reconnect.</p>
                <button onClick={() => setCallStatus("IDLE")} className="mt-3 text-[10px] text-[#1565C0] font-medium underline">End Call</button>
              </div>
            ) : mockConnection === "WEAK" ? (
              <div className="rounded-lg border overflow-hidden flex flex-col h-[200px]" style={{ borderColor: "rgba(21,101,192,0.15)" }}>
                <div className="p-2 text-[11px] font-medium text-center bg-[#fff8e1] text-[#f57f17] border-b border-[#fde68a] flex items-center justify-center gap-1.5 relative">
                  <Wifi className="w-3.5 h-3.5" />
                  Low bandwidth: Switched to Chat Mode
                  <button onClick={() => setCallStatus("IDLE")} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#c62828] hover:text-[#b71c1c]"><PhoneOff className="w-3.5 h-3.5" /></button>
                </div>
                <div className="flex-1 bg-[#f8fafc] p-3 overflow-y-auto flex flex-col justify-end space-y-3">
                  <div className="self-center text-[10px] text-[#94a3b8]">Call connected at {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                  <div className="bg-white p-2 text-xs rounded-xl rounded-bl-none shadow-sm max-w-[80%] text-[#1a2332] border border-[#e2e8f0]">
                    Hello Doctor, patient is ready for consultation.
                  </div>
                </div>
                <div className="p-2 bg-white border-t border-[#e2e8f0] flex items-center gap-2">
                  <input type="text" placeholder="Type advice or ask questions..." className="flex-1 text-xs px-3 py-2 bg-[#f8fafc] border border-[#e2e8f0] rounded-lg outline-none focus:border-[#1565C0] transition-colors" />
                  <button className="p-2 rounded-lg bg-[#e3f2fd] text-[#1565C0] hover:bg-[#bbdefb] transition-colors"><Mic className="w-4 h-4" /></button>
                  <button className="p-2 rounded-lg bg-[#1565C0] text-white hover:bg-[#0d47a1] transition-colors"><Send className="w-4 h-4" /></button>
                </div>
              </div>
            ) : (
              <div className="relative rounded-lg overflow-hidden bg-[#1a2332] h-[200px] flex items-center justify-center group">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover transform scale-x-[-1]"
                />
                <div className="absolute top-3 left-3 flex items-center gap-2">
                  <div className="bg-black/60 text-white text-[10px] font-medium px-2 py-1 rounded backdrop-blur-sm">
                    {c.name} (Patient)
                  </div>
                  <div className="bg-red-500/90 text-white text-[10px] font-medium px-2 py-1 rounded flex items-center gap-1 backdrop-blur-sm shadow-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></div>
                    REC
                  </div>
                </div>
                <div className="absolute bottom-3 right-3 w-20 h-24 bg-gray-800 rounded-lg border-2 border-white/20 overflow-hidden shadow-lg flex items-center justify-center">
                  <div className="text-center text-white p-1">
                    <div className="w-8 h-8 rounded-full bg-[#1565C0] text-xs font-bold flex items-center justify-center mx-auto mb-1">DR</div>
                    <span className="text-[8px] text-gray-300">Self View</span>
                  </div>
                </div>
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <button className="w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center backdrop-blur-sm hover:bg-white/30 transition-colors"><Mic className="w-5 h-5" /></button>
                  <button className="w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center backdrop-blur-sm hover:bg-white/30 transition-colors"><Video className="w-5 h-5" /></button>
                  <button 
                    onClick={async () => {
                      setCallStatus("IDLE");
                      try {
                        await api.patch(`/visits/${caseId}`, {
                          consultationMode: "OFFLINE",
                          networkStatus: "OFFLINE"
                        });
                      } catch (e) {
                        console.warn("Failed to end call:", e);
                      }
                    }} 
                    className="w-10 h-10 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 shadow-lg transition-colors"
                  >
                    <PhoneOff className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Diagnosis */}
          <div className="bg-white rounded-xl p-5 border" style={{ borderColor: "rgba(21,101,192,0.08)", boxShadow: "0 1px 4px rgba(21,101,192,0.06)" }}>
            <h3 className="text-[#1a2332] mb-3">Diagnosis</h3>
            <textarea
              value={diagnosis}
              onChange={e => setDiagnosis(e.target.value)}
              placeholder="Enter your clinical diagnosis…"
              rows={4}
              className="w-full px-3.5 py-3 rounded-lg border text-sm text-[#1a2332] outline-none resize-none transition-all placeholder-[#9ca3af]"
              style={{ borderColor: "rgba(21,101,192,0.15)", background: "#f8fafc" }}
              onFocus={e => (e.target.style.borderColor = "#1565C0")}
              onBlur={e => (e.target.style.borderColor = "rgba(21,101,192,0.15)")}
            />
          </div>

          {/* Advice */}
          <div className="bg-white rounded-xl p-5 border" style={{ borderColor: "rgba(21,101,192,0.08)", boxShadow: "0 1px 4px rgba(21,101,192,0.06)" }}>
            <h3 className="text-[#1a2332] mb-3">Medical Advice</h3>
            <textarea
              value={advice}
              onChange={e => setAdvice(e.target.value)}
              placeholder="Provide instructions for the nurse and patient…"
              rows={4}
              className="w-full px-3.5 py-3 rounded-lg border text-sm text-[#1a2332] outline-none resize-none transition-all placeholder-[#9ca3af]"
              style={{ borderColor: "rgba(21,101,192,0.15)", background: "#f8fafc" }}
              onFocus={e => (e.target.style.borderColor = "#1565C0")}
              onBlur={e => (e.target.style.borderColor = "rgba(21,101,192,0.15)")}
            />
          </div>

          {/* Prescription */}
          <div className="bg-white rounded-xl p-5 border" style={{ borderColor: "rgba(21,101,192,0.08)", boxShadow: "0 1px 4px rgba(21,101,192,0.06)" }}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[#1a2332]">Prescription</h3>
              <button onClick={addMedicine} className="flex items-center gap-1 text-xs font-medium" style={{ color: "#1565C0" }}>
                <Plus className="w-3.5 h-3.5" />Add medicine
              </button>
            </div>
            <div className="space-y-2">
              {medicines.map((med, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input
                    value={med.name}
                    onChange={e => updateMedicine(i, "name", e.target.value)}
                    placeholder="Medicine name"
                    className="flex-1 min-w-0 px-2.5 py-2 rounded-lg border text-xs text-[#1a2332] outline-none"
                    style={{ borderColor: "rgba(21,101,192,0.15)", background: "#f8fafc" }}
                  />
                  <input
                    value={med.dosage}
                    onChange={e => updateMedicine(i, "dosage", e.target.value)}
                    placeholder="Dosage"
                    className="w-20 px-2.5 py-2 rounded-lg border text-xs text-[#1a2332] outline-none"
                    style={{ borderColor: "rgba(21,101,192,0.15)", background: "#f8fafc" }}
                  />
                  <input
                    value={med.duration}
                    onChange={e => updateMedicine(i, "duration", e.target.value)}
                    placeholder="Days"
                    className="w-16 px-2.5 py-2 rounded-lg border text-xs text-[#1a2332] outline-none"
                    style={{ borderColor: "rgba(21,101,192,0.15)", background: "#f8fafc" }}
                  />
                  {medicines.length > 1 && (
                    <button onClick={() => removeMedicine(i)} className="text-[#9ca3af] hover:text-[#D32F2F] transition-colors">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Follow-up */}
          <div className="bg-white rounded-xl p-5 border" style={{ borderColor: "rgba(21,101,192,0.08)", boxShadow: "0 1px 4px rgba(21,101,192,0.06)" }}>
            <h3 className="text-[#1a2332] mb-3">Follow-Up</h3>
            <div>
              <label className="block text-xs text-[#6b7a94] mb-1.5">Follow-Up Date</label>
              <input type="date" value={followUpDate} onChange={e => setFollowUpDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border text-xs text-[#1a2332] outline-none"
                style={{ borderColor: "rgba(21,101,192,0.15)", background: "#f8fafc" }}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2">
            {submitted && (
              <div className="flex items-center gap-2 p-3 rounded-lg text-xs font-medium" style={{ background: "#e8f5e9", color: "#2E7D32" }}>
                <CheckCircle2 className="w-4 h-4" />
                Advice submitted successfully
              </div>
            )}
            <button
              onClick={handleSubmit}
              disabled={loadingSubmit}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50"
              style={{ background: "#1565C0" }}
            >
              {loadingSubmit ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Submitting…
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Submit Advice
                </>
              )}
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleSave}
                className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium border transition-colors hover:bg-[#f0f4f8]"
                style={{ color: "#1565C0", borderColor: "rgba(21,101,192,0.2)" }}
              >
                <Save className="w-3.5 h-3.5" />
                {saved ? "Saved!" : "Save Draft"}
              </button>
              <button
                onClick={() => {
                  setRefReason(advice || "");
                  setShowReferModal(true);
                }}
                className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium border transition-colors hover:bg-[#f3e5f5]"
                style={{ color: "#7B1FA2", borderColor: "rgba(123,31,162,0.2)" }}
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                Refer Case
              </button>
            </div>
          </div>
        </div>
      </div>

      {showReferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border shadow-2xl relative animate-in fade-in zoom-in-95 duration-150" style={{ borderColor: "rgba(21,101,192,0.1)" }}>
            <button onClick={() => setShowReferModal(false)} className="absolute top-4 right-4 text-[#6b7a94] hover:text-[#1a2332]">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-[#1a2332] mb-4 flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-[#7B1FA2]" />
              Refer Patient Case
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#4a5568] mb-1">Target Hospital / PHC</label>
                <input
                  type="text"
                  placeholder="e.g. Surat Civil Hospital"
                  value={refHospital}
                  onChange={e => setRefHospital(e.target.value)}
                  className="w-full text-xs px-3 py-2 border rounded-lg outline-none"
                  style={{ borderColor: "rgba(21,101,192,0.2)" }}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#4a5568] mb-1">Target Specialty</label>
                <input
                  type="text"
                  placeholder="e.g. Cardiology, Orthopaedics"
                  value={refSpecialty}
                  onChange={e => setRefSpecialty(e.target.value)}
                  className="w-full text-xs px-3 py-2 border rounded-lg outline-none"
                  style={{ borderColor: "rgba(21,101,192,0.2)" }}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#4a5568] mb-1">Referral Reason & Notes</label>
                <textarea
                  rows={3}
                  placeholder="ST elevation on ECG, needs urgent PCI..."
                  value={refReason}
                  onChange={e => setRefReason(e.target.value)}
                  className="w-full text-xs px-3 py-2 border rounded-lg outline-none resize-none"
                  style={{ borderColor: "rgba(21,101,192,0.2)" }}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#4a5568] mb-1">Receiving Doctor / Contact Info</label>
                <input
                  type="text"
                  placeholder="e.g. Dr. Mehta, +91 9876 000004"
                  value={refContact}
                  onChange={e => setRefContact(e.target.value)}
                  className="w-full text-xs px-3 py-2 border rounded-lg outline-none"
                  style={{ borderColor: "rgba(21,101,192,0.2)" }}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setShowReferModal(false)}
                  className="flex-1 py-2 rounded-xl text-xs font-semibold border text-[#6b7a94]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReferSubmit}
                  disabled={loadingSubmit}
                  className="flex-1 py-2 rounded-xl text-xs font-semibold text-white transition-all disabled:opacity-50"
                  style={{ background: "#7B1FA2" }}
                >
                  {loadingSubmit ? "Referring..." : "Confirm Referral"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
