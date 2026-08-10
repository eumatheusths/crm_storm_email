import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel'; // Atualizado (removemos o /serverless)

export default defineConfig({
  output: 'server',
  adapter: vercel({
    // /api/flows/process manda e-mails com pausa entre cada um (evita rajada
    // e bloqueio antispam), então a função demora mais que o padrão de 10s.
    maxDuration: 60,
  }),
});