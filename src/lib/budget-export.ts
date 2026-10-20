import { calculateBDIPrice } from "@/lib/bdi";
import { effectiveMaterialNegotiationPct, materialOfferPrice } from "@/lib/material-negotiation";
import type { LaborItem } from "@/views/MaoDeObra";
import type { BDIState } from "@/views/BDI";
import type { ExpensesState } from "@/views/Expenses";
import type { NotaReversaState } from "@/views/NotaReversa";
import type { NegociacaoState } from "@/views/Negociacao";
import type { HourType, LaborClient, WorkerType } from "@/hooks/usePriceTable";
import type { HHSettings } from "@/lib/hh-calculator";

export interface ExportTrip {
  origin: string; destination: string; tripType: "one-way" | "round-trip";
  people: number; days: number; clientId: string; workerTypeId: string;
  hourTypeId: string; ratePerHour: number | null; manualHours: number | null;
  distanceKm: number | null; durationMinutes: number | null;
}
export interface BudgetExportData {
  laborItems: LaborItem[];
  laborTeamSize: number;
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
export type ReportMode = "cliente" | "interno";
export interface BudgetExportMetadata {
  numero: string; cliente: string; descricao: string; validade: string;
  prazo: string; observacoes: string; modo: ReportMode;
}
export interface ExportRow {
  cells: string[];
  amount: number;
  cost?: number;
}
export interface ExportGroup {
  label: string; columns: string[]; rows: ExportRow[];
  total: number; costTotal?: number;
}
export interface BudgetExportReport {
  groups: ExportGroup[];
  total: number;
  totalCost: number;
  travelKm: number;
  quantityWarnings: string[];
  clientNames: string[];
}

const money = (n: number) => (Number.isFinite(n) ? n : 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const dec = (n: number, digits=2) => (Number.isFinite(n) ? n : 0).toLocaleString("pt-BR", {minimumFractionDigits:digits, maximumFractionDigits:digits});
const num = (value: unknown) => { const result=Number(value); return Number.isFinite(result) ? result : 0; };
const positive = (value: unknown) => Math.max(0, num(value));
const escapeHtml = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[char] ?? char));
const fmt = (value: unknown) => escapeHtml(value);

