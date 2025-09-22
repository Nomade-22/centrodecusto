let lancamentos = JSON.parse(localStorage.getItem("lancamentos")) || [];

function showTab(tab) {
  document.querySelectorAll(".tab").forEach(el => el.classList.remove("active"));
  document.getElementById(tab).classList.add("active");
  atualizarDashboard();
}

document.getElementById("formLancamento").addEventListener("submit", function(e) {
  e.preventDefault();
  const data = document.getElementById("data").value;
  const fornecedor = document.getElementById("fornecedor").value;
  const materiais = parseFloat(document.getElementById("materiais").value) || 0;
  const profissionais = parseInt(document.getElementById("profissionais").value) || 0;
  const ajudantes = parseInt(document.getElementById("ajudantes").value) || 0;
  const almoco = parseFloat(document.getElementById("almoco").value) || 0;
  const translado = parseFloat(document.getElementById("translado").value) || 0;

  const totalMO = (profissionais * 809) + (ajudantes * 405); // exemplo de valores fixos
  const total = materiais + totalMO + almoco + translado;

  lancamentos.push({ data, fornecedor, materiais, profissionais, ajudantes, almoco, translado, total });
  localStorage.setItem("lancamentos", JSON.stringify(lancamentos));
  atualizarTabela();
  atualizarDashboard();
  this.reset();
});

function atualizarTabela() {
  const tbody = document.querySelector("#tabelaLancamentos tbody");
  tbody.innerHTML = "";
  lancamentos.forEach(l => {
    tbody.innerHTML += `
      <tr>
        <td>${l.data}</td>
        <td>${l.fornecedor}</td>
        <td>R$ ${l.materiais.toFixed(2)}</td>
        <td>${l.profissionais}</td>
        <td>${l.ajudantes}</td>
        <td>R$ ${l.almoco.toFixed(2)}</td>
        <td>R$ ${l.translado.toFixed(2)}</td>
        <td>R$ ${l.total.toFixed(2)}</td>
      </tr>
    `;
  });
}

function atualizarDashboard() {
  let totalMateriais = lancamentos.reduce((s,l) => s+l.materiais,0);
  let totalMO = lancamentos.reduce((s,l) => s+((l.profissionais*809)+(l.ajudantes*405)),0);
  let totalIndiretos = lancamentos.reduce((s,l) => s+l.almoco+l.translado,0);
  let totalGeral = totalMateriais + totalMO + totalIndiretos;

  document.getElementById("kpiMateriais").innerText = "R$ " + totalMateriais.toFixed(2);
  document.getElementById("kpiMO").innerText = "R$ " + totalMO.toFixed(2);
  document.getElementById("kpiIndiretos").innerText = "R$ " + totalIndiretos.toFixed(2);
  document.getElementById("kpiTotal").innerText = "R$ " + totalGeral.toFixed(2);

  atualizarGraficos();
}

function atualizarGraficos() {
  // Evolução por data
  const ctx1 = document.getElementById("graficoEvolucao").getContext("2d");
  new Chart(ctx1, {
    type: "line",
    data: {
      labels: lancamentos.map(l => l.data),
      datasets: [{
        label: "Total por dia",
        data: lancamentos.map(l => l.total),
        borderColor: "#00c853",
        fill: false
      }]
    }
  });

  // Por categoria
  const ctx2 = document.getElementById("graficoCategorias").getContext("2d");
  let soma = {
    Materiais: lancamentos.reduce((s,l)=>s+l.materiais,0),
    "Mão de Obra": lancamentos.reduce((s,l)=>s+((l.profissionais*809)+(l.ajudantes*405)),0),
    Indiretos: lancamentos.reduce((s,l)=>s+l.almoco+l.translado,0)
  };
  new Chart(ctx2, {
    type: "pie",
    data: {
      labels: Object.keys(soma),
      datasets: [{
        data: Object.values(soma),
        backgroundColor: ["#2962ff","#ff6d00","#00c853"]
      }]
    }
  });

  // Por fornecedor
  const ctx3 = document.getElementById("graficoFornecedores").getContext("2d");
  let fornecedores = {};
  lancamentos.forEach(l => {
    fornecedores[l.fornecedor] = (fornecedores[l.fornecedor]||0)+l.total;
  });
  new Chart(ctx3, {
    type: "bar",
    data: {
      labels: Object.keys(fornecedores),
      datasets: [{
        label: "Total por fornecedor",
        data: Object.values(fornecedores),
        backgroundColor: "#0091ea"
      }]
    }
  });
}

window.onload = () => {
  atualizarTabela();
  atualizarDashboard();
};
