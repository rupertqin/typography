import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html><body></body></html>');

// render.ts 依赖 DOMParser / NodeFilter，Node 里用 jsdom 补齐
(globalThis as any).DOMParser = dom.window.DOMParser;
(globalThis as any).NodeFilter = dom.window.NodeFilter;
(globalThis as any).document = dom.window.document;

const { renderMarkdown } = await import('../src/lib/render');
const { THEMES } = await import('../src/lib/themes');
const { SAMPLE_MARKDOWN } = await import('../src/lib/sample');
const { isLegacySample } = await import('../src/lib/sample');

// 示例文章逐字取自 doocs-md（含尚未支持的语法），脚注这类断言不能依赖它，
// 单独拼一份覆盖「脚注 + 图片 + 代码块」的测试稿
const SMOKE_MARKDOWN = `${SAMPLE_MARKDOWN}

需要注明出处时用脚注[^1]，会统一列在文末。

[^1]: 测试用的脚注内容。`;
const { applyColorOverrides, isHexColor, readableInk, isLightColor } = await import('../src/lib/recolor');
const { FONT_FAMILIES } = await import('../src/lib/constants');
const { parseMarkdown } = await import('../src/lib/markdown');

const problems: string[] = [];

// 内置示例换版：只升级「没动过的旧示例草稿」，用户自己写的内容不能被覆盖
if (!isLegacySample('# 公众号排版风格示例\n\n旧内容')) problems.push('旧版示例草稿没有被识别出来');
if (isLegacySample(SAMPLE_MARKDOWN)) problems.push('新版示例被误判成旧版示例');
if (isLegacySample('# 我自己写的标题')) problems.push('用户自写内容被误判成旧版示例');
const MINI = `## 小标题样式

正文是这样的，**重点内容**会被强调。

> 引用块长这样`;

let firstHtml = '';
const recoloredHasMarker = (html: string) => html.includes('data-part-self');

