import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, Shuffle, Undo2 } from 'lucide-react';
import { ARTICLE_TYPES } from '../../lib/constants';
import { THEMES } from '../../lib/themes';
import type { Theme } from '../../lib/themes';
import { useTypographyStore } from '../../lib/store';
import ThemeMenu from './ThemeMenu';

const ICON_BUTTON =
  'shrink-0 rounded-md border border-zinc-200 bg-white p-1.5 text-zinc-500 transition-colors hover:bg-zinc-50 hover:text-zinc-900';

const ALL_THEMES = THEMES;

interface ThemePickerProps {
  theme: Theme;
  inHeader?: boolean;
}

export default function ThemePicker({ theme, inHeader = false }: ThemePickerProps) {
  const setThemeId = useTypographyStore((state) => state.setThemeId);
  const articleType = useTypographyStore((state) => state.articleType);
  const setArticleType = useTypographyStore((state) => state.setArticleType);
  const [themeOpen, setThemeOpen] = useState(false);
  const [revertTheme, setRevertTheme] = useState<Theme | null>(null);

  const wrapper = useRef<HTMLDivElement>(null);
  const recents = useRef<string[]>([]);

  const typeName = ARTICLE_TYPES.find((type) => type.id === articleType)?.name;
  const themes = useMemo(
    () => (typeName ? ALL_THEMES.filter((item) => item.tags.includes(articleType)) : ALL_THEMES),
    [articleType, typeName],
  );
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const type of ARTICLE_TYPES) {
      counts[type.id] = ALL_THEMES.filter((item) => item.tags.includes(type.id)).length;
    }
    return counts;
  }, []);

  useEffect(() => {
    if (!themeOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (wrapper.current?.contains(target)) return;
      setThemeOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setThemeOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [themeOpen]);

  const remember = (id: string) => {
    recents.current = [id, ...recents.current.filter((item) => item !== id)].slice(0, 4);
    setThemeId(id);
    setRevertTheme(null);
  };

  const step = (delta: number) => {
    const index = themes.findIndex((item) => item.id === theme.id);
    const base = index < 0 ? 0 : index;
    const next = themes[(base + delta + themes.length) % themes.length];
    if (next) remember(next.id);
  };

  const randomize = () => {
    const others = themes.filter((item) => item.id !== theme.id);
    const fresh = others.filter((item) => !recents.current.includes(item.id));
    const pool = fresh.length ? fresh : others.length ? others : themes;
    const previous = revertTheme ?? theme;
    remember(pool[Math.floor(Math.random() * pool.length)].id);
    setRevertTheme(previous);
  };

  return (
    <div ref={wrapper} className="relative shrink-0">
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => step(-1)}
          className={ICON_BUTTON}
          title="上一个主题"
          aria-label="上一个主题"
        >
          <ChevronLeft size={16} />
        </button>

        <button
          type="button"
          onClick={() => setThemeOpen((open) => !open)}
          aria-expanded={themeOpen}
          className={`inline-flex w-32 shrink-0 items-center gap-2 rounded-md border py-1.5 pl-2.5 pr-2 text-sm transition-colors sm:w-40 ${
            themeOpen
              ? 'border-zinc-300 bg-zinc-100'
              : 'border-zinc-200 bg-white hover:bg-zinc-50'
          }`}
        >
          <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: theme.accent }} />
          <span className="min-w-0 flex-1 truncate text-left font-medium text-zinc-700">{theme.name}</span>
          <span className="hidden shrink-0 text-xs text-zinc-400 sm:inline">换主题</span>
          <ChevronDown
            size={14}
            className={`shrink-0 text-zinc-400 transition-transform ${themeOpen ? 'rotate-180' : ''}`}
          />
        </button>

        <button
          type="button"
          onClick={() => step(1)}
          className={ICON_BUTTON}
          title="下一个主题"
          aria-label="下一个主题"
        >
          <ChevronRight size={16} />
        </button>

        <button
          type="button"
          onClick={randomize}
          title={typeName ? `在「${typeName}」推荐的主题里随机换一个` : '随机换一个主题'}
          className="ml-1 inline-flex shrink-0 items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-sm text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-900"
        >
          <Shuffle size={14} />
          随机
          {typeName && <span className="hidden text-xs text-zinc-400 sm:inline">· {typeName}</span>}
        </button>

        {revertTheme && (
          <button
            type="button"
            onClick={() => remember(revertTheme.id)}
            className={ICON_BUTTON}
            title={`换回「${revertTheme.name}」`}
            aria-label={`换回「${revertTheme.name}」`}
          >
            <Undo2 size={15} />
          </button>
        )}

      </div>

      {themeOpen && (
        <ThemeMenu
          themes={themes}
          allCount={ALL_THEMES.length}
          activeTheme={theme}
          articleType={articleType}
          typeCounts={typeCounts}
          wide={inHeader}
          onSelect={(next) => {
            remember(next.id);
            setThemeOpen(false);
          }}
          onTypeChange={setArticleType}
        />
      )}
    </div>
  );
}
