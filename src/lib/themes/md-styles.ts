/**
 * md.doocs 三套主题（md-classic / md-grace / md-simple）共用的样式底子。
 *
 * 它那边主题是「CSS 文件 + #output 作用域 + 复制时 juice 内联」，这里翻译成
 * 本项目的逐元素内联样式：主色统一用 --md-primary-color 的默认值 #0F4C81，
 * 所有与主色相关的 rgba()/色值都写成同一个蓝，改主色时才能被 recolor 正确重映射。
 * 代码块沿用 doocs 默认的 github-dark-dimmed 配色。
 */
import { CODE_THEMES_BY_ID } from '../code-themes';
import type { ThemeStyles } from '../types';

const ACCENT = '#0f4c81';
const BODY = '#333333';
const MONO = 'Menlo,Monaco,Consolas,"Courier New",monospace';
const FONT =
  '-apple-system,BlinkMacSystemFont,"Helvetica Neue","PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif';

const codeTheme = CODE_THEMES_BY_ID['github-dark-dimmed'];
const CODE_BG = codeTheme?.background ?? '#22272e';
const CODE_FG = codeTheme?.foreground ?? '#adbac7';
const HLJS = codeTheme?.tokens ?? {};

/** 三套主题共用的底子：正文、链接、代码块、表格、脚注 */
const BASE: ThemeStyles = {
  wrapper: `font-family:${FONT};font-size:15px;line-height:1.75;color:${BODY};letter-spacing:0.06em;word-break:break-word;`,
  p: 'margin:1.5em 0;',
  em: 'font-style:italic;',
  del: 'text-decoration:line-through;color:#9ca3af;',
  sup: 'font-size:75%;line-height:0;vertical-align:super;',
  sub: 'font-size:75%;line-height:0;vertical-align:sub;',
  link: 'color:#576b95;text-decoration:none;',
  code: `margin:0 2px;padding:2px 5px;border-radius:4px;border:1px solid rgba(15,76,129,0.2);background:rgba(15,76,129,0.08);color:${ACCENT};font-family:${MONO};font-size:90%;`,
  pre: `margin:1.4em 0;padding:0;border-radius:8px;background:${CODE_BG};overflow-x:auto;line-height:1.5;`,
  // doocs 的代码块没有 mac 三圆点，这里把圆点条藏掉
  preBar: 'display:none;',
  preCode: `display:block;padding:12px 14px;color:${CODE_FG};font-family:${MONO};font-size:13px;line-height:1.6;letter-spacing:0;white-space:nowrap;background:none;`,
  tableWrap: 'margin:1.4em 0;overflow-x:auto;',
  table: 'width:100%;border-collapse:collapse;font-size:14px;line-height:1.6;',
  th: 'padding:0.4em 0.6em;border:1px solid rgba(0,0,0,0.15);background:rgba(0,0,0,0.05);font-weight:bold;text-align:left;',
  td: 'padding:0.4em 0.6em;border:1px solid rgba(0,0,0,0.15);',
  fnRef: `margin:0 1px;font-size:75%;line-height:0;vertical-align:super;color:${ACCENT};`,
  footnotes:
    'margin:2.4em 0 1em;padding-top:1em;border-top:1px solid #e5e7eb;font-size:13px;line-height:1.7;color:#6b7280;',
  fnTitle: 'margin:0 0 0.6em;font-weight:bold;',
  fnItem: 'margin:0.3em 0;word-break:break-all;',
  imgSlot: `margin:1.4em 0;padding:22px 12px;border:1px dashed rgba(15,76,129,0.5);border-radius:6px;background:#fafafa;color:#9ca3af;font-size:13px;line-height:1.6;text-align:center;`,
};

const H4 = `margin:1.2em 0 0.5em;font-size:15px;font-weight:bold;line-height:1.5;color:${ACCENT};`;

const CLASSIC: ThemeStyles = {
  ...BASE,
  // 一级标题：下划线夹字，靠 display:table 让边框只包住文字
  h1: `display:table;margin:2em auto 1em;padding:0 1em;border-bottom:2px solid ${ACCENT};font-size:19px;font-weight:bold;line-height:1.6;color:#1f2937;text-align:center;`,
  // 二级标题：主题色底块 + 反白居中
  h2: `display:table;margin:2.2em auto 1.2em;padding:0 0.2em;background:${ACCENT};font-size:18px;font-weight:bold;line-height:1.6;color:#fff;text-align:center;`,
  h3: `margin:1.8em 0 0.8em;padding-left:8px;border-left:3px solid ${ACCENT};font-size:17px;font-weight:bold;line-height:1.4;color:#1f2937;`,
  h4: H4,
  strong: `font-weight:bold;color:${ACCENT};`,
  blockquote: `margin:1.4em 0;padding:1em;border-left:4px solid ${ACCENT};border-radius:6px;background:rgba(15,76,129,0.06);color:#374151;`,
  blockquoteP: 'margin:0.4em 0;',
  ul: 'margin:1em 0;padding-left:1.4em;list-style-type:circle;',
  ol: 'margin:1em 0;padding-left:1.4em;list-style-type:decimal;',
  li: 'margin:0.3em 0;',
  hr: 'margin:2em 0;height:0;border:0;border-top:2px solid rgba(0,0,0,0.1);',
};

