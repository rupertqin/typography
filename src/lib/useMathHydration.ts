import { useEffect } from 'react';
import type { RefObject } from 'react';
import { MATH_ATTR, MATH_DISPLAY_ATTR, MATH_STATE_ATTR, decodeMath, renderMath } from './math-render';

interface Options {
  /** 正文 HTML：每次重渲染 DOM 都会被替换，占位需要重新水化 */
  revision: string;
}

/**
 * 把公式占位水化成 SVG。
 *
 * 与 Mermaid 同一套做法：状态只写在 DOM 上（data-state），写回 innerHTML 不触发重渲染，
 * 避免「渲染 → state 变 → 重渲染 → 又渲染」的循环。MathJax 在首次出现公式时才动态加载，
 * 加载期间占位里显示的是公式源码。
 */
export function useMathHydration(rootRef: RefObject<HTMLElement | null>, { revision }: Options) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const targets = Array.from(root.querySelectorAll<HTMLElement>(`[${MATH_ATTR}]`));
    if (targets.length === 0) return;

    let cancelled = false;

    for (const node of targets) {
      const state = node.getAttribute(MATH_STATE_ATTR);
      // 状态是 ready 但里面没有 svg（DOM 被替换/搬动过）时也要重画
      if (state === 'rendering' || (state === 'ready' && node.querySelector('svg'))) continue;

      const tex = decodeMath(node.getAttribute(MATH_ATTR));
      if (!tex) continue;

      const display = node.getAttribute(MATH_DISPLAY_ATTR) === '1';
      node.setAttribute(MATH_STATE_ATTR, 'rendering');
      renderMath(tex, display).then((result) => {
        if (cancelled || !node.isConnected) return;
        if (result.ok) {
          node.innerHTML = result.svg;
          node.setAttribute(MATH_STATE_ATTR, 'ready');
          return;
        }
        node.textContent = result.message;
        node.setAttribute(MATH_STATE_ATTR, 'error');
      });
    }

    return () => {
      cancelled = true;
    };
  }, [rootRef, revision]);
}
