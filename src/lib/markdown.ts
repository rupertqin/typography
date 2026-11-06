import { Marked } from 'marked';

import { hljs, resolveLanguage } from './hljs-languages';
import { MERMAID_ATTR, MERMAID_CLASS, MERMAID_LOADING_TEXT, MERMAID_STATE_ATTR, encodeMermaid } from './mermaid';

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** 公众号正文里只有自家域名可点，其余变成不可点的 span（导出时补出地址） */
const WECHAT_LINK = /^https?:\/\/mp\.weixin\.qq\.com\//;
const RAW_INLINE_HTML = /^<\/?(sup|sub)>$/i;

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
      // 只放行 <sup>/<sub> 这类成对标签，其余（含手写 style/script）一律转义
      return RAW_INLINE_HTML.test(text.trim()) ? text.trim().toLowerCase() : escapeHtml(text);
    },
  },
});

export function parseMarkdown(markdown: string): string {
  return marked.parse(markdown, { async: false }) as string;
}
