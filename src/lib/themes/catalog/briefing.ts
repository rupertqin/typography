import { Theme } from '../theme';
import { padTwoDigits, circleBadge } from '../decorations';

/** 简报 · briefing · #1e3a8a */
export default new Theme({
  id: 'briefing',
  name: '简报',
  accent: '#1e3a8a',
  tags: ['business', 'news'],
  page: 'color:#334155;',
  styles: {
    h1: 'margin:1em 0 1.2em;font-size:22px;font-weight:bold;line-height:1.5;color:#1e3a8a;',
    h2: 'margin:2em 0 1em;font-size:16px;font-weight:bold;line-height:1.5;color:#fff;',
    h3: 'margin:1.6em 0 0.8em;padding-left:10px;border-left:4px solid #f59e0b;font-size:16px;font-weight:bold;line-height:1.4;color:#1e3a8a;',
    strong: 'font-weight:bold;color:#1e3a8a;',
    blockquote: 'margin:1.4em 0;padding:12px 16px;border-top:3px solid #1e3a8a;background:#eff3fb;color:#334155;font-size:14px;',
    th: 'padding:8px 10px;border:1px solid #1e3a8a;background:#1e3a8a;color:#fff;font-weight:bold;text-align:left;',
    td: 'padding:8px 10px;border:1px solid #cbd5e1;',
    hr: 'margin:2em 0;height:0;border:0;border-top:1px solid #cbd5e1;'
  },
  decor: {
    h2: (html, index) => `<span style="display:block;padding-right:14px;background:#1e3a8a;line-height:38px;"><span style="display:inline-block;margin-right:12px;padding:0 12px;background:#f59e0b;color:#1e3a8a;letter-spacing:0;">${padTwoDigits(index)}</span>${html}</span>`,
    quoteMark: '<span style="display:block;margin-bottom:4px;font-size:12px;font-weight:bold;letter-spacing:2px;color:#1e3a8a;">▍要点</span>',
    ulMark: '<span style="display:inline-block;width:7px;height:7px;background:#f59e0b;vertical-align:middle;"></span>',
    olMark: index => circleBadge(index, '#1e3a8a')
  }
});
