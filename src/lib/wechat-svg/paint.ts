/**
 * 把计算样式烘成显式属性、深灰墨色换 currentColor、字号设下限。
 * 移植自 doocs/md 的 wechat-svg.ts（MIT）。
 *
 * 为什么要烘：公众号编辑器会丢掉 <style> 与 class，靠 CSS 继承的描边/填充在那边
 * 全部失效（线条变黑、节点变白、文字看不清）。烘成属性后才是所见即所得。
 */
import { isDarkInkColor, isNonePaint, isTransparentPaint, isUsablePaint } from './colors';
import { parseCssNumber } from './labels';

const SHAPE_TAGS = ['path', 'line', 'polyline', 'polygon', 'rect', 'circle', 'ellipse'];

function computed(node: Element, prop: string): string {
  try {
    return window.getComputedStyle(node).getPropertyValue(prop);
  } catch {
    return '';
  }
}

function isLeaf(node: Element): boolean {
  return !Array.from(node.children).some((child) => child.localName !== 'defs' && child.localName !== 'style');
}

/**
 * 逐叶子元素把 fill / stroke 烘成属性。
 * 「显式 none 优先」是关键：线条元素常靠 `fill="none"` 才不会画成实心块，
 * 用计算样式里的 fill 覆盖它，整张图会糊成黑块。
 */
export function inlinePresentationAttributes(svg: SVGSVGElement): void {
  svg.querySelectorAll('*').forEach((node) => {
    if (['defs', 'style', 'marker', 'linearGradient', 'radialGradient', 'stop'].includes(node.localName)) return;
    if (!isLeaf(node)) return;

    const isText = node.localName === 'text' || node.localName === 'tspan';

    const fillAttr = node.getAttribute('fill');
    if (!isNonePaint(fillAttr)) {
      const fill = computed(node, 'fill');
      if (isText) {
        const color = isUsablePaint(fill) && !isTransparentPaint(fill) ? fill : computed(node, 'color');
        if (isUsablePaint(color) && !isTransparentPaint(color)) node.setAttribute('fill', color);
      } else if (isNonePaint(fill)) {
        /**
         * 计算值是 none 时必须写死成属性。
         *
         * mermaid 的连线是靠 CSS 里的 fill:none 保持「只描边」的，而微信会丢掉 <style>；
         * 属性缺失时 SVG 的初始值是 fill=black，于是每条贝塞尔曲线都被填成实心黑块——
         * 表现就是箭头附近那一坨坨墨迹。doocs 的 bakePaint 也是同类处理。
         */
        node.setAttribute('fill', 'none');
      } else if (isUsablePaint(fill) && !isTransparentPaint(fill)) {
        node.setAttribute('fill', fill);
      }
    }

    const strokeAttr = node.getAttribute('stroke');
    if (!isNonePaint(strokeAttr)) {
      const stroke = computed(node, 'stroke');
      if (isText) {
        // 文字默认不该描边，微信里描边会加粗成黑边
        node.setAttribute('stroke', 'none');
      } else if (isUsablePaint(stroke) && !isTransparentPaint(stroke)) {
        node.setAttribute('stroke', stroke);
        const width = computed(node, 'stroke-width');
        if (width && !node.getAttribute('stroke-width')) node.setAttribute('stroke-width', width);
        const dash = computed(node, 'stroke-dasharray');
        if (dash && dash !== 'none' && !node.getAttribute('stroke-dasharray')) {
          node.setAttribute('stroke-dasharray', dash);
        }
      }
    }

    if (!isText) return;
    const fontSize = parseCssNumber(computed(node, 'font-size'));
    if (fontSize?.unit === 'px' && !node.getAttribute('font-size')) node.setAttribute('font-size', String(fontSize.n));
    const fontWeight = computed(node, 'font-weight');
    if (fontWeight && !node.getAttribute('font-weight') && Number(fontWeight) >= 500) {
      node.setAttribute('font-weight', '600');
    }
  });

  // 组节点上的 fill/stroke 会覆盖子元素，微信里继承不可靠，统一清掉
  svg.querySelectorAll('g, svg').forEach((node) => {
    node.removeAttribute('fill');
    node.removeAttribute('stroke');
    node.removeAttribute('style');
  });
}

/**
 * 深灰墨色（默认连线、箭头、文字）换成 currentColor：
 * 微信暗色模式会给 currentColor 套上主题前景色，写死 #333 的线在暗色下直接消失。
 */
export function remapInkToCurrentColor(svg: SVGSVGElement): void {
  svg.querySelectorAll(SHAPE_TAGS.join(',')).forEach((node) => {
    for (const attr of ['stroke', 'fill'] as const) {
      const value = node.getAttribute(attr);
      if (value && isDarkInkColor(value)) node.setAttribute(attr, 'currentColor');
    }

    const style = node.getAttribute('style');
    if (!style) return;
    const next = style.replace(/(stroke|fill)\s*:\s*([^;]+)/gi, (whole, prop: string, value: string) =>
      isDarkInkColor(value.trim()) ? `${prop}: currentColor` : whole,
    );
    if (next !== style) {
      const remaining = next
        .split(';')
        .map((part) => part.trim())
        .filter(Boolean);
      if (remaining.length) node.setAttribute('style', remaining.join(';'));
      else node.removeAttribute('style');
    }
  });
}

const MIN_FONT_PX = 9;

/** 手机上标题字号会被压得很小，9px 是微信里还能看清的下限 */
export function clampFontSizes(svg: SVGSVGElement): void {
  svg.querySelectorAll('text, tspan').forEach((node) => {
    const raw = node.getAttribute('font-size');
    const parsed = raw ? parseCssNumber(raw) : null;
    if (parsed?.unit === 'px' && parsed.n < MIN_FONT_PX) node.setAttribute('font-size', String(MIN_FONT_PX));
  });
}
