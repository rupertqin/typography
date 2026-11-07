import { useState } from 'react';
import { Undo2 } from 'lucide-react';
import {
  BLOCKQUOTE_BG_OPTIONS,
  BLOCK_SPACING_OPTIONS,
  HEADING_STYLE_OPTIONS,
  LINE_HEIGHT_OPTIONS,
  LINK_COLOR_OPTIONS,
  MAIN_COLOR_PRESETS,
  PART_COLOR_PRESETS,
} from '../../lib/constants';
import { availableColorParts, isHexColor, resolveThemeColor, rgbaFromHex } from '../../lib/recolor';
import { themeLineHeight, themePaddingX } from '../../lib/render-helpers';
import { useTypographyStore } from '../../lib/store';
import type { ColorPreset, HeadingLevels, HeadingStyleType } from '../../lib/types';
import type { Theme } from '../../lib/themes';
import ChoiceGroup from '../ui/ChoiceGroup';
import ColorChoiceButton, { NO_COLOR } from '../ui/ColorChoiceButton';
import { Swatch, SwatchInput } from '../ui/ColorSwatch';
import Row from '../ui/Row';
import Select from '../ui/Select';
import CodeThemePicker from './CodeThemePicker';

/** 标题级别：与 applyHeadingStyles 支持的 H1–H6 一致 */
const LEVELS: HeadingLevels[] = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];

/**
 * 正文左右边距档位：没有「主题」项——跟随主题时控件直接显示主题自带的值，
 * 所以任何时候都有一档是选中的（主题值是 0 就选中 0）。
 */
