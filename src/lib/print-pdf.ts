import { MERMAID_ATTR, MERMAID_STATE_ATTR } from './mermaid';

/**
 * PDF 导出（同 doocs-md 的路子，不引第三方库）：
 * 把预览正文克隆成一份自带样式的独立 HTML，塞进隐藏 iframe，调 `contentWindow.print()`，
 * 由浏览器的「打印 → 存为 PDF」出文件。翻页、页眉页脚都交给 CSS Paged Media 的 `@page`。
 *
 * 与 doocs-md 的差别：那边的主题是外挂 `<style>`，要抓出来再注进打印文档；
 * 这里的排版在渲染期就写成内联样式了，只有图表/公式容器还靠 `.md-*` 几个类，
 * 所以把那一小段类样式一并抄进来就够（见 SHELL_CSS）。
 */

export type PdfPageNumberFormat = 'nOfM' | 'n';
export type PdfPageNumberPosition = 'bottomLeft' | 'bottomCenter' | 'bottomRight';
export type PdfMargins = 'compact' | 'default' | 'comfortable';

export interface PdfExportOptions {
  /** 每页顶上重复文章标题 */
  showTitleHeader: boolean;
  showPageNumbers: boolean;
  pageNumberFormat: PdfPageNumberFormat;
  pageNumberPosition: PdfPageNumberPosition;
  /** 页脚印上站点地址 */
  showSiteFooter: boolean;
  margins: PdfMargins;
}

/** 个人排版工具出的都是单篇文章，页脚印站点地址没意义，默认关掉 */
export const DEFAULT_PDF_EXPORT_OPTIONS: PdfExportOptions = {
  showTitleHeader: true,
  showPageNumbers: true,
  pageNumberFormat: 'nOfM',
  pageNumberPosition: 'bottomRight',
  showSiteFooter: false,
  margins: 'default',
};

const PAGE_NUMBER_FORMATS = new Set<PdfPageNumberFormat>(['nOfM', 'n']);
const PAGE_NUMBER_POSITIONS = new Set<PdfPageNumberPosition>(['bottomLeft', 'bottomCenter', 'bottomRight']);
const MARGIN_PRESETS = new Set<PdfMargins>(['compact', 'default', 'comfortable']);

/** 页边距档位（CSS 四值写法）。预览的排版框也照这份算，两边不会对不上。 */
export const PDF_MARGIN_VALUES: Record<PdfMargins, string> = {
  compact: '1cm',
  default: '1.6cm 1.2cm 2cm 1.2cm',
  comfortable: '2.2cm 1.6cm 2.6cm 1.6cm',
};

/** 页眉/页脚文字与正文之间留的缝 */
const CHROME_CONTENT_GAP = '0.5cm';

const PAGE_NUMBER_BOX: Record<PdfPageNumberPosition, string> = {
  bottomLeft: '@bottom-left',
  bottomCenter: '@bottom-center',
  bottomRight: '@bottom-right',
};

/** 底边三个盒共享一行（Chrome 里像 flex），空盒要收成 0 宽，真文字才撑得开 */
const BOTTOM_EDGE_BOXES = ['@bottom-left', '@bottom-center', '@bottom-right'] as const;

/** CSS Paged Media 的全部 16 个页边盒（Chrome 131+ 支持内容） */
const ALL_MARGIN_BOXES = [
  '@top-left-corner',
  '@top-left',
  '@top-center',
  '@top-right',
  '@top-right-corner',
  '@bottom-left-corner',
  '@bottom-left',
  '@bottom-center',
  '@bottom-right',
  '@bottom-right-corner',
  '@left-top',
  '@left-middle',
  '@left-bottom',
  '@right-top',
  '@right-middle',
  '@right-bottom',
] as const;

interface MarginSides {
  top: string;
  right: string;
  bottom: string;
  left: string;
}

function resolveMarginSides(margins: PdfMargins): MarginSides {
  const parts = PDF_MARGIN_VALUES[margins].trim().split(/\s+/);
  if (parts.length === 1) return { top: parts[0], right: parts[0], bottom: parts[0], left: parts[0] };
  if (parts.length === 2) return { top: parts[0], right: parts[1], bottom: parts[0], left: parts[1] };
  if (parts.length === 3) return { top: parts[0], right: parts[1], bottom: parts[2], left: parts[1] };
  return { top: parts[0], right: parts[1], bottom: parts[2], left: parts[3] };
}

