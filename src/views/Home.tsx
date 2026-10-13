"use client";

import { useState, useCallback, useEffect } from "react";
import { TotalsProvider, useTotals } from "@/context/TotalsContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, MapPin, Clock, Users, DollarSign, Navigation, Loader2, UtensilsCrossed, Calculator, Receipt, HardHat, LogOut, LayoutDashboard, Archive, RotateCcw, Settings, Handshake } from "lucide-react";
import { useAuth } from "@/lib/auth-shim";
import ExpensesPage, { 
  ExpensesState, 
  createDefaultAccommodation, 
  createDefaultTransport, 
  createDefaultMeal 
} from "./Expenses";
import BDIPage, { BDIState, createDefaultBDIState, createDefaultMaterial } from "./BDI";
import NotaReversaPage, { NotaReversaState, createDefaultNotaReversaState } from "./NotaReversa";
import NegociacaoPage, { NegociacaoState, createDefaultNegociacaoState } from "./Negociacao";
import MaoDeObraPage, { LaborItem, createDefaultLaborItem } from "./MaoDeObra";
import DashboardPage from "./Dashboard";
import HistoricoPage from "./Historico";
import TabelaPrecosPage from "./TabelaPrecos";
import CustosHHPage from "./CustosHH";
import UsuariosPage from "./Usuarios";
import { DEFAULT_CLIENTS } from "@/lib/bdi";
import { usePriceTable } from "@/hooks/usePriceTable";

interface TripLeg {
  id: string;
  origin: string;
  destination: string;
  tripType: "one-way" | "round-trip";
  people: number;
  days: number;
  clientId: string;
  workerTypeId: string;
  hourTypeId: string;
  ratePerHour: number | null;
  manualHours: number | null;
  distanceKm: number | null;
  durationMinutes: number | null;
  originAddress: string | null;
  destinationAddress: string | null;
  isLoading: boolean;
  error: string | null;
}

interface RouteResponse {
  origin_address: string;
  destination_address: string;
  distance_km: number;
  distance_text: string;
  duration_minutes: number;
  duration_text: string;
}

const formatDuration = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (hours === 0) return `${mins}min`;
  return `${hours}h ${mins.toString().padStart(2, "0")}min`;
};

const formatCurrency = (value: number): string => {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};

const generateId = () => Math.random().toString(36).substring(2, 9);

