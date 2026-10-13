# Centro de Custo — implantação controlada Vercel + Neon

## Contexto validado em 13/10/2026

- GitHub: `Nomade-22/centrodecusto`
- Branch do código em teste: `nextjs-neon-integration`
- Neon: projeto `centrodecusto`, ID `aged-leaf-89919582`
- Branch de teste Neon: `migracao-orcamento` (ID `br-bold-smoke-b60c6hd6`)
- Branch principal Neon: `production` (**NÃO IMPORTAR DADOS NEM APONTAR PARA ELA AINDA**)
- Banco de teste validado: 110 orçamentos, 11 fechados, 7 funções, 9 clientes ativos, 70 tarifas.
- O repositório possui código Next.js completo com as telas originais; não definir `apps/web` como root directory.

## 1. Configuração manual necessária no Vercel

A conexão de serviço apresentou `403 forbidden` ao tentar criar o projeto. Um administrador da conta Vercel deve:

1. Abrir https://vercel.com/new
2. Selecionar a conta/time correto (Jhonatan, `jhonatan23`)
3. Importar repositório GitHub `Nomade-22/centrodecusto`
4. Nome do projeto: **`centrodecusto`**
5. Framework: **Next.js**
6. Root Directory: **raiz `./`** (onde está `package.json`)
7. **Não promover nem expor em produção até concluir a conexão e os testes.** Conferir a configuração `Production Branch`, pois a implementação atual está em `nextjs-neon-integration`, e não necessariamente em `main`.

## 2. Variáveis de ambiente para testes

No Vercel -> Project Settings -> Environment Variables:

| Variável | Teste/preview |
|---|---|
| `DATABASE_URL` | String do Neon **somente da branch `migracao-orcamento`** |
| `BETTER_AUTH_SECRET` | Valor secreto forte, gerado e armazenado somente no Vercel |
| `BETTER_AUTH_URL` | URL HTTPS estável da implantação de teste |
| `BETTER_AUTH_TRUSTED_ORIGINS` | URL(s) HTTPS permitidas para login |
| `GOOGLE_CLIENT_ID` | Necessária se o acesso usar login Google |
| `GOOGLE_CLIENT_SECRET` | Necessária se o acesso usar login Google |
| `OPENROUTE_API_KEY` | Necessária apenas para usar cálculo automático de rotas |

Use target **Preview** e, se possível, restrinja ao Git branch `nextjs-neon-integration`. Não insira segredos em arquivos do GitHub, commits ou mensagens no chat.

As contas antigas no dump usam provedor Google. Se o login Google for escolhido, configure também o callback autorizado do domínio Vercel no provedor OAuth e teste a autenticação com um email da lista permitida.

## 3. Testes antes da publicação

- Confirmar que login não autorizado recebe 403 nas rotas financeiras.
- Validar listagem dos 110 orçamentos, 11 fechados, total R$ 11.399.575,77 e valor fechado R$ 352.831,98.
- Abrir orçamento antigo de R$ 153.733,78 sem recálculo automático.
- Alterar configuração HH em **ambiente de teste**, verificar taxa por cliente e não modificar históricos.
- Conferir Mão de Obra, Material, Estadia e Alimentação, Horas Viajadas, Nota Reversa, Negociação e Resumo Final.
- Executar testes automatizados de Vitest, TypeScript e build do Next.js.
- Validar no Vercel que nenhuma variável `DATABASE_URL` apontou para o projeto Neon antigo `plataforma-multprest`.

## 4. Apenas depois da aprovação

1. Criar backup / ponto de recuperação da branch testada.
2. Promover a base validada para a `production` do Neon `centrodecusto`.
3. Configurar `DATABASE_URL` da produção no Vercel, separada da Preview.
4. Confirmar domínio estável, autenticação, permissões, testes do app e logs.
5. Publicar a branch aprovada como produção.

**Nunca copiar dados reais para GitHub, nem colocar a URL de acesso ao banco em documentos públicos.**
