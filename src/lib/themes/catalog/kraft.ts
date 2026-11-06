import { Theme } from '../theme';
import { spacedNote } from '../decorations';
import { FONT_MONO } from '../fonts';

/** 牛皮纸 · kraft · #b5562f */
export default new Theme({
  id: 'kraft',
  name: '牛皮纸',
  accent: '#b5562f',
  tags: ['life', 'culture'],
  page: 'padding:22px 16px;border-radius:6px;background:#f3e6cf;color:#4a3b2a;',
  styles: {
    h2: 'margin:2.2em 0 1.2em;font-size:16px;font-weight:bold;line-height:1.5;text-align:center;',
    h3: 'margin:1.6em 0 0.8em;font-size:15px;font-weight:bold;line-height:1.5;',
    strong: 'font-weight:bold;color:#8f3f1f;',
    del: 'text-decoration:line-through;color:#8a7a66;',
    blockquote: 'margin:1.4em 0;padding:12px 16px;border:1px dashed #c9a77c;border-radius:4px;background:#fbf5ea;color:#6b5843;font-size:14px;',
    code: `margin:0 2px;padding:2px 5px;border-radius:4px;background:#ead8b8;color:#7a3a1a;font-family:${FONT_MONO};font-size:90%;`,
    th: 'padding:8px 10px;border:1px solid #d8bf98;background:#e8d5b2;font-weight:bold;text-align:left;',
    td: 'padding:8px 10px;border:1px solid #d8bf98;background:#fbf5ea;',
    imgSlot: 'margin:1.4em 0;padding:22px 12px;border:1px dashed #b5562f;border-radius:4px;background:#fbf5ea;color:#9b8466;font-size:13px;line-height:1.6;text-align:center;'
  },
  decor: {
    h2: html => {
      const t = (n: 'left' | 'right') => `<span style="display:inline-block;width:0;height:0;border-top:18px solid #8f3f1f;border-bottom:18px solid #8f3f1f;border-${n}:12px solid transparent;vertical-align:middle;"></span>`;
      return `${t('left')}<span style="display:inline-block;padding:5px 20px;border-top:1px dashed rgba(255,248,236,0.6);border-bottom:1px dashed rgba(255,248,236,0.6);background:#b5562f;color:#fff8ec;line-height:24px;letter-spacing:2px;vertical-align:middle;">${html}</span>${t('right')}`;
    },
    h3: html => `<span style="display:inline-block;padding:1px 10px;border:1px dashed #b5562f;border-radius:3px;background:#fbf5ea;color:#8f3f1f;">${html}</span>`,
    ulMark: '<span style="color:#b5562f;">✻</span>',
    hr: spacedNote('· ✻ ·', '#b5562f')
  }
});
