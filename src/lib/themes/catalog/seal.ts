import { Theme } from '../theme';
import { spacedNote, toCnNumeral } from '../decorations';
import { FONT_SERIF } from '../fonts';

/** 朱印 · seal · #b91c1c */
export default new Theme({
  id: 'seal',
  name: '朱印',
  accent: '#b91c1c',
  tags: ['culture', 'event'],
  font: FONT_SERIF,
  page: 'padding:20px 16px;background:#faf6ee;color:#3d3528;letter-spacing:1px;',
  styles: {
    h1: 'margin:1em 0 1.2em;font-size:23px;font-weight:bold;line-height:1.5;color:#2b2419;text-align:center;letter-spacing:4px;',
    h2: 'margin:2em 0 1em;font-size:18px;font-weight:bold;line-height:1.5;color:#2b2419;letter-spacing:2px;',
    h3: 'margin:1.6em 0 0.8em;font-size:16px;font-weight:bold;line-height:1.5;color:#2b2419;',
    strong: 'font-weight:bold;color:#b91c1c;',
    blockquote: 'margin:1.4em 0;padding:12px 16px;border-left:2px solid #b91c1c;background:#f3ecdd;color:#6b5b45;font-size:15px;',
    th: 'padding:8px 10px;border:1px solid #d6c7a8;background:#efe6d3;font-weight:bold;text-align:left;',
    td: 'padding:8px 10px;border:1px solid #d6c7a8;'
  },
  decor: {
    h1: html => `『${html}』`,
    h2: (html, index) => `<span style="display:inline-block;width:30px;height:30px;margin-right:12px;border-radius:4px;background:#b91c1c;color:#faf6ee;font-size:16px;line-height:30px;text-align:center;letter-spacing:0;vertical-align:middle;box-shadow:0 0 0 2px #faf6ee,0 0 0 3px #b91c1c;">${toCnNumeral(index)}</span><span style="vertical-align:middle;">${html}</span>`,
    h3: html => `<span style="color:#b91c1c;">〔</span>${html}<span style="color:#b91c1c;">〕</span>`,
    ulMark: '<span style="color:#b91c1c;">◇</span>',
    hr: spacedNote('—— ◎ ——', '#b7945c')
  }
});
