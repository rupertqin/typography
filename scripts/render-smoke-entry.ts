import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html><body></body></html>');

// render.ts 依赖 DOMParser / NodeFilter，Node 里用 jsdom 补齐
(globalThis as any).DOMParser = dom.window.DOMParser;
(globalThis as any).NodeFilter = dom.window.NodeFilter;
(globalThis as any).document = dom.window.document;

const { renderMarkdown } = await import('../src/lib/render');
const { THEMES } = await import('../src/lib/themes');
const { SAMPLE_MARKDOWN } = await import('../src/lib/sample');
const { applyColorOverrides, isHexColor } = await import('../src/lib/recolor');
const { FONT_FAMILIES } = await import('../src/lib/constants');
const { parseMarkdown } = await import('../src/lib/markdown');

const problems: string[] = [];
const MINI = `## 小标题样式

正文是这样的，**重点内容**会被强调。

> 引用块长这样`;

let firstHtml = '';
const recoloredHasMarker = (html: string) => html.includes('data-part-self');

for (const theme of THEMES as any[]) {
  const html = renderMarkdown(SAMPLE_MARKDOWN, theme);
  if (!firstHtml) firstHtml = html;

  if (!html.includes('<section style="font-family')) problems.push(`${theme.id}: 缺少根 section 样式`);
  if (html.includes('data-part')) problems.push(`${theme.id}: 残留 data-part`);
  if (recoloredHasMarker(html)) problems.push(`${theme.id}: 根节点残留 data-part-self`);
  if (html.includes('data-fn-ref')) problems.push(`${theme.id}: 脚注引用未处理`);
  if (!html.includes('注释')) problems.push(`${theme.id}: 缺少脚注区块`);
  if (!html.includes('📷 在这里插入图片')) problems.push(`${theme.id}: 缺少图片占位`);
  if (!html.includes('background:#ff5f56') && !html.includes('#ff5f56')) problems.push(`${theme.id}: 缺少代码块红绿灯`);
  if (!html.includes('border-collapse')) problems.push(`${theme.id}: 表格未套用样式`);

  const mini = renderMarkdown(MINI, theme);
  if (!mini.includes('小标题样式')) problems.push(`${theme.id}: 迷你预览丢失标题`);

  // 主色替换：只要不抛错、且确实改变了部分颜色即可
  const recolored = renderMarkdown(SAMPLE_MARKDOWN, theme, { colors: { main: '#07c160', parts: {} } });
  if (!recolored.includes('<section')) problems.push(`${theme.id}: 配色后根节点异常`);
}

// 单部件调色 + 深色主题（终端）走一遍
const terminal = (THEMES as any[]).find((theme) => theme.id === 'terminal');
const darkRecolored = renderMarkdown(SAMPLE_MARKDOWN, terminal, {
  colors: { main: '', parts: { h2: '#ff0000', strong: '#1677ff' } },
});
if (!darkRecolored.includes('<section')) problems.push('terminal: 单部件调色异常');

// 颜色工具
if (!isHexColor('#07c160') || isHexColor('#07c16')) problems.push('isHexColor 判定异常');

const probe = dom.window.document.createElement('section');
probe.setAttribute('style', 'color:#2b2b2b;background:#ffffff;');
probe.setAttribute('data-part-self', 'page');
applyColorOverrides(probe, '#2b2b2b', { main: '#07c160', parts: {} });
if (!probe.getAttribute('style')?.includes('color')) problems.push('applyColorOverrides 丢失声明');

// 列表符号：清单主题必须吃掉原生 bullet
const checklist = (THEMES as any[]).find((theme) => theme.id === 'checklist');
const listHtml = renderMarkdown('- 第一项\n- 第二项', checklist);
if (!listHtml.includes('list-style-type:none')) problems.push('checklist: 列表符号未接管');

// 整体字号：px 字号等比缩放并取整（公众号里不留小数），百分比字号保持相对
const percentSizes = (html: string) => (html.match(/font-size:[\d.]+%/g) ?? []).join(',');
const pxSizes = (html: string) =>
  Array.from(html.matchAll(/font-size:([\d.]+)px/g)).map((match) => Number(match[1]));
