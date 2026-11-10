import { useRef } from 'react';
import type { RefObject } from 'react';

interface ScrollSyncOptions {
  /** 编辑区 textarea */
  editorRef: RefObject<HTMLTextAreaElement | null>;
  /** 编辑区高亮层：与 textarea 同字同宽、同折行，用来把源码行号换算成像素位置 */
  layerRef: RefObject<HTMLPreElement | null>;
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

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/**
 * 滚动容器内容坐标的零点（视口顶边减去已滚距离）。
 * 用它换算出来的 y **与容器当前滚到哪无关**，所以不用等两侧滚动位置同步就能量。
 */
function contentBase(scrollNode: HTMLElement): number {
  return scrollNode.getBoundingClientRect().top - scrollNode.scrollTop;
}

/**
 * 对齐锚点：两侧各自「某个源码行 / 对应预览块」顶到视口上沿时的滚动位置。
 *
 * 只按已滚比例对齐时，源码和排版的高度分布差得很远（代码块、图片位置、标题的行数都不一样），
 * 滚到中段就会越走越偏——用户看到的正是「两边不同步，差了挺远」。
 * 这里改成按块对块：预览的每个顶层块都带 `data-src-line`（见 lib/markdown.ts），
 * 源码行在编辑区高亮层里的位置可以直接量出来，于是两侧就有了成对的坐标系，中间按比例插值。
 */
interface Anchors {
  /** 编辑区侧（scrollTop 空间） */
  editor: number[];
  /** 预览侧 */
  preview: number[];
}

function collectAnchors(layer: HTMLElement | null, preview: HTMLElement): Anchors | null {
  if (!layer) return null;
  const blocks = preview.querySelectorAll<HTMLElement>('[data-src-line]');
  if (blocks.length < 2) return null;

  const editor: number[] = [];
  const target: number[] = [];
  // 高亮层每行是一个 span，正好可以用行号直接索引，省掉 N 次 querySelector
  const lines = layer.children;
  const editorBase = contentBase(layer);
  const previewBase = contentBase(preview);

  blocks.forEach((block) => {
    const line = Number(block.dataset.srcLine);
    if (!Number.isInteger(line) || line < 1) return;
    const lineNode = lines[line - 1] as HTMLElement | undefined;
    if (!lineNode) return;

    // 空行在浏览器里没有盒，量出来是全 0，会算出个乱值——直接跳过
    const sourceRect = lineNode.getBoundingClientRect();
    if (!sourceRect.height) return;

    const editorY = sourceRect.top - editorBase;
    const previewY = block.getBoundingClientRect().top - previewBase;
    const last = editor.length - 1;
    // 两侧都必须严格递增：块被主题装饰替换、或被折叠时会出现交叉，会把内容往回拉
    if (last >= 0 && (editorY <= editor[last] || previewY <= target[last])) return;
    editor.push(editorY);
    target.push(previewY);
  });

  return editor.length >= 2 ? { editor, preview: target } : null;
}

/**
 * 把一侧的滚动位置换算到另一侧。
 * 锚点之外的两头按剩余区间摊（滚到底时两侧一起见底），锚点之间线性插值。
 */
function mapPosition(value: number, from: number[], to: number[], fromRange: number, toRange: number): number {
  const last = from.length - 1;

  if (value <= from[0]) {
    const ratio = from[0] > 0 ? value / from[0] : 0;
    return clamp(to[0] * ratio, 0, toRange);
  }

  if (value >= from[last]) {
    const span = fromRange - from[last];
    const ratio = span > 0 ? (value - from[last]) / span : 0;
    return clamp(to[last] + (toRange - to[last]) * ratio, 0, toRange);
  }

  for (let index = 0; index < last; index += 1) {
    const next = index + 1;
    if (value > from[next]) continue;
    const span = from[next] - from[index];
    const ratio = span > 0 ? (value - from[index]) / span : 0;
    return clamp(to[index] + (to[next] - to[index]) * ratio, 0, toRange);
  }

  return clamp(to[last], 0, toRange);
}

/**
 * 编辑区 / 预览区双向滚动同步（按内容锚点对齐）。
 *
 * 顺滑的关键有三点，前两条照 doocs 的做法：
 * 1. **用「上次写入的目标位置」识别回声，而不是时间窗锁**。浏览器把程序化
 *    scrollTop 的回声事件推迟到下一帧才派发，用 rAF 解锁会漏（锁已解、回声才到），
 *    于是两侧互相写、看起来一顿一顿。这里改为：写入前记下目标值，对侧下一
 *    次事件若位置与目标相差 < 1.5px 就判定为回声并丢弃。用户真正滚动时位置不同，
 *    不会被误吞。
 * 2. **每帧只写一次**。滚动事件可能一帧来好几次，全部塞进 rAF 里合并，
 *    避免一帧内反复读 scrollHeight / 写 scrollTop 触发布局抖动。
 * 3. **对齐按内容而不是按比例**，见 collectAnchors：量不到锚点（极短文档、
 *    无布局环境）时才退回按已滚比例。
 */
export function useScrollSync({ editorRef, layerRef, previewRef, enabled }: ScrollSyncOptions): ScrollSyncHandlers {
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

    const fromEditor = side === 'editor';
    const source: HTMLElement = fromEditor ? editor : preview;
    const target: HTMLElement = fromEditor ? preview : editor;
    const targetSide: Side = fromEditor ? 'preview' : 'editor';

    const targetRange = target.scrollHeight - target.clientHeight;
    if (targetRange <= 0) return;
    const sourceRange = Math.max(0, source.scrollHeight - source.clientHeight);

    const anchors = collectAnchors(layerRef.current, preview);
    const mapped = anchors
      ? fromEditor
        ? mapPosition(editor.scrollTop, anchors.editor, anchors.preview, sourceRange, targetRange)
        : mapPosition(preview.scrollTop, anchors.preview, anchors.editor, sourceRange, targetRange)
      : null;
    const top = mapped ?? progress(source) * targetRange;
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
