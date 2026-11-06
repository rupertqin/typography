import { Theme } from '../theme';
import { spacedNote } from '../decorations';
import { FONT_SANS } from '../fonts';

/** 樱花 · sakura · #e5739a */
export default new Theme({
  id: 'sakura',
  name: '樱花',
  accent: '#e5739a',
  tags: ['emotion', 'event'],
  styles: {
    wrapper: `font-family:${FONT_SANS};font-size:15px;line-height:1.8;color:#5a4a50;letter-spacing:0.5px;word-break:break-word;text-align:justify;padding:20px 16px;border-radius:12px;background:#fff5f8;`,
    h2: 'margin:2em 0 1.1em;font-size:17px;font-weight:bold;line-height:1.5;color:#e5739a;text-align:center;',
    h3: 'margin:1.6em 0 0.8em;font-size:16px;font-weight:bold;line-height:1.5;color:#d45d87;',
    blockquote: 'margin:1.4em 0;padding:14px 16px;border:1px dashed #f0a6bf;border-radius:12px;background:#fff;color:#7a6168;font-size:14px;',
    td: 'padding:8px 10px;border:1px solid #f6c9d8;background:#fff;'
  },
  decor: {
    h2: html => `<span style="display:inline-block;padding:6px 20px;border:1px solid #f5bccd;border-radius:20px;background:#fff;box-shadow:0 3px 0 #f5bccd;">${html}</span>`,
    h3: html => `<span style="color:#e8769c;">✿ </span>${html}`,
    hr: spacedNote('✿ ✿ ✿', '#e8769c')
  }
});
