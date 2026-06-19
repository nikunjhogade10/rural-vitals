import { useState, useEffect } from "react";
import {
  FileText, Clock, CalendarCheck, ArrowRightLeft, TrendingUp, Eye
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import api from "../services/api";

const statusConfig: Record<string, { bg: string; text: string }> = {
  Pending:   { bg: "#fff8e1", text: "#F57F17" },
  Reviewed:  { bg: "#e8f5e9", text: "#2E7D32" },
  "Follow-Up": { bg: "#e3f2fd", text: "#1565C0" },
  Referred:  { bg: "#f3e5f5", text: "#7B1FA2" },
};

interface Props {
  onViewCase: (id: string) => void;
}

export function DashboardHome({ onViewCase }: Props) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [summary, setSummary] = useState<any>(null);
  const [recentCases, setRecentCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [summaryData, recentData] = await Promise.all([
          api.get("/dashboard/summary"),
          api.get("/dashboard/recent-cases?limit=6")
        ]);
        setSummary(summaryData);
        setRecentCases(recentData.cases || []);
      } catch (err) {
        console.error("Failed to load dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  const userJson = typeof window !== "undefined" ? localStorage.getItem("rcl_user") : null;
  let user: any = null;
  try {
    user = userJson ? JSON.parse(userJson) : null;
  } catch (e) {
    console.error("Error parsing rcl_user:", e);
  }
  const doctorName = user?.fullName || "Dr. Rajesh Kapoor";
  const facilityName = user?.facility?.name || "PHC Nandurbar";
  const blockName = user?.facility?.block || "Akrani";

  const todayStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
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

  const stats = [
    { label: "Total Cases Today", value: summary?.totalCasesToday ?? "0", change: "Submitted today", icon: FileText, color: "#1565C0", bg: "#e3f2fd" },
    { label: "Pending Reviews", value: summary?.pendingReviews ?? "0", change: "Awaiting consultation", icon: Clock, color: "#E65100", bg: "#fff3e0" },
    { label: "Follow-Ups Due", value: summary?.followUpsDue ?? "0", change: "Assigned to you", icon: CalendarCheck, color: "#2E7D32", bg: "#e8f5e9" },
    { label: "Referred Cases", value: summary?.referredCases ?? "0", change: "Active referrals", icon: ArrowRightLeft, color: "#7B1FA2", bg: "#f3e5f5" },
  ];

  const dailyCases = summary?.dailyCases || [];
  const regionData = summary?.regionData || [];
  const langData = summary?.langData || [];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-[#1a2332]">Welcome back, {doctorName}</h1>
        <p className="text-[#6b7a94] text-sm mt-0.5">{todayStr} · {facilityName}, {blockName}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {stats.map(({ label, value, change, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white rounded-xl p-5 border" style={{ borderColor: "rgba(21,101,192,0.08)", boxShadow: "0 1px 4px rgba(21,101,192,0.06)" }}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[#6b7a94] text-xs font-medium mb-1">{label}</p>
                <p className="text-2xl font-semibold text-[#1a2332]">{value}</p>
                <p className="text-xs mt-1" style={{ color }}>{change}</p>
              </div>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: bg }}>
                <Icon className="w-5 h-5" style={{ color }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-6">
        {/* Daily trend */}
        <div className="xl:col-span-2 bg-white rounded-xl p-5 border" style={{ borderColor: "rgba(21,101,192,0.08)", boxShadow: "0 1px 4px rgba(21,101,192,0.06)" }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-[#1a2332]">Daily Cases Trend</h3>
              <p className="text-[#6b7a94] text-xs mt-0.5">Last 7 days</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: "#1565C0" }}></span><span className="text-xs text-[#6b7a94]">Submitted</span></div>
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: "#2E7D32" }}></span><span className="text-xs text-[#6b7a94]">Reviewed</span></div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={dailyCases} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gradBlue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1565C0" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#1565C0" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradGreen" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2E7D32" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#2E7D32" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(21,101,192,0.06)" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#6b7a94" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#6b7a94" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid rgba(21,101,192,0.1)" }} />
              <Area type="monotone" dataKey="cases" stroke="#1565C0" strokeWidth={2} fill="url(#gradBlue)" />
              <Area type="monotone" dataKey="reviewed" stroke="#2E7D32" strokeWidth={2} fill="url(#gradGreen)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Language pie */}
        <div className="bg-white rounded-xl p-5 border" style={{ borderColor: "rgba(21,101,192,0.08)", boxShadow: "0 1px 4px rgba(21,101,192,0.06)" }}>
          <div className="mb-4">
            <h3 className="text-[#1a2332]">Language Distribution</h3>
            <p className="text-[#6b7a94] text-xs mt-0.5">Patient preferred language</p>
          </div>
          <ResponsiveContainer width="100%" height={140}>
            <PieChart>
              <Pie
                data={langData}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={65}
                paddingAngle={2}
                dataKey="value"
                onMouseEnter={(_, i) => setActiveIndex(i)}
                onMouseLeave={() => setActiveIndex(null)}
              >
                {langData.map((entry: any, i: number) => (
                  <Cell key={entry.name} fill={entry.color} opacity={activeIndex === null || activeIndex === i ? 1 : 0.5} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 6 }} formatter={(v: number) => [`${v}%`, ""]} />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-y-1.5 mt-2">
            {langData.map(({ name, value, color }: any) => (
              <div key={name} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }}></span>
                <span className="text-[11px] text-[#6b7a94]">{name}</span>
                <span className="text-[11px] font-medium text-[#1a2332] ml-auto">{value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Region bar chart */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-6">
        <div className="xl:col-span-2 bg-white rounded-xl p-5 border" style={{ borderColor: "rgba(21,101,192,0.08)", boxShadow: "0 1px 4px rgba(21,101,192,0.06)" }}>
          <div className="mb-4">
            <h3 className="text-[#1a2332]">Cases by Region</h3>
            <p className="text-[#6b7a94] text-xs mt-0.5">All time records</p>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={regionData} margin={{ top: 0, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(21,101,192,0.06)" vertical={false} />
              <XAxis dataKey="region" tick={{ fontSize: 11, fill: "#6b7a94" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#6b7a94" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid rgba(21,101,192,0.1)" }} />
              <Bar dataKey="cases" fill="#1565C0" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Quick stats */}
        <div className="bg-white rounded-xl p-5 border" style={{ borderColor: "rgba(21,101,192,0.08)", boxShadow: "0 1px 4px rgba(21,101,192,0.06)" }}>
          <h3 className="text-[#1a2332] mb-4">Today's Summary</h3>
          <div className="space-y-3">
            {[
              { label: "Avg Response Time", value: "14 min", icon: TrendingUp, color: "#2E7D32" },
              { label: "New Syncs", value: String(recentCases.length), icon: FileText, color: "#1565C0" },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="flex items-center gap-3 p-3 rounded-lg" style={{ background: "#f8fafc" }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: color + "18" }}>
                  <Icon className="w-4 h-4" style={{ color }} />
                </div>
                <span className="text-xs text-[#6b7a94] flex-1">{label}</span>
                <span className="text-sm font-semibold text-[#1a2332]">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Cases Table */}
      <div className="bg-white rounded-xl border" style={{ borderColor: "rgba(21,101,192,0.08)", boxShadow: "0 1px 4px rgba(21,101,192,0.06)" }}>
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "rgba(21,101,192,0.08)" }}>
          <h3 className="text-[#1a2332]">Recent Cases</h3>
        </div>
        <div className="overflow-x-auto">
          {recentCases.length === 0 ? (
            <div className="text-center py-8 text-[#6b7a94] text-sm">No recent cases found.</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  {["Patient", "Age/Gender", "Village", "Submitted", "Status", ""].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-[11px] font-semibold text-[#6b7a94] uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentCases.map((c) => {
                  const s = statusConfig[c.status] || statusConfig.Pending;
                  return (
                    <tr key={c.id} className="border-t hover:bg-[#f8fafc] transition-colors" style={{ borderColor: "rgba(21,101,192,0.06)" }}>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-[#1a2332]">{c.name}</div>
                        <div className="text-[11px] text-[#6b7a94]">{c.visitNumber}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-[#4a5568]">{c.age}y / {c.gender}</td>
                      <td className="px-4 py-3 text-sm text-[#4a5568]">{c.village}</td>
                      <td className="px-4 py-3 text-sm text-[#4a5568]">{c.time}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium" style={{ background: s.bg, color: s.text }}>
                          {c.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => onViewCase(c.id)}
                          className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors hover:bg-[#e3f2fd]"
                          style={{ color: "#1565C0", borderColor: "rgba(21,101,192,0.2)" }}
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
