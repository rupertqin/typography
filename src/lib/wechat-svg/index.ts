/**
 * 复制到公众号前的 SVG 清洗（只针对 Mermaid 产出）。
 * 移植自 doocs/md 的 wechat-svg.ts（MIT），去掉了 PlantUML 分支。
 *
 * 微信编辑器会丢掉 <style>、class、<defs> 与 id，且对 foreignObject / dominant-baseline
 * 支持很差。按下面的顺序处理，粘出来才是「所见即所得」的矢量图：
 *   展开 marker/use/渐变 → HTML 标签转 text → 烘计算样式 → 墨色转 currentColor
 *   → baseline 转 dy → 归一尺寸 → 字号下限 → 去 defs/id/class
 */
import { expandMarkers, expandUseElements, resolveUrlPaints } from './markers';
import { convertDominantBaselineToDy, flattenHtmlLabels, parseCssNumber } from './labels';
import { clampFontSizes, inlinePresentationAttributes, remapInkToCurrentColor } from './paint';

/** 微信公众号正文列宽上限；超过这个宽度会被后台二次缩放，字就糊了 */
export const WECHAT_MAX_WIDTH = 677;

const HIDDEN_HOST_STYLE =
  'position:fixed;left:-99999px;top:0;visibility:hidden;pointer-events:none;z-index:-1';

function resolvePixelSize(value: string | null, fallback: number): number {
  if (!value) return fallback;
  const parsed = parseCssNumber(value);
  if (!parsed) return fallback;
  if (parsed.unit === '%') return fallback * (parsed.n / 100);
  return parsed.n;
}

/** 量真实布局尺寸：类图等 diagram 不给 viewBox，width="100%" 在微信里等于没宽度 */
function measure(svg: SVGSVGElement): { width: number; height: number } {
  const rect = typeof svg.getBoundingClientRect === 'function' ? svg.getBoundingClientRect() : null;
  if (rect && rect.width > 1 && rect.height > 1) return { width: rect.width, height: rect.height };

  if (typeof svg.getBBox === 'function') {
    try {
      const box = svg.getBBox();
      if (box.width > 1 && box.height > 1) return { width: box.width, height: box.height };
    } catch {
      // 没布局信息就交给属性兜底
    }
  }
  return { width: 0, height: 0 };
}

/** 图比正文列宽还宽时等比缩小；微信不认 width:100%，必须写死 px */
export function fixDimensions(svg: SVGSVGElement, maxWidth: number): void {
  const viewBox = (svg.getAttribute('viewBox') ?? '')
    .trim()
    .split(/[\s,]+/)
    .map((part) => Number.parseFloat(part));

  const viewBoxWidth = viewBox.length === 4 && Number.isFinite(viewBox[2]) ? viewBox[2] : 0;
  const viewBoxHeight = viewBox.length === 4 && Number.isFinite(viewBox[3]) ? viewBox[3] : 0;

  const style = svg.getAttribute('style') ?? '';
  const styleMaxWidth = /max-width\s*:\s*([^;]+)/.exec(style)?.[1]?.trim() ?? '';
  const attrWidth = svg.getAttribute('width') ?? '';
  const attrHeight = svg.getAttribute('height') ?? '';

  let baseWidth =
    (styleMaxWidth && !styleMaxWidth.includes('%') ? parseCssNumber(styleMaxWidth)?.n : 0) ||
    (attrWidth && !attrWidth.includes('%') ? parseCssNumber(attrWidth)?.n : 0) ||
    viewBoxWidth;

  let baseHeight = viewBoxHeight || (attrHeight && !attrHeight.includes('%') ? parseCssNumber(attrHeight)?.n : 0) || 0;

  if (!baseWidth) {
    const measured = measure(svg);
    baseWidth = measured.width;
    baseHeight = baseHeight || measured.height;
    // 类图这类没有 viewBox 的，量出来的尺寸得写进 viewBox，缩放才不错位
    if (baseWidth && !viewBoxWidth) {
      svg.setAttribute('viewBox', `0 0 ${Math.round(baseWidth)} ${Math.round(baseHeight || baseWidth)}`);
    }
  }

  if (!baseWidth) return;

  const ratio = baseWidth > maxWidth ? maxWidth / baseWidth : 1;
  const width = Math.round(baseWidth * ratio);
  const height =
    baseHeight > 0 ? Math.round(baseHeight * ratio) : Math.round(resolvePixelSize(attrHeight, width) * ratio);

  svg.setAttribute('width', String(width));
  svg.setAttribute('height', String(height > 0 ? height : width));
  svg.setAttribute('style', 'display:block;max-width:100%;height:auto;margin:0 auto;');
}

const DROP_TAGS = ['defs', 'style', 'marker', 'symbol', 'filter', 'mask', 'pattern', 'clipPath', 'foreignObject'];

function stripUnsupported(svg: SVGSVGElement): void {
  svg.querySelectorAll(DROP_TAGS.join(',')).forEach((node) => node.remove());

  svg.querySelectorAll('*').forEach((node) => {
    Array.from(node.attributes).forEach((attr) => {
      const name = attr.name.toLowerCase();
      if (name === 'id' || name === 'class' || name.startsWith('data-')) node.removeAttribute(attr.name);
      if ((name === 'clip-path' || name === 'mask' || name === 'filter') && attr.value.includes('url(')) {
        node.removeAttribute(attr.name);
      }
      // 微信不认 ARIA，留着只会让源码变长
      if (name.startsWith('aria-') || name === 'role' || name === 'tabindex') node.removeAttribute(attr.name);
      if (name.startsWith('on')) node.removeAttribute(attr.name);
      if (name === 'href' || name === 'xlink:href') node.removeAttribute(attr.name);
    });
  });

  // 根节点同样要清：mermaid 会挂 role / aria-roledescription / data-processed
  Array.from(svg.attributes).forEach((attr) => {
    const name = attr.name.toLowerCase();
    if (name === 'id' || name === 'class' || name.startsWith('data-') || name.startsWith('aria-') || name === 'role') {
      svg.removeAttribute(attr.name);
    }
  });
}

export function sanitizeSvgForWeChat(svg: SVGSVGElement, maxWidth = WECHAT_MAX_WIDTH): void {
  expandMarkers(svg);
  expandUseElements(svg);
  resolveUrlPaints(svg);
  flattenHtmlLabels(svg);
  inlinePresentationAttributes(svg);
  remapInkToCurrentColor(svg);
  convertDominantBaselineToDy(svg);
  fixDimensions(svg, maxWidth);
  clampFontSizes(svg);
  stripUnsupported(svg);
}

/**
 * 清洗一批 SVG。会把它们临时挂到隐藏 host 上——`getComputedStyle`、
 * `getTotalLength`、`Range.getClientRects` 都要求元素在文档里且有布局。
 */
export function sanitizeMermaidSvgs(root: ParentNode, maxWidth = WECHAT_MAX_WIDTH): number {
  if (typeof document === 'undefined') return 0;

  const svgs = Array.from(root.querySelectorAll('svg'));
  if (svgs.length === 0) return 0;

  const host = document.createElement('div');
  host.setAttribute('style', HIDDEN_HOST_STYLE);
  document.body.appendChild(host);

  try {
    for (const svg of svgs) {
      const parent = svg.parentNode;
      const next = svg.nextSibling;
      host.appendChild(svg);
      sanitizeSvgForWeChat(svg as SVGSVGElement, maxWidth);
      if (parent) parent.insertBefore(svg, next);
    }
  } finally {
    host.remove();
  }

  return svgs.length;
}
