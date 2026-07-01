import { useState, useEffect } from "react";
import { SplashScreen } from "./components/screens/SplashScreen";
import { LanguageSelection } from "./components/screens/LanguageSelection";
import { LoginScreen } from "./components/screens/LoginScreen";
import { Dashboard } from "./components/screens/Dashboard";
import { PatientRegistration } from "./components/screens/PatientRegistration";
import { SymptomsVitals } from "./components/screens/SymptomsVitals";
import { OfflineSuccess } from "./components/screens/OfflineSuccess";
import { PatientCaseList } from "./components/screens/PatientCaseList";
import { CaseDetails } from "./components/screens/CaseDetails";
import { SyncScreen } from "./components/screens/SyncScreen";
import { Notifications } from "./components/screens/Notifications";
import { ProfileSettings } from "./components/screens/ProfileSettings";
import { ConsultationRoom } from "./components/screens/ConsultationRoom";
import { BottomNav, NavTab } from "./components/BottomNav";
import { Patient } from "./components/PatientCard";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { I18nProvider, useI18n } from "./context/I18nContext";
import { LocalDataProvider, useLocalData } from "./context/LocalDataContext";

type Screen =
  | "splash" | "language" | "login" | "dashboard"
  | "register" | "vitals" | "success" | "patients"
  | "caseDetails" | "sync" | "notifications" | "profile"
  | "consultationRoom";

const SCREENS_WITH_NAV: Screen[] = ["dashboard", "patients", "sync", "notifications", "profile"];
const NAV_TAB_MAP: Record<NavTab, Screen> = {
  dashboard: "dashboard", patients: "patients", sync: "sync",
  notifications: "notifications", profile: "profile",
};

function AppInner() {
  const { user } = useAuth();
  const { setLocale } = useI18n();
  const { pendingCount, refresh } = useLocalData();
  const [screen, setScreen] = useState<Screen>("splash");
  const [lang, setLang] = useState("en");
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [selectedVisitId, setSelectedVisitId] = useState<string>("");
  const [selectedPatientName, setSelectedPatientName] = useState<string>("");

  // Real connectivity detection
  useEffect(() => {
    const up = () => setIsOnline(true);
    const dn = () => setIsOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", dn);
    return () => { window.removeEventListener("online", up); window.removeEventListener("offline", dn); };
  }, []);

  // Auto-pull from server on login / online detection
  useEffect(() => {
    if (user && isOnline) {
      import("./services/syncService").then(({ pullServerRecords }) => {
        pullServerRecords()
          .then(() => refresh())
          .catch((err) => console.error("Auto-pull failed:", err));
      });
    }
  }, [user, isOnline, refresh]);

  // Auto-redirect to login when user logs out while on a protected screen
  useEffect(() => {
    if (!user && !["splash", "language", "login"].includes(screen)) {
      setScreen("login");
    }
  }, [user, screen]);

  const navigate = (s: Screen) => setScreen(s);
  const handleNavTab = (tab: NavTab) => setScreen(NAV_TAB_MAP[tab]);
  const getActiveNav = (): NavTab => {
    const found = Object.entries(NAV_TAB_MAP).find(([, s]) => s === screen);
    return (found?.[0] as NavTab) || "dashboard";
  };
  const showNav = SCREENS_WITH_NAV.includes(screen);

  const handleLangChange = (l: string) => {
    setLang(l);
    setLocale(l); // fetch translations from backend
  };

  return (
    <div style={{ display: "flex", justifyContent: "center", background: "#1a2332", minHeight: "100vh", fontFamily: "'Inter', 'Poppins', system-ui, sans-serif" }}>
      {/* MARKER-MAKE-KIT-INVOKED */}
      <div style={{ width: "100%", maxWidth: 430, minHeight: "100vh", background: "#fff", position: "relative", overflowX: "hidden", boxShadow: "0 0 60px rgba(0,0,0,0.4)" }}>

        {screen === "splash" && (
          <SplashScreen onComplete={() => navigate("language")} />
        )}

        {screen === "language" && (
          <LanguageSelection onContinue={(l) => { handleLangChange(l); navigate("login"); }} />
        )}

        {screen === "login" && (
          <LoginScreen
            onLogin={() => navigate("dashboard")}
            onContinueOffline={() => navigate("dashboard")}
            currentLang={lang}
            onChangeLang={handleLangChange}
          />
        )}

        {screen === "dashboard" && (
          <Dashboard
            isOnline={isOnline}
            onNavigate={(s) => navigate(s as Screen)}
            currentLang={lang}
            onChangeLang={handleLangChange}
            onPatientClick={(p) => {
              setSelectedVisitId((p as Patient & { id: string }).id);
              navigate("caseDetails");
            }}
          />
        )}

        {screen === "register" && (
          <PatientRegistration
            onBack={() => navigate("dashboard")}
            onContinue={() => navigate("vitals")}
            currentLang={lang}
            onChangeLang={handleLangChange}
          />
        )}

        {screen === "vitals" && (
          <SymptomsVitals onBack={() => navigate("register")} onSave={() => navigate("success")} />
        )}

        {screen === "success" && (
          <OfflineSuccess onSync={() => navigate("sync")} onDashboard={() => navigate("dashboard")} />
        )}

        {screen === "patients" && (
          <PatientCaseList
            onBack={() => navigate("dashboard")}
            onPatientClick={(p) => {
              setSelectedVisitId((p as Patient & { id: string }).id);
              navigate("caseDetails");
            }}
            currentLang={lang}
            onChangeLang={handleLangChange}
          />
        )}

        {screen === "caseDetails" && selectedVisitId && (
          <CaseDetails
            visitId={selectedVisitId}
            onBack={() => navigate("patients")}
            onStartCall={(name) => {
              setSelectedPatientName(name);
              navigate("consultationRoom");
            }}
          />
        )}

        {screen === "consultationRoom" && selectedVisitId && (
          <ConsultationRoom
            visitId={selectedVisitId}
            patientName={selectedPatientName}
            onClose={() => navigate("caseDetails")}
          />
        )}

        {screen === "sync" && (
          <SyncScreen isOnline={isOnline} onBack={() => navigate("dashboard")} />
        )}

        {screen === "notifications" && (
          <Notifications onBack={() => navigate("dashboard")} />
        )}

        {screen === "profile" && (
          <ProfileSettings
            onBack={() => navigate("dashboard")}
            onLogout={() => navigate("login")}
            currentLang={lang}
            onChangeLang={handleLangChange}
          />
        )}

        {showNav && (
          <BottomNav active={getActiveNav()} onNavigate={handleNavTab} pendingSync={pendingCount} unreadNotifications={0} />
        )}



      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <I18nProvider initialLocale="en">
        <LocalDataProvider>
          <AppInner />
        </LocalDataProvider>
      </I18nProvider>
    </AuthProvider>
  );
}
