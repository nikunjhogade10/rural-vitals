import { useState, useEffect } from "react";
import { ArrowRightLeft, Clock, CheckCircle2, XCircle, MapPin, Building2, Stethoscope, AlertCircle } from "lucide-react";
import api from "../services/api";

const statusConfig: Record<string, { bg: string; text: string; icon: typeof Clock }> = {
  Pending:   { bg: "#fff8e1", text: "#F57F17", icon: Clock },
  Accepted:  { bg: "#e3f2fd", text: "#1565C0", icon: CheckCircle2 },
  Completed: { bg: "#e8f5e9", text: "#2E7D32", icon: CheckCircle2 },
  Rejected:  { bg: "#fef2f2", text: "#D32F2F", icon: XCircle },
};

export function Referrals() {
  const [referrals, setReferrals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filter, setFilter] = useState("All");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filters = ["All", "Pending", "Accepted", "Completed"];

  useEffect(() => {
    let active = true;
    const loadReferrals = async () => {
      try {
        setLoading(true);
        const data = await api.get("/visits?status=all");
        if (!active) return;

        // Filter visits that have a consultationNote of type 'referral'
        const filtered = (data.visits || []).filter((v: any) =>
          v.consultationNotes?.some((n: any) => n.noteType === "referral")
        );
        setReferrals(filtered);
        setError(null);
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Failed to load referrals");
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    loadReferrals();
    return () => { active = false; };
  }, []);

  const displayed = referrals
    .map(v => {
      const refNote = v.consultationNotes?.find((n: any) => n.noteType === "referral");
      let parsed = { hospital: "PHC Nandurbar", specialty: "General Medicine", reason: refNote?.content || "Referred", contact: "N/A" };
      if (refNote?.content) {
        try {
          parsed = JSON.parse(refNote.content);
        } catch (e) {
          parsed.reason = refNote.content;
        }
      }

      // Referral status maps to visit status (Completed if visit completed, otherwise Pending/Accepted)
      const status = v.status === "COMPLETED" ? "Completed" : "Pending";

      return {
        id: v.id,
        visitNumber: v.visitNumber,
        patientName: v.patient?.fullName || "Unknown Patient",
        age: v.patient?.age || 0,
        village: v.patient?.village || "Nandurbar",
        condition: v.chiefComplaint || "General Medicine Referral",
        hospital: parsed.hospital,
        specialty: parsed.specialty,
        reason: parsed.reason,
        contact: parsed.contact,
        date: v.reviewedAt ? v.reviewedAt.slice(0, 10) : (v.createdAt ? v.createdAt.slice(0, 10) : "N/A"),
        status,
      };
    })
    .filter(r => filter === "All" || r.status === filter);

  const stats = [
    { label: "Total Referrals", value: referrals.length, color: "#1565C0", bg: "#e3f2fd" },
    { label: "Pending", value: referrals.filter(r => r.status !== "COMPLETED").length, color: "#F57F17", bg: "#fff8e1" },
    { label: "Completed", value: referrals.filter(r => r.status === "COMPLETED").length, color: "#2E7D32", bg: "#e8f5e9" },
  ];

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
        <p className="font-semibold">Failed to load referrals</p>
        <p className="text-xs text-[#6b7a94] mt-1">{error}</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-[#1a2332]">Referral Management</h1>
        <p className="text-[#6b7a94] text-sm mt-0.5">Track and manage all patient referrals</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {stats.map(({ label, value, color, bg }) => (
          <div key={label} className="bg-white rounded-xl p-4 border text-center" style={{ borderColor: "rgba(21,101,192,0.08)", boxShadow: "0 1px 4px rgba(21,101,192,0.06)" }}>
            <div className="text-2xl font-semibold mb-1" style={{ color }}>{value}</div>
            <div className="text-xs text-[#6b7a94]">{label}</div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-4">
        {filters.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className="px-4 py-1.5 rounded-full text-xs font-medium transition-colors"
            style={{ background: filter === f ? "#1565C0" : "#f0f4f8", color: filter === f ? "#fff" : "#6b7a94" }}>
            {f}
          </button>
        ))}
      </div>

      {/* Referral cards */}
      <div className="space-y-3">
        {displayed.map(r => {
          const cfg = statusConfig[r.status] || statusConfig.Pending;
          const StatusIcon = cfg.icon;
          const expanded = expandedId === r.id;

          return (
            <div key={r.id} className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: "rgba(21,101,192,0.08)", boxShadow: "0 1px 4px rgba(21,101,192,0.06)" }}>
              <div
                className="p-5 cursor-pointer hover:bg-[#f8fafc] transition-colors"
                onClick={() => setExpandedId(expanded ? null : r.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0" style={{ background: "#1565C0" }}>
                      {(r.patientName || "Patient").split(" ").map(n => n ? n[0] : "").join("").slice(0, 2)}
                    </div>
                    <div>
                      <div className="font-semibold text-sm text-[#1a2332]">{r.patientName} <span className="text-[#6b7a94] font-normal text-xs">({r.age}y)</span></div>
                      <div className="text-xs text-[#6b7a94] mt-0.5">{r.condition} · {r.visitNumber}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold" style={{ background: cfg.bg, color: cfg.text }}>
                      <StatusIcon className="w-3 h-3" />
                      {r.status}
                    </span>
                    <span className="text-xs text-[#6b7a94]">{r.date}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-4 mt-3">
                  <div className="flex items-center gap-1.5 text-xs text-[#6b7a94]">
                    <Building2 className="w-3.5 h-3.5" style={{ color: "#1565C0" }} />
                    {r.hospital}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-[#6b7a94]">
                    <Stethoscope className="w-3.5 h-3.5" style={{ color: "#2E7D32" }} />
                    {r.specialty}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-[#6b7a94]">
                    <MapPin className="w-3 h-3" />
                    {r.village}
                  </div>
                </div>
              </div>

              {expanded && (
                <div className="border-t px-5 pb-5 pt-4" style={{ borderColor: "rgba(21,101,192,0.08)", background: "#f8fafc" }}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-[11px] font-semibold text-[#6b7a94] uppercase tracking-wide mb-1">Referral Reason</p>
                      <p className="text-xs text-[#4a5568] leading-relaxed">{r.reason}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-[#6b7a94] uppercase tracking-wide mb-1">Receiving Contact</p>
                      <p className="text-xs text-[#4a5568]">{r.contact}</p>
                    </div>
                  </div>

                  {/* Status timeline */}
                  <div className="flex items-center gap-0 mt-4">
                    {["Initiated", "Sent", "Completed"].map((step, i, arr) => {
                      const stepsDone = { Pending: 2, Completed: 3 };
                      const done = i < (stepsDone[r.status as keyof typeof stepsDone] || 0);
                      const current = i === (stepsDone[r.status as keyof typeof stepsDone] || 0) - 1;
                      return (
                        <div key={step} className="flex items-center flex-1 last:flex-none">
                          <div className="flex flex-col items-center">
                            <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
                              style={{ background: done ? (current ? "#1565C0" : "#e3f2fd") : "#f0f4f8", color: done ? (current ? "#fff" : "#1565C0") : "#9ca3af", border: current ? "2px solid #1565C0" : "none" }}>
                              {i + 1}
                            </div>
                            <span className="text-[10px] text-[#6b7a94] mt-1 whitespace-nowrap">{step}</span>
                          </div>
                          {i < arr.length - 1 && <div className="flex-1 h-0.5 mx-1 mb-3" style={{ background: i < (stepsDone[r.status as keyof typeof stepsDone] || 0) - 1 ? "#1565C0" : "#e5e7eb" }}></div>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {displayed.length === 0 && (
          <div className="py-12 text-center text-[#6b7a94]">
            <ArrowRightLeft className="w-10 h-10 mx-auto mb-2 text-[#6b7a94] opacity-50" />
            <p className="text-sm">No referrals in this category.</p>
          </div>
        )}
      </div>
    </div>
  );
}
