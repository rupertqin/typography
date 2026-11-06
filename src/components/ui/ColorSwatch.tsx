import { Check } from 'lucide-react';

/** '#07c160' / '#0c1' → 相对亮度，用来决定对勾用黑还是白 */
function inkOn(color: string): string {
  const hex = color.trim().replace(/^#/, '');
  if (!/^[0-9a-f]{3,8}$/i.test(hex)) return '#ffffff';
  const full =
    hex.length === 3
      ? hex
          .split('')
          .map((char) => char + char)
          .join('')
      : hex.slice(0, 6);
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  const luma = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luma > 0.62 ? '#18181b' : '#ffffff';
}

/**
 * 色块：外圈是 24px 的 1px 边框框（选中时变深色），内圈留 2px 白色间隙再放颜色，
 * 这样深色、浅色都看得出「选中」，也和按钮统一的 rounded-md + 细边框语言一致。
 */
const FRAME = 'flex h-6 w-6 shrink-0 items-center justify-center rounded-md border p-[2px] transition-colors';
const CHIP = 'flex h-full w-full items-center justify-center rounded-[4px] ring-1 ring-inset ring-black/10';
const ACTIVE = 'border-zinc-900';
const IDLE = 'border-transparent hover:border-zinc-300';

/** 色轮：一眼就是「任意颜色」，比加号更像取色入口 */
const WHEEL =
  'conic-gradient(from 210deg, #f43f5e, #f59e0b, #22c55e, #06b6d4, #6366f1, #d946ef, #f43f5e)';

interface SwatchProps {
  color: string;
  name: string;
  active: boolean;
  onClick: () => void;
}

export function Swatch({ color, name, active, onClick }: SwatchProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={name}
      aria-label={`使用${name}`}
      aria-pressed={active}
      className={`${FRAME} ${active ? ACTIVE : IDLE}`}
    >
      <span className={CHIP} style={{ background: color }}>
        {active && <Check size={11} strokeWidth={3.2} style={{ color: inkOn(color) }} />}
      </span>
    </button>
  );
}

interface SwatchInputProps {
  /** 当前值；空字符串表示还没单独调过 */
  value: string;
  /** 打开取色器时的初始颜色（通常是主题主色） */
  fallback: string;
  onChange: (color: string) => void;
  label: string;
  title?: string;
}

/** 自定义取色：与 Swatch 同一套尺寸，未自定义时是一枚小色轮，点了调起系统取色器 */
export function SwatchInput({ value, fallback, onChange, label, title = '自定义颜色' }: SwatchInputProps) {
  const filled = Boolean(value);
  return (
    <label
      title={title}
      className={`relative ${FRAME} ${filled ? ACTIVE : IDLE} cursor-pointer`}
    >
      <span className={CHIP} style={filled ? { background: value } : { background: WHEEL }}>
        {filled ? (
          <Check size={11} strokeWidth={3.2} style={{ color: inkOn(value) }} />
        ) : (
          <span className="h-[9px] w-[9px] rounded-full bg-white ring-1 ring-inset ring-black/10" />
        )}
      </span>
      <input
        type="color"
        value={filled ? value : fallback}
        onChange={(event) => onChange(event.target.value)}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        aria-label={label}
      />
    </label>
  );
}
