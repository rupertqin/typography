import type { Theme, ThemeCardDecor } from './types';

/** 标签 → 主题样式键（h5/h6 复用 h4 的样式） */
export const STYLE_KEY_BY_TAG: Record<string, string> = {
  p: 'p',
  h1: 'h1',
  h2: 'h2',
  h3: 'h3',
  h4: 'h4',
  h5: 'h4',
  h6: 'h4',
  strong: 'strong',
  em: 'em',
  del: 'del',
  a: 'link',
  sup: 'sup',
  sub: 'sub',
  blockquote: 'blockquote',
  ul: 'ul',
  ol: 'ol',
  li: 'li',
  code: 'code',
  pre: 'pre',
  hr: 'hr',
  table: 'table',
  th: 'th',
  td: 'td',
};

/** 这些属性只服务于渲染阶段，导出前必须清掉 */
export const RENDER_ONLY_ATTRS = [
  'data-img',
  'data-bar',
  'data-fn-ref',
  'data-footnotes',
  'data-fn-title',
  'data-fn-item',
];

export const PRE_BAR_DOTS = ['#ff5f56', '#ffbd2e', '#27c93f']
  .map(
    (color) =>
      `<span style="display:inline-block;width:10px;height:10px;margin-right:6px;border-radius:50%;background:${color};"></span>`,
  )
  .join('');

export const PART_SELECTORS: Array<[string, string]> = [
  ['h1', 'h1'],
  ['h2', 'h2'],
  ['h3, h4, h5, h6', 'h3'],
  ['strong', 'strong'],
  ['blockquote', 'blockquote'],
  [':not(pre) > code', 'code'],
  ['table', 'table'],
  ['hr', 'hr'],
  ['a', 'link'],
];

const STRUCTURAL_TAGS = /^(SECTION|P|H[1-6]|BLOCKQUOTE|UL|OL|LI|PRE|HR|TABLE|THEAD|TBODY|TR|TH|TD)$/;

export function isStructural(node: Node | null): boolean {
  return !node || (node.nodeType === 1 && STRUCTURAL_TAGS.test((node as Element).tagName));
}

/** 图片转成占位框：公众号不接受外链图片，用户粘贴后自行补图 */
export function normalizeImageSlots(root: Element, doc: Document): void {
  root.querySelectorAll('[data-img]').forEach((slot) => {
    const box = doc.createElement('section');
    box.setAttribute('data-img', '');
    box.innerHTML = slot.innerHTML;
    const parent = slot.parentElement;
    if (parent?.tagName === 'P' && parent.childNodes.length === 1) {
      parent.replaceWith(box);
    } else {
      slot.replaceWith(box);
    }
  });
}

/** 脚注：按首次引用顺序编号，未引用的定义按出现顺序补在末尾；不可点链接补出地址 */
export function normalizeFootnotes(root: Element, doc: Document): void {
  const definitions = new Map<string, Element>();
  root.querySelectorAll('[data-fn-def]').forEach((definition) => {
    const id = definition.getAttribute('data-fn-def') as string;
    if (!definitions.has(id)) definitions.set(id, definition);
    definition.remove();
  });

  const order: string[] = [];
  root.querySelectorAll('[data-fn-ref]').forEach((ref) => {
    const id = ref.getAttribute('data-fn-ref') as string;
    if (!definitions.has(id)) {
      ref.replaceWith(doc.createTextNode(`[^${id}]`));
      return;
    }
    if (!order.includes(id)) order.push(id);
    ref.textContent = `[${order.indexOf(id) + 1}]`;
  });

  definitions.forEach((_, id) => {
    if (!order.includes(id)) order.push(id);
  });

  if (order.length) {
    const section = doc.createElement('section');
    section.setAttribute('data-footnotes', '');
    section.innerHTML = '<section data-fn-title>注释</section>';
    order.forEach((id, index) => {
      const definition = definitions.get(id) as Element;
      definition.removeAttribute('data-fn-def');
      definition.setAttribute('data-fn-item', '');
      definition.querySelectorAll('[data-href]').forEach((link) => {
        const href = link.getAttribute('data-href');
        if (link.textContent?.trim() !== href) link.append(`：${href}`);
      });
      definition.prepend(`[${index + 1}] `);
      section.appendChild(definition);
    });
    root.appendChild(section);
  }

  root.querySelectorAll('[data-href]').forEach((link) => {
    link.replaceWith(...Array.from(link.childNodes));
  });
}

/** 代码块里的换行/缩进在富文本粘贴后会丢，转成 <br> 与不换行空格 */
export function preserveCodeWhitespace(code: Element, doc: Document): void {
  const walker = doc.createTreeWalker(code, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode as Text);

  for (const node of textNodes) {
    const lines = node.data.replace(/\t/g, '    ').replace(/ /g, '\u00a0').split('\n');
    const fragment = doc.createDocumentFragment();
    lines.forEach((line, index) => {
      if (index > 0) fragment.appendChild(doc.createElement('br'));
      if (line) fragment.appendChild(doc.createTextNode(line));
    });
    node.replaceWith(fragment);
  }
}

