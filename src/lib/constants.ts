import type { ArticleType, ColorPreset } from "./types";
import { FONT_SANS, FONT_SERIF } from "./themes/fonts";

/** 文章类型：与原站一致，用于主题推荐筛选 */
export const ARTICLE_TYPES: ArticleType[] = [
  { id: "tech", name: "技术编程" },
  { id: "tutorial", name: "干货教程" },
  { id: "news", name: "资讯观点" },
  { id: "business", name: "商业职场" },
  { id: "emotion", name: "情感随笔" },
  { id: "culture", name: "读书文艺" },
  { id: "life", name: "生活美食" },
  { id: "event", name: "活动节日" },
];

/** 可单独调色的部件（标题文字色改由上面的「标题样式」按级别设置） */
export const COLOR_PARTS = [
  { id: "strong", name: "加粗" },
  { id: "blockquote", name: "引用块" },
  { id: "hr", name: "分割线" },
  { id: "list", name: "列表符号" },
  { id: "code", name: "行内代码" },
  { id: "table", name: "表格" },
  { id: "page", name: "背景" },
];

/** 主色预设：取自 doocs/md 的 colorOptions（11 色，默认经典蓝 #0F4C81） */
export const MAIN_COLOR_PRESETS: ColorPreset[] = [
  { color: "#0f4c81", name: "经典蓝" },
  { color: "#009874", name: "翡翠绿" },
  { color: "#fa5151", name: "活力橘" },
  { color: "#fece00", name: "柠檬黄" },
  { color: "#92617e", name: "薰衣紫" },
  { color: "#55c9ea", name: "天空蓝" },
  { color: "#b76e79", name: "玫瑰金" },
  { color: "#556b2f", name: "橄榄绿" },
  { color: "#333333", name: "石墨黑" },
  { color: "#a9a9a9", name: "雾烟灰" },
  { color: "#ffb7c5", name: "樱花粉" },
];

/**
 * 部件调色预设：从主色预设里取常用的 7 色（含中性色），
 * 色值与名称都跟「主色」共用一份数据，改主色时两处不会对不上。
 * 数量保持 7 个，避免单独调色每行被撑到换行。
 */
const PART_PRESET_NAMES = ['经典蓝', '翡翠绿', '活力橘', '薰衣紫', '石墨黑', '雾烟灰', '樱花粉'];
export const PART_COLOR_PRESETS: ColorPreset[] = MAIN_COLOR_PRESETS.filter((preset) =>
  PART_PRESET_NAMES.includes(preset.name),
);

/** 预览缩放档位 */
export const ZOOM_LEVELS = [1, 0.75, 0.5];

/** 行距档位：没有「主题」项，未选时仍沿用每套主题自己的节奏 */
export const LINE_HEIGHT_OPTIONS: Array<{ value: number; label: string; hint: string }> = [
  { value: 1.5, label: '1.5', hint: '紧凑' },
  { value: 1.65, label: '1.65', hint: '稍紧' },
  { value: 1.75, label: '1.75', hint: '推荐' },
  { value: 1.9, label: '1.9', hint: '稍松' },
  { value: 2.05, label: '2.05', hint: '宽松' },
];

/** 段间距档位：倍数乘在主题已有的上下边距上，标题仍比正文更疏 */
export const BLOCK_SPACING_OPTIONS: Array<{ value: number; label: string; hint: string }> = [
  { value: 0.75, label: '0.75×', hint: '紧凑' },
  { value: 0.9, label: '0.9×', hint: '稍紧' },
  { value: 1, label: '1×', hint: '默认' },
  { value: 1.15, label: '1.15×', hint: '稍松' },
  { value: 1.35, label: '1.35×', hint: '宽松' },
];

/** 标题样式预设（H1–H6 各自可选） */
export const HEADING_STYLE_OPTIONS = [
  { value: 'default', label: '默认' },
  { value: 'color-only', label: '自选颜色' },
  { value: 'border-bottom', label: '下边框' },
  { value: 'border-left', label: '左边框' },
] as const;

/** 链接色：'' = 跟随主题，其余写进 partColors.link */
export const LINK_COLOR_OPTIONS: ColorPreset[] = [
  { color: '', name: '跟随主题' },
  { color: '#576b95', name: '微信蓝' },
];

