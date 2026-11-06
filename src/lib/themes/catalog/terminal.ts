import { Theme } from '../theme';
import { FONT_MONO } from '../fonts';

/** 终端 · terminal · #4ade80 */
export default new Theme({
  id: 'terminal',
  name: '终端',
  accent: '#4ade80',
  tags: ['tech'],
  page: 'padding:22px 16px;border-radius:10px;background:#1e1f24;color:#d4d4d8;',
  styles: {
    h1: `margin:1em 0 1.2em;font-family:${FONT_MONO};font-size:20px;font-weight:bold;line-height:1.5;color:#fafafa;text-align:left;letter-spacing:0;`,
    h2: `margin:2em 0 1em;font-family:${FONT_MONO};font-size:16px;font-weight:bold;line-height:1.5;color:#4ade80;letter-spacing:0;`,
    h3: `margin:1.6em 0 0.8em;font-family:${FONT_MONO};font-size:15px;font-weight:bold;line-height:1.5;color:#e4e4e7;letter-spacing:0;`,
    h4: 'margin:1.2em 0 0.6em;font-size:15px;font-weight:bold;line-height:1.5;color:#60a5fa;',
    strong: 'font-weight:bold;color:#facc15;',
    del: 'text-decoration:line-through;color:#71717a;',
    link: 'color:#60a5fa;text-decoration:none;border-bottom:1px solid #60a5fa;',
    blockquote: 'margin:1.4em 0;padding:10px 14px;border-left:2px solid #4ade80;background:#26272e;color:#a1a1aa;font-size:14px;',
    code: `margin:0 2px;padding:2px 5px;border-radius:4px;background:#2e3038;color:#f472b6;font-family:${FONT_MONO};font-size:90%;`,
    pre: 'margin:1.4em 0;border:1px solid #33353d;border-radius:8px;background:#15161a;overflow-x:auto;',
    th: 'padding:8px 10px;border:1px solid #3a3d46;background:#26272e;color:#e4e4e7;font-weight:bold;text-align:left;',
    td: 'padding:8px 10px;border:1px solid #3a3d46;',
    imgSlot: 'margin:1.4em 0;padding:22px 12px;border:1px dashed #4ade80;border-radius:6px;background:#26272e;color:#9ca3af;font-size:13px;line-height:1.6;text-align:center;'
  },
  decor: {
    h2: html => `<span style="color:#60a5fa;">~</span><span style="color:#71717a;"> $ </span>${html}<span style="color:#4ade80;"> ▊</span>`,
    h3: html => `<span style="color:#71717a;">&gt; </span>${html}`,
    quoteMark: `<span style="display:block;margin-bottom:2px;font-family:${FONT_MONO};font-size:12px;color:#71717a;">// note</span>`,
    ulMark: '<span style="color:#4ade80;">❯</span>',
    olMark: index => `<span style="font-family:${FONT_MONO};font-size:13px;color:#4ade80;">[${index}]</span>`,
    hr: `<section style="margin:2em 0;font-family:${FONT_MONO};font-size:12px;line-height:1;color:#52525b;text-align:center;">/* ─────── */</section>`
  }
});
