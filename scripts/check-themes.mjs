#!/usr/bin/env node
/**
 * 主题数据护栏的运行器：用 esbuild 把 TS 入口打成临时模块再执行。
 *
 * 主题是 TypeScript（src/lib/themes/），Node 不能直接解析无扩展名的相对导入，
 * 所以沿用 render-smoke 的做法：打包到 node_modules/.cache 再 import。
 */
import { build } from 'esbuild';
import { mkdirSync, rmSync, rmdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const workdir = resolve(ROOT, 'node_modules/.cache/typography-check-themes');
mkdirSync(workdir, { recursive: true });
const outfile = join(workdir, 'entry.mjs');

try {
  await build({
    entryPoints: [resolve(ROOT, 'scripts/check-themes-entry.ts')],
    bundle: true,
    platform: 'node',
    format: 'esm',
    outfile,
    logLevel: 'silent',
  });
  await import(pathToFileURL(outfile).href);
} finally {
  rmSync(outfile, { force: true });
  rmdirSync(workdir);
}
