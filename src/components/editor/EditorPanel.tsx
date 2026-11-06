import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, RefObject } from 'react';
import { highlightMarkdownSource } from '../../lib/highlight-markdown';
import { useTypographyStore } from '../../lib/store';
import type { EditorController } from '../../lib/useEditorController';

interface EditorPanelProps {
  editor: EditorController;
  previewRef: RefObject<HTMLDivElement | null>;
  isMobile: boolean;
  accent: string;
}

/**
 * 左栏：铺满高度的编辑区（高亮层 + 透明 textarea），没有卡片外壳。
 *
 * 插入工具条、撤销重做都搬到顶部 WorkbenchBar 了，状态在 useEditorController 里，
 * 这里只负责渲染和「高亮层跟着 textarea 滚动」这类纯视图的事。
 */
export default function EditorPanel({ editor, previewRef, isMobile, accent }: EditorPanelProps) {
  const markdown = useTypographyStore((state) => state.markdown);
  const scrollSync = useTypographyStore((state) => state.scrollSync);

  const highlightLayer = useRef<HTMLPreElement>(null);
  // 中文输入法组词时，浏览器用 textarea 自己的颜色画候字；字透明就看不清，
  // 所以在组词期间把高亮层藏起来、让 textarea 正常显字。
  const [composing, setComposing] = useState(false);

  const highlighted = useMemo(() => highlightMarkdownSource(markdown), [markdown]);

  /** 高亮层和 textarea 必须严丝合缝地对齐：同步滚动 + 让出滚动条宽度 */
  const syncHighlight = () => {
    const node = editor.textareaRef.current;
    const layer = highlightLayer.current;
    if (!node || !layer) return;

    layer.scrollTop = node.scrollTop;
    layer.scrollLeft = node.scrollLeft;

    const gutter = `${Math.max(0, node.offsetWidth - node.clientWidth)}px`;
    if (layer.style.right !== gutter) layer.style.right = gutter;
  };

  useEffect(syncHighlight, [highlighted, composing]);

  useEffect(() => {
    const node = editor.textareaRef.current;
    if (!node || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(() => syncHighlight());
    observer.observe(node);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scrollToPreview = () => {
    const source = editor.textareaRef.current;
    const target = previewRef.current;
    if (!source || !target || isMobile || !scrollSync) return;
    const range = source.scrollHeight - source.clientHeight;
    target.scrollTop = range > 0 ? (source.scrollTop / range) * (target.scrollHeight - target.clientHeight) : 0;
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 bg-white">
      {/* 编辑区不画边框：doocs 的 CodeMirror 也是整块留白，边界由中缝分隔条负责 */}
      <div
        className="relative min-h-0 flex-1 px-5 py-4"
        style={{ '--mh-accent': accent } as CSSProperties}
      >
        <pre
          ref={highlightLayer}
          aria-hidden="true"
          className="md-editor-highlight pointer-events-none absolute inset-0 m-0 overflow-hidden whitespace-pre-wrap break-words px-5 py-4 font-mono text-[13px] leading-relaxed"
          style={{ opacity: composing ? 0 : 1 }}
          dangerouslySetInnerHTML={{ __html: highlighted }}
        />
        <textarea
          ref={editor.textareaRef}
          value={markdown}
          onChange={editor.handleChange}
          onPaste={editor.handlePaste}
          onKeyDown={editor.handleKeyDown}
          onScroll={() => {
            syncHighlight();
            scrollToPreview();
          }}
          onCompositionStart={() => setComposing(true)}
          onCompositionEnd={() => setComposing(false)}
          placeholder="在这里写 Markdown，右边实时预览……"
          aria-label="Markdown 编辑区"
          spellCheck={false}
          className={`absolute inset-0 h-full w-full resize-none bg-transparent px-5 py-4 font-mono text-[13px] leading-relaxed caret-zinc-800 outline-none selection:bg-zinc-900/10 placeholder-zinc-300 ${
            composing ? 'text-zinc-800' : 'text-transparent'
          }`}
        />
      </div>

      {/* 字数、行数、草稿提示都在底部 StatusBar；这里只留「刚做了可撤销的操作」这种临时提示 */}
      {editor.notice && (
        <div className="flex shrink-0 items-center gap-3 px-1 text-[11px] tabular-nums">
          <span className="text-amber-600">
            {editor.notice.text}
            {editor.notice.undoable && (
              <button
                type="button"
                onClick={editor.undoNotice}
                className="ml-2 font-medium text-zinc-900 underline hover:text-zinc-700"
              >
                撤销
              </button>
            )}
          </span>
        </div>
      )}
    </div>
  );
}
