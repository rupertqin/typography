import { useState } from 'react';
import { Check, Undo2 } from 'lucide-react';
import {
  BLOCKQUOTE_BG_OPTIONS,
  BLOCK_SPACING_OPTIONS,
  HEADING_STYLE_OPTIONS,
  LINE_HEIGHT_OPTIONS,
  LINK_COLOR_OPTIONS,
  MAIN_COLOR_PRESETS,
  PART_COLOR_PRESETS,
} from '../../lib/constants';
import { availableColorParts, isHexColor } from '../../lib/recolor';
import { useTypographyStore } from '../../lib/store';
import type { ColorPreset, HeadingLevels, HeadingStyleType } from '../../lib/types';
import type { Theme } from '../../lib/themes';
import ChoiceGroup from '../ui/ChoiceGroup';
import { Swatch, SwatchInput } from '../ui/ColorSwatch';
import Row from '../ui/Row';
import CodeThemePicker from './CodeThemePicker';

const LEVELS: Array<{ id: HeadingLevels; name: string }> = [
  { id: 'h1', name: '一级标题' },
  { id: 'h2', name: '二级标题' },
  { id: 'h3', name: '三级标题' },
];

/** 正文左右边距档位：没有「主题」项，未选时沿用主题自带留白 */
const PAGE_PADDING_OPTIONS: Array<{ value: 'theme' | number; label: string; title: string }> = [
  { value: 0, label: '0', title: '左右不留白（0px）' },
  { value: 8, label: '8', title: '左右各留 8px' },
  { value: 16, label: '16', title: '左右各留 16px' },
  { value: 24, label: '24', title: '左右各留 24px' },
  { value: 32, label: '32', title: '左右各留 32px' },
];

function sameColor(left: string, right: string) {
  return left.toLowerCase() === right.toLowerCase();
}

/** 这处颜色是不是预设之外的「自定义色」——是的话取色块要显示实色 */
function customOf(value: string, presets: ColorPreset[]): string {
  if (!isHexColor(value)) return '';
  return presets.some((preset) => sameColor(preset.color, value)) ? '' : value;
}

