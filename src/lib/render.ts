import { parseMarkdown } from './markdown';
import { applyColorOverrides, hasColorOverrides } from './recolor';
import {
  PART_SELECTORS,
  PRE_BAR_DOTS,
  RENDER_ONLY_ATTRS,
  STYLE_KEY_BY_TAG,
  applyCard,
  applyListMarks,
  isStructural,
  normalizeFootnotes,
  normalizeImageSlots,
  preserveCodeWhitespace,
  scaleFontSizes,
} from './render-helpers';
import type { ColorOverrides, Theme } from './types';

/**
 * 与原站 or(markdown, theme, colors) 等价：
 * Markdown → HTML → 注入主题内联样式与装饰 → 可选配色重映射 → 整体字号 → 返回可直接粘贴的 HTML。
 */
export function renderMarkdown(
  markdown: string,
  theme: Theme,
  colors?: ColorOverrides,
  fontScale = 1,
): string {
  if (typeof DOMParser === 'undefined') return '';

  const overrides: ColorOverrides = colors ?? { main: '', parts: {} };
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

  // 代码高亮 class → 主题内联色板（公众号会丢掉 class）
  root.querySelectorAll('[class*="hljs-"]').forEach((node) => {
    const token = Array.from(node.classList).find((name) => name.startsWith('hljs-'));
    const style = token ? theme.hljs[token.slice(5)] : undefined;
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

  // 整体字号放在最后：配色重映射会重写 style，先缩放会被覆盖
  scaleFontSizes(root, fontScale);

  root.querySelectorAll('[data-part], [data-part-self]').forEach((node) => {
    node.removeAttribute('data-part');
    node.removeAttribute('data-part-self');
  });
  // querySelectorAll 不包含根节点自身，根上的 page 标记要单独清
  root.removeAttribute('data-part-self');

  return root.outerHTML;
}
