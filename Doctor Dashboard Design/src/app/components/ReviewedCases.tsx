import { useState, useEffect } from "react";
import { CheckCircle2, Eye } from "lucide-react";
import api from "../services/api";

export function ReviewedCases() {
  const [cases, setCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReviewed = async () => {
      try {
        const data = await api.get("/visits?status=reviewed");
        const mapped = (data.visits || []).map((v: any) => {
          let priority = "Medium";
          if (v.visitType === "emergency" || v.chiefComplaint?.toLowerCase().includes("severe") || v.chiefComplaint?.toLowerCase().includes("emergency") || v.chiefComplaint?.toLowerCase().includes("chest pain")) {
            priority = "Emergency";
          } else if (v.visitType === "high" || v.chiefComplaint?.toLowerCase().includes("fever 10") || v.chiefComplaint?.toLowerCase().includes("stroke") || v.chiefComplaint?.toLowerCase().includes("hypertension")) {
            priority = "High";
          } else if (v.visitType === "routine") {
            priority = "Low";
          }

          return {
            id: v.id,
            visitNumber: v.visitNumber,
            name: v.patient.fullName,
            age: v.patient.age,
            gender: v.patient.gender === "FEMALE" ? "F" : v.patient.gender === "MALE" ? "M" : "O",
            village: v.patient.village || "Nandurbar",
            date: v.reviewedAt ? new Date(v.reviewedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : new Date(v.visitDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
            diagnosis: v.diagnosis || "No diagnosis summary recorded",
            priority,
            doctor: v.assignedDoctor?.fullName || "Dr. Rajesh Kapoor"
          };
        });
        setCases(mapped);
      } catch (err) {
        setError("Failed to fetch reviewed cases");
      } finally {
        setLoading(false);
      }
    };
    fetchReviewed();
  }, []);

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
      <div className="mb-6">
        <h1 className="text-[#1a2332]">Reviewed Cases</h1>
        <p className="text-[#6b7a94] text-sm mt-0.5">{cases.length} cases reviewed recently</p>
      </div>
      <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: "rgba(21,101,192,0.08)", boxShadow: "0 1px 4px rgba(21,101,192,0.06)" }}>
        {cases.length === 0 ? (
          <div className="text-center py-12 text-[#6b7a94] text-sm">No reviewed cases found.</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                {["Patient", "Village", "Reviewed On", "Diagnosis Summary", "Doctor", ""].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold text-[#6b7a94] uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cases.map(c => {
                return (
                  <tr key={c.id} className="border-t hover:bg-[#f8fafc] transition-colors" style={{ borderColor: "rgba(21,101,192,0.06)" }}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-semibold flex-shrink-0" style={{ background: "#2E7D32" }}>
                          {c.name.split(" ").map((n: string) => n[0]).join("").slice(0,2)}
                        </div>
                        <div>
                          <div className="font-medium text-sm text-[#1a2332]">{c.name}</div>
                          <div className="text-[11px] text-[#6b7a94]">{c.age}y · {c.gender} · {c.visitNumber}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-[#4a5568]">{c.village}</td>
                    <td className="px-4 py-3 text-sm text-[#4a5568]">{c.date}</td>
                    <td className="px-4 py-3 text-xs text-[#4a5568] max-w-[220px] truncate">{c.diagnosis}</td>
                    <td className="px-4 py-3 text-xs text-[#6b7a94]">{c.doctor}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#2E7D32]" />
                        <span className="text-[11px] text-[#2E7D32] font-medium">Reviewed</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
