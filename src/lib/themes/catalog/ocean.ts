import { Theme } from '../theme';
import { spacedNote } from '../decorations';

/** 海洋 · ocean · #0b6bcb */
export default new Theme({
  id: 'ocean',
  name: '海洋',
  accent: '#0b6bcb',
  tags: ['tech', 'business'],
  styles: {
    h2: 'margin:2em 0 1.1em;font-size:17px;font-weight:bold;line-height:1.5;',
    h3: 'margin:1.6em 0 0.8em;padding-left:10px;border-left:4px solid #38bdf8;font-size:16px;font-weight:bold;line-height:1.5;color:#0b6bcb;',
    blockquote: 'margin:1.4em 0;padding:14px 16px;border-left:4px solid #38bdf8;border-radius:0 8px 8px 0;background:#eef7ff;color:#475f78;font-size:14px;',
    th: 'padding:8px 10px;border:1px solid #0b6bcb;background:#0b6bcb;color:#fff;font-weight:bold;text-align:left;',
    td: 'padding:8px 10px;border:1px solid #cfe3f7;'
  },
  decor: {
    h2: html => `<span style="display:block;padding:8px 16px;border-radius:8px;background:linear-gradient(135deg,#0b6bcb,#38bdf8);color:#fff;box-shadow:0 4px 12px rgba(11,107,203,0.25);">${html}</span>`,
    hr: spacedNote('≈ ≈ ≈', '#3ea8f0')
  }
});
