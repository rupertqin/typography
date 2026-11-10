import { Marked } from 'marked';

import { hljs, resolveLanguage } from './hljs-languages';
import { MERMAID_ATTR, MERMAID_CLASS, MERMAID_LOADING_TEXT, MERMAID_STATE_ATTR, encodeMermaid } from './mermaid';
import {
  MATH_ATTR,
  MATH_BLOCK_CLASS,
  MATH_BLOCK_STYLE,
  MATH_CLASS,
  MATH_DISPLAY_ATTR,
  MATH_STATE_ATTR,
  encodeMath,
} from './math-render';

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** 公众号正文里只有自家域名可点，其余变成不可点的 span（导出时补出地址） */
const WECHAT_LINK = /^https?:\/\/mp\.weixin\.qq\.com\//;
/**
 * 允许原样写入正文的 HTML 标签：公众号正文里常见、且不会执行脚本的那一批。
 * doocs-md 是直接透传，我们多一道白名单，避免 <script>/onerror 之类混进预览和复制产物。
 */
const RAW_HTML_TAGS = new Set([
  'a', 'b', 'blockquote', 'br', 'center', 'code', 'del', 'div', 'em', 'figcaption', 'figure',
  'hr', 'i', 'img', 'li', 'ol', 'p', 's', 'section', 'small', 'span', 'strong', 'sub', 'sup',
  'table', 'tbody', 'td', 'th', 'thead', 'tr', 'u', 'ul',
]);

