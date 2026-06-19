import { useState, useEffect } from "react";
import { FileDown, TrendingUp, Clock, ArrowRightLeft, CalendarCheck, AlertCircle } from "lucide-react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import api from "../services/api";

const trendChartData = [
  { month: "Jan", fever: 42, respiratory: 28, diabetes: 35, maternal: 18 },
  { month: "Feb", fever: 38, respiratory: 22, diabetes: 33, maternal: 15 },
  { month: "Mar", fever: 55, respiratory: 31, diabetes: 39, maternal: 22 },
  { month: "Apr", fever: 61, respiratory: 35, diabetes: 44, maternal: 25 },
  { month: "May", fever: 68, respiratory: 40, diabetes: 50, maternal: 29 },
];

export function Reports() {
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const loadSummary = async () => {
      try {
        setLoading(true);
        const data = await api.get("/dashboard/summary");
        if (!active) return;
        setSummary(data);
        setError(null);
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Failed to load report data");
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    loadSummary();
    return () => { active = false; };
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

  if (error || !summary) {
    return (
      <div className="p-6 text-center text-[#D32F2F]">
        <AlertCircle className="w-10 h-10 mx-auto mb-2" />
        <p className="font-semibold">Failed to load reports</p>
        <p className="text-xs text-[#6b7a94] mt-1">{error || "No data received"}</p>
      </div>
    );
  }

  const metrics = [
    { label: "Total Registered Patients", value: summary.totalPatients || 0, sub: "All time", icon: TrendingUp, color: "#1565C0", bg: "#e3f2fd" },
    { label: "Pending Reviews", value: summary.pendingReviews || 0, sub: "Needs doctor review", icon: Clock, color: "#2E7D32", bg: "#e8f5e9" },
    { label: "Follow-Ups Due Today", value: summary.followUpsDue || 0, sub: "Needs monitoring", icon: CalendarCheck, color: "#7B1FA2", bg: "#f3e5f5" },
    { label: "Referred Cases", value: summary.referredCases || 0, sub: "Higher center care", icon: ArrowRightLeft, color: "#E65100", bg: "#fff3e0" },
  ];

  const dailyCasesData = summary.dailyCases || [];
  const facilityData = summary.regionData || [];
  const languageData = summary.langData || [];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[#1a2332]">Reports & Analytics</h1>
          <p className="text-[#6b7a94] text-sm mt-0.5">Performance metrics and trend analysis</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => alert("Downloading PDF report...")} className="flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors hover:bg-[#f0f4f8]" style={{ color: "#1565C0", borderColor: "rgba(21,101,192,0.2)" }}>
            <FileDown className="w-4 h-4" />PDF
          </button>
          <button onClick={() => alert("Downloading Excel spreadsheet...")} className="flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors hover:bg-[#e8f5e9]" style={{ color: "#2E7D32", borderColor: "rgba(46,125,50,0.2)" }}>
            <FileDown className="w-4 h-4" />Excel
          </button>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {metrics.map(({ label, value, sub, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white rounded-xl p-5 border" style={{ borderColor: "rgba(21,101,192,0.08)", boxShadow: "0 1px 4px rgba(21,101,192,0.06)" }}>
            <div className="flex items-start justify-between mb-2">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: bg }}>
                <Icon className="w-5 h-5" style={{ color }} />
              </div>
            </div>
            <div className="text-2xl font-semibold text-[#1a2332]">{value}</div>
            <div className="text-xs text-[#6b7a94] mt-0.5">{label}</div>
            <div className="text-[11px] mt-1 font-medium" style={{ color }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-4">
        {/* Daily cases */}
        <div className="bg-white rounded-xl p-5 border" style={{ borderColor: "rgba(21,101,192,0.08)", boxShadow: "0 1px 4px rgba(21,101,192,0.06)" }}>
          <div className="mb-4">
            <h3 className="text-[#1a2332] font-semibold">Weekly Case Volume</h3>
            <p className="text-[#6b7a94] text-xs mt-0.5">Daily new and reviewed cases (last 7 days)</p>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={dailyCasesData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(21,101,192,0.06)" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#6b7a94" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#6b7a94" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Line type="monotone" dataKey="cases" name="Created Cases" stroke="#1565C0" strokeWidth={2.5} dot={{ r: 4, fill: "#1565C0" }} />
              <Line type="monotone" dataKey="reviewed" name="Reviewed Cases" stroke="#2E7D32" strokeWidth={2.5} dot={{ r: 4, fill: "#2E7D32" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Disease trends */}
        <div className="bg-white rounded-xl p-5 border" style={{ borderColor: "rgba(21,101,192,0.08)", boxShadow: "0 1px 4px rgba(21,101,192,0.06)" }}>
          <div className="mb-4">
            <h3 className="text-[#1a2332] font-semibold">Clinical Category Trends</h3>
            <p className="text-[#6b7a94] text-xs mt-0.5">By category, monthly historical</p>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={trendChartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(21,101,192,0.06)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#6b7a94" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#6b7a94" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
              <Line type="monotone" dataKey="fever" stroke="#D32F2F" strokeWidth={2} name="Fever/Infection" dot={false} />
              <Line type="monotone" dataKey="respiratory" stroke="#1565C0" strokeWidth={2} name="Respiratory" dot={false} />
              <Line type="monotone" dataKey="diabetes" stroke="#E65100" strokeWidth={2} name="Diabetes/BP" dot={false} />
              <Line type="monotone" dataKey="maternal" stroke="#2E7D32" strokeWidth={2} name="Maternal" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-4">
        {/* Village distribution */}
        <div className="bg-white rounded-xl p-5 border" style={{ borderColor: "rgba(21,101,192,0.08)", boxShadow: "0 1px 4px rgba(21,101,192,0.06)" }}>
          <div className="mb-4">
            <h3 className="text-[#1a2332] font-semibold">Facility-wise Case Distribution</h3>
            <p className="text-[#6b7a94] text-xs mt-0.5">Total cases processed per facility</p>
          </div>
          {facilityData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={facilityData} layout="vertical" margin={{ top: 0, right: 20, left: 60, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(21,101,192,0.06)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#6b7a94" }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="region" tick={{ fontSize: 11, fill: "#6b7a94" }} axisLine={false} tickLine={false} width={60} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="cases" fill="#1565C0" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="py-12 text-center text-xs text-[#6b7a94]">No facility records found.</div>
          )}
        </div>

        {/* Language pie */}
        <div className="bg-white rounded-xl p-5 border" style={{ borderColor: "rgba(21,101,192,0.08)", boxShadow: "0 1px 4px rgba(21,101,192,0.06)" }}>
          <div className="mb-4">
            <h3 className="text-[#1a2332] font-semibold">Language Demographics</h3>
            <p className="text-[#6b7a94] text-xs mt-0.5">Patient preferred languages</p>
          </div>
          {languageData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={languageData} cx="50%" cy="50%" outerRadius={60} dataKey="value" paddingAngle={2}>
                    {languageData.map((entry: any) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 6 }} formatter={(v: number) => [`${v}%`, ""]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {languageData.map(({ name, value, color }: any) => (
                  <div key={name} className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }}></span>
                    <span className="text-[11px] text-[#6b7a94] flex-1">{name}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-[#f0f4f8] overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${value}%`, background: color }}></div>
                    </div>
                    <span className="text-[11px] font-medium text-[#1a2332] w-7 text-right">{value}%</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="py-12 text-center text-xs text-[#6b7a94]">No demographic data available.</div>
          )}
        </div>
      </div>
    </div>
  );
}
