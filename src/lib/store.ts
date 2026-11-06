import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_THEME_PARAMS } from './types';
import type { HeadingLevels, HeadingStyleType, ThemeParams } from './types';
import { FOLLOW_THEME_CODE } from './code-themes';
import { SAMPLE_MARKDOWN } from './sample';

export interface TypographyState {
  markdown: string;
  themeId: string;
  articleType: string;
  previewZoom: number;
  fontScale: number;
  fontFamilyId: string;
  mainColor: string;
  partColors: Record<string, string>;
  /** 代码配色 id；'theme' = 沿用文章主题自带的代码调色板 */
  codeThemeId: string;
  /** 版式参数：默认值一律「不生效」，不调参数时输出与改造前一致 */
  lineHeight: ThemeParams['lineHeight'];
  blockSpacing: number;
  blockquoteBackground: string;
  headingStyles: Partial<Record<HeadingLevels, HeadingStyleType>>;
  setMarkdown: (markdown: string) => void;
  setThemeId: (themeId: string) => void;
  setArticleType: (articleType: string) => void;
  setPreviewZoom: (previewZoom: number) => void;
  setFontScale: (fontScale: number) => void;
  setFontFamilyId: (fontFamilyId: string) => void;
  setMainColor: (mainColor: string) => void;
  setPartColor: (part: string, color: string) => void;
  resetColors: () => void;
  setCodeThemeId: (codeThemeId: string) => void;
  setLineHeight: (lineHeight: ThemeParams['lineHeight']) => void;
  setBlockSpacing: (blockSpacing: number) => void;
  setBlockquoteBackground: (background: string) => void;
  setHeadingStyle: (level: HeadingLevels, style: HeadingStyleType) => void;
  resetParams: () => void;
}

/** 草稿持久化 key（localStorage） */
export const useTypographyStore = create<TypographyState>()(
  persist(
    (set) => ({
      markdown: SAMPLE_MARKDOWN,
      themeId: 'orange',
      articleType: 'all',
      previewZoom: 1,
      fontScale: 1,
      fontFamilyId: 'theme',
      mainColor: '',
      partColors: {},
      codeThemeId: FOLLOW_THEME_CODE,
      lineHeight: DEFAULT_THEME_PARAMS.lineHeight,
      blockSpacing: DEFAULT_THEME_PARAMS.blockSpacing,
      blockquoteBackground: DEFAULT_THEME_PARAMS.blockquoteBackground,
      headingStyles: { ...DEFAULT_THEME_PARAMS.headingStyles },
      setMarkdown: (markdown) => set({ markdown }),
      setThemeId: (themeId) => set({ themeId }),
      setArticleType: (articleType) => set({ articleType }),
      setPreviewZoom: (previewZoom) => set({ previewZoom }),
      setFontScale: (fontScale) => set({ fontScale }),
      setFontFamilyId: (fontFamilyId) => set({ fontFamilyId }),
      setMainColor: (mainColor) => set({ mainColor }),
      setPartColor: (part, color) =>
        set((state) => {
          const next = { ...state.partColors };
          if (color) next[part] = color;
          else delete next[part];
          return { partColors: next };
        }),
      resetColors: () => set({ mainColor: '', partColors: {} }),
      setCodeThemeId: (codeThemeId) => set({ codeThemeId }),
      setLineHeight: (lineHeight) => set({ lineHeight }),
      setBlockSpacing: (blockSpacing) => set({ blockSpacing }),
      setBlockquoteBackground: (blockquoteBackground) => set({ blockquoteBackground }),
      setHeadingStyle: (level, style) =>
        set((state) => {
          const next = { ...state.headingStyles };
          if (style === 'default') delete next[level];
          else next[level] = style;
          return { headingStyles: next };
        }),
      resetParams: () =>
        set({
          lineHeight: DEFAULT_THEME_PARAMS.lineHeight,
          blockSpacing: DEFAULT_THEME_PARAMS.blockSpacing,
          blockquoteBackground: DEFAULT_THEME_PARAMS.blockquoteBackground,
          headingStyles: { ...DEFAULT_THEME_PARAMS.headingStyles },
        }),
    }),
    { name: 'typography' },
  ),
);

/** 把散落的字段收成渲染用的参数对象（默认值 → 等同于不传） */
export function selectThemeParams(state: TypographyState): ThemeParams {
  return {
    lineHeight: state.lineHeight ?? DEFAULT_THEME_PARAMS.lineHeight,
    blockSpacing: state.blockSpacing ?? DEFAULT_THEME_PARAMS.blockSpacing,
    blockquoteBackground: state.blockquoteBackground ?? DEFAULT_THEME_PARAMS.blockquoteBackground,
    headingStyles: state.headingStyles ?? DEFAULT_THEME_PARAMS.headingStyles,
  };
}
