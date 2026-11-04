# 公众号排版（找Tab /typeset 复刻）

用 Astro + React 岛 1:1 复刻 `https://www.zhaotab.com/typeset`：左边写 Markdown，右边实时预览
公众号排版效果，35 套主题任意切换，可微调主色与单个部件颜色，一键复制带内联样式的正文，
草稿自动保存在本机。

## 运行

```bash
npm install
npm run dev      # http://localhost:4321/typeset
npm run build    # 静态产物在 dist/
npm run preview
```

## 校验

```bash
npm run check:themes   # 35 套主题结构、顺序、装饰函数可调用
npm run smoke          # 用 jsdom 跑完整渲染管线 + 配色重映射（不访问网络）
npm run verify         # 重新切片 + 上面两项 + 构建
```

## 目录

```
src/
  pages/typeset.astro        页面壳（client:only 挂载 React 岛）
  components/
    TypesetApp.tsx           组合根：渲染、复制按钮三态、双栏编排
    shell/                   ToolShell（渐变头）+ ToolPanel（白卡）
    editor/EditorPanel.tsx   编辑器：插入工具栏、撤销、粘贴图片、字数与滚动同步
    preview/PreviewPanel.tsx 预览：420px 手机画布、缩放档位
    theme/                   主题选择器 / 下拉面板 / 迷你预览卡
    color/ColorPanel.tsx     配色浮层：主色、10 个部件、拖拽归位
  lib/
    themes.generated.js      由原包切片生成（勿手改）
    markdown.ts              marked + 上下标/脚注/删除线扩展 + 代码高亮
    render.ts                主题样式与装饰注入管线
    recolor.ts               HSL 保亮度配色重映射
    store.ts                 zustand persist（key: zhaotab-typeset）
scripts/
  extract-themes.mjs         从 reference/Typeset.chunk.js 切出主题套件
reference/                   逆向证据与偏移说明（不参与构建）
```

## 说明

- 主题数据来自原站构建产物原样切片：`decor` 里含函数，JSON 化会丢失行为，因此生成文件不可读是预期结果。
- 复制结果是纯内联样式 HTML，不含 class / data-* 标记，粘贴到公众号后台即生效。
- 公众号不接受外链图片：`![alt](url)` 会渲染成虚线占位框，粘贴后由使用者在占位处补图。
