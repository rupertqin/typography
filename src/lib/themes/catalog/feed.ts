import { Theme } from '../theme';

/** 卡片流 · feed · #f97316 */
export default new Theme({
  id: 'feed',
  name: '卡片流',
  accent: '#f97316',
  tags: ['news', 'tutorial'],
  page: 'padding:12px 10px;border-radius:8px;background:#f2f3f5;',
  styles: {
    h1: 'margin:0.6em 0 0.8em;padding:0 6px;font-size:21px;font-weight:bold;line-height:1.5;color:#222;',
    h2: 'margin:0.8em 0 0.6em;padding-bottom:10px;border-bottom:1px solid #f0f0f0;font-size:17px;font-weight:bold;line-height:1.5;color:#222;',
    h3: 'margin:1.4em 0 0.6em;font-size:15px;font-weight:bold;line-height:1.5;color:#333;',
    blockquote: 'margin:1.2em 0;padding:12px 14px;border-radius:8px;background:#f7f8fa;color:#666;font-size:14px;',
    hr: 'margin:1.6em 0;height:0;border:0;border-top:1px dashed #e5e5e5;',
    imgSlot: 'margin:1.2em 0;padding:22px 12px;border:1px dashed #fdba74;border-radius:8px;background:#f7f8fa;color:#999;font-size:13px;line-height:1.6;text-align:center;'
  },
  decor: {
    card: {
      style: 'margin:0 0 12px;padding:4px 16px 10px;border-radius:12px;background:#fff;box-shadow:0 1px 6px rgba(0,0,0,0.05);',
      withHeading: true
    },
    h2: html => `<span style="display:inline-block;width:4px;height:16px;margin-right:8px;border-radius:2px;background:#f97316;vertical-align:-2px;"></span>${html}`,
    h3: html => `<span style="color:#f97316;"># </span>${html}`
  }
});
