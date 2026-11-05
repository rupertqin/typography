import { ArrowLeft } from 'lucide-react';
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
 * 同一份产物会同时挂在 /typography/（父站反代）与子域根路径，
 * 只在子路径下显示「返回站点」，避免独立访问时出现多余的返回入口
 */
const BACK_URL = import.meta.env.PUBLIC_BACK_URL as string | undefined;

const underSubPath = () =>
  typeof window !== 'undefined' && window.location.pathname.startsWith('/typography');

/**
 * 工具外壳（compact hero）：渐变图标 + 标题/描述 + 右侧操作区。
 */
export default function ToolShell({ icon: Icon, title, description, actions, children }: ToolShellProps) {
  const backUrl = BACK_URL && underSubPath() ? BACK_URL : undefined;

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
        {(backUrl || actions) && (
          <div className="flex max-w-full flex-wrap items-center gap-2 overflow-x-auto max-sm:w-full">
            {backUrl && (
              <a
                href={backUrl}
                className="inline-flex items-center gap-1 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-500 transition-colors duration-200 hover:border-zinc-300 hover:text-zinc-700"
              >
                <ArrowLeft size={13} />
                返回站点
              </a>
            )}
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
