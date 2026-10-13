# Centro de Custo — ativação de acesso por e-mail

O formulário `/account/signin` inclui o botão **Primeiro acesso? Receber link para criar a senha**.

O envio do convite usa o provedor transacional Resend via endpoint
`/api/auth/request-activation`. O sistema só emite convite a um e-mail
**previamente incluído em `allowed_users` e existente em `user` sem
credencial de senha**.

## Configuração no Vercel

Projeto Vercel `centrodecusto`, Settings → Environment Variables.
Criar na **Preview** da branch `nextjs-neon-integration`:

- `RESEND_API_KEY`: chave de envio criada no painel Resend, permissão Sending Access.
- `ACTIVATION_EMAIL_FROM`: remetente autorizado no Resend.
- `BETTER_AUTH_URL`: URL estável da implantação Preview; já existente.

Durante o teste inicial, o Resend permite seu remetente de testes
`onboarding@resend.dev`, com restrições de destinatários. Para usuários
reais fora da conta de testes, verificar um domínio remetente no Resend.
A caixa `adm.multprest@gmail.com` permanece o **destinatário**, não precisa
ser o endereço `from`.

**Nunca colocar valores de API keys, tokens ou senhas no GitHub, commits ou chat.**
Uma alteração das variáveis no Vercel deve ser seguida de redeploy.

## Fluxo

1. Acessar `/account/signin` na Preview.
2. Informar e-mail cadastrado e clicar **Primeiro acesso? Receber link para criar a senha**.
3. O sistema retorna resposta sem revelar se o e-mail existe; envia um link
   com token aleatório de 256 bits válido por 60 minutos.
4. O token é armazenado **apenas como SHA-256** na tabela
   `password_activation_tokens`.
5. O usuário recebe o e-mail e abre `/account/activate#token` no navegador.
6. Escolhe senha mínima de 12 caracteres no próprio site; a API valida e
   consome o token atomicamente e grava um hash compatível com Better Auth.
7. Usa a senha em `/account/signin`; futuramente altera a senha no botão
   **Alterar senha**, dentro do próprio sistema.

Não gerar ou enviar senhas provisórias por e-mail. O envio de tokens só pode
acontecer quando o serviço de e-mail estiver configurado.

### Proteções aplicadas

- Verificação de e-mail autorizado e de inexistência de senha prévia.
- Intervalo mínimo de 10 minutos entre solicitações do mesmo usuário.
- Resposta genérica para e-mails desconhecidos ou em intervalo de espera.
- Token de uso único e expiração de 60 minutos.
- O fragmento `#token` não acompanha a requisição HTTP da página.
- Falhas no provedor de e-mail invalidam o convite recém-gerado.

O ambiente `production` do Neon deve permanecer intocado até a validação
do fluxo de ativação no Preview.
