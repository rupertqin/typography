import { resolveCodeTheme } from './code-themes';
import { parseMarkdown } from './markdown';
import { applyColorOverrides, hasColorOverrides, isHexColor, rgbaFromHex } from './recolor';
import {
  PART_SELECTORS,
  PRE_BAR_DOTS,
  RENDER_ONLY_ATTRS,
  STYLE_KEY_BY_TAG,
  applyBlockSpacing,
  applyBlockquoteBackground,
  applyCard,
  applyCodeChrome,
  applyFontFamily,
  applyHeadingStyles,
  applyLineHeight,
  applyListMarks,
  isStructural,
  normalizeFootnotes,
  normalizeImageSlots,
  preserveCodeWhitespace,
  scaleFontSizes,
  stripFontFamilyQuotes,
} from './render-helpers';
import type { ColorOverrides, Theme, ThemeParams } from './types';

export interface RenderOptions {
  /** 配色重映射 */
  colors?: ColorOverrides;
  /** 整体字号缩放比例，默认 1 */
  fontScale?: number;
  /** 正文字体栈，空字符串表示沿用主题 */
  fontFamily?: string;
  /** 正文字重：细体 / 极细靠字重实现，只作用在没写死 font-weight 的元素上 */
  fontWeight?: number;
  /** 代码配色 id；缺省 / 'theme' 表示沿用主题自带的调色板 */
  codeTheme?: string;
  /** 版式参数：行高 / 段间距 / 引用底色 / 标题样式，默认值等同不传 */
  params?: ThemeParams;
}

/**
 * 与原站 or(markdown, theme, colors) 等价：
 * Markdown → HTML → 注入主题内联样式与装饰 → 可选配色重映射 → 整体字号/字体 → 返回可直接粘贴的 HTML。
 */
