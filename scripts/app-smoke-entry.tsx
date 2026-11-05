import { JSDOM } from 'jsdom';

/** 在 Node 里用 jsdom 挂载真实组件，验证首屏、主题菜单与配色面板不会运行时崩 */
const dom = new JSDOM('<!doctype html><html><body><div id="app"></div></body></html>', {
  url: 'https://localhost/typography',
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
const { THEMES } = await import('../src/lib/themes.generated.js');
const { useTypographyStore } = await import('../src/lib/store');
const { EditorHistory } = await import('../src/lib/history');
const { createElement } = await import('react');
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
  expect(text().includes('35 套可选') || html().includes('35 套可选'), '示例正文未渲染');

  const buttons = Array.from(mount.querySelectorAll('button')) as HTMLButtonElement[];
  const byLabel = (label: string) => buttons.find((btn) => (btn.getAttribute('title') ?? '') === label);

  // 打开主题下拉
  const themeToggle = buttons.find((btn) => btn.getAttribute('aria-expanded') === 'false');
  themeToggle?.dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
  await wait(120);
  expect(mount.querySelectorAll('[data-active]').length === 1, '主题菜单未标记当前主题');
  const miniCards = () => mount.querySelectorAll('div[style*="scale"]').length;
  expect(miniCards() === 35, `主题卡数量 ${miniCards()}，期望 35`);
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

console.log('[app-smoke] 通过：首屏渲染、主题菜单筛选/选择、配色面板开关与换色均正常');
