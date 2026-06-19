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
    }).then(db => {
      // If a newer version is opened elsewhere (e.g. another tab, or HMR hot-reload),
      // close this connection immediately so the upgrade can proceed.
      db.addEventListener('versionchange', () => {
        db.close();
        dbPromise = null;
      });
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
  return db.get('patients', id);
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
  await db.put('patients', { ...p, serverId, syncStatus: 'synced', syncedAt: new Date().toISOString(), syncError: undefined });
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
  return db.getAllFromIndex('visits', 'patientId', patientId);
}

export async function getVisitById(id: string): Promise<LocalVisit | undefined> {
  const db = await getDB();
  return db.get('visits', id);
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