export function renderMarkdown(markdown: string, theme: Theme, options: RenderOptions = {}): string {
  if (typeof DOMParser === 'undefined') return '';

  const { fontScale = 1, fontFamily = '', fontWeight, params } = options;
  const overrides: ColorOverrides = options.colors ?? { main: '', parts: {} };
  const doc = new DOMParser().parseFromString(`<section>${parseMarkdown(markdown)}</section>`, 'text/html');
  const root = doc.body.firstElementChild as Element;

  normalizeImageSlots(root, doc);
  normalizeFootnotes(root, doc);

  // 结构块之间的纯空白文本节点会让公众号编辑器多出空行
  const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const blanks: Text[] = [];
  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    if (node.data.trim()) continue;
    if (node.parentElement?.closest('pre')) continue;
    if (isStructural(node.previousSibling) || isStructural(node.nextSibling)) blanks.push(node);
  }
  blanks.forEach((node) => node.remove());

  // 代码高亮 class → 内联色板（公众号会丢掉 class）。
  // 选了代码配色就用它，否则回落到主题自带的 hljs 调色板。
  const codePalette = resolveCodeTheme(options.codeTheme, theme);
  const codeTokens = codePalette?.tokens ?? theme.hljs;
  root.querySelectorAll('[class*="hljs-"]').forEach((node) => {
    const token = Array.from(node.classList).find((name) => name.startsWith('hljs-'));
    const style = token ? codeTokens[token.slice(5)] : undefined;
    node.removeAttribute('class');
    if (style) node.setAttribute('style', style);
  });

  const styles = theme.styles;
  root.querySelectorAll('*').forEach((node) => {
    const tag = node.tagName.toLowerCase();
    let key: string | undefined = STYLE_KEY_BY_TAG[tag];

    if (tag === 'code' && node.parentElement?.tagName === 'PRE') key = 'preCode';
    if (tag === 'p' && node.parentElement?.tagName === 'BLOCKQUOTE') key = 'blockquoteP';
    if (node.hasAttribute('data-img')) key = 'imgSlot';
    if (node.hasAttribute('data-fn-ref')) key = 'fnRef';
    if (node.hasAttribute('data-footnotes')) key = 'footnotes';
    if (node.hasAttribute('data-fn-title')) key = 'fnTitle';
    if (node.hasAttribute('data-fn-item')) key = 'fnItem';
    if (node.hasAttribute('data-bar')) {
      key = 'preBar';
      node.innerHTML = PRE_BAR_DOTS;
    }
    if (!key) return;

    node.removeAttribute('class');
    for (const attr of RENDER_ONLY_ATTRS) node.removeAttribute(attr);
    const style = styles[key];
    if (style) node.setAttribute('style', style + (node.getAttribute('style') || ''));
  });

  // 代码配色的底色/正文色要压过主题自带的 pre / preCode，否则深浅配色会打架
  if (codePalette) applyCodeChrome(root, codePalette);

  for (const [selector, part] of PART_SELECTORS) {
    root.querySelectorAll(selector).forEach((node) => node.setAttribute('data-part', part));
  }

  root.querySelectorAll('pre > code').forEach((code) => preserveCodeWhitespace(code, doc));

  const decor = theme.decor;
  if (decor.ulMark || decor.olMark) applyListMarks(root, theme, doc);

  root.querySelectorAll('li').forEach((item) => {
    const section = doc.createElement('section');
    while (item.firstChild) section.appendChild(item.firstChild);
    item.appendChild(section);
  });

  if (decor.h1) root.querySelectorAll('h1').forEach((node) => (node.innerHTML = decor.h1!(node.innerHTML)));
  if (decor.h2) {
    root.querySelectorAll('h2').forEach((node, index) => (node.innerHTML = decor.h2!(node.innerHTML, index + 1)));
  }
  if (decor.h3) root.querySelectorAll('h3').forEach((node) => (node.innerHTML = decor.h3!(node.innerHTML)));

  if (decor.quoteMark) {
    root
      .querySelectorAll('blockquote')
      .forEach((node) => node.insertAdjacentHTML('afterbegin', decor.quoteMark as string));
  }

  if (decor.hr) {
    root.querySelectorAll('hr').forEach((node) => {
      node.insertAdjacentHTML('beforebegin', decor.hr as string);
      node.previousElementSibling?.setAttribute('data-part', 'hr');
      node.remove();
    });
  }

  root.querySelectorAll('table').forEach((table) => {
    const wrapper = doc.createElement('section');
    wrapper.setAttribute('style', styles.tableWrap);
    table.replaceWith(wrapper);
    wrapper.appendChild(table);
  });

  if (decor.card) applyCard(root, decor.card, doc);

  root.setAttribute('style', styles.wrapper);
  if (hasColorOverrides(overrides)) {
    root.setAttribute('data-part-self', 'page');
    applyColorOverrides(root, theme.accent, overrides);
  }

  // 版式参数放在配色重映射之后：用户显式选的标题描边/底色要压过主题与重映射的结果
  if (params) {
    const accent = isHexColor(overrides.main) ? overrides.main : theme.accent;
    applyHeadingStyles(root, params.headingStyles, accent);
    applyBlockSpacing(root, params.blockSpacing);
    applyLineHeight(root, params.lineHeight);
    // 'accent' 是「主题色浅底」的哨兵值：换主色/换主题时按当前主色重算，不写死 rgba
    const quoteBackground =
      params.blockquoteBackground === 'accent' ? rgbaFromHex(accent, 0.08) : params.blockquoteBackground;
    applyBlockquoteBackground(root, quoteBackground);
  }

  // 整体字号放在最后：配色重映射会重写 style，先缩放会被覆盖
  scaleFontSizes(root, fontScale);
  applyFontFamily(root, doc, fontFamily, fontWeight);
  stripFontFamilyQuotes(root);

  root.querySelectorAll('[data-part], [data-part-self]').forEach((node) => {
    node.removeAttribute('data-part');
    node.removeAttribute('data-part-self');
  });
  // querySelectorAll 不包含根节点自身，根上的 page 标记要单独清
  root.removeAttribute('data-part-self');

  return root.outerHTML;
}
