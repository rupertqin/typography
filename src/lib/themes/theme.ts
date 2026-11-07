import { CODE_THEMES_BY_ID, withTokenAliases } from '../code-themes';
import type { ThemeDecor, ThemeStyles } from '../types';
import { buildBaseStyles } from './base-styles';
import { FONT_SANS } from './fonts';

/**
 * 主题默认挂哪套代码配色——都从现有 82 套里取，主题不再自己维护调色表。
 *
 * 取值依据是把旧的手写表逐 token 与 82 套算 RGB 色差（共有 token 取平均）：
 * 暗色表 ↔ atom-one-dark ≈9.4（次近 atom-one-dark-reasonable ≈14.7），
 * 亮色表 ↔ github ≈64.9（次近 tokyo-night-light ≈110.7）。
 * md 三套本就取自 github-dark-dimmed，由它们各自显式指定。
 */
const DEFAULT_CODE_THEME: Readonly<Record<'light' | 'dark', string>> = Object.freeze({
  dark: 'atom-one-dark',
  light: 'github',
});

/** 定义一套主题需要的入参：只有 id/name/accent/tags 是必填 */
export interface ThemeSpec {
  id: string;
  name: string;
  accent: string;
  /** 文章类型标签，主题菜单按它分组 */
  tags: string[];
  /** 正文字体栈，默认系统无衬线 */
  font?: string;
  /** 追加到 wrapper 的额外声明（如终端主题的深色页面底） */
  page?: string;
  /** 代码块明暗，决定默认挂哪套代码配色 */
  code?: 'light' | 'dark';
  /** 只写与基础样式表不同的键 */
  styles?: ThemeStyles;
  decor?: ThemeDecor;
  /** 显式指定代码配色（82 套里的 id），给了就不看 code */
  codeTheme?: string;
}

/**
 * 一套文章主题。
 *
 * 构造期做归一化：styles = 基础样式表 + 稀疏覆盖，codeTheme = 显式指定 ?? 按 code 取默认，
 * hljs = 那套代码配色的 tokens（补齐别名 scope）——主题不自己存调色表；
 * 实例与内部对象都冻结，所以「改主题」只能派生新实例（withStyles / withDecor），
 * 不会出现某处顺手改了一个字段、别处渲染结果跟着变的情况。
 */
export class Theme {
  readonly id: string;
  readonly name: string;
  readonly accent: string;
  readonly tags: readonly string[];
  readonly styles: Readonly<ThemeStyles>;
  readonly decor: Readonly<ThemeDecor>;
  /** 实际生效的代码配色 id（82 套之一），UI 用它显示「跟随主题」等价的配色名 */
  readonly codeTheme: string;
  readonly hljs: Readonly<Record<string, string>>;

  /** 原始入参（含稀疏 styles 覆盖），派生新实例时以它为底 */
  readonly #spec: ThemeSpec;

  constructor(spec: ThemeSpec) {
    const font = spec.font ?? FONT_SANS;
    const page = spec.page ?? '';
    const code = spec.code ?? 'dark';
    const codeTheme = spec.codeTheme ?? DEFAULT_CODE_THEME[code];
    const palette = CODE_THEMES_BY_ID[codeTheme];
    if (!palette) throw new Error(`${spec.id}: codeTheme「${codeTheme}」不在代码配色列表里`);

    this.id = spec.id;
    this.name = spec.name;
    this.accent = spec.accent;
    this.tags = Object.freeze([...spec.tags]);
    this.styles = Object.freeze({ ...buildBaseStyles({ accent: spec.accent, font, page, code }), ...spec.styles });
    this.decor = Object.freeze({ ...spec.decor });
    this.codeTheme = codeTheme;
    this.hljs = Object.freeze(withTokenAliases(palette.tokens));
    this.#spec = Object.freeze({ ...spec, font, page, code, codeTheme, tags: [...spec.tags] });

    Object.freeze(this);
  }

  /** 正文字体栈（派生自 font） */
  get font(): string {
    return this.#spec.font ?? FONT_SANS;
  }

  /** wrapper 上的额外声明（派生自 page） */
  get page(): string {
    return this.#spec.page ?? '';
  }

  /** 代码块明暗（派生自 code） */
  get code(): 'light' | 'dark' {
    return this.#spec.code ?? 'dark';
  }

  /** 覆盖部分样式键，返回新实例（原实例不变） */
  withStyles(patch: ThemeStyles): Theme {
    return new Theme({ ...this.#spec, styles: { ...this.#spec.styles, ...patch } });
  }

  /** 覆盖部分装饰，返回新实例（原实例不变） */
  withDecor(patch: ThemeDecor): Theme {
    return new Theme({ ...this.#spec, decor: { ...this.#spec.decor, ...patch } });
  }

  /** 反解成构造入参，便于克隆、比较或做序列化快照 */
  toSpec(): ThemeSpec {
    return { ...this.#spec, tags: [...this.tags] };
  }
}
