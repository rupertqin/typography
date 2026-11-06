/**
 * 图内 HTML 标签（foreignObject）转成真正的 SVG 文字，以及微信不认的
 * dominant-baseline → dy 换算。移植自 doocs/md 的 wechat-svg.ts（MIT）。
 *
 * 为什么要转：微信会丢掉 / 画错 foreignObject 里的 HTML（ER 图、需求图、部分流程图
 * 的节点文字都走它），转成 <text>/<tspan> 后字号、颜色、换行才能在公众号里活下来。
 */
import { isTransparentPaint, isUsablePaint } from './colors';

const SVG_NS = 'http://www.w3.org/2000/svg';

export function parseCssNumber(value: string): { n: number; unit: string } | null {
  const match = /^(-?[\d.]+)(px|pt|em|rem|%)?$/i.exec(value.trim());
  if (!match) return null;
  const n = Number.parseFloat(match[1]);
  if (!Number.isFinite(n) || n <= 0) return null;
  return { n, unit: (match[2] || '').toLowerCase() };
}

function paintFromStyle(node: Element, prop: string): string | null {
  const style = node.getAttribute('style');
  if (!style) return null;
  return new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*([^;]+)`, 'i').exec(style)?.[1]?.trim() || null;
}

function parseTranslate(transform: string | null): { x: number; y: number } | null {
  if (!transform) return { x: 0, y: 0 };
  const match = /translate\(\s*([-\d.eE]+)(?:[\s,]+([-\d.eE]+))?\s*\)/.exec(transform);
  if (!match) return null;
  return { x: Number.parseFloat(match[1]) || 0, y: Number.parseFloat(match[2] || '0') || 0 };
}

function roundSvg(value: number): number {
  return Math.round(value * 10) / 10;
}

function estimateLabelWidth(text: string, fontSize: number): number {
  let width = 0;
  for (const char of text) {
    width += /[\u1100-\uD7FF\uF900-\uFAFF]/.test(char) ? fontSize : fontSize * 0.55;
  }
  return width;
}

/**
 * CSS 的 `white-space: break-spaces` 只是软换行，不会插入 <br>。
 * 微信里的 SVG 文字不会自己换行，所以要把折行还原成一行一个 <tspan>。
 * 拿不到布局（jsdom）时返回 null，交给上层按 <br> / textContent 兜底。
 */
function collectRenderedLines(root: Element): string[] | null {
  const range = document.createRange();
  if (typeof range.getClientRects !== 'function') return null;

  const lines: Array<{ top: number; text: string }> = [];
  let laidOut = false;
  let forceBreak = false;

  const push = (char: string, top: number) => {
    const last = lines[lines.length - 1];
    if (forceBreak || !last || Math.abs(last.top - top) > 4) {
      lines.push({ top, text: char });
      forceBreak = false;
      return;
    }
    last.text += char;
  };

  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent ?? '';
      for (let index = 0; index < text.length; index += 1) {
        range.setStart(node, index);
        range.setEnd(node, index + 1);
        const rect = range.getClientRects()[0];
        if (rect && rect.height > 0) {
          laidOut = true;
          push(text[index], rect.top);
        } else {
          push(text[index], lines[lines.length - 1]?.top ?? 0);
        }
      }
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    if ((node as Element).localName === 'br') {
      forceBreak = true;
      return;
    }
    node.childNodes.forEach(walk);
  };

  try {
    walk(root);
  } catch {
    return null;
  }

  if (!laidOut) return null;

  const rendered = lines
    .map((line) => line.text.replace(/\u00A0/g, ' ').trim())
    .filter(Boolean);
  return rendered.length > 0 ? rendered : null;
}

function collectForeignObjectLines(foreign: Element): string[] {
  const rendered = collectRenderedLines(foreign);
  if (rendered) return rendered;

  const html = foreign.innerHTML;
  if (/<br\s*\/?>/i.test(html)) {
    return html
      .split(/<br\s*\/?>/i)
      .map((part) => part.replace(/<[^>]+>/g, '').replace(/&nbsp;/gi, ' ').trim())
      .filter(Boolean);
  }

  const text = (foreign.textContent || '').replace(/\u00A0/g, ' ');
  const lines = text.split(/\n/).map((part) => part.trim()).filter(Boolean);
  if (lines.length) return lines;
  const compact = text.replace(/\s+/g, ' ').trim();
  return compact ? [compact] : [];
}

function labelLineAdvance(styled: Element, fontSize: number): number {
  const parsed = parseCssNumber(window.getComputedStyle(styled).lineHeight);
  return parsed?.unit === 'px' ? parsed.n : fontSize * 1.2;
}

function edgeLabelBackground(styled: Element): string {
  const fromStyle = /(?:^|;)\s*background(?:-color)?\s*:\s*([^;]+)/i.exec(styled.getAttribute('style') ?? '')?.[1]?.trim();
  if (fromStyle && !isTransparentPaint(fromStyle) && isUsablePaint(fromStyle)) return fromStyle;
  try {
    const computed = window.getComputedStyle(styled).backgroundColor;
    if (computed && !isTransparentPaint(computed) && isUsablePaint(computed)) return computed;
  } catch {
    // 拿不到计算样式就用默认底色
  }
  return '#ffffff';
}

/** 双向连线的边标签会落在同一个中点上，粘出去会叠字，这里把它们推开 */
function separateOverlappingEdgeLabels(svg: SVGSVGElement) {
  const labels = Array.from(svg.querySelectorAll('g.edgeLabel'));
  if (labels.length < 2) return;

  const items = labels.map((el) => {
    const position = parseTranslate(el.getAttribute('transform')) ?? { x: 0, y: 0 };
    const text = el.querySelector('text');
    const fontSize = parseCssNumber(text?.getAttribute('font-size') || '16')?.n ?? 16;
    const rectWidth = Number.parseFloat(el.querySelector('rect')?.getAttribute('width') ?? '0') || 0;
    const content = (text?.textContent ?? '').replace(/\s+/g, ' ').trim();
    const width = rectWidth > 0 ? rectWidth : Math.max(16, estimateLabelWidth(content, fontSize));
    return { el, x: position.x, y: position.y, halfW: width / 2 };
  });

  for (let i = 0; i < items.length; i += 1) {
    for (let j = i + 1; j < items.length; j += 1) {
      const a = items[i];
      const b = items[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const distance = Math.hypot(dx, dy);
      const needed = a.halfW + b.halfW + 8;
      if (distance >= needed) continue;

      let dirX = 1;
      let dirY = 0;
      if (distance >= 1) {
        if (Math.abs(dx) >= Math.abs(dy)) {
          dirX = dx / distance;
          dirY = 0;
        } else {
          dirX = 0;
          dirY = dy / distance;
        }
      }

      const extra = (needed - distance) / 2;
      nudgeLabel(a, -dirX * extra, -dirY * extra);
      nudgeLabel(b, dirX * extra, dirY * extra);
    }
  }
}

function nudgeLabel(item: { el: Element; x: number; y: number }, dx: number, dy: number) {
  item.x += dx;
  item.y += dy;
  const raw = item.el.getAttribute('transform') ?? '';
  if (/translate\(/.test(raw)) {
    item.el.setAttribute(
      'transform',
      raw.replace(
        /translate\(\s*([-\d.eE]+)(?:[\s,]+([-\d.eE]+))?\s*\)/,
        `translate(${roundSvg(item.x)}, ${roundSvg(item.y)})`,
      ),
    );
    return;
  }
  item.el.setAttribute('transform', `translate(${roundSvg(item.x)}, ${roundSvg(item.y)})${raw ? ` ${raw}` : ''}`);
}

export function flattenHtmlLabels(svg: SVGSVGElement): void {
  svg.querySelectorAll('foreignObject').forEach((foreign) => {
    const lines = collectForeignObjectLines(foreign);
    if (lines.length === 0) {
      foreign.remove();
      return;
    }

    const x = Number.parseFloat(foreign.getAttribute('x') ?? '0') || 0;
    const y = Number.parseFloat(foreign.getAttribute('y') ?? '0') || 0;
    const width = Number.parseFloat(foreign.getAttribute('width') ?? '0') || 0;
    const height = Number.parseFloat(foreign.getAttribute('height') ?? '0') || 0;
    const styled = foreign.querySelector('[style], section, div, span, p') ?? foreign;
    const color =
      paintFromStyle(styled, 'color') ||
      paintFromStyle(styled, 'fill') ||
      window.getComputedStyle(styled).color ||
      '#333333';
    const fontSize = parseCssNumber(paintFromStyle(styled, 'font-size') || window.getComputedStyle(styled).fontSize || '16')?.n ?? 16;
    const styleText = `${styled.getAttribute('style') ?? ''} ${window.getComputedStyle(styled).textAlign}`;
    const centered = /center/i.test(styleText) && width > 0;
    const inEdgeLabel = foreign.closest('.edgeLabel') != null;
    const transform = foreign.getAttribute('transform');

    const text = document.createElementNS(SVG_NS, 'text');
    const textX = centered ? x + width / 2 : x;
    // foreignObject 里的 HTML 是顶对齐，SVG 文字是基线对齐，这里补一个基线偏移
    const textY = y + (height > 0 ? Math.min(fontSize, height * 0.8) : fontSize * 0.8);
    text.setAttribute('x', String(textX));
    text.setAttribute('y', String(textY));
    text.setAttribute('fill', isUsablePaint(color) ? color : '#333333');
    text.setAttribute('stroke', 'none');
    text.setAttribute('font-size', String(fontSize));
    text.setAttribute('text-anchor', centered ? 'middle' : 'start');

    if (lines.length === 1) {
      text.textContent = lines[0];
    } else {
      const advance = roundSvg(labelLineAdvance(styled, fontSize));
      lines.forEach((line, index) => {
        const tspan = document.createElementNS(SVG_NS, 'tspan');
        tspan.setAttribute('x', String(textX));
        tspan.setAttribute('dy', index === 0 ? '0' : String(advance));
        tspan.setAttribute('fill', isUsablePaint(color) ? color : '#333333');
        tspan.textContent = line;
        text.appendChild(tspan);
      });
    }

    const parent = foreign.parentNode;
    if (!parent) {
      foreign.remove();
      return;
    }

    const needsBackdrop = inEdgeLabel && width > 0 && height > 0;
    if (!transform && !needsBackdrop) {
      parent.replaceChild(text, foreign);
      return;
    }

    const replacement = document.createElementNS(SVG_NS, 'g');
    if (transform) replacement.setAttribute('transform', transform);

    if (needsBackdrop) {
      const rect = document.createElementNS(SVG_NS, 'rect');
      rect.setAttribute('x', String(x));
      rect.setAttribute('y', String(y));
      rect.setAttribute('width', String(width));
      rect.setAttribute('height', String(height));
      rect.setAttribute('fill', edgeLabelBackground(styled));
      rect.setAttribute('stroke', 'none');
      replacement.appendChild(rect);
    }

    replacement.appendChild(text);
    parent.replaceChild(replacement, foreign);
  });

  separateOverlappingEdgeLabels(svg);
}

const BASELINE_DY: Record<string, string> = {
  central: '0.35em',
  middle: '0.35em',
  hanging: '-0.55em',
  ideographic: '0.18em',
  'text-before-edge': '-0.85em',
  'text-after-edge': '0.15em',
};

/** 微信不认 dominant-baseline，换算成 dy，否则文字会整体上下错位 */
export function convertDominantBaselineToDy(svg: SVGSVGElement): void {
  svg.querySelectorAll('text, tspan').forEach((el) => {
    const baseline = el.getAttribute('dominant-baseline');
    if (!baseline) return;
    el.removeAttribute('dominant-baseline');
    const em = BASELINE_DY[baseline];
    if (!em || el.getAttribute('dy')) return;
    const fontSize = parseCssNumber(window.getComputedStyle(el).fontSize || '16')?.n ?? 16;
    const factor = Number.parseFloat(em);
    if (Number.isFinite(factor)) el.setAttribute('dy', String(Math.round(fontSize * factor * 10) / 10));
  });
}
