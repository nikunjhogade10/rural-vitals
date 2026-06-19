import { User, Calendar, ChevronRight } from "lucide-react";
import { StatusBadge } from "./StatusBadge";

export interface Patient {
  id: string;
  name: string;
  age: number;
  gender: string;
  date: string;
  status: "pending" | "synced" | "reviewed";
  condition?: string;
  language?: string;
}

interface PatientCardProps {
  patient: Patient;
  onClick?: () => void;
}

export function PatientCard({ patient, onClick }: PatientCardProps) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        background: "#fff",
        border: "1px solid rgba(0,0,0,0.07)",
        borderRadius: 12,
        padding: "14px 16px",
        width: "100%",
        textAlign: "left",
        cursor: "pointer",
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        transition: "box-shadow 0.15s",
      }}
      onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 3px 10px rgba(0,0,0,0.1)")}
      onMouseLeave={e => (e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.06)")}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: "50%",
          background: "#e8f5e9",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <User size={20} color="#2E7D32" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <span style={{ fontWeight: 600, fontSize: 15, color: "#1a2332", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {patient.name}
          </span>
          <StatusBadge status={patient.status} size="sm" />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, color: "#637074", fontSize: 13 }}>
          <span>{patient.age}y • {patient.gender}</span>
          <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
            <Calendar size={12} />
            {patient.date}
          </span>
          {patient.language && (
            <span style={{ fontSize: 11, color: "#1565C0" }}>🌐 {patient.language}</span>
          )}
        </div>
        {patient.condition && (
          <div style={{ fontSize: 12, color: "#637074", marginTop: 2 }}>{patient.condition}</div>
        )}
      </div>
      <ChevronRight size={16} color="#a0aab4" />
    </button>
  );
}
