import { rgbaFromHex } from './recolor';

/** 占位元素的标记：源码藏在 data 属性里，DOM 落盘后再水化成 SVG */
export const MERMAID_ATTR = 'data-mermaid';
export const MERMAID_STATE_ATTR = 'data-state';
export const MERMAID_CLASS = 'md-mermaid';

export const MERMAID_LOADING_TEXT = '图表渲染中…';

export function encodeMermaid(code: string): string {
  return encodeURIComponent(code);
}

export function decodeMermaid(value: string | null | undefined): string {
  if (!value) return '';
  try {
    return decodeURIComponent(value);
  } catch {
    return '';
  }
}

type MermaidApi = typeof import('mermaid')['default'];

const CACHE_LIMIT = 30;
const svgCache = new Map<string, string>();
/** 同一张图并发渲染会互相量到对方的临时元素，产出没有 viewBox 的坏图，必须去重 */
const pending = new Map<string, Promise<MermaidRenderResult>>();

export type MermaidRenderResult = { ok: true; svg: string } | { ok: false; message: string };

let loader: Promise<MermaidApi> | null = null;
let renderSeq = 0;

/**
 * mermaid 的 render 会往 document.body 里插临时元素量尺寸，多个 diagram 并发渲染
 * 会互相踩到（实测：流程图拿到空 SVG，其它图则正常）。这里串成一条队列：
 * 一张一张渲染，靠缓存保证「没改的图不重算」。
 */
let renderQueue: Promise<unknown> = Promise.resolve();

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = renderQueue.then(task, task);
  renderQueue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function loadMermaid(): Promise<MermaidApi> {
  loader ??= import('mermaid')
    .then((module) => module.default)
    .catch((error: unknown) => {
      loader = null;
      throw error;
    });
  return loader;
}

/** 极淡的主色底 + 主色描边：图跟着文章主色走，但正文对比度不受影响 */
function themeConfig(accent: string, fontFamily: string) {
  const tint = rgbaFromHex(accent, 0.12) || '#f5f5f5';
  return {
    startOnLoad: false,
    securityLevel: 'strict' as const,
    theme: 'base' as const,
    fontFamily: fontFamily || 'PingFang SC, Microsoft YaHei, sans-serif',
    themeVariables: {
      primaryColor: tint,
      primaryBorderColor: accent,
      primaryTextColor: '#262626',
      secondaryColor: '#f5f5f5',
      secondaryBorderColor: '#d9d9d9',
      tertiaryColor: '#ffffff',
      lineColor: '#333333',
      textColor: '#262626',
      background: '#ffffff',
      edgeLabelBackground: '#ffffff',
    },
    flowchart: { htmlLabels: false, useMaxWidth: true, wrappingWidth: 220 },
    sequence: { useMaxWidth: true },
    gantt: { useMaxWidth: true },
  };
}

function remember(key: string, svg: string) {
  svgCache.set(key, svg);
  if (svgCache.size > CACHE_LIMIT) {
    const oldest = svgCache.keys().next().value;
    if (oldest !== undefined) svgCache.delete(oldest);
  }
}

export interface MermaidOptions {
  accent: string;
  fontFamily?: string;
}

/**
 * 渲染成 SVG 字符串。结果按「源码 + 主色」缓存：改一个字时其余图不重排、不闪。
 * 失败返回错误文案而不是抛异常——预览里要显示可读提示。
 */
/** mermaid 依赖 CSSStyleSheet 等浏览器 API；jsdom / SSR 下直接降级，不要抛一堆错 */
function canRender(): boolean {
  return typeof document !== 'undefined' && typeof window !== 'undefined' && typeof CSSStyleSheet !== 'undefined';
}

export function renderMermaid(code: string, options: MermaidOptions): Promise<MermaidRenderResult> {
  if (!canRender()) {
    return Promise.resolve({ ok: false, message: '当前环境不支持图表渲染' });
  }

  const fontFamily = options.fontFamily ?? '';
  const key = `${options.accent}\u0000${fontFamily}\u0000${code}`;

  const cached = svgCache.get(key);
  if (cached) {
    svgCache.delete(key);
    svgCache.set(key, cached);
    return Promise.resolve({ ok: true, svg: cached });
  }

  const running = pending.get(key);
  if (running) return running;

  const task = enqueue(() => {
    renderSeq += 1;
    const id = `md-mermaid-${renderSeq}`;
    return loadMermaid().then((mermaid) => {
      mermaid.initialize(themeConfig(options.accent, fontFamily));
      return mermaid.render(id, code);
    });
  })
    .then((result): MermaidRenderResult => {
      // 并发踩踏会产出「有 svg 但没内容」的空图，当成失败更安全
      if (!result.svg || !/<(path|rect|circle|line|polygon|text|g|image)/.test(result.svg)) {
        return { ok: false, message: '图表渲染为空，请检查语法' };
      }
      remember(key, result.svg);
      return { ok: true, svg: result.svg };
    })
    .catch((error: unknown): MermaidRenderResult => {
      const detail = error instanceof Error ? error.message : String(error);
      console.warn('[mermaid] 渲染失败', error);
      return { ok: false, message: `图表语法有误：${detail.split('\n')[0]}` };
    })
    .finally(() => {
      pending.delete(key);
    });

  pending.set(key, task);
  return task;
}

/** 复制前判断是否还有图在渲染 */
export function isMermaidPending(node: HTMLElement): boolean {
  return node.getAttribute(MERMAID_STATE_ATTR) !== 'ready';
}
