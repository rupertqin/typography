/**
 * 主题数据护栏（由 scripts/check-themes.mjs 打包后执行）：主题套件 + 代码配色表的形态校验。
 *
 * 主题是一个文件一套（src/lib/themes/catalog/*.ts），这些断言就是改动它们时的安全网：
 * 数量/顺序/样式键/decor 可调用/Theme 派生方法，以及代码配色的 token 完整性。
 * 数量或键位被误删会在这里炸掉，而不是在浏览器里静默渲染成空样式。
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { CODE_THEMES, CodeTheme, HLJS_VERSION } from '../src/lib/code-themes/index';
import { BASE_THEMES, MD_THEMES, THEMES, Theme, THEME_FONTS } from '../src/lib/themes/index';
import type { ThemeDecor } from '../src/lib/types';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** 主题顺序 = 主题菜单顺序，改名/挪位置都要先改这里，再改 catalog */
const EXPECTED_IDS = [
  'simple', 'orange', 'mint', 'green', 'forest', 'blue', 'ocean', 'violet', 'rose',
  'sakura', 'lemon', 'notebook', 'coffee', 'ink', 'gold', 'news', 'grid', 'blush',
  'festival', 'terminal', 'docs', 'magazine', 'pop', 'timeline', 'seal', 'whisper',
  'neon', 'kraft', 'briefing', 'bubble', 'inkwash', 'nordic', 'candy', 'feed',
  'checklist',
  // 从 md.doocs 移植的三套（catalog/md-*.ts）
  'md-classic', 'md-grace', 'md-simple',
];

const REQUIRED_STYLES = [
  'wrapper', 'p', 'h1', 'h2', 'h3', 'h4', 'strong', 'em', 'del', 'sup', 'sub',
  'link', 'blockquote', 'blockquoteP', 'ul', 'ol', 'li', 'code', 'pre', 'preBar',
  'preCode', 'hr', 'tableWrap', 'table', 'th', 'td', 'fnRef', 'footnotes',
  'fnTitle', 'fnItem', 'imgSlot',
];

/** 装饰函数用固定入参试调用，返回值必须是包含标题文本的字符串 */
const DECOR_ARGS: Record<string, unknown[]> = {
  h1: ['标题'],
  h2: ['标题', 1],
  h3: ['标题'],
};

const errors: string[] = [];
const warnings: string[] = [];

/* ------------------------------- 主题套件 ------------------------------- */

if (!Array.isArray(THEMES)) errors.push('THEMES 不是数组');
else if (THEMES.length !== EXPECTED_IDS.length) {
  errors.push(`主题数量 ${THEMES.length}，期望 ${EXPECTED_IDS.length}`);
}
if (BASE_THEMES.length !== 35) errors.push(`主题套件数量 ${BASE_THEMES.length}，期望 35`);
if (MD_THEMES.length !== 3) errors.push(`md 移植主题数量 ${MD_THEMES.length}，期望 3`);

const ids = THEMES.map((theme) => theme.id);
if (ids.join(',') !== EXPECTED_IDS.join(',')) {
  errors.push(`主题顺序不一致：\n实际 ${ids.join(',')}\n期望 ${EXPECTED_IDS.join(',')}`);
}

