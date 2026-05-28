const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const publicDir = path.join(projectRoot, 'public');
const configuredBaseUrl = process.env.APP_BASE_URL || process.env.VITE_APP_BASE_URL || 'https://puzzleflow.ai';
const baseUrl = configuredBaseUrl.replace(/\/$/, '');

const routes = ['/', '/landing', '/app', '/demo', '/terms', '/privacy'];
const today = new Date().toISOString().slice(0, 10);

fs.mkdirSync(publicDir, { recursive: true });

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes.map((route) => `  <url>
    <loc>${baseUrl}${route}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${route === '/' || route === '/landing' ? 'weekly' : 'monthly'}</changefreq>
    <priority>${route === '/' ? '1.0' : route === '/landing' ? '0.9' : route === '/demo' ? '0.8' : '0.5'}</priority>
  </url>`).join('\n')}
</urlset>
`;

const robots = `User-agent: *
Allow: /

Sitemap: ${baseUrl}/sitemap.xml
`;

fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), sitemap);
fs.writeFileSync(path.join(publicDir, 'robots.txt'), robots);

console.log(`Generated sitemap.xml and robots.txt for ${baseUrl}`);
