/** 导入 / 导出用的小工具：文章标题、文件名、下载、选文件 */

const FALLBACK_TITLE = '未命名文章';

/** Markdown 标记与文件名里不能出现的字符 */
const TITLE_NOISE = /[*_`~#>[\]()]/g;
const ILLEGAL_FILENAME = /[\\/:*?"<>|\s]+/g;

/**
 * 从正文里取文章标题：先找第一个 ATX 标题，没有再退到第一段能读的文字。
 * 导出的 PDF / HTML / Markdown 都用它当文件名。
 */
export function articleTitle(markdown: string): string {
  const lines = markdown.split('\n');

  for (const line of lines) {
    const heading = /^\s{0,3}(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line);
    if (heading) {
      const text = heading[2].replace(TITLE_NOISE, '').trim();
      if (text) return text;
    }
  }

  for (const line of lines) {
    const text = line.trim();
    if (!text) continue;
    if (/^(?:[-*+]\s|>\s|```|\||\d+[.)]\s|---)/.test(text)) continue;
    const readable = text.replace(TITLE_NOISE, '').replace(/\s+/g, ' ').trim();
    if (readable) return readable.slice(0, 40);
  }

  return FALLBACK_TITLE;
}

/** 标题 → 文件名主体：去掉路径分隔符与空白，限长，空了就回落 */
export function safeFileName(title: string, fallback = FALLBACK_TITLE): string {
  const cleaned = title.replace(ILLEGAL_FILENAME, '-').replace(/^-+|-+$/g, '').slice(0, 80);
  return cleaned || fallback;
}

export function downloadTextFile(filename: string, text: string, mime: string): void {
  const blob = new Blob([text], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Safari 在 click 之后还会异步读 blob，立刻 revoke 会拿到空文件
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** 让用户挑一个文本文件；取消返回 null */
export function pickTextFile(accept = '.md,.markdown,.txt,text/markdown,text/plain'): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.style.cssText = 'position:fixed;left:-9999px;top:0;';
    let settled = false;

    const finish = (value: string | null) => {
      if (settled) return;
      settled = true;
      input.remove();
      resolve(value);
    };

    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (!file) {
        finish(null);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => finish(typeof reader.result === 'string' ? reader.result : null);
      reader.onerror = () => finish(null);
      reader.readAsText(file, 'utf-8');
    });

    // 取消选择走 cancel 事件：不靠「窗口重新获得焦点」猜，免得抢在 change 前面判成取消
    input.addEventListener('cancel', () => finish(null));

    document.body.appendChild(input);
    input.click();
  });
}

/**
 * 让用户挑一个文件夹（md + 图片集）；取消返回空数组。
 * `webkitdirectory` 在不支持的浏览器（如部分手机浏览器）上会退化成本选单个文件，
 * 那时拿到的就是一个只有一项的数组，下游按「只有一个文件」处理即可。
 */
export function pickFolder(): Promise<File[]> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.webkitdirectory = true;
    input.style.cssText = 'position:fixed;left:-9999px;top:0;';
    let settled = false;

    const finish = (files: File[]) => {
      if (settled) return;
      settled = true;
      input.remove();
      resolve(files);
    };

    input.addEventListener('change', () => finish(input.files ? Array.from(input.files) : []));
    input.addEventListener('cancel', () => finish([]));

    document.body.appendChild(input);
    input.click();
  });
}
