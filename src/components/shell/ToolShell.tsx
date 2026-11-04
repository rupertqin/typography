import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface ToolShellProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actions?: ReactNode;
  children: ReactNode;
}

/**
 * 工具外壳（compact hero）：渐变图标 + 标题/描述 + 右侧操作区。
 * 骨架与原站 ToolUI 的 ToolShell 一致，仅保留本工具用到的 compact 分支。
 */
export default function ToolShell({ icon: Icon, title, description, actions, children }: ToolShellProps) {
  return (
    <div className="flex flex-col gap-4 lg:h-full lg:min-h-0">
      <header className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 text-white shadow-md shadow-emerald-500/30">
          <Icon size={18} strokeWidth={2.2} />
        </div>
        <div className="flex min-w-[11rem] flex-1 flex-col sm:flex-row sm:items-baseline sm:gap-3">
          <h1 className="shrink-0 text-lg font-bold tracking-tight text-zinc-900">{title}</h1>
          <p className="text-xs text-zinc-400 sm:truncate sm:text-sm">{description}</p>
        </div>
        {actions && (
          <div className="flex max-w-full flex-wrap items-center gap-2 overflow-x-auto max-sm:w-full">
            {actions}
          </div>
        )}
      </header>

      <div className="flex flex-col gap-5 lg:min-h-0 lg:flex-1 lg:flex-row">
        <div className="-m-1.5 flex min-w-0 flex-col gap-5 p-1.5 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
