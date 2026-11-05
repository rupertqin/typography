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

只产出一份产物，构建期把前缀固定为 `/typography`（`BASE_PATH`），两处入口同路径挂载：

| 入口 | 地址 | 说明 |
| --- | --- | --- |
| 主入口（父站反代） | `https://gantz.host/typography/` | 父站 Worker 原样转发到 Pages 的同名路径 |
| 辅入口（子域名） | `https://typography.gantz.host/`、`https://typography.pages.dev/` | 根路径直接可用，`public/_redirects` 用 200 重写把 `/typography/*` 映射回站点根目录 |

- 页面里的资源引用是 `/typography/_astro/…`，因此无论在哪个入口，浏览器请求的都是同一个路径；`_redirects` 只做路径映射，不改 HTML，也不产生第二份产物。
- `PUBLIC_BACK_URL` 存在且当前路径以 `/typography` 开头时，工具头部渲染「返回站点」；子域根路径下不显示。
- 自定义域 `typography.gantz.host` 在 Cloudflare Pages 项目的 Custom domains 里绑定（DNS 由 CF 自动添加），需在控制台点一次，CI 无法代劳。
- 本地手动发布：`npm run deploy:pages`（需已登录 wrangler；部署前请用 `BASE_PATH=/typography npm run build` 构建）。

### CI

- `.github/workflows/deploy-cloudflare.yml`：推 `main` 构建单一产物并发布到 Cloudflare Pages 项目 `typography`（只发 Pages，不建同名 Worker，避免抢占 `typography.pages.dev`）。需要仓库 Secrets：
  - `CLOUDFLARE_API_TOKEN`：Cloudflare Pages:Edit、Account Settings:Read
  - `CLOUDFLARE_ACCOUNT_ID`
- 父站与本仓库已解耦：父站 Worker 运行时反代，本仓库发布后不需要触发父站重建。
- 发布统一走 GitHub Actions（push `main` 即触发），**不要**同时在 Cloudflare 控制台给该项目连 Git：两套构建会互相覆盖，且 CF 侧默认 build command 不带 `BASE_PATH=/typography`，反代时会拿不到资源。

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
.github/workflows/           发布：deploy-cloudflare.yml（GitHub Actions → Cloudflare Pages）
public/_redirects            Pages 侧 200 重写：/typography/* → 站点根目录
public/_headers              /typography/_astro/* 长缓存
astro.config.mjs             BASE_PATH / SITE_URL 控制部署前缀
```

## 说明

- 主题数据来自 `reference/` 里构建产物的原样切片：`decor` 里含函数，JSON 化会丢失行为，因此生成文件不可读是预期结果。
- 复制结果是纯内联样式 HTML，不含 class / data-\* 标记，粘贴到公众号后台即生效。
- 公众号不接受外链图片：`![alt](url)` 会渲染成虚线占位框，粘贴后由使用者在占位处补图。
