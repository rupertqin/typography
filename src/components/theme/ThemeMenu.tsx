import { useLayoutEffect, useRef } from 'react';
import { ARTICLE_TYPES, NEW_THEME_IDS } from '../../lib/constants';
import type { ArticleType } from '../../lib/types';
import type { Theme } from '../../lib/themes';
import ThemeCard from './ThemeCard';

interface ThemeMenuProps {
  themes: readonly Theme[];
  allCount: number;
  activeTheme: Theme;
  articleType: string;
  typeCounts: Record<string, number>;
  onSelect: (theme: Theme) => void;
  onTypeChange: (type: string) => void;
  /** 宽屏（主题按钮在卡头）时面板右对齐且更宽 */
  wide?: boolean;
}

export default function ThemeMenu({
  themes,
  allCount,
  activeTheme,
  articleType,
  typeCounts,
  onSelect,
  onTypeChange,
  wide = false,
}: ThemeMenuProps) {
  const scroller = useRef<HTMLDivElement>(null);

  // 打开面板时把当前主题滚进视野，避免用户每次都要自己找
  useLayoutEffect(() => {
    const node = scroller.current;
    if (!node) return;
    const active = node.querySelector('[data-active]') as HTMLElement | null;
    if (active) node.scrollTop = active.offsetTop - 12;
  }, [activeTheme.id, articleType]);

  const chip = (id: string, name: string, count: number) => (
    <button
      key={id}
      type="button"
      onClick={() => onTypeChange(id)}
      className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 transition-all ${
        articleType === id
          ? 'bg-emerald-600 text-white ring-emerald-600'
          : 'bg-white text-zinc-500 ring-zinc-200 hover:text-zinc-800 hover:ring-zinc-300'
      }`}
    >
      {name}
      <span
        className={`ml-1 tabular-nums ${
          articleType === id ? 'text-emerald-100' : 'text-zinc-300'
        }`}
      >
        {count}
      </span>
    </button>
  );

  return (
    <div
      className={`absolute top-full z-20 mt-2 flex max-h-[min(68vh,560px)] flex-col rounded-xl bg-white shadow-xl ring-1 ring-zinc-200 ${
        wide ? 'right-0 w-[min(640px,calc(100vw-3rem))]' : 'left-0 right-0'
      }`}
    >
      <div className="shrink-0 border-b border-zinc-100 px-3 pb-2.5 pt-3">
        <div className="mb-2 text-[11px] text-zinc-400">按文章类型推荐（可不选，全部主题随便挑）</div>
        <div className="flex flex-wrap gap-1.5">
          {chip('all', '全部', allCount)}
          {ARTICLE_TYPES.map((type: ArticleType) => chip(type.id, type.name, typeCounts[type.id] ?? 0))}
        </div>
      </div>

      <div
        ref={scroller}
        className="thin-scrollbar relative grid min-h-0 flex-1 grid-cols-2 content-start gap-2.5 overflow-y-auto p-3 sm:grid-cols-3"
      >
        {themes.length === 0 && (
          <p className="col-span-full py-10 text-center text-xs text-zinc-400">这个类型下还没有主题</p>
        )}
        {themes.map((theme) => (
          <button
            key={theme.id}
            type="button"
            data-active={theme.id === activeTheme.id || undefined}
            aria-label={`使用主题「${theme.name}」`}
            onClick={() => onSelect(theme)}
            className={`relative rounded-lg p-1.5 text-left ring-1 transition-all ${
              theme.id === activeTheme.id
                ? 'bg-emerald-50/60 ring-2 ring-emerald-400'
                : 'ring-zinc-200 hover:shadow-sm hover:ring-zinc-300'
            }`}
          >
            <ThemeCard theme={theme} isNew={NEW_THEME_IDS.has(theme.id)} />
            <div className="flex items-center gap-1.5 px-0.5 pt-1.5 text-xs font-medium text-zinc-600">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: theme.accent }} />
              {theme.name}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
