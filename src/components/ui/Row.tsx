import type { ReactNode } from 'react';

interface RowProps {
  label: string;
  /** 说明只进 title 提示，不占版面——顶部样式区要的是紧凑 */
  hint?: string;
  children: ReactNode;
  className?: string;
}

/**
 * 检查器式的一行：左侧固定宽度标签，右侧控件。
 *
 * 标签 12px / medium / zinc-700：比档位字（text-xs 常规）重一档就够了，
 * 尺寸压回和控件同一梯队，免得标签在紧凑的顶部样式区里抢戏。
 * 说明文字（若有）走 title，不铺在版面上。
 */
export default function Row({ label, hint, children, className = '' }: RowProps) {
  return (
    <div className={`flex items-start gap-3 ${className}`} title={hint}>
      <span className="w-14 shrink-0 pt-1 text-xs font-medium leading-none text-zinc-700">
        {label}
      </span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