export function calculateBudgetExport(data: BudgetExportData): BudgetExportReport {
  const getClient = (id: string) => data.clients.find(c=>c.client_id===id);
  const clientName = (id: string) => getClient(id)?.name || data.expenses.clients.find(c=>c.id===id)?.name || id || "—";
  const workerName = (id: string) => data.workers.find(w=>w.worker_id===id)?.name || id || "—";
  const hourName = (id: string) => data.hourTypes.find(h=>h.hour_id===id)?.name || id || "Normal";
  const activeClients = new Set<string>();
  const warnings: string[] = [];
  const registerClient = (id: string, value: number) => { if(value>0&&id) activeClients.add(clientName(id)); };

  const laborRows: ExportRow[] = data.laborItems.map((item,index)=>{
    const people=positive(item.people),days=positive(item.days),hours=positive(item.hours);
    const rate=positive(data.getRate(item.workerTypeId,item.clientId))*positive(data.getHourMultiplier(item.hourTypeId));
    const amount=rate*hours*people*days;
    const cost=positive(data.getCustoHora(item.workerTypeId))*positive(data.getHourMultiplier(item.hourTypeId))*hours*people*days;
    registerClient(item.clientId,amount);
    if(people>0&&days>0&&hours>0&&rate===0)warnings.push(`Mão de obra #${index+1} não possui preço/hora cadastrado.`);
    return {cells:[item.title?.trim()||workerName(item.workerTypeId),workerName(item.workerTypeId),hourName(item.hourTypeId),String(people),String(days),dec(hours),money(rate)],amount,cost};
  }).filter((row,itemIndex)=>row.amount>0||(positive(data.laborItems[itemIndex]?.people)>0&&positive(data.laborItems[itemIndex]?.days)>0));
  const labor = group("Mão de obra",["Descrição","Função","Hora","Pess.","Dias","h/dia","R$/h"],laborRows);

  const materialRows: ExportRow[] = (data.materials.materials||[]).map((item,index)=>{
    const cost=positive(item.valorMaterial);
    const c=getClient(item.clientId);
    const days=positive(c?.dias??data.materials.diasPagamento);
    const das=positive(data.materials.simplesIssqn??data.settings?.das_effective_pct??10.81);
    const iss=positive(c?.iss_retained_pct??data.settings?.default_iss_retained_pct??4.36);
    const inss=positive(data.materials.inss||c?.inss_retained_pct||data.settings?.default_inss_retained_pct||0);
    const lucro=positive(data.materials.lucroPercent);
    const troca=positive(data.materials.trocaNota);
    const juros=positive(data.materials.jurosDia??data.settings?.anticipation_daily_pct??0.1);
    const negotiation=effectiveMaterialNegotiationPct(c?.negotiation_pct??0,item.negotiationOverridePct,data.materials.descontoCompras);
    const rate=c?.anticipate===false?0:days*juros;
    const receivable=Math.max(0,1-(iss+inss)/100);
    const divisor=1-(das+lucro+troca)/100-(rate/100)*receivable;
    const base=cost>0&&divisor>0?cost/divisor:0;
    const amount=materialOfferPrice(base,negotiation);
    registerClient(item.clientId,amount);
    if(cost>0&&amount===0)warnings.push(`Material #${index+1} com custo, mas sem preço de venda válido.`);
    return {cells:[item.description?.trim()||`Material #${index+1}`,clientName(item.clientId),"1",money(amount)],amount,cost};
  }).filter(row=>row.amount>0||(row.cost??0)>0);
  const materials=group("Materiais",["Descrição","Cliente","Qtd.","Preço de venda"],materialRows);

  let kmTotal=0, tripsTotal=0;
  const travelRows: ExportRow[]=data.trips.map((item,index)=>{
    const directMinutes=positive(item.manualHours)>0?positive(item.manualHours)*60:positive(item.durationMinutes);
    const multiplier=item.tripType==="round-trip"?2:1;
    const days=positive(item.days),people=positive(item.people);
    const allMinutes=directMinutes*multiplier*days;
    const hours=allMinutes/60;
    const paid=directMinutes>0&&(data.paymentRule==="all"||hours<=positive(data.maxHours));
    const rate=positive(data.getRate(item.workerTypeId,item.clientId))*positive(data.getHourMultiplier(item.hourTypeId));
    const costRate=positive(data.getCustoHora(item.workerTypeId))*positive(data.getHourMultiplier(item.hourTypeId));
    const distance=positive(item.distanceKm)*multiplier*days;
    const amount=paid?hours*people*rate:0;
    const cost=paid?hours*people*costRate:0;
    kmTotal+=distance;
    tripsTotal+=days;
    registerClient(item.clientId,amount);
    if((item.origin||item.destination)&&!directMinutes)warnings.push(`Trecho #${index+1} sem tempo de viagem informado ou calculado.`);
    return {cells:[`${item.origin||"Origem"} → ${item.destination||"Destino"}`,item.tripType==="round-trip"?"Ida e volta":"Ida",String(people),String(days),dec(distance,1)+" km",dec(hours,2)+" h",paid?"Sim":"Não"],amount,cost};
  }).filter((row,index)=>row.amount>0||Boolean(data.trips[index]?.origin||data.trips[index]?.destination));
  const travel=group("Horas viajadas",["Trajeto","Tipo","Pess.","Dias","Distância","Horas","Pago"],travelRows);

  const expensePrice=(cost:number, clientId:string)=>{
    const c=getClient(clientId),legacy=data.expenses.clients.find(x=>x.id===clientId);
    return calculateBDIPrice(cost,num(c?.dias??legacy?.diasPagamento??30),{
      das:num(data.settings?.das_effective_pct??10.81),
      lucro:10,
      jurosDia:num(data.settings?.anticipation_daily_pct??0.1),
      trocaNota:0,
      descontoCompras:num(c?.negotiation_pct??0),
      issRetido:num(c?.iss_retained_pct??data.settings?.default_iss_retained_pct??4.36),
      inssRetido:num(c?.inss_retained_pct??data.settings?.default_inss_retained_pct??0),
      anticipate:c?.anticipate??true,
    });
  };
  const expenseRows:ExportRow[]=[];
  const meals: Array<[string, Array<{baseCost:number;clientId:string;people:number;days:number;location?:string}>]>=[
    ["Estadia",data.expenses.accommodation],
    ["Almoço",data.expenses.lunches],
    ["Janta",data.expenses.dinners],
    ["Café da manhã",data.expenses.breakfasts],
  ];
  for(const [label,items] of meals){
    items.forEach((item)=>{
      const costUnit=positive(item.baseCost);
      const count=positive(item.people)*positive(item.days);
      const amount=expensePrice(costUnit,item.clientId)*count;
      const cost=costUnit*count;
      registerClient(item.clientId,amount);
      if(!amount&&!cost)return;
      const location="location" in item&&item.location?String(item.location):"—";
      expenseRows.push({cells:[label,location,clientName(item.clientId),String(positive(item.people)),String(positive(item.days)),money(expensePrice(costUnit,item.clientId))],amount,cost});
    });
  }
  const expense=group("Estadia e alimentação",["Item","Local","Cliente","Pess.","Dias","Preço unit."],expenseRows);

  const transportRows:ExportRow[]=data.expenses.transport.map((item,index)=>{
    const km=positive(item.manualKm)>0?positive(item.manualKm):kmTotal;
    const trips=positive(item.manualViagens)>0?positive(item.manualViagens):(tripsTotal||1);
    const fuelCost=positive(item.kmPerLiter)>0?km*positive(item.gasPricePerLiter)/positive(item.kmPerLiter):0;
    const raw=(fuelCost+positive(item.toll))*trips;
    const amount=expensePrice(raw,item.clientId);
    registerClient(item.clientId,amount);
    return {cells:[item.description?.trim()||`Transporte #${index+1}`,clientName(item.clientId),dec(km,1)+" km",String(trips),money(positive(item.toll))],amount,cost:raw};
  }).filter(row=>row.amount>0||(row.cost??0)>0);
  const transport=group("Transporte",["Veículo/descrição","Cliente","Distância","Viagens","Pedágio"],transportRows);

  const groups=[labor,materials,expense,transport,travel];
  const total=groups.reduce((sum,g)=>sum+g.total,0);
  const totalCost=groups.reduce((sum,g)=>sum+(g.costTotal||0),0);
  return {groups,total,totalCost,travelKm:kmTotal,quantityWarnings:warnings,clientNames:[...activeClients]};
}
function group(label:string,columns:string[],rows:ExportRow[]):ExportGroup{
  return {label,columns,rows,total:rows.reduce((a,r)=>a+r.amount,0),costTotal:rows.reduce((a,r)=>a+(r.cost||0),0)};
}

