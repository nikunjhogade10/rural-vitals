import { Globe } from "lucide-react";
import { useState } from "react";

const LANGUAGES = [
  { code: "en", label: "EN", name: "English" },
  { code: "hi", label: "हि", name: "Hindi" },
  { code: "mr", label: "म", name: "Marathi" },
  { code: "kn", label: "ಕ", name: "Kannada" },
  { code: "te", label: "తె", name: "Telugu" },
  { code: "ta", label: "த", name: "Tamil" },
  { code: "gu", label: "ગુ", name: "Gujarati" },
  { code: "bn", label: "বা", name: "Bengali" },
];

interface LanguageSwitcherProps {
  currentLang: string;
  onChangeLang: (lang: string) => void;
}

export function LanguageSwitcher({ currentLang, onChangeLang }: LanguageSwitcherProps) {
  const [open, setOpen] = useState(false);
  const current = LANGUAGES.find(l => l.code === currentLang) || LANGUAGES[0];

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          background: "#e8f5e9",
          border: "none",
          borderRadius: 8,
          padding: "6px 10px",
          cursor: "pointer",
          color: "#2E7D32",
          fontSize: 13,
          fontWeight: 600,
        }}
      >
        <Globe size={14} />
        {current.label}
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            right: 0,
            marginTop: 4,
            background: "#fff",
            border: "1px solid rgba(0,0,0,0.1)",
            borderRadius: 10,
            boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
            zIndex: 1000,
            minWidth: 160,
            maxHeight: "55vh",
            overflowY: "auto",
          }}
        >
          {LANGUAGES.map(lang => (
            <button
              key={lang.code}
              onClick={() => { onChangeLang(lang.code); setOpen(false); }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                width: "100%",
                padding: "10px 14px",
                border: "none",
                background: lang.code === currentLang ? "#e8f5e9" : "#fff",
                cursor: "pointer",
                color: lang.code === currentLang ? "#2E7D32" : "#1a2332",
                fontSize: 14,
                textAlign: "left",
              }}
            >
              <span style={{ fontSize: 16, width: 20, textAlign: "center" }}>{lang.label}</span>
              <span>{lang.name}</span>
              {lang.code === currentLang && <span style={{ marginLeft: "auto", color: "#2E7D32" }}>✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
