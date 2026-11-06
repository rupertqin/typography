#!/usr/bin/env node
/**
 * 从本地 highlight.js 包里抽出「代码配色表」，生成 src/lib/code-themes.generated.js。
 *
 * 为什么要生成：公众号会丢掉 class，代码块着色必须是内联样式。highlight.js 的
 * 配色是 `.hljs-keyword { color: … }` 这类 CSS 规则，运行时解析要额外的 CSS
 * 解析器与产物不确定性；在构建期烘成 { token → 内联声明 } 的查表，运行时只做
 * 一次替换，产物天然全内联。
 *
 * 解析范围：node_modules/highlight.js/styles/*.css（不含 *.min.css、不含 base16/
 * 子目录——那 176 套变体在 UI 里只会变成噪音）。
 *
 * 处理细节（都是踩过的点）：
 *   - @media 块（a11y-* 的暗色变体）整块丢掉，否则嵌套大括号会让规则解析错位；
 *   - :root/:host 里的 --hljs-* 变量要解析，cybertopia 系列全部靠它们；
 *   - 后代选择器（.hljs-meta .hljs-string）表达不成单个 class 的样式，跳过；
 *   - `pre code.hljs` / `code.hljs` 只是 padding，跳过；
 *   - 多选择器规则（A, B { }）逐个展开，同一 token 多条规则按属性合并。
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const STYLES = resolve(ROOT, 'node_modules/highlight.js/styles');
const OUT = resolve(ROOT, 'src/lib/code-themes.generated.js');

/** 只保留会影响观感的声明，padding/display 之类由主题自己的 pre 样式负责 */
const KEPT_PROPS = ['color', 'background', 'background-color', 'font-style', 'font-weight', 'text-decoration'];
const ORDER = ['color', 'background', 'background-color', 'font-style', 'font-weight', 'text-decoration'];

/** 缩写/专有名词的大小写 */
const WORD_CASE = {
  '1c': '1C',
  a11y: 'A11y',
  gml: 'GML',
  ir: 'IR',
  isbl: 'ISBL',
  github: 'GitHub',
  nnfx: 'NNFX',
  qtcreator: 'QtCreator',
  vs: 'VS',
  vs2015: 'VS2015',
  xt256: 'XT256',
  xcode: 'Xcode',
  tokyo: 'Tokyo',
};

function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

/** 去掉 @media / @supports 等块（含嵌套大括号），避免规则解析错位 */
function stripAtBlocks(css) {
  let out = '';
  let index = 0;
  while (index < css.length) {
    const at = css.indexOf('@', index);
    if (at < 0) {
      out += css.slice(index);
      break;
    }
    out += css.slice(index, at);
    const open = css.indexOf('{', at);
    if (open < 0) break;
    let depth = 0;
    let cursor = open;
    for (; cursor < css.length; cursor += 1) {
      if (css[cursor] === '{') depth += 1;
      else if (css[cursor] === '}') {
        depth -= 1;
        if (depth === 0) break;
      }
    }
    index = cursor + 1;
  }
  return out;
}

function parseRules(css) {
  const rules = [];
  const regex = /([^{}]+)\{([^{}]*)\}/g;
  let match;
  while ((match = regex.exec(css))) {
    rules.push({ selector: match[1].trim(), body: match[2] });
  }
  return rules;
}

function parseDeclarations(body) {
  const declarations = new Map();
  for (const part of body.split(';')) {
    const colon = part.indexOf(':');
    if (colon < 0) continue;
    const prop = part.slice(0, colon).trim().toLowerCase();
    const value = part
      .slice(colon + 1)
      .replace(/!important/i, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!prop || !value) continue;
    declarations.set(prop, value);
  }
  return declarations;
}

/** 把 var(--x) 就地展开（cybertopia 等主题全靠变量） */
function resolveVars(value, vars, depth = 0) {
  if (depth > 5 || !value.includes('var(')) return value;
  const next = value.replace(/var\(\s*(--[\w-]+)\s*(?:,([^()]*))?\)/g, (whole, name, fallback) => {
    if (vars.has(name)) return vars.get(name);
    return fallback ? fallback.trim() : whole;
  });
  return next === value ? value : resolveVars(next, vars, depth + 1);
}

function humanize(id) {
  return id
    .split('-')
    .map((word) => WORD_CASE[word] ?? (word ? word[0].toUpperCase() + word.slice(1) : word))
    .join(' ');
}

