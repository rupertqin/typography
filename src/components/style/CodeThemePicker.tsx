import { CODE_THEME_GROUPS, FOLLOW_THEME_CODE, findCodeTheme } from '../../lib/code-themes';
import { getDecl } from '../../lib/render-helpers';
import { useTypographyStore } from '../../lib/store';
import type { Theme } from '../../lib/themes';

const PREVIEW_TOKENS = ['keyword', 'title', 'string', 'comment'];

/** 'color:#a6262a;' → '#a6262a'（跟随主题时主题自带的 hljs 声明也用它解析） */
function colorOf(style: string | undefined): string {
  if (!style) return '';
  return /color:\s*([^;]+)/.exec(style)?.[1]?.trim() ?? '';
}

interface Swatch {
  background: string;
  colors: string[];
  label: string;
}

/** 跟随主题时预览条要展示主题自己的代码块观感，所以两套来源合成一个 Swatch */
function resolveSwatch(theme: Theme, codeThemeId: string): Swatch {
  const picked = findCodeTheme(codeThemeId);
  if (picked) {
    const { background, colors } = picked.swatch(PREVIEW_TOKENS);
    return { background: background || '#f6f8fa', colors, label: picked.label };
  }
  return {
    background: getDecl(theme.styles.pre, 'background') ?? '#f6f8fa',
    colors: PREVIEW_TOKENS.map((token) => colorOf(theme.hljs[token])).filter(Boolean),
    label: '跟随主题',
  };
}

export default function CodeThemePicker({ theme }: { theme: Theme }) {
  const codeThemeId = useTypographyStore((state) => state.codeThemeId);
  const setCodeThemeId = useTypographyStore((state) => state.setCodeThemeId);
  const swatch = resolveSwatch(theme, codeThemeId);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <select
          value={codeThemeId}
          onChange={(event) => setCodeThemeId(event.target.value)}
          aria-label="代码配色"
          className="min-w-0 flex-1 cursor-pointer rounded-md bg-white py-1 pl-2 pr-1 text-xs text-zinc-700 ring-1 ring-inset ring-zinc-200 focus:outline-none focus:ring-emerald-300"
        >
          <option value={FOLLOW_THEME_CODE}>跟随主题（{swatch.label === '跟随主题' ? theme.name : '当前主题'}）</option>
          <optgroup label={`亮色（${CODE_THEME_GROUPS.light.length}）`}>
            {CODE_THEME_GROUPS.light.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </optgroup>
          <optgroup label={`暗色（${CODE_THEME_GROUPS.dark.length}）`}>
            {CODE_THEME_GROUPS.dark.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </optgroup>
        </select>
      </div>

      {/* 迷你预览：底色 + 4 个 token 色块，选之前就能看出观感 */}
      <div
        className="flex items-center gap-1.5 overflow-hidden rounded-md px-2 py-1.5 ring-1 ring-inset ring-black/5"
        style={{ background: swatch.background }}
        aria-hidden
      >
        {['var', 'const', 'fn', '()', '→'].map((text, index) => (
          <span
            key={`${text}-${index}`}
            className="font-mono text-[10px] leading-none"
            style={{ color: swatch.colors[index % Math.max(1, swatch.colors.length)] || '#8b8b8b' }}
          >
            {text}
          </span>
        ))}
        <span className="ml-auto font-mono text-[10px] leading-none opacity-60" style={{ color: swatch.colors[0] || '#8b8b8b' }}>
          {'{ }'}
        </span>
      </div>
    </div>
  );
}
