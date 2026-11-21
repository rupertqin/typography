import { normalizeAssetPath, stripDir } from './local-assets';

/**
 * 导入「一个文件夹」：里面通常是一篇 md 加一整个图片目录。
 *
 * 浏览器的文件选择框只会给一堆 File（带 `webkitRelativePath`），这里负责
 * 分出 Markdown 与图片、算出相对路径；图片交给 local-assets 存起来，
 * Markdown 原样进编辑器 —— 相对路径保持可读，图片在预览时被换掉。
 */

const MARKDOWN_EXT = /\.(?:md|markdown|txt)$/i;
/** 认成图片的后缀要放宽：iPhone 的 .HEIC、扫描件的 .tif 也是拿到手的一手素材 */
const IMAGE_EXT = /\.(?:png|jpe?g|jfif|gif|webp|svg|bmp|avif|heic|heif|tiff?)$/i;
/** 浏览器（Chrome 系）解不了的格式：只能靠 canvas 试一次，解不开就明说 */
const UNDECODABLE_EXT = /\.(?:heic|heif|tiff?)$/i;

/** 小于这个大小原样带上，不重编码（省时间也保画质） */
const KEEP_RAW_BYTES = 240 * 1024;
/** 单张图 data URL 的上限（base64 约是原图的 1.33 倍） */
const MAX_ASSET_CHARS = 4 * 1024 * 1024;
/** 一次导入的图片总量上限（IndexedDB 放得下，再大就该提醒用户了） */
const MAX_TOTAL_CHARS = 40 * 1024 * 1024;
/** 逐档压缩：先按 1280 压，还超就往下缩、往下调质量 */
const EDGE_STEPS = [1280, 1024, 800];
const QUALITY_STEPS = [0.82, 0.68];

export type SkipReason = 'too-large' | 'unsupported';

export interface SkippedImage {
  path: string;
  reason: SkipReason;
}

export interface FolderMarkdown {
  /** 文件夹内的相对路径，如 `post/post.md` */
  path: string;
  /** 所在目录，如 `post`（图片路径以它为基准） */
  dir: string;
  name: string;
  file: File;
}

export interface FolderScan {
  /** 用户选中的那个文件夹名（用于提示） */
  folderName: string;
  markdowns: FolderMarkdown[];
  images: File[];
}

export interface AssetBuildResult {
  /** 相对路径 → data URL */
  bundle: Record<string, string>;
  used: number;
  /** 没进来的图片，带原因 */
  skipped: SkippedImage[];
  chars: number;
}

const relativePathOf = (file: File): string =>
  ((file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name).replace(/\\/g, '/');

const dirOf = (path: string): string => {
  const index = path.lastIndexOf('/');
  return index > 0 ? path.slice(0, index) : '';
};

export function isMarkdownPath(path: string): boolean {
  return MARKDOWN_EXT.test(path);
}

export function isImagePath(path: string): boolean {
  return IMAGE_EXT.test(path);
}

/** 一次选择框返回的一堆文件 → 分类好的 md 与图片 */
export function scanFolder(files: File[]): FolderScan {
  const markdowns: FolderMarkdown[] = [];
  const images: File[] = [];
  let folderName = '';

  for (const file of files) {
    const path = relativePathOf(file);
    if (!folderName) folderName = path.includes('/') ? path.slice(0, path.indexOf('/')) : '所选文件夹';
    if (isMarkdownPath(path)) {
      markdowns.push({ path, dir: dirOf(path), name: file.name, file });
    } else if (isImagePath(path)) {
      images.push(file);
    }
  }

  markdowns.sort((a, b) => a.path.localeCompare(b.path, 'zh-Hans-CN'));
  return { folderName, markdowns, images };
}

export function readMarkdownFile(file: File): Promise<string> {
  if (typeof file.text === 'function') return file.text();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(reader.error ?? new Error('读取失败'));
    reader.readAsText(file, 'utf-8');
  });
}

/**
 * 正文里引用了哪些图片地址（Markdown 语法 + 白名单 HTML 的 <img>）。
 * 导入完拿它和图片仓库对一遍，能告诉用户「哪几张没对上」。
 */
