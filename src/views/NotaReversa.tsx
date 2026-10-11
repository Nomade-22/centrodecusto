'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Receipt,
  Calculator,
  TrendingDown,
  DollarSign,
  Percent,
  Home,
  Coffee,
  Sun,
  Moon,
  Fuel,
  Clock,
  HardHat,
  Package,
  ArrowDownToLine,
  Car,
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTotals } from '@/context/TotalsContext';
import { usePriceTable } from '@/hooks/usePriceTable';
import { LaborItem } from './MaoDeObra';
import { useEffect } from 'react';

export interface NotaReversaState {
  valorBruto: string;
  valorBrutoNumerico: number;
  incluirIssqn: boolean;
  incluirInss: boolean;
  incluirSimples: boolean;
  incluirAntecipacao: boolean;
  antecipacaoPercent: number;
  incluirMaoDeObra: boolean;
  incluirMaterial: boolean;
  incluirViagens: boolean;
  incluirTransporte: boolean;
  incluirEstadia: boolean;
  incluirAlmoco: boolean;
  incluirJanta: boolean;
  incluirCafe: boolean;
}

export const createDefaultNotaReversaState = (): NotaReversaState => ({
  valorBruto: '',
  valorBrutoNumerico: 0,
  incluirIssqn: true,
  incluirInss: true,
  incluirSimples: true,
  incluirAntecipacao: false,
  antecipacaoPercent: 0,
  incluirMaoDeObra: false,
  incluirMaterial: false,
  incluirViagens: false,
  incluirTransporte: false,
  incluirEstadia: false,
  incluirAlmoco: false,
  incluirJanta: false,
  incluirCafe: false,
});

interface NotaReversaPageProps {
  state: NotaReversaState;
  setState: React.Dispatch<React.SetStateAction<NotaReversaState>>;
  laborItems?: LaborItem[];
}

