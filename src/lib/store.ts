import { create } from 'zustand';
import { persist } from 'zustand/middleware';
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
  setMarkdown: (markdown: string) => void;
  setThemeId: (themeId: string) => void;
  setArticleType: (articleType: string) => void;
  setPreviewZoom: (previewZoom: number) => void;
  setFontScale: (fontScale: number) => void;
  setFontFamilyId: (fontFamilyId: string) => void;
  setMainColor: (mainColor: string) => void;
  setPartColor: (part: string, color: string) => void;
  resetColors: () => void;
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
    }),
    { name: 'typography' },
  ),
);
