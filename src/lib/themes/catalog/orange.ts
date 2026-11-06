import { Theme } from '../theme';
import { spacedNote } from '../decorations';

/** 橙心 · orange · #ef7060 */
export default new Theme({
  id: 'orange',
  name: '橙心',
  accent: '#ef7060',
  tags: ['life', 'event'],
  styles: {
    h2: 'margin:2em 0 1.1em;font-size:17px;font-weight:bold;line-height:1.5;text-align:center;',
    h3: 'margin:1.6em 0 0.8em;font-size:16px;font-weight:bold;line-height:1.5;color:#ef7060;',
    blockquote: 'margin:1.4em 0;padding:14px 16px;border-radius:10px;background:#fff4f1;color:#7a5a55;font-size:14px;'
  },
  decor: {
    h2: html => `<span style="display:inline-block;padding:5px 18px;border-radius:6px;background:#ef7060;color:#fff;box-shadow:3px 3px 0 #ffd2ca;">${html}</span>`,
    h3: html => `<span style="display:inline-block;width:8px;height:8px;margin-right:8px;border-radius:50%;background:#ef7060;vertical-align:middle;"></span>${html}`,
    hr: spacedNote('● ● ●', '#ef8171')
  }
});
