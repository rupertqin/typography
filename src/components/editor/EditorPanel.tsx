import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, RefObject } from 'react';
import { highlightMarkdownSource } from '../../lib/highlight-markdown';
import { useTypographyStore } from '../../lib/store';
import type { EditorController } from '../../lib/useEditorController';

interface EditorPanelProps {
  editor: EditorController;
  accent: string;
  /** 预览里加粗最终的颜色：换主题 / 换主色时编辑区的 **粗体** 跟着走 */
  strongColor: string;
  /** 与预览一致的正文字体栈、字重与基准字号 */
  bodyFont: { stack: string; weight?: number; size: number };
  /** 高亮层节点：外层滚动同步要拿它量「源码第 N 行在第几像素」 */
  layerRef?: RefObject<HTMLPreElement | null>;
  /** 滚动时通知外层做编辑区 → 预览区同步 */
  onScroll?: () => void;
}

/**
 * 左栏：铺满高度的编辑区（高亮层 + 透明 textarea），没有卡片外壳。
 *
 * 插入工具条、撤销重做都搬到顶部 WorkbenchBar 了，状态在 useEditorController 里，
 * 这里只负责渲染和「高亮层跟着 textarea 滚动」这类纯视图的事。
 */
export default function EditorPanel({ editor, accent, strongColor, bodyFont, layerRef, onScroll }: EditorPanelProps) {
  const markdown = useTypographyStore((state) => state.markdown);

  // 外部（滚动同步）也要读这一层来换算行位置，没有外部 ref 时才用内部的
  const internalLayer = useRef<HTMLPreElement>(null);
  const highlightLayer = layerRef ?? internalLayer;
  // 中文输入法组词时，浏览器用 textarea 自己的颜色画候字；字透明就看不清，
  // 所以在组词期间把高亮层藏起来、让 textarea 正常显字。
  const [composing, setComposing] = useState(false);

  const highlighted = useMemo(() => highlightMarkdownSource(markdown), [markdown]);

  // 编辑区与预览用同一套正文字体/字号；两层（高亮层 / textarea）必须完全一致，否则光标会错位
  const bodyFontStyle = useMemo<CSSProperties>(
    () => ({ fontFamily: bodyFont.stack, fontWeight: bodyFont.weight, fontSize: bodyFont.size }),
    [bodyFont.stack, bodyFont.weight, bodyFont.size],
  );

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

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 bg-white">
      {/* 编辑区不画边框：doocs 的 CodeMirror 也是整块留白，边界由中缝分隔条负责 */}
      <div
        className="relative min-h-0 flex-1 px-5 py-4"
        style={{ '--mh-accent': accent, '--mh-strong': strongColor } as CSSProperties}
      >
        <pre
          ref={highlightLayer}
          aria-hidden="true"
          className="md-editor-highlight pointer-events-none absolute inset-0 m-0 overflow-hidden whitespace-pre-wrap break-words px-5 py-4 leading-relaxed"
          style={{
            ...bodyFontStyle,
            opacity: composing ? 0 : 1,
          }}
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
            onScroll?.();
          }}
          onCompositionStart={() => setComposing(true)}
          onCompositionEnd={() => setComposing(false)}
          placeholder="在这里写 Markdown，右边实时预览……"
          aria-label="Markdown 编辑区"
          spellCheck={false}
          style={bodyFontStyle}
          className={`thin-scrollbar absolute inset-0 h-full w-full resize-none bg-transparent px-5 py-4 leading-relaxed caret-zinc-800 outline-none selection:bg-zinc-900/10 placeholder-zinc-300 ${
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
