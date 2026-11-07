import { ArrowLeft, ArrowUpDown, Columns2, Eye, Monitor, PencilLine, Smartphone } from 'lucide-react';
import { useMemo } from 'react';
import { resolveBackHref } from '../../lib/backUrl';
import { useTypographyStore } from '../../lib/store';
import type { ViewMode } from '../../lib/store';

/** 父站地址的判定见 lib/backUrl.ts：子路径取同域上一级，独立子域名根才用 PUBLIC_BACK_URL */
const BACK_URL = import.meta.env.PUBLIC_BACK_URL as string | undefined;

const backHref = (): string | undefined => {
  if (typeof window === 'undefined') return undefined;
  return resolveBackHref(window.location.pathname, window.location.href, BACK_URL);
};

const VIEW_MODES: Array<{ id: ViewMode; label: string; icon: typeof PencilLine }> = [
  { id: 'edit', label: '只显示编辑', icon: PencilLine },
  { id: 'split', label: '左右分屏', icon: Columns2 },
  { id: 'preview', label: '只显示预览', icon: Eye },
];

const MODE_BUTTON = 'flex items-center rounded px-1.5 py-0.5 transition-colors';
const ICON_BUTTON = 'flex items-center rounded p-1 transition-colors hover:bg-zinc-100 hover:text-zinc-900';

/** 状态栏（参考 doocs-md 的 footer）：左边文档统计，右边视图与预览设置 */
export default function StatusBar() {
  const markdown = useTypographyStore((state) => state.markdown);
  const viewMode = useTypographyStore((state) => state.viewMode);
  const setViewMode = useTypographyStore((state) => state.setViewMode);
  const previewDevice = useTypographyStore((state) => state.previewDevice);
  const togglePreviewDevice = useTypographyStore((state) => state.togglePreviewDevice);
  const scrollSync = useTypographyStore((state) => state.scrollSync);
  const toggleScrollSync = useTypographyStore((state) => state.toggleScrollSync);

  const charCount = useMemo(() => markdown.replace(/\s/g, '').length, [markdown]);
  const lineCount = useMemo(() => markdown.split('\n').length, [markdown]);
  const minutes = Math.max(1, Math.round(charCount / 400));
  const backUrl = backHref();

  return (
    <footer className="flex shrink-0 select-none items-center gap-2 overflow-hidden border-t border-zinc-200 bg-white px-3 py-1 text-[11px] text-zinc-500 max-sm:px-2">
      {backUrl && (
        <a href={backUrl} aria-label="返回站点" title="返回站点" className={ICON_BUTTON}>
          <ArrowLeft size={12} />
        </a>
      )}

      <span className="truncate tabular-nums">
        {charCount.toLocaleString()} 字 · {lineCount} 行 · 约 {minutes} 分钟读完 · 草稿自动保存在本机
      </span>

      <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
        <div className="flex items-center gap-0.5 rounded-md border border-zinc-200 p-0.5">
          {VIEW_MODES.map((mode) => {
            const Icon = mode.icon;
            return (
              <button
                key={mode.id}
                type="button"
                onClick={() => setViewMode(mode.id)}
                aria-pressed={viewMode === mode.id}
                aria-label={mode.label}
                title={mode.label}
                className={`${MODE_BUTTON} ${
                  viewMode === mode.id
                    ? 'ui-selected ui-selected-ring'
                    : 'text-zinc-400 hover:bg-zinc-50 hover:text-zinc-700'
                }`}
              >
                <Icon size={12} />
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={togglePreviewDevice}
          aria-label={previewDevice === 'mobile' ? '切换为桌面宽度预览' : '切换为手机宽度预览'}
          title={previewDevice === 'mobile' ? '切换为桌面宽度预览' : '切换为手机宽度预览'}
          aria-pressed={previewDevice === 'desktop'}
          className={`${ICON_BUTTON} hidden sm:flex ${previewDevice === 'desktop' ? 'ui-selected ui-selected-ring' : ''}`}
        >
          {previewDevice === 'mobile' ? <Smartphone size={12} /> : <Monitor size={12} />}
        </button>

        <button
          type="button"
          onClick={toggleScrollSync}
          aria-label={scrollSync ? '关闭编辑与预览的滚动同步' : '开启编辑与预览的滚动同步'}
          title={scrollSync ? '关闭滚动同步' : '开启滚动同步'}
          aria-pressed={scrollSync}
          className={`${ICON_BUTTON} flex ${scrollSync ? 'ui-selected ui-selected-ring' : 'text-zinc-400'}`}
        >
          {/* 关闭时在箭头上压一道斜杠：图标态也要一眼看出有没有开 */}
          <span className="relative flex items-center justify-center">
            <ArrowUpDown size={12} />
            {!scrollSync && <span className="absolute h-px w-3.5 rotate-45 bg-current" aria-hidden />}
          </span>
        </button>
      </div>
    </footer>
  );
}
