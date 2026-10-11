# Centro de Custo Multprest

Sistema oficial de orçamento e formação de preços da Multprest.

## Arquitetura

- **Next.js / React**: aplicação web
- **Neon PostgreSQL**: base central de dados
- **Vercel**: publicação
- **GitHub**: versionamento

Projeto Neon oficial: `centrodecusto` (`aged-leaf-89919582`).
O desenvolvimento/migração deve ser validado na branch Neon `migracao-orcamento` antes de qualquer promoção para `production`.

## Fonte única de Homem-Hora

A Calculadora HH é a fonte de verdade para:

- custo mensal e custo/hora por função;
- rateio dos custos fixos;
- encargos trabalhistas/previdenciários;
- DAS, retenções e antecipação;
- prazo e negociação por cliente;
- tabela comercial de preço/hora.

`worker_rates` e `worker_types.custo_hora/lucro_hora` são mantidos apenas como valores materializados de compatibilidade. Os preços correntes são calculados a partir das tabelas `hh_*`.

## Regras fiscais/financeiras atuais

- DAS efetivo total: configurável em `hh_settings` (base atual 10,81%).
- ISS retido: compõe a carga do Simples; não é somado novamente ao DAS.
- INSS retido: tratado como retenção/fluxo de caixa compensável, não como novo custo econômico.
- Antecipação: simples por dia e aplicada sobre o recebível após retenções.
- Negociação: gross-up (`preço base / (1 - desconto)`) para preservar o preço-base após o desconto esperado.

## Histórico

Os orçamentos antigos permanecem em `orcamentos` como snapshots. A migração validada contém:

- 110 orçamentos;
- 11 fechados;
- R$ 11.399.575,77 de valor histórico;
- R$ 352.831,98 em fechados.

O cliente legado `inss0` permanece inativo apenas para compatibilidade histórica.

## Variáveis de ambiente

```env
DATABASE_URL=postgresql://...
BETTER_AUTH_URL=https://seu-dominio.vercel.app
BETTER_AUTH_TRUSTED_ORIGINS=https://seu-dominio.vercel.app

# Opcional: login Google
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Opcional: cálculo automático de rotas
OPENROUTE_API_KEY=
```

Nunca versionar `.env` ou credenciais.

## Desenvolvimento

```bash
npm install
npm run dev
```

## Validação

```bash
npm run typecheck
npm run build
```

Antes de promover para produção, validar Mão de Obra, Material, Estadia/Alimentação, Horas Viajadas, Nota Reversa, Negociação, Resumo Final e Histórico contra casos conhecidos.
