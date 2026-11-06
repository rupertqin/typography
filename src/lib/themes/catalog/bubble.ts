import { Theme } from '../theme';
import { FONT_MONO } from '../fonts';

/** 对话框 · bubble · #07c160 */
export default new Theme({
  id: 'bubble',
  name: '对话框',
  accent: '#07c160',
  tags: ['emotion', 'life'],
  page: 'padding:18px 14px;border-radius:8px;background:#ededed;color:#222;',
  styles: {
    h1: 'margin:0.6em 0 1.2em;font-size:20px;font-weight:bold;line-height:1.5;color:#111;text-align:center;',
    h2: 'margin:1.8em 0 1em;font-size:15px;font-weight:normal;line-height:1.6;color:#111;',
    h3: 'margin:1.6em 0 0.8em;font-size:12px;font-weight:normal;line-height:1.6;text-align:center;',
    strong: 'font-weight:bold;color:#06ad56;',
    h4: 'margin:1.2em 0 0.6em;font-size:15px;font-weight:bold;line-height:1.5;color:#06ad56;',
    del: 'text-decoration:line-through;color:#8c8c8c;',
    link: 'color:#06ad56;text-decoration:none;border-bottom:1px solid #06ad56;',
    blockquote: 'margin:1.2em 0;padding:10px 14px;border-radius:6px;background:#fff;color:#333;font-size:14px;',
    code: `margin:0 2px;padding:2px 5px;border-radius:4px;background:#fff;color:#06ad56;font-family:${FONT_MONO};font-size:90%;`,
    th: 'padding:8px 10px;border:1px solid #d5d5d5;background:#f7f7f7;font-weight:bold;text-align:left;',
    td: 'padding:8px 10px;border:1px solid #d5d5d5;background:#fff;',
    imgSlot: 'margin:1.4em 0;padding:22px 12px;border:1px dashed #b2b2b2;border-radius:6px;background:#fff;color:#999;font-size:13px;line-height:1.6;text-align:center;'
  },
  decor: {
    h2: html => `<span style="display:inline-block;width:34px;height:34px;margin-right:8px;border-radius:6px;background:#fff;font-size:18px;line-height:34px;text-align:center;vertical-align:middle;">💬</span><span style="display:inline-block;width:0;height:0;border-top:6px solid transparent;border-bottom:6px solid transparent;border-right:7px solid #95ec69;vertical-align:middle;"></span><span style="display:inline-block;max-width:75%;padding:8px 12px;border-radius:6px;background:#95ec69;font-weight:bold;text-align:left;vertical-align:middle;">${html}</span>`,
    h3: html => `<span style="display:inline-block;padding:2px 10px;border-radius:4px;background:#e0e0e0;color:#7a7a7a;">${html}</span>`,
    hr: '<section style="margin:1.6em 0;font-size:12px;line-height:1;color:#939393;text-align:center;">—— 以下是新消息 ——</section>'
  }
});
