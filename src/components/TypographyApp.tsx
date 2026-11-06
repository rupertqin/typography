import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { Check, Copy, Newspaper } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import EditorPanel from './editor/EditorPanel';
import PreviewPanel from './preview/PreviewPanel';
import ToolShell from './shell/ToolShell';
import { copyRichText } from '../lib/clipboard';
import { buildCopyBundleWhenReady } from '../lib/copy-html';
import { FONT_FAMILIES } from '../lib/constants';
import { collectCodeLanguages, ensureLanguage, isLanguageReady } from '../lib/hljs-languages';
import { isHexColor } from '../lib/recolor';
import { renderMarkdown } from '../lib/render';
import { selectThemeParams, useTypographyStore } from '../lib/store';
import { THEMES } from '../lib/themes.generated.js';
import type { Theme } from '../lib/types';
import { useIsMobile } from '../lib/useIsMobile';

const ALL_THEMES = THEMES as Theme[];

type CopyStatus = 'idle' | 'ok' | 'fail' | 'waiting';

export default function TypographyApp() {
  const markdown = useTypographyStore((state) => state.markdown);
  const themeId = useTypographyStore((state) => state.themeId);
  const mainColor = useTypographyStore((state) => state.mainColor);
  const partColors = useTypographyStore((state) => state.partColors);
  const fontScale = useTypographyStore((state) => state.fontScale);
  const fontFamilyId = useTypographyStore((state) => state.fontFamilyId);

  const isMobile = useIsMobile();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const articleRef = useRef<HTMLDivElement>(null);
  const statusTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [status, setStatus] = useState<CopyStatus>('idle');

  const theme = ALL_THEMES.find((item) => item.id === themeId) ?? ALL_THEMES[0];
  const fontPreset = FONT_FAMILIES.find((item) => item.id === fontFamilyId);
  const deferredMarkdown = useDeferredValue(markdown);
  // selectThemeParams 每次都会返回新对象，必须用浅比较包一层，否则 zustand v5 会无限重渲染
  const params = useTypographyStore(useShallow(selectThemeParams));
  const codeThemeId = useTypographyStore((state) => state.codeThemeId);

  // 渲染是同步的：语法没就绪时那次渲染会把代码块降级成纯文本，
  // 所以先把本文用到的语言加载完，再触发一次重渲染。
  const codeLanguages = useMemo(() => collectCodeLanguages(deferredMarkdown), [deferredMarkdown]);
  const languageKey = codeLanguages.join(',');
  const [languageTick, setLanguageTick] = useState(0);

  useEffect(() => {
    const missing = codeLanguages.filter((language) => !isLanguageReady(language));
    if (missing.length === 0) return;
    let cancelled = false;
    Promise.all(missing.map((language) => ensureLanguage(language))).then(() => {
      if (!cancelled) setLanguageTick((tick) => tick + 1);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [languageKey]);

  const html = useMemo(
    () =>
      renderMarkdown(deferredMarkdown, theme, {
        colors: { main: mainColor, parts: partColors },
        fontScale,
        fontFamily: fontPreset?.stack ?? '',
        fontWeight: fontPreset?.weight,
        params,
        codeTheme: codeThemeId,
      }),
    // languageTick 只用来在语法加载完成后重算
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [deferredMarkdown, theme, mainColor, partColors, fontScale, fontPreset, params, codeThemeId, languageTick],
  );

  const handleCopy = async () => {
    const root = articleRef.current;
    if (root) setStatus('waiting');

    // 有图表时必须从活 DOM 克隆（SVG 只存在于 DOM 里），否则退回字符串
    const bundle = await buildCopyBundleWhenReady(root, { html, text: markdown, diagrams: 0, dropped: 0 });
    const ok = await copyRichText(bundle.html, bundle.text || markdown);

    setStatus(ok ? 'ok' : 'fail');
    clearTimeout(statusTimer.current);
    statusTimer.current = setTimeout(() => setStatus('idle'), 2500);
  };

  const label =
    status === 'ok'
      ? '已复制，去公众号粘贴'
      : status === 'fail'
        ? '复制失败，请重试'
        : status === 'waiting'
          ? '图表渲染中…'
          : '复制到公众号';
  const Icon = status === 'ok' ? Check : Copy;

  return (
    <div className="flex flex-col lg:h-full">
      <ToolShell
        icon={Newspaper}
        title="公众号排版风格"
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
          <EditorPanel
            previewRef={scrollerRef}
            isMobile={isMobile}
            accent={isHexColor(mainColor) ? mainColor : theme.accent}
          />
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
