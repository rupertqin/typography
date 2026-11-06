import type { ReactNode } from 'react';
import {
  BLOCKQUOTE_BG_OPTIONS,
  BLOCK_SPACING_OPTIONS,
  HEADING_STYLE_OPTIONS,
  LINE_HEIGHT_OPTIONS,
  LINK_COLOR_OPTIONS,
} from '../../lib/constants';
import { FOLLOW_THEME_CODE } from '../../lib/code-themes';
import { isHexColor } from '../../lib/recolor';
import { useTypographyStore } from '../../lib/store';
import type { HeadingLevels, HeadingStyleType } from '../../lib/types';
import type { Theme } from '../../lib/themes';
import Segmented from '../shell/Segmented';
import CodeThemePicker from './CodeThemePicker';

const LEVELS: Array<{ id: HeadingLevels; name: string }> = [
  { id: 'h1', name: '一级标题' },
  { id: 'h2', name: '二级标题' },
  { id: 'h3', name: '三级标题' },
];

function Section({ title, hint, children }: { title: string; hint: string; children: ReactNode }) {
  return (
    <section>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium text-zinc-700">{title}</span>
        <span className="truncate text-[11px] text-zinc-400">{hint}</span>
      </div>
      <div className="mt-1.5">{children}</div>
    </section>
  );
}

/** 标题样式的四个小样：用两条灰线示意边框位置，比纯文字更快看懂 */
function StyleGlyph({ style, accent }: { style: HeadingStyleType; accent: string }) {
  if (style === 'color-only') {
    return (
      <span className="flex h-3.5 w-7 items-center">
        <span className="block h-2 w-5 rounded-sm" style={{ background: accent }} />
      </span>
    );
  }
  if (style === 'border-bottom') {
    return (
      <span className="flex h-3.5 w-7 items-end pb-0.5">
        <span className="block h-2.5 w-5 border-b-2" style={{ borderColor: accent }} />
      </span>
    );
  }
  if (style === 'border-left') {
    return (
      <span className="flex h-3.5 w-7 items-center">
        <span className="block h-2.5 w-5 border-l-2" style={{ borderColor: accent }} />
      </span>
    );
  }
  return (
    <span className="flex h-3.5 w-7 items-center">
      <span className="block h-2 w-5 rounded-sm bg-zinc-200" />
    </span>
  );
}

function ColorInput({ value, fallback, onChange, label }: { value: string; fallback: string; onChange: (color: string) => void; label: string }) {
  return (
    <label
      title="自定义颜色"
      className="relative flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-md ring-1 ring-black/10"
      style={{ background: value || fallback }}
    >
      <input
        type="color"
        value={isHexColor(value) ? value : fallback}
        onChange={(event) => onChange(event.target.value)}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        aria-label={label}
      />
    </label>
  );
}

