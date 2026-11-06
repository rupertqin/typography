import { Theme } from '../theme';
import { spacedNote, padTwoDigits } from '../decorations';
import { FONT_MONO } from '../fonts';

/** 留白 · whisper · #8a8f98 */
export default new Theme({
  id: 'whisper',
  name: '留白',
  accent: '#8a8f98',
  tags: ['emotion', 'culture'],
  page: 'line-height:2.1;color:#555;letter-spacing:1px;text-align:left;',
  styles: {
    p: 'margin:1.5em 0;',
    h1: 'margin:1.2em 0 1.6em;font-size:21px;font-weight:normal;line-height:1.6;color:#222;text-align:center;letter-spacing:4px;',
    h2: 'margin:2.6em 0 1.6em;font-size:16px;font-weight:normal;line-height:1.6;color:#222;text-align:center;letter-spacing:3px;',
    h3: 'margin:2em 0 1em;font-size:15px;font-weight:bold;line-height:1.6;color:#333;',
    strong: 'font-weight:bold;color:#222;',
    blockquote: 'margin:2.2em 0;padding:0 1.2em;color:#999;font-size:14px;text-align:center;',
    code: `margin:0 2px;padding:2px 5px;border-radius:4px;background:#f3f3f3;color:#666;font-family:${FONT_MONO};font-size:90%;`,
    th: 'padding:8px 10px;border-bottom:1px solid #ddd;font-weight:bold;text-align:left;',
    td: 'padding:8px 10px;border-bottom:1px solid #eee;',
    imgSlot: 'margin:2em 0;padding:22px 12px;border:1px dashed #ccc;background:#fafafa;color:#999;font-size:13px;line-height:1.6;text-align:center;'
  },
  decor: {
    h2: (html, index) => `<span style="display:block;font-size:11px;line-height:1;color:#a0a0a0;letter-spacing:4px;">— ${padTwoDigits(index)} —</span><span style="display:block;margin-top:10px;">${html}</span>`,
    quoteMark: '<span style="display:block;margin-bottom:6px;font-size:12px;line-height:1;color:#a0a0a0;letter-spacing:6px;">· · ·</span>',
    hr: spacedNote('·', '#a0a0a0')
  }
});
