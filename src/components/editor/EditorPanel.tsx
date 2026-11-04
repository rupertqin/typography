import { useEffect, useMemo, useRef, useState } from 'react';
import type { ClipboardEvent as ReactClipboardEvent, KeyboardEvent as ReactKeyboardEvent, RefObject } from 'react';
import { Bold, CodeXml, FileText, Heading2, Image as ImageIcon, Minus, Quote, RotateCcw, Trash2 } from 'lucide-react';
import { INSERT_ACTIONS } from '../../lib/constants';
import { SAMPLE_MARKDOWN } from '../../lib/sample';
import { useTypesetStore } from '../../lib/store';
import type { InsertAction } from '../../lib/constants';
import ToolPanel from '../shell/ToolPanel';

const ICONS = {
  heading: Heading2,
  bold: Bold,
  quote: Quote,
  code: CodeXml,
  image: ImageIcon,
  hr: Minus,
} as const;

const TOOL_BUTTON =
  'rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-emerald-50 hover:text-emerald-600';

const IMAGE_PLACEHOLDER = '![图片说明](图片)';

interface EditorPanelProps {
  previewRef: RefObject<HTMLDivElement | null>;
  isMobile: boolean;
}

export default function EditorPanel({ previewRef, isMobile }: EditorPanelProps) {
  const markdown = useTypesetStore((state) => state.markdown);
  const setMarkdown = useTypesetStore((state) => state.setMarkdown);

  const textarea = useRef<HTMLTextAreaElement>(null);
  const [notice, setNotice] = useState<{ text: string; undo?: string } | null>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(noticeTimer.current), []);

  const charCount = useMemo(() => markdown.replace(/\s/g, '').length, [markdown]);
  const minutes = Math.max(1, Math.round(charCount / 400));

  const showNotice = (text: string, undo?: string) => {
    clearTimeout(noticeTimer.current);
    setNotice({ text, undo });
    noticeTimer.current = setTimeout(() => setNotice(null), undo === undefined ? 5000 : 8000);
  };

  const applyChange = (next: string, label: string) => {
    if (markdown.trim()) showNotice(label, markdown);
    setMarkdown(next);
  };

  const undo = () => {
    if (notice?.undo === undefined) return;
    setMarkdown(notice.undo);
    clearTimeout(noticeTimer.current);
    setNotice(null);
  };

  const scrollToPreview = () => {
    const source = textarea.current;
    const target = previewRef.current;
    if (!source || !target || isMobile) return;
    const range = source.scrollHeight - source.clientHeight;
    target.scrollTop = range > 0 ? (source.scrollTop / range) * (target.scrollHeight - target.clientHeight) : 0;
  };

  const replaceRange = (start: number, end: number, text: string, selStart: number, selEnd: number) => {
    setMarkdown(markdown.slice(0, start) + text + markdown.slice(end));
    requestAnimationFrame(() => {
      const node = textarea.current;
      if (!node) return;
      node.focus();
      node.setSelectionRange(selStart, selEnd);
    });
  };

  const insert = (action: InsertAction) => {
    const node = textarea.current;
    const start = node?.selectionStart ?? markdown.length;
    const end = node?.selectionEnd ?? markdown.length;

    if (action.wrap) {
      const [open, close] = action.wrap;
      const selected = markdown.slice(start, end) || action.placeholder || '';
      replaceRange(
        start,
        end,
        open + selected + close,
        start + open.length,
        start + open.length + selected.length,
      );
      return;
    }

    const before = markdown.slice(0, start);
    const lead = before === '' || before.endsWith('\n\n') ? '' : before.endsWith('\n') ? '\n' : '\n\n';
    const snippet = `${lead}${action.line}\n\n`;
    const caret = start + lead.length;
    replaceRange(start, end, snippet, caret, caret + (action.line?.length ?? 0));
  };

  const handlePaste = (event: ReactClipboardEvent<HTMLTextAreaElement>) => {
    const files = Array.from(event.clipboardData.files);
    if (!files.some((file) => file.type.startsWith('image/')) || event.clipboardData.getData('text/plain')) {
      return;
    }
    event.preventDefault();
    const node = event.currentTarget;
    const start = node.selectionStart;
    const snippet = `\n${IMAGE_PLACEHOLDER}\n`;
    replaceRange(start, node.selectionEnd, snippet, start + 1, start + 1 + IMAGE_PLACEHOLDER.length);
    showNotice('图片不能直接放进来，已插入图片占位。粘贴到公众号后，在占位处插入图片');
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.metaKey || event.ctrlKey) && !event.shiftKey && !event.altKey && event.key.toLowerCase() === 'b') {
      event.preventDefault();
      insert(INSERT_ACTIONS[1]);
    }
  };

  const toolbar = (
    <div className="flex shrink-0 items-center gap-0.5 self-start rounded-lg bg-zinc-100/80 p-1">
      {INSERT_ACTIONS.map((action) => {
        const Icon = ICONS[action.id as keyof typeof ICONS];
        return (
          <button
            key={action.id}
            type="button"
            onClick={() => insert(action)}
            title={action.title}
            aria-label={action.title}
            className="rounded-md p-1.5 text-zinc-500 transition-all hover:bg-white hover:text-emerald-700 hover:shadow-sm"
          >
            <Icon size={15} />
          </button>
        );
      })}
    </div>
  );

  return (
    <ToolPanel
      fill
      title="Markdown"
      icon={FileText}
      className="h-[62vh] lg:h-auto"
      bodyClassName="flex flex-col gap-2.5 p-3 pt-3"
      extra={
        <div className="flex items-center gap-2">
          {!isMobile && toolbar}
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => applyChange(SAMPLE_MARKDOWN, '已换成示例文章')}
              className={TOOL_BUTTON}
              title="恢复示例"
              aria-label="恢复示例"
            >
              <RotateCcw size={14} />
            </button>
            <button
              type="button"
              onClick={() => applyChange('', '已清空')}
              className={`${TOOL_BUTTON} hover:!bg-red-50 hover:!text-red-500 ${
                markdown ? '' : 'pointer-events-none opacity-30'
              }`}
              title="清空"
              aria-label="清空"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      }
    >
      {isMobile && toolbar}

      <div className="relative min-h-0 flex-1">
        <textarea
          ref={textarea}
          value={markdown}
          onChange={(event) => setMarkdown(event.target.value)}
          onPaste={handlePaste}
          onKeyDown={handleKeyDown}
          onScroll={scrollToPreview}
          placeholder="在这里写 Markdown，右边实时预览……"
          aria-label="Markdown 编辑区"
          spellCheck={false}
          className="absolute inset-0 h-full w-full resize-none rounded-xl bg-zinc-50/70 p-4 font-mono text-[13px] leading-relaxed text-zinc-800 ring-1 ring-inset ring-zinc-200 transition placeholder-zinc-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-300"
        />
      </div>

      <div className="flex shrink-0 items-center justify-between gap-3 px-1 text-[11px] tabular-nums">
        {notice ? (
          <span className="text-amber-600">
            {notice.text}
            {notice.undo !== undefined && (
              <button type="button" onClick={undo} className="ml-2 font-medium text-emerald-600 hover:underline">
                撤销
              </button>
            )}
          </span>
        ) : (
          <span className="text-zinc-400">
            {charCount.toLocaleString()} 字 · 约 {minutes} 分钟读完 · 草稿自动保存在本机
          </span>
        )}
      </div>
    </ToolPanel>
  );
}
