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

# 与父站 rupertqin.github.io 联调：父站 dev 的 /typography 会代理到本机 4322
BASE_PATH=/typography npm run dev -- --port 4322
```

## 校验

```bash
npm run check:themes   # 35 套主题结构、顺序、装饰函数可调用
npm run smoke          # 用 jsdom 跑完整渲染管线 + 配色重映射（不访问网络）
npm run verify         # 重新切片 + 上面两项 + 构建
```

## 部署

应用恒挂在 `/` 路由，不同发布目标只差一个 `BASE_PATH`（构建期注入）：

| 目标 | 构建方式 | 访问地址 |
| --- | --- | --- |
| Cloudflare 独立（base `/`） | `npm run build` | `https://typography-site.pages.dev` / `https://typography.gantz.host/` |
| Cloudflare 内嵌（base `/typography`） | `BASE_PATH=/typography PUBLIC_BACK_URL=https://gantz.host npx astro build --outDir dist/typography` | 被父站 `gantz.host/typography` 反代 |
| GitHub Pages 项目站点 | `BASE_PATH=/Typography SITE_URL=https://rupertqin.github.io/Typography npm run build` | `https://rupertqin.github.io/Typography/` |

- Cloudflare Pages 产物里同时包含两套：根目录（独立访问）与 `dist/typography/`（内嵌）。父站 Worker 只需原样转发 `/typography/*`，不用改写 HTML/CSS/JS。
- 带 `BASE_PATH` 构建时，`_astro/`、`favicon.svg` 等资源前缀自动带上该路径，页面不会出现 `/typography/typography` 这类重复路由。
- `PUBLIC_BACK_URL` 存在时工具头部渲染「返回站点」入口，用于被父站反代的场景；独立访问不显示。
- 自定义域 `typography.gantz.host` 绑定在 Cloudflare Pages 项目的 Custom domains 里（DNS 由 CF 自动加 CNAME），需在控制台点一次，CI 无法代劳。
- 本地手动发布：`npm run deploy:workers` / `npm run deploy:pages`（需已登录 wrangler）。

### CI

- `.github/workflows/deploy-pages.yml`：推 `main` 自动发布 GitHub Pages。仓库 Settings → Pages → Source 需选 **GitHub Actions**。
- `.github/workflows/deploy-cloudflare.yml`：推 `main` 一次性构建两套产物并发布 Workers（`typography-site`）与 Pages 两份，需要仓库 Secrets：
  - `CLOUDFLARE_API_TOKEN`：Workers Scripts:Edit、Cloudflare Pages:Edit、Account Settings:Read
  - `CLOUDFLARE_ACCOUNT_ID`
- 父站与本仓库已解耦：父站 Worker 运行时反代，本仓库发布后不需要触发父站重建。

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
reference/                   逆向证据与偏移说明（不参与构建）
.github/workflows/           独立发布：deploy-pages.yml（GitHub Pages）、deploy-cloudflare.yml（Workers + Pages）
wrangler.jsonc               Cloudflare Workers 静态资源配置（typography-site）
astro.config.mjs             BASE_PATH / SITE_URL 控制部署前缀
```

## 说明

- 主题数据来自 `reference/` 里构建产物的原样切片：`decor` 里含函数，JSON 化会丢失行为，因此生成文件不可读是预期结果。
- 复制结果是纯内联样式 HTML，不含 class / data-\* 标记，粘贴到公众号后台即生效。
- 公众号不接受外链图片：`![alt](url)` 会渲染成虚线占位框，粘贴后由使用者在占位处补图。
