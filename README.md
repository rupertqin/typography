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

## 部署

产物是「挂哪都行」的：`astro build` 只用 base `/`，构建后 `scripts/relativize.mjs` 把 HTML 里的引用改成相对路径（`./_astro/…`）。所以同一份 `dist` 既能挂在子域名根，也能挂在任意子路由下，不需要为不同入口分别构建：

| 入口 | 地址 | 说明 |
| --- | --- | --- |
| 主入口（父站反代） | `https://gantz.host/typography/` | 父站 Worker 原样转发到 Pages 的同名路径 |
| 辅入口（子域名） | `https://typography.gantz.host/`、`https://typography-e50.pages.dev/` | 根路径直接可用 |
| GitHub Pages 项目站点 | `https://rupertqin.github.io/Typography/`（小写 `/typography/` 同样可访问） | 项目站点天然把 `/Typography/` 映射到仓库根，不需要任何重写 |

- 相对路径让挂载点与构建彻底解耦：`/typography/` 下 `./_astro/x.js` 解析成 `/typography/_astro/x.js`，`/Typography/` 下解析成 `/Typography/_astro/x.js`，根路径下解析成 `/_astro/x.js`。
- Cloudflare 上的文件在站点根，但访客 URL 带 `/typography` 前缀，所以 `public/_redirects` 仍要做两件事：`/typography` → `/typography/` **301**（少了尾斜杠，`./_astro/x.js` 会相对站点根解析成 `/_astro/x.js`），`/typography/*` → `/:splat` **200** 重写到根目录的真实文件。
- 工具头部的「返回站点」按当前路径推导：不在站点根就显示，地址取上一级目录（`/typography/` → 父站根，`/Typography/` → `rupertqin.github.io` 根）；需要固定地址时用 `PUBLIC_BACK_URL` 覆盖。
- 自定义域 `typography.gantz.host` 在 Cloudflare Pages 项目的 Custom domains 里绑定（DNS 由 CF 自动添加），需在控制台点一次，CI 无法代劳。
- 本地手动发布：`npm run deploy:pages`（需已登录 wrangler；`npm run build` 产出的就是可直接发布的相对路径产物）。

### CI

- `.github/workflows/deploy.yml`：推 `main` 触发**一次构建**。`build` job 产出 `dist`（含「无根绝对引用」校验），两个部署 job 并行消费同一份 artifact：
  - `deploy-cloudflare` → Cloudflare Pages 项目 `typography`，实际子域是 `typography-e50.pages.dev`（`typography.pages.dev` 被其他账号全局占名，CF 自动加了后缀）。只发 Pages、不建同名 Worker，避免再抢这个子域。需要 Secrets `CLOUDFLARE_API_TOKEN`（Pages:Edit、Account Settings:Read）与 `CLOUDFLARE_ACCOUNT_ID`。
  - `deploy-pages` → GitHub Pages 项目站点（`/Typography/`）。仓库 Settings → Pages → Source 需为 **GitHub Actions**。
- 父站与本仓库已解耦：父站 Worker 运行时反代，本仓库发布后不需要触发父站重建。
- 发布统一走 GitHub Actions（push `main` 即触发），**不要**同时在 Cloudflare 控制台给该项目连 Git：两套构建会互相覆盖。

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
- 公众号不接受外链图片：`![alt](url)` 会渲染成虚线占位框，粘贴后由使用者在占位处补图。
