import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface AppHeaderProps {
  icon: LucideIcon;
  /** 品牌标语（slogan），跟图标一起构成 LOGO 块 */
  title: string;
  /** 说明文字不占版面，压进 title 提示里 */
  description: string;
  /** 菜单栏（文件 / 编辑 / 插入 / 视图），排在 LOGO 块之后 */
  menu?: ReactNode;
  /** 主操作（复制） */
  actions?: ReactNode;
}

/**
 * 顶栏（参考 doocs-md 的 header）：白色 + 一条下边框 + 毛玻璃，60px。
 * 左边是 LOGO 块（图标 + 标语，两者是一体的），紧跟菜单栏；右边只放主操作，
 * 其余入口（含「样式」开关）都在下面那条工具条里。
 */
export default function AppHeader({ icon: Icon, title, description, menu, actions }: AppHeaderProps) {
  return (
    // relative + z-40：backdrop-blur 会自建层叠上下文，菜单面板的 z-50 就出不了这一层，
    // 会被下面的工具条（白底）盖住——把顶栏整层抬起来才能让下拉压在工具条上面。
    <header className="relative z-40 flex h-[52px] shrink-0 items-center gap-2 border-b border-zinc-200 bg-white/95 px-3 backdrop-blur sm:gap-3 sm:px-5 lg:h-[60px]">
      {/* LOGO 块：图标 + 标语。窄屏只截标语，图标不缩 */}
      <div className="flex min-w-0 items-center gap-2">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[var(--ui-primary)] text-white">
          <Icon size={16} strokeWidth={2.2} />
        </div>
        <h1
          className="min-w-0 truncate text-sm font-semibold tracking-tight text-zinc-900"
          title={description}
        >
          {title}
        </h1>
      </div>

      {menu}

      {/* 撑开中间的空档，把主操作顶到最右 */}
      <div className="min-w-0 flex-1" />

      {actions}
    </header>
  );
}
