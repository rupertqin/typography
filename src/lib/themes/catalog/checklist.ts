import { Theme } from '../theme';
import { spacedNote, padTwoDigits } from '../decorations';

/** 清单 · checklist · #16a34a */
export default new Theme({
  id: 'checklist',
  name: '清单',
  accent: '#16a34a',
  tags: ['tutorial'],
  styles: {
    h2: 'margin:2em 0 1em;font-size:17px;font-weight:bold;line-height:1.5;color:#14532d;',
    h3: 'margin:1.6em 0 0.8em;font-size:16px;font-weight:bold;line-height:1.5;color:#166534;',
    strong: 'font-weight:bold;color:#15803d;',
    blockquote: 'margin:1.4em 0;padding:12px 16px;border:1px solid #bbf7d0;border-radius:10px;background:#f0fdf4;color:#3f6150;font-size:14px;',
    th: 'padding:8px 10px;border:1px solid #bbf7d0;background:#dcfce7;font-weight:bold;text-align:left;',
    td: 'padding:8px 10px;border:1px solid #d1fae5;'
  },
  decor: {
    h2: (html, index) => `<span style="display:inline-block;margin-right:10px;padding:2px 8px;border-radius:4px;background:#16a34a;color:#fff;font-size:12px;letter-spacing:1px;vertical-align:middle;">STEP ${padTwoDigits(index)}</span><span style="vertical-align:middle;">${html}</span>`,
    h3: html => `<span style="color:#16a34a;">✓ </span>${html}`,
    quoteMark: '<span style="display:block;margin-bottom:4px;font-size:13px;font-weight:bold;color:#15803d;">💡 小贴士</span>',
    ulMark: '<span style="display:inline-block;width:13px;height:13px;border:1.5px solid #16a34a;border-radius:3px;color:#16a34a;font-size:11px;font-weight:bold;line-height:13px;text-align:center;letter-spacing:0;vertical-align:middle;">✓</span>',
    olMark: index => `<span style="display:inline-block;width:18px;height:18px;border-radius:4px;background:#dcfce7;color:#15803d;font-size:11px;font-weight:bold;line-height:18px;text-align:center;letter-spacing:0;vertical-align:1px;">${index}</span>`,
    hr: spacedNote('✓ ✓ ✓', '#18b752')
  }
});
