import { Theme } from '../theme';
import { spacedNote, colorDot, circleBadge } from '../decorations';

/** 糖果 · candy · #ff5c9d */
export default new Theme({
  id: 'candy',
  name: '糖果',
  accent: '#ff5c9d',
  tags: ['life', 'event'],
  styles: {
    h2: 'margin:2em 0 1.2em;font-size:16px;font-weight:bold;line-height:1.5;text-align:center;',
    h3: 'margin:1.6em 0 0.8em;font-size:16px;font-weight:bold;line-height:1.5;color:#444;',
    blockquote: 'margin:1.4em 0;padding:14px 16px;border:2px dashed #9bd6f5;border-radius:16px;background:#f0f9ff;color:#4a6b80;font-size:14px;',
    th: 'padding:8px 10px;border:1px solid #ffd1e3;background:#fff0f6;font-weight:bold;text-align:left;',
    td: 'padding:8px 10px;border:1px solid #ffe0ec;'
  },
  decor: {
    h2: html => `<span style="display:inline-block;padding:3px;border-radius:999px;background:#ec4f8f;box-shadow:0 3px 0 #ffc2da;"><span style="display:inline-block;padding:4px 18px;border:2px dashed rgba(255,255,255,0.9);border-radius:999px;color:#fff;">★ ${html}</span></span>`,
    h3: html => `<span style="color:#ff6ea9;">●</span><span style="color:#d49400;">●</span><span style="color:#13aaef;">●</span> ${html}`,
    ulMark: colorDot('#ffd166', 7),
    olMark: index => circleBadge(index, ['#ec4f8f', '#e8890c', '#1fa3dc', '#4caf50'][(index - 1) % 4]),
    hr: spacedNote('★ ☆ ★', '#ff6ea7')
  }
});
