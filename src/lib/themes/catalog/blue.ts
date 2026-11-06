import { Theme } from '../theme';

/** 科技蓝 · blue · #2f6fde */
export default new Theme({
  id: 'blue',
  name: '科技蓝',
  accent: '#2f6fde',
  tags: ['tech', 'tutorial'],
  styles: {
    h1: 'margin:1.2em 0 1.2em;font-size:22px;font-weight:bold;line-height:1.5;color:#2f6fde;text-align:center;',
    h2: 'margin:2em 0 1.1em;border-bottom:2px solid #2f6fde;font-size:17px;font-weight:bold;line-height:1.5;',
    h3: 'margin:1.6em 0 0.8em;font-size:16px;font-weight:bold;line-height:1.5;color:#2f6fde;',
    blockquote: 'margin:1.4em 0;padding:14px 16px;border-radius:8px;background:#f0f5ff;color:#4a5b78;font-size:14px;'
  },
  decor: {
    h2: html => `<span style="display:inline-block;padding:5px 14px;border-radius:6px 6px 0 0;background:#2f6fde;color:#fff;">${html}</span>`,
    h3: html => `<span style="color:#2f6fde;">▍</span>${html}`
  }
});
