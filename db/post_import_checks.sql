-- Validação pós-importação do banco do Orçamento Multprest
-- Não altera dados. Apenas confere estrutura e quantidade de registros.

SELECT 'orcamentos' AS tabela, COUNT(*)::bigint AS registros FROM orcamentos
UNION ALL SELECT 'labor_clients', COUNT(*) FROM labor_clients
UNION ALL SELECT 'worker_types', COUNT(*) FROM worker_types
UNION ALL SELECT 'worker_rates', COUNT(*) FROM worker_rates
UNION ALL SELECT 'hour_types', COUNT(*) FROM hour_types
ORDER BY tabela;

SELECT client_id, name, dias
FROM labor_clients
ORDER BY name;

SELECT worker_id, name, custo_hora, lucro_hora
FROM worker_types
ORDER BY name;

-- Antes da migração HH, a base recebida deve ter aproximadamente:
-- orcamentos: 110
-- labor_clients: 8
-- worker_types: 7
-- worker_rates: 56
-- hour_types: 4
--
-- Após a migração HH:
-- o cliente de teste 0% / inss0 deixa de existir;
-- Seara e SBE à vista são incluídos;
-- JBS passa a 120 dias;
-- as tabelas hh_settings, hh_worker_salaries e hh_fixed_costs passam a existir.

SELECT to_regclass('public.hh_settings') AS hh_settings,
       to_regclass('public.hh_worker_salaries') AS hh_worker_salaries,
       to_regclass('public.hh_fixed_costs') AS hh_fixed_costs;
