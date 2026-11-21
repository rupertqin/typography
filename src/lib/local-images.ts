import { isExternalSrc, lookupAsset } from './local-assets';

/**
 * 预览里的图片接上本机仓库（DOM 层，不含 React）。
 *
 * 导入文件夹后，Markdown 里还是 `![](images/1.png)` 这样的可读路径——
 * 渲染时它被换成了「在这儿插图片」的占位框（公众号不收外链图），
 * 这里再按 data-img-src 去本机仓库找一遍：有这张图就换成真图，没有就保持占位框。
 *
 * 换成真图只影响预览与导出：复制到公众号时由 restoreLocalImages 还原成占位框，
 * 免得粘过去是一张裂图。
 */

const MARK = 'data-local-src';
const LOCAL_IMAGE = 'data-local-image';

/** 换掉的真图对应一份原始占位框 HTML，复制时按 id 还原 */
const placeholders = new Map<string, string>();
let seq = 0;

const IMAGE_SECTION_STYLE = 'margin:1.4em 0;text-align:center;';
const IMAGE_STYLE = 'max-width:100%;height:auto;display:block;margin:0 auto;border-radius:4px;';

function buildImageSection(url: string, alt: string, id: string): HTMLElement | null {
  const holder = document.createElement('div');
  holder.innerHTML = `<section ${LOCAL_IMAGE}="${id}" style="${IMAGE_SECTION_STYLE}"><img src="${url}" alt="${alt.replace(
    /"/g,
    '&quot;',
  )}" style="${IMAGE_STYLE}"></section>`;
  return holder.firstElementChild as HTMLElement | null;
}

/** 扫描并替换，返回换掉的张数 */
export function resolveLocalImages(root: HTMLElement): number {
  let resolved = 0;

  // 1) 正文里手写的 <img src="相对路径">（HTML 白名单允许 img）
  root.querySelectorAll('img').forEach((img) => {
    const src = img.getAttribute('src') ?? '';
    if (!src || isExternalSrc(src)) return;
    if (img.getAttribute(MARK) === src) return;
    const url = lookupAsset(src);
    if (!url) return;
    img.setAttribute('src', url);
    // 记下原来那条路径：再渲染一次时不用重复查
    img.setAttribute(MARK, src);
    resolved += 1;
  });

  // 2) Markdown 图片的占位框：本机有这张图就换成真图
  root.querySelectorAll('[data-img-src]').forEach((slot) => {
    if (slot.hasAttribute(LOCAL_IMAGE)) return;
    const src = slot.getAttribute('data-img-src') ?? '';
    const url = lookupAsset(src);
    if (!url) return;

    seq += 1;
    const id = `img-${seq}`;
    placeholders.set(id, slot.outerHTML);

    const next = buildImageSection(url, slot.getAttribute('data-img-alt') ?? '', id);
    if (!next) return;
    slot.replaceWith(next);
    resolved += 1;
  });

  return resolved;
}

/**
 * 复制前把真图换回占位框：微信不收内联图，直接给 `<img src="data:…">` 粘过去是裂图，
 * 占位框至少还告诉用户在哪儿补图。
 */
export function restoreLocalImages(scope: ParentNode): void {
  scope.querySelectorAll(`[${LOCAL_IMAGE}]`).forEach((node) => {
    const id = node.getAttribute(LOCAL_IMAGE) ?? '';
    const html = placeholders.get(id);
    const holder = document.createElement('div');
    if (html) holder.innerHTML = html;
    const restored = holder.firstElementChild;
    if (!restored) {
      node.remove();
      return;
    }
    // 内部标记不该跟着进复制内容
    restored.removeAttribute('data-img-src');
    restored.removeAttribute('data-img-alt');
    node.replaceWith(...Array.from(holder.childNodes));
  });
}

/** 导出（PDF / HTML）前把内部标记抹掉，产物干净 */
export function stripLocalImageMarks(scope: ParentNode): void {
  scope.querySelectorAll(`[${LOCAL_IMAGE}]`).forEach((node) => node.removeAttribute(LOCAL_IMAGE));
  scope.querySelectorAll('[data-img-src]').forEach((node) => {
    node.removeAttribute('data-img-src');
    node.removeAttribute('data-img-alt');
  });
}
