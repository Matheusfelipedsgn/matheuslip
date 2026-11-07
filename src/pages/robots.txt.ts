import type { APIRoute } from 'astro';

// Gerado no build para apontar o sitemap no domínio de produção que a Vercel informa.
export const GET: APIRoute = ({ site }) => {
  const linhas = ['User-agent: *', 'Allow: /'];
  if (site) linhas.push('', `Sitemap: ${new URL('/sitemap-index.xml', site).href}`);
  return new Response(`${linhas.join('\n')}\n`, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
};