function luminance(color) {
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color ?? '');
  if (!hex) return 1;
  let body = hex[1];
  if (body.length === 3) body = body.replace(/./g, (char) => char + char);
  const value = Number.parseInt(body, 16);
  const channel = (shift) => {
    const raw = ((value >> shift) & 255) / 255;
    return raw <= 0.03928 ? raw / 12.92 : ((raw + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(16) + 0.7152 * channel(8) + 0.0722 * channel(0);
}

function buildTheme(id, css) {
  const rules = parseRules(stripAtBlocks(stripComments(css)));

  const vars = new Map();
  for (const rule of rules) {
    for (const [prop, value] of parseDeclarations(rule.body)) {
      if (prop.startsWith('--') && !vars.has(prop)) vars.set(prop, value);
    }
  }

  const root = new Map();
  const tokens = new Map();

  for (const rule of rules) {
    for (const rawSelector of rule.selector.split(',')) {
      const selector = rawSelector.trim().replace(/\s+/g, ' ');
      if (!selector || /[\s>+~]/.test(selector)) continue; // 后代/兄弟选择器表达不成单 class
      const declarations = parseDeclarations(rule.body);
      if (selector === '.hljs') {
        for (const [prop, value] of declarations) {
          if (KEPT_PROPS.includes(prop)) root.set(prop, resolveVars(value, vars));
        }
        continue;
      }
      const token = /^\.hljs-([\w-]+)$/.exec(selector)?.[1];
      if (!token) continue;
      const bucket = tokens.get(token) ?? new Map();
      for (const [prop, value] of declarations) {
        if (KEPT_PROPS.includes(prop)) bucket.set(prop, resolveVars(value, vars));
      }
      tokens.set(token, bucket);
    }
  }

  const serialize = (map) =>
    ORDER.filter((prop) => map.has(prop))
      .map((prop) => `${prop}:${map.get(prop)};`)
      .join('');

  const tokenStyles = {};
  for (const [token, declarations] of tokens) {
    const style = serialize(declarations);
    if (style) tokenStyles[token] = style;
  }

  const background = root.get('background') ?? root.get('background-color') ?? '';
  return {
    id,
    label: humanize(id),
    dark: luminance(background) < 0.5,
    foreground: root.get('color') ?? '',
    background,
    tokens: tokenStyles,
  };
}

if (!existsSync(STYLES)) {
  throw new Error(`找不到 highlight.js 样式目录：${STYLES}（先 npm install）`);
}

const files = readdirSync(STYLES)
  .filter((name) => name.endsWith('.css') && !name.endsWith('.min.css'))
  .sort();

const themes = [];
for (const file of files) {
  const id = file.slice(0, -4);
  const built = buildTheme(id, readFileSync(join(STYLES, file), 'utf8'));
  if (Object.keys(built.tokens).length < 6) {
    console.warn(`[code-themes] 跳过 ${id}：识别到的 token 太少`);
    continue;
  }
  themes.push(built);
}

if (themes.length < 60) {
  throw new Error(`配色数量异常：只解析出 ${themes.length} 套，期望 ≥60`);
}
if (!themes.some((theme) => theme.id === 'atom-one-light' && theme.tokens.keyword)) {
  throw new Error('校验失败：atom-one-light 缺少 keyword 着色，解析逻辑可能失效');
}
if (!themes.some((theme) => theme.dark)) {
  throw new Error('校验失败：没有识别出任何暗色配色');
}
if (!themes.some((theme) => !theme.dark)) {
  throw new Error('校验失败：没有识别出任何亮色配色');
}

const hljsVersion = JSON.parse(readFileSync(resolve(ROOT, 'node_modules/highlight.js/package.json'), 'utf8')).version;

const banner = `// @generated by scripts/generate-code-themes.mjs — 请勿手改
// 来源：node_modules/highlight.js/styles/*.css（highlight.js ${hljsVersion}）
// 内容：${themes.length} 套代码配色的 token 内联声明（class 会被公众号丢弃，所以烘成 style）
`;

const body = `export const CODE_THEMES = [
${themes
  .map(
    (theme) =>
      `  { id: ${JSON.stringify(theme.id)}, label: ${JSON.stringify(theme.label)}, dark: ${theme.dark}, foreground: ${JSON.stringify(theme.foreground)}, background: ${JSON.stringify(theme.background)}, tokens: ${JSON.stringify(theme.tokens)} }`,
  )
  .join(',\n')},
];
`;

const footer = `
export const CODE_THEME_IDS = CODE_THEMES.map((theme) => theme.id);
export const CODE_THEMES_BY_ID = Object.fromEntries(CODE_THEMES.map((theme) => [theme.id, theme]));
/** CDN 兜底加载语法时用同一版本，避免语法与本地 highlight.js 版本错位 */
export const HLJS_VERSION = ${JSON.stringify(hljsVersion)};
`;

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, `${banner}${body}${footer}`, 'utf8');

const tokenTotal = themes.reduce((sum, theme) => sum + Object.keys(theme.tokens).length, 0);
console.log(`[code-themes] 已写入 ${OUT}`);
console.log(`[code-themes] ${themes.length} 套配色 / ${tokenTotal} 条 token 规则`);
console.log(`[code-themes] 暗色 ${themes.filter((theme) => theme.dark).length} 套，亮色 ${themes.filter((theme) => !theme.dark).length} 套`);
