import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface AppHeaderProps {
  icon: LucideIcon;
  title: string;
  /** 说明文字不占版面，压进 title 提示里 */
  description: string;
  /** 主操作（复制到公众号） */
  actions?: ReactNode;
}

/**
 * 顶栏（参考 doocs-md 的 header）：白色 + 一条下边框 + 毛玻璃，60px。
 * 左边品牌图标和标题，右边只放主操作；其余入口（含「样式」开关）都在下面那条工具条里。
 */
export default function AppHeader({ icon: Icon, title, description, actions }: AppHeaderProps) {
  return (
    <header className="flex h-[52px] shrink-0 items-center gap-2 border-b border-zinc-200 bg-white/95 px-3 backdrop-blur sm:gap-3 sm:px-5 lg:h-[60px]">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-zinc-900 text-white">
        <Icon size={16} strokeWidth={2.2} />
      </div>
      <h1 className="min-w-0 flex-1 truncate text-sm font-semibold tracking-tight text-zinc-900" title={description}>
        {title}
      </h1>

      {actions}
    </header>
  );
}