for (const theme of THEMES as any[]) {
  const html = renderMarkdown(SMOKE_MARKDOWN, theme);
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

// 浅色主色必须按用户选的色值直出：樱花粉曾被 HSL 重映射压成大红 #ff5072
const orange = (THEMES as any[]).find((theme) => theme.id === 'orange');
const pinkHtml = renderMarkdown(SMOKE_MARKDOWN, orange, { colors: { main: '#ffb7c5', parts: {} } });
if (!pinkHtml.includes('color:#ffb7c5')) problems.push('樱花粉主色没有按原色值渲染');
if (pinkHtml.includes('#ff5072')) problems.push('樱花粉主色被重映射成大红 #ff5072');

// 单部件调色 + 深色主题（终端）走一遍
const terminal = (THEMES as any[]).find((theme) => theme.id === 'terminal');
const darkRecolored = renderMarkdown(SAMPLE_MARKDOWN, terminal, {
  colors: { main: '', parts: { h2: '#ff0000', strong: '#1677ff' } },
});
if (!darkRecolored.includes('<section')) problems.push('terminal: 单部件调色异常');

// 颜色工具
if (!isHexColor('#07c160') || isHexColor('#07c16')) problems.push('isHexColor 判定异常');
if (readableInk('#0f4c81') !== '#ffffff' || readableInk('#ffb7c5') !== '#18181b') {
  problems.push('彩色按钮/色板的前景文字没有按底色深浅取色');
}
// 前景色判定统一走 WCAG 相对亮度：#00ff00 这种高亮绿旧亮度阈值会误判成深色（给白字）
if (readableInk('#00ff00') !== '#18181b' || readableInk('#0000ff') !== '#ffffff') {
  problems.push('前景色没有按 WCAG 对比度选深浅');
}
if (readableInk('#000000') !== '#ffffff' || readableInk('#ffffff') !== '#18181b') {
  problems.push('纯黑/纯白的前景色判定异常');
}
// 判定整体偏向白字：饱和中色（活力橘 / 翡翠绿 / 玫瑰金）用白字，
// 浅底（雾烟灰 / 柠檬黄 / 天空蓝）仍是深色字
if (
  readableInk('#fa5151') !== '#ffffff' ||
  readableInk('#009874') !== '#ffffff' ||
  readableInk('#b76e79') !== '#ffffff'
) {
  problems.push('饱和中色没有按偏好给白字');
}
if (
  readableInk('#a9a9a9') !== '#18181b' ||
  readableInk('#fece00') !== '#18181b' ||
  readableInk('#55c9ea') !== '#18181b'
) {
  problems.push('浅色底被误判成白字');
}
// 半透明底色按白纸叠色再判断：6%~8% 的浅底都算浅底
if (readableInk('rgba(217,70,111,0.06)') !== '#18181b' || !isLightColor('rgba(15,76,129,0.08)')) {
  problems.push('半透明浅底的前景色判定异常');
}
if (isLightColor('#0f4c81') || !isLightColor('#fff4f1')) {
  problems.push('isLightColor 与前景色判定不一致');
}

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

// 最小档（0.7）：取整后仍不得低于 8px，且不出现小数
const tiny = renderMarkdown(SAMPLE_MARKDOWN, THEMES[0] as any, { fontScale: 0.7 });
const tinySizes = pxSizes(tiny);
if (tinySizes.some((size) => !Number.isInteger(size))) problems.push('极小档：出现小数 px');
if (tinySizes.some((size) => size < 8)) problems.push(`最小档：出现小于 8px 的字号：${tinySizes.join(',')}`);

// 正文字体：字体只写在唯一的根 section 上，不再套第二层容器，内层元素不写 font-family
const parseHtml = (html: string) =>
  new dom.window.DOMParser().parseFromString(html, 'text/html');

// 首元素不留上边距（对齐 doocs-md 的 `#output section > :first-child`）：
// 每套主题的首元素类型/简写都不一样，逐套验证内联声明确实落上了
for (const theme of THEMES as any[]) {
  const first = parseHtml(renderMarkdown(SMOKE_MARKDOWN, theme)).body.firstElementChild?.firstElementChild;
  if (!/margin-top:0/.test(first?.getAttribute('style') ?? '')) {
    problems.push(`${theme.id}: 首元素 ${first?.tagName} 仍留着上边距`);
  }
}
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
// 内联/块级 HTML：公众号支持的标签原样保留，危险写法必须转义
const rawCases: Array<{ name: string; md: string; keep?: string; escape?: boolean }> = [
  {
    name: 'center + img',
    md: '<center>\n    <img src="https://example.com/a.png" alt="qr code" style="width: 100px;">\n</center>',
    keep: '<center>',
  },
  { name: '行内下划线', md: '前文 <u>下划线</u> 后文', keep: '<u>下划线</u>' },
  { name: 'script', md: '<script>alert(1)</script>', escape: true },
  { name: '事件属性', md: '<img src="x.png" onerror="alert(1)">', escape: true },
];
for (const item of rawCases) {
  const out = renderMarkdown(item.md, THEMES[0] as any);
  if (item.keep && !out.includes(item.keep)) problems.push(`HTML 用例「${item.name}」没有原样保留：${out.slice(0, 160)}`);
  if (item.escape && !out.includes('&lt;')) problems.push(`HTML 用例「${item.name}」没有被转义`);
  // 转义后的文本里出现 onerror= 是安全的，只有真的成了标签才算漏
  if (item.escape && /<(?:script|img)[^>]*\son[a-z]+=/i.test(out)) {
    problems.push(`HTML 用例「${item.name}」把危险标记放进了产物`);
  }
}

// LaTeX：四种写法都要吐占位（真正编译成 SVG 在浏览器里由 useMathHydration 完成）
const mathCases: Array<{ name: string; md: string; display: boolean }> = [
  { name: '行内 $…$', md: '质能方程 $E=mc^2$ 很简洁。', display: false },
  { name: '块级 $$…$$', md: '$$\n\\int_0^1 x^2\\,dx\n$$', display: true },
  { name: '行内 \\(…\\)', md: '勾股 \\(a^2+b^2=c^2\\) 成立。', display: false },
  { name: '块级 \\[…\\]', md: '\\[\n\\frac{a}{b}\n\\]', display: true },
];
for (const item of mathCases) {
  const out = parseMarkdown(item.md);
  const isBlock = out.includes('md-math-block');
  if (!out.includes('data-math=')) problems.push(`公式用例「${item.name}」没有生成占位：${out.slice(0, 120)}`);
  if (isBlock !== item.display) problems.push(`公式用例「${item.name}」块级判定不对：${out.slice(0, 120)}`);
  if (!out.includes('data-state="loading"')) problems.push(`公式用例「${item.name}」缺少渲染状态标记`);
}
// 公式源码要作为兜底文本留在占位里（MathJax 还没加载完时不能是一片空白）
if (!parseMarkdown('质能方程 $E=mc^2$ 很简洁。').includes('$E=mc^2$')) {
  problems.push('公式占位里没有保留源码兜底');
}
// 金额 / 行内代码里的 $ 不该被当成公式
if (parseMarkdown('价格 $5 和 $10 元。').includes('data-math=')) problems.push('金额被误判成了公式');
if (parseMarkdown('代码 `$x$` 里的美元符号不是公式').includes('data-math=')) {
  problems.push('行内代码里的 $ 被误判成了公式');
}

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

// 下划线 / 高亮：`++文字++` → 主色下划线，`==文字==` → 主色底 + 反白字（对齐 doocs-md）
const markupHtml = renderMarkdown('前文 ++下划线++ 与 ==高亮== 后文', THEMES[0] as any);
if (!markupHtml.includes('下划线') || !markupHtml.includes('高亮')) problems.push('下划线/高亮的正文丢了');
if (!/text-decoration:underline;text-decoration-color:#[0-9a-f]{3,6};/i.test(markupHtml)) {
  problems.push(`++下划线++ 没有生成带主色的下划线：${markupHtml.slice(0, 200)}`);
}
if (!/background-color:#[0-9a-f]{3,6};padding:2px 4px;border-radius:2px;color:#[0-9a-f]{3,6};/i.test(markupHtml)) {
  problems.push(`==高亮== 没有生成主色底：${markupHtml.slice(0, 200)}`);
}
const markupRecolored = renderMarkdown('++下划线++', THEMES[0] as any, { colors: { main: '#1677ff', parts: {} } });
if (!markupRecolored.includes('text-decoration-color:#1677ff')) problems.push('下划线颜色没有跟随主色');

// 波浪线 `~文字~`（对齐 doocs-md），与下标、删除线共用 `~`，靠左边界区分
const wavyHtml = renderMarkdown('前文 ~波浪线~ 后文', THEMES[0] as any);
if (!wavyHtml.includes('波浪线')) problems.push('~波浪线~ 的正文丢了');
if (!/text-decoration:underline wavy;text-decoration-color:#[0-9a-f]{3,6};/.test(wavyHtml)) {
  problems.push(`~波浪线~ 没有生成波浪下划线：${wavyHtml.slice(0, 200)}`);
}
if (!wavyHtml.includes('text-decoration-thickness:2px')) problems.push('~波浪线~ 没有加粗波浪线');
if (!/<sub[^>]*>2<\/sub>/.test(renderMarkdown('H~2~O', THEMES[0] as any))) {
  problems.push('H~2~O 的下标被波浪线抢走了');
}
if (!/<del[^>]*>删除<\/del>/.test(renderMarkdown('~~删除~~', THEMES[0] as any))) {
  problems.push('~~删除~~ 被波浪线抢走了');
}

// 边界：紧跟在 ASCII 字母数字后面、或内容首尾带空格的，都不算标记
for (const md of ['C++是最好的语言', 'C++17', 'x==1==y', 'a == b', '++ 文字 ++', '== 高亮 ==', 'v1~2~3', '~ 文字 ~']) {
  const out = renderMarkdown(md, THEMES[0] as any);
  if (
    out.includes('data-underline') ||
    out.includes('data-highlight') ||
    out.includes('data-wavyline') ||
    /text-decoration:underline|underline wavy|padding:2px 4px/.test(out)
  ) {
    problems.push(`「${md}」不该被解析成下划线/高亮/波浪线：${out.slice(0, 160)}`);
  }
}

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

// 2) 行距：正文被改写，代码块保持自己的节奏
const lineHeightDoc = parseHtml(renderMarkdown(PARAM_MD, paramTheme, { params: { ...DEFAULT_THEME_PARAMS, lineHeight: 1.9 } }));
const lineParagraph = Array.from(lineHeightDoc.querySelectorAll('p')).find((node) => node.textContent?.includes('第一段'));
if (!/line-height:1\.9/.test(lineParagraph?.getAttribute('style') ?? '')) problems.push('行距参数没有作用到正文');
if (/line-height:1\.9/.test(lineHeightDoc.querySelector('pre > code')?.getAttribute('style') ?? '')) {
  problems.push('行距参数误改了代码块');
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
const spacingFirst = spacingDoc.body.firstElementChild?.firstElementChild;
if (!/margin-top:0/.test(spacingFirst?.getAttribute('style') ?? '')) {
  problems.push('段间距把首元素上边距又加回来了');
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
if (!/color:#/.test(colorDoc.querySelector('h2')?.getAttribute('style') ?? '')) problems.push('标题自选颜色没生效');

// 4b) 标题样式覆盖 H1–H6；自选颜色必须清掉同色背景与装饰层色块
const HEADINGS_MD = `# 一级\n\n## 二级\n\n### 三级\n\n#### 四级\n\n##### 五级\n\n###### 六级`;
const allColorDoc = parseHtml(
  renderMarkdown(HEADINGS_MD, paramTheme, {
    params: {
      ...DEFAULT_THEME_PARAMS,
      headingStyles: {
        h1: 'color-only', h2: 'color-only', h3: 'color-only',
        h4: 'color-only', h5: 'color-only', h6: 'color-only',
      } as const,
    },
  }),
);
for (const level of ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']) {
  const style = allColorDoc.querySelector(level)?.getAttribute('style') ?? '';
  if (!/color:#/.test(style)) problems.push(`${level}: 自选颜色没生效`);
  if (!/background:transparent/.test(style)) problems.push(`${level}: 自选颜色没去掉背景`);
  for (const span of Array.from(allColorDoc.querySelectorAll(`${level} [style]`))) {
    const spanStyle = span.getAttribute('style') ?? '';
    if (/background:(?!transparent)/.test(spanStyle)) problems.push(`${level}: 装饰层仍留着背景色`);
  }
}
// md 三套的 h2 是 background:accent;color:#fff，换自选颜色后不能留同色底
const mdTheme = (THEMES as any[]).find((theme) => theme.id === 'md-classic');
const mdH2 = parseHtml(
  renderMarkdown('## 小标题', mdTheme, { params: { ...DEFAULT_THEME_PARAMS, headingStyles: { h2: 'color-only' } } }),
).querySelector('h2')?.getAttribute('style') ?? '';
if (mdH2.includes(`background:${mdTheme.accent}`)) problems.push('自选颜色仍留着与主色同色的背景');
if (!/color:#0f4c81/.test(mdH2)) problems.push('md 主题的自选颜色没生效');

// 4c) 每级标题文字色：设了用自定义色，没设的仍沿用主色
const customColorDoc = parseHtml(
  renderMarkdown(HEADINGS_MD, paramTheme, {
    params: {
      ...DEFAULT_THEME_PARAMS,
      headingStyles: { h2: 'color-only', h3: 'color-only' },
      headingColors: { h2: '#fa5151' },
    },
  }),
);
const customH2 = customColorDoc.querySelector('h2')?.getAttribute('style') ?? '';
const customH3 = customColorDoc.querySelector('h3')?.getAttribute('style') ?? '';
if (!customH2.includes('color:#fa5151')) problems.push('标题文字色自定义值没写进内联样式');
if (!customH3.includes('color:#ef7060')) problems.push('未设文字色的标题没有沿用主色');
if (!hasThemeParams({ ...DEFAULT_THEME_PARAMS, headingColors: { h2: '#fa5151' } })) {
  problems.push('hasThemeParams 没识别标题文字色');
}

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

// 5.5) 左右边距：写进最外层 wrapper 的 margin-left/right（同公众号「边距」语义），
// 'theme' 一个 margin 都不写；主题自带的卡片内距（padding）保持原样，两者叠加。
const marginDefault = parseHtml(renderMarkdown(PARAM_MD, paramTheme));
const marginDefaultStyle = marginDefault.body.firstElementChild?.getAttribute('style') ?? '';
if (/margin-(?:left|right):/.test(marginDefaultStyle)) problems.push('默认参数下不该出现左右外边距');
const marginDoc = parseHtml(
  renderMarkdown(PARAM_MD, paramTheme, { params: { ...DEFAULT_THEME_PARAMS, pageMarginX: 16 } }),
);
const marginStyle = marginDoc.body.firstElementChild?.getAttribute('style') ?? '';
if (!marginStyle.includes('margin-left:16px')) problems.push(`左右边距没写进最外层 wrapper：${marginStyle}`);
if (!marginStyle.includes('margin-right:16px')) problems.push('左右边距只写了左侧');
// 有底色的主题：卡片内距不能被改写，边距加在卡片外侧（否则只是把文字推离底色）
const inkTheme = (THEMES as any[]).find((theme) => theme.id === 'ink');
const inkMarginStyle =
  parseHtml(
    renderMarkdown(PARAM_MD, inkTheme, { params: { ...DEFAULT_THEME_PARAMS, pageMarginX: 24 } }),
  ).body.firstElementChild?.getAttribute('style') ?? '';
if (!inkMarginStyle.includes('margin-left:24px')) problems.push('有底色的主题没有加外边距');
if (!inkMarginStyle.includes('padding:20px 16px')) problems.push('有底色的主题卡片内距被改写了');

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
  '~~删~~ *斜* `行内`',
  '',
  '| a | b |',
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
// 语法标记要按类型分开，CSS 才能给标题的 #、加粗的 ** 等各自的样式
for (const kind of ['heading', 'strong', 'em', 'del', 'quote', 'list', 'table', 'code']) {
  if (!hlHtml.includes(`mh-marker-${kind}`)) problems.push(`Markdown 高亮缺少 ${kind} 类型标记`);
}
// 编辑区也要认出 ++下划线++ / ==高亮== / ~波浪线~，且 `C++`、`x==1`、`H~2~O` 保持原文
const markupHl = highlightMarkdownSource('前文 ++下划线++ 与 ==高亮== 和 ~波浪线~ 后文');
for (const token of [
  'mh-underline',
  'mh-marker-underline',
  'mh-highlight',
  'mh-marker-highlight',
  'mh-wavyline',
  'mh-marker-wavyline',
]) {
  if (!markupHl.includes(token)) problems.push(`Markdown 高亮缺少 ${token}`);
}
const markupLiteralHl = highlightMarkdownSource('C++17 与 x==1==y 与 H~2~O');
if (markupLiteralHl.includes('mh-underline') || markupLiteralHl.includes('mh-highlight')) {
  problems.push('编辑区把 C++ / x==1 误判成了下划线或高亮');
}
if (markupLiteralHl.includes('mh-wavyline')) problems.push('编辑区把 H~2~O 误判成了波浪线');
if (!highlightMarkdownSource('~~删除~~').includes('mh-del')) problems.push('编辑区把 ~~删除~~ 误判成了波浪线');
if (!hlHtml.includes('const a = 1;')) problems.push('Markdown 高亮的代码块内容丢失');
if (!hlHtml.includes('&lt;div&gt;') || hlHtml.includes('<div>')) problems.push('Markdown 高亮没有转义 HTML');

// HTML 里不能写内联字重/斜体/下划线：两层文本会折行错位；
// 相应观感统一放到 global.css，用文字描边、下划线这类不改布局的属性模拟。
if (/font-weight|font-style|text-decoration|<(b|i|u|strong|em)[\s>]/.test(hlHtml)) {
  problems.push('Markdown 高亮在 HTML 里改动了字宽相关的样式');
}
// 标题标记后的空格必须原样保留，否则高亮层比 textarea 短
if (!hlHtml.includes('mh-marker-heading">#</span> <span class="mh-heading"')) {
  problems.push('标题标记后丢了空格（两层文本长度不一致）');
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
