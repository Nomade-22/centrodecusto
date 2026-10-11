"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Handshake, Calculator, TrendingDown, DollarSign, Percent, ArrowDownToLine, TrendingUp, AlertTriangle, CheckCircle2, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NotaReversaState } from "./NotaReversa";
import { LaborItem } from "./MaoDeObra";
import { usePriceTable } from "@/hooks/usePriceTable";
import { useTotals } from "@/context/TotalsContext";

export interface NegociacaoState {
  valorOriginal: string;
  valorOriginalNumerico: number;
  valorLiquido: number;
  totalCustos: number;
  totalImpostos: number;
  descontoPercent: number;
  descontoValor: number;
  tipoDesconto: "percent" | "valor";
  // Detailed breakdown
  storedIssqn: number;
  storedInss: number;
  storedSimples: number;
  storedAntecipacao: number;
  storedMaoDeObra: number;
  storedMaterial: number;
  storedViagens: number;
  storedTransporte: number;
  storedEstadia: number;
  storedAlmoco: number;
  storedJanta: number;
  storedCafe: number;
}

export const createDefaultNegociacaoState = (): NegociacaoState => ({
  valorOriginal: "",
  valorOriginalNumerico: 0,
  valorLiquido: 0,
  totalCustos: 0,
  totalImpostos: 0,
  descontoPercent: 0,
  descontoValor: 0,
  tipoDesconto: "percent",
  // Detailed breakdown
  storedIssqn: 0,
  storedInss: 0,
  storedSimples: 0,
  storedAntecipacao: 0,
  storedMaoDeObra: 0,
  storedMaterial: 0,
  storedViagens: 0,
  storedTransporte: 0,
  storedEstadia: 0,
  storedAlmoco: 0,
  storedJanta: 0,
  storedCafe: 0,
});

interface NegociacaoPageProps {
  state: NegociacaoState;
  setState: React.Dispatch<React.SetStateAction<NegociacaoState>>;
  notaReversaState: NotaReversaState;
  laborItems?: LaborItem[];
}

const formatCurrency = (value: number): string => {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};

const parseCurrencyInput = (value: string): number => {
  const cleaned = value.replace(/\D/g, "");
  return parseFloat(cleaned) / 100 || 0;
};

const formatInputAsCurrency = (value: string): string => {
  const numValue = parseCurrencyInput(value);
  if (numValue === 0) return "";
  return numValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};

