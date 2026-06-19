import { useEffect, useState } from "react";
import { Heart } from "lucide-react";

interface SplashScreenProps {
  onComplete: () => void;
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          clearInterval(interval);
          setTimeout(onComplete, 300);
          return 100;
        }
        return p + 4;
      });
    }, 80);
    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        background: "linear-gradient(160deg, #1b5e20 0%, #2E7D32 50%, #388e3c 100%)",
        padding: 32,
        textAlign: "center",
      }}
    >
      {/* Logo mark */}
      <div
        style={{
          width: 96,
          height: 96,
          borderRadius: 24,
          background: "rgba(255,255,255,0.15)",
          backdropFilter: "blur(10px)",
          border: "2px solid rgba(255,255,255,0.3)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 24,
          boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
        }}
      >
        <Heart size={48} color="#fff" fill="rgba(255,255,255,0.9)" />
      </div>

      {/* Healthcare illustration */}
      <svg width="200" height="120" viewBox="0 0 200 120" fill="none" style={{ marginBottom: 24, opacity: 0.9 }}>
        {/* Village huts */}
        <rect x="10" y="80" width="40" height="30" rx="3" fill="rgba(255,255,255,0.2)" />
        <polygon points="10,80 30,55 50,80" fill="rgba(255,255,255,0.3)" />
        <rect x="25" y="95" width="10" height="15" fill="rgba(255,255,255,0.15)" />
        <rect x="60" y="85" width="30" height="25" rx="3" fill="rgba(255,255,255,0.15)" />
        <polygon points="60,85 75,65 90,85" fill="rgba(255,255,255,0.25)" />
        {/* Medical cross */}
        <rect x="130" y="50" width="50" height="60" rx="8" fill="rgba(255,255,255,0.2)" />
        <rect x="147" y="60" width="16" height="40" rx="3" fill="rgba(255,255,255,0.6)" />
        <rect x="134" y="73" width="42" height="16" rx="3" fill="rgba(255,255,255,0.6)" />
        {/* Signal waves */}
        <path d="M100 40 Q110 30 120 40" stroke="rgba(255,255,255,0.5)" strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M95 45 Q110 25 125 45" stroke="rgba(255,255,255,0.35)" strokeWidth="2" fill="none" strokeLinecap="round" />
        {/* Connectivity dots */}
        <circle cx="30" cy="40" r="3" fill="rgba(255,255,255,0.5)" />
        <circle cx="75" cy="45" r="3" fill="rgba(255,255,255,0.5)" />
        <line x1="33" y1="40" x2="72" y2="45" stroke="rgba(255,255,255,0.3)" strokeWidth="1" strokeDasharray="4 3" />
        <line x1="78" y1="45" x2="130" y2="65" stroke="rgba(255,255,255,0.3)" strokeWidth="1" strokeDasharray="4 3" />
      </svg>

      <h1 style={{ color: "#fff", fontSize: 28, fontWeight: 700, margin: "0 0 8px", letterSpacing: -0.5 }}>
        RuralCareLink
      </h1>
      <p style={{ color: "rgba(255,255,255,0.8)", fontSize: 15, margin: "0 0 48px", lineHeight: 1.5 }}>
        Offline-first telemedicine continuity layer for rural India
      </p>

      {/* Loading bar */}
      <div style={{ width: 200, marginBottom: 12 }}>
        <div
          style={{
            height: 4,
            background: "rgba(255,255,255,0.2)",
            borderRadius: 999,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${progress}%`,
              background: "#fff",
              borderRadius: 999,
              transition: "width 0.08s linear",
            }}
          />
        </div>
      </div>
      <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 12 }}>
        {progress < 100 ? "Loading application…" : "Ready"}
      </p>
    </div>
  );
}
