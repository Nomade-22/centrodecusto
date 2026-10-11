'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Archive,
  Download,
  Trash2,
  Eye,
  Save,
  Calendar,
  FileText,
  BarChart3,
  DollarSign,
  CheckCircle2,
  Circle,
  TrendingUp,
  Search,
  X,
} from 'lucide-react';

interface OrcamentoListItem {
  id: number;
  numero: string;
  descricao: string | null;
  totais: string;
  is_fechado: number | null;
  created_at: string;
}

interface OrcamentoFull {
  id: number;
  numero: string;
  descricao: string | null;
  dados: string;
  totais: string;
  created_at: string;
}

interface HistoricoProps {
  onSave: (numero: string, descricao: string) => Promise<boolean>;
  onLoad: (dados: unknown) => void;
}

export default function Historico({ onSave, onLoad }: HistoricoProps) {
  const [orcamentos, setOrcamentos] = useState<OrcamentoListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [numero, setNumero] = useState('');
  const [descricao, setDescricao] = useState('');
  const [viewingOrcamento, setViewingOrcamento] = useState<OrcamentoFull | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchOrcamentos = async () => {
    setFetchError(null);
    try {
      const res = await fetch('/api/orcamentos');
      if (res.ok) {
        const data = await res.json();
        setOrcamentos(data);
      } else if (res.status === 401) {
        setFetchError('auth');
      } else {
        const body = await res.json().catch(() => ({}));
        setFetchError(body.error || `Erro ${res.status} ao carregar histórico`);
      }
    } catch (error) {
      console.error('Error fetching orcamentos:', error);
      setFetchError('Erro de conexão ao carregar histórico.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrcamentos();
  }, []);

  const handleSave = async () => {
    if (!numero.trim()) {
      alert('Por favor, informe o número do orçamento');
      return;
    }

    setSaving(true);
    const success = await onSave(numero, descricao);
    if (success) {
      setNumero('');
      setDescricao('');
      fetchOrcamentos();
    }
    setSaving(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir este orçamento?')) return;

    try {
      const res = await fetch(`/api/orcamentos/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchOrcamentos();
      }
    } catch (error) {
      console.error('Error deleting orcamento:', error);
    }
  };

  const handleToggleFechado = async (id: number, currentStatus: number | null) => {
    try {
      const res = await fetch(`/api/orcamentos/${id}/fechado`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_fechado: currentStatus ? 0 : 1 }),
      });
      if (res.ok) {
        fetchOrcamentos();
      }
    } catch (error) {
      console.error('Error toggling fechado:', error);
    }
  };

  const handleView = async (id: number) => {
    try {
      const res = await fetch(`/api/orcamentos/${id}`);
      if (res.ok) {
        const data = await res.json();
        setViewingOrcamento(data);
      } else if (res.status === 401) {
        alert('Sessão expirada. Faça login novamente.');
      } else {
        alert('Erro ao carregar orçamento. Tente novamente.');
      }
    } catch (error) {
      console.error('Error viewing orcamento:', error);
      alert('Erro de conexão ao carregar orçamento.');
    }
  };

  const handleLoadOrcamento = () => {
    if (viewingOrcamento) {
      const dados = JSON.parse(viewingOrcamento.dados);
      onLoad(dados);
      setViewingOrcamento(null);
      alert('Orçamento carregado! Vá para as outras abas para ver os dados.');
    }
  };

  const formatDate = (dateStr: string) => {
    // Parse "YYYY-MM-DD HH:MM:SS" without new Date() to avoid hydration mismatch
    const [datePart, timePart] = dateStr.split(' ');
    if (!datePart) return dateStr;
    const [year, month, day] = datePart.split('-');
    const [hour, minute] = (timePart || '00:00').split(':');
    return `${day}/${month}/${year} ${hour}:${minute}`;
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const parseTotais = (totaisStr: string) => {
    try {
      return JSON.parse(totaisStr);
    } catch {
      return {};
    }
  };

  // Filter orcamentos based on search term
  const filteredOrcamentos = orcamentos.filter((orc) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const matchNumero = orc.numero.toLowerCase().includes(term);
    const matchDescricao = orc.descricao?.toLowerCase().includes(term) || false;
    return matchNumero || matchDescricao;
  });

  if (viewingOrcamento) {
    const totais = parseTotais(viewingOrcamento.totais);
    const grandTotal =
      (totais.maoDeObra || 0) +
      (totais.material || 0) +
      (totais.estadia || 0) +
      (totais.almoco || 0) +
      (totais.janta || 0) +
      (totais.cafe || 0) +
      (totais.viagens || 0) +
      (totais.transporte || 0);

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={() => setViewingOrcamento(null)}>
            ← Voltar
          </Button>
          <Button onClick={handleLoadOrcamento} className="bg-green-600 hover:bg-green-700">
            <Download className="w-4 h-4 mr-2" />
            Carregar Este Orçamento
          </Button>
        </div>

        <Card className="bg-gradient-to-br from-blue-600 to-blue-700 text-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Orçamento #{viewingOrcamento.numero}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {viewingOrcamento.descricao && (
              <p className="text-blue-100">{viewingOrcamento.descricao}</p>
            )}
            <div className="flex items-center gap-2 text-blue-100 text-sm">
              <Calendar className="w-4 h-4" />
              {formatDate(viewingOrcamento.created_at)}
            </div>
            <div className="mt-4 pt-4 border-t border-blue-400">
              <p className="text-sm text-blue-100">Total Geral</p>
              <p className="text-3xl font-bold">{formatCurrency(grandTotal)}</p>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Mão de Obra', value: totais.maoDeObra || 0, color: 'bg-purple-500' },
            { label: 'Material', value: totais.material || 0, color: 'bg-orange-500' },
            { label: 'Estadia', value: totais.estadia || 0, color: 'bg-green-500' },
            { label: 'Almoço', value: totais.almoco || 0, color: 'bg-yellow-500' },
            { label: 'Janta', value: totais.janta || 0, color: 'bg-red-500' },
            { label: 'Café', value: totais.cafe || 0, color: 'bg-amber-500' },
            { label: 'Horas Viajadas', value: totais.viagens || 0, color: 'bg-blue-500' },
            { label: 'Transporte', value: totais.transporte || 0, color: 'bg-cyan-500' },
          ].map((item) => (
            <Card key={item.label} className="overflow-hidden">
              <div className={`h-1 ${item.color}`} />
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className="font-semibold">{formatCurrency(item.value)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPIs Section */}
      {orcamentos.length > 0 &&
        (() => {
          const totalValue = orcamentos.reduce((sum, orc) => {
            const totais = parseTotais(orc.totais);
            return (
              sum +
              (totais.maoDeObra || 0) +
              (totais.material || 0) +
              (totais.estadia || 0) +
              (totais.almoco || 0) +
              (totais.janta || 0) +
              (totais.cafe || 0) +
              (totais.viagens || 0) +
              (totais.transporte || 0)
            );
          }, 0);
          const fechados = orcamentos.filter((orc) => orc.is_fechado);
          const fechadosValue = fechados.reduce((sum, orc) => {
            const totais = parseTotais(orc.totais);
            return (
              sum +
              (totais.maoDeObra || 0) +
              (totais.material || 0) +
              (totais.estadia || 0) +
              (totais.almoco || 0) +
              (totais.janta || 0) +
              (totais.cafe || 0) +
              (totais.viagens || 0) +
              (totais.transporte || 0)
            );
          }, 0);
          const fechadosPercent =
            orcamentos.length > 0 ? (fechados.length / orcamentos.length) * 100 : 0;

          return (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 border-blue-500/30">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-full bg-blue-500/20">
                      <BarChart3 className="w-5 h-5 text-blue-400" />
                    </div>
                    <p className="text-sm text-slate-400">Total de Orçamentos</p>
                  </div>
                  <p className="text-3xl font-bold text-white">{orcamentos.length}</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-green-500/20 to-emerald-600/20 border-green-500/30">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-full bg-green-500/20">
                      <DollarSign className="w-5 h-5 text-green-400" />
                    </div>
                    <p className="text-sm text-slate-400">Valor Total</p>
                  </div>
                  <p className="text-xl sm:text-2xl font-bold text-white truncate">
                    {formatCurrency(totalValue)}
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-amber-500/20 to-orange-600/20 border-amber-500/30">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-full bg-amber-500/20">
                      <TrendingUp className="w-5 h-5 text-amber-400" />
                    </div>
                    <p className="text-sm text-slate-400">Taxa de Fechamento</p>
                  </div>
                  <p className="text-3xl font-bold text-white">{fechadosPercent.toFixed(0)}%</p>
                  <p className="text-xs text-slate-500 mt-1">{fechados.length} fechados</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-purple-500/20 to-violet-600/20 border-purple-500/30">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-full bg-purple-500/20">
                      <CheckCircle2 className="w-5 h-5 text-purple-400" />
                    </div>
                    <p className="text-sm text-slate-400">Valor Fechado</p>
                  </div>
                  <p className="text-xl sm:text-2xl font-bold text-white truncate">
                    {formatCurrency(fechadosValue)}
                  </p>
                </CardContent>
              </Card>
            </div>
          );
        })()}

      {/* Save Section */}
      <Card className="border-2 border-dashed border-primary/30 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Save className="w-5 h-5 text-primary" />
            Salvar Orçamento Atual
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="numero">Número do Orçamento *</Label>
              <Input
                id="numero"
                placeholder="Ex: 2024-001"
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição (opcional)</Label>
              <Input
                id="descricao"
                placeholder="Ex: Manutenção Empresa XYZ"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
              />
            </div>
          </div>
          <Button
            onClick={handleSave}
            disabled={saving || !numero.trim()}
            className="w-full md:w-auto"
          >
            <Archive className="w-4 h-4 mr-2" />
            {saving ? 'Salvando...' : 'Salvar Orçamento'}
          </Button>
        </CardContent>
      </Card>

      {/* List Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Archive className="w-5 h-5" />
            Orçamentos Salvos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Search Bar */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar por número ou descrição..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-10"
            />
            {searchTerm && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchTerm('')}
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>

          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : fetchError === 'auth' ? (
            <div className="text-center py-8 space-y-3">
              <p className="text-red-400 font-medium">Sessão expirada ou não autenticado.</p>
              <p className="text-muted-foreground text-sm">
                Faça login novamente para ver o histórico.
              </p>
              <Button variant="outline" onClick={fetchOrcamentos}>
                Tentar novamente
              </Button>
            </div>
          ) : fetchError ? (
            <div className="text-center py-8 space-y-3">
              <p className="text-red-400">{fetchError}</p>
              <Button variant="outline" onClick={fetchOrcamentos}>
                Tentar novamente
              </Button>
            </div>
          ) : filteredOrcamentos.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm
                ? 'Nenhum orçamento encontrado para esta pesquisa.'
                : 'Nenhum orçamento salvo ainda.'}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredOrcamentos.map((orc) => {
                const totais = parseTotais(orc.totais);
                const grandTotal =
                  (totais.maoDeObra || 0) +
                  (totais.material || 0) +
                  (totais.estadia || 0) +
                  (totais.almoco || 0) +
                  (totais.janta || 0) +
                  (totais.cafe || 0) +
                  (totais.viagens || 0) +
                  (totais.transporte || 0);

                return (
                  <div
                    key={orc.id}
                    className={`flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors ${
                      orc.is_fechado ? 'bg-green-500/10 border border-green-500/30' : 'bg-muted/50'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-primary">#{orc.numero}</span>
                        {orc.is_fechado && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-green-500/20 text-green-400 rounded-full">
                            Fechado
                          </span>
                        )}
                        {orc.descricao && (
                          <span className="text-muted-foreground truncate">— {orc.descricao}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(orc.created_at)}
                        </span>
                        <span className="font-medium text-foreground">
                          {formatCurrency(grandTotal)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleFechado(orc.id, orc.is_fechado)}
                        title={orc.is_fechado ? 'Marcar como aberto' : 'Marcar como fechado'}
                        className={
                          orc.is_fechado
                            ? 'text-green-400 hover:text-green-500'
                            : 'text-muted-foreground'
                        }
                      >
                        {orc.is_fechado ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : (
                          <Circle className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleView(orc.id)}
                        title="Ver detalhes"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(orc.id)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
