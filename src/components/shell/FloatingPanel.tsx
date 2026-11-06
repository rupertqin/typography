import type { CSSProperties, PointerEvent as ReactPointerEvent, ReactNode, RefObject } from 'react';
import { createPortal } from 'react-dom';
import { GripHorizontal, Locate, X } from 'lucide-react';

export interface DragPosition {
  x: number;
  y: number;
}

interface FloatingPanelProps {
  title: string;
  hint: string;
  /** inline：贴在按钮下方的整宽浮层（移动端 / 面板内的按钮）；anchored：右上角固定宽度，可拖走 */
  variant: 'inline' | 'anchored';
  dragPos: DragPosition | null;
  onDragStart: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onResetPosition: () => void;
  onClose: () => void;
  containerRef?: RefObject<HTMLDivElement | null>;
  children: ReactNode;
}

const CARD = 'flex max-h-[min(68vh,560px)] flex-col rounded-xl bg-white ring-1 ring-zinc-200';

/**
 * 可拖拽浮层的唯一实现：配色面板与排版面板共用。
 * 拖走时用 portal 挂到 body，避免被预览区的 overflow 裁掉。
 */
export default function FloatingPanel({
  title,
  hint,
  variant,
  dragPos,
  onDragStart,
  onResetPosition,
  onClose,
  containerRef,
  children,
}: FloatingPanelProps) {
  const header = (
    <div
      onPointerDown={variant === 'anchored' ? onDragStart : undefined}
      className={`flex shrink-0 select-none items-center gap-1.5 border-b border-zinc-100 py-1.5 pl-3 pr-1.5 ${
        variant === 'anchored' ? 'cursor-move' : ''
      }`}
    >
      {variant === 'anchored' && <GripHorizontal size={14} className="text-zinc-300" />}
      <span className="text-sm font-medium text-zinc-700">{title}</span>
      <span className="truncate text-[11px] text-zinc-400">
        {variant === 'anchored' && dragPos ? '按住标题栏可继续拖动' : hint}
      </span>
      <span
        className="ml-auto flex shrink-0 items-center"
        onPointerDown={(event) => event.stopPropagation()}
      >
        {dragPos && (
          <button
            type="button"
            onClick={onResetPosition}
            className="rounded px-1.5 py-0.5 text-[11px] text-zinc-400 hover:text-emerald-700"
            title="放回按钮下方"
          >
            <Locate size={13} />
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-zinc-400 hover:text-zinc-700"
          title="关闭（Esc）"
          aria-label={`关闭${title}面板`}
        >
          <X size={14} />
        </button>
      </span>
    </div>
  );

  const card = (extraClass: string, style?: CSSProperties) => (
    <div ref={containerRef} style={style} className={`${CARD} ${extraClass}`}>
      {header}
      {children}
    </div>
  );

  if (variant === 'inline') return card('absolute left-0 right-0 top-full z-20 mt-2 shadow-xl');

  if (!dragPos) return card('absolute right-0 top-full z-20 mt-2 w-[min(440px,calc(100vw-3rem))] shadow-xl');

  return createPortal(
    card('fixed z-50 w-[min(440px,calc(100vw-3rem))] shadow-2xl', { left: dragPos.x, top: dragPos.y }),
    document.body,
  );
}