function formatSides({ top, right, bottom, left }: MarginSides): string {
  if (top === right && right === bottom && bottom === left) return top;
  if (top === bottom && right === left) return `${top} ${right}`;
  return `${top} ${right} ${bottom} ${left}`;
}

function marginBoxRule(box: string, content: string, extras = ''): string {
  return `${box} { content: ${content};${extras} }`;
}

/** 没占用的盒也要声明成空串，否则 Chromium 会自己填上 URL / 日期 */
function emptyMarginBoxRule(box: string, collapseWidth: boolean): string {
  return marginBoxRule(
    box,
    '""',
    collapseWidth ? ' width: 0; max-width: 0; padding: 0; margin: 0; overflow: hidden;' : '',
  );
}

/** 站点地址优先放左下；页码占了左下就换中间，再让到右下 */
function resolveSiteFooterBox(pageBox: string | null): string | null {
  for (const box of BOTTOM_EDGE_BOXES) {
    if (box !== pageBox) return box;
  }
  return null;
}

/** 同名函数的 doocs 版会丢弃历史字段；这里只做「类型兜底 + 补齐缺省」 */
export function normalizePdfOptions(input?: Partial<PdfExportOptions> | null): PdfExportOptions {
  const src = input ?? {};
  return {
    showTitleHeader:
      typeof src.showTitleHeader === 'boolean'
        ? src.showTitleHeader
        : DEFAULT_PDF_EXPORT_OPTIONS.showTitleHeader,
    showPageNumbers:
      typeof src.showPageNumbers === 'boolean'
        ? src.showPageNumbers
        : DEFAULT_PDF_EXPORT_OPTIONS.showPageNumbers,
    pageNumberFormat: PAGE_NUMBER_FORMATS.has(src.pageNumberFormat as PdfPageNumberFormat)
      ? (src.pageNumberFormat as PdfPageNumberFormat)
      : DEFAULT_PDF_EXPORT_OPTIONS.pageNumberFormat,
    pageNumberPosition: PAGE_NUMBER_POSITIONS.has(src.pageNumberPosition as PdfPageNumberPosition)
      ? (src.pageNumberPosition as PdfPageNumberPosition)
      : DEFAULT_PDF_EXPORT_OPTIONS.pageNumberPosition,
    showSiteFooter:
      typeof src.showSiteFooter === 'boolean'
        ? src.showSiteFooter
        : DEFAULT_PDF_EXPORT_OPTIONS.showSiteFooter,
    margins: MARGIN_PRESETS.has(src.margins as PdfMargins)
      ? (src.margins as PdfMargins)
      : DEFAULT_PDF_EXPORT_OPTIONS.margins,
  };
}

/** 选项存本机：下次导出沿用上次的口味 */
const STORAGE_KEY = 'typography-pdf';

export function readPdfOptions(): PdfExportOptions {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return normalizePdfOptions(raw ? JSON.parse(raw) : null);
  } catch {
    return { ...DEFAULT_PDF_EXPORT_OPTIONS };
  }
}

export function writePdfOptions(options: PdfExportOptions): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizePdfOptions(options)));
  } catch {
    // 隐私模式下写不进去，下次用默认值就是了
  }
}

