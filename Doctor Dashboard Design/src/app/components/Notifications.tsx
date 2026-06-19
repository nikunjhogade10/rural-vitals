import { useState, useEffect } from "react";
import { Bell, AlertCircle, CalendarCheck, ArrowRightLeft, Wifi, CheckCheck, Trash2 } from "lucide-react";
import api from "../services/api";

const typeConfig = {
  emergency: { icon: AlertCircle, color: "#D32F2F", bg: "#fef2f2", label: "Emergency" },
  followup:  { icon: CalendarCheck, color: "#F57F17", bg: "#fff8e1", label: "Follow-Up" },
  referral:  { icon: ArrowRightLeft, color: "#7B1FA2", bg: "#f3e5f5", label: "Referral" },
  sync:      { icon: Wifi, color: "#2E7D32", bg: "#e8f5e9", label: "Sync" },
  case:      { icon: Bell, color: "#1565C0", bg: "#e3f2fd", label: "New Case" },
};

const typeMap: Record<string, string> = {
  DOCTOR_ALERT: "emergency",
  REMINDER:     "followup",
  SYNC_ALERT:   "sync",
  SYSTEM:       "case",
};

export function Notifications() {
  const [filter, setFilter] = useState("All");
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      const data = await api.get("/notifications?limit=50");
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const markRead = async (id: string) => {
    const notif = notifications.find(n => n.id === id);
    if (!notif || notif.isRead) return;
    try {
      await api.patch(`/notifications/${id}/read`, {});
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error(err);
    }
  };

  const markAllRead = async () => {
    try {
      await api.post("/notifications/read-all", {});
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error(err);
    }
  };

  const deleteNotif = async (id: string) => {
    try {
      await api.delete(`/notifications/${id}`);
      const wasUnread = !notifications.find(n => n.id === id)?.isRead;
      setNotifications(prev => prev.filter(n => n.id !== id));
      if (wasUnread) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filters = ["All", "Unread", "Critical", "Follow-Ups", "Referrals", "Syncs"];
  
  const filterFn = (n: any) => {
    const mappedType = typeMap[n.type] || "case";
    if (filter === "Unread") return !n.isRead;
    if (filter === "Critical") return mappedType === "emergency";
    if (filter === "Follow-Ups") return mappedType === "followup";
    if (filter === "Referrals") return mappedType === "referral";
    if (filter === "Syncs") return mappedType === "sync";
    return true;
  };

  const displayed = notifications.filter(filterFn);

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

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[#1a2332]">Notifications</h1>
          <p className="text-[#6b7a94] text-sm mt-0.5">{unreadCount} unread notifications</p>
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="flex items-center gap-1.5 text-sm font-medium" style={{ color: "#1565C0" }}>
            <CheckCheck className="w-4 h-4" />
            Mark all read
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {filters.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium transition-colors"
            style={{ background: filter === f ? "#1565C0" : "#f0f4f8", color: filter === f ? "#fff" : "#6b7a94" }}>
            {f}
            {f === "Unread" && unreadCount > 0 && (
              <span className="w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center" style={{ background: filter === "Unread" ? "rgba(255,255,255,0.3)" : "#D32F2F", color: "#fff" }}>
                {unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Notification list */}
      <div className="space-y-2">
        {displayed.map(n => {
          const mappedType = typeMap[n.type] || "case";
          const cfg = typeConfig[mappedType as keyof typeof typeConfig] || typeConfig.case;
          const Icon = cfg.icon;
          const isRead = n.isRead;
          const formattedTime = new Date(n.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

          return (
            <div key={n.id}
              className="bg-white rounded-xl p-4 border flex gap-4 items-start transition-all hover:shadow-sm cursor-pointer"
              style={{
                borderColor: !isRead ? "rgba(21,101,192,0.15)" : "rgba(21,101,192,0.06)",
                boxShadow: !isRead ? "0 1px 4px rgba(21,101,192,0.08)" : "0 1px 2px rgba(21,101,192,0.04)",
              }}
              onClick={() => markRead(n.id)}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: cfg.bg }}>
                <Icon className="w-5 h-5" style={{ color: cfg.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full mr-2" style={{ background: cfg.bg, color: cfg.color }}>
                      {cfg.label}
                    </span>
                    {!isRead && <span className="inline-block w-2 h-2 rounded-full" style={{ background: "#1565C0" }}></span>}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[11px] text-[#6b7a94]">{formattedTime}</span>
                    <button onClick={e => { e.stopPropagation(); deleteNotif(n.id); }}
                      className="text-[#9ca3af] hover:text-[#D32F2F] transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className={`mt-1 text-sm font-medium ${isRead ? "text-[#6b7a94]" : "text-[#1a2332]"}`}>{n.title}</div>
                <div className="text-xs text-[#6b7a94] mt-0.5 leading-relaxed">{n.message}</div>
              </div>
            </div>
          );
        })}
        {displayed.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 bg-white rounded-xl border" style={{ borderColor: "rgba(21,101,192,0.08)" }}>
            <Bell className="w-10 h-10 mb-3 text-[#d1d5db]" />
            <p className="font-medium text-[#6b7a94]">No notifications here.</p>
          </div>
        )}
      </div>
    </div>
  );
}
