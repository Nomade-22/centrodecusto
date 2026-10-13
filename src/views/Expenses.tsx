"use client";

import { useState, useEffect, useMemo } from "react";
import { useTotals } from "@/context/TotalsContext";
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
import { Plus, Trash2, Home, UtensilsCrossed, Coffee, Moon, DollarSign, Users, Settings, Car, Fuel, RotateCcw, Download } from "lucide-react";
import { Client, calculateBDIPrice, formatCurrency } from "@/lib/bdi";
import type { LaborItem } from "./MaoDeObra";
import { usePriceTable } from "@/hooks/usePriceTable";

export interface AccommodationItem {
  id: string;
  clientId: string;
  baseCost: number;
  people: number;
  days: number;
}

export interface MealItem {
  id: string;
  clientId: string;
  location: string;
  baseCost: number;
  people: number;
  days: number;
}

export interface VehicleType {
  id: string;
  name: string;
  capacity: number;
}

export const VEHICLES: VehicleType[] = [
  { id: "gol", name: "Gol", capacity: 5 },
  { id: "montana", name: "Montana", capacity: 2 },
  { id: "kombi", name: "Kombi", capacity: 9 },
];

export interface TransportItem {
  id: string;
  clientId: string;
  vehicleId: string;
  description: string;
  gasPricePerLiter: number;
  kmPerLiter: number;
  toll: number;
  manualKm: number;
  manualViagens: number;
}

export const generateExpenseId = () => Math.random().toString(36).substring(2, 9);

export const createDefaultAccommodation = (clientId: string): AccommodationItem => ({
  id: generateExpenseId(),
  clientId,
  baseCost: 0,
  people: 0,
  days: 0,
});

export const createDefaultTransport = (clientId: string): TransportItem => ({
  id: generateExpenseId(),
  clientId,
  vehicleId: "gol",
  description: "",
  gasPricePerLiter: 0,
  kmPerLiter: 0,
  toll: 0,
  manualKm: 0,
  manualViagens: 0,
});

export const createDefaultMeal = (clientId: string): MealItem => ({
  id: generateExpenseId(),
  clientId,
  location: "",
  baseCost: 0,
  people: 0,
  days: 0,
});

export interface ExpensesState {
  clients: Client[];
  accommodation: AccommodationItem[];
  transport: TransportItem[];
  lunches: MealItem[];
  dinners: MealItem[];
  breakfasts: MealItem[];
  teamSize: number;
}

export interface ExpensesPageProps {
  state: ExpensesState;
  setState: React.Dispatch<React.SetStateAction<ExpensesState>>;
  laborItems?: LaborItem[];
  laborTeamSize?: number;
}

const generateId = () => Math.random().toString(36).substring(2, 9);

