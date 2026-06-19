import { useState, useEffect } from "react";
import { LoginPage } from "./components/LoginPage";
import { DashboardLayout } from "./components/DashboardLayout";
import { DashboardHome } from "./components/DashboardHome";
import { PendingCases } from "./components/PendingCases";
import { ReviewedCases } from "./components/ReviewedCases";
import { CaseReview } from "./components/CaseReview";
import { FollowUps } from "./components/FollowUps";
import { Referrals } from "./components/Referrals";
import { PatientHistory } from "./components/PatientHistory";
import { Reports } from "./components/Reports";
import { Notifications } from "./components/Notifications";
import { DoctorProfile } from "./components/DoctorProfile";
import api from "./services/api";

type Page =
  | "dashboard"
  | "pending"
  | "reviewed"
  | "followups"
  | "referrals"
  | "patients"
  | "reports"
  | "notifications"
  | "profile"
  | "case-review";

export default function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [currentPage, setCurrentPage] = useState<Page>("dashboard");
  const [reviewingCaseId, setReviewingCaseId] = useState<string>("");
  const [prevPage, setPrevPage] = useState<Page>("pending");
  const [notificationCount, setNotificationCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [followUpsCount, setFollowUpsCount] = useState(0);

  useEffect(() => {
    const token = localStorage.getItem("rcl_token");
    const userJson = localStorage.getItem("rcl_user");
    if (token && userJson) {
      try {
        const parsed = JSON.parse(userJson);
        if (parsed && parsed.id) {
          setLoggedIn(true);
          return;
        }
      } catch (e) {
        console.error("Corrupted session data detected, clearing state:", e);
      }
    }
    // Clean up if incomplete or invalid
    localStorage.removeItem("rcl_token");
    localStorage.removeItem("rcl_user");
    setLoggedIn(false);
  }, []);

  useEffect(() => {
    const handleLogout = () => {
      setLoggedIn(false);
      localStorage.removeItem("rcl_token");
      localStorage.removeItem("rcl_user");
    };
    window.addEventListener("rcl:logout", handleLogout);
    return () => window.removeEventListener("rcl:logout", handleLogout);
  }, []);

  useEffect(() => {
    if (!loggedIn) return;

    const fetchSummary = async () => {
      try {
        const data = await api.get("/dashboard/summary");
        setNotificationCount(data.unreadNotifications || 0);
        setPendingCount(data.pendingReviews || 0);
        setFollowUpsCount(data.followUpsDue || 0);
      } catch (err) {
        console.error("Failed to fetch dashboard summary:", err);
      }
    };

    fetchSummary();
    const interval = setInterval(fetchSummary, 30000);
    return () => clearInterval(interval);
  }, [loggedIn]);

  const handleViewCase = (id: string, from: Page = "pending") => {
    setReviewingCaseId(id);
    setPrevPage(from);
    setCurrentPage("case-review");
  };

  const handleNavigate = (page: Page) => {
    setCurrentPage(page);
  };

  if (!loggedIn) {
    return <LoginPage onLogin={() => setLoggedIn(true)} />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case "dashboard":
        return <DashboardHome onViewCase={(id) => handleViewCase(id, "dashboard")} />;
      case "pending":
        return <PendingCases onViewCase={(id) => handleViewCase(id, "pending")} />;
      case "reviewed":
        return <ReviewedCases />;
      case "case-review":
        return (
          <CaseReview
            caseId={reviewingCaseId}
            onBack={() => setCurrentPage(prevPage)}
          />
        );
      case "followups":
        return <FollowUps />;
      case "referrals":
        return <Referrals />;
      case "patients":
        return <PatientHistory />;
      case "reports":
        return <Reports />;
      case "notifications":
        return <Notifications />;
      case "profile":
        return <DoctorProfile />;
      default:
        return <DashboardHome onViewCase={(id) => handleViewCase(id, "dashboard")} />;
    }
  };

  return (
    <DashboardLayout
      currentPage={currentPage === "case-review" ? "pending" : currentPage}
      onNavigate={handleNavigate}
      notificationCount={notificationCount}
      pendingCount={pendingCount}
      followUpsCount={followUpsCount}
    >
      {renderPage()}
    </DashboardLayout>
  );
}
