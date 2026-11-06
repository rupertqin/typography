import type { HeadingStyleType, ThemeCardDecor } from './types';
import type { Theme } from './themes/theme';

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

/** 内联样式拆成声明表：顺序保留，值里的冒号（data: / url()）不误切 */
function splitStyle(style: string): Array<[string, string]> {
  const declarations: Array<[string, string]> = [];
  for (const part of style.split(';')) {
    const colon = part.indexOf(':');
    if (colon < 0) continue;
    const prop = part.slice(0, colon).trim().toLowerCase();
    const value = part.slice(colon + 1).trim();
    if (prop && value) declarations.push([prop, value]);
  }
  return declarations;
}

function joinStyle(declarations: Array<[string, string]>): string {
  return declarations.map(([prop, value]) => `${prop}:${value};`).join('');
}

/** 读一条声明（主题的内联样式是唯一真相，很多判断要按当前值来） */
export function getDecl(style: string | null, prop: string): string | undefined {
  if (!style) return undefined;
  return splitStyle(style).find(([name]) => name === prop)?.[1];
}

/** 覆盖一条声明：保留其余声明的原有顺序，位置沿用被替换的那条 */
export function setDecl(style: string | null, prop: string, value: string): string {
  const declarations = splitStyle(style ?? '');
  const index = declarations.findIndex(([name]) => name === prop);
  if (index >= 0) {
    declarations[index] = [prop, value];
    return joinStyle(declarations);
  }
  declarations.push([prop, value]);
  return joinStyle(declarations);
}

/** 删掉一条（或一组前缀相同的）声明 */
export function dropDecl(style: string | null, props: string | string[]): string {
  const drop = new Set(Array.isArray(props) ? props : [props]);
  return joinStyle(splitStyle(style ?? '').filter(([name]) => !drop.has(name)));
}

/**
 * 代码配色的底色与正文色：只动颜色相关的声明，padding / 字体 / 圆角仍由主题决定。
 * preCode 里的 color 也要一起换，否则深色配色配浅色正文会看不清。
 */
