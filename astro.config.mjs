import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

/**
 * 构建产物与挂载路径无关：`astro build` 一律用 base `/`，构建完成后
 * `scripts/relativize.mjs` 把 HTML 里的根绝对引用改成相对引用，于是同一份
 * dist 可以同时挂在
 *   子域名根      https://typography.gantz.host/
 *   父站子路由    https://gantz.host/typography/
 *   GH Pages 项目 https://rupertqin.github.io/Typography/
 *
 * 只有本地 dev 还需要 BASE_PATH：Astro dev server 按 base 注册路由，父站 dev
 * 代理过来的 URL 保留 /typography 前缀，所以要 `BASE_PATH=/typography npm run dev`。
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
  },
});
