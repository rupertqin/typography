export interface Choice<T> {
  value: T;
  label: string;
  /** 悬停提示，默认用 label */
  title?: string;
}

interface ChoiceGroupProps<T> {
  options: ReadonlyArray<Choice<T>>;
  value: T;
  onChange: (value: T) => void;
  ariaLabel: (option: Choice<T>) => string;
  className?: string;
}

/**
 * 单选胶囊组（radio 语义，用 aria-pressed 表达）。
 *
 * 参考 doocs-md 用 shadcn primary 的做法：选中项是深色实底，未选是白底细边，
 * 高度统一 28px，鼠标移上去只变底色不变尺寸——比原来的小灰块更稳。
 */
export default function ChoiceGroup<T extends string | number>({
  options,
  value,
  onChange,
  ariaLabel,
  className = '',
}: ChoiceGroupProps<T>) {
  return (
    <div role="group" className={`flex flex-wrap items-center gap-1.5 ${className}`}>
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
            className={`inline-flex h-7 items-center justify-center rounded-md border px-2.5 text-xs transition-colors ${
              active
                ? 'border-zinc-900 bg-zinc-900 font-medium text-white'
                : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
