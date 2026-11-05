import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

/**
 * 部署前缀（默认为站点根）：
 *   本地 / 独立 Cloudflare   BASE_PATH 不设或 `/`
 *   父站子功能               BASE_PATH=/typography
 *   GitHub Pages 项目站点    BASE_PATH=/Typography
 * `site` 影响 sitemap/canonical，可选：SITE_URL=https://gantz.host
 */
const rawBase = (process.env.BASE_PATH ?? '').trim();
const base = !rawBase || rawBase === '/' ? '/' : `/${rawBase.replace(/^\/+|\/+$/g, '')}`;

export default defineConfig({
  site: process.env.SITE_URL || undefined,
  base,
  integrations: [react()],
  server: {
    host: '0.0.0.0',
  },
  vite: {
    server: {
      host: '0.0.0.0',
      allowedHosts: true,
    },
  },
});
