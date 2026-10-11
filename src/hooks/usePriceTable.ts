'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { HHSettings } from '@/lib/hh-calculator';

export interface LaborClient {
  id: number;
  client_id: string;
  name: string;
  dias: number;
  negotiation_pct: number;
  iss_retained_pct: number;
  inss_retained_pct: number;
  anticipate: boolean;
  active: boolean;
}

export interface WorkerType {
  id: number;
  worker_id: string;
  name: string;
  icon: string;
  custo_hora?: number;
  lucro_hora?: number;
  salary_base?: number;
  monthly_cost?: number;
}

export interface HourType {
  id: number;
  hour_id: string;
  name: string;
  multiplier: number;
}

export interface WorkerRate {
  id: number;
  worker_id: string;
  client_id: string;
  rate: number;
  base_rate?: number;
  economic_result?: number;
}

export interface WorkerCost {
  worker_id: string;
  custoMensal: number;
}

export interface PriceTableData {
  clients: LaborClient[];
  workers: WorkerType[];
  hourTypes: HourType[];
  rates: WorkerRate[];
  workerCosts: WorkerCost[];
  hhSettings?: HHSettings;
  fixedCostTotal?: number;
  lastUpdated?: string;
}

const defaultData: PriceTableData = {
  clients: [],
  workers: [],
  hourTypes: [
    { id: 1, hour_id: 'normal', name: 'Normal', multiplier: 1 },
    { id: 2, hour_id: '50', name: '50%', multiplier: 1.5 },
    { id: 3, hour_id: '100', name: '100%', multiplier: 2 },
    { id: 4, hour_id: '120', name: '120%', multiplier: 2.2 },
  ],
  rates: [],
  workerCosts: [],
};

let cachedData: PriceTableData | null = null;
let fetchPromise: Promise<PriceTableData> | null = null;
const listeners = new Set<() => void>();

export function invalidatePriceTableCache() {
  cachedData = null;
  fetchPromise = null;
  listeners.forEach((listener) => listener());
}

async function fetchPriceTable(): Promise<PriceTableData> {
  try {
    const res = await fetch('/api/price-table', { cache: 'no-store' });
    if (res.ok) {
      const apiData = await res.json();
      const result: PriceTableData = {
        clients: (apiData.clients || []).map((c: LaborClient) => ({
          ...c,
          active: c.active !== false,
          negotiation_pct: Number(c.negotiation_pct ?? 0),
          iss_retained_pct: Number(c.iss_retained_pct ?? 0),
          inss_retained_pct: Number(c.inss_retained_pct ?? 0),
          anticipate: c.anticipate !== false,
        })),
        workers: (apiData.workers || []).map((w: WorkerType) => ({
          ...w,
          custo_hora: Number(w.custo_hora ?? 0),
          lucro_hora: Number(w.lucro_hora ?? 0),
          salary_base: Number(w.salary_base ?? 0),
          monthly_cost: Number(w.monthly_cost ?? 0),
        })),
        hourTypes:
          apiData.hourTypes && apiData.hourTypes.length > 0
            ? apiData.hourTypes
            : defaultData.hourTypes,
        rates: (apiData.rates || []).map((r: WorkerRate) => ({
          ...r,
          rate: Number(r.rate ?? 0),
          base_rate: Number(r.base_rate ?? 0),
          economic_result: Number(r.economic_result ?? 0),
        })),
        workerCosts: [],
        hhSettings: apiData.hhSettings,
        fixedCostTotal: Number(apiData.fixedCostTotal ?? 0),
      };
      cachedData = result;
      return result;
    }
  } catch (error) {
    console.error('Error fetching price table:', error);
  }
  return defaultData;
}

export function usePriceTable() {
  const [data, setData] = useState<PriceTableData>(cachedData || defaultData);
  const [loading, setLoading] = useState(!cachedData);

  const refetch = useCallback(async () => {
    setLoading(true);
    cachedData = null;
    fetchPromise = null;
    const newData = await fetchPriceTable();
    setData(newData);
    setLoading(false);
  }, []);

  useEffect(() => {
    const handleInvalidation = () => refetch();
    listeners.add(handleInvalidation);

    if (cachedData) {
      setData(cachedData);
      setLoading(false);
      return () => listeners.delete(handleInvalidation);
    }

    if (!fetchPromise) fetchPromise = fetchPriceTable();
    fetchPromise.then((result) => {
      setData(result);
      setLoading(false);
    });

    return () => listeners.delete(handleInvalidation);
  }, [refetch]);

  const activeClients = useMemo(
    () => data.clients.filter((client) => client.active !== false),
    [data.clients]
  );

  const getRate = useCallback(
    (workerId: string, clientId: string): number =>
      data.rates.find((r) => r.worker_id === workerId && r.client_id === clientId)?.rate || 0,
    [data.rates]
  );

  const getBaseRate = useCallback(
    (workerId: string, clientId: string): number =>
      data.rates.find((r) => r.worker_id === workerId && r.client_id === clientId)?.base_rate || 0,
    [data.rates]
  );

  const getHourMultiplier = useCallback(
    (hourTypeId: string): number =>
      data.hourTypes.find((h) => h.hour_id === hourTypeId)?.multiplier || 1,
    [data.hourTypes]
  );

  const getWorker = useCallback(
    (workerId: string): WorkerType | undefined =>
      data.workers.find((w) => w.worker_id === workerId),
    [data.workers]
  );

  const getClient = useCallback(
    (clientId: string): LaborClient | undefined =>
      data.clients.find((c) => c.client_id === clientId),
    [data.clients]
  );

  const getHourType = useCallback(
    (hourTypeId: string): HourType | undefined =>
      data.hourTypes.find((h) => h.hour_id === hourTypeId),
    [data.hourTypes]
  );

  const getCustoHora = useCallback(
    (workerId: string): number | undefined =>
      data.workers.find((w) => w.worker_id === workerId)?.custo_hora,
    [data.workers]
  );

  const getLucroHora = useCallback(
    (workerId: string): number | undefined =>
      data.workers.find((w) => w.worker_id === workerId)?.lucro_hora,
    [data.workers]
  );

  return {
    ...data,
    activeClients,
    loading,
    refetch,
    getRate,
    getBaseRate,
    getHourMultiplier,
    getWorker,
    getClient,
    getHourType,
    getCustoHora,
    getLucroHora,
  };
}