/** 标题样式的四个小样：用两笔示意边框位置，比纯文字更快看懂 */
function StyleGlyph({ style, accent }: { style: HeadingStyleType; accent: string }) {
  if (style === 'color-only') {
    return (
      <span className="flex h-3.5 w-7 items-center">
        <span className="block h-1.5 w-5 rounded-sm" style={{ background: accent }} />
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
      <span className="block h-1.5 w-5 rounded-sm bg-zinc-300" />
    </span>
  );
}

/**
 * 配色 + 排版合在一起的一页设置（参考 doocs-md 样式面板的属性表）：
 * 左侧固定宽度标签、右侧控件的检查器布局，宽屏两列并排，尽可能少占竖向空间。
 */
export default function StyleSettings({ theme }: { theme: Theme }) {
  const mainColor = useTypographyStore((state) => state.mainColor);
  const setMainColor = useTypographyStore((state) => state.setMainColor);
  const partColors = useTypographyStore((state) => state.partColors);
  const setPartColor = useTypographyStore((state) => state.setPartColor);
  const lineHeight = useTypographyStore((state) => state.lineHeight);
  const blockSpacing = useTypographyStore((state) => state.blockSpacing);
  const blockquoteBackground = useTypographyStore((state) => state.blockquoteBackground);
  const headingStyles = useTypographyStore((state) => state.headingStyles);
  const pagePaddingX = useTypographyStore((state) => state.pagePaddingX);
  const linkColor = useTypographyStore((state) => state.partColors.link ?? '');
  const setLineHeight = useTypographyStore((state) => state.setLineHeight);
  const setBlockSpacing = useTypographyStore((state) => state.setBlockSpacing);
  const setBlockquoteBackground = useTypographyStore((state) => state.setBlockquoteBackground);
  const setHeadingStyle = useTypographyStore((state) => state.setHeadingStyle);
  const setPagePaddingX = useTypographyStore((state) => state.setPagePaddingX);

  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? (mainColor || theme.accent);
  const accent = isHexColor(mainColor) ? mainColor : theme.accent;

  const commitDraft = (raw: string) => {
    const normalized = (raw.startsWith('#') ? raw : `#${raw}`).trim();
    setDraft(raw);
    if (isHexColor(normalized)) setMainColor(normalized.toLowerCase());
  };
  const draftInvalid = draft !== null && !isHexColor(draft.startsWith('#') ? draft : `#${draft}`);

  return (
    <div className="thin-scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-3">
      {/* 两列之间留足间距：左列右侧是色板/胶囊，右列左侧是标签，挤在一起会看不清归属 */}
      <div className="grid grid-cols-1 gap-x-10 gap-y-2 lg:grid-cols-2 lg:gap-x-14 xl:gap-x-20">
        <Row label="主色" hint="标题、引用、加粗、分割线一起换成这个色系">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setMainColor('');
                setDraft(null);
              }}
              className={`inline-flex h-7 items-center gap-1.5 rounded-md border py-0 pl-1 pr-2 text-xs transition-colors ${
                mainColor
                  ? 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50'
                  : 'border-zinc-900 bg-zinc-900 font-medium text-white'
              }`}
            >
              <span
                className="h-4 w-4 rounded-[4px] ring-1 ring-inset ring-black/10"
                style={{ background: theme.accent }}
              />
              模板原色
            </button>

            <input
              value={shown}
              onChange={(event) => commitDraft(event.target.value)}
              onBlur={() => setDraft(null)}
              placeholder="#07c160"
              spellCheck={false}
              title="输入品牌色色值，如 #07c160"
              aria-label="主色色值"
              className={`h-7 w-[88px] rounded-md border bg-white px-2 font-mono text-xs text-zinc-700 transition-colors focus:outline-none ${
                draftInvalid
                  ? 'border-red-300 focus:border-red-400'
                  : 'border-zinc-200 hover:border-zinc-300 focus:border-zinc-400'
              }`}
            />

            <span className="mx-0.5 h-5 w-px bg-zinc-200" aria-hidden />

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
            <SwatchInput
              value={customOf(mainColor, MAIN_COLOR_PRESETS)}
              fallback={theme.accent}
              label="主色自定义"
              title="自定义主色"
              onChange={(color) => {
                setMainColor(color);
                setDraft(null);
              }}
            />
          </div>
        </Row>

        <Row label="行距" hint="未选时沿用主题自身行距；代码块保持自己的节奏">
          <ChoiceGroup
            options={LINE_HEIGHT_OPTIONS.map((option) => ({
              value: option.value,
              label: option.label,
              title: `${option.label}（${option.hint}）`,
            }))}
            value={lineHeight}
            onChange={setLineHeight}
            ariaLabel={(option) => `行距${option.label}`}
          />
        </Row>

        <Row label="段间距" hint="按主题原有节奏整体缩放">
          <ChoiceGroup
            options={BLOCK_SPACING_OPTIONS.map((option) => ({
              value: option.value,
              label: option.label,
              title: `${option.label}（${option.hint}）`,
            }))}
            value={blockSpacing}
            onChange={setBlockSpacing}
            ariaLabel={(option) => `段间距${option.label}`}
          />
        </Row>

        <Row label="链接色" hint="只影响正文里的链接">
          <div className="flex items-center gap-2">
            <ChoiceGroup
              className="min-w-0 flex-1"
              options={LINK_COLOR_OPTIONS.map((option) => ({
                value: option.color,
                label: option.name,
                title: option.color ? `${option.name} ${option.color}` : '跟随主题',
              }))}
              value={
                LINK_COLOR_OPTIONS.some((option) => option.color === linkColor) ? linkColor : '__custom__'
              }
              onChange={(value) => setPartColor('link', value)}
              ariaLabel={(option) => `链接色${option.label}`}
            />
            <SwatchInput
              value={customOf(linkColor, LINK_COLOR_OPTIONS)}
              fallback={accent}
              onChange={(color) => setPartColor('link', color)}
              label="链接色自定义"
              title="链接色自定义"
            />
          </div>
        </Row>

        <Row label="引用底色" hint="引用块只换底色，边框仍跟主题">
          <div className="flex items-center gap-2">
            <ChoiceGroup
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
            <SwatchInput
              value={isHexColor(blockquoteBackground) ? blockquoteBackground : ''}
              fallback={theme.accent}
              onChange={(color) => setBlockquoteBackground(color)}
              label="引用底色自定义"
              title="引用底色自定义"
            />
          </div>
        </Row>

        <Row label="左右边距" hint="未选时沿用主题自带留白；预览与复制到公众号一致">
          <ChoiceGroup
            options={PAGE_PADDING_OPTIONS}
            value={pagePaddingX}
            onChange={setPagePaddingX}
            ariaLabel={(option) => `左右边距${option.label}`}
          />
        </Row>

        <Row label="代码配色" hint={`默认跟随「${theme.name}」，可单独指定`}>
          <CodeThemePicker theme={theme} />
        </Row>

        <Row label="标题样式" hint="改的是标题自带的色块与描边" className="lg:col-span-2">
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-3">
            {LEVELS.map((level) => (
              <div key={level.id} className="flex items-center gap-2">
                <span className="w-14 shrink-0 text-[11px] text-zinc-500">{level.name}</span>
                <div className="grid min-w-0 flex-1 grid-cols-4 gap-1">
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
                        className={`flex h-7 items-center justify-center rounded-md border transition-colors ${
                          active
                            ? 'border-zinc-900 bg-zinc-50'
                            : 'border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50'
                        }`}
                      >
                        <StyleGlyph style={option.value} accent={accent} />
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </Row>

        <Row
          label="单独调色"
          hint={`只改这几处，其他保持${mainColor ? '上面的主色' : '模板原样'}`}
          className="lg:col-span-2"
        >
          <div className="grid grid-cols-1 gap-x-6 lg:grid-cols-2">
            {availableColorParts(theme).map((part) => {
              const value = partColors[part.id] ?? '';
              return (
                <div key={part.id} className="flex items-center gap-2 py-1">
                  <span
                    className={`w-12 shrink-0 truncate text-[11px] ${
                      value ? 'font-medium text-zinc-900' : 'text-zinc-500'
                    }`}
                  >
                    {part.name}
                  </span>
                  <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                    {PART_COLOR_PRESETS.map((preset) => (
                      <Swatch
                        key={preset.color}
                        {...preset}
                        active={sameColor(value, preset.color)}
                        onClick={() => setPartColor(part.id, preset.color)}
                      />
                    ))}
                    <SwatchInput
                      value={customOf(value, PART_COLOR_PRESETS)}
                      fallback={mainColor || theme.accent}
                      label={`${part.name}自定义颜色`}
                      title={`${part.name}：自定义颜色`}
                      onChange={(color) => setPartColor(part.id, color)}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setPartColor(part.id, '')}
                    title="恢复"
                    aria-label={`恢复${part.name}模板原色`}
                    className={`rounded-md p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-900 ${
                      value ? '' : 'invisible'
                    }`}
                  >
                    <Undo2 size={12} />
                  </button>
                </div>
              );
            })}
          </div>
        </Row>
      </div>
    </div>
  );
}
