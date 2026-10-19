"use client";

import { useMemo, useEffect } from "react";
import { useTotals } from "@/context/TotalsContext";
import { usePriceTable } from "@/hooks/usePriceTable";
import { clampMaterialNegotiationPct, effectiveMaterialNegotiationPct, materialOfferMarkupPct, materialOfferPrice } from "@/lib/material-negotiation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Calculator, Percent, Receipt, TrendingUp, Minus, RotateCcw, Plus, Trash2, Package, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface MaterialItem {
  id: string;
  clientId: string;
  description: string;
  valorMaterial: number;
  /** null: padrão do cliente; número: negociação ajustada neste orçamento; undefined: legado */
  negotiationOverridePct?: number | null;
}

/**
 * Mantemos os nomes legados dos campos para conseguir abrir orçamentos antigos.
 * Na regra 2026:
 * - inss = retenção de INSS (fluxo de caixa/compensável), não custo econômico extra;
 * - simplesIssqn = alíquota efetiva TOTAL do Simples/DAS;
 * - descontoCompras = valor legado usado apenas em históricos sem negociação por material;
 * - ISS retido vem do cadastro do cliente/HH e já está dentro do DAS total.
 */
export interface BDIState {
  inss: number;
  simplesIssqn: number;
  lucroPercent: number;
  jurosDia: number;
  diasPagamento: number;
  trocaNota: number;
  descontoCompras: number;
  materials: MaterialItem[];
}

export const generateMaterialId = () => Math.random().toString(36).substring(2, 9);

export const createDefaultMaterial = (): MaterialItem => ({
  id: generateMaterialId(),
  clientId: "",
  description: "",
  valorMaterial: 0,
  negotiationOverridePct: null,
});

export const createDefaultBDIState = (): BDIState => ({
  inss: 0,
  simplesIssqn: 10.81,
  lucroPercent: 10,
  jurosDia: 0.1,
  diasPagamento: 120,
  trocaNota: 0,
  descontoCompras: 0,
  materials: [createDefaultMaterial()],
});

interface BDIPageProps {
  state: BDIState;
  setState: React.Dispatch<React.SetStateAction<BDIState>>;
}

const formatCurrency = (value: number): string =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const formatPercent = (value: number): string => `${value.toFixed(2)}%`;

interface MaterialCalculation {
  cost: number;
  basePrice: number;
  offerPrice: number;
  das: number;
  issRetained: number;
  inssRetained: number;
  finance: number;
  profit: number;
  noteExchange: number;
  negotiationCushion: number;
  economicResult: number;
  financePct: number;
  negotiationPct: number;
  days: number;
}

