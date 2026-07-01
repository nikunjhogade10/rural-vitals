/**
 * syncService.ts
 * Handles pushing pending local records to the server.
 * Reads only from IndexedDB, writes results back to IndexedDB.
 * Never touches UI state directly.
 */

import api from './api';
import {
  getPendingPatients,
  getPendingVisits,
  getPendingReports,
  markPatientSynced,
  markPatientFailed,
  markVisitSynced,
  markVisitFailed,
  markReportSynced,
  markReportFailed,
  getAllPatients,
  getAllVisits,
  getPatientById,
  LocalPatient,
  LocalVisit,
  LocalReport,
  savePulledPatients,
  savePulledVisits,
} from '../db/localDB';

export interface SyncResult {
  patientsPushed: number;
  visitsPushed: number;
  reportsPushed: number;
  patientsFailed: number;
  visitsFailed: number;
  reportsFailed: number;
  errors: string[];
}

/**
 * Push all pending local records to the server.
 * Returns a SyncResult summary.
 * Safe to call when online — call site should verify connectivity first.
 */
export async function pushPendingRecords(): Promise<SyncResult> {
  const result: SyncResult = {
    patientsPushed: 0,
    visitsPushed: 0,
    reportsPushed: 0,
    patientsFailed: 0,
    visitsFailed: 0,
    reportsFailed: 0,
    errors: [],
  };

  const syncId = (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : (Math.random().toString(36).substring(2) + Date.now().toString(36));

  const [pendingPatients, pendingVisits, pendingReports] = await Promise.all([
    getPendingPatients(),
    getPendingVisits(),
    getPendingReports(),
  ]);

  // Build a map from local patient id → server id for use during visit sync
  const serverIdMap = new Map<string, string>();

  // Populate serverIdMap for patients that are already synced
  try {
    const allPatients = await getAllPatients();
    for (const p of allPatients) {
      if (p.serverId) {
        serverIdMap.set(p.id, p.serverId);
      }
    }
  } catch (err) {
    console.error('[SyncService] Failed to load existing patients:', err);
  }

  // ── 1. Sync pending patients via /sync/push ──
  if (pendingPatients.length > 0) {
    const patientItems = pendingPatients.map(p => ({
      clientId: p.id,
      entityType: 'patient',
      actionType: 'CREATE',
      payload: {
        fullName: p.fullName,
        gender: p.gender,
        age: p.age,
        phone: p.phone || null,
        village: p.address || '',
        district: '',
        state: '',
        abhaNumber: p.healthId || null,
        preferredLanguage: p.preferredLanguage || 'en',
      }
    }));

    try {
      const response = await api.post('/sync/push', { items: patientItems, syncId });
      const results = response.results || [];
      for (const resItem of results) {
        if (resItem.status === 'synced' || resItem.status === 'already_synced') {
          await markPatientSynced(resItem.clientId, resItem.serverId);
          serverIdMap.set(resItem.clientId, resItem.serverId);
          result.patientsPushed++;
        } else {
          await markPatientFailed(resItem.clientId, resItem.error || 'Sync failed');
          result.patientsFailed++;
          result.errors.push(`Patient sync failed: ${resItem.error || 'Sync failed'}`);
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      for (const p of pendingPatients) {
        await markPatientFailed(p.id, msg);
        result.patientsFailed++;
      }
      result.errors.push(`Patients sync failed: ${msg}`);
    }
  }

  // ── 2. Sync pending visits via /sync/push ──
  const visitsToSync: LocalVisit[] = [];
  const visitItems = [];

  for (const visit of pendingVisits) {
    let patientServerId = serverIdMap.get(visit.patientId) || visit.patientServerId;
    if (!patientServerId) {
      const patient = await getPatientById(visit.patientId);
      if (patient && patient.serverId) {
        patientServerId = patient.serverId;
      }
    }

    if (!patientServerId) {
      await markVisitFailed(visit.id, 'Patient not yet synced to server');
      result.visitsFailed++;
      result.errors.push(`Visit for patient ${visit.patientId}: Patient not yet synced`);
      continue;
    }

    visitsToSync.push(visit);
    visitItems.push({
      clientId: visit.id,
      entityType: 'visit',
      actionType: 'CREATE',
      payload: {
        patientId: patientServerId,
        chiefComplaint: visit.chiefComplaint,
        symptoms: visit.symptoms || [],
        consultationMode: 'OFFLINE',
        networkStatus: 'OFFLINE',
      }
    });
  }

  const visitServerIdMap = new Map<string, string>();

  // Populate visitServerIdMap for visits that are already synced
  try {
    const allVisits = await getAllVisits();
    for (const v of allVisits) {
      if (v.serverId) {
        visitServerIdMap.set(v.id, v.serverId);
      }
    }
  } catch (err) {
    console.error('[SyncService] Failed to load existing visits:', err);
  }

  if (visitItems.length > 0) {
    try {
      const response = await api.post('/sync/push', { items: visitItems, syncId });
      const results = response.results || [];
      for (const resItem of results) {
        const matchingVisit = visitsToSync.find(v => v.id === resItem.clientId);
        if (resItem.status === 'synced' || resItem.status === 'already_synced') {
          await markVisitSynced(resItem.clientId, resItem.serverId, resItem.visitNumber);
          visitServerIdMap.set(resItem.clientId, resItem.serverId);
          result.visitsPushed++;
        } else {
          await markVisitFailed(resItem.clientId, resItem.error || 'Sync failed');
          result.visitsFailed++;
          result.errors.push(`Visit sync failed: ${resItem.error || 'Sync failed'}`);
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      for (const v of visitsToSync) {
        await markVisitFailed(v.id, msg);
        result.visitsFailed++;
      }
      result.errors.push(`Visits sync failed: ${msg}`);
    }
  }

  // ── 3. Sync vitals and clinical notes via /sync/push ──
  const subItems = [];
  try {
    const allVisits = await getAllVisits();
    for (const visit of allVisits) {
      const serverVisitId = visitServerIdMap.get(visit.id);
      if (!serverVisitId) continue;

      const hasVitals = visit.temperature !== undefined ||
                        visit.pulse !== undefined ||
                        visit.spo2 !== undefined ||
                        visit.systolicBP !== undefined ||
                        visit.diastolicBP !== undefined ||
                        visit.weight !== undefined;

      if (hasVitals) {
        subItems.push({
          clientId: `${visit.id}_vitals`,
          entityType: 'vitalRecord',
          actionType: 'CREATE',
          payload: {
            visitId: serverVisitId,
            temperature: visit.temperature || null,
            pulse: visit.pulse || null,
            spo2: visit.spo2 || null,
            systolicBP: visit.systolicBP || null,
            diastolicBP: visit.diastolicBP || null,
            weight: visit.weight || null,
            respiratoryRate: null,
            height: null,
            bloodSugar: null,
            hemoglobin: null,
            notes: null
          }
        });
      }

      if (visit.notes && visit.notes.trim()) {
        subItems.push({
          clientId: `${visit.id}_note`,
          entityType: 'consultationNote',
          actionType: 'CREATE',
          payload: {
            visitId: serverVisitId,
            noteType: 'clinical_notes',
            content: visit.notes.trim()
          }
        });
      }
    }

    if (subItems.length > 0) {
      await api.post('/sync/push', { items: subItems, syncId });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    result.errors.push(`Vitals/Notes sync warning: ${msg}`);
  }

  // ── 4. Sync reports (PDF upload) ──
  for (const report of pendingReports) {
    try {
      const patientServerId = serverIdMap.get(report.patientId);
      if (!patientServerId) {
        throw new Error('Patient not yet synced — report queued');
      }
      const serverVisitId = report.visitId ? visitServerIdMap.get(report.visitId) : undefined;
      if (report.visitId && !serverVisitId) {
        throw new Error('Associated visit not yet synced — report queued');
      }
      const serverReport = await syncReport(report, patientServerId, serverVisitId);
      await markReportSynced(report.id, serverReport.id);
      result.reportsPushed++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await markReportFailed(report.id, msg);
      result.reportsFailed++;
      result.errors.push(`Report "${report.fileName}": ${msg}`);
    }
  }

  return result;
}

// ─── Internal helpers ─────────────────────────────────────

async function syncPatient(p: LocalPatient): Promise<{ id: string }> {
  if (p.serverId) {
    // Already has a server record — update
    return api.patch(`/patients/${p.serverId}`, {
      fullName: p.fullName,
      age: p.age,
      gender: p.gender,
      phone: p.phone,
      address: p.address,
      healthId: p.healthId,
      preferredLanguage: p.preferredLanguage,
      communicationLanguage: p.communicationLanguage,
    }).then((r: { patient: { id: string } }) => r.patient);
  }
  // New patient — create on server
  return api.post('/patients', {
    fullName: p.fullName,
    age: p.age,
    gender: p.gender,
    phone: p.phone,
    address: p.address,
    healthId: p.healthId,
    preferredLanguage: p.preferredLanguage,
    communicationLanguage: p.communicationLanguage,
    clientId: p.id,
  }).then((r: { patient: { id: string } }) => r.patient);
}

async function syncVisit(v: LocalVisit, patientServerId: string): Promise<{ id: string }> {
  if (v.serverId) {
    return api.patch(`/visits/${v.serverId}`, {
      chiefComplaint: v.chiefComplaint,
      symptoms: v.symptoms,
      notes: v.notes,
    }).then((r: { visit: { id: string } }) => r.visit);
  }
  return api.post('/visits', {
    patientId: patientServerId,
    chiefComplaint: v.chiefComplaint,
    symptoms: v.symptoms,
    notes: v.notes,
    clientId: v.id,
    vitals: v.temperature || v.pulse || v.spo2 ? {
      temperature: v.temperature,
      pulse: v.pulse,
      spo2: v.spo2,
      systolicBP: v.systolicBP,
      diastolicBP: v.diastolicBP,
      weight: v.weight,
    } : undefined,
  }).then((r: { visit: { id: string } }) => r.visit);
}

async function syncReport(r: LocalReport, patientServerId: string, serverVisitId?: string): Promise<{ id: string }> {
  // Build multipart FormData — the PDF bytes were stored as ArrayBuffer in IDB
  const blob = new Blob([r.data], { type: 'application/pdf' });
  const form = new FormData();
  form.append('file', blob, r.fileName);
  form.append('patientId', patientServerId);
  form.append('clientId', r.id);
  if (serverVisitId) {
    form.append('visitId', serverVisitId);
  }

  // api.post wraps Axios — for FormData we need raw fetch so the Content-Type multipart boundary is set automatically
  const token = localStorage.getItem('rcl_token') || sessionStorage.getItem('rcl_token') || '';
  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
  const res = await fetch(`${apiBase}/reports`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.message || `Server returned ${res.status}`);
  }
  const json = await res.json();
  return json.report as { id: string };
}

/**
 * Pull new/updated records from the server and store them in local IndexedDB.
 */
export async function pullServerRecords(): Promise<void> {
  const lastSyncTime = localStorage.getItem('rcl_last_pull_time');
  const path = lastSyncTime ? `/sync/pull?since=${encodeURIComponent(lastSyncTime)}` : '/sync/pull';

  const data = await api.get(path);
  if (data) {
    if (data.patients && data.patients.length > 0) {
      await savePulledPatients(data.patients);
    }
    if (data.visits && data.visits.length > 0) {
      await savePulledVisits(data.visits);
    }
    if (data.serverTime) {
      localStorage.setItem('rcl_last_pull_time', data.serverTime);
    }
  }
}

