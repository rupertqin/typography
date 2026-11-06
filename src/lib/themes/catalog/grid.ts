import { Theme } from '../theme';
import { spacedNote, cornerRule } from '../decorations';

/** 方格本 · grid · #4a6fa5 */
export default new Theme({
  id: 'grid',
  name: '方格本',
  accent: '#4a6fa5',
  tags: ['tutorial', 'life'],
  page: 'padding:22px 16px;background-color:#fff;background-image:linear-gradient(rgba(74,111,165,0.09) 1px,transparent 1px),linear-gradient(90deg,rgba(74,111,165,0.09) 1px,transparent 1px);background-size:18px 18px;',
  styles: {
    h2: 'margin:2em 0 1.2em;font-size:17px;font-weight:bold;line-height:1.5;color:#2f4b75;text-align:center;',
    h3: 'margin:1.6em 0 0.8em;font-size:16px;font-weight:bold;line-height:1.5;color:#2f4b75;',
    strong: 'font-weight:bold;color:#2f4b75;background:rgba(74,111,165,0.12);padding:0 3px;',
    blockquote: 'margin:1.4em 0;padding:12px 16px;border:1px solid rgba(74,111,165,0.35);border-radius:4px;background:#fff;box-shadow:3px 3px 0 rgba(74,111,165,0.15);color:#5a6a80;font-size:14px;',
    imgSlot: 'margin:1.4em 0;padding:22px 12px;border:1px dashed #8fa6c8;border-radius:4px;background:#fff;color:#8a97ab;font-size:13px;line-height:1.6;text-align:center;'
  },
  decor: {
    h2: html => `${cornerRule('#4a6fa5', 'left')}<span style="display:inline-block;margin:0 10px;vertical-align:middle;">${html}</span>${cornerRule('#4a6fa5', 'right')}`,
    h3: html => `<span style="padding-bottom:2px;border-bottom:1px dashed #4a6fa5;">✎ ${html}</span>`,
    hr: spacedNote('· · ✎ · ·', '#8fa6c8')
  }
});
