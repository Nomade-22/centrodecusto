# Login Google — Centro de Custo Multprest (ambiente de testes)

A tela `/account/signin` apresenta "Entrar com Google". Ela consulta
`GET /api/auth/google-status`; sem as duas credenciais OAuth na Vercel,
a opção permanece desabilitada (sem enviar segredos ao navegador).

## Pré-requisitos

- Conta Google legítima cujo e-mail esteja previamente autorizado em
  `allowed_users` (as APIs de orçamento continuam checando permissões).
- Se existir uma conta por e-mail e senha, o Better Auth pode vincular a
  conta Google de **mesmo e-mail verificado**, sem trocar seu nível de acesso.
- Não habilitar cadastro irrestrito nem confiar no e-mail apenas por ter sido
  digitado no navegador.
- Para que o OAuth funcione, usar endereço estável da branch Preview. A
  Vercel configura `BETTER_AUTH_URL` como:

  `https://centrodecusto-git-nextjs-neon-integration-jhonatan23.vercel.app`

## Configurar no Google Cloud Console

1. Acesse https://console.cloud.google.com/apis/credentials.
2. Selecione/crie um projeto Google Cloud, configure a tela de consentimento,
   e crie uma credencial **ID do cliente OAuth → Aplicação da Web**.
3. Cadastre uma origem JavaScript autorizada:
   `https://centrodecusto-git-nextjs-neon-integration-jhonatan23.vercel.app`
4. Cadastre a **URI de redirecionamento autorizada**:
   `https://centrodecusto-git-nextjs-neon-integration-jhonatan23.vercel.app/api/auth/callback/google`
5. Se a tela de consentimento estiver no modo **Testando**, inclua os e-mails
   reais autorizados como **usuários de teste** no Google.
6. NÃO envie Client Secret nem Client ID por mensagem; acesse
   Vercel → projeto `centrodecusto` → Settings → Environment Variables e
   cadastre, em **Preview da branch `nextjs-neon-integration`**:
   - `GOOGLE_CLIENT_ID`: Client ID fornecido pelo Google.
   - `GOOGLE_CLIENT_SECRET`: Client Secret fornecido pelo Google.
7. Redeploy a branch de teste para carregar as variáveis.
8. Acesse a URL estável acima, entre com o Google usando o mesmo e-mail
   liberado no sistema, e verifique o acesso ao painel e às APIs financeiras.

## Segurança e publicação

- O login por senha permanece disponível enquanto a integração Google é testada.
- Jamais versionar segredos no GitHub, colar a chave na conversa ou
  habilitar acesso público ao banco.
- Se Google apresentar `redirect_uri_mismatch`, confira a correspondência
  **exata** do endereço de callback autorizado.
- A produção não é alterada automaticamente; só liberar depois de validar
  o OAuth na Preview, o vínculo com a conta existente e as permissões.
