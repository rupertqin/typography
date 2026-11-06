import { SlidersHorizontal } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface AppHeaderProps {
  icon: LucideIcon;
  title: string;
  /** 说明文字不占版面，压进 title 提示里 */
  description: string;
  /** 主操作（复制到公众号） */
  actions?: ReactNode;
  /** 右侧「样式」按钮：开合顶部样式区 */
  styleOpen: boolean;
  onToggleStyle: () => void;
}

/**
 * 顶栏（参考 doocs-md 的 header）：白色 + 一条下边框 + 毛玻璃，60px。
 * 左边品牌图标和标题，右边只放主操作与「样式」开关，其余入口都在下面那条工具条里。
 */
export default function AppHeader({
  icon: Icon,
  title,
  description,
  actions,
  styleOpen,
  onToggleStyle,
}: AppHeaderProps) {
  return (
    <header className="flex h-[52px] shrink-0 items-center gap-2 border-b border-zinc-200 bg-white/95 px-3 backdrop-blur sm:gap-3 sm:px-5 lg:h-[60px]">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-zinc-900 text-white">
        <Icon size={16} strokeWidth={2.2} />
      </div>
      <h1 className="min-w-0 flex-1 truncate text-sm font-semibold tracking-tight text-zinc-900" title={description}>
        {title}
      </h1>

      {actions}

      <button
        type="button"
        onClick={onToggleStyle}
        aria-pressed={styleOpen}
        title="样式：配色与排版"
        className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium transition-colors sm:px-3 ${
          styleOpen
            ? 'border-zinc-300 bg-zinc-100 text-zinc-900'
            : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
        }`}
      >
        <SlidersHorizontal size={13} />
        <span className="hidden sm:inline">样式</span>
      </button>
    </header>
  );
}
