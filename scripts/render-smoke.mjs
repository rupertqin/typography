#!/usr/bin/env node
/**
 * 渲染管线冒烟测试：用 esbuild 把 TS 入口打成临时模块，在 Node + jsdom 下跑 35 套主题。
 * 不访问目标站，只验证本地移植的渲染/配色逻辑。
 */
import { build } from 'esbuild';
import { mkdirSync, rmSync, rmdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const workdir = resolve(ROOT, 'node_modules/.cache/zhaotab-smoke');
mkdirSync(workdir, { recursive: true });
const outfile = join(workdir, 'entry.mjs');

try {
  await build({
    entryPoints: [resolve(ROOT, 'scripts/render-smoke-entry.ts')],
    bundle: true,
    platform: 'node',
    format: 'esm',
    outfile,
    external: ['jsdom'],
    logLevel: 'silent',
  });
  await import(pathToFileURL(outfile).href);
} finally {
  rmSync(outfile, { force: true });
  rmdirSync(workdir);
}
