/**
 * LocalDataContext.tsx
 * React context that owns all in-memory clinical data loaded from IndexedDB.
 * All screens read from this context. Writes go through this context so
 * the UI updates instantly without waiting for network.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  LocalPatient,
  LocalVisit,
  LocalReport,
  getAllPatients,
  getAllVisits,
  getAllReports,
  createPatient,
  createVisit,
  createReport,
  getPendingCount,
} from '../db/localDB';

interface LocalDataContextType {
  // Data
  patients: LocalPatient[];
  visits: LocalVisit[];
  reports: Omit<LocalReport, 'data'>[];
  pendingCount: number;
  loading: boolean;

  // Write operations
  addPatient: (data: Omit<LocalPatient, 'id' | 'createdAt' | 'syncStatus'>) => Promise<LocalPatient>;
  addVisit: (data: Omit<LocalVisit, 'id' | 'createdAt' | 'syncStatus'>) => Promise<LocalVisit>;
  addReport: (data: Omit<LocalReport, 'id' | 'createdAt' | 'syncStatus'>) => Promise<LocalReport>;

  // Reload from IDB (call after sync completes)
  refresh: () => Promise<void>;
}

const LocalDataContext = createContext<LocalDataContextType>({
  patients: [],
  visits: [],
  reports: [],
  pendingCount: 0,
  loading: true,
  addPatient: async () => { throw new Error('Provider not mounted'); },
  addVisit: async () => { throw new Error('Provider not mounted'); },
  addReport: async () => { throw new Error('Provider not mounted'); },
  refresh: async () => {},
});

export function LocalDataProvider({ children }: { children: React.ReactNode }) {
  const [patients, setPatients] = useState<LocalPatient[]>([]);
  const [visits, setVisits] = useState<LocalVisit[]>([]);
  const [reports, setReports] = useState<Omit<LocalReport, 'data'>[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const [p, v, r, count] = await Promise.all([
      getAllPatients(),
      getAllVisits(),
      getAllReports(),
      getPendingCount(),
    ]);
    setPatients(p);
    setVisits(v);
    setReports(r);
    setPendingCount(count);
  }, []);

  // Load on mount
  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  const addPatient = useCallback(async (
    data: Omit<LocalPatient, 'id' | 'createdAt' | 'syncStatus'>
  ): Promise<LocalPatient> => {
    const patient = await createPatient(data);
    // Optimistic update — prepend to list immediately
    setPatients(prev => [patient, ...prev]);
    setPendingCount(prev => prev + 1);
    return patient;
  }, []);

  const addVisit = useCallback(async (
    data: Omit<LocalVisit, 'id' | 'createdAt' | 'syncStatus'>
  ): Promise<LocalVisit> => {
    const visit = await createVisit(data);
    setVisits(prev => [visit, ...prev]);
    setPendingCount(prev => prev + 1);
    return visit;
  }, []);

  const addReport = useCallback(async (
    data: Omit<LocalReport, 'id' | 'createdAt' | 'syncStatus'>
  ): Promise<LocalReport> => {
    const report = await createReport(data);
    // Optimistic update — add metadata only (no binary blob in state)
    const { data: _buf, ...meta } = report;
    setReports(prev => [meta, ...prev]);
    setPendingCount(prev => prev + 1);
    return report;
  }, []);

  return (
    <LocalDataContext.Provider value={{
      patients, visits, reports, pendingCount, loading,
      addPatient, addVisit, addReport, refresh,
    }}>
      {children}
    </LocalDataContext.Provider>
  );
}

export function useLocalData() {
  return useContext(LocalDataContext);
}
