/**
 * 主题的基础样式表：31 个样式键由 accent / font / page 推导，
 * code 为 light 时换掉代码块底色与前景色（暗色代码块在白底主题里太抢眼）。
 *
 * 主题里写 styles 只会覆盖这里的同名键，所以「只写差异」就够了。
 */
import type { ThemeStyles } from '../types';
import { FONT_MONO } from './fonts';

/** 生成基础样式表需要的入参 */
export interface BuildBaseStylesOptions {
  accent: string;
  font: string;
  page: string;
  code: 'light' | 'dark';
}

/** '#rrggbb' + 透明度 → 'rgba(r,g,b,a)' */
export function hexToRgba(hex: string, alpha: number): string {
  const value = Number.parseInt(hex.slice(1), 16);
  return `rgba(${(value >> 16) & 255},${(value >> 8) & 255},${value & 255},${alpha})`;
}

export function buildBaseStyles({
  accent,
  font,
  page,
  code,
}: BuildBaseStylesOptions): ThemeStyles {
  const baseStyles: ThemeStyles = {
    wrapper: `font-family:${font};font-size:15px;line-height:1.8;color:#3f3f3f;letter-spacing:0.5px;word-break:break-word;text-align:justify;${page}`,
    p: 'margin:1em 0;',
    h1: 'margin:1.2em 0 1.2em;font-size:22px;font-weight:bold;line-height:1.5;color:#222;text-align:center;',
    h2: 'margin:2em 0 1.1em;font-size:18px;font-weight:bold;line-height:1.5;color:#222;',
    h3: 'margin:1.6em 0 0.8em;font-size:16px;font-weight:bold;line-height:1.5;color:#222;',
    h4: `margin:1.2em 0 0.6em;font-size:15px;font-weight:bold;line-height:1.5;color:${accent};`,
    strong: `font-weight:bold;color:${accent};`,
    em: 'font-style:italic;',
    del: 'text-decoration:line-through;color:#999;',
    sup: 'font-size:75%;line-height:0;vertical-align:super;',
    sub: 'font-size:75%;line-height:0;vertical-align:sub;',
    link: `color:${accent};text-decoration:none;border-bottom:1px solid ${accent};`,
    blockquote: `margin:1.4em 0;padding:12px 16px;border-left:4px solid ${accent};border-radius:4px;background:${hexToRgba(accent, 0.06)};color:#666;font-size:14px;`,
    blockquoteP: 'margin:0.4em 0;',
    ul: 'margin:1em 0;padding-left:1.6em;list-style-type:disc;',
    ol: 'margin:1em 0;padding-left:1.6em;list-style-type:decimal;',
    li: 'margin:0.4em 0;',
    code: `margin:0 2px;padding:2px 5px;border-radius:4px;background:${hexToRgba(accent, 0.08)};color:${accent};font-family:${FONT_MONO};font-size:90%;`,
    pre: 'margin:1.4em 0;border-radius:8px;background:#282c34;overflow-x:auto;box-shadow:0 2px 10px rgba(0,0,0,0.12);',
    preBar: 'display:block;padding:10px 14px 0;line-height:1;',
    preCode: `display:block;padding:10px 14px 14px;color:#abb2bf;font-family:${FONT_MONO};font-size:13px;line-height:1.6;letter-spacing:0;white-space:nowrap;background:none;`,
    hr: 'margin:2em 0;height:0;border:0;border-top:1px solid #e5e5e5;',
    tableWrap: 'margin:1.4em 0;overflow-x:auto;',
    table: 'width:100%;border-collapse:collapse;font-size:14px;line-height:1.6;',
    th: `padding:8px 10px;border:1px solid ${hexToRgba(accent, 0.2)};background:${hexToRgba(accent, 0.08)};font-weight:bold;text-align:left;`,
    td: `padding:8px 10px;border:1px solid ${hexToRgba(accent, 0.2)};`,
    fnRef: `margin:0 1px;font-size:75%;line-height:0;vertical-align:super;color:${accent};`,
    footnotes: 'margin:2.4em 0 1em;padding-top:1em;border-top:1px solid #e5e5e5;font-size:13px;line-height:1.7;color:#888;',
    fnTitle: 'margin:0 0 0.6em;font-weight:bold;',
    fnItem: 'margin:0.3em 0;word-break:break-all;',
    imgSlot: `margin:1.4em 0;padding:22px 12px;border:1px dashed ${hexToRgba(accent, 0.6)};border-radius:6px;background:#fafafa;color:#999;font-size:13px;line-height:1.6;text-align:center;`
  };
  if (code === 'light') {
    baseStyles.pre = 'margin:1.4em 0;border:1px solid #e5e7eb;border-radius:8px;background:#f6f8fa;overflow-x:auto;';
    baseStyles.preCode = `display:block;padding:10px 14px 14px;color:#24292f;font-family:${FONT_MONO};font-size:13px;line-height:1.6;letter-spacing:0;white-space:nowrap;background:none;`;
  }
  return baseStyles;
}
