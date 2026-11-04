import { Marked } from 'marked';
import hljs from 'highlight.js/lib/core';

import bash from 'highlight.js/lib/languages/bash';
import cpp from 'highlight.js/lib/languages/cpp';
import csharp from 'highlight.js/lib/languages/csharp';
import css from 'highlight.js/lib/languages/css';
import go from 'highlight.js/lib/languages/go';
import java from 'highlight.js/lib/languages/java';
import javascript from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/json';
import markdown from 'highlight.js/lib/languages/markdown';
import php from 'highlight.js/lib/languages/php';
import python from 'highlight.js/lib/languages/python';
import rust from 'highlight.js/lib/languages/rust';
import sql from 'highlight.js/lib/languages/sql';
import typescript from 'highlight.js/lib/languages/typescript';
import xml from 'highlight.js/lib/languages/xml';
import yaml from 'highlight.js/lib/languages/yaml';

// 与原站一致：只注册这 16 种语言，保证「未注册语言走纯文本转义」的行为相同
const LANGUAGES: Record<string, Parameters<typeof hljs.registerLanguage>[1]> = {
  javascript,
  typescript,
  python,
  java,
  go,
  rust,
  cpp,
  csharp,
  php,
  bash,
  json,
  xml,
  css,
  sql,
  yaml,
  markdown,
};

Object.entries(LANGUAGES).forEach(([name, definition]) => {
  hljs.registerLanguage(name, definition);
});

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

const marked = new Marked({
  gfm: true,
  breaks: false,
  extensions: [
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
      const language = (lang || '').trim().split(/\s+/)[0].toLowerCase();
      const highlighted =
        language && hljs.getLanguage(language)
          ? hljs.highlight(text, { language }).value
          : escapeHtml(text);
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
