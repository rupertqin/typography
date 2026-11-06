import { Theme } from '../theme';
import { spacedNote } from '../decorations';
import { FONT_SANS } from '../fonts';

/** 咖啡 · coffee · #6f4e37 */
export default new Theme({
  id: 'coffee',
  name: '咖啡',
  accent: '#6f4e37',
  tags: ['life', 'culture'],
  styles: {
    wrapper: `font-family:${FONT_SANS};font-size:15px;line-height:1.8;color:#4b3f36;letter-spacing:0.5px;word-break:break-word;text-align:justify;`,
    h2: 'margin:2em 0 1.1em;padding-bottom:8px;border-bottom:1px dashed #c9b29b;font-size:18px;font-weight:bold;line-height:1.5;color:#6f4e37;',
    h3: 'margin:1.6em 0 0.8em;font-size:16px;font-weight:bold;line-height:1.5;color:#8b5e3c;',
    blockquote: 'margin:1.4em 0;padding:14px 16px;border-left:4px solid #a67c52;border-radius:0 6px 6px 0;background:#f7f1ea;color:#6b5848;font-size:14px;'
  },
  decor: {
    h2: html => `<span style="display:inline-block;width:10px;height:10px;margin-right:10px;border-radius:2px;background:#6f4e37;vertical-align:middle;"></span><span style="vertical-align:middle;">${html}</span>`,
    hr: spacedNote('☕', '#a67c52')
  }
});
