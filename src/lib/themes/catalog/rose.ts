import { Theme } from '../theme';
import { spacedNote } from '../decorations';

/** 玫瑰 · rose · #d9466f */
export default new Theme({
  id: 'rose',
  name: '玫瑰',
  accent: '#d9466f',
  tags: ['emotion', 'event'],
  styles: {
    h1: 'margin:1.2em 0 1.2em;font-size:22px;font-weight:bold;line-height:1.5;color:#d9466f;text-align:center;',
    h2: 'margin:2em 0 1.1em;font-size:18px;font-weight:bold;line-height:1.5;color:#d9466f;text-align:center;',
    h3: 'margin:1.6em 0 0.8em;font-size:16px;font-weight:bold;line-height:1.5;color:#333;',
    blockquote: 'margin:1.4em 0;padding:14px 16px;border-radius:8px;background:rgba(217,70,111,0.06);color:#666;font-size:14px;'
  },
  decor: {
    h2: html => `<span style="display:inline-block;padding:0 6px 4px;border-bottom:2px solid #d9466f;">${html}</span>`,
    h3: html => `<span style="padding:0 4px;background:linear-gradient(transparent 60%,rgba(217,70,111,0.2) 60%);">${html}</span>`,
    hr: spacedNote('❀ ❀ ❀', '#eb8ba6')
  }
});
