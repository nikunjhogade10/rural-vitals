import { useState, useEffect } from "react";
import { Filter, Eye, CheckCircle, ArrowRightLeft, Clock, MapPin, User } from "lucide-react";
import api from "../services/api";

interface Props {
  onViewCase: (id: string) => void;
}

export function PendingCases({ onViewCase }: Props) {
  const [district, setDistrict] = useState("All");
  const [lang, setLang] = useState("All");
  const [markedReviewed, setMarkedReviewed] = useState<string[]>([]);
  const [cases, setCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCases = async () => {
    try {
      const data = await api.get("/visits?status=synced");
      const mapped = (data.visits || []).map((v: any) => {
        let priority = "Medium";
        if (v.visitType === "emergency" || v.chiefComplaint?.toLowerCase().includes("severe") || v.chiefComplaint?.toLowerCase().includes("emergency") || v.chiefComplaint?.toLowerCase().includes("chest pain")) {
          priority = "Emergency";
        } else if (v.visitType === "high" || v.chiefComplaint?.toLowerCase().includes("fever 10") || v.chiefComplaint?.toLowerCase().includes("stroke") || v.chiefComplaint?.toLowerCase().includes("hypertension")) {
          priority = "High";
        } else if (v.visitType === "routine") {
          priority = "Low";
        }

        const langMap: Record<string, string> = { en: "English", hi: "Hindi", mr: "Marathi", kn: "Kannada", te: "Telugu" };

        return {
          id: v.id,
          visitNumber: v.visitNumber,
          name: v.patient.fullName,
          age: v.patient.age,
          gender: v.patient.gender === "FEMALE" ? "Female" : v.patient.gender === "MALE" ? "Male" : "Other",
          village: v.patient.village || "Nandurbar",
          district: v.patient.district || "Nandurbar",
          phc: v.facility?.name || "PHC Nandurbar",
          language: langMap[v.patient.preferredLanguage] || "English",
          submittedBy: v.createdBy?.fullName || "Nurse Priya Sharma",
          time: v.visitDate ? new Date(v.visitDate).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : "10:00 AM",
          priority,
          symptoms: v.chiefComplaint || v.symptoms?.join(", ") || "",
        };
      });
      setCases(mapped);
    } catch (err) {
      setError("Failed to fetch pending cases");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, []);

  const districts = ["All", ...Array.from(new Set(cases.map(c => c.district)))];
  const langs = ["All", ...Array.from(new Set(cases.map(c => c.language)))];

  const filtered = cases.filter(c => {
    if (district !== "All" && c.district !== district) return false;
    if (lang !== "All" && c.language !== lang) return false;
    if (markedReviewed.includes(c.id)) return false;
    return true;
  });

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
      <div className="p-6 text-center text-red-500 font-medium">{error}</div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[#1a2332]">Pending Cases</h1>
          <p className="text-[#6b7a94] text-sm mt-0.5">{filtered.length} cases awaiting review</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 border mb-5 flex flex-wrap gap-3 items-center" style={{ borderColor: "rgba(21,101,192,0.08)", boxShadow: "0 1px 4px rgba(21,101,192,0.06)" }}>
        <div className="flex items-center gap-2 text-[#6b7a94]">
          <Filter className="w-3.5 h-3.5" />
          <span className="text-xs font-medium">Filter:</span>
        </div>
        {[
          { label: "District", val: district, opts: districts, set: setDistrict },
          { label: "Language", val: lang, opts: langs, set: setLang },
        ].map(({ label, val, opts, set }) => (
          <select
            key={label}
            value={val}
            onChange={e => set(e.target.value)}
            className="text-xs px-3 py-2 rounded-lg border outline-none text-[#1a2332] cursor-pointer"
            style={{ borderColor: "rgba(21,101,192,0.15)", background: "#f8fafc" }}
          >
            {opts.map(o => <option key={o} value={o}>{o === "All" ? `All ${label}s` : o}</option>)}
          </select>
        ))}
        {(district !== "All" || lang !== "All") && (
          <button
            onClick={() => { setDistrict("All"); setLang("All"); }}
            className="text-xs font-medium ml-auto"
            style={{ color: "#1565C0" }}
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Case Cards */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {filtered.map(c => {
          return (
            <div key={c.id} className="bg-white rounded-xl border overflow-hidden hover:shadow-md transition-shadow"
              style={{ borderColor: "rgba(21,101,192,0.08)", boxShadow: "0 1px 4px rgba(21,101,192,0.06)" }}>
              <div className="p-5">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold" style={{ background: "#1565C0" }}>
                      {c.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                    </div>
                    <div>
                      <div className="font-semibold text-[#1a2332] text-sm">{c.name}</div>
                      <div className="text-[11px] text-[#6b7a94]">{c.age}y · {c.gender} · {c.visitNumber}</div>
                    </div>
                  </div>
                </div>

                {/* Symptoms */}
                <p className="text-xs text-[#4a5568] leading-relaxed line-clamp-2 mb-3">{c.symptoms}</p>

                {/* Meta */}
                <div className="flex flex-wrap gap-3 mb-4">
                  <div className="flex items-center gap-1.5 text-[11px] text-[#6b7a94]">
                    <MapPin className="w-3 h-3" />
                    {c.village}, {c.district}
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-[#6b7a94]">
                    <User className="w-3 h-3" />
                    {c.submittedBy}
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-[#6b7a94]">
                    <Clock className="w-3 h-3" />
                    {c.time}
                  </div>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px]" style={{ background: "#f0f4f8", color: "#6b7a94" }}>
                    🌐 {c.language}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => onViewCase(c.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium text-white transition-colors"
                    style={{ background: "#1565C0" }}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Review Case
                  </button>
                  <button
                    onClick={() => setMarkedReviewed(prev => [...prev, c.id])}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors hover:bg-[#e8f5e9]"
                    style={{ color: "#2E7D32", borderColor: "rgba(46,125,50,0.2)" }}
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    Mark Done
                  </button>
                  <button
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors hover:bg-[#f3e5f5]"
                    style={{ color: "#7B1FA2", borderColor: "rgba(123,31,162,0.2)" }}
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                    Refer
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="col-span-2 flex flex-col items-center justify-center py-16 bg-white rounded-xl border" style={{ borderColor: "rgba(21,101,192,0.08)" }}>
            <CheckCircle className="w-12 h-12 mb-3" style={{ color: "#2E7D32" }} />
            <p className="font-medium text-[#1a2332]">All caught up!</p>
            <p className="text-sm text-[#6b7a94] mt-1">No pending cases match the current filters.</p>
          </div>
        )}
      </div>
    </div>
  );
}