export default function NegociacaoPage({ state, setState, notaReversaState, laborItems = [] }: NegociacaoPageProps) {
  const { getCustoHora, getHourMultiplier, hhSettings } = usePriceTable();
  const { totals } = useTotals();
  
  const {
    valorOriginal,
    valorOriginalNumerico,
    valorLiquido,
    totalCustos,
    totalImpostos,
    descontoPercent,
    descontoValor,
    tipoDesconto,
    storedIssqn,
    storedInss,
    storedSimples,
    storedAntecipacao,
    storedMaoDeObra,
    storedMaterial,
    storedViagens,
    storedTransporte,
    storedEstadia,
    storedAlmoco,
    storedJanta,
    storedCafe,
  } = state;

  // Calculate values from NotaReversa
  const {
    valorBrutoNumerico: notaValorBruto,
    incluirIssqn,
    incluirInss,
    incluirSimples,
    incluirAntecipacao,
    antecipacaoPercent,
    incluirMaoDeObra,
    incluirMaterial,
    incluirViagens,
    incluirTransporte,
    incluirEstadia,
    incluirAlmoco,
    incluirJanta,
    incluirCafe,
  } = notaReversaState;

  // Get raw values without BDI from context
  const materialSemBDI = totals.materialSemBDI || 0;
  const viagensSemBDI = totals.viagensSemBDI || 0;
  const transporteSemBDI = totals.transporteSemBDI || 0;
  const estadiaSemBDI = totals.estadiaSemBDI || 0;
  const almocoSemBDI = totals.almocoSemBDI || 0;
  const jantaSemBDI = totals.jantaSemBDI || 0;
  const cafeSemBDI = totals.cafeSemBDI || 0;

  // Same fiscal order used by Nota Reversa and the HH calculator.
  const issPct = Number(hhSettings?.default_iss_retained_pct ?? 4.36) / 100;
  const inssPct = Number(hhSettings?.default_inss_retained_pct ?? 0) / 100;
  const dasPct = Number(hhSettings?.das_effective_pct ?? 10.81) / 100;
  const issqn = incluirIssqn ? notaValorBruto * issPct : 0;
  const inss = incluirInss ? notaValorBruto * inssPct : 0;
  const simples = incluirSimples ? notaValorBruto * dasPct : 0;
  const recebivelAntesAntecipacao = notaValorBruto - issqn - inss;
  const antecipacao = incluirAntecipacao
    ? recebivelAntesAntecipacao * (antecipacaoPercent / 100)
    : 0;
  const impostos = simples; // economic tax burden; ISS composes DAS and INSS retained is compensable

  // Calculate custos from laborItems (same as NotaReversa)
  const totalCustoMaoDeObra = laborItems.reduce((sum, item) => {
    const custoHora = getCustoHora(item.workerTypeId, item.clientId) || 0;
    const multiplier = getHourMultiplier(item.hourTypeId);
    return sum + (custoHora * multiplier * item.hours * item.people * item.days);
  }, 0);

  // Calculate expense deductions based on NotaReversa switches
  const despMaoDeObra = incluirMaoDeObra ? totalCustoMaoDeObra : 0;
  const despMaterial = incluirMaterial ? materialSemBDI : 0;
  const despViagens = incluirViagens ? viagensSemBDI : 0;
  const despTransporte = incluirTransporte ? transporteSemBDI : 0;
  const despEstadia = incluirEstadia ? estadiaSemBDI : 0;
  const despAlmoco = incluirAlmoco ? almocoSemBDI : 0;
  const despJanta = incluirJanta ? jantaSemBDI : 0;
  const despCafe = incluirCafe ? cafeSemBDI : 0;
  const totalDespesasNotaReversa = despMaoDeObra + despMaterial + despViagens + despTransporte + despEstadia + despAlmoco + despJanta + despCafe;

  // Function to pull values from NotaReversa
  const handlePuxarNotaReversa = () => {
    // Economic net after DAS and financing; retentions are cash-flow items.
    const liquidoAposAntecipacao = notaValorBruto - simples - antecipacao;
    const calculatedImpostos = impostos + antecipacao;
    
    const formatted = notaValorBruto.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    setState(prev => ({
      ...prev,
      valorOriginal: formatted,
      valorOriginalNumerico: notaValorBruto,
      valorLiquido: liquidoAposAntecipacao,
      totalCustos: totalDespesasNotaReversa,
      totalImpostos: calculatedImpostos,
      // Store detailed breakdown
      storedIssqn: issqn,
      storedInss: inss,
      storedSimples: simples,
      storedAntecipacao: antecipacao,
      storedMaoDeObra: despMaoDeObra,
      storedMaterial: despMaterial,
      storedViagens: despViagens,
      storedTransporte: despTransporte,
      storedEstadia: despEstadia,
      storedAlmoco: despAlmoco,
      storedJanta: despJanta,
      storedCafe: despCafe,
    }));
  };

  const updateField = <K extends keyof NegociacaoState>(field: K, value: NegociacaoState[K]) => {
    setState(prev => ({ ...prev, [field]: value }));
  };

  // Handle currency input
  const handleValorOriginalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const formatted = formatInputAsCurrency(raw);
    setState(prev => ({
      ...prev,
      valorOriginal: formatted,
      valorOriginalNumerico: parseCurrencyInput(raw),
    }));
  };

  // Calculate discount
  const descontoAplicado = tipoDesconto === "percent" 
    ? valorOriginalNumerico * (descontoPercent / 100)
    : descontoValor;

  const valorFinal = valorOriginalNumerico - descontoAplicado;
  
  // Recalculate the same fiscal/cash order after a negotiated discount.
  const novoIssqn = storedIssqn > 0 ? valorFinal * issPct : 0;
  const novoInss = storedInss > 0 ? valorFinal * inssPct : 0;
  const novoSimples = storedSimples > 0 ? valorFinal * dasPct : 0;
  const novoRecebivel = valorFinal - novoIssqn - novoInss;
  const novaAntecipacao = storedAntecipacao > 0
    ? novoRecebivel * (antecipacaoPercent / 100)
    : 0;
  const novoValorLiquido = valorFinal - novoSimples - novaAntecipacao;
  const novoTotalImpostos = novoSimples + novaAntecipacao;
  
  // Calculate margins
  const lucroOriginal = valorLiquido - totalCustos;
  const lucroComDesconto = novoValorLiquido - totalCustos;
  
  const valorLiquidoComDesconto = novoValorLiquido;

  const percentDescontoReal = valorOriginalNumerico > 0 
    ? (descontoAplicado / valorOriginalNumerico * 100)
    : 0;

  // Determine status
  const isLucroPositivo = lucroComDesconto > 0;

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        <Card className="bg-blue-500/10 border-blue-500/20">
          <CardContent className="p-2 text-center">
            <DollarSign className="w-3 h-3 text-blue-400 mx-auto mb-1" />
            <div className="text-xs text-blue-400/80">Valor Bruto</div>
            <div className="text-sm font-bold text-white">{formatCurrency(valorOriginalNumerico)}</div>
          </CardContent>
        </Card>
        <Card className="bg-cyan-500/10 border-cyan-500/20">
          <CardContent className="p-2 text-center">
            <Receipt className="w-3 h-3 text-cyan-400 mx-auto mb-1" />
            <div className="text-xs text-cyan-400/80">Valor Líquido</div>
            <div className="text-sm font-bold text-cyan-400">{formatCurrency(valorLiquido)}</div>
          </CardContent>
        </Card>
        <Card className="bg-red-500/10 border-red-500/20">
          <CardContent className="p-2 text-center">
            <TrendingDown className="w-3 h-3 text-red-400 mx-auto mb-1" />
            <div className="text-xs text-red-400/80">Desconto</div>
            <div className="text-sm font-bold text-white">{formatCurrency(descontoAplicado)}</div>
            {descontoAplicado > 0 && (
              <div className="text-xs text-red-400/60">-{percentDescontoReal.toFixed(1)}%</div>
            )}
          </CardContent>
        </Card>
        <Card className="bg-emerald-500/10 border-emerald-500/20">
          <CardContent className="p-2 text-center">
            <Handshake className="w-3 h-3 text-emerald-400 mx-auto mb-1" />
            <div className="text-xs text-emerald-400/80">Valor Final</div>
            <div className="text-sm font-bold text-emerald-400">{formatCurrency(valorFinal)}</div>
          </CardContent>
        </Card>
        <Card className={`col-span-2 sm:col-span-1 ${isLucroPositivo ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
          <CardContent className="p-2 text-center">
            <TrendingUp className="w-3 h-3 mx-auto mb-1" style={{ color: isLucroPositivo ? '#4ade80' : '#f87171' }} />
            <div className="text-xs" style={{ color: isLucroPositivo ? 'rgba(74, 222, 128, 0.8)' : 'rgba(248, 113, 113, 0.8)' }}>Lucro</div>
            <div className="text-sm font-bold" style={{ color: isLucroPositivo ? '#4ade80' : '#f87171' }}>{formatCurrency(lucroComDesconto)}</div>
            {valorFinal > 0 && (
              <div className="text-xs" style={{ color: isLucroPositivo ? 'rgba(74, 222, 128, 0.6)' : 'rgba(248, 113, 113, 0.6)' }}>{(lucroComDesconto / valorFinal * 100).toFixed(1)}% da NF</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Input Card - Valor Original */}
      <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
        <CardHeader className="pb-2 px-3 pt-3">
          <CardTitle className="text-sm text-white flex items-center gap-2">
            <Receipt className="w-4 h-4 text-blue-400" />
            Valor do Orçamento
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3 space-y-3">
          <Input
            type="text"
            placeholder="R$ 0,00"
            value={valorOriginal}
            onChange={handleValorOriginalChange}
            className="bg-slate-700/50 border-slate-600 text-white text-lg h-12 text-center font-bold"
          />
          {notaValorBruto > 0 && (
            <Button
              onClick={handlePuxarNotaReversa}
              variant="outline"
              className="w-full bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-300"
            >
              <ArrowDownToLine className="w-4 h-4 mr-2" />
              Puxar da Nota Reversa ({formatCurrency(notaValorBruto)})
            </Button>
          )}
          {valorLiquido > 0 && (
            <div className="text-xs text-slate-400 text-center">
              Resultado econômico antes dos custos: <span className="text-emerald-400 font-medium">{formatCurrency(valorLiquido)}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Discount Options */}
      <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
        <CardHeader className="pb-2 px-3 pt-3">
          <CardTitle className="text-sm text-white flex items-center gap-2">
            <Handshake className="w-4 h-4 text-amber-400" />
            Desconto Solicitado
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3 space-y-4">
          {/* Discount Type Selector */}
          <div className="flex gap-2">
            <Button
              variant={tipoDesconto === "percent" ? "default" : "outline"}
              onClick={() => updateField("tipoDesconto", "percent")}
              className={tipoDesconto === "percent" 
                ? "flex-1 bg-amber-600 hover:bg-amber-700 text-white" 
                : "flex-1 border-slate-600 text-slate-300 hover:bg-slate-700"
              }
            >
              <Percent className="w-4 h-4 mr-2" />
              Porcentagem
            </Button>
            <Button
              variant={tipoDesconto === "valor" ? "default" : "outline"}
              onClick={() => updateField("tipoDesconto", "valor")}
              className={tipoDesconto === "valor" 
                ? "flex-1 bg-amber-600 hover:bg-amber-700 text-white" 
                : "flex-1 border-slate-600 text-slate-300 hover:bg-slate-700"
              }
            >
              <DollarSign className="w-4 h-4 mr-2" />
              Valor Fixo
            </Button>
          </div>

          {/* Discount Input */}
          {tipoDesconto === "percent" ? (
            <div className="space-y-2">
              <Label className="text-slate-300 text-sm">Desconto em %</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  step="0.5"
                  min="0"
                  max="100"
                  placeholder="0"
                  value={descontoPercent || ""}
                  onChange={(e) => updateField("descontoPercent", parseFloat(e.target.value) || 0)}
                  className="bg-slate-700/50 border-slate-600 text-white h-12 text-lg text-center font-bold"
                />
                <span className="text-slate-400 text-2xl font-bold">%</span>
              </div>
              {/* Quick percentage buttons */}
              <div className="flex gap-2 flex-wrap">
                {[5, 10, 15, 20, 25, 30].map((p) => (
                  <Button
                    key={p}
                    variant="outline"
                    size="sm"
                    onClick={() => updateField("descontoPercent", p)}
                    className={`border-slate-600 text-slate-300 hover:bg-slate-700 ${descontoPercent === p ? 'bg-amber-500/20 border-amber-500/50 text-amber-400' : ''}`}
                  >
                    {p}%
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label className="text-slate-300 text-sm">Desconto em R$</Label>
              <Input
                type="text"
                placeholder="R$ 0,00"
                value={descontoValor ? formatCurrency(descontoValor) : ""}
                onChange={(e) => {
                  const val = parseCurrencyInput(e.target.value);
                  updateField("descontoValor", val);
                }}
                className="bg-slate-700/50 border-slate-600 text-white h-12 text-lg text-center font-bold"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resumo do Cálculo Card */}
      {valorOriginalNumerico > 0 && (
        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
          <CardHeader className="pb-2 px-3 pt-3">
            <CardTitle className="text-sm text-white flex items-center gap-2">
              <Receipt className="w-4 h-4 text-cyan-400" />
              Resumo do Cálculo
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3 space-y-3">
            {/* Valor Bruto */}
            <div className="flex justify-between items-center py-2 border-b border-slate-700">
              <span className="text-slate-300 font-medium">Valor Bruto</span>
              <span className="text-white font-bold text-lg">{formatCurrency(valorOriginalNumerico)}</span>
            </div>
            
            {/* Impostos */}
            {(storedIssqn > 0 || storedInss > 0 || storedSimples > 0 || storedAntecipacao > 0) && (
              <div className="space-y-1">
                <div className="text-xs text-slate-400 uppercase tracking-wide">Fiscal e financeiro</div>
                {storedIssqn > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-amber-400">ISS retido ({(issPct * 100).toFixed(2)}%)</span>
                    <span className="text-red-400">{formatCurrency(storedIssqn)}</span>
                  </div>
                )}
                {storedInss > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-amber-400">INSS retido ({(inssPct * 100).toFixed(2)}%)</span>
                    <span className="text-red-400">{formatCurrency(storedInss)}</span>
                  </div>
                )}
                {storedSimples > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-red-400">(-) Simples/DAS total ({(dasPct * 100).toFixed(2)}%)</span>
                    <span className="text-red-400">{formatCurrency(storedSimples)}</span>
                  </div>
                )}
                {storedAntecipacao > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-red-400">(-) Antecipação</span>
                    <span className="text-red-400">{formatCurrency(storedAntecipacao)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-sm pt-1 border-t border-slate-700/50">
                  <span className="text-slate-400">DAS + antecipação</span>
                  <span className="text-red-400 font-medium">{formatCurrency(totalImpostos)}</span>
                </div>
              </div>
            )}

            {/* Valor Líquido após impostos */}
            <div className="flex justify-between items-center py-2 border-b border-slate-700 bg-cyan-500/10 px-2 rounded">
              <span className="text-cyan-300 font-medium">Líquido (após impostos)</span>
              <span className="text-cyan-300 font-bold">{formatCurrency(valorLiquido)}</span>
            </div>

            {/* Custos */}
            {(storedMaoDeObra > 0 || storedMaterial > 0 || storedViagens > 0 || storedTransporte > 0 || 
              storedEstadia > 0 || storedAlmoco > 0 || storedJanta > 0 || storedCafe > 0) && (
              <div className="space-y-1">
                <div className="text-xs text-slate-400 uppercase tracking-wide">Custos Deduzidos</div>
                {storedMaoDeObra > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-amber-400">(-) Mão de Obra</span>
                    <span className="text-amber-400">{formatCurrency(storedMaoDeObra)}</span>
                  </div>
                )}
                {storedMaterial > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-amber-400">(-) Material</span>
                    <span className="text-amber-400">{formatCurrency(storedMaterial)}</span>
                  </div>
                )}
                {storedViagens > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-amber-400">(-) Horas Viajadas</span>
                    <span className="text-amber-400">{formatCurrency(storedViagens)}</span>
                  </div>
                )}
                {storedTransporte > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-amber-400">(-) Transporte</span>
                    <span className="text-amber-400">{formatCurrency(storedTransporte)}</span>
                  </div>
                )}
                {storedEstadia > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-amber-400">(-) Estadia</span>
                    <span className="text-amber-400">{formatCurrency(storedEstadia)}</span>
                  </div>
                )}
                {storedAlmoco > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-amber-400">(-) Almoço</span>
                    <span className="text-amber-400">{formatCurrency(storedAlmoco)}</span>
                  </div>
                )}
                {storedJanta > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-amber-400">(-) Janta</span>
                    <span className="text-amber-400">{formatCurrency(storedJanta)}</span>
                  </div>
                )}
                {storedCafe > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-amber-400">(-) Café</span>
                    <span className="text-amber-400">{formatCurrency(storedCafe)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-sm pt-1 border-t border-slate-700/50">
                  <span className="text-slate-400">Total Custos</span>
                  <span className="text-amber-400 font-medium">{formatCurrency(totalCustos)}</span>
                </div>
              </div>
            )}

            {/* Lucro Original */}
            <div className="flex justify-between items-center py-2 border-t border-slate-700 bg-emerald-500/10 px-2 rounded">
              <span className="text-emerald-300 font-medium">Lucro Original</span>
              <span className="text-emerald-300 font-bold">{formatCurrency(valorLiquido - totalCustos)}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results Card */}
      {valorOriginalNumerico > 0 && (
        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
          <CardHeader className="pb-2 px-3 pt-3">
            <CardTitle className="text-sm text-white flex items-center gap-2">
              <Calculator className="w-4 h-4 text-purple-400" />
              Análise da Negociação
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="space-y-3">
              {/* Original Values */}
              <div className="p-3 rounded bg-slate-700/30 space-y-2">
                <div className="text-xs text-slate-400 uppercase font-medium">Valores da Nota Reversa</div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Valor Bruto</span>
                  <span className="text-white font-medium">{formatCurrency(valorOriginalNumerico)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">(-) Impostos</span>
                  <span className="text-red-400">- {formatCurrency(totalImpostos)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Resultado econômico antes dos custos</span>
                  <span className="text-cyan-400">{formatCurrency(valorLiquido)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">(-) Custos Deduzidos</span>
                  <span className="text-orange-400">- {formatCurrency(totalCustos)}</span>
                </div>
                <div className="flex justify-between text-sm border-t border-slate-600 pt-2">
                  <span className="text-slate-300">Lucro Original</span>
                  <span className="text-emerald-400 font-medium">{formatCurrency(lucroOriginal)}</span>
                </div>

              </div>

              {/* With Discount */}
              {descontoAplicado > 0 && (
                <div className="p-3 rounded bg-slate-700/30 space-y-2">
                  <div className="text-xs text-slate-400 uppercase font-medium">Com Desconto</div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Valor Bruto Original</span>
                    <span className="text-white">{formatCurrency(valorOriginalNumerico)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">(-) Desconto ({percentDescontoReal.toFixed(1)}%)</span>
                    <span className="text-red-400">- {formatCurrency(descontoAplicado)}</span>
                  </div>
                  <div className="flex justify-between text-sm border-t border-slate-600 pt-2">
                    <span className="text-slate-300 font-medium">Novo Valor Bruto</span>
                    <span className="text-white font-bold">{formatCurrency(valorFinal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">(-) Novos Impostos</span>
                    <span className="text-red-400">- {formatCurrency(novoTotalImpostos)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Novo resultado antes dos custos</span>
                    <span className="text-cyan-400">{formatCurrency(valorLiquidoComDesconto)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">(-) Custos Deduzidos</span>
                    <span className="text-orange-400">- {formatCurrency(totalCustos)}</span>
                  </div>
                  <div className="flex justify-between text-sm border-t border-slate-600 pt-2">
                    <span className="text-slate-300 font-medium">Lucro Final</span>
                    <span className={`font-bold ${isLucroPositivo ? 'text-green-400' : 'text-red-400'}`}>
                      {formatCurrency(lucroComDesconto)}
                    </span>
                  </div>
                </div>
              )}

              {/* Status Alert */}
              {descontoAplicado > 0 && (
                <div className={`p-3 rounded flex items-start gap-3 ${
                  !isLucroPositivo 
                    ? 'bg-red-500/10 border border-red-500/30' 
                    : 'bg-green-500/10 border border-green-500/30'
                }`}>
                  {!isLucroPositivo ? (
                    <>
                      <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                      <div>
                        <div className="text-red-400 font-medium text-sm">Prejuízo!</div>
                        <div className="text-red-400/80 text-xs">Este desconto resulta em prejuízo de {formatCurrency(Math.abs(lucroComDesconto))}</div>
                      </div>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
                      <div>
                        <div className="text-green-400 font-medium text-sm">Lucro Positivo</div>
                        <div className="text-green-400/80 text-xs">Desconto aplicado mantém lucro de {formatCurrency(lucroComDesconto)}</div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Comparison */}
              {descontoAplicado > 0 && lucroOriginal > 0 && (
                <div className="p-3 rounded bg-purple-500/10 border border-purple-500/20">
                  <div className="text-xs text-purple-400/80 uppercase font-medium mb-2">Impacto do Desconto</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center">
                      <div className="text-xs text-slate-400">Perda de Lucro</div>
                      <div className="text-lg font-bold text-red-400">
                        {formatCurrency(lucroOriginal - lucroComDesconto)}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-slate-400">% do Lucro Perdido</div>
                      <div className="text-lg font-bold text-red-400">
                        {((1 - lucroComDesconto / lucroOriginal) * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
