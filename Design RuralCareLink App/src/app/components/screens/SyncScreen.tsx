import { useState, useEffect } from "react";
import { RefreshCw, CheckCircle, AlertCircle, Wifi, WifiOff, Clock } from "lucide-react";
import { useLocalData } from "../../context/LocalDataContext";
import { pushPendingRecords, pullServerRecords, SyncResult } from "../../services/syncService";
import { useI18n } from "../../context/I18nContext";
import { syncService } from "../../services";

interface ServerSyncHistory {
  id: string;
  triggeredById: string;
  totalRecords: number;
  successCount: number;
  failedCount: number;
  status: 'PROCESSING' | 'SYNCED' | 'FAILED';
  startedAt: string;
  finishedAt: string | null;
}

interface SyncScreenProps {
  isOnline: boolean;
  onBack?: () => void;
}

export function SyncScreen({ isOnline }: SyncScreenProps) {
  const { pendingCount: rawPendingCount, visits, patients, reports, refresh } = useLocalData();
  const [syncing, setSyncing] = useState(false);
  const [lastResult, setLastResult] = useState<SyncResult | null>(null);
  const [history, setHistory] = useState<ServerSyncHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const { t, locale } = useI18n();

  // We count all entities (patients, visits, and reports) that need to be uploaded (pending + failed).
  const pendingCount = patients.filter(p => p.syncStatus === 'pending' || p.syncStatus === 'failed').length +
                       visits.filter(v => v.syncStatus === 'pending' || v.syncStatus === 'failed').length +
                       reports.filter(r => r.syncStatus === 'pending' || r.syncStatus === 'failed').length;
  const onlyPendingCount = patients.filter(p => p.syncStatus === 'pending').length +
                           visits.filter(v => v.syncStatus === 'pending').length +
                           reports.filter(r => r.syncStatus === 'pending').length;
  const totalSynced = patients.filter(p => p.syncStatus === 'synced').length +
                      visits.filter(v => v.syncStatus === 'synced').length +
                      reports.filter(r => r.syncStatus === 'synced').length;
  const totalFailed = patients.filter(p => p.syncStatus === 'failed').length +
                      visits.filter(v => v.syncStatus === 'failed').length +
                      reports.filter(r => r.syncStatus === 'failed').length;

  async function loadHistory() {
    try {
      const data = await syncService.history();
      setHistory(data.history || []);
    } catch {
      // silent
    } finally {
      setLoadingHistory(false);
    }
  }

  useEffect(() => {
    loadHistory();
  }, []);

  const handleSync = async () => {
    if (!isOnline || syncing) return;
    setSyncing(true);
    setLastResult(null);
    try {
      const result = await pushPendingRecords();
      setLastResult(result);
      try {
        await pullServerRecords();
      } catch (pullErr) {
        console.error("Pull failed during sync:", pullErr);
      }
      await refresh(); // reload local state after sync
      await loadHistory(); // refresh history list from backend
    } catch (err) {
      setLastResult({
        patientsPushed: 0, visitsPushed: 0, reportsPushed: 0,
        patientsFailed: 0, visitsFailed: 0, reportsFailed: 0,
        errors: [err instanceof Error ? err.message : 'Sync failed unexpectedly'],
      });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: "#f4f7f4", paddingBottom: 100 }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #1b5e20 0%, #2E7D32 100%)", padding: "48px 24px 28px" }}>
        <h1 style={{ color: "#fff", margin: "0 0 6px", fontSize: 22, fontWeight: 700 }}>
          {t('sync_title', 'Data Synchronization')}
        </h1>
        <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 13, margin: "0 0 12px" }}>
          {t('sync_subtitle', 'Upload offline records to server')}
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {isOnline ? (
            <Wifi size={14} color="#a5d6a7" />
          ) : (
            <WifiOff size={14} color="#ef9a9a" />
          )}
          <span style={{ color: isOnline ? "#a5d6a7" : "#ef9a9a", fontSize: 13, fontWeight: 500 }}>
            {isOnline ? t('sync_connected_ready', 'Connected — Ready to sync') : t('sync_offline_msg', 'Sync requires internet connection')}
          </span>
        </div>
      </div>

      {/* Main Container */}
      <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: 16, marginTop: -16 }}>
        
        {/* Sync Action Card */}
        <div
          style={{
            background: "#fff",
            borderRadius: 16,
            padding: "24px 20px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            border: "1px solid rgba(0,0,0,0.04)"
          }}
        >
          {/* Sync status circle icon */}
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: "50%",
              background: "#f0f4f8",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 16,
            }}
          >
            <RefreshCw
              size={32}
              color="#8a9aaa"
              style={{ animation: syncing ? "spin 1.5s linear infinite" : "none" }}
            />
          </div>

          <h2 style={{ color: "#1a2332", margin: "0 0 4px", fontSize: 18, fontWeight: 700 }}>
            {syncing ? t('sync_running', 'Syncing Records...') : t('sync_ready', 'Ready to Sync')}
          </h2>
          <p style={{ color: "#637074", fontSize: 14, margin: "0 0 20px" }}>
            {pendingCount} {t('sync_pending_upload_desc', 'records pending upload')}
          </p>

          {/* Sync Stats Cards Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, width: "100%", marginBottom: 20 }}>
            {/* Pending card */}
            <div style={{ background: "#fffde7", borderRadius: 8, padding: "12px 10px", textAlign: "center", border: "1px solid rgba(245,127,23,0.12)" }}>
               <div style={{ fontSize: 20, fontWeight: 700, color: "#f57f17" }}>{onlyPendingCount}</div>
               <div style={{ fontSize: 11, color: "#f57f17", marginTop: 2, fontWeight: 500 }}>{t('sync_pending', 'Pending')}</div>
            </div>
            {/* Synced card */}
            <div style={{ background: "#e8f5e9", borderRadius: 8, padding: "12px 10px", textAlign: "center", border: "1px solid rgba(46,125,50,0.12)" }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#2E7D32" }}>{totalSynced}</div>
              <div style={{ fontSize: 11, color: "#2E7D32", marginTop: 2, fontWeight: 500 }}>{t('sync_synced', 'Synced')}</div>
            </div>
            {/* Failed card */}
            <div style={{ background: "#ffebee", borderRadius: 8, padding: "12px 10px", textAlign: "center", border: "1px solid rgba(198,40,40,0.12)" }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#c62828" }}>{totalFailed}</div>
              <div style={{ fontSize: 11, color: "#c62828", marginTop: 2, fontWeight: 500 }}>{t('sync_failed', 'Failed')}</div>
            </div>
          </div>

          {/* Start Sync Button */}
          <button
            onClick={handleSync}
            disabled={!isOnline || syncing || pendingCount === 0}
            style={{
              width: "100%",
              padding: "14px",
              background: !isOnline || pendingCount === 0 ? "#b0bec5" : syncing ? "#81c784" : "#2E7D32",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontSize: 16,
              fontWeight: 600,
              cursor: !isOnline || syncing || pendingCount === 0 ? "default" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
            }}
          >
            <RefreshCw size={18} style={{ animation: syncing ? "spin 1s linear infinite" : "none" }} />
            {syncing ? t('loading', 'Syncing…') : t('sync_start_button', 'Start Sync')}
          </button>
        </div>

        {/* Last sync execution feedback */}
        {lastResult && (
          <div style={{ background: lastResult.errors.length === 0 ? "#e8f5e9" : "#ffebee", border: `1px solid ${lastResult.errors.length === 0 ? "#a5d6a7" : "#ef9a9a"}`, borderRadius: 12, padding: "14px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              {lastResult.errors.length === 0
                ? <CheckCircle size={18} color="#2E7D32" />
                : <AlertCircle size={18} color="#c62828" />
              }
              <span style={{ fontSize: 14, fontWeight: 600, color: lastResult.errors.length === 0 ? "#2E7D32" : "#c62828" }}>
                {lastResult.errors.length === 0 ? t('sync_completed_success', 'Sync completed') : t('sync_completed_errors', 'Sync completed with errors')}
              </span>
            </div>
            <div style={{ fontSize: 13, color: "#637074" }}>
              {lastResult.patientsPushed} {t('nav_patients', 'patients')} {t('sync_synced_verb', 'synced')} ·{" "}
              {lastResult.visitsPushed} {t('vitals_title', 'visits')} {t('sync_synced_verb', 'synced')}
              {lastResult.reportsPushed > 0 && ` · ${lastResult.reportsPushed} ${t('vitals_report', 'reports')} ${t('sync_synced_verb', 'synced')}`}
            </div>
            {lastResult.errors.length > 0 && (
              <div style={{ marginTop: 8 }}>
                {lastResult.errors.map((e, i) => (
                  <div key={i} style={{ fontSize: 12, color: "#c62828", marginTop: 4 }}>• {e}</div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Sync History Card */}
        <div
          style={{
            background: "#fff",
            borderRadius: 16,
            padding: "20px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
            border: "1px solid rgba(0,0,0,0.04)",
            display: "flex",
            flexDirection: "column"
          }}
        >
          <h3 style={{ color: "#1a2332", fontSize: 16, fontWeight: 700, margin: "0 0 16px" }}>
            {t('sync_history', 'Sync History')}
          </h3>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {loadingHistory ? (
              <div style={{ fontSize: 13, color: "#8a9aaa", textAlign: "center", padding: "10px 0" }}>
                {t('loading', 'Loading…')}
              </div>
            ) : history.length === 0 ? (
              <div style={{ fontSize: 13, color: "#8a9aaa", textAlign: "center", padding: "10px 0" }}>
                {t('sync_no_history', 'No sync history logs found')}
              </div>
            ) : (
              history.map(item => {
                const isPartiallyFailed = item.failedCount > 0 && item.successCount > 0;
                const isAllFailed = item.failedCount > 0 && item.successCount === 0;
                const dateObj = new Date(item.startedAt);
                
                // Format date manually to be clean and simple: e.g. "Today 08:15 AM" or "Yesterday 04:30 PM" or "4 Jun 10:00 AM"
                const diffMs = Date.now() - dateObj.getTime();
                const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                
                let dayStr = "";
                if (diffDays === 0) {
                  dayStr = "Today";
                } else if (diffDays === 1) {
                  dayStr = "Yesterday";
                } else {
                  dayStr = dateObj.toLocaleDateString(locale === 'en' ? 'en-IN' : locale, {
                    day: "numeric",
                    month: "short"
                  });
                }
                const timeStr = dateObj.toLocaleTimeString(locale === 'en' ? 'en-IN' : locale, {
                  hour: "2-digit",
                  minute: "2-digit"
                });
                const formattedTime = `${dayStr} ${timeStr}`;

                let iconBg = "#e8f5e9";
                let icon = <CheckCircle size={18} color="#2E7D32" />;
                let text = `${item.successCount} ${t('sync_records_synced', 'records synced')}`;

                if (isPartiallyFailed) {
                  iconBg = "#fff3e0";
                  icon = <AlertCircle size={18} color="#e65100" />;
                  text = `${item.totalRecords} ${t('sync_records_partially', 'records partially synced')}`;
                } else if (isAllFailed) {
                  iconBg = "#ffebee";
                  icon = <AlertCircle size={18} color="#c62828" />;
                  text = `${item.failedCount} ${t('sync_records_failed', 'records failed')}`;
                }

                return (
                  <div key={item.id} style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, borderRadius: "50%", background: iconBg }}>
                      {icon}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "#1a2332" }}>
                        {text}
                      </div>
                      <div style={{ fontSize: 12, color: "#8a9aaa", marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}>
                        <Clock size={12} /> {formattedTime}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
