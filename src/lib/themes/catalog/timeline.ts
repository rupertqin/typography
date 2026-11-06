import { Theme } from '../theme';
import { spacedNote, colorDot } from '../decorations';

/** 时间轴 · timeline · #0891b2 */
export default new Theme({
  id: 'timeline',
  name: '时间轴',
  accent: '#0891b2',
  tags: ['tutorial', 'news', 'business'],
  styles: {
    h2: 'margin:0.8em 0 0.8em;font-size:17px;font-weight:bold;line-height:1.5;color:#0e7490;',
    h3: 'margin:1.4em 0 0.6em;font-size:16px;font-weight:bold;line-height:1.5;color:#155e75;',
    blockquote: 'margin:1.2em 0;padding:12px 14px;border-radius:8px;background:#ecfeff;color:#4b6670;font-size:14px;'
  },
  decor: {
    card: {
      style: 'margin:0 0 0 12px;padding:6px 0 14px 24px;border-left:2px solid rgba(8,145,178,0.25);',
      withHeading: true,
      skipLead: true
    },
    h2: (html, index) => `<span style="display:inline-block;width:26px;height:26px;margin:0 10px 0 -38px;border-radius:50%;background:#0891b2;color:#fff;font-size:13px;line-height:26px;text-align:center;letter-spacing:0;vertical-align:middle;box-shadow:0 0 0 4px #fff;">${index}</span><span style="vertical-align:middle;">${html}</span>`,
    h3: html => `${colorDot('#22d3ee', 7)}<span style="margin-left:8px;vertical-align:middle;">${html}</span>`,
    hr: spacedNote('◦ ◦ ◦', '#33aec7')
  }
});
