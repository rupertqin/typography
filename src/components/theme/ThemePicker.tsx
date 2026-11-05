import { useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, ChevronLeft, ChevronRight, Palette, Shuffle, Undo2 } from 'lucide-react';
import { ARTICLE_TYPES } from '../../lib/constants';
import { THEMES } from '../../lib/themes.generated.js';
import { useTypographyStore } from '../../lib/store';
import type { Theme } from '../../lib/types';
import ColorPanel, { ColorPanelHeader } from '../color/ColorPanel';
import ThemeMenu from './ThemeMenu';

const ICON_BUTTON =
  'shrink-0 rounded-lg bg-white p-1.5 text-zinc-500 ring-1 ring-zinc-200 transition-all hover:text-emerald-700 hover:ring-emerald-300';

const ALL_THEMES = THEMES as Theme[];

export default function ThemePicker({ theme, inHeader = false }: { theme: Theme; inHeader?: boolean }) {
  const setThemeId = useTypographyStore((state) => state.setThemeId);
  const articleType = useTypographyStore((state) => state.articleType);
  const setArticleType = useTypographyStore((state) => state.setArticleType);
  const mainColor = useTypographyStore((state) => state.mainColor);
  const partColorCount = useTypographyStore((state) => Object.keys(state.partColors).length);

  const [panel, setPanel] = useState<null | 'theme' | 'color'>(null);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const [revertTheme, setRevertTheme] = useState<Theme | null>(null);

  const wrapper = useRef<HTMLDivElement>(null);
  const colorBox = useRef<HTMLDivElement>(null);
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
    if (!panel) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (wrapper.current?.contains(target)) return;
      if (colorBox.current?.contains(target)) return;
      if (panel === 'color' && dragPos) return;
      setPanel(null);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPanel(null);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [panel, dragPos]);

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

  const startDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const rect = colorBox.current?.getBoundingClientRect();
    if (event.button !== 0 || !rect) return;
    event.preventDefault();
    const offsetX = event.clientX - rect.left;
    const offsetY = event.clientY - rect.top;

    const onMove = (moveEvent: PointerEvent) => {
      setDragPos({
        x: Math.min(Math.max(0, moveEvent.clientX - offsetX), window.innerWidth - rect.width),
        y: Math.min(Math.max(0, moveEvent.clientY - offsetY), window.innerHeight - 48),
      });
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const colorBody = <ColorPanel theme={theme} />;

  return (
    <div ref={wrapper} className="relative shrink-0">
      <div className="flex items-center gap-1.5">
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
          onClick={() => setPanel((current) => (current === 'theme' ? null : 'theme'))}
          aria-expanded={panel === 'theme'}
          className={`inline-flex w-32 shrink-0 items-center gap-2 rounded-lg bg-white py-1.5 pl-2.5 pr-2 text-sm ring-1 transition-all sm:w-40 ${
            panel === 'theme' ? 'ring-emerald-300' : 'ring-zinc-200 hover:ring-emerald-300'
          }`}
        >
          <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: theme.accent }} />
          <span className="min-w-0 flex-1 truncate text-left font-medium text-zinc-700">{theme.name}</span>
          <span className="hidden shrink-0 text-xs text-zinc-400 sm:inline">换主题</span>
          <ChevronDown
            size={14}
            className={`shrink-0 text-zinc-400 transition-transform ${panel === 'theme' ? 'rotate-180' : ''}`}
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
          className="ml-1 inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 text-sm text-zinc-600 ring-1 ring-zinc-200 transition-all hover:text-emerald-700 hover:ring-emerald-300"
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

        <button
          type="button"
          onClick={() => setPanel((current) => (current === 'color' ? null : 'color'))}
          aria-expanded={panel === 'color'}
          title="换主色，或单独调某几处的颜色"
          className={`ml-1 inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-white px-2 py-1.5 text-sm text-zinc-600 ring-1 transition-all hover:text-emerald-700 sm:px-2.5 ${
            panel === 'color' ? 'ring-emerald-300' : 'ring-zinc-200 hover:ring-emerald-300'
          }`}
        >
          <Palette size={14} />
          <span className="hidden sm:inline">配色</span>
          {(mainColor || partColorCount > 0) && (
            <span
              className="h-2 w-2 rounded-full ring-1 ring-black/10"
              style={{ background: mainColor || '#10b981' }}
            />
          )}
        </button>
      </div>

      {panel === 'color' && !inHeader && (
        <div className="absolute left-0 right-0 top-full z-20 mt-2 flex max-h-[min(68vh,560px)] flex-col rounded-xl bg-white shadow-xl ring-1 ring-zinc-200">
          {colorBody}
        </div>
      )}

      {panel === 'color' && inHeader && !dragPos && (
        <div
          ref={colorBox}
          className="absolute right-0 top-full z-20 mt-2 flex max-h-[min(68vh,560px)] w-[min(440px,calc(100vw-3rem))] flex-col rounded-xl bg-white shadow-xl ring-1 ring-zinc-200"
        >
          <ColorPanelHeader
            dragged={false}
            onDragStart={startDrag}
            onResetPosition={() => setDragPos(null)}
            onClose={() => setPanel(null)}
          />
          {colorBody}
        </div>
      )}

      {panel === 'color' &&
        inHeader &&
        dragPos &&
        createPortal(
          <div
            ref={colorBox}
            style={{ left: dragPos.x, top: dragPos.y }}
            className="fixed z-50 flex max-h-[min(68vh,560px)] w-[min(440px,calc(100vw-3rem))] flex-col rounded-xl bg-white shadow-2xl ring-1 ring-zinc-200"
          >
            <ColorPanelHeader
              dragged
              onDragStart={startDrag}
              onResetPosition={() => setDragPos(null)}
              onClose={() => setPanel(null)}
            />
            {colorBody}
          </div>,
          document.body,
        )}

      {panel === 'theme' && (
        <ThemeMenu
          themes={themes}
          allCount={ALL_THEMES.length}
          activeTheme={theme}
          articleType={articleType}
          typeCounts={typeCounts}
          wide={inHeader}
          onSelect={(next) => {
            remember(next.id);
            setPanel(null);
          }}
          onTypeChange={setArticleType}
        />
      )}
    </div>
  );
}