/** CSS 字符串里的引号与反斜杠要转义，标题/URL 都可能带 */
function escapeCssString(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * `@page` 规则：页边距 + 页眉标题 / 页码 / 站点地址。
 * 页码文字用 `counter(page)` / `counter(pages)`，由浏览器在排版时填。
 */
export function buildPageCss(options: PdfExportOptions, title: string, siteUrl = ''): string {
  const resolved = normalizePdfOptions(options);
  const safeTitle = escapeCssString(title);
  const safeSiteUrl = escapeCssString(siteUrl);
  const sides = resolveMarginSides(resolved.margins);
  const pageBox = resolved.showPageNumbers ? PAGE_NUMBER_BOX[resolved.pageNumberPosition] : null;
  const siteBox = resolved.showSiteFooter && siteUrl ? resolveSiteFooterBox(pageBox) : null;

  // 不加页眉/页脚时上下也要留出与左右同样的边距，否则正文会顶到纸边
  const contentEdge = sides.left;
  const pageMargin: MarginSides = {
    top: resolved.showTitleHeader ? sides.top : contentEdge,
    right: sides.right,
    bottom: pageBox || siteBox ? sides.bottom : contentEdge,
    left: sides.left,
  };

  const claimed = new Map<string, string>();

  if (resolved.showTitleHeader) {
    claimed.set(
      '@top-center',
      marginBoxRule(
        '@top-center',
        `"${safeTitle}"`,
        ` font-size: 12px; color: #666; vertical-align: bottom; padding-bottom: ${CHROME_CONTENT_GAP};`,
      ),
    );
  }

  if (siteBox) {
    claimed.set(
      siteBox,
      marginBoxRule(
        siteBox,
        `"${safeSiteUrl}"`,
        ` font-size: 10px; color: #999; vertical-align: top; padding-top: ${CHROME_CONTENT_GAP}; white-space: nowrap;`,
      ),
    );
  }

  if (pageBox) {
    const label =
      resolved.pageNumberFormat === 'n'
        ? '"" counter(page) ""'
        : '"第 " counter(page) " / " counter(pages) " 页"';
    claimed.set(
      pageBox,
      marginBoxRule(
        pageBox,
        label,
        ` font-size: 10px; color: #999; vertical-align: top; padding-top: ${CHROME_CONTENT_GAP}; white-space: nowrap;`,
      ),
    );
  }

  const boxes = ALL_MARGIN_BOXES.map((box) => {
    const real = claimed.get(box);
    if (real) return real;
    const collapse = (BOTTOM_EDGE_BOXES as readonly string[]).includes(box) && Boolean(siteBox || pageBox);
    return emptyMarginBoxRule(box, collapse);
  });

  return `@page { margin: ${formatSides(pageMargin)}; ${boxes.join(' ')} } html, body { margin: 0; }`;
}

/**
 * 预览里这几个容器靠 global.css 的类上样式（margin / 边框 / 横向滚动）。
 * 打印文档不带应用的样式表，所以把这段抄一份。——改 global.css 的 `.md-*` 时要同步这里。
 */
const SHELL_CSS = `
  .md-mermaid {
    margin: 1.2em 0;
    padding: 12px 10px;
    overflow-x: auto;
    border: 1px solid #e9e9ec;
    border-radius: 8px;
    background: #fff;
    text-align: center;
    line-height: 1.4;
  }
  .md-mermaid svg { display: block; max-width: 100%; height: auto; margin: 0 auto; }
  .md-mermaid .nodeLabel, .md-mermaid .edgeLabel { letter-spacing: 0; color: inherit; }
  .md-math-block { overflow-x: auto; overflow-y: hidden; line-height: 1.4; }
  .md-math-block svg, .md-math svg { max-width: 100%; height: auto; }
  .md-math[data-state='loading'], .md-math[data-state='rendering'],
  .md-math-block[data-state='loading'], .md-math-block[data-state='rendering'] { color: #a1a1aa; font-size: 13px; }
  .md-math[data-state='error'], .md-math-block[data-state='error'] { color: #dc2626; font-size: 12px; text-align: left; }
`;

/**
 * 纸面上的版式收束：
 * - 预览里「横向滚动」的表格/代码，到纸上没有滚动条，得改成换行，否则右边直接被裁掉；
 * - 代码块每行是 `<br>` + 不换行空格，`white-space: normal` + `overflow-wrap: anywhere` 才能在超宽时折行；
 * - 标题不许落在页脚孤零零一行，段落至少留 3 行（orphans/widows）。
 */
const PRINT_LAYOUT_CSS = `
  html, body { margin: 0; padding: 0; background: #fff; }
  .pg-doc { margin: 0 auto; max-width: 750px; }
  .pg-doc img, .pg-doc svg { max-width: 100%; height: auto; }
  .pg-doc section[style*='overflow-x'], .pg-doc pre[style*='overflow-x'] { overflow: visible !important; }
  .pg-doc .md-mermaid, .pg-doc .md-math-block { overflow: visible !important; }
  .pg-doc pre, .pg-doc pre code { overflow: visible !important; }
  .pg-doc pre code { white-space: normal !important; overflow-wrap: anywhere !important; word-break: break-word !important; }
  .pg-doc table { table-layout: fixed !important; width: 100% !important; max-width: 100% !important; }
  .pg-doc th, .pg-doc td { word-break: break-word !important; overflow-wrap: anywhere !important; white-space: normal !important; }
  .pg-doc h1, .pg-doc h2, .pg-doc h3, .pg-doc h4, .pg-doc h5, .pg-doc h6 { break-after: avoid-page; break-inside: avoid; }
  .pg-doc p { orphans: 3; widows: 3; }
  .pg-doc pre, .pg-doc blockquote { break-inside: avoid; }
`;

/** 独立 HTML 文件（非打印）时给个纸张观感 */
const SCREEN_SHELL_CSS = `
  body { background: #f4f4f5; padding: 32px 16px; }
  .pg-doc { background: #fff; padding: 32px 28px; border-radius: 10px; box-shadow: 0 2px 24px rgba(24, 24, 27, 0.08); }
`;

export interface PrintDocumentArgs {
  /** 已序列化的正文 HTML */
  html: string;
  title: string;
  options?: Partial<PdfExportOptions>;
  siteUrl?: string;
  /** true = PDF 打印文档（带 @page）；false = 独立 HTML 文件 */
  paged?: boolean;
}

/** 拼出完整文档：样式全内联，不引用任何外部资源 */
export function buildPrintDocument({
  html,
  title,
  options,
  siteUrl = '',
  paged = true,
}: PrintDocumentArgs): string {
  const resolved = normalizePdfOptions(options);
  const css = [
    SHELL_CSS,
    PRINT_LAYOUT_CSS,
    paged ? '' : SCREEN_SHELL_CSS,
    '* { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }',
    paged ? buildPageCss(resolved, title, siteUrl) : '',
  ]
    .filter(Boolean)
    .join('\n');

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>${css}</style>
</head>
<body>
<div class="pg-doc">${html}</div>
</body>
</html>`;
}

/**
 * 从活 DOM 取正文：图还没画出来的（`data-state` 不是 ready）整块丢掉——
 * 纸面上留一句「图表渲染中…」比缺一张图更糟（同复制链路的取舍）。
 */
export function collectArticleHtml(root: HTMLElement): string {
  const clone = root.cloneNode(true) as HTMLElement;

  clone.querySelectorAll(`[${MERMAID_ATTR}]`).forEach((node) => {
    const state = node.getAttribute(MERMAID_STATE_ATTR);
    if (state !== 'ready') node.remove();
  });

  return clone.outerHTML;
}

/** 站点地址：只在本机 http(s) 下取，file:// 或未知环境就返回空串 */
export function currentSiteUrl(): string {
  if (typeof window === 'undefined') return '';
  const { protocol, origin, pathname } = window.location;
  if (protocol !== 'http:' && protocol !== 'https:') return '';
  return `${origin}${pathname.replace(/[^/]*$/, '')}`;
}

export interface ExportPdfArgs {
  root: HTMLElement;
  title: string;
  options?: Partial<PdfExportOptions>;
}

/**
 * 打印（存为 PDF）。promise 在打印对话框弹出后即 resolve，iframe 的清理交给 afterprint。
 */
export async function exportPdf({ root, title, options }: ExportPdfArgs): Promise<void> {
  const doc = buildPrintDocument({
    html: collectArticleHtml(root),
    title,
    options,
    siteUrl: currentSiteUrl(),
    paged: true,
  });

  await printHtmlDocument(doc);
}

function printHtmlDocument(doc: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const iframe = document.createElement('iframe');
    iframe.setAttribute('aria-hidden', 'true');
    iframe.setAttribute('tabindex', '-1');
    iframe.style.cssText = 'position:fixed;width:0;height:0;top:-9999px;left:-9999px;border:0;';

    let objectUrl = '';
    let done = false;
    const cleanup = () => {
      if (done) return;
      done = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      iframe.remove();
    };

    iframe.onload = () => {
      const view = iframe.contentWindow;
      if (!view) {
        cleanup();
        reject(new Error('打印窗口不可用'));
        return;
      }
      // 打印对话框是模态的：先 resolve 让按钮停止转圈，再靠 afterprint 收尾
      view.addEventListener('afterprint', () => window.setTimeout(cleanup, 200), { once: true });
      try {
        view.focus();
        view.print();
      } catch (error) {
        cleanup();
        reject(error instanceof Error ? error : new Error(String(error)));
        return;
      }
      resolve();
    };

    const canBlob = typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function';
    if (canBlob) {
      objectUrl = URL.createObjectURL(new Blob([doc], { type: 'text/html' }));
      iframe.src = objectUrl;
    } else {
      // jsdom 之类的环境没有 createObjectURL，退回 srcdoc
      iframe.srcdoc = doc;
    }

    document.body.appendChild(iframe);
    // 兜底：万一 afterprint 没来（用户直接关掉对话框），也别把 iframe 永远挂在那儿
    window.setTimeout(cleanup, 5 * 60 * 1000);
  });
}
