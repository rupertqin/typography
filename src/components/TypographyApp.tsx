import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { Check, Copy, Newspaper } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import EditorPanel from './editor/EditorPanel';
import PreviewPanel from './preview/PreviewPanel';
import AppHeader from './shell/AppHeader';
import SplitPane from './shell/SplitPane';
import StatusBar from './shell/StatusBar';
import StylePanel from './shell/StylePanel';
import WorkbenchBar from './shell/WorkbenchBar';
import { copyRichText } from '../lib/clipboard';
import { buildCopyBundleWhenReady } from '../lib/copy-html';
import { FONT_FAMILIES } from '../lib/constants';
import { collectCodeLanguages, ensureLanguage, isLanguageReady } from '../lib/hljs-languages';
import { isHexColor, resolveStrongColor } from '../lib/recolor';
import { renderMarkdown } from '../lib/render';
import { previewBodyFontPx } from '../lib/render-helpers';
import { selectThemeParams, useTypographyStore } from '../lib/store';
import { THEMES } from '../lib/themes';
import { themeBodyFont, themeFontId } from '../lib/themes/fonts';
import { useEditorController } from '../lib/useEditorController';
import { useScrollSync } from '../lib/useScrollSync';
import { useIsMobile } from '../lib/useIsMobile';

const ALL_THEMES = THEMES;

type CopyStatus = 'idle' | 'ok' | 'fail' | 'waiting';

export default function TypographyApp() {
  const markdown = useTypographyStore((state) => state.markdown);
  const themeId = useTypographyStore((state) => state.themeId);
  const mainColor = useTypographyStore((state) => state.mainColor);
  const partColors = useTypographyStore((state) => state.partColors);
  const fontScale = useTypographyStore((state) => state.fontScale);
  const fontFamilyId = useTypographyStore((state) => state.fontFamilyId);

  const isMobile = useIsMobile();
  const scrollSync = useTypographyStore((state) => state.scrollSync);
  const editor = useEditorController();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const articleRef = useRef<HTMLDivElement>(null);
  // 编辑区 ↔ 预览区双向滚动同步（按已滚比例对齐，内部带回环锁）
  const scrollSyncHandlers = useScrollSync({
    editorRef: editor.textareaRef,
    previewRef: scrollerRef,
    enabled: scrollSync,
  });

  const statusTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [status, setStatus] = useState<CopyStatus>('idle');
  // 顶部样式区开合；顶栏「样式」按钮即开关
  const [styleOpen, setStyleOpen] = useState(false);

  const theme = ALL_THEMES.find((item) => item.id === themeId) ?? ALL_THEMES[0];
  // 没手动选字体时（'theme'），直接落到主题自己的归属上——下拉里显示的就是这一项
  const effectiveFontId = fontFamilyId === 'theme' ? themeFontId(theme.styles.wrapper) : fontFamilyId;
  const fontPreset = FONT_FAMILIES.find((item) => item.id === effectiveFontId);
  // 编辑区与预览用同一套正文字体与基准字号（含「整体字号」档位）
  const bodyFont = {
    stack: fontPreset?.stack || themeBodyFont(theme.styles.wrapper),
    weight: fontPreset?.weight,
    size: previewBodyFontPx(theme.styles.wrapper, fontScale),
  };
  const deferredMarkdown = useDeferredValue(markdown);
  // 编辑区的加粗色跟预览同源：换主题、换主色、单独调「加粗」都会变
  const editorStrongColor = useMemo(
    () => resolveStrongColor(theme, { main: mainColor, parts: partColors }),
    [theme, mainColor, partColors],
  );
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
      ? '已复制'
      : status === 'fail'
        ? '复制失败，请重试'
        : status === 'waiting'
          ? '图表渲染中…'
          : '复制';
  const Icon = status === 'ok' ? Check : Copy;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <AppHeader
        icon={Newspaper}
        title="公众号排版风格"
        description="写 Markdown，一键复制带样式的正文，粘贴到公众号后台即可。"
        actions={
          <button
            type="button"
            onClick={handleCopy}
            disabled={!markdown.trim()}
            title="复制到公众号"
            className="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-md border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-700 transition-colors hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900 disabled:cursor-not-allowed disabled:border-zinc-100 disabled:bg-zinc-50 disabled:text-zinc-400 sm:px-3.5"
          >
            <Icon size={14} />
            {label}
          </button>
        }
      />

      <WorkbenchBar
        editor={editor}
        theme={theme}
        isMobile={isMobile}
        styleOpen={styleOpen}
        onToggleStyle={() => setStyleOpen((open) => !open)}
      />

      {/* 样式区紧跟在工具条下面：「样式」按钮就在工具条最右端 */}
      {styleOpen && <StylePanel theme={theme} onClose={() => setStyleOpen(false)} />}

      <SplitPane
        isMobile={isMobile}
        editor={
          <EditorPanel
            editor={editor}
            accent={isHexColor(mainColor) ? mainColor : theme.accent}
            strongColor={editorStrongColor}
            bodyFont={bodyFont}
            onScroll={scrollSyncHandlers.onEditorScroll}
          />
        }
        preview={
          <PreviewPanel
            theme={theme}
            html={html}
            hasContent={Boolean(deferredMarkdown.trim())}
            scrollerRef={scrollerRef}
            articleRef={articleRef}
            onScroll={scrollSyncHandlers.onPreviewScroll}
            copying={status === 'waiting'}
          />
        }
      />

      <StatusBar />
    </div>
  );
}
