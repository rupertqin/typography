import { Theme } from '../theme';
import { spacedNote } from '../decorations';

/** 国潮 · festival · #d9381e */
export default new Theme({
  id: 'festival',
  name: '国潮',
  accent: '#d9381e',
  tags: ['event'],
  page: 'padding:20px 16px;background:#fffaf1;color:#a8502a;',
  styles: {
    h1: 'margin:1.2em 0 1.2em;font-size:22px;font-weight:bold;line-height:1.5;color:#c92a1a;text-align:center;letter-spacing:3px;',
    h2: 'margin:2.2em 0 1.2em;font-size:16px;font-weight:bold;line-height:1.5;text-align:center;',
    h3: 'margin:1.6em 0 0.8em;font-size:16px;font-weight:bold;line-height:1.5;color:#c92a1a;',
    strong: 'font-weight:bold;color:#d9381e;',
    blockquote: 'margin:1.6em 0;padding:16px 18px;border:1px solid #e9b949;background:#fff3df;box-shadow:inset 0 0 0 3px #fff3df,inset 0 0 0 4px #f1cf85;color:#9a4a22;font-size:14px;',
    th: 'padding:8px 10px;border:1px solid #e9b949;background:#d9381e;color:#ffe9b3;font-weight:bold;text-align:left;',
    td: 'padding:8px 10px;border:1px solid #f1cf85;background:#fff;',
    imgSlot: 'margin:1.4em 0;padding:22px 12px;border:1px dashed #e9b949;background:#fff;color:#c08a5a;font-size:13px;line-height:1.6;text-align:center;'
  },
  decor: {
    h2: html => `<span style="display:inline-block;padding:2px;border:1px solid #e9b949;"><span style="display:inline-block;padding:3px;background:#d9381e;"><span style="display:inline-block;padding:5px 18px;border:1px solid #f6d58e;color:#fff;letter-spacing:3px;"><span style="color:#f6d58e;font-size:10px;vertical-align:middle;">◆</span><span style="margin:0 12px;vertical-align:middle;">${html}</span><span style="color:#f6d58e;font-size:10px;vertical-align:middle;">◆</span></span></span></span>`,
    h3: html => `<span style="color:#c89318;">◈ </span>${html}`,
    ulMark: '<span style="color:#d09121;">❖</span>',
    hr: spacedNote('〜 ❖ 〜', '#c89318')
  }
});
