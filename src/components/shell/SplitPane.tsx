import { useCallback, useRef } from 'react';
import type { ReactNode } from 'react';
import { SPLIT_RATIO_DEFAULT, useTypographyStore } from '../../lib/store';

interface SplitPaneProps {
  editor: ReactNode;
  preview: ReactNode;
  isMobile: boolean;
}

/**
 * 工作区分栏（参考 doocs-md 的可拖拽双层结构）：
 * - viewMode 三态：只显示编辑 / 左右分屏 / 只显示预览；
 * - 分屏时中间有一条可拖拽的分隔条，比例写进 store 持久化，双击回到 50/50；
 * - 窄屏没有左右分屏的余地，退化成上下堆叠（编辑在上、预览在下），分隔条隐藏。
 */
export default function SplitPane({ editor, preview, isMobile }: SplitPaneProps) {
  const viewMode = useTypographyStore((state) => state.viewMode);
  const splitRatio = useTypographyStore((state) => state.splitRatio);
  const setSplitRatio = useTypographyStore((state) => state.setSplitRatio);

  const containerRef = useRef<HTMLDivElement>(null);

  const startDrag = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (event.button !== 0 || !rect) return;
      event.preventDefault();
      const handle = event.currentTarget;
      handle.setPointerCapture?.(event.pointerId);

      const move = (clientX: number) => setSplitRatio(((clientX - rect.left) / rect.width) * 100);
      move(event.clientX);

      const onMove = (moveEvent: PointerEvent) => move(moveEvent.clientX);
      const onUp = () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
      };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    },
    [setSplitRatio],
  );

  const showEditor = viewMode !== 'preview';
  const showPreview = viewMode !== 'edit';
  const sideBySide = !isMobile && viewMode === 'split';

  return (
    <div ref={containerRef} className="relative flex min-h-0 flex-1 flex-col lg:flex-row">
      {showEditor && (
        <div
          className="flex min-h-0 min-w-0 flex-1 flex-col"
          // 窄屏堆叠时两栏平分高度，左右分屏时按比例分宽度（内联 style 覆盖 flex-1）
          style={sideBySide ? { flex: `0 0 ${splitRatio}%` } : undefined}
        >
          {editor}
        </div>
      )}

      {sideBySide && (
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="拖动调整编辑区与预览区宽度"
          aria-valuenow={Math.round(splitRatio)}
          data-split-handle
          onPointerDown={startDrag}
          onDoubleClick={() => setSplitRatio(SPLIT_RATIO_DEFAULT)}
          // 同 doocs：中缝只占 1px（编辑区滚动条因此紧贴竖线），
          // 拖拽热区靠一层绝对定位的透明条向两侧各溢出 4px，不占布局宽度
          className="group relative z-10 flex w-px shrink-0 cursor-col-resize items-stretch justify-center"
          title="拖动调整宽度，双击恢复 50/50"
        >
          <span className="absolute inset-y-0 -left-1 -right-1" aria-hidden />
          <span className="relative w-px bg-zinc-200 transition-colors group-hover:bg-zinc-300" />
        </div>
      )}

      {showPreview && (
        <div
          className={`flex min-h-0 min-w-0 flex-1 flex-col ${
            showEditor && !sideBySide ? 'border-t border-zinc-200' : ''
          }`}
          style={sideBySide ? { flex: '1 1 0' } : undefined}
        >
          {preview}
        </div>
      )}
    </div>
  );
}
