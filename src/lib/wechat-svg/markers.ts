/**
 * 箭头（marker）、图标（use）、渐变（url(#id)）的展开。
 * 移植自 doocs/md 的 wechat-svg.ts（MIT）。
 *
 * 为什么必须展开：微信会把 <defs> 和 id 全部丢掉，而 marker-end / use / url(#gradient)
 * 都靠 id 引用——不展开的话，粘到公众号里箭头消失、图标消失、渐变变透明。
 */
import { mixCssColors } from './colors';

const SVG_NS = 'http://www.w3.org/2000/svg';

interface MarkerSpec {
  paths: Element[];
  refX: number;
  refY: number;
  orient: string;
  markerUnits: string;
}

interface Point {
  x: number;
  y: number;
}

function parseMarkerRef(value: string | null): string | null {
  if (!value) return null;
  return value.match(/#([^)'"]+)/)?.[1] ?? null;
}

function collectMarkers(defs: Element): Map<string, MarkerSpec> {
  const markers = new Map<string, MarkerSpec>();

  defs.querySelectorAll('*').forEach((node) => {
    if (node.localName !== 'marker') return;
    const id = node.getAttribute('id');
    if (!id) return;

    const paths = Array.from(node.querySelectorAll('*')).filter((child) =>
      ['path', 'polygon', 'polyline', 'line'].includes(child.localName),
    );
    if (paths.length === 0) return;

    markers.set(id, {
      paths,
      refX: Number.parseFloat(node.getAttribute('refX') ?? '0'),
      refY: Number.parseFloat(node.getAttribute('refY') ?? '0'),
      orient: node.getAttribute('orient') ?? 'auto',
      markerUnits: node.getAttribute('markerUnits') ?? 'strokeWidth',
    });
  });

  return markers;
}

function resolveOrientAngle(orient: string, pathAngleRad: number): number {
  if (orient === 'auto') return pathAngleRad;
  if (orient === 'auto-start-reverse') return pathAngleRad + Math.PI;
  const parsed = Number.parseFloat(orient);
  return Number.isFinite(parsed) ? (parsed * Math.PI) / 180 : pathAngleRad;
}

function getStrokeWidth(el: Element): number {
  const attr = el.getAttribute('stroke-width');
  if (attr) return Number.parseFloat(attr) || 1.5;
  const match = /stroke-width:\s*([\d.]+)/.exec(el.getAttribute('style') ?? '');
  return match ? Number.parseFloat(match[1]) : 1.5;
}

function getStrokeColor(el: Element): string {
  return el.getAttribute('stroke') ?? el.getAttribute('fill') ?? 'currentColor';
}

/** marker 里没有可画的内容时，用一个实心三角兜住箭头 */
function appendFallbackArrow(svg: SVGSVGElement, point: Point, angleRad: number, stroke: string, strokeWidth: number) {
  const size = Math.max(6, strokeWidth * 4);
  const tipX = point.x;
  const tipY = point.y;
  const leftX = tipX - size * Math.cos(angleRad - Math.PI / 6);
  const leftY = tipY - size * Math.sin(angleRad - Math.PI / 6);
  const rightX = tipX - size * Math.cos(angleRad + Math.PI / 6);
  const rightY = tipY - size * Math.sin(angleRad + Math.PI / 6);

  const polygon = document.createElementNS(SVG_NS, 'polygon');
  polygon.setAttribute('points', `${tipX},${tipY} ${leftX},${leftY} ${rightX},${rightY}`);
  polygon.setAttribute('fill', stroke);
  polygon.setAttribute('stroke', 'none');
  svg.appendChild(polygon);
}

function appendMarkerAtPoint(
  svg: SVGSVGElement,
  spec: MarkerSpec,
  point: Point,
  angleRad: number,
  strokeWidth: number,
  stroke: string,
) {
  const orientAngle = resolveOrientAngle(spec.orient, angleRad);
  const scale = spec.markerUnits === 'userSpaceOnUse' ? 1 : Math.max(strokeWidth, 1);

  const group = document.createElementNS(SVG_NS, 'g');
  group.setAttribute(
    'transform',
    `translate(${point.x}, ${point.y}) rotate(${(orientAngle * 180) / Math.PI}) scale(${scale}) translate(${-spec.refX}, ${-spec.refY})`,
  );

  if (spec.paths.length === 0) {
    appendFallbackArrow(svg, point, angleRad, stroke, strokeWidth);
    return;
  }

  for (const path of spec.paths) {
    const clone = path.cloneNode(true) as Element;
    const fill = clone.getAttribute('fill');
    if (!fill || fill === 'context-fill') clone.setAttribute('fill', stroke);
    const strokeAttr = clone.getAttribute('stroke');
    if (!strokeAttr || strokeAttr === 'context-stroke') clone.setAttribute('stroke', stroke);
    group.appendChild(clone);
  }

  svg.appendChild(group);
}

function getLineGeometry(el: Element, atStart: boolean): { point: Point; angle: number } | null {
  const x1 = el.getAttribute('x1');
  const y1 = el.getAttribute('y1');
  const x2 = el.getAttribute('x2');
  const y2 = el.getAttribute('y2');
  if (x1 == null || y1 == null || x2 == null || y2 == null) return null;

  const startX = Number.parseFloat(x1);
  const startY = Number.parseFloat(y1);
  const endX = Number.parseFloat(x2);
  const endY = Number.parseFloat(y2);
  const angle = Math.atan2(endY - startY, endX - startX);
  return {
    point: { x: atStart ? startX : endX, y: atStart ? startY : endY },
    angle: atStart ? angle + Math.PI : angle,
  };
}

function getPathGeometry(el: Element, atStart: boolean): { point: Point; angle: number } | null {
  const path = el as SVGPathElement;
  if (typeof path.getTotalLength !== 'function') return null;

  const length = path.getTotalLength();
  if (length <= 0) return null;

  const epsilon = Math.min(5, length / 2);
  const raw = atStart ? path.getPointAtLength(0) : path.getPointAtLength(length);
  const neighbor = atStart
    ? path.getPointAtLength(Math.min(length, epsilon))
    : path.getPointAtLength(Math.max(0, length - epsilon));
  const point = { x: raw.x, y: raw.y };
  const angle = Math.atan2(point.y - neighbor.y, point.x - neighbor.x);
  return { point, angle: atStart ? angle + Math.PI : angle };
}

function expandMarkersOnElement(svg: SVGSVGElement, el: Element, markers: Map<string, MarkerSpec>) {
  const endId = parseMarkerRef(el.getAttribute('marker-end') ?? el.getAttribute('markerEnd'));
  const startId = parseMarkerRef(el.getAttribute('marker-start') ?? el.getAttribute('markerStart'));
  if (!endId && !startId) return;

  const strokeWidth = getStrokeWidth(el);
  const stroke = getStrokeColor(el);

  const apply = (markerId: string | null, atStart: boolean) => {
    if (!markerId) return;
    const geometry = el.localName === 'path' ? getPathGeometry(el, atStart) : getLineGeometry(el, atStart);
    if (!geometry) return;
    const spec = markers.get(markerId);
    if (spec) appendMarkerAtPoint(svg, spec, geometry.point, geometry.angle, strokeWidth, stroke);
    else appendFallbackArrow(svg, geometry.point, geometry.angle, stroke, strokeWidth);
  };

  apply(startId, true);
  apply(endId, false);

  for (const attr of ['marker-end', 'marker-start', 'marker-mid', 'markerEnd', 'markerStart', 'markerMid']) {
    el.removeAttribute(attr);
  }
}

export function expandMarkers(svg: SVGSVGElement): void {
  const defs = svg.querySelector('defs');
  const markers = defs ? collectMarkers(defs) : new Map<string, MarkerSpec>();
  svg.querySelectorAll('path, line, polyline').forEach((el) => expandMarkersOnElement(svg, el, markers));
}

function findById(svg: SVGSVGElement, id: string): Element | null {
  const byApi = typeof svg.getElementById === 'function' ? svg.getElementById(id) : null;
  if (byApi) return byApi;
  try {
    return svg.querySelector(`#${CSS.escape(id)}`);
  } catch {
    return null;
  }
}

function stopColorOf(stop: Element): string | null {
  const fromAttr = stop.getAttribute('stop-color');
  if (fromAttr) return fromAttr;
  return /stop-color:\s*([^;]+)/.exec(stop.getAttribute('style') ?? '')?.[1]?.trim() ?? null;
}

function solidFromPaintServer(svg: SVGSVGElement, paint: string): string | null {
  const id = parseMarkerRef(paint);
  if (!id) return null;
  const ref = findById(svg, id);
  if (!ref || (ref.localName !== 'linearGradient' && ref.localName !== 'radialGradient')) return null;

  const colors = Array.from(ref.querySelectorAll('stop'))
    .map(stopColorOf)
    .filter((color): color is string => Boolean(color));
  if (colors.length === 0) return null;
  if (colors.length === 1) return colors[0];
  return mixCssColors(colors[0], colors[colors.length - 1]) ?? colors[0];
}

/** 渐变按首尾色压成实色：微信丢 defs 之后 url(#id) 什么都画不出来 */
export function resolveUrlPaints(svg: SVGSVGElement): void {
  svg.querySelectorAll('*').forEach((el) => {
    for (const attr of ['fill', 'stroke'] as const) {
      const value = el.getAttribute(attr);
      if (!value || !value.includes('url(')) continue;
      const solid = solidFromPaintServer(svg, value);
      if (solid) el.setAttribute(attr, solid);
    }

    const style = el.getAttribute('style');
    if (!style || !style.includes('url(')) return;
    const next = style.replace(/(fill|stroke)\s*:\s*([^;]+)/gi, (whole, prop: string, value: string) => {
      if (!value.includes('url(')) return whole;
      const solid = solidFromPaintServer(svg, value.trim());
      return solid ? `${prop}: ${solid}` : whole;
    });
    if (next !== style) el.setAttribute('style', next);
  });
}

/** 架构图/图标常用 <use href="#id">，微信不认，展开成真实元素 */
export function expandUseElements(svg: SVGSVGElement): void {
  svg.querySelectorAll('use').forEach((useEl) => {
    const id = parseMarkerRef(useEl.getAttribute('href') ?? useEl.getAttribute('xlink:href'));
    const ref = id ? findById(svg, id) : null;
    if (!ref) {
      useEl.remove();
      return;
    }

    const group = document.createElementNS(SVG_NS, 'g');
    const x = Number.parseFloat(useEl.getAttribute('x') ?? '0') || 0;
    const y = Number.parseFloat(useEl.getAttribute('y') ?? '0') || 0;
    const transforms: string[] = [];
    if (x || y) transforms.push(`translate(${x}, ${y})`);
    const existing = useEl.getAttribute('transform');
    if (existing) transforms.push(existing);
    if (transforms.length) group.setAttribute('transform', transforms.join(' '));

    const takeChildren = ['symbol', 'svg', 'g'].includes(ref.localName);
    if (takeChildren) {
      Array.from(ref.childNodes).forEach((child) => {
        if (child.nodeType === Node.ELEMENT_NODE && (child as Element).localName === 'defs') return;
        group.appendChild(child.cloneNode(true));
      });
    } else {
      const clone = ref.cloneNode(true) as Element;
      clone.removeAttribute('id');
      group.appendChild(clone);
    }

    for (const attr of ['fill', 'stroke', 'stroke-width', 'opacity']) {
      const value = useEl.getAttribute(attr);
      if (value) group.setAttribute(attr, value);
    }

    useEl.parentNode?.replaceChild(group, useEl);
  });
}
