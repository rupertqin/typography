import { Theme } from '../theme';
import { spacedNote } from '../decorations';

/** 墨绿 · green · #1f7a5c */
export default new Theme({
  id: 'green',
  name: '墨绿',
  accent: '#1f7a5c',
  tags: ['business', 'news'],
  styles: {
    h2: 'margin:2em 0 1.1em;padding:2px 0 2px 12px;border-left:5px solid #1f7a5c;font-size:18px;font-weight:bold;line-height:1.5;color:#1f7a5c;',
    h3: 'margin:1.6em 0 0.8em;font-size:16px;font-weight:bold;line-height:1.5;color:#2a2a2a;'
  },
  decor: {
    h3: html => `<span style="padding-bottom:2px;border-bottom:2px solid rgba(31,122,92,0.35);">${html}</span>`,
    hr: spacedNote('· · ·', '#1f7a5c')
  }
});
