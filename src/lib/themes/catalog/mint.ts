import { Theme } from '../theme';
import { spacedNote, padTwoDigits } from '../decorations';

/** 薄荷 · mint · #12a182 */
export default new Theme({
  id: 'mint',
  name: '薄荷',
  accent: '#12a182',
  tags: ['tutorial', 'tech'],
  styles: {
    h2: 'margin:2em 0 1.1em;padding-bottom:8px;border-bottom:1px dashed rgba(18,161,130,0.4);font-size:18px;font-weight:bold;line-height:1.5;color:#0e7c64;',
    h3: 'margin:1.6em 0 0.8em;font-size:16px;font-weight:bold;line-height:1.5;color:#0e7c64;',
    strong: 'font-weight:bold;color:#0e7c64;background:rgba(18,161,130,0.1);padding:0 2px;',
    blockquote: 'margin:1.4em 0;padding:14px 16px;border:1px solid rgba(18,161,130,0.25);border-radius:10px;background:#f0faf7;color:#4d6b63;font-size:14px;'
  },
  decor: {
    h2: (html, index) => `<span style="display:inline-block;margin-right:10px;padding:1px 8px;border-radius:6px;background:#12a182;color:#fff;font-size:15px;vertical-align:middle;">${padTwoDigits(index)}</span><span style="vertical-align:middle;">${html}</span>`,
    h3: html => `<span style="color:#12a182;">▸ </span>${html}`,
    hr: spacedNote('· · ·', '#12a182')
  }
});
