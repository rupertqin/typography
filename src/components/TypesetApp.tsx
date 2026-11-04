import { useDeferredValue, useMemo, useRef, useState } from 'react';
import { Check, Copy, Newspaper } from 'lucide-react';
import EditorPanel from './editor/EditorPanel';
import PreviewPanel from './preview/PreviewPanel';
import ToolShell from './shell/ToolShell';
import { copyRichText } from '../lib/clipboard';
import { FONT_FAMILIES } from '../lib/constants';
import { renderMarkdown } from '../lib/render';
import { useTypesetStore } from '../lib/store';
import { THEMES } from '../lib/themes.generated.js';
import type { Theme } from '../lib/types';
import { useIsMobile } from '../lib/useIsMobile';

const ALL_THEMES = THEMES as Theme[];

type CopyStatus = 'idle' | 'ok' | 'fail';

export default function TypesetApp() {
  const markdown = useTypesetStore((state) => state.markdown);
  const themeId = useTypesetStore((state) => state.themeId);
  const mainColor = useTypesetStore((state) => state.mainColor);
  const partColors = useTypesetStore((state) => state.partColors);
  const fontScale = useTypesetStore((state) => state.fontScale);
  const fontFamilyId = useTypesetStore((state) => state.fontFamilyId);

  const isMobile = useIsMobile();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const articleRef = useRef<HTMLDivElement>(null);
  const statusTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [status, setStatus] = useState<CopyStatus>('idle');

  const theme = ALL_THEMES.find((item) => item.id === themeId) ?? ALL_THEMES[0];
  const fontPreset = FONT_FAMILIES.find((item) => item.id === fontFamilyId);
  const deferredMarkdown = useDeferredValue(markdown);
  const html = useMemo(
    () =>
      renderMarkdown(deferredMarkdown, theme, {
        colors: { main: mainColor, parts: partColors },
        fontScale,
        fontFamily: fontPreset?.stack ?? '',
        fontWeight: fontPreset?.weight,
      }),
    [deferredMarkdown, theme, mainColor, partColors, fontScale, fontPreset],
  );

  const handleCopy = async () => {
    const plain = articleRef.current?.innerText ?? markdown;
    const ok = await copyRichText(html, plain);
    setStatus(ok ? 'ok' : 'fail');
    clearTimeout(statusTimer.current);
    statusTimer.current = setTimeout(() => setStatus('idle'), 2500);
  };

  const label = status === 'ok' ? '已复制，去公众号粘贴' : status === 'fail' ? '复制失败，请重试' : '复制到公众号';
  const Icon = status === 'ok' ? Check : Copy;

  return (
    <div className="flex flex-col lg:h-full">
      <ToolShell
        icon={Newspaper}
        title="公众号排版"
        description="写 Markdown，一键复制带样式的正文，粘贴到公众号后台即可。"
        actions={
          <button
            type="button"
            onClick={handleCopy}
            disabled={!markdown.trim()}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-3.5 py-2 text-xs font-semibold text-white shadow-lg shadow-emerald-500/30 transition-all duration-200 hover:-translate-y-0.5 hover:from-emerald-600 hover:to-teal-700 active:translate-y-0 disabled:translate-y-0 disabled:cursor-not-allowed disabled:from-zinc-100 disabled:to-zinc-100 disabled:text-zinc-300 disabled:shadow-none"
          >
            <Icon size={14} />
            {label}
          </button>
        }
      >
        <div className="grid grid-cols-1 gap-5 lg:min-h-0 lg:flex-1 lg:grid-cols-2">
          <EditorPanel previewRef={scrollerRef} isMobile={isMobile} />
          <PreviewPanel
            theme={theme}
            html={html}
            hasContent={Boolean(deferredMarkdown.trim())}
            isMobile={isMobile}
            scrollerRef={scrollerRef}
            articleRef={articleRef}
          />
        </div>
      </ToolShell>
    </div>
  );
}
