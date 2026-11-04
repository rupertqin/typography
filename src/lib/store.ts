import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { SAMPLE_MARKDOWN } from './sample';

export interface TypesetState {
  markdown: string;
  themeId: string;
  articleType: string;
  previewZoom: number;
  mainColor: string;
  partColors: Record<string, string>;
  setMarkdown: (markdown: string) => void;
  setThemeId: (themeId: string) => void;
  setArticleType: (articleType: string) => void;
  setPreviewZoom: (previewZoom: number) => void;
  setMainColor: (mainColor: string) => void;
  setPartColor: (part: string, color: string) => void;
  resetColors: () => void;
}

/** storage key 与原站一致，方便直接对照 localStorage 内容 */
export const useTypesetStore = create<TypesetState>()(
  persist(
    (set) => ({
      markdown: SAMPLE_MARKDOWN,
      themeId: 'orange',
      articleType: 'all',
      previewZoom: 1,
      mainColor: '',
      partColors: {},
      setMarkdown: (markdown) => set({ markdown }),
      setThemeId: (themeId) => set({ themeId }),
      setArticleType: (articleType) => set({ articleType }),
      setPreviewZoom: (previewZoom) => set({ previewZoom }),
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
    { name: 'zhaotab-typeset' },
  ),
);
