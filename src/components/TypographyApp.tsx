import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { Check, Copy, Newspaper } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import EditorPanel from './editor/EditorPanel';
import PdfExportDialog from './pdf/PdfExportDialog';
import PreviewPanel from './preview/PreviewPanel';
import AppHeader from './shell/AppHeader';
import AppMenuBar from './shell/AppMenuBar';
import FolderImportDialog from './shell/FolderImportDialog';
import SplitPane from './shell/SplitPane';
import StatusBar from './shell/StatusBar';
import StylePanel from './shell/StylePanel';
import WorkbenchBar from './shell/WorkbenchBar';
import { copyRichText } from '../lib/clipboard';
import { buildCopyBundleWhenReady, waitForDiagrams } from '../lib/copy-html';
import { articleTitle, downloadTextFile, pickFolder, pickTextFile, safeFileName } from '../lib/download';
import { buildAssetBundle, imageRefsInMarkdown, readMarkdownFile, scanFolder } from '../lib/folder-import';
import type { FolderMarkdown, FolderScan } from '../lib/folder-import';
import { isExternalSrc, lookupAsset, setAssetBundle } from '../lib/local-assets';
import { buildPrintDocument, collectArticleHtml, currentSiteUrl, exportPdf } from '../lib/print-pdf';
import type { PdfExportOptions } from '../lib/print-pdf';
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
  // 编辑区高亮层：与 textarea 同字同宽，滚动同步靠它把源码行换算成像素位置
  const editorLayerRef = useRef<HTMLPreElement>(null);
  // 编辑区 ↔ 预览区双向滚动同步（按块锚点对齐，内部带回环锁）
  const scrollSyncHandlers = useScrollSync({
    editorRef: editor.textareaRef,
    layerRef: editorLayerRef,
    previewRef: scrollerRef,
    enabled: scrollSync,
  });

  const statusTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [status, setStatus] = useState<CopyStatus>('idle');
  // 顶部样式区开合；顶栏「样式」按钮即开关
  const [styleOpen, setStyleOpen] = useState(false);
  // PDF 导出选项对话框（入口在左上角菜单：文件 ▸ 导出 PDF…）
  const [pdfOpen, setPdfOpen] = useState(false);
  // 导入文件夹：有多篇 md 时先让用户挑一篇
  const [folderScan, setFolderScan] = useState<FolderScan | null>(null);
  const [importing, setImporting] = useState(false);

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

  // 文章标题当文件名：取第一个标题行，没有再退到首段文字
  const docTitle = articleTitle(markdown);

  /** 导出前等图表落地：纸面上留「图表渲染中…」比缺一张图更糟 */
  const awaitArticleRoot = async () => {
    const root = articleRef.current;
    if (!root) return null;
    await waitForDiagrams(root);
    return root;
  };

  const handleExportPdf = async (options: PdfExportOptions) => {
    const root = await awaitArticleRoot();
    if (!root) return;
    await exportPdf({ root, title: docTitle, options });
  };

  const handleExportMarkdown = () => {
    downloadTextFile(`${safeFileName(docTitle)}.md`, markdown, 'text/markdown');
  };

  const handleExportHtml = async () => {
    const root = await awaitArticleRoot();
    if (!root) return;
    // 与 PDF 同一份版式，只是不带 @page（在屏幕上直接打开就是一张白纸卡片）
    const doc = buildPrintDocument({ html: collectArticleHtml(root), title: docTitle, paged: false });
    downloadTextFile(`${safeFileName(docTitle)}.html`, doc, 'text/html');
  };

  const handleImportMarkdown = async () => {
    const text = await pickTextFile();
    if (text === null) return;

    // 只选一个文件时拿不到同目录的图片：正文里的相对路径图片只能留在占位框，
    // 这里把数量报出来，并指向「导入文件夹」——否则用户会以为是图片丢了。
    const missing = imageRefsInMarkdown(text).filter(
      (src) => !isExternalSrc(src) && !lookupAsset(src),
    );
    editor.replaceAll(
      text,
      missing.length > 0
        ? `已导入 Markdown · ${missing.length} 张本地图片没读进来（要选文件夹）`
        : '已导入 Markdown',
    );
    if (missing.length > 0) {
      console.info('[导入 Markdown] 想连图片一起读，用「文件 ▸ 导入文件夹（含图片）」：', missing);
    }
  };

  /**
   * 导入「一个文件夹」：一篇 md + 一整个图片集。
   *
   * Markdown 原样进编辑器（相对路径保持可读），图片单独存进本机仓库，
   * 预览/复制/导出时再由 useLocalImages 换成 data URL。
   */
  const importFromFolder = async (scan: FolderScan, entry: FolderMarkdown) => {
    setImporting(true);
    try {
      if (scan.images.length > 0) editor.notify(`正在读取 ${scan.images.length} 张图片…`);
      const [text, assets] = await Promise.all([
        readMarkdownFile(entry.file),
        buildAssetBundle(scan.images, entry.dir),
      ]);
      await setAssetBundle(assets.bundle);

      // 正文引用的图片里，有几张没在文件夹里对上；跳过的又是为什么
      const missing = imageRefsInMarkdown(text).filter(
        (src) => !isExternalSrc(src) && !lookupAsset(src),
      );
      const unsupported = assets.skipped.filter((item) => item.reason === 'unsupported').length;
      const tooLarge = assets.skipped.length - unsupported;

      const parts = [entry.name];
      parts.push(assets.used > 0 ? `${assets.used} 张图` : '没找到图片');
      if (missing.length > 0) parts.push(`${missing.length} 张没对上`);
      if (unsupported > 0) parts.push(`${unsupported} 张格式打不开`);
      if (tooLarge > 0) parts.push(`${tooLarge} 张太大`);
      const message = `已导入 ${parts.join(' · ')}`;

      if (missing.length > 0 || assets.skipped.length > 0) {
        // 提示栏放不下细节，具体是哪些图留在控制台，排查时能直接看到
        console.info('[导入文件夹] 没对上的图片：', missing);
        console.info('[导入文件夹] 跳过的图片：', assets.skipped);
      }

      // 草稿为空时 replaceAll 不会弹提示（没有可撤销的内容），这里补一句
      const wasEmpty = !useTypographyStore.getState().markdown.trim();
      editor.replaceAll(text, message);
      if (wasEmpty) editor.notify(message);
      setFolderScan(null);
    } catch (error) {
      editor.notify(`导入失败：${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setImporting(false);
    }
  };

  const handleImportFolder = async () => {
    const files = await pickFolder();
    if (files.length === 0) return;
    const scan = scanFolder(files);
    if (scan.markdowns.length === 0) {
      editor.notify('这个文件夹里没有 Markdown 文件（.md / .markdown / .txt）');
      return;
    }
    if (scan.markdowns.length === 1) {
      const only = scan.markdowns[0];
      await importFromFolder(scan, only);
      return;
    }
    setFolderScan(scan);
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
        menu={
          <AppMenuBar
            editor={editor}
            settingsOpen={styleOpen}
            onCopy={handleCopy}
            onExportPdf={() => setPdfOpen(true)}
            onExportMarkdown={handleExportMarkdown}
            onExportHtml={handleExportHtml}
            onImport={handleImportMarkdown}
            onImportFolder={handleImportFolder}
            onToggleSettings={() => setStyleOpen((open) => !open)}
          />
        }
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
            layerRef={editorLayerRef}
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

      <FolderImportDialog
        scan={folderScan}
        busy={importing}
        onPick={(entry) => {
          if (folderScan) void importFromFolder(folderScan, entry);
        }}
        onClose={() => setFolderScan(null)}
      />

      <PdfExportDialog
        open={pdfOpen}
        title={docTitle}
        siteUrl={currentSiteUrl()}
        article={articleRef}
        onClose={() => setPdfOpen(false)}
        onExport={handleExportPdf}
      />
    </div>
  );
}
