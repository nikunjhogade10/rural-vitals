import { useState } from "react";
import { Heart, Shield, Wifi, Users } from "lucide-react";
import api from "../services/api";

interface LoginPageProps {
  onLogin: () => void;
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [employeeId, setEmployeeId] = useState("MH-DOC-042");
  const [password, setPassword] = useState("password123");
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const data = await api.postPublic("/auth/login", { employeeId, password });
      localStorage.setItem("rcl_token", data.token);
      localStorage.setItem("rcl_user", JSON.stringify(data.user));
      onLogin();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel */}
      <div
        className="hidden lg:flex lg:w-[55%] flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: "linear-gradient(145deg, #0d47a1 0%, #1565C0 40%, #1976D2 70%, #1e88e5 100%)" }}
      >
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
            <Heart className="w-5 h-5 text-white fill-white" />
          </div>
          <div>
            <div className="text-white font-semibold text-lg leading-none">RuralCareLink</div>
            <div className="text-blue-200 text-xs mt-0.5">Telemedicine Platform</div>
          </div>
        </div>

        {/* Illustration */}
        <div className="relative z-10 flex flex-col items-center">
          <svg viewBox="0 0 400 320" className="w-full max-w-md" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Doctor figure */}
            <circle cx="200" cy="80" r="40" fill="rgba(255,255,255,0.15)" />
            <circle cx="200" cy="70" r="28" fill="rgba(255,255,255,0.9)" />
            <rect x="170" y="100" width="60" height="80" rx="12" fill="rgba(255,255,255,0.85)" />
            {/* Stethoscope */}
            <path d="M185 115 Q175 135 180 150 Q185 165 200 165 Q215 165 220 150 Q225 135 215 115" stroke="#1565C0" strokeWidth="3" fill="none" strokeLinecap="round"/>
            <circle cx="200" cy="168" r="8" fill="#1565C0" />
            {/* Tablet/device */}
            <rect x="225" y="110" width="55" height="70" rx="6" fill="rgba(255,255,255,0.9)" />
            <rect x="230" y="118" width="45" height="50" rx="3" fill="#e3f2fd" />
            <rect x="234" y="122" width="37" height="4" rx="2" fill="#1565C0" />
            <rect x="234" y="130" width="25" height="3" rx="1.5" fill="#90caf9" />
            <rect x="234" y="137" width="30" height="3" rx="1.5" fill="#90caf9" />
            <rect x="234" y="144" width="20" height="3" rx="1.5" fill="#90caf9" />
            <rect x="234" y="155" width="37" height="8" rx="4" fill="#1565C0" />
            {/* Village/health centre */}
            <rect x="30" y="180" width="80" height="60" rx="4" fill="rgba(255,255,255,0.2)" />
            <polygon points="30,180 70,150 110,180" fill="rgba(255,255,255,0.3)" />
            <rect x="55" y="200" width="30" height="40" rx="2" fill="rgba(255,255,255,0.25)" />
            <rect x="40" y="195" width="18" height="18" rx="2" fill="rgba(255,255,255,0.3)" />
            <rect x="68" y="195" width="18" height="18" rx="2" fill="rgba(255,255,255,0.3)" />
            {/* Rural house */}
            <rect x="280" y="195" width="80" height="45" rx="3" fill="rgba(255,255,255,0.15)" />
            <polygon points="280,195 320,168 360,195" fill="rgba(255,255,255,0.2)" />
            <rect x="305" y="210" width="30" height="30" rx="2" fill="rgba(255,255,255,0.2)" />
            {/* Connection lines */}
            <path d="M110 210 Q155 200 165 180" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeDasharray="6 4" fill="none"/>
            <path d="M235 175 Q260 185 280 210" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeDasharray="6 4" fill="none"/>
            {/* Connectivity dots */}
            <circle cx="110" cy="210" r="5" fill="rgba(255,255,255,0.7)" />
            <circle cx="280" cy="210" r="5" fill="rgba(255,255,255,0.7)" />
            {/* Ground line */}
            <rect x="20" y="240" width="360" height="2" rx="1" fill="rgba(255,255,255,0.2)" />
            {/* Sync icons */}
            <circle cx="155" cy="265" r="20" fill="rgba(255,255,255,0.1)" />
            <path d="M148 265 Q155 258 162 265 Q155 272 148 265" stroke="rgba(255,255,255,0.8)" strokeWidth="2" fill="none"/>
            <circle cx="245" cy="265" r="20" fill="rgba(255,255,255,0.1)" />
            <path d="M238 262 L252 262 M252 262 L248 258 M252 262 L248 266" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
          </svg>
          <h2 className="text-white text-2xl font-medium text-center mt-4 leading-snug">
            Connecting Rural Patients<br />to Better Healthcare
          </h2>
          <p className="text-blue-200 text-sm text-center mt-3 max-w-xs leading-relaxed">
            Empowering doctors to deliver quality care to the most remote communities across India.
          </p>
        </div>

        {/* Feature chips */}
        <div className="relative z-10 flex flex-wrap gap-3">
          {[
            { icon: Shield, label: "Secure & Compliant" },
            { icon: Wifi, label: "Offline-First Sync" },
            { icon: Users, label: "Multi-PHC Support" },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 border border-white/20">
              <Icon className="w-3.5 h-3.5 text-blue-200" />
              <span className="text-white text-xs font-medium">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex items-center justify-center bg-white px-8 py-12">
        <div className="w-full max-w-[380px]">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#1565C0" }}>
              <Heart className="w-4 h-4 text-white fill-white" />
            </div>
            <span className="font-semibold text-[#1a2332]">RuralCareLink</span>
          </div>

          <div className="mb-8">
            <h1 className="text-[#1a2332] mb-1">Doctor Login</h1>
            <p className="text-[#6b7a94] text-sm">Sign in to access your patient dashboard</p>
          </div>

          {error && (
            <div className="bg-red-50 text-[#D32F2F] text-xs px-3 py-2 rounded-lg border border-red-100 mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[#1a2332] text-sm mb-1.5">Employee ID</label>
              <input
                type="text"
                value={employeeId}
                onChange={e => setEmployeeId(e.target.value)}
                placeholder="e.g. MH-DOC-042"
                className="w-full px-3.5 py-2.5 rounded-lg border text-sm text-[#1a2332] outline-none transition-all"
                style={{ borderColor: "rgba(21,101,192,0.2)", background: "#f8fafc" }}
                onFocus={e => (e.target.style.borderColor = "#1565C0")}
                onBlur={e => (e.target.style.borderColor = "rgba(21,101,192,0.2)")}
              />
            </div>

            <div>
              <label className="block text-[#1a2332] text-sm mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border text-sm text-[#1a2332] outline-none transition-all"
                style={{ borderColor: "rgba(21,101,192,0.2)", background: "#f8fafc" }}
                onFocus={e => (e.target.style.borderColor = "#1565C0")}
                onBlur={e => (e.target.style.borderColor = "rgba(21,101,192,0.2)")}
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <div
                  className="w-4 h-4 rounded border flex items-center justify-center transition-colors cursor-pointer"
                  style={{ borderColor: remember ? "#1565C0" : "rgba(21,101,192,0.3)", background: remember ? "#1565C0" : "transparent" }}
                  onClick={() => setRemember(!remember)}
                >
                  {remember && (
                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 10 8">
                      <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
                <span className="text-sm text-[#6b7a94]">Remember me</span>
              </label>
              <button type="button" className="text-sm font-medium" style={{ color: "#1565C0" }}>
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg text-white text-sm font-medium transition-all mt-2 flex items-center justify-center gap-2"
              style={{ background: loading ? "#90afd8" : "#1565C0" }}
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                  </svg>
                  Signing in…
                </>
              ) : (
                "Sign in to Dashboard"
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t" style={{ borderColor: "rgba(21,101,192,0.1)" }}>
            <p className="text-xs text-[#6b7a94] text-center">
              Need access?{" "}
              <button className="font-medium" style={{ color: "#1565C0" }}>
                Contact your PHC administrator
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
