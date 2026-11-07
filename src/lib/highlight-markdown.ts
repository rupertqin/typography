/**
 * Markdown 源码高亮（给编辑区那一层用）。
 *
 * 只输出 class，不写任何会改字宽的内联样式：编辑区是「透明 textarea + 底下叠一层同样的文本」，
 * 字宽一变折行位置就和 textarea 对不上，光标会跑偏。
 * 粗体 / 斜体 / 下划线等观感统一放到 global.css，用文字描边、下划线这类不改布局的属性模拟。
 */

const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;' };

const escapeHtml = (text: string) => text.replace(/[&<>]/g, (char) => ESCAPES[char] ?? char);

/** 行内：代码、图片、链接、脚注、加粗、删除线、斜体、裸链接 */
const INLINE = new RegExp(
  [
    '(`[^`\\n]+`)',
    '(!\\[[^\\]\\n]*\\]\\([^)\\n]*\\))',
    '(\\[[^\\]\\n]+\\]\\([^)\\n]*\\))',
    '(\\[\\^[^\\]\\n]+\\])',
    '(\\*\\*[^*\\n]+\\*\\*|__[^_\\n]+__)',
    '(~~[^~\\n]+~~)',
    '(\\*[^*\\n]+\\*|_[^_\\n]+_)',
    '(<?https?:\\/\\/[^\\s)]+>?)',
  ].join('|'),
  'g',
);

/** className + 定界符长度 + 标记类型（定界符按所属语法单独上样式，正文另上色） */
const INLINE_RULES: { className: string; delimiter: number; marker?: string }[] = [
  { className: '', delimiter: 0 },
  { className: 'mh-code-inline', delimiter: 1, marker: 'code' },
  { className: 'mh-image', delimiter: 0 },
  { className: 'mh-link', delimiter: 0 },
  { className: 'mh-footnote', delimiter: 0 },
  { className: 'mh-strong', delimiter: 2, marker: 'strong' },
  { className: 'mh-del', delimiter: 2, marker: 'del' },
  { className: 'mh-em', delimiter: 1, marker: 'em' },
  { className: 'mh-url', delimiter: 0 },
];

const wrap = (className: string, text: string) => `<span class="${className}">${escapeHtml(text)}</span>`;
/** 语法标记带上类型，CSS 才能给标题的 #、加粗的 ** 等各自的样式 */
const marker = (kind: string, text: string) => wrap(`mh-marker mh-marker-${kind}`, text);

function highlightInline(text: string): string {
  let out = '';
  let cursor = 0;
  INLINE.lastIndex = 0;

  let match: RegExpExecArray | null = INLINE.exec(text);
  while (match) {
    if (match.index > cursor) out += escapeHtml(text.slice(cursor, match.index));

    let group = 1;
    while (group < INLINE_RULES.length && match[group] === undefined) group += 1;
    const rule = INLINE_RULES[group] ?? INLINE_RULES[0];
    const raw = match[0];

    if (rule.delimiter > 0 && raw.length > rule.delimiter * 2) {
      const open = raw.slice(0, rule.delimiter);
      const close = raw.slice(-rule.delimiter);
      out += marker(rule.marker ?? 'plain', open);
      out += wrap(rule.className, raw.slice(rule.delimiter, -rule.delimiter));
      out += marker(rule.marker ?? 'plain', close);
    } else {
      out += wrap(rule.className, raw);
    }

    cursor = match.index + raw.length;
    match = INLINE.exec(text);
  }

  out += escapeHtml(text.slice(cursor));
  return out;
}

/** 表格行：只把竖线染灰，保持每个字符原位 */
function highlightTableRow(line: string): string {
  const cells = line.split('|');
  return cells
    .map((cell, index) => wrap('mh-table', cell) + (index < cells.length - 1 ? marker('table', '|') : ''))
    .join('');
}

const FENCE = /^(\s*)(`{3,}|~{3,})(.*)$/;
const HEADING = /^(#{1,6})(\s+)(.*)$/;
const QUOTE = /^(\s*(?:>\s*)+)(.*)$/;
const LIST = /^(\s*)([-*+]|\d{1,9}[.)])(\s+)(.*)$/;
const HR = /^\s{0,3}(?:(?:-\s*){3,}|(?:\*\s*){3,}|(?:_\s*){3,})$/;

export function highlightMarkdownSource(source: string): string {
  const lines = source.split('\n');
  const out: string[] = [];
  let fence: string | null = null;

  for (const line of lines) {
    const fenceMatch = FENCE.exec(line);

    if (fence) {
      if (fenceMatch && fenceMatch[2].startsWith(fence)) {
        out.push(`<span class="mh-fence">${escapeHtml(line)}</span>`);
        fence = null;
      } else {
        out.push(`<span class="mh-code-block">${escapeHtml(line)}</span>`);
      }
      continue;
    }

    if (fenceMatch) {
      fence = fenceMatch[2];
      out.push(`<span class="mh-fence">${escapeHtml(line)}</span>`);
      continue;
    }

    if (HR.test(line)) {
      out.push(`<span class="mh-hr">${escapeHtml(line)}</span>`);
      continue;
    }

    const heading = HEADING.exec(line);
    if (heading) {
      // 标题标记后的空格必须原样补回，少了它高亮层会比 textarea 短一个字符
      out.push(
        `${marker('heading', heading[1])}${escapeHtml(heading[2])}<span class="mh-heading">${highlightInline(
          heading[3],
        )}</span>`,
      );
      continue;
    }

    const quote = QUOTE.exec(line);
    if (quote) {
      out.push(
        `${marker('quote', quote[1])}<span class="mh-quote">${highlightInline(quote[2])}</span>`,
      );
      continue;
    }

    if (/^\s*\|/.test(line)) {
      out.push(highlightTableRow(line));
      continue;
    }

    if (/^\s*</.test(line)) {
      out.push(`<span class="mh-html">${escapeHtml(line)}</span>`);
      continue;
    }

    const list = LIST.exec(line);
    if (list) {
      out.push(
        `${marker('list', list[1] + list[2])}${escapeHtml(
          list[3],
        )}<span class="mh-list-text">${highlightInline(list[4])}</span>`,
      );
      continue;
    }

    out.push(highlightInline(line));
  }

  // 末尾补一个换行：<pre> 会吃掉最后一个换行，少了它最后一行的光标会跑偏
  return `${out.join('\n')}\n`;
}