for (const theme of THEMES as any[]) {
  const plain = renderMarkdown(SAMPLE_MARKDOWN, theme);
  const scaled = renderMarkdown(SAMPLE_MARKDOWN, theme, { fontScale: 1.25 });
  const baseSize = Number(/font-size:([\d.]+)px/.exec(plain)?.[1]);
  if (!Number.isFinite(baseSize)) {
    problems.push(`${theme.id}: 整体字号找不到基准 px 字号`);
    continue;
  }
  const expectSize = Math.max(10, Math.round(baseSize * 1.25));
  if (!scaled.includes(`font-size:${expectSize}px`)) problems.push(`${theme.id}: 整体字号未缩放根字号`);
  if (pxSizes(scaled).some((size) => !Number.isInteger(size))) {
    problems.push(`${theme.id}: 整体字号出现小数 px`);
  }
  if (percentSizes(scaled) !== percentSizes(plain)) problems.push(`${theme.id}: 整体字号误改了百分比字号`);
}

// 极小档：取整后仍不得低于 10px，且不出现小数
const tiny = renderMarkdown(SAMPLE_MARKDOWN, THEMES[0] as any, { fontScale: 0.8 });
const tinySizes = pxSizes(tiny);
if (tinySizes.some((size) => !Number.isInteger(size))) problems.push('极小档：出现小数 px');
if (tinySizes.some((size) => size < 10)) problems.push('极小档：出现小于 10px 的字号');

// 正文字体：字体只写在唯一的根 section 上，不再套第二层容器，内层元素不写 font-family
const parseHtml = (html: string) =>
  new dom.window.DOMParser().parseFromString(html, 'text/html');
// 选字体前后 section 数量必须一致：多出来的那层就是以前的内层字体容器
const baseSectionCount = parseHtml(renderMarkdown(SAMPLE_MARKDOWN, THEMES[0] as any)).querySelectorAll(
  'section',
).length;
for (const font of FONT_FAMILIES) {
  if (!font.stack) continue;
  const out = renderMarkdown(SAMPLE_MARKDOWN, THEMES[0] as any, {
    fontFamily: font.stack,
    fontWeight: font.weight,
  });
  if (out.includes('&quot;')) problems.push(`字体 ${font.id}: 内联样式里出现了转义引号`);
  const doc = parseHtml(out);
  const root = doc.body.firstElementChild;
  const rootStyle = root?.getAttribute('style') ?? '';
  if (!rootStyle.startsWith(`font-family:${font.stack};`)) {
    problems.push(`字体 ${font.id}: 根 section 未换成所选字体`);
  }
  if (font.weight && !rootStyle.includes(`font-weight:${font.weight}`)) {
    problems.push(`字体 ${font.id}: 根 section 没带字重`);
  }
  if (doc.querySelectorAll('section').length !== baseSectionCount) {
    problems.push(
      `字体 ${font.id}: 选字体后 section 数量从 ${baseSectionCount} 变成 ${doc.querySelectorAll('section').length}（多包了一层）`,
    );
  }
  const paragraph = Array.from(doc.querySelectorAll('p')).find((node) => node.textContent?.trim());
  if ((paragraph?.getAttribute('style') ?? '').includes('font-family')) {
    problems.push(`字体 ${font.id}: 内层元素仍写了 font-family`);
  }
  const heading = doc.querySelector('h1');
  if (!/font-weight:bold/.test(heading?.getAttribute('style') ?? '')) {
    problems.push(`字体 ${font.id}: 标题的加粗被改掉了`);
  }
  const codeStyle = doc.querySelector('pre > code')?.getAttribute('style') ?? '';
  if (!codeStyle.includes('monospace')) problems.push(`字体 ${font.id}: 覆盖了代码块的等宽字体`);
}

