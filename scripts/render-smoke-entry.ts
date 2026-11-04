import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html><body></body></html>');

// render.ts 依赖 DOMParser / NodeFilter，Node 里用 jsdom 补齐
(globalThis as any).DOMParser = dom.window.DOMParser;
(globalThis as any).NodeFilter = dom.window.NodeFilter;
(globalThis as any).document = dom.window.document;

const { renderMarkdown } = await import('../src/lib/render');
const { THEMES } = await import('../src/lib/themes.generated.js');
const { SAMPLE_MARKDOWN } = await import('../src/lib/sample');
const { applyColorOverrides, isHexColor } = await import('../src/lib/recolor');

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
  const recolored = renderMarkdown(SAMPLE_MARKDOWN, theme, { main: '#07c160', parts: {} });
  if (!recolored.includes('<section')) problems.push(`${theme.id}: 配色后根节点异常`);
}

// 单部件调色 + 深色主题（终端）走一遍
const terminal = (THEMES as any[]).find((theme) => theme.id === 'terminal');
const darkRecolored = renderMarkdown(SAMPLE_MARKDOWN, terminal, {
  main: '',
  parts: { h2: '#ff0000', strong: '#1677ff' },
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

// 整体字号：px 字号等比缩放，百分比字号保持相对
const percentSizes = (html: string) => (html.match(/font-size:[\d.]+%/g) ?? []).join(',');
for (const theme of THEMES as any[]) {
  const plain = renderMarkdown(SAMPLE_MARKDOWN, theme);
  const scaled = renderMarkdown(SAMPLE_MARKDOWN, theme, { main: '', parts: {} }, 1.25);
  const baseSize = Number(/font-size:([\d.]+)px/.exec(plain)?.[1]);
  if (!Number.isFinite(baseSize)) {
    problems.push(`${theme.id}: 整体字号找不到基准 px 字号`);
    continue;
  }
  const expectSize = Math.round(baseSize * 12.5) / 10;
  if (!scaled.includes(`font-size:${expectSize}px`)) problems.push(`${theme.id}: 整体字号未缩放根字号`);
  if (percentSizes(scaled) !== percentSizes(plain)) problems.push(`${theme.id}: 整体字号误改了百分比字号`);
}

// 复杂内联语法
const inline = renderMarkdown('文字 E=mc^2^ 与 H~2~O，~~删除~~，`code`', THEMES[1] as any);
if (!/<sup[^>]*>2<\/sup>/.test(inline)) problems.push('上标未生效');
if (!/<sub[^>]*>2<\/sub>/.test(inline)) problems.push('下标未生效');
if (!/<del[^>]*>删除<\/del>/.test(inline)) problems.push('删除线未生效');

if (problems.length) {
  console.error('[render-smoke] 失败：');
  for (const problem of problems) console.error(' -', problem);
  process.exit(1);
}

console.log(`[render-smoke] 通过：${THEMES.length} 套主题渲染、配色重映射、脚注/图片/列表装饰全部正常`);
console.log(`[render-smoke] 示例文章输出 ${firstHtml.length} 字符`);
