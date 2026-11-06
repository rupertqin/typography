/** 定义一套代码配色需要的入参（数据见 ./catalog.ts） */
export interface CodeThemeSpec {
  id: string;
  label: string;
  /** 暗色配色在菜单里单独分组 */
  dark: boolean;
  /** pre 的前景色，可能为空（原 CSS 没写） */
  foreground: string;
  /** pre 的底色，可能为空或 CSS 关键字（white / url(...)） */
  background: string;
  /** token 名（不含 hljs- 前缀）→ 内联声明，如 { keyword: 'color:#a6262a;' } */
  tokens: Record<string, string>;
}

/** 落到内联样式时真正要用的调色板 */
export interface CodePalette {
  tokens: Readonly<Record<string, string>>;
  foreground: string;
  background: string;
}

/** 预览色条取哪几个 token 的颜色 */
const SWATCH_TOKENS = ['keyword', 'string', 'comment', 'number', 'title'] as const;

/** 'color:#a6262a;' → '#a6262a' */
function colorOf(declaration: string | undefined): string {
  if (!declaration) return '';
  return /color:\s*([^;]+)/.exec(declaration)?.[1]?.trim() ?? '';
}

/**
 * 一套代码块配色。
 *
 * 和文章主题一样：构造期做归一化与自检（token 名、内联声明形态），实例与 tokens 都冻结。
 * 数据写错会在 import 阶段直接抛错，不会等到预览才默默渲染成无色代码块。
 */
export class CodeTheme {
  readonly id: string;
  readonly label: string;
  readonly dark: boolean;
  readonly foreground: string;
  readonly background: string;
  readonly tokens: Readonly<Record<string, string>>;

  constructor(spec: CodeThemeSpec) {
    if (!spec.id) throw new Error('代码配色缺少 id');
    if (!spec.label) throw new Error(`${spec.id}: 缺少 label`);
    if (typeof spec.dark !== 'boolean') throw new Error(`${spec.id}: dark 必须是布尔值`);

    const tokens = spec.tokens ?? {};
    if (!Object.keys(tokens).length) throw new Error(`${spec.id}: tokens 为空`);
    for (const [token, declaration] of Object.entries(tokens)) {
      if (token.startsWith('hljs-')) throw new Error(`${spec.id}.${token}: token 名不该带 hljs- 前缀`);
      if (typeof declaration !== 'string' || !declaration.trim()) {
        throw new Error(`${spec.id}.${token}: 内联声明非法`);
      }
      if (/[{}]/.test(declaration)) throw new Error(`${spec.id}.${token}: 内联声明里混入了 CSS 规则块`);
    }

    this.id = spec.id;
    this.label = spec.label;
    this.dark = spec.dark;
    this.foreground = spec.foreground ?? '';
    this.background = spec.background ?? '';
    this.tokens = Object.freeze({ ...tokens });

    Object.freeze(this);
  }

  /** 预览色条要用的底色与关键 token 颜色（底色可能是空串，交给调用方给兜底值） */
  swatch(tokens: readonly string[] = SWATCH_TOKENS): { background: string; colors: string[] } {
    const colors = tokens.map((token) => colorOf(this.tokens[token])).filter(Boolean);
    return { background: this.background, colors };
  }

  /** 写进内联样式的调色板 */
  palette(): CodePalette {
    return { tokens: this.tokens, foreground: this.foreground, background: this.background };
  }

  /** 反解成构造入参，便于克隆/比较/序列化快照 */
  toSpec(): CodeThemeSpec {
    return {
      id: this.id,
      label: this.label,
      dark: this.dark,
      foreground: this.foreground,
      background: this.background,
      tokens: { ...this.tokens },
    };
  }
}
