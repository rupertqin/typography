import { RotateCcw, X } from 'lucide-react';
import { useEffect } from 'react';
import { FOLLOW_THEME_CODE } from '../../lib/code-themes';
import { useTypographyStore } from '../../lib/store';
import type { Theme } from '../../lib/themes';
import StyleSettings from '../style/StyleSettings';

interface StylePanelProps {
  theme: Theme;
  onClose: () => void;
}

const RESET_BUTTON =
  'inline-flex h-6 items-center gap-1 rounded-md border border-zinc-200 px-1.5 text-[11px] font-medium text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-900 disabled:border-zinc-100 disabled:text-zinc-300 disabled:hover:bg-transparent';

/**
 * 顶部样式区（参考 doocs-md 的样式面板）：配色与排版合在一页，不再分两个页签。
 *
 * 打开时挤压下方左右两栏的高度，而不是盖上去——上面调参数、左右同时看效果。
 */
export default function StylePanel({ theme, onClose }: StylePanelProps) {
  const mainColor = useTypographyStore((state) => state.mainColor);
  const partColorCount = useTypographyStore((state) => Object.keys(state.partColors).length);
  const lineHeight = useTypographyStore((state) => state.lineHeight);
  const blockSpacing = useTypographyStore((state) => state.blockSpacing);
  const blockquoteBackground = useTypographyStore((state) => state.blockquoteBackground);
  const headingCount = useTypographyStore((state) => Object.keys(state.headingStyles).length);
  const codeThemeId = useTypographyStore((state) => state.codeThemeId);
  const resetColors = useTypographyStore((state) => state.resetColors);
  const resetParams = useTypographyStore((state) => state.resetParams);
  const setCodeThemeId = useTypographyStore((state) => state.setCodeThemeId);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const colorsDirty = Boolean(mainColor) || partColorCount > 0;
  const paramsDirty =
    lineHeight !== 'theme' ||
    blockSpacing !== 1 ||
    Boolean(blockquoteBackground) ||
    headingCount > 0 ||
    codeThemeId !== FOLLOW_THEME_CODE;

  return (
    <section data-style-panel className="shrink-0 border-b border-zinc-200 bg-white">
      <div className="flex items-center gap-3 px-4 py-2">
        <span className="shrink-0 text-xs font-semibold text-zinc-900">样式</span>
        <span className="hidden truncate text-[11px] text-zinc-400 sm:inline">
          配色与排版在一处，改完立刻反映到右侧预览
        </span>

        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={resetColors}
            disabled={!colorsDirty}
            title="把主色与单独调色恢复成模板原色"
            className={RESET_BUTTON}
          >
            <RotateCcw size={10} />
            重置配色
          </button>
          <button
            type="button"
            onClick={() => {
              resetParams();
              setCodeThemeId(FOLLOW_THEME_CODE);
            }}
            disabled={!paramsDirty}
            title="把行高、段间距、标题样式、代码配色恢复默认"
            className={RESET_BUTTON}
          >
            <RotateCcw size={10} />
            重置排版
          </button>
          <button
            type="button"
            onClick={onClose}
            title="关闭（Esc）"
            aria-label="关闭样式面板"
            className="rounded-md p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      <div className="flex max-h-[40vh] min-h-0 flex-col border-t border-zinc-100">
        <StyleSettings theme={theme} />
      </div>
    </section>
  );
}
