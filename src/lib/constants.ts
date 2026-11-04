import type { ArticleType, ColorPreset } from './types';

/** 文章类型：与原站一致，用于主题推荐筛选 */
export const ARTICLE_TYPES: ArticleType[] = [
  { id: 'tech', name: '技术编程' },
  { id: 'tutorial', name: '干货教程' },
  { id: 'news', name: '资讯观点' },
  { id: 'business', name: '商业职场' },
  { id: 'emotion', name: '情感随笔' },
  { id: 'culture', name: '读书文艺' },
  { id: 'life', name: '生活美食' },
  { id: 'event', name: '活动节日' },
];

/** 可单独调色的部件 */
export const COLOR_PARTS = [
  { id: 'h1', name: '大标题' },
  { id: 'h2', name: '小标题' },
  { id: 'h3', name: '三级标题' },
  { id: 'strong', name: '加粗' },
  { id: 'blockquote', name: '引用块' },
  { id: 'hr', name: '分割线' },
  { id: 'list', name: '列表符号' },
  { id: 'code', name: '行内代码' },
  { id: 'table', name: '表格' },
  { id: 'page', name: '背景' },
];

/** 主色预设 */
export const MAIN_COLOR_PRESETS: ColorPreset[] = [
  { color: '#07c160', name: '微信绿' },
  { color: '#1677ff', name: '蓝' },
  { color: '#1e3a8a', name: '藏青' },
  { color: '#e53935', name: '红' },
  { color: '#fa8c16', name: '橙' },
  { color: '#d4a106', name: '金' },
  { color: '#13c2c2', name: '青' },
  { color: '#722ed1', name: '紫' },
  { color: '#eb2f96', name: '粉' },
  { color: '#8b5a2b', name: '棕' },
  { color: '#262626', name: '墨黑' },
];

/** 部件调色预设 */
export const PART_COLOR_PRESETS: ColorPreset[] = [
  { color: '#e53935', name: '红' },
  { color: '#fa8c16', name: '橙' },
  { color: '#1677ff', name: '蓝' },
  { color: '#07c160', name: '绿' },
  { color: '#722ed1', name: '紫' },
  { color: '#262626', name: '黑' },
  { color: '#d9d9d9', name: '浅灰' },
];

/** 预览缩放档位 */
export const ZOOM_LEVELS = [1, 0.75, 0.5];

/** 主题卡「新」标记 */
export const NEW_THEME_IDS = new Set([
  'grid',
  'blush',
  'festival',
  'terminal',
  'docs',
  'magazine',
  'pop',
  'timeline',
  'seal',
  'whisper',
  'neon',
  'kraft',
  'briefing',
  'bubble',
  'inkwash',
  'nordic',
  'candy',
  'feed',
  'checklist',
]);

export interface InsertAction {
  id: string;
  title: string;
  line?: string;
  wrap?: [string, string];
  placeholder?: string;
}

/** 编辑器插入工具栏（图标在组件层映射） */
export const INSERT_ACTIONS: InsertAction[] = [
  { id: 'heading', title: '小标题', line: '## 小标题' },
  { id: 'bold', title: '加粗', wrap: ['**', '**'], placeholder: '加粗文字' },
  { id: 'quote', title: '引用', line: '> 引用内容' },
  { id: 'code', title: '代码块', line: '```javascript\n// 代码\n```' },
  { id: 'image', title: '图片位置', line: '![图片说明](图片)' },
  { id: 'hr', title: '分割线', line: '---' },
];
