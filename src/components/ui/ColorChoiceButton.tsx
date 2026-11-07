import { readableInk } from '../../lib/recolor';

/** 表示「没有颜色」（如引用底色的「无背景」）：没有颜色可填，圆点里画一条斜线 */
export const NO_COLOR = 'transparent';

interface ColorChoiceButtonProps {
  /** 这颗按钮代表的颜色；NO_COLOR 表示无颜色 */
  color: string;
  label: string;
  active: boolean;
  onClick: () => void;
  title?: string;
  ariaLabel?: string;
}

/**
 * 选颜色的按钮：全站只有这一个（链接色、引用底色、模板原色、标题跟随主题都用它）。
 *
 * 与链接色一致的两态：未选中是白底 + 该色的小圆点，选中时整颗填成该色
 * （文字色按底色深浅取白/深，浅色补一圈更深的描边，免得近白的底色糊在面板上）。
 * 没有颜色的选项（无背景 / 主题本身没给底色）填不了色，就常驻斜线点，选中靠深色描边。
 */
export default function ColorChoiceButton({
  color,
  label,
  active,
  onClick,
  title,
  ariaLabel,
}: ColorChoiceButtonProps) {
  const none = !color || color === NO_COLOR;
  const ink = none ? '' : readableInk(color);
  const light = !none && ink === '#18181b';
  const filled = active && !none;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={ariaLabel ?? label}
      title={title ?? label}
      style={
        filled
          ? {
              backgroundColor: color,
              borderColor: light ? 'rgba(0,0,0,0.25)' : color,
              color: ink,
            }
          : undefined
      }
      className={`inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md border bg-white px-2.5 text-xs transition-colors ${
        filled
          ? 'font-medium'
          : active
            ? 'border-zinc-900 font-medium text-zinc-900'
            : 'border-zinc-200 text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900'
      }`}
    >
      {!filled && (
        <span
          className={`relative h-4 w-4 shrink-0 overflow-hidden rounded-full ring-1 ring-inset ${
            none || light ? 'ring-black/20' : 'ring-black/10'
          }`}
          style={{ backgroundColor: none ? '#ffffff' : color }}
          aria-hidden
        >
          {none && (
            <span className="absolute left-1/2 top-1/2 h-px w-[22px] -translate-x-1/2 -translate-y-1/2 rotate-45 bg-zinc-300" />
          )}
        </span>
      )}
      {label}
    </button>
  );
}