const RAW_HTML_TAG = /<\/?([a-zA-Z][a-zA-Z0-9-]*)([^<>]*)>/g;
/** 事件属性、以及 style 里能执行代码的写法，出现就整段转义 */
const RAW_HTML_UNSAFE = /\son[a-z]+\s*=|\bstyle\s*=\s*["'][^"']*(?:expression|javascript:)/i;

/**
 * 校验一段内联/块级 HTML：标签必须在白名单里、不能带事件属性、不能有落单的尖括号。
 * 通过则原样返回（保留 style），否则返回 null，由调用方转义成文本。
 */
function sanitizeRawHtml(html: string): string | null {
  let safe = true;
  html.replace(RAW_HTML_TAG, (match, name: string, attrs: string) => {
    if (!RAW_HTML_TAGS.has(name.toLowerCase()) || RAW_HTML_UNSAFE.test(attrs)) safe = false;
    return match;
  });
  if (!safe) return null;
  // 去掉所有合法标签后，不应再剩裸尖括号（否则说明有写坏/写不完整的标记）
  if (/[<>]/.test(html.replace(RAW_HTML_TAG, ''))) return null;
  return html;
}

/**
 * 高亮结果缓存：每次敲字都会重渲染整篇，未改动的代码块不该重新跑一遍语法分析。
 * 条目是生成的 HTML（比源码大几倍），上限按「一篇文章的代码块数量」取 200。
 */
const HIGHLIGHT_CACHE_LIMIT = 200;
const highlightCache = new Map<string, string>();

function highlightCode(text: string, language: string): string {
  if (!language) return escapeHtml(text);

  const key = `${language}\u0000${text}`;
  const cached = highlightCache.get(key);
  if (cached !== undefined) {
    // 命中后挪到末尾，维持 LRU 顺序
    highlightCache.delete(key);
    highlightCache.set(key, cached);
    return cached;
  }

  // 语法还没加载时不要把「纯文本兜底」写进缓存：
  // 否则语法到达后的那次重渲染会命中缓存，代码永远保持无颜色。
  if (!hljs.getLanguage(language)) return escapeHtml(text);

  const highlighted = hljs.highlight(text, { language }).value;

  highlightCache.set(key, highlighted);
  if (highlightCache.size > HIGHLIGHT_CACHE_LIMIT) {
    const oldest = highlightCache.keys().next().value;
    if (oldest !== undefined) highlightCache.delete(oldest);
  }
  return highlighted;
}

/** 公式占位：真正的内容由 useMathHydration 异步填 SVG，这里只放源码兜底 */
function mathPlaceholder(tex: string, display: boolean, raw: string): string {
  const encoded = encodeMath(tex);
  const fallback = escapeHtml(raw.trim());
  if (display) {
    return `<section class="${MATH_CLASS} ${MATH_BLOCK_CLASS}" ${MATH_ATTR}="${encoded}" ${MATH_DISPLAY_ATTR}="1" ${MATH_STATE_ATTR}="loading" style="${MATH_BLOCK_STYLE}">${fallback}</section>`;
  }
  return `<span class="${MATH_CLASS}" ${MATH_ATTR}="${encoded}" ${MATH_DISPLAY_ATTR}="0" ${MATH_STATE_ATTR}="loading">${fallback}</span>`;
}

/**
 * `++下划线++` / `==高亮==` 的左边界（对齐 doocs-md）：
 * 定界符紧跟在 ASCII 字母数字后面就不认，`C++`、`C++17`、`x==1` 保持原文；
 * 中文紧贴（`把++重点++标出`）照常解析。
 */
const WORD_CHAR = /[A-Z0-9]/i;

/** src 只从候选位置往后给，左边界要从已切好的 tokens 里还原（取最后一个 token 的末尾字符） */
function prevInlineChar(tokens?: any[]): string {
  const last = tokens?.[tokens.length - 1];
  if (!last) return '';
  const nested = last.tokens;
  if (Array.isArray(nested) && nested.length > 0) return prevInlineChar(nested);
  const text: string = last.text ?? last.raw ?? '';
  return text.charAt(text.length - 1);
}

const marked = new Marked({
  gfm: true,
  breaks: false,
  extensions: [
    /**
     * 中文标点紧贴加粗定界符时，CommonMark 的 flanking 规则判定「不能闭合」，
     * marked 会把 `**` 原样输出：`…缺席。**占了那个位置。**权力…` 里的加粗就丢了。
     * marked 15 没有 strong 的 tokenizer 可覆盖（只有 emStrong），所以在核心规则之前
     * 用宽松正则先吃掉 `**…**`：
     * - 只放宽 `**`，不动 `__`：`a__b__c` 这类下划线写法仍按 CommonMark 保持原文；
     * - 开头/结尾仍要求非空白（`(?=\S)` / `\S`），`a ** b` 不受影响；
     * - 行内代码更靠前被 code 规则消费，`` `**x**` `` 不受影响；
     * - `***粗斜***` 会解析成 `<strong><em>粗斜</em></strong>`，观感一致。
     */
    {
      name: 'strongCjk',
      level: 'inline',
      start(src: string) {
        return src.indexOf('**');
      },
      tokenizer(src: string) {
        const match = /^\*\*(?=\S)([\s\S]*?\S)\*\*(?!\*)/.exec(src);
        if (!match) return undefined;
        return { type: 'strongCjk', raw: match[0], tokens: this.lexer.inlineTokens(match[1]) };
      },
      renderer(token: any) {
        return `<strong>${this.parser.parseInline(token.tokens)}</strong>`;
      },
    },
    /**
     * LaTeX（对齐 doocs-md）：支持 `$…$` / `$$…$$` / `\(…\)` / `\[…\]` 四种写法。
     *
     * 和 Mermaid 一样只吐占位元素，公式编译后由 useMathHydration 灌入 SVG：
     * - 编辑器每敲一个字都会整篇重渲染，同步编译会把输入拖卡；
     * - 占位里先放公式源码，MathJax 还没加载完时看到的是 TeX 而不是空白。
     */
    {
      name: 'mathBlock',
      level: 'block',
      start(src) {
        return src.match(/^ {0,3}\$\$/m)?.index;
      },
      tokenizer(src) {
        const multiline = /^ {0,3}\$\$[ \t]*\r?\n([\s\S]+?)\r?\n {0,3}\$\$[ \t]*(?:\n+|$)/.exec(src);
        const single = /^ {0,3}\$\$([^\n]+?)\$\$[ \t]*(?:\n+|$)/.exec(src);
        const match = multiline ?? single;
        if (!match) return undefined;
        return { type: 'mathBlock', raw: match[0], text: match[1].trim(), display: true };
      },
      renderer(token: any) {
        return mathPlaceholder(token.text, true, token.raw);
      },
    },
    {
      name: 'mathLatexBlock',
      level: 'block',
      start(src) {
        return src.match(/^ {0,3}\\\[/m)?.index;
      },
      tokenizer(src) {
        const match = /^ {0,3}\\\[([\s\S]+?)\\\][ \t]*(?:\n+|$)/.exec(src);
        if (!match) return undefined;
        return { type: 'mathLatexBlock', raw: match[0], text: match[1].trim(), display: true };
      },
      renderer(token: any) {
        return mathPlaceholder(token.text, true, token.raw);
      },
    },
    {
      name: 'mathInline',
      level: 'inline',
      start(src) {
        const index = src.search(/\$(?=[^\s$])/);
        return index === -1 ? undefined : index;
      },
      tokenizer(src) {
        // 闭合符后必须是行尾或非字母数字（汉字、空白、标点都算），
        // 否则「价格 $5 和 $10」这类金额会被当成公式
        const match = /^(\${1,2})(?!\$)((?:\\.|[^\\\n])*?(?:\\.|[^\\\n$]))\1(?![A-Za-z0-9$])/.exec(src);
        if (!match) return undefined;
        return { type: 'mathInline', raw: match[0], text: match[2].trim(), display: match[1].length === 2 };
      },
      renderer(token: any) {
        return mathPlaceholder(token.text, token.display, token.raw);
      },
    },
    {
      name: 'mathInlineLatex',
      level: 'inline',
      start(src) {
        const index = src.indexOf('\\(');
        return index === -1 ? undefined : index;
      },
      tokenizer(src) {
        const match = /^\\\(([\s\S]+?)\\\)/.exec(src);
        if (!match) return undefined;
        return { type: 'mathInlineLatex', raw: match[0], text: match[1].trim(), display: false };
      },
      renderer(token: any) {
        return mathPlaceholder(token.text, false, token.raw);
      },
    },
    // Mermaid 只输出占位元素：SVG 要等 DOM 落盘后异步渲染（见 lib/mermaid.ts）
    {
      name: 'mermaid',
      level: 'block',
      start(src: string) {
        return src.match(/^\s*```mermaid\b/m)?.index;
      },
      tokenizer(src: string) {
        const match = /^\s*```mermaid\r?\n([\s\S]*?)\r?\n```[ \t]*(?:\n+|$)/.exec(src);
        if (!match) return undefined;
        return { type: 'mermaid', raw: match[0], text: match[1].trim() };
      },
      renderer(token: any) {
        const encoded = encodeMermaid(token.text);
        return `<div class="${MERMAID_CLASS}" ${MERMAID_ATTR}="${encoded}" ${MERMAID_STATE_ATTR}="loading">${MERMAID_LOADING_TEXT}</div>`;
      },
    },
    {
      name: 'sup',
      level: 'inline',
      start(src: string) {
        return src.indexOf('^');
      },
      tokenizer(src: string) {
        const match = /^\^([^^\s]+)\^/.exec(src);
        if (match) {
          return { type: 'sup', raw: match[0], tokens: this.lexer.inlineTokens(match[1]) };
        }
        return undefined;
      },
      renderer(token: any) {
        return `<sup>${this.parser.parseInline(token.tokens)}</sup>`;
      },
    },
    {
      name: 'sub',
      level: 'inline',
      start(src: string) {
        return src.indexOf('~');
      },
      tokenizer(src: string) {
        const match = /^~([^~\s]+)~(?!~)/.exec(src);
        if (match) {
          return { type: 'sub', raw: match[0], tokens: this.lexer.inlineTokens(match[1]) };
        }
        return undefined;
      },
      renderer(token: any) {
        return `<sub>${this.parser.parseInline(token.tokens)}</sub>`;
      },
    },
    /**
     * 波浪线 `~文字~`（对齐 doocs-md 的 markup 扩展）。
     *
     * 和下标共用 `~`：marked 的扩展是后注册的先试（`unshift`），所以这条必须排在
     * `sub` 后面，靠 doocs 的左边界规则把两者分开——`~` 紧跟在 ASCII 字母数字后面
     * 不认（`H~2~O`、`v1~2~3` 留给 sub），`~波浪线~`、`前文~波浪~后文` 才是波浪线；
     * `~~删除~~` 由删除线规则先吃掉。
     */
    {
      name: 'wavyline',
      level: 'inline',
      start(src: string) {
        // 跳过 `~~`：成对的双波浪线属于删除线，别把它切成两段纯文本
        let from = 0;
        for (;;) {
          const index = src.indexOf('~', from);
          if (index === -1) return undefined;
          if (src[index + 1] === '~') {
            from = index + 1;
            continue;
          }
          return index;
        }
      },
      tokenizer(src: string, tokens: any[]) {
        if (WORD_CHAR.test(prevInlineChar(tokens))) return undefined;
        const match = /^~(?=\S)([^~\n]*[^\s~])~(?!~)/.exec(src);
        if (!match) return undefined;
        return { type: 'wavyline', raw: match[0], tokens: this.lexer.inlineTokens(match[1]) };
      },
      renderer(token: any) {
        return `<span data-wavyline>${this.parser.parseInline(token.tokens)}</span>`;
      },
    },
    /**
     * 下划线 / 高亮（对齐 doocs-md 的 markup 扩展）：
     * `++下划线++` → 带主色下划线的 span，`==高亮==` → 主色底 + 反白文字。
     *
     * 与 doocs 的差别只有一处：公众号会丢掉 class，所以这里先吐 `data-underline` /
     * `data-highlight` 标记，主色由 render.ts 在配色重映射之后写成内联样式。
     */
    {
      name: 'underline',
      level: 'inline',
      start(src: string) {
        return src.indexOf('++');
      },
      tokenizer(src: string, tokens: any[]) {
        if (WORD_CHAR.test(prevInlineChar(tokens))) return undefined;
        const match = /^\+\+(?=\S)((?:[^+]|\+(?!\+))*[^\s+])\+\+/.exec(src);
        if (!match) return undefined;
        return { type: 'underline', raw: match[0], tokens: this.lexer.inlineTokens(match[1]) };
      },
      renderer(token: any) {
        return `<span data-underline>${this.parser.parseInline(token.tokens)}</span>`;
      },
    },
    {
      name: 'highlight',
      level: 'inline',
      start(src: string) {
        return src.indexOf('==');
      },
      tokenizer(src: string, tokens: any[]) {
        if (WORD_CHAR.test(prevInlineChar(tokens))) return undefined;
        const match = /^==(?=\S)((?:[^=]|=(?!=))*[^\s=])==/.exec(src);
        if (!match) return undefined;
        return { type: 'highlight', raw: match[0], tokens: this.lexer.inlineTokens(match[1]) };
      },
      renderer(token: any) {
        return `<span data-highlight>${this.parser.parseInline(token.tokens)}</span>`;
      },
    },
    {
      name: 'fnRef',
      level: 'inline',
      start(src: string) {
        return src.indexOf('[^');
      },
      tokenizer(src: string) {
        const match = /^\[\^([^\]\s]+)\]/.exec(src);
        if (match) {
          return { type: 'fnRef', raw: match[0], id: match[1] };
        }
        return undefined;
      },
      renderer(token: any) {
        return `<sup data-fn-ref="${escapeHtml(token.id)}"></sup>`;
      },
    },
    {
      name: 'fnDef',
      level: 'block',
      start(src: string) {
        return src.match(/^\[\^[^\]\s]+\]:/m)?.index;
      },
      tokenizer(src: string) {
        const match = /^\[\^([^\]\s]+)\]:[ \t]*([^\n]*(?:\n(?: {2,}|\t)[^\n]*)*)(?:\n+|$)/.exec(src);
        if (match) {
          return {
            type: 'fnDef',
            raw: match[0],
            id: match[1],
            tokens: this.lexer.inlineTokens(match[2].trim()),
          };
        }
        return undefined;
      },
      renderer(token: any) {
        return `<section data-fn-def="${escapeHtml(token.id)}">${this.parser.parseInline(token.tokens)}</section>`;
      },
    },
  ],
  tokenizer: {
    // 删除线在 marked 默认实现里不允许内部含 ~，这里放宽成「非首尾空白」即可
    del(src: string) {
      const match = /^~~(?=[^\s~])([\s\S]*?[^\s~])~~(?!~)/.exec(src);
      if (match) {
        return {
          type: 'del',
          raw: match[0],
          text: match[1],
          tokens: this.lexer.inlineTokens(match[1]),
        };
      }
      return undefined;
    },
  },
  renderer: {
    code({ text, lang }: { text: string; lang?: string }) {
      const language = resolveLanguage((lang || '').trim().split(/\s+/)[0]);
      const highlighted = highlightCode(text, language);
      return `<pre><span data-bar></span><code>${highlighted}</code></pre>`;
    },
    image({ text }: { text: string }) {
      return `<span data-img>${
        text ? `📷 在这里插入图片：${escapeHtml(text)}` : '📷 在这里插入图片'
      }<br>粘贴到公众号后，用编辑器的「图片」按钮插入，再删掉这个框</span>`;
    },
    link({ href, tokens }: { href: string; tokens: any[] }) {
      const content = this.parser.parseInline(tokens);
      return WECHAT_LINK.test(href)
        ? `<a href="${escapeHtml(href)}">${content}</a>`
        : `<span data-href="${escapeHtml(href)}">${content}</span>`;
    },
    html({ text }: { text: string }) {
      // 白名单内的 HTML 原样保留（公众号正文支持 section/center/img 这类），其余一律转义
      const raw = text.trim();
      return sanitizeRawHtml(raw) ?? escapeHtml(text);
    },
  },
});

/** 统计 [from, to) 之间的换行数：源码行号完全靠它累加 */
function countNewlines(text: string, from: number, to: number): number {
  let count = 0;
  for (let index = from; index < to; index += 1) {
    if (text.charCodeAt(index) === 10) count += 1;
  }
  return count;
}

/**
 * 把顶层块的起始行号写到它的第一个标签上（`data-src-line`，1 基）。
 * 预览区滚动同步靠这个属性把渲染出来的块对回源码行；复制时 `stripAttributes` 会清掉所有 data-*。
 * 原样透传的 HTML 块不加：那是用户自己写的标记，不去改它（少一个锚点不影响对齐）。
 */
function markSourceLine(html: string, line: number): string {
  const match = /^<([a-zA-Z][\w-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/.exec(html);
  if (!match) return html;
  return `<${match[1]} data-src-line="${line}"${match[2]}>${html.slice(match[0].length)}`;
}

/**
 * Markdown → HTML。逐块渲染而不是整篇一次 `marked.parse`，就是为了拿到「每个块从第几行开始」：
 * marked 的 token 不带位置信息，但块 token 的 `raw` 是源码的原样切片，
 * 按顺序在源码里 indexOf 一遍就能还原行号（相邻的 text token 要合并，否则一段会被拆成多个 <p>）。
 */
export function parseMarkdown(markdown: string): string {
  // 行号要跟 marked 内部的换行归一化对齐（lex 会把 CRLF 换成 LF）
  const source = markdown.replace(/\r\n|\r/g, '\n');
  const tokens = marked.lexer(source) as any[];

  const chunks: any[][] = [];
  for (const token of tokens) {
    const last = chunks[chunks.length - 1];
    if (token.type === 'text' && last && last[last.length - 1].type === 'text') last.push(token);
    else chunks.push([token]);
  }

  const out: string[] = [];
  let cursor = 0;
  /** cursor 之前已经数过的换行数 */
  let lines = 0;

  for (const chunk of chunks) {
    const raw = chunk.map((token) => (typeof token.raw === 'string' ? token.raw : '')).join('');
    const at = raw ? source.indexOf(raw, cursor) : -1;
    // 扩展 tokenizer 的 raw 可能把块前的空行也吃进来（mermaid 的 `^\s*`），行号要跳过这段空白
    const lead = at >= 0 ? (raw.match(/^\s*/)?.[0].length ?? 0) : 0;
    if (at >= 0) cursor = at;
    const start = Math.min(source.length, cursor + lead);
    lines += countNewlines(source, cursor, start);
    cursor = start;

    const html = marked.parser(chunk) as string;
    out.push(chunk[0].type === 'html' ? html : markSourceLine(html, lines + 1));

    const end = Math.min(source.length, cursor + raw.length - lead);
    lines += countNewlines(source, cursor, end);
    cursor = end;
  }

  return out.join('');
}