/** 引用底色：'' = 跟随主题，'accent' = 按当前主色算的浅底 */
export const BLOCKQUOTE_BG_OPTIONS = [
  { value: '', label: '跟随主题' },
  { value: 'transparent', label: '无背景' },
  { value: 'accent', label: '主题色浅底' },
] as const;

/** 整体字号档位：按比例缩放主题里的 px 字号，复制到公众号后同样生效 */
export const FONT_SCALES = [
  { value: 0.7, label: "更小" },
  { value: 0.9, label: "小" },
  { value: 1, label: "标准" },
  { value: 1.1, label: "大" },
  { value: 1.4, label: "更大" },
];

/**
 * 正文字体：公众号后台没有字体选择器，正文按读者设备的系统字体渲染。
 * 内联 font-family 粘贴后一般能保留，但只有读者设备本地装了的字体才生效，
 * 所以这里只提供系统字体栈；stack 为空表示沿用主题自己的字体。
 */
export interface FontFamilyPreset {
  id: string;
  label: string;
  /** 字体栈（不要带引号：内联样式里的引号会变成 &quot;，微信预览容易因此丢样式） */
  stack: string;
  /** 字重：细体 / 极细用 font-weight 表达，比 PostScript 字体名更容易通过公众号清洗 */
  weight?: number;
  /** 苹果系统字体：安卓设备上没有，会回退到系统默认 */
  iosOnly?: boolean;
}

export const FONT_FAMILIES: FontFamilyPreset[] = [
  {
    id: "sans",
    label: "黑体",
    stack: FONT_SANS,
  },
  { id: "song", label: "宋体", stack: FONT_SERIF },
  { id: "kai", label: "楷体", stack: "Kaiti SC,STKaiti,KaiTi,serif" },
  /**
   * 苹果系统字体（安卓没有，会回退到系统默认）。
   * 细体 / 极细一律用白名单字体名 + font-weight 实现，不用 PingFangSC-Light 这类
   * PostScript 名——名字不在公众号白名单里时整条声明会被剥掉，反而连字体都没了。
   */
  {
    id: "optima",
    label: "中文细体",
    iosOnly: true,
    stack: "Optima-Regular,Optima,PingFang SC,sans-serif",
    weight: 300,
  },
  {
    id: "pingfang-sc-light",
    label: "苹方简细体",
    iosOnly: true,
    stack: "PingFang SC,Hiragino Sans GB,Microsoft YaHei,sans-serif",
    weight: 300,
  },
  {
    id: "pingfang-sc-ultralight",
    label: "苹方简极细",
    iosOnly: true,
    stack: "PingFang SC,Hiragino Sans GB,Microsoft YaHei,sans-serif",
    weight: 200,
  },
  {
    id: "pingfang-tc-light",
    label: "苹方繁细体",
    iosOnly: true,
    stack: "PingFang TC,sans-serif",
    weight: 300,
  },
  {
    id: "pingfang-tc-ultralight",
    label: "苹方繁极细",
    iosOnly: true,
    stack: "PingFang TC,sans-serif",
    weight: 200,
  },
];

/** 主题卡「新」标记 */
export const NEW_THEME_IDS = new Set([
  "grid",
  "blush",
  "festival",
  "terminal",
  "docs",
  "magazine",
  "pop",
  "timeline",
  "seal",
  "whisper",
  "neon",
  "kraft",
  "briefing",
  "bubble",
  "inkwash",
  "nordic",
  "candy",
  "feed",
  "checklist",
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
  { id: "heading", title: "小标题", line: "## 小标题" },
  { id: "bold", title: "加粗", wrap: ["**", "**"], placeholder: "加粗文字" },
  { id: "quote", title: "引用", line: "> 引用内容" },
  { id: "code", title: "代码块", line: "```javascript\n// 代码\n```" },
  { id: "mermaid", title: "图表", line: "```mermaid\nflowchart LR\n  A[开始] --> B[结束]\n```" },
  { id: "image", title: "图片位置", line: "![图片说明](图片)" },
  { id: "hr", title: "分割线", line: "---" },
];
