import { PDF_MARGIN_VALUES } from './print-pdf';
import type { PdfMargins } from './print-pdf';

/**
 * PDF 预览的排版换算。
 *
 * 预览不做真正的分页引擎：按「块」切页——量出正文根节点每个子块的推进高度，
 * 依次塞进等高页面，装不下就换页。浏览器打印按行切，两者边界会差一两行，
 * 但留白、页眉页脚位置、宽表格/长代码是否换行这些真正要看的东西是一致的。
 */

/** A4 在 96dpi 下的像素尺寸 */
export const A4_WIDTH_PX = 794;
export const A4_HEIGHT_PX = 1123;

const CM_TO_PX = 96 / 2.54;

export interface PageMargins {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/** 页边距档位（1 / 2 / 3 / 4 值写法同 CSS）→ px */
export function marginPx(margins: PdfMargins): PageMargins {
  const parts = PDF_MARGIN_VALUES[margins].trim().split(/\s+/).map((value) => parseFloat(value) * CM_TO_PX);
  const [top, right = top, bottom = top, left = right] = parts;
  return { top, right, bottom, left };
}

/**
 * 把正文根节点的子块按高度切进若干页，返回每页的块 HTML。
 *
 * 高度用「到下一块的位移」而不是块自身高度：块间外边距会折叠，
 * 位移才是它实际占掉的纵向空间，这样分页位置才和渲染结果对得上。
 */
export function sliceIntoPages(container: HTMLElement, capacity: number): string[][] {
  const blocks = Array.from(container.children) as HTMLElement[];
  if (blocks.length === 0) return [[]];

  const box = container.getBoundingClientRect();
  const origin = box.top;
  const tops = blocks.map((block) => block.getBoundingClientRect().top - origin);
  const total = box.height || container.scrollHeight || 0;
  const limit = capacity > 0 ? capacity : Number.POSITIVE_INFINITY;

  const pages: string[][] = [];
  let current: string[] = [];
  // 正文根节点自己的上内边距（卡片类主题有 20px）也要占掉第一页的高度
  let used = tops[0] ?? 0;

  blocks.forEach((block, index) => {
    const start = tops[index];
    const end = index + 1 < blocks.length ? tops[index + 1] : total;
    // 量不出布局时（jsdom）退化成 1px，至少能保证所有块都在一页里
    const height = Math.max(end - start, 1);

    if (current.length > 0 && used + height > limit) {
      pages.push(current);
      current = [];
      used = 0;
    }

    current.push(block.outerHTML);
    used += height;
  });

  if (current.length > 0) pages.push(current);
  return pages.length > 0 ? pages : [[]];
}

/** 正文区尺寸：A4 去掉页边距 */
export function pageContentSize(margins: PageMargins): { width: number; height: number } {
  return {
    width: A4_WIDTH_PX - margins.left - margins.right,
    height: A4_HEIGHT_PX - margins.top - margins.bottom,
  };
}
