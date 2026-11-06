import type { ArticleType, ColorPreset } from "./types";

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

/** 可单独调色的部件 */
export const COLOR_PARTS = [
  { id: "h1", name: "大标题" },
  { id: "h2", name: "小标题" },
  { id: "h3", name: "三级标题" },
  { id: "strong", name: "加粗" },
  { id: "blockquote", name: "引用块" },
  { id: "hr", name: "分割线" },
  { id: "list", name: "列表符号" },
  { id: "code", name: "行内代码" },
  { id: "table", name: "表格" },
  { id: "page", name: "背景" },
];

/** 主色预设 */
export const MAIN_COLOR_PRESETS: ColorPreset[] = [
  { color: "#07c160", name: "微信绿" },
  { color: "#1677ff", name: "蓝" },
  { color: "#1e3a8a", name: "藏青" },
  { color: "#e53935", name: "红" },
  { color: "#fa8c16", name: "橙" },
  { color: "#d4a106", name: "金" },
  { color: "#13c2c2", name: "青" },
  { color: "#722ed1", name: "紫" },
  { color: "#eb2f96", name: "粉" },
  { color: "#8b5a2b", name: "棕" },
  { color: "#262626", name: "墨黑" },
];

/** 部件调色预设 */
export const PART_COLOR_PRESETS: ColorPreset[] = [
  { color: "#e53935", name: "红" },
  { color: "#fa8c16", name: "橙" },
  { color: "#1677ff", name: "蓝" },
  { color: "#07c160", name: "绿" },
  { color: "#722ed1", name: "紫" },
  { color: "#262626", name: "黑" },
  { color: "#d9d9d9", name: "浅灰" },
];

/** 预览缩放档位 */
export const ZOOM_LEVELS = [1, 0.75, 0.5];

/** 行高档位：'theme' 表示沿用每套主题自己的节奏 */
export const LINE_HEIGHT_OPTIONS: Array<{ value: 'theme' | number; label: string; hint: string }> = [
  { value: 'theme', label: '主题', hint: '默认' },
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

/** 标题样式预设（一级/二级/三级各自可选） */
export const HEADING_STYLE_OPTIONS = [
  { value: 'default', label: '默认' },
  { value: 'color-only', label: '主题色文字' },
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
  { value: 0.8, label: "极小" },
  { value: 0.9, label: "小" },
  { value: 1, label: "标准" },
  { value: 1.1, label: "大" },
  { value: 1.25, label: "极大" },
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
  { id: "theme", label: "主题字体", stack: "" },
  {
    id: "sans",
    label: "黑体",
    stack:
      "-apple-system-font,BlinkMacSystemFont,Helvetica Neue,PingFang SC,Hiragino Sans GB,Microsoft YaHei,sans-serif",
  },
  { id: "song", label: "宋体", stack: "Songti SC,STSong,SimSun,serif" },
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
