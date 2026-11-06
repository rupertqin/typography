import { Theme } from '../theme';
import { spacedNote, padTwoDigits, colorDot, blockLine } from '../decorations';
import { FONT_MONO } from '../fonts';

/** 北欧 · nordic · #7d9a83 */
export default new Theme({
  id: 'nordic',
  name: '北欧',
  accent: '#7d9a83',
  tags: ['life', 'emotion'],
  page: 'padding:22px 18px;border-radius:16px;background:#f7f4ee;color:#4f4a43;',
  styles: {
    h2: 'margin:2.2em 0 1em;font-size:18px;font-weight:bold;line-height:1.5;color:#3f3a33;',
    h3: 'margin:1.6em 0 0.8em;font-size:15px;font-weight:bold;line-height:1.5;',
    strong: 'font-weight:bold;color:#4e6b55;',
    blockquote: 'margin:1.4em 0;padding:14px 18px;border-radius:14px;background:#fff;color:#6b6459;font-size:14px;',
    code: `margin:0 2px;padding:2px 6px;border-radius:6px;background:#e9eee6;color:#4e6b55;font-family:${FONT_MONO};font-size:90%;`,
    th: 'padding:8px 10px;border-bottom:1px solid #d9d2c5;background:#efe9df;font-weight:bold;text-align:left;',
    td: 'padding:8px 10px;border-bottom:1px solid #e6e0d5;background:#fff;',
    imgSlot: 'margin:1.4em 0;padding:22px 12px;border:1px dashed #b7c4b8;border-radius:14px;background:#fff;color:#9a9285;font-size:13px;line-height:1.6;text-align:center;'
  },
  decor: {
    h2: (html, index) => `<span style="display:block;font-size:11px;font-weight:normal;line-height:1;color:#ad957a;letter-spacing:3px;">SECTION ${padTwoDigits(index)}</span><span style="display:block;margin-top:6px;">${html}</span>${blockLine('width:24px;height:3px;border-radius:2px;background:#7d9a83;', 'margin-top:8px;')}`,
    h3: html => `<span style="display:inline-block;padding:1px 12px;border-radius:999px;background:#e3eae2;color:#4e6b55;">${html}</span>`,
    ulMark: colorDot('#7d9a83', 6),
    hr: spacedNote('○ ○ ○', '#aa9679')
  }
});
