import { Theme } from '../theme';
import { spacedNote, colorDot } from '../decorations';
import { FONT_MONO } from '../fonts';

/** 霓虹 · neon · #f472b6 */
export default new Theme({
  id: 'neon',
  name: '霓虹',
  accent: '#f472b6',
  tags: ['tech', 'event'],
  page: 'padding:22px 16px;border-radius:10px;background:#15112b;color:#d6d3f0;',
  styles: {
    h1: 'margin:1em 0 1.2em;font-size:22px;font-weight:bold;line-height:1.5;color:#fff;text-align:center;text-shadow:0 0 8px #f472b6;',
    h2: 'margin:2.2em 0 1.2em;font-size:17px;font-weight:bold;line-height:1.5;color:#fff;text-align:center;',
    h3: 'margin:1.6em 0 0.8em;font-size:16px;font-weight:bold;line-height:1.5;color:#67e8f9;text-shadow:0 0 6px rgba(34,211,238,0.6);',
    h4: 'margin:1.2em 0 0.6em;font-size:15px;font-weight:bold;line-height:1.5;color:#c4b5fd;',
    strong: 'font-weight:bold;color:#67e8f9;',
    del: 'text-decoration:line-through;color:#6b6890;',
    link: 'color:#67e8f9;text-decoration:none;border-bottom:1px solid #67e8f9;',
    blockquote: 'margin:1.4em 0;padding:12px 16px;border-left:3px solid #a78bfa;border-radius:0 8px 8px 0;background:rgba(167,139,250,0.1);color:#c4b5fd;font-size:14px;',
    code: `margin:0 2px;padding:2px 5px;border-radius:4px;background:rgba(244,114,182,0.14);color:#f9a8d4;font-family:${FONT_MONO};font-size:90%;`,
    pre: 'margin:1.4em 0;border:1px solid #3b2f6b;border-radius:8px;background:#0b0918;overflow-x:auto;box-shadow:0 0 12px rgba(167,139,250,0.25);',
    th: 'padding:8px 10px;border:1px solid #3b2f6b;background:rgba(167,139,250,0.16);color:#e9d5ff;font-weight:bold;text-align:left;',
    td: 'padding:8px 10px;border:1px solid #3b2f6b;',
    imgSlot: 'margin:1.4em 0;padding:22px 12px;border:1px dashed #a78bfa;border-radius:6px;background:#1d1838;color:#a5a1c9;font-size:13px;line-height:1.6;text-align:center;'
  },
  decor: {
    h2: html => `<span style="display:inline-block;padding:6px 22px;border:1.5px solid #f472b6;border-radius:6px;box-shadow:0 0 10px #f472b6,inset 0 0 8px rgba(244,114,182,0.45);text-shadow:0 0 6px #f472b6;">${html}</span>`,
    ulMark: colorDot('#67e8f9', 6),
    hr: spacedNote('✦ ━━ ✦ ━━ ✦', '#a78bfa')
  }
});
