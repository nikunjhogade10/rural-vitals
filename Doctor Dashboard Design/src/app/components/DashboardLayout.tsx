import { useState } from "react";
import {
  LayoutDashboard, Clock, CheckCircle2, CalendarCheck, ArrowRightLeft,
  Users, BarChart3, Settings, Bell, Search, Globe, ChevronDown,
  Heart, LogOut, Menu, X
} from "lucide-react";

type Page =
  | "dashboard"
  | "pending"
  | "reviewed"
  | "followups"
  | "referrals"
  | "patients"
  | "reports"
  | "notifications"
  | "profile";

interface DashboardLayoutProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  children: React.ReactNode;
  notificationCount?: number;
  pendingCount?: number;
  followUpsCount?: number;
}

export function DashboardLayout({
  currentPage,
  onNavigate,
  children,
  notificationCount = 5,
  pendingCount = 0,
  followUpsCount = 0
}: DashboardLayoutProps) {
  const navItems = [
    { id: "dashboard" as Page, label: "Dashboard", icon: LayoutDashboard },
    { id: "pending" as Page, label: "Pending Cases", icon: Clock, badge: pendingCount > 0 ? pendingCount : undefined },
    { id: "reviewed" as Page, label: "Reviewed Cases", icon: CheckCircle2 },
    { id: "followups" as Page, label: "Follow-Ups", icon: CalendarCheck, badge: followUpsCount > 0 ? followUpsCount : undefined },
    { id: "referrals" as Page, label: "Referrals", icon: ArrowRightLeft },
    { id: "patients" as Page, label: "Patients", icon: Users },
    { id: "reports" as Page, label: "Reports", icon: BarChart3 },
    { id: "profile" as Page, label: "Settings", icon: Settings },
  ];
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchVal, setSearchVal] = useState("");
  const [langOpen, setLangOpen] = useState(false);
  const [lang, setLang] = useState("English");
  const langs = ["English", "हिंदी", "मराठी", "ಕನ್ನಡ", "తెలుగు"];

  const userJson = localStorage.getItem("rcl_user");
  let user: any = null;
  try {
    user = userJson ? JSON.parse(userJson) : null;
  } catch (e) {
    console.error("Error parsing rcl_user:", e);
  }
  const fullName = user?.fullName || "Dr. Rajesh Kapoor";
  const roleLabel = user ? (user.role === "DOCTOR" ? "Specialist Doctor" : "Health Worker") : "Specialist Doctor";
  const initials = fullName.split(" ").filter(Boolean).map((n: string) => n[0]).join("").slice(0, 2);

  const handleLogout = () => {
    localStorage.removeItem("rcl_token");
    localStorage.removeItem("rcl_user");
    window.dispatchEvent(new Event("rcl:logout"));
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#f5f7fa]">
      {/* Sidebar overlay for mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-20 bg-black/40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static z-30 flex flex-col h-full w-60 bg-white border-r transition-transform duration-200 lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
        style={{ borderColor: "rgba(21,101,192,0.1)" }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-4 border-b" style={{ borderColor: "rgba(21,101,192,0.1)" }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#1565C0" }}>
            <Heart className="w-4 h-4 text-white fill-white" />
          </div>
          <div>
            <div className="text-[#1a2332] text-sm font-semibold leading-none">RuralCareLink</div>
            <div className="text-[#6b7a94] text-[10px] mt-0.5">Doctor Portal</div>
          </div>
          <button className="ml-auto lg:hidden text-[#6b7a94]" onClick={() => setSidebarOpen(false)}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 overflow-y-auto">
          <div className="px-3 mb-1">
            <span className="text-[10px] font-semibold text-[#6b7a94] uppercase tracking-widest px-2">Main Menu</span>
          </div>
          {navItems.map(({ id, label, icon: Icon, badge }) => {
            const active = currentPage === id;
            return (
              <button
                key={id}
                onClick={() => { onNavigate(id); setSidebarOpen(false); }}
                className="w-full flex items-center gap-3 px-5 py-2.5 text-sm font-medium transition-colors relative group"
                style={{
                  color: active ? "#1565C0" : "#4a5568",
                  background: active ? "#e3f2fd" : "transparent",
                }}
                onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "#f8fafc"; }}
                onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                {active && (
                  <div className="absolute left-0 top-1 bottom-1 w-0.5 rounded-r" style={{ background: "#1565C0" }} />
                )}
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span>{label}</span>
                {badge && (
                  <span className="ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded-full text-white" style={{ background: active ? "#1565C0" : "#64b5f6" }}>
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom user */}
        <div className="border-t px-5 py-3" style={{ borderColor: "rgba(21,101,192,0.1)" }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold" style={{ background: "#1565C0" }}>
              {initials || "DR"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-[#1a2332] truncate">{fullName}</div>
              <div className="text-[10px] text-[#6b7a94] truncate">{roleLabel}</div>
            </div>
            <button onClick={handleLogout} className="text-[#6b7a94] hover:text-[#D32F2F] transition-colors" title="Log Out">
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Navbar */}
        <header className="bg-white border-b px-5 py-0 flex items-center gap-4 h-14 flex-shrink-0" style={{ borderColor: "rgba(21,101,192,0.1)" }}>
          <button className="lg:hidden text-[#6b7a94]" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5" />
          </button>

          {/* Search */}
          <div className="flex items-center gap-2 flex-1 max-w-sm bg-[#f0f4f8] rounded-lg px-3 py-2">
            <Search className="w-3.5 h-3.5 text-[#6b7a94] flex-shrink-0" />
            <input
              value={searchVal}
              onChange={e => setSearchVal(e.target.value)}
              placeholder="Search patients, cases…"
              className="bg-transparent text-xs text-[#1a2332] outline-none w-full placeholder-[#6b7a94]"
            />
          </div>

          <div className="flex items-center gap-3 ml-auto">
            {/* Language */}
            <div className="relative">
              <button
                onClick={() => setLangOpen(!langOpen)}
                className="flex items-center gap-1.5 text-xs font-medium text-[#4a5568] hover:text-[#1565C0] transition-colors px-2 py-1 rounded"
              >
                <Globe className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{lang}</span>
                <ChevronDown className="w-3 h-3" />
              </button>
              {langOpen && (
                <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border z-50 py-1 min-w-[130px]" style={{ borderColor: "rgba(21,101,192,0.1)" }}>
                  {langs.map(l => (
                    <button key={l} onClick={() => { setLang(l); setLangOpen(false); }}
                      className="w-full text-left px-3 py-1.5 text-xs hover:bg-[#f0f4f8] transition-colors"
                      style={{ color: l === lang ? "#1565C0" : "#4a5568", fontWeight: l === lang ? 500 : 400 }}>
                      {l}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Notifications */}
            <button
              onClick={() => onNavigate("notifications")}
              className="relative w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#f0f4f8] transition-colors"
            >
              <Bell className="w-4 h-4 text-[#4a5568]" />
              {notificationCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-[9px] font-bold text-white flex items-center justify-center" style={{ background: "#D32F2F" }}>
                  {notificationCount}
                </span>
              )}
            </button>

            {/* Profile */}
            <button onClick={() => onNavigate("profile")} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-semibold" style={{ background: "#1565C0" }}>
                {initials || "DR"}
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-xs font-medium text-[#1a2332]">{fullName}</div>
              </div>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