export function imageRefsInMarkdown(markdown: string): string[] {
  const refs = new Set<string>();
  const inline = /!\[[^\]]*\]\(\s*<?([^\s)>]+)>?(?:\s+[^)]*)?\)/g;
  for (const match of markdown.matchAll(inline)) refs.add(match[1]);
  const html = /<img[^>]+src\s*=\s*["']([^"']+)["']/gi;
  for (const match of markdown.matchAll(html)) refs.add(match[1]);
  return Array.from(refs);
}

function readAsDataUrl(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    if (typeof FileReader === 'undefined') {
      resolve(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

/** 有没有透明像素（每 4 个像素看一个，够用了）；取不到像素就当不透明 */
function hasTransparency(ctx: CanvasRenderingContext2D, width: number, height: number): boolean {
  try {
    const { data } = ctx.getImageData(0, 0, width, height);
    for (let i = 3; i < data.length; i += 16) {
      if (data[i] < 250) return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * 缩到指定最长边再编码：公众号正文宽度约 677px，1280 已经够 2 倍屏。
 * 有透明通道存 PNG，其余存 JPEG —— 照片存 PNG 会大一个数量级。
 */
async function downscale(file: File, maxEdge: number, quality: number): Promise<string | null> {
  if (typeof createImageBitmap !== 'function' || typeof document === 'undefined') return null;
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    // HEIC / TIFF 这类浏览器解不开的格式会走到这儿
    return null;
  }

  try {
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(bitmap, 0, 0, width, height);
    const alpha = hasTransparency(ctx, width, height);
    return canvas.toDataURL(alpha ? 'image/png' : 'image/jpeg', quality);
  } catch {
    return null;
  } finally {
    bitmap.close?.();
  }
}

interface EncodedImage {
  url: string | null;
  reason?: SkipReason;
}

async function encodeImage(file: File): Promise<EncodedImage> {
  const type = file.type || '';
  const name = file.name;

  // 矢量与动图重编码会被弄坏，原样带上（它们通常很小，超限就明说）
  if (/svg|gif/i.test(type) || /\.(?:svg|gif)$/i.test(name)) {
    const url = await readAsDataUrl(file);
    return url && url.length <= MAX_ASSET_CHARS ? { url } : { url: null, reason: 'too-large' };
  }

  // 浏览器解不了的格式：先让 canvas 试一次（Safari 能解 HEIC），解不开就跳过并说明
  if (UNDECODABLE_EXT.test(name) || /heic|heif|tiff/i.test(type)) {
    for (const edge of EDGE_STEPS) {
      for (const quality of QUALITY_STEPS) {
        const url = await downscale(file, edge, quality);
        if (url && url.length <= MAX_ASSET_CHARS) return { url };
      }
    }
    return { url: null, reason: 'unsupported' };
  }

  const raw = await readAsDataUrl(file);
  // 小图原样用
  if (raw && raw.length <= KEEP_RAW_BYTES * 1.4) return { url: raw };

  // 大图逐档压：先 1280，不行再 1024 / 800，质量也跟着降
  for (const edge of EDGE_STEPS) {
    for (const quality of QUALITY_STEPS) {
      const url = await downscale(file, edge, quality);
      if (url && url.length <= MAX_ASSET_CHARS) return { url };
    }
  }

  // 压不动就退回原图（浏览器至少能显示），还是超限就只能跳过
  if (raw && raw.length <= MAX_ASSET_CHARS) return { url: raw };
  return { url: null, reason: 'too-large' };
}

/**
 * 把文件夹里的图片按「相对 md 所在目录」的路径收成一份 map。
 * 没进来的（太大 / 浏览器解不开）连同原因一起返回，导入完能给用户一个交代。
 */
export async function buildAssetBundle(images: File[], baseDir: string): Promise<AssetBuildResult> {
  const bundle: Record<string, string> = {};
  const skipped: SkippedImage[] = [];
  let chars = 0;

  for (const file of images) {
    const key = normalizeAssetPath(stripDir(baseDir, relativePathOf(file)));
    const encoded = await encodeImage(file);
    if (!encoded.url) {
      skipped.push({ path: key, reason: encoded.reason ?? 'too-large' });
      continue;
    }
    if (chars + encoded.url.length > MAX_TOTAL_CHARS) {
      skipped.push({ path: key, reason: 'too-large' });
      continue;
    }
    bundle[key] = encoded.url;
    chars += encoded.url.length;
  }

  return { bundle, used: Object.keys(bundle).length, skipped, chars };
}
