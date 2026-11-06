import { JSDOM } from 'jsdom';

/** 在 Node 里用 jsdom 挂载真实组件，验证首屏、主题菜单与配色面板不会运行时崩 */
const dom = new JSDOM('<!doctype html><html><body><div id="app"></div></body></html>', {
  url: 'https://localhost/',
  pretendToBeVisual: true,
});

const win = dom.window as any;
const g = globalThis as any;

for (const key of [
  'window',
  'document',
  'navigator',
  'location',
  'history',
  'localStorage',
  'HTMLElement',
  'Element',
  'Node',
  'NodeFilter',
  'DOMParser',
  'XMLSerializer',
  'Event',
  'MouseEvent',
  'KeyboardEvent',
  'PointerEvent',
  'CustomEvent',
  'getComputedStyle',
  'requestAnimationFrame',
  'cancelAnimationFrame',
  'matchMedia',
]) {
  if (win[key] === undefined) continue;
  try {
    Object.defineProperty(g, key, { value: win[key], configurable: true, writable: true });
  } catch (error) {
    // Node 自带的 navigator/localStorage 是只读 getter，忽略即可
  }
}
g.self = win;
g.IS_REACT_ACT_ENVIRONMENT = false;

// jsdom 没有这两个 API：给最小实现，够组件初始化即可
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
g.ResizeObserver = win.ResizeObserver = ResizeObserverStub;
win.matchMedia = () => ({
  matches: false,
  media: '(max-width: 767px)',
  addEventListener() {},
  removeEventListener() {},
  addListener() {},
  removeListener() {},
  dispatchEvent: () => false,
});
g.matchMedia = win.matchMedia;

const { createRoot } = await import('react-dom/client');
const { THEMES } = await import('../src/lib/themes');
const { useTypographyStore } = await import('../src/lib/store');
const { EditorHistory } = await import('../src/lib/history');
const { createElement } = await import('react');
const { resolveBackHref } = await import('../src/lib/backUrl');
const { default: TypographyApp } = await import('../src/components/TypographyApp');

const mount = win.document.getElementById('app') as HTMLElement;
const root = createRoot(mount);

const wait = (ms = 60) => new Promise((resolve) => setTimeout(resolve, ms));

const problems: string[] = [];
const expect = (ok: boolean, message: string) => {
  if (!ok) problems.push(message);
};

