import { Check, Menu as MenuIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import type { LucideIcon } from 'lucide-react';

export interface MenuItemEntry {
  type?: 'item';
  id: string;
  label: string;
  icon?: LucideIcon;
  /** 右侧的快捷键提示（⌘Z 这类），只做展示，不做绑定 */
  shortcut?: string;
  /** 开关型条目：给值就画勾 */
  checked?: boolean;
  disabled?: boolean;
  run: () => void;
}

export interface MenuSeparator {
  type: 'separator';
}

export type MenuEntry = MenuItemEntry | MenuSeparator;

export interface MenuGroup {
  id: string;
  label: string;
  entries: MenuEntry[];
}

interface MenuBarProps {
  groups: MenuGroup[];
  className?: string;
}

const isItem = (entry: MenuEntry): entry is MenuItemEntry => entry.type !== 'separator';

const TRIGGER =
  'inline-flex h-8 items-center rounded-md px-2 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 data-[state=open]:bg-zinc-100 data-[state=open]:text-zinc-900 focus-visible:bg-zinc-100 focus-visible:outline-none';
const PANEL =
  'absolute left-0 top-full z-50 mt-1 min-w-[13.5rem] rounded-lg border border-zinc-200 bg-white p-1 shadow-[0_12px_32px_rgba(24,24,27,0.14)]';
const ITEM =
  'flex h-8 w-full items-center gap-2 rounded px-2 text-left text-xs text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus:bg-zinc-100 focus:text-zinc-900 focus:outline-none disabled:pointer-events-none disabled:text-zinc-300';
const SEPARATOR = 'my-1 h-px bg-zinc-100';

/**
 * 左上角菜单栏（参考 doocs-md 的 header menubar）。
 *
 * 桌面是一排文字触发器（文件 / 编辑 / 插入 / 视图），窄屏折叠成一个 ☰：
 * 展开后把各分组用标题隔开，条目还是同一份。
 *
 * 行为照 Radix 的口径：点开、再点收起；开着一个时鼠标移到别的触发器上直接切换；
 * Esc 收起并把焦点还给触发器；面板内上下键在条目间走。
 * 注意：触发器刻意不用 `aria-expanded`——那个属性被主题下拉占着，
 * 顶上多一个会抢掉按 aria-expanded 找控件的判断。
 */
export default function MenuBar({ groups, className = '' }: MenuBarProps) {
  const [open, setOpen] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  /** 用键盘打开的才抢焦点，鼠标点开就别把焦点从触发器上抢走 */
  const focusOnOpen = useRef(false);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (rootRef.current?.contains(event.target as Node)) return;
      setOpen(null);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  useEffect(() => {
    if (!open) {
      focusOnOpen.current = false;
      return;
    }
    if (!focusOnOpen.current) return;
    focusOnOpen.current = false;
    panelRef.current?.querySelector<HTMLButtonElement>('[data-menu-item]:not(:disabled)')?.focus();
  }, [open]);

  const close = (restoreFocus = true) => {
    const trigger = open ? triggerRefs.current[open] : null;
    setOpen(null);
    if (restoreFocus) trigger?.focus();
  };

  const movableItems = () =>
    Array.from(panelRef.current?.querySelectorAll<HTMLButtonElement>('[data-menu-item]') ?? []).filter(
      (node) => !node.disabled,
    );

  const step = (delta: number) => {
    const items = movableItems();
    if (items.length === 0) return;
    const index = items.indexOf(document.activeElement as HTMLButtonElement);
    const next = items[(index + delta + items.length) % items.length] ?? items[0];
    next?.focus();
  };

  const onPanelKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        step(1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        step(-1);
        break;
      case 'Home':
        event.preventDefault();
        movableItems()[0]?.focus();
        break;
      case 'End': {
        event.preventDefault();
        const items = movableItems();
        items[items.length - 1]?.focus();
        break;
      }
      case 'Escape':
        event.preventDefault();
        // 别让 Esc 继续冒泡：样式面板也监听 Esc，一次按键只该收一层
        event.stopPropagation();
        close();
        break;
      case 'Tab':
        setOpen(null);
        break;
      default:
        break;
    }
  };

  const stepTrigger = (from: string, delta: number) => {
    const index = groups.findIndex((group) => group.id === from);
    if (index < 0) return;
    const next = groups[(index + delta + groups.length) % groups.length];
    triggerRefs.current[next.id]?.focus();
    if (open) setOpen(next.id);
  };

  const onTriggerKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>, groupId: string) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      focusOnOpen.current = true;
      setOpen(groupId);
      return;
    }
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      stepTrigger(groupId, event.key === 'ArrowRight' ? 1 : -1);
      return;
    }
    if (event.key === 'Escape' && open === groupId) {
      event.preventDefault();
      close();
    }
  };

  const renderEntry = (entry: MenuItemEntry) => {
    const Icon = entry.icon;
    return (
      <button
        key={entry.id}
        type="button"
        // 开关型条目要用 menuitemcheckbox，普通条目才是 menuitem
        role={typeof entry.checked === 'boolean' ? 'menuitemcheckbox' : 'menuitem'}
        data-menu-item
        disabled={entry.disabled}
        aria-checked={typeof entry.checked === 'boolean' ? entry.checked : undefined}
        onClick={() => {
          if (entry.disabled) return;
          setOpen(null);
          entry.run();
        }}
        className={ITEM}
      >
        {typeof entry.checked === 'boolean' ? (
          <span className="flex w-3.5 shrink-0 items-center justify-center">
            {entry.checked ? <Check size={13} strokeWidth={2.4} /> : Icon ? <Icon size={14} /> : null}
          </span>
        ) : (
          <span className="flex w-3.5 shrink-0 items-center justify-center">
            {Icon ? <Icon size={14} /> : null}
          </span>
        )}
        <span className="min-w-0 flex-1 truncate">{entry.label}</span>
        {entry.shortcut && (
          <kbd className="ml-1 shrink-0 rounded border border-zinc-200 bg-zinc-50 px-1 font-mono text-[10px] font-medium text-zinc-500">
            {entry.shortcut}
          </kbd>
        )}
      </button>
    );
  };

  // 分隔线没有 id，用前后条目的位置生成一个稳定 key
  const renderEntries = (entries: MenuEntry[]) =>
    entries.map((entry, index) =>
      isItem(entry) ? renderEntry(entry) : <div key={`sep-${index}`} className={SEPARATOR} />,
    );

  const mobileOpen = open === '__mobile__';

  return (
    <div ref={rootRef} className={`flex shrink-0 items-center ${className}`}>
      {/* 桌面：一排文字触发器 */}
      <div className="flex items-center gap-0.5 max-md:hidden">
        {groups.map((group) => (
          <div key={group.id} className="relative">
            <button
              ref={(node) => {
                triggerRefs.current[group.id] = node;
              }}
              type="button"
              aria-haspopup="menu"
              data-state={open === group.id ? 'open' : 'closed'}
              onClick={() => setOpen((current) => (current === group.id ? null : group.id))}
              onMouseEnter={() => {
                if (open && open !== group.id) setOpen(group.id);
              }}
              onKeyDown={(event) => onTriggerKeyDown(event, group.id)}
              className={TRIGGER}
            >
              {group.label}
            </button>

            {open === group.id && (
              <div
                ref={panelRef}
                role="menu"
                aria-label={group.label}
                onKeyDown={onPanelKeyDown}
                className={PANEL}
              >
                {renderEntries(group.entries)}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 窄屏：一个 ☰，展开后按分组列出全部条目 */}
      <div className="relative md:hidden">
        <button
          ref={(node) => {
            triggerRefs.current.__mobile__ = node;
          }}
          type="button"
          aria-label="菜单"
          aria-haspopup="menu"
          data-state={mobileOpen ? 'open' : 'closed'}
          onClick={() => setOpen((current) => (current === '__mobile__' ? null : '__mobile__'))}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown') {
              event.preventDefault();
              focusOnOpen.current = true;
              setOpen('__mobile__');
            }
            if (event.key === 'Escape' && mobileOpen) {
              event.preventDefault();
              close();
            }
          }}
          className={`${TRIGGER} w-8 justify-center px-0`}
        >
          <MenuIcon size={16} />
        </button>

        {mobileOpen && (
          <div
            ref={panelRef}
            role="menu"
            aria-label="菜单"
            onKeyDown={onPanelKeyDown}
            className={`${PANEL} max-h-[70vh] w-60 overflow-y-auto`}
          >
            {groups.map((group, index) => (
              <div key={group.id} className={index === 0 ? '' : 'mt-1 border-t border-zinc-100 pt-1'}>
                <div className="px-2 py-1 text-[10px] font-medium tracking-wide text-zinc-400">
                  {group.label}
                </div>
                {renderEntries(group.entries)}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
