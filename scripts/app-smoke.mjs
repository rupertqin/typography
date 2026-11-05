#!/usr/bin/env node
/** 组件级冒烟：esbuild 打包 React 岛 → jsdom 挂载 → 模拟点击 */
import { build } from 'esbuild';
import { mkdirSync, rmSync, rmdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const workdir = resolve(ROOT, 'node_modules/.cache/typography-app-smoke');
const outfile = join(workdir, 'entry.mjs');
mkdirSync(workdir, { recursive: true });

try {
  await build({
    entryPoints: [resolve(ROOT, 'scripts/app-smoke-entry.tsx')],
    bundle: true,
    platform: 'node',
    format: 'esm',
    jsx: 'automatic',
    outfile,
    external: ['jsdom'],
    logLevel: 'silent',
    define: {
      'process.env.NODE_ENV': '"development"',
      // 组件里读 import.meta.env（Astro/Vite 注入），esbuild 直跑 node 时没有该对象
      'import.meta.env.PUBLIC_BACK_URL': '""',
    },
  });
  await import(pathToFileURL(outfile).href);
} finally {
  rmSync(outfile, { force: true });
  rmdirSync(workdir);
}
