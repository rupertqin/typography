import { useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { GripHorizontal, Undo2, X } from 'lucide-react';
import { MAIN_COLOR_PRESETS, PART_COLOR_PRESETS } from '../../lib/constants';
import { availableColorParts, isHexColor } from '../../lib/recolor';
import { useTypographyStore } from '../../lib/store';
import type { ColorPreset, Theme } from '../../lib/types';

interface ColorPanelHeaderProps {
  dragged: boolean;
  onDragStart: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onResetPosition: () => void;
  onClose: () => void;
}

export function ColorPanelHeader({ dragged, onDragStart, onResetPosition, onClose }: ColorPanelHeaderProps) {
  return (
    <div
      onPointerDown={onDragStart}
      className="flex shrink-0 cursor-move select-none items-center gap-1.5 border-b border-zinc-100 py-1.5 pl-3 pr-1.5"
    >
      <GripHorizontal size={14} className="text-zinc-300" />
      <span className="text-sm font-medium text-zinc-700">配色</span>
      <span className="truncate text-[11px] text-zinc-400">
        {dragged ? '点文章不会关闭，边调边看' : '按住这里可拖到一边，不挡文章'}
      </span>
      <span
        className="ml-auto flex shrink-0 items-center"
        onPointerDown={(event) => event.stopPropagation()}
      >
        {dragged && (
          <button
            type="button"
            onClick={onResetPosition}
            className="rounded px-1.5 py-0.5 text-[11px] text-zinc-400 hover:text-emerald-700"
            title="放回按钮下方"
          >
            归位
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-zinc-400 hover:text-zinc-700"
          title="关闭（Esc）"
          aria-label="关闭配色面板"
        >
          <X size={14} />
        </button>
      </span>
    </div>
  );
}

function sameColor(left: string, right: string) {
  return left.toLowerCase() === right.toLowerCase();
}

function Swatch({
  color,
  name,
  active,
  onClick,
}: ColorPreset & { active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={name}
      aria-label={`使用${name}`}
      className={`h-5 w-5 shrink-0 rounded-full ring-1 ring-black/10 transition-transform hover:scale-110 ${
        active ? 'outline outline-2 outline-offset-2 outline-emerald-500' : ''
      }`}
      style={{ background: color }}
    />
  );
}

function CustomSwatch({
  value,
  fallback,
  presets,
  onChange,
}: {
  value: string;
  fallback: string;
  presets: ColorPreset[];
  onChange: (color: string) => void;
}) {
  const custom = Boolean(value) && !presets.some((preset) => sameColor(preset.color, value));
  return (
    <label
      title="自定义颜色"
      className={`relative h-5 w-5 shrink-0 cursor-pointer rounded-full ring-1 ring-black/10 transition-transform hover:scale-110 ${
        custom ? 'outline outline-2 outline-offset-2 outline-emerald-500' : ''
      }`}
      style={{
        background: custom
          ? value
          : 'conic-gradient(#f43f5e,#f59e0b,#22c55e,#06b6d4,#6366f1,#d946ef,#f43f5e)',
      }}
    >
      <input
        type="color"
        value={value || fallback}
        onChange={(event) => onChange(event.target.value)}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        aria-label="自定义颜色"
      />
    </label>
  );
}

export default function ColorPanel({ theme }: { theme: Theme }) {
  const mainColor = useTypographyStore((state) => state.mainColor);
  const setMainColor = useTypographyStore((state) => state.setMainColor);
  const partColors = useTypographyStore((state) => state.partColors);
  const setPartColor = useTypographyStore((state) => state.setPartColor);
  const resetColors = useTypographyStore((state) => state.resetColors);

  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? (mainColor || theme.accent);
  const dirty = Boolean(mainColor) || Object.keys(partColors).length > 0;

  const commitDraft = (raw: string) => {
    const normalized = (raw.startsWith('#') ? raw : `#${raw}`).trim();
    setDraft(raw);
    if (isHexColor(normalized)) setMainColor(normalized.toLowerCase());
  };

  const draftInvalid = draft !== null && !isHexColor(draft.startsWith('#') ? draft : `#${draft}`);

  return (
    <div className="thin-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto p-3">
      <section>
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-sm font-medium text-zinc-700">主色</span>
          <span className="truncate text-[11px] text-zinc-400">标题、引用、加粗、分割线一起换成这个色系</span>
        </div>
        <div className="mt-2.5 flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              setMainColor('');
              setDraft(null);
            }}
            className={`inline-flex items-center gap-1.5 rounded-full py-0.5 pl-1 pr-2 text-xs ring-1 transition-all ${
              mainColor
                ? 'text-zinc-500 ring-zinc-200 hover:ring-zinc-300'
                : 'bg-emerald-50 text-emerald-700 ring-emerald-400'
            }`}
          >
            <span className="h-3.5 w-3.5 rounded-full" style={{ background: theme.accent }} />
            模板原色
          </button>

          {MAIN_COLOR_PRESETS.map((preset) => (
            <Swatch
              key={preset.color}
              {...preset}
              active={sameColor(mainColor, preset.color)}
              onClick={() => {
                setMainColor(preset.color);
                setDraft(null);
              }}
            />
          ))}

          <CustomSwatch
            value={mainColor}
            fallback={theme.accent}
            presets={MAIN_COLOR_PRESETS}
            onChange={(color) => {
              setMainColor(color);
              setDraft(null);
            }}
          />

          <input
            value={shown}
            onChange={(event) => commitDraft(event.target.value)}
            onBlur={() => setDraft(null)}
            placeholder="#07c160"
            spellCheck={false}
            title="输入品牌色色值，如 #07c160"
            aria-label="主色色值"
            className={`w-[76px] rounded-md px-2 py-0.5 font-mono text-xs text-zinc-700 ring-1 ring-inset focus:outline-none focus:ring-emerald-300 ${
              draftInvalid ? 'ring-red-300' : 'ring-zinc-200'
            }`}
          />
        </div>
      </section>

      <section>
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-sm font-medium text-zinc-700">单独调色</span>
          <span className="truncate text-[11px] text-zinc-400">
            只改这几处，其他保持{mainColor ? '上面的主色' : '模板原样'}
          </span>
        </div>
        <div className="mt-1.5 divide-y divide-zinc-100">
          {availableColorParts(theme).map((part) => {
            const value = partColors[part.id] ?? '';
            return (
              <div key={part.id} className="flex items-center gap-2 py-1.5">
                <span
                  className={`w-[52px] shrink-0 text-xs ${
                    value ? 'font-medium text-zinc-800' : 'text-zinc-500'
                  }`}
                >
                  {part.name}
                </span>
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5 sm:gap-2">
                  {PART_COLOR_PRESETS.map((preset) => (
                    <Swatch
                      key={preset.color}
                      {...preset}
                      active={sameColor(value, preset.color)}
                      onClick={() => setPartColor(part.id, preset.color)}
                    />
                  ))}
                  <CustomSwatch
                    value={value}
                    fallback={mainColor || theme.accent}
                    presets={PART_COLOR_PRESETS}
                    onChange={(color) => setPartColor(part.id, color)}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setPartColor(part.id, '')}
                  title="恢复"
                  aria-label={`恢复${part.name}模板原色`}
                  className={`rounded p-1 text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-500 ${
                    value ? '' : 'invisible'
                  }`}
                >
                  <Undo2 size={13} />
                </button>
              </div>
            );
          })}
        </div>
      </section>

      <div className="flex items-center justify-between gap-2 pt-1 text-[11px] text-zinc-400">
        <span>换主题时配色会保留</span>
        <button
          type="button"
          onClick={() => {
            resetColors();
            setDraft(null);
          }}
          disabled={!dirty}
          className="text-emerald-600 hover:underline disabled:text-zinc-300 disabled:no-underline"
        >
          全部恢复模板原色
        </button>
      </div>
    </div>
  );
}
