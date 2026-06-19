/**
 * ReportUpload.tsx
 * Self-contained PDF upload widget.
 * - Opens native file picker restricted to PDF only
 * - Validates MIME type AND file extension after selection
 * - Reads file as ArrayBuffer and stores in IndexedDB via LocalDataContext
 * - Shows status: idle / selected / saving / pending / failed
 */

import { useRef, useState } from "react";
import { FileText, Upload, X, AlertCircle, Clock, CheckCircle, XCircle } from "lucide-react";
import { useLocalData } from "../context/LocalDataContext";

interface ReportUploadProps {
  patientId: string;
  visitId?: string;
  /** Called after the report is successfully saved to IndexedDB */
  onSaved?: (reportId: string) => void;
}

type UploadState =
  | { phase: 'idle' }
  | { phase: 'validating' }
  | { phase: 'selected'; file: File }
  | { phase: 'saving' }
  | { phase: 'saved'; fileName: string; reportId: string; syncStatus: 'pending' | 'failed' }
  | { phase: 'error'; message: string };

const PDF_MIME = 'application/pdf';

function isPDF(file: File): boolean {
  const byMime = file.type === PDF_MIME;
  const byExt = file.name.toLowerCase().endsWith('.pdf');
  return byMime || byExt;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ReportUpload({ patientId, visitId, onSaved }: ReportUploadProps) {
  const { addReport } = useLocalData();
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<UploadState>({ phase: 'idle' });

  const openPicker = () => {
    if (inputRef.current) {
      inputRef.current.value = ''; // reset so same file can be re-selected
      inputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // ── Validation ──────────────────────────────────────────
    if (!isPDF(file)) {
      setState({
        phase: 'error',
        message: `"${file.name}" is not a PDF. Only PDF files are allowed.`,
      });
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setState({ phase: 'error', message: 'File is too large. Maximum size is 20 MB.' });
      return;
    }

    setState({ phase: 'selected', file });
  };

  const handleSave = async () => {
    if (state.phase !== 'selected') return;
    const file = state.file;

    setState({ phase: 'saving' });
    try {
      const buffer = await file.arrayBuffer();
      const report = await addReport({
        patientId,
        visitId,
        fileName: file.name,
        fileSize: file.size,
        mimeType: PDF_MIME,
        data: buffer,
      });
      setState({ phase: 'saved', fileName: file.name, reportId: report.id, syncStatus: 'pending' });
      onSaved?.(report.id);
    } catch {
      setState({ phase: 'error', message: 'Failed to save report locally. Please try again.' });
    }
  };

  const reset = () => setState({ phase: 'idle' });

  // ── Render ────────────────────────────────────────────────
  return (
    <div style={{ marginBottom: 8 }}>
      {/* Hidden native file input — PDF only */}
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,application/pdf"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {state.phase === 'idle' && (
        <button
          onClick={openPicker}
          style={{
            width: '100%',
            padding: '14px 16px',
            background: '#fff',
            border: '1.5px dashed #90caf9',
            borderRadius: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            cursor: 'pointer',
            color: '#1565C0',
          }}
        >
          <div style={{ width: 38, height: 38, borderRadius: 10, background: '#e3f2fd', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Upload size={18} color="#1565C0" />
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: '#1a2332' }}>Upload Lab Report / PDF</div>
            <div style={{ fontSize: 12, color: '#8a9aaa', marginTop: 2 }}>PDF files only · Max 20 MB</div>
          </div>
        </button>
      )}

      {state.phase === 'selected' && (
        <div style={{ background: '#e3f2fd', border: '1.5px solid #90caf9', borderRadius: 12, padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <FileText size={22} color="#1565C0" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#1a2332', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {state.file.name}
              </div>
              <div style={{ fontSize: 12, color: '#8a9aaa', marginTop: 2 }}>
                {formatBytes(state.file.size)} · PDF
              </div>
            </div>
            <button onClick={reset} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#8a9aaa' }}>
              <X size={16} />
            </button>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleSave}
              style={{ flex: 1, padding: '10px', background: '#1565C0', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
            >
              Attach Report
            </button>
            <button
              onClick={openPicker}
              style={{ padding: '10px 14px', background: '#fff', color: '#1565C0', border: '1.5px solid #90caf9', borderRadius: 10, fontSize: 13, cursor: 'pointer' }}
            >
              Change
            </button>
          </div>
        </div>
      )}

      {state.phase === 'saving' && (
        <div style={{ background: '#e3f2fd', border: '1.5px solid #90caf9', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 20, height: 20, border: '2px solid #1565C0', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <span style={{ fontSize: 14, color: '#1565C0', fontWeight: 500 }}>Saving to local storage…</span>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {state.phase === 'saved' && (
        <div style={{ background: '#e8f5e9', border: '1.5px solid #a5d6a7', borderRadius: 12, padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <FileText size={20} color="#2E7D32" style={{ flexShrink: 0, marginTop: 2 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#1a2332', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {state.fileName}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4 }}>
                <Clock size={12} color="#f57f17" />
                <span style={{ fontSize: 12, color: '#f57f17', fontWeight: 500 }}>Pending sync — saved locally</span>
              </div>
            </div>
            <button
              onClick={openPicker}
              title="Replace report"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#8a9aaa' }}
            >
              <Upload size={14} />
            </button>
          </div>
        </div>
      )}

      {state.phase === 'error' && (
        <div style={{ background: '#ffebee', border: '1.5px solid #ef9a9a', borderRadius: 12, padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
            <AlertCircle size={18} color="#c62828" style={{ flexShrink: 0, marginTop: 1 }} />
            <span style={{ fontSize: 13, color: '#c62828', lineHeight: 1.4 }}>{state.message}</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={openPicker}
              style={{ flex: 1, padding: '9px', background: '#c62828', color: '#fff', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            >
              Try Again
            </button>
            <button
              onClick={reset}
              style={{ padding: '9px 14px', background: '#fff', color: '#c62828', border: '1.5px solid #ef9a9a', borderRadius: 9, fontSize: 13, cursor: 'pointer' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Read-only status badge for already-attached reports ───

interface ReportStatusRowProps {
  fileName: string;
  fileSize: number;
  syncStatus: 'pending' | 'synced' | 'failed';
}

export function ReportStatusRow({ fileName, fileSize, syncStatus }: ReportStatusRowProps) {
  const statusMap = {
    pending: { icon: <Clock size={12} color="#f57f17" />, label: 'Pending sync', color: '#f57f17' },
    synced:  { icon: <CheckCircle size={12} color="#2E7D32" />, label: 'Uploaded', color: '#2E7D32' },
    failed:  { icon: <XCircle size={12} color="#c62828" />, label: 'Sync failed', color: '#c62828' },
  };
  const s = statusMap[syncStatus];

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#f4f7f4', borderRadius: 10, padding: '10px 12px', border: '1px solid rgba(0,0,0,0.06)' }}>
      <FileText size={18} color="#1565C0" />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: '#1a2332', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fileName}</div>
        <div style={{ fontSize: 11, color: '#8a9aaa' }}>{formatBytes(fileSize)} · PDF</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {s.icon}
        <span style={{ fontSize: 11, color: s.color, fontWeight: 500 }}>{s.label}</span>
      </div>
    </div>
  );
}
