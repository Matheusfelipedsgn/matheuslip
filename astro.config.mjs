import { defineConfig } from 'astro/config';

// A Vercel informa o domínio de produção no build. Ele gera a URL canônica e as URLs absolutas do Open Graph.
const domain = process.env.VERCEL_PROJECT_PRODUCTION_URL;

export default defineConfig({
  site: domain ? `https://${domain}` : undefined,
});
