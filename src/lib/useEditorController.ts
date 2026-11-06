import { useEffect, useMemo, useRef, useState } from 'react';
import type {
  ChangeEvent as ReactChangeEvent,
  ClipboardEvent as ReactClipboardEvent,
  KeyboardEvent as ReactKeyboardEvent,
  RefObject,
} from 'react';
import { INSERT_ACTIONS } from './constants';
import type { InsertAction } from './constants';
import { EditorHistory } from './history';
import type { EditorSnapshot } from './history';
import { SAMPLE_MARKDOWN } from './sample';
import { useTypographyStore } from './store';

const IMAGE_PLACEHOLDER = '![图片说明](图片)';

/** 光标位置夹在正文范围内，避免撤销后 setSelectionRange 越界 */
const clampCaret = (position: number, length: number) => Math.max(0, Math.min(position, length));

/** 工具栏上那条「已换成示例文章 / 已清空」的可撤销提示 */
export interface EditorNotice {
  text: string;
  undoable: boolean;
}

export interface EditorController {
  /** 编辑区 textarea，工具栏的插入/撤销都要靠它拿光标 */
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  insert: (action: InsertAction) => void;
  undo: () => void;
  redo: () => void;
  restoreSample: () => void;
  clear: () => void;
  canUndo: boolean;
  canRedo: boolean;
  hasContent: boolean;
  notice: EditorNotice | null;
  undoNotice: () => void;
  charCount: number;
  minutes: number;
  handleChange: (event: ReactChangeEvent<HTMLTextAreaElement>) => void;
  handlePaste: (event: ReactClipboardEvent<HTMLTextAreaElement>) => void;
  handleKeyDown: (event: ReactKeyboardEvent<HTMLTextAreaElement>) => void;
}

/**
 * 编辑器的全部行为（撤销栈、插入、示例/清空、图片粘贴提示、字数）。
 *
 * 单独抽出来是因为插入工具条和编辑区不在同一棵子树里了：工具条在顶部，
 * 编辑区在左栏。状态留在这里，两处共用一个 controller，DOM 结构怎么摆都不影响行为。
 */
export function useEditorController(): EditorController {
  const markdown = useTypographyStore((state) => state.markdown);
  const setMarkdown = useTypographyStore((state) => state.setMarkdown);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const historyRef = useRef<EditorHistory | null>(null);
  if (historyRef.current === null) historyRef.current = new EditorHistory();
  const history = historyRef.current;

  const [notice, setNotice] = useState<EditorNotice | null>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(noticeTimer.current), []);

  const dismissNotice = () => {
    clearTimeout(noticeTimer.current);
    setNotice(null);
  };

  const showNotice = (text: string, undoable = false) => {
    clearTimeout(noticeTimer.current);
    setNotice({ text, undoable });
    noticeTimer.current = setTimeout(() => setNotice(null), undoable ? 8000 : 5000);
  };

  /** 读取「当前时刻」的快照：正文取自 store，光标取自 textarea */
  const readSnapshot = (): EditorSnapshot => {
    const value = useTypographyStore.getState().markdown;
    const length = value.length;
    const node = textareaRef.current;
    return {
      value,
      selectionStart: clampCaret(node?.selectionStart ?? length, length),
      selectionEnd: clampCaret(node?.selectionEnd ?? length, length),
    };
  };

  const restore = (snapshot: EditorSnapshot) => {
    setMarkdown(snapshot.value);
    requestAnimationFrame(() => {
      const node = textareaRef.current;
      if (!node) return;
      const length = snapshot.value.length;
      node.focus();
      node.setSelectionRange(
        clampCaret(snapshot.selectionStart, length),
        clampCaret(snapshot.selectionEnd, length),
      );
    });
  };

  const undo = () => {
    const previous = history.undo(readSnapshot());
    if (!previous) return;
    // 撤销/重做后上一次操作的提示（含「撤销」链接）就过期了，留着会多点一次撤销
    dismissNotice();
    restore(previous);
  };

  const redo = () => {
    const next = history.redo(readSnapshot());
    if (!next) return;
    dismissNotice();
    restore(next);
  };

  // 快捷键挂在 document 上：点过工具栏/清空按钮后焦点不在编辑区时也能撤销
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((!event.metaKey && !event.ctrlKey) || event.altKey) return;
      const key = event.key.toLowerCase();
      const isUndo = key === 'z' && !event.shiftKey;
      const isRedo = (key === 'z' && event.shiftKey) || (key === 'y' && !event.metaKey);
      if (!isUndo && !isRedo) return;

      const target = event.target as HTMLElement | null;
      if (target && target !== textareaRef.current) {
        const tag = target.tagName?.toLowerCase();
        if (target.isContentEditable || tag === 'input' || tag === 'textarea' || tag === 'select') return;
      }

      event.preventDefault();
      if (isUndo) undo();
      else redo();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** 记录并应用一次程序化编辑（工具栏插入 / 清空 / 恢复示例 / 粘贴图片） */
  const commitEdit = (next: string, caretStart: number, caretEnd = caretStart) => {
    history.record(
      readSnapshot(),
      { value: next, selectionStart: caretStart, selectionEnd: caretEnd },
      'action',
    );
    setMarkdown(next);
  };

  const applyChange = (next: string, label: string) => {
    if (markdown.trim()) showNotice(label, true);
    commitEdit(next, next.length);
  };

  const replaceRange = (start: number, end: number, text: string, selStart: number, selEnd: number) => {
    commitEdit(markdown.slice(0, start) + text + markdown.slice(end), selStart, selEnd);
    requestAnimationFrame(() => {
      const node = textareaRef.current;
      if (!node) return;
      node.focus();
      node.setSelectionRange(selStart, selEnd);
    });
  };

  const insert = (action: InsertAction) => {
    const node = textareaRef.current;
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

  const handleChange = (event: ReactChangeEvent<HTMLTextAreaElement>) => {
    const next = event.target.value;
    const { selectionStart, selectionEnd } = event.target;
    // 输入前的光标：插入时往左退掉新增的字符数，删除时原地不动
    const inserted = Math.max(next.length - markdown.length, 0);
    const caretBefore = clampCaret(selectionStart - inserted, markdown.length);
    history.record(
      { value: markdown, selectionStart: caretBefore, selectionEnd: caretBefore },
      { value: next, selectionStart, selectionEnd },
      'typing',
    );
    setMarkdown(next);
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
      // 按 id 找，不要用下标：插入项增删时 ⌘B 不该跟着换功能
      const bold = INSERT_ACTIONS.find((action) => action.id === 'bold');
      if (bold) insert(bold);
    }
  };

  const charCount = useMemo(() => markdown.replace(/\s/g, '').length, [markdown]);
  const minutes = Math.max(1, Math.round(charCount / 400));

  return {
    textareaRef,
    insert,
    undo,
    redo,
    restoreSample: () => applyChange(SAMPLE_MARKDOWN, '已换成示例文章'),
    clear: () => applyChange('', '已清空'),
    canUndo: history.canUndo,
    canRedo: history.canRedo,
    hasContent: Boolean(markdown.trim()),
    notice,
    undoNotice: undo,
    charCount,
    minutes,
    handleChange,
    handlePaste,
    handleKeyDown,
  };
}
