/**
 * localDB.ts
 * IndexedDB layer using `idb`. This is the single source of truth for all
 * clinical data while the device may be offline. The server is a sync target,
 * not the primary read source.
 */

import { openDB, IDBPDatabase } from 'idb';

// ─── Types ────────────────────────────────────────────────

export type SyncStatus = 'pending' | 'synced' | 'failed';

export interface LocalPatient {
  id: string;
  serverId?: string;
  fullName: string;
  age: number;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  phone?: string;
  address?: string;
  healthId?: string;
  preferredLanguage: string;
  communicationLanguage: string;
  facilityId?: string;
  createdAt: string;
  syncStatus: SyncStatus;
  syncedAt?: string;
  syncError?: string;
}

export interface LocalVisit {
  id: string;
  serverId?: string;
  patientId: string;
  patientServerId?: string;
  chiefComplaint: string;
  symptoms: string[];
  notes?: string;
  temperature?: number;
  pulse?: number;
  spo2?: number;
  systolicBP?: number;
  diastolicBP?: number;
  weight?: number;
  createdAt: string;
  syncStatus: SyncStatus;
  syncedAt?: string;
  syncError?: string;
  status?: 'DRAFT' | 'PENDING_SYNC' | 'SYNCED' | 'REVIEWED' | 'COMPLETED' | 'FAILED';
  visitNumber?: string;
}

export interface LocalReport {
  id: string;
  serverId?: string;
  patientId: string;
  visitId?: string;
  fileName: string;
  fileSize: number;
  mimeType: string;        // always 'application/pdf'
  data: ArrayBuffer;       // actual PDF bytes in IDB
  createdAt: string;
  syncStatus: SyncStatus;
  syncedAt?: string;
  syncError?: string;
}

// ─── DB Initialisation ────────────────────────────────────

const DB_NAME = 'ruralcarelink';
const DB_VERSION = 2;  // v2 adds reports store

async function cleanupLocalDuplicates(db: IDBPDatabase) {
  try {
    // 1. Deduplicate Patients in local IndexedDB
    const txPatients = db.transaction('patients', 'readwrite');
    const patients = await txPatients.store.getAll();
    const patientGroups: Record<string, typeof patients> = {};
    for (const p of patients) {
      if (!p.serverId) continue;
      if (!patientGroups[p.serverId]) {
        patientGroups[p.serverId] = [];
      }
      patientGroups[p.serverId].push(p);
    }

    for (const [serverId, group] of Object.entries(patientGroups)) {
      if (group.length > 1) {
        // Find the pulled duplicate (where id === serverId) and the original (where id !== serverId)
        const duplicate = group.find(p => p.id === serverId);
        const original = group.find(p => p.id !== serverId);
        if (duplicate && original) {
          console.log(`[localDB] Deduplicating patient: removing duplicate ID ${duplicate.id} in favor of original ID ${original.id}`);
          await txPatients.store.delete(duplicate.id);
        }
      }
    }
    await txPatients.done;

    // 2. Deduplicate Visits in local IndexedDB
    const txVisits = db.transaction('visits', 'readwrite');
    const visits = await txVisits.store.getAll();
    const visitGroups: Record<string, typeof visits> = {};
    for (const v of visits) {
      if (!v.serverId) continue;
      if (!visitGroups[v.serverId]) {
        visitGroups[v.serverId] = [];
      }
      visitGroups[v.serverId].push(v);
    }

    for (const [serverId, group] of Object.entries(visitGroups)) {
      if (group.length > 1) {
        // Find the pulled duplicate (where id === serverId) and the original (where id !== serverId)
        const duplicate = group.find(v => v.id === serverId);
        const original = group.find(v => v.id !== serverId);
        if (duplicate && original) {
          console.log(`[localDB] Deduplicating visit: removing duplicate ID ${duplicate.id} in favor of original ID ${original.id}`);
          await txVisits.store.delete(duplicate.id);
        }
      }
    }
    await txVisits.done;
  } catch (err) {
    console.error('[localDB] Failed to run local duplicates cleanup:', err);
  }
}

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          const ps = db.createObjectStore('patients', { keyPath: 'id' });
          ps.createIndex('syncStatus', 'syncStatus');
          ps.createIndex('createdAt', 'createdAt');

          const vs = db.createObjectStore('visits', { keyPath: 'id' });
          vs.createIndex('patientId', 'patientId');
          vs.createIndex('syncStatus', 'syncStatus');
          vs.createIndex('createdAt', 'createdAt');
        }
        if (oldVersion < 2) {
          if (!db.objectStoreNames.contains('reports')) {
            const rs = db.createObjectStore('reports', { keyPath: 'id' });
            rs.createIndex('patientId', 'patientId');
            rs.createIndex('visitId', 'visitId');
            rs.createIndex('syncStatus', 'syncStatus');
            rs.createIndex('createdAt', 'createdAt');
          }
        }
      },
      // Called when THIS connection is blocking a newer version upgrade.
      // Close so the newer version can proceed.
      blocking() {
        dbPromise = null;
      },
      // Called when another connection is blocking OUR upgrade.
      blocked() {
        console.warn('[RuralCareLink] IDB upgrade blocked — another tab may be open. Please close other tabs and reload.');
        dbPromise = null;
      },
      // Called when the browser unexpectedly closes the connection.
      terminated() {
        dbPromise = null;
      },
    }).then(async (db) => {
      // If a newer version is opened elsewhere (e.g. another tab, or HMR hot-reload),
      // close this connection immediately so the upgrade can proceed.
      db.addEventListener('versionchange', () => {
        db.close();
        dbPromise = null;
      });

      // Clear any pre-existing client-side duplicates once on database startup
      await cleanupLocalDuplicates(db);

      return db;
    }).catch((err: unknown) => {
      dbPromise = null;
      throw err;
    });
  }
  return dbPromise;
}