const clean=(s:string)=>s.replace(/[^A-Za-z0-9_-]/g,"_").slice(0,60);
export function budgetExportFileName(meta:BudgetExportMetadata):string {
  return `Orcamento_Multprest_${clean(meta.numero.trim()||new Date().toISOString().slice(0,10))}_${meta.modo}.pdf`;
}

export function buildBudgetHtml(data:BudgetExportData,meta:BudgetExportMetadata,report:BudgetExportReport):string {
  const internal=meta.modo==="interno";
  const date=new Date().toLocaleDateString("pt-BR");
  const tr=(row:ExportRow)=>`<tr>${row.cells.map(c=>`<td>${fmt(c)}</td>`).join("")}<td class="numeric bold">${money(row.amount)}</td>${internal?`<td class="numeric">${money(row.cost||0)}</td>`:""}</tr>`;
  const sections=report.groups.map(group=>{
    const columns=[...group.columns,"Total de venda",...(internal?["Custo interno"]:[])];
    return `<section><h2>${fmt(group.label)}</h2><div class="table-wrap"><table><thead><tr>${columns.map(c=>`<th>${fmt(c)}</th>`).join("")}</tr></thead>
      <tbody>${group.rows.length?group.rows.map(tr).join(""):`<tr><td colspan="${columns.length}" class="empty">Nenhum item com valor lançado nesta seção</td></tr>`}</tbody>
      <tfoot><tr><td colspan="${group.columns.length}">Subtotal - ${fmt(group.label)}</td><td class="numeric">${money(group.total)}</td>${internal?`<td class="numeric">${money(group.costTotal||0)}</td>`:""}</tr></tfoot>
      </table></div></section>`;
  }).join("");
  const itemName=(label:string,amount:number)=>`<tr><td>${fmt(label)}</td><td class="numeric">${money(amount)}</td></tr>`;
  const itemText=(label:string,value:string)=>`<tr><td>${fmt(label)}</td><td class="numeric">${fmt(value)}</td></tr>`;
  const notes=[
    meta.validade.trim()?`<p><strong>Validade:</strong> ${fmt(meta.validade)}</p>`:"",
    meta.prazo.trim()?`<p><strong>Prazo de execução:</strong> ${fmt(meta.prazo)}</p>`:"",
    meta.observacoes.trim()?`<p><strong>Observações:</strong> ${fmt(meta.observacoes).replace(/\n/g,"<br>")}</p>`:"",
  ].filter(Boolean).join("");
  const n=data.nota,g=data.negociacao;
  const internalSections=internal?`<section class="internal"><h2>Nota reversa - análise interna</h2><table>
      ${itemName("Valor bruto informado",positive(n.valorBrutoNumerico))}
      ${itemText("Antecipação considerada",dec(positive(n.antecipacaoPercent),2)+"%")}
      ${itemText("Incluir ISS retido",n.incluirIssqn?"Sim":"Não")}
      ${itemText("Incluir INSS retido",n.incluirInss?"Sim":"Não")}
      ${itemText("Incluir DAS",n.incluirSimples?"Sim":"Não")}
      ${itemText("Incluir antecipação",n.incluirAntecipacao?"Sim":"Não")}
    </table><p class="muted">Os valores da nota reversa representam uma simulação de caixa, não um novo imposto sobre a proposta.</p></section>
    <section class="internal"><h2>Negociação - análise interna</h2><table>
      ${itemName("Valor original da negociação",positive(g.valorOriginalNumerico))}
      ${itemText("Desconto informado",g.tipoDesconto==="percent"?dec(positive(g.descontoPercent),2)+"%":money(positive(g.descontoValor)))}
      ${itemName("Custo interno estimado do orçamento",report.totalCost)}
      ${itemName("Diferença bruta venda - custo",report.total-report.totalCost)}
    </table><p class="muted">Desconto: ${g.tipoDesconto==="percent"?"percentual (%)":"valor (R$)"}. Os valores de negociação salvos podem pertencer a uma simulação anterior; a venda consolidada é calculada pelos itens atuais.</p></section>
    <section class="internal"><h2>Custos HH e tabela de preços - uso interno</h2>
      <table><thead><tr><th>Função</th><th>Custo/h</th>${data.clients.filter(c=>c.active!==false).map(c=>`<th>${fmt(c.name)}</th>`).join("")}</tr></thead>
      <tbody>${data.workers.map(w=>`<tr><td>${fmt(w.name)}</td><td class="numeric">${money(positive(data.getCustoHora(w.worker_id)))}</td>${data.clients.filter(c=>c.active!==false).map(c=>`<td class="numeric">${money(positive(data.getRate(w.worker_id,c.client_id)))}</td>`).join("")}</tr>`).join("")}</tbody>
      </table></section>`:"";
  const rows=report.groups.map(g=>itemName(g.label,g.total)).join("");
  const warningHtml=report.quantityWarnings.length?
    `<section class="warning"><h2>Atenção aos dados do orçamento</h2><ul>${report.quantityWarnings.map(w=>`<li>${fmt(w)}</li>`).join("")}</ul></section>`:"";
  const flag=internal?`<span class="flag">CONFIDENCIAL - USO INTERNO</span>`:"";
  const logo="https://dtvoeevhaseb5.cloudfront.net/uploads/mocha-import/73ee0db2-d333-4cc6-9729-ca6149cffff7/28f8a3d4-08bb-4ec0-b9aa-e3163a94641b.png";
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${fmt(budgetExportFileName(meta))}</title>
    <meta name="viewport" content="width=device-width,initial-scale=1"><style>
    @page{size:A4;margin:15mm 13mm 17mm}
    *{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;color:#233044;background:#eef2f7;margin:0;font-size:10px;line-height:1.5}
    .print-help{background:#17243b;color:white;padding:10px 22px;font-size:13px;display:flex;align-items:center;justify-content:space-between;gap:10px}
    .print-help button{font-weight:700;background:#047857;color:white;border:0;border-radius:5px;padding:10px 16px;cursor:pointer}
    .sheet{max-width:210mm;min-height:280mm;margin:18px auto;padding:18mm 15mm;background:white;box-shadow:0 8px 40px #0002}
    header{display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #097589;padding-bottom:13px;margin-bottom:18px}
    header img{height:55px;width:auto;max-width:85px;object-fit:contain}h1{font-size:25px;line-height:1.05;color:#13345a;margin:0}h2{font-size:13px;color:#123c5b;border-bottom:1px solid #d6e2e8;padding-bottom:5px;margin:19px 0 9px;break-after:avoid}
    .brand{display:flex;align-items:center;gap:14px}.subtitle{color:#64748b;font-size:11px}.flag{font-weight:bold;color:#a32727;font-size:10px;border:1px solid #a32727;padding:3px 5px}
    .right{text-align:right}.meta{display:grid;grid-template-columns:1fr 1fr;gap:6px 18px;background:#f1f5f9;padding:13px;border-radius:6px;margin-bottom:15px}
    .meta strong{font-weight:700}.cover-total{margin:14px 0;display:flex;justify-content:space-between;align-items:center;background:#133c56;color:white;padding:14px 16px;font-size:15px;border-radius:5px}
    .cover-total strong{font-size:20px}.numeric{text-align:right;white-space:nowrap}.bold{font-weight:700}
    section{break-inside:auto;margin-bottom:12px}.table-wrap{overflow:visible}table{border-collapse:collapse;width:100%;font-size:8px}
    thead{display:table-header-group}tfoot{display:table-row-group}tr{break-inside:avoid}
    th{text-align:left;background:#e9f0f4;color:#1e4055;font-size:8px;font-weight:700}
    th,td{border-bottom:1px solid #e0e6ec;padding:5px 5px;vertical-align:top;overflow-wrap:anywhere}
    tfoot td{font-weight:700;background:#eef5f6;border-top:1px solid #cbdce2}.empty{text-align:center;color:#64748b;font-style:italic}
    .summary{max-width:440px;margin-left:auto}.summary table{font-size:10px}.summary td{padding:7px}
    .notes{background:#f5f7f9;padding:12px;margin-top:20px}.notes p{margin:3px 0;white-space:normal}
    .muted{color:#64748b}.internal{border-left:3px solid #be3541;padding-left:9px}.warning{color:#933019;background:#fff7ed;padding:8px 12px;border-left:4px solid #f59e0b}
    .warning h2{color:#933019;margin-top:3px}.warning ul{margin:4px 0;padding-left:18px}
    .signature{margin-top:42px;text-align:center;page-break-inside:avoid}.line{margin:0 auto 6px;border-top:1px solid #475569;width:240px}
    footer{margin-top:25px;border-top:1px solid #cbd5e1;padding-top:6px;display:flex;justify-content:space-between;font-size:8px;color:#64748b}
    @media print{body{background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}.print-help{display:none}.sheet{margin:0;max-width:none;min-height:0;box-shadow:none;padding:0}header{break-inside:avoid}.meta{break-inside:avoid}.cover-total{break-inside:avoid}.notes{break-inside:avoid}}
    </style></head><body>
    <div class="print-help"><span>Escolha <strong>Salvar como PDF</strong> na janela de impressão. Orientação A4 e margens padrão.</span><button onclick="window.print()">Salvar / Imprimir PDF</button></div>
    <main class="sheet">
    <header><div class="brand"><img src="${logo}" alt="Multprest"><div><h1>ORÇAMENTO</h1><div class="subtitle">MULTPREST SERVIÇOS INDUSTRIAIS LTDA</div></div></div>
    <div class="right">${flag}<div><strong>Nº ${fmt(meta.numero||"Não informado")}</strong></div><div class="subtitle">Emitido em ${fmt(date)}</div></div></header>
    <div class="meta"><div><strong>Cliente:</strong> ${fmt(meta.cliente||report.clientNames.join(", ")||"Não informado")}</div><div><strong>Referência:</strong> ${fmt(meta.numero||"—")}</div>
    <div style="grid-column:1/-1"><strong>Objeto:</strong> ${fmt(meta.descricao||"Prestação de serviços industriais")}</div></div>
    <div class="cover-total"><span>VALOR TOTAL DA PROPOSTA</span><strong>${money(report.total)}</strong></div>
    <section class="summary"><h2>Resumo financeiro</h2><table>${rows}<tr><td class="bold">TOTAL GERAL</td><td class="numeric bold">${money(report.total)}</td></tr></table></section>
    ${sections}
    ${internalSections}
    ${warningHtml}
    ${notes?`<section class="notes"><h2>Condições e observações</h2>${notes}</section>`:""}
    <div class="signature"><div class="line"></div>Multprest Serviços Industriais Ltda</div>
    <footer><div>Multprest | Montenegro - RS</div><div>${internal?"DOCUMENTO CONFIDENCIAL":"Proposta comercial"} · ${fmt(date)}</div></footer>
    </main><script>window.addEventListener("load",()=>{setTimeout(()=>{window.focus();window.print()},600)});<\/script></body></html>`;
}
