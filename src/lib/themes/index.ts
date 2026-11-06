/**
 * 主题注册表：一个主题一个文件（catalog/<id>.ts），这里只负责「按什么顺序排」。
 *
 * 顺序 = 主题菜单顺序，也是 check:themes 的硬断言；新增主题就在对应位置插一行并跑一次校验。
 * 前者是主题套件（35 套），后者是从 md.doocs 移植的三套，全部走同一个 Theme 类。
 */
import { FONT_MONO, FONT_SANS, FONT_SERIF } from './fonts';
import { Theme } from './theme';

/* --- 主题套件（35 套） --- */
import simple from './catalog/simple';
import orange from './catalog/orange';
import mint from './catalog/mint';
import green from './catalog/green';
import forest from './catalog/forest';
import blue from './catalog/blue';
import ocean from './catalog/ocean';
import violet from './catalog/violet';
import rose from './catalog/rose';
import sakura from './catalog/sakura';
import lemon from './catalog/lemon';
import notebook from './catalog/notebook';
import coffee from './catalog/coffee';
import ink from './catalog/ink';
import gold from './catalog/gold';
import news from './catalog/news';
import grid from './catalog/grid';
import blush from './catalog/blush';
import festival from './catalog/festival';
import terminal from './catalog/terminal';
import docs from './catalog/docs';
import magazine from './catalog/magazine';
import pop from './catalog/pop';
import timeline from './catalog/timeline';
import seal from './catalog/seal';
import whisper from './catalog/whisper';
import neon from './catalog/neon';
import kraft from './catalog/kraft';
import briefing from './catalog/briefing';
import bubble from './catalog/bubble';
import inkwash from './catalog/inkwash';
import nordic from './catalog/nordic';
import candy from './catalog/candy';
import feed from './catalog/feed';
import checklist from './catalog/checklist';

/* --- 从 md.doocs 移植的三套 --- */
import mdClassic from './catalog/md-classic';
import mdGrace from './catalog/md-grace';
import mdSimple from './catalog/md-simple';

/** 主题套件：来源同一套设计语言的 35 套 */
export const BASE_THEMES: readonly Theme[] = [
  simple,
  orange,
  mint,
  green,
  forest,
  blue,
  ocean,
  violet,
  rose,
  sakura,
  lemon,
  notebook,
  coffee,
  ink,
  gold,
  news,
  grid,
  blush,
  festival,
  terminal,
  docs,
  magazine,
  pop,
  timeline,
  seal,
  whisper,
  neon,
  kraft,
  briefing,
  bubble,
  inkwash,
  nordic,
  candy,
  feed,
  checklist,
];

/** 从 md.doocs 移植的三套（经典 / 优雅 / 清爽） */
export const MD_THEMES: readonly Theme[] = [mdClassic, mdGrace, mdSimple];

/** 全部主题，顺序即主题菜单顺序 */
export const THEMES: readonly Theme[] = [...BASE_THEMES, ...MD_THEMES];

/** 三套字体栈：主题里选字体、以及校验脚本都用它 */
export const THEME_FONTS = { sans: FONT_SANS, serif: FONT_SERIF, mono: FONT_MONO };

export { Theme } from './theme';
export type { ThemeSpec } from './theme';
