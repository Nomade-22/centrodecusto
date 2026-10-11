"use client";

import { useTotals } from "@/context/TotalsContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Home, 
  Coffee, 
  Sun, 
  Moon, 
  HardHat, 
  Package, 
  Receipt,
  TrendingUp,
  Calculator,
  Clock,
  Fuel,
  Briefcase,
  Sparkles
} from "lucide-react";

const formatCurrency = (value: number): string => {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};

interface SummaryItem {
  key: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
}

export default function DashboardPage() {
  const { totals } = useTotals();

  // Calculate alimentação subtotal
  const alimentacaoTotal = totals.almoco + totals.janta + totals.cafe;
  
  // Calculate despesas de viagem (estadia + transporte + alimentação + horas viajadas)
  const despesasViagemTotal = totals.estadia + totals.transporte + alimentacaoTotal + totals.viagens;
  
  // Calculate grand total
  const grandTotal = totals.maoDeObra + totals.material + totals.estadia + totals.transporte + alimentacaoTotal + totals.viagens;

  const summaryItems: SummaryItem[] = [
    {
      key: "maoDeObra",
      label: "Mão de Obra",
      icon: <HardHat className="w-5 h-5" />,
      color: "text-orange-400",
      bgColor: "bg-orange-500/10",
      borderColor: "border-orange-500/20",
    },
    {
      key: "material",
      label: "Material",
      icon: <Package className="w-5 h-5" />,
      color: "text-blue-400",
      bgColor: "bg-blue-500/10",
      borderColor: "border-blue-500/20",
    },
    {
      key: "despesasViagem",
      label: "Despesas de Viagem",
      icon: <Briefcase className="w-5 h-5" />,
      color: "text-pink-400",
      bgColor: "bg-pink-500/10",
      borderColor: "border-pink-500/20",
    },
    {
      key: "estadia",
      label: "Estadia",
      icon: <Home className="w-5 h-5" />,
      color: "text-purple-400",
      bgColor: "bg-purple-500/10",
      borderColor: "border-purple-500/20",
    },
    {
      key: "transporte",
      label: "Transporte",
      icon: <Fuel className="w-5 h-5" />,
      color: "text-cyan-400",
      bgColor: "bg-cyan-500/10",
      borderColor: "border-cyan-500/20",
    },
    {
      key: "alimentacao",
      label: "Alimentação",
      icon: <Coffee className="w-5 h-5" />,
      color: "text-amber-400",
      bgColor: "bg-amber-500/10",
      borderColor: "border-amber-500/20",
    },
    {
      key: "viagens",
      label: "Horas Viajadas",
      icon: <Clock className="w-5 h-5" />,
      color: "text-rose-400",
      bgColor: "bg-rose-500/10",
      borderColor: "border-rose-500/20",
    },
  ];

  const getValue = (key: string): number => {
    if (key === "alimentacao") return alimentacaoTotal;
    if (key === "despesasViagem") return despesasViagemTotal;
    return totals[key as keyof typeof totals] || 0;
  };

  const getPercentage = (value: number): number => {
    if (grandTotal === 0) return 0;
    return (value / grandTotal) * 100;
  };

  return (
    <div className="space-y-4">
      {/* Grand Total KPI */}
      <Card className="bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border-emerald-500/30">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-500/20 rounded-xl">
                <Calculator className="w-6 h-6 sm:w-8 sm:h-8 text-emerald-400" />
              </div>
              <div>
                <p className="text-emerald-400/80 text-sm">Preço Final Total</p>
                <p className="text-2xl sm:text-4xl font-bold text-white">{formatCurrency(grandTotal)}</p>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-emerald-400">
              <TrendingUp className="w-5 h-5" />
              <span className="text-sm">Orçamento Completo</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lucro KPI */}
      <Card className="bg-gradient-to-br from-green-600/20 via-emerald-600/15 to-teal-600/10 border-green-500/30 backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm mb-1">Lucro Final</p>
              <p className="text-2xl sm:text-3xl font-bold text-green-400">{formatCurrency(totals.lucro)}</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-2 text-green-400">
                <Sparkles className="w-5 h-5" />
                <span className="text-2xl font-bold">{totals.lucroPercent.toFixed(1)}%</span>
              </div>
              <span className="text-xs text-green-400/70">do valor bruto</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Category Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {summaryItems.map((item) => {
          const value = getValue(item.key);
          const percentage = getPercentage(value);
          
          return (
            <Card key={item.key} className={`${item.bgColor} ${item.borderColor}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className={`p-2 rounded-lg ${item.bgColor}`}>
                    <span className={item.color}>{item.icon}</span>
                  </div>
                  <span className={`text-xs ${item.color} bg-slate-900/50 px-2 py-1 rounded-full`}>
                    {percentage.toFixed(1)}%
                  </span>
                </div>
                <p className="text-slate-400 text-sm mb-1">{item.label}</p>
                <p className={`text-xl font-bold ${item.color}`}>{formatCurrency(value)}</p>
                
                {/* Progress bar */}
                <div className="mt-3 h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${item.bgColor.replace('/10', '/50')} rounded-full transition-all duration-500`}
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Detailed Breakdown */}
      <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
        <CardHeader className="pb-2 px-4 pt-4">
          <CardTitle className="text-base text-white flex items-center gap-2">
            <Receipt className="w-5 h-5 text-emerald-400" />
            Detalhamento Completo
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="space-y-3">
            {/* Mão de Obra */}
            <div className="flex items-center justify-between py-2 border-b border-slate-700">
              <div className="flex items-center gap-2">
                <HardHat className="w-4 h-4 text-orange-400" />
                <span className="text-slate-300">Mão de Obra</span>
              </div>
              <span className="font-medium text-white">{formatCurrency(totals.maoDeObra)}</span>
            </div>

            {/* Material */}
            <div className="flex items-center justify-between py-2 border-b border-slate-700">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-blue-400" />
                <span className="text-slate-300">Material (NF)</span>
              </div>
              <span className="font-medium text-white">{formatCurrency(totals.material)}</span>
            </div>

            {/* Estadia */}
            <div className="flex items-center justify-between py-2 border-b border-slate-700">
              <div className="flex items-center gap-2">
                <Home className="w-4 h-4 text-purple-400" />
                <span className="text-slate-300">Estadia</span>
              </div>
              <span className="font-medium text-white">{formatCurrency(totals.estadia)}</span>
            </div>

            {/* Alimentação Section */}
            <div className="py-2 border-b border-slate-700">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Coffee className="w-4 h-4 text-amber-400" />
                  <span className="text-slate-300">Alimentação</span>
                </div>
                <span className="font-medium text-amber-400">{formatCurrency(alimentacaoTotal)}</span>
              </div>
              <div className="ml-6 space-y-1 text-sm">
                <div className="flex items-center justify-between text-slate-400">
                  <div className="flex items-center gap-2">
                    <Sun className="w-3 h-3" />
                    <span>Almoço</span>
                  </div>
                  <span>{formatCurrency(totals.almoco)}</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <div className="flex items-center gap-2">
                    <Moon className="w-3 h-3" />
                    <span>Janta</span>
                  </div>
                  <span>{formatCurrency(totals.janta)}</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <div className="flex items-center gap-2">
                    <Coffee className="w-3 h-3" />
                    <span>Café</span>
                  </div>
                  <span>{formatCurrency(totals.cafe)}</span>
                </div>
              </div>
            </div>

            {/* Transporte */}
            <div className="flex items-center justify-between py-2 border-b border-slate-700">
              <div className="flex items-center gap-2">
                <Fuel className="w-4 h-4 text-cyan-400" />
                <span className="text-slate-300">Transporte</span>
              </div>
              <span className="font-medium text-white">{formatCurrency(totals.transporte)}</span>
            </div>

            {/* Horas Viajadas */}
            <div className="flex items-center justify-between py-2 border-b border-slate-700">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-rose-400" />
                <span className="text-slate-300">Horas Viajadas</span>
              </div>
              <span className="font-medium text-white">{formatCurrency(totals.viagens)}</span>
            </div>

            {/* Total */}
            <div className="flex items-center justify-between pt-3 mt-2">
              <div className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-emerald-400" />
                <span className="text-lg font-semibold text-white">TOTAL GERAL</span>
              </div>
              <span className="text-2xl font-bold text-emerald-400">{formatCurrency(grandTotal)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Visual Chart - Simple Bar */}
      <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
        <CardHeader className="pb-2 px-4 pt-4">
          <CardTitle className="text-base text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-400" />
            Distribuição de Custos
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="space-y-3">
            {summaryItems.map((item) => {
              const value = getValue(item.key);
              const percentage = getPercentage(value);
              
              return (
                <div key={item.key} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">{item.label}</span>
                    <span className={item.color}>{percentage.toFixed(1)}%</span>
                  </div>
                  <div className="h-3 bg-slate-700/50 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-700 ease-out ${
                        item.key === "maoDeObra" ? "bg-orange-500" :
                        item.key === "material" ? "bg-blue-500" :
                        item.key === "despesasViagem" ? "bg-pink-500" :
                        item.key === "estadia" ? "bg-purple-500" :
                        item.key === "alimentacao" ? "bg-amber-500" :
                        item.key === "transporte" ? "bg-cyan-500" :
                        "bg-rose-500"
                      }`}
                      style={{ width: `${Math.min(percentage, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
