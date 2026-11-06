import { COLOR_PARTS } from './constants';
import type { ColorOverrides, Theme } from './types';

type RGB = [number, number, number];
interface HSL {
  h: number;
  s: number;
  l: number;
}
interface ColorMap {
  from: RGB;
  fromHsl: HSL;
  to: RGB;
  toHsl: HSL;
  loud: boolean;
  text: boolean;
}

/** 低于此饱和度视为「近灰」，只换明度不换色相 */
const NEUTRAL_SATURATION = 0.15;
/** 同一色系内允许保留的色相偏移（度） */
const HUE_TOLERANCE = 30;
/** 这些部件属于「文字色」，深色背景上需要提亮 */
const TEXT_PARTS = new Set(['h1', 'h2', 'h3', 'strong', 'hr', 'list', 'link']);

const COLOR_TOKEN = /#(?:[0-9a-f]{6}|[0-9a-f]{3})\b|rgba?\([^)]*\)/gi;

export function isHexColor(value: string | undefined): boolean {
  return /^#[0-9a-f]{6}$/i.test(value ?? '');
}

/** 只展示当前主题真正用得上的部件（无列表符号就不给「列表符号」调色） */
export function availableColorParts(theme: Theme) {
  return COLOR_PARTS.filter((part) => {
    if (part.id === 'list') return Boolean(theme.decor.ulMark || theme.decor.olMark);
    if (part.id === 'page') {
      return /background/.test(theme.styles.wrapper) || Boolean(theme.decor.card);
    }
    return true;
  });
}

export function hasColorOverrides(overrides: ColorOverrides | undefined): boolean {
  if (!overrides) return false;
  return isHexColor(overrides.main) || Object.values(overrides.parts ?? {}).some((v) => v && isHexColor(v));
}

