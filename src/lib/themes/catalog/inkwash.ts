import { Theme } from '../theme';
import { spacedNote, toCnNumeral, blockLine } from '../decorations';
import { FONT_SERIF } from '../fonts';

/** 水墨 · inkwash · #2f3e46 */
export default new Theme({
  id: 'inkwash',
  name: '水墨',
  accent: '#2f3e46',
  tags: ['culture', 'emotion'],
  font: FONT_SERIF,
  page: 'padding:22px 16px;background:#f8f8f5;color:#3a3f42;letter-spacing:1px;',
  styles: {
    h1: 'margin:1em 0 1.4em;font-size:23px;font-weight:bold;line-height:1.5;color:#1f2a30;text-align:center;letter-spacing:6px;',
    h2: 'margin:2.4em 0 1.2em;font-size:19px;font-weight:bold;line-height:1.5;color:#1f2a30;text-align:center;letter-spacing:3px;',
    h3: 'margin:1.6em 0 0.8em;font-size:16px;font-weight:bold;line-height:1.5;color:#1f2a30;',
    strong: 'font-weight:bold;color:#1f2a30;border-bottom:1px solid #8a9aa2;',
    blockquote: 'margin:1.8em 0;padding:0 1em;color:#5f6b70;font-size:15px;text-align:center;',
    th: 'padding:8px 10px;border-bottom:1px solid #2f3e46;font-weight:bold;text-align:left;',
    td: 'padding:8px 10px;border-bottom:1px solid #dde1e3;'
  },
  decor: {
    h2: (html, index) => `<span style="display:block;font-size:30px;font-weight:normal;line-height:1;color:#7d8a90;letter-spacing:0;">${toCnNumeral(index)}</span><span style="display:block;margin-top:10px;">${html}</span>${blockLine('width:60px;height:3px;border-radius:50%;background:linear-gradient(90deg,rgba(47,62,70,0),#2f3e46,rgba(47,62,70,0));', 'margin-top:10px;')}`,
    h3: html => `<span style="color:#9a3b3b;">｜</span>${html}`,
    quoteMark: '<span style="display:block;height:24px;font-size:30px;line-height:1;color:#8e9da4;">〝</span>',
    hr: spacedNote('～ ◦ ～', '#909ca3')
  }
});
