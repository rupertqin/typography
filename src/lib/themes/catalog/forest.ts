import { Theme } from '../theme';
import { spacedNote } from '../decorations';
import { FONT_SANS } from '../fonts';

/** 森林 · forest · #2f855a */
export default new Theme({
  id: 'forest',
  name: '森林',
  accent: '#2f855a',
  tags: ['emotion'],
  styles: {
    wrapper: `font-family:${FONT_SANS};font-size:15px;line-height:1.8;color:#3d4a42;letter-spacing:0.5px;word-break:break-word;text-align:justify;padding:20px 16px;border-radius:12px;background:#f5faf6;`,
    h2: 'margin:2em 0 1.1em;font-size:18px;font-weight:bold;line-height:1.5;color:#2f855a;text-align:center;',
    h3: 'margin:1.6em 0 0.8em;font-size:16px;font-weight:bold;line-height:1.5;color:#276749;',
    blockquote: 'margin:1.4em 0;padding:14px 16px;border:1px solid #c6e6d2;border-radius:10px;background:#fff;color:#4a5d52;font-size:14px;',
    td: 'padding:8px 10px;border:1px solid #c6e6d2;background:#fff;'
  },
  decor: {
    h2: html => `<span style="display:inline-block;padding:0 4px 6px;border-bottom:2px solid #9ae6b4;">🌿 ${html}</span>`,
    hr: spacedNote('~ 🌱 ~', '#34b164')
  }
});
