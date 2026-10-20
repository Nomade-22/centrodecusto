"use client";

import { useMemo, useState } from "react";
import { FileDown, FileText, Printer, ShieldAlert, CheckCircle2, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { LaborClient, WorkerType, HourType } from "@/hooks/usePriceTable";
import type { HHSettings } from "@/lib/hh-calculator";
import type { LaborItem } from "@/views/MaoDeObra";
import type { BDIState } from "@/views/BDI";
import type { ExpensesState } from "@/views/Expenses";
import type { NotaReversaState } from "@/views/NotaReversa";
import type { NegociacaoState } from "@/views/Negociacao";
import { buildBudgetHtml, calculateBudgetExport, type ExportTrip, type ReportMode } from "@/lib/budget-export";

export interface ExportarPDFProps {
  laborItems: LaborItem[];
  laborTeamSize: number;
  initialNumero?: string;
  initialDescricao?: string;
  materials: BDIState;
  expenses: ExpensesState;
  trips: ExportTrip[];
  paymentRule: "all" | "max-hours";
  maxHours: number;
  nota: NotaReversaState;
  negociacao: NegociacaoState;
  clients: LaborClient[];
  workers: WorkerType[];
  hourTypes: HourType[];
  settings?: HHSettings;
  getRate: (workerId: string, clientId: string) => number;
  getHourMultiplier: (hourTypeId: string) => number;
  getCustoHora: (workerId: string) => number | undefined;
}

const fmt = (value: number) => value.toLocaleString("pt-BR", {style:"currency",currency:"BRL"});
export default function ExportarPDF(props: ExportarPDFProps) {
  const [modo, setModo] = useState<ReportMode>("cliente");
  const [numero, setNumero] = useState(props.initialNumero ?? "");
  const [cliente, setCliente] = useState("");
  const [descricao, setDescricao] = useState(props.initialDescricao ?? "");
  const [validade, setValidade] = useState("");
  const [prazo, setPrazo] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [confirmarConfidencial, setConfirmarConfidencial] = useState(false);
  const [erro, setErro] = useState("");

  const report = useMemo(() => calculateBudgetExport(props), [
    props.laborItems, props.materials, props.expenses, props.trips,
    props.paymentRule, props.maxHours, props.clients, props.workers,
    props.hourTypes, props.settings, props.getRate, props.getCustoHora,
    props.getHourMultiplier,
  ]);
  const nomeCliente = report.clientNames.length===1 ? report.clientNames[0] : report.clientNames.join(", ");
  const canPrint = report.total > 0 && props.clients.length > 0 &&
    (modo !== "interno" || confirmarConfidencial);

  const abrirPDF = () => {
    setErro("");
    if (!canPrint) {
      setErro(report.total<=0 ? "Adicione itens com valores antes de gerar o orçamento." :
        "Confirme a opção de relatório interno para continuar.");
      return;
    }
    const metadata = {
      numero, cliente: cliente.trim() || nomeCliente, descricao, validade,
      prazo, observacoes, modo,
    };
    // Abrir a janela de forma síncrona impede bloqueio de pop-up.
    const popup = window.open("", "_blank");
    if (!popup) {
      setErro("O navegador bloqueou a janela. Permita pop-ups para este site e tente novamente.");
      return;
    }
    try {
      popup.document.open();
      popup.document.write(buildBudgetHtml(props, metadata, report));
      popup.document.close();
    } catch {
      popup.close();
      setErro("Não foi possível montar o documento. Tente novamente.");
    }
  };

  return (
    <div className="space-y-4">
      <Card className="bg-slate-800/60 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2 text-lg">
            <FileText className="w-5 h-5 text-emerald-400"/> Exportar orçamento completo
          </CardTitle>
          <p className="text-sm text-slate-400">
            Gera um documento único em A4 com resumo geral, mão de obra, materiais,
            estadia, alimentação, transporte e horas viajadas, sem precisar abrir
            cada aba. Use a impressão do navegador para salvar como PDF.
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button type="button" onClick={()=>{setModo("cliente");setConfirmarConfidencial(false);}} aria-pressed={modo==="cliente"}
              className={`rounded-lg border p-4 text-left transition-colors ${modo==="cliente"?"bg-emerald-600/20 border-emerald-500 text-white":"border-slate-600 text-slate-300 hover:bg-slate-700/50"}`}>
              <div className="font-bold flex items-center gap-2"><CheckCircle2 className="w-4 h-4"/> Envio ao cliente</div>
              <p className="text-xs text-slate-400 mt-2">Somente itens, preços de venda, subtotais e condições comerciais. Não revela custos, lucro, tributos ou negociações internas.</p>
            </button>
            <button type="button" onClick={()=>setModo("interno")} aria-pressed={modo==="interno"}
              className={`rounded-lg border p-4 text-left transition-colors ${modo==="interno"?"bg-amber-600/20 border-amber-500 text-white":"border-slate-600 text-slate-300 hover:bg-slate-700/50"}`}>
              <div className="font-bold flex items-center gap-2"><ShieldAlert className="w-4 h-4"/> Relatório interno completo</div>
              <p className="text-xs text-slate-400 mt-2">Inclui todas as seções do orçamento, nota reversa, negociação, custos HH e tabela de preços. Confidencial.</p>
            </button>
          </div>
          {modo==="interno" && (
            <label className="flex gap-3 items-start rounded-lg border border-amber-700/50 bg-amber-950/20 p-3 text-sm text-amber-100 cursor-pointer">
              <input type="checkbox" className="mt-1 accent-amber-500" checked={confirmarConfidencial} onChange={e=>setConfirmarConfidencial(e.target.checked)}/>
              Confirmo que este documento contém custos, preços internos e informações estratégicas da Multprest e não será enviado ao cliente.
            </label>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1"><Label className="text-slate-300">Número da proposta</Label>
              <Input placeholder="Ex.: MP-2026-001" value={numero} onChange={e=>setNumero(e.target.value)} maxLength={90} className="bg-slate-700/40 border-slate-600 text-white"/></div>
            <div className="space-y-1"><Label className="text-slate-300">Cliente / destinatário</Label>
              <Input placeholder={nomeCliente||"Nome da empresa"} value={cliente} onChange={e=>setCliente(e.target.value)} maxLength={160} className="bg-slate-700/40 border-slate-600 text-white"/></div>
            <div className="space-y-1 sm:col-span-2"><Label className="text-slate-300">Objeto da proposta / descrição do serviço</Label>
              <Input placeholder="Ex.: Serviços de manutenção industrial" value={descricao} onChange={e=>setDescricao(e.target.value)} maxLength={320} className="bg-slate-700/40 border-slate-600 text-white"/></div>
            <div className="space-y-1"><Label className="text-slate-300">Validade da proposta</Label>
              <Input placeholder="Ex.: 15 dias após a emissão" value={validade} onChange={e=>setValidade(e.target.value)} maxLength={140} className="bg-slate-700/40 border-slate-600 text-white"/></div>
            <div className="space-y-1"><Label className="text-slate-300">Prazo de execução</Label>
              <Input placeholder="Ex.: 5 dias úteis" value={prazo} onChange={e=>setPrazo(e.target.value)} maxLength={140} className="bg-slate-700/40 border-slate-600 text-white"/></div>
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-slate-300">Observações e condições comerciais</Label>
              <textarea className="w-full min-h-24 rounded-md border border-slate-600 bg-slate-700/40 text-white p-3 text-sm" placeholder="Escopo, condições de pagamento, exclusões, garantia, mobilização, impostos..."
                value={observacoes} onChange={e=>setObservacoes(e.target.value)} maxLength={3000}/>
            </div>
          </div>
          <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-4">
            <p className="text-xs text-slate-400 mb-1">Valor total calculado a partir dos itens atuais (preço de venda)</p>
            <p className="text-2xl text-emerald-400 font-extrabold">{fmt(report.total)}</p>
            <p className="text-xs text-slate-400 mt-2">{report.groups.reduce((n,g)=>n+g.rows.length,0)} itens distribuídos em {report.groups.length} seções comerciais</p>
          </div>
          {report.quantityWarnings.length>0 && (
            <div className="rounded-lg border border-amber-600/40 p-3 bg-amber-950/20">
              <p className="font-semibold text-amber-300 text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4"/> Confira antes de enviar</p>
              {report.quantityWarnings.map((w,i)=><p key={i} className="text-xs text-amber-100 mt-1">{w}</p>)}
            </div>
          )}
          {erro && <p role="alert" className="text-red-400 text-sm">{erro}</p>}
          <Button onClick={abrirPDF} disabled={!canPrint} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-12">
            <FileDown className="w-5 h-5 mr-2"/> Preparar PDF completo
          </Button>
          <p className="text-xs text-slate-400 flex gap-2 items-start">
            <Printer className="w-4 h-4 shrink-0"/> Na janela que abrir, escolha a impressora
            <strong className="text-slate-200">Salvar como PDF</strong> e salve o arquivo.
            A versão para cliente não inclui o histórico, a gestão de usuários nem configurações administrativas.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
