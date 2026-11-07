import { ArrowUp, Loader2 } from 'lucide-react';
import { useState } from 'react';
import type { RefObject } from 'react';
import { FONT_FAMILIES, ZOOM_LEVELS } from '../../lib/constants';
import { themeBodyFont, themeFontId } from '../../lib/themes/fonts';
import { isHexColor } from '../../lib/recolor';
import { useTypographyStore } from '../../lib/store';
import type { Theme } from '../../lib/themes';
import { useMermaidHydration } from '../../lib/useMermaidHydration';
import { useMathHydration } from '../../lib/useMathHydration';

interface PreviewPanelProps {
  theme: Theme;
  html: string;
  hasContent: boolean;
  scrollerRef: RefObject<HTMLDivElement | null>;
  /** 滚动时通知外层做预览区 → 编辑区同步 */
  onScroll?: () => void;
  articleRef: RefObject<HTMLDivElement | null>;
  /** 复制进行中：盖一层遮罩，避免用户以为没反应 */
  copying: boolean;
}

/**
 * 右栏：铺满高度的预览区（白底，与左半边编辑区同色 + 居中文章纸），没有卡片外壳。
 *
 * 文章纸默认按手机宽度（375px）排版、带左右细边与投影，底部可切桌面宽度；
 * 主题、字体、字号、缩放都在顶部 WorkbenchBar，这里只读 store 里的值用于渲染与图表配色。
 */
export default function PreviewPanel({
  theme,
  html,
  hasContent,
  scrollerRef,
  onScroll,
  articleRef,
  copying,
}: PreviewPanelProps) {
  const zoom = useTypographyStore((state) => state.previewZoom);
  const activeZoom = ZOOM_LEVELS.includes(zoom) ? zoom : 1;
  const fontFamilyId = useTypographyStore((state) => state.fontFamilyId);
  const mainColor = useTypographyStore((state) => state.mainColor);
  const previewDevice = useTypographyStore((state) => state.previewDevice);

  const [scrolled, setScrolled] = useState(false);

  const effectiveFontId = fontFamilyId === 'theme' ? themeFontId(theme.styles.wrapper) : fontFamilyId;
  const fontPreset = FONT_FAMILIES.find((font) => font.id === effectiveFontId);
  const bodyFontStack = fontPreset?.stack || themeBodyFont(theme.styles.wrapper);
  // 图表配色跟随主色与正文字体：预览里看到的图，复制出去也是同一套
  useMermaidHydration(articleRef, {
    accent: isHexColor(mainColor) ? mainColor : theme.accent,
    fontFamily: bodyFontStack,
    revision: html,
  });
  // 公式同理：占位落盘后编译成内联 SVG（MathJax 首次出现公式时才加载）
  useMathHydration(articleRef, { revision: html });

  // 文章纸固定宽度（手机 375 / 桌面 680），居中 + 左右对称阴影，窗外露出的就是预览区底色
  const paperWidth = previewDevice === 'mobile' ? 'w-[375px]' : 'w-[680px]';

  return (
    <div className="relative flex min-h-0 flex-1 flex-col bg-white">
      {/*
        滚动区上下不留白：文章纸 min-h-full 已经铺满可视高度，纵向再垫内距会让它超出、
        凭空多出一截空滚；左右仍留白，纸的细边和投影才有落处。
      */}
      <div
        ref={scrollerRef}
        onScroll={(event) => {
          const next = event.currentTarget.scrollTop > 240;
          if (next !== scrolled) setScrolled(next);
          onScroll?.();
        }}
        data-preview-scroll
        className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-3 sm:px-5"
      >
        <div
          className={`relative mx-auto min-h-full max-w-full ${paperWidth} border-x border-zinc-200 bg-white px-4 py-5 shadow-[0_0_28px_rgba(24,24,27,0.10)]`}
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