// ─── Utility ─────────────────────────────────────────────

function uuid(): string {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// ─── Patient operations ───────────────────────────────────

export async function createPatient(
  data: Omit<LocalPatient, 'id' | 'createdAt' | 'syncStatus'>
): Promise<LocalPatient> {
  const db = await getDB();
  const patient: LocalPatient = { ...data, id: uuid(), createdAt: new Date().toISOString(), syncStatus: 'pending' };
  await db.put('patients', patient);
  return patient;
}

export async function getAllPatients(): Promise<LocalPatient[]> {
  const db = await getDB();
  const all = await db.getAll('patients');
  return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getPatientById(id: string): Promise<LocalPatient | undefined> {
  const db = await getDB();
  const direct = await db.get('patients', id);
  if (direct) return direct;
  const all = await db.getAll('patients');
  return all.find(p => p.serverId === id);
}

export async function getPendingPatients(): Promise<LocalPatient[]> {
  const db = await getDB();
  const [pending, failed] = await Promise.all([
    db.getAllFromIndex('patients', 'syncStatus', 'pending'),
    db.getAllFromIndex('patients', 'syncStatus', 'failed'),
  ]);
  return [...pending, ...failed];
}

export async function markPatientSynced(localId: string, serverId: string): Promise<void> {
  const db = await getDB();
  const p = await db.get('patients', localId);
  if (!p) return;
  await db.put('patients', {
    ...p,
    serverId,
    syncStatus: 'synced',
    syncedAt: new Date().toISOString(),
  });
}

export async function markPatientFailed(localId: string, error: string): Promise<void> {
  const db = await getDB();
  const p = await db.get('patients', localId);
  if (!p) return;
  await db.put('patients', { ...p, syncStatus: 'failed', syncError: error });
}

// ─── Visit operations ─────────────────────────────────────

export async function createVisit(
  data: Omit<LocalVisit, 'id' | 'createdAt' | 'syncStatus'>
): Promise<LocalVisit> {
  const db = await getDB();
  const visit: LocalVisit = { ...data, id: uuid(), createdAt: new Date().toISOString(), syncStatus: 'pending' };
  await db.put('visits', visit);
  return visit;
}

export async function getAllVisits(): Promise<LocalVisit[]> {
  const db = await getDB();
  const all = await db.getAll('visits');
  return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getVisitsByPatient(patientId: string): Promise<LocalVisit[]> {
  const db = await getDB();
  const patient = await getPatientById(patientId);
  const ids = new Set<string>();
  ids.add(patientId);
  if (patient) {
    ids.add(patient.id);
    if (patient.serverId) ids.add(patient.serverId);
  }
  const allVisits = await db.getAll('visits');
  return allVisits.filter(v => ids.has(v.patientId) || (v.patientServerId && ids.has(v.patientServerId)));
}

export async function getVisitById(id: string): Promise<LocalVisit | undefined> {
  const db = await getDB();
  const direct = await db.get('visits', id);
  if (direct) return direct;
  const all = await db.getAll('visits');
  return all.find(v => v.serverId === id);
}

export async function getPendingVisits(): Promise<LocalVisit[]> {
  const db = await getDB();
  const [pending, failed] = await Promise.all([
    db.getAllFromIndex('visits', 'syncStatus', 'pending'),
    db.getAllFromIndex('visits', 'syncStatus', 'failed'),
  ]);
  return [...pending, ...failed];
}

export async function markVisitSynced(localId: string, serverId: string, visitNumber?: string): Promise<void> {
  const db = await getDB();
  const v = await db.get('visits', localId);
  if (!v) return;
  await db.put('visits', {
    ...v,
    serverId,
    syncStatus: 'synced',
    syncedAt: new Date().toISOString(),
    syncError: undefined,
    ...(visitNumber ? { visitNumber } : {})
  });
}

export async function markVisitFailed(localId: string, error: string): Promise<void> {
  const db = await getDB();
  const v = await db.get('visits', localId);
  if (!v) return;
  await db.put('visits', { ...v, syncStatus: 'failed', syncError: error });
}

// ─── Report operations ────────────────────────────────────

export async function createReport(
  data: Omit<LocalReport, 'id' | 'createdAt' | 'syncStatus'>
): Promise<LocalReport> {
  const db = await getDB();
  const report: LocalReport = { ...data, id: uuid(), createdAt: new Date().toISOString(), syncStatus: 'pending' };
  await db.put('reports', report);
  return report;
}

/** Returns all reports WITHOUT the ArrayBuffer (use getReportById to load bytes) */
export async function getAllReports(): Promise<Omit<LocalReport, 'data'>[]> {
  const db = await getDB();
  const all = await db.getAll('reports');
  return all
    .map(({ data: _d, ...rest }) => rest)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getReportsByPatient(patientId: string): Promise<Omit<LocalReport, 'data'>[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex('reports', 'patientId', patientId);
  return all.map(({ data: _d, ...rest }) => rest);
}

export async function getReportById(id: string): Promise<LocalReport | undefined> {
  const db = await getDB();
  return db.get('reports', id);
}

export async function getPendingReports(): Promise<LocalReport[]> {
  const db = await getDB();
  const [pending, failed] = await Promise.all([
    db.getAllFromIndex('reports', 'syncStatus', 'pending'),
    db.getAllFromIndex('reports', 'syncStatus', 'failed'),
  ]);
  return [...pending, ...failed];
}

export async function markReportSynced(localId: string, serverId: string): Promise<void> {
  const db = await getDB();
  const r = await db.get('reports', localId);
  if (!r) return;
  await db.put('reports', { ...r, serverId, syncStatus: 'synced', syncedAt: new Date().toISOString(), syncError: undefined });
}

export async function markReportFailed(localId: string, error: string): Promise<void> {
  const db = await getDB();
  const r = await db.get('reports', localId);
  if (!r) return;
  await db.put('reports', { ...r, syncStatus: 'failed', syncError: error });
}

// ─── Counts ───────────────────────────────────────────────
export async function getPendingCount(): Promise<number> {
  const [patients, visits, reports] = await Promise.all([
    getPendingPatients(),
    getPendingVisits(),
    getPendingReports(),
  ]);
  return patients.length + visits.length + reports.length;
}

export async function linkReportsToVisit(reportIds: string[], visitId: string): Promise<void> {
  const db = await getDB();
  for (const id of reportIds) {
    const r = await db.get('reports', id);
    if (r) {
      await db.put('reports', { ...r, visitId });
    }
  }
}

export async function savePulledPatients(patients: any[]): Promise<void> {
  const db = await getDB();
  const allLocal = await db.getAll('patients');
  const tx = db.transaction('patients', 'readwrite');
  for (const p of patients) {
    const existing = allLocal.find(x => x.id === p.id || x.serverId === p.id);
    if (!existing || (existing.syncStatus === 'synced' && p.updatedAt > (existing.syncedAt || ''))) {
      const targetId = existing ? existing.id : p.id;
      await tx.store.put({
        id: targetId,
        serverId: p.id,
        fullName: p.fullName,
        age: p.age,
        gender: p.gender,
        phone: p.phone || undefined,
        address: p.village || undefined,
        healthId: p.abhaNumber || undefined,
        preferredLanguage: p.preferredLanguage,
        communicationLanguage: p.preferredLanguage,
        facilityId: p.facilityId,
        createdAt: p.createdAt,
        syncStatus: 'synced',
        syncedAt: p.updatedAt,
      });
    }
  }
  await tx.done;
}

export async function savePulledVisits(visits: any[]): Promise<void> {
  const db = await getDB();
  const allLocal = await db.getAll('visits');
  const tx = db.transaction('visits', 'readwrite');
  for (const v of visits) {
    const existing = allLocal.find(x => x.id === v.id || x.serverId === v.id);
    if (!existing || (existing.syncStatus === 'synced' && v.updatedAt > (existing.syncedAt || ''))) {
      const targetId = existing ? existing.id : v.id;
      const vr = v.vitalRecords?.[0];
      const noteContent = v.consultationNotes?.map((n: any) => n.content).join('\n');
      await tx.store.put({
        id: targetId,
        serverId: v.id,
        patientId: v.patientId,
        patientServerId: v.patientId,
        chiefComplaint: v.chiefComplaint || '',
        symptoms: v.symptoms || [],
        notes: noteContent || undefined,
        temperature: vr?.temperature || undefined,
        pulse: vr?.pulse || undefined,
        spo2: vr?.spo2 || undefined,
        systolicBP: vr?.systolicBP || undefined,
        diastolicBP: vr?.diastolicBP || undefined,
        weight: vr?.weight || undefined,
        createdAt: v.createdAt,
        syncStatus: 'synced',
        syncedAt: v.updatedAt,
        status: v.status,
        visitNumber: v.visitNumber,
      });
    }
  }
  await tx.done;
}

