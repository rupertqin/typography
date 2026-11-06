import { Theme } from '../theme';
import { spacedNote } from '../decorations';

/** 紫罗兰 · violet · #7c4dff */
export default new Theme({
  id: 'violet',
  name: '紫罗兰',
  accent: '#7c4dff',
  tags: ['event', 'emotion'],
  styles: {
    h1: 'margin:1.2em 0 1.2em;font-size:22px;font-weight:bold;line-height:1.5;color:#5b2fd6;text-align:center;',
    h2: 'margin:2em 0 1.1em;font-size:17px;font-weight:bold;line-height:1.5;text-align:center;',
    h3: 'margin:1.6em 0 0.8em;padding-left:10px;border-left:4px solid #b388ff;font-size:16px;font-weight:bold;line-height:1.5;color:#5b2fd6;',
    blockquote: 'margin:1.4em 0;padding:14px 16px;border-radius:10px;background:#f5f0ff;color:#5e5577;font-size:14px;'
  },
  decor: {
    h2: html => `<span style="display:inline-block;padding:6px 22px;border-radius:999px;background:linear-gradient(90deg,#7c4dff,#b388ff);color:#fff;box-shadow:0 4px 12px rgba(124,77,255,0.3);">${html}</span>`,
    quoteMark: '<span style="display:block;height:22px;font-family:Georgia,serif;font-size:36px;line-height:1;color:#b388ff;">“</span>',
    hr: spacedNote('✦ ✦ ✦', '#b388ff')
  }
});
