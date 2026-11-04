import { JSDOM } from 'jsdom';

/** 在 Node 里用 jsdom 挂载真实组件，验证首屏、主题菜单与配色面板不会运行时崩 */
const dom = new JSDOM('<!doctype html><html><body><div id="app"></div></body></html>', {
  url: 'https://localhost/typeset',
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
const { useTypesetStore } = await import('../src/lib/store');
const { createElement } = await import('react');
const { default: TypesetApp } = await import('../src/components/TypesetApp');

const mount = win.document.getElementById('app') as HTMLElement;
const root = createRoot(mount);

const wait = (ms = 60) => new Promise((resolve) => setTimeout(resolve, ms));

const problems: string[] = [];
const expect = (ok: boolean, message: string) => {
  if (!ok) problems.push(message);
};

try {
  root.render(createElement(TypesetApp));
  await wait(120);

  const text = () => mount.textContent ?? '';
  const html = () => mount.innerHTML;

  expect(text().includes('公众号排版'), '缺少标题「公众号排版」');
  expect(text().includes('复制到公众号'), '缺少复制按钮');
  expect(text().includes('草稿自动保存在本机'), '缺少草稿统计行');
  expect(text().includes('橙心'), '默认主题不是橙心');
  expect(html().includes('公众号排版示例'), '预览未渲染示例文章');
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
  useTypesetStore.getState().setMarkdown('');
  await wait(160);
  expect(text().includes('左边写点什么'), '清空后未显示预览空态');
  const copyButton = Array.from(mount.querySelectorAll('button')).find((btn) =>
    (btn.textContent ?? '').includes('复制到公众号'),
  ) as HTMLButtonElement | undefined;
  expect(Boolean(copyButton?.disabled), '空正文时复制按钮未禁用');

  // 持久化：storage key 与原站一致，且字段齐全
  const raw = win.localStorage.getItem('zhaotab-typeset');
  expect(Boolean(raw), '未写入 localStorage');
  if (raw) {
    const persisted = JSON.parse(raw).state ?? {};
    for (const key of ['markdown', 'themeId', 'articleType', 'previewZoom', 'mainColor', 'partColors']) {
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
