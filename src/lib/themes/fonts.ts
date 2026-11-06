/**
 * 主题用的三套系统字体栈（公众号会清掉 webfont，只能用读者设备自带的字体）。
 *
 * 只声明字体栈不用 webfont：细体/极细用 font-weight 表达，比小众字体名更容易过公众号清洗。
 */

/** 正文默认字体：系统无衬线 */
export const FONT_SANS =
  '-apple-system,BlinkMacSystemFont,"Helvetica Neue","PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif';

/** 衬线字体（纸感主题用） */
export const FONT_SERIF = 'Georgia,"Songti SC","STSong","SimSun",serif';

/** 代码块字体 */
export const FONT_MONO = 'Menlo,Monaco,Consolas,"Courier New",monospace';
