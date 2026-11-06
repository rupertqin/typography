export interface ThemeStyles {
  [key: string]: string;
}

export interface ThemeCardDecor {
  withHeading?: boolean;
  skipLead?: boolean;
  style?: string;
  start?: string;
  end?: string;
  line?: string;
}

export interface ThemeDecor {
  h1?: (html: string) => string;
  h2?: (html: string, index: number) => string;
  h3?: (html: string) => string;
  ulMark?: string | ((n: number) => string);
  olMark?: string | ((n: number) => string);
  hr?: string;
  quoteMark?: string;
  card?: ThemeCardDecor;
  [key: string]: unknown;
}

export interface Theme {
  id: string;
  name: string;
  accent: string;
  tags: string[];
  font?: string;
  page?: string;
  code?: 'light' | 'dark';
  styles: ThemeStyles;
  decor: ThemeDecor;
  hljs: Record<string, string>;
}

export interface ColorOverrides {
  main: string;
  parts: Record<string, string>;
}

/** 一套代码配色（构建期从 highlight.js/styles 抽出，见 scripts/generate-code-themes.mjs） */
export interface CodeThemeOption {
  id: string;
  label: string;
  dark: boolean;
  foreground: string;
  background: string;
  /** token 名（不含 hljs- 前缀）→ 内联声明，如 { keyword: 'color:#a6262a;' } */
  tokens: Record<string, string>;
}

export type HeadingStyleType = 'default' | 'color-only' | 'border-bottom' | 'border-left';

export type HeadingLevels = 'h1' | 'h2' | 'h3';

/**
 * 版式参数：全部叠加在 35 套主题之上，默认值一律「不生效」，
 * 因此不调参数时的输出与改造前逐字节一致。
 */
export interface ThemeParams {
  /** 'theme' = 沿用主题自带行高；数字为 unitless 行高 */
  lineHeight: 'theme' | number;
  /** 段间距倍数，1 表示不改写 */
  blockSpacing: number;
  /** '' = 跟随主题；'transparent' 或具体色值 = 覆盖引用块底色 */
  blockquoteBackground: string;
  headingStyles: Partial<Record<HeadingLevels, HeadingStyleType>>;
}

export const DEFAULT_THEME_PARAMS: ThemeParams = {
  lineHeight: 'theme',
  blockSpacing: 1,
  blockquoteBackground: '',
  headingStyles: {},
};

export function hasThemeParams(params: ThemeParams | undefined): boolean {
  if (!params) return false;
  if (params.lineHeight !== 'theme') return true;
  if (params.blockSpacing !== 1) return true;
  if (params.blockquoteBackground) return true;
  return Object.values(params.headingStyles).some((style) => style && style !== 'default');
}

export interface ColorPreset {
  color: string;
  name: string;
}

export interface ArticleType {
  id: string;
  name: string;
}
