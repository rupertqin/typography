import { FileText, Images, X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import type { FolderMarkdown, FolderScan } from '../../lib/folder-import';

interface FolderImportDialogProps {
  /** 文件夹里有多篇 md 时才需要它来选；为空表示不显示 */
  scan: FolderScan | null;
  busy: boolean;
  onPick: (entry: FolderMarkdown) => void;
  onClose: () => void;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * 导入文件夹时，如果里面不止一篇 Markdown，就让用户挑一篇再导。
 * 只有一篇时直接导，不弹这个框。
 */
export default function FolderImportDialog({ scan, busy, onPick, onClose }: FolderImportDialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!scan) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    const timer = window.setTimeout(() => {
      panelRef.current?.querySelector<HTMLElement>('button:not(:disabled)')?.focus();
    }, 0);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      window.clearTimeout(timer);
    };
  }, [scan, onClose]);

  if (!scan) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-zinc-900/30 p-4 backdrop-blur-[2px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="folder-import-title"
        className="flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-[0_24px_64px_rgba(24,24,27,0.24)]"
      >
        <div className="flex items-start gap-3 border-b border-zinc-200 px-4 py-3.5">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[var(--ui-primary)] text-white">
            <FileText size={15} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="folder-import-title" className="text-sm font-semibold text-zinc-900">
              选择要导入的文章
            </h2>
            <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-zinc-500">
              <span className="truncate">{scan.folderName}</span>
              <span aria-hidden>·</span>
              <span className="shrink-0">{scan.markdowns.length} 篇</span>
              <span aria-hidden>·</span>
              <span className="flex shrink-0 items-center gap-0.5">
                <Images size={11} />
                {scan.images.length} 张图
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭"
            className="rounded-md p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
          >
            <X size={15} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-2 thin-scrollbar">
          {scan.markdowns.map((entry) => (
            <button
              key={entry.path}
              type="button"
              data-import-entry
              disabled={busy}
              onClick={() => onPick(entry)}
              className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left transition-colors hover:bg-zinc-100 focus:bg-zinc-100 focus:outline-none disabled:pointer-events-none disabled:opacity-50"
            >
              <FileText size={14} className="shrink-0 text-zinc-400" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-medium text-zinc-800">{entry.name}</span>
                <span className="block truncate text-[11px] text-zinc-500">
                  {entry.dir || '文件夹根目录'}
                </span>
              </span>
              <span className="shrink-0 text-[11px] tabular-nums text-zinc-400">
                {formatSize(entry.file.size)}
              </span>
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-zinc-200 px-4 py-3">
          <p className="text-[11px] leading-snug text-zinc-500">
            {scan.images.length > 0 ? '同目录下的图片会一起读进来' : '这个文件夹里没有图片'}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 shrink-0 items-center rounded-md border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-900"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  );
}
