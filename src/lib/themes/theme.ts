import type { ThemeDecor, ThemeStyles } from '../types';
import { buildBaseStyles } from './base-styles';
import { FONT_SANS } from './fonts';
import { HLJS_DARK, HLJS_LIGHT } from './palettes';

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
  /** 代码块明暗，决定默认挂哪套 hljs 调色板 */
  code?: 'light' | 'dark';
  /** 只写与基础样式表不同的键 */
  styles?: ThemeStyles;
  decor?: ThemeDecor;
  /** 显式指定调色板（md 三套用 github-dark-dimmed），给了就不看 code */
  hljs?: Record<string, string>;
}

/**
 * 一套文章主题。
 *
 * 构造期做归一化：styles = 基础样式表 + 稀疏覆盖，hljs = 显式指定 ?? 按 code 选明暗；
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
  readonly hljs: Readonly<Record<string, string>>;

  /** 原始入参（含稀疏 styles 覆盖），派生新实例时以它为底 */
  readonly #spec: ThemeSpec;

  constructor(spec: ThemeSpec) {
    const font = spec.font ?? FONT_SANS;
    const page = spec.page ?? '';
    const code = spec.code ?? 'dark';

    this.id = spec.id;
    this.name = spec.name;
    this.accent = spec.accent;
    this.tags = Object.freeze([...spec.tags]);
    this.styles = Object.freeze({ ...buildBaseStyles({ accent: spec.accent, font, page, code }), ...spec.styles });
    this.decor = Object.freeze({ ...spec.decor });
    this.hljs = Object.freeze({ ...(spec.hljs ?? (code === 'light' ? HLJS_LIGHT : HLJS_DARK)) });
    this.#spec = Object.freeze({ ...spec, font, page, code, tags: [...spec.tags] });

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
