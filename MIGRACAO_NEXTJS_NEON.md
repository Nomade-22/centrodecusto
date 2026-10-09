# Migração Orçamento Multprest — Next.js + Neon

Este branch preserva o app estático atual e registra a migração para a versão Next.js baseada no último ZIP do Anything e no dump PostgreSQL atual.

## Decisão de arquitetura

- Next.js/React no frontend e API.
- Neon PostgreSQL como fonte persistente.
- Vercel como destino de deploy.
- A Calculadora HH 2026 passa a ser a fonte única dos custos e preços de mão de obra.
- O histórico existente em `orcamentos` é preservado.
- `worker_types.custo_hora` e `worker_rates` passam a ser derivados da configuração HH.

## Base HH validada

- 220 h/mês
- salário mínimo R$ 1.621,00
- prêmio R$ 380 fora dos encargos na configuração atual
- insalubridade 20%
- INSS patronal + RAT/FAP 24,8516%
- FGTS 8%
- reserva rescisória 40% do FGTS
- DAS efetivo total 10,81%
- ISS retido padrão 4,36%
- INSS retido padrão 0%, editável quando houver retenção
- markup de mão de obra 30%
- antecipação 0,1% ao dia
- 6 funcionários produtivos
- custo fixo inicial R$ 28.300,00
- seguros R$ 792,69/mês

## Clientes

JBS 120d; JBS Couros 10d; Seara 120d; Vibra 30d; BRF 180d; SBE à vista; Agrogen 35d; LAR 5d; MIG PLUS 45d.

O ID legado `sbe` continua pertencendo à LAR para compatibilidade com orçamentos antigos. A SBE nova usa `sbe-avista`.

O cliente de teste `0% / inss0` será removido.

## Regra fiscal central

ISS retido faz parte da carga total do Simples e reduz o DAS a recolher; não é somado novamente. INSS retido reduz caixa, mas é compensável e não é tratado como custo econômico definitivo. A antecipação incide sobre o recebível líquido das retenções.

## Progresso já preparado

A versão de migração local já contém:
- motor HH central;
- motor fiscal central;
- tabelas `hh_settings`, `hh_worker_salaries`, `hh_fixed_costs`;
- API de configuração e sincronização HH;
- Calculadora HH dentro do app de Orçamento;
- Tabela de Preços derivada da Calculadora HH;
- Custos HH somente leitura;
- Horas Viajadas usando a tabela do banco, sem fallback antigo;
- Nota Reversa e Negociação alinhadas à ordem fiscal nova;
- BDI/material com DAS total 10,81% e INSS 0 por padrão;
- remoção do cliente de teste `inss0`;
- preservação dos snapshots históricos.

O deploy depende de escolher/conectar o projeto Neon e autorizar/importar o projeto no Vercel.
