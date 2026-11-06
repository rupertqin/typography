import { useEffect } from 'react';
import type { RefObject } from 'react';
import { MERMAID_ATTR, MERMAID_STATE_ATTR, decodeMermaid, renderMermaid } from './mermaid';

interface Options {
  accent: string;
  fontFamily: string;
  /** 正文 HTML：每次重渲染 DOM 都会被替换，占位需要重新水化 */
  revision: string;
}

/**
 * 把占位元素水化成真正的 SVG。
 *
 * 只在 DOM 里留状态（data-state），不进 React state：写回 innerHTML 不触发重渲染，
 * 也就不会出现「渲染 → state 变 → 重渲染 → 又渲染」的循环。
 */
export function useMermaidHydration(rootRef: RefObject<HTMLElement | null>, { accent, fontFamily, revision }: Options) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const targets = Array.from(root.querySelectorAll<HTMLElement>(`[${MERMAID_ATTR}]`));
    if (targets.length === 0) return;

    let cancelled = false;

    for (const node of targets) {
      const state = node.getAttribute(MERMAID_STATE_ATTR);
      // 状态是 ready 但里面没有 svg（DOM 被替换/搬动过）时也要重画
      if (state === 'rendering' || (state === 'ready' && node.querySelector('svg'))) continue;

      const code = decodeMermaid(node.getAttribute(MERMAID_ATTR));
      if (!code) continue;

      node.setAttribute(MERMAID_STATE_ATTR, 'rendering');
      renderMermaid(code, { accent, fontFamily }).then((result) => {
        if (cancelled || !node.isConnected) return;
        if (result.ok) {
          node.innerHTML = result.svg;
          node.setAttribute(MERMAID_STATE_ATTR, 'ready');
          return;
        }
        node.textContent = result.message;
        node.setAttribute(MERMAID_STATE_ATTR, 'error');
      });
    }

    return () => {
      cancelled = true;
    };
  }, [rootRef, accent, fontFamily, revision]);
}