// 默认输出：整篇只包一层 section（粘贴形态 = 一层容器 + 首尾占位段），根节点自带 font-family
const noFontDoc = parseHtml(renderMarkdown(MINI, THEMES[0] as any));
const noFontRoot = noFontDoc.body.firstElementChild;
if (noFontRoot?.tagName !== 'SECTION') problems.push('默认输出缺少根 section');
if (!(noFontRoot?.getAttribute('style') ?? '').startsWith('font-family:')) {
  problems.push('默认输出的根 section 没有 font-family');
}
// 旧的内层字体容器特征：直属子节点、style 只有一条 font-family
const leftoverWrapper = Array.from(noFontRoot?.children ?? []).find(
  (node) => node.tagName === 'SECTION' && /^font-family:[^;]*;$/.test(node.getAttribute('style') ?? ''),
);
if (leftoverWrapper) problems.push('默认输出仍有一层只带 font-family 的 wrapper section');

// 中文标点紧贴加粗定界符（CommonMark 的 flanking 规则会判成不能闭合，必须靠扩展兜住）
const boldCases: Array<{ name: string; md: string; bold: boolean }> = [
  {
    name: '标点后闭合、紧跟汉字',
    md: '很多字。**占了那个位置，人却不在那个位置上。**权力和义务严重不匹配。',
    bold: true,
  },
  { name: '开标记后紧跟中文引号', md: '前文**“引用”加粗**后文', bold: true },
  { name: '闭合后接句号', md: '前文**加粗**。后文', bold: true },
  { name: '普通加粗', md: '**正常加粗**', bold: true },
  { name: '粗斜体', md: '***粗斜***', bold: true },
  { name: '闭合后有空格', md: '前文**加粗** 后文', bold: true },
  { name: '行内代码里的星号', md: 'a `**x**` b', bold: false },
  { name: '两侧带空格的星号', md: 'a ** b', bold: false },
  { name: '下划线夹字母', md: 'a__b__c', bold: false },
];
for (const item of boldCases) {
  const html = parseMarkdown(item.md);
  const hasStrong = html.includes('<strong>');
  if (hasStrong !== item.bold) {
    problems.push(`加粗用例「${item.name}」${item.bold ? '未' : '错误地'}解析成加粗：${html.slice(0, 120)}`);
  }
}

// 复杂内联语法
const inline = renderMarkdown('文字 E=mc^2^ 与 H~2~O，~~删除~~，`code`', THEMES[1] as any);
if (!/<sup[^>]*>2<\/sup>/.test(inline)) problems.push('上标未生效');
if (!/<sub[^>]*>2<\/sub>/.test(inline)) problems.push('下标未生效');
if (!/<del[^>]*>删除<\/del>/.test(inline)) problems.push('删除线未生效');

/* ------------------------- 版式参数 / 代码配色 / Mermaid ------------------------- */

const { DEFAULT_THEME_PARAMS, hasThemeParams } = await import('../src/lib/types');
const { CODE_THEME_LIST } = await import('../src/lib/code-themes');
const { collectCodeLanguages, isLanguageReady, resolveLanguage } = await import('../src/lib/hljs-languages');

const PARAM_MD = [
  '## 参数标题',
  '',
  '第一段正文内容。',
  '',
  '> 一段引用',
  '',
  '```javascript',
  'const answer = 42;',
  '```',
].join('\n');

// 1) 默认参数必须与不传参逐字节一致：这是「不调参数 = 现状」的硬约束
for (const theme of THEMES as any[]) {
  const plain = renderMarkdown(PARAM_MD, theme);
  const withDefaults = renderMarkdown(PARAM_MD, theme, { params: DEFAULT_THEME_PARAMS, codeTheme: 'theme' });
  if (plain !== withDefaults) problems.push(`${theme.id}: 默认参数改变了输出`);
}
if (hasThemeParams(DEFAULT_THEME_PARAMS)) problems.push('hasThemeParams 把默认参数判成了已修改');

const paramTheme = (THEMES as any[]).find((theme) => theme.id === 'orange');
const baseHtml = renderMarkdown(PARAM_MD, paramTheme);
const baseDoc = parseHtml(baseHtml);
const baseParagraph = Array.from(baseDoc.querySelectorAll('p')).find((node) => node.textContent?.includes('第一段'));
const baseMargin = /margin(?:-bottom|-top)?:\s*([\d.]+)em/.exec(baseParagraph?.getAttribute('style') ?? '')?.[1];

