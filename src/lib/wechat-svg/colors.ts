/**
 * SVG 复制到公众号时的颜色工具。
 * 移植自 doocs/md 的 wechat-svg.ts（MIT），只保留 Mermaid 需要的部分。
 */

type RGB = [number, number, number];

/**
 * 解析 #rgb / #rrggbb / rgb() / rgba() / 具名黑白。
 * currentColor、none、url(...) 解析不了，返回 null——它们不该被当成实色写死。
 */
export function parseCssColor(value: string | null | undefined): RGB | null {
  const raw = (value ?? '').trim().toLowerCase();
  if (!raw || raw === 'none' || raw === 'currentcolor' || raw === 'transparent' || raw.startsWith('url(')) return null;
  if (raw === 'black') return [0, 0, 0];
  if (raw === 'white') return [255, 255, 255];

  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/.exec(raw);
  if (hex) {
    const body = hex[1];
    if (body.length === 3) {
      return [
        Number.parseInt(body[0] + body[0], 16),
        Number.parseInt(body[1] + body[1], 16),
        Number.parseInt(body[2] + body[2], 16),
      ];
    }
    return [
      Number.parseInt(body.slice(0, 2), 16),
      Number.parseInt(body.slice(2, 4), 16),
      Number.parseInt(body.slice(4, 6), 16),
    ];
  }

  const rgb = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/.exec(raw);
  if (rgb) {
    return [
      Math.min(255, Number.parseFloat(rgb[1])),
      Math.min(255, Number.parseFloat(rgb[2])),
      Math.min(255, Number.parseFloat(rgb[3])),
    ];
  }

  return null;
}

export function relativeLuminance([r, g, b]: RGB): number {
  const toLinear = (channel: number) => {
    const ratio = channel / 255;
    return ratio <= 0.03928 ? ratio / 12.92 : ((ratio + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/** 近灰 = 文字/默认连线；彩色（节点描边之类）不算 */
export function isNearGrayscale([r, g, b]: RGB): boolean {
  return Math.max(r, g, b) - Math.min(r, g, b) <= 24;
}

/**
 * 深灰墨色（文字与默认连线）。微信暗色模式下会变得看不见，需要换成 currentColor；
 * 彩色描边保持原样。
 */
export function isDarkInkColor(value: string | null | undefined): boolean {
  const rgb = parseCssColor(value);
  if (!rgb || !isNearGrayscale(rgb)) return false;
  return relativeLuminance(rgb) < 0.35;
}

/** 渐变转实色：微信会丢掉 defs 与 id，url(#gradient) 直接变成不绘制 */
export function mixCssColors(a: string, b: string): string | null {
  const first = parseCssColor(a);
  const second = parseCssColor(b);
  if (!first) return second ? b : null;
  if (!second) return a;
  return `rgb(${Math.round((first[0] + second[0]) / 2)}, ${Math.round((first[1] + second[1]) / 2)}, ${Math.round(
    (first[2] + second[2]) / 2,
  )})`;
}

export function isUsablePaint(value: string | null | undefined): value is string {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized !== '' && normalized !== 'none' && !normalized.includes('url(');
}

export function isNonePaint(value: string | null | undefined): boolean {
  return Boolean(value) && (value as string).trim().toLowerCase() === 'none';
}

export function isTransparentPaint(value: string | null | undefined): boolean {
  const normalized = (value ?? '').trim().toLowerCase();
  return (
    normalized === '' ||
    normalized === 'transparent' ||
    normalized === 'none' ||
    /^rgba\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\s*\)$/.test(normalized)
  );
}
