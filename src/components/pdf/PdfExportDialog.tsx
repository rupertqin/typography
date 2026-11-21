import { FileText, Loader2, Printer, X } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, RefObject } from 'react';
import { A4_HEIGHT_PX, A4_WIDTH_PX, marginPx, pageContentSize, sliceIntoPages } from '../../lib/print-preview';
import { collectArticleHtml, normalizePdfOptions, readPdfOptions, writePdfOptions } from '../../lib/print-pdf';
import type { PdfExportOptions, PdfMargins, PdfPageNumberFormat, PdfPageNumberPosition } from '../../lib/print-pdf';

interface PdfExportDialogProps {
  open: boolean;
  title: string;
  siteUrl: string;
  /** 预览正文从活 DOM 取：图表 SVG 只在那里 */
  article: RefObject<HTMLDivElement | null>;
  onClose: () => void;
  onExport: (options: PdfExportOptions) => Promise<void>;
}

const CHIP_ACTIVE = 'ui-selected';
const CHIP_IDLE = 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900';
const CHIP = 'inline-flex h-7 items-center rounded-md border px-2.5 text-xs transition-colors';
const ROW = 'flex items-start justify-between gap-3 border-b border-zinc-100 py-3';
const LABEL = 'text-xs font-medium text-zinc-800';
const HINT = 'mt-0.5 text-[11px] leading-relaxed text-zinc-500';

const MARGIN_OPTIONS: Array<{ value: PdfMargins; label: string }> = [
  { value: 'compact', label: '紧凑' },
  { value: 'default', label: '默认' },
  { value: 'comfortable', label: '宽松' },
];

const FORMAT_OPTIONS: Array<{ value: PdfPageNumberFormat; label: string }> = [
  { value: 'nOfM', label: '第 1 / 3 页' },
  { value: 'n', label: '1' },
];

const POSITION_OPTIONS: Array<{ value: PdfPageNumberPosition; label: string }> = [
  { value: 'bottomLeft', label: '左' },
  { value: 'bottomCenter', label: '中' },
  { value: 'bottomRight', label: '右' },
];

/** 预览里最多排这么多页：几百页的稿子没必要把 DOM 全铺出来 */
const MAX_PREVIEW_PAGES = 24;

type Slot = 'left' | 'center' | 'right';

const SLOT_OF_POSITION: Record<PdfPageNumberPosition, Slot> = {
  bottomLeft: 'left',
  bottomCenter: 'center',
  bottomRight: 'right',
};

