import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel'; // Atualizado (removemos o /serverless)

export default defineConfig({
  output: 'server',
  adapter: vercel(),
});