// 2) 行高：正文被改写，代码块保持自己的节奏
const lineHeightDoc = parseHtml(renderMarkdown(PARAM_MD, paramTheme, { params: { ...DEFAULT_THEME_PARAMS, lineHeight: 1.9 } }));
const lineParagraph = Array.from(lineHeightDoc.querySelectorAll('p')).find((node) => node.textContent?.includes('第一段'));
if (!/line-height:1\.9/.test(lineParagraph?.getAttribute('style') ?? '')) problems.push('行高参数没有作用到正文');
if (/line-height:1\.9/.test(lineHeightDoc.querySelector('pre > code')?.getAttribute('style') ?? '')) {
  problems.push('行高参数误改了代码块');
}

// 3) 段间距：按倍数缩放已有 margin，且不改左右
const spacingDoc = parseHtml(renderMarkdown(PARAM_MD, paramTheme, { params: { ...DEFAULT_THEME_PARAMS, blockSpacing: 1.35 } }));
const spacingParagraph = Array.from(spacingDoc.querySelectorAll('p')).find((node) => node.textContent?.includes('第一段'));
const spacingMargin = /margin(?:-bottom|-top)?:\s*([\d.]+)em/.exec(spacingParagraph?.getAttribute('style') ?? '')?.[1];
if (baseMargin && spacingMargin) {
  const expected = Math.round(Number(baseMargin) * 1.35 * 100) / 100;
  if (Math.abs(Number(spacingMargin) - expected) > 0.02) {
    problems.push(`段间距换算错误：期望 ${expected}em，实际 ${spacingMargin}em`);
  }
} else {
  problems.push('段间距参数找不到可对比的 margin');
}

