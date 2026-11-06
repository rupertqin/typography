import { Theme } from '../theme';
import { spacedNote, linedTitle } from '../decorations';
import { FONT_SANS } from '../fonts';

/** 黑金 · gold · #b8860b */
export default new Theme({
  id: 'gold',
  name: '黑金',
  accent: '#b8860b',
  tags: ['business', 'event'],
  styles: {
    wrapper: `font-family:${FONT_SANS};font-size:15px;line-height:1.85;color:#333;letter-spacing:0.8px;word-break:break-word;text-align:justify;`,
    h1: 'margin:1.2em 0 1.2em;font-size:22px;font-weight:bold;line-height:1.5;color:#111;text-align:center;letter-spacing:3px;',
    h2: 'margin:2em 0 1.1em;font-size:18px;font-weight:bold;line-height:1.5;color:#111;text-align:center;letter-spacing:2px;',
    h3: 'margin:1.6em 0 0.8em;font-size:16px;font-weight:bold;line-height:1.5;color:#111;',
    blockquote: 'margin:1.4em 0;padding:14px 18px;border-left:2px solid #b8860b;background:#faf8f2;color:#5c5546;font-size:14px;',
    th: 'padding:8px 10px;border:1px solid #222;background:#222;color:#e8c46a;font-weight:bold;text-align:left;',
    td: 'padding:8px 10px;border:1px solid #e5dcc3;'
  },
  decor: {
    h2: html => linedTitle(html, '#b8860b', 32),
    h3: html => `<span style="color:#b8860b;">◆ </span>${html}`,
    hr: spacedNote('— ◆ —', '#b8860b')
  }
});