try {
  root.render(createElement(TypographyApp));
  await wait(120);

  const text = () => mount.textContent ?? '';
  const html = () => mount.innerHTML;

  expect(text().includes('公众号排版风格'), '缺少标题「公众号排版风格」');
  expect(text().includes('复制到公众号'), '缺少复制按钮');
  expect(text().includes('草稿自动保存在本机'), '缺少草稿统计行');
  expect(text().includes('橙心'), '默认主题不是橙心');
  expect(html().includes('公众号排版风格示例'), '预览未渲染示例文章');
  expect(html().includes('font-family:-apple-system'), '预览未注入主题样式');
  expect(text().includes('38 套可选') || html().includes('38 套可选'), '示例正文未渲染');

  const buttons = Array.from(mount.querySelectorAll('button')) as HTMLButtonElement[];
  const byLabel = (label: string) => buttons.find((btn) => (btn.getAttribute('title') ?? '') === label);

  // 打开主题下拉
  const themeToggle = buttons.find((btn) => btn.getAttribute('aria-expanded') === 'false');
  themeToggle?.dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
  await wait(120);
  expect(mount.querySelectorAll('[data-active]').length === 1, '主题菜单未标记当前主题');
  const miniCards = () => mount.querySelectorAll('div[style*="scale"]').length;
  expect(miniCards() === THEMES.length, `主题卡数量 ${miniCards()}，期望 ${THEMES.length}`);
  expect(text().includes('干货教程'), '主题菜单缺少文章类型筛选');
  expect(text().includes('按文章类型推荐'), '主题菜单缺少推荐说明');

  // 切到「技术编程」再选第一个主题
  const typeChip = (Array.from(mount.querySelectorAll('button')) as HTMLButtonElement[]).find((btn) =>
    (btn.textContent ?? '').startsWith('技术编程'),
  );
  typeChip?.dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
  await wait(120);
  const techCount = (THEMES as any[]).filter((theme) => theme.tags.includes('tech')).length;
  expect(
    miniCards() === techCount,
    `技术编程筛选后主题卡 ${miniCards()}，期望 ${techCount}`,
  );

  const themeCard = (Array.from(mount.querySelectorAll('button')) as HTMLButtonElement[]).find((btn) =>
    (btn.textContent ?? '').includes('换主题') === false && btn.querySelector('div[style*="scale"]'),
  );
  themeCard?.dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
  await wait(120);
  expect(!text().includes('干货教程'), '选择主题后菜单未关闭');

  // 打开配色面板
  const palette = byLabel('换主色，或单独调某几处的颜色');
  palette?.dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
  await wait(120);
  expect(text().includes('主色'), '配色面板未打开');
  expect(text().includes('单独调色'), '配色面板缺少部件调色');
  expect(text().includes('全部恢复模板原色'), '配色面板缺少恢复入口');

  // 选一个主色预设，预览应立刻换色
  const beforeHtml = html();
  const swatch = Array.from(mount.querySelectorAll('button')).find(
    (btn) => (btn.getAttribute('title') ?? '') === '微信绿',
  );
  swatch?.dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
  await wait(160);
  expect(html() !== beforeHtml, '选择主色后预览没有变化');

  // Esc 关闭浮层
  win.document.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  await wait(80);
  expect(!mount.textContent?.includes('全部恢复模板原色'), 'Esc 未关闭配色面板');

  // ---- 排版面板：行高 / 段间距 / 标题样式 / 代码配色 ----
  const articleRoot = () => mount.querySelector('section[style*="font-family"]') as HTMLElement | null;
  const clickAria = (label: string) => {
    const button = Array.from(mount.querySelectorAll('button')).find(
      (btn) => btn.getAttribute('aria-label') === label,
    ) as HTMLButtonElement | undefined;
    button?.dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
    return button;
  };

  const styleToggle = Array.from(mount.querySelectorAll('button')).find(
    (btn) => (btn.getAttribute('title') ?? '').includes('段间距'),
  );
  expect(Boolean(styleToggle), '缺少「排版」按钮');
  styleToggle?.dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
  await wait(140);
  expect(text().includes('段间距'), '排版面板未打开');
  expect(text().includes('行高'), '排版面板缺少行高分组');
  expect(text().includes('代码配色'), '排版面板缺少代码配色分组');

  expect(Boolean(clickAria('行高1.9')), '排版面板缺少行高 1.9 档');
  await wait(160);
  expect(useTypographyStore.getState().lineHeight === 1.9, '行高未写入 store');
  const lineHeightStyle =
    Array.from(articleRoot()?.querySelectorAll('p') ?? []).find((node) => node.textContent?.trim())?.getAttribute('style') ??
    '';
  expect(lineHeightStyle.includes('line-height:1.9'), `行高未作用到正文：${lineHeightStyle}`);

  expect(Boolean(clickAria('段间距1.15×')), '排版面板缺少段间距档位');
  await wait(160);
  expect(useTypographyStore.getState().blockSpacing === 1.15, '段间距未写入 store');

  expect(Boolean(clickAria('二级标题下边框')), '排版面板缺少标题样式预设');
  await wait(180);
  expect(useTypographyStore.getState().headingStyles.h2 === 'border-bottom', '标题样式未写入 store');
  const headingStyle = (articleRoot()?.querySelector('h2') as HTMLElement | null)?.getAttribute('style') ?? '';
  expect(/border-bottom:2px solid/.test(headingStyle), `标题下边框未作用到预览：${headingStyle}`);

  const codeThemeSelect = mount.querySelector('select[aria-label="代码配色"]') as HTMLSelectElement | null;
  expect(Boolean(codeThemeSelect), '排版面板缺少代码配色选择器');
  if (codeThemeSelect) {
    expect(codeThemeSelect.options.length > 60, `代码配色只有 ${codeThemeSelect.options.length} 项`);
    codeThemeSelect.value = 'atom-one-dark';
    codeThemeSelect.dispatchEvent(new win.Event('change', { bubbles: true }));
    await wait(180);
    expect(useTypographyStore.getState().codeThemeId === 'atom-one-dark', '代码配色未写入 store');
    const preStyle = (articleRoot()?.querySelector('pre') as HTMLElement | null)?.getAttribute('style') ?? '';
    expect(preStyle.includes('#282c34'), `代码配色没换掉代码块底色：${preStyle}`);
    const tokenStyle = Array.from(articleRoot()?.querySelectorAll('pre span') ?? [])
      .map((node) => node.getAttribute('style') ?? '')
      .find((style) => style.startsWith('color:'));
    expect(Boolean(tokenStyle), '代码 token 没有内联颜色');
  }

  const resetParams = Array.from(mount.querySelectorAll('button')).find(
    (btn) => (btn.textContent ?? '').trim() === '全部恢复默认',
  ) as HTMLButtonElement | undefined;
  expect(Boolean(resetParams) && !resetParams?.disabled, '排版面板的「全部恢复默认」不可用');
  resetParams?.dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
  await wait(160);
  expect(useTypographyStore.getState().lineHeight === 'theme', '恢复默认没有重置行高');
  expect(useTypographyStore.getState().codeThemeId === 'theme', '恢复默认没有重置代码配色');
  expect(!(articleRoot()?.querySelector('h2')?.getAttribute('style') ?? '').includes('border-bottom:2px'), '恢复默认后标题仍是描边样式');

  win.document.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  await wait(80);
  expect(!text().includes('段间距'), 'Esc 未关闭排版面板');

  // 清空正文 → 空态与复制按钮禁用
  useTypographyStore.getState().setMarkdown('');
  await wait(160);
  expect(text().includes('左边写点什么'), '清空后未显示预览空态');
  const copyButton = Array.from(mount.querySelectorAll('button')).find((btn) =>
    (btn.textContent ?? '').includes('复制到公众号'),
  ) as HTMLButtonElement | undefined;
  expect(Boolean(copyButton?.disabled), '空正文时复制按钮未禁用');

  // 撤销 / 重做：编辑器里输入后按钮可用，Ctrl+Z 撤销、Ctrl+Shift+Z 重做
  const undoButton = () =>
    Array.from(mount.querySelectorAll('button')).find(
      (btn) => btn.getAttribute('title') === '撤销（⌘/Ctrl + Z）',
    ) as HTMLButtonElement | undefined;
  const redoButton = () =>
    Array.from(mount.querySelectorAll('button')).find(
      (btn) => btn.getAttribute('title') === '重做（⌘/Ctrl + Shift + Z）',
    ) as HTMLButtonElement | undefined;
  expect(Boolean(undoButton() && redoButton()), '缺少撤销 / 重做按钮');
  expect(Boolean(undoButton()?.disabled && redoButton()?.disabled), '无历史时撤销 / 重做按钮未禁用');

  const textarea = mount.querySelector('textarea') as HTMLTextAreaElement | null;
  expect(Boolean(textarea), '缺少编辑区');
  const valueSetter = Object.getOwnPropertyDescriptor(win.HTMLTextAreaElement.prototype, 'value')?.set;
  if (textarea) {
    valueSetter?.call(textarea, '撤销测试');
    textarea.dispatchEvent(new win.Event('input', { bubbles: true }));
    await wait(140);
    expect(useTypographyStore.getState().markdown === '撤销测试', '模拟输入未写入正文');
    expect(!undoButton()?.disabled, '编辑后撤销按钮仍禁用');

    win.document.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true }));
    await wait(140);
    expect(
      useTypographyStore.getState().markdown === '',
      `Ctrl+Z 未撤销，当前「${useTypographyStore.getState().markdown}」`,
    );
    expect(!redoButton()?.disabled, '撤销后重做按钮仍禁用');

    win.document.dispatchEvent(
      new win.KeyboardEvent('keydown', { key: 'z', ctrlKey: true, shiftKey: true, bubbles: true }),
    );
    await wait(140);
    expect(
      useTypographyStore.getState().markdown === '撤销测试',
      `Ctrl+Shift+Z 未重做，当前「${useTypographyStore.getState().markdown}」`,
    );
  }

  // 整体字号：点「极大」后正文根节点字号真的放大，并写进 store
  const articleHtml = () =>
    (mount.querySelector('section[style*="font-family"]') as HTMLElement | null)?.outerHTML ?? '';
  const baseFontSize = Number(/font-size:([\d.]+)px/.exec(articleHtml())?.[1]);
  expect(Number.isFinite(baseFontSize) && baseFontSize > 0, '预览正文缺少基准字号');
  const bigFontButton = Array.from(mount.querySelectorAll('button')).find(
    (btn) => btn.getAttribute('aria-label') === '整体字号极大',
  );
  expect(Boolean(bigFontButton), '缺少整体字号按钮');
  bigFontButton?.dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
  await wait(160);
  expect(useTypographyStore.getState().fontScale === 1.25, '整体字号未写入 store');
  const scaledFontSize = Number(/font-size:([\d.]+)px/.exec(articleHtml())?.[1]);
  expect(
    scaledFontSize === Math.max(10, Math.round(baseFontSize * 1.25)),
    `整体字号未生效：${baseFontSize}px → ${scaledFontSize}px`,
  );

  // 字体：只在主题 section 里包一层带字体的 wrapper，内层元素不写 font-family
  const fontSelect = mount.querySelector('select[aria-label="正文字体"]') as HTMLSelectElement | null;
  expect(Boolean(fontSelect), '缺少正文字体选择器');
  const fontWrapperStyle = () => {
    const wrapper = Array.from(mount.querySelectorAll('section')).find(
      (node) =>
        node.parentElement?.tagName === 'SECTION' &&
        (node.getAttribute('style') ?? '').startsWith('font-family:'),
    );
    return wrapper?.getAttribute('style') ?? '';
  };
  if (fontSelect) {
    fontSelect.value = 'song';
    fontSelect.dispatchEvent(new win.Event('change', { bubbles: true }));
    await wait(160);
    expect(useTypographyStore.getState().fontFamilyId === 'song', '字体未写入 store');
    expect(fontWrapperStyle().includes('Songti SC'), `缺少承载宋体的 wrapper：${fontWrapperStyle()}`);

    // 细体走 PingFang SC + font-weight，而不是 PostScript 字体名
    fontSelect.value = 'pingfang-sc-light';
    fontSelect.dispatchEvent(new win.Event('change', { bubbles: true }));
    await wait(160);
    const thinStyle = fontWrapperStyle();
    expect(thinStyle.includes('PingFang SC'), `细体未使用白名单字体名：${thinStyle}`);
    expect(thinStyle.includes('font-weight:300'), `细体未带上字重：${thinStyle}`);
    expect(!html().includes('&quot;'), '内联样式里残留了转义引号');
    const textParagraph = Array.from(mount.querySelectorAll('p')).find((node) => node.textContent?.trim());
    expect(
      !(textParagraph?.getAttribute('style') ?? '').includes('font-family'),
      '内层段落仍写了 font-family',
    );
  }

  // 清空也要进历史：清空后 Ctrl+Z 能拿回原文，Ctrl+Shift+Z 能再清空
  const clickByTitle = (title: string) => {
    const button = Array.from(mount.querySelectorAll('button')).find(
      (btn) => btn.getAttribute('title') === title,
    ) as HTMLButtonElement | undefined;
    button?.dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
    return button;
  };
  const beforeClear = useTypographyStore.getState().markdown;
  expect(clickByTitle('清空') !== undefined, '缺少清空按钮');
  await wait(140);
  expect(useTypographyStore.getState().markdown === '', '点清空后正文未清空');
  win.document.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true }));
  await wait(140);
  expect(useTypographyStore.getState().markdown === beforeClear, '清空后 Ctrl+Z 未恢复原文');
  win.document.dispatchEvent(
    new win.KeyboardEvent('keydown', { key: 'z', ctrlKey: true, shiftKey: true, bubbles: true }),
  );
  await wait(140);
  expect(useTypographyStore.getState().markdown === '', '清空撤销后 Ctrl+Shift+Z 未重新清空');

  // 清空提示里的「撤销」与头部「重做」也要能来回，且撤销后提示条收起
  if (textarea) {
    valueSetter?.call(textarea, '清空前的正文');
    textarea.dispatchEvent(new win.Event('input', { bubbles: true }));
    await wait(140);
    clickByTitle('清空');
    await wait(140);
    expect(text().includes('已清空'), '清空后缺少可撤销提示');
    const noticeUndo = Array.from(mount.querySelectorAll('button')).find((btn) => btn.textContent === '撤销');
    expect(Boolean(noticeUndo), '清空提示里缺少撤销入口');
    noticeUndo?.dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
    await wait(140);
    expect(useTypographyStore.getState().markdown === '清空前的正文', '提示里的撤销未恢复清空前的正文');
    expect(!text().includes('已清空'), '撤销后提示条未收起');
    redoButton()?.dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
    await wait(140);
    expect(useTypographyStore.getState().markdown === '', '提示撤销后头部重做未重新清空');
  }

  // 撤销 / 重做历史：连续输入合并成一步，停顿后另起一步，新编辑清空重做分支
  const history = new EditorHistory({ coalesceMs: 600 });
  const snap = (value: string) => ({ value, selectionStart: value.length, selectionEnd: value.length });
  history.record(snap('a'), snap('ab'), 'typing', 1000);
  history.record(snap('ab'), snap('abc'), 'typing', 1200);
  const undoMerged = history.undo(snap('abc'));
  expect(undoMerged?.value === 'a', `连续输入未合并成一步，撤销得到「${undoMerged?.value}」`);
  const redone = history.redo(snap('a'));
  expect(redone?.value === 'abc', `重做未回到最新，得到「${redone?.value}」`);
  history.record(snap('abc'), snap('abc!'), 'typing', 5000);
  const undoPaused = history.undo(snap('abc!'));
  expect(undoPaused?.value === 'abc', `停顿时长超过窗口后应单独成步，撤销得到「${undoPaused?.value}」`);
  history.undo(snap('abc'));
  history.record(snap('a'), snap('a?'), 'typing', 9000);
  expect(!history.canRedo, '新编辑后重做记录未清空');

  // 「返回站点」目标：子路径回同域上一级（GitHub Pages 项目站点不能被 PUBLIC_BACK_URL 抢走），
  // 只有独立子域名的根才用显式父站，没配就不显示按钮
  expect(
    resolveBackHref('/typography/', 'https://rupertqin.github.io/typography/', 'https://gantz.host') ===
      'https://rupertqin.github.io/',
    '子路径挂载没有回同域上一级',
  );
  expect(
    resolveBackHref('/typography/', 'https://gantz.host/typography/', 'https://gantz.host') === 'https://gantz.host/',
    '主站反代的子路径没有回主站根',
  );
  expect(
    resolveBackHref('/', 'https://typography.gantz.host/', 'https://gantz.host') === 'https://gantz.host',
    '子域名根没有使用显式父站',
  );
  expect(
    resolveBackHref('/', 'https://typography.gantz.host/') === undefined,
    '子域名根未配置父站时不应出现返回按钮',
  );

  // ---- 编辑区 Markdown 高亮层：与 textarea 对齐、组词时让位 ----
  const editorLayer = mount.querySelector('.md-editor-highlight') as HTMLElement | null;
  expect(Boolean(editorLayer), '缺少 Markdown 高亮层');
  if (editorLayer && textarea) {
    const setValue = (value: string) => {
      valueSetter?.call(textarea, value);
      textarea.dispatchEvent(new win.Event('input', { bubbles: true }));
    };
    setValue('# 标题\n\n正文 **加粗** 和 `code`\n\n```js\nconst a = 1;\n```');
    await wait(160);
    expect(editorLayer.innerHTML.includes('mh-heading'), '高亮层没有解析出标题');
    expect(editorLayer.innerHTML.includes('mh-strong'), '高亮层没有解析出加粗');
    expect(editorLayer.innerHTML.includes('mh-code-block'), '高亮层没有解析代码块');

    expect(textarea.className.includes('text-transparent'), 'textarea 文字没有透明（会和高亮层重影）');
    expect(textarea.className.includes('caret-zinc-800'), 'textarea 没设光标颜色（透明字下光标会消失）');

    textarea.scrollTop = 40;
    textarea.dispatchEvent(new win.Event('scroll', { bubbles: true }));
    await wait(80);
    expect(editorLayer.scrollTop === 40, '高亮层没有跟随 textarea 滚动');

    textarea.dispatchEvent(new win.Event('compositionstart', { bubbles: true }));
    await wait(80);
    expect(textarea.className.includes('text-zinc-800'), '输入法组词时 textarea 仍未显字');
    expect(editorLayer.style.opacity === '0', '输入法组词时高亮层没有让位');
    textarea.dispatchEvent(new win.Event('compositionend', { bubbles: true }));
    await wait(80);
    expect(textarea.className.includes('text-transparent'), '组词结束后 textarea 没有恢复透明');
    expect(editorLayer.style.opacity === '1', '组词结束后高亮层没有恢复');
  }

  // ---- 复制链路：SVG 清洗与占位处理 ----
  const { buildCopyBundle } = await import('../src/lib/copy-html');
  const { sanitizeMermaidSvgs } = await import('../src/lib/wechat-svg');

  const fixture = win.document.createElement('div');
  fixture.innerHTML = `
    <svg width="900" viewBox="0 0 900 120" class="flowchart" id="md-mermaid-1" role="graphics-document">
      <defs><marker id="m1"><path d="M0,0 L6,3 L0,6"/></marker>
        <linearGradient id="g1"><stop offset="0" stop-color="#111111"/><stop offset="1" stop-color="#222222"/></linearGradient>
      </defs>
      <g style="fill:url(#g1)"><rect x="0" y="0" width="80" height="40" fill="url(#g1)"/></g>
      <foreignObject x="10" y="10" width="90" height="20"><div style="color:#333">标签</div></foreignObject>
      <text dominant-baseline="central" font-size="6">小字</text>
    </svg>`;
  mount.appendChild(fixture);
  sanitizeMermaidSvgs(fixture, 677);
  const cleaned = fixture.querySelector('svg');
  expect(Boolean(cleaned), '清洗后 svg 消失');
  if (cleaned) {
    expect(!fixture.querySelector('defs'), '清洗后仍残留 defs');
    expect(!cleaned.getAttribute('id') && !cleaned.getAttribute('class'), '清洗后仍残留 id / class');
    expect(!cleaned.getAttribute('role'), '清洗后仍残留 role');
    expect(cleaned.getAttribute('width') === '677', `超宽图未缩到列宽：${cleaned.getAttribute('width')}`);
    expect(!fixture.innerHTML.includes('foreignObject'), '清洗后仍残留 foreignObject');
    expect(!/url\(#/.test(fixture.innerHTML), '清洗后仍有未解析的 url(#id)');
    const smallText = fixture.querySelector('text');
    expect(Number(smallText?.getAttribute('font-size')) >= 9, '清洗后字号没有下限');
    expect(!/dominant-baseline/.test(fixture.innerHTML), '清洗后仍残留 dominant-baseline');
  }
  fixture.remove();

  useTypographyStore.getState().setMarkdown('```mermaid\nflowchart LR\n  A[甲] --> B[乙]\n```\n\n正文段落。');
  await wait(220);
  const copyRoot = articleRoot();
  const bundle = copyRoot ? buildCopyBundle(copyRoot) : null;
  expect(Boolean(bundle), '复制时找不到预览根节点');
  if (bundle) {
    expect(!bundle.html.includes('data-mermaid'), '复制产物残留 data-mermaid');
    expect(!bundle.html.includes('image/svg'), '复制产物残留占位');
    expect(bundle.html.includes('正文段落'), '复制产物丢了正文');
    expect(bundle.text.includes('正文段落'), '纯文本副本丢了正文');
    expect(bundle.dropped === 1, `jsdom 下无法渲染的图应该被丢掉，实际 dropped=${bundle.dropped}`);
  }

  // 持久化：storage key 与原站一致，且字段齐全
  const raw = win.localStorage.getItem('typography');
  expect(Boolean(raw), '未写入 localStorage');
  if (raw) {
    const persisted = JSON.parse(raw).state ?? {};
    for (const key of [
      'markdown',
      'themeId',
      'articleType',
      'previewZoom',
      'fontScale',
      'fontFamilyId',
      'mainColor',
      'partColors',
      'codeThemeId',
      'lineHeight',
      'blockSpacing',
      'blockquoteBackground',
      'headingStyles',
    ]) {
      expect(key in persisted, `持久化缺少字段 ${key}`);
    }
    expect(persisted.themeId === 'terminal' || typeof persisted.themeId === 'string', 'themeId 未持久化');
  }
} catch (error) {
  problems.push(`运行时异常：${(error as Error).message}`);
} finally {
  root.unmount();
}

if (problems.length) {
  console.error('[app-smoke] 失败：');
  for (const problem of problems) console.error(' -', problem);
  process.exit(1);
}

console.log('[app-smoke] 通过：首屏、主题菜单、配色面板、排版面板、SVG 清洗与复制链路均正常');
