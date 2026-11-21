/**
 * 本机图片仓库：导入「文件夹」时把里面的图片按相对路径收在这里，
 * 预览/复制/导出时再把 `<img src="images/1.png">` 换成能显示的那一份。
 *
 * 为什么不把图片内联进 Markdown：一篇文章几 MB 的 base64 会把编辑器变成乱码墙，
 * 也会撑爆 localStorage 里的草稿。这里 Markdown 保持干净（相对路径原样留着），
 * 图片另存一份进 IndexedDB —— 刷新页面后还能接上。
 */

export type AssetBundle = Record<string, string>;

const DB_NAME = 'typography-local';
const DB_VERSION = 1;
const STORE = 'assets';
const BUNDLE_KEY = 'bundle';

/** 内存里的当前图片（键：相对「导入的 md 所在目录」的路径） */
let cache: AssetBundle = {};
let loadPromise: Promise<boolean> | null = null;

export function getAssetBundle(): AssetBundle {
  return cache;
}

export function assetCount(): number {
  return Object.keys(cache).length;
}

/** 相对路径归一化：统一分隔符、去掉 `./`、折叠 `../`（顶上再往上就丢掉） */
export function normalizeAssetPath(input: string): string {
  const segments: string[] = [];
  for (const segment of input.replace(/\\/g, '/').split('/')) {
    if (!segment || segment === '.') continue;
    if (segment === '..') {
      segments.pop();
      continue;
    }
    segments.push(segment);
  }
  return segments.join('/');
}

/** 从完整相对路径里去掉基准目录：`post/images/1.png` + `post` → `images/1.png` */
export function stripDir(dir: string, path: string): string {
  const base = normalizeAssetPath(dir);
  const full = normalizeAssetPath(path);
  if (!base) return full;
  return full.startsWith(`${base}/`) ? full.slice(base.length + 1) : full;
}

/** http(s)/data/blob 这类都算外部地址，不该去本机仓库里找 */
export function isExternalSrc(src: string): boolean {
  return /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(src);
}

/** 路径命中：先精确，再大小写不敏感（macOS 的文件系统本来就不分大小写） */
function matchKey(candidate: string): string | null {
  const key = normalizeAssetPath(candidate);
  if (!key) return null;
  if (cache[key]) return key;
  const lower = key.toLowerCase();
  return Object.keys(cache).find((known) => known.toLowerCase() === lower) ?? null;
}

/**
 * 找一张图：原路径 → 解码后的路径（`%20` / 中文）→ 同名文件兜底。
 * 同名兜底只在整棵树里唯一时才用，有歧义宁可返回 null，也不猜错图。
 */
export function lookupAsset(src: string): string | null {
  if (!src || isExternalSrc(src)) return null;

  // 丢掉 ?query 与 #hash：Markdown 里常用来做过期参数
  const raw = src.split(/[?#]/)[0] ?? '';
  if (!raw) return null;

  const variants = [raw];
  try {
    const decoded = decodeURIComponent(raw);
    if (decoded !== raw) variants.push(decoded);
  } catch {
    // 不是合法转义，按原样处理
  }

  for (const variant of variants) {
    const hit = matchKey(variant);
    if (hit) return cache[hit];
  }

  for (const variant of variants) {
    const base = (normalizeAssetPath(variant).split('/').pop() ?? '').toLowerCase();
    if (!base) continue;
    const matches = Object.keys(cache).filter((known) => (known.split('/').pop() ?? '').toLowerCase() === base);
    if (matches.length === 1) return cache[matches[0]];
    if (matches.length > 1) return null;
  }

  return null;
}

/** 覆盖当前图片集（导入新文件夹时整批换掉） */
export async function setAssetBundle(next: AssetBundle): Promise<void> {
  cache = { ...next };
  await writeStoredBundle(cache);
}

/** 页面启动时把上次导入的图片读回内存；返回是否读到了东西 */
export function loadAssetBundle(): Promise<boolean> {
  if (!loadPromise) {
    loadPromise = readStoredBundle().then((stored) => {
      if (!stored) return false;
      cache = stored;
      return true;
    });
  }
  return loadPromise;
}

/** 清空（暂未接入口，留给以后「清除本地图片」） */
export async function clearAssetBundle(): Promise<void> {
  cache = {};
  await writeStoredBundle({});
}

// ---- IndexedDB：不可用（隐私模式 / 测试环境）就静默降级成纯内存 ----

function openDb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') {
      resolve(null);
      return;
    }
    let request: IDBOpenDBRequest;
    try {
      request = indexedDB.open(DB_NAME, DB_VERSION);
    } catch {
      resolve(null);
      return;
    }
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
    request.onblocked = () => resolve(null);
  });
}

function readStoredBundle(): Promise<AssetBundle | null> {
  return openDb().then(
    (db) =>
      new Promise<AssetBundle | null>((resolve) => {
        if (!db) {
          resolve(null);
          return;
        }
        try {
          const tx = db.transaction(STORE, 'readonly');
          const request = tx.objectStore(STORE).get(BUNDLE_KEY);
          request.onsuccess = () => resolve((request.result as AssetBundle | undefined) ?? null);
          request.onerror = () => resolve(null);
          tx.oncomplete = () => db.close();
        } catch {
          db.close();
          resolve(null);
        }
      }),
  );
}

function writeStoredBundle(bundle: AssetBundle): Promise<void> {
  return openDb().then(
    (db) =>
      new Promise<void>((resolve) => {
        if (!db) {
          resolve();
          return;
        }
        try {
          const tx = db.transaction(STORE, 'readwrite');
          tx.objectStore(STORE).put(bundle, BUNDLE_KEY);
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => {
            db.close();
            resolve();
          };
        } catch {
          db.close();
          resolve();
        }
      }),
  );
}
