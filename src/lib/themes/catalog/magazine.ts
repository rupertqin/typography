import { Theme } from '../theme';
import { padTwoDigits, blockLine } from '../decorations';
import { FONT_SERIF } from '../fonts';

/** 杂志 · magazine · #e63946 */
export default new Theme({
  id: 'magazine',
  name: '杂志',
  accent: '#e63946',
  tags: ['news', 'business', 'culture'],
  styles: {
    h1: `margin:1em 0 1.2em;font-family:${FONT_SERIF};font-size:24px;font-weight:bold;line-height:1.4;color:#1d3557;letter-spacing:1px;`,
    h2: 'margin:2.2em 0 1em;font-size:20px;font-weight:bold;line-height:1.4;color:#1d3557;',
    h3: 'margin:1.6em 0 0.8em;font-size:16px;font-weight:bold;line-height:1.5;color:#1d3557;',
    strong: 'font-weight:bold;color:#1d3557;',
    blockquote: `margin:1.8em 0;padding:4px 12px 8px;color:#1d3557;font-family:${FONT_SERIF};font-size:17px;font-weight:bold;line-height:1.7;text-align:center;`,
    th: 'padding:8px 10px;border-bottom:2px solid #1d3557;font-weight:bold;text-align:left;color:#1d3557;',
    td: 'padding:8px 10px;border-bottom:1px solid #e3e6ea;'
  },
  decor: {
    h2: (html, index) => `<span style="display:block;font-family:Georgia,serif;font-size:38px;font-weight:bold;font-style:italic;line-height:1;color:#e63946;letter-spacing:0;">${padTwoDigits(index)}</span><span style="display:block;margin-top:8px;padding-left:2px;">${html}</span>${blockLine('width:28px;height:3px;background:#e63946;', 'margin:10px 0 0 2px;')}`,
    h3: html => `<span style="display:inline-block;width:8px;height:8px;margin-right:8px;background:#e63946;vertical-align:middle;"></span><span style="vertical-align:middle;">${html}</span>`,
    quoteMark: '<span style="display:block;height:28px;font-family:Georgia,serif;font-size:48px;line-height:1;color:#e63946;">“</span>',
    hr: '<section style="margin:2.2em 0;line-height:0;text-align:center;"><span style="display:inline-block;width:40px;height:3px;background:#1d3557;"></span><span style="display:inline-block;width:12px;height:3px;margin-left:6px;background:#e63946;"></span></section>'
  }
});
