import { Theme } from '../theme';
import { spacedNote } from '../decorations';
import { FONT_SANS } from '../fonts';

/** 手账 · notebook · #e8590c */
export default new Theme({
  id: 'notebook',
  name: '手账',
  accent: '#e8590c',
  tags: ['tutorial', 'life'],
  styles: {
    wrapper: `font-family:${FONT_SANS};font-size:15px;line-height:1.85;color:#4a4036;letter-spacing:0.5px;word-break:break-word;text-align:justify;padding:20px 16px;border-radius:6px;background:#fffdf6;`,
    h2: 'margin:2em 0 1.1em;font-size:17px;font-weight:bold;line-height:1.5;color:#5c3d00;',
    h3: 'margin:1.6em 0 0.8em;font-size:16px;font-weight:bold;line-height:1.5;color:#5c3d00;',
    strong: 'font-weight:bold;color:#e8590c;border-bottom:2px dotted #e8590c;',
    blockquote: 'margin:1.4em 0;padding:14px 16px;border:1.5px dashed #f2c94c;border-radius:12px;background:#fffbe6;color:#6b5a3a;font-size:14px;'
  },
  decor: {
    h2: html => `<span style="display:inline-block;padding:4px 16px;border-left:3px dotted #fff;border-right:3px dotted #fff;background:rgba(255,212,59,0.6);">${html}</span>`,
    h3: html => `<span style="padding-bottom:2px;border-bottom:2px dashed #f2c94c;">✎ ${html}</span>`,
    hr: spacedNote('✂ - - - - - - - -', '#be9a52')
  }
});
