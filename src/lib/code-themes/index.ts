/**
 * 代码块配色模块的对外入口。
 *
 * 数据在 ./catalog.ts（82 套，一段一套），类与校验在 ./theme.ts，
 * 这里把数据实例化成 CodeTheme 并给出查表 / 分组的便捷函数。
 * 顺序 = 选择菜单顺序；新增配色只需往 catalog.ts 里加一段。
 */
import { CATALOG, HLJS_VERSION } from './catalog';
import { CodeTheme } from './theme';
import type { CodePalette, CodeThemeSpec } from './theme';

/** 代码配色 = 跟随文章主题时用主题自带的 hljs 调色板 */
export const FOLLOW_THEME_CODE = 'theme';

/** 全部配色（顺序即菜单顺序） */
export const CODE_THEMES: readonly CodeTheme[] = CATALOG.map((spec) => new CodeTheme(spec));

/** 兼容旧名字：冒烟脚本与下拉都按列表读 */
export const CODE_THEME_LIST = CODE_THEMES;

export const CODE_THEMES_BY_ID: Readonly<Record<string, CodeTheme>> = Object.freeze(
  Object.fromEntries(CODE_THEMES.map((theme) => [theme.id, theme])),
);

/** 下拉分组用：亮色一套、暗色一套，选之前就能判断观感 */
export const CODE_THEME_GROUPS = {
  light: CODE_THEMES.filter((theme) => !theme.dark),
  dark: CODE_THEMES.filter((theme) => theme.dark),
};

/**
 * catalog 里没有这几个 scope（highlight.js 偶尔仍会吐出这些 class）：
 * 从同一套里语义最近的 token 借色，保证换配色后这些词法不丢色。
 * 只在源 token 存在时补，不引入任何新色值。
 */
export const TOKEN_ALIASES: Readonly<Record<string, string>> = Object.freeze({
  tag: 'name',
  property: 'name',
  class: 'built_in',
});

/** 给一套调色板补齐别名 scope（主题内置表与 82 套共用这一条路径） */
export function withTokenAliases(tokens: Readonly<Record<string, string>>): Record<string, string> {
  const out: Record<string, string> = { ...tokens };
  for (const [target, source] of Object.entries(TOKEN_ALIASES)) {
    if (!out[target] && tokens[source]) out[target] = tokens[source];
  }
  return out;
}

export function findCodeTheme(id: string | undefined): CodeTheme | undefined {
  if (!id || id === FOLLOW_THEME_CODE) return undefined;
  return CODE_THEMES_BY_ID[id];
}

/**
 * 选中的代码配色 → 实际要写进内联样式的调色板。
 * 返回 null 表示「跟随主题」：沿用 theme.hljs，也不改写 pre 的底色。
 */
export function resolveCodeTheme(id: string | undefined): CodePalette | null {
  const picked = findCodeTheme(id);
  return picked ? { ...picked.palette(), tokens: withTokenAliases(picked.tokens) } : null;
}

/** 预览色条：选中配色的底色与关键 token 颜色（跟随主题时返回空，由调用方回退到主题） */
export function codeThemeSwatch(id: string | undefined): { background: string; colors: string[] } {
  const picked = findCodeTheme(id);
  return picked ? picked.swatch() : { background: '', colors: [] };
}

export { CodeTheme, HLJS_VERSION };
export type { CodePalette, CodeThemeSpec };
