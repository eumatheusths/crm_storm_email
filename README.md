# Storm Email Pro

Painel interno de disparo de e-mail em massa, grupos de contatos, templates e fluxos automatizados (drip campaigns) com rastreamento de abertura.

## Stack

- [Astro](https://astro.build) (`output: server`) + adapter `@astrojs/vercel`
- Postgres via [Neon](https://neon.tech) (`@neondatabase/serverless`)
- Envio de e-mail: [API de E-mail da Hostinger](https://api.mail.hostinger.com/) (padrão) ou SMTP via `nodemailer`

## Configuração

1. Copie `.env.example` para `.env` e preencha:
   - `DATABASE_URL`: connection string do Postgres (Neon).
   - `APP_PASSWORD`: senha única exigida para acessar o painel. **Obrigatória** — sem ela o middleware bloqueia todo o app.
   - `CRON_SECRET` (opcional): protege o endpoint `/api/flows/process` contra chamadas externas; configure o mesmo valor no Vercel Cron.
   - `ALWAYS_BCC` (opcional): recebe uma cópia oculta de todo e-mail enviado (manual ou automático).
2. Instale as dependências e rode:
   ```sh
   npm install
   npm run dev
   ```
3. Acesse `/api/setup` uma vez para criar/atualizar as tabelas no banco.
4. Faça login com a `APP_PASSWORD` e cadastre um servidor de envio em **Configurações**:
   - **API de E-mail da Hostinger** (recomendado): gere um token em *E-mails → Desenvolvedores → Chaves de API* no hPanel e informe o e-mail remetente + token. O sistema valida o token e resolve a caixa automaticamente ao salvar.
   - **SMTP**: host, porta, usuário e senha da caixa de e-mail.

## Automação de fluxos (drip campaigns)

O processamento da fila (`/api/flows/process`) precisa ser chamado periodicamente para enviar os próximos passos de cada fluxo ativo. Isso é feito via [Vercel Cron](https://vercel.com/docs/cron-jobs), configurado em `vercel.json`.

> No plano Hobby da Vercel, cron jobs só podem rodar 1x/dia. Para intervalos menores (ex.: a cada 30 min, como configurado aqui) é necessário o plano Pro, ou usar um serviço externo (ex. cron-job.org) apontando para essa URL com o header `Authorization: Bearer <CRON_SECRET>`.

## Histórico de envios (aba "Histórico")

Cada e-mail enviado (manual ou por fluxo) grava uma linha em `email_logs` com status de envio (Enviado/Falhou) e se foi aberto (via pixel de rastreamento, `/api/track`). Limitações a ter em mente:

- **"Enviado"** significa que o servidor de e-mail aceitou a mensagem — não é garantia de que ela chegou à caixa de entrada do destinatário (pode cair em spam, ser rejeitada pelo servidor de destino depois, etc.). Confirmação real de entrega exigiria tratar bounces, o que este sistema não faz hoje.
- **"Aberto"** depende do cliente de e-mail carregar a imagem do pixel — alguns bloqueiam isso por padrão, então a contagem real de aberturas tende a ser maior do que o rastreado.

## Comandos

| Comando           | Ação                                          |
| :---------------- | :--------------------------------------------- |
| `npm run dev`     | Servidor local em `localhost:4321`             |
| `npm run build`   | Build de produção em `./dist/`                 |
| `npm run preview` | Preview do build local                         |