const GRACE: ThemeStyles = {
  ...CLASSIC,
  h1: `display:table;margin:2em auto 1em;padding:0.4em 1em;border-bottom:2px solid ${ACCENT};font-size:19px;font-weight:bold;line-height:1.6;color:#1f2937;text-align:center;box-shadow:0 2px 4px rgba(0,0,0,0.06);`,
  h2: `display:table;margin:2.4em auto 1.2em;padding:0.3em 1em;background:${ACCENT};border-radius:8px;box-shadow:0 4px 6px rgba(0,0,0,0.1);font-size:18px;font-weight:bold;line-height:1.6;color:#fff;text-align:center;`,
  h3: `margin:1.8em 0 0.8em;padding-left:12px;border-left:4px solid ${ACCENT};border-bottom:1px dashed ${ACCENT};font-size:17px;font-weight:bold;line-height:1.6;color:#1f2937;`,
  blockquote: `margin:1.4em 0;padding:1em 1em 1em 2em;border-left:4px solid ${ACCENT};border-radius:6px;background:rgba(15,76,129,0.06);box-shadow:0 4px 6px rgba(0,0,0,0.05);font-style:italic;color:rgba(0,0,0,0.6);`,
  li: 'margin:0.5em 0;',
  hr: 'margin:2em 0;height:1px;border:0;background:linear-gradient(to right,rgba(0,0,0,0),rgba(0,0,0,0.18),rgba(0,0,0,0));',
  // 表格做成悬浮卡片，表头用主题色
  tableWrap: 'margin:1.4em 0;overflow-x:auto;border-radius:8px;box-shadow:0 4px 6px rgba(0,0,0,0.1);',
  table: 'width:100%;border-collapse:separate;border-spacing:0;font-size:14px;line-height:1.6;',
  th: `padding:0.5em 1em;border:0;background:${ACCENT};color:#fff;font-weight:bold;text-align:left;`,
  td: 'padding:0.5em 1em;border:0;border-top:1px solid rgba(0,0,0,0.08);',
};

const SIMPLE: ThemeStyles = {
  ...CLASSIC,
  h1: 'margin:1.8em 0 1em;padding:0.4em 1em;text-shadow:1px 1px 3px rgba(0,0,0,0.05);font-size:20px;font-weight:bold;line-height:1.6;color:#1f2937;',
  h2: `margin:2em 0 1.1em;padding:0.3em 1.2em;border-radius:8px 24px 8px 24px;box-shadow:0 2px 6px rgba(0,0,0,0.06);background:${ACCENT};font-size:18px;font-weight:bold;line-height:1.6;color:#fff;`,
  h3: `margin:1.6em 0 0.8em;padding:0 12px;border-left:4px solid ${ACCENT};border-top:1px solid rgba(15,76,129,0.1);border-right:1px solid rgba(15,76,129,0.1);border-bottom:1px solid rgba(15,76,129,0.1);border-radius:6px;background:rgba(15,76,129,0.08);font-size:16px;font-weight:bold;line-height:2.2em;color:#1f2937;`,
  blockquote:
    'margin:1.4em 0;padding:1em 1em 1em 2em;border-top:1px solid rgba(0,0,0,0.04);border-bottom:1px solid rgba(0,0,0,0.04);font-style:italic;color:rgba(0,0,0,0.6);',
  li: 'margin:0.5em 0;',
  hr: 'margin:2em 0;height:1px;border:0;background:linear-gradient(to right,rgba(0,0,0,0),rgba(0,0,0,0.18),rgba(0,0,0,0));',
};

/** 三套 md 主题共用的主色 */
export const MD_ACCENT = ACCENT;

/** doocs 默认的 github-dark-dimmed 代码配色（token → 内联声明） */
export const MD_HLJS: Record<string, string> = HLJS as unknown as Record<string, string>;

/** 经典（default）：BASE 上补标题、引用、列表与表格 */
export const MD_CLASSIC_STYLES: ThemeStyles = CLASSIC;

/** 优雅（grace）：在经典之上做圆角卡片化 */
export const MD_GRACE_STYLES: ThemeStyles = GRACE;

/** 清爽（simple）：在经典之上把标题做成右侧大圆角 */
export const MD_SIMPLE_STYLES: ThemeStyles = SIMPLE;