export default function ExpensesPage({ state, setState, laborItems = [], laborTeamSize = 9 }: ExpensesPageProps) {
  const { totals, updateTotal } = useTotals();
  const { getClient: getCentralClient, activeClients, hhSettings } = usePriceTable();
  const totalKmFromViagens = totals.totalKm;
  const totalViagensFromHoras = totals.totalViagens;
  
  // Extract state
  const { clients, accommodation, transport, lunches, dinners, breakfasts, teamSize } = state;

  // Keep custom/legacy clients stored in an old budget, but always expose the
  // active official clients from the central Centro de Custo price table.
  const selectableClients = useMemo<Client[]>(() => {
    const byId = new Map<string, Client>();
    clients.forEach((client) => byId.set(client.id, client));
    activeClients.forEach((client) => {
      byId.set(client.client_id, {
        id: client.client_id,
        name: client.name,
        diasPagamento: Number(client.dias),
      });
    });
    return Array.from(byId.values());
  }, [clients, activeClients]);
  
  // Local UI state only
  const [showClientConfig, setShowClientConfig] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [newClientDias, setNewClientDias] = useState(30);

  // State setters that update parent state
  const setClients = (updater: Client[] | ((prev: Client[]) => Client[])) => {
    setState(prev => ({
      ...prev,
      clients: typeof updater === 'function' ? updater(prev.clients) : updater
    }));
  };

  const setTeamSize = (value: number) => {
    setState(prev => ({ ...prev, teamSize: value }));
  };
  
  const setAccommodation = (updater: AccommodationItem[] | ((prev: AccommodationItem[]) => AccommodationItem[])) => {
    setState(prev => ({
      ...prev,
      accommodation: typeof updater === 'function' ? updater(prev.accommodation) : updater
    }));
  };
  
  const setTransport = (updater: TransportItem[] | ((prev: TransportItem[]) => TransportItem[])) => {
    setState(prev => ({
      ...prev,
      transport: typeof updater === 'function' ? updater(prev.transport) : updater
    }));
  };
  
  const setLunches = (updater: MealItem[] | ((prev: MealItem[]) => MealItem[])) => {
    setState(prev => ({
      ...prev,
      lunches: typeof updater === 'function' ? updater(prev.lunches) : updater
    }));
  };
  
  const setDinners = (updater: MealItem[] | ((prev: MealItem[]) => MealItem[])) => {
    setState(prev => ({
      ...prev,
      dinners: typeof updater === 'function' ? updater(prev.dinners) : updater
    }));
  };
  
  const setBreakfasts = (updater: MealItem[] | ((prev: MealItem[]) => MealItem[])) => {
    setState(prev => ({
      ...prev,
      breakfasts: typeof updater === 'function' ? updater(prev.breakfasts) : updater
    }));
  };

  // Client management
  const addClient = () => {
    if (!newClientName.trim()) return;
    const newClient: Client = {
      id: generateId(),
      name: newClientName.trim(),
      diasPagamento: newClientDias,
    };
    setClients((prev) => [...prev, newClient]);
    setNewClientName("");
    setNewClientDias(30);
  };

  const removeClient = (id: string) => {
    setClients((prev) => prev.filter((c) => c.id !== id));
  };

  const updateClient = (id: string, updates: Partial<Client>) => {
    setClients((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
    );
  };

  const getClientDias = (clientId: string): number => {
    const client = clients.find((c) => c.id === clientId);
    return client?.diasPagamento || 30;
  };

  // Project expenses use the same fiscal and payment assumptions as the HH
  // calculator, while keeping a 10% expense margin instead of labor markup.
  const getItemBDIPrice = (baseCost: number, clientId: string): number => {
    const central = getCentralClient(clientId);
    const dias = central?.dias ?? getClientDias(clientId);
    return calculateBDIPrice(baseCost, dias, {
      das: Number(hhSettings?.das_effective_pct ?? 10.81),
      lucro: 10,
      jurosDia: Number(hhSettings?.anticipation_daily_pct ?? 0.1),
      trocaNota: 0,
      descontoCompras: Number(central?.negotiation_pct ?? 0),
      issRetido: Number(central?.iss_retained_pct ?? hhSettings?.default_iss_retained_pct ?? 4.36),
      inssRetido: Number(central?.inss_retained_pct ?? hhSettings?.default_inss_retained_pct ?? 0),
      anticipate: central?.anticipate ?? true,
    });
  };

  // Accommodation functions
  const addAccommodation = () => {
    setAccommodation((prev) => [
      ...prev,
      { id: generateId(), clientId: selectableClients[0]?.id || "", baseCost: 0, people: 0, days: 0 },
    ]);
  };

  const removeAccommodation = (id: string) => {
    setAccommodation((prev) => prev.filter((item) => item.id !== id));
  };

  const updateAccommodation = (id: string, updates: Partial<AccommodationItem>) => {
    setAccommodation((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  };

  const resetAccommodation = () => {
    setAccommodation([
      { id: generateId(), clientId: selectableClients[0]?.id || "", baseCost: 0, people: 0, days: 0 },
    ]);
  };

  // Calculate labor totals for sync - use CALCULATED team values, not raw totals
  const laborTotalPeople = laborItems.reduce((sum, item) => sum + (item.people || 0), 0);
  // Dias de Equipe Necessários = ceil(total pessoas / pessoas por equipe)
  const laborTeamDays = laborTeamSize > 0 ? Math.ceil(laborTotalPeople / laborTeamSize) : 0;

  // Sync labor data to accommodation (pull calculated Pessoas/Dias from Mão de Obra)
  const syncLaborToAccommodation = () => {
    if (laborItems.length === 0) return;
    
    // Sync teamSize
    setTeamSize(laborTeamSize);
    
    if (accommodation.length > 0) {
      // Use team size (pessoas por equipe) and team days (dias de equipe necessários)
      setAccommodation((prev) => 
        prev.map((item, index) => 
          index === 0 ? { ...item, people: laborTeamSize, days: laborTeamDays } : item
        )
      );
    }
  };

  // Sync labor data to meals
  const syncLaborToMeals = (type: "lunch" | "dinner" | "breakfast") => {
    if (laborItems.length === 0) return;
    
    // Use team size (pessoas por equipe) and team days (dias de equipe necessários)
    const updater = (prev: MealItem[]) =>
      prev.map((item, index) =>
        index === 0 ? { ...item, people: laborTeamSize, days: laborTeamDays } : item
      );
    
    if (type === "lunch") setLunches(updater);
    else if (type === "dinner") setDinners(updater);
    else setBreakfasts(updater);
  };

  // Transport functions
  const addTransport = () => {
    setTransport((prev) => [
      ...prev,
      { id: generateId(), clientId: selectableClients[0]?.id || "", vehicleId: "gol", description: "", gasPricePerLiter: 0, kmPerLiter: 0, toll: 0, manualKm: 0, manualViagens: 0 },
    ]);
  };

  const removeTransport = (id: string) => {
    setTransport((prev) => prev.filter((item) => item.id !== id));
  };

  const updateTransport = (id: string, updates: Partial<TransportItem>) => {
    setTransport((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  };

  const resetTransport = () => {
    setTransport([
      { id: generateId(), clientId: selectableClients[0]?.id || "", vehicleId: "gol", description: "", gasPricePerLiter: 0, kmPerLiter: 0, toll: 0, manualKm: 0, manualViagens: 0 },
    ]);
  };

  // Meal functions
  const addMeal = (type: "lunch" | "dinner" | "breakfast") => {
    const newItem: MealItem = {
      id: generateId(),
      clientId: selectableClients[0]?.id || "",
      location: "",
      baseCost: 0,
      people: 0,
      days: 0,
    };
    if (type === "lunch") setLunches((prev) => [...prev, newItem]);
    else if (type === "dinner") setDinners((prev) => [...prev, newItem]);
    else setBreakfasts((prev) => [...prev, newItem]);
  };

  const removeMeal = (type: "lunch" | "dinner" | "breakfast", id: string) => {
    if (type === "lunch") setLunches((prev) => prev.filter((item) => item.id !== id));
    else if (type === "dinner") setDinners((prev) => prev.filter((item) => item.id !== id));
    else setBreakfasts((prev) => prev.filter((item) => item.id !== id));
  };

  const resetMeals = (type: "lunch" | "dinner" | "breakfast") => {
    const emptyItem: MealItem = {
      id: generateId(),
      clientId: selectableClients[0]?.id || "",
      location: "",
      baseCost: 0,
      people: 0,
      days: 0,
    };
    if (type === "lunch") setLunches([emptyItem]);
    else if (type === "dinner") setDinners([{ ...emptyItem, id: generateId() }]);
    else setBreakfasts([{ ...emptyItem, id: generateId() }]);
  };

  const updateMeal = (
    type: "lunch" | "dinner" | "breakfast",
    id: string,
    updates: Partial<MealItem>
  ) => {
    const updater = (prev: MealItem[]) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item));
    if (type === "lunch") setLunches(updater);
    else if (type === "dinner") setDinners(updater);
    else setBreakfasts(updater);
  };

  // Calculations with BDI
  const accommodationTotal = accommodation.reduce((sum, item) => {
    const bdiPrice = getItemBDIPrice(item.baseCost, item.clientId);
    return sum + bdiPrice * item.people * item.days;
  }, 0);

  // Raw calculations (without BDI) - valor digitado × pessoas × dias
  const accommodationTotalSemBDI = accommodation.reduce((sum, item) => {
    return sum + item.baseCost * item.people * item.days;
  }, 0);

  const lunchTotal = lunches.reduce((sum, item) => {
    const bdiPrice = getItemBDIPrice(item.baseCost, item.clientId);
    return sum + bdiPrice * item.people * item.days;
  }, 0);

  const lunchTotalSemBDI = lunches.reduce((sum, item) => {
    return sum + item.baseCost * item.people * item.days;
  }, 0);

  const dinnerTotal = dinners.reduce((sum, item) => {
    const bdiPrice = getItemBDIPrice(item.baseCost, item.clientId);
    return sum + bdiPrice * item.people * item.days;
  }, 0);

  const dinnerTotalSemBDI = dinners.reduce((sum, item) => {
    return sum + item.baseCost * item.people * item.days;
  }, 0);

  const breakfastTotal = breakfasts.reduce((sum, item) => {
    const bdiPrice = getItemBDIPrice(item.baseCost, item.clientId);
    return sum + bdiPrice * item.people * item.days;
  }, 0);

  const breakfastTotalSemBDI = breakfasts.reduce((sum, item) => {
    return sum + item.baseCost * item.people * item.days;
  }, 0);

  const transportTotal = transport.reduce((sum, item) => {
    const useKm = item.manualKm > 0 ? item.manualKm : totalKmFromViagens;
    const useViagens = item.manualViagens > 0 ? item.manualViagens : (totalViagensFromHoras || 1);
    const costPerKm = item.kmPerLiter > 0 ? item.gasPricePerLiter / item.kmPerLiter : 0;
    const gasCost = useKm * costPerKm;
    const baseCost = (gasCost + item.toll) * useViagens;
    const bdiPrice = getItemBDIPrice(baseCost, item.clientId);
    return sum + bdiPrice;
  }, 0);

  const transportTotalSemBDI = transport.reduce((sum, item) => {
    const useKm = item.manualKm > 0 ? item.manualKm : totalKmFromViagens;
    const useViagens = item.manualViagens > 0 ? item.manualViagens : (totalViagensFromHoras || 1);
    const costPerKm = item.kmPerLiter > 0 ? item.gasPricePerLiter / item.kmPerLiter : 0;
    const gasCost = useKm * costPerKm;
    const baseCost = (gasCost + item.toll) * useViagens;
    return sum + baseCost;
  }, 0);

  const grandTotal = accommodationTotal + lunchTotal + dinnerTotal + breakfastTotal + transportTotal;

  // Calculate total people and days across all expense items (max per category, then sum)
  const totalPeopleEstadia = accommodation.reduce((max, item) => Math.max(max, item.people || 0), 0);
  const totalDaysEstadia = accommodation.reduce((sum, item) => sum + (item.days || 0), 0);
  
  const totalPeopleAlmoco = lunches.reduce((max, item) => Math.max(max, item.people || 0), 0);
  const totalDaysAlmoco = lunches.reduce((sum, item) => sum + (item.days || 0), 0);
  
  const totalPeopleJanta = dinners.reduce((max, item) => Math.max(max, item.people || 0), 0);
  const totalDaysJanta = dinners.reduce((sum, item) => sum + (item.days || 0), 0);
  
  const totalPeopleCafe = breakfasts.reduce((max, item) => Math.max(max, item.people || 0), 0);
  const totalDaysCafe = breakfasts.reduce((sum, item) => sum + (item.days || 0), 0);

  // Grand totals for summary
  const overallMaxPeople = Math.max(totalPeopleEstadia, totalPeopleAlmoco, totalPeopleJanta, totalPeopleCafe);
  const overallTotalDays = Math.max(totalDaysEstadia, totalDaysAlmoco, totalDaysJanta, totalDaysCafe);
  const diasEquipeNecessarios = overallMaxPeople > 0 ? Math.ceil(overallMaxPeople / (teamSize || 9)) : 0;

  // Update context with totals (with BDI and raw values)
  useEffect(() => {
    updateTotal("estadia", accommodationTotal);
    updateTotal("estadiaSemBDI", accommodationTotalSemBDI);
  }, [accommodationTotal, accommodationTotalSemBDI, updateTotal]);

  useEffect(() => {
    updateTotal("almoco", lunchTotal);
    updateTotal("almocoSemBDI", lunchTotalSemBDI);
  }, [lunchTotal, lunchTotalSemBDI, updateTotal]);

  useEffect(() => {
    updateTotal("janta", dinnerTotal);
    updateTotal("jantaSemBDI", dinnerTotalSemBDI);
  }, [dinnerTotal, dinnerTotalSemBDI, updateTotal]);

  useEffect(() => {
    updateTotal("cafe", breakfastTotal);
    updateTotal("cafeSemBDI", breakfastTotalSemBDI);
  }, [breakfastTotal, breakfastTotalSemBDI, updateTotal]);

  useEffect(() => {
    updateTotal("transporte", transportTotal);
    updateTotal("transporteSemBDI", transportTotalSemBDI);
  }, [transportTotal, transportTotalSemBDI, updateTotal]);

  const MealSection = ({
    title,
    icon: Icon,
    iconColor,
    items,
    type,
    total,
    onSync,
  }: {
    title: string;
    icon: typeof UtensilsCrossed;
    iconColor: string;
    items: MealItem[];
    type: "lunch" | "dinner" | "breakfast";
    total: number;
    onSync?: () => void;
  }) => (
    <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
      <CardHeader className="pb-2 px-3 pt-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm text-white flex items-center gap-2">
            <Icon className={`w-4 h-4 ${iconColor}`} />
            {title}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge className="bg-slate-700 text-white">{formatCurrency(total)}</Badge>
            {onSync && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onSync}
                className={`${iconColor.replace('text-', 'text-')} hover:bg-slate-500/20 h-7 px-2`}
                title="Puxar Mão de Obra"
                disabled={laborItems.length === 0}
              >
                <Download className="w-3 h-3" />
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => resetMeals(type)}
              className="text-red-400 hover:bg-red-500/20 h-7 px-2"
              title="Zerar"
            >
              <RotateCcw className="w-3 h-3" />
            </Button>
            <Button
              size="sm"
              onClick={() => addMeal(type)}
              className="bg-slate-600 hover:bg-slate-500 h-7 px-2"
            >
              <Plus className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-3 pb-3 space-y-2">
        {items.map((item, index) => {
          const bdiPrice = getItemBDIPrice(item.baseCost, item.clientId);
          const itemTotal = bdiPrice * item.people * item.days;

          return (
            <div key={item.id} className="space-y-1">
              <div className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-6 sm:col-span-3 space-y-1">
                  <Label className="text-slate-400 text-xs">{index === 0 ? "Cliente" : ""}</Label>
                  <Select
                    value={item.clientId}
                    onValueChange={(value) => updateMeal(type, item.id, { clientId: value })}
                  >
                    <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white h-8 text-sm">
                      <SelectValue placeholder="Cliente" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      {selectableClients.map((c) => (
                        <SelectItem key={c.id} value={c.id} className="text-white">
                          {c.name} ({c.diasPagamento}d)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-6 sm:col-span-2 space-y-1">
                  <Label className="text-slate-400 text-xs">{index === 0 ? "Local" : ""}</Label>
                  <Input
                    placeholder="Local"
                    value={item.location}
                    onChange={(e) => updateMeal(type, item.id, { location: e.target.value })}
                    className="bg-slate-700/50 border-slate-600 text-white h-8 text-sm"
                  />
                </div>
                <div className="col-span-3 sm:col-span-2 space-y-1">
                  <Label className="text-slate-400 text-xs">{index === 0 ? "Custo R$" : ""}</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={item.baseCost || ""}
                    onChange={(e) =>
                      updateMeal(type, item.id, { baseCost: parseFloat(e.target.value) || 0 })
                    }
                    className="bg-slate-700/50 border-slate-600 text-white h-8 text-sm"
                  />
                </div>
                <div className="col-span-3 sm:col-span-1 space-y-1">
                  <Label className="text-slate-400 text-xs">{index === 0 ? "Pessoas" : ""}</Label>
                  <Input
                    type="number"
                    step="0.5"
                    min="0.5"
                    value={item.people || ""}
                    onChange={(e) =>
                      updateMeal(type, item.id, { people: parseFloat(e.target.value) || 1 })
                    }
                    className="bg-slate-700/50 border-slate-600 text-white h-8 text-sm"
                  />
                </div>
                <div className="col-span-3 sm:col-span-1 space-y-1">
                  <Label className="text-slate-400 text-xs">{index === 0 ? "Dias" : ""}</Label>
                  <Input
                    type="number"
                    min="1"
                    value={item.days || ""}
                    onChange={(e) =>
                      updateMeal(type, item.id, { days: parseInt(e.target.value) || 1 })
                    }
                    className="bg-slate-700/50 border-slate-600 text-white h-8 text-sm"
                  />
                </div>
                <div className="col-span-3 flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeMeal(type, item.id)}
                    disabled={items.length === 1}
                    className="text-red-400 hover:bg-red-500/20 h-8 px-1"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              {item.baseCost > 0 && (
                <div className="flex items-center gap-2 text-xs pl-1">
                  <span className="text-slate-500">
                    Base: {formatCurrency(item.baseCost)} → c/ BDI: {formatCurrency(bdiPrice)}
                  </span>
                  <span className="text-emerald-400 font-medium">
                    Total: {formatCurrency(itemTotal)}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        <Card className="bg-indigo-500/10 border-indigo-500/20">
          <CardContent className="p-2 text-center">
            <Home className="w-3 h-3 text-indigo-400 mx-auto mb-1" />
            <div className="text-xs text-indigo-400/80">Estadia</div>
            <div className="text-sm font-bold text-white">{formatCurrency(accommodationTotal)}</div>
          </CardContent>
        </Card>
        <Card className="bg-cyan-500/10 border-cyan-500/20">
          <CardContent className="p-2 text-center">
            <Car className="w-3 h-3 text-cyan-400 mx-auto mb-1" />
            <div className="text-xs text-cyan-400/80">Transporte</div>
            <div className="text-sm font-bold text-white">{formatCurrency(transportTotal)}</div>
          </CardContent>
        </Card>
        <Card className="bg-amber-500/10 border-amber-500/20">
          <CardContent className="p-2 text-center">
            <UtensilsCrossed className="w-3 h-3 text-amber-400 mx-auto mb-1" />
            <div className="text-xs text-amber-400/80">Almoço</div>
            <div className="text-sm font-bold text-white">{formatCurrency(lunchTotal)}</div>
          </CardContent>
        </Card>
        <Card className="bg-purple-500/10 border-purple-500/20">
          <CardContent className="p-2 text-center">
            <Moon className="w-3 h-3 text-purple-400 mx-auto mb-1" />
            <div className="text-xs text-purple-400/80">Janta</div>
            <div className="text-sm font-bold text-white">{formatCurrency(dinnerTotal)}</div>
          </CardContent>
        </Card>
        <Card className="bg-orange-500/10 border-orange-500/20">
          <CardContent className="p-2 text-center">
            <Coffee className="w-3 h-3 text-orange-400 mx-auto mb-1" />
            <div className="text-xs text-orange-400/80">Café</div>
            <div className="text-sm font-bold text-white">{formatCurrency(breakfastTotal)}</div>
          </CardContent>
        </Card>
        <Card className="bg-emerald-500/10 border-emerald-500/20">
          <CardContent className="p-2 text-center">
            <DollarSign className="w-3 h-3 text-emerald-400 mx-auto mb-1" />
            <div className="text-xs text-emerald-400/80">Total</div>
            <div className="text-sm font-bold text-white">{formatCurrency(grandTotal)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Team Size Summary Card */}
      {(laborTotalPeople > 0 || overallMaxPeople > 0 || overallTotalDays > 0) && (
        <Card className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/30 backdrop-blur-sm">
          <CardHeader className="pb-2 px-3 pt-3">
            <CardTitle className="text-sm text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-400" />
              Detalhamento de Equipe
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3 space-y-3">
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
                    {laborTotalPeople > 0 ? laborTeamDays : diasEquipeNecessarios} dias
                  </div>
                  <div className="text-xs text-slate-500">
                    {laborTotalPeople > 0 ? laborTotalPeople : overallMaxPeople} pessoas ÷ {teamSize || 9} por equipe
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-700/40 rounded-lg p-3 text-center">
                <Users className="w-5 h-5 text-blue-400 mx-auto mb-1" />
                <div className="text-xs text-slate-400">Total Pessoas</div>
                <div className="text-xl font-bold text-white">{laborTotalPeople > 0 ? laborTotalPeople : overallMaxPeople}</div>
              </div>
              <div className="bg-slate-700/40 rounded-lg p-3 text-center">
                <span className="text-xl">📅</span>
                <div className="text-xs text-slate-400">Dias Equipe</div>
                <div className="text-xl font-bold text-white">{laborTotalPeople > 0 ? laborTeamDays : diasEquipeNecessarios}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Client Configuration */}
      <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
        <CardHeader className="pb-2 px-3 pt-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-cyan-400" />
              Clientes
            </CardTitle>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowClientConfig(!showClientConfig)}
              className="text-slate-400 hover:text-white h-7 px-2"
            >
              <Settings className="w-3 h-3 mr-1" />
              {showClientConfig ? "Ocultar" : "Configurar"}
            </Button>
          </div>
        </CardHeader>
        {showClientConfig && (
          <CardContent className="px-3 pb-3 space-y-3">
            {/* Existing clients */}
            <div className="space-y-2">
              {clients.map((client) => (
                <div key={client.id} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-5">
                    <Input
                      value={client.name}
                      onChange={(e) => updateClient(client.id, { name: e.target.value })}
                      className="bg-slate-700/50 border-slate-600 text-white h-8 text-sm"
                    />
                  </div>
                  <div className="col-span-4">
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        value={client.diasPagamento}
                        onChange={(e) =>
                          updateClient(client.id, { diasPagamento: parseInt(e.target.value) || 30 })
                        }
                        className="bg-slate-700/50 border-slate-600 text-white h-8 text-sm"
                      />
                      <span className="text-slate-400 text-xs">dias</span>
                    </div>
                  </div>
                  <div className="col-span-3 text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeClient(client.id)}
                      disabled={clients.length <= 1}
                      className="text-red-400 hover:bg-red-500/20 h-8 px-2"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Add new client */}
            <div className="border-t border-slate-700 pt-3">
              <div className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-5">
                  <Input
                    placeholder="Nome do cliente"
                    value={newClientName}
                    onChange={(e) => setNewClientName(e.target.value)}
                    className="bg-slate-700/50 border-slate-600 text-white h-8 text-sm"
                  />
                </div>
                <div className="col-span-4">
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      placeholder="Dias"
                      value={newClientDias}
                      onChange={(e) => setNewClientDias(parseInt(e.target.value) || 30)}
                      className="bg-slate-700/50 border-slate-600 text-white h-8 text-sm"
                    />
                    <span className="text-slate-400 text-xs">dias</span>
                  </div>
                </div>
                <div className="col-span-3">
                  <Button
                    size="sm"
                    onClick={addClient}
                    disabled={!newClientName.trim()}
                    className="bg-cyan-600 hover:bg-cyan-500 h-8 w-full"
                  >
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        )}
        {!showClientConfig && (
          <CardContent className="px-3 pb-3">
            <div className="flex flex-wrap gap-2">
              {clients.map((client) => (
                <Badge key={client.id} className="bg-slate-700 text-white">
                  {client.name} ({client.diasPagamento}d)
                </Badge>
              ))}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Accommodation */}
      <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
        <CardHeader className="pb-2 px-3 pt-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm text-white flex items-center gap-2">
              <Home className="w-4 h-4 text-indigo-400" />
              Estadia
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge className="bg-slate-700 text-white">{formatCurrency(accommodationTotal)}</Badge>
              <Button
                size="sm"
                variant="ghost"
                onClick={syncLaborToAccommodation}
                className="text-indigo-400 hover:bg-indigo-500/20 h-7 px-2"
                title="Puxar Mão de Obra"
                disabled={laborItems.length === 0}
              >
                <Download className="w-3 h-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={resetAccommodation}
                className="text-red-400 hover:bg-red-500/20 h-7 px-2"
                title="Zerar"
              >
                <RotateCcw className="w-3 h-3" />
              </Button>
              <Button
                size="sm"
                onClick={addAccommodation}
                className="bg-slate-600 hover:bg-slate-500 h-7 px-2"
              >
                <Plus className="w-3 h-3" />
              </Button>
            </div>
          </div>
          <div className="mt-2 p-2 rounded bg-amber-500/10 border border-amber-500/20">
            <p className="text-xs text-amber-300">
              📍 <strong>Soledade:</strong> Diária da casa R$ 129,00
            </p>
          </div>
        </CardHeader>
        <CardContent className="px-3 pb-3 space-y-2">
          {accommodation.map((item, index) => {
            const bdiPrice = getItemBDIPrice(item.baseCost, item.clientId);
            const itemTotal = bdiPrice * item.people * item.days;

            return (
              <div key={item.id} className="space-y-1">
                <div className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-6 sm:col-span-3 space-y-1">
                    <Label className="text-slate-400 text-xs">{index === 0 ? "Cliente" : ""}</Label>
                    <Select
                      value={item.clientId}
                      onValueChange={(value) => updateAccommodation(item.id, { clientId: value })}
                    >
                      <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white h-8 text-sm">
                        <SelectValue placeholder="Cliente" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        {selectableClients.map((c) => (
                          <SelectItem key={c.id} value={c.id} className="text-white">
                            {c.name} ({c.diasPagamento}d)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-3 sm:col-span-2 space-y-1">
                    <Label className="text-slate-400 text-xs">{index === 0 ? "Custo/p/p" : ""}</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={item.baseCost || ""}
                      onChange={(e) =>
                        updateAccommodation(item.id, { baseCost: parseFloat(e.target.value) || 0 })
                      }
                      className="bg-slate-700/50 border-slate-600 text-white h-8 text-sm"
                    />
                  </div>
                  <div className="col-span-3 sm:col-span-2 space-y-1">
                    <Label className="text-slate-400 text-xs">{index === 0 ? "Pessoas" : ""}</Label>
                    <Input
                      type="number"
                      step="0.5"
                      min="0.5"
                      value={item.people || ""}
                      onChange={(e) =>
                        updateAccommodation(item.id, { people: parseFloat(e.target.value) || 1 })
                      }
                      className="bg-slate-700/50 border-slate-600 text-white h-8 text-sm"
                    />
                  </div>
                  <div className="col-span-6 sm:col-span-2 space-y-1">
                    <Label className="text-slate-400 text-xs">{index === 0 ? "Dias" : ""}</Label>
                    <Input
                      type="number"
                      min="1"
                      value={item.days || ""}
                      onChange={(e) =>
                        updateAccommodation(item.id, { days: parseInt(e.target.value) || 1 })
                      }
                      className="bg-slate-700/50 border-slate-600 text-white h-8 text-sm"
                    />
                  </div>
                  <div className="col-span-6 sm:col-span-3 flex items-center gap-1 justify-end">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeAccommodation(item.id)}
                      disabled={accommodation.length === 1}
                      className="text-red-400 hover:bg-red-500/20 h-8 px-1"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                {item.baseCost > 0 && (
                  <div className="flex items-center gap-2 text-xs pl-1">
                    <span className="text-slate-500">
                      Base: {formatCurrency(item.baseCost)} → c/ BDI: {formatCurrency(bdiPrice)}
                    </span>
                    <span className="text-emerald-400 font-medium">
                      Total: {formatCurrency(itemTotal)}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Transport */}
      <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
        <CardHeader className="pb-2 px-3 pt-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm text-white flex items-center gap-2">
              <Car className="w-4 h-4 text-cyan-400" />
              Transporte
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge className="bg-slate-700 text-white">{formatCurrency(transportTotal)}</Badge>
              <Button
                size="sm"
                variant="ghost"
                onClick={resetTransport}
                className="text-red-400 hover:bg-red-500/20 h-7 px-2"
                title="Zerar"
              >
                <RotateCcw className="w-3 h-3" />
              </Button>
              <Button
                size="sm"
                onClick={addTransport}
                className="bg-slate-600 hover:bg-slate-500 h-7 px-2"
              >
                <Plus className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-3 pb-3 space-y-2">
          {/* KM Total from Horas Viajadas */}
          <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-3 mb-2">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="text-cyan-300 text-sm font-medium">KM Total</span>
                <span className="text-cyan-100 text-lg font-bold">{totalKmFromViagens.toLocaleString('pt-BR')} km</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-cyan-300 text-sm font-medium">Viagens</span>
                <span className="text-cyan-100 text-lg font-bold">{totalViagensFromHoras}x</span>
              </div>
            </div>
            <p className="text-cyan-400/70 text-xs mt-1">Dados da aba "Horas Viajadas"</p>
          </div>

          {transport.map((item, index) => {
            const vehicle = VEHICLES.find(v => v.id === item.vehicleId) || VEHICLES[0];
            const useKm = item.manualKm > 0 ? item.manualKm : totalKmFromViagens;
            const useViagens = item.manualViagens > 0 ? item.manualViagens : (totalViagensFromHoras || 1);
            const isManual = item.manualKm > 0 || item.manualViagens > 0;
            const costPerKm = item.kmPerLiter > 0 ? item.gasPricePerLiter / item.kmPerLiter : 0;
            const gasCost = useKm * costPerKm;
            const baseCost = (gasCost + item.toll) * useViagens;
            const bdiPrice = getItemBDIPrice(baseCost, item.clientId);

            return (
              <div key={item.id} className="space-y-1">
                <div className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-6 sm:col-span-2 space-y-1">
                    <Label className="text-slate-400 text-xs">{index === 0 ? "Cliente" : ""}</Label>
                    <Select
                      value={item.clientId}
                      onValueChange={(value) => updateTransport(item.id, { clientId: value })}
                    >
                      <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white h-8 text-sm">
                        <SelectValue placeholder="Cliente" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        {selectableClients.map((c) => (
                          <SelectItem key={c.id} value={c.id} className="text-white">
                            {c.name} ({c.diasPagamento}d)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-6 sm:col-span-2 space-y-1">
                    <Label className="text-slate-400 text-xs">{index === 0 ? "Veículo" : ""}</Label>
                    <Select
                      value={item.vehicleId || "gol"}
                      onValueChange={(value) => updateTransport(item.id, { vehicleId: value })}
                    >
                      <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white h-8 text-sm">
                        <SelectValue placeholder="Veículo" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        {VEHICLES.map((v) => (
                          <SelectItem key={v.id} value={v.id} className="text-white">
                            {v.name} ({v.capacity}p)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-3 sm:col-span-2 space-y-1">
                    <Label className="text-slate-400 text-xs">{index === 0 ? "R$/Litro" : ""}</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={item.gasPricePerLiter || ""}
                      onChange={(e) =>
                        updateTransport(item.id, { gasPricePerLiter: parseFloat(e.target.value) || 0 })
                      }
                      className="bg-slate-700/50 border-slate-600 text-white h-8 text-sm"
                    />
                  </div>
                  <div className="col-span-3 sm:col-span-2 space-y-1">
                    <Label className="text-slate-400 text-xs">{index === 0 ? "KM/L" : ""}</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={item.kmPerLiter || ""}
                      onChange={(e) =>
                        updateTransport(item.id, { kmPerLiter: parseFloat(e.target.value) || 0 })
                      }
                      className="bg-slate-700/50 border-slate-600 text-white h-8 text-sm"
                    />
                  </div>
                  <div className="col-span-3 sm:col-span-2 space-y-1">
                    <Label className="text-slate-400 text-xs">{index === 0 ? "Pedágio" : ""}</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={item.toll || ""}
                      onChange={(e) =>
                        updateTransport(item.id, { toll: parseFloat(e.target.value) || 0 })
                      }
                      className="bg-slate-700/50 border-slate-600 text-white h-8 text-sm"
                    />
                  </div>
                  <div className="col-span-3 sm:col-span-2 flex items-center gap-1 justify-end">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeTransport(item.id)}
                      disabled={transport.length === 1}
                      className="text-red-400 hover:bg-red-500/20 h-8 px-1"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                {/* Manual KM/Viagens row */}
                <div className="grid grid-cols-12 gap-2 items-end mt-2">
                  <div className="col-span-6 sm:col-span-3">
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded px-2 py-1">
                      <p className="text-amber-400/70 text-xs">Ou digite manualmente:</p>
                    </div>
                  </div>
                  <div className="col-span-3 sm:col-span-2 space-y-1">
                    <Label className="text-amber-400 text-xs">{index === 0 ? "KM Manual" : ""}</Label>
                    <Input
                      type="number"
                      step="1"
                      placeholder="0"
                      value={item.manualKm || ""}
                      onChange={(e) =>
                        updateTransport(item.id, { manualKm: parseFloat(e.target.value) || 0 })
                      }
                      className="bg-amber-500/10 border-amber-500/30 text-white h-8 text-sm placeholder:text-slate-500"
                    />
                  </div>
                  <div className="col-span-3 sm:col-span-2 space-y-1">
                    <Label className="text-amber-400 text-xs">{index === 0 ? "Viagens" : ""}</Label>
                    <Input
                      type="number"
                      step="1"
                      min="1"
                      placeholder="1"
                      value={item.manualViagens || ""}
                      onChange={(e) =>
                        updateTransport(item.id, { manualViagens: parseInt(e.target.value) || 0 })
                      }
                      className="bg-amber-500/10 border-amber-500/30 text-white h-8 text-sm placeholder:text-slate-500"
                    />
                  </div>
                  <div className="col-span-6 sm:col-span-5"></div>
                </div>
                {(useKm > 0 || item.toll > 0) && (
                  <div className="flex items-center gap-2 text-xs pl-1 flex-wrap">
                    <span className="text-cyan-400">
                      {vehicle.name} ({vehicle.capacity}p)
                    </span>
                    {isManual && (
                      <span className="text-amber-400">
                        [Manual]
                      </span>
                    )}
                    <span className="text-slate-500">
                      <Fuel className="w-3 h-3 inline mr-1" />
                      {useKm.toLocaleString('pt-BR')}km × R${costPerKm.toFixed(2)}/km = {formatCurrency(gasCost)}
                    </span>
                    {item.toll > 0 && (
                      <span className="text-slate-500">
                        + Pedágio: {formatCurrency(item.toll)}
                      </span>
                    )}
                    {useViagens > 1 && (
                      <span className="text-slate-500">
                        × {useViagens} viagens
                      </span>
                    )}
                    <span className="text-slate-400">
                      Base: {formatCurrency(baseCost)}
                    </span>
                    <span className="text-emerald-400 font-medium">
                      c/ BDI: {formatCurrency(bdiPrice)}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Meals */}
      <MealSection
        title="Almoço"
        icon={UtensilsCrossed}
        iconColor="text-amber-400"
        items={lunches}
        type="lunch"
        total={lunchTotal}
        onSync={() => syncLaborToMeals("lunch")}
      />
      <MealSection
        title="Janta"
        icon={Moon}
        iconColor="text-purple-400"
        items={dinners}
        type="dinner"
        total={dinnerTotal}
        onSync={() => syncLaborToMeals("dinner")}
      />
      <MealSection
        title="Café"
        icon={Coffee}
        iconColor="text-orange-400"
        items={breakfasts}
        type="breakfast"
        total={breakfastTotal}
        onSync={() => syncLaborToMeals("breakfast")}
      />
    </div>
  );
}
