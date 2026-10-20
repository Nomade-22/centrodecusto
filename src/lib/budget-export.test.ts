import { describe, expect, it } from "vitest";
import { buildBudgetHtml, calculateBudgetExport, type BudgetExportData, type BudgetExportMetadata } from "./budget-export";
import { calculateBDIPrice } from "./bdi";

function fixture(): BudgetExportData {
  return {
    laborItems: [
      {id:"l1",title:"Construção de parede",workerTypeId:"pedreiro",clientId:"jbs",hourTypeId:"normal",people:2,days:1,hours:8},
    ],
    laborTeamSize:2,
    materials:{
      inss:0,simplesIssqn:10.81,lucroPercent:10,jurosDia:0,diasPagamento:0,trocaNota:0,
      descontoCompras:0,materials:[{id:"m1",clientId:"jbs",description:"Cimento",valorMaterial:100,negotiationOverridePct:0}],
    },
    expenses:{
      clients:[{id:"jbs",name:"JBS",diasPagamento:0}],
      accommodation:[{id:"a1",clientId:"jbs",baseCost:30,people:2,days:1}],
      transport:[],
      lunches:[],dinners:[],breakfasts:[],teamSize:2,
    },
    trips:[{origin:"Montenegro, RS",destination:"Taquara, RS",tripType:"round-trip",people:2,days:1,clientId:"jbs",workerTypeId:"pedreiro",hourTypeId:"normal",ratePerHour:80,manualHours:1,distanceKm:100,durationMinutes:null}],
    paymentRule:"all",maxHours:1,
    nota:{
      valorBruto:"",valorBrutoNumerico:0,incluirIssqn:true,incluirInss:true,incluirSimples:true,
      incluirAntecipacao:false,antecipacaoPercent:0,incluirMaoDeObra:false,incluirMaterial:false,
      incluirViagens:false,incluirTransporte:false,incluirEstadia:false,incluirAlmoco:false,
      incluirJanta:false,incluirCafe:false,
    },
    negociacao:{
      valorOriginal:"",valorOriginalNumerico:0,valorLiquido:0,totalCustos:0,totalImpostos:0,
      descontoPercent:0,descontoValor:0,tipoDesconto:"percent",
      storedIssqn:0,storedInss:0,storedSimples:0,storedAntecipacao:0,
      storedMaoDeObra:0,storedMaterial:0,storedViagens:0,storedTransporte:0,storedEstadia:0,
      storedAlmoco:0,storedJanta:0,storedCafe:0,
    },
    clients:[{id:1,client_id:"jbs",name:"JBS",dias:0,negotiation_pct:0,iss_retained_pct:0,inss_retained_pct:0,anticipate:false,active:true}],
    workers:[{id:1,worker_id:"pedreiro",name:"Pedreiro",icon:"",custo_hora:35}],
    hourTypes:[{id:1,hour_id:"normal",name:"Normal",multiplier:1}],
    settings: undefined,
    getRate:()=>80,getHourMultiplier:()=>1,getCustoHora:()=>35,
  };
}
const meta:BudgetExportMetadata={
  numero:"MP-123",cliente:"JBS",descricao:"Obra industrial",validade:"",prazo:"",
  observacoes:'Teste <script>alert("x")</script>',modo:"cliente",
};

describe("Exportação PDF de orçamento",()=>{
  it("calcula todas as seções a partir dos itens atuais mesmo sem abrir suas abas",()=>{
    const data=fixture();
    const report=calculateBudgetExport(data);
    const labor=80*8*2;
    const material=100/(1-(10.81+10)/100);
    const accommodation=calculateBDIPrice(30,0,{das:10.81,lucro:10,jurosDia:0,trocaNota:0,descontoCompras:0,issRetido:0,inssRetido:0,anticipate:false})*2;
    const travel=2*2*80;
    expect(report.groups.map(g=>g.label)).toEqual(["Mão de obra","Materiais","Estadia e alimentação","Transporte","Horas viajadas"]);
    expect(report.groups[0].total).toBeCloseTo(labor,5);
    expect(report.groups[1].total).toBeCloseTo(material,5);
    expect(report.groups[2].total).toBeCloseTo(accommodation,5);
    expect(report.groups[4].total).toBeCloseTo(travel,5);
    expect(report.travelKm).toBe(200);
    expect(report.total).toBeCloseTo(labor+material+accommodation+travel,5);
  });
  it("não inclui custos nem simulações internas na versão cliente e sanitiza campos editáveis",()=>{
    const data=fixture();const report=calculateBudgetExport(data);
    const html=buildBudgetHtml(data,meta,report);
    expect(html).toContain("ORÇAMENTO");
    expect(html).toContain("Salvar como PDF");
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain('<script>alert("x")</script>');
    expect(html).not.toContain("Custo interno");
    expect(html).not.toContain("Nota reversa - análise interna");
    expect(html).not.toContain("CONFIDENCIAL - USO INTERNO");
  });
  it("insere marca confidencial e custos apenas no relatório interno",()=>{
    const data=fixture();const report=calculateBudgetExport(data);
    const html=buildBudgetHtml(data,{...meta,modo:"interno"},report);
    expect(html).toContain("CONFIDENCIAL - USO INTERNO");
    expect(html).toContain("Custos HH e tabela de preços");
    expect(html).toContain("Nota reversa - análise interna");
  });
});
