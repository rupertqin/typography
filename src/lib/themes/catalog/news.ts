import { Theme } from '../theme';
import { FONT_SERIF } from '../fonts';

/** 报纸 · news · #111111 */
export default new Theme({
  id: 'news',
  name: '报纸',
  accent: '#111111',
  tags: ['news', 'culture'],
  font: FONT_SERIF,
  styles: {
    wrapper: `font-family:${FONT_SERIF};font-size:16px;line-height:1.85;color:#222;letter-spacing:0.5px;word-break:break-word;text-align:justify;`,
    h1: 'margin:1em 0 1.2em;padding:10px 0;border-top:3px double #111;border-bottom:3px double #111;font-size:24px;font-weight:bold;line-height:1.4;color:#111;text-align:center;',
    h2: 'margin:2em 0 1em;padding-bottom:4px;border-bottom:2px solid #111;font-size:19px;font-weight:bold;line-height:1.5;color:#111;',
    h3: 'margin:1.6em 0 0.8em;font-size:17px;font-weight:bold;font-style:italic;line-height:1.5;color:#111;',
    strong: 'font-weight:bold;color:#000;',
    link: 'color:#111;text-decoration:underline;',
    blockquote: 'margin:1.6em 0;padding:12px 8px;border-top:1px solid #111;border-bottom:1px solid #111;color:#333;font-size:16px;font-style:italic;text-align:center;',
    th: 'padding:8px 10px;border-bottom:2px solid #111;font-weight:bold;text-align:left;',
    td: 'padding:8px 10px;border-bottom:1px solid #ccc;',
    hr: 'margin:2em 0;height:0;border:0;border-top:3px double #111;'
  }
});
