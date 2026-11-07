import {
  Bold,
  ChevronDown,
  CodeXml,
  Heading2,
  Image as ImageIcon,
  Minus,
  Quote,
  Redo2,
  RotateCcw,
  SlidersHorizontal,
  Trash2,
  Undo2,
  Workflow,
} from 'lucide-react';
import { FONT_FAMILIES, FONT_SCALES, INSERT_ACTIONS, ZOOM_LEVELS } from '../../lib/constants';
import { themeFontId } from '../../lib/themes/fonts';
import { useTypographyStore } from '../../lib/store';
import type { Theme } from '../../lib/themes';
import type { EditorController } from '../../lib/useEditorController';
import ThemePicker from '../theme/ThemePicker';

const ICONS = {
  heading: Heading2,
  bold: Bold,
  quote: Quote,
  code: CodeXml,
  mermaid: Workflow,
  image: ImageIcon,
  hr: Minus,
} as const;

/**
 * 工具条统一口径：所有可见控件 32px 高、12px 文字、14px 图标（与顶栏按钮 / Select 一致）。
 * 分组外壳自己占满 h-8（border 计入高度），内部按钮用 h-full 填满，不再靠各自 padding 撑高。
 */
const TOOL_BUTTON_BASE =
  'inline-flex items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900';
const BARE_ICON_BUTTON = `${TOOL_BUTTON_BASE} h-8 w-8 shrink-0`;
const DISABLED_ICON_BUTTON = `${BARE_ICON_BUTTON} disabled:pointer-events-none disabled:opacity-30`;
const GROUP_ICON_BUTTON = `${TOOL_BUTTON_BASE} h-full w-7 shrink-0`;
const GROUP = 'flex h-8 shrink-0 items-center gap-0.5 rounded-md border border-zinc-200 p-px';

const SEGMENTED_BUTTON =
  'inline-flex h-full shrink-0 items-center justify-center rounded px-1.5 text-xs tabular-nums transition-colors';
const SEGMENTED_ACTIVE = 'bg-zinc-100 font-medium text-zinc-900 shadow-sm';
const SEGMENTED_IDLE = 'text-zinc-500 hover:text-zinc-800';

const UNDO_TITLE = '撤销（⌘/Ctrl + Z）';
const REDO_TITLE = '重做（⌘/Ctrl + Shift + Z）';

interface WorkbenchBarProps {
  editor: EditorController;
  theme: Theme;
  /** 窄屏把主题选择器单独放一行，浮层才能用整宽（与原来预览区的落点一致） */
  isMobile: boolean;
  /** 「样式」开关：开合工具条下方的样式区 */
  styleOpen: boolean;
  onToggleStyle: () => void;
}

/**
 * 工作台工具条：左边是编辑动作（插入 / 撤销重做 / 示例清空），右边是视图动作（主题、字体、字号、缩放）。
 *
 * 编辑动作靠 useEditorController 与左栏共用一份状态，所以工具条不需要包在编辑区里。
 */
