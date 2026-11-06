import { MERMAID_ATTR, MERMAID_STATE_ATTR } from './mermaid';
import { WECHAT_MAX_WIDTH, sanitizeMermaidSvgs } from './wechat-svg';

const HIDDEN_HOST_STYLE = 'position:fixed;left:-99999px;top:0;visibility:hidden;pointer-events:none;z-index:-1';

/** Mermaid 容器在复制时要保留卡片观感，把 class 版样式压成内联 */
const MERMAID_WRAPPER_STYLE =
  'margin:1.2em 0;padding:12px 10px;border:1px solid #e9e9ec;border-radius:8px;background:#fff;text-align:center;';

function diagramNodes(root: ParentNode): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(`[${MERMAID_ATTR}]`));
}

function allReady(root: ParentNode): boolean {
  return diagramNodes(root).every((node) => {
    const state = node.getAttribute(MERMAID_STATE_ATTR);
    return state === 'ready' || state === 'error';
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

/**
 * 等图渲染完再复制。超时也放行（把未完成的图当占位丢掉），不能让按钮一直转圈。
 *
 * 要求连续两拍都就绪：正文用的是 useDeferredValue，编辑后还会再渲染一次、
 * 把占位元素整体换掉；只判一拍会在「刚就绪就被替换」的瞬间放行。
 */
export async function waitForDiagrams(root: ParentNode | null, timeout = 8000): Promise<void> {
  if (!root || diagramNodes(root).length === 0) return;
  const deadline = Date.now() + timeout;
  let stable = 0;

  while (Date.now() < deadline) {
    if (allReady(root)) {
      stable += 1;
      if (stable >= 2) return;
    } else {
      stable = 0;
    }
    await sleep(150);
  }
}

function stripAttributes(scope: ParentNode): void {
  scope.querySelectorAll('*').forEach((node) => {
    Array.from(node.attributes).forEach((attr) => {
      const name = attr.name.toLowerCase();
      if (name.startsWith('data-') || name === 'class' || name === 'contenteditable' || name === 'spellcheck') {
        node.removeAttribute(attr.name);
      }
    });
  });
}

export interface CopyBundle {
  html: string;
  text: string;
  /** 克隆里画好的图数量 */
  diagrams: number;
  /** 还没画完、被丢掉的图数量（>0 说明该重试一次） */
  dropped: number;
}

/**
 * 从活 DOM 克隆出可粘贴的 HTML。
 *
 * 必须克隆而不是用渲染出来的字符串：SVG 只存在于 DOM 里（占位元素在字符串中），
 * 且清洗要用 getComputedStyle / Range 量真实布局——所以克隆到隐藏 host、
 * 宽度对齐预览正文的真实宽度，再清洗、序列化。
 */
export function buildCopyBundle(root: HTMLElement): CopyBundle {
  const width = root.getBoundingClientRect().width || WECHAT_MAX_WIDTH;
  const host = document.createElement('div');
  host.setAttribute('style', `${HIDDEN_HOST_STYLE};width:${Math.round(width)}px`);

  const clone = root.cloneNode(true) as HTMLElement;
  host.appendChild(clone);
  document.body.appendChild(host);

  let diagrams = 0;
  let dropped = 0;

  try {
    // 没画出来的图直接丢掉：留着「图表渲染中…」比缺一张图更糟
    diagramNodes(clone).forEach((node) => {
      const state = node.getAttribute(MERMAID_STATE_ATTR);
      if (state === 'ready') {
        diagrams += 1;
        node.setAttribute('style', MERMAID_WRAPPER_STYLE);
      } else {
        dropped += 1;
        node.remove();
      }
    });

    sanitizeMermaidSvgs(clone, WECHAT_MAX_WIDTH);
    stripAttributes(clone);

    const text = clone.innerText ?? clone.textContent ?? '';
    return { html: clone.outerHTML, text, diagrams, dropped };
  } finally {
    host.remove();
  }
}

/**
 * 等图 → 克隆 → 有图被丢掉再等一次。
 * 编辑后立刻复制时正文可能正好在重渲染，占位会被换掉，所以允许重试一拍。
 */
export async function buildCopyBundleWhenReady(
  root: HTMLElement | null,
  fallback: CopyBundle,
): Promise<CopyBundle> {
  if (!root) return fallback;

  await waitForDiagrams(root);
  let bundle = buildCopyBundle(root);

  if (bundle.dropped > 0) {
    await waitForDiagrams(root);
    bundle = buildCopyBundle(root);
  }

  return bundle;
}