function hexToRgb(hex: string): RGB {
  let body = hex.slice(1);
  if (body.length === 3) body = body.replace(/./g, (char) => char + char);
  const value = parseInt(body, 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function rgbToHsl([r, g, b]: RGB): HSL {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const delta = max - min;
  if (!delta) return { h: 0, s: 0, l };
  const s = delta / (1 - Math.abs(2 * l - 1));
  const h =
    (max === rn ? ((gn - bn) / delta + 6) % 6 : max === gn ? (bn - rn) / delta + 2 : (rn - gn) / delta + 4) * 60;
  return { h, s, l };
}

function hslToRgb({ h, s, l }: HSL): RGB {
  const hue = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] =
    hue < 60
      ? [c, x, 0]
      : hue < 120
        ? [x, c, 0]
        : hue < 180
          ? [0, c, x]
          : hue < 240
            ? [0, x, c]
            : hue < 300
              ? [x, 0, c]
              : [c, 0, x];
  return [r, g, b].map((value) => Math.round(Math.min(1, Math.max(0, value + m)) * 255)) as RGB;
}

function rgbToCss([r, g, b]: RGB, alpha: number): string {
  if (alpha < 1) return `rgba(${r},${g},${b},${alpha})`;
  return `#${[r, g, b].map((value) => value.toString(16).padStart(2, '0')).join('')}`;
}

/** 主色的浅底：引用块「主题色浅底」这类选项要按当前主色算，不能写死 */
export function rgbaFromHex(hex: string, alpha: number): string {
  if (!isHexColor(hex)) return '';
  return rgbToCss(hexToRgb(hex), alpha);
}

/** 把源明度按「源 → 目标」映射，保留原图层的明暗层次 */
function mapLightness(value: number, from: number, to: number): number {
  if (value <= from) return from === 0 ? value : (value * to) / from;
  if (from === 1) return value;
  return to + ((value - from) * (1 - to)) / (1 - from);
}

function createMapper(accent: string, target: string, partId: string | null, explicit: boolean): ColorMap {
  const from = hexToRgb(accent);
  const fromHsl = rgbToHsl(from);
  const to = hexToRgb(target);
  const loud = Boolean(partId) && (explicit || fromHsl.s < NEUTRAL_SATURATION);
  return {
    from,
    fromHsl,
    to,
    toHsl: rgbToHsl(to),
    loud,
    text: loud && TEXT_PARTS.has(partId as string),
  };
}

const clampLightness = (value: number, limit: number) => Math.min(value, Math.max(limit, 0.55));

function tintAt(map: ColorMap, lightness: number): RGB {
  const level = clampLightness(map.toHsl.l, lightness);
  return level === map.toHsl.l ? map.to : hslToRgb({ ...map.toHsl, l: level });
}

function remapColor(rgb: RGB, alpha: number, isColorProp: boolean, lightBackground: boolean, map: ColorMap): RGB | null {
  const source = map.fromHsl;
  const target = rgbToHsl(rgb);

  // 与主题主色完全一致的近灰色：整体替换（背景层保留原明度）
  if (source.s < NEUTRAL_SATURATION && rgb.every((value, index) => value === map.from[index])) {
    if (isColorProp) return map.loud ? tintAt(map, target.l) : null;
    return map.to;
  }

  if (target.s >= NEUTRAL_SATURATION && target.l > 0.03 && target.l < 0.98) {
    const sourceColored = source.s >= NEUTRAL_SATURATION;
    const hueDelta = ((target.h - source.h + 540) % 360) - 180;
    const sameFamily = sourceColored && Math.abs(hueDelta) <= HUE_TOLERANCE;
    if (sourceColored && !sameFamily && !map.loud) return null;

    const lightness = mapLightness(target.l, source.l, map.toHsl.l);
    const hue = sameFamily ? map.toHsl.h + hueDelta : map.toHsl.h;
    const saturation = sourceColored
      ? Math.min(
          1,
          target.s *
            (target.l > 0.8
              ? Math.min(1, map.toHsl.s / source.s)
              : map.toHsl.s / source.s),
        )
      : map.toHsl.s;
    return hslToRgb({
      h: hue,
      s: saturation,
      l: isColorProp ? clampLightness(lightness, target.l) : lightness,
    });
  }

  // 近黑 / 近白：只有「响亮的部件」才参与替换，避免把正文黑字整篇染色
  if (!map.loud || alpha < 1) return null;
  if (isColorProp) return map.text && lightBackground && target.l < 0.3 ? tintAt(map, target.l) : null;
  return target.l < 0.97 ? hslToRgb({ h: map.toHsl.h, s: map.toHsl.s, l: target.l }) : null;
}

function hasDarkBackground(style: string): boolean {
  return style.split(';').some((declaration) => {
    const colon = declaration.indexOf(':');
    if (colon < 0 || !/^\s*background/i.test(declaration.slice(0, colon))) return false;
    return (declaration.slice(colon + 1).match(COLOR_TOKEN) ?? []).some(
      (token) => token[0] === '#' && rgbToHsl(hexToRgb(token)).l < 0.9,
    );
  });
}

function recolorStyle(style: string, map: ColorMap, lightBackground: boolean): string {
  return style
    .split(';')
    .map((declaration) => {
      const colon = declaration.indexOf(':');
      if (colon < 0) return declaration;
      const isColorProp = declaration.slice(0, colon).trim().toLowerCase() === 'color';
      const value = declaration.slice(colon + 1).replace(COLOR_TOKEN, (token) => {
        let rgb: RGB;
        let alpha = 1;
        if (token[0] === '#') {
          rgb = hexToRgb(token);
        } else {
          const values = token.slice(token.indexOf('(') + 1, -1).split(',').map(Number);
          if (values.length < 3 || values.some(Number.isNaN)) return token;
          rgb = [values[0], values[1], values[2]];
          alpha = values[3] ?? 1;
        }
        const mapped = remapColor(rgb, alpha, isColorProp, lightBackground, map);
        return mapped ? rgbToCss(mapped, alpha) : token;
      });
      return declaration.slice(0, colon + 1) + value;
    })
    .join(';');
}

/** 与预览渲染等价：把用户挑的颜色按主题原色重映射后写回内联样式 */
export function applyColorOverrides(root: Element, accent: string, overrides: ColorOverrides): void {
  const main = isHexColor(overrides.main) ? overrides.main : '';
  const parts = overrides.parts ?? {};
  const cache = new Map<string, ColorMap | null>();

  const mapperFor = (partId: string | null): ColorMap | null => {
    const explicitColor = partId && parts[partId] && isHexColor(parts[partId]) ? parts[partId] : '';
    const target = explicitColor || main;
    if (!target) return null;
    const key = `${partId}|${explicitColor ? 1 : 0}`;
    if (!cache.has(key)) cache.set(key, createMapper(accent, target, partId, Boolean(explicitColor)));
    return cache.get(key) ?? null;
  };

  const nodes = [root, ...Array.from(root.querySelectorAll('[style]'))];
  for (const node of nodes) {
    const style = node.getAttribute('style');
    if (!style || node.closest('pre')) continue;

    const ownPart = node.getAttribute('data-part-self');
    const inheritedPart = node.closest('[data-part]')?.getAttribute('data-part') ?? null;
    const partId = ownPart ?? inheritedPart;
    const map = mapperFor(partId);
    if (!map) continue;

    // 深色底（终端/霓虹等）上的文字需要反向提亮
    let lightBackground = true;
    if (map.text) {
      const boundary = node.closest('[data-part]');
      for (let cursor: Element | null = node; cursor && lightBackground; cursor = cursor === boundary ? null : cursor.parentElement) {
        lightBackground = !hasDarkBackground(cursor.getAttribute('style') ?? '');
      }
    }

    node.setAttribute('style', recolorStyle(style, map, lightBackground));
  }
}
