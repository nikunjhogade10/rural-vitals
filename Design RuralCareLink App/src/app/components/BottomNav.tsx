import { LayoutDashboard, Users, RefreshCw, Bell, User } from "lucide-react";
import { useI18n } from "../context/I18nContext";

type NavTab = "dashboard" | "patients" | "sync" | "notifications" | "profile";

interface BottomNavProps {
  active: NavTab;
  onNavigate: (tab: NavTab) => void;
  pendingSync?: number;
  unreadNotifications?: number;
}

const TAB_DEFS: { id: NavTab; key: string; fallback: string; Icon: React.ComponentType<{ size?: number; color?: string }> }[] = [
  { id: "dashboard",     key: "nav_dashboard", fallback: "Dashboard", Icon: LayoutDashboard },
  { id: "patients",      key: "nav_patients",  fallback: "Patients",  Icon: Users },
  { id: "sync",          key: "nav_sync",      fallback: "Sync",      Icon: RefreshCw },
  { id: "notifications", key: "nav_alerts",    fallback: "Alerts",    Icon: Bell },
  { id: "profile",       key: "nav_profile",   fallback: "Profile",   Icon: User },
];

export function BottomNav({ active, onNavigate, pendingSync = 0, unreadNotifications = 0 }: BottomNavProps) {
  const { t } = useI18n();

  return (
    <nav
      style={{
        position: "fixed",
        bottom: 0,
        left: "50%",
        transform: "translateX(-50%)",
        width: "100%",
        maxWidth: 430,
        background: "#fff",
        borderTop: "1px solid rgba(0,0,0,0.08)",
        display: "flex",
        justifyContent: "space-around",
        padding: "8px 0 max(8px, env(safe-area-inset-bottom))",
        zIndex: 100,
        boxShadow: "0 -2px 16px rgba(0,0,0,0.07)",
      }}
    >
      {TAB_DEFS.map(({ id, key, fallback, Icon }) => {
        const isActive = active === id;
        const badge = id === "sync" ? pendingSync : id === "notifications" ? unreadNotifications : 0;
        return (
          <button
            key={id}
            onClick={() => onNavigate(id)}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 3,
              padding: "4px 12px",
              background: "none",
              border: "none",
              cursor: "pointer",
              color: isActive ? "#2E7D32" : "#8a9aaa",
              position: "relative",
              transition: "color 0.15s",
            }}
          >
            <div style={{ position: "relative" }}>
              <Icon size={22} color={isActive ? "#2E7D32" : "#8a9aaa"} />
              {badge > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: -4,
                    right: -6,
                    background: "#c62828",
                    color: "#fff",
                    borderRadius: 999,
                    fontSize: 9,
                    fontWeight: 700,
                    minWidth: 16,
                    height: 16,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "0 3px",
                  }}
                >
                  {badge}
                </span>
              )}
            </div>
            <span style={{ fontSize: 10, fontWeight: isActive ? 600 : 400 }}>
              {t(key, fallback)}
            </span>
            {isActive && (
              <span
                style={{
                  position: "absolute",
                  top: 0,
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: 28,
                  height: 3,
                  background: "#2E7D32",
                  borderRadius: "0 0 3px 3px",
                }}
              />
            )}
          </button>
        );
      })}
    </nav>
  );
}

export type { NavTab };