/** 卡片外的左右留白（px）：0 = 贴到公众号正文容器边缘 */
const PAGE_MARGIN_OPTIONS: Array<{ value: number; label: string; title: string }> = [
  { value: 0, label: '0', title: '不加外边距（0px）' },
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

/**
 * 配色 + 排版合在一起的一页设置（参考 doocs-md 样式面板的属性表）：
 * 左侧固定宽度标签、右侧控件的检查器布局，宽屏分栏，尽可能少占竖向空间。
 *
 * 分栏按「改什么」来：颜色（主色、链接色、引用底色、单独调色）、版式与标题
 * （段间距、行距、左右边距、标题样式、代码配色）。
 * 窄屏竖向叠一列；lg 起分两栏（颜色 | 版式与标题）；xl 起三栏（基础色 | 单独调色 | 版式与标题），
 * 靠颜色组那层的 `xl:contents` 把它拆成两个 flex 子项实现，DOM 只有一套。
 * 各块竖向排列，以后某项换栏只需挪一个位置，不会把对侧的行也拽歪。
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
  const headingColors = useTypographyStore((state) => state.headingColors);
  const pageMarginX = useTypographyStore((state) => state.pageMarginX);
  const linkColor = useTypographyStore((state) => state.partColors.link ?? '');
  const setLineHeight = useTypographyStore((state) => state.setLineHeight);
  const setBlockSpacing = useTypographyStore((state) => state.setBlockSpacing);
  const setBlockquoteBackground = useTypographyStore((state) => state.setBlockquoteBackground);
  const setHeadingStyle = useTypographyStore((state) => state.setHeadingStyle);
  const setHeadingColor = useTypographyStore((state) => state.setHeadingColor);
  const setPageMarginX = useTypographyStore((state) => state.setPageMarginX);

  const accent = isHexColor(mainColor) ? mainColor : theme.accent;
  // 「跟随主题」按钮要显示的颜色：与预览同一套重映射算出来，换主色 / 单独调色时跟着变。
  // 链接色的「跟随主题」不能把当前选中的自定义链接色算进去，否则两个按钮会重成一样。
  const themeLinkColor = resolveThemeColor(theme, 'link', 'link', {
    main: mainColor,
    parts: { ...partColors, link: '' },
  });
  const themeQuoteBg = resolveThemeColor(theme, 'blockquote', 'blockquote', { main: mainColor, parts: partColors }, 'background');
  // 参考 doocs-md：先选标题级别，再改这一级的样式（默认 H2）
  const [headingLevel, setHeadingLevel] = useState<HeadingLevels>('h2');
  const headingStyle = headingStyles[headingLevel] ?? 'default';
  const headingColor = headingColors[headingLevel] ?? '';

  // 「左右边距」是卡片外的留白（同公众号的「边距」）：跟随主题 = 不额外加，所以显示 0。
  // 卡片自己的内距（主题的 padding）不算在里面，但要在 hint 里点明，否则有底色的主题
  // 会看起来「选 16 却有 32 的留白」。
  const themePx = themePaddingX(theme.styles.wrapper);
  const marginX = pageMarginX === 'theme' ? 0 : pageMarginX;
  const marginHint =
    themePx > 0
      ? `在主题卡片外留白，同公众号的「边距」；这张卡片本身还有 ${themePx}px 内距`
      : '在正文两侧留白，同公众号的「边距」；预览与复制到公众号一致';

  // 「行距」同理：跟随主题时显示主题自身行距（1.8 / 1.85 不在预设里就临时补一档）
  const themeLh = themeLineHeight(theme.styles.wrapper);
  const lineHeightValue = lineHeight === 'theme' ? themeLh : lineHeight;
  const lineHeightOptions = LINE_HEIGHT_OPTIONS.some((option) => option.value === themeLh)
    ? LINE_HEIGHT_OPTIONS
    : [...LINE_HEIGHT_OPTIONS, { value: themeLh, label: String(themeLh), hint: '主题自带' }].sort(
        (left, right) => left.value - right.value,
      );

  return (
    <div className="thin-scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-3">
      {/* 两栏之间留足间距：左栏右侧是色板/胶囊，右栏左侧是标签，挤在一起会看不清归属 */}
      <div className="flex flex-col gap-y-2 lg:flex-row lg:items-start lg:gap-x-14 xl:gap-x-10">
        {/*
          颜色组：窄屏竖向叠在左栏；两栏时是左栏整列。
          ≥xl 时这一层 `display:contents` 被"抹掉"，里面的「基础色」「单独调色」直接成为
          外层 flex 的子项 —— 于是自动变成三栏，单独调色独占一列。
        */}
        <div className="flex min-w-0 flex-1 flex-col gap-y-2 xl:contents">
          {/* 基础色：主色 / 链接色 / 引用底色 */}
          <div className="flex min-w-0 flex-col gap-y-2 xl:flex-1">
            <Row label="主色" hint="标题、引用、加粗、分割线一起换成这个色系">
              <div className="flex flex-wrap items-center gap-2">
                {/* 与链接色同一套胶囊：未选中是主题色小点，选中才整颗填色 */}
                <ColorChoiceButton
                  color={theme.accent}
                  label="模板原色"
                  title={`模板原色 ${theme.accent}`}
                  active={!mainColor}
                  onClick={() => setMainColor('')}
                />
  
                <span className="mx-0.5 h-5 w-px bg-zinc-200" aria-hidden />
  
                {MAIN_COLOR_PRESETS.map((preset) => (
                  <Swatch
                    key={preset.color}
                    {...preset}
                    active={sameColor(mainColor, preset.color)}
                    onClick={() => setMainColor(preset.color)}
                  />
                ))}
                <SwatchInput
                  value={customOf(mainColor, MAIN_COLOR_PRESETS)}
                  fallback={theme.accent}
                  label="主色自定义"
                  title="自定义主色"
                  onChange={setMainColor}
                />
              </div>
            </Row>
  
            <Row label="链接色" hint="只影响正文里的链接">
              <div className="flex flex-wrap items-center gap-2">
                <ChoiceGroup
                  className="min-w-0"
                  options={LINK_COLOR_OPTIONS.map((option) => ({
                    value: option.color,
                    label: option.name,
                    // 「跟随主题」把自己的底色显示成主题当前解析出来的链接色
                    title: option.color ? `${option.name} ${option.color}` : `跟随主题 ${themeLinkColor}`,
                    color: option.color || themeLinkColor || NO_COLOR,
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
              <div className="flex flex-wrap items-center gap-2">
                <ChoiceGroup
                  className="min-w-0"
                  // 每一项都带颜色，和链接色一样是「选中填色 / 未选中色点」的胶囊。
                  // 「跟随主题」显示主题主色（实色），不能拿主题那层 6% 浅底当按钮色：
                  // #f0f5ff / rgba(accent,0.06) 这类填上去就是一片近乎白的灰，像被加了透明度。
                  options={BLOCKQUOTE_BG_OPTIONS.map((option) => ({
                    value: option.value,
                    label: option.label,
                    title:
                      option.value === ''
                        ? `跟随主题（引用块 ${themeQuoteBg || '无底色'}）`
                        : option.value === 'accent'
                          ? `主题色浅底 ${rgbaFromHex(accent, 0.08)}`
                          : '无背景',
                    color:
                      option.value === ''
                        ? // 跟随主题 = 主题主色（换主色时跟着变）；浅色处理只属于「主题色浅底」
                          accent
                        : option.value === 'accent'
                          ? rgbaFromHex(accent, 0.08) || NO_COLOR
                          : NO_COLOR,
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
                  fallback={accent}
                  onChange={(color) => setBlockquoteBackground(color)}
                  label="引用底色自定义"
                  title="引用底色自定义"
                />
              </div>
            </Row>
          </div>

          {/* 单独调色：≥xl 时独占一列；窄屏与两栏时跟在基础色下面 */}
          <div className="flex min-w-0 flex-col gap-y-2 xl:flex-1">
            <Row label="单独调色" hint={`只改这几处，其他保持${mainColor ? '上面的主色' : '模板原样'}`}>
              <div className="flex flex-col">
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
                      {/* 色板组按内容宽度排，回退按钮紧跟色轮，不再被 flex-1 顶到列尾 */}
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
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

        {/* 右栏：版式与标题 */}
        <div className="flex min-w-0 flex-1 flex-col gap-y-2">
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

          <Row label="行距" hint="跟随主题时显示主题自身的行距；代码块保持自己的节奏">
            <ChoiceGroup
              options={lineHeightOptions.map((option) => ({
                value: option.value,
                label: option.label,
                title: `${option.label}（${option.hint}）`,
              }))}
              value={lineHeightValue}
              onChange={setLineHeight}
              ariaLabel={(option) => `行距${option.label}`}
            />
          </Row>

          <Row label="左右边距" hint={marginHint}>
            <ChoiceGroup
              options={PAGE_MARGIN_OPTIONS}
              value={marginX}
              onChange={setPageMarginX}
              ariaLabel={(option) => `左右边距${option.label}`}
            />
          </Row>

          <Row label="标题样式" hint="先选标题级别，再选这一级要用的装饰">
            <div className="flex flex-col gap-2">
              {/* 参考 doocs-md：级别下拉 + 样式下拉，切级别会显示该级别当前样式 */}
              <div className="flex max-w-xs items-center gap-2">
                <Select
                  value={headingLevel}
                  onChange={(value) => setHeadingLevel(value as HeadingLevels)}
                  ariaLabel="标题级别"
                  title="选择要设置的标题级别"
                  className="w-[120px] shrink-0"
                >
                  {LEVELS.map((level) => (
                    <option key={level} value={level}>
                      {level.toUpperCase()}
                    </option>
                  ))}
                </Select>
                <Select
                  value={headingStyle}
                  onChange={(value) => setHeadingStyle(headingLevel, value as HeadingStyleType)}
                  ariaLabel="标题样式"
                  title="选择该级别标题的装饰样式"
                  className="min-w-0 flex-1"
                >
                  {HEADING_STYLE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </div>

              {/* 只有「自选颜色」才展开颜色选项；跟随主题 = 不设自定义色，沿用主色 */}
              {headingStyle === 'color-only' && (
                <div className="flex max-w-md flex-wrap items-center gap-2">
                  <span className="w-14 shrink-0 text-[11px] text-zinc-400">颜色</span>
                  {/* 与链接色同一套胶囊：未选中是主色小点，选中才整颗填色 */}
                  <ColorChoiceButton
                    color={accent}
                    label="跟随主题"
                    title={`跟随主题主色 ${accent}`}
                    ariaLabel="标题文字色跟随主题"
                    active={!headingColor}
                    onClick={() => setHeadingColor(headingLevel, '')}
                  />
                  {PART_COLOR_PRESETS.map((preset) => (
                    <Swatch
                      key={preset.color}
                      {...preset}
                      active={sameColor(headingColor, preset.color)}
                      onClick={() => setHeadingColor(headingLevel, preset.color)}
                    />
                  ))}
                  <SwatchInput
                    value={customOf(headingColor, PART_COLOR_PRESETS)}
                    fallback={accent}
                    label={`${headingLevel.toUpperCase()}标题文字颜色`}
                    title="自定义标题文字颜色"
                    onChange={(color) => setHeadingColor(headingLevel, color)}
                  />
                </div>
              )}
            </div>
          </Row>

          <Row label="代码配色" hint={`默认跟随「${theme.name}」，可单独指定`}>
            <CodeThemePicker theme={theme} />
          </Row>
        </div>
      </div>
    </div>
  );
}
