"use client";

import { useEffect } from "react";
import { useTotals } from "@/context/TotalsContext";
import { usePriceTable } from "@/hooks/usePriceTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, HardHat, Users, DollarSign, Wrench, RotateCcw, Loader2 } from "lucide-react";

export interface LaborItem {
  id: string;
  title: string;
  workerTypeId: string;
  clientId: string;
  hourTypeId: string;
  hours: number;
  people: number;
  days: number;
}

export const generateLaborId = () => Math.random().toString(36).substring(2, 9);

export const createDefaultLaborItem = (workerId?: string, clientId?: string): LaborItem => ({
  id: generateLaborId(),
  title: "",
  workerTypeId: workerId || "pedreiro",
  clientId: clientId || "jbs",
  hourTypeId: "normal",
  hours: 8.8,
  people: 0,
  days: 0,
});

interface MaoDeObraPageProps {
  items: LaborItem[];
  setItems: React.Dispatch<React.SetStateAction<LaborItem[]>>;
  teamSize: number;
  setTeamSize: React.Dispatch<React.SetStateAction<number>>;
}

const formatCurrency = (value: number): string => {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};

export default function MaoDeObraPage({ items, setItems, teamSize, setTeamSize }: MaoDeObraPageProps) {
  const { updateTotal } = useTotals();
  const { activeClients, workers, hourTypes, loading, getRate, getHourMultiplier, getWorker } = usePriceTable();

  const addItem = () => {
    const defaultWorker = workers[0]?.worker_id || "pedreiro";
    const defaultClient = activeClients[0]?.client_id || "jbs";
    setItems((prev) => [...prev, createDefaultLaborItem(defaultWorker, defaultClient)]);
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const resetItems = () => {
    const defaultWorker = workers[0]?.worker_id || "pedreiro";
    const defaultClient = activeClients[0]?.client_id || "jbs";
    setItems([createDefaultLaborItem(defaultWorker, defaultClient)]);
  };

  const updateItem = (id: string, updates: Partial<LaborItem>) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  };

  // Get rate for an item (from database)
  const getItemRate = (item: LaborItem): number => {
    return getRate(item.workerTypeId, item.clientId);
  };

  // Calculate item total (selling price)
  const getItemTotal = (item: LaborItem): number => {
    const rate = getItemRate(item);
    const multiplier = getHourMultiplier(item.hourTypeId);
    return rate * multiplier * item.hours * item.people * item.days;
  };

  // Calculate totals by worker type
  const totalsByWorker = workers.map((worker) => {
    const workerItems = items.filter((i) => i.workerTypeId === worker.worker_id);
    const total = workerItems.reduce((sum, item) => sum + getItemTotal(item), 0);
    return { worker, total, count: workerItems.length };
  }).filter((t) => t.count > 0);

  // Calculate summary totals
  const totalPeople = items.reduce((sum, item) => sum + item.people, 0);
  const totalDays = items.reduce((sum, item) => sum + item.days, 0);
  
  // Calculate hours by type
  const hoursByType = hourTypes.map((hourType) => {
    const typeItems = items.filter((i) => i.hourTypeId === hourType.hour_id);
    const totalHours = typeItems.reduce((sum, item) => sum + (item.hours * item.people * item.days), 0);
    const totalValue = typeItems.reduce((sum, item) => sum + getItemTotal(item), 0);
    return { hourType, totalHours, totalValue, count: typeItems.length };
  }).filter((t) => t.count > 0);

  // Grand total
  const grandTotal = items.reduce((sum, item) => sum + getItemTotal(item), 0);

  // Update context
  useEffect(() => {
    updateTotal("maoDeObra", grandTotal);
  }, [grandTotal, updateTotal]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-2">
        <Card className="bg-blue-500/10 border-blue-500/20">
          <CardContent className="p-2 text-center">
            <HardHat className="w-3 h-3 text-blue-400 mx-auto mb-1" />
            <div className="text-xs text-blue-400/80">Itens</div>
            <div className="text-sm font-bold text-white">{items.length}</div>
          </CardContent>
        </Card>
        <Card className="bg-emerald-500/10 border-emerald-500/20">
          <CardContent className="p-2 text-center">
            <DollarSign className="w-3 h-3 text-emerald-400 mx-auto mb-1" />
            <div className="text-xs text-emerald-400/80">Total Venda</div>
            <div className="text-sm font-bold text-emerald-400">{formatCurrency(grandTotal)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Reference Table */}
      <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
        <CardHeader className="pb-2 px-3 pt-3">
          <CardTitle className="text-sm text-white flex items-center gap-2">
            <Wrench className="w-4 h-4 text-cyan-400" />
            Tabela de Preços (R$/hora)
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-1 text-slate-400 font-medium">Profissional</th>
                  {activeClients.map((client) => (
                    <th key={client.client_id} className="text-center py-1 text-slate-400 font-medium">
                      {client.name}<br />
                      <span className="text-slate-500 text-[10px]">({client.dias}d)</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {workers.map((worker) => (
                  <tr key={worker.worker_id} className="border-b border-slate-700/50">
                    <td className="py-1.5 text-white">
                      <span className="mr-1">{worker.icon}</span>
                      {worker.name}
                    </td>
                    {activeClients.map((client) => (
                      <td key={client.client_id} className="text-center py-1.5 text-emerald-400 font-medium">
                        {formatCurrency(getRate(worker.worker_id, client.client_id))}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Add Button */}
      <div className="flex justify-end gap-2">
        <Button
          onClick={resetItems}
          variant="outline"
          className="border-red-500/50 text-red-400 hover:bg-red-500/20"
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Zerar
        </Button>
        <Button
          onClick={addItem}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Mão de Obra
        </Button>
      </div>

      {/* Labor Items */}
      <div className="space-y-3">
        {items.map((item, index) => {
          const workerType = getWorker(item.workerTypeId);
          const hourType = hourTypes.find((h) => h.hour_id === item.hourTypeId);
          const rate = getItemRate(item);
          const itemTotal = getItemTotal(item);

          return (
            <Card key={item.id} className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
              <CardContent className="p-3">
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <Badge className="bg-slate-700 text-slate-300">
                    {workerType?.icon} {workerType?.name} #{index + 1}
                    {item.title && <span className="ml-1 text-emerald-400">• {item.title}</span>}
                  </Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeItem(item.id)}
                    disabled={items.length === 1}
                    className="text-red-400 hover:bg-red-500/20 h-8 px-2"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                {/* Title Field */}
                <div className="mb-3">
                  <Label className="text-slate-400 text-xs">Título / Descrição</Label>
                  <Input
                    type="text"
                    placeholder="Ex: Manutenção caldeira, Reparo estrutural..."
                    value={item.title}
                    onChange={(e) => updateItem(item.id, { title: e.target.value })}
                    className="bg-slate-700/50 border-slate-600 text-white h-9 text-sm"
                  />
                </div>

                {/* Form */}
                <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 mb-3">
                  <div className="space-y-1 col-span-2 sm:col-span-1">
                    <Label className="text-slate-400 text-xs">Profissional</Label>
                    <Select
                      value={item.workerTypeId}
                      onValueChange={(value) => updateItem(item.id, { workerTypeId: value })}
                    >
                      <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white h-9 text-sm truncate">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        {workers.map((w) => (
                          <SelectItem key={w.worker_id} value={w.worker_id} className="text-white">
                            {w.icon} {w.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1 col-span-1 sm:col-span-1">
                    <Label className="text-slate-400 text-xs">Cliente</Label>
                    <Select
                      value={item.clientId}
                      onValueChange={(value) => updateItem(item.id, { clientId: value })}
                    >
                      <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        {activeClients.map((c) => (
                          <SelectItem key={c.client_id} value={c.client_id} className="text-white">
                            {c.name} ({c.dias}d)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-slate-400 text-xs">Tipo Hora</Label>
                    <Select
                      value={item.hourTypeId}
                      onValueChange={(value) => updateItem(item.id, { hourTypeId: value })}
                    >
                      <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        {hourTypes.map((h) => (
                          <SelectItem key={h.hour_id} value={h.hour_id} className="text-white">
                            {h.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-slate-400 text-xs">Horas</Label>
                    <Input
                      type="number"
                      step="0.5"
                      min="0.5"
                      value={item.hours || ""}
                      onChange={(e) => updateItem(item.id, { hours: parseFloat(e.target.value) || 0 })}
                      className="bg-slate-700/50 border-slate-600 text-white h-9 text-sm"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-slate-400 text-xs">Pessoas</Label>
                    <Input
                      type="number"
                      min="1"
                      value={item.people || ""}
                      onChange={(e) => updateItem(item.id, { people: parseInt(e.target.value) || 1 })}
                      className="bg-slate-700/50 border-slate-600 text-white h-9 text-sm"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-slate-400 text-xs">Dias</Label>
                    <Input
                      type="number"
                      step="0.5"
                      min="0.5"
                      value={item.days || ""}
                      onChange={(e) => updateItem(item.id, { days: parseFloat(e.target.value) || 0 })}
                      className="bg-slate-700/50 border-slate-600 text-white h-9 text-sm"
                    />
                  </div>
                </div>

                {/* Results */}
                <div className="pt-2 border-t border-slate-700">
                  <div className="flex flex-wrap gap-4 text-sm">
                    <div className="flex items-center gap-1 text-slate-400">
                      <span>Taxa:</span>
                      <span className="text-white font-medium">
                        {formatCurrency(rate)}/h {hourType?.hour_id !== "normal" && `× ${hourType?.multiplier}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <DollarSign className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400 font-bold">{formatCurrency(itemTotal)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Summary by Worker Type */}
      {totalsByWorker.length > 0 && (
        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
          <CardHeader className="pb-2 px-3 pt-3">
            <CardTitle className="text-sm text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-400" />
              Resumo por Profissional
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3 space-y-2">
            {totalsByWorker.map(({ worker, total }) => (
              <div key={worker.worker_id} className="flex items-center justify-between p-2 rounded bg-slate-700/30">
                <div className="flex items-center gap-2">
                  <span>{worker.icon}</span>
                  <span className="text-white text-sm">{worker.name}</span>
                </div>
                <span className="text-emerald-400 font-medium">{formatCurrency(total)}</span>
              </div>
            ))}
            <div className="border-t border-slate-600 pt-2 flex justify-between">
              <span className="text-white font-medium">Total Geral</span>
              <span className="text-emerald-400 font-bold text-lg">{formatCurrency(grandTotal)}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Summary Card */}
      {items.length > 0 && (totalPeople > 0 || totalDays > 0) && (
        <Card className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/30 backdrop-blur-sm">
          <CardHeader className="pb-2 px-3 pt-3">
            <CardTitle className="text-sm text-white flex items-center gap-2">
              <HardHat className="w-4 h-4 text-amber-400" />
              Detalhamento Geral
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3 space-y-3">
            {/* Team Size Input */}
            <div className="bg-slate-700/40 rounded-lg p-3">
              <Label className="text-xs text-slate-400 mb-2 block">Pessoas por Equipe (máx. por dia)</Label>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  min={1}
                  max={9}
                  value={teamSize}
                  onChange={(e) => setTeamSize(Math.min(9, Math.max(1, parseInt(e.target.value) || 1)))}
                  className="w-20 bg-slate-800 border-slate-600 text-white text-center"
                />
                <div className="flex-1 text-right">
                  <div className="text-xs text-slate-400">Dias de Equipe Necessários</div>
                  <div className="text-xl font-bold text-amber-400">
                    {totalPeople > 0 ? Math.ceil(totalPeople / teamSize) : 0} dias
                  </div>
                  <div className="text-xs text-slate-500">
                    {totalPeople} pessoas ÷ {teamSize} por equipe
                  </div>
                </div>
              </div>
            </div>

            {/* Totals Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-700/40 rounded-lg p-3 text-center">
                <Users className="w-5 h-5 text-blue-400 mx-auto mb-1" />
                <div className="text-xs text-slate-400">Total Pessoas</div>
                <div className="text-xl font-bold text-white">{totalPeople}</div>
              </div>
              <div className="bg-slate-700/40 rounded-lg p-3 text-center">
                <span className="text-xl">📅</span>
                <div className="text-xs text-slate-400">Total Dias</div>
                <div className="text-xl font-bold text-white">{totalDays}</div>
              </div>
            </div>

            {/* Hours by Type */}
            {hoursByType.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs text-slate-400 font-medium">Horas por Tipo</div>
                {hoursByType.map(({ hourType, totalHours, totalValue }) => (
                  <div key={hourType.hour_id} className="flex items-center justify-between p-2 rounded bg-slate-700/30">
                    <div className="flex items-center gap-2">
                      <Badge className={
                        hourType.hour_id === "normal" 
                          ? "bg-slate-600 text-slate-200" 
                          : hourType.hour_id === "extra50" 
                            ? "bg-yellow-600 text-yellow-100" 
                            : hourType.hour_id === "extra100"
                              ? "bg-orange-600 text-orange-100"
                              : "bg-red-600 text-red-100"
                      }>
                        {hourType.name}
                      </Badge>
                      <span className="text-slate-300 text-sm">{totalHours.toFixed(1)}h</span>
                    </div>
                    <span className="text-emerald-400 font-medium">{formatCurrency(totalValue)}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Grand Total */}
            <div className="border-t border-amber-500/30 pt-3 flex justify-between items-center">
              <span className="text-white font-medium">Total Mão de Obra</span>
              <span className="text-emerald-400 font-bold text-xl">{formatCurrency(grandTotal)}</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