export default function TypographyPanel({ theme }: { theme: Theme }) {
  const lineHeight = useTypographyStore((state) => state.lineHeight);
  const blockSpacing = useTypographyStore((state) => state.blockSpacing);
  const blockquoteBackground = useTypographyStore((state) => state.blockquoteBackground);
  const headingStyles = useTypographyStore((state) => state.headingStyles);
  const linkColor = useTypographyStore((state) => state.partColors.link ?? '');
  const setLineHeight = useTypographyStore((state) => state.setLineHeight);
  const setBlockSpacing = useTypographyStore((state) => state.setBlockSpacing);
  const setBlockquoteBackground = useTypographyStore((state) => state.setBlockquoteBackground);
  const setHeadingStyle = useTypographyStore((state) => state.setHeadingStyle);
  const setPartColor = useTypographyStore((state) => state.setPartColor);
  const resetParams = useTypographyStore((state) => state.resetParams);
  const setCodeThemeId = useTypographyStore((state) => state.setCodeThemeId);
  const codeThemeId = useTypographyStore((state) => state.codeThemeId);

  const mainColor = useTypographyStore((state) => state.mainColor);
  const accent = isHexColor(mainColor) ? mainColor : theme.accent;

  const dirty =
    lineHeight !== 'theme' ||
    blockSpacing !== 1 ||
    Boolean(blockquoteBackground) ||
    Object.keys(headingStyles).length > 0 ||
    codeThemeId !== FOLLOW_THEME_CODE;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="thin-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto p-3">
        <Section title="行高" hint="代码块保持自身节奏，不跟着变">
          <Segmented
            options={LINE_HEIGHT_OPTIONS.map((option) => ({
              value: option.value,
              label: option.label,
              title: `${option.label}（${option.hint}）`,
            }))}
            value={lineHeight}
            onChange={setLineHeight}
            ariaLabel={(option) => `行高${option.label}`}
          />
        </Section>

        <Section title="段间距" hint="按主题原有节奏整体缩放">
          <Segmented
            options={BLOCK_SPACING_OPTIONS.map((option) => ({
              value: option.value,
              label: option.label,
              title: `${option.label}（${option.hint}）`,
            }))}
            value={blockSpacing}
            onChange={setBlockSpacing}
            ariaLabel={(option) => `段间距${option.label}`}
          />
        </Section>

        <Section title="链接色" hint="只影响正文里的链接">
          <div className="flex items-center gap-2">
            <Segmented
              className="min-w-0 flex-1"
              options={LINK_COLOR_OPTIONS.map((option) => ({
                value: option.color,
                label: option.name,
                title: option.color ? `${option.name} ${option.color}` : '跟随主题',
              }))}
              value={LINK_COLOR_OPTIONS.some((option) => option.color === linkColor) ? linkColor : '__custom__'}
              onChange={(value) => setPartColor('link', value)}
              ariaLabel={(option) => `链接色${option.label}`}
            />
            <ColorInput
              value={linkColor}
              fallback={accent}
              onChange={(color) => setPartColor('link', color)}
              label="链接色自定义"
            />
          </div>
        </Section>

        <Section title="引用底色" hint="引用块只换底色，边框仍跟主题">
          <div className="flex items-center gap-2">
            <Segmented
              className="min-w-0 flex-1"
              options={BLOCKQUOTE_BG_OPTIONS.map((option) => ({
                value: option.value,
                label: option.label,
              }))}
              value={
                BLOCKQUOTE_BG_OPTIONS.some((option) => option.value === blockquoteBackground)
                  ? blockquoteBackground
                  : '__custom__'
              }
              onChange={setBlockquoteBackground}
              ariaLabel={(option) => `引用底色${option.label}`}
            />
            <ColorInput
              value={isHexColor(blockquoteBackground) ? blockquoteBackground : ''}
              fallback={theme.accent}
              onChange={(color) => setBlockquoteBackground(color)}
              label="引用底色自定义"
            />
          </div>
        </Section>

        <Section title="标题样式" hint="会影响标题原本的色块与对齐">
          <div className="space-y-1.5">
            {LEVELS.map((level) => (
              <div key={level.id} className="flex items-center gap-2">
                <span className="w-[52px] shrink-0 text-xs text-zinc-500">{level.name}</span>
                <div className="flex min-w-0 flex-1 items-center gap-1">
                  {HEADING_STYLE_OPTIONS.map((option) => {
                    const active = (headingStyles[level.id] ?? 'default') === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setHeadingStyle(level.id, option.value)}
                        aria-pressed={active}
                        aria-label={`${level.name}${option.label}`}
                        title={option.label}
                        className={`flex flex-1 flex-col items-center gap-0.5 rounded-md px-1 py-1 text-[10px] transition-all ${
                          active
                            ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-300'
                            : 'text-zinc-400 hover:bg-zinc-50 hover:text-zinc-600'
                        }`}
                      >
                        <StyleGlyph style={option.value} accent={accent} />
                        <span className="whitespace-nowrap">{option.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="代码配色" hint={`${theme.name}主题之外单独选`}>
          <CodeThemePicker theme={theme} />
        </Section>
      </div>

      <div className="flex shrink-0 items-center justify-between gap-2 border-t border-zinc-100 px-3 py-2 text-[11px] text-zinc-400">
        <span>切换主题后设置会保留</span>
        <button
          type="button"
          onClick={() => {
            resetParams();
            setCodeThemeId(FOLLOW_THEME_CODE);
          }}
          disabled={!dirty}
          className="text-emerald-600 hover:underline disabled:text-zinc-300 disabled:no-underline"
        >
          全部恢复默认
        </button>
      </div>
    </div>
  );
}
