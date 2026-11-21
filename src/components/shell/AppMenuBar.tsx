import {
  Bold,
  CodeXml,
  Columns2,
  Copy,
  Eye,
  FileCode,
  FileText,
  Heading2,
  Image as ImageIcon,
  Minus,
  Monitor,
  PencilLine,
  Printer,
  Quote,
  Redo2,
  RotateCcw,
  SlidersHorizontal,
  Smartphone,
  Trash2,
  Undo2,
  Upload,
  Workflow,
} from 'lucide-react';
import { INSERT_ACTIONS, ZOOM_LEVELS } from '../../lib/constants';
import { useTypographyStore } from '../../lib/store';
import type { EditorController } from '../../lib/useEditorController';
import MenuBar from './MenuBar';
import type { MenuEntry, MenuGroup } from './MenuBar';

const INSERT_ICONS = {
  heading: Heading2,
  bold: Bold,
  quote: Quote,
  code: CodeXml,
  mermaid: Workflow,
  image: ImageIcon,
  hr: Minus,
} as const;

/** 快捷键提示按平台换字形：Mac 用符号，其余用 Ctrl/Shift 前缀 */
const IS_MAC =
  typeof navigator !== 'undefined' && /mac|iphone|ipad/i.test(navigator.platform || navigator.userAgent);
const MOD = IS_MAC ? '⌘' : 'Ctrl+';
const SHIFT = IS_MAC ? '⇧' : 'Shift+';

interface AppMenuBarProps {
  editor: EditorController;
  settingsOpen: boolean;
  onCopy: () => void;
  onExportPdf: () => void;
  onExportMarkdown: () => void;
  onExportHtml: () => void;
  onImport: () => void;
  onToggleSettings: () => void;
}

/**
 * 应用菜单：把散在顶栏/工具条/状态栏里的动作按「文件 / 编辑 / 插入 / 视图」归到左上角，
 * 结构对齐 doocs-md 的 header menubar，条目全部是这里真实具备的动作，不放占位项。
 *
 * 工具条与状态栏上的按钮不撤——菜单是入口的另一种走法，不是替代。
 */
export default function AppMenuBar({
  editor,
  settingsOpen,
  onCopy,
  onExportPdf,
  onExportMarkdown,
  onExportHtml,
  onImport,
  onToggleSettings,
}: AppMenuBarProps) {
  const viewMode = useTypographyStore((state) => state.viewMode);
  const setViewMode = useTypographyStore((state) => state.setViewMode);
  const previewDevice = useTypographyStore((state) => state.previewDevice);
  const setPreviewDevice = useTypographyStore((state) => state.setPreviewDevice);
  const scrollSync = useTypographyStore((state) => state.scrollSync);
  const toggleScrollSync = useTypographyStore((state) => state.toggleScrollSync);
  const zoom = useTypographyStore((state) => state.previewZoom);
  const setZoom = useTypographyStore((state) => state.setPreviewZoom);

  // 条目全是闭包（带着 editor / store 的当前值），所以每次渲染都重建，不做缓存
  const file: MenuEntry[] = [
    { id: 'pdf', label: '导出 PDF…', icon: Printer, disabled: !editor.hasContent, run: onExportPdf },
    { id: 'md', label: '导出 Markdown', icon: FileText, disabled: !editor.hasContent, run: onExportMarkdown },
    { id: 'html', label: '导出 HTML', icon: FileCode, disabled: !editor.hasContent, run: onExportHtml },
    { type: 'separator' },
    { id: 'import', label: '导入 Markdown…', icon: Upload, run: onImport },
    { type: 'separator' },
    { id: 'sample', label: '恢复示例', icon: RotateCcw, run: editor.restoreSample },
    { id: 'clear', label: '清空', icon: Trash2, disabled: !editor.hasContent, run: editor.clear },
  ];

  const edit: MenuEntry[] = [
    { id: 'undo', label: '撤销', icon: Undo2, shortcut: `${MOD}Z`, disabled: !editor.canUndo, run: editor.undo },
    {
      id: 'redo',
      label: '重做',
      icon: Redo2,
      shortcut: `${SHIFT}${MOD}Z`,
      disabled: !editor.canRedo,
      run: editor.redo,
    },
    { type: 'separator' },
    { id: 'copy', label: '复制到公众号', icon: Copy, disabled: !editor.hasContent, run: onCopy },
  ];

  const insert: MenuEntry[] = INSERT_ACTIONS.map((action) => ({
    id: action.id,
    label: action.title,
    icon: INSERT_ICONS[action.id as keyof typeof INSERT_ICONS],
    shortcut: action.id === 'bold' ? `${MOD}B` : undefined,
    run: () => editor.insert(action),
  }));

  const view: MenuEntry[] = [
    { id: 'split', label: '左右分屏', icon: Columns2, checked: viewMode === 'split', run: () => setViewMode('split') },
    { id: 'edit', label: '只显示编辑', icon: PencilLine, checked: viewMode === 'edit', run: () => setViewMode('edit') },
    { id: 'preview', label: '只显示预览', icon: Eye, checked: viewMode === 'preview', run: () => setViewMode('preview') },
    { type: 'separator' },
    {
      id: 'mobile',
      label: '手机宽度预览',
      icon: Smartphone,
      checked: previewDevice === 'mobile',
      run: () => setPreviewDevice('mobile'),
    },
    {
      id: 'desktop',
      label: '桌面宽度预览',
      icon: Monitor,
      checked: previewDevice === 'desktop',
      run: () => setPreviewDevice('desktop'),
    },
    { id: 'sync', label: '编辑与预览滚动同步', checked: scrollSync, run: toggleScrollSync },
    { type: 'separator' },
    ...ZOOM_LEVELS.map<MenuEntry>((level) => ({
      id: `zoom-${level}`,
      label: `预览缩放 ${Math.round(level * 100)}%`,
      checked: zoom === level,
      run: () => setZoom(level),
    })),
    { type: 'separator' },
    {
      id: 'settings',
      label: '配色与排版设置',
      icon: SlidersHorizontal,
      checked: settingsOpen,
      run: onToggleSettings,
    },
  ];

  const groups: MenuGroup[] = [
    { id: 'file', label: '文件', entries: file },
    { id: 'edit', label: '编辑', entries: edit },
    { id: 'insert', label: '插入', entries: insert },
    { id: 'view', label: '视图', entries: view },
  ];

  return <MenuBar groups={groups} />;
}
