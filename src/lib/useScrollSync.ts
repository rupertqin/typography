import { useRef } from 'react';
import type { RefObject } from 'react';

interface ScrollSyncOptions {
  /** 编辑区 textarea */
  editorRef: RefObject<HTMLTextAreaElement | null>;
  /** 预览区滚动容器 */
  previewRef: RefObject<HTMLElement | null>;
  /** 状态栏开关 */
  enabled: boolean;
}

export interface ScrollSyncHandlers {
  onEditorScroll: () => void;
  onPreviewScroll: () => void;
}

type Side = 'editor' | 'preview';

/** 0~1 的滚动进度；内容不足以滚动时算 0，避免除零 */
function progress(node: HTMLElement): number {
  const range = node.scrollHeight - node.clientHeight;
  if (range <= 0) return 0;
  return Math.min(1, Math.max(0, node.scrollTop / range));
}

const raf: (callback: () => void) => number =
  typeof requestAnimationFrame === 'function'
    ? (callback) => requestAnimationFrame(callback)
    : (callback) => setTimeout(callback, 16) as unknown as number;

const cancelRaf: (handle: number) => void =
  typeof cancelAnimationFrame === 'function'
    ? (handle) => cancelAnimationFrame(handle)
    : (handle) => clearTimeout(handle);

/** 对齐误差：小于这个值就当已经到位，不写 scrollTop（避免 1px 抖动和死循环） */
const EPSILON = 1.5;

/**
 * 编辑区 / 预览区双向滚动同步（按已滚比例对齐）。
 *
 * 顺滑的关键有两点，都是照 doocs 的做法：
 * 1. **用「上次写入的目标位置」识别回声，而不是时间窗锁**。浏览器把程序化
 *    scrollTop 的回声事件推迟到下一帧才派发，用 rAF 解锁会漏（锁已解、回声才到），
 *    于是两侧互相写、看起来一顿一顿。这里改为：写入前记下目标值，对侧下一
 *    次事件若位置与目标相差 < 1.5px 就判定为回声并丢弃。用户真正滚动时位置不同，
 *    不会被误吞。
 * 2. **每帧只写一次**。滚动事件可能一帧来好几次，全部塞进 rAF 里合并，
 *    避免一帧内反复读 scrollHeight / 写 scrollTop 触发布局抖动。
 */
export function useScrollSync({ editorRef, previewRef, enabled }: ScrollSyncOptions): ScrollSyncHandlers {
  /**
   * 程序化写入过的目标位置（按侧记）。留最近几个而不是只留一个：
   * 连续快速滚动时，回声可能晚一两帧才到、顺序也可能被打乱，只比一个值会漏判，
   * 漏判的那一次就会被当成用户滚动，从而回写、拉扯。
   */
  const pending = useRef<{ side: Side; tops: number[] } | null>(null);
  /** 本帧待处理的源（每帧只处理最后一次滚动） */
  const queued = useRef<Side | null>(null);
  const frame = useRef<number | null>(null);

  const flush = () => {
    frame.current = null;
    const side = queued.current;
    queued.current = null;
    if (!side || !enabled) return;

    const editor = editorRef.current;
    const preview = previewRef.current;
    if (!editor || !preview) return;

    const source = side === 'editor' ? editor : preview;
    const target = side === 'editor' ? preview : editor;
    const targetSide: Side = side === 'editor' ? 'preview' : 'editor';

    const range = target.scrollHeight - target.clientHeight;
    if (range <= 0) return;

    const top = progress(source) * range;
    if (Math.abs(target.scrollTop - top) < EPSILON) return;

    if (!pending.current || pending.current.side !== targetSide) {
      pending.current = { side: targetSide, tops: [] };
    }
    pending.current.tops.push(top);
    if (pending.current.tops.length > 4) pending.current.tops.shift();

    target.scrollTop = top;
  };

  const handleScroll = (side: Side) => {
    if (!enabled) return;

    const editor = editorRef.current;
    const preview = previewRef.current;
    if (!editor || !preview) return;

    const source = side === 'editor' ? editor : preview;
    const last = pending.current;
    if (last && last.side === side) {
      const hit = last.tops.findIndex((top) => Math.abs(source.scrollTop - top) < EPSILON);
      if (hit >= 0) {
        // 这一下是我们自己写的，别回写回去
        last.tops.splice(hit, 1);
        return;
      }
    }
    pending.current = null;

    queued.current = side;
    if (frame.current === null) frame.current = raf(flush);
  };

  return {
    onEditorScroll: () => handleScroll('editor'),
    onPreviewScroll: () => handleScroll('preview'),
  };
}