function HomePageContent() {
  const { totals: contextTotals, updateTotal } = useTotals();
  const { user, logout } = useAuth() as unknown as { user: { isAdmin?: boolean; email?: string } | null; logout: () => Promise<void> };
  const { activeClients, workers, hourTypes, getRate, getCustoHora, getHourMultiplier } = usePriceTable();
  const [activeTab, setActiveTab] = useState<"viagens" | "despesas" | "bdi" | "nota" | "negociacao" | "maoDeObra" | "dashboard" | "historico" | "tabelaPrecos" | "custosHH" | "usuarios">("maoDeObra");
  const [legs, setLegs] = useState<TripLeg[]>([
    {
      id: generateId(),
      origin: "",
      destination: "",
      tripType: "one-way",
      people: 0,
      days: 0,
      clientId: "jbs",
      workerTypeId: "pedreiro",
      hourTypeId: "normal",
      ratePerHour: null,
      manualHours: null,
      distanceKm: null,
      durationMinutes: null,
      originAddress: null,
      destinationAddress: null,
      isLoading: false,
      error: null,
    },
  ]);

  const [paymentRule, setPaymentRule] = useState<"all" | "max-hours">("all");
  const [maxHours, setMaxHours] = useState<number>(1);

  // Labor items state (lifted from MaoDeObra)
  const [laborItems, setLaborItems] = useState<LaborItem[]>([createDefaultLaborItem()]);
  const [laborTeamSize, setLaborTeamSize] = useState(9);

  // Expenses state (lifted from Expenses)
  const [expensesState, setExpensesState] = useState<ExpensesState>(() => {
    const defaultClientId = DEFAULT_CLIENTS[0]?.id || "";
    return {
      clients: DEFAULT_CLIENTS,
      accommodation: [createDefaultAccommodation(defaultClientId)],
      transport: [createDefaultTransport(defaultClientId)],
      lunches: [createDefaultMeal(defaultClientId)],
      dinners: [createDefaultMeal(defaultClientId)],
      breakfasts: [createDefaultMeal(defaultClientId)],
      teamSize: 9,
    };
  });

  // BDI state (lifted from BDI)
  const [bdiState, setBdiState] = useState<BDIState>(createDefaultBDIState);

  // Nota Reversa state (lifted from NotaReversa)
  const [notaReversaState, setNotaReversaState] = useState<NotaReversaState>(createDefaultNotaReversaState);

  // Negociacao state (lifted from Negociacao)
  const [negociacaoState, setNegociacaoState] = useState<NegociacaoState>(createDefaultNegociacaoState);

  // The HH calculator is the single source of truth for travel-hour rates.
  // Recalculate whenever the shared table changes; legacy loaded trips keep all
  // other snapshot fields, but their current commercial rate comes from HH.
  useEffect(() => {
    if (workers.length === 0 || activeClients.length === 0) return;
    setLegs((prev) =>
      prev.map((leg) => ({
        ...leg,
        ratePerHour:
          getRate(leg.workerTypeId, leg.clientId) * getHourMultiplier(leg.hourTypeId),
      }))
    );
  }, [workers, activeClients, getRate, getHourMultiplier]);

  const addLeg = () => {
    setLegs((prev) => [
      ...prev,
      {
        id: generateId(),
        origin: "",
        destination: "",
        tripType: "one-way",
        people: 0,
        days: 0,
        clientId: "jbs",
        workerTypeId: "pedreiro",
        hourTypeId: "normal",
        ratePerHour: getRate("pedreiro", "jbs") * getHourMultiplier("normal"),
        manualHours: null,
        distanceKm: null,
        durationMinutes: null,
        originAddress: null,
        destinationAddress: null,
        isLoading: false,
        error: null,
      },
    ]);
  };

  const resetLegs = () => {
    setLegs([
      {
        id: generateId(),
        origin: "",
        destination: "",
        tripType: "one-way",
        people: 0,
        days: 0,
        clientId: "jbs",
        workerTypeId: "pedreiro",
        hourTypeId: "normal",
        ratePerHour: getRate("pedreiro", "jbs") * getHourMultiplier("normal"),
        manualHours: null,
        distanceKm: null,
        durationMinutes: null,
        originAddress: null,
        destinationAddress: null,
        isLoading: false,
        error: null,
      },
    ]);
    setPaymentRule("all");
    setMaxHours(1);
  };

  // Update rate when client, worker type, or hour type changes
  const updateLegWithRate = (id: string, updates: Partial<TripLeg>) => {
    setLegs((prev) => prev.map((leg) => {
      if (leg.id !== id) return leg;
      
      const newLeg = { ...leg, ...updates };
      
      // Recalculate rate if any of the selection changed
      if ('clientId' in updates || 'workerTypeId' in updates || 'hourTypeId' in updates) {
        newLeg.ratePerHour = getRate(newLeg.workerTypeId, newLeg.clientId) * getHourMultiplier(newLeg.hourTypeId);
      }
      
      return newLeg;
    }));
  };

  const removeLeg = (id: string) => {
    setLegs((prev) => prev.filter((leg) => leg.id !== id));
  };

  const updateLeg = (id: string, updates: Partial<TripLeg>) => {
    setLegs((prev) => prev.map((leg) => (leg.id === id ? { ...leg, ...updates } : leg)));
  };

  const calculateRoute = useCallback(async (legId: string) => {
    const leg = legs.find((l) => l.id === legId);
    if (!leg || !leg.origin.trim() || !leg.destination.trim()) {
      updateLeg(legId, { error: "Preencha origem e destino" });
      return;
    }

    updateLeg(legId, { isLoading: true, error: null });

    try {
      const response = await fetch("/api/calculate-route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin: leg.origin,
          destination: leg.destination,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao calcular rota");
      }

      const routeData = data as RouteResponse;
      updateLeg(legId, {
        distanceKm: routeData.distance_km,
        durationMinutes: routeData.duration_minutes,
        originAddress: routeData.origin_address,
        destinationAddress: routeData.destination_address,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      updateLeg(legId, {
        isLoading: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  }, [legs]);

  const getTotalDuration = (leg: TripLeg): number => {
    // Use manual hours if provided, otherwise use API duration
    let baseMinutes = 0;
    if (leg.manualHours !== null && leg.manualHours > 0) {
      baseMinutes = leg.manualHours * 60;
    } else if (leg.durationMinutes) {
      baseMinutes = leg.durationMinutes;
    }
    if (baseMinutes === 0) return 0;
    const tripMinutes = leg.tripType === "round-trip" ? baseMinutes * 2 : baseMinutes;
    return tripMinutes * leg.days;
  };

  const hasValidDuration = (leg: TripLeg): boolean => {
    return (leg.manualHours !== null && leg.manualHours > 0) || (leg.durationMinutes !== null && leg.durationMinutes > 0);
  };

  const getTotalDistance = (leg: TripLeg): number => {
    if (!leg.distanceKm) return 0;
    const tripDistance = leg.tripType === "round-trip" ? leg.distanceKm * 2 : leg.distanceKm;
    return tripDistance * leg.days;
  };

  const isPaid = (leg: TripLeg): boolean => {
    if (!hasValidDuration(leg)) return false;
    if (paymentRule === "all") return true;
    const totalHours = getTotalDuration(leg) / 60;
    return totalHours <= maxHours;
  };

  // Calculate totals
  const totals = legs.reduce(
    (acc, leg) => {
      const duration = getTotalDuration(leg);
      const distance = getTotalDistance(leg);
      const paid = isPaid(leg);

      acc.totalMinutes += duration;
      acc.totalDistance += distance;
      acc.totalViagens += leg.days;

      if (paid && hasValidDuration(leg)) {
        acc.paidMinutes += duration;
        const hours = duration / 60;
        acc.personHours += hours * leg.people;
        if (leg.ratePerHour) {
          acc.totalCost += hours * leg.people * leg.ratePerHour;
        }
        // Calculate cost using custoHora (without profit)
        const custoHora = getCustoHora(leg.workerTypeId) || 0;
        const hourMultiplier = getHourMultiplier(leg.hourTypeId);
        acc.totalCusto += hours * leg.people * custoHora * hourMultiplier;
      }

      return acc;
    },
    { totalMinutes: 0, paidMinutes: 0, personHours: 0, totalCost: 0, totalCusto: 0, totalDistance: 0, totalViagens: 0 }
  );

  // Update context with viagens total, totalKm and totalViagens
  useEffect(() => {
    updateTotal("viagens", totals.totalCost);
    updateTotal("viagensSemBDI", totals.totalCusto); // Cost only (custoHora), without profit
    updateTotal("totalKm", totals.totalDistance);
    updateTotal("totalViagens", totals.totalViagens);
  }, [totals.totalCost, totals.totalCusto, totals.totalDistance, totals.totalViagens, updateTotal]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1" />
          <div className="flex items-center gap-2 sm:gap-3">
            <img 
              src="https://dtvoeevhaseb5.cloudfront.net/uploads/mocha-import/73ee0db2-d333-4cc6-9729-ca6149cffff7/28f8a3d4-08bb-4ec0-b9aa-e3163a94641b.png" 
              alt="Multprest" 
              className="h-12 sm:h-16 w-auto object-contain"
            />
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Orçamento</h1>
          </div>
          <div className="flex-1 flex justify-end">
            <button
              onClick={logout}
              className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm"
              title={user?.email}
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex justify-center gap-2 mb-4 sm:mb-6 flex-wrap">
          <Button
            variant={activeTab === "maoDeObra" ? "default" : "outline"}
            onClick={() => setActiveTab("maoDeObra")}
            className={activeTab === "maoDeObra" 
              ? "bg-emerald-600 hover:bg-emerald-700 text-white" 
              : "border-slate-600 text-slate-300 hover:bg-slate-700"
            }
          >
            <HardHat className="w-4 h-4 mr-2" />
            Mão de Obra
          </Button>
          <Button
            variant={activeTab === "bdi" ? "default" : "outline"}
            onClick={() => setActiveTab("bdi")}
            className={activeTab === "bdi" 
              ? "bg-emerald-600 hover:bg-emerald-700 text-white" 
              : "border-slate-600 text-slate-300 hover:bg-slate-700"
            }
          >
            <Calculator className="w-4 h-4 mr-2" />
            Material
          </Button>
          <Button
            variant={activeTab === "despesas" ? "default" : "outline"}
            onClick={() => setActiveTab("despesas")}
            className={activeTab === "despesas" 
              ? "bg-emerald-600 hover:bg-emerald-700 text-white" 
              : "border-slate-600 text-slate-300 hover:bg-slate-700"
            }
          >
            <UtensilsCrossed className="w-4 h-4 mr-2" />
            Estadia e Alimentação
          </Button>
          <Button
            variant={activeTab === "viagens" ? "default" : "outline"}
            onClick={() => setActiveTab("viagens")}
            className={activeTab === "viagens" 
              ? "bg-emerald-600 hover:bg-emerald-700 text-white" 
              : "border-slate-600 text-slate-300 hover:bg-slate-700"
            }
          >
            <Navigation className="w-4 h-4 mr-2" />
            Horas Viajadas
          </Button>
          <Button
            variant={activeTab === "nota" ? "default" : "outline"}
            onClick={() => setActiveTab("nota")}
            className={activeTab === "nota" 
              ? "bg-emerald-600 hover:bg-emerald-700 text-white" 
              : "border-slate-600 text-slate-300 hover:bg-slate-700"
            }
          >
            <Receipt className="w-4 h-4 mr-2" />
            Nota Reversa
          </Button>
          <Button
            variant={activeTab === "negociacao" ? "default" : "outline"}
            onClick={() => setActiveTab("negociacao")}
            className={activeTab === "negociacao" 
              ? "bg-amber-600 hover:bg-amber-700 text-white" 
              : "border-slate-600 text-slate-300 hover:bg-slate-700"
            }
          >
            <Handshake className="w-4 h-4 mr-2" />
            Negociação
          </Button>
          <Button
            variant={activeTab === "dashboard" ? "default" : "outline"}
            onClick={() => setActiveTab("dashboard")}
            className={activeTab === "dashboard" 
              ? "bg-emerald-600 hover:bg-emerald-700 text-white" 
              : "border-slate-600 text-slate-300 hover:bg-slate-700"
            }
          >
            <LayoutDashboard className="w-4 h-4 mr-2" />
            Resumo Final
          </Button>
          <Button
            variant={activeTab === "historico" ? "default" : "outline"}
            onClick={() => setActiveTab("historico")}
            className={activeTab === "historico" 
              ? "bg-emerald-600 hover:bg-emerald-700 text-white" 
              : "border-slate-600 text-slate-300 hover:bg-slate-700"
            }
          >
            <Archive className="w-4 h-4 mr-2" />
            Histórico
          </Button>
          <Button
            variant={activeTab === "tabelaPrecos" ? "default" : "outline"}
            onClick={() => setActiveTab("tabelaPrecos")}
            className={activeTab === "tabelaPrecos" 
              ? "bg-emerald-600 hover:bg-emerald-700 text-white" 
              : "border-slate-600 text-slate-300 hover:bg-slate-700"
            }
          >
            <Settings className="w-4 h-4 mr-2" />
            Tabela de Preços
          </Button>
          <Button
            variant={activeTab === "custosHH" ? "default" : "outline"}
            onClick={() => setActiveTab("custosHH")}
            className={activeTab === "custosHH" 
              ? "bg-teal-600 hover:bg-teal-700 text-white" 
              : "border-slate-600 text-slate-300 hover:bg-slate-700"
            }
          >
            <DollarSign className="w-4 h-4 mr-2" />
            Custos HH
          </Button>
          {user?.isAdmin && (
            <Button
              variant={activeTab === "usuarios" ? "default" : "outline"}
              onClick={() => setActiveTab("usuarios")}
              className={activeTab === "usuarios" 
                ? "bg-amber-600 hover:bg-amber-700 text-white" 
                : "border-slate-600 text-slate-300 hover:bg-slate-700"
              }
            >
              <Users className="w-4 h-4 mr-2" />
              Usuários
            </Button>
          )}
        </div>

        {activeTab === "despesas" ? (
          <ExpensesPage state={expensesState} setState={setExpensesState} laborItems={laborItems} laborTeamSize={laborTeamSize} />
        ) : activeTab === "bdi" ? (
          <BDIPage state={bdiState} setState={setBdiState} />
        ) : activeTab === "nota" ? (
          <NotaReversaPage state={notaReversaState} setState={setNotaReversaState} laborItems={laborItems} />
        ) : activeTab === "negociacao" ? (
          <NegociacaoPage state={negociacaoState} setState={setNegociacaoState} notaReversaState={notaReversaState} laborItems={laborItems} />
        ) : activeTab === "maoDeObra" ? (
          <MaoDeObraPage items={laborItems} setItems={setLaborItems} teamSize={laborTeamSize} setTeamSize={setLaborTeamSize} />
        ) : activeTab === "dashboard" ? (
          <DashboardPage />
        ) : activeTab === "tabelaPrecos" ? (
          <TabelaPrecosPage />
        ) : activeTab === "custosHH" ? (
          <CustosHHPage />
        ) : activeTab === "usuarios" ? (
          <UsuariosPage />
        ) : activeTab === "historico" ? (
          <HistoricoPage 
            onSave={async (numero, descricao) => {
              try {
                const dados = { 
                  legs, 
                  paymentRule, 
                  maxHours,
                  laborItems,
                  expensesState,
                  bdiState,
                  notaReversaState,
                  negociacaoState,
                };
                const res = await fetch("/api/orcamentos", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    numero,
                    descricao,
                    dados,
                    totais: {
                      viagens: totals.totalCost,
                      maoDeObra: contextTotals.maoDeObra,
                      material: contextTotals.material,
                      estadia: contextTotals.estadia,
                      almoco: contextTotals.almoco,
                      janta: contextTotals.janta,
                      cafe: contextTotals.cafe,
                      transporte: contextTotals.transporte,
                    },
                  }),
                });
                if (!res.ok) throw new Error("Failed to save");
                return true;
              } catch {
                alert("Erro ao salvar orçamento");
                return false;
              }
            }}
            onLoad={(dados: unknown) => {
              const d = dados as { 
                legs?: TripLeg[]; 
                paymentRule?: "all" | "max-hours"; 
                maxHours?: number;
                laborItems?: LaborItem[];
                expensesState?: ExpensesState;
                bdiState?: BDIState;
                notaReversaState?: NotaReversaState;
                negociacaoState?: NegociacaoState;
              };
              if (d.legs) setLegs(d.legs);
              if (d.paymentRule) setPaymentRule(d.paymentRule);
              if (d.maxHours) setMaxHours(d.maxHours);
              if (d.laborItems) setLaborItems(d.laborItems);
              if (d.expensesState) {
                // Migrate old format - add teamSize if missing
                setExpensesState({
                  ...d.expensesState,
                  teamSize: d.expensesState.teamSize ?? 9,
                });
              }
              if (d.bdiState) {
                // Migrate old format (valorMaterial) to new format (materials array)
                const oldState = d.bdiState as BDIState & { valorMaterial?: number };
                if (oldState.valorMaterial !== undefined && !oldState.materials) {
                  setBdiState({
                    ...oldState,
                    materials: [{ ...createDefaultMaterial(), valorMaterial: oldState.valorMaterial }],
                  });
                } else {
                  setBdiState(d.bdiState);
                }
              }
              if (d.notaReversaState) setNotaReversaState(d.notaReversaState);
              if (d.negociacaoState) setNegociacaoState(d.negociacaoState);
            }}
          />
        ) : (
          <>
        {/* KPIs - Compact Grid */}
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-3 mb-4 sm:mb-6">
          <Card className="bg-blue-500/10 border-blue-500/20">
            <CardContent className="p-2 sm:p-3 text-center">
              <Navigation className="w-3 h-3 sm:w-4 sm:h-4 text-blue-400 mx-auto mb-1" />
              <div className="text-xs text-blue-400/80 truncate">Distância</div>
              <div className="text-sm sm:text-lg font-bold text-white truncate">
                {totals.totalDistance.toFixed(0)}km
              </div>
            </CardContent>
          </Card>

          <Card className="bg-purple-500/10 border-purple-500/20">
            <CardContent className="p-2 sm:p-3 text-center">
              <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-purple-400 mx-auto mb-1" />
              <div className="text-xs text-purple-400/80 truncate">Tempo</div>
              <div className="text-sm sm:text-lg font-bold text-white truncate">
                {formatDuration(totals.totalMinutes)}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-emerald-500/10 border-emerald-500/20">
            <CardContent className="p-2 sm:p-3 text-center">
              <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-emerald-400 mx-auto mb-1" />
              <div className="text-xs text-emerald-400/80 truncate">Pago</div>
              <div className="text-sm sm:text-lg font-bold text-white truncate">
                {formatDuration(totals.paidMinutes)}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-amber-500/10 border-amber-500/20 hidden sm:block">
            <CardContent className="p-2 sm:p-3 text-center">
              <Users className="w-3 h-3 sm:w-4 sm:h-4 text-amber-400 mx-auto mb-1" />
              <div className="text-xs text-amber-400/80 truncate">P-Horas</div>
              <div className="text-sm sm:text-lg font-bold text-white truncate">
                {totals.personHours.toFixed(1)}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-teal-500/10 border-teal-500/20 hidden sm:block">
            <CardContent className="p-2 sm:p-3 text-center">
              <DollarSign className="w-3 h-3 sm:w-4 sm:h-4 text-teal-400 mx-auto mb-1" />
              <div className="text-xs text-teal-400/80 truncate">Custo</div>
              <div className="text-sm sm:text-lg font-bold text-white truncate">
                {formatCurrency(totals.totalCost)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Mobile-only extra KPIs */}
        <div className="grid grid-cols-2 gap-2 mb-4 sm:hidden">
          <Card className="bg-amber-500/10 border-amber-500/20">
            <CardContent className="p-2 text-center">
              <div className="flex items-center justify-center gap-1">
                <Users className="w-3 h-3 text-amber-400" />
                <span className="text-xs text-amber-400/80">Pessoa-Horas:</span>
                <span className="text-sm font-bold text-white">{totals.personHours.toFixed(1)}</span>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-teal-500/10 border-teal-500/20">
            <CardContent className="p-2 text-center">
              <div className="flex items-center justify-center gap-1">
                <DollarSign className="w-3 h-3 text-teal-400" />
                <span className="text-xs text-teal-400/80">Custo:</span>
                <span className="text-sm font-bold text-white">{formatCurrency(totals.totalCost)}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Settings Card */}
        <Card className="mb-4 sm:mb-6 bg-slate-800/50 border-slate-700 backdrop-blur-sm">
          <CardHeader className="pb-2 sm:pb-4 px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-sm sm:text-base text-white flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              Configurações
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 space-y-1">
                <Label className="text-slate-300 text-xs sm:text-sm">Regra de Pagamento</Label>
                <Select value={paymentRule} onValueChange={(v) => setPaymentRule(v as "all" | "max-hours")}>
                  <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Pagar todos</SelectItem>
                    <SelectItem value="max-hours">Limite de horas</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {paymentRule === "max-hours" && (
                <div className="w-full sm:w-24 space-y-1">
                  <Label className="text-slate-300 text-xs sm:text-sm">Máx. Horas</Label>
                  <Input
                    type="number"
                    step="0.5"
                    min="0.5"
                    value={maxHours}
                    onChange={(e) => setMaxHours(parseFloat(e.target.value) || 1)}
                    className="bg-slate-700/50 border-slate-600 text-white h-9 text-sm"
                  />
                </div>
              )}

              <div className="flex items-end gap-2">
                <Button
                  onClick={resetLegs}
                  variant="outline"
                  className="border-red-500/50 text-red-400 hover:bg-red-500/20 h-9 text-sm"
                >
                  <RotateCcw className="w-4 h-4 mr-1" />
                  Zerar
                </Button>
                <Button
                  onClick={addLeg}
                  className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white h-9 text-sm"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Adicionar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Trip Legs - Card-based for mobile, compact for desktop */}
        <div className="space-y-3">
          {legs.map((leg, index) => (
            <Card key={leg.id} className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
              <CardContent className="p-3 sm:p-4">
                {/* Header with index and actions */}
                <div className="flex items-center justify-between mb-3">
                  <Badge className="bg-slate-700 text-slate-300">Trecho {index + 1}</Badge>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => calculateRoute(leg.id)}
                      disabled={leg.isLoading}
                      className="bg-blue-600 hover:bg-blue-700 text-white h-8 px-3"
                    >
                      {leg.isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <MapPin className="w-4 h-4 mr-1" />
                          <span className="hidden sm:inline">Calcular</span>
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => removeLeg(leg.id)}
                      disabled={legs.length === 1}
                      className="border-red-500/50 text-red-400 hover:bg-red-500/20 h-8 px-2"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Origin and Destination */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                  <div className="space-y-1">
                    <Label className="text-slate-400 text-xs">Origem</Label>
                    <Input
                      placeholder="Ex: São Paulo, SP"
                      value={leg.origin}
                      onChange={(e) => updateLeg(leg.id, { origin: e.target.value })}
                      className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-slate-400 text-xs">Destino</Label>
                    <Input
                      placeholder="Ex: Rio de Janeiro, RJ"
                      value={leg.destination}
                      onChange={(e) => updateLeg(leg.id, { destination: e.target.value })}
                      className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 h-9 text-sm"
                    />
                  </div>
                </div>

                {/* Client, Worker, Hour Type Row */}
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-3">
                  <div className="space-y-1">
                    <Label className="text-slate-400 text-xs">Cliente</Label>
                    <Select
                      value={leg.clientId}
                      onValueChange={(v) => updateLegWithRate(leg.id, { clientId: v })}
                    >
                      <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {activeClients.map((client) => (
                          <SelectItem key={client.client_id} value={client.client_id}>
                            {client.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-slate-400 text-xs">Função</Label>
                    <Select
                      value={leg.workerTypeId}
                      onValueChange={(v) => updateLegWithRate(leg.id, { workerTypeId: v })}
                    >
                      <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {workers.map((worker) => (
                          <SelectItem key={worker.worker_id} value={worker.worker_id}>
                            {worker.icon} {worker.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-slate-400 text-xs">Tipo Hora</Label>
                    <Select
                      value={leg.hourTypeId}
                      onValueChange={(v) => updateLegWithRate(leg.id, { hourTypeId: v })}
                    >
                      <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {hourTypes.map((ht) => (
                          <SelectItem key={ht.hour_id} value={ht.hour_id}>
                            {ht.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1 hidden sm:block">
                    <Label className="text-slate-400 text-xs">R$/hora</Label>
                    <div className="h-9 flex items-center">
                      <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                        {leg.ratePerHour ? `R$ ${leg.ratePerHour.toFixed(2)}` : "—"}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Options Row */}
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mb-3">
                  <div className="space-y-1">
                    <Label className="text-slate-400 text-xs">Tipo</Label>
                    <Select
                      value={leg.tripType}
                      onValueChange={(v) => updateLeg(leg.id, { tripType: v as "one-way" | "round-trip" })}
                    >
                      <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="one-way">Ida</SelectItem>
                        <SelectItem value="round-trip">Ida/Volta</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-slate-400 text-xs">Pessoas</Label>
                    <Input
                      type="number"
                      min="1"
                      value={leg.people}
                      onChange={(e) => updateLeg(leg.id, { people: parseInt(e.target.value) || 1 })}
                      className="bg-slate-700/50 border-slate-600 text-white h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-slate-400 text-xs">Horas</Label>
                    <Input
                      type="number"
                      step="0.5"
                      placeholder="Auto"
                      value={leg.manualHours ?? ""}
                      onChange={(e) =>
                        updateLeg(leg.id, {
                          manualHours: e.target.value ? parseFloat(e.target.value) : null,
                        })
                      }
                      className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-slate-400 text-xs">Dias</Label>
                    <Input
                      type="number"
                      min="1"
                      value={leg.days}
                      onChange={(e) => updateLeg(leg.id, { days: parseInt(e.target.value) || 1 })}
                      className="bg-slate-700/50 border-slate-600 text-white h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-1 sm:hidden">
                    <Label className="text-slate-400 text-xs">R$/h</Label>
                    <div className="h-9 flex items-center">
                      <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs">
                        {leg.ratePerHour ? `${leg.ratePerHour.toFixed(0)}` : "—"}
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-1 hidden sm:block">
                    <Label className="text-slate-400 text-xs">Pago?</Label>
                    <div className="h-9 flex items-center">
                      {hasValidDuration(leg) ? (
                        <Badge
                          className={
                            isPaid(leg)
                              ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                              : "bg-red-500/20 text-red-400 border-red-500/30"
                          }
                        >
                          {isPaid(leg) ? "SIM" : "NÃO"}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-slate-600 text-slate-500">—</Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* Results Row */}
                {(leg.distanceKm || leg.error || hasValidDuration(leg)) && (
                  <div className="pt-2 border-t border-slate-700">
                    {leg.error ? (
                      <p className="text-xs text-red-400">{leg.error}</p>
                    ) : (
                      <div className="flex flex-wrap gap-3 text-sm">
                        {leg.distanceKm && (
                          <div className="flex items-center gap-1 text-slate-300">
                            <Navigation className="w-3 h-3 text-blue-400" />
                            <span>{getTotalDistance(leg).toFixed(1)} km</span>
                          </div>
                        )}
                        {hasValidDuration(leg) && (
                          <div className="flex items-center gap-1 text-slate-300">
                            <Clock className="w-3 h-3 text-purple-400" />
                            <span>{formatDuration(getTotalDuration(leg))}</span>
                          </div>
                        )}
                        {hasValidDuration(leg) && leg.ratePerHour && isPaid(leg) && (
                          <div className="flex items-center gap-1 text-emerald-400 font-medium">
                            <DollarSign className="w-3 h-3" />
                            <span>
                              {formatCurrency((getTotalDuration(leg) / 60) * leg.people * leg.ratePerHour)}
                            </span>
                          </div>
                        )}
                        {leg.originAddress && (
                          <div className="text-xs text-slate-500 w-full">
                            {leg.originAddress} → {leg.destinationAddress}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Help Text */}
        <p className="text-slate-500 text-xs mt-4 text-center">
          Digite cidade e estado (ex: "São Paulo, SP") e clique em Calcular
        </p>
          </>
        )}
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <TotalsProvider>
      <HomePageContent />
    </TotalsProvider>
  );
}