/** 列表符号装饰：去掉原生 bullet，用主题提供的标记 */
export function applyListMarks(root: Element, theme: Theme, doc: Document): void {
  root.querySelectorAll('ul, ol').forEach((list) => {
    const ordered = list.tagName === 'OL';
    const mark = ordered ? theme.decor.olMark : theme.decor.ulMark && (() => theme.decor.ulMark);
    if (!mark) return;

    const wrapper = doc.createElement('section');
    wrapper.setAttribute(
      'style',
      `${list.getAttribute('style') || ''}padding-left:0;list-style-type:none;`,
    );

    let index = (ordered && Number(list.getAttribute('start'))) || 1;
    for (const item of Array.from(list.children)) {
      const row = doc.createElement('section');
      row.setAttribute('style', `${item.getAttribute('style') || ''}padding-left:1.6em;`);
      row.innerHTML = `<span data-part="list" style="display:inline-block;width:1.6em;margin-left:-1.6em;">${(mark as (n: number) => string)(index++)}</span>`;
      while (item.firstChild) row.appendChild(item.firstChild);
      wrapper.appendChild(row);
    }
    list.replaceWith(wrapper);
  });
}

/** 内联样式里的绝对字号；百分比字号（75%/90%）会随父级自动跟着缩放，无需处理 */
const FONT_SIZE_PX = /font-size\s*:\s*([\d.]+)px/gi;

/** 公众号里只用整数 px，避免小数在不同端上的兼容性差异；再小也不低于 10px */
const MIN_FONT_PX = 10;

const formatPx = (value: number) => Math.max(MIN_FONT_PX, Math.round(value));

/**
 * 整体字号：按比例缩放内联样式里的 px 字号。
 * 主题的根 section 与各级标题都用 px，只改根字号不会影响标题，所以逐节点等比缩放。
 */
export function scaleFontSizes(root: Element, scale: number): void {
  if (!Number.isFinite(scale) || scale <= 0 || scale === 1) return;
  const nodes: Element[] = [root, ...Array.from(root.querySelectorAll('*'))];
  for (const node of nodes) {
    const style = node.getAttribute('style');
    if (!style || !style.includes('font-size')) continue;
    node.setAttribute(
      'style',
      style.replace(FONT_SIZE_PX, (_, size: string) => `font-size:${formatPx(Number(size) * scale)}px`),
    );
  }
}

/**
 * 去掉内联 font-family 里的双引号：属性序列化会把它们写成 &quot;，
 * 公众号预览的清洗链路在这类转义上容易出错，导致整条样式被丢掉。
 * font-family:PingFang SC 这种不带引号的写法本身就是合法 CSS。
 */
export function stripFontFamilyQuotes(root: Element): void {
  const nodes: Element[] = [root, ...Array.from(root.querySelectorAll('*'))];
  for (const node of nodes) {
    const style = node.getAttribute('style');
    if (!style || !style.includes('"')) continue;
    node.setAttribute(
      'style',
      style.replace(/font-family\s*:([^;]*)/gi, (_, value: string) => `font-family:${value.replace(/"/g, '')}`),
    );
  }
}

/**
 * 正文字体 + 内容 wrapper：参照秀米/135 的粘贴结构，字体只声明在 section 容器上。
 * 1) 选了字体时，主题 section 自身的 font-family 也换成它（它们粘贴后的 DOM 就是这样）；
 * 2) 内容外面永远再包一层 section——微信粘贴时会把最外层节点当作粘贴根节点重建，
 *    内层这层才是真正留在文章里的容器（选了字体就带字体，没选就是干净容器）。
 * 逐个元素写 font-family 反而会被清洗链路整条丢弃，连带该元素的其他样式一起消失。
 */
export function applyFontFamily(root: Element, doc: Document, stack: string, weight?: number): void {
  const family = stack.replace(/"/g, '').trim();
  const rootStyle = root.getAttribute('style') ?? '';
  const themeFamily = /font-family\s*:\s*([^;]+)/i.exec(rootStyle)?.[1]?.trim() ?? '';
  const decl = family ? `font-family:${family};${weight ? `font-weight:${weight};` : ''}` : '';

  if (decl) {
    const rest = rootStyle
      .replace(/font-family\s*:[^;]*;?/i, '')
      .replace(/font-weight\s*:[^;]*;?/i, '');
    root.setAttribute('style', decl + rest);
  }

  const wrapper = doc.createElement('section');
  // 没有选字体时也带上主题字体：微信会丢弃没有任何属性的空 section，
  // 带条 font-family 才能作为真实容器留在文章里。
  const wrapperDecl = decl || (themeFamily ? `font-family:${themeFamily};` : '');
  if (wrapperDecl) wrapper.setAttribute('style', wrapperDecl);
  while (root.firstChild) wrapper.appendChild(root.firstChild);
  root.appendChild(wrapper);
}

/** 卡片流主题：把正文按 h2 分组成卡片 */
export function applyCard(root: Element, card: ThemeCardDecor, doc: Document): void {
  let current: Element | null = null;
  let afterHeading = false;

  for (const child of Array.from(root.children)) {
    if (child.tagName === 'H1') {
      current = null;
      continue;
    }
    if (child.tagName === 'H2') {
      afterHeading = true;
      current = null;
      if (!card.withHeading) continue;
    } else if (!afterHeading && card.skipLead) {
      continue;
    }
    if (!current) {
      current = doc.createElement('section');
      current.setAttribute('style', card.style ?? '');
      current.setAttribute('data-part-self', 'page');
      child.before(current);
    }
    current.appendChild(child);
  }
}
