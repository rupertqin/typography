import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

/**
 * 构建产物与挂载路径无关：build 一律用 base `/`，随后 scripts/relativize.mjs
 * 把 HTML 的根绝对引用改成相对引用，同一份 dist 可挂在任意路径。
 * 只有 dev 需要 BASE_PATH（dev server 按 base 注册路由）。
 */
const rawBase = (process.env.BASE_PATH ?? '').trim();
const devBase = !rawBase || rawBase === '/' ? '/' : `/${rawBase.replace(/^\/+|\/+$/g, '')}`;
// 只有 dev server 需要前缀；build / preview / sync 一律走站点根
const isDevCommand = process.argv.some((arg) => arg === 'dev' || arg === 'start');

export default defineConfig({
  base: isDevCommand ? devBase : '/',
  integrations: [react()],
  server: {
    host: '0.0.0.0',
  },
  vite: {
    server: {
      host: '0.0.0.0',
      allowedHosts: true,
    },
    // mermaid 是动态 import 的大依赖：先预构建，dev 下它的 dep URL 才稳定。
    // 否则首次访问时 Vite 临时发现并重新优化，旧页面拿着过期的 ?v=hash 会 404。
    optimizeDeps: {
      include: ['mermaid'],
    },
  },
});
