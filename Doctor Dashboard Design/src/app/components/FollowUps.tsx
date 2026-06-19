import { useState, useEffect } from "react";
import { CalendarCheck, Phone, CheckCircle, Calendar, Clock, AlertCircle } from "lucide-react";
import api from "../services/api";

const statusConfig: Record<string, { bg: string; text: string; icon: typeof Clock }> = {
  "Overdue":    { bg: "#fef2f2", text: "#D32F2F", icon: AlertCircle },
  "Due Today":  { bg: "#fff8e1", text: "#F57F17", icon: Clock },
  "Upcoming":   { bg: "#e3f2fd", text: "#1565C0", icon: Calendar },
  "Completed":  { bg: "#e8f5e9", text: "#2E7D32", icon: CheckCircle },
};

export function FollowUps() {
  const [followUps, setFollowUps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [filter, setFilter] = useState("All");
  const [rescheduling, setRescheduling] = useState<string | null>(null);
  const [newDate, setNewDate] = useState("");

  const filters = ["All", "Overdue", "Due Today", "Upcoming", "Completed"];

  useEffect(() => {
    let active = true;
    const loadFollowUps = async () => {
      try {
        setLoading(true);
        const data = await api.get("/visits?status=all");
        if (!active) return;
        
        // Filter visits that have followUpDate set
        const filtered = (data.visits || []).filter((v: any) => v.followUpDate !== null);
        setFollowUps(filtered);
        setError(null);
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Failed to load follow-ups");
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    loadFollowUps();
    return () => { active = false; };
  }, []);

  const todayStr = new Date().toISOString().slice(0, 10);

  const getStatus = (v: any) => {
    if (v.status === "COMPLETED") return "Completed";
    const dueStr = v.followUpDate ? v.followUpDate.slice(0, 10) : "";
    if (dueStr < todayStr) return "Overdue";
    if (dueStr === todayStr) return "Due Today";
    return "Upcoming";
  };

  const displayed = followUps
    .map(v => {
      const status = getStatus(v);
      const doctorNotes = v.consultationNotes?.find((n: any) => n.noteType === 'doctor_review')?.content 
        || v.consultationNotes?.find((n: any) => n.noteType === 'clinical_notes')?.content
        || "No notes.";
      return {
        id: v.id,
        visitNumber: v.visitNumber,
        patientName: v.patient?.fullName || "Unknown Patient",
        age: v.patient?.age || 0,
        village: v.patient?.village || "Nandurbar",
        phc: v.facilityName || "PHC Nandurbar",
        condition: v.chiefComplaint || "General Follow-Up",
        dueDate: v.followUpDate ? v.followUpDate.slice(0, 10) : "",
        status,
        doctorNotes,
      };
    })
    .filter(f => filter === "All" || f.status === filter);

  const markComplete = async (id: string) => {
    try {
      await api.patch(`/visits/${id}`, { status: "COMPLETED" });
      setFollowUps(prev => prev.map(v => v.id === id ? { ...v, status: "COMPLETED" } : v));
    } catch (err) {
      alert("Failed to mark complete: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleRescheduleSubmit = async (id: string) => {
    if (!newDate) return;
    try {
      await api.patch(`/visits/${id}`, { followUpDate: new Date(newDate).toISOString() });
      setFollowUps(prev => prev.map(v => v.id === id ? { ...v, followUpDate: new Date(newDate).toISOString() } : v));
      setRescheduling(null);
    } catch (err) {
      alert("Failed to reschedule: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  // Generate calendar days for the current week dynamically
  const today = new Date();
  const calendarDays = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(today.getDate() - today.getDay() + i);
    const dateStr = d.toISOString().slice(0, 10);
    const hasDue = followUps.some(f => getStatus(f) !== "Completed" && f.followUpDate?.slice(0, 10) === dateStr);
    return {
      day: d.getDate(),
      date: dateStr,
      hasDue,
      isToday: dateStr === todayStr,
      weekday: d.toLocaleDateString("en-US", { weekday: "short" })
    };
  });

  const monthLabel = today.toLocaleDateString("en-US", { month: "long", year: "numeric" });

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
        <p className="font-semibold">Failed to load follow-ups</p>
        <p className="text-xs text-[#6b7a94] mt-1">{error}</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-[#1a2332]">Follow-Up Management</h1>
        <p className="text-[#6b7a94] text-sm mt-0.5">
          {followUps.filter(f => getStatus(f) !== "Completed" && (getStatus(f) === "Overdue" || getStatus(f) === "Due Today")).length} follow-ups need attention today
        </p>
      </div>

      {/* Calendar strip */}
      <div className="bg-white rounded-xl p-5 border mb-5" style={{ borderColor: "rgba(21,101,192,0.08)", boxShadow: "0 1px 4px rgba(21,101,192,0.06)" }}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[#1a2332] font-semibold">{monthLabel}</h3>
          <span className="text-xs text-[#6b7a94]">● Follow-up scheduled</span>
        </div>
        <div className="grid grid-cols-7 gap-2">
          {calendarDays.map(d => (
            <div key={d.weekday} className="text-[11px] text-[#6b7a94] font-medium text-center pb-1">{d.weekday}</div>
          ))}
          {calendarDays.map(({ day, date, hasDue, isToday }) => (
            <div key={date} className={`relative h-9 flex flex-col items-center justify-center rounded-lg text-sm font-medium transition-colors ${isToday ? "text-white" : "text-[#1a2332]"}`}
              style={{ background: isToday ? "#1565C0" : hasDue ? "#e3f2fd" : "transparent" }}>
              {day}
              {hasDue && !isToday && <span className="absolute bottom-1 w-1 h-1 rounded-full" style={{ background: "#1565C0" }}></span>}
            </div>
          ))}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {filters.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className="px-4 py-1.5 rounded-full text-xs font-medium transition-colors"
            style={{ background: filter === f ? "#1565C0" : "#f0f4f8", color: filter === f ? "#fff" : "#6b7a94" }}>
            {f}
            {f !== "All" && (
              <span className="ml-1.5">({followUps.filter(fu => getStatus(fu) === f).length})</span>
            )}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: "rgba(21,101,192,0.08)", boxShadow: "0 1px 4px rgba(21,101,192,0.06)" }}>
        <table className="w-full">
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              {["Patient", "Follow-Up Date", "Status", "Condition", "Doctor Notes", "Actions"].map(h => (
                <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold text-[#6b7a94] uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayed.map(f => {
              const cfg = statusConfig[f.status] || statusConfig.Upcoming;
              const StatusIcon = cfg.icon;
              return (
                <tr key={f.id} className="border-t hover:bg-[#f8fafc] transition-colors" style={{ borderColor: "rgba(21,101,192,0.06)" }}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-sm text-[#1a2332]">{f.patientName}</div>
                    <div className="text-[11px] text-[#6b7a94]">{f.age}y · {f.village} · {f.phc}</div>
                  </td>
                  <td className="px-4 py-3">
                    {rescheduling === f.id ? (
                      <div className="flex gap-1.5 items-center">
                        <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)}
                          className="text-xs px-2 py-1 rounded border outline-none" style={{ borderColor: "rgba(21,101,192,0.2)" }} />
                        <button onClick={() => handleRescheduleSubmit(f.id)}
                          className="text-xs px-2.5 py-1 rounded text-white font-semibold" style={{ background: "#1565C0" }}>OK</button>
                        <button onClick={() => setRescheduling(null)}
                          className="text-xs px-2.5 py-1 rounded border text-[#6b7a94]" style={{ background: "#fff" }}>Cancel</button>
                      </div>
                    ) : (
                      <span className="text-sm text-[#1a2332]">{f.dueDate}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold" style={{ background: cfg.bg, color: cfg.text }}>
                      <StatusIcon className="w-3 h-3" />
                      {f.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-[#4a5568] max-w-[140px]">{f.condition}</td>
                  <td className="px-4 py-3 text-xs text-[#6b7a94] max-w-[180px] truncate" title={f.doctorNotes}>{f.doctorNotes}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5">
                      {f.status !== "Completed" && (
                        <button onClick={() => markComplete(f.id)}
                          className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1.5 rounded-lg border transition-colors hover:bg-[#e8f5e9]"
                          style={{ color: "#2E7D32", borderColor: "rgba(46,125,50,0.2)" }}>
                          <CheckCircle className="w-3 h-3" />Complete
                        </button>
                      )}
                      {f.status !== "Completed" && (
                        <button onClick={() => { setRescheduling(f.id); setNewDate(f.dueDate); }}
                          className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1.5 rounded-lg border transition-colors hover:bg-[#e3f2fd]"
                          style={{ color: "#1565C0", borderColor: "rgba(21,101,192,0.2)" }}>
                          <Calendar className="w-3 h-3" />Reschedule
                        </button>
                      )}
                      <button
                        onClick={() => alert(`Contacting via patient phone: ${f.patientName}`)}
                        className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1.5 rounded-lg border transition-colors hover:bg-[#f0f4f8]"
                        style={{ color: "#6b7a94", borderColor: "#e5e7eb" }}>
                        <Phone className="w-3 h-3" />Contact
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {displayed.length === 0 && (
          <div className="py-12 text-center">
            <CalendarCheck className="w-10 h-10 mx-auto mb-2" style={{ color: "#2E7D32" }} />
            <p className="text-sm text-[#6b7a94]">No follow-ups in this category.</p>
          </div>
        )}
      </div>
    </div>
  );
}
