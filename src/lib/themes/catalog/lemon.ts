import { Theme } from '../theme';
import { spacedNote } from '../decorations';
import { FONT_MONO } from '../fonts';

/** 柠檬 · lemon · #d4a106 */
export default new Theme({
  id: 'lemon',
  name: '柠檬',
  accent: '#d4a106',
  tags: ['tutorial'],
  styles: {
    h2: 'margin:2em 0 1.1em;font-size:18px;font-weight:bold;line-height:1.5;color:#222;',
    h3: 'margin:1.6em 0 0.8em;font-size:16px;font-weight:bold;line-height:1.5;color:#333;',
    strong: 'font-weight:bold;color:#222;background:linear-gradient(transparent 55%,#ffe066 55%);padding:0 2px;',
    blockquote: 'margin:1.4em 0;padding:14px 16px;border-left:4px solid #ffd43b;border-radius:0 8px 8px 0;background:#fffbea;color:#6b5d2e;font-size:14px;',
    code: `margin:0 2px;padding:2px 5px;border-radius:4px;background:#fff3bf;color:#8a6d00;font-family:${FONT_MONO};font-size:90%;`
  },
  decor: {
    h2: html => `<span style="padding:0 4px;background:linear-gradient(transparent 55%,#ffe066 55%);">${html}</span>`,
    h3: html => `<span style="color:#ca9904;">▌</span>${html}`,
    hr: spacedNote('🍋', '#ca9904')
  }
});
