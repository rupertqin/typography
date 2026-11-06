import { Theme } from '../theme';

/** 简约 · simple · #2b2b2b */
export default new Theme({
  id: 'simple',
  name: '简约',
  accent: '#2b2b2b',
  tags: ['news', 'business', 'tech'],
  styles: {
    h2: 'margin:2em 0 1.1em;padding-bottom:8px;border-bottom:1px solid #e3e3e3;font-size:18px;font-weight:bold;line-height:1.5;color:#222;',
    h3: 'margin:1.6em 0 0.8em;font-size:16px;font-weight:bold;line-height:1.5;color:#444;',
    strong: 'font-weight:bold;color:#000;',
    blockquote: 'margin:1.4em 0;padding:10px 16px;border-left:3px solid #d0d0d0;color:#777;font-size:14px;'
  }
});
