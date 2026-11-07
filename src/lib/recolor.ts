import { COLOR_PARTS } from './constants';
import type { ColorOverrides } from './types';
import type { Theme } from './themes/theme';

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

/**
 * 背景色的前景文字：浅底用深字、深底用白字。
 * 色板对勾、彩色按钮的文字色共用这一套亮度判断。
 *
 * 支持 hex 与 rgb()/rgba()：半透明底色（主题的引用浅底就是 rgba）按白底叠色算，
 * 否则 rgba(217,70,111,0.06) 会被当成深色、配出一行看不见的白字。
 */
export function readableInk(color: string): string {
  const text = color.trim();
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(text);
  let channels: [number, number, number, number] | null = null;
  if (hex) {
    const [r, g, b] = hexToRgb(`#${hex[1].slice(0, 6)}`);
    channels = [r, g, b, hex[1].length === 8 ? parseInt(hex[1].slice(6), 16) / 255 : 1];
  } else {
    const parts = /^rgba?\(([^)]+)\)$/i.exec(text)?.[1].split(',').map((part) => Number(part.trim()));
    if (parts && parts.length >= 3 && parts.slice(0, 3).every((value) => !Number.isNaN(value))) {
      channels = [parts[0], parts[1], parts[2], parts[3] ?? 1];
    }
  }
  if (!channels) return '#ffffff';
  const [r, g, b, alpha] = channels;
  const luma = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  const onWhite = luma * alpha + (1 - alpha);
  return onWhite > 0.62 ? '#18181b' : '#ffffff';
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

  // 主题主色本身（含它的 rgba 浅底）直接换成用户选的色值：
  // 走下面的 HSL 重映射会被 clampLightness 按原主色的明度钳回去，
  // 浅色主色（如樱花粉 #ffb7c5）就会被算成大红 #ff5072。
  if (rgb.every((value, index) => value === map.from[index])) return map.to;

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

/** 内联样式里某个声明的值（只取第一个；-webkit-text-fill-color 之类不算） */
export function styleValue(style: string, prop = 'color'): string {
  for (const declaration of style.split(';')) {
    const colon = declaration.indexOf(':');
    if (colon < 0) continue;
    if (declaration.slice(0, colon).trim().toLowerCase() !== prop) continue;
    const value = declaration.slice(colon + 1).trim();
    if (value) return value;
  }
  return '';
}

/**
 * 某处「跟随主题」时当前实际的颜色，和预览走同一套重映射。
 *
 * 调用方都是白纸上的展示位（编辑区高亮层、设置面板的按钮），所以固定按浅色背景换算：
 * 换主题取主题自己的颜色，换主色、单独调色时跟着变，按钮底色不会停在模板原色上。
 *
 * @param key 主题样式键（strong / link / blockquote …）
 * @param partId 可单独调色的部件 id，与 COLOR_PARTS 一致
 * @param prop 取哪个声明：文字取 color，底色取 background
 */
export function resolveThemeColor(
  theme: Theme,
  key: string,
  partId: string,
  overrides?: ColorOverrides,
  prop = 'color',
): string {
  const base = theme.styles[key] ?? '';
  const partValue = overrides?.parts?.[partId];
  const explicit = partValue && isHexColor(partValue) ? partValue : '';
  const main = isHexColor(overrides?.main) ? (overrides?.main as string) : '';
  const target = explicit || main;
  const fallback = styleValue(base, prop) || (prop === 'color' ? theme.accent : '');
  if (!target) return fallback;
  const mapped = recolorStyle(base, createMapper(theme.accent, target, partId, Boolean(explicit)), true);
  return styleValue(mapped, prop) || target;
}

/** 编辑区高亮层的加粗色：`**粗体**` 在预览里是什么色，编辑区就是什么色 */
export function resolveStrongColor(theme: Theme, overrides?: ColorOverrides): string {
  return resolveThemeColor(theme, 'strong', 'strong', overrides);
}
