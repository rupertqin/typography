import { ArrowLeft } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { resolveBackHref } from '../../lib/backUrl';

interface AppHeaderProps {
  icon: LucideIcon;
  title: string;
  /** 说明文字不占版面，压进 title 提示里 */
  description: string;
  actions?: ReactNode;
}

/**
 * 父站地址的判定见 lib/backUrl.ts：子路径取同域上一级，独立子域名根才用 PUBLIC_BACK_URL。
 */
const BACK_URL = import.meta.env.PUBLIC_BACK_URL as string | undefined;

const backHref = (): string | undefined => {
  if (typeof window === 'undefined') return undefined;
  return resolveBackHref(window.location.pathname, window.location.href, BACK_URL);
};

/** 顶栏：单行，左侧图标 + 标题，右侧返回站点与主要动作（复制） */
export default function AppHeader({ icon: Icon, title, description, actions }: AppHeaderProps) {
  const backUrl = backHref();

  return (
    <header className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-b border-zinc-200/80 bg-white px-3 py-2.5 sm:px-5 lg:h-14 lg:flex-nowrap lg:py-0">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 text-white shadow-md shadow-emerald-500/30">
        <Icon size={16} strokeWidth={2.2} />
      </div>
      <h1 className="min-w-0 flex-1 truncate text-[15px] font-bold tracking-tight text-zinc-900" title={description}>
        {title}
      </h1>
      {(backUrl || actions) && (
        <div className="flex items-center gap-2 max-sm:w-full max-sm:justify-end">
          {backUrl && (
            <a
              href={backUrl}
              aria-label="返回站点"
              className="inline-flex items-center gap-1 rounded-xl border border-zinc-200 bg-white px-2.5 py-2 text-xs font-medium text-zinc-500 transition-colors duration-200 hover:border-zinc-300 hover:text-zinc-700 sm:px-3"
            >
              <ArrowLeft size={13} />
              <span className="hidden sm:inline">返回站点</span>
            </a>
          )}
          {actions}
        </div>
      )}
    </header>
  );
}
