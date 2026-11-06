import { useEffect, useRef, useState } from 'react';
import { renderMarkdown } from '../../lib/render';
import type { Theme } from '../../lib/themes';

/** 主题卡里的小样：标题 + 正文 + 引用，足以看出装饰与配色差异 */
const MINI_SAMPLE = `## 小标题样式

正文是这样的，**重点内容**会被强调。

> 引用块长这样`;

const MINI_WIDTH = 360;
const cache = new Map<string, string>();

function getMiniHtml(theme: Theme): string {
  const cached = cache.get(theme.id);
  if (cached) return cached;
  const html = renderMarkdown(MINI_SAMPLE, theme);
  cache.set(theme.id, html);
  return html;
}

interface ThemeCardProps {
  theme: Theme;
  isNew?: boolean;
}

export default function ThemeCard({ theme, isNew = false }: ThemeCardProps) {
  const holder = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);

  useEffect(() => {
    const node = holder.current;
    if (!node) return;
    const update = () => setScale(node.clientWidth / MINI_WIDTH || 1);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="relative">
      <div
        ref={holder}
        className="h-[108px] select-none overflow-hidden rounded-md bg-white pointer-events-none"
      >
        <div
          style={{ width: MINI_WIDTH, transform: `scale(${scale})`, transformOrigin: 'top left' }}
          dangerouslySetInnerHTML={{ __html: getMiniHtml(theme) }}
        />
      </div>
      {isNew && (
        <span className="absolute right-1 top-1 rounded bg-rose-500 px-1.5 py-px text-[10px] font-bold leading-4 text-white">
          新
        </span>
      )}
    </div>
  );
}
