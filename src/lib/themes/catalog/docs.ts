import { Theme } from '../theme';
import { FONT_MONO } from '../fonts';

/** 文档 · docs · #0969da */
export default new Theme({
  id: 'docs',
  name: '文档',
  accent: '#0969da',
  tags: ['tech', 'tutorial'],
  code: 'light',
  page: 'color:#1f2328;',
  styles: {
    h1: 'margin:1em 0 1em;padding-bottom:8px;border-bottom:1px solid #d8dee4;font-size:22px;font-weight:bold;line-height:1.4;color:#1f2328;',
    h2: 'margin:1.8em 0 1em;padding-bottom:6px;border-bottom:1px solid #d8dee4;font-size:18px;font-weight:bold;line-height:1.5;color:#1f2328;',
    h3: 'margin:1.5em 0 0.8em;font-size:16px;font-weight:bold;line-height:1.5;color:#1f2328;',
    strong: 'font-weight:bold;color:#1f2328;',
    blockquote: 'margin:1.4em 0;padding:4px 14px;border-left:4px solid #0969da;color:#57606a;font-size:14px;',
    code: `margin:0 2px;padding:2px 5px;border-radius:5px;background:rgba(175,184,193,0.25);color:#1f2328;font-family:${FONT_MONO};font-size:88%;`,
    th: 'padding:8px 10px;border:1px solid #d0d7de;background:#f6f8fa;font-weight:bold;text-align:left;',
    td: 'padding:8px 10px;border:1px solid #d0d7de;',
    hr: 'margin:2em 0;height:0;border:0;border-top:3px solid #d8dee4;'
  },
  decor: {
    h2: html => `<span style="margin-right:8px;color:#0969da;font-family:${FONT_MONO};">#</span>${html}`,
    h3: html => `<span style="margin-right:6px;color:#8c959f;font-family:${FONT_MONO};">##</span>${html}`,
    quoteMark: '<span style="display:block;margin:4px 0 2px;color:#0969da;font-size:13px;font-weight:bold;">ⓘ Note</span>'
  }
});
