import type { RefObject } from 'react';
import { Eye } from 'lucide-react';
import { FONT_FAMILIES, FONT_SCALES, ZOOM_LEVELS } from '../../lib/constants';
import { useTypesetStore } from '../../lib/store';
import type { Theme } from '../../lib/types';
import ToolPanel from '../shell/ToolPanel';
import ThemePicker from '../theme/ThemePicker';

const SEGMENTED_BUTTON = 'rounded px-1.5 py-0.5 tabular-nums transition-all';
const SEGMENTED_ACTIVE = 'bg-white font-medium text-emerald-700 shadow-sm';
const SEGMENTED_IDLE = 'text-zinc-500 hover:text-zinc-800';

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
  const fontScale = useTypesetStore((state) => state.fontScale);
  const setFontScale = useTypesetStore((state) => state.setFontScale);
  const fontFamilyId = useTypesetStore((state) => state.fontFamilyId);
  const setFontFamilyId = useTypesetStore((state) => state.setFontFamilyId);
  const baseFonts = FONT_FAMILIES.filter((font) => !font.iosOnly);
  const iosFonts = FONT_FAMILIES.filter((font) => font.iosOnly);

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
        <span className="hidden truncate sm:inline">复制后打开公众号后台「新的创作 → 写新图文」，在正文里粘贴</span>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <label
            className="flex shrink-0 items-center gap-1 rounded-md bg-zinc-100 px-1.5 py-0.5"
            title="正文字体：公众号只认读者设备自带的字体，选不到会回退系统默认"
          >
            <span className="hidden sm:inline">字体</span>
            <select
              value={fontFamilyId}
              onChange={(event) => setFontFamilyId(event.target.value)}
              aria-label="正文字体"
              className="cursor-pointer bg-transparent py-0 pr-0.5 text-[11px] text-zinc-600 focus:outline-none"
            >
              {baseFonts.map((font) => (
                <option key={font.id} value={font.id}>
                  {font.label}
                </option>
              ))}
              <optgroup label="苹果系统字体（安卓回退默认）">
                {iosFonts.map((font) => (
                  <option key={font.id} value={font.id}>
                    {font.label}（限 iOS）
                  </option>
                ))}
              </optgroup>
            </select>
          </label>
          <div
            className="flex shrink-0 items-center gap-0.5 rounded-md bg-zinc-100 p-0.5"
            title="整体字号，复制到公众号后同样生效"
          >
            <span className="hidden pl-1 pr-0.5 sm:inline">字号</span>
            {FONT_SCALES.map((scale) => (
              <button
                key={scale.value}
                type="button"
                onClick={() => setFontScale(scale.value)}
                aria-pressed={scale.value === fontScale}
                aria-label={`整体字号${scale.label}`}
                className={`${SEGMENTED_BUTTON} ${scale.value === fontScale ? SEGMENTED_ACTIVE : SEGMENTED_IDLE}`}
              >
                {scale.label}
              </button>
            ))}
          </div>
          <div
            className="flex shrink-0 items-center gap-0.5 rounded-md bg-zinc-100 p-0.5"
            title="缩小预览，一屏看整篇结构（不影响复制结果）"
          >
            {ZOOM_LEVELS.map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => setZoom(level)}
                aria-pressed={level === activeZoom}
                className={`${SEGMENTED_BUTTON} ${level === activeZoom ? SEGMENTED_ACTIVE : SEGMENTED_IDLE}`}
              >
                {level * 100}%
              </button>
            ))}
          </div>
        </div>
      </div>
    </ToolPanel>
  );
}
