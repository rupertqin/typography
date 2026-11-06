interface SegmentedOption<T> {
  value: T;
  label: string;
  title?: string;
}

interface SegmentedProps<T extends string | number> {
  options: ReadonlyArray<SegmentedOption<T>>;
  value: T;
  onChange: (value: T) => void;
  /** 无障碍名：读屏与自动化测试都靠它区分各组 */
  ariaLabel: (option: SegmentedOption<T>) => string;
  className?: string;
}

/**
 * 分段控件：与预览底栏（字体/字号/缩放）同一套视觉语言，选中态是白底 + emerald 文字。
 */
export default function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  ariaLabel,
  className = '',
}: SegmentedProps<T>) {
  return (
    <div className={`flex flex-wrap items-center gap-0.5 rounded-md bg-zinc-100 p-0.5 ${className}`}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={String(option.value)}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={active}
            aria-label={ariaLabel(option)}
            title={option.title ?? option.label}
            className={`flex-1 whitespace-nowrap rounded px-1.5 py-0.5 text-[11px] tabular-nums transition-all ${
              active ? 'bg-white font-medium text-emerald-700 shadow-sm' : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