export function applyCodeChrome(
  root: Element,
  palette: { foreground: string; background: string },
): void {
  root.querySelectorAll('pre').forEach((pre) => {
    if (palette.background) pre.setAttribute('style', setDecl(pre.getAttribute('style'), 'background', palette.background));
  });
  root.querySelectorAll('pre > code').forEach((code) => {
    if (palette.foreground) code.setAttribute('style', setDecl(code.getAttribute('style'), 'color', palette.foreground));
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
 * 正文字体：只改根 section 的 font-family / font-weight，不再往里套第二层容器。
 *
 * 早先这里会在根 section 内再包一层带 font-family 的 section（迁就「微信把最外层当粘贴根重建」的旧说法），
 * 结果产物是两层嵌套 section；主题的 wrapper 样式本身就带 font-family，根节点永远有内联属性，
 * 所以内层容器没有存在价值，直接去掉，产物只留一层 section。
 * 逐个元素写 font-family 反而会被清洗链路整条丢弃，连带该元素的其他样式一起消失。
 */
export function applyFontFamily(root: Element, stack: string, weight?: number): void {
  const family = stack.replace(/"/g, '').trim();
  if (!family) return;

  const rootStyle = root.getAttribute('style') ?? '';
  const decl = `font-family:${family};${weight ? `font-weight:${weight};` : ''}`;
  const rest = rootStyle.replace(/font-family\s*:[^;]*;?/i, '').replace(/font-weight\s*:[^;]*;?/i, '');
  root.setAttribute('style', decl + rest);
}

/* ------------------------------ 版式参数层 ------------------------------ */
/**
 * 这一层全部是「改写主题已经写死的内联声明」，不是加 CSS 变量：
 * 主题把 line-height 写死上百处、margin 写死两百多处，只改根节点继承不生效。
 */

/** 承载正文节奏的块级元素（行高/段间距只动这些，避免破坏装饰字块与代码块） */
const RHYTHM_SELECTOR = 'p, h1, h2, h3, h4, h5, h6, blockquote, ul, ol, li, td, th, img';

/** 长度值缩放：保留单位，最多两位小数，避免 em 值算出 1.4600000000000002 这种 */
function scaleLength(value: string, factor: number): string {
  const match = /^(-?[\d.]+)([a-z%]*)$/i.exec(value.trim());
  if (!match) return value;
  const size = Number(match[1]);
  if (!Number.isFinite(size)) return value;
  const scaled = Math.round(size * factor * 100) / 100;
  return `${scaled}${match[2]}`;
}

/** margin / padding 简写按「上下缩放、左右保留」处理，保住主题的左右留白 */
function scaleShorthand(value: string, factor: number): string {
  const parts = value.trim().split(/\s+/);
  if (parts.length === 1) return scaleLength(parts[0], factor);
  if (parts.length === 2) return `${scaleLength(parts[0], factor)} ${parts[1]}`;
  if (parts.length === 3) return `${scaleLength(parts[0], factor)} ${parts[1]} ${scaleLength(parts[2], factor)}`;
  if (parts.length === 4)
    return `${scaleLength(parts[0], factor)} ${parts[1]} ${scaleLength(parts[2], factor)} ${parts[3]}`;
  return value;
}

function rhythmNodes(root: Element): Element[] {
  return [root, ...Array.from(root.querySelectorAll(RHYTHM_SELECTOR))];
}

/** 段间距：在主题原有节奏上整体缩放上下外边距，标题仍比正文更疏 */
export function applyBlockSpacing(root: Element, factor: number): void {
  if (!Number.isFinite(factor) || factor <= 0 || factor === 1) return;

  for (const node of rhythmNodes(root)) {
    if (node.tagName === 'PRE' || node.closest('pre')) continue;
    const style = node.getAttribute('style');
    if (!style) continue;

    const next = splitStyle(style).map(([prop, value]): [string, string] => {
      if (prop === 'margin' || prop === 'margin-top' || prop === 'margin-bottom') {
        return [prop, scaleShorthand(value, factor)];
      }
      return [prop, value];
    });
    node.setAttribute('style', joinStyle(next));
  }
}

/**
 * 行高：改写块级元素上的 line-height。
 * 不能只改主题根节点——有的主题把 line-height 写死在 h2/li 上，继承不到；
 * 所以文本块统一写一遍。跳过 pre/code（代码行距跟着正文变会糊成一团）
 * 与装饰 span（主题用 line-height:1 对齐描边，改了会错位）。
 */
export function applyLineHeight(root: Element, value: 'theme' | number): void {
  if (value === 'theme' || !Number.isFinite(Number(value))) return;
  const lineHeight = String(value);

  for (const node of rhythmNodes(root)) {
    if (node.tagName === 'PRE' || node.closest('pre')) continue;
    node.setAttribute('style', setDecl(node.getAttribute('style'), 'line-height', lineHeight));
  }
}

/** 引用底色：覆盖 blockquote 的 background，正文段落若自带底色一起压平 */
export function applyBlockquoteBackground(root: Element, background: string): void {
  if (!background) return;
  root.querySelectorAll('blockquote').forEach((quote) => {
    quote.setAttribute('style', setDecl(quote.getAttribute('style'), 'background', background));
    quote.querySelectorAll(':scope > p').forEach((paragraph) => {
      if (!getDecl(paragraph.getAttribute('style'), 'background')) return;
      paragraph.setAttribute('style', setDecl(paragraph.getAttribute('style'), 'background', 'transparent'));
    });
  });
}

/**
 * 正文左右边距：只写 padding-left / padding-right，追加在根 section 的 style 尾部。
 *
 * 主题 wrapper 里常见 `padding:20px 16px;` 这类简写，长写放在后面才能压过它的左右值，
 * 又不会动上下留白。'theme' 表示不干预，保证默认输出与改造前逐字节一致。
 */
export function applyPagePadding(root: Element, value: 'theme' | number): void {
  if (value === 'theme' || typeof value !== 'number' || !Number.isFinite(value)) return;
  const px = Math.min(64, Math.max(0, Math.round(value)));
  const withLeft = setDecl(root.getAttribute('style'), 'padding-left', `${px}px`);
  root.setAttribute('style', setDecl(withLeft, 'padding-right', `${px}px`));
}

const LEVEL_BORDER_WIDTH: Record<string, string> = { borderBottom: '2px', borderLeft: '4px' };

/**
 * 标题样式预设：下边框 / 左边框 / 主题色文字。
 * 描边类预设会把标题从「色块标题」掰回左对齐块级元素——带底色的 h2 加左边框只会糊成一团。
 */
export function applyHeadingStyles(
  root: Element,
  styles: Partial<Record<'h1' | 'h2' | 'h3', HeadingStyleType>>,
  accent: string,
): void {
  (['h1', 'h2', 'h3'] as const).forEach((level) => {
    const style = styles[level];
    if (!style || style === 'default') return;

    root.querySelectorAll(level).forEach((heading) => {
      let next = dropDecl(heading.getAttribute('style'), ['border', 'border-top', 'border-bottom', 'border-left', 'border-right']);

      if (style === 'color-only') {
        heading.setAttribute('style', setDecl(next, 'color', accent));
        return;
      }

      const isBottom = style === 'border-bottom';
      next = setDecl(next, 'display', 'block');
      next = setDecl(next, 'text-align', 'left');
      next = setDecl(next, 'background', 'transparent');
      next = setDecl(next, 'color', accent);
      next = setDecl(next, isBottom ? 'border-bottom' : 'border-left', `${LEVEL_BORDER_WIDTH[isBottom ? 'borderBottom' : 'borderLeft']} solid ${accent}`);
      next = setDecl(next, isBottom ? 'padding-bottom' : 'padding-left', isBottom ? '0.3em' : '10px');
      heading.setAttribute('style', next);
    });
  });
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
