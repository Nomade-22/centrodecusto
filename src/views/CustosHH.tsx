"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { DollarSign, RefreshCw, Save, Loader2, Calculator, Building2, Users } from "lucide-react";
import { invalidatePriceTableCache } from "@/hooks/usePriceTable";
import type { HHSettings } from "@/lib/hh-calculator";

interface HHWorker {
  id: number;
  worker_id: string;
  name: string;
  icon: string;
  salary_base: number;
  cost_per_hour: number;
  monthly_cost: number;
  economic_result_per_hour: number;
}

interface HHFixedCost {
  id: number;
  name: string;
  amount: number;
  sort_order: number;
}

interface HHData {
  settings: HHSettings;
  workers: HHWorker[];
  fixedCosts: HHFixedCost[];
  fixedCostTotal: number;
}

const money = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const SETTINGS: Array<{ key: keyof HHSettings; label: string; step?: string; note?: string }> = [
  { key: "salary_minimum", label: "Salário mínimo", step: "0.01" },
  { key: "prize", label: "Prêmio assiduidade", step: "0.01" },
  { key: "insalubrity_pct", label: "Insalubridade %", step: "0.01" },
  { key: "monthly_hours", label: "Horas/mês", step: "1", note: "Divisor oficial atual: 220 h" },
  { key: "productive_employees", label: "Funcionários produtivos", step: "1" },
  { key: "employer_inss_rat_fap_pct", label: "CPP + RAT/FAP %", step: "0.0001" },
  { key: "fgts_pct", label: "FGTS %", step: "0.01" },
  { key: "fgts_fine_pct", label: "Reserva rescisória sobre FGTS %", step: "0.01" },
  { key: "das_effective_pct", label: "Simples efetivo (DAS) %", step: "0.01" },
  { key: "default_iss_retained_pct", label: "ISS retido padrão %", step: "0.01" },
  { key: "default_inss_retained_pct", label: "INSS retido padrão %", step: "0.01" },
  { key: "markup_pct", label: "Markup sobre custo %", step: "0.01" },
  { key: "anticipation_daily_pct", label: "Antecipação ao dia %", step: "0.001" },
  { key: "epi_monthly", label: "EPI/Uniforme mensal", step: "0.01" },
  { key: "exams_monthly", label: "Exames mensal", step: "0.01" },
  { key: "tools_monthly", label: "Ferramentas mensal", step: "0.01" },
  { key: "health_monthly", label: "Plano saúde mensal", step: "0.01" },
  { key: "lunch_monthly", label: "Alimentação mensal fixa", step: "0.01" },
  { key: "transport_monthly", label: "Transporte mensal fixo", step: "0.01" },
  { key: "insurance_total_monthly", label: "Seguros total/mês", step: "0.01" },
  { key: "training_annual", label: "Treinamentos por ano", step: "0.01" },
];

