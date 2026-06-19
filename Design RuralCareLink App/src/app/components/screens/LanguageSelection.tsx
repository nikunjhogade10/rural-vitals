import { useState } from "react";
import { Globe, Search, Check, ChevronRight } from "lucide-react";

interface LanguageSelectionProps {
  onContinue: (lang: string) => void;
}

const LANGUAGES = [
  { code: "en", name: "English", native: "English", script: "A", preview: "Good morning, how are you feeling today?" },
  { code: "hi", name: "Hindi", native: "हिंदी", script: "अ", preview: "आज आप कैसा महसूस कर रहे हैं?" },
  { code: "mr", name: "Marathi", native: "मराठी", script: "अ", preview: "आज तुम्हाला कसे वाटत आहे?" },
  { code: "kn", name: "Kannada", native: "ಕನ್ನಡ", script: "ಅ", preview: "ಇಂದು ನೀವು ಹೇಗೆ ಅನುಭವಿಸುತ್ತೀರಿ?" },
  { code: "te", name: "Telugu", native: "తెలుగు", script: "అ", preview: "ఈరోజు మీకు ఎలా అనిపిస్తోంది?" },
  { code: "ta", name: "Tamil", native: "தமிழ்", script: "அ", preview: "இன்று நீங்கள் எப்படி இருக்கிறீர்கள்?" },
  { code: "gu", name: "Gujarati", native: "ગુજરાતી", script: "અ", preview: "આજે તમે કેવું અનુભવો છો?" },
  { code: "bn", name: "Bengali", native: "বাংলা", script: "অ", preview: "আজ আপনি কেমন অনুভব করছেন?" },
];

export function LanguageSelection({ onContinue }: LanguageSelectionProps) {
  const [selected, setSelected] = useState("en");
  const [query, setQuery] = useState("");

  const filtered = LANGUAGES.filter(
    l => l.name.toLowerCase().includes(query.toLowerCase()) || l.native.includes(query)
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: "#fff" }}>
      {/* Header */}
      <div style={{ padding: "48px 24px 24px", textAlign: "center" }}>
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 16,
            background: "#e8f5e9",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px",
          }}
        >
          <Globe size={32} color="#2E7D32" />
        </div>
        <h1 style={{ color: "#1a2332", margin: "0 0 8px" }}>Choose Your Language</h1>
        <p style={{ color: "#637074", fontSize: 14, margin: 0 }}>
          Select your preferred language for the app
        </p>

        {/* Illustration */}
        <svg width="160" height="80" viewBox="0 0 160 80" fill="none" style={{ margin: "20px auto", display: "block" }}>
          <ellipse cx="80" cy="70" rx="60" ry="8" fill="#e8f5e9" />
          <rect x="55" y="20" width="50" height="45" rx="8" fill="#e8f5e9" stroke="#2E7D32" strokeWidth="1.5" />
          <rect x="62" y="30" width="36" height="4" rx="2" fill="#2E7D32" opacity="0.4" />
          <rect x="62" y="38" width="28" height="4" rx="2" fill="#2E7D32" opacity="0.3" />
          <rect x="62" y="46" width="32" height="4" rx="2" fill="#2E7D32" opacity="0.3" />
          <circle cx="80" cy="14" r="8" fill="#2E7D32" opacity="0.15" />
          <text x="80" y="18" textAnchor="middle" fontSize="10" fill="#2E7D32" fontWeight="600">🌐</text>
        </svg>
      </div>

      {/* Search */}
      <div style={{ padding: "0 24px 16px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: "#f4f7f4",
            borderRadius: 10,
            padding: "12px 16px",
            border: "1.5px solid rgba(0,0,0,0.06)",
          }}
        >
          <Search size={18} color="#8a9aaa" />
          <input
            type="text"
            placeholder="Search language…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            style={{
              border: "none",
              background: "none",
              outline: "none",
              fontSize: 15,
              color: "#1a2332",
              width: "100%",
            }}
          />
        </div>
      </div>

      {/* Language Cards */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0 24px", display: "flex", flexDirection: "column", gap: 10 }}>
        {filtered.map(lang => {
          const isSelected = selected === lang.code;
          return (
            <button
              key={lang.code}
              onClick={() => setSelected(lang.code)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                background: isSelected ? "#e8f5e9" : "#f9fafb",
                border: isSelected ? "2px solid #2E7D32" : "1.5px solid rgba(0,0,0,0.07)",
                borderRadius: 12,
                padding: "14px 16px",
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.15s",
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 10,
                  background: isSelected ? "#c8e6c9" : "#e8f5e9",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 20,
                  fontWeight: 700,
                  color: "#2E7D32",
                  flexShrink: 0,
                }}
              >
                {lang.script}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontWeight: 600, fontSize: 15, color: "#1a2332" }}>{lang.native}</span>
                  <span style={{ fontSize: 12, color: "#637074" }}>({lang.name})</span>
                </div>
                <p style={{ fontSize: 12, color: "#8a9aaa", margin: "2px 0 0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {lang.preview}
                </p>
              </div>
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  background: isSelected ? "#2E7D32" : "transparent",
                  border: isSelected ? "none" : "2px solid #d0d7e0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {isSelected && <Check size={14} color="#fff" />}
              </div>
            </button>
          );
        })}
      </div>

      {/* Continue */}
      <div style={{ padding: "24px", paddingBottom: "max(24px, env(safe-area-inset-bottom))" }}>
        <button
          onClick={() => onContinue(selected)}
          style={{
            width: "100%",
            padding: "16px",
            background: "#2E7D32",
            color: "#fff",
            border: "none",
            borderRadius: 12,
            fontSize: 16,
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          Continue <ChevronRight size={20} />
        </button>
      </div>
    </div>
  );
}
