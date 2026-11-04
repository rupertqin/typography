#!/usr/bin/env node
/**
 * 主题模块冒烟校验：结构、数量、顺序、装饰函数可调用。
 * 任何切片偏移错误都会在这里炸掉，而不是在浏览器里静默渲染成空样式。
 */
import { THEMES, THEME_FONTS } from '../src/lib/themes.generated.js';

const EXPECTED_IDS = [
  'simple', 'orange', 'mint', 'green', 'forest', 'blue', 'ocean', 'violet', 'rose',
  'sakura', 'lemon', 'notebook', 'coffee', 'ink', 'gold', 'news', 'grid', 'blush',
  'festival', 'terminal', 'docs', 'magazine', 'pop', 'timeline', 'seal', 'whisper',
  'neon', 'kraft', 'briefing', 'bubble', 'inkwash', 'nordic', 'candy', 'feed',
  'checklist',
];

const REQUIRED_STYLES = [
  'wrapper', 'p', 'h1', 'h2', 'h3', 'h4', 'strong', 'em', 'del', 'sup', 'sub',
  'link', 'blockquote', 'blockquoteP', 'ul', 'ol', 'li', 'code', 'pre', 'preBar',
  'preCode', 'hr', 'tableWrap', 'table', 'th', 'td', 'fnRef', 'footnotes',
  'fnTitle', 'fnItem', 'imgSlot',
];

const errors = [];

if (!Array.isArray(THEMES)) errors.push('THEMES 不是数组');
else if (THEMES.length !== 35) errors.push(`主题数量 ${THEMES.length}，期望 35`);

const ids = THEMES.map((t) => t.id);
if (ids.join(',') !== EXPECTED_IDS.join(',')) {
  errors.push(`主题顺序不一致：\n实际 ${ids.join(',')}\n期望 ${EXPECTED_IDS.join(',')}`);
}

for (const theme of THEMES) {
  for (const key of REQUIRED_STYLES) {
    if (typeof theme.styles?.[key] !== 'string' || !theme.styles[key]) {
      errors.push(`${theme.id}: 缺少样式键 ${key}`);
    }
  }
  if (!/^#[0-9a-f]{6}$/i.test(theme.accent ?? '')) errors.push(`${theme.id}: accent 非法`);
  if (typeof theme.wrapper !== 'string' && !theme.styles?.wrapper?.includes('font-family')) {
    errors.push(`${theme.id}: wrapper 未包含字体`);
  }
  if (typeof theme.hljs !== 'object' || !theme.hljs) errors.push(`${theme.id}: 缺少 hljs 调色板`);

  const decor = theme.decor ?? {};
  for (const key of ['h1', 'h2', 'h3']) {
    if (decor[key] === undefined) continue;
    if (typeof decor[key] !== 'function') {
      errors.push(`${theme.id}.decor.${key} 不是函数`);
      continue;
    }
    let out;
    try {
      out = stringify(decor[key](key === 'h2' ? '标题' : '标题', 1));
    } catch (err) {
      errors.push(`${theme.id}.decor.${key} 调用抛错：${err.message}`);
      continue;
    }
    if (out !== undefined && typeof out === 'string' && !out.includes('标题')) {
      errors.push(`${theme.id}.decor.${key} 输出丢失标题文本`);
    }
  }
  for (const key of ['ulMark', 'olMark']) {
    const mark = decor[key];
    if (mark === undefined) continue;
    if (typeof mark === 'function') {
      const out = stringify(mark(2));
      if (typeof out !== 'string' || !out) errors.push(`${theme.id}.decor.${key} 调用无输出`);
    } else if (typeof mark !== 'string') {
      errors.push(`${theme.id}.decor.${key} 类型异常`);
    }
  }
}

function stringify(value) {
  // 部分装饰函数直接返回字符串，另一部分返回 { html } 形式之外的原始文本
  return typeof value === 'string' ? value : undefined;
}

if (!THEME_FONTS?.sans || !THEME_FONTS?.serif || !THEME_FONTS?.mono) {
  errors.push('THEME_FONTS 不完整');
}

if (errors.length) {
  console.error('[check-themes] 失败：');
  for (const err of errors) console.error(' -', err);
  process.exit(1);
}

console.log(`[check-themes] 通过：${THEMES.length} 套主题，样式键齐全，装饰函数可调用`);
console.log(`[check-themes] 字体：sans=${THEME_FONTS.sans.slice(0, 24)}… serif=${THEME_FONTS.serif.slice(0, 16)}… mono=${THEME_FONTS.mono.slice(0, 16)}…`);
