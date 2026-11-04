import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface ToolPanelProps {
  title?: string;
  icon?: LucideIcon;
  extra?: ReactNode;
  className?: string;
  bodyClassName?: string;
  fill?: boolean;
  children: ReactNode;
}

/** 白色卡片容器：卡头（图标 + 标题 + 右侧插槽）+ 内容区 */
export default function ToolPanel({
  title,
  icon: Icon,
  extra,
  className = '',
  bodyClassName = 'p-5',
  fill = false,
  children,
}: ToolPanelProps) {
  return (
    <section
      className={`${
        fill ? 'flex min-h-0 flex-col' : 'shrink-0'
      } rounded-2xl bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_16px_-4px_rgba(0,0,0,0.06)] ring-1 ring-zinc-900/5 ${className}`}
    >
      {title && (
        <div className="flex items-center justify-between gap-2 px-5 pt-5">
          <div className="flex min-w-0 items-center gap-2.5">
            {Icon && (
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-500">
                <Icon size={15} />
              </span>
            )}
            <h2 className="truncate text-[15px] font-semibold text-zinc-800">{title}</h2>
          </div>
          {extra}
        </div>
      )}
      <div className={fill ? `min-h-0 flex-1 ${bodyClassName}` : bodyClassName}>{children}</div>
    </section>
  );
}
