/** 占位元素标记：源码藏在 data 属性里，DOM 落盘后再水化成 SVG */
export const MATH_ATTR = 'data-math';
export const MATH_STATE_ATTR = 'data-state';
/** '1' 表示块级公式（独占一行、居中） */
export const MATH_DISPLAY_ATTR = 'data-display';
export const MATH_CLASS = 'md-math';
export const MATH_BLOCK_CLASS = 'md-math-block';
/** 公式还没算出来时的兜底文案（正常情况下占位里放的是公式源码） */
export const MATH_LOADING_TEXT = '公式渲染中…';

export const MATH_BLOCK_STYLE = 'text-align:center;margin:1.2em 0;';

export function encodeMath(tex: string): string {
  return encodeURIComponent(tex);
}

export function decodeMath(value: string | null | undefined): string {
  if (!value) return '';
  try {
    return decodeURIComponent(value);
  } catch {
    return '';
  }
}

export type MathRenderResult = { ok: true; svg: string } | { ok: false; message: string };

/** 一条文章里的公式数量通常不多，但要能覆盖「整篇重渲染时命中缓存」 */
const CACHE_LIMIT = 400;
const svgCache = new Map<string, string>();
/** 同一公式并发渲染时只算一次（编辑时整篇重渲染会同时挂上多个相同占位） */
const pending = new Map<string, Promise<MathRenderResult>>();

let loader: Promise<typeof import('./math-loader')> | null = null;

function loadConverter() {
  loader ??= import('./math-loader').catch((error: unknown) => {
    loader = null;
    throw error;
  });
  return loader;
}

/** 从 MathJax 的 `<mjx-container>` 里取出 `<svg>`，并改造成能贴着正文排版的形态 */
function toFigure(markup: string): string | null {
  const svg = /<svg[\s\S]*?<\/svg>/.exec(markup)?.[0];
  if (!svg) return null;

  // 宽度单位是 ex，跟着正文字号走；把 width 属性改写成 style，才能再加一条上限
  const width = /width="([^"]+)"/.exec(svg)?.[1] ?? '';
  const withoutWidth = svg.replace(/\swidth="[^"]*"/, '');
  const sized = withoutWidth.replace(
    /<svg([^>]*?)style="/,
    `<svg$1fill="currentColor" stroke="currentColor" style="max-width:300vw;flex-shrink:0;${
      width ? `width:${width};` : ''
    }`,
  );

  return sized.endsWith('</svg>') ? sized : null;
}

function remember(key: string, svg: string) {
  svgCache.set(key, svg);
  if (svgCache.size > CACHE_LIMIT) {
    const oldest = svgCache.keys().next().value;
    if (oldest !== undefined) svgCache.delete(oldest);
  }
}

/**
 * 公式 → 自包含的 SVG 字符串。
 *
 * 结果按「源码 + 行内/块级」缓存：编辑时整篇重渲染，未改动的公式不该重新排版。
 * 失败返回可读文案而不是抛异常——预览里要能显示出来。
 */
export function renderMath(tex: string, display: boolean): Promise<MathRenderResult> {
  const source = tex.trim();
  if (!source) return Promise.resolve({ ok: false, message: '公式内容为空' });

  const key = `${display ? '1' : '0'}\u0000${source}`;

  const cached = svgCache.get(key);
  if (cached) {
    // 命中后挪到末尾，维持 LRU 顺序
    svgCache.delete(key);
    svgCache.set(key, cached);
    return Promise.resolve({ ok: true, svg: cached });
  }

  const running = pending.get(key);
  if (running) return running;

  const task = loadConverter()
    .then(({ createMathConverter }) => {
      const svg = toFigure(createMathConverter()(source, display));
      return svg
        ? ({ ok: true, svg } as MathRenderResult)
        : ({ ok: false, message: '公式渲染为空，请检查语法' } as MathRenderResult);
    })
    .catch((error: unknown): MathRenderResult => {
      const detail = error instanceof Error ? error.message : String(error);
      console.warn('[math] 渲染失败', error);
      return { ok: false, message: `公式语法有误：${detail.split('\n')[0] || '无法解析'}` };
    })
    .finally(() => {
      pending.delete(key);
    });

  pending.set(key, task);
  return task;
}

/** 复制前判断是否还有公式在渲染 */
export function isMathPending(node: HTMLElement): boolean {
  return node.getAttribute(MATH_STATE_ATTR) !== 'ready';
}