export default function WorkbenchBar({ editor, theme, isMobile, styleOpen, onToggleStyle }: WorkbenchBarProps) {
  const zoom = useTypographyStore((state) => state.previewZoom);
  const setZoom = useTypographyStore((state) => state.setPreviewZoom);
  const activeZoom = ZOOM_LEVELS.includes(zoom) ? zoom : 1;
  const fontScale = useTypographyStore((state) => state.fontScale);
  const setFontScale = useTypographyStore((state) => state.setFontScale);
  const fontFamilyId = useTypographyStore((state) => state.fontFamilyId);
  const setFontFamilyId = useTypographyStore((state) => state.setFontFamilyId);
  // 'theme' 是内部默认值（跟随主题）：下拉里不留这一项，直接显示主题实际用的那个字体
  const resolvedFontId = fontFamilyId === 'theme' ? themeFontId(theme.styles.wrapper) : fontFamilyId;
  const baseFonts = FONT_FAMILIES.filter((font) => !font.iosOnly);
  const iosFonts = FONT_FAMILIES.filter((font) => font.iosOnly);

  return (
    <div
      data-workbench
      className="flex shrink-0 flex-wrap items-center gap-x-2 gap-y-1.5 border-b border-zinc-200 bg-white px-3 py-2 lg:px-5"
    >
      <div className={GROUP}>
        {INSERT_ACTIONS.map((action) => {
          const Icon = ICONS[action.id as keyof typeof ICONS];
          return (
            <button
              key={action.id}
              type="button"
              onClick={() => editor.insert(action)}
              title={action.title}
              aria-label={action.title}
              className={GROUP_ICON_BUTTON}
            >
              <Icon size={14} />
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-0.5">
        <button
          type="button"
          onClick={editor.undo}
          disabled={!editor.canUndo}
          className={DISABLED_ICON_BUTTON}
          title={UNDO_TITLE}
          aria-label={UNDO_TITLE}
        >
          <Undo2 size={14} />
        </button>
        <button
          type="button"
          onClick={editor.redo}
          disabled={!editor.canRedo}
          className={DISABLED_ICON_BUTTON}
          title={REDO_TITLE}
          aria-label={REDO_TITLE}
        >
          <Redo2 size={14} />
        </button>
      </div>

      <div className="flex items-center gap-0.5">
        <button
          type="button"
          onClick={editor.restoreSample}
          className={BARE_ICON_BUTTON}
          title="恢复示例"
          aria-label="恢复示例"
        >
          <RotateCcw size={14} />
        </button>
        <button
          type="button"
          onClick={editor.clear}
          className={`${BARE_ICON_BUTTON} hover:!bg-red-50 hover:!text-red-500 ${
            editor.hasContent ? '' : 'pointer-events-none opacity-30'
          }`}
          title="清空"
          aria-label="清空"
        >
          <Trash2 size={14} />
        </button>
      </div>

      <div className="mx-0.5 hidden h-5 w-px shrink-0 bg-zinc-200 sm:block" />

      <div className="ml-auto flex flex-wrap items-center gap-2">
        {!isMobile && <ThemePicker theme={theme} inHeader />}

        <label
          className="flex h-8 shrink-0 items-center gap-1 rounded-md border border-zinc-200 px-1.5"
          title="正文字体：公众号只认读者设备自带的字体，选不到会回退系统默认"
        >
          <span className="hidden text-xs text-zinc-400 sm:inline">字体</span>
          <select
            value={resolvedFontId}
            onChange={(event) => setFontFamilyId(event.target.value)}
            aria-label="正文字体"
            className="h-full cursor-pointer bg-transparent pr-0.5 text-xs text-zinc-600 focus:outline-none"
          >
            {baseFonts.map((font) => (
              <option key={font.id} value={font.id}>
                {font.label}
              </option>
            ))}
            <optgroup label="苹果系统字体（安卓回退默认）">
              {iosFonts.map((font) => (
                <option key={font.id} value={font.id}>
                  {font.label}（限 iOS）
                </option>
              ))}
            </optgroup>
          </select>
        </label>

        <div className={GROUP} title="整体字号，复制到公众号后同样生效">
          <span className="hidden pl-1 pr-0.5 text-xs text-zinc-400 sm:inline">字号</span>
          {FONT_SCALES.map((scale) => (
            <button
              key={scale.value}
              type="button"
              onClick={() => setFontScale(scale.value)}
              aria-pressed={scale.value === fontScale}
              aria-label={`整体字号${scale.label}`}
              className={`${SEGMENTED_BUTTON} ${scale.value === fontScale ? SEGMENTED_ACTIVE : SEGMENTED_IDLE}`}
            >
              {scale.label}
            </button>
          ))}
        </div>

        <div className={GROUP} title="缩小预览，一屏看整篇结构（不影响复制结果）">
          {ZOOM_LEVELS.map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => setZoom(level)}
              aria-pressed={level === activeZoom}
              className={`${SEGMENTED_BUTTON} ${level === activeZoom ? SEGMENTED_ACTIVE : SEGMENTED_IDLE}`}
            >
              {level * 100}%
            </button>
          ))}
        </div>

        {/* 工具条最右端：「样式」开关，开合紧贴其下的样式区 */}
        <button
          type="button"
          onClick={onToggleStyle}
          aria-pressed={styleOpen}
          title="样式：配色与排版"
          className="ml-1 inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-2.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-900"
        >
          <SlidersHorizontal size={14} />
          <span>样式</span>
          <ChevronDown
            size={12}
            strokeWidth={2.4}
            aria-hidden
            className={`transition-transform duration-200 ${styleOpen ? 'rotate-180' : ''}`}
          />
        </button>
      </div>

      {isMobile && (
        <div className="w-full">
          <ThemePicker theme={theme} />
        </div>
      )}
    </div>
  );
}
