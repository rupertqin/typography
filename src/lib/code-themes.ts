import { CODE_THEMES, CODE_THEMES_BY_ID } from './code-themes.generated.js';
import type { CodeThemeOption, Theme } from './types';

/** 代码配色 = 跟随文章主题时用主题自带的 hljs 调色板 */
export const FOLLOW_THEME_CODE = 'theme';

// 生成文件的每个对象 shape 都不同（不同配色的 token 数量不一样），先抹平再按统一类型使用
const ALL = CODE_THEMES as unknown as CodeThemeOption[];

export const CODE_THEME_LIST = ALL;

/** 下拉分组用：亮色一套、暗色一套，选之前就能判断观感 */
export const CODE_THEME_GROUPS = {
  light: ALL.filter((theme) => !theme.dark),
  dark: ALL.filter((theme) => theme.dark),
};

export function findCodeTheme(id: string | undefined): CodeThemeOption | undefined {
  if (!id || id === FOLLOW_THEME_CODE) return undefined;
  return (CODE_THEMES_BY_ID as unknown as Record<string, CodeThemeOption | undefined>)[id];
}

export interface ResolvedCodeTheme {
  /** token（不含 hljs- 前缀）→ 内联声明 */
  tokens: Record<string, string>;
  foreground: string;
  background: string;
}

/**
 * 选中的代码配色 → 实际要写进内联样式的调色板。
 * 返回 null 表示「跟随主题」：沿用 theme.hljs，也不改写 pre 的底色。
 */
export function resolveCodeTheme(id: string | undefined, theme: Theme): ResolvedCodeTheme | null {
  const picked = findCodeTheme(id);
  if (!picked) return null;
  return { tokens: picked.tokens, foreground: picked.foreground, background: picked.background };
}

/** 换文章主题时，主题自带代码块底色可能和选中的代码配色打架，用它的前景/底色兜住 */
export function codeThemeSwatch(id: string | undefined): { background: string; colors: string[] } {
  const picked = findCodeTheme(id);
  if (!picked) return { background: '', colors: [] };
  const colors = ['keyword', 'string', 'comment', 'number', 'title']
    .map((token) => picked.tokens[token])
    .filter(Boolean)
    .map((style) => /color:\s*([^;]+)/.exec(style)?.[1]?.trim() ?? '');
  return { background: picked.background, colors: colors.filter(Boolean) as string[] };
}