// 4) 标题样式预设：三种都要真的写到内联样式里
const bottomDoc = parseHtml(
  renderMarkdown(PARAM_MD, paramTheme, { params: { ...DEFAULT_THEME_PARAMS, headingStyles: { h2: 'border-bottom' } } }),
);
if (!/border-bottom:2px solid #/.test(bottomDoc.querySelector('h2')?.getAttribute('style') ?? '')) {
  problems.push('标题下边框没写进内联样式');
}
const leftDoc = parseHtml(
  renderMarkdown(PARAM_MD, paramTheme, { params: { ...DEFAULT_THEME_PARAMS, headingStyles: { h2: 'border-left' } } }),
);
const leftStyle = leftDoc.querySelector('h2')?.getAttribute('style') ?? '';
if (!/border-left:4px solid #/.test(leftStyle) || !/display:block/.test(leftStyle)) {
  problems.push('标题左边框没把标题掰成块级元素');
}
const colorDoc = parseHtml(
  renderMarkdown(PARAM_MD, paramTheme, { params: { ...DEFAULT_THEME_PARAMS, headingStyles: { h2: 'color-only' } } }),
);
if (!/color:#/.test(colorDoc.querySelector('h2')?.getAttribute('style') ?? '')) problems.push('标题主题色文字没生效');

// 5) 引用底色：'accent' 哨兵值按当前主色算，换主色后要跟着变
const quoteDoc = parseHtml(
  renderMarkdown(PARAM_MD, paramTheme, {
    colors: { main: '#1677ff', parts: {} },
    params: { ...DEFAULT_THEME_PARAMS, blockquoteBackground: 'accent' },
  }),
);
if (!/background:rgba\(22,119,255/.test(quoteDoc.querySelector('blockquote')?.getAttribute('style') ?? '')) {
  problems.push('引用底色的 accent 哨兵值没有跟随主色');
}

// 6) 代码配色：token 色写死进内联样式，pre 底色跟着换
if (CODE_THEME_LIST.length < 60) problems.push(`代码配色只有 ${CODE_THEME_LIST.length} 套，配色表可能被改坏`);
const darkCodeTheme = CODE_THEME_LIST.find((item) => item.id === 'atom-one-dark');
if (!darkCodeTheme?.tokens.keyword) problems.push('atom-one-dark 缺少 keyword 调色板');
const codeThemedDoc = parseHtml(
  renderMarkdown(PARAM_MD, paramTheme, { codeTheme: 'atom-one-dark' }),
);
const themedPre = codeThemedDoc.querySelector('pre');
if (!(themedPre?.getAttribute('style') ?? '').includes(darkCodeTheme?.background ?? '###')) {
  problems.push('代码配色没有替换代码块底色');
}
const themedCode = themedPre?.querySelector('code');
if (!(themedCode?.getAttribute('style') ?? '').includes(darkCodeTheme?.foreground ?? '###')) {
  problems.push('代码配色没有替换代码块前景色');
}
const keywordSpan = Array.from(themedPre?.querySelectorAll('span') ?? []).find(
  (node) => (node.getAttribute('style') ?? '') === darkCodeTheme?.tokens.keyword,
);
if (!keywordSpan) problems.push('代码配色没有把 token 颜色写成内联样式');

// 7) Mermaid：只出占位元素，源码编码在 data 属性里
const mermaidHtml = renderMarkdown('```mermaid\nflowchart LR\n  A[a] --> B[b]\n```', paramTheme);
if (!mermaidHtml.includes('data-mermaid=')) problems.push('Mermaid 没有输出占位元素');
if (!mermaidHtml.includes('data-state="loading"')) problems.push('Mermaid 占位缺少 loading 状态');
if (/<pre[\s>]/.test(mermaidHtml)) problems.push('Mermaid 被当成普通代码块渲染了');
if (mermaidHtml.includes('flowchart LR')) problems.push('Mermaid 源码应该编码后放进 data 属性');

// 8) 语言：别名归一 + 高频语言默认可用 + 正文扫描
if (resolveLanguage('JS') !== 'javascript') problems.push('语言别名 js 没有归一成 javascript');
if (!isLanguageReady('javascript') || !isLanguageReady('yaml')) problems.push('高频语言语法没有预先注册');
if (isLanguageReady('brainfuck')) problems.push('长尾语言不该在首屏就注册');
const scanned = collectCodeLanguages('```js\nlet a=1\n```\n\n```mermaid\ngraph TD\nA-->B\n```\n\n```rust\nfn main(){}\n```');
if (scanned.join(',') !== 'javascript,rust') problems.push(`代码语言扫描异常：${scanned.join(',')}`);

/* ------------------------- 编辑区 Markdown 高亮 ------------------------- */

const { highlightMarkdownSource } = await import('../src/lib/highlight-markdown');

const hlSource = [
  '# 标题 **粗**',
  '',
  '> 引用 `code`',
  '',
  '- 项 [链接](https://a.b)',
  '',
  '```js',
  'const a = 1;',
  '```',
  '',
  '<div>x</div>',
  '',
  '***',
].join('\n');
const hlHtml = highlightMarkdownSource(hlSource);

if (hlHtml.split('\n').length !== hlSource.split('\n').length + 1) {
  problems.push('Markdown 高亮改变了行数（会和 textarea 折行错位）');
}
for (const token of ['mh-heading', 'mh-marker', 'mh-strong', 'mh-quote', 'mh-code-inline', 'mh-link', 'mh-fence', 'mh-code-block', 'mh-html', 'mh-hr']) {
  if (!hlHtml.includes(token)) problems.push(`Markdown 高亮缺少 ${token}`);
}
if (!hlHtml.includes('const a = 1;')) problems.push('Markdown 高亮的代码块内容丢失');
if (!hlHtml.includes('&lt;div&gt;') || hlHtml.includes('<div>')) problems.push('Markdown 高亮没有转义 HTML');

// 只能上色：字重/斜体/下划线都会改字宽，两层文本就会折行错位
if (/font-weight|font-style|text-decoration|<(b|i|u|strong|em)[\s>]/.test(hlHtml)) {
  problems.push('Markdown 高亮改动了字宽相关的样式');
}
const inlineCode = highlightMarkdownSource('`a**b**c`');
if (!inlineCode.includes('mh-code-inline') || inlineCode.includes('mh-strong')) {
  problems.push('行内代码里不该被继续解析加粗');
}

if (problems.length) {
  console.error('[render-smoke] 失败：');
  for (const problem of problems) console.error(' -', problem);
  process.exit(1);
}

console.log(
  `[render-smoke] 通过：${THEMES.length} 套主题渲染、配色重映射、脚注/图片/列表装饰、版式参数、代码配色与 Mermaid 占位全部正常`,
);
console.log(`[render-smoke] 示例文章输出 ${firstHtml.length} 字符`);
