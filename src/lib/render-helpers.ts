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

const formatPx = (value: number) => String(Math.round(value * 10) / 10);

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
