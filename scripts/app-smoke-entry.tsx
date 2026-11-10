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
  const copyAction = Array.from(mount.querySelectorAll('button')).find(
    (btn) => (btn.textContent ?? '').trim() === '复制',
  ) as HTMLButtonElement | undefined;
  expect(Boolean(copyAction), '缺少复制按钮');
  expect(Boolean(copyAction?.className.includes('bg-white')), '复制按钮不是浅色样式');
  expect(text().includes('草稿自动保存在本机'), '缺少草稿统计行');
  expect(text().includes('橙心'), '默认主题不是橙心');
  expect(html().includes('探索 Markdown 的奇妙世界'), '预览未渲染示例文章');
  expect(html().includes('font-family:-apple-system'), '预览未注入主题样式');
  expect(text().includes('Markdown 基础语法') || html().includes('Markdown 基础语法'), '示例正文未渲染');

  // ---- 布局骨架：顶栏 / 可拖拽分栏 / 状态栏三态 / 顶部样式区 ----
  const clickButton = (target: HTMLButtonElement | undefined) =>
    target?.dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
  const findByLabel = (label: string) =>
    Array.from(mount.querySelectorAll('button')).find(
      (btn) => btn.getAttribute('aria-label') === label,
    ) as HTMLButtonElement | undefined;

  expect(Boolean(mount.querySelector('header')), '缺少顶部应用栏');
  expect(Boolean(mount.querySelector('footer')), '缺少底部状态栏');
  expect(Boolean(mount.querySelector('[data-split-handle]')), '分屏时缺少可拖拽分隔条');

  const modeButton = (label: string) => findByLabel(label);
  expect(
    Boolean(modeButton('只显示编辑') && modeButton('左右分屏') && modeButton('只显示预览')),
    '状态栏缺少编辑/分屏/预览三态',
  );

  clickButton(modeButton('只显示预览'));
  await wait(120);
  expect(!mount.querySelector('textarea'), '切到「只显示预览」后编辑区还在');
  expect(!mount.querySelector('[data-split-handle]'), '非分屏时仍显示分隔条');

  clickButton(modeButton('只显示编辑'));
  await wait(120);
  expect(!mount.querySelector('section[style*="font-family"]'), '切到「只显示编辑」后预览区还在');

  clickButton(modeButton('左右分屏'));
  await wait(120);
  expect(Boolean(mount.querySelector('textarea')), '切回分屏后编辑区没回来');
  expect(Boolean(mount.querySelector('section[style*="font-family"]')), '切回分屏后预览区没回来');

  // 双向滚动同步：按已滚比例对齐（jsdom 没有真实布局，这里伪造滚动高度）
  {
    const editorEl = mount.querySelector('textarea') as HTMLTextAreaElement | null;
    const scroller = mount.querySelector('[data-preview-scroll]') as HTMLElement | null;
    expect(Boolean(editorEl && scroller), '找不到编辑区/预览滚动容器');
    const fakeMetrics = (node: HTMLElement, scrollHeight: number, clientHeight: number) => {
      Object.defineProperty(node, 'scrollHeight', { value: scrollHeight, configurable: true });
      Object.defineProperty(node, 'clientHeight', { value: clientHeight, configurable: true });
    };
    if (editorEl && scroller) {
      fakeMetrics(editorEl, 1000, 200); // 可滚 800
      fakeMetrics(scroller, 3000, 600); // 可滚 2400
      editorEl.scrollTop = 400; // 50%
      editorEl.dispatchEvent(new win.Event('scroll'));
      await wait(60);
      expect(Math.round(scroller.scrollTop) === 1200, `编辑区滚动未同步到预览：${scroller.scrollTop}`);

      await wait(60); // 等回环锁在下一帧释放
      scroller.scrollTop = 2400; // 100%
      scroller.dispatchEvent(new win.Event('scroll'));
      await wait(60);
      expect(Math.round(editorEl.scrollTop) === 800, `预览滚动未同步到编辑区：${editorEl.scrollTop}`);

      // 关闭同步后不再跟随
      useTypographyStore.getState().toggleScrollSync();
      await wait(60);
      editorEl.scrollTop = 0;
      editorEl.dispatchEvent(new win.Event('scroll'));
      await wait(60);
      expect(Math.round(scroller.scrollTop) === 2400, '关闭同步后预览仍跟着动');
      useTypographyStore.getState().toggleScrollSync();
      await wait(60);

      // 有锚点时必须按内容对齐：伪造成两侧行高/块高都不一样（源码 10px 一行、预览 5px 一行 + 错位起点），
      // 只要两边都单调，插值就必须落在锚点上——按已滚比例对齐会得出 90 这种偏离的值。
      const previous = useTypographyStore.getState().markdown;
      useTypographyStore.getState().setMarkdown('# 标题\n\n第一段。\n\n第二段。\n\n第三段。');
      await wait(160);
      const layer = mount.querySelector('pre.md-editor-highlight') as HTMLElement | null;
      const blocks = Array.from(mount.querySelectorAll<HTMLElement>('[data-src-line]'));
      expect(Boolean(layer), '找不到编辑区高亮层');
      expect(blocks.length === 4, `预览块没有带源码行号：${blocks.length} 个`);
      if (layer) {
        const stubRect = (node: Element, contentTop: () => number, height: () => number) => {
          node.getBoundingClientRect = () =>
            ({ top: contentTop(), bottom: contentTop() + height(), height: height() }) as DOMRect;
        };
        // 编辑区：第 i 行顶在 i*10，容器自身跟着滚；可滚范围只有 50px，
        // 让最后一行(60)顶不到上沿——这正是「滚不到的位置」那种锚点
        fakeMetrics(editorEl, 250, 200);
        Array.from(layer.children).forEach((node, index) => {
          stubRect(node, () => index * 10 - layer.scrollTop, () => 10);
        });
        // 容器自身不随内容移动：它的视口顶边是固定的
        stubRect(layer, () => 0, () => 0);
        // 预览：源码行 L 的块顶在 100+L*5（和源码侧完全不同比例），容器自身跟着滚
        blocks.forEach((block) => {
          const top = 100 + Number(block.dataset.srcLine) * 5;
          stubRect(block, () => top - scroller!.scrollTop, () => 20);
        });
        stubRect(scroller, () => 0, () => 0);

        editorEl.scrollTop = 30; // 落在第 3 行(20)到第 5 行(40)之间
        editorEl.dispatchEvent(new win.Event('scroll'));
        await wait(60);
        expect(Math.round(scroller.scrollTop) === 120, `按内容对齐时预览应滚到 120，实际 ${scroller.scrollTop}`);

        // 滚到底：末段锚点顶不到上沿，不能再按锚点插值，必须和预览一起见底
        await wait(40);
        editorEl.scrollTop = 50;
        editorEl.dispatchEvent(new win.Event('scroll'));
        await wait(60);
        expect(Math.round(scroller.scrollTop) === 2400, `编辑区到底时预览也应到底，实际 ${scroller.scrollTop}`);

        await wait(40);
        scroller.scrollTop = 125; // 正好是第 5 行的锚点
        scroller.dispatchEvent(new win.Event('scroll'));
        await wait(60);
        expect(Math.round(editorEl.scrollTop) === 40, `按内容对齐时编辑区应回到 40，实际 ${editorEl.scrollTop}`);

        // 反向到底也一样
        await wait(40);
        scroller.scrollTop = 2400;
        scroller.dispatchEvent(new win.Event('scroll'));
        await wait(60);
        expect(Math.round(editorEl.scrollTop) === 50, `预览到底时编辑区也应到底，实际 ${editorEl.scrollTop}`);

        [layer, scroller, ...Array.from(layer.children), ...blocks].forEach((node) => {
          delete (node as unknown as { getBoundingClientRect?: unknown }).getBoundingClientRect;
        });
      }
      useTypographyStore.getState().setMarkdown(previous);
      await wait(160);
    }
  }

  // 预览纸宽度：默认手机列宽，点状态栏按钮后切桌面宽度
  expect(useTypographyStore.getState().previewDevice === 'mobile', '默认预览宽度不是手机');
  const paperWidth = () =>
    (mount.querySelector('section[style*="font-family"]') as HTMLElement | null)?.closest('div[style*="zoom"]')
      ?.className ?? '';
  expect(paperWidth().includes('375px'), `手机预览纸宽度不对：${paperWidth()}`);
  clickButton(findByLabel('切换为桌面宽度预览'));
  await wait(140);
  expect(useTypographyStore.getState().previewDevice === 'desktop', '桌面宽度预览未写入 store');
  expect(paperWidth().includes('680px'), `桌面预览纸宽度不对：${paperWidth()}`);
  clickButton(findByLabel('切换为手机宽度预览'));
  await wait(140);

  // 顶部样式区：顶栏「样式」按钮开合，Esc 关闭
  const styleHeaderButton = Array.from(mount.querySelectorAll('button')).find(
    (btn) => (btn.getAttribute('title') ?? '') === '设置：配色与排版',
  ) as HTMLButtonElement | undefined;
  expect(Boolean(styleHeaderButton), '顶栏缺少「样式」按钮');
  expect(
    styleHeaderButton?.getAttribute('aria-expanded') === null,
    '「样式」按钮不能用 aria-expanded，会和主题按钮抢焦点',
  );
  clickButton(styleHeaderButton);
  await wait(140);
  expect(Boolean(mount.querySelector('[data-style-panel]')), '顶部样式区未打开');
  win.document.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  await wait(100);
  expect(!mount.querySelector('[data-style-panel]'), 'Esc 未关闭顶部样式区');

  const buttons = Array.from(mount.querySelectorAll('button')) as HTMLButtonElement[];

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

  // ---- 顶部样式区：顶栏「样式」按钮打开，配色与排版同屏 ----
  const styleToggle = () =>
    Array.from(mount.querySelectorAll('button')).find(
      (btn) => (btn.getAttribute('title') ?? '') === '设置：配色与排版',
    ) as HTMLButtonElement | undefined;
  const openStylePanel = async () => {
    const toggle = styleToggle();
    clickButton(toggle);
    await wait(150);
    return toggle;
  };
  const articleRoot = () => mount.querySelector('section[style*="font-family"]') as HTMLElement | null;
  const clickAria = (label: string) => {
    const button = Array.from(mount.querySelectorAll('button')).find(
      (btn) => btn.getAttribute('aria-label') === label,
    ) as HTMLButtonElement | undefined;
    clickButton(button);
    return button;
  };

  const closedClass = styleToggle()?.className ?? '';
  await openStylePanel();
  const openedToggle = styleToggle();
  // 「样式」按钮在工具条最右端，不在顶栏
  expect(!openedToggle?.closest('header'), '「样式」按钮还留在顶栏里');
  const workbenchBar = openedToggle?.closest('[data-workbench]') ?? null;
  expect(Boolean(workbenchBar), '「样式」按钮不在工作台工具条里');
  expect(
    workbenchBar?.lastElementChild?.contains(openedToggle ?? null) ?? false,
    '「样式」按钮不在工具条右侧那一组里',
  );
  // 打开时是选中态（与档位按钮同一套 .ui-selected），收起后回到原来的白底细边
  expect(/ui-selected/.test(openedToggle?.className ?? ''), '「样式」按钮打开时没有选中态');
  expect(!/ui-selected/.test(closedClass), '「样式」按钮收起时不该是选中态');
  const arrowClass = () => openedToggle?.querySelector('svg[aria-hidden]')?.getAttribute('class') ?? '';
  expect(arrowClass().includes('rotate-180'), `展开时箭头没有朝上：${arrowClass()}`);
  expect(text().includes('段间距'), '样式区缺少段间距分组');
  expect(text().includes('行距'), '样式区缺少行距分组');
  expect(text().includes('代码配色'), '样式区缺少代码配色分组');
  // 合并后配色与排版必须在同一屏，不再靠页签切换
  expect(text().includes('主色'), '样式区缺少主色分组');
  expect(text().includes('单独调色'), '样式区缺少部件调色');
  expect(text().includes('重置'), '样式区缺少重置入口');
  expect(!text().includes('重置配色') && !text().includes('重置排版'), '重置入口没有合并成一个');

  // 行距的值也必须绑在控件上：跟随主题时选中主题自身的行距（多数主题 1.8，gold/news 1.85）
  const lhChips = () =>
    Array.from(mount.querySelectorAll('button')).filter((btn) =>
      (btn.getAttribute('aria-label') ?? '').startsWith('行距'),
    );
  const selectedLh = () =>
    lhChips()
      .filter((btn) => btn.className.includes('ui-selected'))
      .map((btn) => btn.getAttribute('aria-label'));
  expect(selectedLh().length === 1, `行距一开始没有选中档位：${selectedLh().join(',') || '无'}`);
  {
    const { THEMES } = await import('../src/lib/themes');
    const { themeLineHeight } = await import('../src/lib/render-helpers');
    const active = THEMES.find((item) => item.id === useTypographyStore.getState().themeId);
    const expected = active ? `行距${themeLineHeight(active.styles.wrapper)}` : '';
    expect(selectedLh().join() === expected, `行距选中档位与主题行距不符：${selectedLh().join()} ≠ ${expected}`);
  }

  expect(Boolean(clickAria('行距1.9')), '样式区缺少行距 1.9 档');
  await wait(160);
  expect(useTypographyStore.getState().lineHeight === 1.9, '行距未写入 store');
  expect(selectedLh().join() === '行距1.9', `点了 1.9 之后 1.9 不是选中态：${selectedLh().join(',')}`);
  // 档位按钮的选中态走全站统一的 .ui-selected：浅灰底 + 近黑描边 + 一点投影，不是深色实底
  const activeStep = mount.querySelector('button[aria-label="行距1.9"]');
  expect(Boolean(activeStep?.className.includes('ui-selected')), '选中的档位没有统一的选中态样式');
  expect(!activeStep?.className.includes('bg-zinc-900'), '选中的档位还在用深色实底');
  expect(!/ring-2/.test(activeStep?.className ?? ''), '选中的档位边框太粗');
  const idleStep = mount.querySelector('button[aria-label="行距1.5"]');
  expect(!idleStep?.className.includes('ui-selected'), '未选中的档位也带上了选中态');
  const lineHeightStyle =
    Array.from(articleRoot()?.querySelectorAll('p') ?? []).find((node) => node.textContent?.trim())?.getAttribute('style') ??
    '';
  expect(lineHeightStyle.includes('line-height:1.9'), `行距未作用到正文：${lineHeightStyle}`);

  expect(Boolean(clickAria('段间距1.15×')), '样式区缺少段间距档位');
  await wait(160);
  expect(useTypographyStore.getState().blockSpacing === 1.15, '段间距未写入 store');

  // 左右边距是卡片外的留白（同公众号的「边距」）：跟随主题时不额外加，所以一开始 0 档选中
  const marginChips = () =>
    Array.from(mount.querySelectorAll('button')).filter((btn) =>
      (btn.getAttribute('aria-label') ?? '').startsWith('左右边距'),
    );
  const selectedMargin = () =>
    marginChips()
      .filter((btn) => btn.className.includes('ui-selected'))
      .map((btn) => btn.getAttribute('aria-label'));
  expect(
    selectedMargin().length === 1,
    `左右边距一开始没有选中档位：${selectedMargin().join(',') || '无'}`,
  );
  expect(Boolean(clickAria('左右边距0')), '样式区缺少左右边距档位');
  await wait(160);
  expect(useTypographyStore.getState().pageMarginX === 0, '左右边距 0 未写入 store');
  expect(selectedMargin().join() === '左右边距0', `选了 0 之后 0 不是选中态：${selectedMargin().join(',')}`);

  expect(Boolean(clickAria('左右边距16')), '样式区缺少左右边距档位');
  await wait(180);
  expect(useTypographyStore.getState().pageMarginX === 16, '左右边距未写入 store');
  const marginedStyle = articleRoot()?.getAttribute('style') ?? '';
  expect(
    marginedStyle.includes('margin-left:16px') && marginedStyle.includes('margin-right:16px'),
    `左右边距没有作用到最外层 wrapper 的外边距：${marginedStyle}`,
  );

  const headingLevelSelect = mount.querySelector('select[aria-label="标题级别"]') as HTMLSelectElement | null;
  const headingStyleSelect = () => mount.querySelector('select[aria-label="标题样式"]') as HTMLSelectElement | null;
  const changeSelect = (el: HTMLSelectElement | null, value: string) => {
    if (!el) return;
    el.value = value;
    el.dispatchEvent(new win.Event('change', { bubbles: true }));
  };
  expect(Boolean(headingLevelSelect && headingStyleSelect()), '样式区缺少标题级别/样式下拉');
  expect(headingLevelSelect?.value === 'h2', `标题级别默认应为 H2，实际 ${headingLevelSelect?.value}`);
  expect(headingLevelSelect?.options.length === 6, `标题级别应有 H1–H6 共 6 项，实际 ${headingLevelSelect?.options.length}`);
  changeSelect(headingStyleSelect(), 'border-bottom');
  await wait(180);
  expect(useTypographyStore.getState().headingStyles.h2 === 'border-bottom', '标题样式未写入 store');
  const headingStyle = (articleRoot()?.querySelector('h2') as HTMLElement | null)?.getAttribute('style') ?? '';
  expect(/border-bottom:2px solid/.test(headingStyle), `标题下边框未作用到预览：${headingStyle}`);

  // 切到 H3：样式下拉应显示该级别自己的当前值，再单独设置
  changeSelect(headingLevelSelect, 'h3');
  await wait(120);
  expect(headingStyleSelect()?.value === 'default', '切换标题级别后没有显示该级别的样式');
  changeSelect(headingStyleSelect(), 'border-left');
  await wait(120);
  expect(useTypographyStore.getState().headingStyles.h3 === 'border-left', 'H3 标题样式未写入 store');

  // H6 也能单独设置
  changeSelect(headingLevelSelect, 'h6');
  await wait(120);
  changeSelect(headingStyleSelect(), 'color-only');
  await wait(120);
  expect(useTypographyStore.getState().headingStyles.h6 === 'color-only', 'H6 标题样式未写入 store');

  // 「自选颜色」才展开颜色选项，按级别独立保存，且选项里要有「跟随主题」
  changeSelect(headingLevelSelect, 'h2');
  await wait(120);
  changeSelect(headingStyleSelect(), 'color-only');
  await wait(150);
  const styleLabels = Array.from(headingStyleSelect()?.options ?? []).map((option) => option.textContent?.trim());
  expect(styleLabels.includes('自选颜色') && !styleLabels.includes('主题色文字'), '标题样式下拉没有改成「自选颜色」');
  const headingColorInput = mount.querySelector('input[aria-label="H2标题文字颜色"]');
  expect(Boolean(headingColorInput), '自选颜色没有出现颜色选项');
  const followTheme = mount.querySelector('button[aria-label="标题文字色跟随主题"]') as HTMLElement | null;
  expect(Boolean(followTheme), '颜色选项缺少「跟随主题」');
  expect(followTheme?.getAttribute('aria-pressed') === 'true', '未来自定义色时「跟随主题」应选中');
  // 选颜色的按钮统一走 ColorChoiceButton：选中整颗填色，未选中是白底 + 色点
  const originButton = Array.from(mount.querySelectorAll('button')).find(
    (btn) => (btn.textContent ?? '').trim() === '模板原色',
  ) as HTMLElement | undefined;
  expect(originButton?.getAttribute('aria-pressed') === 'true', '未选主色时「模板原色」应选中');
  expect(Boolean(originButton?.style.backgroundColor), '「模板原色」没有用主题色填色');
  // 填色的按钮与档位按钮同一套选中态（近黑描边 + 浅灰/填色底 + 淡投影）
  expect(/ui-selected/.test(originButton?.className ?? ''), '填色的「模板原色」没有统一的选中态样式');
  expect(Boolean(followTheme?.style.backgroundColor), '「跟随主题」没有用主色填色');
  useTypographyStore.getState().setMainColor('#ffb7c5');
  await wait(140);
  const followFilled = mount.querySelector('button[aria-label="标题文字色跟随主题"]') as HTMLElement | null;
  expect(
    (followFilled?.style.backgroundColor ?? '').replace(/\s/g, '') === 'rgb(255,183,197)',
    `主色变了「跟随主题」的底色没跟着变：${followFilled?.style.backgroundColor}`,
  );
  expect(
    Array.from(mount.querySelectorAll('button'))
      .find((btn) => (btn.textContent ?? '').trim() === '模板原色')
      ?.getAttribute('aria-pressed') === 'false',
    '选了主色后「模板原色」仍选中',
  );
  useTypographyStore.getState().setMainColor('');
  await wait(140);
  const colorRow =
    mount.querySelector('input[aria-label="H2标题文字颜色"]')?.parentElement?.parentElement ?? null;
  const headingPreset = Array.from(colorRow?.querySelectorAll('button') ?? []).find(
    (btn) => btn.getAttribute('title') === '活力橘',
  );
  expect(Boolean(headingPreset), '标题文字色缺少预设色板');
  headingPreset?.dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
  await wait(160);
  expect(useTypographyStore.getState().headingColors.h2 === '#fa5151', '标题文字色未写入 store');
  // 圆形色块的选中态：白色留白 + 1px 近黑细环 + 同一份投影
  const selectedSwatch = Array.from(colorRow?.querySelectorAll('button') ?? []).find(
    (btn) => btn.getAttribute('title') === '活力橘',
  );
  expect(
    /ui-selected-swatch/.test(selectedSwatch?.className ?? ''),
    '选中的色块没有统一的选中态样式',
  );
  const coloredHeading = (articleRoot()?.querySelector('h2') as HTMLElement | null)?.getAttribute('style') ?? '';
  expect(coloredHeading.includes('color:#fa5151'), `标题文字色未作用到预览：${coloredHeading}`);
  const followAgain = mount.querySelector('button[aria-label="标题文字色跟随主题"]');
  followAgain?.dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
  await wait(150);
  expect(!useTypographyStore.getState().headingColors.h2, '点「跟随主题」没有清掉自定义色');

  // 单独调色不再列标题项（已并入上面的标题样式）
  const partRow = Array.from(mount.querySelectorAll('span'))
    .find((node) => node.textContent?.trim() === '单独调色')
    ?.closest('div.flex.items-start');
  const partText = partRow?.textContent ?? '';
  expect(!/大标题|小标题|三级标题/.test(partText), `单独调色仍列着标题项：${partText}`);
  // 布局按块归位：基础色（主色/链接色/引用底色）一块、单独调色一块、版式与标题一块。
  // 基础色与单独调色同一父容器（窄屏/两栏时叠在左栏），它的父级再与版式同层（xl 起三栏）。
  const rowOf = (label: string) =>
    Array.from(mount.querySelectorAll('span'))
      .find((node) => node.textContent?.trim() === label)
      ?.closest('div.flex.items-start') ?? null;
  const baseCol = rowOf('主色')?.parentElement ?? null;
  const partCol = partRow?.parentElement ?? null;
  const layoutCol =
    rowOf('段间距')?.parentElement ?? headingStyleSelect()?.closest('div.flex.items-start')?.parentElement ?? null;
  expect(Boolean(baseCol) && Boolean(partCol) && Boolean(layoutCol), '样式区没有分出三块');
  expect(baseCol !== partCol, '单独调色没有独立成栏');
  expect(baseCol?.parentElement === partCol?.parentElement, '单独调色与基础色不在同一个颜色组里');
  expect(
    baseCol?.parentElement?.parentElement === layoutCol?.parentElement,
    '版式与标题没有和颜色组并列成栏',
  );
  for (const label of ['主色', '链接色', '引用底色']) {
    expect(rowOf(label)?.parentElement === baseCol, `${label}应在基础色栏`);
  }
  for (const label of ['段间距', '行距', '左右边距', '标题样式', '代码配色']) {
    expect(rowOf(label)?.parentElement === layoutCol, `${label}应在版式栏`);
  }

  const codeThemeSelect = mount.querySelector('select[aria-label="代码配色"]') as HTMLSelectElement | null;
  expect(Boolean(codeThemeSelect), '样式区缺少代码配色选择器');
  // 「跟随主题」必须标出 82 套里等价的那套配色名，而不是主题自己的名字
  const followLabel = () => {
    const select = mount.querySelector('select[aria-label="代码配色"]') as HTMLSelectElement | null;
    return select?.options[0]?.textContent ?? '';
  };
  {
    const { THEMES } = await import('../src/lib/themes');
    const { CODE_THEMES_BY_ID } = await import('../src/lib/code-themes');
    const activeTheme = THEMES.find((item) => item.id === useTypographyStore.getState().themeId);
    expect(Boolean(activeTheme), `找不到当前主题 ${useTypographyStore.getState().themeId}`);
    if (activeTheme) {
      const expected = `跟随主题（${CODE_THEMES_BY_ID[activeTheme.codeTheme]?.label}）`;
      expect(followLabel() === expected, `「跟随主题」没标出等价配色：${followLabel()} ≠ ${expected}`);
      expect(!followLabel().includes(activeTheme.name), `「跟随主题」还在显示主题名：${followLabel()}`);
    }
    // 文档主题是 code: 'light'，跟的应该是 github
    const restoreTheme = useTypographyStore.getState().themeId;
    useTypographyStore.getState().setThemeId('docs');
    await wait(160);
    expect(followLabel().includes('GitHub'), `docs 主题的「跟随主题」应为 GitHub：${followLabel()}`);
    useTypographyStore.getState().setThemeId(restoreTheme);
    await wait(160);
  }
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

  useTypographyStore.getState().setMainColor('#123456');
  await wait(60);
  const resetAll = Array.from(mount.querySelectorAll('button')).find(
    (btn) => (btn.textContent ?? '').trim() === '重置',
  ) as HTMLButtonElement | undefined;
  expect(Boolean(resetAll) && !resetAll?.disabled, '样式区的「重置样式」不可用');
  resetAll?.dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
  await wait(200);
  expect(useTypographyStore.getState().lineHeight === 'theme', '重置样式没有重置行距');
  expect(useTypographyStore.getState().codeThemeId === 'theme', '重置样式没有重置代码配色');
  expect(useTypographyStore.getState().pageMarginX === 'theme', '重置样式没有重置左右边距');
  expect(useTypographyStore.getState().mainColor === '', '重置样式没有重置主色');
  expect(
    !/margin-(?:left|right):/.test(articleRoot()?.getAttribute('style') ?? ''),
    '重置后正文仍带左右外边距',
  );
  expect(!(articleRoot()?.querySelector('h2')?.getAttribute('style') ?? '').includes('border-bottom:2px'), '重置后标题仍是描边样式');

  win.document.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  await wait(100);
  expect(!mount.querySelector('[data-style-panel]'), 'Esc 未关闭顶部样式区');
  expect(
    (styleToggle()?.className ?? '') === closedClass,
    '「样式」按钮收起后配色变了',
  );
  expect(!arrowClass().includes('rotate-180'), `收起后箭头没有朝下：${arrowClass()}`);

  // 再开一次：配色部分不需要切页签，直接可用
  await openStylePanel();

  // 选一个主色预设，预览应立刻换色
  const beforeHtml = html();
  const swatch = Array.from(mount.querySelectorAll('button')).find(
    (btn) => (btn.getAttribute('title') ?? '') === '经典蓝',
  );
  clickButton(swatch);
  await wait(180);
  expect(useTypographyStore.getState().mainColor === '#0f4c81', '主色预设未写入 store');
  expect(html() !== beforeHtml, '选择主色后预览没有变化');

  // 选颜色的按钮统一走 ColorChoiceButton：选中填色、未选中显示色点，颜色与预览一致
  {
    // 链接色 / 引用底色要预览里确实有 <a> 和 <blockquote>，这里用一份最小稿子，
    // 别让断言依赖内置示例的具体内容（示例是会调整的）
    useTypographyStore
      .getState()
      .setMarkdown('正文和一个 [公众号文章](https://mp.weixin.qq.com/s/example)。\n\n> 一段引用。');
    await wait(180);

    const { styleValue } = await import('../src/lib/recolor');
    // jsdom 把内联色规整成 rgb()，预览侧还是原样的 hex：比数值不比字面
    const rgb = (value = '') => {
      const text = value.trim().toLowerCase();
      const hex = /^#([0-9a-f]{6})$/.exec(text);
      if (hex) {
        const n = parseInt(hex[1], 16);
        return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},1`;
      }
      const parts = /^rgba?\(([^)]+)\)$/.exec(text)?.[1].split(',').map((part) => Number(part.trim()));
      if (parts && parts.length >= 3) return `${parts[0]},${parts[1]},${parts[2]},${parts[3] ?? 1}`;
      return text;
    };
    // 选中时按钮整颗填该色，未选中时色退到按钮里的圆点
    const shownColor = (label: string) => {
      const button = mount.querySelector(`button[aria-label="${label}"]`) as HTMLElement | null;
      const dot = button?.querySelector('span') as HTMLElement | null;
      return rgb(button?.style.backgroundColor || dot?.style.backgroundColor);
    };
    const pressed = (label: string) =>
      mount.querySelector(`button[aria-label="${label}"]`)?.getAttribute('aria-pressed') === 'true';
    const previewLink = () => styleValue(articleRoot()?.querySelector('a')?.getAttribute('style') ?? '');
    const previewQuote = () =>
      styleValue(articleRoot()?.querySelector('blockquote')?.getAttribute('style') ?? '', 'background');
    // 引用底色的「跟随主题」按钮显示主题主色（带主色覆盖），不是主题那层 6% 浅底
    const accentColor = () =>
      rgb(useTypographyStore.getState().mainColor || (THEMES.find((t) => t.id === useTypographyStore.getState().themeId) as any).accent);

    useTypographyStore.getState().setThemeId('orange');
    await wait(180);
    expect(pressed('链接色跟随主题'), '未选链接色时「跟随主题」应选中');
    expect(pressed('引用底色跟随主题'), '未引用底色时「跟随主题」应选中');
    expect(
      shownColor('链接色跟随主题') === rgb(previewLink()),
      `链接色「跟随主题」的色点与预览不一致：${shownColor('链接色跟随主题')} / ${rgb(previewLink())}`,
    );
    expect(
      shownColor('引用底色跟随主题') === accentColor(),
      `引用底色「跟随主题」显示的色不是主色：${shownColor('引用底色跟随主题')} / ${accentColor()}`,
    );

    // 换主色后这两处跟着变（再次与预览对齐）
    useTypographyStore.getState().setMainColor('#e11d48');
    await wait(180);
    expect(
      shownColor('链接色跟随主题') === rgb(previewLink()),
      `换主色后链接色「跟随主题」没跟上预览：${shownColor('链接色跟随主题')} / ${rgb(previewLink())}`,
    );
    expect(
      shownColor('引用底色跟随主题') === accentColor(),
      `换主色后引用底色「跟随主题」没跟上：${shownColor('引用底色跟随主题')} / ${accentColor()}`,
    );
    useTypographyStore.getState().setMainColor('#0f4c81');
    await wait(160);

    // 选了「微信蓝」之后，「跟随主题」的色点仍是主题链接色，只是不再选中
    const themeLink = shownColor('链接色跟随主题');
    useTypographyStore.getState().setPartColor('link', '#576b95');
    await wait(180);
    expect(!pressed('链接色跟随主题'), '选了具体链接色后「跟随主题」仍选中');
    expect(shownColor('链接色跟随主题') === themeLink, '链接色「跟随主题」的色点跟着自定义值变了');
    expect(shownColor('链接色微信蓝') === rgb('#576b95'), `「微信蓝」的色点不是微信蓝：${shownColor('链接色微信蓝')}`);
    useTypographyStore.getState().setPartColor('link', '');
    await wait(160);

    // 引用底色三项都带色点，且色点就是实际底色（半透明原样、无背景画斜线）
    useTypographyStore.getState().setMainColor('');
    await wait(160);
    useTypographyStore.getState().setThemeId('rose');
    await wait(180);
    expect(
      shownColor('引用底色跟随主题') === accentColor(),
      `跟随主题没有显示主题主色：${shownColor('引用底色跟随主题')} / ${accentColor()}`,
    );
    // 主题引用的底色是 rgba(217,70,111,0.06)，按钮上不放这层浅色（否则看着像加了透明度）
    expect(
      shownColor('引用底色跟随主题') === rgb('#d9466f'),
      `跟随主题显示的不是实色：${shownColor('引用底色跟随主题')}`,
    );
    expect(
      shownColor('引用底色主题色浅底') === rgb('rgba(217,70,111,0.08)'),
      `主题色浅底显示的不是 8% 浅底：${shownColor('引用底色主题色浅底')}`,
    );
    const noneDot = mount.querySelector('button[aria-label="引用底色无背景"] span') as HTMLElement | null;
    expect(Boolean(noneDot?.querySelector('span')), '「无背景」的色点里没有画斜线');
  }

  win.document.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  await wait(100);
  expect(!mount.querySelector('[data-style-panel]'), 'Esc 未关闭顶部样式区');

  // 清空正文 → 空态与复制按钮禁用
  useTypographyStore.getState().setMarkdown('');
  await wait(160);
  expect(text().includes('左边写点什么'), '清空后未显示预览空态');
  const copyButton = Array.from(mount.querySelectorAll('button')).find(
    (btn) => (btn.textContent ?? '').trim() === '复制',
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

  // 整体字号：点「更大」后正文根节点字号真的放大，并写进 store
  const articleHtml = () =>
    (mount.querySelector('section[style*="font-family"]') as HTMLElement | null)?.outerHTML ?? '';
  const baseFontSize = Number(/font-size:([\d.]+)px/.exec(articleHtml())?.[1]);
  expect(Number.isFinite(baseFontSize) && baseFontSize > 0, '预览正文缺少基准字号');
  // 编辑区基础字号（含高亮层）必须跟预览根字号一致，否则两层折行会错位
  const editorFontSize = () => (mount.querySelector('textarea') as HTMLElement | null)?.style.fontSize ?? '';
  const highlightFontSize = () =>
    (mount.querySelector('pre.md-editor-highlight') as HTMLElement | null)?.style.fontSize ?? '';
  expect(editorFontSize() === `${baseFontSize}px`, `编辑区基准字号与预览不一致：${editorFontSize()} vs ${baseFontSize}px`);
  expect(highlightFontSize() === editorFontSize(), `高亮层字号与 textarea 不一致：${highlightFontSize()} vs ${editorFontSize()}`);
  const bigFontButton = Array.from(mount.querySelectorAll('button')).find(
    (btn) => btn.getAttribute('aria-label') === '整体字号更大',
  );
  expect(Boolean(bigFontButton), '缺少整体字号按钮');
  bigFontButton?.dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
  await wait(160);
  expect(useTypographyStore.getState().fontScale === 1.4, '整体字号未写入 store');
  const scaledFontSize = Number(/font-size:([\d.]+)px/.exec(articleHtml())?.[1]);
  expect(
    scaledFontSize === Math.max(10, Math.round(baseFontSize * 1.4)),
    `整体字号未生效：${baseFontSize}px → ${scaledFontSize}px`,
  );
  expect(
    editorFontSize() === `${scaledFontSize}px`,
    `整体字号未同步到编辑区：${editorFontSize()} vs ${scaledFontSize}px`,
  );

  // 字体：只在主题 section 里包一层带字体的 wrapper，内层元素不写 font-family
  const fontSelect = mount.querySelector('select[aria-label="正文字体"]') as HTMLSelectElement | null;
  // 下拉里不再有「主题字体」：未手动选字体时直接显示主题实际用的那一项
  expect(fontSelect?.value === 'sans', `字体下拉默认值应是主题归属 sans，实际 ${fontSelect?.value}`);
  expect(
    !Array.from(fontSelect?.options ?? []).some((option) => (option.textContent ?? '').includes('主题字体')),
    '字体下拉里仍有「主题字体」选项',
  );
  expect(Boolean(fontSelect), '缺少正文字体选择器');
  // 下拉宽度跟着当前这一项走：靠一段同文案的不可见镜像撑宽，而不是按最长的选项撑着
  const fontMirror = fontSelect?.parentElement?.querySelector('span[aria-hidden]');
  expect(
    (fontMirror?.textContent ?? '').trim() === '黑体',
    `字体下拉的宽度镜像没有跟随当前选项：${fontMirror?.textContent}`,
  );
  // 字体只写在唯一的根 section 上（不再有内层字体容器）
  const fontWrapperStyle = () => articleRoot()?.getAttribute('style') ?? '';
  if (fontSelect) {
    fontSelect.value = 'song';
    fontSelect.dispatchEvent(new win.Event('change', { bubbles: true }));
    await wait(160);
    expect(useTypographyStore.getState().fontFamilyId === 'song', '字体未写入 store');
    expect(fontWrapperStyle().includes('Songti SC'), `根 section 未换成宋体：${fontWrapperStyle()}`);

    // 编辑区的基础字体必须跟预览一致（高亮层 / textarea 同一套栈）。
    // 浏览器与 jsdom 都会把 style 属性里的逗号、多词字体名重新序列化，比较前先归一化。
    const normFont = (value: string | undefined) =>
      (value ?? '').replace(/["']/g, '').replace(/\s*,\s*/g, ',').replace(/\s+/g, ' ').trim().toLowerCase();
    const fontOf = (node: Element | null | undefined) =>
      normFont(/font-family:([^;]+)/i.exec(node?.getAttribute('style') ?? '')?.[1]);
    const editorFont = fontOf(mount.querySelector('textarea'));
    expect(Boolean(editorFont), '编辑区没有读取正文字体');
    expect(editorFont.includes('songti sc'), `编辑区字体没跟着换成宋体：${editorFont}`);
    const previewFont = fontOf(articleRoot());
    expect(editorFont === previewFont, `编辑区与预览字体不一致：${editorFont} vs ${previewFont}`);
    const highlightFont = fontOf(mount.querySelector('pre.md-editor-highlight'));
    expect(highlightFont === editorFont, `高亮层与 textarea 字体不一致：${highlightFont} vs ${editorFont}`);
    expect(
      !Array.from(mount.querySelectorAll('section')).some(
        (node) =>
          node.parentElement?.tagName === 'SECTION' &&
          /^font-family:[^;]*;$/.test(node.getAttribute('style') ?? ''),
      ),
      '预览里仍套着一层只带 font-family 的 wrapper section',
    );

    // 细体走 PingFang SC + font-weight，而不是 PostScript 字体名
    fontSelect.value = 'pingfang-sc-light';
    fontSelect.dispatchEvent(new win.Event('change', { bubbles: true }));
    await wait(160);
    const thinStyle = fontWrapperStyle();
    expect(thinStyle.includes('PingFang SC'), `细体未使用白名单字体名：${thinStyle}`);
    expect(thinStyle.includes('font-weight:300'), `细体未带上字重：${thinStyle}`);
    expect(
      !(articleRoot()?.parentElement?.innerHTML ?? '').includes('&quot;'),
      '正文内联样式里残留了转义引号',
    );
    const textParagraph = Array.from(mount.querySelectorAll('p')).find((node) => node.textContent?.trim());
    expect(
      !(textParagraph?.getAttribute('style') ?? '').includes('font-family'),
      '内层段落仍写了 font-family',
    );

    // 换主题时（没手动选过字体）下拉自动跟着展示该主题的字体
    useTypographyStore.getState().setFontFamilyId('theme');
    useTypographyStore.getState().setThemeId('ink');
    await wait(180);
    expect(fontSelect?.value === 'song', `衬线主题下字体下拉应显示宋体，实际 ${fontSelect?.value}`);
    useTypographyStore.getState().setThemeId('orange');
    await wait(180);
    expect(fontSelect?.value === 'sans', `无衬线主题下字体下拉应显示黑体，实际 ${fontSelect?.value}`);
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
    expect(editorLayer.innerHTML.includes('mh-marker-heading'), '标题标记没有单独的类型样式');
    expect(editorLayer.innerHTML.includes('mh-marker-strong'), '加粗标记没有单独的类型样式');

    // 编辑区加粗色必须跟预览同源：换主色跟着变，否则 **粗体** 会一直停在上一个颜色
    const highlightRoot = editorLayer.parentElement as HTMLElement;
    const strongVar = () => highlightRoot.style.getPropertyValue('--mh-strong').trim().toLowerCase();
    const previewStrong = () =>
      (/color:\s*(#[0-9a-f]{6})/i.exec(articleRoot()?.querySelector('strong')?.getAttribute('style') ?? '')?.[1] ?? '')
        .toLowerCase();
    const themeStrong = strongVar();
    const baselineMain = useTypographyStore.getState().mainColor;
    expect(/^#[0-9a-f]{6}$/.test(themeStrong), `编辑区没拿到加粗色：${themeStrong}`);
    expect(themeStrong === previewStrong(), `编辑区加粗色与预览不一致：${themeStrong} / ${previewStrong()}`);
    useTypographyStore.getState().setMainColor('#e11d48');
    await wait(160);
    expect(strongVar() === '#e11d48', `换主色后编辑区加粗色没跟着变：${strongVar()}`);
    expect(strongVar() === previewStrong(), `换主色后编辑区加粗色与预览不一致：${strongVar()} / ${previewStrong()}`);
    useTypographyStore.getState().setMainColor(baselineMain);
    await wait(160);
    expect(strongVar() === themeStrong, `恢复主色后编辑区加粗色没回到原色：${strongVar()}`);

    expect(textarea.className.includes('text-transparent'), 'textarea 文字没有透明（会和高亮层重影）');
    expect(textarea.className.includes('caret-zinc-800'), 'textarea 没设光标颜色（透明字下光标会消失）');

    textarea.scrollTop = 40;
    textarea.dispatchEvent(new win.Event('scroll', { bubbles: true }));
    await wait(80);
    expect(editorLayer.scrollTop === 40, '高亮层没有跟随 textarea 滚动');

    // 插入标签：光标落在插入内容末尾，视口停在原处（不能跳到文末）
    textarea.scrollTop = 60;
    textarea.setSelectionRange(0, 0);
    const insertHeading = Array.from(mount.querySelectorAll('button')).find(
      (btn) => btn.getAttribute('aria-label') === '小标题',
    ) as HTMLButtonElement | undefined;
    expect(Boolean(insertHeading), '工具条缺少「小标题」插入按钮');
    insertHeading?.dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
    await wait(140);
    const insertedValue = useTypographyStore.getState().markdown;
    expect(insertedValue.startsWith('## 小标题'), '插入后正文里没有小标题标签');
    expect(
      textarea.selectionStart === 0 && textarea.selectionEnd === '## 小标题'.length,
      `光标没有停在插入内容末尾：${textarea.selectionStart}-${textarea.selectionEnd}`,
    );
    expect(textarea.scrollTop === 60, `插入后视口跳走了：${textarea.scrollTop}`);
    expect(mount.ownerDocument.activeElement === textarea, '插入后焦点没有回到编辑区');

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

  // 中文标点紧贴加粗定界符：预览里必须出 <strong>，不能把 ** 原样显示
  useTypographyStore
    .getState()
    .setMarkdown('很多字。**占了那个位置，人却不在那个位置上。**权力和义务严重不匹配。');
  await wait(200);
  const boldHtml = articleRoot()?.innerHTML ?? '';
  expect(/<strong[^>]*>占了那个位置/.test(boldHtml), '标点紧贴加粗时预览没有加粗');
  expect(!boldHtml.includes('**'), '预览里残留了 ** 原文符号');

  // LaTeX：占位在预览里被编译成内联 SVG（复制出去才是矢量图）
  useTypographyStore
    .getState()
    .setMarkdown('质能方程 $E=mc^2$ 很简洁。\n\n$$\n\\frac{a}{b}\n$$');
  await wait(500);
  const mathNodes = Array.from(articleRoot()?.querySelectorAll<HTMLElement>('[data-math]') ?? []);
  expect(mathNodes.length === 2, `公式占位数量不对：${mathNodes.length}`);
  expect(
    mathNodes.every((node) => node.getAttribute('data-state') === 'ready' && Boolean(node.querySelector('svg'))),
    '公式没有编译成 SVG',
  );
  expect(
    mathNodes.some((node) => (node.getAttribute('style') ?? '').includes('text-align:center')),
    '块级公式没有居中',
  );

  useTypographyStore.getState().setMarkdown('```mermaid\nflowchart LR\n  A[甲] --> B[乙]\n```\n\n正文段落。');
  await wait(220);
  const copyHost = articleRoot()?.parentElement ?? null;
  const bundle = copyHost ? buildCopyBundle(copyHost) : null;
  expect(Boolean(bundle), '复制时找不到预览根节点');
  if (bundle) {
    expect(!bundle.html.includes('data-mermaid'), '复制产物残留 data-mermaid');
    expect(!bundle.html.includes('image/svg'), '复制产物残留占位');
    expect(bundle.html.includes('正文段落'), '复制产物丢了正文');
    expect(bundle.text.includes('正文段落'), '纯文本副本丢了正文');
    expect(bundle.dropped === 1, `jsdom 下无法渲染的图应该被丢掉，实际 dropped=${bundle.dropped}`);
    // 首尾各一个 0 行高占位段（同 doocs-md），且外层定位 div 不再混进产物
    expect(
      bundle.html.startsWith('<p style="font-size:0'),
      `复制产物开头缺少占位段：${bundle.html.slice(0, 60)}`,
    );
    expect(
      bundle.html.endsWith('&nbsp;</p>'),
      `复制产物结尾缺少占位段：${bundle.html.slice(-60)}`,
    );
    expect(!bundle.html.startsWith('<div'), '复制产物仍带着预览用的外层 div');
    expect(!bundle.text.includes('\u00a0'), '纯文本副本混进了占位空格');

    // 粘贴形态（对齐 doocs-md）：占位段 → 单层 section → 占位段
    const copyDoc = new win.DOMParser().parseFromString(bundle.html, 'text/html');
    const topNodes = Array.from(copyDoc.body.children) as HTMLElement[];
    expect(topNodes.length === 3, `复制产物顶层节点 ${topNodes.length} 个，期望 3 个（占位 + 正文 + 占位）`);
    expect(topNodes[0]?.tagName === 'P' && topNodes[2]?.tagName === 'P', '复制产物首尾不是占位段');
    const copySection = topNodes[1];
    expect(copySection?.tagName === 'SECTION', `复制产物正文根节点是 ${copySection?.tagName}，期望 SECTION`);
    const nestedFontWrapper = Array.from(copySection?.children ?? []).find(
      (node) => node.tagName === 'SECTION' && /^font-family:[^;]*;$/.test(node.getAttribute('style') ?? ''),
    );
    expect(!nestedFontWrapper, '复制产物正文里还套着一层字体 section');
    expect(
      (copySection?.getAttribute('style') ?? '').includes('font-family'),
      '复制产物根 section 没有 font-family',
    );
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
      'headingColors',
      'pageMarginX',
      'viewMode',
      'previewDevice',
      'scrollSync',
      'splitRatio',
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

console.log(
  '[app-smoke] 通过：布局骨架（顶栏/分栏/状态栏/顶部样式区）、主题菜单、合一后的配色与排版设置、SVG 清洗与复制链路均正常',
);
