import type { RefObject } from 'react';
import { FONT_FAMILIES, ZOOM_LEVELS } from '../../lib/constants';
import { isHexColor } from '../../lib/recolor';
import { useTypographyStore } from '../../lib/store';
import type { Theme } from '../../lib/themes';
import { useMermaidHydration } from '../../lib/useMermaidHydration';

interface PreviewPanelProps {
  theme: Theme;
  html: string;
  hasContent: boolean;
  scrollerRef: RefObject<HTMLDivElement | null>;
  articleRef: RefObject<HTMLDivElement | null>;
}

/**
 * 右栏：铺满高度的预览区（灰底 + 居中白纸），没有卡片外壳。
 *
 * 主题、字体、字号、缩放都在顶部 WorkbenchBar，这里只读 store 里的值用于渲染与图表配色。
 */
export default function PreviewPanel({ theme, html, hasContent, scrollerRef, articleRef }: PreviewPanelProps) {
  const zoom = useTypographyStore((state) => state.previewZoom);
  const activeZoom = ZOOM_LEVELS.includes(zoom) ? zoom : 1;
  const fontFamilyId = useTypographyStore((state) => state.fontFamilyId);
  const mainColor = useTypographyStore((state) => state.mainColor);

  const fontPreset = FONT_FAMILIES.find((font) => font.id === fontFamilyId);
  // 图表配色跟随主色与正文字体：预览里看到的图，复制出去也是同一套
  useMermaidHydration(articleRef, {
    accent: isHexColor(mainColor) ? mainColor : theme.accent,
    fontFamily: fontPreset?.stack ?? '',
    revision: html,
  });

  return (
    <div className="flex h-[70vh] min-h-0 flex-col bg-zinc-100/70 lg:h-auto lg:flex-1">
      <div ref={scrollerRef} className="thin-scrollbar min-h-0 flex-1 overflow-y-auto p-3 sm:p-5">
        <div
          className="mx-auto min-h-full max-w-[420px] rounded-lg bg-white px-4 py-5 shadow-sm"
          style={{ zoom: activeZoom }}
        >
          {hasContent ? (
            <div ref={articleRef} dangerouslySetInnerHTML={{ __html: html }} />
          ) : (
            <div className="py-24 text-center text-sm text-zinc-300">左边写点什么，这里实时显示排版效果</div>
          )}
        </div>
      </div>
    </div>
  );
}
