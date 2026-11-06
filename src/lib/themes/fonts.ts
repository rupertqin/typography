/**
 * 主题用的三套系统字体栈（公众号会清掉 webfont，只能用读者设备自带的字体）。
 *
 * 只声明字体栈不用 webfont：细体/极细用 font-weight 表达，比小众字体名更容易过公众号清洗。
 */

/**
 * 正文默认字体 = 字体下拉里的「黑体」预设（同一串栈，改一处两边一起变）。
 * mac/iOS 落苹方，Windows 落微软雅黑，安卓落系统默认。
 */
export const FONT_SANS =
  '-apple-system-font,BlinkMacSystemFont,Helvetica Neue,PingFang SC,Hiragino Sans GB,Microsoft YaHei,sans-serif';

/** 衬线字体（纸感/新闻主题用）= 字体下拉里的「宋体」预设 */
export const FONT_SERIF = 'Songti SC,STSong,SimSun,serif';

/** 代码块字体 */
export const FONT_MONO = 'Menlo,Monaco,Consolas,"Courier New",monospace';

/** 主题正文落在哪个字体预设上：未手动选字体时，下拉就直接显示它 */
export function themeFontId(wrapperStyle: string | undefined): 'sans' | 'song' {
  return (wrapperStyle ?? '').includes(FONT_SERIF) ? 'song' : 'sans';
}

/** 从主题 wrapper 的样式里取 font-family（取不到就用无衬线预设） */
export function themeBodyFont(wrapperStyle: string | undefined): string {
  const matched = /font-family\s*:\s*([^;]+)/i.exec(wrapperStyle ?? '')?.[1]?.trim();
  return matched || FONT_SANS;
}
