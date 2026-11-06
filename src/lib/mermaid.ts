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

/**
 * dev 下 Vite 重新预构建依赖会让旧的 `?v=hash` 404，表现成
 * "Failed to fetch dynamically imported module"——这是加载失败，不是图表语法错。
 * 这类错误重试一次通常就能拿到新的 chunk。
 */
const IMPORT_FAILURE = /dynamically imported module|module script failed|networkerror|load failed|err_failed/i;

function isImportFailure(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return IMPORT_FAILURE.test(message);
}

function loadMermaid(attempt = 0): Promise<MermaidApi> {
  if (!loader) {
    loader = import('mermaid')
      .then((module) => module.default)
      .catch((error: unknown) => {
        loader = null;
        throw error;
      });
  }

  return loader.catch((error: unknown) => {
    if (attempt > 0 || !isImportFailure(error)) throw error;
    return new Promise((resolve) => setTimeout(resolve, 300)).then(() => loadMermaid(attempt + 1));
  });
}

/**
 * 与 doocs-md 对齐：用 mermaid 内置的 `default` 主题。
 *
 * 之前用 `base` 手工配色（主色 12% 透明度做底、主色描边），节点几乎是白底灰边，
 * 一张流程图看起来像黑白稿。`default` 自带淡紫/淡黄节点 + 紫色边框 + 深灰连线，
 * 层次和参考实现一致；这里只换字体（跟随文章正文字体），不覆盖调色板。
 */
function themeConfig(fontFamily: string) {
  return {
    startOnLoad: false,
    securityLevel: 'strict' as const,
    theme: 'default' as const,
    themeVariables: {
      darkMode: false,
      fontFamily: fontFamily || 'PingFang SC, Microsoft YaHei, sans-serif',
    },
    // 300 能容纳一行中英混排；默认 120 会把标签过早折行（doocs 用的也是 300）
    flowchart: { htmlLabels: false, useMaxWidth: true, wrappingWidth: 300 },
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
  /** 图表已改用 mermaid 内置调色板，主色不再影响出图；保留字段是为了不牵动调用方 */
  accent?: string;
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
  // 缓存键只含「源码 + 字体」：配色不再随文章主色变化，换主色不该重排图
  const key = `${fontFamily}\u0000${code}`;

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
      mermaid.initialize(themeConfig(fontFamily));
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
      // 加载失败和语法错误要给不同提示，否则用户会去改根本没写错的图表
      if (isImportFailure(error)) {
        return { ok: false, message: '图表组件加载失败：刷新页面即可恢复（本地开发改过依赖后需重启 dev server）' };
      }
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
