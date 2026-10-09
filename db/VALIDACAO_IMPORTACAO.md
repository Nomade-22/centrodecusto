# Validação da importação Neon

Base analisada em 08/10/2026 a partir do dump `production.sql` enviado pela Multprest.

## Snapshot da base recebida

- 110 orçamentos salvos
- 8 clientes de mão de obra
- 7 funções
- 56 combinações função × cliente
- 4 tipos de hora

Clientes encontrados no dump original:

- BRF — 180 dias
- JBS Couros — 10 dias
- inss0 / 0% — 30 dias (teste dos R$ 77; será removido)
- JBS — 135 dias (será corrigido para 120)
- Vibra — 30 dias
- Agrogen — 35 dias
- MIG PLUS — 45 dias
- LAR — 5 dias, mantendo o ID legado `sbe` para não quebrar snapshots antigos

A migração adiciona Seara 120 dias e uma nova SBE à vista com ID `sbe-avista`.

## Segurança da migração

O dump completo **não deve ser publicado no GitHub**, porque contém dados de usuários, autenticação e histórico de orçamentos.

Fluxo aprovado:

1. Restaurar a base privada diretamente no Neon.
2. Conferir os totais com `db/post_import_checks.sql`.
3. Preparar a migração HH em branch temporário do Neon.
4. Testar preços, histórico e APIs nessa branch.
5. Somente depois aplicar a migração na branch principal.
6. Sincronizar os novos custos/valores HH.
7. Ligar o projeto Vercel ao banco final.

## Resultado esperado

A Calculadora HH torna-se a fonte dos custos e preços de mão de obra, preservando os 110 orçamentos antigos com seus snapshots originais.
