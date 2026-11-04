import type { RefObject } from 'react';
import { Eye } from 'lucide-react';
import { ZOOM_LEVELS } from '../../lib/constants';
import { useTypesetStore } from '../../lib/store';
import type { Theme } from '../../lib/types';
import ToolPanel from '../shell/ToolPanel';
import ThemePicker from '../theme/ThemePicker';

interface PreviewPanelProps {
  theme: Theme;
  html: string;
  hasContent: boolean;
  isMobile: boolean;
  scrollerRef: RefObject<HTMLDivElement | null>;
  articleRef: RefObject<HTMLDivElement | null>;
}

export default function PreviewPanel({
  theme,
  html,
  hasContent,
  isMobile,
  scrollerRef,
  articleRef,
}: PreviewPanelProps) {
  const zoom = useTypesetStore((state) => state.previewZoom);
  const setZoom = useTypesetStore((state) => state.setPreviewZoom);
  const activeZoom = ZOOM_LEVELS.includes(zoom) ? zoom : 1;

  return (
    <ToolPanel
      fill
      title="预览"
      icon={Eye}
      className="h-[70vh] lg:h-auto"
      bodyClassName="flex flex-col gap-2.5 p-3 pt-3"
      extra={!isMobile && <ThemePicker theme={theme} inHeader />}
    >
      {isMobile && <ThemePicker theme={theme} />}

      <div
        ref={scrollerRef}
        className="thin-scrollbar min-h-0 flex-1 overflow-y-auto rounded-xl bg-zinc-100/80 p-3 ring-1 ring-inset ring-zinc-200 sm:p-5"
      >
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

      <div className="flex shrink-0 items-center justify-between gap-3 px-1 text-[11px] text-zinc-400">
        <span className="truncate">复制后打开公众号后台「新的创作 → 写新图文」，在正文里粘贴</span>
        <div
          className="flex shrink-0 items-center gap-0.5 rounded-md bg-zinc-100 p-0.5"
          title="缩小预览，一屏看整篇结构"
        >
          {ZOOM_LEVELS.map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => setZoom(level)}
              aria-pressed={level === activeZoom}
              className={`rounded px-1.5 py-0.5 tabular-nums transition-all ${
                level === activeZoom
                  ? 'bg-white font-medium text-emerald-700 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              {level * 100}%
            </button>
          ))}
        </div>
      </div>
    </ToolPanel>
  );
}