function Switch({
  checked,
  disabled,
  label,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  label: string;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative mt-0.5 h-[18px] w-8 shrink-0 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        checked ? 'bg-[var(--ui-primary)]' : 'bg-zinc-200'
      }`}
    >
      {/* left 必须写死：绝对定位不给 left 时，浏览器按 button 自带的 text-align:center
          取静态位置，拉柄会先落在轨道中间再往右平移，直接跑出轨道外 */}
      <span
        aria-hidden
        className={`absolute left-0.5 top-0.5 h-3.5 w-3.5 rounded-full bg-white shadow-[0_1px_2px_rgba(24,24,27,0.25)] transition-transform duration-200 ${
          checked ? 'translate-x-3.5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

function ChoiceRow<T extends string>({
  label,
  hint,
  options,
  value,
  onPick,
}: {
  label: string;
  hint?: string;
  options: Array<{ value: T; label: string }>;
  value: T;
  onPick: (next: T) => void;
}) {
  return (
    <div className="border-b border-zinc-100 py-3">
      <div className={LABEL}>{label}</div>
      {hint && <p className={HINT}>{hint}</p>}
      <div role="radiogroup" aria-label={label} className="mt-2 flex flex-wrap gap-1.5">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={value === option.value}
            onClick={() => onPick(option.value)}
            className={`${CHIP} ${value === option.value ? CHIP_ACTIVE : CHIP_IDLE}`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * PDF 导出（参考 doocs-md 的 PdfExportDialog）：左边选项，右边按 A4 实排的预览。
 *
 * 预览是「按块切页」估出来的，不是浏览器真正的分页：块边界可能差一两行，
 * 但页边距、页眉页脚位置、宽表格与长代码会不会溢出纸边，看一眼就知道。
 * 真正的出文件走浏览器打印（见 lib/print-pdf.ts）。
 */
export default function PdfExportDialog({
  open,
  title,
  siteUrl,
  article,
  onClose,
  onExport,
}: PdfExportDialogProps) {
  const [options, setOptions] = useState<PdfExportOptions>(() => readPdfOptions());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  /** 打开时给正文拍个快照：预览和最终导出的都是这一刻的排版 */
  const [html, setHtml] = useState('');
  const [pages, setPages] = useState<string[][]>([]);
  const [contentStyle, setContentStyle] = useState('');

  const panelRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(0.5);

  const margins = marginPx(options.margins);
  const content = pageContentSize(margins);

  useEffect(() => {
    if (!open) return;
    setOptions(readPdfOptions());
    setError('');
    setBusy(false);
    const node = article.current;
    setHtml(node ? collectArticleHtml(node) : '');
  }, [open, article]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    const timer = window.setTimeout(() => {
      panelRef.current?.querySelector<HTMLElement>('button:not(:disabled)')?.focus();
    }, 0);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      window.clearTimeout(timer);
    };
  }, [open, onClose]);

  // 量宽定缩放：A4 按可用宽度等比缩小，窗口变化时跟着变
  useEffect(() => {
    if (!open) return;
    const node = previewRef.current;
    if (!node) return;
    const update = () => {
      // 宽屏按「整页能看全」缩放（页高也参与），窄屏只按宽度铺满，否则小得没法看
      const byWidth = (node.clientWidth - 24) / A4_WIDTH_PX;
      const byHeight = (node.clientHeight - 24) / A4_HEIGHT_PX;
      const wide = window.matchMedia('(min-width: 768px)').matches;
      const next = wide ? Math.min(byWidth, byHeight) : byWidth;
      if (next > 0) setZoom(Math.max(0.2, Math.min(1, next)));
    };
    update();
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null;
    observer?.observe(node);
    window.addEventListener('resize', update);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', update);
    };
  }, [open]);

  // 分页：隐藏的正文按 A4 正文区宽度排好，再按块切成页
  useLayoutEffect(() => {
    if (!open) return;
    const host = measureRef.current;
    const wrapper = host?.firstElementChild as HTMLElement | null;
    const root = (wrapper?.firstElementChild ?? wrapper) as HTMLElement | null;
    if (!root) {
      setPages([]);
      setContentStyle('');
      return;
    }
    setContentStyle(root.getAttribute('style') ?? '');
    const sliced = sliceIntoPages(root, pageContentSize(marginPx(options.margins)).height);
    // 空正文时 sliceIntoPages 会给一个空页，这里当成「没有内容」
    setPages(sliced.length === 1 && sliced[0].length === 0 ? [] : sliced);
  }, [open, html, options.margins]);

  if (!open) return null;

  const patch = (next: Partial<PdfExportOptions>) => {
    setOptions((current) => normalizePdfOptions({ ...current, ...next }));
  };

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    setError('');
    writePdfOptions(options);
    try {
      await onExport(options);
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setBusy(false);
    }
  };

  /**
   * 正文根节点的样式（字体、颜色、卡片底色）。
   * 上下内边距只在首页/末页保留：打印时 section 跨页是被切开的，
   * 如果每页都重新套一遍，卡片类主题的 20px 内边距会让每页少排两行。
   */
  const sectionStyle = (index: number) => {
    const isFirst = index === 0;
    const isLast = index === pages.length - 1;
    const overrides = [isFirst ? '' : 'padding-top:0', isLast ? '' : 'padding-bottom:0']
      .filter(Boolean)
      .join(';');
    if (!contentStyle) return '';
    const merged = overrides ? `${contentStyle.replace(/;?\s*$/, ';')}${overrides}` : contentStyle;
    return ` style="${merged.replace(/"/g, '&quot;')}"`;
  };

  const footerTop = A4_HEIGHT_PX - margins.bottom + Math.max(6, margins.bottom * 0.3);

  const footerStyle = (slot: Slot): CSSProperties => {
    const base: CSSProperties = {
      position: 'absolute',
      top: footerTop,
      fontSize: 10,
      lineHeight: 1,
      color: '#999',
      whiteSpace: 'nowrap',
    };
    if (slot === 'left') return { ...base, left: margins.left };
    if (slot === 'right') return { ...base, right: margins.right };
    return { ...base, left: 0, right: 0, textAlign: 'center' };
  };

  const pageSlot = SLOT_OF_POSITION[options.pageNumberPosition];
  // 站点地址放第一个没被页码占掉的底边盒（同 print-pdf 的取法）
  const siteSlot: Slot | null =
    options.showSiteFooter && siteUrl
      ? (['left', 'center', 'right'] as Slot[]).find(
          (slot) => !(options.showPageNumbers && slot === pageSlot),
        ) ?? null
      : null;
  const shown = pages.slice(0, MAX_PREVIEW_PAGES);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-zinc-900/30 p-3 backdrop-blur-[2px] sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pdf-dialog-title"
        className="flex h-[min(88vh,780px)] w-full max-w-[900px] flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-[0_24px_64px_rgba(24,24,27,0.24)]"
      >
        <div className="flex shrink-0 items-start gap-3 border-b border-zinc-200 px-4 py-3.5">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[var(--ui-primary)] text-white">
            <FileText size={15} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="pdf-dialog-title" className="text-sm font-semibold text-zinc-900">
              导出 PDF
            </h2>
            <p className="mt-0.5 truncate text-[11px] text-zinc-500" title={title}>
              {title}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭"
            className="rounded-md p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
          >
            <X size={15} />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          {/* 左：选项 */}
          <div className="order-2 min-h-0 flex-1 overflow-y-auto px-4 thin-scrollbar md:order-1 md:w-[330px] md:flex-none md:border-r md:border-zinc-200">
            <div className={ROW}>
              <div className="min-w-0">
                <div className={LABEL}>页眉显示文章标题</div>
                <p className={HINT}>每页顶部重复一行灰色小标题</p>
              </div>
              <Switch
                checked={options.showTitleHeader}
                label="页眉显示文章标题"
                onChange={(next) => patch({ showTitleHeader: next })}
              />
            </div>

            <div className={`${ROW} ${options.showPageNumbers ? '' : 'border-b-0'}`}>
              <div className="min-w-0">
                <div className={LABEL}>显示页码</div>
                <p className={HINT}>需要 Chrome 131+ 的页边盒支持</p>
              </div>
              <Switch
                checked={options.showPageNumbers}
                label="显示页码"
                onChange={(next) => patch({ showPageNumbers: next })}
              />
            </div>

            {options.showPageNumbers && (
              <>
                <ChoiceRow
                  label="页码格式"
                  options={FORMAT_OPTIONS}
                  value={options.pageNumberFormat}
                  onPick={(next) => patch({ pageNumberFormat: next })}
                />
                <ChoiceRow
                  label="页码位置"
                  options={POSITION_OPTIONS}
                  value={options.pageNumberPosition}
                  onPick={(next) => patch({ pageNumberPosition: next })}
                />
              </>
            )}

            <div className={ROW}>
              <div className="min-w-0">
                <div className={LABEL}>页脚显示站点地址</div>
                <p className={`${HINT} truncate`} title={siteUrl || '本地打开时没有站点地址'}>
                  {siteUrl || '本地打开时没有站点地址'}
                </p>
              </div>
              <Switch
                checked={options.showSiteFooter}
                disabled={!siteUrl}
                label="页脚显示站点地址"
                onChange={(next) => patch({ showSiteFooter: next })}
              />
            </div>

            <ChoiceRow
              label="页面边距"
              hint="上下留白同时是页眉/页脚的落位；关掉页眉页脚时自动收成左右同宽"
              options={MARGIN_OPTIONS}
              value={options.margins}
              onPick={(next) => patch({ margins: next })}
            />

            {error && <p className="pb-2 text-[11px] text-red-600">导出失败：{error}</p>}
          </div>

          {/* 右：A4 预览 */}
          <div
            ref={previewRef}
            data-pdf-preview
            className="order-1 h-[38vh] min-h-0 overflow-auto bg-zinc-100 p-3 thin-scrollbar md:order-2 md:h-auto md:flex-1"
          >
            {shown.length === 0 ? (
              <p className="py-16 text-center text-xs text-zinc-400">没有可导出的正文</p>
            ) : (
              <div className="flex flex-col items-center gap-3" style={{ zoom }}>
                {shown.map((blocks, index) => (
                  <div
                    key={index}
                    data-pdf-page
                    className="relative shrink-0 bg-white shadow-[0_1px_3px_rgba(24,24,27,0.12),0_6px_18px_rgba(24,24,27,0.08)]"
                    style={{
                      width: A4_WIDTH_PX,
                      height: A4_HEIGHT_PX,
                      boxSizing: 'border-box',
                      padding: `${margins.top}px ${margins.right}px ${margins.bottom}px ${margins.left}px`,
                    }}
                  >
                    {options.showTitleHeader && (
                      <div
                        className="absolute truncate text-center text-[12px] leading-none text-[#666]"
                        style={{
                          top: Math.max(6, margins.top * 0.4),
                          left: margins.left,
                          right: margins.right,
                        }}
                      >
                        {title}
                      </div>
                    )}

                    <div
                      className="h-full overflow-hidden"
                      // 正文按存下来的根节点样式套一层，字体、颜色、底色与导出的 PDF 一致
                      dangerouslySetInnerHTML={{
                        __html: `<section${sectionStyle(index)}>${blocks.join('')}</section>`,
                      }}
                    />

                    {siteSlot && (
                      <div style={footerStyle(siteSlot)}>{siteUrl}</div>
                    )}
                    {options.showPageNumbers && (
                      <div style={footerStyle(pageSlot)}>
                        {options.pageNumberFormat === 'nOfM'
                          ? `第 ${index + 1} / ${pages.length} 页`
                          : `${index + 1}`}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {pages.length > shown.length && (
              <p className="mt-3 text-center text-[11px] text-zinc-400">
                共 {pages.length} 页，预览只排前 {MAX_PREVIEW_PAGES} 页
              </p>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 border-t border-zinc-200 px-4 py-3">
          <p className="mr-auto text-[11px] leading-snug text-zinc-500">在打印对话框里选「存储为 PDF」</p>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 items-center rounded-md border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-900"
          >
            取消
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={busy || shown.length === 0}
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[var(--ui-primary)] px-3 text-xs font-medium text-white transition-colors hover:bg-[var(--ui-primary-hover)] disabled:cursor-not-allowed disabled:bg-zinc-400"
          >
            {busy ? <Loader2 size={13} className="animate-spin" /> : <Printer size={13} />}
            {busy ? '准备中…' : '导出 PDF'}
          </button>
        </div>
      </div>

      {/* 量分页用的隐藏正文：与预览同宽、可见性隐藏（仍参与布局） */}
      <div
        ref={measureRef}
        aria-hidden
        style={{
          position: 'absolute',
          left: -99999,
          top: 0,
          width: content.width,
          visibility: 'hidden',
          pointerEvents: 'none',
        }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
