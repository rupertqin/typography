# 逆向证据（仅开发期参考，不参与构建）

原站 `https://www.zhaotab.com/typeset` 是 Vite 打包的 React SPA（站点自身是「桌面导航」形态，
本次只复刻其中的「公众号排版」工具页）。以下产物于 2026-11-04 直接抓取，用于对本仓库的移植结果。

| 文件 | 来源 | 大小 | 用途 |
| --- | --- | --- | --- |
| `Typeset.chunk.js` | `https://www.zhaotab.com/assets/Typeset-3PJF3xUw.js` | 223 KB | 主题套件、Markdown 渲染管线、配色算法、UI 结构 |
| `ToolUI.chunk.js` | `https://www.zhaotab.com/assets/ToolUI-C-HkgQxb.js` | 27 KB | 工具外壳 `ToolShell` / `ToolPanel` / 渐变主按钮 |
| `index.chunk.css` | `https://www.zhaotab.com/assets/index-CnFg0zYa.css` | 522 KB | Tailwind 3.x 工具类与自定义 keyframes |

## 已证实（源码中直接可见）

- 主题数量 **35**，默认主题 `orange`（橙心）；主题对象结构
  `{id,name,accent,tags,font?,page?,code?,styles,decor,hljs}`。
- `styles` 键固定为：`wrapper p h1 h2 h3 h4 strong em del sup sub link blockquote blockquoteP
  ul ol li code pre preBar preCode hr tableWrap table th td fnRef footnotes fnTitle fnItem imgSlot`。
- `decor` 内是函数/HTML 片段：`h1(html) / h2(html, index) / h3(html) / ulMark / olMark / hr / quoteMark / card`，
  因此**不能 JSON 化**，`scripts/extract-themes.mjs` 采取原样切片。
- 渲染管线（`or()`）：marked 解析 → `DOMParser` 包 `<section>` → 图片占位化 → 脚注编号归一 →
  删除结构间空白文本节点 → `hljs-*` class 转内联 style → 标签映射主题样式键 → 打 `data-part` →
  `pre>code` 空白转 `<br>`/nbsp → 列表符号装饰 → `li` 包 section → 标题装饰 → 引用装饰 →
  `hr` 换成装饰 section → 表格包 `tableWrap` → 卡片流分组 → 根节点套 `wrapper` →
  可选配色重映射 → 清除 `data-part*` → 输出 `outerHTML`。
- 自定义 marked 扩展：`^上标^`、`~下标~`、`[^脚注]` + `[^脚注]: 定义`、`~~删除~~`（放宽内部 `~`）；
  外链非 `mp.weixin.qq.com` 转成 `span[data-href]`，脚注区末尾补出地址。
- 代码高亮语言 16 种：bash cpp csharp css go java javascript json markdown php python rust sql typescript xml yaml。
- 配色重映射常量：近灰阈值 `0.15`、同色系色相容差 `30°`、文字部件集合
  `h1 h2 h3 strong hr list link`；映射时保持明度层级（`mapLightness`），深色主题上文字反向提亮。
- 可调部件 10 个：大标题/小标题/三级标题/加粗/引用块/分割线/列表符号/行内代码/表格/背景。
- 状态：zustand persist，`name = "zhaotab-typeset"`，字段
  `markdown / themeId / articleType / previewZoom / mainColor / partColors`。
- 复制：`ClipboardItem` 同时写 `text/html` + `text/plain`，失败回退 `execCommand('copy')`。
- 界面文案、缩放档位（100/75/50）、文章类型 8 项、主色预设 11 色、部件预设 7 色，均逐字照抄。

## 推断（未见运行时，按代码结构判断）

- 原站把工具挂在桌面外壳的应用窗口里；本仓库按用户要求只保留工具页本身（紧凑 hero + 双栏）。
- 主题卡迷你预览固定 360px 宽、108px 高后按容器缩放（代码中是 `fn=360` 与 `scale`）。
- 原站可能对超大文档有额外性能处理；本仓库只保留 `useDeferredValue` + `useMemo`。

## 未复刻

- 站点级 PWA / Service Worker、桌面 shell、dock、其他工具与路由。
- 原站的站点统计与埋点（源码中未见明确调用，故不推测）。
