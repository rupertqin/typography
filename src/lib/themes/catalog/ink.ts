import { Theme } from '../theme';
import { spacedNote } from '../decorations';
import { FONT_SERIF } from '../fonts';

/** 书香 · ink · #8b5a2b */
export default new Theme({
  id: 'ink',
  name: '书香',
  accent: '#8b5a2b',
  tags: ['culture', 'emotion'],
  font: FONT_SERIF,
  styles: {
    wrapper: `font-family:${FONT_SERIF};font-size:16px;line-height:1.9;color:#3a3a3a;letter-spacing:1px;word-break:break-word;text-align:justify;padding:20px 16px;border-radius:6px;background:#fbf7ef;`,
    p: 'margin:1em 0;text-indent:2em;',
    h1: 'margin:1.2em 0 1.2em;font-size:23px;font-weight:bold;line-height:1.5;color:#5a3a1c;text-align:center;letter-spacing:2px;',
    h2: 'margin:2em 0 1.2em;font-size:19px;font-weight:bold;line-height:1.5;color:#5a3a1c;text-align:center;',
    h3: 'margin:1.6em 0 0.8em;font-size:17px;font-weight:bold;line-height:1.5;color:#5a3a1c;',
    blockquote: 'margin:1.4em 0;padding:12px 16px;border-left:3px solid #c9a27a;background:#f3ebdd;color:#6b5b4b;font-size:15px;',
    blockquoteP: 'margin:0.4em 0;text-indent:0;'
  },
  decor: {
    h2: html => `<span style="display:inline-block;padding:4px 18px;border-top:1px solid #8b5a2b;border-bottom:1px solid #8b5a2b;letter-spacing:2px;">${html}</span>`,
    hr: spacedNote('· ✦ ·', '#b08a5f')
  }
});
