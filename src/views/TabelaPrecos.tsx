"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Plus, Trash2, Users, HardHat, Clock, DollarSign, 
  Loader2, Pencil, X, Check 
} from "lucide-react";
import { invalidatePriceTableCache } from "@/hooks/usePriceTable";

interface LaborClient {
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

interface WorkerType {
  id: number;
  worker_id: string;
  name: string;
  icon: string;
}

interface HourType {
  id: number;
  hour_id: string;
  name: string;
  multiplier: number;
}

interface WorkerRate {
  id: number;
  worker_id: string;
  client_id: string;
  rate: number;
}

interface PriceTableData {
  clients: LaborClient[];
  workers: WorkerType[];
  hourTypes: HourType[];
  rates: WorkerRate[];
}

export default function TabelaPrecos() {
  const [data, setData] = useState<PriceTableData | null>(null);
  const [loading, setLoading] = useState(true);

  // New item forms
  const [newClient, setNewClient] = useState({ client_id: "", name: "", dias: 30, negotiation_pct: 8 });
  const [newWorker, setNewWorker] = useState({ worker_id: "", name: "", icon: "👷" });
  const [newHourType, setNewHourType] = useState({ hour_id: "", name: "", multiplier: 1 });
  const [showNewClient, setShowNewClient] = useState(false);
  const [showNewWorker, setShowNewWorker] = useState(false);
  const [showNewHourType, setShowNewHourType] = useState(false);

  // Editing states
  const [editingClient, setEditingClient] = useState<number | null>(null);
  const [editingWorker, setEditingWorker] = useState<number | null>(null);
  const [editingHourType, setEditingHourType] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<Record<string, unknown>>({});

  const fetchData = async (invalidateCache = false) => {
    try {
      const res = await fetch("/api/price-table", { cache: "no-store" });
      if (res.ok) {
        const result = await res.json();
        setData(result);
        if (invalidateCache) invalidatePriceTableCache();
      }
    } catch (error) {
      console.error("Error fetching price table:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, []);

  const getRate = (workerId: string, clientId: string): number =>
    data?.rates.find((r) => r.worker_id === workerId && r.client_id === clientId)?.rate || 0;

  // Client operations
  const addClient = async () => {
    if (!newClient.client_id || !newClient.name) return;
    try {
      const res = await fetch("/api/price-table/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newClient),
      });
      if (res.ok) {
        setNewClient({ client_id: "", name: "", dias: 30, negotiation_pct: 8 });
        setShowNewClient(false);
        await fetchData(true);
      }
    } catch (error) {
      console.error("Error adding client:", error);
    }
  };

  const updateClient = async (id: number) => {
    try {
      await fetch(`/api/price-table/clients/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editValues),
      });
      setEditingClient(null);
      await fetchData(true);
    } catch (error) {
      console.error("Error updating client:", error);
    }
  };

  const deleteClient = async (id: number) => {
    if (!confirm("Desativar este cliente? Ele deixará de aparecer em novos orçamentos, mas o histórico será preservado.")) return;
    try {
      await fetch(`/api/price-table/clients/${id}`, { method: "DELETE" });
      await fetchData(true);
    } catch (error) {
      console.error("Error deleting client:", error);
    }
  };

  // Worker operations
  const addWorker = async () => {
    if (!newWorker.worker_id || !newWorker.name) return;
    try {
      const res = await fetch("/api/price-table/workers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newWorker),
      });
      if (res.ok) {
        setNewWorker({ worker_id: "", name: "", icon: "👷" });
        setShowNewWorker(false);
        await fetchData(true);
      }
    } catch (error) {
      console.error("Error adding worker:", error);
    }
  };

  const updateWorker = async (id: number) => {
    try {
      await fetch(`/api/price-table/workers/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editValues),
      });
      setEditingWorker(null);
      await fetchData(true);
    } catch (error) {
      console.error("Error updating worker:", error);
    }
  };

  const deleteWorker = async (id: number) => {
    if (!confirm("Excluir esta função? As taxas relacionadas também serão excluídas.")) return;
    try {
      await fetch(`/api/price-table/workers/${id}`, { method: "DELETE" });
      await fetchData(true);
    } catch (error) {
      console.error("Error deleting worker:", error);
    }
  };

  // Hour type operations
  const addHourType = async () => {
    if (!newHourType.hour_id || !newHourType.name) return;
    try {
      const res = await fetch("/api/price-table/hour-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newHourType),
      });
      if (res.ok) {
        setNewHourType({ hour_id: "", name: "", multiplier: 1 });
        setShowNewHourType(false);
        await fetchData(true);
      }
    } catch (error) {
      console.error("Error adding hour type:", error);
    }
  };