for (const theme of THEMES) {
  const themeId = (theme as { id?: string }).id ?? '(无 id)';
  if (!(theme instanceof Theme)) {
    errors.push(`${themeId}: 不是 Theme 实例`);
    continue;
  }
  for (const key of REQUIRED_STYLES) {
    if (typeof theme.styles[key] !== 'string' || !theme.styles[key]) {
      errors.push(`${theme.id}: 缺少样式键 ${key}`);
    }
  }
  if (!/^#[0-9a-f]{6}$/i.test(theme.accent ?? '')) errors.push(`${theme.id}: accent 非法`);
  if (!theme.styles.wrapper?.includes('font-family')) errors.push(`${theme.id}: wrapper 未包含字体`);
  if (typeof theme.hljs !== 'object' || !theme.hljs || !Object.keys(theme.hljs).length) {
    errors.push(`${theme.id}: 缺少 hljs 调色板`);
  }

  const decor = theme.decor as ThemeDecor;
  for (const [key, args] of Object.entries(DECOR_ARGS)) {
    const decorate = decor[key];
    if (decorate === undefined) continue;
    if (typeof decorate !== 'function') {
      errors.push(`${theme.id}.decor.${key} 不是函数`);
      continue;
    }
    try {
      const out = decorate(...(args as [string, number]));
      if (typeof out !== 'string' || !out.includes('标题')) {
        errors.push(`${theme.id}.decor.${key} 输出丢失标题文本`);
      }
    } catch (err) {
      errors.push(`${theme.id}.decor.${key} 调用抛错：${(err as Error).message}`);
    }
  }
  for (const key of ['ulMark', 'olMark'] as const) {
    const mark = decor[key];
    if (mark === undefined) continue;
    if (typeof mark === 'function') {
      if (typeof mark(2) !== 'string') errors.push(`${theme.id}.decor.${key} 调用无输出`);
    } else if (typeof mark !== 'string') {
      errors.push(`${theme.id}.decor.${key} 类型异常`);
    }
  }
}

if (!THEME_FONTS?.sans || !THEME_FONTS?.serif || !THEME_FONTS?.mono) {
  errors.push('THEME_FONTS 不完整');
}

/* ------------------------- Theme 类的派生方法自检 ------------------------- */

const sample = THEMES[0];
const patched = sample.withStyles({ p: 'margin:0;' });
const decorated = sample.withDecor({ hr: '<hr>' });
if (patched.styles.p !== 'margin:0;') errors.push('withStyles 没有覆盖目标键');
if (patched.styles.wrapper !== sample.styles.wrapper) errors.push('withStyles 丢掉了基础样式');
if (sample.styles.p === 'margin:0;') errors.push('withStyles 修改了原实例');
if (decorated.decor.hr !== '<hr>') errors.push('withDecor 没有覆盖目标键');
if (sample.decor.hr) errors.push('withDecor 修改了原实例');
if (sample.toSpec().id !== sample.id) errors.push('toSpec 反解失败');

/* ------------------------------ 代码配色表 ------------------------------ */

if (!Array.isArray(CODE_THEMES)) {
  errors.push('CODE_THEMES 不是数组');
} else {
  if (CODE_THEMES.length < 60) errors.push(`代码配色只有 ${CODE_THEMES.length} 套，期望 ≥60`);

  const codeIds = CODE_THEMES.map((theme) => theme.id);
  const duplicated = [...new Set(codeIds.filter((id, index) => codeIds.indexOf(id) !== index))];
  if (duplicated.length) errors.push(`代码配色 id 重复：${duplicated.join(', ')}`);

  for (const theme of CODE_THEMES) {
    const themeId = (theme as { id?: string }).id ?? '(无 id)';
    if (!(theme instanceof CodeTheme)) {
      errors.push(`${themeId}: 不是 CodeTheme 实例`);
      continue;
    }
    if (typeof theme.label !== 'string' || !theme.label) errors.push(`${theme.id}: 缺少 label`);
    if (typeof theme.dark !== 'boolean') errors.push(`${theme.id}: dark 不是布尔值`);
    if (typeof theme.foreground !== 'string') errors.push(`${theme.id}: foreground 不是字符串`);
    if (typeof theme.background !== 'string') errors.push(`${theme.id}: background 不是字符串`);

    const tokens = Object.entries(theme.tokens);
    if (tokens.length < 6) errors.push(`${theme.id}: 只有 ${tokens.length} 条 token 规则，期望 ≥6`);
    for (const [token, style] of tokens) {
      if (token.startsWith('hljs-')) errors.push(`${theme.id}.${token}: token 名不该带 hljs- 前缀`);
      if (typeof style !== 'string' || !style.trim()) errors.push(`${theme.id}.${token}: 内联声明非法`);
      else if (/[{}]/.test(style)) errors.push(`${theme.id}.${token}: 内联声明里混入了 CSS 规则块`);
    }
  }

  if (!CODE_THEMES.some((theme) => theme.dark)) errors.push('代码配色里没有暗色主题');
  if (!CODE_THEMES.some((theme) => !theme.dark)) errors.push('代码配色里没有亮色主题');
  if (!CODE_THEMES.find((theme) => theme.id === 'atom-one-light')?.tokens.keyword) {
    errors.push('atom-one-light 缺少 keyword 着色，配色表可能被改坏');
  }

  // CodeTheme 的方法自检：预览色条与内联调色板都从实例上取
  const sampleCode = CODE_THEMES[0];
  if (!sampleCode.swatch(['keyword', 'string']).colors.length) errors.push('CodeTheme#swatch 取不到颜色');
  const palette = sampleCode.palette();
  if (palette.tokens !== sampleCode.tokens) errors.push('CodeTheme#palette 的 tokens 与实例不一致');
  if (palette.background !== sampleCode.background) errors.push('CodeTheme#palette 的 background 不一致');
  if (sampleCode.toSpec().id !== sampleCode.id) errors.push('CodeTheme#toSpec 反解失败');
}

// 手写源不会跟着依赖升级：版本对不上时提示手动同步（不判失败）
const hljsPackage = resolve(ROOT, 'node_modules/highlight.js/package.json');
if (existsSync(hljsPackage)) {
  const installed = JSON.parse(readFileSync(hljsPackage, 'utf8')).version;
  if (installed !== HLJS_VERSION) {
    warnings.push(
      `HLJS_VERSION=${HLJS_VERSION}，本地 highlight.js 是 ${installed}：升级依赖后需手动同步 code-themes/catalog.ts 与 HLJS_VERSION`,
    );
  }
}

/* --------------------------------- 输出 --------------------------------- */

for (const warning of warnings) console.warn('[check-themes] 提醒：', warning);

if (errors.length) {
  console.error('[check-themes] 失败：');
  for (const err of errors) console.error(' -', err);
  process.exit(1);
}

console.log(
  `[check-themes] 通过：${THEMES.length} 套主题（套件 ${BASE_THEMES.length} + md 移植 ${MD_THEMES.length}）样式键齐全，装饰函数与派生方法可调用`,
);
console.log(`[check-themes] 通过：${CODE_THEMES.length} 套代码配色 token 完整（hljs ${HLJS_VERSION}）`);
console.log(
  `[check-themes] 字体：sans=${THEME_FONTS.sans.slice(0, 24)}… serif=${THEME_FONTS.serif.slice(0, 16)}… mono=${THEME_FONTS.mono.slice(0, 16)}…`,
);
