"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

export interface TabTotals {
  viagens: number;
  viagensSemBDI: number;
  estadia: number;
  estadiaSemBDI: number;
  almoco: number;
  almocoSemBDI: number;
  janta: number;
  jantaSemBDI: number;
  cafe: number;
  cafeSemBDI: number;
  maoDeObra: number;
  maoDeObraSemBDI: number;
  material: number;
  materialSemBDI: number;
  transporte: number;
  transporteSemBDI: number;
  totalKm: number;
  totalViagens: number;
  lucro: number;
  lucroPercent: number;
}

interface TotalsContextType {
  totals: TabTotals;
  updateTotal: (key: keyof TabTotals, value: number) => void;
}

const TotalsContext = createContext<TotalsContextType | undefined>(undefined);

export function TotalsProvider({ children }: { children: ReactNode }) {
  const [totals, setTotals] = useState<TabTotals>({
    viagens: 0,
    viagensSemBDI: 0,
    estadia: 0,
    estadiaSemBDI: 0,
    almoco: 0,
    almocoSemBDI: 0,
    janta: 0,
    jantaSemBDI: 0,
    cafe: 0,
    cafeSemBDI: 0,
    maoDeObra: 0,
    maoDeObraSemBDI: 0,
    material: 0,
    materialSemBDI: 0,
    transporte: 0,
    transporteSemBDI: 0,
    totalKm: 0,
    totalViagens: 0,
    lucro: 0,
    lucroPercent: 0,
  });

  const updateTotal = useCallback((key: keyof TabTotals, value: number) => {
    setTotals((prev) => ({ ...prev, [key]: value }));
  }, []);

  return (
    <TotalsContext.Provider value={{ totals, updateTotal }}>
      {children}
    </TotalsContext.Provider>
  );
}

export function useTotals() {
  const context = useContext(TotalsContext);
  if (!context) {
    throw new Error("useTotals must be used within a TotalsProvider");
  }
  return context;
}
