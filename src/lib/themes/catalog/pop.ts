import { Theme } from '../theme';
import { spacedNote, circleBadge } from '../decorations';
import { FONT_MONO } from '../fonts';

/** 波普 · pop · #ff5a36 */
export default new Theme({
  id: 'pop',
  name: '波普',
  accent: '#ff5a36',
  tags: ['life', 'event'],
  page: 'padding:20px 16px;background:#fffbea;color:#222;',
  styles: {
    h1: 'margin:1em 0 1.2em;font-size:23px;font-weight:900;line-height:1.4;color:#111;text-align:center;',
    h2: 'margin:2em 0 1.2em;font-size:17px;font-weight:900;line-height:1.5;color:#111;',
    h3: 'margin:1.6em 0 0.8em;font-size:16px;font-weight:bold;line-height:1.5;color:#111;',
    strong: 'font-weight:bold;color:#111;background:#ffd23f;padding:0 3px;',
    link: 'color:#111;text-decoration:none;border-bottom:2px solid #ff5a36;',
    blockquote: 'margin:1.6em 0;padding:12px 16px;border:2px solid #111;background:#fff;box-shadow:4px 4px 0 #111;color:#333;font-size:14px;',
    code: `margin:0 2px;padding:1px 5px;border:1.5px solid #111;border-radius:4px;background:#ffe3ec;color:#111;font-family:${FONT_MONO};font-size:88%;`,
    pre: 'margin:1.6em 0;border:2px solid #111;border-radius:6px;background:#282c34;overflow-x:auto;box-shadow:4px 4px 0 #111;',
    th: 'padding:8px 10px;border:2px solid #111;background:#111;color:#ffd23f;font-weight:bold;text-align:left;',
    td: 'padding:8px 10px;border:2px solid #111;background:#fff;',
    imgSlot: 'margin:1.4em 0;padding:22px 12px;border:2px dashed #111;background:#fff;color:#666;font-size:13px;line-height:1.6;text-align:center;'
  },
  decor: {
    h2: html => `<span style="display:inline-block;padding:6px 16px;border:2px solid #111;background:#ffd23f;box-shadow:4px 4px 0 #111;">${html}</span>`,
    h3: html => `<span style="padding:0 6px;border:2px solid #111;background:#a8e6cf;">${html}</span>`,
    ulMark: '<span style="display:inline-block;width:8px;height:8px;border:1.5px solid #111;background:#ff5a36;vertical-align:middle;"></span>',
    olMark: index => circleBadge(index, '#111', '#ffd23f'),
    hr: spacedNote('▲ ● ■', '#111')
  }
});
