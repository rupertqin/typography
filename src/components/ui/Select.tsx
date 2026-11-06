import { ChevronDown } from 'lucide-react';
import type { ReactNode } from 'react';

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
  title?: string;
  children: ReactNode;
  className?: string;
}

/**
 * 原生 select + 自绘箭头，样式对齐 doocs 的 shadcn Select：28px 高、细边框、右侧留出箭头位。
 * 用原生元素是为了保留系统下拉的原生可访问性，也省掉一个自研弹层。
 */
export default function Select({
  value,
  onChange,
  ariaLabel,
  title,
  children,
  className = '',
}: SelectProps) {
  return (
    <span className={`relative inline-flex min-w-0 ${className}`}>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={ariaLabel}
        title={title}
        className="h-8 w-full cursor-pointer appearance-none truncate rounded-md border border-zinc-200 bg-white pl-2.5 pr-7 text-xs text-zinc-700 transition-colors hover:border-zinc-300 focus:border-zinc-400 focus:outline-none"
      >
        {children}
      </select>
      <ChevronDown size={12} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400" />
    </span>
  );
}