const formatCurrency = (value: number): string => {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const parseCurrencyInput = (value: string): number => {
  const cleaned = value.replace(/\D/g, '');
  return parseFloat(cleaned) / 100 || 0;
};

const formatInputAsCurrency = (value: string): string => {
  const numValue = parseCurrencyInput(value);
  if (numValue === 0) return '';
  return numValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

export default function NotaReversaPage({
  state,
  setState,
  laborItems = [],
}: NotaReversaPageProps) {
  const { totals, updateTotal } = useTotals();
  const { workers, getCustoHora, getHourMultiplier, hhSettings } = usePriceTable();

  const {
    valorBruto,
    valorBrutoNumerico,
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
  } = state;

  // Calculate grand total from all budget items
  const alimentacaoTotal = totals.almoco + totals.janta + totals.cafe;
  const grandTotalOrcamento =
    totals.maoDeObra +
    totals.material +
    totals.estadia +
    totals.transporte +
    alimentacaoTotal +
    totals.viagens;

  // Raw values without BDI (for deduction)
  const materialSemBDI = totals.materialSemBDI || 0;
  const viagensSemBDI = totals.viagensSemBDI || 0;
  const transporteSemBDI = totals.transporteSemBDI || 0;
  const estadiaSemBDI = totals.estadiaSemBDI || 0;
  const almocoSemBDI = totals.almocoSemBDI || 0;
  const jantaSemBDI = totals.jantaSemBDI || 0;
  const cafeSemBDI = totals.cafeSemBDI || 0;

  // Calculate cost per worker type from laborItems using custo_hora from CustosHH
  const custosPorFuncao = workers
    .map((worker) => {
      const workerItems = laborItems.filter((item) => item.workerTypeId === worker.worker_id);
      const totalCusto = workerItems.reduce((sum, item) => {
        const custoHora = getCustoHora(item.workerTypeId) ?? 0;
        const multiplier = getHourMultiplier(item.hourTypeId);
        return sum + custoHora * multiplier * item.hours * item.people * item.days;
      }, 0);
      const totalQty = workerItems.reduce(
        (sum, item) => sum + item.hours * item.people * item.days,
        0
      );
      return { worker, totalCusto, totalQty, count: workerItems.length };
    })
    .filter((t) => t.count > 0 && t.totalCusto > 0);

  const totalCustoMaoDeObra = custosPorFuncao.reduce((sum, c) => sum + c.totalCusto, 0);

  // Function to pull grand total as valor bruto
  const handlePuxarTotal = () => {
    const formatted = grandTotalOrcamento.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
    setState((prev) => ({
      ...prev,
      valorBruto: formatted,
      valorBrutoNumerico: grandTotalOrcamento,
    }));
  };

  const updateField = <K extends keyof NotaReversaState>(field: K, value: NotaReversaState[K]) => {
    setState((prev) => ({ ...prev, [field]: value }));
  };

  // Handle currency input
  const handleValorBrutoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const formatted = formatInputAsCurrency(raw);
    setState((prev) => ({
      ...prev,
      valorBruto: formatted,
      valorBrutoNumerico: parseCurrencyInput(raw),
    }));
  };

  // Fiscal/cash-flow rules shared with Calculadora HH.
  // ISS retained composes the Simples burden; it is not added on top of DAS.
  // INSS retained affects cash flow but is compensable, so it is not a new
  // permanent economic cost here.
  const issPct = Number(hhSettings?.default_iss_retained_pct ?? 4.36) / 100;
  const inssPct = Number(hhSettings?.default_inss_retained_pct ?? 0) / 100;
  const dasPct = Number(hhSettings?.das_effective_pct ?? 10.81) / 100;
  const issqn = incluirIssqn ? valorBrutoNumerico * issPct : 0;
  const inss = incluirInss ? valorBrutoNumerico * inssPct : 0;
  const simples = incluirSimples ? valorBrutoNumerico * dasPct : 0; // carga total econômica do Simples
  const dasRecolher = incluirSimples
    ? valorBrutoNumerico * Math.max(0, dasPct - (incluirIssqn ? issPct : 0))
    : 0;
  const impostos = issqn + inss + dasRecolher; // saída/ retenção de caixa
  const liquidoSemAntecipacao = valorBrutoNumerico - issqn - inss;
  const antecipacao = incluirAntecipacao
    ? liquidoSemAntecipacao * (antecipacaoPercent / 100)
    : 0;
  const liquidoAposAntecipacao = liquidoSemAntecipacao - antecipacao;

  // Calculate expense deductions (using raw values without BDI)
  const despMaoDeObra = incluirMaoDeObra ? totalCustoMaoDeObra : 0;
  const despMaterial = incluirMaterial ? materialSemBDI : 0;
  const despViagens = incluirViagens ? viagensSemBDI : 0;
  const despTransporte = incluirTransporte ? transporteSemBDI : 0;
  const despEstadia = incluirEstadia ? estadiaSemBDI : 0;
  const despAlmoco = incluirAlmoco ? almocoSemBDI : 0;
  const despJanta = incluirJanta ? jantaSemBDI : 0;
  const despCafe = incluirCafe ? cafeSemBDI : 0;
  const totalDespesas =
    despMaoDeObra +
    despMaterial +
    despViagens +
    despTransporte +
    despEstadia +
    despAlmoco +
    despJanta +
    despCafe;

  const valorLiquidoFinal = valorBrutoNumerico - simples - antecipacao - totalDespesas;

  const percentualDescontos =
    valorBrutoNumerico > 0
      ? ((valorBrutoNumerico - valorLiquidoFinal) / valorBrutoNumerico) * 100
      : 0;

  // Calculate lucro percentage
  const lucroPercent = valorBrutoNumerico > 0 ? (valorLiquidoFinal / valorBrutoNumerico) * 100 : 0;

  // Sync lucro to context
  useEffect(() => {
    updateTotal('lucro', valorLiquidoFinal);
    updateTotal('lucroPercent', lucroPercent);
  }, [valorLiquidoFinal, lucroPercent, updateTotal]);

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
        <Card className="bg-blue-500/10 border-blue-500/20">
          <CardContent className="p-2 text-center">
            <Receipt className="w-3 h-3 text-blue-400 mx-auto mb-1" />
            <div className="text-xs text-blue-400/80">Valor Bruto</div>
            <div className="text-sm font-bold text-white">{formatCurrency(valorBrutoNumerico)}</div>
          </CardContent>
        </Card>
        <Card className="bg-red-500/10 border-red-500/20">
          <CardContent className="p-2 text-center">
            <TrendingDown className="w-3 h-3 text-red-400 mx-auto mb-1" />
            <div className="text-xs text-red-400/80">Saídas fiscais/fin.</div>
            <div className="text-sm font-bold text-white">
              {formatCurrency(impostos + antecipacao)}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-orange-500/10 border-orange-500/20">
          <CardContent className="p-2 text-center">
            <Car className="w-3 h-3 text-orange-400 mx-auto mb-1" />
            <div className="text-xs text-orange-400/80">Custos</div>
            <div className="text-sm font-bold text-white">{formatCurrency(totalDespesas)}</div>
          </CardContent>
        </Card>
        <Card className="bg-amber-500/10 border-amber-500/20">
          <CardContent className="p-2 text-center">
            <Percent className="w-3 h-3 text-amber-400 mx-auto mb-1" />
            <div className="text-xs text-amber-400/80">% Descontos</div>
            <div className="text-sm font-bold text-white">{percentualDescontos.toFixed(1)}%</div>
          </CardContent>
        </Card>
        <Card className="bg-emerald-500/10 border-emerald-500/20 col-span-2 sm:col-span-1">
          <CardContent className="p-2 text-center">
            <DollarSign className="w-3 h-3 text-emerald-400 mx-auto mb-1" />
            <div className="text-xs text-emerald-400/80">Resultado Econômico</div>
            <div className="text-sm font-bold text-emerald-400">
              {formatCurrency(valorLiquidoFinal)}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-green-500/10 border-green-500/20 col-span-2 sm:col-span-1">
          <CardContent className="p-2 text-center">
            <TrendingUp className="w-3 h-3 text-green-400 mx-auto mb-1" />
            <div className="text-xs text-green-400/80">Lucro</div>
            <div className="text-sm font-bold text-green-400">{lucroPercent.toFixed(1)}%</div>
            <div className="text-xs text-green-400/60">{formatCurrency(valorLiquidoFinal)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Input Card */}
      <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
        <CardHeader className="pb-2 px-3 pt-3">
          <CardTitle className="text-sm text-white flex items-center gap-2">
            <Receipt className="w-4 h-4 text-blue-400" />
            Valor da Nota
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3 space-y-3">
          <Input
            type="text"
            placeholder="R$ 0,00"
            value={valorBruto}
            onChange={handleValorBrutoChange}
            className="bg-slate-700/50 border-slate-600 text-white text-lg h-12 text-center font-bold"
          />
          {grandTotalOrcamento > 0 && (
            <Button
              onClick={handlePuxarTotal}
              variant="outline"
              className="w-full bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-300"
            >
              <ArrowDownToLine className="w-4 h-4 mr-2" />
              Puxar Total do Orçamento ({formatCurrency(grandTotalOrcamento)})
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Tax Options */}
      <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
        <CardHeader className="pb-2 px-3 pt-3">
          <CardTitle className="text-sm text-white flex items-center gap-2">
            <Calculator className="w-4 h-4 text-purple-400" />
            Impostos e Descontos
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3 space-y-3">
          {/* ISSQN */}
          <div className="flex items-center justify-between p-2 rounded bg-slate-700/30">
            <div className="flex items-center gap-2">
              <Switch
                checked={incluirIssqn}
                onCheckedChange={(v) => updateField('incluirIssqn', v)}
              />
              <div>
                <span className="text-white text-sm">ISSQN retido</span>
                <Badge className="ml-2 bg-slate-600 text-xs">{(issPct * 100).toFixed(2)}%</Badge>
              </div>
            </div>
            {incluirIssqn && valorBrutoNumerico > 0 && (
              <span className="text-red-400 text-sm font-medium">- {formatCurrency(issqn)}</span>
            )}
          </div>

          {/* INSS */}
          <div className="flex items-center justify-between p-2 rounded bg-slate-700/30">
            <div className="flex items-center gap-2">
              <Switch
                checked={incluirInss}
                onCheckedChange={(v) => updateField('incluirInss', v)}
              />
              <div>
                <span className="text-white text-sm">INSS retido</span>
                <Badge className="ml-2 bg-slate-600 text-xs">{(inssPct * 100).toFixed(2)}%</Badge>
              </div>
            </div>
            {incluirInss && valorBrutoNumerico > 0 && (
              <span className="text-red-400 text-sm font-medium">- {formatCurrency(inss)}</span>
            )}
          </div>

          {/* Simples Nacional */}
          <div className="flex items-center justify-between p-2 rounded bg-slate-700/30">
            <div className="flex items-center gap-2">
              <Switch
                checked={incluirSimples}
                onCheckedChange={(v) => updateField('incluirSimples', v)}
              />
              <div>
                <span className="text-white text-sm">Simples Nacional (DAS total)</span>
                <Badge className="ml-2 bg-slate-600 text-xs">{(dasPct * 100).toFixed(2)}%</Badge>
              </div>
            </div>
            {incluirSimples && valorBrutoNumerico > 0 && (
              <span className="text-red-400 text-sm font-medium">- {formatCurrency(simples)}</span>
            )}
          </div>

          {/* Antecipação */}
          <div className="p-2 rounded bg-slate-700/30 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch
                  checked={incluirAntecipacao}
                  onCheckedChange={(v) => updateField('incluirAntecipacao', v)}
                />
                <span className="text-white text-sm">Antecipação</span>
              </div>
              {incluirAntecipacao && valorBrutoNumerico > 0 && (
                <span className="text-red-400 text-sm font-medium">
                  - {formatCurrency(antecipacao)}
                </span>
              )}
            </div>
            {incluirAntecipacao && (
              <div className="flex items-center gap-2 pl-8">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  placeholder="0"
                  value={antecipacaoPercent || ''}
                  onChange={(e) =>
                    updateField('antecipacaoPercent', parseFloat(e.target.value) || 0)
                  }
                  className="bg-slate-700/50 border-slate-600 text-white h-8 w-24 text-sm"
                />
                <span className="text-slate-400 text-sm">%</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Expense Deductions */}
      <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
        <CardHeader className="pb-2 px-3 pt-3">
          <CardTitle className="text-sm text-white flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-orange-400" />
            Deduzir Custos
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3 space-y-3">
          {/* Mão de Obra */}
          <div className="flex items-center justify-between p-2 rounded bg-slate-700/30">
            <div className="flex items-center gap-2">
              <Switch
                checked={incluirMaoDeObra}
                onCheckedChange={(v) => updateField('incluirMaoDeObra', v)}
                disabled={totalCustoMaoDeObra === 0}
              />
              <div className="flex items-center gap-2">
                <HardHat className="w-4 h-4 text-orange-400" />
                <span className="text-white text-sm">Mão de Obra</span>
              </div>
            </div>
            <span
              className={`text-sm font-medium ${totalCustoMaoDeObra > 0 ? (incluirMaoDeObra ? 'text-orange-400' : 'text-slate-400') : 'text-slate-500'}`}
            >
              {totalCustoMaoDeObra > 0
                ? (incluirMaoDeObra ? '- ' : '') + formatCurrency(totalCustoMaoDeObra)
                : 'R$ 0,00'}
            </span>
          </div>

          {/* Material */}
          <div className="flex items-center justify-between p-2 rounded bg-slate-700/30">
            <div className="flex items-center gap-2">
              <Switch
                checked={incluirMaterial}
                onCheckedChange={(v) => updateField('incluirMaterial', v)}
                disabled={materialSemBDI === 0}
              />
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-blue-400" />
                <span className="text-white text-sm">Material</span>
              </div>
            </div>
            <span
              className={`text-sm font-medium ${materialSemBDI > 0 ? (incluirMaterial ? 'text-orange-400' : 'text-slate-400') : 'text-slate-500'}`}
            >
              {materialSemBDI > 0
                ? (incluirMaterial ? '- ' : '') + formatCurrency(materialSemBDI)
                : 'R$ 0,00'}
            </span>
          </div>

          {/* Horas Viajadas */}
          <div className="flex items-center justify-between p-2 rounded bg-slate-700/30">
            <div className="flex items-center gap-2">
              <Switch
                checked={incluirViagens}
                onCheckedChange={(v) => updateField('incluirViagens', v)}
                disabled={viagensSemBDI === 0}
              />
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-rose-400" />
                <span className="text-white text-sm">Horas Viajadas</span>
              </div>
            </div>
            <span
              className={`text-sm font-medium ${viagensSemBDI > 0 ? (incluirViagens ? 'text-orange-400' : 'text-slate-400') : 'text-slate-500'}`}
            >
              {viagensSemBDI > 0
                ? (incluirViagens ? '- ' : '') + formatCurrency(viagensSemBDI)
                : 'R$ 0,00'}
            </span>
          </div>

          {/* Transporte */}
          <div className="flex items-center justify-between p-2 rounded bg-slate-700/30">
            <div className="flex items-center gap-2">
              <Switch
                checked={incluirTransporte}
                onCheckedChange={(v) => updateField('incluirTransporte', v)}
                disabled={transporteSemBDI === 0}
              />
              <div className="flex items-center gap-2">
                <Fuel className="w-4 h-4 text-cyan-400" />
                <span className="text-white text-sm">Transporte</span>
              </div>
            </div>
            <span
              className={`text-sm font-medium ${transporteSemBDI > 0 ? (incluirTransporte ? 'text-orange-400' : 'text-slate-400') : 'text-slate-500'}`}
            >
              {transporteSemBDI > 0
                ? (incluirTransporte ? '- ' : '') + formatCurrency(transporteSemBDI)
                : 'R$ 0,00'}
            </span>
          </div>

          {/* Estadia */}
          <div className="flex items-center justify-between p-2 rounded bg-slate-700/30">
            <div className="flex items-center gap-2">
              <Switch
                checked={incluirEstadia}
                onCheckedChange={(v) => updateField('incluirEstadia', v)}
                disabled={estadiaSemBDI === 0}
              />
              <div className="flex items-center gap-2">
                <Home className="w-4 h-4 text-purple-400" />
                <span className="text-white text-sm">Estadia</span>
              </div>
            </div>
            <span
              className={`text-sm font-medium ${estadiaSemBDI > 0 ? (incluirEstadia ? 'text-orange-400' : 'text-slate-400') : 'text-slate-500'}`}
            >
              {estadiaSemBDI > 0
                ? (incluirEstadia ? '- ' : '') + formatCurrency(estadiaSemBDI)
                : 'R$ 0,00'}
            </span>
          </div>

          {/* Almoço */}
          <div className="flex items-center justify-between p-2 rounded bg-slate-700/30">
            <div className="flex items-center gap-2">
              <Switch
                checked={incluirAlmoco}
                onCheckedChange={(v) => updateField('incluirAlmoco', v)}
                disabled={almocoSemBDI === 0}
              />
              <div className="flex items-center gap-2">
                <Sun className="w-4 h-4 text-amber-400" />
                <span className="text-white text-sm">Almoço</span>
              </div>
            </div>
            <span
              className={`text-sm font-medium ${almocoSemBDI > 0 ? (incluirAlmoco ? 'text-orange-400' : 'text-slate-400') : 'text-slate-500'}`}
            >
              {almocoSemBDI > 0
                ? (incluirAlmoco ? '- ' : '') + formatCurrency(almocoSemBDI)
                : 'R$ 0,00'}
            </span>
          </div>

          {/* Janta */}
          <div className="flex items-center justify-between p-2 rounded bg-slate-700/30">
            <div className="flex items-center gap-2">
              <Switch
                checked={incluirJanta}
                onCheckedChange={(v) => updateField('incluirJanta', v)}
                disabled={jantaSemBDI === 0}
              />
              <div className="flex items-center gap-2">
                <Moon className="w-4 h-4 text-indigo-400" />
                <span className="text-white text-sm">Janta</span>
              </div>
            </div>
            <span
              className={`text-sm font-medium ${jantaSemBDI > 0 ? (incluirJanta ? 'text-orange-400' : 'text-slate-400') : 'text-slate-500'}`}
            >
              {jantaSemBDI > 0
                ? (incluirJanta ? '- ' : '') + formatCurrency(jantaSemBDI)
                : 'R$ 0,00'}
            </span>
          </div>

          {/* Café */}
          <div className="flex items-center justify-between p-2 rounded bg-slate-700/30">
            <div className="flex items-center gap-2">
              <Switch
                checked={incluirCafe}
                onCheckedChange={(v) => updateField('incluirCafe', v)}
                disabled={cafeSemBDI === 0}
              />
              <div className="flex items-center gap-2">
                <Coffee className="w-4 h-4 text-orange-400" />
                <span className="text-white text-sm">Café</span>
              </div>
            </div>
            <span
              className={`text-sm font-medium ${cafeSemBDI > 0 ? (incluirCafe ? 'text-orange-400' : 'text-slate-400') : 'text-slate-500'}`}
            >
              {cafeSemBDI > 0 ? (incluirCafe ? '- ' : '') + formatCurrency(cafeSemBDI) : 'R$ 0,00'}
            </span>
          </div>

          {totalDespesas > 0 && (
            <div className="border-t border-slate-600 pt-2 flex justify-between">
              <span className="text-slate-300 text-sm font-medium">Total Custos</span>
              <span className="text-orange-400 font-bold">- {formatCurrency(totalDespesas)}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results Breakdown */}
      {valorBrutoNumerico > 0 && (
        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
          <CardHeader className="pb-2 px-3 pt-3">
            <CardTitle className="text-sm text-white flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              Resumo do Cálculo
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Valor Bruto</span>
                <span className="text-white font-medium">{formatCurrency(valorBrutoNumerico)}</span>
              </div>

              {incluirIssqn && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">(-) ISS retido ({(issPct * 100).toFixed(2)}%)</span>
                  <span className="text-red-400">- {formatCurrency(issqn)}</span>
                </div>
              )}

              {incluirInss && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">(-) INSS retido ({(inssPct * 100).toFixed(2)}%, compensável)</span>
                  <span className="text-red-400">- {formatCurrency(inss)}</span>
                </div>
              )}

              {incluirSimples && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">(-) Simples total ({(dasPct * 100).toFixed(2)}%)</span>
                    <span className="text-red-400">- {formatCurrency(simples)}</span>
                  </div>
                  {incluirIssqn && (
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">DAS a recolher após ISS retido</span>
                      <span className="text-slate-400">{formatCurrency(dasRecolher)}</span>
                    </div>
                  )}
                </>
              )}

              <div className="border-t border-slate-700 pt-2 flex justify-between text-sm">
                <span className="text-slate-400">Recebível após retenções</span>
                <span className="text-white font-medium">
                  {formatCurrency(liquidoSemAntecipacao)}
                </span>
              </div>

              {incluirAntecipacao && antecipacaoPercent > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">(-) Antecipação ({antecipacaoPercent}%)</span>
                  <span className="text-red-400">- {formatCurrency(antecipacao)}</span>
                </div>
              )}

              {totalDespesas > 0 && (
                <>
                  <div className="border-t border-slate-700 pt-2 flex justify-between text-sm">
                    <span className="text-slate-400">Caixa após retenções/antecipação</span>
                    <span className="text-white font-medium">
                      {formatCurrency(liquidoAposAntecipacao)}
                    </span>
                  </div>

                  {incluirMaoDeObra && despMaoDeObra > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">(-) Mão de Obra</span>
                      <span className="text-orange-400">- {formatCurrency(despMaoDeObra)}</span>
                    </div>
                  )}
                  {incluirMaterial && despMaterial > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">(-) Material</span>
                      <span className="text-orange-400">- {formatCurrency(despMaterial)}</span>
                    </div>
                  )}
                  {incluirViagens && despViagens > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">(-) Horas Viajadas</span>
                      <span className="text-orange-400">- {formatCurrency(despViagens)}</span>
                    </div>
                  )}
                  {incluirTransporte && despTransporte > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">(-) Transporte</span>
                      <span className="text-orange-400">- {formatCurrency(despTransporte)}</span>
                    </div>
                  )}
                  {incluirEstadia && despEstadia > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">(-) Estadia</span>
                      <span className="text-orange-400">- {formatCurrency(despEstadia)}</span>
                    </div>
                  )}
                  {incluirAlmoco && despAlmoco > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">(-) Almoço</span>
                      <span className="text-orange-400">- {formatCurrency(despAlmoco)}</span>
                    </div>
                  )}
                  {incluirJanta && despJanta > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">(-) Janta</span>
                      <span className="text-orange-400">- {formatCurrency(despJanta)}</span>
                    </div>
                  )}
                  {incluirCafe && despCafe > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">(-) Café</span>
                      <span className="text-orange-400">- {formatCurrency(despCafe)}</span>
                    </div>
                  )}
                </>
              )}

              <div className="border-t border-slate-700 pt-2 flex justify-between">
                <span className="text-white font-medium">Resultado Econômico</span>
                <span className="text-emerald-400 font-bold text-lg">
                  {formatCurrency(valorLiquidoFinal)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
