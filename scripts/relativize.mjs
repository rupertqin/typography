#!/usr/bin/env node
/**
 * 把 dist 里 HTML 的根绝对引用改成相对引用，让同一份产物可以挂在任意路径：
 *   https://typography.gantz.host/           → ./_astro/x.js  → /_astro/x.js
 *   https://gantz.host/typography/           → /typography/_astro/x.js
 *   https://rupertqin.github.io/Typography/  → /Typography/_astro/x.js
 *
 * Astro 的 base 是构建期常量且会被规范成 `/./`（仍是根绝对），所以相对化只能
 * 放在构建之后做。只改属性值，不碰内联脚本里的字符串，避免误伤。
 *
 * 前提：单 HTML 入口 + 无客户端路由。多页时相对深度要按页面层级算。
 */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST = fileURLToPath(new URL('../dist/', import.meta.url));
const ATTRS = ['src', 'href', 'component-url', 'renderer-url'];
const ATTR_RE = new RegExp(`\\b(${ATTRS.join('|')})=(["'])\\/(?!\\/)`, 'g');
const ROOT_REF_RE = new RegExp(`\\b(${ATTRS.join('|')})=["']\\/(?!\\/)`);

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(p)));
    else out.push(p);
  }
  return out;
}

const files = await walk(DIST);
const htmlFiles = files.filter((f) => f.endsWith('.html'));

if (htmlFiles.length === 0) {
  console.error(`[relativize] ${DIST} 下没有 HTML，构建可能失败了`);
  process.exit(1);
}

let total = 0;
for (const file of htmlFiles) {
  const html = await readFile(file, 'utf8');
  const next = html.replace(ATTR_RE, '$1=$2./');
  const count = (html.match(ATTR_RE) || []).length;
  if (next !== html) await writeFile(file, next);
  total += count;

  // CSS 里的 url(/…) 是相对该 CSS 文件的，不能简单相对化，这里只提示
  if (ROOT_REF_RE.test(next)) {
    console.warn(`[relativize] ${file.slice(DIST.length)} 仍有根绝对引用，请检查`);
  }
  console.log(`[relativize] ${file.slice(DIST.length)}: ${count} 处引用改为相对`);
}

// JS/CSS 里的绝对路径不会被上面的属性替换覆盖到，出现即警告（挂子路径会 404）
for (const file of files) {
  if (!/\.(js|css)$/.test(file)) continue;
  const src = await readFile(file, 'utf8');
  if (/["']\/_astro\//.test(src) || /url\(\s*["']?\//.test(src)) {
    console.warn(
      `[relativize] ${file.slice(DIST.length)} 里有根绝对引用（JS/CSS 内部），挂到子路径会 404`,
    );
  }
}

console.log(`[relativize] 完成：${htmlFiles.length} 个 HTML，共 ${total} 处引用相对化`);