  const updateHourType = async (id: number) => {
    try {
      await fetch(`/api/price-table/hour-types/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editValues),
      });
      setEditingHourType(null);
      await fetchData(true);
    } catch (error) {
      console.error("Error updating hour type:", error);
    }
  };

  const deleteHourType = async (id: number) => {
    if (!confirm("Excluir este tipo de hora?")) return;
    try {
      await fetch(`/api/price-table/hour-types/${id}`, { method: "DELETE" });
      await fetchData(true);
    } catch (error) {
      console.error("Error deleting hour type:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Erro ao carregar dados
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Clients Section */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="w-5 h-5 text-blue-500" />
              Clientes
            </CardTitle>
            <Button size="sm" onClick={() => setShowNewClient(!showNewClient)}>
              <Plus className="w-4 h-4 mr-1" />
              Novo
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {showNewClient && (
            <div className="flex gap-2 p-3 bg-muted/50 rounded-lg">
              <Input
                placeholder="ID (ex: acme)"
                value={newClient.client_id}
                onChange={(e) => setNewClient(prev => ({ ...prev, client_id: e.target.value.toLowerCase().replace(/\s/g, '') }))}
                className="w-28"
              />
              <Input
                placeholder="Nome"
                value={newClient.name}
                onChange={(e) => setNewClient(prev => ({ ...prev, name: e.target.value }))}
              />
              <Input
                type="number"
                placeholder="Dias"
                value={newClient.dias}
                onChange={(e) => setNewClient(prev => ({ ...prev, dias: Number(e.target.value) }))}
                className="w-20"
              />
              <Input
                type="number"
                step="0.1"
                placeholder="Neg.%"
                value={newClient.negotiation_pct}
                onChange={(e) => setNewClient(prev => ({ ...prev, negotiation_pct: Number(e.target.value) }))}
                className="w-20"
                title="Margem de negociação do cliente"
              />
              <Button size="sm" onClick={addClient}>
                <Check className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowNewClient(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}
          
          <div className="space-y-2">
            {data.clients.filter((client) => client.active !== false).map((client) => (
              <div key={client.id} className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
                {editingClient === client.id ? (
                  <>
                    <Input
                      value={(editValues as { name?: string }).name ?? client.name}
                      onChange={(e) => setEditValues(prev => ({ ...prev, name: e.target.value }))}
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      value={(editValues as { dias?: number }).dias ?? client.dias}
                      onChange={(e) => setEditValues(prev => ({ ...prev, dias: Number(e.target.value) }))}
                      className="w-20"
                    />
                    <Input
                      type="number"
                      step="0.1"
                      value={(editValues as { negotiation_pct?: number }).negotiation_pct ?? client.negotiation_pct}
                      onChange={(e) => setEditValues(prev => ({ ...prev, negotiation_pct: Number(e.target.value) }))}
                      className="w-20"
                      title="Negociação %"
                    />
                    <Button size="sm" onClick={() => updateClient(client.id)}>
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingClient(null)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="text-xs text-muted-foreground w-16">{client.client_id}</span>
                    <span className="flex-1 font-medium">{client.name}</span>
                    <span className="text-sm text-muted-foreground">{client.dias} dias</span>
                    <span className="text-xs text-emerald-600">Neg. {client.negotiation_pct}%</span>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => {
                        setEditingClient(client.id);
                        setEditValues({ name: client.name, dias: client.dias, negotiation_pct: client.negotiation_pct });
                      }}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="text-destructive"
                      onClick={() => deleteClient(client.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Workers Section */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <HardHat className="w-5 h-5 text-amber-500" />
              Funções (Tipos de Trabalhador)
            </CardTitle>
            <Button size="sm" onClick={() => setShowNewWorker(!showNewWorker)}>
              <Plus className="w-4 h-4 mr-1" />
              Nova
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {showNewWorker && (
            <div className="flex gap-2 p-3 bg-muted/50 rounded-lg">
              <Input
                placeholder="ID (ex: eletricista)"
                value={newWorker.worker_id}
                onChange={(e) => setNewWorker(prev => ({ ...prev, worker_id: e.target.value.toLowerCase().replace(/\s/g, '') }))}
                className="w-36"
              />
              <Input
                placeholder="Nome"
                value={newWorker.name}
                onChange={(e) => setNewWorker(prev => ({ ...prev, name: e.target.value }))}
              />
              <Input
                placeholder="Ícone"
                value={newWorker.icon}
                onChange={(e) => setNewWorker(prev => ({ ...prev, icon: e.target.value }))}
                className="w-16"
              />
              <Button size="sm" onClick={addWorker}>
                <Check className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowNewWorker(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}
          
          <div className="space-y-2">
            {data.workers.map((worker) => (
              <div key={worker.id} className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
                {editingWorker === worker.id ? (
                  <>
                    <Input
                      value={(editValues as { icon?: string }).icon ?? worker.icon}
                      onChange={(e) => setEditValues(prev => ({ ...prev, icon: e.target.value }))}
                      className="w-16"
                    />
                    <Input
                      value={(editValues as { name?: string }).name ?? worker.name}
                      onChange={(e) => setEditValues(prev => ({ ...prev, name: e.target.value }))}
                      className="flex-1"
                    />
                    <Button size="sm" onClick={() => updateWorker(worker.id)}>
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingWorker(null)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="text-xl w-8">{worker.icon}</span>
                    <span className="text-xs text-muted-foreground w-24">{worker.worker_id}</span>
                    <span className="flex-1 font-medium">{worker.name}</span>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => {
                        setEditingWorker(worker.id);
                        setEditValues({ name: worker.name, icon: worker.icon });
                      }}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="text-destructive"
                      onClick={() => deleteWorker(worker.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Hour Types Section */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="w-5 h-5 text-purple-500" />
              Tipos de Hora
            </CardTitle>
            <Button size="sm" onClick={() => setShowNewHourType(!showNewHourType)}>
              <Plus className="w-4 h-4 mr-1" />
              Novo
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {showNewHourType && (
            <div className="flex gap-2 p-3 bg-muted/50 rounded-lg">
              <Input
                placeholder="ID (ex: 150)"
                value={newHourType.hour_id}
                onChange={(e) => setNewHourType(prev => ({ ...prev, hour_id: e.target.value.toLowerCase().replace(/\s/g, '') }))}
                className="w-24"
              />
              <Input
                placeholder="Nome (ex: 150%)"
                value={newHourType.name}
                onChange={(e) => setNewHourType(prev => ({ ...prev, name: e.target.value }))}
              />
              <Input
                type="number"
                step="0.1"
                placeholder="Multiplicador"
                value={newHourType.multiplier}
                onChange={(e) => setNewHourType(prev => ({ ...prev, multiplier: Number(e.target.value) }))}
                className="w-28"
              />
              <Button size="sm" onClick={addHourType}>
                <Check className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowNewHourType(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}
          
          <div className="space-y-2">
            {data.hourTypes.map((hourType) => (
              <div key={hourType.id} className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
                {editingHourType === hourType.id ? (
                  <>
                    <Input
                      value={(editValues as { name?: string }).name ?? hourType.name}
                      onChange={(e) => setEditValues(prev => ({ ...prev, name: e.target.value }))}
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      step="0.1"
                      value={(editValues as { multiplier?: number }).multiplier ?? hourType.multiplier}
                      onChange={(e) => setEditValues(prev => ({ ...prev, multiplier: Number(e.target.value) }))}
                      className="w-28"
                    />
                    <Button size="sm" onClick={() => updateHourType(hourType.id)}>
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingHourType(null)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="text-xs text-muted-foreground w-16">{hourType.hour_id}</span>
                    <span className="flex-1 font-medium">{hourType.name}</span>
                    <span className="text-sm text-muted-foreground">×{hourType.multiplier}</span>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => {
                        setEditingHourType(hourType.id);
                        setEditValues({ name: hourType.name, multiplier: hourType.multiplier });
                      }}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="text-destructive"
                      onClick={() => deleteHourType(hourType.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Rates Matrix */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <DollarSign className="w-5 h-5 text-green-500" />
              Taxas por Hora (R$/hora base)
            </CardTitle>
            <span className="text-xs text-muted-foreground">Calculado automaticamente pela Calculadora HH</span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Função</th>
                  {data.clients.filter((client) => client.active !== false).map((client) => (
                    <th key={client.client_id} className="text-center p-2 min-w-[100px]">
                      {client.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.workers.map((worker) => (
                  <tr key={worker.worker_id} className="border-b border-muted">
                    <td className="p-2 font-medium">
                      <span className="mr-2">{worker.icon}</span>
                      {worker.name}
                    </td>
                    {data.clients.filter((client) => client.active !== false).map((client) => (
                      <td key={client.client_id} className="p-1 text-center">
                        <div className="h-8 px-2 flex items-center justify-center rounded-md bg-muted/40 font-mono text-emerald-600">
                          {getRate(worker.worker_id, client.client_id).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            * Valores calculados pela Calculadora HH. Alterações em salários, custos, impostos, prazo ou negociação atualizam esta tabela automaticamente.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
