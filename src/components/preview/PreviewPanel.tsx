import { ArrowUp, Loader2 } from 'lucide-react';
import { useState } from 'react';
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
  /** 复制进行中：盖一层遮罩，避免用户以为没反应 */
  copying: boolean;
}

/**
 * 右栏：铺满高度的预览区（灰底 + 居中文章纸），没有卡片外壳。
 *
 * 文章纸默认按手机宽度（375px）排版、带左右细边与投影，底部可切桌面宽度；
 * 主题、字体、字号、缩放都在顶部 WorkbenchBar，这里只读 store 里的值用于渲染与图表配色。
 */
export default function PreviewPanel({
  theme,
  html,
  hasContent,
  scrollerRef,
  articleRef,
  copying,
}: PreviewPanelProps) {
  const zoom = useTypographyStore((state) => state.previewZoom);
  const activeZoom = ZOOM_LEVELS.includes(zoom) ? zoom : 1;
  const fontFamilyId = useTypographyStore((state) => state.fontFamilyId);
  const mainColor = useTypographyStore((state) => state.mainColor);
  const previewDevice = useTypographyStore((state) => state.previewDevice);

  const [scrolled, setScrolled] = useState(false);

  const fontPreset = FONT_FAMILIES.find((font) => font.id === fontFamilyId);
  // 图表配色跟随主色与正文字体：预览里看到的图，复制出去也是同一套
  useMermaidHydration(articleRef, {
    accent: isHexColor(mainColor) ? mainColor : theme.accent,
    fontFamily: fontPreset?.stack ?? '',
    revision: html,
  });

  const paperWidth = previewDevice === 'mobile' ? 'w-[375px] max-w-full' : 'w-full max-w-[680px]';

  return (
    <div className="relative flex min-h-0 flex-1 flex-col bg-zinc-50">
      <div
        ref={scrollerRef}
        onScroll={(event) => {
          const next = event.currentTarget.scrollTop > 240;
          if (next !== scrolled) setScrolled(next);
        }}
        className="thin-scrollbar min-h-0 flex-1 overflow-y-auto p-3 sm:p-5"
      >
        <div
          className={`relative mx-auto min-h-full ${paperWidth} border-x border-zinc-200 bg-white px-4 py-5 shadow-xl shadow-zinc-900/5`}
          style={{ zoom: activeZoom }}
        >
          {hasContent ? (
            <div ref={articleRef} dangerouslySetInnerHTML={{ __html: html }} />
          ) : (
            <div className="py-24 text-center text-sm text-zinc-300">左边写点什么，这里实时显示排版效果</div>
          )}

          {copying && (
            <div className="absolute inset-0 z-10 flex items-start justify-center bg-white/70 pt-24 backdrop-blur-[1px]">
              <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs text-zinc-500 shadow-md">
                <Loader2 size={13} className="animate-spin" />
                正在准备复制…
              </span>
            </div>
          )}
        </div>
      </div>

      {scrolled && (
        <button
          type="button"
          onClick={() => scrollerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
          title="回到顶部"
          aria-label="回到顶部"
          className="absolute bottom-6 right-6 z-20 flex h-8 w-8 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-500 shadow-md transition-colors hover:text-zinc-900"
        >
          <ArrowUp size={14} />
        </button>
      )}
    </div>
  );
}