export default function CustosHHPage() {
  const [data, setData] = useState<HHData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/hh", { cache: "no-store" });
      if (!res.ok) throw new Error("Falha ao carregar");
      const next = await res.json();
      setData(next);
    } catch (error) {
      console.error(error);
      setMessage("Não foi possível carregar a Calculadora HH.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const fixedPerEmployee = useMemo(() => {
    if (!data) return 0;
    return data.fixedCostTotal / Math.max(1, Number(data.settings.productive_employees || 1));
  }, [data]);

  const updateSetting = (key: keyof HHSettings, value: number | boolean) => {
    setData((prev) => prev ? { ...prev, settings: { ...prev.settings, [key]: value } } : prev);
  };

  const updateSalary = (workerId: string, value: number) => {
    setData((prev) => prev ? {
      ...prev,
      workers: prev.workers.map((w) => w.worker_id === workerId ? { ...w, salary_base: value } : w),
    } : prev);
  };

  const updateFixed = (id: number, value: number) => {
    setData((prev) => {
      if (!prev) return prev;
      const fixedCosts = prev.fixedCosts.map((f) => f.id === id ? { ...f, amount: value } : f);
      return { ...prev, fixedCosts, fixedCostTotal: fixedCosts.reduce((sum, f) => sum + Number(f.amount || 0), 0) };
    });
  };

  const save = async () => {
    if (!data) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/hh", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settings: data.settings,
          salaries: data.workers.map((w) => ({ worker_id: w.worker_id, salary_base: w.salary_base })),
          fixedCosts: data.fixedCosts,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || "Falha ao salvar");
      setData(body);
      invalidatePriceTableCache();
      setMessage("Calculadora HH salva. Tabela de preços atualizada automaticamente.");
    } catch (error) {
      console.error(error);
      setMessage(error instanceof Error ? error.message : "Erro ao salvar Calculadora HH.");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-teal-600 rounded-lg"><Calculator className="w-6 h-6 text-white" /></div>
          <div>
            <h2 className="text-xl font-bold text-slate-100">Calculadora HH</h2>
            <p className="text-sm text-slate-400">Fonte oficial de custo/hora e preços por cliente</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading} className="border-slate-600 text-slate-300">
            <RefreshCw className="w-4 h-4 mr-2" />Atualizar
          </Button>
          <Button size="sm" onClick={save} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Salvar e recalcular
          </Button>
        </div>
      </div>

      {message && <div className="text-sm rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2 text-slate-200">{message}</div>}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Card className="bg-blue-500/10 border-blue-500/20"><CardContent className="p-3 text-center"><Building2 className="w-4 h-4 text-blue-400 mx-auto"/><div className="text-xs text-slate-400">Custo fixo total</div><div className="font-bold text-white">{money(data.fixedCostTotal)}</div></CardContent></Card>
        <Card className="bg-purple-500/10 border-purple-500/20"><CardContent className="p-3 text-center"><Users className="w-4 h-4 text-purple-400 mx-auto"/><div className="text-xs text-slate-400">Por funcionário</div><div className="font-bold text-white">{money(fixedPerEmployee)}</div></CardContent></Card>
        <Card className="bg-amber-500/10 border-amber-500/20"><CardContent className="p-3 text-center"><DollarSign className="w-4 h-4 text-amber-400 mx-auto"/><div className="text-xs text-slate-400">Markup</div><div className="font-bold text-white">{Number(data.settings.markup_pct).toFixed(2)}%</div></CardContent></Card>
        <Card className="bg-emerald-500/10 border-emerald-500/20"><CardContent className="p-3 text-center"><Calculator className="w-4 h-4 text-emerald-400 mx-auto"/><div className="text-xs text-slate-400">DAS efetivo</div><div className="font-bold text-white">{Number(data.settings.das_effective_pct).toFixed(2)}%</div></CardContent></Card>
      </div>

      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader><CardTitle className="text-base text-white">Parâmetros gerais</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {SETTINGS.map(({ key, label, step, note }) => (
              <div className="space-y-1" key={String(key)}>
                <Label className="text-xs text-slate-400">{label}</Label>
                <Input
                  type="number"
                  step={step || "0.01"}
                  value={Number(data.settings[key] ?? 0)}
                  onChange={(e) => updateSetting(key, Number(e.target.value))}
                  className="bg-slate-700/50 border-slate-600 text-white h-9"
                />
                {note && <p className="text-[10px] text-slate-500">{note}</p>}
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between rounded-lg bg-slate-700/30 px-3 py-2">
            <div><div className="text-sm text-white">Prêmio integra encargos?</div><div className="text-xs text-slate-500">Padrão atual: não integra a base.</div></div>
            <Switch checked={Boolean(data.settings.prize_in_charges)} onCheckedChange={(v) => updateSetting("prize_in_charges", v)} />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader><CardTitle className="text-base text-white">Salários e custo HH calculado</CardTitle></CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-slate-700"><th className="text-left p-3 text-slate-400">Função</th><th className="p-3 text-slate-400">Salário base</th><th className="p-3 text-slate-400">Custo mensal</th><th className="p-3 text-slate-400">Custo/Hora</th></tr></thead>
            <tbody>
              {data.workers.map((worker) => (
                <tr key={worker.worker_id} className="border-b border-slate-700/50">
                  <td className="p-3 text-white font-medium">{worker.icon} {worker.name}</td>
                  <td className="p-2"><Input type="number" step="0.01" value={worker.salary_base} onChange={(e) => updateSalary(worker.worker_id, Number(e.target.value))} className="bg-slate-700/50 border-slate-600 text-white h-9 min-w-28 text-center" /></td>
                  <td className="p-3 text-center text-slate-300">{money(worker.monthly_cost)}</td>
                  <td className="p-3 text-center text-amber-400 font-bold">{money(worker.cost_per_hour)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="p-3 text-xs text-slate-500">Os valores calculados são atualizados no servidor ao clicar em “Salvar e recalcular”.</p>
        </CardContent>
      </Card>

      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader><CardTitle className="text-base text-white">Custos fixos mensais</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {data.fixedCosts.map((item) => (
            <div key={item.id} className="grid grid-cols-[1fr_130px] gap-2 items-center rounded bg-slate-700/30 p-2">
              <span className="text-sm text-slate-200">{item.name}</span>
              <Input type="number" step="0.01" value={item.amount} onChange={(e) => updateFixed(item.id, Number(e.target.value))} className="bg-slate-800/70 border-slate-600 text-white h-8 text-right" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
