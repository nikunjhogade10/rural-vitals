type Status = "offline" | "online" | "pending" | "synced" | "reviewed";

interface StatusBadgeProps {
  status: Status;
  size?: "sm" | "md";
}

const config: Record<Status, { label: string; bg: string; text: string; dot: string }> = {
  offline: { label: "Offline", bg: "#fff3e0", text: "#e65100", dot: "#e65100" },
  online: { label: "Online", bg: "#e8f5e9", text: "#2E7D32", dot: "#2E7D32" },
  pending: { label: "Pending Sync", bg: "#fffde7", text: "#f57f17", dot: "#f57f17" },
  synced: { label: "Synced", bg: "#e1f5fe", text: "#0277bd", dot: "#0277bd" },
  reviewed: { label: "Reviewed", bg: "#f3e5f5", text: "#6a1b9a", dot: "#6a1b9a" },
};

export function StatusBadge({ status, size = "md" }: StatusBadgeProps) {
  const c = config[status] ?? config["pending"]; // safe fallback

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: size === "sm" ? 4 : 6,
        background: c.bg,
        color: c.text,
        borderRadius: 999,
        padding: size === "sm" ? "2px 8px" : "4px 12px",
        fontSize: size === "sm" ? 11 : 12,
        fontWeight: 600,
        letterSpacing: 0.2,
      }}
    >
      <span
        style={{
          width: size === "sm" ? 6 : 7,
          height: size === "sm" ? 6 : 7,
          borderRadius: "50%",
          background: c.dot,
          flexShrink: 0,
        }}
      />
      {c.label}
    </span>
  );
}
