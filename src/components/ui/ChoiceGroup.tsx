import ColorChoiceButton from './ColorChoiceButton';

export interface Choice<T> {
  value: T;
  label: string;
  /** 悬停提示，默认用 label */
  title?: string;
  /** 选项本身代表的颜色：作为按钮里的圆点显示，未选/选中都不变 */
  color?: string;
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
 * 档位按钮照 doocs-md 的做法：选中是浅灰底 + 一圈细边 + 一点投影（不是深色实底），
 * 未选是白底细边，高度统一 28px，鼠标移过去只变底色不变尺寸。
 *
 * 带 color 的选项交给 ColorChoiceButton 画，与「模板原色」「跟随主题」这些
 * 单独的颜色按钮共用同一个组件，样式与交互不会再分叉。
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

        if (option.color) {
          return (
            <ColorChoiceButton
              key={String(option.value)}
              color={option.color}
              label={option.label}
              active={active}
              title={option.title}
              ariaLabel={ariaLabel(option)}
              onClick={() => onChange(option.value)}
            />
          );
        }

        return (
          <button
            key={String(option.value)}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={active}
            aria-label={ariaLabel(option)}
            title={option.title ?? option.label}
            className={`inline-flex h-7 items-center justify-center gap-1.5 rounded-md border px-2.5 text-xs transition-colors ${
              active
                ? 'border-zinc-300 bg-zinc-100 font-medium text-zinc-900 shadow-sm'
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
