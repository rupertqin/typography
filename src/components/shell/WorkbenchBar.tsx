import { Bold, CodeXml, Heading2, Image as ImageIcon, Minus, Quote, Redo2, RotateCcw, Trash2, Undo2, Workflow } from 'lucide-react';
import { FONT_FAMILIES, FONT_SCALES, INSERT_ACTIONS, ZOOM_LEVELS } from '../../lib/constants';
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

const TOOL_BUTTON =
  'rounded p-1.5 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900';
const TOOL_BUTTON_DISABLED = `${TOOL_BUTTON} disabled:pointer-events-none disabled:opacity-30`;

const SEGMENTED_BUTTON = 'rounded px-1.5 py-0.5 tabular-nums transition-colors';
const SEGMENTED_ACTIVE = 'bg-zinc-100 font-medium text-zinc-900';
const SEGMENTED_IDLE = 'text-zinc-500 hover:text-zinc-800';

const UNDO_TITLE = '撤销（⌘/Ctrl + Z）';
const REDO_TITLE = '重做（⌘/Ctrl + Shift + Z）';

interface WorkbenchBarProps {
  editor: EditorController;
  theme: Theme;
  /** 窄屏把主题选择器单独放一行，浮层才能用整宽（与原来预览区的落点一致） */
  isMobile: boolean;
}

/**
 * 工作台工具条：左边是编辑动作（插入 / 撤销重做 / 示例清空），右边是视图动作（主题、字体、字号、缩放）。
 *
 * 编辑动作靠 useEditorController 与左栏共用一份状态，所以工具条不需要包在编辑区里。
 */
export default function WorkbenchBar({ editor, theme, isMobile }: WorkbenchBarProps) {
  const zoom = useTypographyStore((state) => state.previewZoom);
  const setZoom = useTypographyStore((state) => state.setPreviewZoom);
  const activeZoom = ZOOM_LEVELS.includes(zoom) ? zoom : 1;
  const fontScale = useTypographyStore((state) => state.fontScale);
  const setFontScale = useTypographyStore((state) => state.setFontScale);
  const fontFamilyId = useTypographyStore((state) => state.fontFamilyId);
  const setFontFamilyId = useTypographyStore((state) => state.setFontFamilyId);
  const baseFonts = FONT_FAMILIES.filter((font) => !font.iosOnly);
  const iosFonts = FONT_FAMILIES.filter((font) => font.iosOnly);

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-x-2 gap-y-1.5 border-b border-zinc-200 bg-white px-3 py-2 lg:px-5">
      <div className="flex items-center gap-0.5 rounded-md border border-zinc-200 p-0.5">
        {INSERT_ACTIONS.map((action) => {
          const Icon = ICONS[action.id as keyof typeof ICONS];
          return (
            <button
              key={action.id}
              type="button"
              onClick={() => editor.insert(action)}
              title={action.title}
              aria-label={action.title}
              className={TOOL_BUTTON}
            >
              <Icon size={15} />
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-0.5">
        <button
          type="button"
          onClick={editor.undo}
          disabled={!editor.canUndo}
          className={TOOL_BUTTON_DISABLED}
          title={UNDO_TITLE}
          aria-label={UNDO_TITLE}
        >
          <Undo2 size={14} />
        </button>
        <button
          type="button"
          onClick={editor.redo}
          disabled={!editor.canRedo}
          className={TOOL_BUTTON_DISABLED}
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
          className={TOOL_BUTTON}
          title="恢复示例"
          aria-label="恢复示例"
        >
          <RotateCcw size={14} />
        </button>
        <button
          type="button"
          onClick={editor.clear}
          className={`${TOOL_BUTTON} hover:!bg-red-50 hover:!text-red-500 ${
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
          className="flex shrink-0 items-center gap-1 rounded-md border border-zinc-200 px-1.5 py-1"
          title="正文字体：公众号只认读者设备自带的字体，选不到会回退系统默认"
        >
          <span className="hidden text-[11px] text-zinc-400 sm:inline">字体</span>
          <select
            value={fontFamilyId}
            onChange={(event) => setFontFamilyId(event.target.value)}
            aria-label="正文字体"
            className="cursor-pointer bg-transparent py-0 pr-0.5 text-[11px] text-zinc-600 focus:outline-none"
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

        <div
          className="flex shrink-0 items-center gap-0.5 rounded-md border border-zinc-200 p-0.5"
          title="整体字号，复制到公众号后同样生效"
        >
          <span className="hidden pl-1 pr-0.5 text-[11px] text-zinc-400 sm:inline">字号</span>
          {FONT_SCALES.map((scale) => (
            <button
              key={scale.value}
              type="button"
              onClick={() => setFontScale(scale.value)}
              aria-pressed={scale.value === fontScale}
              aria-label={`整体字号${scale.label}`}
              className={`${SEGMENTED_BUTTON} text-[11px] ${scale.value === fontScale ? SEGMENTED_ACTIVE : SEGMENTED_IDLE}`}
            >
              {scale.label}
            </button>
          ))}
        </div>

        <div
          className="flex shrink-0 items-center gap-0.5 rounded-md border border-zinc-200 p-0.5"
          title="缩小预览，一屏看整篇结构（不影响复制结果）"
        >
          {ZOOM_LEVELS.map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => setZoom(level)}
              aria-pressed={level === activeZoom}
              className={`${SEGMENTED_BUTTON} text-[11px] ${level === activeZoom ? SEGMENTED_ACTIVE : SEGMENTED_IDLE}`}
            >
              {level * 100}%
            </button>
          ))}
        </div>
      </div>

      {isMobile && (
        <div className="w-full">
          <ThemePicker theme={theme} />
        </div>
      )}
    </div>
  );
}
