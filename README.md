# Typography · 公众号排版风格

公众号排版风格（Typography）是一个公众号排版工具。用 Astro + React 岛：左边写 Markdown，右边实时预览
排版效果，35 套主题任意切换，可微调主色与单个部件颜色，一键复制带内联样式的正文，
草稿自动保存在本机。

## 运行

```bash
npm install
npm run dev      # http://localhost:4321/
npm run build    # 静态产物在 dist/
npm run preview

# 与父站联调：父站 dev 的 /typography 会代理到本机 4322（dev 需要 BASE_PATH 注册路由，
# build 不需要：产物是相对路径的，挂哪都行）
BASE_PATH=/typography npm run dev -- --port 4322
```

## 校验

```bash
npm run check:themes   # 35 套主题结构、顺序、装饰函数可调用
npm run smoke          # 用 jsdom 跑完整渲染管线 + 配色重映射（不访问网络）
npm run verify         # 重新切片 + 上面两项 + 构建
```

## 发布

推 `main` 触发 GitHub Actions（`.github/workflows/deploy.yml`）：一次构建，同一份 `dist` 同时发布到 Cloudflare Pages 与 GitHub Pages 项目站点。

- Secrets：`CLOUDFLARE_API_TOKEN`（Pages:Edit、Account Settings:Read）、`CLOUDFLARE_ACCOUNT_ID`
- GitHub Pages 需仓库 Settings → Pages → Source 设为 **GitHub Actions**
- 项目站点路径 = 仓库名（大小写敏感），需与主站同名目录一致

## 目录

```
src/
  pages/index.astro          应用页（client:only 挂载 React 岛）
  components/
    TypographyApp.tsx        组合根：渲染、复制按钮三态、双栏编排
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
    store.ts                 zustand persist（key: typography）
scripts/
  extract-themes.mjs         从 reference/Typeset.chunk.js 切出主题套件
  relativize.mjs             构建后把 HTML 引用改成相对路径（产物与挂载点无关）
reference/                   逆向证据与偏移说明（不参与构建）
.github/workflows/deploy.yml 一次构建，发布到 CF Pages + GH Pages
public/_redirects            CF 侧：/typography → 带斜杠 301、/typography/* → 根路径 200
public/_headers              /typography/_astro/* 长缓存
astro.config.mjs             dev 用 BASE_PATH 注册路由；构建一律 base /
```

## 说明

- 主题数据来自 `reference/` 里构建产物的原样切片：`decor` 里含函数，JSON 化会丢失行为，因此生成文件不可读是预期结果。
- 复制结果是纯内联样式 HTML，不含 class / data-\* 标记，粘贴到公众号后台即生效。
- `npm run build` 产出的 HTML 用相对路径引用资源（`./_astro/…`），同一份 `dist` 可以挂在任意路径下，不需要按挂载点重新构建。
- 公众号不接受外链图片：`![alt](url)` 会渲染成虚线占位框，粘贴后由使用者在占位处补图。
