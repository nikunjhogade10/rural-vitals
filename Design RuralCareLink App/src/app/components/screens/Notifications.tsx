import { useState, useEffect } from "react";
import { MessageSquare, CheckCircle, Clock, Bell, Trash2, ArrowLeft } from "lucide-react";
import { notificationService } from "../../services";
import { useI18n } from "../../context/I18nContext";

interface NotificationsProps {
  onBack?: () => void;
}

interface AppNotification {
  id: string;
  type: "DOCTOR_ALERT" | "SYNC_ALERT" | "REMINDER" | "SYSTEM";
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

const TYPE_CONFIG = {
  DOCTOR_ALERT: { icon: <MessageSquare size={18} color="#1565C0" />, bg: "#e3f2fd", color: "#1565C0" },
  SYNC_ALERT:   { icon: <CheckCircle size={18} color="#2E7D32" />, bg: "#e8f5e9", color: "#2E7D32" },
  REMINDER:     { icon: <Clock size={18} color="#f57f17" />, bg: "#fff8e1", color: "#f57f17" },
  SYSTEM:       { icon: <Bell size={18} color="#6a1b9a" />, bg: "#f3e5f5", color: "#6a1b9a" },
};

function formatTimeAgo(dateStr: string, t: (key: string, fallback: string) => string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return t('time_just_now', 'Just now');
  if (mins < 60) return `${mins}${t('time_m_ago', 'm ago')}`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) {
    if (hours === 1) return `1 hour ago`;
    return `${hours} hours ago`;
  }
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

export function Notifications({ onBack }: NotificationsProps) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // Filter Categories: ALL, DOCTOR_ALERT, SYNC_ALERT, REMINDER
  const [activeCategory, setActiveCategory] = useState<"ALL" | "DOCTOR_ALERT" | "SYNC_ALERT" | "REMINDER">("ALL");
  const { t } = useI18n();

  async function load() {
    setLoading(true);
    try {
      // Fetch all notifications (we filter locally to support real-time switching)
      const data = await notificationService.list();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch {
      // silent fallback
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const handleMarkRead = async (id: string) => {
    try {
      await notificationService.markRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {
      // silent
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {
      // silent
    }
  };

  const handleDismiss = async (id: string) => {
    try {
      await notificationService.dismiss(id);
      const target = notifications.find(n => n.id === id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      if (target && !target.isRead) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch {
      // silent
    }
  };

  // Filter logic based on tab selected
  const filteredNotifications = notifications.filter(n => {
    if (activeCategory === "ALL") return true;
    return n.type === activeCategory;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: "#f4f7f4", paddingBottom: 100 }}>
      
      {/* Header */}
      <div style={{ background: "#2E7D32", padding: "48px 20px 24px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          {onBack && (
            <button onClick={onBack} style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 10, padding: "6px 12px", cursor: "pointer", color: "#fff", display: "flex", alignItems: "center", gap: 6, fontSize: 13, marginBottom: 12 }}>
              <ArrowLeft size={14} /> {t('back', 'Back')}
            </button>
          )}
          <h1 style={{ color: "#fff", margin: 0, fontSize: 22, fontWeight: 700 }}>
            {t('nav_alerts', 'Notifications')}
          </h1>
          <p style={{ color: "rgba(255,255,255,0.8)", margin: "4px 0 0", fontSize: 13 }}>
            {unreadCount} {t('notifications_unread_count', 'unread alerts')}
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            style={{
              background: "rgba(255, 255, 255, 0.18)",
              border: "1px solid rgba(255, 255, 255, 0.3)",
              borderRadius: "20px",
              padding: "6px 14px",
              color: "#fff",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
              transition: "background 0.2s"
            }}
          >
            {t('notifications_mark_all', 'Mark all read')}
          </button>
        )}
      </div>

      {/* Filter Tabs Container */}
      <div
        style={{
          display: "flex",
          gap: 8,
          padding: "16px 20px",
          background: "#fff",
          borderBottom: "1px solid rgba(0,0,0,0.05)",
          overflowX: "auto",
          WebkitOverflowScrolling: "touch"
        }}
      >
        {[
          { id: "ALL", label: t('cases_all', 'All') },
          { id: "DOCTOR_ALERT", label: t('notifications_type_doctor', 'Doctor Alerts') },
          { id: "SYNC_ALERT", label: t('sync', 'Sync') },
          { id: "REMINDER", label: t('notifications_type_reminder', 'Reminders') },
        ].map(cat => {
          const isSelected = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id as typeof activeCategory)}
              style={{
                padding: "8px 16px",
                borderRadius: "20px",
                border: isSelected ? "1px solid #2E7D32" : "1px solid #cfd8dc",
                background: isSelected ? "#e8f5e9" : "#fff",
                color: isSelected ? "#2E7D32" : "#607d8b",
                fontSize: "13px",
                fontWeight: isSelected ? 600 : 500,
                cursor: "pointer",
                whiteSpace: "nowrap"
              }}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Notifications Cards List */}
      <div style={{ flex: 1, padding: "16px", display: "flex", flexDirection: "column", gap: 12 }}>
        {loading ? (
          [0, 1, 2].map(i => (
            <div
              key={i}
              style={{
                background: "#fff",
                borderRadius: 16,
                height: 96,
                boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                border: "1px solid rgba(0,0,0,0.05)"
              }}
            />
          ))
        ) : filteredNotifications.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#8a9aaa" }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>🔔</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: "#1a2332" }}>
              {t('notifications_empty', 'No notifications')}
            </div>
            <div style={{ fontSize: 13, marginTop: 4, color: "#8a9aaa" }}>
              {t('notifications_caught_up', "You're all caught up!")}
            </div>
          </div>
        ) : (
          filteredNotifications.map(n => {
            const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.SYSTEM;
            return (
              <div
                key={n.id}
                onClick={() => !n.isRead && handleMarkRead(n.id)}
                style={{
                  background: "#fff",
                  border: "1px solid rgba(0,0,0,0.06)",
                  borderRadius: 16,
                  padding: "16px",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.03)",
                  display: "flex",
                  gap: 12,
                  alignItems: "flex-start",
                  position: "relative",
                  cursor: n.isRead ? "default" : "pointer"
                }}
              >
                {/* Left Icon Container */}
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: cfg.bg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0
                  }}
                >
                  {cfg.icon}
                </div>

                {/* Text Content */}
                <div style={{ flex: 1, paddingRight: 16 }}>
                  <h3 style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 700, color: "#1a2332" }}>
                    {n.title}
                  </h3>
                  <p style={{ margin: 0, fontSize: 13, color: "#637074", lineHeight: 1.4 }}>
                    {n.message}
                  </p>
                  <div style={{ fontSize: 11, color: "#8a9aaa", marginTop: 6 }}>
                    {formatTimeAgo(n.createdAt, t)}
                  </div>
                </div>

                {/* Unread Indicator Green Dot (Top Right) */}
                {!n.isRead && (
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: "#2E7D32",
                      position: "absolute",
                      top: 16,
                      right: 16
                    }}
                  />
                )}

                {/* Trash Button (Bottom Right) */}
                <button
                  onClick={(e) => {
                    e.stopPropagation(); // prevent triggering markRead
                    handleDismiss(n.id);
                  }}
                  title="Dismiss notification"
                  style={{
                    position: "absolute",
                    bottom: 12,
                    right: 12,
                    border: "none",
                    background: "none",
                    cursor: "pointer",
                    color: "#b0bec5",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 4,
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.color = "#c62828")}
                  onMouseOut={(e) => (e.currentTarget.style.color = "#b0bec5")}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
}
