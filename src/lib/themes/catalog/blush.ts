import { Theme } from '../theme';
import { spacedNote } from '../decorations';

/** 粉笺 · blush · #a33b32 */
export default new Theme({
  id: 'blush',
  name: '粉笺',
  accent: '#a33b32',
  tags: ['emotion', 'life'],
  styles: {
    p: 'margin:0.9em 0;',
    h2: 'margin:2em 0 1em;font-size:16px;font-weight:bold;line-height:1.5;color:#8b2f28;text-align:center;letter-spacing:2px;',
    h3: 'margin:1.4em 0 0.6em;font-size:15px;font-weight:bold;line-height:1.5;color:#8b2f28;',
    strong: 'font-weight:bold;color:#222;',
    blockquote: 'margin:1em 0;padding:12px 14px;border-radius:4px;background:#fff;color:#7a5a55;font-size:14px;',
    imgSlot: 'margin:1.2em 0;padding:22px 12px;border:1px dashed #e0a59d;border-radius:4px;background:#fff;color:#b08a85;font-size:13px;line-height:1.6;text-align:center;'
  },
  decor: {
    card: {
      style: 'margin:0.6em 0 1.4em;padding:4px 16px;border-radius:4px;background:#fdf0ee;'
    },
    h2: html => `<span style="display:block;">${html}</span><span style="display:block;margin-top:2px;font-size:11px;line-height:1;color:#d98b80;letter-spacing:0;">❦<span style="display:inline-block;width:76px;height:0;margin:0 4px;border-top:1px solid #d98b80;vertical-align:middle;"></span>❦</span>`,
    h3: html => `<span style="color:#d98b80;">❀ </span>${html}`,
    quoteMark: '<span style="display:block;height:20px;font-family:Georgia,serif;font-size:30px;line-height:1;color:#d78c82;">“</span>',
    hr: spacedNote('❦', '#d98b80')
  }
});
