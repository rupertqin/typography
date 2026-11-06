import type { ReactNode } from 'react';

interface RowProps {
  label: string;
  /** 说明只进 title 提示，不占版面——顶部样式区要的是紧凑 */
  hint?: string;
  children: ReactNode;
  className?: string;
}

/** 检查器式的一行：左侧固定宽度标签，右侧控件 */
export default function Row({ label, hint, children, className = '' }: RowProps) {
  return (
    <div className={`flex items-start gap-3 ${className}`}>
      <span
        title={hint}
        className={`w-14 shrink-0 pt-1.5 text-[11px] leading-none ${
          hint ? 'cursor-help text-zinc-500' : 'text-zinc-500'
        }`}
      >
        {label}
      </span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