export default function BDIPage({ state, setState }: BDIPageProps) {
  const { updateTotal } = useTotals();
  const { activeClients, loading: loadingClients, getClient, hhSettings } = usePriceTable();

  const { inss, simplesIssqn, lucroPercent, jurosDia, diasPagamento, trocaNota, descontoCompras, materials } = state;

  const updateField = <K extends keyof BDIState>(field: K, value: BDIState[K]) => {
    setState(prev => ({ ...prev, [field]: value }));
  };

  const addMaterial = () => {
    setState(prev => ({ ...prev, materials: [...prev.materials, createDefaultMaterial()] }));
  };

  const removeMaterial = (id: string) => {
    setState(prev => ({ ...prev, materials: prev.materials.filter(m => m.id !== id) }));
  };

  const updateMaterial = (id: string, updates: Partial<MaterialItem>) => {
    setState(prev => ({
      ...prev,
      materials: prev.materials.map(m => m.id === id ? { ...m, ...updates } : m),
    }));
  };

  const resetMaterials = () => {
    setState(prev => ({ ...prev, descontoCompras: 0, materials: [createDefaultMaterial()] }));
  };

  // O campo superior atua sobre um único cliente. Quando há clientes diferentes
  // no orçamento, cada item mantém sua negociação individual, sem sobrescrita.
  const sharedClientId = materials[0]?.clientId &&
    materials.every(m => m.clientId === materials[0].clientId)
    ? materials[0].clientId
    : null;
  const sharedClient = sharedClientId ? getClient(sharedClientId) : undefined;
  const setSharedNegotiationPct = (newPercent: number) => {
    if (!sharedClientId) return;
    const pct = clampMaterialNegotiationPct(newPercent);
    setState(prev => ({
      ...prev,
      descontoCompras: 0,
      materials: prev.materials.map(m =>
        m.clientId === sharedClientId ? { ...m, negotiationOverridePct: pct } : m
      ),
    }));
  };
  const setItemNegotiationPct = (id: string, value: number | null) => {
    setState(prev => ({
      ...prev,
      materials: prev.materials.map(m =>
        m.id === id ? { ...m, negotiationOverridePct: value } : m
      ),
    }));
  };

  const totalValorMaterial = useMemo(
    () => materials.reduce((sum, m) => sum + Math.max(0, Number(m.valorMaterial) || 0), 0),
    [materials]
  );

  const calculateMaterial = (material: MaterialItem): MaterialCalculation => {
    const cost = Math.max(0, Number(material.valorMaterial) || 0);
    const client = getClient(material.clientId);
    const days = Math.max(0, Number(client?.dias ?? diasPagamento) || 0);

    const dasPct = Math.max(0, Number(simplesIssqn ?? hhSettings?.das_effective_pct ?? 10.81));
    const issPct = Math.max(0, Number(client?.iss_retained_pct ?? hhSettings?.default_iss_retained_pct ?? 4.36));
    const inssPct = Math.max(0, Number(inss || client?.inss_retained_pct || hhSettings?.default_inss_retained_pct || 0));
    const profitPct = Math.max(0, Number(lucroPercent) || 0);
    const notePct = Math.max(0, Number(trocaNota) || 0);
    const dailyPct = Math.max(0, Number(jurosDia ?? hhSettings?.anticipation_daily_pct ?? 0.1));
    const negotiationPct = effectiveMaterialNegotiationPct(
      client?.negotiation_pct ?? 0, material.negotiationOverridePct, descontoCompras
    );

    const receivableFraction = Math.max(0, 1 - (issPct + inssPct) / 100);
    const financePct = client?.anticipate === false ? 0 : days * dailyPct;
    const divisor = 1 - (dasPct + profitPct + notePct) / 100 - (financePct / 100) * receivableFraction;
    const basePrice = cost > 0 && divisor > 0 ? cost / divisor : 0;
    const offerPrice = materialOfferPrice(basePrice, negotiationPct);

    const das = basePrice * dasPct / 100;
    const issRetained = basePrice * issPct / 100;
    const inssRetained = basePrice * inssPct / 100;
    const receivable = Math.max(0, basePrice - issRetained - inssRetained);
    const finance = receivable * financePct / 100;
    const profit = basePrice * profitPct / 100;
    const noteExchange = basePrice * notePct / 100;
    const negotiationCushion = Math.max(0, offerPrice - basePrice);
    const economicResult = basePrice - das - finance - noteExchange - cost;

    return {
      cost,
      basePrice,
      offerPrice,
      das,
      issRetained,
      inssRetained,
      finance,
      profit,
      noteExchange,
      negotiationCushion,
      economicResult,
      financePct,
      negotiationPct,
      days,
    };
  };

  const materialCalculations = useMemo(
    () => materials.map(m => calculateMaterial(m)),
    // calculateMaterial intentionally depends on the values listed here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [materials, inss, simplesIssqn, lucroPercent, jurosDia, diasPagamento, trocaNota, descontoCompras, getClient, hhSettings]
  );

  const sharedNegotiationPct = sharedClientId &&
    materialCalculations.length > 0 &&
    materialCalculations.every(m => m.negotiationPct === materialCalculations[0].negotiationPct)
    ? materialCalculations[0].negotiationPct
    : null;

  const calculations = useMemo(() => {
    const sum = (field: keyof MaterialCalculation) =>
      materialCalculations.reduce((total, item) => total + Number(item[field] || 0), 0);

    const totalBase = sum("basePrice");
    const totalOffer = sum("offerPrice");
    const totalCost = sum("cost");
    const das = sum("das");
    const issRetained = sum("issRetained");
    const inssRetained = sum("inssRetained");
    const finance = sum("finance");
    const profit = sum("profit");
    const noteExchange = sum("noteExchange");
    const negotiationCushion = sum("negotiationCushion");
    const economicResult = sum("economicResult");
    const bdiTotal = totalCost > 0 ? (totalOffer / totalCost - 1) * 100 : 0;
    const weightedFinancePct = totalBase > 0
      ? materialCalculations.reduce((acc, m) => acc + m.basePrice * m.financePct, 0) / totalBase
      : 0;

    return {
      totalMaterialNF: totalOffer,
      totalBase,
      totalCost,
      das,
      issRetained,
      inssRetained,
      finance,
      profit,
      noteExchange,
      negotiationCushion,
      economicResult,
      bdiTotal,
      weightedFinancePct,
      valor60: totalCost + (totalOffer - totalCost) * 0.6,
      valor100: totalOffer,
    };
  }, [materialCalculations]);

  useEffect(() => {
    updateTotal("material", calculations.totalMaterialNF);
    updateTotal("materialSemBDI", totalValorMaterial);
  }, [calculations.totalMaterialNF, totalValorMaterial, updateTotal]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Card className="bg-emerald-500/10 border-emerald-500/20">
          <CardContent className="p-2 text-center">
            <Receipt className="w-3 h-3 text-emerald-400 mx-auto mb-1" />
            <div className="text-xs text-emerald-400/80">Valor Oferta/NF</div>
            <div className="text-sm font-bold text-white">{formatCurrency(calculations.totalMaterialNF)}</div>
          </CardContent>
        </Card>
        <Card className="bg-blue-500/10 border-blue-500/20">
          <CardContent className="p-2 text-center">
            <TrendingUp className="w-3 h-3 text-blue-400 mx-auto mb-1" />
            <div className="text-xs text-blue-400/80">Lucro previsto</div>
            <div className="text-sm font-bold text-white">{formatCurrency(calculations.profit)}</div>
          </CardContent>
        </Card>
        <Card className="bg-amber-500/10 border-amber-500/20">
          <CardContent className="p-2 text-center">
            <Percent className="w-3 h-3 text-amber-400 mx-auto mb-1" />
            <div className="text-xs text-amber-400/80">Acréscimo total</div>
            <div className="text-sm font-bold text-white">{formatPercent(calculations.bdiTotal)}</div>
          </CardContent>
        </Card>
        <Card className="bg-purple-500/10 border-purple-500/20">
          <CardContent className="p-2 text-center">
            <Minus className="w-3 h-3 text-purple-400 mx-auto mb-1" />
            <div className="text-xs text-purple-400/80">Resultado econômico</div>
            <div className="text-sm font-bold text-white">{formatCurrency(calculations.economicResult)}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
        <CardHeader className="pb-2 px-3 pt-3">
          <CardTitle className="text-sm text-white flex items-center gap-2">
            <Percent className="w-4 h-4 text-amber-400" />
            Parâmetros do Material
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label className="text-slate-400 text-xs">INSS retido %</Label>
              <Input type="number" step="0.1" value={inss}
                onChange={(e) => updateField("inss", parseFloat(e.target.value) || 0)}
                className="bg-slate-700/50 border-slate-600 text-white h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-slate-400 text-xs">Simples/DAS total %</Label>
              <Input type="number" step="0.01" value={simplesIssqn}
                onChange={(e) => updateField("simplesIssqn", parseFloat(e.target.value) || 0)}
                className="bg-slate-700/50 border-slate-600 text-white h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-slate-400 text-xs">Lucro %</Label>
              <Input type="number" step="0.1" value={lucroPercent}
                onChange={(e) => updateField("lucroPercent", parseFloat(e.target.value) || 0)}
                className="bg-slate-700/50 border-slate-600 text-white h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-slate-400 text-xs">Troca de Nota %</Label>
              <Input type="number" step="0.1" value={trocaNota}
                onChange={(e) => updateField("trocaNota", parseFloat(e.target.value) || 0)}
                className="bg-slate-700/50 border-slate-600 text-white h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-slate-400 text-xs">Antecipação/dia %</Label>
              <Input type="number" step="0.01" value={jurosDia}
                onChange={(e) => updateField("jurosDia", parseFloat(e.target.value) || 0)}
                className="bg-slate-700/50 border-slate-600 text-white h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-slate-400 text-xs">Dias padrão</Label>
              <Input type="number" value={diasPagamento}
                onChange={(e) => updateField("diasPagamento", parseInt(e.target.value) || 0)}
                className="bg-slate-700/50 border-slate-600 text-white h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-slate-400 text-xs">Negociação aplicada %</Label>
              <Input type="number" step="0.1" min="0" max="95"
                value={sharedNegotiationPct ?? ""}
                placeholder={sharedClientId ? "Varia por item" : "Por cliente"}
                disabled={!sharedClientId}
                onChange={(e) => setSharedNegotiationPct(parseFloat(e.target.value) || 0)}
                className="bg-slate-700/50 border-slate-600 text-white h-8 text-sm disabled:opacity-70" />
              <div className="text-[10px] text-slate-400">
                {sharedClientId
                  ? `Padrão de ${sharedClient?.name ?? "cliente"}: ${formatPercent(Number(sharedClient?.negotiation_pct ?? 0))} • editável só neste orçamento`
                  : "Selecione um cliente; com clientes diferentes, ajuste em cada item."}
              </div>
              {sharedNegotiationPct !== null && (
                <div className="text-[10px] text-emerald-400">
                  Acréscimo na oferta: +{formatPercent(materialOfferMarkupPct(sharedNegotiationPct))} para permitir desconto de {formatPercent(sharedNegotiationPct)}
                </div>
              )}
              {sharedClientId && materials.some(m => m.negotiationOverridePct !== null || (m.negotiationOverridePct === undefined && descontoCompras > 0)) && (
                <button type="button" className="text-[10px] text-sky-400 hover:underline"
                  onClick={() => setState(prev => ({
                    ...prev, descontoCompras: 0,
                    materials: prev.materials.map(m => m.clientId === sharedClientId ? { ...m, negotiationOverridePct: null } : m)
                  }))}>
                  Restaurar percentual cadastrado
                </button>
              )}
            </div>
            <div className="space-y-1">
              <Label className="text-slate-400 text-xs">Antecipação média</Label>
              <div className="h-8 flex items-center px-3 bg-slate-700/30 border border-slate-600 rounded-md text-sm text-emerald-400">
                {formatPercent(calculations.weightedFinancePct)}
              </div>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-700 text-xs text-slate-400">
            ISS retido não é somado novamente ao DAS. INSS retido afeta o recebível/caixa, mas não é tratado como novo custo econômico.
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button onClick={resetMaterials} variant="outline" className="border-red-500/50 text-red-400 hover:bg-red-500/20">
          <RotateCcw className="w-4 h-4 mr-2" />Zerar Materiais
        </Button>
        <Button onClick={addMaterial} className="bg-emerald-600 hover:bg-emerald-700 text-white">
          <Plus className="w-4 h-4 mr-2" />Adicionar Material
        </Button>
      </div>

      <div className="space-y-3">
        {materials.map((material, index) => {
          const calc = materialCalculations[index] ?? calculateMaterial(material);
          const materialClient = getClient(material.clientId);
          return (
            <Card key={material.id} className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-3">
                  <Badge className="bg-slate-700 text-slate-300">
                    <Package className="w-3 h-3 mr-1" />
                    {material.description ? material.description : `Material #${index + 1}`}
                  </Badge>
                  <Button size="sm" variant="ghost" onClick={() => removeMaterial(material.id)} disabled={materials.length === 1}
                    className="text-red-400 hover:bg-red-500/20 h-8 px-2">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <Label className="text-slate-400 text-xs flex items-center gap-1"><Building2 className="w-3 h-3" />Cliente</Label>
                    <Select value={material.clientId} onValueChange={(value) => updateMaterial(material.id, { clientId: value, negotiationOverridePct: null })} disabled={loadingClients}>
                      <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white h-9 text-sm"><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        {activeClients.map((client) => (
                          <SelectItem key={client.client_id} value={client.client_id} className="text-white hover:bg-slate-700">
                            {client.name} ({client.dias}d)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-slate-400 text-xs">Título</Label>
                    <Input type="text" placeholder="Ex: Tubos de aço" value={material.description}
                      onChange={(e) => updateMaterial(material.id, { description: e.target.value })}
                      className="bg-slate-700/50 border-slate-600 text-white h-9 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-slate-400 text-xs">Custo Material R$</Label>
                    <Input type="number" step="0.01" value={material.valorMaterial || ""}
                      onChange={(e) => updateMaterial(material.id, { valorMaterial: parseFloat(e.target.value) || 0 })}
                      className="bg-slate-700/50 border-slate-600 text-white h-9 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-emerald-400 text-xs font-medium">
                      Valor Oferta {materialClient ? `(${materialClient.dias}d)` : ''}
                    </Label>
                    <div className="h-9 flex items-center px-3 bg-emerald-500/20 border border-emerald-500/30 rounded-md text-sm font-bold text-emerald-400">
                      {formatCurrency(calc.offerPrice)}
                    </div>
                  </div>
                </div>
                {materialClient && (
                  <div className="mt-3 flex flex-wrap items-end gap-3 border-t border-slate-700/60 pt-3">
                    <div className="space-y-1 w-40">
                      <Label className="text-slate-400 text-xs">Negociação deste material %</Label>
                      <Input type="number" step="0.1" min="0" max="95"
                        value={calc.negotiationPct}
                        onChange={(e) => setItemNegotiationPct(material.id, clampMaterialNegotiationPct(parseFloat(e.target.value) || 0))}
                        className="bg-slate-700/50 border-slate-600 text-white h-8 text-sm" />
                    </div>
                    <div className="flex-1 text-xs text-slate-400">
                      <div>Padrão {materialClient.name}: {formatPercent(Number(materialClient.negotiation_pct ?? 0))}</div>
                      <div>Preço-base: {formatCurrency(calc.basePrice)} · acréscimo para negociação: <span className="text-emerald-400">+{formatPercent(materialOfferMarkupPct(calc.negotiationPct))} ({formatCurrency(calc.negotiationCushion)})</span></div>
                      <div>Desconto possível sobre a oferta: <span className="text-emerald-400">{formatPercent(calc.negotiationPct)}</span> · após desconto: {formatCurrency(calc.offerPrice * (1 - calc.negotiationPct / 100))}</div>
                    </div>
                    {(material.negotiationOverridePct !== null || (material.negotiationOverridePct === undefined && descontoCompras > 0)) && (
                      <button type="button" className="text-xs text-sky-400 hover:underline"
                        onClick={() => setItemNegotiationPct(material.id, null)}>
                        Usar padrão
                      </button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
        <CardHeader className="pb-2 px-3 pt-3">
          <CardTitle className="text-sm text-white flex items-center gap-2"><Calculator className="w-4 h-4 text-blue-400" />Resumo dos Materiais</CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="space-y-1"><Label className="text-slate-400 text-xs">Total Custo</Label><div className="h-9 flex items-center px-3 bg-slate-700/30 border border-slate-600 rounded-md text-sm text-white">{formatCurrency(totalValorMaterial)}</div></div>
            <div className="space-y-1"><Label className="text-slate-400 text-xs">Lucro previsto</Label><div className="h-9 flex items-center px-3 bg-slate-700/30 border border-slate-600 rounded-md text-sm text-white">{formatCurrency(calculations.profit)}</div></div>
            <div className="space-y-1"><Label className="text-slate-400 text-xs">Valor 60%</Label><div className="h-9 flex items-center px-3 bg-slate-700/30 border border-slate-600 rounded-md text-sm text-white">{formatCurrency(calculations.valor60)}</div></div>
            <div className="space-y-1"><Label className="text-slate-400 text-xs">Valor 100%</Label><div className="h-9 flex items-center px-3 bg-slate-700/30 border border-slate-600 rounded-md text-sm text-white">{formatCurrency(calculations.valor100)}</div></div>
            <div className="space-y-1"><Label className="text-slate-400 text-xs">Colchão negociação</Label><div className="h-9 flex items-center px-3 bg-slate-700/30 border border-slate-600 rounded-md text-sm text-white">{formatCurrency(calculations.negotiationCushion)}</div></div>
            <div className="space-y-1"><Label className="text-emerald-400 text-xs font-medium">Total Oferta/NF</Label><div className="h-9 flex items-center px-3 bg-emerald-500/20 border border-emerald-500/30 rounded-md text-sm font-bold text-emerald-400">{formatCurrency(calculations.totalMaterialNF)}</div></div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
        <CardHeader className="pb-2 px-3 pt-3">
          <CardTitle className="text-sm text-white flex items-center gap-2"><Receipt className="w-4 h-4 text-purple-400" />Detalhamento</CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3">
          <div className="space-y-2">
            <div className="flex justify-between text-sm"><span className="text-slate-400">Simples/DAS total</span><span className="text-white">{formatCurrency(calculations.das)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-slate-400">ISS retido (já dentro do DAS)</span><span className="text-white">{formatCurrency(calculations.issRetained)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-slate-400">INSS retido (caixa/compensável)</span><span className="text-white">{formatCurrency(calculations.inssRetained)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-slate-400">Antecipação/financeiro</span><span className="text-white">{formatCurrency(calculations.finance)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-slate-400">Troca de nota</span><span className="text-white">{formatCurrency(calculations.noteExchange)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-slate-400">Lucro previsto</span><span className="text-white">{formatCurrency(calculations.profit)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-slate-400">Custo dos materiais</span><span className="text-white">{formatCurrency(totalValorMaterial)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-slate-400">Colchão de negociação</span><span className="text-white">{formatCurrency(calculations.negotiationCushion)}</span></div>
            <div className="border-t border-slate-700 pt-2 mt-2">
              <div className="flex justify-between text-sm font-medium"><span className="text-emerald-400">Resultado econômico</span><span className={calculations.economicResult >= 0 ? "text-emerald-400" : "text-red-400"}>{formatCurrency(calculations.economicResult)}</span></div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
