import { Check } from 'lucide-react';
import { readableInk } from '../../lib/recolor';

/**
 * 色块：24px 圆形，内圈留 2px 白色间隙再放颜色（浅色也有一圈极细描边）。
 * 选中态是「白色留白 + 深色细环」的双环，比原来的深色实边框更轻；未选中悬停时轻微放大。
 */
const FRAME = 'flex h-6 w-6 shrink-0 items-center justify-center rounded-full p-[2px] transition-all';
const CHIP = 'flex h-full w-full items-center justify-center rounded-full ring-1 ring-inset ring-black/10';
const ACTIVE = 'ring-2 ring-zinc-900 ring-offset-2 ring-offset-white';
const IDLE = 'ring-1 ring-transparent hover:scale-110 hover:ring-zinc-300';

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
        {active && <Check size={11} strokeWidth={3.2} style={{ color: readableInk(color) }} />}
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
          <Check size={11} strokeWidth={3.2} style={{ color: readableInk(value) }} />
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
